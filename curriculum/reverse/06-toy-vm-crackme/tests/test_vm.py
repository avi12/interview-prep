from pathlib import Path

import pytest
from impl import load_impl

vm = load_impl(__file__, "vm.py")

PUSH, ADD, SUB, XOR, DUP, SWAP, POP, LOAD, OUT, JMP, JZ, HALT = range(1, 13)
CRACKME = bytes.fromhex((Path(__file__).resolve().parents[1] / "starter" / "crackme.hex").read_text())
WRONG_ANSWER = b"NO"
RIGHT_ANSWER = b"UNLOCKED"


def run(*program, inputs=()):
    return list(vm.run(bytes(program), inputs))


@pytest.mark.parametrize(
    "program, expected",
    [
        ([PUSH, 65, OUT, HALT], [65]),
        ([PUSH, 200, PUSH, 100, ADD, OUT], [44]),
        ([PUSH, 10, PUSH, 3, SUB, OUT], [7]),
        ([PUSH, 3, PUSH, 10, SUB, OUT], [249]),
        ([PUSH, 0x55, PUSH, 0xFF, XOR, OUT], [0xAA]),
        ([PUSH, 7, DUP, ADD, OUT], [14]),
        ([PUSH, 1, PUSH, 2, SWAP, SUB, OUT], [1]),
        ([PUSH, 1, PUSH, 2, POP, OUT], [1]),
    ],
    ids=["push", "add wraps at 256", "sub", "sub wraps below 0", "xor", "dup", "swap changes the order", "pop"],
)
def test_instruction(program, expected):
    assert run(*program) == expected


def test_load_reads_the_numbered_input():
    assert run(LOAD, 1, OUT, inputs=[5, 9]) == [9]


def test_jmp_skips_instructions():
    assert run(PUSH, 1, JMP, 8, PUSH, 99, OUT, HALT, PUSH, 2, OUT) == [2]


def test_jz_jumps_on_zero_and_consumes_the_value():
    assert run(PUSH, 9, PUSH, 0, JZ, 10, PUSH, 1, OUT, HALT, OUT) == [9]


def test_jz_falls_through_on_non_zero():
    assert run(PUSH, 5, JZ, 8, PUSH, 1, OUT, HALT, PUSH, 2, OUT) == [1]


def test_halt_stops_before_the_rest():
    assert run(PUSH, 1, OUT, HALT, PUSH, 2, OUT) == [1]


def test_running_off_the_end_stops_quietly():
    assert run(PUSH, 3, OUT) == [3]


def test_output_comes_back_as_bytes():
    assert vm.run(bytes([PUSH, 72, OUT, PUSH, 105, OUT])) == b"Hi"


@pytest.mark.parametrize(
    "program",
    [[ADD], [OUT], [PUSH, 1, ADD], [SWAP], [DUP], [POP], [JZ, 0]],
    ids=["add", "out", "add one operand", "swap", "dup", "pop", "jz"],
)
def test_stack_underflow_is_a_vm_error(program):
    with pytest.raises(vm.VMError):
        run(*program)


def test_unknown_opcode_is_a_vm_error():
    with pytest.raises(vm.VMError):
        run(0xFF)


def test_missing_operand_is_a_vm_error():
    with pytest.raises(vm.VMError):
        run(PUSH)


def test_missing_input_is_a_vm_error():
    with pytest.raises(vm.VMError):
        run(LOAD, 0)


def test_jump_outside_the_program_is_a_vm_error():
    with pytest.raises(vm.VMError):
        run(JMP, 200)


def test_infinite_loop_hits_the_step_limit():
    with pytest.raises(vm.VMError):
        vm.run(bytes([JMP, 0]), max_steps=1000)


def test_a_program_of_exactly_max_steps_instructions_is_fine():
    assert vm.run(bytes([PUSH, 1, POP]), max_steps=2) == b""


def test_disassemble_lists_offset_name_and_operand():
    program = bytes([PUSH, 0x2A, LOAD, 0, XOR, JZ, 8, HALT])
    assert vm.disassemble(program) == [
        "0000: PUSH 0x2a",
        "0002: LOAD 0x00",
        "0004: XOR",
        "0005: JZ 0x08",
        "0007: HALT",
    ]


def test_disassemble_does_not_read_an_operand_as_an_instruction():
    assert vm.disassemble(bytes([PUSH, HALT, HALT])) == ["0000: PUSH 0x0c", "0002: HALT"]


def test_disassemble_marks_unknown_and_cut_off_bytes_as_data():
    assert vm.disassemble(bytes([0xFF, ADD, PUSH])) == ["0000: DB 0xff", "0001: ADD", "0002: DB 0x01"]


def test_the_crackme_rejects_a_wrong_passcode():
    assert vm.run(CRACKME, [0]) == WRONG_ANSWER


def test_the_crackme_unlocks_with_the_passcode_you_recovered():
    assert vm.run(CRACKME, [vm.PASSCODE]) == RIGHT_ANSWER


def test_only_one_passcode_unlocks_the_crackme():
    unlocking = [guess for guess in range(256) if vm.run(CRACKME, [guess]) == RIGHT_ANSWER]
    assert unlocking == [vm.PASSCODE]
