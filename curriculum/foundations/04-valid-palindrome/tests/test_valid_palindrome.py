import random
import tracemalloc

import pytest
from impl import load_impl

is_palindrome = load_impl(__file__, "valid_palindrome.py").is_palindrome

REPEAT_COUNT = 100_000
NOISE = " !"
EXTRA_MEMORY_LIMIT_BYTES = 50_000
RANDOM_SEED = 2024
RANDOM_CASE_COUNT = 400
MAX_HALF_LENGTH = 6
ALPHABET = "aAbB01 ,_"
COUNTED_ALPHABET = "aAbB01"


def reference_is_palindrome(text):
    cleaned = [char.lower() for char in text if char.isalnum()]
    return cleaned == cleaned[::-1]


def random_text(random_source, alphabet):
    return "".join(random_source.choice(alphabet) for _ in range(random_source.randint(0, MAX_HALF_LENGTH * 2)))


def noisy_palindrome(random_source):
    half = random_text(random_source, COUNTED_ALPHABET)
    middle = random_source.choice(["", "a", "0"])
    mirrored = half + middle + half[::-1].swapcase()
    return "".join(random_source.choice(["", "", ",", " ", "_"]) + char for char in mirrored)


def with_one_character_changed(text, random_source):
    if not text:
        return text
    position = random_source.randrange(len(text))
    return text[:position] + random_source.choice(ALPHABET) + text[position + 1 :]


@pytest.mark.parametrize(
    "text",
    [
        "A man, a plan, a canal: Panama",
        "racecar",
        "No 'x' in Nixon",
        "Was it a car or a cat I saw?",
        "a",
        "aa",
        "ab_a",
        "12321",
        "0P0",
    ],
)
def test_palindromes(text):
    assert is_palindrome(text) is True


@pytest.mark.parametrize(
    "text",
    ["race a car", "ab", "0P", "abca", "hello, world", "A man, a plan, a canal: Panamaa", "1b1a"],
)
def test_not_palindromes(text):
    assert is_palindrome(text) is False


@pytest.mark.parametrize("text", ["", " ", " .,;!? ", "-_-"])
def test_text_without_letters_or_digits_is_a_palindrome(text):
    assert is_palindrome(text) is True


def test_ignores_case():
    assert is_palindrome("AbBa") is True
    assert is_palindrome("Ab") is False


def test_skips_punctuation_in_the_middle_of_both_ends():
    assert is_palindrome(",,a,,b,,,b,,a,,") is True
    assert is_palindrome(",,a,,b,,,c,,a,,") is False


def test_agrees_with_a_simple_reference_on_random_and_nearly_palindromic_texts():
    random_source = random.Random(RANDOM_SEED)
    for _ in range(RANDOM_CASE_COUNT):
        palindrome = noisy_palindrome(random_source)
        for text in (random_text(random_source, ALPHABET), palindrome, with_one_character_changed(palindrome, random_source)):
            assert is_palindrome(text) is reference_is_palindrome(text), f"wrong answer for {text!r}"


def test_uses_constant_extra_memory_on_a_long_text():
    letters = "Ab1" * REPEAT_COUNT
    long_text = NOISE.join(letters + letters[::-1])
    tracemalloc.start()
    try:
        result = is_palindrome(long_text)
        _, peak_bytes = tracemalloc.get_traced_memory()
    finally:
        tracemalloc.stop()
    assert result is True
    assert peak_bytes < EXTRA_MEMORY_LIMIT_BYTES, (
        f"Used {peak_bytes:,} bytes extra for a {len(long_text):,} character text. "
        "Do not build a cleaned or reversed copy: compare in place with two pointers."
    )
