import re
import time
from dataclasses import dataclass

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.support import HandoffRule, SupportFAQ, SupportTemplate
from app.schemas.support import SupportDraftPublic, SupportDraftSource


PROMPT_VERSION = "support-grounded-v1"
MODEL_NAME = "grounded-retrieval-v1"
SAFETY_HANDOFF_PATTERNS = {
    "Human assistance requested": ("person", "human", "agent", "staff", "orang", "manusia"),
    "Payment, refund, order, or delivery issue": (
        "payment", "refund", "order", "delivery", "bayaran", "pemulangan", "pesanan", "penghantaran",
    ),
    "Complaint or sensitive concern": ("complaint", "angry", "fraud", "complain", "aduan", "marah", "tipu"),
}
STOP_WORDS = {
    "the", "and", "for", "with", "that", "this", "are", "you", "your", "can", "what", "how",
    "yang", "dan", "untuk", "dengan", "ini", "itu", "saya", "kami", "ada", "boleh", "tentang",
}


@dataclass
class Candidate:
    score: int
    source: SupportDraftSource
    content: str


def _tokens(value: str) -> set[str]:
    return {
        token for token in re.findall(r"[a-zA-ZÀ-ÿ0-9]+", value.lower())
        if len(token) > 2 and token not in STOP_WORDS
    }


def _language(message: str, requested: str) -> str:
    if requested in {"EN", "MS"}:
        return requested
    malay_markers = {"saya", "boleh", "berapa", "harga", "penghantaran", "pesanan", "tolong", "nak"}
    message_words = set(re.findall(r"[a-zA-ZÀ-ÿ0-9]+", message.lower()))
    return "MS" if message_words & malay_markers else "EN"


def _handoff_reason(message: str, rules: list[HandoffRule]) -> str | None:
    normalised = message.lower()
    for reason, patterns in SAFETY_HANDOFF_PATTERNS.items():
        if any(re.search(rf"\b{re.escape(pattern)}\b", normalised) for pattern in patterns):
            return reason
    for rule in rules:
        trigger = rule.trigger.strip().lower()
        if trigger and trigger in normalised:
            return rule.description
    return None


async def create_grounded_draft(
    db: AsyncSession,
    *,
    message: str,
    requested_language: str,
) -> SupportDraftPublic:
    started = time.perf_counter()
    language = _language(message, requested_language)
    faqs, templates, rules = await _load_approved_content(db)
    handoff_reason = _handoff_reason(message, rules)

    if handoff_reason:
        return _result(
            language=language,
            handoff_reason=handoff_reason,
            started=started,
        )

    message_tokens = _tokens(message)
    candidates: list[Candidate] = []
    for faq in faqs:
        text = faq.question_ms if language == "MS" and faq.question_ms else faq.question_en
        answer = faq.answer_ms if language == "MS" and faq.answer_ms else faq.answer_en
        score = len(message_tokens & _tokens(f"{faq.category} {text}"))
        if score:
            candidates.append(Candidate(score, SupportDraftSource(type="FAQ", id=faq.id, label=faq.question_en), answer))
    for template in templates:
        text = template.content_ms if language == "MS" and template.content_ms else template.content_en
        score = len(message_tokens & _tokens(f"{template.category} {template.name} {text}"))
        if score:
            candidates.append(Candidate(score, SupportDraftSource(type="TEMPLATE", id=template.id, label=template.name), text))

    if not candidates:
        return _result(
            language=language,
            handoff_reason="No approved answer is available for this question.",
            started=started,
        )

    candidates.sort(key=lambda item: item.score, reverse=True)
    best = candidates[0]
    return SupportDraftPublic(
        reply=best.content,
        language=language,
        handoff_required=False,
        handoff_reason=None,
        sources=[best.source],
        prompt_version=PROMPT_VERSION,
        model=MODEL_NAME,
        latency_ms=round((time.perf_counter() - started) * 1000),
    )


def _result(*, language: str, handoff_reason: str, started: float) -> SupportDraftPublic:
    return SupportDraftPublic(
        reply=None,
        language=language,
        handoff_required=True,
        handoff_reason=handoff_reason,
        sources=[],
        prompt_version=PROMPT_VERSION,
        model=MODEL_NAME,
        latency_ms=round((time.perf_counter() - started) * 1000),
    )


async def _load_approved_content(db: AsyncSession) -> tuple[list[SupportFAQ], list[SupportTemplate], list[HandoffRule]]:
    faq_result, template_result, rule_result = await db.execute(select(SupportFAQ).where(SupportFAQ.is_active.is_(True))), await db.execute(select(SupportTemplate).where(SupportTemplate.is_active.is_(True))), await db.execute(select(HandoffRule).where(HandoffRule.is_active.is_(True)))
    return faq_result.scalars().all(), template_result.scalars().all(), rule_result.scalars().all()
