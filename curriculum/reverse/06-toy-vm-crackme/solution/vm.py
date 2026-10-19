BYTE_MASK = 0xFF
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

BINARY_OPERATIONS = {
    ADD: lambda left, right: (left + right) & BYTE_MASK,
    SUB: lambda left, right: (left - right) & BYTE_MASK,
    XOR: lambda left, right: left ^ right,
}

PASSCODE = 42


class VMError(Exception):
    pass


def pop(stack):
    if not stack:
        raise VMError("stack underflow")
    return stack.pop()


def checked_target(target, program):
    if target > len(program):
        raise VMError(f"jump to {target:#04x} is outside the program")
    return target


def run(program, inputs=(), max_steps=DEFAULT_MAX_STEPS):
    stack = []
    output = bytearray()
    address = 0
    steps = 0
    while address < len(program):
        steps += 1
        if steps > max_steps:
            raise VMError("step limit reached")
        opcode = program[address]
        if opcode not in INSTRUCTIONS:
            raise VMError(f"unknown opcode {opcode:#04x} at {address:#06x}")
        operand_count = INSTRUCTIONS[opcode][1]
        next_address = address + 1 + operand_count
        if next_address > len(program):
            raise VMError(f"missing operand at {address:#06x}")
        operand = program[address + 1] if operand_count else None
        address = next_address
        if opcode == HALT:
            break
        if opcode == PUSH:
            stack.append(operand)
        elif opcode in BINARY_OPERATIONS:
            right = pop(stack)
            left = pop(stack)
            stack.append(BINARY_OPERATIONS[opcode](left, right))
        elif opcode == DUP:
            value = pop(stack)
            stack.extend([value, value])
        elif opcode == SWAP:
            top = pop(stack)
            below = pop(stack)
            stack.extend([top, below])
        elif opcode == POP:
            pop(stack)
        elif opcode == LOAD:
            if operand >= len(inputs):
                raise VMError(f"no input number {operand}")
            stack.append(inputs[operand])
        elif opcode == OUT:
            output.append(pop(stack))
        elif opcode == JMP:
            address = checked_target(operand, program)
        elif opcode == JZ and pop(stack) == 0:
            address = checked_target(operand, program)
    return bytes(output)


def disassemble(program):
    lines = []
    address = 0
    while address < len(program):
        opcode = program[address]
        instruction = INSTRUCTIONS.get(opcode)
        if instruction is None or address + 1 + instruction[1] > len(program):
            lines.append(f"{address:04x}: DB {opcode:#04x}")
            address += 1
            continue
        name, operand_count = instruction
        operands = "".join(f" {program[address + 1 + offset]:#04x}" for offset in range(operand_count))
        lines.append(f"{address:04x}: {name}{operands}")
        address += 1 + operand_count
    return lines
