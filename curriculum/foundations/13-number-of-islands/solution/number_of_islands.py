from collections import deque

LAND = "1"
DIRECTIONS = ((1, 0), (-1, 0), (0, 1), (0, -1))


def land_neighbors(grid, cell):
    row, column = cell
    for row_step, column_step in DIRECTIONS:
        next_row, next_column = row + row_step, column + column_step
        is_inside = 0 <= next_row < len(grid) and 0 <= next_column < len(grid[next_row])
        if is_inside and grid[next_row][next_column] == LAND:
            yield next_row, next_column


def flood(grid, start, visited):
    visited.add(start)
    queue = deque([start])
    while queue:
        for neighbor in land_neighbors(grid, queue.popleft()):
            if neighbor in visited:
                continue
            visited.add(neighbor)
            queue.append(neighbor)


def num_islands(grid):
    visited = set()
    island_count = 0
    for row, cells in enumerate(grid):
        for column, cell in enumerate(cells):
            if cell != LAND or (row, column) in visited:
                continue
            flood(grid, (row, column), visited)
            island_count += 1
    return island_count
