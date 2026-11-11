import json
import os

import pytest
from calls import clear_last_call, format_value, read_last_call

TEST_CASES_ENV = "TEST_CASES_FILE"
TEST_NAME_PREFIX = "test_"
EQUALITY = "=="

_comparison = None


def _test_name(item):
    return item.name.removeprefix(TEST_NAME_PREFIX).replace("_", " ")


def _expected_and_actual(report, call):
    if not report.failed:
        return None, None
    if _comparison is None:
        return None, call.excinfo.exconly().splitlines()[0]
    operator, left, right = _comparison
    expected = format_value(right) if operator == EQUALITY else f"{operator} {format_value(right)}"
    return expected, format_value(left)


def _record(item, report, call):
    path = os.environ.get(TEST_CASES_ENV)
    if not path:
        return
    expected, actual = _expected_and_actual(report, call)
    test_case = {"test": _test_name(item), "isPass": not report.failed, "input": read_last_call(), "expected": expected, "actual": actual}
    with open(path, "a", encoding="utf-8") as file:
        file.write(json.dumps(test_case) + "\n")


def pytest_runtest_setup(item):
    global _comparison
    _comparison = None
    clear_last_call()


def pytest_assertrepr_compare(config, op, left, right):
    global _comparison
    _comparison = (op, left, right)


@pytest.hookimpl(wrapper=True)
def pytest_runtest_makereport(item, call):
    report = yield
    is_outcome = report.when == "call" or (report.when == "setup" and report.failed)
    if is_outcome and not report.skipped:
        _record(item, report, call)
    return report
