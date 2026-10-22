import re
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.models.messaging import MessagingConversation
from app.models.order import Order
from app.models.product import Product
from app.models.support_rating import SupportRating
from app.services.contact_normalization import ContactNormalizationError, normalize_phone_number
from app.services.notification_services import notify_owners
from app.services.order_tracking import TRACKING_RETENTION_DAYS
from app.services.product_services import product_sale_price, storefront_published_filters
from app.services.support_copilot import detect_language

ORDER_NUMBER_STEP = "ORDER_NUMBER"
RATING_STEP = "RATING"
COMMENT_STEP = "RATING_COMMENT"
LOW_SCORE = 2
MENU_HANDOFF_REASON = "Customer asked for staff on WhatsApp."
MAX_LISTED_PRODUCTS = 20

GREETINGS = {"hi", "hello", "hey", "helo", "hai", "salam", "assalamualaikum", "assalamualaikum wbt", "good morning", "selamat pagi", "selamat petang"}
MALAY_GREETINGS = {"hai", "salam", "assalamualaikum", "assalamualaikum wbt", "selamat pagi", "selamat petang"}
MENU_WORDS = {"*", "0", "menu", "start", "mula"}
STAFF_WORDS = {"staff", "staf", "human", "manusia", "agent", "ejen"}
STAFF_PHRASES = ("live agent", "real person", "orang sebenar", "cakap dengan orang")

# Approved by Umar on 29 September 2026, same values as storefront/app/_lib/content.ts.
BUSINESS = {
    "hours": {"EN": "Open daily, 9am–5:30pm (until sold out)", "MS": "Dibuka setiap hari, 9 pagi–5:30 petang (sehingga habis dijual)"},
    "address": "Kg Taman Sedia, Selorong KHM, 39000 Tanah Rata, Pahang",
    "map": "https://www.google.com/maps/place/Bahulu+Berry+Cameron/@4.4788545,101.3800129,17z/data=!4m6!3m5!1s0x31ca590066263efb:0x47ce3ff6e6722a41!8m2!3d4.4788545!4d101.3800129",
}

COPY = {
    "EN": {
        "menu": "Hi! I'm Berry, Bahulu Berry Cameron's virtual assistant.\n\n1  See our products and prices\n2  How to order\n3  Check my order\n4  Opening hours and location\n5  Talk to our staff\n6  Tukar ke Bahasa Melayu\n\nReply with a number.",
        "back": "Reply * for the main menu.",
        "products": "Our products:",
        "sold_out": "sold out",
        "no_products": "Our product list is being updated. Reply 5 and our staff will help you.",
        "browse": "See photos on our website: {url}",
        "order": "You can order on our website: {url}\n\nOr reply 5 and our staff will take your order here.",
        "ask_order": "Please reply with your order number, for example 1024.",
        "order_status": "Order #{number}: {status}.",
        "order_not_found": "We could not find that order for this WhatsApp number. Reply 5 and our staff will check for you.",
        "hours": "{hours}\n\n{address}\nMap: {map}",
        "handoff": "Thanks! Our staff will reply here as soon as they can. {hours}.\n\nYou can tell us more about what you need in the meantime.",
        "rating_ask": "Thanks for chatting with us! How was our help today?\n\nReply with a number from 1 to 5 (5 = excellent).",
        "rating_thanks": "Thank you for rating us {score}/5! Is there anything you'd like to tell us? Just reply, or send * to skip.",
        "comment_thanks": "Thank you, we have passed that on to our team.",
        "statuses": {"PENDING": "received", "PROCESSING": "being prepared", "SHIPPED": "sent out", "COMPLETED": "completed", "CANCELLED": "cancelled"},
    },
    "MS": {
        "menu": "Hai! Saya Berry, pembantu maya Bahulu Berry Cameron.\n\n1  Lihat produk dan harga\n2  Cara membuat tempahan\n3  Semak tempahan saya\n4  Waktu operasi dan lokasi\n5  Bercakap dengan staf kami\n6  Switch to English\n\nBalas dengan nombor.",
        "back": "Balas * untuk menu utama.",
        "products": "Produk kami:",
        "sold_out": "habis dijual",
        "no_products": "Senarai produk kami sedang dikemas kini. Balas 5 dan staf kami akan membantu anda.",
        "browse": "Lihat gambar di laman web kami: {url}",
        "order": "Anda boleh membuat tempahan di laman web kami: {url}\n\nAtau balas 5 dan staf kami akan mengambil tempahan anda di sini.",
        "ask_order": "Sila balas dengan nombor tempahan anda, contohnya 1024.",
        "order_status": "Tempahan #{number}: {status}.",
        "order_not_found": "Kami tidak menemui tempahan itu untuk nombor WhatsApp ini. Balas 5 dan staf kami akan menyemaknya untuk anda.",
        "hours": "{hours}\n\n{address}\nPeta: {map}",
        "handoff": "Terima kasih! Staf kami akan membalas di sini secepat mungkin. {hours}.\n\nAnda boleh ceritakan lebih lanjut tentang keperluan anda sementara menunggu.",
        "rating_ask": "Terima kasih kerana berbual dengan kami! Bagaimana bantuan kami hari ini?\n\nBalas dengan nombor 1 hingga 5 (5 = sangat baik).",
        "rating_thanks": "Terima kasih atas penilaian {score}/5! Ada apa-apa yang ingin anda kongsikan? Balas sahaja, atau hantar * untuk langkau.",
        "comment_thanks": "Terima kasih, kami sudah sampaikan kepada pasukan kami.",
        "statuses": {"PENDING": "diterima", "PROCESSING": "sedang disediakan", "SHIPPED": "telah dihantar", "COMPLETED": "selesai", "CANCELLED": "dibatalkan"},
    },
}


@dataclass(frozen=True)
class MenuReply:
    text: str
    handoff_reason: str | None = None
    draft_too: bool = False


def handoff_message(language: str) -> str:
    copy = COPY.get(language, COPY["EN"])
    return copy["handoff"].format(hours=BUSINESS["hours"].get(language, BUSINESS["hours"]["EN"]).rstrip("."))


def rating_question(language: str) -> str:
    return COPY.get(language, COPY["EN"])["rating_ask"]


async def _rating_reply(db: AsyncSession, conversation: MessagingConversation, step: str | None, text: str, message: str, copy: dict) -> MenuReply | None:
    latest = await db.scalar(select(SupportRating).where(SupportRating.conversation_id == conversation.id).order_by(SupportRating.asked_at.desc(), SupportRating.id.desc()).limit(1))
    if latest is None:
        return None
    if step == RATING_STEP and latest.score is None and re.fullmatch(r"[1-5]", text):
        latest.score = int(text)
        latest.rated_at = datetime.now(UTC)
        latest.flagged = latest.score <= LOW_SCORE
        if latest.flagged:
            await notify_owners(db, notification_type="SUPPORT", title="Low WhatsApp rating", description=f"A customer rated a WhatsApp chat {latest.score}/5.", entity_type="support_rating", entity_id=latest.id)
        conversation.menu_step = COMMENT_STEP
        return MenuReply(copy["rating_thanks"].format(score=latest.score))
    if step == COMMENT_STEP and latest.score is not None and latest.comment is None and text not in MENU_WORDS and text not in GREETINGS:
        latest.comment = message.strip()[:500]
        return MenuReply(_with_back(copy["comment_thanks"], copy))
    return None


def _normalize(message: str) -> str:
    return " ".join(re.sub(r"[^\w\s*#]", " ", message.lower()).split())


def _wants_staff(text: str) -> bool:
    return bool(STAFF_WORDS & set(text.split())) or any(phrase in text for phrase in STAFF_PHRASES)


def _with_back(text: str, copy: dict) -> str:
    return f"{text}\n\n{copy['back']}"


def _money(value: Decimal) -> str:
    return str(Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


async def _product_list(db: AsyncSession, language: str, copy: dict) -> str:
    products = (await db.scalars(
        select(Product)
        .options(selectinload(Product.inventory), selectinload(Product.discounts))
        .where(*storefront_published_filters())
        .order_by(Product.name.asc(), Product.id.asc())
        .limit(MAX_LISTED_PRODUCTS)
    )).all()
    if not products:
        return copy["no_products"]
    lines = [copy["products"]]
    for product in products:
        name = product.name_ms if language == "MS" and product.name_ms else product.name
        price = product_sale_price(product) or product.price
        line = f"• {name} - RM {_money(price)}"
        if not (product.inventory and product.inventory.quantity > 0):
            line += f" ({copy['sold_out']})"
        lines.append(line)
    lines.append("")
    lines.append(copy["browse"].format(url=settings.STOREFRONT_PUBLIC_URL))
    return "\n".join(lines)


def _sender_phone(sender: str | None) -> str | None:
    if not sender:
        return None
    candidate = f"+{sender}" if sender.isdigit() else sender
    try:
        return normalize_phone_number(candidate)
    except ContactNormalizationError:
        return None


def _closed_too_long(order: Order) -> bool:
    if order.closed_at is None:
        return False
    closed = order.closed_at if order.closed_at.tzinfo else order.closed_at.replace(tzinfo=UTC)
    return datetime.now(UTC) > closed + timedelta(days=TRACKING_RETENTION_DAYS)


async def _order_status(db: AsyncSession, number: int, sender: str | None, copy: dict) -> str:
    phone = _sender_phone(sender)
    order = await db.scalar(select(Order).options(selectinload(Order.customer), selectinload(Order.delivery)).where(Order.id == number))
    known_phones = set()
    if order is not None:
        known_phones = {order.customer.canonical_phone_number if order.customer else None, order.delivery.recipient_phone if order.delivery else None}
    if order is None or phone is None or phone not in known_phones or _closed_too_long(order):
        return copy["order_not_found"]
    return copy["order_status"].format(number=order.id, status=copy["statuses"].get(order.status, order.status.lower()))


async def menu_reply(db: AsyncSession, conversation: MessagingConversation, *, message: str, requested_language: str, first_contact: bool) -> MenuReply | None:
    text = _normalize(message)
    if conversation.menu_language is None:
        conversation.menu_language = "MS" if text in MALAY_GREETINGS else detect_language(message, requested_language)
    language = conversation.menu_language
    copy = COPY[language]
    step, conversation.menu_step = conversation.menu_step, None

    if step in {RATING_STEP, COMMENT_STEP} and (rated := await _rating_reply(db, conversation, step, text, message, copy)):
        return rated
    if step == ORDER_NUMBER_STEP and (match := re.fullmatch(r"#?\s?(\d{1,9})", text)):
        return MenuReply(_with_back(await _order_status(db, int(match[1]), conversation.contact_reference, copy), copy))
    if text in GREETINGS or text in MENU_WORDS:
        return MenuReply(copy["menu"])
    if text == "1":
        return MenuReply(_with_back(await _product_list(db, language, copy), copy))
    if text == "2":
        return MenuReply(_with_back(copy["order"].format(url=settings.STOREFRONT_PUBLIC_URL), copy))
    if text == "3":
        conversation.menu_step = ORDER_NUMBER_STEP
        return MenuReply(copy["ask_order"])
    if text == "4":
        return MenuReply(_with_back(copy["hours"].format(hours=BUSINESS["hours"][language], address=BUSINESS["address"], map=BUSINESS["map"]), copy))
    if text == "5" or _wants_staff(text):
        return MenuReply(handoff_message(language), handoff_reason=MENU_HANDOFF_REASON)
    if text == "6":
        conversation.menu_language = "EN" if language == "MS" else "MS"
        return MenuReply(COPY[conversation.menu_language]["menu"])
    if first_contact:
        return MenuReply(copy["menu"], draft_too=True)
    return None
