import random
import string
from collections import Counter

from impl import load_impl
from limits import run_within

group_anagrams = load_impl(__file__, "group_anagrams.py").group_anagrams

BASE_COUNT = 15_000
WORD_LENGTH = 10
SEED = 49
TIME_LIMIT_SECONDS = 2


def as_comparable(groups):
    return sorted(sorted(group) for group in groups)


def build_large_input():
    rng = random.Random(SEED)
    words = []
    for _ in range(BASE_COUNT):
        letters = rng.choices(string.ascii_lowercase, k=WORD_LENGTH)
        words.append("".join(letters))
        rng.shuffle(letters)
        words.append("".join(letters))
    return words


def test_groups_the_classic_example():
    groups = group_anagrams(["eat", "tea", "tan", "ate", "nat", "bat"])
    assert as_comparable(groups) == [["ate", "eat", "tea"], ["bat"], ["nat", "tan"]]


def test_empty_list_gives_no_groups():
    assert group_anagrams([]) == []


def test_empty_string_is_its_own_group():
    assert group_anagrams([""]) == [[""]]


def test_single_word_is_one_group():
    assert group_anagrams(["a"]) == [["a"]]


def test_duplicate_words_stay_together():
    assert as_comparable(group_anagrams(["a", "b", "a"])) == [["a", "a"], ["b"]]


def test_words_of_different_length_never_group():
    assert as_comparable(group_anagrams(["ab", "abc"])) == [["ab"], ["abc"]]


def test_same_letters_with_different_counts_are_separate():
    assert as_comparable(group_anagrams(["aab", "abb"])) == [["aab"], ["abb"]]


def test_equal_letter_sums_are_not_anagrams():
    assert as_comparable(group_anagrams(["ad", "bc"])) == [["ad"], ["bc"]]


def test_does_not_change_the_list_it_was_given():
    words = ["eat", "tea", "tan", "ate", "nat", "bat"]
    group_anagrams(words)
    assert words == ["eat", "tea", "tan", "ate", "nat", "bat"]


def test_stays_fast_on_30000_words():
    words = build_large_input()
    groups = run_within(TIME_LIMIT_SECONDS, group_anagrams, words, too_slow_for="this many words")
    returned_words = [word for group in groups for word in group]
    assert Counter(returned_words) == Counter(words)
    assert all(len({tuple(sorted(word)) for word in group}) == 1 for group in groups)
    assert len(groups) == len({tuple(sorted(word)) for word in words})
