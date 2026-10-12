"""Website customer accounts: email code sign-in, optional password, My orders.

- Sign-in codes are six digits, valid for 10 minutes and 5 guesses, and only
  their HMAC is stored. Requesting a code never reveals whether an account
  exists; the account is created when a code is first verified.
- Sessions are JWTs with the customer audience. The API only accepts them in
  an ``Authorization: Bearer`` header, never a cookie: the storefront server
  keeps the HttpOnly cookie and forwards it, so browsers cannot be tricked
  into sending it cross-site.
- "My orders" matches website orders placed with the verified email, so guest
  orders appear only after the customer has proven they own that address.
"""

import hashlib
import hmac
import secrets
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.jwt import create_access_token, verify_access_token
from app.auth.password import hash_password, verify_password
from app.core.config import settings
from app.models.customer import Customer
from app.models.customer_account import CustomerAccount, CustomerSignInCode
from app.models.order import Order
from app.services.email_services import deliver_email, email_html
from app.services.order_tracking import _tracked_order_query, tracking_view

CUSTOMER_AUDIENCE = "bahulu-customer"
CODE_LIFETIME = timedelta(minutes=10)
CODE_MAX_ATTEMPTS = 5

# Unknown accounts are checked against this so a failed password sign-in
# takes the same time whether or not the email has an account.
_TIMING_EQUALISER_HASH = hash_password("bahulu-customer-timing-equaliser")

CODE_EMAIL = {
    "en": {
        "subject": "Your Bahulu Berry Cameron sign-in code",
        "title": "Your sign-in code",
        "body": "Use this code to sign in to your Bahulu Berry Cameron account:\n{code}\nIt expires in 10 minutes. If you did not ask for it, you can ignore this email.",
        "footer": "Bahulu Berry Cameron · Tanah Rata, Cameron Highlands",
    },
    "ms": {
        "subject": "Kod log masuk Bahulu Berry Cameron anda",
        "title": "Kod log masuk anda",
        "body": "Gunakan kod ini untuk log masuk ke akaun Bahulu Berry Cameron anda:\n{code}\nKod ini tamat dalam 10 minit. Jika anda tidak memintanya, abaikan e-mel ini.",
        "footer": "Bahulu Berry Cameron · Tanah Rata, Cameron Highlands",
    },
}


class AccountError(Exception):
    """A customer-safe failure; the message is shown as-is."""


def _now() -> datetime:
    return datetime.now(UTC)


def _as_utc(value: datetime) -> datetime:
    return value if value.tzinfo else value.replace(tzinfo=UTC)


def canonical_email(email: str) -> str:
    return email.strip().lower()


def _code_hash(email: str, code: str) -> str:
    key = settings.SECRET_KEY.get_secret_value().encode()
    return hmac.new(key, f"{email}:{code}".encode(), hashlib.sha256).hexdigest()


def demo_codes_visible() -> bool:
    """Local demos have no mailbox, so the code is returned to the page.

    Only ever true in development with the console email provider.
    """
    return settings.ENVIRONMENT == "development" and settings.EMAIL_PROVIDER.lower().strip() == "console"


async def request_sign_in_code(db: AsyncSession, email: str, locale: str) -> str:
    """Create a code, email it, and return it (callers must not expose it)."""
    email = canonical_email(email)
    now = _now()
    # Only the newest code works.
    await db.execute(
        update(CustomerSignInCode)
        .where(CustomerSignInCode.email == email, CustomerSignInCode.used_at.is_(None))
        .values(used_at=now)
    )
    code = f"{secrets.randbelow(1_000_000):06d}"
    db.add(CustomerSignInCode(email=email, code_hash=_code_hash(email, code), expires_at=now + CODE_LIFETIME))
    await db.commit()
    copy = CODE_EMAIL["ms" if locale == "ms" else "en"]
    await deliver_email(
        to_address=email,
        email_type="CUSTOMER_SIGN_IN_CODE",
        subject=copy["subject"],
        html=email_html(copy["title"], copy["body"].format(code=code), footer=copy["footer"]),
        idempotency_key=None,
    )
    return code


async def verify_sign_in_code(db: AsyncSession, email: str, code: str, locale: str) -> CustomerAccount:
    email = canonical_email(email)
    now = _now()
    record = await db.scalar(
        select(CustomerSignInCode)
        .where(CustomerSignInCode.email == email, CustomerSignInCode.used_at.is_(None))
        .order_by(CustomerSignInCode.id.desc())
        .with_for_update()
    )
    invalid = AccountError("That code is incorrect or has expired. Request a new code and try again.")
    if record is None or _as_utc(record.expires_at) <= now or record.attempts >= CODE_MAX_ATTEMPTS:
        raise invalid
    if not hmac.compare_digest(record.code_hash, _code_hash(email, code.strip())):
        record.attempts += 1
        if record.attempts >= CODE_MAX_ATTEMPTS:
            record.used_at = now
        await db.commit()
        raise invalid
    record.used_at = now
    account = await db.scalar(select(CustomerAccount).where(CustomerAccount.email == email))
    if account is None:
        account = CustomerAccount(email=email, locale="ms" if locale == "ms" else "en")
        db.add(account)
    account.last_sign_in_at = now
    await db.commit()
    await db.refresh(account)
    return account


async def sign_in_with_password(db: AsyncSession, email: str, password: str) -> CustomerAccount:
    account = await db.scalar(select(CustomerAccount).where(CustomerAccount.email == canonical_email(email)))
    stored = account.password_hash if account is not None and account.password_hash else _TIMING_EQUALISER_HASH
    matches = verify_password(password, stored)
    if account is None or not account.password_hash or not matches:
        raise AccountError("Email or password is incorrect. You can also sign in with an email code.")
    account.last_sign_in_at = _now()
    await db.commit()
    return account


def issue_session(account: CustomerAccount, method: str) -> tuple[str, datetime]:
    expires = _now() + timedelta(days=settings.CUSTOMER_SESSION_EXPIRE_DAYS)
    token = create_access_token(
        {"sub": str(account.id), "sv": account.session_version, "m": method, "iat": int(_now().timestamp())},
        expires_delta=expires - _now(),
        audience=CUSTOMER_AUDIENCE,
    )
    return token, expires


async def account_from_token(db: AsyncSession, token: str | None) -> tuple[CustomerAccount, dict] | None:
    payload = verify_access_token(token, audience=CUSTOMER_AUDIENCE)
    if payload is None:
        return None
    try:
        account_id = int(payload.get("sub", ""))
    except ValueError:
        return None
    account = await db.get(CustomerAccount, account_id)
    if account is None or payload.get("sv") != account.session_version:
        return None
    return account, payload


def signed_in_recently_with_code(payload: dict, within: timedelta = timedelta(minutes=15)) -> bool:
    issued = payload.get("iat")
    return payload.get("m") == "code" and isinstance(issued, int) and _now().timestamp() - issued <= within.total_seconds()


async def set_password(db: AsyncSession, account: CustomerAccount, payload: dict, new_password: str, current_password: str | None) -> None:
    """Set or change the password.

    Changing an existing password needs the current one, or a fresh email-code
    sign-in (which is also how a forgotten password is reset).
    """
    if account.password_hash and not signed_in_recently_with_code(payload):
        if not current_password or not verify_password(current_password, account.password_hash):
            raise AccountError("Your current password is incorrect. Or sign in again with an email code to reset it.")
    account.password_hash = hash_password(new_password)
    # Other devices are signed out; the caller re-issues this device's session.
    account.session_version += 1
    await db.commit()


async def sign_out_everywhere(db: AsyncSession, account: CustomerAccount) -> None:
    account.session_version += 1
    await db.commit()


def _orders_for(account: CustomerAccount):
    return (
        _tracked_order_query()
        .outerjoin(Customer, Customer.id == Order.customer_id)
        .where(
            Order.source == "STOREFRONT",
            or_(func.lower(Order.contact_email) == account.email, Customer.canonical_email == account.email),
        )
        .order_by(Order.created_at.desc())
    )


async def account_orders(db: AsyncSession, account: CustomerAccount):
    orders = (await db.scalars(_orders_for(account))).unique().all()
    return [tracking_view(order) for order in orders]


async def export_account(db: AsyncSession, account: CustomerAccount) -> dict:
    return {
        "exported_at": _now().isoformat(),
        "account": {
            "email": account.email,
            "full_name": account.full_name,
            "phone_number": account.phone_number,
            "language": account.locale,
            "has_password": bool(account.password_hash),
            "created_at": _as_utc(account.created_at).isoformat(),
            "last_sign_in_at": _as_utc(account.last_sign_in_at).isoformat() if account.last_sign_in_at else None,
        },
        "orders": [order.model_dump(mode="json") for order in await account_orders(db, account)],
    }


async def delete_account(db: AsyncSession, account: CustomerAccount) -> None:
    """Remove the account and its codes.

    Orders are business records the bakery must keep (receipts, refunds, tax),
    so they stay with the shop; they are simply no longer shown to anyone.
    """
    await db.execute(delete(CustomerSignInCode).where(CustomerSignInCode.email == account.email))
    await db.delete(account)
    await db.commit()
