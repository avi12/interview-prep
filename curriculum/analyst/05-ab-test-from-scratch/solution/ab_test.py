from math import ceil, sqrt
from statistics import NormalDist
from typing import NamedTuple

STANDARD_NORMAL = NormalDist()
TWO_SIDED_TAILS = 2


class AbTestResult(NamedTuple):
    z: float
    p_value: float
    ci_low: float
    ci_high: float


def critical_value(tail_probability):
    return STANDARD_NORMAL.inv_cdf(1 - tail_probability)


def ab_test(*, control_visitors, control_conversions, variant_visitors, variant_conversions, confidence=0.95):
    control_rate = control_conversions / control_visitors
    variant_rate = variant_conversions / variant_visitors
    lift = variant_rate - control_rate
    pooled_rate = (control_conversions + variant_conversions) / (control_visitors + variant_visitors)
    pooled_error = sqrt(pooled_rate * (1 - pooled_rate) * (1 / control_visitors + 1 / variant_visitors))
    z = lift / pooled_error
    p_value = TWO_SIDED_TAILS * STANDARD_NORMAL.cdf(-abs(z))
    separate_error = sqrt(
        control_rate * (1 - control_rate) / control_visitors
        + variant_rate * (1 - variant_rate) / variant_visitors
    )
    margin = critical_value((1 - confidence) / TWO_SIDED_TAILS) * separate_error
    return AbTestResult(z=z, p_value=p_value, ci_low=lift - margin, ci_high=lift + margin)


def sample_size_per_variant(*, baseline_rate, minimum_detectable_effect, alpha=0.05, power=0.8):
    variant_rate = baseline_rate + minimum_detectable_effect
    average_rate = (baseline_rate + variant_rate) / 2
    spread_if_no_effect = sqrt(TWO_SIDED_TAILS * average_rate * (1 - average_rate))
    spread_if_effect = sqrt(baseline_rate * (1 - baseline_rate) + variant_rate * (1 - variant_rate))
    needed = (
        critical_value(alpha / TWO_SIDED_TAILS) * spread_if_no_effect
        + critical_value(1 - power) * spread_if_effect
    ) / minimum_detectable_effect
    return ceil(needed**2)
