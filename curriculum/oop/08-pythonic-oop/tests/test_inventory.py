import dataclasses
import typing
from types import SimpleNamespace

import pytest
from impl import load_impl

module = load_impl(__file__, "inventory.py")
Sku = module.Sku
Item = module.Item
Inventory = module.Inventory
ListPrice = module.ListPrice
PricingHook = module.PricingHook
OutOfStock = module.OutOfStock

BOOK = "BK-001"
POSTER = "PO-002"


def make_inventory():
    inventory = Inventory()
    inventory.add(Item(Sku(BOOK), "Clean Code", 1500, quantity=2))
    inventory.add(Item(Sku(POSTER), "Poster", 500, quantity=3))
    return inventory


def test_equal_skus_are_equal():
    assert Sku(BOOK) == Sku(BOOK)
    assert Sku(BOOK) != Sku(POSTER)


def test_equal_skus_hash_alike():
    assert hash(Sku(BOOK)) == hash(Sku(BOOK))


def test_a_separate_but_equal_sku_finds_the_same_dict_entry():
    prices = {Sku(BOOK): 1500}

    assert prices[Sku(BOOK)] == 1500


def test_a_sku_cannot_be_changed_after_creation():
    sku = Sku(BOOK)

    with pytest.raises(dataclasses.FrozenInstanceError):
        sku.code = POSTER


def test_skus_sort_by_code():
    codes = [Sku("ZZ-900"), Sku("AB-100"), Sku("MM-500")]

    assert sorted(codes) == [Sku("AB-100"), Sku("MM-500"), Sku("ZZ-900")]


@pytest.mark.parametrize("code", ["BK-001", "TOY-12345", "AB-100"])
def test_valid_sku_codes_are_accepted(code):
    assert Sku(code).code == code


@pytest.mark.parametrize("code", ["", "bk-001", "BK001", " BK-001", "BOOKS-001", "BK-12", "BK-123456", "BK-00A"])
def test_invalid_sku_codes_are_rejected_at_creation(code):
    with pytest.raises(ValueError):
        Sku(code)


def test_quantity_defaults_to_zero():
    assert Item(Sku(BOOK), "Clean Code", 1500).quantity == 0


def test_quantity_can_be_set_to_a_valid_value():
    item = Item(Sku(BOOK), "Clean Code", 1500)
    item.quantity = 7

    assert item.quantity == 7


@pytest.mark.parametrize("bad_quantity", [-1, 1.5, "3", None])
def test_a_bad_quantity_is_rejected_at_creation(bad_quantity):
    with pytest.raises(ValueError):
        Item(Sku(BOOK), "Clean Code", 1500, quantity=bad_quantity)


@pytest.mark.parametrize("bad_quantity", [-1, 1.5])
def test_a_bad_quantity_is_rejected_when_set_and_the_old_value_stays(bad_quantity):
    item = Item(Sku(BOOK), "Clean Code", 1500, quantity=4)

    with pytest.raises(ValueError):
        item.quantity = bad_quantity

    assert item.quantity == 4


def test_the_price_is_read_only():
    item = Item(Sku(BOOK), "Clean Code", 1500)

    with pytest.raises(AttributeError):
        item.unit_price_cents = 1


@pytest.mark.parametrize("bad_price", [-1, 9.99])
def test_the_price_must_be_whole_cents_zero_or_more(bad_price):
    with pytest.raises(ValueError):
        Item(Sku(BOOK), "Clean Code", bad_price)


def test_taking_stock_reduces_the_quantity():
    item = Item(Sku(BOOK), "Clean Code", 1500, quantity=5)
    item.take(2)

    assert item.quantity == 3


def test_taking_more_than_is_in_stock_raises_and_changes_nothing():
    item = Item(Sku(BOOK), "Clean Code", 1500, quantity=2)

    with pytest.raises(OutOfStock):
        item.take(3)

    assert item.quantity == 2


def test_an_equal_but_new_sku_finds_the_item():
    inventory = make_inventory()

    assert inventory.get(Sku(BOOK)).name == "Clean Code"


def test_adding_the_same_sku_twice_is_rejected():
    inventory = make_inventory()

    with pytest.raises(ValueError):
        inventory.add(Item(Sku(BOOK), "Another copy", 1000))

    assert len(inventory) == 2


def test_getting_an_unknown_sku_raises_key_error():
    with pytest.raises(KeyError):
        make_inventory().get(Sku("XX-999"))


def test_len_and_in_work_like_a_collection():
    inventory = make_inventory()

    assert len(inventory) == 2
    assert Sku(BOOK) in inventory
    assert Sku("XX-999") not in inventory


def test_skus_come_back_sorted_whatever_the_insert_order():
    inventory = Inventory()
    inventory.add(Item(Sku("ZZ-900"), "Last", 100))
    inventory.add(Item(Sku("AB-100"), "First", 100))

    assert inventory.skus() == [Sku("AB-100"), Sku("ZZ-900")]


def test_inventory_take_reaches_the_item():
    inventory = make_inventory()
    inventory.take(Sku(POSTER), 2)

    assert inventory.get(Sku(POSTER)).quantity == 1


def test_the_pricing_hook_is_a_protocol_not_a_base_class_to_inherit():
    assert typing.is_protocol(PricingHook)


def test_list_price_values_stock_at_the_item_price():
    assert make_inventory().total_value(ListPrice()) == 2 * 1500 + 3 * 500


def test_a_plain_class_with_the_right_method_can_price_the_inventory():
    class HalfPrice:
        def price_for(self, item):
            return item.unit_price_cents // 2

    assert make_inventory().total_value(HalfPrice()) == 2 * 750 + 3 * 250


def test_any_object_with_the_right_method_can_price_the_inventory():
    flat = SimpleNamespace(price_for=lambda item: 100)

    assert make_inventory().total_value(flat) == 5 * 100


def test_the_hook_is_called_once_per_item_with_the_item():
    seen = []

    class Recorder:
        def price_for(self, item):
            seen.append(item.sku)
            return 0

    make_inventory().total_value(Recorder())

    assert sorted(seen) == [Sku(BOOK), Sku(POSTER)]


def test_an_empty_inventory_is_worth_nothing():
    assert Inventory().total_value(ListPrice()) == 0
