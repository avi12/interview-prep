import functools
import reprlib

SHOWN_DEPTH = 3
SHOWN_ITEMS = 12
SHOWN_STRING_LENGTH = 60

_shown = reprlib.Repr(maxlevel=SHOWN_DEPTH, maxlist=SHOWN_ITEMS, maxtuple=SHOWN_ITEMS, maxset=SHOWN_ITEMS, maxdict=SHOWN_ITEMS, maxstring=SHOWN_STRING_LENGTH, maxother=SHOWN_STRING_LENGTH)
_last_call = None
_depth = 0


def format_value(value):
    return _shown.repr(value)


def read_last_call():
    return _last_call


def clear_last_call():
    global _last_call
    _last_call = None


def recorded(name, function):
    @functools.wraps(function)
    def wrapper(*args, **kwargs):
        global _depth, _last_call
        if _depth == 0:
            shown_args = [format_value(value) for value in args] + [f"{key}={format_value(value)}" for key, value in kwargs.items()]
            _last_call = f"{name}({', '.join(shown_args)})"
        _depth += 1
        try:
            return function(*args, **kwargs)
        finally:
            _depth -= 1

    return wrapper
