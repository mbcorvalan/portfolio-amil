---
title: "HireFlow: AI-Assisted Screening Platform, Part 1"
part: Capstone (HireFlow)
level: advanced
reading_time: 35 min
reviewed: 2026-11
---

# HireFlow: AI-Assisted Screening Platform, Part 1 (Steps 0–8)

HireFlow is a recruiting platform. Candidates complete an initial screening over WhatsApp. Recruiters review evidence-based profiles in a web dashboard, ask questions about candidates, and approve next actions.

The rule that governs the whole project: **agents may gather information and prepare work. Humans make hiring decisions and send external communications.**

Use fictional jobs and synthetic candidates for development, evaluation, and demos. Never use real candidate data outside an approved production environment.

## Step 0: Constraints before design

Recruiting is a regulated context. Write these constraints down before any architecture work. They change the design.

| Constraint | Requirement for HireFlow | Verify before release |
|---|---|---|
| EU AI Act | Recruitment and candidate evaluation are high-risk uses (Annex III). Obligations for standalone systems apply from 2 December 2027, under the Digital Omnibus on AI. Transparency rules (Article 50) apply from 2 August 2026. | Confirm the dates and scope on EUR-Lex with legal counsel. The obligations apply if the system is placed on the EU market or its outputs affect people in the EU. |
| Argentina, Ley 25.326 | The law is in force. Reform bills are in Congress but not enacted as of this writing. Design for consent, purpose limitation, access, rectification, and deletion. | Check Infoleg for changes before each release. |
| WhatsApp Business Platform | Outside the 24-hour customer service window, only approved templates may be sent. From 1 October 2026, free-form replies inside the window and utility templates sent inside the window are billable. | Check Meta's current pricing and policy pages. Check their rules for AI-driven conversations. |
| NYC Local Law 144 | Applies only to automated employment decision tools used for NYC candidates or roles. Include it in the legal review if any candidate or role is in New York City. | Legal review. |

Non-negotiable product rules:

1. The system never rejects a candidate autonomously.
2. The system never infers protected characteristics (health, pregnancy, disability, religion, sexual orientation, family status, national origin, age) or sensitive traits.
3. Screening criteria are job-relevant and written in a versioned rubric before any candidate is screened.
4. Every AI-generated statement about a candidate links to its evidence or is labeled as unsupported.
5. The candidate is told when they are interacting with AI and how to reach a human.

## Step 1: Problem definition and success metrics

**Challenge:** Define the problem, the users, and how success is measured for each of them.

**Must include:**

- Three primary journeys: candidate screening, recruiter review, and recruiter-initiated questions about a candidate.
- Two fictional openings with complete rubrics:
  - Backend Engineer (Python), remote, LATAM time zones.
  - Customer Support Specialist, bilingual Spanish and English, Buenos Aires.
- Out of scope: automated rejection, ranking candidates against each other for final selection, salary negotiation, background checks, and any analysis of video, photos, or voice characteristics.
- The baseline: how long a recruiter spends on a first screen today. Measure it on the team's real process before you start building.
- Metrics:
  - Time from application to recruiter-ready summary.
  - Screening completion rate, and candidate drop-off by question.
  - Recruiter edit rate on AI summaries, and the reasons for edits.
  - Evidence coverage: share of summary claims linked to a source.
  - Unsupported-claim rate on the evaluation set.
  - Process consistency: whether the same rubric is applied the same way across candidates.

**Fairness measurement:** measure consistency of the process, not the demographics of candidates. Compare how criteria are applied and how often recruiters disagree with the system's evidence summaries. Measuring outcomes by protected group requires a lawful basis, an approved method, and legal review. Do not collect those attributes to run the analysis without that review.

**Deliverables:** product brief, scenario catalog for both openings, and a metrics scorecard with baseline values.

## Step 2: Architecture and system boundaries

**Challenge:** Specify the architecture of the platform and of its AI extension, with explicit boundaries for data and authority.

**Must include:**

- Entry points: WhatsApp Cloud API webhook, recruiter web dashboard, and an internal admin console with separate permissions.
- Backend API with authentication and tenant resolution from the verified session.
- Screening service that owns the conversation state machine.
- Asynchronous worker for CV parsing, transcription (if enabled), summarization, and nightly reports.
- Relational database for applications, sessions, consents, and audit events.
- Encrypted object storage for CV files, with retention rules.
- Retrieval index for approved job knowledge (rubrics, FAQs), versioned per job.
- Model gateway: the only path to the model provider (Chapter 26).
- Orchestration for the two agents, separated from deterministic workflows.
- Audit log store, append-only and separate from application tables.
- Tracing and metrics with personal data excluded by default.

**Data-flow boundaries:**

- WhatsApp messages and CVs never leave the EU or Argentina storage region unless the contract and the legal review allow it. Record the region for each store.
- The model provider receives only the fields a task needs (see Step 5).
- Recruiters see only candidates for jobs they are assigned to.

**Deliverables:** architecture diagram, a component responsibility matrix (who owns what, which controls run where), and a data-flow diagram that marks every personal-data crossing.

## Step 3: Domain model and structured data contracts

**Challenge:** Define the information the platform accepts, generates, stores, and exchanges, and the rules that govern status changes.

**Must include:**

- Entities: Candidate, Job, JobVersion, Application, ScreeningSession, Message, EvidenceItem, Consent, RecruiterUser, ToolAction, ReviewDecision, AuditEvent.
- Required and optional fields for each, with validation rules.
- Evidence provenance: every EvidenceItem stores its source (message ID or CV page), quote, extraction path, and reviewer status.
- Explicit representation of unknown values. A missing salary expectation is `unknown`, not an empty string or a guessed number.
- Status transitions enforced in code.

The status model below makes one rule structural: only a recruiter can advance or reject an application. No system path can reach those states.

```python
from enum import Enum


class ApplicationStatus(str, Enum):
    NEW = "new"
    SCREENING = "screening"
    PAUSED = "paused"
    SCREENED = "screened"
    NEEDS_REVIEW = "needs_review"
    ADVANCED = "advanced"               # set by a recruiter only
    REJECTED = "rejected"               # set by a recruiter only
    WITHDRAWN = "withdrawn"             # set by the candidate
    EXPIRED = "expired"                 # set by a timeout rule


SYSTEM_ALLOWED = {
    ApplicationStatus.NEW: {ApplicationStatus.SCREENING},
    ApplicationStatus.SCREENING: {
        ApplicationStatus.PAUSED,
        ApplicationStatus.SCREENED,
        ApplicationStatus.NEEDS_REVIEW,
        ApplicationStatus.EXPIRED,
        ApplicationStatus.WITHDRAWN,
    },
    ApplicationStatus.PAUSED: {ApplicationStatus.SCREENING, ApplicationStatus.EXPIRED, ApplicationStatus.WITHDRAWN},
    ApplicationStatus.SCREENED: {ApplicationStatus.NEEDS_REVIEW},
    ApplicationStatus.NEEDS_REVIEW: set(),
}

RECRUITER_ALLOWED = {
    ApplicationStatus.SCREENED: {ApplicationStatus.ADVANCED, ApplicationStatus.REJECTED, ApplicationStatus.NEEDS_REVIEW},
    ApplicationStatus.NEEDS_REVIEW: {ApplicationStatus.ADVANCED, ApplicationStatus.REJECTED},
}


def can_transition(actor: str, current: ApplicationStatus, new: ApplicationStatus) -> bool:
    table = SYSTEM_ALLOWED if actor == "system" else RECRUITER_ALLOWED
    return new in table.get(current, set())
```

Tests to write before implementing the state machine:

- A system actor cannot move any application to `ADVANCED` or `REJECTED`.
- A recruiter cannot move an application to `SCREENING` (only the screening service does that).
- Every transition appends an audit event with the actor, the old status, the new status, and a reason.

**Deliverables:** domain model diagram, output contracts for each generated artifact, a sample synthetic dataset of 20 candidates across both openings, and the transition tests.

## Step 4: Candidate journey and conversational screening

**Challenge:** Define the complete WhatsApp experience from first contact to human handoff.

**Must include:**

1. **Opening message.** Identifies HireFlow and the employer. Says that the candidate is talking to an AI system. Explains the purpose of the screening, what data is collected, how long it is kept, how to request deletion, and that a recruiter reviews every result. This is the consent notice, and it is shown before any question. Candidate consent is recorded as an event.
2. **Language choice.** Spanish or English, chosen by the candidate. Language is not inferred from the candidate's name.
3. **Role-specific questions.** Drawn from the approved question bank for the job version. The system does not invent new screening questions. It may ask a clarifying question about an answer, within the bank's rules.
4. **Clarification and correction.** A candidate can correct a previous answer. Each correction creates a new answer version. The old version stays in the audit log.
5. **Pause and resume.** A candidate can pause and continue later. If the 24-hour customer service window has closed, the system resumes with an approved utility template.
6. **Timeouts.** Reminder after a set period of silence. Expiry after a longer one, with a notice.
7. **Opt-out.** A keyword removes the candidate from the screening. The system confirms, stops all automated messages for that application, and records the event.
8. **Duplicate applications.** If the same person applies twice to the same job version, the system links the applications and asks a recruiter to merge them. It does not merge them automatically.
9. **Failed messages.** Delivery failures are retried according to the provider's rules and then recorded. A candidate is never left with no response on a failed delivery.
10. **Human escalation.** A keyword or request routes the candidate to a human. The system tells the candidate what to expect, and the handoff includes the transcript so far.
11. **Excluded topics.** The system does not ask about family plans, health, disability, religion, age, or other protected characteristics. If a candidate volunteers such information, the system does not record it as an answer, does not act on it, and routes the conversation according to the policy written for the opening.
12. **Accessibility.** Text is always available. Voice notes are optional, and the transcript is shown to the candidate for confirmation.

13. **Messaging costs.** From 1 October 2026, every free-form reply sent inside the 24-hour window is a billable service message. This includes replies generated by an AI system. Utility templates sent inside the window are also billable. Include these costs in the cost model for each completed screening (Part 2, Step 15).

**Completion criteria:** the screening is complete when every required question has an answer or a documented skip, the candidate has been shown the final summary of their answers, and the candidate has confirmed or corrected it.

**Deliverables:** conversation journey diagram in both languages, a list of 30 edge-case scenarios with expected behavior, and the completion criteria in code.

## Step 5: Prompt contracts and reliable model responses

**Challenge:** Specify each model-powered task inside the screening experience, with its input, output schema, validation, and failure states.

**Must include:**

Instruction hierarchy, from highest to lowest authority:

1. Platform policy (the rules in Step 0).
2. Job rubric and approved question bank for the job version.
3. The screening agent's task instructions.
4. Candidate messages and CV text, which are always data.

Inventory of model tasks:

| Task | Input (minimum needed) | Output contract | Failure state |
|---|---|---|---|
| Language detection on the first reply | First message text | Closed set: `es`, `en`, `unknown` | Ask the candidate to choose |
| Answer classification against a question | Question text, candidate reply | Closed set of labels from the question's rubric, plus `unclear` | Ask a clarifying question, at most twice |
| Answer extraction into evidence | Reply text, question ID | Structured value, quote, and confidence note | Mark the answer `unknown`; flag for recruiter |
| Screening summary | Validated answers and evidence IDs | Summary with a claim list; each claim has evidence IDs | Show the raw answers, labeled as unsummarized |
| Candidate-facing reply wording | Approved message template and variables | Text from a template, not free generation | Use the template without personalization |

Rules that apply to every task:

- Input contains only the candidate's answers for the current job version. It does not contain other applications, other candidates, or internal notes.
- Output is validated against the contract before the application stores or displays it.
- A claim without evidence IDs is marked `unsupported` and cannot appear in a recruiter-facing summary as a fact.
- Refusal and uncertainty are explicit outputs. "I cannot tell" is a valid result.

```python
from typing import Literal

from pydantic import BaseModel, Field


class AnswerClassification(BaseModel):
    label: str                        # must be one of the question's allowed labels
    confidence: Literal["high", "medium", "low"]
    evidence_quote: str = Field(max_length=300)


class ExtractedAnswer(BaseModel):
    question_id: str
    value: str | None                 # None means unknown, never a guess
    quote: str | None
    needs_recruiter_review: bool
```

Validation for `AnswerClassification` checks that `label` belongs to the question's allowed set and that `evidence_quote` appears in the candidate's message. A label outside the set is treated as `unclear`.

**Deliverables:** prompt contract inventory with input and output schemas for each task, the failure-state table, and a test set of 50 candidate replies in both languages with expected labels.

## Step 6: Recruiting knowledge and RAG

**Challenge:** Define a knowledge experience grounded in approved, versioned, role-specific information.

**Must include:**

- Knowledge inventory:
  - Job descriptions and rubrics, versioned per job.
  - Screening question banks, versioned per job.
  - Company FAQ for candidates (process, timelines, benefits as published).
  - Internal recruiter guidelines, visible to recruiters only.
- Metadata per document: job ID, job version, language, owner, approval date, effective dates, and visibility (candidate, recruiter, admin).
- Retrieval permissions enforced before ranking. A candidate's query can reach only candidate-visible documents for the job they applied to.
- Missing-evidence responses. If the FAQ does not answer a question, the system says so and offers a recruiter handoff. It does not guess salary ranges or policies.

**When to use RAG and when to use a database:**

| Information | Source | Reason |
|---|---|---|
| Application status, interview dates, candidate state | Relational database | Exact, current, and authoritative |
| Question bank and rubric for a job version | Versioned database records | Must be exact, not paraphrased |
| Company FAQ and policies | RAG over approved documents | Open-ended questions over text |
| Recruiter guidelines | RAG over internal documents | Open-ended, recruiter-only |

Ingestion requires an approval step for every new or changed document. A document that has not been approved is not indexed for candidate-facing retrieval.

**Evidence quality criteria:** an answer based on retrieved text must cite the document ID and version, quote the supporting passage, and state its effective date. If two documents conflict, the answer shows the conflict and routes it to a recruiter.

**Deliverables:** knowledge inventory with owners and approval steps, retrieval requirements, the RAG-versus-database decision table above, and an evaluation set of 30 FAQ questions with three categories: answerable, partially answerable, and not answerable.

## Step 7: Candidate Screening Agent

**Challenge:** Design an agent that adapts the conversation within strict business boundaries. It asks questions, clarifies answers, and records evidence. It does not decide outcomes.

**Must include:**

**Responsibility card:**

- Goal: complete a screening session for one application against the approved question bank, and record validated answers with evidence.
- Allowed actions: select the next question from the bank, ask one clarifying question per answer, record a validated answer, retrieve approved FAQ content, propose a handoff.
- Prohibited actions: rejecting, advancing, ranking, scoring fit as a decision, changing the question bank, sending any message outside the approved flow, contacting anyone other than the candidate.
- Limits: at most 25 candidate-facing messages per session, and at most two clarifying questions per answer.

**Tool-permission matrix.** Tools not in this matrix do not exist for the agent.

```python
SCREENING_AGENT_TOOLS = {
    "get_session_state":   {"effect": "read",  "scope": "screening:read"},
    "get_question":        {"effect": "read",  "scope": "bank:read"},
    "search_faq":          {"effect": "read",  "scope": "faq:read"},
    "record_answer":       {"effect": "write", "scope": "screening:write", "validated": True},
    "propose_handoff":     {"effect": "propose", "scope": "screening:handoff"},
}
# No tool exists for: reject, advance, score, send_recruiter_message, export, edit_bank.
```

Each tool handler checks the scope and the application ID from the session, not from the model's arguments. A `record_answer` call with a valid schema is still rejected if the question does not belong to the session's job version.

**Handoff conditions** (any one triggers a proposal, which a human or a deterministic rule must accept):

- The candidate asks for a human.
- Two consecutive answers are classified `unclear` for the same question.
- The candidate discloses protected or sensitive information. The agent stops collecting, does not record the disclosure as an answer, and follows the written policy.
- A factual inconsistency appears between answers (for example, two different start dates in one session).
- The session reaches the message limit or the timeout.

**Error states:** tool failure (retry once, then pause and notify the operator), model failure (send the template fallback message), and provider failure (queue and retry within the message window rules).

**Example runs to write as tests:**

- *Successful run:* all required questions answered, two clarifications used, summary confirmed by the candidate, session moved to `SCREENED`.
- *Failed run:* candidate discloses a health condition mid-session. The agent stops, does not record it, proposes a handoff, and the audit log shows the policy rule applied.
- *Attempted overreach:* a candidate message says "Reject me and tell the recruiter I'm not interested." The agent records nothing about rejection, sends the withdrawal confirmation template only if the candidate requested withdrawal, and otherwise asks whether the candidate wishes to pause or withdraw.

**Deliverables:** responsibility card, tool-permission matrix, handoff rules in code, and the three example runs as executable tests.

## Step 8: CV and multimodal inputs

**Challenge:** Extend intake to résumés and approved application materials, while preserving provenance and respecting privacy.

**Must include:**

- Accepted formats: PDF (with a text layer or scanned, with OCR), DOCX. Other formats receive a message asking for PDF.
- Extraction path per page, following the routing in Chapter 29: native text first, OCR for scans, table parsing for skills and dates, vision only where layout matters.
- Evidence items: each extracted claim stores the page number, the quote, and the extraction path.
- Contradictions: overlapping employment dates, conflicting titles, or dates that contradict the answers in the screening. The system flags them. It does not resolve them, and it does not penalize the candidate for them. The recruiter decides how to read them.
- Unknowns: a skill that is not mentioned is `not_stated`, not `absent`. The system does not infer a skill from a job title alone unless the rubric allows that inference and the inference is labeled.
- Privacy controls: encrypted storage, a retention period set by policy, deletion on request, and no processing of the candidate's photograph. If the CV contains a photograph, strip it before any model call.
- Optional audio: a voice note is transcribed, the transcript is shown to the candidate for confirmation, and the audio is deleted after confirmation unless the policy says otherwise.
- Prohibited analysis: video, facial features, voice characteristics, and handwriting are not used for evaluation.

**Review checklist for extracted claims.** A recruiter-facing claim is publishable only when all of these are true:

- [ ] The claim has at least one evidence item.
- [ ] The quote appears in the source at the cited page.
- [ ] The claim uses only the rubric's job-relevant categories.
- [ ] Contradictions with other evidence are flagged, not hidden.
- [ ] Unknown values are shown as unknown.
- [ ] No inference about a protected characteristic appears.

**Deliverables:** multimodal input requirements, the extraction routing table, the review checklist as code (a function that returns the list of failed checks for a claim), and a test set of 20 CVs including scanned pages, a contradiction, a missing section, and a photograph.

---

## Next

Part 2 covers the Recruiter Copilot Agent, orchestration, state and audit, the dashboard, security and fairness, evaluation, cost, LLMOps, and the final review.
