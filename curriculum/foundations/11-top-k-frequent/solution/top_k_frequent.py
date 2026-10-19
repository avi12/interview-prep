import heapq
from collections import Counter


def top_k_frequent(nums, k):
    heap = []
    for value, count in Counter(nums).items():
        heapq.heappush(heap, (count, value))
        if len(heap) > k:
            heapq.heappop(heap)
    return [value for _, value in heap]
