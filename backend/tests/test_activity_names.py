from app.api.routes.activity import list_activity
from app.models.activity_log import ActivityLog
from app.models.admin import Admin


async def test_activity_includes_the_staff_name_when_available(session):
    owner = Admin(username="umar", email="umar@example.test", password_hash="x", role="OWNER", is_superuser=True, is_active=True)
    session.add(owner)
    await session.flush()
    session.add(ActivityLog(admin_id=owner.id, action="updated", entity_type="product", entity_id=1, description="Updated a product."))
    await session.commit()

    activity = await list_activity(session, owner, entity_type=None, entity_id=None, action=None, admin_id=None, start_at=None, end_at=None, limit=50, offset=0)

    assert activity[0].admin_id == owner.id
    assert activity[0].admin_username == "umar"
