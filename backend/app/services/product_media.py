from io import BytesIO
from pathlib import Path
from dataclasses import dataclass
from hashlib import sha256
from uuid import uuid4

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

MAX_UPLOAD = 5 * 1024 * 1024
LEGACY_DIRECTORY = Path(__file__).resolve().parents[2] / "static" / "product_images"


def media_path(filename: str, legacy: bool = False) -> Path:
    root = LEGACY_DIRECTORY if legacy else Path(settings.PRODUCT_MEDIA_DIRECTORY)
    root = root.resolve()
    path = (root / filename).resolve()
    if path.parent != root or not filename or "/" in filename or "\\" in filename:
        raise HTTPException(404, "Product image not found.")
    return path


@dataclass(frozen=True)
class SavedMedia:
    filename: str
    mime_type: str
    width: int
    height: int
    byte_size: int
    sha256: str


def save_media(data: bytes) -> SavedMedia:
    if not data or len(data) > MAX_UPLOAD:
        raise HTTPException(422, "Choose an image up to 5 MB.")
    try:
        with Image.open(BytesIO(data), formats=("JPEG", "PNG", "WEBP")) as source:
            if source.width * source.height > 20_000_000 or getattr(source, "is_animated", False):
                raise HTTPException(422, "Use a still image up to 20 megapixels.")
            source.load()
            corrected = ImageOps.exif_transpose(source).convert("RGBA")
            corrected.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
            # A fresh image drops EXIF, comments and profiles from the source.
            clean = Image.new("RGBA", corrected.size)
            clean.paste(corrected)
            output = BytesIO()
            clean.save(output, "WEBP", quality=85, method=4)
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError) as error:
        raise HTTPException(422, "Choose a valid JPEG, PNG or WebP image.") from error
    filename = f"{uuid4().hex}.webp"
    path = media_path(filename)
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = output.getvalue()
    try:
        path.write_bytes(encoded)
    except OSError:
        path.unlink(missing_ok=True)
        raise
    return SavedMedia(filename, "image/webp", clean.width, clean.height, len(encoded), sha256(encoded).hexdigest())


def save_image(data: bytes) -> str:
    """Compatibility wrapper for callers that only need the storage key."""
    return save_media(data).filename
