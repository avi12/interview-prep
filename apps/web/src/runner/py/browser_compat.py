import asyncio
import contextlib
import importlib.util
import inspect
import time


class _NoSelector:
    def select(self, timeout=None):
        if timeout:
            time.sleep(timeout)
        return []

    def close(self):
        pass


class InlineEventLoop(asyncio.BaseEventLoop):
    def __init__(self):
        super().__init__()
        self._selector = _NoSelector()

    def _process_events(self, event_list):
        pass

    def _write_to_self(self):
        pass


class InlinePortal:
    def __init__(self, loop):
        self._loop = loop

    def call(self, function, *args):
        async def in_loop():
            result = function(*args)
            return await result if inspect.isawaitable(result) else result

        outer_loop = asyncio.events._get_running_loop()
        asyncio.events._set_running_loop(None)
        try:
            return self._loop.run_until_complete(in_loop())
        finally:
            asyncio.events._set_running_loop(outer_loop)


async def _run_sync_inline(function, *args, **_options):
    return function(*args)


@contextlib.contextmanager
def _inline_portal_factory(_client):
    loop = InlineEventLoop()
    try:
        yield InlinePortal(loop)
    finally:
        loop.close()


def patch_threaded_libraries():
    if importlib.util.find_spec("starlette") is None:
        return
    import anyio.to_thread
    import starlette.testclient

    anyio.to_thread.run_sync = _run_sync_inline
    starlette.testclient.TestClient._portal_factory = _inline_portal_factory
