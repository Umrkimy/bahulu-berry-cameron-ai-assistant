from abc import ABC, abstractmethod
from decimal import Decimal


class PaymentProvider(ABC):

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
            "status": "PENDING",
        }
        """
        raise NotImplementedError