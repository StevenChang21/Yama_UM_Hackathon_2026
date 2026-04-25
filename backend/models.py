from pydantic import BaseModel
from typing import Optional

class InventoryItem(BaseModel):
    item_id: str
    name: str
    type: str
    current_stock: int
    reorder_point: int
    lead_time_days: int
    cost_per_unit: float

class SalesOrder(BaseModel):
    order_id: str
    customer: str
    item_id: str
    qty: int
    status: str
    due_date: str
    notes: Optional[str] = ""
    revision: Optional[int] = 1
    timestamp: str

class ManufacturingOrder(BaseModel):
    work_order_id: str
    item_id: str
    status: str
    qty: int
    eta: str
    notes: Optional[str] = ""
    timestamp: str

class FinanceAccount(BaseModel):
    account_name: str
    balance_usd: float
    notes: Optional[str] = ""

class LogisticsResource(BaseModel):
    resource: str
    status: str
    availability_date: str
    notes: Optional[str] = ""

class EmailMessage(BaseModel):
    id: str
    sender: str
    subject: str
    date: str
    body: str

class BOMItem(BaseModel):
    parent_id: str
    child_id: str
    qty_required: int
