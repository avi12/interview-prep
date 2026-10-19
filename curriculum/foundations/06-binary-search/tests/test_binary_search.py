from collections.abc import Sequence

import pytest
from impl import load_impl

search = load_impl(__file__, "binary_search.py").search

BILLION = 1_000_000_000
READ_LIMIT = 100
MAX_SIZE_TO_CHECK_EVERY_TARGET = 40


class SortedEvens(Sequence):
    """A sorted array of the even numbers 0, 2, 4, ... that is never stored.

    It counts every read, so a linear scan runs out of reads long before it ends.
    """

    def __init__(self, size):
        self._size = size
        self.read_count = 0

    def __len__(self):
        return self._size

    def __getitem__(self, index):
        if isinstance(index, slice):
            raise AssertionError("Slicing copies the array and costs O(n). Move low and high instead.")
        if not -self._size <= index < self._size:
            raise IndexError(f"index {index} is outside 0..{self._size - 1}")
        if index < 0:
            index += self._size
        self.read_count += 1
        if self.read_count > READ_LIMIT:
            raise AssertionError(
                f"Read more than {READ_LIMIT} items of a {self._size:,} item array. "
                "Halve the range on every step instead of checking items one by one."
            )
        return index * 2


def test_finds_a_present_target():
    assert search([-1, 0, 3, 5, 9, 12], 9) == 4


def test_returns_minus_one_for_an_absent_target():
    assert search([-1, 0, 3, 5, 9, 12], 2) == -1


def test_empty_array():
    assert search([], 5) == -1


def test_single_item():
    assert search([5], 5) == 0
    assert search([5], 4) == -1
    assert search([5], 6) == -1


def test_first_and_last_items():
    nums = [1, 3, 5, 7, 9, 11, 13]
    assert search(nums, 1) == 0
    assert search(nums, 13) == len(nums) - 1


def test_target_smaller_than_everything_and_larger_than_everything():
    nums = [10, 20, 30, 40]
    assert search(nums, -100) == -1
    assert search(nums, 100) == -1


def test_negative_numbers():
    assert search([-50, -20, -10, -3], -10) == 2


@pytest.mark.parametrize("size", range(MAX_SIZE_TO_CHECK_EVERY_TARGET + 1))
def test_every_position_and_every_gap_for_every_size(size):
    nums = [number * 2 for number in range(size)]
    for target in range(-1, size * 2 + 2):
        expected = nums.index(target) if target in nums else -1
        assert search(nums, target) == expected, f"size {size}, target {target}"


@pytest.mark.parametrize("position", [0, 1, 123_456_789, BILLION // 2, BILLION - 2, BILLION - 1])
def test_finds_a_target_in_a_billion_items_with_few_reads(position):
    nums = SortedEvens(BILLION)
    assert search(nums, position * 2) == position
    assert nums.read_count <= READ_LIMIT


@pytest.mark.parametrize("target", [-1, 1, 123_456_789, BILLION * 2 - 1, BILLION * 2, BILLION * 3])
def test_rejects_an_absent_target_in_a_billion_items_with_few_reads(target):
    nums = SortedEvens(BILLION)
    assert search(nums, target) == -1
    assert nums.read_count <= READ_LIMIT
