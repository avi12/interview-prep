import pandas as pd

UNKNOWN_SEGMENT = "unknown"
CURRENCY_CHARACTERS = r"[$,]"


def clean_orders(orders):
    amounts = pd.to_numeric(
        orders["amount"].astype(str).str.replace(CURRENCY_CHARACTERS, "", regex=True),
        errors="coerce",
    )
    return (
        orders.assign(amount=amounts)
        .drop_duplicates(subset="order_id", keep="first")
        .dropna(subset=["amount"])
    )


def clean_customers(customers):
    segments = customers["segment"].str.strip().str.lower()
    return (
        customers.assign(segment=segments)
        .drop_duplicates(subset="customer_id", keep="first")
        [["customer_id", "segment"]]
    )


def summarize_orders(orders, customers):
    merged = clean_orders(orders).merge(
        clean_customers(customers),
        on="customer_id",
        how="left",
        validate="many_to_one",
    )
    merged["segment"] = merged["segment"].fillna(UNKNOWN_SEGMENT)
    return merged.groupby("segment", as_index=False).agg(
        order_count=("order_id", "count"),
        revenue=("amount", "sum"),
        average_order_value=("amount", "mean"),
    )
