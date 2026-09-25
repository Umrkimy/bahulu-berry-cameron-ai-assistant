FROM ghcr.io/astral-sh/uv:0.12.17 AS uv

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

WORKDIR /app
COPY --from=uv /uv /uvx /bin/

RUN useradd --create-home --uid 10001 appuser
RUN mkdir -p /app/media/products && chown -R appuser:appuser /app/media
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project

COPY --chown=appuser:appuser . .
RUN sed -i 's/\r$//' docker-entrypoint.sh && chmod +x docker-entrypoint.sh
USER appuser

EXPOSE 8000
ENTRYPOINT ["./docker-entrypoint.sh"]
