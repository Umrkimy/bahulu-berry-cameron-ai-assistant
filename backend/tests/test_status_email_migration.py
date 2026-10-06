"""Migration 0035 on SQLite: tracking hashes move into their own table.

Kept apart from test_customer_status_emails.py because Alembic's logging setup
disables app loggers, so migration tests must sort after test_logging.py.
"""

import sqlite3
from pathlib import Path

from alembic.config import Config

from alembic import command
from app.core.config import settings


def test_migration_moves_tracking_hashes_and_rolls_back(tmp_path, monkeypatch):
    database = tmp_path / "status-emails.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite+aiosqlite:///{database.as_posix()}")
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    with sqlite3.connect(database) as connection:
        connection.executescript(
            """
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
            INSERT INTO alembic_version (version_num) VALUES ('0034_drop_storefront_feature');
            CREATE TABLE admins (id INTEGER PRIMARY KEY);
            INSERT INTO admins VALUES (1);
            CREATE TABLE orders (id INTEGER PRIMARY KEY, updated_at DATETIME, tracking_token_hash VARCHAR(64));
            CREATE UNIQUE INDEX ix_orders_tracking_token_hash ON orders (tracking_token_hash);
            INSERT INTO orders VALUES (1, '2026-09-01 10:00:00', 'hash-one'), (2, '2026-09-02 10:00:00', NULL);
            CREATE TABLE email_deliveries (
                id INTEGER PRIMARY KEY, recipient_admin_id INTEGER NOT NULL REFERENCES admins (id),
                email_type VARCHAR(60) NOT NULL, idempotency_key VARCHAR(180) UNIQUE, status VARCHAR(20) NOT NULL,
                provider_message_id VARCHAR(120), created_at DATETIME NOT NULL, sent_at DATETIME
            );
            INSERT INTO email_deliveries VALUES (1, 1, 'PASSWORD_RESET', NULL, 'SENT', NULL, '2026-09-01 10:00:00', NULL);
            """
        )

    command.upgrade(config, "0035_customer_status_emails")
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT order_id, token_hash FROM order_tracking_tokens").fetchall() == [(1, "hash-one")]
        assert {row[1] for row in connection.execute("PRAGMA table_info(orders)")} == {"id", "updated_at", "contact_email", "locale"}
        assert connection.execute("SELECT id, attempts FROM email_deliveries").fetchall() == [(1, 0)]
        connection.execute("INSERT INTO order_tracking_tokens (order_id, token_hash, created_at) VALUES (1, 'hash-two', '2026-09-03 10:00:00')")
        connection.execute("INSERT INTO email_deliveries (order_id, email_type, status, attempts, created_at) VALUES (1, 'CUSTOMER_ORDER_RECEIVED', 'QUEUED', 0, '2026-09-03 10:00:00')")

    command.downgrade(config, "0034_drop_storefront_feature")
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT id, tracking_token_hash FROM orders ORDER BY id").fetchall() == [(1, "hash-two"), (2, None)]
        assert connection.execute("SELECT id FROM email_deliveries").fetchall() == [(1,)]
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert "order_tracking_tokens" not in tables
