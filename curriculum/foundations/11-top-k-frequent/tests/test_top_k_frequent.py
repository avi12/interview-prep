import random
import threading

from impl import load_impl

top_k_frequent = load_impl(__file__, "top_k_frequent.py").top_k_frequent

SINGLE_COUNT = 60_000
HEAVY_BASE = 1_000_000_000
HEAVY_COUNTS = {HEAVY_BASE + 1: 3000, HEAVY_BASE + 2: 2000, HEAVY_BASE + 3: 1000}
SEED = 347
TIME_LIMIT_SECONDS = 2


def run_within(seconds, function, *args):
    outcome = {}

    def target():
        try:
            outcome["result"] = function(*args)
        except Exception as error:
            outcome["error"] = error

    worker = threading.Thread(target=target, daemon=True)
    worker.start()
    worker.join(seconds)
    assert not worker.is_alive(), f"still running after {seconds} seconds: too slow for this many numbers"
    if "error" in outcome:
        raise outcome["error"]
    return outcome["result"]


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


def test_does_not_change_the_input():
    nums = [5, 5, 6, 6, 6, 7]
    top_k_frequent(nums, 2)
    assert nums == [5, 5, 6, 6, 6, 7]


def test_stays_fast_on_66000_numbers():
    nums = build_large_input()
    result = run_within(TIME_LIMIT_SECONDS, top_k_frequent, nums, len(HEAVY_COUNTS))
    assert sorted(result) == sorted(HEAVY_COUNTS)
