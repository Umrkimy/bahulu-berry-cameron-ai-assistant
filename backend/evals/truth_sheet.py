"""Run the AI truth sheet against fictional data in a throwaway database.

Calls OpenAI for real (embeddings, support drafts and the staff Copilot).

    EVAL_DATABASE_URL=postgresql+asyncpg://.../bahulu_eval \
        python -m evals.truth_sheet --fictional [--only rag|copilot] [--repeat 3] [--label name]
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
import uuid
from datetime import UTC, datetime, timedelta
from decimal import Decimal
from pathlib import Path
from zoneinfo import ZoneInfo

HERE = Path(__file__).parent
MALAY_MARKERS = {"anda", "ini", "hari", "ada", "tiada", "pesanan", "stok", "untuk", "yang", "dan", "tidak", "boleh", "sila", "kami", "saya", "akan", "dengan", "belum", "sudah", "telah", "masa", "staf", "tak", "pelanggan"}


def looks_malay(text: str) -> bool:
    return len(MALAY_MARKERS & set(re.findall(r"[a-z]+", text.lower()))) >= 2


def grade(case: dict, *, outcome: str, reply: str) -> list[str]:
    failures = []
    expected = case["expect"] if isinstance(case["expect"], list) else [case["expect"]]
    if outcome not in expected:
        failures.append(f"expected {'/'.join(expected)}, got {outcome}")
    for pattern in case.get("must_match", []):
        if not re.search(pattern, reply):
            failures.append(f"missing /{pattern}/")
    for pattern in case.get("must_not_match", []):
        if re.search(pattern, reply):
            failures.append(f"matched forbidden /{pattern}/")
    language = case.get("language")
    if reply and language and looks_malay(reply) != (language == "MS"):
        failures.append(f"reply is not in {language}")
    return failures


def _database_url() -> str:
    url = os.environ.get("EVAL_DATABASE_URL", "")
    if not url.startswith("postgresql") or not url.rsplit("/", 1)[-1].endswith("_eval"):
        sys.exit("Set EVAL_DATABASE_URL to a throwaway PostgreSQL database whose name ends in _eval.")
    return url


async def _reset(engine) -> None:
    from sqlalchemy import text

    from app.db.database import Base
    import app.models  # noqa: F401

    async with engine.begin() as connection:
        await connection.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await connection.run_sync(Base.metadata.drop_all)
        await connection.run_sync(Base.metadata.create_all)


async def _seed(session) -> dict:
    from app.models import Admin, Customer, Inventory, Order, OrderItem, Product

    owner = Admin(username="eval-owner", email="eval-owner@example.com", password_hash="-", role="OWNER", is_superuser=True, is_active=True)
    staff = Admin(username="eval-staff", email="eval-staff@example.com", password_hash="-", role="STAFF", is_active=True)
    aina = Customer(full_name="Aina Fictional", phone_number="+60100000011", canonical_phone_number="+60100000011")
    hafiz = Customer(full_name="Hafiz Fictional", phone_number="+60100000012", canonical_phone_number="+60100000012")
    berry = Product(name="Fictional Berry Bahulu", price=Decimal("10.00"), category="Eval", is_active=True)
    pandan = Product(name="Fictional Pandan Bahulu", price=Decimal("12.00"), category="Eval", is_active=True)
    gift = Product(name="Fictional Gift Box", price=Decimal("35.00"), category="Eval", is_active=True)
    session.add_all([owner, staff, aina, hafiz, berry, pandan, gift])
    await session.flush()
    session.add_all([
        Inventory(product_id=berry.id, quantity=42, low_stock_threshold=8),
        Inventory(product_id=pandan.id, quantity=3, low_stock_threshold=10),
        Inventory(product_id=gift.id, quantity=20, low_stock_threshold=5),
    ])

    now = datetime.now(UTC)
    local_midnight = datetime.now(ZoneInfo("Asia/Kuala_Lumpur")).replace(hour=0, minute=0, second=0, microsecond=0)
    orders = [
        (aina, berry, 2, "PROCESSING", "PAID", now),
        (hafiz, pandan, 1, "PENDING", "UNPAID", now),
        (aina, gift, 1, "COMPLETED", "PAID", local_midnight.astimezone(UTC) - timedelta(hours=6)),
    ]
    ids = []
    for customer, product, quantity, status, payment_status, created_at in orders:
        total = product.price * quantity
        order = Order(customer_id=customer.id, status=status, payment_status=payment_status, subtotal=total, total_amount=total, created_at=created_at)
        session.add(order)
        await session.flush()
        session.add(OrderItem(order_id=order.id, product_id=product.id, quantity=quantity, unit_price=product.price, subtotal=total, total_amount=total))
        ids.append(order.id)
    await session.commit()
    return {"owner": owner.id, "staff": staff.id, "order_paid": ids[0], "order_unpaid": ids[1]}


async def _records(session) -> list:
    from sqlalchemy import select

    from app.models import Inventory, Order

    stock = (await session.execute(select(Inventory.product_id, Inventory.quantity).order_by(Inventory.id))).all()
    orders = (await session.execute(select(Order.id, Order.status, Order.payment_status).order_by(Order.id))).all()
    return [tuple(row) for row in stock + orders]


async def _index_faqs(session, faqs: list[dict]) -> None:
    from app.core.config import settings
    from app.models import SupportFAQ
    from app.services.support_copilot import rebuild_knowledge_index

    settings.WHATSAPP_RAG_ENABLED = True
    session.add_all([SupportFAQ(**faq, is_active=True) for faq in faqs])
    await session.flush()
    await rebuild_knowledge_index(session)
    await session.commit()


async def _run_rag(session, cases: list[dict]) -> list[dict]:
    from app.services.support_copilot import create_grounded_draft

    results = []
    for case in cases:
        draft = await create_grounded_draft(session, message=case["message"], requested_language="AUTO")
        reply = draft.reply or ""
        failures = grade(case, outcome="handoff" if draft.handoff_required else "answer", reply=reply)
        if draft.language != case["language"]:
            failures.append(f"detected {draft.language}, expected {case['language']}")
        top = max((source.similarity or 0 for source in draft.sources), default=None)
        results.append({"name": case["name"], "passed": not failures, "failures": failures, "reply": reply or draft.handoff_reason, "similarity": top})
    return results


async def _run_copilot(session, cases: list[dict], ids: dict) -> list[dict]:
    from app.services.ai_assistant_services import generate_ai_result

    results = []
    for case in cases:
        message = case["message"].format(**ids)
        is_owner = case["role"] == "OWNER"
        result = await generate_ai_result(session, message, conversation_id=str(uuid.uuid4()), admin_id=ids["owner" if is_owner else "staff"], conversation_history=[], is_owner=is_owner)
        failures = grade(case, outcome=result.outcome, reply=result.response)
        results.append({"name": case["name"], "passed": not failures, "failures": failures, "reply": result.response})
    return results


def _merge(runs: list[list[dict]]) -> list[dict]:
    merged = []
    for attempts in zip(*runs):
        failed = [result for result in attempts if not result["passed"]]
        first = (failed or attempts)[0]
        failures = [f"run {index + 1}: {failure}" for index, result in enumerate(attempts) for failure in result["failures"]] if len(attempts) > 1 else first["failures"]
        merged.append({**first, "passed": not failed, "failures": failures})
    return merged


def _print(section: str, results: list[dict]) -> None:
    passed = sum(result["passed"] for result in results)
    print(f"\n{section}: {passed}/{len(results)} passed")
    for result in results:
        extra = f" ({result['similarity']:.3f})" if result.get("similarity") is not None else ""
        print(f"  {'PASS' if result['passed'] else 'FAIL'}  {result['name']}{extra}")
        for failure in result["failures"]:
            print(f"        - {failure}")
        if not result["passed"]:
            print(f"        reply: {result['reply']!r}"[:400])


async def main() -> None:
    parser = argparse.ArgumentParser(description="Run the AI truth sheet on fictional data.")
    parser.add_argument("--fictional", action="store_true", help="Required: confirms the target database is a throwaway eval database.")
    parser.add_argument("--only", choices=["rag", "copilot"])
    parser.add_argument("--label", default="run")
    parser.add_argument("--min-similarity", type=float)
    parser.add_argument("--repeat", type=int, default=1, help="Run each case this many times; a case passes only if every run passes.")
    args = parser.parse_args()
    if not args.fictional:
        parser.error("Refusing to run without --fictional.")

    os.environ["DATABASE_URL"] = _database_url()
    from app.core.config import settings
    from app.db.database import AsyncSessionLocal, engine

    if args.min_similarity is not None:
        settings.WHATSAPP_RAG_MIN_SIMILARITY = args.min_similarity
    sheet = json.loads((HERE / "truth_sheet.json").read_text(encoding="utf-8"))
    await _reset(engine)

    report = {"label": args.label, "repeat": args.repeat, "started_at": datetime.now(UTC).isoformat(), "copilot_model": settings.OPENAI_MODEL, "rag_model": settings.WHATSAPP_RAG_MODEL, "min_similarity": settings.WHATSAPP_RAG_MIN_SIMILARITY}
    async with AsyncSessionLocal() as session:
        ids = await _seed(session)
        if args.only != "copilot":
            await _index_faqs(session, sheet["faqs"])
            report["rag"] = _merge([await _run_rag(session, sheet["rag"]) for _ in range(args.repeat)])
            _print("Support drafts", report["rag"])
        if args.only != "rag":
            before = await _records(session)
            report["copilot"] = _merge([await _run_copilot(session, sheet["copilot"], ids) for _ in range(args.repeat)])
            session.expire_all()
            report["records_unchanged"] = before == await _records(session)
            _print("Staff Copilot", report["copilot"])
            print(f"\nStock and orders unchanged: {report['records_unchanged']}")
    await engine.dispose()

    out = HERE / "results" / f"{datetime.now(UTC):%Y%m%d-%H%M%S}-{args.label}.json"
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Saved {out.relative_to(HERE.parent)}")


if __name__ == "__main__":
    asyncio.run(main())
