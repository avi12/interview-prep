import contextlib
import io
import json
import os
import shutil
import sys

import pytest
from browser_compat import patch_threaded_libraries

PYTEST_ARGS = ["-q", "--tb=short", "-p", "no:cacheprovider", "-p", "case_recorder"]
NODE_ID_SEPARATOR = "::"
COLLECTION_NAME = "collection"


class ResultCollector:
    def __init__(self):
        self.by_name = {}

    def pytest_collectreport(self, report):
        if report.failed:
            name = report.nodeid or COLLECTION_NAME
            self.by_name[name] = {"name": name, "suite": [], "isPass": False, "message": report.longreprtext}

    def pytest_runtest_logreport(self, report):
        name = report.nodeid.split(NODE_ID_SEPARATOR)[-1]
        if report.failed:
            self.by_name[name] = {"name": name, "suite": [], "isPass": False, "message": report.longreprtext}
            return
        if report.when == "call" and name not in self.by_name:
            self.by_name[name] = {"name": name, "suite": [], "isPass": True, "message": ""}


def _write_tree(root, files):
    for relative_path, content in files.items():
        path = os.path.join(root, relative_path)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as file:
            file.write(content)


def _purge_modules(roots):
    for name, module in list(sys.modules.items()):
        path = getattr(module, "__file__", None) or ""
        if path.startswith(roots):
            del sys.modules[name]


def _read_records(path):
    if not os.path.exists(path):
        return []
    with open(path, encoding="utf-8") as file:
        return [json.loads(line) for line in file if line.strip()]


@contextlib.contextmanager
def _isolated_process_state(roots):
    saved_path = list(sys.path)
    saved_environ = dict(os.environ)
    saved_cwd = os.getcwd()
    try:
        yield
    finally:
        sys.path[:] = saved_path
        os.environ.clear()
        os.environ.update(saved_environ)
        os.chdir(saved_cwd)
        _purge_modules(roots)


def run(request_json):
    request = json.loads(request_json)
    roots = (request["lessonDir"], request["implDir"], request["kitDir"])
    for directory in roots:
        shutil.rmtree(directory, ignore_errors=True)
    _write_tree(request["kitDir"], request["kitFiles"])
    _write_tree(request["lessonDir"], request["lessonFiles"])
    _write_tree(request["implDir"], request["implFiles"])
    records_file = request["recordsFile"]
    with contextlib.suppress(FileNotFoundError):
        os.remove(records_file)
    collector = ResultCollector()
    output = io.StringIO()
    with _isolated_process_state(roots):
        _purge_modules(roots)
        patch_threaded_libraries()
        sys.path.insert(0, request["kitDir"])
        os.environ.update(request["env"])
        os.chdir(request["rootDir"])
        with contextlib.redirect_stdout(output), contextlib.redirect_stderr(output):
            exit_code = pytest.main([*PYTEST_ARGS, f"--rootdir={request['lessonDir']}", request["testsDir"]], plugins=[collector])
    return json.dumps({"exitCode": int(exit_code), "output": output.getvalue(), "tests": list(collector.by_name.values()), "testCases": _read_records(records_file)})
