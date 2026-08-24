import json

from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.services.ai_tools import (
    adjust_product_stock,
    check_product_stock,
)


client = AsyncOpenAI(
    api_key=settings.OPENAI_API_KEY.get_secret_value()
)


SYSTEM_PROMPT = """
You are Bahulu Cameron AI Assistant, an AI assistant for Bahulu Cameron bakery.

You help the business manage:
- customers
- products
- inventory
- orders

Be helpful, professional, and concise.

IMPORTANT:
- Never invent business information.
- When the user asks about current product stock, use the check_product_stock tool.
- When the user asks to add or remove stock, use the adjust_product_stock tool.
- Only report stock information returned by the tools.
- If a product cannot be found, tell the user that the product was not found.
- Positive quantity changes add stock.
- Negative quantity changes remove stock.
"""


TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "check_product_stock",
            "description": (
                "Check the current inventory quantity of a specific "
                "Bahulu Cameron product."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "The name of the product to check.",
                    }
                },
                "required": [
                    "product_name",
                ],
                "additionalProperties": False,
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "adjust_product_stock",
            "description": (
                "Add or remove inventory stock for a specific product. "
                "Use a positive quantity_change to add stock and a "
                "negative quantity_change to remove stock."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "product_name": {
                        "type": "string",
                        "description": "The name of the product.",
                    },
                    "quantity_change": {
                        "type": "integer",
                        "description": (
                            "Amount to change stock by. "
                            "Positive numbers add stock. "
                            "Negative numbers remove stock."
                        ),
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
]


async def generate_ai_response(
    db: AsyncSession,
    message: str,
) -> str:

    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": message,
        },
    ]

    # First request to OpenAI
    response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
        tools=TOOLS,
        tool_choice="auto",
    )

    assistant_message = response.choices[0].message

    # No tool required
    if not assistant_message.tool_calls:
        return assistant_message.content or ""

    # Add OpenAI's tool request to the conversation
    messages.append(assistant_message)

    # Execute requested tools
    for tool_call in assistant_message.tool_calls:

        if tool_call.function.name == "check_product_stock":

            arguments = json.loads(
                tool_call.function.arguments
            )

            result = await check_product_stock(
                db=db,
                product_name=arguments["product_name"],
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )

        elif tool_call.function.name == "adjust_product_stock":

            arguments = json.loads(
                tool_call.function.arguments
            )

            result = await adjust_product_stock(
                db=db,
                product_name=arguments["product_name"],
                quantity_change=arguments["quantity_change"],
            )

            messages.append(
                {
                    "role": "tool",
                    "tool_call_id": tool_call.id,
                    "content": json.dumps(result),
                }
            )

    # Ask OpenAI to turn the tool result into a natural response
    final_response = await client.chat.completions.create(
        model=settings.OPENAI_MODEL,
        messages=messages,
    )

    return final_response.choices[0].message.content or ""