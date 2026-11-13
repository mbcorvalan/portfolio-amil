---
title: "MCP Fundamentals: Hosts, Clients, Servers, and Capabilities"
part: VII
level: intermediate-advanced
reading_time: 22 min
reviewed: 2026-11
spec_version: "2026-07-28 (latest stable); 2025-11-25 still common"
---

# 22. MCP Fundamentals: Hosts, Clients, Servers, and Capabilities

The **Model Context Protocol (MCP)** is an open protocol that connects AI applications to external tools, data, and reusable prompt templates. Its main value is standardization. A server written once can be discovered and used by any compatible host, instead of each team writing its own model-facing integration.

MCP standardizes the **interface**. It does not make a tool safe, does not replace your backend, and does not decide which tool a model should choose. Authorization, validation, and side effects remain your responsibility, as in Chapters 8 and 13.

## Why MCP exists

Suppose three internal products need access to the same ticketing system. Without MCP, each product writes its own tool definitions, its own parsing, and its own error handling. When the ticketing API changes, three codebases change.

With MCP, one server wraps the ticketing API behind a curated set of tools, resources, and prompts. Each compatible host discovers those capabilities at runtime. The server still handles credentials, pagination, rate limits, and API changes. The hosts stop duplicating that work.

The trade-off is a new component to operate: the server. If only one product needs the integration, a direct function call (Chapter 8) is usually simpler.

## Architecture: host, client, server

| Role | Responsibility |
|---|---|
| **Host** | The AI application. Owns the model, the user interface, the permission decisions, and the list of connected servers. |
| **Client** | A component inside the host that maintains one connection to one server. |
| **Server** | A process or service that publishes capabilities. It talks to the underlying APIs and data. |
| **Model** | Chooses among the tools the host makes available. It never calls the server directly. |

A typical request flows like this:

```text
user -> host (model decides to use a tool)
     -> MCP client -> MCP server -> underlying API or database
     -> result -> host -> model writes the answer -> user
```

Two points are easy to miss. First, a server is not necessarily an AI model. It can be a plain service that answers JSON-RPC requests. Second, not every MCP operation involves the model. A host can list resources or run a prompt template without any model call.

## Three server primitives

**Tools** are operations the model may request: `get_order_status`, `create_ticket`. Tools may change external state, so permissions and approvals matter.

**Resources** are readable data identified by a URI, such as a runbook or a configuration file. The host decides which resources to read and how much of them enters the context. Being listed does not mean being read, and being readable does not mean being authorized for every user.

**Prompts** are reusable templates, optionally with parameters, such as `review_release_notes`. A prompt supplies instructions. It does not grant permission to perform an operation.

Example from a support setting: the assistant reads a refund policy as a resource, calls `get_order_status` as a tool to fetch current data, and uses a drafting prompt to write the reply. The host checks that the customer may see the returned order before the model uses it.

## Transports and message format

MCP messages use **JSON-RPC 2.0**: requests with an `id`, responses or errors with the same `id`, and notifications without an `id`.

Common transports:

| Transport | Typical use | Notes |
|---|---|---|
| **stdio** | Local processes started by the host | No network exposure; the process inherits the host's environment |
| **Streamable HTTP** | Remote servers | The standard for remote servers in the current specification |
| HTTP+SSE | Older remote servers | Deprecated since 2025-03-26; migrate to Streamable HTTP |

A generic WebSocket connection is not one of the standard MCP transports. Custom transports may exist, but interoperability depends on the standard ones.

## What changed in the 2026-07-28 revision

This revision changes how a client and server start talking and how they keep state. Read it before you design a new server.

- **No `initialize` handshake.** Each request carries the protocol version and client information in `_meta`. A server must implement `server/discover` so a client can learn the supported versions and capabilities before making other calls.
- **No protocol-level sessions.** The `Mcp-Session-Id` header is gone. List endpoints return the same result for every connection. A server that needs state across calls issues its own handles and passes them as ordinary tool arguments.
- **Server-initiated requests are replaced.** Roots listing, sampling, and elicitation now use a **multi round-trip request** pattern. The server returns an interim result that asks for more input, and the client retries the original request with the answer.
- **Every result has a `resultType`.** Ordinary results use `"complete"`. The interim result for multi round-trip requests uses `"input_required"`.
- **Tasks are an extension.** Long-running work is no longer part of the core protocol. It is handled by an extension that uses polling.
- **Caching hints.** List and read results carry `ttlMs` and `cacheScope`, so clients and intermediaries know how long a result stays fresh.
- **Deprecations.** The HTTP+SSE transport and some sampling options are deprecated, under a formal lifecycle with a minimum deprecation window.

The 2025-11-25 revision is still common in deployed servers and clients. If you publish a server, check which versions your clients send, and support them deliberately instead of assuming one version.

The field names in this section are confirmed against the specification: the `_meta` keys, `server/discover`, `UnsupportedProtocolVersionError`, `resultType`, and the `input_required` pattern. Check the exact wire format in the specification before you implement a client.

## A request in the 2026-07-28 shape

A `tools/call` request carries the protocol version and client identity in `_meta`. The shape below is illustrative.

```python
import json

PROTOCOL_VERSION = "2026-07-28"
SUPPORTED_VERSIONS = {"2026-07-28"}  # add older versions only if your clients need them


def request_meta(client_name: str, client_version: str) -> dict:
    return {
        "io.modelcontextprotocol/protocolVersion": PROTOCOL_VERSION,
        "io.modelcontextprotocol/clientInfo": {"name": client_name, "version": client_version},
        "io.modelcontextprotocol/clientCapabilities": {},  # declare what the client supports
    }


def tools_call_request(request_id: int, name: str, arguments: dict) -> dict:
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "method": "tools/call",
        "params": {
            "name": name,
            "arguments": arguments,
            "_meta": request_meta("support-copilot", "1.4.0"),
        },
    }


print(json.dumps(tools_call_request(42, "get_order_status", {"order_id": "A-10432"}), indent=2))
```

On the server side, reject requests with an unsupported version before doing any work:

```python
def check_protocol_version(params: dict) -> str | None:
    version = params.get("_meta", {}).get("io.modelcontextprotocol/protocolVersion")
    if version not in SUPPORTED_VERSIONS:
        return "UnsupportedProtocolVersionError"  # the spec defines this error for mismatches
    return None
```

## A narrow tool surface

Expose a small set of valuable operations, not a mirror of the whole provider API. Each tool needs a name, a description that says when to use it, a JSON Schema for its input, and annotations.

```python
TOOLS = {
    "get_order_status": {
        "description": (
            "Return the status of one order that belongs to the current customer. "
            "Use only when the customer names an order ID. Cannot change orders."
        ),
        "inputSchema": {
            "type": "object",
            "properties": {"order_id": {"type": "string", "pattern": "^A-[0-9]{5}$"}},
            "required": ["order_id"],
            "additionalProperties": False,
        },
        # Hints for the host's user interface and policies. They are not enforcement.
        "annotations": {"readOnlyHint": True, "destructiveHint": False},
    },
}


def list_tools() -> dict:
    # Deterministic order helps client-side caching and prompt cache hit rates.
    return {"tools": [{"name": n, **TOOLS[n]} for n in sorted(TOOLS)]}
```

Two details matter. The annotations describe behavior, so a host can show warnings or ask for confirmation, but the server must still check permissions. And sorting the list makes its serialized form stable from one call to the next, which keeps any prompt built from it cacheable (Chapter 14).

A tool result can carry both human-readable text and structured data:

```python
import json


def tool_result(payload: dict) -> dict:
    return {
        "resultType": "complete",
        "content": [{"type": "text", "text": json.dumps(payload)}],
        "structuredContent": payload,
        "isError": False,
    }


def tool_error(message: str) -> dict:
    # Return a safe message. Log internal details on the server.
    return {
        "resultType": "complete",
        "content": [{"type": "text", "text": message}],
        "isError": True,
    }
```

## MCP, function calling, and direct APIs

| Option | What it is | Best when |
|---|---|---|
| **Direct API call** | Your code calls a provider's endpoint | One integration, full control, one product |
| **Function calling / tool use** | The model requests a named operation you defined | Your application owns the tools (Chapter 8) |
| **MCP** | A standard way to discover and invoke capabilities exposed by a server | Several hosts reuse the same capabilities, or a maintained server exists |

They are complementary. A model can use tools discovered through MCP. MCP does not choose the tool. The host and the model make that choice from the descriptions.

Adopting MCP does not reduce your security work. You still authenticate the caller, authorize each operation, validate inputs, and handle failures (Chapter 23).

## Testing a server

Before you connect a server to an autonomous host, test:

- Capability discovery: every tool, resource, and prompt is listed with a valid schema.
- Protocol version handling: unsupported versions are rejected cleanly.
- Argument validation: missing fields, wrong types, and extra fields are refused.
- Permission failures: a caller without the right scope gets an error, not data.
- Service outages: the error message is safe, and nothing hangs.

MCP Inspector is a development tool for connecting to a server and exercising these operations manually. Check its current documentation for installation and features before you rely on it in a workflow.

## Recommended MCP servers

These servers are worth adding to a coding agent's setup. Each one fills a gap that the agent would otherwise cover with slow or error-prone workarounds.

| Server | What it gives the agent | Why it helps |
| ------ | ----------------------- | ------------ |
| **Serena** | A structured view of the project, much like an IDE gives a human: symbols, references, and definitions. | The agent navigates the code directly instead of spending turns on repeated `grep` searches. |
| **Context7** | Access to up-to-date library and framework documentation. | Fewer errors from outdated APIs and wrong syntax. |
| **chrome-devtools** | Control of a real Chrome browser: navigate, click, read the console, and inspect network requests. | The agent can check a UI change or debug a page by itself. |
| **Exa** | Web search on demand. | The agent can look up current information when the answer is not in the project or its training data. |
| **MongoDB** | Queries against real MongoDB databases. | Simpler work with real data than writing one-off scripts. |
| **context-mode** | Interception of file reads and large tool outputs. The raw output stays in a sandbox, and only the relevant part reaches the context. | The context window does not fill up with noise, so long sessions stay focused. |

Treat every third-party server as code that runs with your credentials. Install it from its official source, pin the version, and grant the narrowest access that works. For example, give the MongoDB server a read-only user on a non-production database. Tool results from search and browser servers are untrusted content (Chapter 13).

### RTK: a token-saving proxy

RTK is not an MCP server, but it belongs in the same setup and it is essential. It is a proxy that runs on your machine and intercepts every call the agent makes. It compresses the output and removes the parts the model does not need, so each call costs fewer tokens and leaves more room in the context window.

To use it:

1. Install RTK.
2. Start the proxy.
3. Install its plugins for your agent or tools, if your setup needs them.

Because RTK sees every call, apply the same rules as for any server: install it from its official source, pin the version, and check its current documentation for setup steps.

## Use it when

- Several hosts need the same capabilities.
- A maintained, trusted server already exists for the system you need.
- You want a clear boundary between the AI application and the integration.

## Avoid it when

- One product needs one integration, and a direct function is simpler.
- You adopt MCP only because the application uses a model. The standard is not a reason by itself.

## Trade-offs

MCP reduces duplicated integration work across hosts, and it adds a server to deploy, secure, version, and monitor. Remote servers add a network boundary and an authorization flow. A large tool catalog makes model selection harder and widens the attack surface, so keep the catalog small.

## Common mistakes

1. **Mirroring the provider API.** Expose the operations the product needs, with narrow inputs.
2. **Trusting annotations.** `readOnlyHint` describes intent. It does not stop a write.
3. **Ignoring protocol versions.** Mismatches cause subtle failures if you do not check them.
4. **Building new state into sessions.** The current revision removed protocol sessions. Pass explicit handles instead.
5. **Treating a resource as public.** Listing and reading are separate permissions to check.

## Key takeaway

MCP standardizes how capabilities are discovered and called. The host and the server still own authorization, safety, and reliability.

## Exercises

1. Build a read-only MCP server with one tool, one resource, and one prompt. Test it with three requests: a valid call, a call with an unsupported protocol version, and a call with an extra argument.
2. Compare a direct function implementation and an MCP implementation of the same tool. Count the lines that handle validation, errors, and authorization in each. Explain what MCP removed and what it did not.
3. Write a `tools/list` test that fails if the output order changes between two calls.

---

## Further reading

- Model Context Protocol specification, latest stable revision (2026-07-28), and its changelog. *(Verify exact field names before implementing.)*
- Model Context Protocol specification 2025-11-25, for servers that still support it.
- JSON-RPC 2.0 specification.
