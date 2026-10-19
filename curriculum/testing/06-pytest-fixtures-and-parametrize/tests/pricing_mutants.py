from mutation import Edit, Mutant

PRICING_MUTANTS = [
    Mutant("a parcel of exactly 500 or 2000 grams is charged the next tier", (Edit("if weight_grams <= max_grams:", "if weight_grams < max_grams:"),)),
    Mutant("a parcel of 0 grams is accepted", (Edit("if weight_grams <= 0:", "if weight_grams < 0:"),)),
    Mutant("heavy parcels are charged the wrong price", (Edit("HEAVY_SHIPPING_CENTS = 1500", "HEAVY_SHIPPING_CENTS = 1400"),)),
    Mutant("all carts share one list of lines", (Edit("    def __init__(self):\n        self.lines = []\n", "    lines = []\n"),)),
    Mutant("a quantity of 0 is accepted", (Edit("if quantity < 1:", "if quantity < 0:"),)),
    Mutant("the quantity is ignored in the subtotal", (Edit("unit_cents * quantity for", "unit_cents for"),)),
    Mutant("a discount raises the price", (Edit("(PERCENT - discount)", "(PERCENT + discount)"),)),
    Mutant("tax is added when TAX_PERCENT is not set", (Edit('os.environ.get(TAX_ENV_VAR, "0")', 'os.environ.get(TAX_ENV_VAR, "20")'),)),
    Mutant("TAX_PERCENT is ignored", (Edit('int(os.environ.get(TAX_ENV_VAR, "0"))', "0"),)),
    Mutant("a missing discounts file crashes", (Edit("if not file.exists():", "if False:"),)),
    Mutant("the discounts file is never used", (Edit("if not file.exists():", "if True:"),)),
    Mutant("discount codes are case sensitive", (Edit("code.upper()", "code"),)),
    Mutant("an unknown discount code gives None instead of 0", (Edit("discounts.get(code.upper(), 0)", "discounts.get(code.upper())"),)),
]
