---
title: "Multimodal AI and Real-Time Systems"
part: IX
level: advanced
reading_time: 24 min
reviewed: 2026-11
---

# 29. Multimodal AI and Real-Time Systems

A multimodal system handles more than text: images, scanned pages, PDFs, audio, and video. Each modality has its own failure modes, costs, and privacy issues. Multimodal input is valuable when the information truly lives in the image or the recording. It adds complexity when a text source would have done the job.

The same principle applies throughout this handbook. Use the cheapest reliable path first, and add a model step only where it earns its place.

## Modalities and capabilities

A **modality** is a type of content: text, image, document, audio, or video. A capability is something a system does with a modality. Keep the two apart when you design:

| Capability | Input | Output | Example |
|---|---|---|---|
| Visual understanding | Image or PDF page | Text, structured data | Reading a nameplate, answering a question about a chart |
| OCR | Scanned image | Text | Digitizing a paper form |
| Speech recognition (STT) | Audio | Text | Transcribing a meeting |
| Speech synthesis (TTS) | Text | Audio | Reading an answer aloud |
| Video understanding | Frames, audio, timestamps | Text, events | Summarizing a training recording |
| Image generation | Text | Image | Creating a diagram |

Check each capability against the current documentation of the provider you use. Support differs by model and changes over time. Do not assume that one model covers every row.

## Claude and multimodal input

Claude models accept images and PDFs in the Messages API. Images and PDF documents are sent as content blocks alongside text. The structure below follows the Messages API. Check the current field names for the file types and sizes you use.

```python
import base64
from pathlib import Path

import anthropic

client = anthropic.Anthropic()
MODEL = "claude-sonnet-5-5"  # check the models page before shipping


def image_block(path: Path, media_type: str) -> dict:
    data = base64.standard_b64encode(path.read_bytes()).decode("ascii")
    return {
        "type": "image",
        "source": {"type": "base64", "media_type": media_type, "data": data},
    }


def ask_about_image(path: Path, question: str) -> str:
    response = client.messages.create(
        model=MODEL,
        max_tokens=600,
        messages=[{
            "role": "user",
            "content": [
                image_block(path, "image/png"),
                {"type": "text", "text": question},
            ],
        }],
    )
    if response.stop_reason == "max_tokens":
        raise RuntimeError("answer truncated")
    return "".join(b.text for b in response.content if b.type == "text")
```

Put the image before the question, and refer to it precisely in the question. "Which value is in the top-right box of the table?" gets a better answer than "What does this say?"

Limits to plan for:

- Image size and count per request, and how resolution affects cost and detail. Check the current limits.
- Visual reasoning errors on small text, rotated scans, dense tables, charts, counting, and spatial relations.
- The model can describe something plausible that is not actually visible.

Treat every image and every PDF as untrusted input. A screenshot or a scanned page can contain text that tries to instruct the model (Chapter 13).

## Choosing the extraction path

Vision is not always the best tool. A document pipeline usually follows this order:

1. **Native text layer.** If a PDF has selectable text, extract it directly. It is exact and cheap.
2. **OCR** for scanned pages with no text layer. Verify numbers, codes, and dates, because OCR errors concentrate there.
3. **Layout and table parsing** to keep rows, columns, and headers together.
4. **Vision model** only where visual context matters: a diagram, a stamp, a handwritten annotation, a chart whose meaning depends on its layout.

A routing function makes the choice explicit:

```python
from dataclasses import dataclass


@dataclass(frozen=True)
class PageInfo:
    has_text_layer: bool
    text_chars: int
    has_images: bool
    contains_table: bool
    visual_content_matters: bool


def extraction_path(page: PageInfo) -> str:
    if page.has_text_layer and page.text_chars > 50:
        if page.contains_table:
            return "parse_table"        # keep column headers with values
        return "native_text"
    if page.visual_content_matters:
        return "vision_model"
    return "ocr"
```

The thresholds are illustrative. Tune them on your own documents. The important part is that the route is recorded with each extracted fact, so a reviewer can see how it was produced.

## Structured extraction with provenance

A value extracted from a document is a claim. Store its page, its region when available, its original unit, and the source ID, so a reviewer can verify it.

```python
from pydantic import BaseModel, Field


class ExtractedValue(BaseModel):
    name: str
    value: str | None                      # None when the value is not legible or not present
    unit: str | None
    page: int = Field(ge=1)
    extraction_path: str                   # native_text, parse_table, ocr, or vision_model
    confidence_note: str | None = None     # for example "digit partly obscured"
```

Rules for uncertain values:

- If a number is unreadable, return `None` and a note. Do not invent a value.
- Keep units exactly as written. A value in "kg" and a value in "lb" are different facts.
- Check each extracted value against an authoritative source when one exists, such as a catalog or a database.

For exact measurements and calculations, use the extracted data with ordinary code. The model's reading of a chart is a visual interpretation, and it should be labeled as one.

## Speech: cascaded and end-to-end

A **cascaded** voice system runs speech-to-text, then a text model, then text-to-speech:

```text
microphone -> STT -> text model (with retrieval, validation) -> TTS -> speaker
```

Its advantage is inspectability. You can read the transcript, apply the same text validation as elsewhere, and replace one component at a time. Its weakness is compounded error: a transcription mistake in a model number changes the answer.

An **end-to-end** speech model processes audio directly and can produce audio. It can preserve timing and tone, and it is harder to inspect and control. Whether a provider offers such a model, and what it supports, changes over time. Check current documentation.

For many products, a text interface with speech recognition for input is enough, and it avoids the cost and complexity of spoken output.

### Real-time sessions

Real-time voice needs more than a model call:

- Voice activity detection and endpointing: deciding when the user has finished speaking.
- Interruptions: stopping playback when the user speaks.
- Partial and final transcripts: partial text is provisional.
- Connection handling: reconnecting without losing the conversation state.
- Timeouts: saying something sensible when the model is slow.

If a spoken command triggers an action, require server-side authorization and confirmation before the action runs. A voice command is not proof of identity, and speaker identification is not authentication.

### Accuracy in speech

Measure word error rate (WER) or character error rate (CER) on human-reviewed recordings from your real environment: accents, background noise, and your domain's vocabulary. Then measure what matters more: whether transcription errors change the downstream result. A small error in a serial number can matter more than many errors in punctuation.

Confirm critical values with the user. Show the transcript, let the user correct it, and read back names, numbers, and dates.

Voice data is sensitive. Set rules for consent, retention, and deletion before you record anything.

## Video

Video adds time. A useful pipeline samples frames, reads subtitles or the audio transcript, keeps timestamps, and combines visual and spoken evidence.

Sampling trades cost for coverage. Sampling every few seconds is cheap and can miss short events. Denser sampling catches them and costs more. Choose the rate by the events you must not miss, and test it on recordings where those events happen quickly.

For a question about one moment, retrieve the segment around it and analyze that segment. Analyzing a whole long recording for a narrow question wastes cost and dilutes attention.

Keep timestamps on every claim. "The installation step is at 04:12" can be checked. "The installation is shown in the video" cannot.

## Multimodal retrieval

A user may ask a question with a photo, a voice message, or a PDF, and expect an answer from your documents. The application converts or embeds the input, retrieves relevant text, pages, or segments, and answers with references. Two approaches:

- **Convert to text.** Captions, transcripts, and extracted text are searchable with the methods from Chapters 16 and 17. This is simpler and easier to inspect, but it loses visual detail.
- **Cross-modal embeddings.** Images and text share one vector space. This can match visual content directly. It needs its own evaluation, and it is harder to debug.

In both cases, filter by tenant and document permissions before retrieved content reaches the model.

## Architecture

Interactive path:

```text
UI (text, microphone, or file input)
  -> API / BFF: authenticate, validate media type and size
  -> preprocessing: OCR, transcription, frame selection, resizing
  -> retrieval (authorized)
  -> model call
  -> validation (contract, evidence, page or timestamp references)
  -> response with citations or accessible captions
```

Background path:

```text
upload
  -> object storage (original file, checksum, retention policy)
  -> queue
  -> worker: text extraction, OCR, transcription, frame sampling
  -> derived artifacts (text, page images, transcript) with versions
  -> index and status
```

Keep the original file, the derived artifacts, and the processing versions. When the OCR engine or the sampling rate changes, you can reprocess and compare.

Process large media outside the interactive request. Keep provider credentials on the backend.

## Security and privacy

Images, recordings, and video can contain faces, voices, addresses, location metadata, and background conversations. Apply these controls:

- **Minimize.** Upload only what the task needs. Crop images to the relevant region when possible.
- **Strip metadata** that is not needed, such as location data in photos.
- **Restrict access** to the original media, and set retention limits for each stored copy.
- **Get consent** before recording people or generating a voice that resembles someone.
- **Treat content as untrusted.** A PDF or a recording can carry a prompt injection. Policy in the application controls what the model may do, not what the media says.

Generated and transformed media need provenance. Track the source asset, the model, and the version. When you show AI-generated or AI-modified content, label it. Do not present a synthetic voice or image as verified evidence. A model's description of a photo cannot authenticate the photo, identify a person, or prove that footage is genuine.

## Cost, latency, and user experience

Media costs scale with size, resolution, duration, and frame count. Reduce them carefully:

- Crop images to the region that matters.
- Lower the frame rate when the events are slow.
- Process uploads asynchronously and show progress.
- Do not compress so much that small labels, chart scales, or spoken model numbers become unreadable.

Show the user what the system is doing: uploading, extracting, transcribing, searching, generating. Let users review and correct extracted fields and transcripts. Provide a text alternative for every voice interaction and keyboard access for every control.

## Evaluation

Test with the media your users actually produce, not with clean demo files. Include blurry photos, rotated scans, small print, noisy rooms, accents, long recordings, missing audio, and misleading text inside images.

Evaluate each stage and the whole task:

- **Extraction:** field accuracy, missing-value handling, and correctness of page or timestamp references.
- **Transcription:** WER or CER, and downstream intent accuracy.
- **Video:** event recall and timestamp accuracy.
- **Answers:** groundedness, unsupported claims, and refusal behavior when evidence is absent.
- **Operations:** p50 and p95 latency, time to first useful feedback, cost per successful task, and privacy incidents.

## Example: a field technician assistant

A technician asks a question aloud and photographs a machine's nameplate. A reference design:

1. Speech is transcribed. The transcript is shown and editable.
2. The photo is processed: visible text is read, and the model identifier is extracted with its region.
3. If the identifier is uncertain, the system asks the technician to confirm it. It does not guess.
4. The identifier is matched against authorized specification documents.
5. The answer appears as short text with the document title and page. The system states when evidence is missing, and it does not invent a rated limit.

The text path, with typed questions and retrieval, is built and tested first. Voice input and photos are added in separate iterations, each with its own evaluation. This keeps the reliable path working when a sensor or a microphone fails.

## Use it when

- The information is genuinely in the image, the recording, or the video, and cannot be read reliably as text.
- A text-only workflow would miss something the user needs.

## Avoid it when

- A native text layer, OCR, or a transcript alone solves the task.
- You add a vision or speech model to a text workflow without a measured gain.

## Trade-offs

Multimodal input expands what the product can do and adds cost, latency, privacy obligations, and new failure modes. Cascaded speech is inspectable and adds latency. End-to-end speech feels more natural and is harder to control. Sampled video is cheap and can miss events.

## Common mistakes

1. **Using vision for text that is already in a PDF layer.** Extract the text.
2. **Accepting unreadable numbers.** Return null and a note.
3. **Analyzing whole recordings for narrow questions.** Retrieve the segment.
4. **Treating media as trusted.** Images and audio carry instructions.
5. **Keeping raw media indefinitely.** Set retention for each copy.
6. **Presenting AI descriptions as verification.** They are not.

## Key takeaway

Multimodal features are worth their complexity only where the information lives in the media. Start with the cheapest reliable path, record provenance for every extracted fact, and treat every image, document, and recording as untrusted input.

## Exercises

1. Build a `extraction_path` router for your documents. Run it on 50 pages and count how many pages take each path. Decide whether the expensive paths are justified.
2. Extract five values from scanned documents with provenance. Check each against the source by hand, and report the error rate by field type.
3. Measure WER on 20 recordings from your real environment. Then measure the rate of downstream errors caused by transcription, and compare the two numbers.
4. Write a privacy checklist for a photo upload feature: what is stored, for how long, what metadata is removed, and who can access the original.
