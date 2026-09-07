import pytest

from app.core.config import Settings


def build_settings(**overrides) -> Settings:
    values = {
        "DATABASE_URL": "postgresql+asyncpg://user:password@db:5432/bahulu",
        "OPENAI_API_KEY": "test-openai-key",
        "STRIPE_SECRET_KEY": "sk_test_placeholder",
        "STRIPE_WEBHOOK_SECRET": "whsec_placeholder",
        "STRIPE_SUCCESS_URL": "http://localhost:5173/payment/success",
        "STRIPE_CANCEL_URL": "http://localhost:5173/payment/cancel",
        "SECRET_KEY": "a" * 32,
        "ENVIRONMENT": "staging",
        "DEBUG": False,
        "ALLOWED_ORIGINS": "http://localhost:15173",
        "TRUSTED_HOSTS": "localhost,127.0.0.1,api",
    }
    values.update(overrides)
    return Settings(**values)


def test_staging_requires_strict_runtime_security():
    settings = build_settings()

    assert settings.is_staging is True
    assert settings.requires_strict_runtime_security is True
    settings.validate_runtime_security()


@pytest.mark.parametrize(
    "overrides",
    [
        {"DEBUG": True},
        {"ALLOWED_ORIGINS": "*"},
        {"TRUSTED_HOSTS": "*"},
        {"SECRET_KEY": "too-short"},
    ],
)
def test_staging_rejects_insecure_runtime_configuration(overrides):
    with pytest.raises(RuntimeError):
        build_settings(**overrides).validate_runtime_security()
