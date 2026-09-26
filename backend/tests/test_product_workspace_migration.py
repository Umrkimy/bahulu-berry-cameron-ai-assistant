import sqlite3
from pathlib import Path

from alembic import command
from alembic.config import Config

from app.core.config import settings


def test_product_workspace_migration_preserves_content_and_drafts_invalid_products(tmp_path, monkeypatch):
    database = tmp_path / "product-workspace.db"
    database_url = f"sqlite+aiosqlite:///{database.as_posix()}"
    monkeypatch.setattr(settings, "DATABASE_URL", database_url)

    backend = Path(__file__).resolve().parents[1]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    timestamp = "2026-01-01 00:00:00"
    products = [
        (1, "Internal valid", "Internal valid description", 1, 1, "Approved English", "Nama diluluskan", "Approved public description", "Penerangan diluluskan"),
        (2, "Internal inactive", "Keep me", 0, 1, "Approved inactive", "Nama tidak aktif", None, None),
        (3, "Internal untranslated", "Keep untranslated", 1, 1, "Approved untranslated", None, None, None),
        (4, "Internal photo-less", "Keep photo-less", 1, 1, "Approved photo-less", "Nama tanpa foto", None, None),
        (5, "Internal sensitive", "Do not publish this", 1, 1, "Approved without description", "Nama tanpa penerangan", None, None),
        (6, "Internal only", "Keep internal only", 1, 1, None, "Nama tanpa Inggeris", None, None),
    ]
    with sqlite3.connect(database) as connection:
        connection.executescript(
            """
            CREATE TABLE alembic_version (version_num VARCHAR(32) NOT NULL PRIMARY KEY);
            INSERT INTO alembic_version (version_num) VALUES ('0027_product_gallery');
            CREATE TABLE products (
                id INTEGER PRIMARY KEY, name VARCHAR(100) NOT NULL, description TEXT,
                price NUMERIC(10, 2) NOT NULL, image_file VARCHAR(200), category VARCHAR(50),
                is_active BOOLEAN NOT NULL, created_at DATETIME NOT NULL, updated_at DATETIME NOT NULL,
                storefront_published BOOLEAN NOT NULL, storefront_name_en VARCHAR(100),
                storefront_name_ms VARCHAR(100), storefront_description_en TEXT,
                storefront_description_ms TEXT
            );
            CREATE INDEX ix_products_storefront_published ON products (storefront_published);
            CREATE TABLE product_images (
                id INTEGER PRIMARY KEY, product_id INTEGER NOT NULL REFERENCES products(id),
                filename VARCHAR(200) NOT NULL, position INTEGER NOT NULL, legacy BOOLEAN NOT NULL
            );
            CREATE TABLE storefront_feature (
                id INTEGER PRIMARY KEY, product_id INTEGER REFERENCES products(id),
                CONSTRAINT single_storefront_feature CHECK (id = 1)
            );
            INSERT INTO storefront_feature (id, product_id) VALUES (1, NULL);
            """
        )
        connection.executemany(
            """
            INSERT INTO products (
                id, name, description, price, image_file, category, is_active,
                created_at, updated_at, storefront_published, storefront_name_en,
                storefront_name_ms, storefront_description_en, storefront_description_ms
            ) VALUES (?, ?, ?, 12.00, NULL, NULL, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            [(*row[:3], row[3], timestamp, timestamp, *row[4:]) for row in products],
        )
        connection.executemany(
            "INSERT INTO product_images (product_id, filename, position, legacy) VALUES (?, ?, 0, 0)",
            [
                (1, "valid.webp"),
                (2, "inactive.webp"),
                (3, "untranslated.webp"),
                (5, "no-description.webp"),
                (6, "no-english-name.webp"),
            ],
        )
        connection.execute("UPDATE storefront_feature SET product_id = 2 WHERE id = 1")

    command.upgrade(config, "0028_product_workspace")

    with sqlite3.connect(database) as connection:
        columns = {row[1] for row in connection.execute("PRAGMA table_info(products)")}
        rows = connection.execute(
            "SELECT id, name, description, name_ms, description_ms, storefront_published FROM products ORDER BY id"
        ).fetchall()
        feature = connection.execute("SELECT product_id FROM storefront_feature WHERE id = 1").fetchone()[0]

    assert {"name_ms", "description_ms"}.issubset(columns)
    assert "storefront_name_en" not in columns
    assert "storefront_description_en" not in columns
    assert rows[0] == (1, "Approved English", "Approved public description", "Nama diluluskan", "Penerangan diluluskan", 1)
    assert rows[1][1:3] == ("Approved inactive", "Keep me")
    assert rows[4][1:3] == ("Approved without description", None)
    assert rows[5][1:3] == ("Internal only", "Keep internal only")
    assert [row[5] for row in rows] == [1, 0, 0, 0, 1, 0]
    assert feature is None
