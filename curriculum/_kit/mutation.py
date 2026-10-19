import os
import shutil
import subprocess
import sys
import tempfile
import time
import xml.etree.ElementTree as ElementTree
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
RUNS_DIR = ROOT / "work" / "_mutation"
RUN_TIMEOUT_SECONDS = 90
MAX_PARALLEL_RUNS = 4
MAX_FAILURE_CHARS = 400
MAX_CRASH_CHARS = 1200
STALE_RUN_SECONDS = 600


@dataclass(frozen=True)
class Edit:
    find: str
    replace: str


@dataclass(frozen=True)
class Mutant:
    name: str
    edits: tuple


@dataclass
class SuiteOutcome:
    passed_titles: list = field(default_factory=list)
    failures: list = field(default_factory=list)
    crash: str = ""

    @property
    def is_pass(self):
        return not self.failures and not self.crash and len(self.passed_titles) > 0


def _with_unix_line_endings(text):
    return text.replace("\r\n", "\n")


def apply_mutant(source, mutant):
    mutated = _with_unix_line_endings(source)
    for edit in mutant.edits:
        occurrences = mutated.count(edit.find)
        if occurrences != 1:
            raise ValueError(f'Mutant "{mutant.name}": the text to change must appear exactly once in the reference, found {occurrences}: {edit.find}')
        mutated = mutated.replace(edit.find, edit.replace)
    return mutated


def _clean_environment():
    kept = {key: value for key, value in os.environ.items() if not key.startswith("PYTEST_") and key != "IMPL_DIR"}
    return {**kept, "PYTHONDONTWRITEBYTECODE": "1"}


def _summary(problem):
    message = (problem.get("message") or "").strip()
    detail_lines = (problem.text or "").strip().splitlines()
    detail = detail_lines[-1].strip() if detail_lines else ""
    if not detail or detail in message:
        return message[:MAX_FAILURE_CHARS]
    return f"{message} | {detail}"[:MAX_FAILURE_CHARS]


def _outcome_from_junit(report_file, output):
    if not report_file.exists():
        return SuiteOutcome(crash=output[-MAX_CRASH_CHARS:] or "pytest produced no report")
    outcome = SuiteOutcome()
    for case in ElementTree.parse(report_file).getroot().iter("testcase"):
        title = case.get("name", "")
        problem = next((node for node in (case.find("failure"), case.find("error")) if node is not None), None)
        if problem is not None:
            outcome.failures.append(f'"{title}" failed: {_summary(problem)}')
            continue
        if case.find("skipped") is None:
            outcome.passed_titles.append(title)
    return outcome


def run_suite_with_subject(suite_dir, suite_file, subject_file, subject_source):
    RUNS_DIR.mkdir(parents=True, exist_ok=True)
    run_dir = Path(tempfile.mkdtemp(prefix="run-", dir=RUNS_DIR))
    report_file = run_dir.with_suffix(".xml")
    try:
        shutil.copytree(suite_dir, run_dir, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", ".pytest_cache"))
        (run_dir / subject_file).write_text(subject_source, encoding="utf-8")
        command = [sys.executable, "-m", "pytest", "-q", "-p", "no:cacheprovider", "--tb=short", "--rootdir", str(run_dir), f"--junitxml={report_file}", suite_file]
        try:
            result = subprocess.run(command, cwd=run_dir, env=_clean_environment(), capture_output=True, text=True, timeout=RUN_TIMEOUT_SECONDS)
            output = f"{result.stdout}\n{result.stderr}"
        except subprocess.TimeoutExpired:
            return SuiteOutcome(crash=f"your tests took longer than {RUN_TIMEOUT_SECONDS} seconds")
        return _outcome_from_junit(report_file, output)
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)
        report_file.unlink(missing_ok=True)


def _remove_stale_runs():
    if not RUNS_DIR.exists():
        return
    for path in RUNS_DIR.iterdir():
        if time.time() - path.stat().st_mtime <= STALE_RUN_SECONDS:
            continue
        if path.is_dir():
            shutil.rmtree(path, ignore_errors=True)
            continue
        path.unlink(missing_ok=True)


def run_all(suite_dir, suite_file, subject_file, subject_sources):
    _remove_stale_runs()

    def run_one(subject_source):
        return run_suite_with_subject(suite_dir, suite_file, subject_file, subject_source)

    with ThreadPoolExecutor(max_workers=MAX_PARALLEL_RUNS) as pool:
        return list(pool.map(run_one, subject_sources))


def describe_problems(outcome):
    return "\n".join([*outcome.failures, outcome.crash]).strip()
