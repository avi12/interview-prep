import pandas as pd
from impl import load_impl
from pandas.testing import assert_frame_equal

summarize_orders = load_impl(__file__, "order_summary.py").summarize_orders
COLUMNS = ["segment", "order_count", "revenue", "average_order_value"]


def make_frames(order_rows, customer_rows):
    orders = pd.DataFrame(order_rows, columns=["order_id", "customer_id", "amount"])
    customers = pd.DataFrame(customer_rows, columns=["customer_id", "segment"])
    return orders, customers


def make_expected(rows):
    return pd.DataFrame(rows, columns=COLUMNS)


def messy_shop():
    return make_frames(
        [
            (1, 1, "$10.00"),
            (2, 2, "20"),
            (2, 2, "20"),
            (3, 3, "1,000.50"),
            (4, 1, "n/a"),
            (5, 4, "5"),
            (6, 2, "30.00"),
            (7, 5, None),
            (8, 3, "$4.50"),
        ],
        [(1, " Retail "), (2, "retail"), (2, "RETAIL"), (3, "SMB"), (5, None)],
    )


def messy_startup():
    return make_frames(
        [
            (101, 10, "$99.99"),
            (102, 11, "250"),
            (103, 11, "bad"),
            (104, 12, "$1,250.00"),
            (104, 12, "$1,250.00"),
            (105, 13, "75.25"),
            (106, 10, "10.01"),
        ],
        [(10, "Enterprise"), (11, "  enterprise"), (12, "STARTUP"), (13, None), (12, "startup")],
    )


def test_cleans_and_aggregates_the_messy_shop():
    orders, customers = messy_shop()
    expected = make_expected(
        [("retail", 3, 60.0, 20.0), ("smb", 2, 1005.0, 502.5), ("unknown", 1, 5.0, 5.0)]
    )
    assert_frame_equal(summarize_orders(orders, customers), expected)


def test_works_on_different_data_too():
    orders, customers = messy_startup()
    expected = make_expected(
        [("enterprise", 3, 360.0, 120.0), ("startup", 1, 1250.0, 1250.0), ("unknown", 1, 75.25, 75.25)]
    )
    assert_frame_equal(summarize_orders(orders, customers), expected)


def test_a_customer_listed_twice_does_not_double_the_revenue():
    orders, customers = make_frames([(1, 7, "10"), (2, 7, "20")], [(7, "retail"), (7, "smb")])
    result = summarize_orders(orders, customers)
    assert result["revenue"].sum() == 30
    assert result["order_count"].sum() == 2


def test_text_that_is_not_a_number_is_dropped_not_counted_as_zero():
    orders, customers = make_frames([(1, 1, "10"), (2, 1, "oops"), (3, 1, None)], [(1, "retail")])
    row = summarize_orders(orders, customers).iloc[0]
    assert row["order_count"] == 1
    assert row["average_order_value"] == 10


def test_an_order_with_no_customer_row_is_kept_as_unknown():
    orders, customers = make_frames([(1, 99, "8")], [(1, "retail")])
    result = summarize_orders(orders, customers)
    assert result["segment"].tolist() == ["unknown"]
    assert result["revenue"].tolist() == [8]


def test_the_given_frames_are_not_changed():
    orders, customers = messy_shop()
    orders_before, customers_before = orders.copy(), customers.copy()
    summarize_orders(orders, customers)
    assert_frame_equal(orders, orders_before)
    assert_frame_equal(customers, customers_before)
