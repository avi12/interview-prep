import pytest
from impl import load_impl

is_valid = load_impl(__file__, "valid_parentheses.py").is_valid


@pytest.mark.parametrize("text", ["", "()", "()[]{}", "([]){}", "{[()]}", "((()))"])
def test_valid(text):
    assert is_valid(text) is True


@pytest.mark.parametrize("text", ["(]", "([)]", "((", "(()", ")(", "}", "{[}]"])
def test_invalid(text):
    assert is_valid(text) is False


def test_closer_first_does_not_crash():
    assert is_valid(")") is False


def test_long_input_is_linear():
    assert is_valid("(" * 100_000 + ")" * 100_000) is True
