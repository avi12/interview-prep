import copy
import random
import sys

from impl import load_impl
from limits import run_within

RECURSION_LIMIT_BEFORE_LOADING = sys.getrecursionlimit()

num_islands = load_impl(__file__, "number_of_islands.py").num_islands

LAND = "1"
WATER = "0"
BIG_ISLAND_SIDE = 300
CHECKERBOARD_SIDE = 300
TIME_LIMIT_SECONDS = 5
SEED = 200
RANDOM_ROUNDS = 150
RANDOM_SIDE_RANGE = (1, 7)
LAND_CHANCE = 0.55
DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def reference_count(grid):
    seen = set()

    def visit(row, column):
        stack = [(row, column)]
        while stack:
            current_row, current_column = stack.pop()
            if (current_row, current_column) in seen:
                continue
            seen.add((current_row, current_column))
            for row_step, column_step in DIRECTIONS:
                next_row, next_column = current_row + row_step, current_column + column_step
                is_inside = 0 <= next_row < len(grid) and 0 <= next_column < len(grid[0])
                if is_inside and grid[next_row][next_column] == LAND:
                    stack.append((next_row, next_column))

    count = 0
    for row, cells in enumerate(grid):
        for column, cell in enumerate(cells):
            if cell == LAND and (row, column) not in seen:
                visit(row, column)
                count += 1
    return count


def to_grid(rows):
    return [list(row) for row in rows]


def count_within_limit(grid):
    return run_within(TIME_LIMIT_SECONDS, num_islands, grid, too_slow_for="this grid")


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


def test_a_u_shaped_island_is_counted_once():
    assert num_islands(to_grid(["101", "101", "111"])) == 1


def test_a_winding_island_is_counted_once():
    grid = to_grid(["11111", "00001", "11111", "10000", "11111"])
    assert num_islands(grid) == 1


def test_land_on_opposite_edges_of_a_row_is_not_joined():
    assert num_islands(to_grid(["101"])) == 2


def test_land_on_opposite_edges_of_a_column_is_not_joined():
    assert num_islands(to_grid(["1", "0", "1"])) == 2


def test_matches_a_simple_flood_fill_on_random_grids():
    generator = random.Random(SEED)
    for _ in range(RANDOM_ROUNDS):
        rows = generator.randint(*RANDOM_SIDE_RANGE)
        columns = generator.randint(*RANDOM_SIDE_RANGE)
        grid = [[LAND if generator.random() < LAND_CHANCE else WATER for _ in range(columns)] for _ in range(rows)]
        before = copy.deepcopy(grid)
        assert num_islands(grid) == reference_count(before), f"wrong count for {before}"


def test_does_not_change_the_grid():
    grid = to_grid(["11000", "11000", "00100", "00011"])
    before = copy.deepcopy(grid)
    num_islands(grid)
    assert grid == before


def test_one_huge_island_does_not_hit_the_recursion_limit():
    grid = [[LAND] * BIG_ISLAND_SIDE for _ in range(BIG_ISLAND_SIDE)]
    assert count_within_limit(grid) == 1
    assert sys.getrecursionlimit() == RECURSION_LIMIT_BEFORE_LOADING, "raising the recursion limit is not a fix: use a queue or a stack"


def test_many_tiny_islands_stay_fast():
    grid = [
        [LAND if (row + column) % 2 == 0 else WATER for column in range(CHECKERBOARD_SIDE)]
        for row in range(CHECKERBOARD_SIDE)
    ]
    expected = CHECKERBOARD_SIDE * CHECKERBOARD_SIDE // 2
    assert count_within_limit(grid) == expected
