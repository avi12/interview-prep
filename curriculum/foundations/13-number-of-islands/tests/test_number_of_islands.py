import copy
import sys
import threading

from impl import load_impl

RECURSION_LIMIT_BEFORE_LOADING = sys.getrecursionlimit()

num_islands = load_impl(__file__, "number_of_islands.py").num_islands

LAND = "1"
WATER = "0"
BIG_ISLAND_SIDE = 300
CHECKERBOARD_SIDE = 300
TIME_LIMIT_SECONDS = 5


def to_grid(rows):
    return [list(row) for row in rows]


def run_within(seconds, function, *args):
    outcome = {}

    def target():
        try:
            outcome["result"] = function(*args)
        except Exception as error:
            outcome["error"] = error

    worker = threading.Thread(target=target, daemon=True)
    worker.start()
    worker.join(seconds)
    assert not worker.is_alive(), f"still running after {seconds} seconds: too slow for this grid"
    if "error" in outcome:
        raise outcome["error"]
    return outcome["result"]


def test_one_island():
    grid = to_grid(["11110", "11010", "11000", "00000"])
    assert num_islands(grid) == 1


def test_three_islands():
    grid = to_grid(["11000", "11000", "00100", "00011"])
    assert num_islands(grid) == 3


def test_empty_grid_has_no_islands():
    assert num_islands([]) == 0


def test_all_water_has_no_islands():
    assert num_islands(to_grid(["000", "000"])) == 0


def test_single_land_cell_is_an_island():
    assert num_islands(to_grid(["1"])) == 1


def test_diagonal_cells_are_separate_islands():
    assert num_islands(to_grid(["10", "01"])) == 2


def test_a_ring_around_a_lake_is_one_island():
    assert num_islands(to_grid(["111", "101", "111"])) == 1


def test_an_island_inside_a_lake_inside_a_ring_is_a_second_island():
    grid = to_grid(["11111", "10001", "10101", "10001", "11111"])
    assert num_islands(grid) == 2


def test_a_block_that_loops_back_is_counted_once():
    assert num_islands(to_grid(["11", "11"])) == 1


def test_does_not_change_the_grid():
    grid = to_grid(["11000", "11000", "00100", "00011"])
    before = copy.deepcopy(grid)
    num_islands(grid)
    assert grid == before


def test_one_huge_island_does_not_hit_the_recursion_limit():
    grid = [[LAND] * BIG_ISLAND_SIDE for _ in range(BIG_ISLAND_SIDE)]
    assert run_within(TIME_LIMIT_SECONDS, num_islands, grid) == 1
    assert sys.getrecursionlimit() == RECURSION_LIMIT_BEFORE_LOADING, "raising the recursion limit is not a fix: use a queue or a stack"


def test_many_tiny_islands_stay_fast():
    grid = [
        [LAND if (row + column) % 2 == 0 else WATER for column in range(CHECKERBOARD_SIDE)]
        for row in range(CHECKERBOARD_SIDE)
    ]
    expected = CHECKERBOARD_SIDE * CHECKERBOARD_SIDE // 2
    assert run_within(TIME_LIMIT_SECONDS, num_islands, grid) == expected
