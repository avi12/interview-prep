import time

from impl import load_impl

LRUCache = load_impl(__file__, "lru_cache.py").LRUCache

MISSING = -1
BIG_CAPACITY = 50_000
OPERATION_COUNT = 200_000
TIME_LIMIT_SECONDS = 2.0
CHECK_EVERY = 1000
HOT_KEYS = 10
PUT_EVERY = 4


def test_missing_key_returns_minus_one():
    assert LRUCache(2).get(1) == MISSING


def test_put_then_get():
    cache = LRUCache(2)
    cache.put(1, 10)
    assert cache.get(1) == 10


def test_put_overwrites_the_value():
    cache = LRUCache(2)
    cache.put(1, 10)
    cache.put(1, 11)
    assert cache.get(1) == 11


def test_evicts_the_least_recently_used_key_when_full():
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    cache.put(3, 3)
    assert cache.get(1) == MISSING
    assert cache.get(2) == 2
    assert cache.get(3) == 3


def test_get_counts_as_a_use():
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    cache.get(1)
    cache.put(3, 3)
    assert cache.get(2) == MISSING
    assert cache.get(1) == 1


def test_updating_a_key_counts_as_a_use_and_does_not_evict():
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    cache.put(1, 10)
    cache.put(3, 3)
    assert cache.get(2) == MISSING
    assert cache.get(1) == 10
    assert cache.get(3) == 3


def test_capacity_of_one_keeps_only_the_newest():
    cache = LRUCache(1)
    cache.put(1, 1)
    cache.put(2, 2)
    assert cache.get(1) == MISSING
    assert cache.get(2) == 2


def test_the_classic_interview_sequence():
    cache = LRUCache(2)
    cache.put(1, 1)
    cache.put(2, 2)
    assert cache.get(1) == 1
    cache.put(3, 3)
    assert cache.get(2) == MISSING
    cache.put(4, 4)
    assert cache.get(1) == MISSING
    assert cache.get(3) == 3
    assert cache.get(4) == 4


def test_never_holds_more_than_its_capacity():
    cache = LRUCache(100)
    for key in range(1000):
        cache.put(key, key * 2)
    assert all(cache.get(key) == MISSING for key in range(900))
    assert all(cache.get(key) == key * 2 for key in range(900, 1000))


def assert_within_time(started_at):
    elapsed = time.perf_counter() - started_at
    assert elapsed < TIME_LIMIT_SECONDS, f"too slow: {elapsed:.1f}s, get and put should be O(1)"


def test_operations_stay_fast_on_a_large_cache():
    cache = LRUCache(BIG_CAPACITY)
    started_at = time.perf_counter()
    for key in range(BIG_CAPACITY):
        cache.put(key, key)
        if key % CHECK_EVERY == 0:
            assert_within_time(started_at)
    for step in range(OPERATION_COUNT):
        if step % PUT_EVERY == PUT_EVERY - 1:
            cache.put(BIG_CAPACITY + step, step)
        else:
            cache.get(BIG_CAPACITY - 1 - step % HOT_KEYS)
        if step % CHECK_EVERY == 0:
            assert_within_time(started_at)
    assert_within_time(started_at)
    assert cache.get(BIG_CAPACITY - 1) == BIG_CAPACITY - 1
