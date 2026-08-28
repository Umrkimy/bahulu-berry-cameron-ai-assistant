from typing import Annotated, Type
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.dependencies import get_current_admin, get_current_superuser
from app.db.database import get_db
from app.models.admin import Admin
from app.models.customer import Customer
from app.models.support import HandoffRule, SupportFAQ, SupportRequest, SupportTemplate
from app.schemas.support import FAQInput, FAQPublic, RuleInput, RulePublic, SupportRequestInput, SupportRequestPublic, TemplateInput, TemplatePublic
from app.services.activity_services import record_activity

router = APIRouter()
VALID_STATUS = {"NEW", "IN_PROGRESS", "WAITING_FOR_CUSTOMER", "RESOLVED", "CLOSED"}
VALID_PRIORITY = {"LOW", "NORMAL", "HIGH", "URGENT"}

async def list_records(db: AsyncSession, model: Type): return (await db.execute(select(model).order_by(model.updated_at.desc()))).scalars().all()
async def owner_save(db: AsyncSession, admin: Admin, model: Type, data, item_id: int | None, entity: str):
    item = await db.get(model, item_id) if item_id else model(**data.model_dump())
    if item is None: raise HTTPException(404, detail="Support record not found.")
    if item_id:
        for key, value in data.model_dump().items(): setattr(item, key, value)
    else: db.add(item); await db.flush()
    await record_activity(db, admin=admin, action="updated" if item_id else "created", entity_type=entity, entity_id=item.id, description=f"{'Updated' if item_id else 'Created'} support {entity.replace('_', ' ')}.")
    await db.commit(); await db.refresh(item); return item

@router.get("/faqs", response_model=list[FAQPublic])
async def faqs(db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)]): return await list_records(db, SupportFAQ)
@router.post("/faqs", response_model=FAQPublic)
async def create_faq(data: FAQInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]): return await owner_save(db, admin, SupportFAQ, data, None, "support_faq")
@router.patch("/faqs/{item_id}", response_model=FAQPublic)
async def update_faq(item_id:int, data: FAQInput, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]): return await owner_save(db, admin, SupportFAQ, data, item_id, "support_faq")
@router.delete("/faqs/{item_id}", status_code=204)
async def delete_faq(item_id:int, db: Annotated[AsyncSession, Depends(get_db)], admin: Annotated[Admin, Depends(get_current_superuser)]):
    item=await db.get(SupportFAQ,item_id)
    if not item: raise HTTPException(404,detail="Support record not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="support_faq",entity_id=item.id,description="Deleted support FAQ."); await db.delete(item); await db.commit()

@router.get("/templates", response_model=list[TemplatePublic])
async def templates(db: Annotated[AsyncSession, Depends(get_db)], _: Annotated[Admin, Depends(get_current_admin)]): return await list_records(db, SupportTemplate)
@router.post("/templates", response_model=TemplatePublic)
async def create_template(data:TemplateInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,SupportTemplate,data,None,"support_template")
@router.patch("/templates/{item_id}",response_model=TemplatePublic)
async def update_template(item_id:int,data:TemplateInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,SupportTemplate,data,item_id,"support_template")
@router.delete("/templates/{item_id}",status_code=204)
async def delete_template(item_id:int,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]):
    item=await db.get(SupportTemplate,item_id)
    if not item: raise HTTPException(404,detail="Support record not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="support_template",entity_id=item.id,description="Deleted support template.");await db.delete(item);await db.commit()

@router.get("/rules",response_model=list[RulePublic])
async def rules(db:Annotated[AsyncSession,Depends(get_db)],_:Annotated[Admin,Depends(get_current_admin)]): return await list_records(db,HandoffRule)
@router.post("/rules",response_model=RulePublic)
async def create_rule(data:RuleInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,HandoffRule,data,None,"handoff_rule")
@router.patch("/rules/{item_id}",response_model=RulePublic)
async def update_rule(item_id:int,data:RuleInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]): return await owner_save(db,admin,HandoffRule,data,item_id,"handoff_rule")
@router.delete("/rules/{item_id}",status_code=204)
async def delete_rule(item_id:int,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]):
    item=await db.get(HandoffRule,item_id)
    if not item: raise HTTPException(404,detail="Support record not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="handoff_rule",entity_id=item.id,description="Deleted handoff rule.");await db.delete(item);await db.commit()

@router.get("/requests",response_model=list[SupportRequestPublic])
async def requests(db:Annotated[AsyncSession,Depends(get_db)],_:Annotated[Admin,Depends(get_current_admin)]): return (await db.execute(select(SupportRequest).order_by(SupportRequest.updated_at.desc()))).scalars().all()
@router.post("/requests",response_model=SupportRequestPublic)
async def create_request(data:SupportRequestInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_admin)]):
    if data.status not in VALID_STATUS or data.priority not in VALID_PRIORITY: raise HTTPException(422,detail="Invalid support status or priority.")
    if data.customer_id is not None and await db.get(Customer, data.customer_id) is None: raise HTTPException(404,detail="Customer not found.")
    if data.assigned_admin_id is not None and await db.get(Admin, data.assigned_admin_id) is None: raise HTTPException(404,detail="Assigned team member not found.")
    item=SupportRequest(**data.model_dump());db.add(item);await db.flush();await record_activity(db,admin=admin,action="created",entity_type="support_request",entity_id=item.id,description=f"Created support request #{item.id}.");await db.commit();await db.refresh(item);return item
@router.patch("/requests/{item_id}",response_model=SupportRequestPublic)
async def update_request(item_id:int,data:SupportRequestInput,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_admin)]):
    if data.status not in VALID_STATUS or data.priority not in VALID_PRIORITY: raise HTTPException(422,detail="Invalid support status or priority.")
    if data.customer_id is not None and await db.get(Customer, data.customer_id) is None: raise HTTPException(404,detail="Customer not found.")
    if data.assigned_admin_id is not None and await db.get(Admin, data.assigned_admin_id) is None: raise HTTPException(404,detail="Assigned team member not found.")
    item=await db.get(SupportRequest,item_id)
    if not item: raise HTTPException(404,detail="Support request not found.")
    for key,value in data.model_dump().items():setattr(item,key,value)
    await record_activity(db,admin=admin,action="updated",entity_type="support_request",entity_id=item.id,description=f"Updated support request #{item.id}.");await db.commit();await db.refresh(item);return item
@router.delete("/requests/{item_id}",status_code=204)
async def delete_request(item_id:int,db:Annotated[AsyncSession,Depends(get_db)],admin:Annotated[Admin,Depends(get_current_superuser)]):
    item=await db.get(SupportRequest,item_id)
    if not item: raise HTTPException(404,detail="Support request not found.")
    await record_activity(db,admin=admin,action="deleted",entity_type="support_request",entity_id=item.id,description=f"Deleted support request #{item.id}.");await db.delete(item);await db.commit()
