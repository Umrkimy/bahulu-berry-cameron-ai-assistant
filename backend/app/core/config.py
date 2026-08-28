from typing import List

from pydantic import SecretStr, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    API_PREFIX: str = "/api"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    DATABASE_URL: str

    ALLOWED_ORIGINS: str = ""
    TRUSTED_HOSTS: str = ""
    MAX_REQUEST_BODY_BYTES: int = 1_048_576
    SESSION_COOKIE_NAME: str = "bbc_admin_session"
    CSRF_COOKIE_NAME: str = "bbc_csrf_token"

    OPENAI_API_KEY: SecretStr
    OPENAI_MODEL: str = "gpt-5.6-luna"
    OPENAI_REASONING_EFFORT: str = "none"

    STRIPE_SECRET_KEY: SecretStr
    STRIPE_WEBHOOK_SECRET: SecretStr
    STRIPE_SUCCESS_URL: str
    STRIPE_CANCEL_URL: str

    SECRET_KEY: SecretStr
    ALGORITHM: str = "HS256"
    SESSION_EXPIRE_MINUTES: int = 480
    ACCESS_TOKEN_EXPIRE_MINUTES: int | None = None

    @field_validator("ALLOWED_ORIGINS")
    @classmethod
    def parse_allowed_origins(cls, v: str) -> List[str]:
        return [origin.strip().rstrip("/") for origin in v.split(",") if origin.strip()]

    @field_validator("TRUSTED_HOSTS")
    @classmethod
    def parse_trusted_hosts(cls, v: str) -> List[str]:
        return [host.strip() for host in v.split(",") if host.strip()]

    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v: str | bool) -> bool:
        if isinstance(v, bool):
            return v

        return v.strip().lower() in {"1", "true", "yes", "on", "debug"}

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def cookie_secure(self) -> bool:
        return self.is_production

    @property
    def cookie_samesite(self) -> str:
        return "none" if self.is_production else "lax"

    def validate_runtime_security(self) -> None:
        if not self.is_production:
            return
        if self.DEBUG:
            raise RuntimeError("DEBUG must be false in production.")
        if not self.ALLOWED_ORIGINS or "*" in self.ALLOWED_ORIGINS:
            raise RuntimeError("Production requires explicit ALLOWED_ORIGINS.")
        if not self.TRUSTED_HOSTS or "*" in self.TRUSTED_HOSTS:
            raise RuntimeError("Production requires explicit TRUSTED_HOSTS.")
        if len(self.SECRET_KEY.get_secret_value()) < 32:
            raise RuntimeError("SECRET_KEY must be at least 32 characters in production.")


settings = Settings()
