from app.models.customer import Customer
from app.services.customer_services import find_customer


async def test_name_lookup_ignores_customers_without_email_or_phone(session):
    session.add_all([
        Customer(full_name="Aina Fictional", phone_number="+60100000011", canonical_phone_number="+60100000011"),
        Customer(full_name="Hafiz Fictional", phone_number="+60100000012", canonical_phone_number="+60100000012"),
    ])
    await session.commit()

    result = await find_customer(session, "Hafiz Fictional")
    assert result["success"] is True
    assert result["customer"]["full_name"] == "Hafiz Fictional"
    assert (await find_customer(session, "+60100000011"))["customer"]["full_name"] == "Aina Fictional"
    assert (await find_customer(session, "Fictional"))["success"] is False
