import json
import re
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.schemas.ai_assistant import AIChatMessage

from app.services.ai_tools import (
    adjust_product_stock,
    cancel_order,
    check_product_stock,
    create_customer_tool,
    create_order_tool,
    find_customer,
    find_orders,
    find_product,
    get_order,
    update_order_status,
    get_order_count_tool,
    get_sales_summary_tool,
    get_customer_count_tool,
    get_unique_customers_for_date_tool,
    get_best_selling_products_tool,
    get_dashboard_summary_tool,
)


client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY.get_secret_value()
)


MAX_TOOL_ROUNDS = 5
MAX_HISTORY_MESSAGES = 12


SYSTEM_PROMPT = """
You are Bahulu Cameron AI Assistant, an AI assistant for Bahulu Cameron bakery.

Help manage customers, products, inventory, orders, and business analytics.

GENERAL:
- Be concise, professional, natural, and helpful.
- Never invent business data, customer data, product data, inventory data, order data, IDs, prices, stock quantities, sales figures, customer counts, or order counts.
- Use tools whenever database information is required.
- Only report information returned by tools.
- Use conversation history to understand references and follow-up questions.
- Do not ask the user to repeat information already available in the conversation.
- Never expose tool names or implementation details.

LANGUAGE:
- Default response language is English.
- If the user's latest message is primarily Malay, respond in Malay.
- If the user's latest message is primarily English, respond in English.
- If the user mixes Malay and English, naturally follow the user's language style.
- Do not translate unless requested.
- Keep customer names, product names, order IDs, prices, and database values unchanged.

PRODUCTS:
- Use find_product when the user refers to a product by name.
- Use check_product_stock for current stock.
- Use adjust_product_stock when adding or removing stock.
- Never guess product IDs, prices, or stock.
- If multiple products match, ask the user to clarify.

CUSTOMERS:
- Use find_customer for customer lookups.
- Customers can be identified by full name, partial name, phone number, or email.
- If multiple customers match, ask the user to clarify.
- Creating a customer requires full name and phone number.
- Email, address, city, state, postal code, and country are optional.
- Do not ask for optional information unless the user provides it.

ORDERS:
- Use find_orders when searching for orders by customer or date.
- Use get_order for a specific order.
- Use find_customer before creating an order.
- Use find_product for every product before creating an order.
- Never guess order IDs, customer IDs, product IDs, prices, stock, or totals.
- The backend is the final authority for stock, pricing, inventory, and totals.

ORDER REFERENCES:
Understand references such as:
- "no 3"
- "number 3"
- "order 3"
- "order no 3"
- "order number 3"
- "what about 3"
- "how about 3"
- "what about order 3"
- "how about order 3"

When conversation context clearly establishes that the user is talking about orders, numeric references refer to order IDs.

DATES:
- Today means the current calendar day in Malaysia.
- Yesterday means the previous calendar day in Malaysia.
- Use find_orders with order_date="today" for today's orders.
- Use find_orders with order_date="yesterday" for yesterday's orders.
- For specific dates, use YYYY-MM-DD.

ORDER STATUS:
Valid statuses:
PENDING
PROCESSING
SHIPPED
COMPLETED
CANCELLED

Use update_order_status for status changes.

CONFIRMATION:
- COMPLETED requires explicit confirmation before the database-changing tool is executed.
- CANCELLED requires explicit confirmation before the database-changing tool is executed.
- Never execute cancel_order without confirmation.
- Never execute update_order_status with COMPLETED without confirmation.
- Confirmation can be:
  "yes"
  "yes please"
  "confirm"
  "confirmed"
  "sure"
  "okay"
  "ok"
  "go ahead"
  "do it"
  "proceed"
  "ya"
  "baik"
  "boleh"
  "teruskan"
  "sahkan"
  "saya setuju"
  and equivalent confirmations.

- Confirmation must refer to the specific pending action.
- If a destructive tool returns confirmation_required=true, do not call that destructive tool again during the same request.
- Instead, ask the user for confirmation.
- When the user confirms in the next message, execute the pending action.
- If the user explicitly includes the order number in the confirmation, use that order number.
- Do not require the user to use an exact confirmation sentence.
- "yes", "confirm", or "ya" is sufficient when there is exactly one pending destructive action.
- If there is no pending destructive action, do not treat a standalone "yes" as permission to perform an unrelated destructive action.
- When asking for cancellation confirmation, clearly identify the order and explain that inventory may be restored.
- When asking for completion confirmation, clearly identify the order.

CREATE ORDERS:
- Creating an order does not require confirmation.
- Identify the customer first.
- Identify every product first.
- Use IDs returned by the tools.
- Quantity must be a positive integer.
- The backend is authoritative for stock, pricing, inventory deduction, and order totals.

ANALYTICS:
- Use get_dashboard_summary for today's or yesterday's overall business summary.
- Use get_order_count for order counts.
- Use get_sales_summary for sales and revenue.
- Use get_customer_count for total registered customers.
- Use get_unique_customers_for_date for unique customers on a date.
- Use get_best_selling_products for best-selling products.
- Never calculate business statistics yourself.
- Cancelled orders are excluded from sales analytics.

RESPONSE STYLE:
- Keep responses concise.
- Answer directly.
- Use simple formatting when useful.
- Do not add unnecessary follow-up phrases.
- Do not ask if the user needs anything else.
- Do not say "If you need anything else, let me know."
- Do not say "Feel free to ask."
"""


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "find_product",
            "description": "Find an active Bahulu Cameron product by name or partial name. Returns product ID, name, price, category, and stock.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Product name or partial product name.",
                    }
                },
                "required": ["product_name"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "check_product_stock",
            "description": "Check current inventory quantity for a product.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "Product name.",
                    }
                },
                "required": ["product_name"],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "adjust_product_stock",
            "description": "Add or remove product inventory. Positive values add stock. Negative values remove stock. Zero is not allowed.",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                    },
                    "quantity_change": {
                        "type": "integer",
                        "description": "Positive to add stock, negative to remove stock.",
                    },
                },
                "required": [
                    "product_name",
                    "quantity_change",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_customer",
            "description": "Find customer by full name, partial name, phone number, or email.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_identifier": {
                        "type": "string",
                    }
                },
                "required": [
                    "customer_identifier",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_customer",
            "description": "Create a new bakery customer. Full name and phone number are required.",
            "parameters": {
                "type": "object",
                "properties": {
                    "full_name": {
                        "type": "string",
                    },
                    "phone_number": {
                        "type": "string",
                    },
                    "email": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "address": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "city": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "state": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "postal_code": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "country": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                },
                "required": [
                    "full_name",
                    "phone_number",
                    "email",
                    "address",
                    "city",
                    "state",
                    "postal_code",
                    "country",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "find_orders",
            "description": "Find orders by customer, order ID, or date. Use today, yesterday, or YYYY-MM-DD for order_date.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_identifier": {
                        "type": [
                            "string",
                            "null",
                        ],
                        "description": "Customer full name, partial name, phone, or email.",
                    },
                    "order_id": {
                        "type": [
                            "integer",
                            "null",
                        ],
                        "description": "Specific order ID.",
                    },
                    "order_date": {
                        "type": [
                            "string",
                            "null",
                        ],
                        "description": "Use today, yesterday, or YYYY-MM-DD.",
                    },
                },
                "required": [
                    "customer_identifier",
                    "order_id",
                    "order_date",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order",
            "description": "Get complete details for a specific order.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "integer",
                    }
                },
                "required": [
                    "order_id",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "create_order",
            "description": "Create a new customer order. The customer and products must already exist. Use IDs returned by previous tools.",
            "parameters": {
                "type": "object",
                "properties": {
                    "customer_id": {
                        "type": "integer",
                    },
                    "items": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "product_id": {
                                    "type": "integer",
                                },
                                "quantity": {
                                    "type": "integer",
                                },
                            },
                            "required": [
                                "product_id",
                                "quantity",
                            ],
                            "additionalProperties": False,
                        },
                    },
                    "delivery_name": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "delivery_phone": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "delivery_address": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "city": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "state": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "postal_code": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                    "country": {
                        "type": [
                            "string",
                            "null",
                        ],
                    },
                },
                "required": [
                    "customer_id",
                    "items",
                    "delivery_name",
                    "delivery_phone",
                    "delivery_address",
                    "city",
                    "state",
                    "postal_code",
                    "country",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_order_status",
            "description": "Update an existing order status.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "integer",
                    },
                    "new_status": {
                        "type": "string",
                        "enum": [
                            "PENDING",
                            "PROCESSING",
                            "SHIPPED",
                            "COMPLETED",
                            "CANCELLED",
                        ],
                    },
                },
                "required": [
                    "order_id",
                    "new_status",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_order",
            "description": "Cancel an order and restore its product quantities to inventory.",
            "parameters": {
                "type": "object",
                "properties": {
                    "order_id": {
                        "type": "integer",
                    }
                },
                "required": [
                    "order_id",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_order_count",
            "description": "Get the number of orders for today or yesterday.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "enum": [
                            "today",
                            "yesterday",
                        ],
                    }
                },
                "required": [
                    "date",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales_summary",
            "description": "Get total order value, paid sales, and unpaid value for today or yesterday. Cancelled orders are excluded.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "enum": [
                            "today",
                            "yesterday",
                        ],
                    }
                },
                "required": [
                    "date",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_customer_count",
            "description": "Get the total number of customers registered in the system.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": [],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_unique_customers_for_date",
            "description": "Get the number of unique customers who placed orders today or yesterday.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "enum": [
                            "today",
                            "yesterday",
                        ],
                    }
                },
                "required": [
                    "date",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_best_selling_products",
            "description": "Get best-selling products ranked by quantity sold. Cancelled orders are excluded.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "minimum": 1,
                        "maximum": 20,
                    }
                },
                "required": [
                    "limit",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_dashboard_summary",
            "description": "Get a complete business summary for today or yesterday.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "enum": [
                            "today",
                            "yesterday",
                        ],
                    }
                },
                "required": [
                    "date",
                ],
                "additionalProperties": False,
            },
        },
    },
]


TOOL_HANDLERS = {
    "find_product": find_product,
    "check_product_stock": check_product_stock,
    "adjust_product_stock": adjust_product_stock,
    "find_customer": find_customer,
    "create_customer": create_customer_tool,
    "find_orders": find_orders,
    "get_order": get_order,
    "create_order": create_order_tool,
    "update_order_status": update_order_status,
    "cancel_order": cancel_order,
    "get_order_count": get_order_count_tool,
    "get_sales_summary": get_sales_summary_tool,
    "get_customer_count": get_customer_count_tool,
    "get_unique_customers_for_date": get_unique_customers_for_date_tool,
    "get_best_selling_products": get_best_selling_products_tool,
    "get_dashboard_summary": get_dashboard_summary_tool,
}


CONFIRMATION_WORDS = {
    "yes",
    "y",
    "yeah",
    "yep",
    "yes please",
    "confirm",
    "confirmed",
    "sure",
    "okay",
    "ok",
    "go ahead",
    "do it",
    "proceed",
    "baik",
    "ya",
    "ya boleh",
    "boleh",
    "teruskan",
    "sahkan",
    "saya setuju",
}


def _normalize_text(value: str) -> str:
    return " ".join(
        value.lower().strip().split()
    )


def _is_confirmation(value: str) -> bool:
    normalized = _normalize_text(value)

    if normalized in CONFIRMATION_WORDS:
        return True

    prefixes = (
        "yes ",
        "confirm ",
        "confirmed ",
        "sure ",
        "okay ",
        "ok ",
        "go ahead ",
        "do it ",
        "proceed ",
        "ya ",
        "sahkan ",
        "teruskan ",
    )

    return normalized.startswith(prefixes)


def _extract_order_id_from_text(
    value: str,
) -> int | None:
    normalized = _normalize_text(value)

    patterns = (
        r"\border\s*#?\s*(\d+)\b",
        r"\border\s+(?:no|number)\s*#?\s*(\d+)\b",
        r"#\s*(\d+)\b",
    )

    for pattern in patterns:
        match = re.search(
            pattern,
            normalized,
        )

        if match:
            return int(match.group(1))

    return None


def _get_pending_confirmation(
    conversation_history: list[AIChatMessage],
) -> dict[str, Any] | None:
    for history_message in reversed(
        conversation_history
    ):
        if history_message.role != "assistant":
            continue

        content = _normalize_text(
            history_message.content or ""
        )

        order_id = _extract_order_id_from_text(
            content
        )

        if order_id is None:
            continue

        has_confirmation_request = (
            "confirm" in content
            or "sahkan" in content
        )

        if not has_confirmation_request:
            continue

        is_cancel = (
            "cancel" in content
            or "cancellation" in content
            or "cancelled" in content
            or "batal" in content
            or "pembatalan" in content
        )

        is_complete = (
            "complete" in content
            or "completed" in content
            or "siap" in content
            or "selesai" in content
        )

        if is_cancel:
            return {
                "action": "cancel",
                "order_id": order_id,
            }

        if is_complete:
            return {
                "action": "complete",
                "order_id": order_id,
            }

    return None


def _confirmation_matches_pending_action(
    conversation_history: list[AIChatMessage],
    current_message: str,
    action: str,
    order_id: int,
) -> bool:
    pending = _get_pending_confirmation(
        conversation_history
    )

    if pending is None:
        return False

    if pending["action"] != action:
        return False

    if pending["order_id"] != order_id:
        return False

    current_order_id = _extract_order_id_from_text(
        current_message
    )

    if current_order_id is not None:
        return (
            current_order_id == order_id
            and (
                _is_confirmation(current_message)
                or "cancel" in _normalize_text(
                    current_message
                )
                or "batal" in _normalize_text(
                    current_message
                )
                or "complete" in _normalize_text(
                    current_message
                )
                or "sahkan" in _normalize_text(
                    current_message
                )
            )
        )

    return _is_confirmation(
        current_message
    )


def _confirmation_required_response(
    action: str,
    order_id: int,
) -> dict[str, Any]:
    if action == "cancel":
        return {
            "success": False,
            "confirmation_required": True,
            "action": "cancel",
            "order_id": order_id,
            "message": (
                f"Please confirm cancellation "
                f"of order #{order_id}."
            ),
        }

    return {
        "success": False,
        "confirmation_required": True,
        "action": "complete",
        "order_id": order_id,
        "message": (
            f"Please confirm marking "
            f"order #{order_id} as completed."
        ),
    }


async def _execute_tool(
    db: AsyncSession,
    tool_name: str,
    arguments: dict[str, Any],
    conversation_history: list[AIChatMessage],
    current_message: str,
) -> dict[str, Any]:

    handler = TOOL_HANDLERS.get(tool_name)

    if handler is None:
        return {
            "success": False,
            "error": f"Unknown tool: {tool_name}",
        }

    if tool_name == "cancel_order":
        order_id = arguments.get("order_id")

        if not isinstance(order_id, int):
            return {
                "success": False,
                "error": "Invalid order ID.",
            }

        confirmed = (
            _confirmation_matches_pending_action(
                conversation_history=conversation_history,
                current_message=current_message,
                action="cancel",
                order_id=order_id,
            )
        )

        if not confirmed:
            return _confirmation_required_response(
                action="cancel",
                order_id=order_id,
            )

    if (
        tool_name == "update_order_status"
        and str(
            arguments.get("new_status", "")
        ).upper()
        == "COMPLETED"
    ):
        order_id = arguments.get("order_id")

        if not isinstance(order_id, int):
            return {
                "success": False,
                "error": "Invalid order ID.",
            }

        confirmed = (
            _confirmation_matches_pending_action(
                conversation_history=conversation_history,
                current_message=current_message,
                action="complete",
                order_id=order_id,
            )
        )

        if not confirmed:
            return _confirmation_required_response(
                action="complete",
                order_id=order_id,
            )

    return await handler(
        db=db,
        **arguments,
    )


async def generate_ai_response(
    db: AsyncSession,
    message: str,
    conversation_history: list[AIChatMessage],
) -> str:

    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        }
    ]

    recent_history = conversation_history[
        -MAX_HISTORY_MESSAGES:
    ]

    for history_message in recent_history:
        messages.append(
            {
                "role": history_message.role,
                "content": history_message.content,
            }
        )

    messages.append(
        {
            "role": "user",
            "content": message,
        }
    )

    for _ in range(MAX_TOOL_ROUNDS):

        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=messages,
            tools=TOOLS,
            tool_choice="auto",
            reasoning_effort=settings.OPENAI_REASONING_EFFORT,
        )

        assistant_message = response.choices[0].message

        if not assistant_message.tool_calls:
            return assistant_message.content or ""

        messages.append(
            {
                "role": "assistant",
                "content": assistant_message.content,
                "tool_calls": [
                    {
                        "id": tool_call.id,
                        "type": "function",
                        "function": {
                            "name": tool_call.function.name,
                            "arguments": tool_call.function.arguments,
                        },
                    }
                    for tool_call in assistant_message.tool_calls
                ],
            }
        )

        for tool_call in assistant_message.tool_calls:

            tool_name = tool_call.function.name

            try:
                arguments = json.loads(
                    tool_call.function.arguments
                )

                result = await _execute_tool(
                    db=db,
                    tool_name=tool_name,
                    arguments=arguments,
                    conversation_history=conversation_history,
                    current_message=message,
                )

            except Exception as exc:
                await db.rollback()

                result = {
                    "success": False,
                    "error": str(exc),
                }

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(
                        result,
                        default=str,
                    ),
                }
            )

    return (
        "I was unable to complete the request. "
        "Please try again."
    )