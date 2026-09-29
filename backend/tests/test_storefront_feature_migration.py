import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import settings


def test_migration_drops_the_featured_product_table_and_restores_it(tmp_path, monkeypatch):
    database = tmp_path / "feature.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite+aiosqlite:///{database.as_posix()}")
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))

    with sqlite3.connect(database) as connection:
        connection.executescript(
            """
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
            INSERT INTO alembic_version (version_num) VALUES ('0033_order_tracking');
            CREATE TABLE products (id INTEGER PRIMARY KEY);
            CREATE TABLE storefront_feature (id INTEGER PRIMARY KEY, product_id INTEGER);
            INSERT INTO storefront_feature VALUES (1, NULL);
            """
        )

    def tables():
        with sqlite3.connect(database) as connection:
            return {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}

    command.upgrade(config, "0034_drop_storefront_feature")
    assert "storefront_feature" not in tables()

    command.downgrade(config, "0033_order_tracking")
    with sqlite3.connect(database) as connection:
        assert connection.execute("SELECT id, product_id FROM storefront_feature").fetchall() == [(1, None)]
