#!/bin/sh
set -eu

exec uv run --no-sync uvicorn main:app --host 0.0.0.0 --port 8000
