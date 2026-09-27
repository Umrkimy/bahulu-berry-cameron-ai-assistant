from copy import deepcopy

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.storefront_homepage import StorefrontHomepage


DEFAULT_HOMEPAGE_CONTENT = {
    "hero": {
        "eyebrow": {"en": "HELLO FROM BAHULU BERRY CAMERON", "ms": "SALAM DARI BAHULU BERRY CAMERON"},
        "title_primary": {"en": "Bahulu.", "ms": "Bahulu."},
        "title_accent": {"en": "Berry.", "ms": "Berry."},
        "title_suffix": {"en": "Cameron.", "ms": "Cameron."},
        "body": {"en": "Meet Bahulu Berry Cameron. Take a closer look at our collection.", "ms": "Kenali Bahulu Berry Cameron dan terokai koleksi kami."},
        "cta_label": {"en": "Browse products", "ms": "Lihat produk"},
    },
    "benefits": {
        "enabled": False,
        "eyebrow": {"en": "", "ms": ""}, "title": {"en": "", "ms": ""},
        "items": [{"title": {"en": "", "ms": ""}, "body": {"en": "", "ms": ""}} for _ in range(3)],
    },
    "collection": {
        "eyebrow": {"en": "TAKE A CLOSER LOOK", "ms": "LIHAT DENGAN LEBIH DEKAT"},
        "title": {"en": "Meet the collection", "ms": "Kenali koleksi kami"},
        "view_all_label": {"en": "View all products", "ms": "Lihat semua produk"},
    },
    "story": {
        "eyebrow": {"en": "A FACE TO REMEMBER", "ms": "WAJAH UNTUK DIKENALI"},
        "title": {"en": "Say hello to Bahulu Berry Cameron.", "ms": "Salam daripada Bahulu Berry Cameron."},
        "body": {"en": "Bahulu, a berry-inspired identity, and a character of our own. Get to know the name behind the collection.", "ms": "Bahulu, identiti berinspirasikan beri, dan karakter tersendiri. Kenali nama di sebalik koleksi kami."},
        "cta_label": {"en": "Meet Bahulu Berry Cameron", "ms": "Kenali Bahulu Berry Cameron"},
    },
    "reviews": {"enabled": False, "eyebrow": {"en": "", "ms": ""}, "title": {"en": "", "ms": ""}},
    "location": {
        "enabled": False, "eyebrow": {"en": "", "ms": ""}, "title": {"en": "", "ms": ""},
        "load_map_label": {"en": "", "ms": ""}, "directions_label": {"en": "", "ms": ""},
    },
    "closing": {
        "eyebrow": {"en": "EXPLORE THE COLLECTION", "ms": "TEROKAI KOLEKSI"},
        "title": {"en": "Find your next favourite.", "ms": "Temui pilihan kegemaran anda."},
        "body": {"en": "Browse the products currently available from Bahulu Berry Cameron.", "ms": "Lihat produk Bahulu Berry Cameron yang tersedia pada masa ini."},
        "cta_label": {"en": "Browse products", "ms": "Lihat produk"},
    },
    "google_place_id": None,
}


async def get_homepage_record(db: AsyncSession) -> StorefrontHomepage | None:
    return await db.scalar(select(StorefrontHomepage).where(StorefrontHomepage.id == 1))


async def ensure_homepage_record(db: AsyncSession) -> StorefrontHomepage:
    record = await get_homepage_record(db)
    if record is None:
        record = StorefrontHomepage(id=1, draft_content=deepcopy(DEFAULT_HOMEPAGE_CONTENT), published_content=deepcopy(DEFAULT_HOMEPAGE_CONTENT))
        db.add(record)
        await db.flush()
    return record
