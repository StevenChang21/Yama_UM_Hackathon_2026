import pandas as pd
import os

data_dir = r"c:\Users\USER\Documents\Monash\Y2S2\Hackthon\Yama_UM_Hackathon_2026\backend\data"

def migrate_state_csv(filename, group_col):
    filepath = os.path.join(data_dir, filename)
    df = pd.read_csv(filepath)
    if "valid_from" in df.columns:
        df["valid_from"] = pd.to_datetime(df["valid_from"])
        df = df.sort_values("valid_from").groupby(group_col).tail(1).reset_index(drop=True)
        df = df.drop(columns=["valid_from"])
        df.to_csv(filepath, index=False)
        print(f"Migrated {filename}")

def migrate_event_csv(filename):
    filepath = os.path.join(data_dir, filename)
    df = pd.read_csv(filepath)
    if "valid_from" in df.columns:
        df = df.rename(columns={"valid_from": "timestamp"})
        df.to_csv(filepath, index=False)
        print(f"Migrated {filename}")

migrate_state_csv("inventory.csv", "item_id")
migrate_state_csv("finance.csv", "account_name")
migrate_state_csv("logistics.csv", "resource")
migrate_event_csv("sales.csv")
migrate_event_csv("manufacturing.csv")
