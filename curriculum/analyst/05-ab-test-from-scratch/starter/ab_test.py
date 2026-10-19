from typing import NamedTuple


class AbTestResult(NamedTuple):
    z: float
    p_value: float
    ci_low: float
    ci_high: float


def ab_test(*, control_visitors, control_conversions, variant_visitors, variant_conversions, confidence=0.95):
    return AbTestResult(z=0.0, p_value=1.0, ci_low=0.0, ci_high=0.0)


def sample_size_per_variant(*, baseline_rate, minimum_detectable_effect, alpha=0.05, power=0.8):
    return 0
