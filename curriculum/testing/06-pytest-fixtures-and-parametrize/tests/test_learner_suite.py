import ast
from pathlib import Path

import pytest
from impl import impl_path
from mutation import apply_mutant, describe_problems, run_all
from pricing_mutants import PRICING_MUTANTS

LESSON_DIR = Path(__file__).resolve().parents[1]
SUITE_FILE = "test_pricing.py"
SUBJECT_FILE = "pricing.py"
MIN_TESTS = 10
FIXTURE_NAMES = ("pytest.fixture", "fixture")

suite_path = impl_path(__file__, SUITE_FILE)
reference_source = (LESSON_DIR / "starter" / SUBJECT_FILE).read_text(encoding="utf-8").replace("\r\n", "\n")


@pytest.fixture(scope="module")
def outcomes():
    if not suite_path.exists():
        pytest.fail(f"Missing {SUITE_FILE}. Run: pnpm lesson open {LESSON_DIR.parent.name}/{LESSON_DIR.name}")
    sources = [reference_source, *(apply_mutant(reference_source, mutant) for mutant in PRICING_MUTANTS)]
    return run_all(suite_path.parent, SUITE_FILE, SUBJECT_FILE, sources)


def _functions():
    tree = ast.parse(suite_path.read_text(encoding="utf-8"))
    return [node for node in ast.walk(tree) if isinstance(node, ast.FunctionDef)]


def _decorator_name(decorator):
    target = decorator.func if isinstance(decorator, ast.Call) else decorator
    return ast.unparse(target)


def _argument_names(function):
    return {argument.arg for argument in function.args.args}


def _has_decorator(function, is_wanted):
    return any(is_wanted(_decorator_name(decorator)) for decorator in function.decorator_list)


def test_your_tests_pass_on_the_correct_code(outcomes):
    if not outcomes[0].is_pass:
        pytest.fail(f"your tests fail on the correct code:\n{describe_problems(outcomes[0]) or 'no passing test was found'}")


def test_your_file_has_enough_separate_tests(outcomes):
    assert len(outcomes[0].passed_titles) >= MIN_TESTS


def test_your_file_defines_a_fixture():
    assert any(_has_decorator(function, lambda name: name in FIXTURE_NAMES) for function in _functions())


def test_your_file_uses_parametrize():
    assert any(_has_decorator(function, lambda name: name.endswith("parametrize")) for function in _functions())


def test_your_file_uses_tmp_path():
    assert any("tmp_path" in _argument_names(function) for function in _functions())


def test_your_file_uses_monkeypatch():
    assert any("monkeypatch" in _argument_names(function) for function in _functions())


@pytest.mark.parametrize("number", range(1, len(PRICING_MUTANTS) + 1), ids=lambda number: f"seeded-bug-{number}-of-{len(PRICING_MUTANTS)}")
def test_your_tests_catch_the_seeded_bug(outcomes, number):
    if not outcomes[0].is_pass:
        pytest.fail("fix the tests that fail on the correct code first")
    if outcomes[number].is_pass:
        pytest.fail(f"your tests still pass when the code has this bug: {PRICING_MUTANTS[number - 1].name}")
