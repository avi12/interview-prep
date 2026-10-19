import random

from impl import load_impl
from limits import run_within

top_k_frequent = load_impl(__file__, "top_k_frequent.py").top_k_frequent

SINGLE_COUNT = 60_000
HEAVY_BASE = 1_000_000_000
HEAVY_COUNTS = {HEAVY_BASE + 1: 3000, HEAVY_BASE + 2: 2000, HEAVY_BASE + 3: 1000}
SEED = 347
TIME_LIMIT_SECONDS = 4
RANDOM_ROUNDS = 200


def build_large_input():
    nums = list(range(SINGLE_COUNT))
    for value, count in HEAVY_COUNTS.items():
        nums.extend([value] * count)
    random.Random(SEED).shuffle(nums)
    return nums


def test_returns_the_two_most_frequent():
    assert sorted(top_k_frequent([1, 1, 1, 2, 2, 3], 2)) == [1, 2]


def test_single_element():
    assert top_k_frequent([7], 1) == [7]


def test_k_of_one_returns_only_the_winner():
    assert top_k_frequent([4, 4, 4, 5, 5, 6], 1) == [4]


def test_negative_numbers_and_zero_count_like_any_other():
    assert sorted(top_k_frequent([4, 4, 4, -1, -1, 0], 2)) == [-1, 4]


def test_k_equal_to_distinct_count_returns_everything():
    assert sorted(top_k_frequent([3, 1, 2, 2, 3, 3], 3)) == [1, 2, 3]


def test_returns_exactly_k_values():
    assert len(top_k_frequent([1, 2, 3, 1, 2, 1, 4, 5], 3)) == 3


def test_frequent_values_that_appear_late_still_win():
    assert sorted(top_k_frequent([1, 2, 2, 3, 3, 3], 2)) == [2, 3]
    assert top_k_frequent([9, 8, 8, 7, 7, 7, 6], 1) == [7]


def test_picks_by_count_not_by_value_or_first_appearance():
    nums = [8, 3, 3, 9, 9, 9, 1, 1, 1, 1, 5]
    assert sorted(top_k_frequent(nums, 3)) == [1, 3, 9]


def test_matches_a_plain_sort_on_shuffled_inputs():
    generator = random.Random(SEED)
    for _ in range(RANDOM_ROUNDS):
        distinct = generator.sample(range(-50, 50), generator.randint(1, 12))
        nums = [value for count, value in enumerate(distinct, start=1) for _ in range(count)]
        generator.shuffle(nums)
        k = generator.randint(1, len(distinct))
        expected = sorted(distinct, key=lambda value: nums.count(value), reverse=True)[:k]
        assert sorted(top_k_frequent(nums, k)) == sorted(expected)


def test_does_not_change_the_input():
    nums = [6, 5, 7, 6, 5, 6]
    top_k_frequent(nums, 2)
    assert nums == [6, 5, 7, 6, 5, 6]


def test_stays_fast_on_66000_numbers():
    nums = build_large_input()
    result = run_within(TIME_LIMIT_SECONDS, top_k_frequent, nums, len(HEAVY_COUNTS), too_slow_for="this many numbers")
    assert sorted(result) == sorted(HEAVY_COUNTS)
