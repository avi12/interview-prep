import re
from dataclasses import dataclass
from typing import Protocol

SKU_PATTERN = re.compile(r"[A-Z]{2,4}-\d{3,5}")


class OutOfStock(Exception):
    pass


def require_whole_number(value, label):
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{label} must be a whole number, zero or more, got {value!r}")
    return value


@dataclass(frozen=True, order=True)
class Sku:
    code: str

    def __post_init__(self):
        if not SKU_PATTERN.fullmatch(self.code):
            raise ValueError(f"invalid sku {self.code!r}: use 2-4 capital letters, a hyphen, 3-5 digits")


class PricingHook(Protocol):
    def price_for(self, item: "Item") -> int: ...


class ListPrice:
    def price_for(self, item):
        return item.unit_price_cents


class Item:
    def __init__(self, sku, name, unit_price_cents, quantity=0):
        self.sku = sku
        self.name = name
        self._unit_price_cents = require_whole_number(unit_price_cents, "unit_price_cents")
        self.quantity = quantity

    @property
    def unit_price_cents(self):
        return self._unit_price_cents

    @property
    def quantity(self):
        return self._quantity

    @quantity.setter
    def quantity(self, value):
        self._quantity = require_whole_number(value, "quantity")

    def take(self, amount):
        require_whole_number(amount, "amount")
        if amount > self.quantity:
            raise OutOfStock(f"only {self.quantity} of {self.sku.code} left, asked for {amount}")
        self.quantity -= amount


class Inventory:
    def __init__(self):
        self._items = {}

    def __len__(self):
        return len(self._items)

    def __contains__(self, sku):
        return sku in self._items

    def add(self, item):
        if item.sku in self._items:
            raise ValueError(f"{item.sku.code} is already in the inventory")
        self._items[item.sku] = item

    def get(self, sku):
        return self._items[sku]

    def take(self, sku, amount):
        self.get(sku).take(amount)

    def skus(self):
        return sorted(self._items)

    def total_value(self, pricing: PricingHook):
        return sum(pricing.price_for(item) * item.quantity for item in self._items.values())
