import importlib.util
import inspect
import os
from pathlib import Path

from calls import recorded

ROOT = Path(__file__).resolve().parents[2]


def _lesson_id(test_file):
    lesson_dir = Path(test_file).resolve().parents[1]
    return f"{lesson_dir.parent.name}/{lesson_dir.name}"


def impl_path(test_file, name):
    default_dir = ROOT / "work" / _lesson_id(test_file)
    return Path(os.environ.get("IMPL_DIR", default_dir)) / name


def load_impl(test_file, name):
    path = impl_path(test_file, name)
    if not path.exists():
        raise FileNotFoundError(f"Missing {name}. Run: pnpm lesson open {_lesson_id(test_file)}")
    spec = importlib.util.spec_from_file_location(path.stem, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    _record_calls(module)
    return module


def _record_calls(module):
    for name, value in list(vars(module).items()):
        if inspect.isfunction(value) and value.__module__ == module.__name__:
            setattr(module, name, recorded(name, value))
