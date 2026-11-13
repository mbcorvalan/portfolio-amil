---
title: "Advanced RAG: Retrieval, Evaluation, and Production"
part: V
level: advanced
reading_time: 26 min
reviewed: 2026-11
---

# 17. Advanced RAG: Retrieval, Evaluation, and Production

Chapter 16 built the basic pipeline: chunk, index, retrieve, answer, cite. This chapter covers what makes that pipeline work in production: better retrieval, ingestion you can trust, context that the model can actually use, evaluation that points to the broken stage, and operations that keep the index fresh and private.

The goal is not the longest pipeline. The goal is **trustworthy answers from authorized, current evidence, at an acceptable cost and latency**. Add each technique only when a measurement shows it is needed.

## The order of work

Fix problems in this order. Each step depends on the one before it.

1. **Ingestion:** if the source text is wrong, nothing downstream can repair it.
2. **Recall:** if the right passage is never retrieved, ranking cannot help.
3. **Ranking:** once the right passage is in the candidates, put it first.
4. **Context:** send the model enough of the right text, with its structure.
5. **Evaluation:** measure each stage separately.
6. **Operations:** freshness, access, cost, and reliability.

A reranker cannot recover evidence that was never retrieved. A better prompt cannot recover a table row that the parser dropped.

## 1. Query transformation

Users write short, vague, or conversational questions. "Can I still cancel it?" depends on the earlier turns. Search needs a standalone query.

**Query rewriting** turns the conversational question into a self-contained one, using only the context the user already provided. **Multi-query retrieval** issues several reformulations and merges the results. Both can improve recall. Both can also add facts the user never supplied, so the rewrite must be constrained to the conversation.

```python
import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping

REWRITE_SYSTEM = (
    "Rewrite the user's last message as a standalone search query. "
    "Use only facts stated in the conversation. Do not add new facts. "
    "Return the query text only."
)


def rewrite_query(history: list[dict], last_message: str) -> str:
    transcript = "\n".join(f'{m["role"]}: {m["content"]}' for m in history[-6:])
    response = client.messages.create(
        model=MODEL,
        max_tokens=100,
        system=REWRITE_SYSTEM,
        messages=[{
            "role": "user",
            "content": f"Conversation:\n{transcript}\n\nLast message: {last_message}",
        }],
    )
    query = "".join(b.text for b in response.content if b.type == "text").strip()
    # Fall back to the original message if the rewrite is empty or implausibly long.
    return query if 0 < len(query) <= 300 else last_message
```

Notes:

- Only the last six messages go into the rewrite. Older context rarely matters for a standalone query, and sending less reduces both cost and the chance of drifting.
- The fallback is deliberate. A failed rewrite should not block the search.
- Log the original and the rewritten query. Rewrites are a common source of retrieval misses that look mysterious later.

**Metadata filtering** narrows candidates before ranking. Use it for product, language, document type, and effective date. Access control is a special case that must be enforced at retrieval, never delegated to the rewrite or the prompt (see Chapter 13).

## 2. Hybrid retrieval and reranking

Chapter 16 introduced lexical search, vector search, and reciprocal rank fusion. In production, the usual pipeline is:

```text
query -> lexical candidates (top 50) ----\
                                           -> fuse (RRF) -> rerank top 30 -> keep top 5
query -> vector candidates (top 50) -----/
```

A **reranker** is a second-stage model that scores each (query, passage) pair more carefully than the first stage can. It is slower and more expensive per pair, so it runs only on the short candidate list. Cross-encoder rerankers and LLM-based rerankers are two common forms.

### When each step earns its place

| Step | Add it when | Measure |
|---|---|---|
| Lexical search | Users search identifiers, codes, or exact terms | Recall@k on identifier questions |
| Vector search | Users paraphrase, or documents use different vocabulary | Recall@k on paraphrase questions |
| Fusion | Each path finds different relevant items | Recall@k of fused vs each path |
| Reranking | Relevant passages appear in the top 30 but not the top 5 | Precision@5 and MRR before and after |

Reranking can improve precision a lot. It can also add 100 to 300 milliseconds or more of latency, depending on the model and the candidate count, so measure the gain against the budget (Chapter 14). Exact timings depend on your provider and model; benchmark them on your own traffic.

### Real example: an electrical part question

A distributor's assistant is asked whether part XR-410 works with a particular power supply. Lexical search finds the exact part number in the specification sheet. Vector search finds passages about voltage and input ratings. Metadata filters exclude discontinued manuals. A reranker places the voltage table above a general marketing page that also mentions XR-410.

Without the reranker, the marketing page can rank above the table because it repeats the product name more often. Recall is fine. Precision is the problem.

## 3. Ingestion you can trust

Retrieval quality starts before indexing. If a parser loses a table header, reads a two-column PDF in the wrong order, or drops a footnote that says "not valid in the EU," no search technique can recover the lost meaning.

### Stages

```text
acquire -> extract text and structure -> normalize -> capture metadata
        -> deduplicate -> chunk -> build search representations -> publish index version
```

Record a status and the source revision for every stage. A failed job must never leave half-written content in the live index.

### Document identity

Each document needs:

- A **stable ID** that does not change when the file is re-uploaded.
- A **content hash** or revision, so you can detect real changes.
- The **source location** (URL, storage path) for citations.
- **Effective dates** when the content applies only during a period.
- The **tenant** and **access rules**.

Distinguish an update from a new document. If the same policy is uploaded with a new revision, retire the old chunks and publish the new ones. If two different documents share a title, they still need different IDs.

```python
import hashlib
from dataclasses import dataclass


@dataclass(frozen=True)
class DocumentRecord:
    doc_id: str          # stable across revisions
    tenant_id: str
    revision: str        # content hash of the extracted text
    source_uri: str
    effective_from: str | None = None
    effective_to: str | None = None


def content_revision(extracted_text: str) -> str:
    return hashlib.sha256(extracted_text.encode("utf-8")).hexdigest()[:16]


def needs_reindex(existing: DocumentRecord | None, new_revision: str) -> bool:
    return existing is None or existing.revision != new_revision
```

### Parsing challenges

- **Scanned pages** need OCR. OCR errors affect product codes, quantities, and dates, so verify those fields.
- **Tables** need their header rows preserved with each cell or row. A value without its column label is often meaningless.
- **Multi-column layouts** need reading order. A parser that reads across columns produces sentences that never existed.
- **Footnotes and exceptions** often sit far from the claim they qualify. Keep them attached to the section.
- **Code blocks and links** should keep their section association.

Test the parser on the ugliest 10 percent of your documents, not on clean samples. Most extraction bugs live in the tables and scanned pages.

### Incremental indexing

When a document changes, replace its chunks and vectors as one unit. When a document is deleted or access is revoked, remove it from **all** search paths, including the lexical index, the vector index, and any cache. A deleted document that still appears in search is a data exposure.

```python
def replace_document(doc: DocumentRecord, chunks, vectors, store, lexical_conn) -> None:
    """Publish a new revision. Old chunks are removed in the same operation."""
    store.delete_document(doc.doc_id)
    delete_lexical_document(lexical_conn, doc.doc_id)
    store.add(chunks, vectors)
    index_lexical(lexical_conn, chunks)
```

This sketch removes and re-adds in sequence. In a real system, use a transaction or an index-version swap, so readers never see a state where the document is missing. Chapter 16 used in-memory structures; the same principle applies to a database.

## 4. Context engineering for RAG

Finding relevant passages is half the problem. Context engineering decides **which** passages reach the model, **in what order**, **with what labels**, and **within what token budget**.

### Context packing

Select passages that together answer the question. Remove duplicates. Keep the titles, section names, document versions, and source IDs. A longer prompt is not automatically better: unrelated text increases cost and can distract the model.

```python
def pack_context(chunks: list, token_budget: int, count_tokens) -> list:
    """Greedy packing by rank. count_tokens is supplied by the caller."""
    selected, used = [], 0
    seen_doc_sections: set[str] = set()
    for chunk in chunks:                       # already sorted by relevance
        key = f"{chunk.doc_id}:{chunk.heading_path}"
        if key in seen_doc_sections:           # skip duplicate sections
            continue
        cost = count_tokens(chunk.text)
        if used + cost > token_budget:
            continue                           # skip; a smaller later chunk may fit
        selected.append(chunk)
        seen_doc_sections.add(key)
        used += cost
    return selected
```

Pass in a token counter from your provider's tooling rather than estimating from characters, when the budget is tight.

### Parent-child retrieval

Index small child chunks for precise matching, but return the parent section when the model needs more context. This matters when an exception appears in the sentence before or after the matched text.

Example: a policy says "Refunds are available within 30 days." The next paragraph says "This applies to annual contracts only." The matched child is the first sentence. Returning the parent section includes the exception.

### Contextual retrieval

Contextual retrieval adds a short, document-aware description to each chunk before the search representation is built. Example: "This section describes warranty exclusions for commercial customers." The description helps a chunk that says "These exclusions do not apply" make sense on its own.

Two constraints:

- The generated description must not change the factual content of the chunk.
- Store the description separately, so you can inspect it and regenerate it when the source changes.

Anthropic has published research on contextual retrieval with measured gains on several benchmarks. Check the current publication for the reported numbers before you quote them. *(Verify before publishing.)*

### Evidence prioritization

Prefer passages that directly answer the question, carry a valid effective date, and match the requested scope. When two sources disagree, do not silently pick one. Either show the conflict, or apply an explicit source hierarchy that your organization has agreed on, such as "the signed contract overrides the public FAQ."

```python
from datetime import date


def pick_current(versions: list[dict], today: date) -> list[dict]:
    """Keep only versions whose effective window contains today."""
    current = []
    for v in versions:
        start = date.fromisoformat(v["effective_from"]) if v.get("effective_from") else None
        end = date.fromisoformat(v["effective_to"]) if v.get("effective_to") else None
        if (start is None or start <= today) and (end is None or today <= end):
            current.append(v)
    return current
```

If `pick_current` returns more than one version of the same policy, that is a data conflict. Surface it. Do not let the model choose.

## 5. Evaluation and debugging

Evaluate retrieval and generation as separate stages. An end-to-end score tells you that something is wrong, not what.

### A golden dataset

Build a set of questions with:

- The expected supporting passages (chunk IDs or document sections).
- An acceptable answer or the required facts.
- Cases where the correct behavior is "not found."
- Cases that stress the system: identifiers, multi-document questions, ambiguous wording, conflicting policies, and permission boundaries.

Start with 30 to 50 questions for a focused domain. The number is a starting point, not a benchmark. Grow the set from real failures.

### Retrieval metrics

- **Recall@k:** is relevant evidence among the top k? Use this first.
- **Precision@k:** how many of the top k are relevant? Matters when the context budget is tight.
- **MRR:** how early is the first relevant result? Useful when one passage answers the question.
- **nDCG:** ranking quality with graded relevance, for questions that need several passages.

### Generation metrics

- **Groundedness:** each claim is supported by the cited passage.
- **Correctness:** the answer matches the reference.
- **Completeness:** the answer includes every required fact.
- **Citation accuracy:** each citation points to the passage that supports its claim.
- **Refusal correctness:** the system says "not found" when the evidence is absent, and answers when it is present.

A model-based judge can score these at scale. Calibrate it against human labels on a sample, and watch for bias toward longer answers. Human review remains the reference for high-stakes questions.

### Debugging trace

For each query, record the sanitized query, the rewritten query, filters, the candidate IDs from each path with their scores, the reranked order, the final context, the model and prompt versions, latency per stage, and any error. Do not log private document text indiscriminately; log IDs and hashes, and retrieve the text on demand under your access policy.

```python
from dataclasses import dataclass, field


@dataclass
class RetrievalTrace:
    query_original: str
    query_rewritten: str
    tenant_id: str
    lexical_ids: list[str] = field(default_factory=list)
    vector_ids: list[str] = field(default_factory=list)
    fused_ids: list[str] = field(default_factory=list)
    final_ids: list[str] = field(default_factory=list)
    model_version: str = ""
    prompt_version: str = ""
    latency_ms: dict[str, float] = field(default_factory=dict)
```

### Worked diagnosis

An assistant gives an outdated travel-expense limit. The trace shows that the current policy is indexed, but it ranks fourth, and the top three are old versions with similar titles. Changing the prompt would not fix this. The fix is in ingestion (retire superseded versions) and in version filtering (apply `pick_current`). Then rerun the same golden cases and confirm the new ranking.

## 6. Advanced architectures

Some systems adapt their retrieval after looking at the first results. These can help when question difficulty varies widely, but they add routing decisions, extra calls, and new failure modes. Start with a single well-evaluated hybrid pipeline. Add adaptive behavior only when your golden set shows a measurable need.

- **Adaptive RAG:** route simple questions to a short path and complex ones to a deeper path. A wrong route can skip evidence, so evaluate the router.
- **Corrective RAG (CRAG):** check whether retrieved evidence is adequate. If not, refine the query, try another source, or ask the user. This needs a reliable signal of poor retrieval, or it only adds calls.
- **Self-RAG:** a research approach in which the model is trained or prompted to decide when to retrieve and to critique its own support. The name refers to a specific family of methods. Do not use it as a label for any system that searches twice.
- **Agentic RAG:** the model chooses among approved retrieval tools and issues follow-up searches (Chapter 11). Useful for exploratory and multi-hop questions. Adds variable latency, tool cost, and control complexity.

Example of when agentic retrieval fits: an internal assistant investigating a failed deployment searches incident history, then deployment notes, then a dependency runbook, depending on what each source reveals. The next search cannot be defined in advance.

## 7. Knowledge graphs and GraphRAG

A knowledge graph stores entities and relationships: services, owners, dependencies, incidents. Graph retrieval answers questions that need several connected facts.

Example: "Which services owned by team A depend on the database affected by incident 204?" This requires traversing ownership, dependency, and incident relationships. Similarity search over text can find passages about those things but cannot reliably follow the chain.

Pipeline: extract entities and relations from trusted sources, normalize identifiers, keep a link from every edge to its source, store the graph, then traverse it to find the relevant entities and retrieve their supporting passages.

Trade-offs to state plainly:

- Entity extraction can be wrong, and a wrong edge produces a confident wrong answer.
- Relationships change, so the graph needs maintenance.
- A graph is not automatically more accurate than hybrid search with good metadata.

Use a graph when relationships are central to the question. A service catalog with explicit owner and dependency fields is often better than an extracted graph: the data is already structured.

## 8. Security and multi-tenancy

Retrieval is an authorization boundary. The model must never receive a passage the requesting user cannot read, even if that passage would make the answer better.

- **Tenant isolation:** derive the tenant from the verified session, never from the question or the model. Test cross-tenant queries on every release.
- **Document-level access:** keep access metadata through ingestion. Recheck permissions at retrieval time, especially when permissions change faster than the index updates.
- **Prompt injection in documents:** retrieved text can contain instructions. Treat it as data (Chapter 13). A citation does not make injected text safe.
- **Personal data:** minimize personal information in embeddings, indexes, traces, and evaluation sets. Apply retention and deletion rules to each store.
- **Cache keys:** a cache key that ignores tenant identity is a data leak waiting to happen.

An HR example: a recruiting assistant searches candidate notes across several customer organizations. The backend resolves the authenticated organization first and filters every query by it. No candidate record from another organization reaches the prompt, even if it would match better.

## 9. Production operations

A prototype becomes a service when freshness, search quality, failure handling, and cost are measured together.

### Freshness

Track the time from a source change to the index update. Keep the index version in every answer's trace. Define what happens when ingestion fails: keep serving the last good version and alert, or stop serving that source. For critical facts, such as a current price or an account balance, do not rely on the index at all. Query the system of record.

### Caching

Cache retrieval results or answers only when the source version, the user's permissions, and an expiration rule make reuse safe. Invalidate when a source document changes. Partition the cache by tenant.

### Latency

Measure each stage: query rewriting, embedding, lexical search, vector search, fusion, reranking, context assembly, and generation. The model is often not the bottleneck. Embedding and reranking calls can dominate, and a slow index can dominate both. Optimize the slowest stage that matters to the user.

### Cost

Include embedding and re-indexing cost, storage, reranking, and model tokens. Report cost per **successful answer**, not cost per call. A cheaper pipeline that returns more "not found" answers can cost more per useful result.

### Reliability

Apply timeouts, retries with backoff for transient errors (Chapter 14), and graceful fallbacks. A fallback when retrieval fails is a clear message, not an answer generated without evidence. Version every component: prompt templates, embedding model, index schema, chunking rules, and reranker. Then a failure can be reproduced.

### Example: a SaaS help assistant

The assistant uses incremental indexing for changed help articles, logs retrieval metrics for every query, runs the golden evaluation set before each release, and flags stale or unauthorized sources in the trace. A release that fails a retrieval gate does not ship, even if the answer quality looks fine on a few examples.

## 10. Practical decision guide

| Symptom | First check | Likely technique |
|---|---|---|
| Exact codes or identifiers not found | Lexical path recall | Lexical search, metadata filters |
| Paraphrased questions not found | Vector path recall | Vector search, query rewriting |
| Relevant passages found but ranked low | Precision@5, MRR | Reranking |
| Right sentence found, exception missing | Context completeness | Parent-child retrieval |
| Questions depend on relationships | Multi-hop failures | Graph or structured retrieval |
| Investigation needs several searches | Recall after first search | Agentic retrieval, evaluated |
| Answers unreliable, retrieval looks fine | Groundedness, citation accuracy | Prompt, validation, grader |
| Old policy returned | Index version and ingestion log | Ingestion and version filters |

Check retrieval before you change prompts or models. Most RAG problems are visible in the trace before they are visible in the answer.

## Use it when

- The corpus is large, changes often, or is regulated.
- Answers are used for decisions, and wrong answers have a cost.

## Avoid it when

- You have not built the basic pipeline and its evaluation. Advanced techniques on an unmeasured system add complexity without knowing what they fixed.

## Trade-offs

Each technique adds a stage, a dependency, a cost, and a latency. Reranking improves precision and adds time. Contextual descriptions improve recall and add an offline generation step and storage. Graphs improve multi-hop questions and add maintenance. Agentic retrieval improves flexibility and makes behavior harder to test. Adopt each one with a measured gain.

## Common mistakes

1. **Tuning the reranker before fixing ingestion.** The parser's losses are invisible to the reranker.
2. **Measuring only the final answer.** You cannot tell which stage to fix.
3. **Returning superseded versions.** Retire them at ingestion, not at answer time.
4. **Caching across tenants.** The cache key must include the tenant.
5. **Quoting external benchmark numbers as your results.** Measure on your own golden set.

## Key takeaway

Quality, freshness, security, latency, and cost must be measured together. A RAG system is trustworthy when you can explain, for any answer, which document version it came from, who was allowed to see it, and why it was ranked first.

## Exercises

1. Take the golden set from Chapter 16. Add a reranker stage and measure precision@5 and MRR before and after. Report the added latency at the median and the 95th percentile.
2. Parse three documents that contain tables. Compare the extracted text with the original. List every place a row lost its column label, and fix one class of error.
3. Implement version retirement: when a policy is re-uploaded, confirm that a query returns only the new revision, and that the old chunks are gone from both indexes.
4. Write a cross-tenant test suite with ten queries across two tenants. Confirm that no retrieved ID and no prompt contains another tenant's content.
5. Write a one-page runbook for a stale index: detection, rollback to the last good version, and the owner who approves a re-index.
