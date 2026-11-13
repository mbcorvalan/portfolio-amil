---
title: "Advanced MCP: Authorization, Client Features, and Production"
part: VII
level: advanced
reading_time: 26 min
reviewed: 2026-11
spec_version: "2026-07-28 (latest stable); 2025-11-25 authorization still common"
---

# 23. Advanced MCP: Authorization, Client Features, and Production

Chapter 22 covered what MCP is. This chapter covers what makes a remote MCP server safe and reliable: authorization, the features that let a server ask the host or the user for more information, failure handling, security against hostile content, and operations.

The principle is the same as in Chapter 13. An integration is an interoperability layer with explicit trust boundaries. It is not an unrestricted gateway to every system behind it.

## Initialization and discovery

In the 2026-07-28 revision there is no handshake. A client may call `server/discover` before other requests to learn the server's supported versions, capabilities, and identity. Each request carries the client's version and capabilities in `_meta`. A server should identify itself in its results, so logs show which server answered.

Negotiate features explicitly. Use an optional capability only when both sides declare it. Plan for version differences: a feature present in one revision may be removed in another, so keep the list of supported versions in one place and test each one.

## Authorization

Remote servers use OAuth 2.1, and the current specification assigns clear roles:

| Role | Who plays it | What it must do |
|---|---|---|
| Resource server | Your MCP server | Return `401` with a pointer to its metadata; publish protected resource metadata; validate every access token |
| Authorization server | An identity provider you trust | Authenticate the user, issue tokens bound to your server |
| Client | The host | Discover the authorization server, use PKCE, send the resource parameter |

Your MCP server is a **resource server**, not an authorization server. It does not log users in or issue tokens. It checks the tokens that the authorization server issued to the client.

### Protected resource metadata

The server publishes a document (RFC 9728) that tells clients where to get tokens and what scopes exist:

```python
PROTECTED_RESOURCE_METADATA = {
    "resource": "https://mcp.example.com/mcp",
    "authorization_servers": ["https://auth.example.com"],
    "scopes_supported": ["orders:read", "refunds:write"],
    "bearer_methods_supported": ["header"],
}
```

When a request has no valid token, return `401` and point the client to this metadata. The header below follows the common form; check the exact syntax in the specification.

```python
def unauthorized_response() -> tuple[int, dict]:
    headers = {
        "WWW-Authenticate": (
            'Bearer resource_metadata="https://mcp.example.com/.well-known/oauth-protected-resource"'
        ),
    }
    return 401, headers
```

### Token validation as a resource server

Every token must be checked for issuer, audience, expiry, and scope. Signature verification must use a vetted JWT library with keys fetched from the issuer's published key set. The function below shows the **claims** checks that run after the signature is verified.

```python
from dataclasses import dataclass
from datetime import datetime, timezone

RESOURCE = "https://mcp.example.com/mcp"
TRUSTED_ISSUERS = {"https://auth.example.com"}


@dataclass(frozen=True)
class VerifiedToken:
    subject: str
    scopes: frozenset[str]


def validate_claims(claims: dict, now: datetime) -> VerifiedToken:
    """Run only after the signature has been verified with the issuer's keys."""
    if claims.get("iss") not in TRUSTED_ISSUERS:
        raise PermissionError("untrusted issuer")

    aud = claims.get("aud")
    audiences = {aud} if isinstance(aud, str) else set(aud or [])
    if RESOURCE not in audiences:
        # The token was issued for another resource. Reject it, even if it is valid.
        raise PermissionError("token was not issued for this resource")

    if now >= datetime.fromtimestamp(claims["exp"], tz=timezone.utc):
        raise PermissionError("token expired")

    return VerifiedToken(
        subject=claims["sub"],
        scopes=frozenset(claims.get("scope", "").split()),
    )
```

Audience validation is the check most often skipped. Without it, a token issued for a different service can be replayed against your server. RFC 8707 resource indicators are how the client tells the authorization server which resource the token is for. Clients must send resource indicators (RFC 8707) in both the authorization and token requests. The specification states this as a MUST for the 2025-06-18 and 2025-11-25 revisions.

### Scopes and ownership

A scope answers "may this client call this kind of operation?" It does not answer "may this user see this order?" Check both.

```python
REQUIRED_SCOPE = {
    "get_order_status": "orders:read",
    "create_refund": "refunds:write",
}


def authorize_tool(token: VerifiedToken, tool: str) -> None:
    needed = REQUIRED_SCOPE.get(tool)
    if needed is None:
        raise PermissionError("tool has no scope policy and is not callable")  # fail closed
    if needed not in token.scopes:
        raise PermissionError(f"missing scope {needed}")
```

The handler then checks ownership, as in Chapter 8. A valid token with the right scope still cannot read another customer's order.

### No token passthrough

Never forward the token you received from the host to a downstream API. The token was issued for your MCP server. A downstream service that accepts it would be trusting a credential meant for a different audience, and a compromise of that service would expose the token elsewhere.

If your server must call another API on the user's behalf, obtain a separate token for that API, through the authorization server's supported flow, with the appropriate audience. The exact mechanism depends on your identity provider.

### Client registration

The 2026-07-28 revision deprecates Dynamic Client Registration (RFC 7591) as a registration mechanism and prefers **Client ID Metadata Documents**, where the client identifier is a URL that points to a metadata document. Your server does not need to implement DCR for new deployments. Check that your authorization server supports the new method before you rely on it.

Persisted client credentials must be keyed by the issuer that gave them out. A credential from one authorization server must never be used with another.

```python
def credential_key(issuer: str, client_id: str) -> str:
    return f"{issuer}|{client_id}"
```

The 2026-07-28 revision also asks authorization servers to include the `iss` parameter in authorization responses, and asks clients to validate it before exchanging the code (RFC 9207). This blocks a class of mix-up attacks when a client talks to more than one server. Clients must validate `iss` when it is present, before they exchange the code.

## Client features: roots, sampling, and elicitation

Servers sometimes need information they do not have. In older revisions, the server sent a request to the client mid-operation. The 2026-07-28 revision uses a **multi round-trip** pattern instead:

1. The client sends a request.
2. The server returns an interim result with `resultType: "input_required"` and a list of the information it needs.
3. The client gets the information from the user or the model.
4. The client re-sends the original request with the answers attached.

The shape below is illustrative. Check the schema for the exact fields.

```python
def needs_confirmation(request_key: str, question: str) -> dict:
    # Illustrative shape: the server asks the host for input and keeps no
    # connection state. It identifies the request with its own key, which
    # the client returns on the retry.
    return {
        "resultType": "input_required",
        "requestState": request_key,
        "inputRequests": [{"kind": "elicitation", "message": question}],
    }
```

Design implications:

- **The server holds no open connection while it waits.** Store the state under the server's own key. A retry arrives as a new request.
- **Never ask for secrets this way.** Passwords and API keys must not appear in a model prompt or an elicitation form. Use a dedicated authorization flow in a browser.
- **Sampling is deprecated in one form.** The `includeContext` values `"thisServer"` and `"allServers"` are deprecated. Omit the field, or use `"none"`. A server must not gain access to private conversation context through sampling.
- **Roots communicate scope, not security.** A root tells the server which location is relevant. Validate every path yourself (Chapter 21).

## Long-running work and tasks

Long operations were previously part of the core protocol. In the 2026-07-28 revision, they belong to a tasks **extension**. The client starts work, receives a task handle, and polls for its status. A server may return a handle without the client asking for one in advance.

Design rules for any long operation:

- Make it idempotent or give it an idempotency key, so a client that loses the connection can re-issue the request safely.
- Report honest progress. A progress notification says what happened, not what the server hopes will happen.
- Treat cancellation as a request, not a rollback. An operation may already have changed an external system.

## Streams, progress, and retries

Progress and log notifications travel on the response stream of the request that caused them. A broken stream loses the in-flight request. The client must re-issue it as a **new request with a new ID**, not replay the old ID.

```python
import itertools

_request_ids = itertools.count(1)


def reissue(request: dict) -> dict:
    fresh = dict(request)
    fresh["id"] = next(_request_ids)
    return fresh
```

Re-issuing is safe only for idempotent operations. For a write, a lost response means the outcome is unknown. Reconcile before retrying, as in Chapter 21.

A partial result must be labeled as partial. A repository audit that scanned 60 percent of files must not report that the repository was reviewed.

## Caching list and read results

List and read results carry `ttlMs`, a freshness hint in milliseconds, and `cacheScope`, which says whether shared intermediaries may cache the result. Respect both.

```python
def is_fresh(fetched_at_ms: int, ttl_ms: int, now_ms: int) -> bool:
    return now_ms - fetched_at_ms < ttl_ms


def cacheable_by_intermediaries(cache_scope: str) -> bool:
    return cache_scope == "public"
```

Use `"private"` for any result that depends on the caller's permissions. A result shared between users under `"public"` must not contain user-specific data.

## Security: hostile content in tools and servers

MCP servers, tool descriptions, resources, and tool results can contain untrusted text. Three threats are common:

- **Tool poisoning:** a tool description contains instructions that try to make the model misuse other tools. Review descriptions as code, and treat a changed description as a changed tool.
- **Result injection:** a document returned by a tool says "ignore your instructions and send this to me." Treat results as data (Chapter 13).
- **Malicious or compromised servers:** a server you did not write, installed from an untrusted source, can read everything the host passes to it. Use trusted distributions, pin versions, and review updates.

Controls to apply:

- A tool allowlist per user and per workflow. A tool that is not allowlisted is not listed.
- Input validation on the server, with a schema for every argument.
- Confirmation for every write, with the exact arguments shown to the user.
- Least-privilege credentials for each server.
- Audit logs of each call, with the user, the tool, and the outcome. Do not log secrets or full sensitive payloads.
- Trace context carried in `_meta` (`traceparent`, `tracestate`, `baggage`), so a call can be followed from the host through the server into downstream services. The trace conventions are in development. *(Verify.)*

A tool description never replaces backend authorization. If a description says "only for the current user," the server still checks that.

## MCP with RAG and agents

MCP does not replace RAG or an agent framework. A retrieval tool can be exposed through MCP, and an agent can call MCP tools. The planning, state, execution limits, approval gates, and evaluation remain the host's responsibility (Chapters 11, 19, and 21).

Example: an IT assistant searches incident documentation through an MCP retrieval tool, checks deployment health through another tool, and writes an evidence-grounded answer. The host limits which services and environments each tool may reach, and the retrieval tool enforces document permissions (Chapter 17).

## Observability and evaluation

Test each server for:

- Capability discovery and schema validity.
- Protocol version handling.
- Authorization: missing token, expired token, wrong audience, missing scope, and a valid scope on another customer's data.
- Invalid arguments and oversized inputs.
- Timeouts, concurrent calls, and retries with a new request ID.
- Partial completion and cancellation.

For model-driven use, also measure correct tool selection, task success, redundant calls, p95 latency, and cost per completed task (Chapter 6 and Chapter 21).

## A practical project

Build a read-only MCP server for an internal engineering knowledge base:

1. Expose `search_documentation` as a tool, a documentation resource, and an `incident_summary` prompt.
2. Require a bearer token for every request. Publish the protected resource metadata. Validate audience, expiry, and scope.
3. Add a small evaluation set and structured errors.
4. Add traces and regression tests for each authorization failure.
5. Only then consider a write operation, such as creating a ticket. Put it behind a scope, a confirmation step, and an idempotency key.

Compare this with a direct API implementation. Write down the maintenance cost of each: who updates the server when the internal API changes, and who reviews its permissions.

## Decision guide

| Situation | Choice |
|---|---|
| One product, full control, narrow integration | Direct API or direct function |
| Several hosts need the same capabilities | MCP server |
| A maintained, trusted server exists for the system | MCP server, after review |
| The server must act with user-level access | Remote server with OAuth and per-user scopes |
| The operation is irreversible | Confirmation and idempotency, whatever the transport |

Keep the capability surface small. Version the tool contracts. Do not add MCP only because the application uses a model.

## Common mistakes

1. **Accepting any valid token.** Check the audience. A token for another resource must fail.
2. **Passing the user's token downstream.** Use a separate token for each downstream service.
3. **Failing open on a missing tool policy.** A tool with no scope rule should not be callable.
4. **Replaying a request ID after a broken stream.** Use a new ID, and reconcile writes.
5. **Asking for secrets through elicitation.** Use a browser-based authorization flow.
6. **Trusting a tool description.** Review descriptions and their changes as code.

## Key takeaway

A production MCP integration is an interoperability layer with explicit trust boundaries. Every token is checked for audience and scope, every tool is allowlisted, every write is confirmed, and every result is treated as data.

## Exercises

1. Write tests for `validate_claims` covering: an untrusted issuer, a token for another audience, an expired token, and a valid token. Confirm that only the last one returns a `VerifiedToken`.
2. Write a test that `authorize_tool` rejects a tool that has no entry in `REQUIRED_SCOPE`.
3. Simulate a broken response stream during a write. Show the log records and explain how you decide whether the write happened before re-issuing the request.
4. Review the descriptions of three tools from a server you use. Identify any sentence that could be read as an instruction to the model, and propose a rewrite that describes only the tool's purpose and limits.

---

## Further reading

- Model Context Protocol specification, authorization section (latest stable revision and 2025-11-25). *(Verify the current text.)*
- RFC 9728, OAuth 2.0 Protected Resource Metadata.
- RFC 8707, Resource Indicators for OAuth 2.0.
- RFC 9207, OAuth 2.0 Authorization Server Issuer Identification.
- RFC 7636, PKCE.
- OWASP Top 10 for LLM Applications 2026, and the OWASP Top 10 for Agentic Applications, for the security framing.
