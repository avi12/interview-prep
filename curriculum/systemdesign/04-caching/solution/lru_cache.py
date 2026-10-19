from collections import OrderedDict

MISSING = -1


class LRUCache:
    def __init__(self, capacity):
        self.capacity = capacity
        self.entries = OrderedDict()

    def get(self, key):
        if key not in self.entries:
            return MISSING
        self.entries.move_to_end(key)
        return self.entries[key]

    def put(self, key, value):
        self.entries[key] = value
        self.entries.move_to_end(key)
        if len(self.entries) > self.capacity:
            self.entries.popitem(last=False)
