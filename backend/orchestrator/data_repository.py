"""
Data Repository Module (Single Responsibility Principle)

This class is responsible ONLY for reading data from CSV files.
Each method maps to one department's data source.
Supports optional as_of_date for time-travel filtering.
"""

import os
import pandas as pd
from typing import Optional


class DataRepository:
    """Responsible solely for reading department data from CSV files."""

    def __init__(self, data_dir: str, as_of_date: Optional[str] = None):
        self._data_dir = data_dir
        # Parse once as Timestamp for fast pandas comparisons; None = no filter
        self._as_of = pd.Timestamp(as_of_date) if as_of_date else None

    def read_csv(self, filename: str) -> list[dict] | dict:
        try:
            df = pd.read_csv(os.path.join(self._data_dir, filename))
            return df.to_dict(orient="records")
        except Exception as e:
            return {"error": str(e)}

    def _filter_by_date(
        self,
        df: pd.DataFrame,
        date_col: str,
        group_col: Optional[str] = None,
        revision_col: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Return rows valid at or before self._as_of.

        - No group_col: return all matching rows (emails — append-only).
        - group_col only: return latest row per group by date (inventory, manufacturing, logistics, finance).
        - group_col + revision_col: return row with max revision per group (sales).
        - as_of is None: skip date filter, still deduplicate to latest state.
        """
        df = df.copy()
        df[date_col] = pd.to_datetime(df[date_col])

        if self._as_of is not None:
            df = df[df[date_col] <= self._as_of]

        if df.empty:
            return df

        if group_col and revision_col:
            idx = df.groupby(group_col)[revision_col].idxmax()
            return df.loc[idx].reset_index(drop=True)

        if group_col:
            return df.sort_values(date_col).groupby(group_col).tail(1).reset_index(drop=True)

        return df

    def _drop_meta(self, df: pd.DataFrame, cols: list[str]) -> pd.DataFrame:
        """Strip internal versioning columns before returning data to the AI."""
        return df.drop(columns=[c for c in cols if c in df.columns])

    def get_inventory_data(self) -> dict:
        """Get current inventory stock levels and bill of materials (BOM)."""
        df = pd.read_csv(os.path.join(self._data_dir, "inventory.csv"))
        filtered = self._filter_by_date(df, "valid_from", group_col="item_id")
        return {
            "inventory": self._drop_meta(filtered, ["valid_from"]).to_dict(orient="records"),
            "bom": self.read_csv("bom.csv"),
        }

    def get_sales_data(self) -> list[dict]:
        """Get pending sales orders."""
        df = pd.read_csv(os.path.join(self._data_dir, "sales.csv"))
        filtered = self._filter_by_date(
            df, "valid_from", group_col="order_id", revision_col="revision"
        )
        return self._drop_meta(filtered, ["valid_from", "revision"]).to_dict(orient="records")

    def get_manufacturing_data(self) -> list[dict]:
        """Get current manufacturing work orders and WIP."""
        df = pd.read_csv(os.path.join(self._data_dir, "manufacturing.csv"))
        filtered = self._filter_by_date(df, "valid_from", group_col="work_order_id")
        return self._drop_meta(filtered, ["valid_from"]).to_dict(orient="records")

    def get_finance_data(self) -> list[dict]:
        """Get current financial cash balances and payables."""
        df = pd.read_csv(os.path.join(self._data_dir, "finance.csv"))
        filtered = self._filter_by_date(df, "valid_from", group_col="account_name")
        return self._drop_meta(filtered, ["valid_from"]).to_dict(orient="records")

    def get_logistics_data(self) -> list[dict]:
        """Get logistics resource availability."""
        df = pd.read_csv(os.path.join(self._data_dir, "logistics.csv"))
        filtered = self._filter_by_date(df, "valid_from", group_col="resource")
        return self._drop_meta(filtered, ["valid_from"]).to_dict(orient="records")

    def get_unread_emails(self) -> list[dict]:
        """Get unread emails from the inbox."""
        df = pd.read_csv(os.path.join(self._data_dir, "emails.csv"))
        # emails are append-only — filter by date, no group deduplication
        filtered = self._filter_by_date(df, "date")
        return filtered.to_dict(orient="records")
