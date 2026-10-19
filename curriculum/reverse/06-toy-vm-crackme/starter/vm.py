DEFAULT_MAX_STEPS = 10_000

PUSH, ADD, SUB, XOR, DUP, SWAP, POP, LOAD, OUT, JMP, JZ, HALT = range(1, 13)

INSTRUCTIONS = {
    PUSH: ("PUSH", 1),
    ADD: ("ADD", 0),
    SUB: ("SUB", 0),
    XOR: ("XOR", 0),
    DUP: ("DUP", 0),
    SWAP: ("SWAP", 0),
    POP: ("POP", 0),
    LOAD: ("LOAD", 1),
    OUT: ("OUT", 0),
    JMP: ("JMP", 1),
    JZ: ("JZ", 1),
    HALT: ("HALT", 0),
}

PASSCODE = 0


class VMError(Exception):
    pass


def run(program, inputs=(), max_steps=DEFAULT_MAX_STEPS):
    return b""


def disassemble(program):
    return []
