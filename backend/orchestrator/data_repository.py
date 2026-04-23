"""
Data Repository Module (Single Responsibility Principle)

This class is responsible ONLY for reading data from CSV files.
Each method maps to one department's data source.
"""

import os
import pandas as pd


class DataRepository:
    """Responsible solely for reading department data from CSV files."""

    def __init__(self, data_dir: str):
        self._data_dir = data_dir

    def read_csv(self, filename: str) -> list[dict] | dict:
        try:
            df = pd.read_csv(os.path.join(self._data_dir, filename))
            return df.to_dict(orient="records")
        except Exception as e:
            return {"error": str(e)}

    def get_inventory_data(self) -> dict:
        """Get current inventory stock levels and bill of materials (BOM)."""
        return {
            "inventory": self.read_csv("inventory.csv"),
            "bom": self.read_csv("bom.csv")
        }

    def get_sales_data(self) -> list[dict]:
        """Get pending sales orders."""
        return self.read_csv("sales.csv")

    def get_manufacturing_data(self) -> list[dict]:
        """Get current manufacturing work orders and WIP."""
        return self.read_csv("manufacturing.csv")

    def get_finance_data(self) -> list[dict]:
        """Get current financial cash balances and payables."""
        return self.read_csv("finance.csv")

    def get_logistics_data(self) -> list[dict]:
        """Get logistics resource availability."""
        return self.read_csv("logistics.csv")

    def get_unread_emails(self) -> list[dict]:
        """Get unread emails from the inbox."""
        return self.read_csv("emails.csv")
