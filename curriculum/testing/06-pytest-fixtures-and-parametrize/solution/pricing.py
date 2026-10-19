import json
import os
from pathlib import Path

TAX_ENV_VAR = "TAX_PERCENT"
SHIPPING_TIERS = ((500, 400), (2000, 800))
HEAVY_SHIPPING_CENTS = 1500
PERCENT = 100


def shipping_cents(weight_grams):
    if weight_grams <= 0:
        raise ValueError("weight must be above zero")
    for max_grams, cents in SHIPPING_TIERS:
        if weight_grams <= max_grams:
            return cents
    return HEAVY_SHIPPING_CENTS


def tax_percent():
    return int(os.environ.get(TAX_ENV_VAR, "0"))


def discount_percent(code, path):
    file = Path(path)
    if not file.exists():
        return 0
    discounts = json.loads(file.read_text())
    return discounts.get(code.upper(), 0)


class Cart:
    def __init__(self):
        self.lines = []

    def add(self, name, unit_cents, quantity=1):
        if quantity < 1:
            raise ValueError("quantity must be at least 1")
        self.lines.append((name, unit_cents, quantity))

    def subtotal_cents(self):
        return sum(unit_cents * quantity for _, unit_cents, quantity in self.lines)

    def total_cents(self, discount=0):
        discounted = self.subtotal_cents() * (PERCENT - discount) // PERCENT
        return discounted * (PERCENT + tax_percent()) // PERCENT
