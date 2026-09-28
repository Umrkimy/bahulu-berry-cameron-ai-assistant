from copy import deepcopy

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.storefront_homepage import StorefrontHomepage


DEFAULT_HOMEPAGE_CONTENT = {
    "hero": {
        "eyebrow": {"en": "", "ms": ""},
        "title_primary": {"en": "Bahulu.", "ms": "Bahulu."},
        "title_accent": {"en": "Berry.", "ms": "Berry."},
        "title_suffix": {"en": "Cameron.", "ms": "Cameron."},
        "body": {"en": "Browse our bahulu and current prices.", "ms": "Lihat bahulu kami dan harga semasa."},
        "cta_label": {"en": "Browse products", "ms": "Lihat produk"},
    },
    "benefits": {
        "enabled": False,
        "eyebrow": {"en": "", "ms": ""}, "title": {"en": "", "ms": ""},
        "items": [{"title": {"en": "", "ms": ""}, "body": {"en": "", "ms": ""}} for _ in range(3)],
    },
    "collection": {
        "eyebrow": {"en": "", "ms": ""},
        "title": {"en": "Our bahulu", "ms": "Bahulu kami"},
        "view_all_label": {"en": "View all products", "ms": "Lihat semua produk"},
    },
    "story": {
        "eyebrow": {"en": "", "ms": ""},
        "title": {"en": "The bakery behind the bahulu", "ms": "Bakeri di sebalik bahulu ini"},
        "body": {"en": "Bahulu Berry Cameron is a Cameron Highlands bakery centred on bahulu and berry-inspired products.", "ms": "Bahulu Berry Cameron ialah bakeri Cameron Highlands yang menumpukan bahulu dan produk berinspirasikan beri."},
        "cta_label": {"en": "About us", "ms": "Tentang kami"},
    },
    "reviews": {"enabled": False, "eyebrow": {"en": "", "ms": ""}, "title": {"en": "", "ms": ""}},
    "location": {
        "enabled": False, "eyebrow": {"en": "", "ms": ""}, "title": {"en": "", "ms": ""},
        "load_map_label": {"en": "", "ms": ""}, "directions_label": {"en": "", "ms": ""},
    },
    "closing": {
        "eyebrow": {"en": "", "ms": ""},
        "title": {"en": "Browse all our products", "ms": "Lihat semua produk kami"},
        "body": {"en": "Current products and prices from Bahulu Berry Cameron.", "ms": "Produk dan harga semasa daripada Bahulu Berry Cameron."},
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
