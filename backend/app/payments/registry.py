from app.payments.base import PaymentProvider


def get_payment_provider(name: str) -> PaymentProvider:
    """Return the provider that owns payments recorded under ``name``."""
    if name == "stripe":
        from app.payments.providers.stripe import StripeProvider

        return StripeProvider()
    raise ValueError(f"Payment provider '{name}' is not integrated.")
