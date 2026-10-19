import pytest
from impl import load_impl

module = load_impl(__file__, "reverse_linked_list.py")
ListNode = module.ListNode
reverse_list = module.reverse_list

LARGE_SIZE = 100_000


def build(values):
    head = None
    for value in reversed(values):
        head = ListNode(value, head)
    return head


def nodes_of(head, limit=LARGE_SIZE + 10):
    nodes = []
    while head is not None:
        nodes.append(head)
        assert len(nodes) <= limit, "The list never ends: a next pointer loops back"
        head = head.next
    return nodes


def values_of(head):
    return [node.val for node in nodes_of(head)]


@pytest.mark.parametrize(
    "values",
    [[1, 2, 3, 4, 5], [1, 2], [7], [3, 3, 3], [-1, 0, 1], [5, 1, 4, 2, 3, 9]],
)
def test_reverses_the_list(values):
    assert values_of(reverse_list(build(values))) == values[::-1]


def test_empty_list_stays_empty():
    assert reverse_list(None) is None


def test_single_node_is_its_own_reverse():
    node = ListNode(1)
    assert reverse_list(node) is node
    assert node.next is None


def test_old_head_becomes_the_tail_and_ends_the_list():
    head = build([1, 2, 3])
    reverse_list(head)
    assert head.next is None


def test_reuses_the_same_nodes_instead_of_copying_them():
    head = build([1, 2, 3, 4])
    original_nodes = nodes_of(head)
    new_head = reverse_list(head)
    assert nodes_of(new_head) == original_nodes[::-1]


def test_keeps_every_node():
    values = list(range(50))
    assert len(nodes_of(reverse_list(build(values)))) == len(values)


def test_reversing_twice_gives_the_original_order():
    values = [4, 8, 15, 16, 23, 42]
    assert values_of(reverse_list(reverse_list(build(values)))) == values


def test_handles_100000_nodes_without_recursion():
    values = list(range(LARGE_SIZE))
    assert values_of(reverse_list(build(values))) == values[::-1]
