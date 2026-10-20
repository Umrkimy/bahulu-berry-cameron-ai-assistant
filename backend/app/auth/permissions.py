from enum import StrEnum
from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.auth.dependencies import get_current_admin
from app.models.admin import Admin

OWNER = "OWNER"
MANAGER = "MANAGER"
STAFF = "STAFF"
ROLES = (OWNER, MANAGER, STAFF)


class Permission(StrEnum):
    MANAGE_TASKS = "tasks.manage"
    CANCEL_ORDERS = "orders.cancel"
    VIEW_ENQUIRIES = "enquiries.view"
    UPDATE_ENQUIRIES = "enquiries.update"
    MANAGE_ENQUIRIES = "enquiries.manage"
    MANAGE_SUPPLIERS = "suppliers.manage"
    SET_OPENING_STOCK = "inventory.opening_balance"
    ARCHIVE_CUSTOMERS = "customers.archive"
    MANAGE_PRODUCTS = "products.manage"
    VIEW_REPORTS = "reports.view"


_STAFF = {Permission.VIEW_ENQUIRIES, Permission.UPDATE_ENQUIRIES}
_MANAGER = _STAFF | {
    Permission.MANAGE_TASKS,
    Permission.CANCEL_ORDERS,
    Permission.MANAGE_ENQUIRIES,
    Permission.MANAGE_SUPPLIERS,
    Permission.SET_OPENING_STOCK,
    Permission.ARCHIVE_CUSTOMERS,
    Permission.MANAGE_PRODUCTS,
    Permission.VIEW_REPORTS,
}
# Anything not listed here (refunds, discounts, team, settings, exports, AI
# record changes, support content) stays Owner-only through get_current_superuser.
ROLE_PERMISSIONS: dict[str, frozenset[Permission]] = {
    OWNER: frozenset(Permission),
    MANAGER: frozenset(_MANAGER),
    STAFF: frozenset(_STAFF),
}


def can(admin: Admin, permission: Permission) -> bool:
    return permission in ROLE_PERMISSIONS.get(admin.role, frozenset())


def require(permission: Permission):
    async def dependency(admin: Annotated[Admin, Depends(get_current_admin)]) -> Admin:
        if not can(admin, permission):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Permission denied")
        return admin

    return dependency
