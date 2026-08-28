import asyncio
import time
from decimal import Decimal

import stripe

from app.core.config import settings
from app.payments.base import PaymentProvider


class StripeProvider(PaymentProvider):
    def __init__(self) -> None:
        self.client = stripe.StripeClient(
            settings.STRIPE_SECRET_KEY.get_secret_value(),
        )

    async def create_payment(
        self,
        *,
        payment_id: int,
        amount: Decimal,
        currency: str,
        description: str,
        customer_name: str,
        customer_email: str | None,
        customer_phone: str | None,
    ) -> dict:
        amount_in_sen = int(Decimal(str(amount)) * 100)
        parameters = {
            "mode": "payment",
            "line_items": [
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "product_data": {"name": description},
                        "unit_amount": amount_in_sen,
                    },
                    "quantity": 1,
                }
            ],
            "expires_at": int(time.time()) + 1800,
            "success_url": settings.STRIPE_SUCCESS_URL,
            "cancel_url": settings.STRIPE_CANCEL_URL,
            "client_reference_id": str(payment_id),
            "metadata": {"payment_id": str(payment_id)},
        }

        if customer_email:
            parameters["customer_email"] = customer_email

        checkout_session = await asyncio.to_thread(
            self.client.v1.checkout.sessions.create,
            parameters,
        )

        return {
            "provider_payment_id": checkout_session.id,
            "payment_url": checkout_session.url,
        }
