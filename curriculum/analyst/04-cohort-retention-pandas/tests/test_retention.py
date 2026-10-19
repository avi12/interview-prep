import numpy as np
import pandas as pd
from impl import load_impl

retention_matrix = load_impl(__file__, "retention.py").retention_matrix
NAN = np.nan
SEED = 11


def make_events(rows):
    events = pd.DataFrame(rows, columns=["user_id", "event_date"])
    events["event_date"] = pd.to_datetime(events["event_date"])
    return events


def shuffled(events):
    return events.sample(frac=1, random_state=SEED).reset_index(drop=True)


SPRING = make_events(
    [
        (1, "2024-01-05"), (1, "2024-02-10"), (1, "2024-03-03"),
        (2, "2024-01-06"), (2, "2024-01-20"), (2, "2024-02-11"),
        (3, "2024-01-07"),
        (4, "2024-01-08"), (4, "2024-03-15"), (4, "2024-04-02"),
        (5, "2024-02-02"), (5, "2024-03-09"),
        (6, "2024-02-03"),
        (7, "2024-02-04"),
        (8, "2024-03-01"),
        (9, "2024-04-01"),
    ]
)

YEAR_END = make_events(
    [
        (1, "2023-11-03"), (1, "2023-12-04"), (1, "2024-01-09"),
        (2, "2023-11-20"), (2, "2024-01-15"),
        (3, "2023-12-01"), (3, "2024-01-02"),
        (4, "2023-12-08"),
        (5, "2023-12-09"),
        (6, "2023-12-30"),
        (7, "2024-01-03"),
    ]
)


def test_labels_are_cohort_months_and_month_numbers():
    matrix = retention_matrix(SPRING)
    assert list(matrix.index) == ["2024-01", "2024-02", "2024-03", "2024-04"]
    assert list(matrix.columns) == [0, 1, 2, 3]


def test_retention_is_distinct_users_over_cohort_size():
    matrix = retention_matrix(SPRING)
    expected = np.array(
        [
            [1.0, 0.5, 0.5, 0.25],
            [1.0, 1 / 3, 0.0, NAN],
            [1.0, 0.0, NAN, NAN],
            [1.0, NAN, NAN, NAN],
        ]
    )
    np.testing.assert_allclose(matrix.to_numpy(dtype=float), expected)


def test_months_that_have_not_happened_yet_are_nan_not_zero():
    matrix = retention_matrix(SPRING)
    assert np.isnan(matrix.loc["2024-04", 1])
    assert np.isnan(matrix.loc["2024-02", 3])
    assert matrix.loc["2024-02", 2] == 0


def test_a_user_who_comes_back_after_a_gap_counts_in_the_later_month_only():
    matrix = retention_matrix(SPRING)
    assert matrix.loc["2024-01", 2] == 0.5
    assert matrix.loc["2024-01", 3] == 0.25


def test_months_are_counted_across_a_year_boundary():
    matrix = retention_matrix(YEAR_END)
    expected = np.array(
        [
            [1.0, 0.5, 1.0],
            [1.0, 0.25, NAN],
            [1.0, NAN, NAN],
        ]
    )
    assert list(matrix.index) == ["2023-11", "2023-12", "2024-01"]
    np.testing.assert_allclose(matrix.to_numpy(dtype=float), expected)


def test_a_month_where_nobody_is_active_is_still_a_column_of_zeros():
    events = make_events([(1, "2024-01-05"), (1, "2024-03-09"), (2, "2024-01-06"), (3, "2024-03-02")])
    matrix = retention_matrix(events)
    assert list(matrix.index) == ["2024-01", "2024-03"]
    assert list(matrix.columns) == [0, 1, 2]
    np.testing.assert_allclose(matrix.to_numpy(dtype=float), np.array([[1.0, 0.0, 0.5], [1.0, NAN, NAN]]))


def test_row_order_of_the_events_does_not_matter():
    np.testing.assert_allclose(
        retention_matrix(shuffled(SPRING)).to_numpy(dtype=float),
        retention_matrix(SPRING).to_numpy(dtype=float),
    )


def test_the_given_frame_is_not_changed():
    before = SPRING.copy()
    retention_matrix(SPRING)
    pd.testing.assert_frame_equal(SPRING, before)
