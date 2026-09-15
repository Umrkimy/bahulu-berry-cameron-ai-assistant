"""Draft-only semantic RAG for the WhatsApp support workspace."""
import hashlib
import re
import time
from dataclasses import dataclass

from openai import APIConnectionError, APITimeoutError, APIStatusError, AsyncOpenAI, OpenAIError
from sqlalchemy import delete, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.support import HandoffRule, KnowledgeArticle, SupportFAQ, SupportKnowledgeChunk, SupportTemplate
from app.schemas.support import SupportDraftPublic, SupportDraftSource
from app.services.ai_usage_services import AIBudgetExceeded, reserve_ai_usage, settle_ai_usage

PROMPT_VERSION = "support-semantic-rag-v1"
MODEL_NAME = "gpt-4o-mini"
SAFETY_HANDOFF_PATTERNS = {
    "Human assistance requested": ("person", "human", "agent", "staff", "orang", "manusia"),
    "Payment, refund, order, or delivery issue": ("payment", "refund", "order", "delivery", "bayaran", "pemulangan", "pesanan", "penghantaran"),
    "Complaint or sensitive concern": ("complaint", "angry", "fraud", "complain", "aduan", "marah", "tipu"),
    "Allergy or food-safety concern": ("allergy", "allergic", "alergi", "ingredient", "ramuan"),
}
client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY.get_secret_value(), max_retries=0)

@dataclass(frozen=True)
class RetrievedChunk:
    source: SupportDraftSource
    content: str
    similarity: float

def _language(message: str, requested: str) -> str:
    if requested in {"EN", "MS"}: return requested
    markers = {"saya", "boleh", "berapa", "harga", "penghantaran", "pesanan", "tolong", "nak", "adakah"}
    return "MS" if markers & set(re.findall(r"[a-zA-Z0-9]+", message.lower())) else "EN"

def _handoff_reason(message: str, rules: list[HandoffRule]) -> str | None:
    normalised = message.lower()
    for reason, patterns in SAFETY_HANDOFF_PATTERNS.items():
        if any(re.search(rf"\b{re.escape(pattern)}\b", normalised) for pattern in patterns): return reason
    for rule in rules:
        trigger = rule.trigger.strip().lower()
        if trigger and trigger in normalised: return rule.description
    return None

def _handoff(*, language: str, reason: str, started: float) -> SupportDraftPublic:
    return SupportDraftPublic(reply=None, language=language, handoff_required=True, handoff_reason=reason, sources=[], prompt_version=PROMPT_VERSION, model=MODEL_NAME, latency_ms=round((time.perf_counter()-started)*1000), retrieval_mode="HANDOFF")

async def create_grounded_draft(db: AsyncSession, *, message: str, requested_language: str) -> SupportDraftPublic:
    started = time.perf_counter(); language = _language(message, requested_language)
    rules = (await db.execute(select(HandoffRule).where(HandoffRule.is_active.is_(True)))).scalars().all()
    reason = _handoff_reason(message, rules)
    if reason: return _handoff(language=language, reason=reason, started=started)
    if not settings.WHATSAPP_RAG_ENABLED:
        return _handoff(language=language, reason="WhatsApp AI drafts are disabled; a human will assist.", started=started)
    try:
        chunks = await _retrieve(db, await _embed(db, message), language)
    except AIBudgetExceeded:
        return _handoff(language=language, reason="WhatsApp AI monthly budget is reached; a human will assist.", started=started)
    except (OpenAIError, ValueError):
        return _handoff(language=language, reason="An approved answer could not be prepared; a human will assist.", started=started)
    if not chunks:
        return _handoff(language=language, reason="No sufficiently relevant approved answer is available for this question.", started=started)
    try: reply = await _draft(db, message, language, chunks)
    except AIBudgetExceeded:
        return _handoff(language=language, reason="WhatsApp AI monthly budget is reached; a human will assist.", started=started)
    except (OpenAIError, ValueError):
        return _handoff(language=language, reason="An approved answer could not be prepared; a human will assist.", started=started)
    return SupportDraftPublic(reply=reply, language=language, handoff_required=False, handoff_reason=None, sources=[chunk.source for chunk in chunks], prompt_version=PROMPT_VERSION, model=settings.WHATSAPP_RAG_MODEL, latency_ms=round((time.perf_counter()-started)*1000), retrieval_mode="SEMANTIC_RAG")

async def _embed(db: AsyncSession, value: str, *, commit_usage: bool = True) -> list[float]:
    usage = await reserve_ai_usage(db, admin_id=None, model=settings.WHATSAPP_RAG_EMBEDDING_MODEL, source="WHATSAPP_RAG", monthly_budget_usd=settings.WHATSAPP_RAG_MONTHLY_BUDGET_USD, max_input_tokens=min(1200, max(1, len(value)//3)), max_completion_tokens=0, commit=commit_usage)
    try: response = await client.embeddings.create(model=settings.WHATSAPP_RAG_EMBEDDING_MODEL, input=value)
    except (APIConnectionError, APITimeoutError, APIStatusError, OpenAIError):
        await settle_ai_usage(db, usage, outcome="UNCERTAIN", commit=commit_usage); raise
    tokens = response.usage.total_tokens if response.usage else 0
    await settle_ai_usage(db, usage, input_tokens=tokens, output_tokens=0, outcome="COMPLETED", commit=commit_usage)
    return response.data[0].embedding

async def _retrieve(db: AsyncSession, embedding: list[float], language: str) -> list[RetrievedChunk]:
    vector = "[" + ",".join(f"{number:.8f}" for number in embedding) + "]"
    rows = (await db.execute(text("SELECT source_type, source_id, content, 1 - (embedding <=> CAST(:embedding AS vector)) AS similarity FROM support_knowledge_chunks WHERE language = :language ORDER BY embedding <=> CAST(:embedding AS vector) LIMIT 3"), {"embedding": vector, "language": language})).mappings().all()
    result = []
    for row in rows:
        similarity = float(row["similarity"] or 0)
        if similarity < settings.WHATSAPP_RAG_MIN_SIMILARITY: continue
        label = await _source_label(db, row["source_type"], row["source_id"], language)
        if label: result.append(RetrievedChunk(SupportDraftSource(type=row["source_type"], id=row["source_id"], label=label, similarity=round(similarity, 3)), row["content"], similarity))
    return result

async def _source_label(db: AsyncSession, source_type: str, source_id: int, language: str) -> str | None:
    model = {"FAQ": SupportFAQ, "TEMPLATE": SupportTemplate, "ARTICLE": KnowledgeArticle}.get(source_type)
    item = await db.get(model, source_id) if model else None
    if item is None or not item.is_active: return None
    if source_type == "FAQ": return item.question_ms if language == "MS" else item.question_en
    if source_type == "TEMPLATE": return item.name
    return item.title_ms if language == "MS" else item.title_en

async def _draft(db: AsyncSession, message: str, language: str, chunks: list[RetrievedChunk]) -> str:
    context = "\n\n".join(f"[{index + 1}] {chunk.content}" for index, chunk in enumerate(chunks))[: settings.WHATSAPP_RAG_MAX_CONTEXT_TOKENS * 4]
    target_language = "Bahasa Melayu" if language == "MS" else "English"
    usage = await reserve_ai_usage(db, admin_id=None, model=settings.WHATSAPP_RAG_MODEL, source="WHATSAPP_RAG", monthly_budget_usd=settings.WHATSAPP_RAG_MONTHLY_BUDGET_USD, max_input_tokens=min(settings.WHATSAPP_RAG_MAX_CONTEXT_TOKENS + 400, 2000), max_completion_tokens=settings.WHATSAPP_RAG_MAX_COMPLETION_TOKENS)
    try:
        response = await client.chat.completions.create(model=settings.WHATSAPP_RAG_MODEL, temperature=0.2, max_tokens=settings.WHATSAPP_RAG_MAX_COMPLETION_TOKENS, messages=[{"role":"system","content":f"Write a short, natural WhatsApp support draft in {target_language}. Use only the approved context. Do not add facts, prices, policies, promises, or advice not stated there. If context does not answer the question, respond exactly: HANDOFF."},{"role":"user","content":f"Customer message: {message}\n\nApproved context:\n{context}"}])
    except (APIConnectionError, APITimeoutError, APIStatusError, OpenAIError):
        await settle_ai_usage(db, usage, outcome="UNCERTAIN"); raise
    provider_usage = response.usage
    await settle_ai_usage(db, usage, input_tokens=provider_usage.prompt_tokens if provider_usage else 0, output_tokens=provider_usage.completion_tokens if provider_usage else 0, outcome="COMPLETED")
    reply = (response.choices[0].message.content or "").strip()
    if not reply or reply.upper() == "HANDOFF": raise ValueError("Unsupported answer")
    return reply

def _split(content: str, size: int = 1800, overlap: int = 250) -> list[str]:
    return [content[index:index+size] for index in range(0, len(content), size-overlap)] or [content]

def _source_languages(item: object, source_type: str) -> list[tuple[str, str]]:
    if not getattr(item, "is_active", False): return []
    if source_type == "FAQ":
        return [] if not item.question_ms or not item.answer_ms else [("EN", f"{item.category}\n{item.question_en}\n{item.answer_en}"), ("MS", f"{item.category}\n{item.question_ms}\n{item.answer_ms}")]
    if source_type == "TEMPLATE":
        return [] if not item.content_ms else [("EN", f"{item.category}\n{item.name}\n{item.content_en}"), ("MS", f"{item.category}\n{item.name}\n{item.content_ms}")]
    return [] if not item.title_ms or not item.content_ms else [("EN", f"{item.category}\n{item.title_en}\n{item.content_en}"), ("MS", f"{item.category}\n{item.title_ms}\n{item.content_ms}")]

async def sync_knowledge_source(db: AsyncSession, item: object, source_type: str) -> int:
    # Content and its embeddings must succeed or fail together. Usage records
    # join this transaction so an embedding failure cannot leave a half-built
    # knowledge index visible to staff.
    await db.execute(delete(SupportKnowledgeChunk).where(SupportKnowledgeChunk.source_type == source_type, SupportKnowledgeChunk.source_id == item.id)); count = 0
    for language, content in _source_languages(item, source_type):
        for index, chunk in enumerate(_split(content)):
            embedding = await _embed(db, chunk, commit_usage=False)
            db.add(SupportKnowledgeChunk(source_type=source_type, source_id=item.id, language=language, chunk_index=index, content=chunk, content_hash=hashlib.sha256(chunk.encode()).hexdigest(), embedding=embedding)); count += 1
    await db.flush(); return count

async def rebuild_knowledge_index(db: AsyncSession) -> int:
    await db.execute(delete(SupportKnowledgeChunk)); count = 0
    for source_type, model in (("FAQ", SupportFAQ), ("TEMPLATE", SupportTemplate), ("ARTICLE", KnowledgeArticle)):
        for item in (await db.execute(select(model))).scalars().all(): count += await sync_knowledge_source(db, item, source_type)
    return count
