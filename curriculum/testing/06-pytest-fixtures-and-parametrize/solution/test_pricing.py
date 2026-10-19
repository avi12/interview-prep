import json

import pytest

import pricing


@pytest.fixture
def cart():
    return pricing.Cart()


@pytest.fixture
def cart_with_items(cart):
    cart.add("pen", 150, quantity=2)
    cart.add("notebook", 500)
    return cart


@pytest.fixture
def discounts_file(tmp_path):
    file = tmp_path / "discounts.json"
    file.write_text(json.dumps({"SAVE10": 10, "HALF": 50}))
    return file


@pytest.fixture(autouse=True)
def no_tax_by_default(monkeypatch):
    monkeypatch.delenv(pricing.TAX_ENV_VAR, raising=False)


@pytest.mark.parametrize(
    "weight_grams, expected_cents",
    [
        (1, 400),
        (500, 400),
        (501, 800),
        (2000, 800),
        (2001, 1500),
        (10000, 1500),
    ],
)
def test_shipping_tiers_switch_just_after_each_limit(weight_grams, expected_cents):
    assert pricing.shipping_cents(weight_grams) == expected_cents


@pytest.mark.parametrize("weight_grams", [0, -1])
def test_shipping_rejects_weight_of_zero_or_less(weight_grams):
    with pytest.raises(ValueError):
        pricing.shipping_cents(weight_grams)


def test_empty_cart_has_a_subtotal_of_zero(cart):
    assert cart.subtotal_cents() == 0


def test_subtotal_multiplies_price_by_quantity(cart_with_items):
    assert cart_with_items.subtotal_cents() == 800


def test_a_new_cart_does_not_see_items_added_to_another(cart_with_items):
    other_cart = pricing.Cart()

    assert other_cart.subtotal_cents() == 0


@pytest.mark.parametrize("quantity", [0, -3])
def test_adding_less_than_one_of_an_item_is_rejected(cart, quantity):
    with pytest.raises(ValueError):
        cart.add("pen", 150, quantity=quantity)


def test_total_without_tax_equals_the_subtotal(cart_with_items):
    assert cart_with_items.total_cents() == 800


def test_total_adds_tax_from_the_environment(cart_with_items, monkeypatch):
    monkeypatch.setenv(pricing.TAX_ENV_VAR, "20")

    assert cart_with_items.total_cents() == 960


def test_total_applies_both_the_discount_and_the_tax(cart_with_items, monkeypatch):
    monkeypatch.setenv(pricing.TAX_ENV_VAR, "10")

    assert cart_with_items.total_cents(discount=50) == 440


def test_a_discount_lowers_the_total(cart_with_items):
    assert cart_with_items.total_cents(discount=10) == 720


@pytest.mark.parametrize(
    "code, expected_percent",
    [
        ("SAVE10", 10),
        ("save10", 10),
        ("HALF", 50),
        ("NOPE", 0),
    ],
)
def test_discount_codes_are_read_from_the_file(discounts_file, code, expected_percent):
    assert pricing.discount_percent(code, discounts_file) == expected_percent


def test_a_missing_discounts_file_means_no_discount(tmp_path):
    assert pricing.discount_percent("SAVE10", tmp_path / "missing.json") == 0
