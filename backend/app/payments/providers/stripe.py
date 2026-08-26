import time
from decimal import Decimal

import stripe

from app.core.config import settings
from app.models.order import Order
from app.models.payment import Payment


stripe.api_key = settings.STRIPE_SECRET_KEY.get_secret_value()


class StripeProvider:

    async def create_payment(
        self,
        payment: Payment,
        order: Order,
    ) -> dict:

        amount = int(
            Decimal(str(payment.amount)) * 100
        )

        checkout_session = stripe.checkout.Session.create(
            mode="payment",

            line_items=[
                {
                    "price_data": {
                        "currency": payment.currency.lower(),

                        "product_data": {
                            "name": f"Bahulu Cameron Order #{order.id}",
                        },

                        "unit_amount": amount,
                    },

                    "quantity": 1,
                }
            ],

            expires_at=int(time.time()) + 1800,

            success_url=settings.STRIPE_SUCCESS_URL,

            cancel_url=settings.STRIPE_CANCEL_URL,

            metadata={
                "order_id": str(order.id),
                "payment_id": str(payment.id),
            },
        )

        return {
            "provider_payment_id": checkout_session.id,
            "payment_url": checkout_session.url,
        }