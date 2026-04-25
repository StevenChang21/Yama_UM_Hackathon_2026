"""
Data Repository Module (Single Responsibility Principle)

This class is responsible ONLY for reading/writing data from CSV files.
Each method maps to one department's data source.
Supports optional as_of_date for time-travel filtering.
"""

import os
import pandas as pd
from typing import Optional, List, Dict, Any
import sys

# Add the parent directory to sys.path to import models
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from models import InventoryItem, SalesOrder, ManufacturingOrder, FinanceAccount, LogisticsResource, BOMItem

class DataRepository:
    """Responsible solely for reading department data from CSV files and mapping to Data Classes."""

    def __init__(self, data_dir: str, as_of_date: Optional[str] = None):
        self._data_dir = data_dir
        self._as_of = pd.Timestamp(as_of_date) if as_of_date else None

    def _read_csv_as_models(self, filename: str, model_class) -> List[Any]:
        filepath = os.path.join(self._data_dir, filename)
        if not os.path.exists(filepath):
            return []
        try:
            df = pd.read_csv(filepath)
            # Fill NaN with empty string or sensible defaults
            df = df.fillna("")
            return [model_class(**row) for row in df.to_dict(orient="records")]
        except Exception as e:
            print(f"Error reading {filename}: {e}")
            return []

    def _write_models_to_csv(self, filename: str, models: List[Any]):
        filepath = os.path.join(self._data_dir, filename)
        if not models:
            pd.DataFrame().to_csv(filepath, index=False)
            return
        df = pd.DataFrame([m.model_dump() for m in models])
        df.to_csv(filepath, index=False)

    def _filter_by_timestamp(self, models: List[Any], group_col: str) -> List[Any]:
        """
        Return rows valid at or before self._as_of.
        For sales/manufacturing (event-based with timestamp), return latest row per group.
        """
        if not models:
            return []
            
        df = pd.DataFrame([m.model_dump() for m in models])
        df["timestamp"] = pd.to_datetime(df["timestamp"])
        
        if self._as_of is not None:
            df = df[df["timestamp"] <= self._as_of]

        if df.empty:
            return []

        # Sort and get latest
        idx = df.sort_values("timestamp").groupby(group_col).tail(1).index
        latest_df = df.loc[idx].copy()
        # Convert timestamp back to string for Pydantic
        latest_df["timestamp"] = latest_df["timestamp"].dt.strftime("%Y-%m-%d %H:%M:%S")
        
        # Need to determine the model class to reinstantiate
        model_class = type(models[0])
        return [model_class(**row) for row in latest_df.to_dict(orient="records")]

    def get_inventory_data(self) -> dict:
        """Get current inventory stock levels and bill of materials (BOM)."""
        inventory_models = self._read_csv_as_models("inventory.csv", InventoryItem)
        bom_models = self._read_csv_as_models("bom.csv", BOMItem)
        
        return {
            "inventory": [m.model_dump() for m in inventory_models],
            "bom": [m.model_dump() for m in bom_models],
        }

    def get_sales_data(self) -> list[dict]:
        """Get pending sales orders."""
        sales_models = self._read_csv_as_models("sales.csv", SalesOrder)
        filtered_models = self._filter_by_timestamp(sales_models, group_col="order_id")
        return [m.model_dump() for m in filtered_models]

    def get_manufacturing_data(self) -> list[dict]:
        """Get current manufacturing work orders and WIP."""
        mfg_models = self._read_csv_as_models("manufacturing.csv", ManufacturingOrder)
        filtered_models = self._filter_by_timestamp(mfg_models, group_col="work_order_id")
        return [m.model_dump() for m in filtered_models]

    def get_finance_data(self) -> list[dict]:
        """Get current financial cash balances and payables."""
        finance_models = self._read_csv_as_models("finance.csv", FinanceAccount)
        return [m.model_dump() for m in finance_models]

    def get_logistics_data(self) -> list[dict]:
        """Get logistics resource availability."""
        logistics_models = self._read_csv_as_models("logistics.csv", LogisticsResource)
        return [m.model_dump() for m in logistics_models]

    def get_unread_emails_scenario(self) -> list[dict]:
        """Get unread emails from the inbox."""
        # This was using "date" for filter.
        df = pd.read_csv(os.path.join(self._data_dir, "emails.csv"))
        df["date"] = pd.to_datetime(df["date"])
        if self._as_of is not None:
            df = df[df["date"] <= self._as_of]
        df["date"] = df["date"].dt.strftime("%Y-%m-%d %H:%M:%S")
        return df.to_dict(orient="records")

    def get_unread_emails(self) -> list[dict]:
        """Get unread emails and supply chain alerts from the live inbox."""
        from email_reader import get_all_alerts
        return get_all_alerts()

    # ---- NEW METHODS FOR WRITING / UPDATING DATA ----
    
    def update_inventory_item(self, item: InventoryItem):
        items = self._read_csv_as_models("inventory.csv", InventoryItem)
        found = False
        for i, existing in enumerate(items):
            if existing.item_id == item.item_id:
                items[i] = item
                found = True
                break
        if not found:
            items.append(item)
        self._write_models_to_csv("inventory.csv", items)

    def append_sales_order(self, order: SalesOrder):
        orders = self._read_csv_as_models("sales.csv", SalesOrder)
        orders.append(order)
        self._write_models_to_csv("sales.csv", orders)

    def append_manufacturing_order(self, order: ManufacturingOrder):
        orders = self._read_csv_as_models("manufacturing.csv", ManufacturingOrder)
        orders.append(order)
        self._write_models_to_csv("manufacturing.csv", orders)

    def update_finance_account(self, account: FinanceAccount):
        accounts = self._read_csv_as_models("finance.csv", FinanceAccount)
        found = False
        for i, existing in enumerate(accounts):
            if existing.account_name == account.account_name:
                accounts[i] = account
                found = True
                break
        if not found:
            accounts.append(account)
        self._write_models_to_csv("finance.csv", accounts)

    def update_logistics_resource(self, resource: LogisticsResource):
        resources = self._read_csv_as_models("logistics.csv", LogisticsResource)
        found = False
        for i, existing in enumerate(resources):
            if existing.resource == resource.resource:
                resources[i] = resource
                found = True
                break
        if not found:
            resources.append(resource)
        self._write_models_to_csv("logistics.csv", resources)
