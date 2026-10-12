"""Migration 0036 on SQLite: customer account tables appear and roll back.

Migration tests must sort after test_logging.py (Alembic's logging setup
disables app loggers).
"""

import sqlite3
from pathlib import Path

from alembic.config import Config

from alembic import command
from app.core.config import settings


def test_customer_account_tables_upgrade_and_roll_back(tmp_path, monkeypatch):
    database = tmp_path / "accounts.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite+aiosqlite:///{database.as_posix()}")
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    with sqlite3.connect(database) as connection:
        connection.executescript(
            """
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
            INSERT INTO alembic_version (version_num) VALUES ('0035_customer_status_emails');
            """
        )

    command.upgrade(config, "0036_customer_accounts")
    with sqlite3.connect(database) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        assert {"customer_accounts", "customer_sign_in_codes"} <= tables
        connection.execute("INSERT INTO customer_accounts (email, created_at) VALUES ('buyer@example.com', '2026-10-12 10:00:00')")
        assert connection.execute("SELECT locale, session_version, password_hash FROM customer_accounts").fetchall() == [("en", 0, None)]

    command.downgrade(config, "0035_customer_status_emails")
    with sqlite3.connect(database) as connection:
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
        assert not {"customer_accounts", "customer_sign_in_codes"} & tables
