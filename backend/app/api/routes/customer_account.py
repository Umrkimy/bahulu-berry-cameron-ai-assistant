"""Website customer accounts, called by the storefront server only.

The session token travels in an ``Authorization: Bearer`` header, never a
cookie, so these routes need no CSRF token: browsers never attach it on
their own. The storefront keeps it in an HttpOnly cookie on its own origin.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.rate_limit import (
    CUSTOMER_ACCOUNT_LIMIT,
    CUSTOMER_CODE_REQUEST_LIMIT,
    CUSTOMER_SIGN_IN_LIMIT,
    EMAIL_RECIPIENT_LIMIT,
    LOGIN_ACCOUNT_LIMIT,
    rate_limiter,
)
from app.db.database import get_db
from app.models.customer_account import CustomerAccount
from app.schemas.customer_account import (
    AccountOrders,
    AccountProfileUpdate,
    CodeRequest,
    CodeRequestResponse,
    CodeVerifyRequest,
    CustomerAccountView,
    DeleteAccountRequest,
    PasswordSignInRequest,
    SessionResponse,
    SetPasswordRequest,
)
from app.services.contact_normalization import ContactNormalizationError, normalize_phone_number
from app.services.customer_accounts import (
    AccountError,
    account_from_token,
    account_orders,
    canonical_email,
    delete_account,
    demo_codes_visible,
    export_account,
    issue_session,
    request_sign_in_code,
    set_password,
    sign_in_with_password,
    sign_out_everywhere,
    verify_sign_in_code,
)

router = APIRouter()
DB = Annotated[AsyncSession, Depends(get_db)]
CODE_SENT = "If that email can receive messages, a six-digit code is on its way. It expires in 10 minutes."


def _enabled() -> None:
    if not settings.STOREFRONT_ACCOUNTS_ENABLED:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found.")


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"


def _view(account: CustomerAccount) -> CustomerAccountView:
    return CustomerAccountView(
        email=account.email,
        full_name=account.full_name,
        phone_number=account.phone_number,
        locale=account.locale,
        has_password=bool(account.password_hash),
        created_at=account.created_at,
    )


def _session(account: CustomerAccount, method: str) -> SessionResponse:
    token, expires = issue_session(account, method)
    return SessionResponse(account=_view(account), session_token=token, expires_at=expires)


async def current_customer(
    db: DB,
    authorization: Annotated[str | None, Header()] = None,
) -> tuple[CustomerAccount, dict]:
    _enabled()
    token = authorization[7:].strip() if authorization and authorization.lower().startswith("bearer ") else None
    found = await account_from_token(db, token)
    if found is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Please sign in again.")
    await rate_limiter.check_key(f"customer-account:{found[0].id}", CUSTOMER_ACCOUNT_LIMIT)
    return found


Customer = Annotated[tuple[CustomerAccount, dict], Depends(current_customer)]


def _bad_request(error: AccountError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error))


@router.post("/code", response_model=CodeRequestResponse)
async def request_code(data: CodeRequest, request: Request, response: Response, db: DB):
    _enabled()
    _no_store(response)
    await rate_limiter.check(request, "customer-code-request", CUSTOMER_CODE_REQUEST_LIMIT)
    await rate_limiter.check_key(f"customer-code-recipient:{canonical_email(data.email)}", EMAIL_RECIPIENT_LIMIT)
    code = await request_sign_in_code(db, data.email, data.locale)
    return CodeRequestResponse(message=CODE_SENT, demo_code=code if demo_codes_visible() else None)


@router.post("/code/verify", response_model=SessionResponse)
async def verify_code(data: CodeVerifyRequest, request: Request, response: Response, db: DB):
    _enabled()
    _no_store(response)
    await rate_limiter.check(request, "customer-sign-in", CUSTOMER_SIGN_IN_LIMIT)
    try:
        account = await verify_sign_in_code(db, data.email, data.code, data.locale)
    except AccountError as error:
        raise _bad_request(error) from error
    return _session(account, "code")


@router.post("/password/sign-in", response_model=SessionResponse)
async def password_sign_in(data: PasswordSignInRequest, request: Request, response: Response, db: DB):
    _enabled()
    _no_store(response)
    await rate_limiter.check(request, "customer-sign-in", CUSTOMER_SIGN_IN_LIMIT)
    await rate_limiter.check_key(f"customer-login-account:{canonical_email(data.email)}", LOGIN_ACCOUNT_LIMIT)
    try:
        account = await sign_in_with_password(db, data.email, data.password)
    except AccountError as error:
        raise _bad_request(error) from error
    return _session(account, "password")


@router.get("/me", response_model=CustomerAccountView)
async def me(customer: Customer, response: Response):
    _no_store(response)
    return _view(customer[0])


@router.patch("/me", response_model=CustomerAccountView)
async def update_me(data: AccountProfileUpdate, customer: Customer, response: Response, db: DB):
    _no_store(response)
    account = customer[0]
    changes = data.model_dump(exclude_unset=True)
    if "full_name" in changes:
        account.full_name = (changes["full_name"] or "").strip() or None
    if "phone_number" in changes:
        raw = (changes["phone_number"] or "").strip()
        try:
            account.phone_number = normalize_phone_number(raw) if raw else None
        except ContactNormalizationError as error:
            raise HTTPException(status_code=422, detail="Enter a valid Malaysian phone number.") from error
    if changes.get("locale"):
        account.locale = changes["locale"]
    await db.commit()
    return _view(account)


@router.post("/password", response_model=SessionResponse)
async def change_password(data: SetPasswordRequest, customer: Customer, response: Response, db: DB):
    _no_store(response)
    account, payload = customer
    try:
        await set_password(db, account, payload, data.new_password, data.current_password)
    except AccountError as error:
        raise _bad_request(error) from error
    # Other devices are signed out; this one gets a fresh session.
    return _session(account, payload.get("m", "password"))


@router.post("/sign-out", status_code=status.HTTP_204_NO_CONTENT)
async def sign_out(customer: Customer, db: DB):
    await sign_out_everywhere(db, customer[0])
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/orders", response_model=AccountOrders)
async def my_orders(customer: Customer, response: Response, db: DB):
    _no_store(response)
    return AccountOrders(orders=await account_orders(db, customer[0]))


@router.get("/export")
async def export_my_data(customer: Customer, response: Response, db: DB):
    _no_store(response)
    return await export_account(db, customer[0])


@router.post("/delete", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_account(data: DeleteAccountRequest, customer: Customer, db: DB):
    account = customer[0]
    if canonical_email(data.confirm_email) != account.email:
        raise HTTPException(status_code=400, detail="Type the email address of this account to confirm.")
    await delete_account(db, account)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
