from abc import ABC, abstractmethod
from decimal import Decimal


class PaymentProvider(ABC):
    """A hosted-payment provider (Stripe today; HitPay or ToyyibPay later).

    Implementations must only report money as paid from provider-signed
    webhook events, never from a browser redirect.
    """

    name: str

    @abstractmethod
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
        """
        Create a payment with the external payment provider.

        Returns:

        {
            "provider_payment_id": "...",
            "payment_url": "...",
        }
        """
        raise NotImplementedError

    @abstractmethod
    async def expire_payment(self, provider_payment_id: str) -> None:
        """Close an open payment link so it can no longer be paid."""
        raise NotImplementedError

    @abstractmethod
    async def refund_payment(self, provider_payment_id: str, payment_id: int) -> dict:
        """Refund a paid payment in full.

        Returns {"provider_refund_id": "...", "status": "..."}.
        """
        raise NotImplementedError
