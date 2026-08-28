from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.product import Product


MONEY = Decimal("0.01")


def _money(value: Decimal) -> Decimal:
    return value.quantize(MONEY, rounding=ROUND_HALF_UP)


async def calculate_order_pricing(
    db: AsyncSession,
    items: list[dict],
) -> dict:
    combined_items: dict[int, int] = {}

    for item in items:
        product_id = item.get("product_id")
        quantity = item.get("quantity")

        if not isinstance(product_id, int):
            raise ValueError("Invalid product ID.")

        if not isinstance(quantity, int) or quantity <= 0:
            raise ValueError("Product quantity must be a positive integer.")

        combined_items[product_id] = combined_items.get(product_id, 0) + quantity

    if not combined_items:
        raise ValueError("Order must contain at least one product.")

    result = await db.execute(
        select(Product)
        .options(
            selectinload(Product.inventory),
            selectinload(Product.discounts),
        )
        .where(Product.id.in_(combined_items))
    )

    products = {product.id: product for product in result.scalars().all()}
    quote_items = []
    subtotal = Decimal("0.00")
    discount_amount = Decimal("0.00")

    for product_id, quantity in combined_items.items():
        product = products.get(product_id)

        if product is None or not product.is_active:
            raise ValueError(f"Product #{product_id} was not found or is inactive.")

        if product.inventory is None:
            raise ValueError(f"No inventory record exists for product '{product.name}'.")

        if product.inventory.quantity < quantity:
            raise ValueError(
                f"Insufficient stock for '{product.name}'. Available: "
                f"{product.inventory.quantity}, requested: {quantity}."
            )

        unit_price = _money(Decimal(str(product.price)))
        line_subtotal = _money(unit_price * quantity)
        active_discounts = product.active_discounts
        line_total = line_subtotal
        applied_discounts = []
        bundle_price_applied = False

        promotion_order = {"BUNDLE_PRICE": 0, "PERCENTAGE": 1, "FIXED_AMOUNT": 2}
        for discount in sorted(
            active_discounts,
            key=lambda item: (promotion_order.get(item.discount_type, 99), item.id),
        ):
            value = Decimal(str(discount.discount_value))
            discount_value = Decimal("0.00")

            if discount.discount_type == "BUNDLE_PRICE":
                bundle_quantity = discount.bundle_quantity or 0
                bundle_count = quantity // bundle_quantity
                bundle_total = value * bundle_count
                regular_total = unit_price * (quantity % bundle_quantity)
                discount_value = _money(max(Decimal("0.00"), line_total - bundle_total - regular_total))
                bundle_price_applied = discount_value > 0
            elif discount.discount_type == "PERCENTAGE":
                if bundle_price_applied and not discount.stack_with_bundle:
                    continue
                discount_value = _money(line_total * value / Decimal("100"))
            elif discount.discount_type == "FIXED_AMOUNT":
                discount_value = _money(min(line_total, min(unit_price, value) * quantity))

            if discount_value > 0:
                line_total = _money(line_total - discount_value)

            applied_discounts.append(
                {
                    "discount_id": discount.id,
                    "discount_name": discount.name,
                    "discount_type": discount.discount_type,
                    "discount_value": value,
                    "discount_bundle_quantity": discount.bundle_quantity,
                    "discount_amount": discount_value,
                }
            )

        line_discount = _money(line_subtotal - line_total)
        primary_discount = applied_discounts[0] if applied_discounts else None
        subtotal += line_subtotal
        discount_amount += line_discount

        quote_items.append(
            {
                "product": product,
                "product_id": product.id,
                "product_name": product.name,
                "quantity": quantity,
                "unit_price": unit_price,
                "subtotal": line_subtotal,
                "discount_id": primary_discount["discount_id"] if primary_discount else None,
                "discount_name": " + ".join(item["discount_name"] for item in applied_discounts) or None,
                "discount_type": primary_discount["discount_type"] if primary_discount else None,
                "discount_value": primary_discount["discount_value"] if primary_discount else None,
                "discount_bundle_quantity": primary_discount["discount_bundle_quantity"] if primary_discount else None,
                "discount_amount": line_discount,
                "total_amount": line_total,
                "applied_discounts": applied_discounts,
            }
        )

    subtotal = _money(subtotal)
    discount_amount = _money(discount_amount)

    return {
        "items": quote_items,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "total_amount": _money(subtotal - discount_amount),
    }
