import json
import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import settings


def test_storefront_homepage_migration_seeds_bilingual_snapshots_and_rolls_back(tmp_path, monkeypatch):
    database = tmp_path / "homepage.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite+aiosqlite:///{database.as_posix()}")
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))

    with sqlite3.connect(database) as connection:
        connection.executescript(
            """
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
            INSERT INTO alembic_version (version_num) VALUES ('0028_product_workspace');
            CREATE TABLE admins (id INTEGER PRIMARY KEY);
            """
        )

    command.upgrade(config, "0029_storefront_homepage")
    with sqlite3.connect(database) as connection:
        row = connection.execute("SELECT id, draft_content, published_content, draft_version, published_version FROM storefront_homepage").fetchone()
        draft = json.loads(row[1])
        published = json.loads(row[2])
    assert row[0] == 1
    assert row[3:] == (1, 1)
    assert draft == published
    assert draft["hero"]["eyebrow"]["en"]
    assert draft["hero"]["eyebrow"]["ms"]
    assert draft["benefits"]["enabled"] is False
    assert draft["reviews"]["enabled"] is False
    assert draft["location"]["enabled"] is False

    command.downgrade(config, "0028_product_workspace")
    with sqlite3.connect(database) as connection:
        exists = connection.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='storefront_homepage'").fetchone()
    assert exists is None
