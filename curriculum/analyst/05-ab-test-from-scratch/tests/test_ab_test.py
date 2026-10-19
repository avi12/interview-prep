from math import sqrt

import numpy as np
import pytest
from impl import load_impl
from scipy.stats import chi2_contingency, norm

ab = load_impl(__file__, "ab_test.py")
SEED = 2026
RANDOM_CASE_COUNT = 30
SHOP = dict(control_visitors=2000, control_conversions=200, variant_visitors=2000, variant_conversions=250)


def scipy_chi_square(*, control_visitors, control_conversions, variant_visitors, variant_conversions):
    table = [
        [control_conversions, control_visitors - control_conversions],
        [variant_conversions, variant_visitors - variant_conversions],
    ]
    statistic, p_value, _, _ = chi2_contingency(table, correction=False)
    return statistic, p_value


def scipy_interval(*, control_visitors, control_conversions, variant_visitors, variant_conversions, confidence=0.95):
    control_rate = control_conversions / control_visitors
    variant_rate = variant_conversions / variant_visitors
    error = sqrt(
        control_rate * (1 - control_rate) / control_visitors
        + variant_rate * (1 - variant_rate) / variant_visitors
    )
    margin = norm.ppf(1 - (1 - confidence) / 2) * error
    lift = variant_rate - control_rate
    return lift - margin, lift + margin


def scipy_power(*, n, baseline_rate, variant_rate, alpha=0.05):
    average = (baseline_rate + variant_rate) / 2
    noise_if_no_effect = sqrt(2 * average * (1 - average) / n)
    noise_if_effect = sqrt((baseline_rate * (1 - baseline_rate) + variant_rate * (1 - variant_rate)) / n)
    return norm.cdf((abs(variant_rate - baseline_rate) - norm.ppf(1 - alpha / 2) * noise_if_no_effect) / noise_if_effect)


def random_cases():
    rng = np.random.default_rng(SEED)
    for _ in range(RANDOM_CASE_COUNT):
        control_visitors, variant_visitors = (int(n) for n in rng.integers(200, 20000, size=2))
        control_rate, variant_rate = rng.uniform(0.02, 0.4, size=2)
        yield dict(
            control_visitors=control_visitors,
            control_conversions=int(control_visitors * control_rate),
            variant_visitors=variant_visitors,
            variant_conversions=int(variant_visitors * variant_rate),
        )


def test_the_shop_example_gives_z_2_5_and_p_0_012():
    result = ab.ab_test(**SHOP)
    assert result.z == pytest.approx(2.50196, abs=1e-4)
    assert result.p_value == pytest.approx(0.01235, abs=1e-5)


def test_z_and_p_match_scipy_chi_square_on_many_seeded_cases():
    for case in random_cases():
        result = ab.ab_test(**case)
        statistic, p_value = scipy_chi_square(**case)
        assert result.z**2 == pytest.approx(statistic, rel=1e-9), case
        assert result.p_value == pytest.approx(p_value, rel=1e-6), case


def test_interval_matches_the_unpooled_formula_on_many_seeded_cases():
    for case in random_cases():
        result = ab.ab_test(**case)
        low, high = scipy_interval(**case)
        assert result.ci_low == pytest.approx(low, abs=1e-9), case
        assert result.ci_high == pytest.approx(high, abs=1e-9), case


def test_the_shop_interval_is_half_a_point_to_four_and_a_half():
    result = ab.ab_test(**SHOP)
    assert result.ci_low == pytest.approx(0.005431, abs=1e-5)
    assert result.ci_high == pytest.approx(0.044569, abs=1e-5)


def test_interval_is_not_the_pooled_one_on_small_unbalanced_groups():
    case = dict(control_visitors=50, control_conversions=5, variant_visitors=50, variant_conversions=20)
    result = ab.ab_test(**case)
    assert result.ci_low == pytest.approx(0.14077, abs=1e-4)
    assert result.ci_high == pytest.approx(0.45923, abs=1e-4)


def test_swapping_the_groups_flips_the_sign_but_not_the_p_value():
    swapped = dict(
        control_visitors=SHOP["variant_visitors"],
        control_conversions=SHOP["variant_conversions"],
        variant_visitors=SHOP["control_visitors"],
        variant_conversions=SHOP["control_conversions"],
    )
    result, mirrored = ab.ab_test(**SHOP), ab.ab_test(**swapped)
    assert mirrored.z == pytest.approx(-result.z)
    assert mirrored.p_value == pytest.approx(result.p_value)


def test_identical_groups_give_zero_z_and_p_of_one():
    result = ab.ab_test(control_visitors=1000, control_conversions=100, variant_visitors=1000, variant_conversions=100)
    assert result.z == pytest.approx(0)
    assert result.p_value == pytest.approx(1)
    assert result.ci_low == pytest.approx(-result.ci_high)


def test_a_small_lift_on_small_groups_is_not_significant_and_the_interval_covers_zero():
    result = ab.ab_test(control_visitors=100, control_conversions=10, variant_visitors=100, variant_conversions=12)
    assert result.p_value > 0.05
    assert result.ci_low < 0 < result.ci_high


@pytest.mark.parametrize("confidence", [0.80, 0.90, 0.99])
def test_interval_uses_the_critical_value_of_the_requested_confidence(confidence):
    result = ab.ab_test(**SHOP, confidence=confidence)
    low, high = scipy_interval(**SHOP, confidence=confidence)
    assert result.ci_low == pytest.approx(low, abs=1e-9)
    assert result.ci_high == pytest.approx(high, abs=1e-9)


def test_a_higher_confidence_level_gives_a_wider_interval():
    narrow = ab.ab_test(**SHOP, confidence=0.90)
    wide = ab.ab_test(**SHOP, confidence=0.99)
    assert wide.ci_high - wide.ci_low > narrow.ci_high - narrow.ci_low


def test_sample_size_matches_the_r_documentation_example():
    needed = ab.sample_size_per_variant(baseline_rate=0.5, minimum_detectable_effect=0.25, power=0.9)
    assert needed == 77


def test_sample_size_matches_the_r_documentation_tiny_effect_example():
    needed = ab.sample_size_per_variant(baseline_rate=0.5, minimum_detectable_effect=0.001, alpha=0.001, power=0.9)
    assert needed == 10451937


def test_sample_size_defaults_are_5_percent_significance_and_80_percent_power():
    default = ab.sample_size_per_variant(baseline_rate=0.10, minimum_detectable_effect=0.01)
    explicit = ab.sample_size_per_variant(baseline_rate=0.10, minimum_detectable_effect=0.01, alpha=0.05, power=0.8)
    assert default == explicit == 14751


def test_sample_size_is_the_smallest_whole_number_that_reaches_the_power():
    for baseline, effect in [(0.10, 0.01), (0.25, 0.03), (0.05, 0.005), (0.40, 0.10)]:
        needed = ab.sample_size_per_variant(baseline_rate=baseline, minimum_detectable_effect=effect)
        assert isinstance(needed, int)
        assert scipy_power(n=needed, baseline_rate=baseline, variant_rate=baseline + effect) >= 0.8
        assert scipy_power(n=needed - 1, baseline_rate=baseline, variant_rate=baseline + effect) < 0.8


def test_halving_the_effect_needs_about_four_times_the_people():
    full = ab.sample_size_per_variant(baseline_rate=0.10, minimum_detectable_effect=0.01)
    half = ab.sample_size_per_variant(baseline_rate=0.10, minimum_detectable_effect=0.005)
    assert 3.8 < half / full < 4.2
