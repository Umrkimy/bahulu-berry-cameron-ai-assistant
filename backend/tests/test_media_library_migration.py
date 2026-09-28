import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import settings


def test_media_library_migration_preserves_gallery_ids_and_is_reversible(tmp_path, monkeypatch):
    database = tmp_path / "media-library.db"
    monkeypatch.setattr(settings, "DATABASE_URL", f"sqlite+aiosqlite:///{database.as_posix()}")
    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    with sqlite3.connect(database) as connection:
        connection.executescript(
            """
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
            INSERT INTO alembic_version (version_num) VALUES ('0029_storefront_homepage');
            CREATE TABLE admins (id INTEGER PRIMARY KEY);
            CREATE TABLE products (id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL);
            CREATE TABLE product_images (
                id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                filename VARCHAR(200) NOT NULL, position INTEGER NOT NULL, legacy BOOLEAN NOT NULL
            );
            CREATE INDEX ix_product_images_product_id ON product_images (product_id);
            INSERT INTO products (id, name) VALUES (7, 'Fictional preserved product');
            INSERT INTO product_images (id, product_id, filename, position, legacy)
            VALUES (41, 7, 'preserved.webp', 0, 0);
            """
        )

    command.upgrade(config, "0030_media_library")
    with sqlite3.connect(database) as connection:
        image = connection.execute("SELECT id, product_id, media_asset_id, position FROM product_images").fetchone()
        asset = connection.execute("SELECT id, storage_key, title, legacy FROM media_assets").fetchone()
        columns = {row[1] for row in connection.execute("PRAGMA table_info(product_images)")}
    assert image == (41, 7, 41, 0)
    assert asset == (41, "preserved.webp", "Fictional preserved product - photo 1", 0)
    assert "filename" not in columns and "legacy" not in columns

    command.downgrade(config, "0029_storefront_homepage")
    with sqlite3.connect(database) as connection:
        restored = connection.execute("SELECT id, product_id, filename, position, legacy FROM product_images").fetchone()
        tables = {row[0] for row in connection.execute("SELECT name FROM sqlite_master WHERE type = 'table'")}
    assert restored == (41, 7, "preserved.webp", 0, 0)
    assert "media_assets" not in tables
