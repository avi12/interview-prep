import random

import pytest
from impl import load_impl
from limits import measure_seconds

is_valid = load_impl(__file__, "valid_parentheses.py").is_valid

RANDOM_SEED = 2024
RANDOM_CASE_COUNT = 400
MAX_LENGTH = 14
MAX_PAIR_COUNT = 7
BRACKETS = "()[]{}"
PAIR_TEXTS = ["()", "[]", "{}"]
LONG_NEST_DEPTH = 50_000
TIME_LIMIT_SECONDS = 1.0


def reference_is_valid(text):
    for _ in range(len(text) // 2 + 1):
        for pair in PAIR_TEXTS:
            text = text.replace(pair, "")
    return text == ""


def balanced_text(random_source):
    text = ""
    for _ in range(random_source.randint(0, MAX_PAIR_COUNT)):
        position = random_source.randint(0, len(text))
        text = text[:position] + random_source.choice(PAIR_TEXTS) + text[position:]
    return text


def with_one_bracket_changed(text, random_source):
    if not text:
        return text
    position = random_source.randrange(len(text))
    return text[:position] + random_source.choice(BRACKETS) + text[position + 1 :]


@pytest.mark.parametrize("text", ["", "()", "()[]{}", "([]){}", "{[()]}", "((()))"])
def test_valid(text):
    assert is_valid(text) is True


@pytest.mark.parametrize("text", ["(]", "([)]", "((", "(()", ")(", "}", "{[}]"])
def test_invalid(text):
    assert is_valid(text) is False


def test_closer_first_does_not_crash():
    assert is_valid(")") is False


def test_agrees_with_a_simple_reference_on_random_and_nearly_valid_texts():
    random_source = random.Random(RANDOM_SEED)
    for _ in range(RANDOM_CASE_COUNT):
        random_text = "".join(random_source.choice(BRACKETS) for _ in range(random_source.randint(0, MAX_LENGTH)))
        balanced = balanced_text(random_source)
        for text in (random_text, balanced, with_one_bracket_changed(balanced, random_source)):
            assert is_valid(text) is reference_is_valid(text), f"wrong answer for {text!r}"


def test_long_input_is_linear():
    text = "([" * LONG_NEST_DEPTH + "])" * LONG_NEST_DEPTH
    result, elapsed_seconds = measure_seconds(is_valid, text)
    assert result is True
    assert elapsed_seconds < TIME_LIMIT_SECONDS, f"took {elapsed_seconds:.2f}s for {len(text):,} characters, so the work grows faster than the input"
