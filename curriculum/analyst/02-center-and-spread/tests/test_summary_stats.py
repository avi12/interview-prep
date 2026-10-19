import re

import numpy as np
import pytest
from impl import impl_path, load_impl

stats = load_impl(__file__, "summary_stats.py")
SALARIES = [40, 42, 45, 48, 400]
DELIVERY_DAYS = [2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 18]
SEED = 7
RANDOM_CASE_COUNT = 25
FORBIDDEN_IMPORT = re.compile(r"^\s*(import|from)\s+(numpy|pandas|statistics)\b", re.MULTILINE)


def test_the_mean_is_pulled_by_the_outlier_but_the_median_is_not():
    assert stats.mean(SALARIES) == pytest.approx(115)
    assert stats.median(SALARIES) == pytest.approx(45)


@pytest.mark.parametrize(
    "values, expected",
    [([3, 1, 2], 2), ([4, 1, 3, 2], 2.5), ([7], 7), ([1, 1, 1, 9], 1)],
)
def test_median_handles_odd_even_and_unsorted_input(values, expected):
    assert stats.median(values) == pytest.approx(expected)


@pytest.mark.parametrize(
    "values, expected",
    [([1, 2, 2, 3], [2]), ([4, 4, 1, 1, 9], [1, 4]), ([3, 1, 2], [1, 2, 3]), (["b", "a", "b"], ["b"])],
)
def test_modes_returns_every_tied_value_sorted(values, expected):
    assert stats.modes(values) == expected


@pytest.mark.parametrize("percent, expected", [(0, 1), (25, 1.75), (50, 2.5), (75, 3.25), (100, 4)])
def test_percentile_interpolates_between_neighbours(percent, expected):
    assert stats.percentile([4, 1, 3, 2], percent) == pytest.approx(expected)


def test_percentile_of_a_single_value_is_that_value():
    assert stats.percentile([7], 90) == 7


def test_percentile_matches_numpy_on_seeded_random_data():
    rng = np.random.default_rng(SEED)
    for _ in range(RANDOM_CASE_COUNT):
        values = rng.integers(0, 1000, size=int(rng.integers(2, 60))).tolist()
        percent = float(rng.uniform(0, 100))
        assert stats.percentile(values, percent) == pytest.approx(np.percentile(values, percent))


def test_sample_std_divides_by_n_minus_one():
    values = [2, 4, 4, 4, 5, 5, 7, 9]
    assert stats.sample_std(values) == pytest.approx(2.138089935299395)
    assert stats.sample_std(values) == pytest.approx(np.std(values, ddof=1))


def test_sample_std_of_identical_values_is_zero():
    assert stats.sample_std([5, 5, 5]) == 0


@pytest.mark.parametrize("function", ["mean", "median", "modes", "iqr_outliers"])
def test_empty_input_raises(function):
    with pytest.raises(ValueError):
        getattr(stats, function)([])


def test_sample_std_needs_two_values():
    with pytest.raises(ValueError):
        stats.sample_std([1])


@pytest.mark.parametrize("percent", [-1, 100.5])
def test_percent_outside_range_raises(percent):
    with pytest.raises(ValueError):
        stats.percentile([1, 2, 3], percent)


def test_iqr_flags_the_long_delivery_the_three_sigma_rule_misses():
    assert stats.iqr_outliers(DELIVERY_DAYS) == [18]
    assert abs(18 - stats.mean(DELIVERY_DAYS)) < 3 * stats.sample_std(DELIVERY_DAYS)


def test_iqr_flags_the_salary_outlier():
    assert stats.iqr_outliers(SALARIES) == [400]


def test_iqr_flags_both_tails_in_original_order_and_keeps_duplicates():
    values = [500, 20, 30, 40, 50, 60, -400, 500, 25, 35]
    assert stats.iqr_outliers(values) == [500, -400, 500]


def test_a_value_exactly_on_a_fence_is_not_flagged():
    assert stats.iqr_outliers([-10, 20, 30, 40, 70]) == []


def test_the_fence_is_one_and_a_half_iqr_wide_not_wider_or_narrower():
    assert stats.iqr_outliers([10, 20, 30, 40, 85]) == [85]
    assert stats.iqr_outliers([10, 20, 30, 40, 69]) == []


def test_no_outliers_gives_an_empty_list():
    assert stats.iqr_outliers([10, 11, 12, 13, 14]) == []


def test_inputs_are_not_modified():
    values = [9, 1, 5, 3, 7]
    stats.percentile(values, 40)
    stats.iqr_outliers(values)
    assert values == [9, 1, 5, 3, 7]


def test_implementation_does_not_lean_on_numpy_pandas_or_statistics():
    source = impl_path(__file__, "summary_stats.py").read_text(encoding="utf8")
    assert FORBIDDEN_IMPORT.search(source) is None
