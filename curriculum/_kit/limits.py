import threading
import time


class Stopwatch:
    def __init__(self):
        self.started_at = time.perf_counter()

    def elapsed_seconds(self):
        return time.perf_counter() - self.started_at


def measure_seconds(function, *args):
    stopwatch = Stopwatch()
    result = function(*args)
    return result, stopwatch.elapsed_seconds()


def _too_slow_message(seconds, too_slow_for):
    return f"still running after {seconds} seconds: too slow for {too_slow_for}"


def _run_inline(seconds, function, args, too_slow_for):
    result, elapsed = measure_seconds(function, *args)
    assert elapsed <= seconds, _too_slow_message(seconds, too_slow_for)
    return result


def run_within(seconds, function, *args, too_slow_for="this input"):
    outcome = {}

    def target():
        try:
            outcome["result"] = function(*args)
        except Exception as error:
            outcome["error"] = error

    worker = threading.Thread(target=target, daemon=True)
    try:
        worker.start()
    except RuntimeError:
        return _run_inline(seconds, function, args, too_slow_for)
    worker.join(seconds)
    assert not worker.is_alive(), _too_slow_message(seconds, too_slow_for)
    if "error" in outcome:
        raise outcome["error"]
    return outcome["result"]
