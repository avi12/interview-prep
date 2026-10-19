PERCENT_SCALE = 100
MEDIAN_PERCENT = 50
FIRST_QUARTILE_PERCENT = 25
THIRD_QUARTILE_PERCENT = 75
FENCE_MULTIPLIER = 1.5
MIN_SAMPLE_SIZE = 2


def require_at_least(values, count):
    if len(values) < count:
        raise ValueError(f"need at least {count} values")


def mean(values):
    require_at_least(values, 1)
    return sum(values) / len(values)


def median(values):
    return percentile(values, MEDIAN_PERCENT)


def modes(values):
    require_at_least(values, 1)
    counts = {}
    for value in values:
        counts[value] = counts.get(value, 0) + 1
    highest_count = max(counts.values())
    return sorted(value for value, count in counts.items() if count == highest_count)


def percentile(values, percent):
    require_at_least(values, 1)
    if not 0 <= percent <= PERCENT_SCALE:
        raise ValueError("percent must be between 0 and 100")
    ordered = sorted(values)
    position = percent / PERCENT_SCALE * (len(ordered) - 1)
    lower_index = int(position)
    upper_index = min(lower_index + 1, len(ordered) - 1)
    fraction = position - lower_index
    return ordered[lower_index] + fraction * (ordered[upper_index] - ordered[lower_index])


def sample_std(values):
    require_at_least(values, MIN_SAMPLE_SIZE)
    center = mean(values)
    squared_distances = sum((value - center) ** 2 for value in values)
    return (squared_distances / (len(values) - 1)) ** 0.5


def iqr_outliers(values):
    first_quartile = percentile(values, FIRST_QUARTILE_PERCENT)
    third_quartile = percentile(values, THIRD_QUARTILE_PERCENT)
    margin = FENCE_MULTIPLIER * (third_quartile - first_quartile)
    lower_fence = first_quartile - margin
    upper_fence = third_quartile + margin
    return [value for value in values if value < lower_fence or value > upper_fence]
