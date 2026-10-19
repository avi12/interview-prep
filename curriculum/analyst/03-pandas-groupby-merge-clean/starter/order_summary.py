import pandas as pd


def summarize_orders(orders, customers):
    return pd.DataFrame(columns=["segment", "order_count", "revenue", "average_order_value"])
