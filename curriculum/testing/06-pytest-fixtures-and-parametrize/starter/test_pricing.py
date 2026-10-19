import pricing


def test_cart_subtotal_adds_up_one_item():
    cart = pricing.Cart()
    cart.add("pen", 150)

    assert cart.subtotal_cents() == 150
