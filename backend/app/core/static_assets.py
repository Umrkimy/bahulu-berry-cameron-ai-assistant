from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles


class PublicStaticFiles(StaticFiles):
    async def get_response(self, path, scope):
        normalised = path.replace("\\", "/").casefold()
        if normalised.startswith("product_images/") and normalised != "product_images/default.jpg":
            # Legacy product files must pass the same publication/Owner checks
            # as new gallery images. The generic placeholder is not a product.
            raise HTTPException(status_code=404)
        return await super().get_response(path, scope)
