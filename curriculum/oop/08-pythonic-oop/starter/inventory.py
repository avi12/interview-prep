from abc import ABC, abstractmethod


class OutOfStock(Exception):
    pass


class Sku:
    def __init__(self, code):
        self.code = code


class PricingHook(ABC):
    @abstractmethod
    def price_for(self, item):
        ...


class ListPrice(PricingHook):
    def price_for(self, item):
        return item.unit_price_cents


class Item:
    def __init__(self, sku, name, unit_price_cents, quantity=0):
        self.sku = sku
        self.name = name
        self.unit_price_cents = unit_price_cents
        self.quantity = quantity

    def take(self, amount):
        self.quantity -= amount


class Inventory:
    def __init__(self):
        self._items = {}

    def add(self, item):
        self._items[item.sku] = item

    def get(self, sku):
        return self._items[sku]

    def take(self, sku, amount):
        self._items[sku].take(amount)

    def skus(self):
        return list(self._items)

    def total_value(self, pricing):
        total = 0
        for item in self._items.values():
            total += pricing.price_for(item) * item.quantity
        return total
