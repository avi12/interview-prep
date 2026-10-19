---
title: A toy VM and a crackme
lang: py
minutes: 35
level: junior
roles: [backend, analyst, ai]
files: [vm.py]
sources:
  - https://craftinginterpreters.com/a-virtual-machine.html
  - https://docs.python.org/3/library/dis.html
  - https://github.com/NationalSecurityAgency/ghidra
---

## A VM is a loop and a table

A **program** here is just bytes. A **virtual machine** (VM) is a small loop that runs them:

1. **Fetch** the byte at the current address
2. **Look it up** in a table: which instruction is this?
3. **Execute** it, then move on

Python works like this too: `dis` prints the bytecode CPython runs (a version-specific detail, say the docs). The same idea hides in file formats and puzzles.

For reverse engineering, the table **is** the spec you must recover. In the Edge project, one header was added by native code, so the work moved from JavaScript to bytes, strings and, for depth, a disassembler.

```svg The VM loop: fetch a byte, look it up in the table, execute it on the stack, repeat
<svg viewBox="0 0 520 190" role="img" aria-label="Fetch, look up, execute loop">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="fetch">
      <rect x="10" y="30" width="150" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="85" y="56" fill="var(--fg)">1 fetch</text>
      <text x="85" y="74" fill="var(--fg-muted)">program[address]</text>
    </g>
    <g data-cue="lookup">
      <rect x="185" y="30" width="150" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="56" fill="var(--fg)">2 look up</text>
      <text x="260" y="74" fill="var(--fg-muted)">0x01 = PUSH, 1 operand</text>
    </g>
    <g data-cue="execute">
      <rect x="360" y="30" width="150" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="435" y="56" fill="var(--fg)">3 execute</text>
      <text x="435" y="74" fill="var(--fg-muted)">change the stack</text>
    </g>
    <path d="M162 60 L183 60 M177 54 L183 60 L177 66 M337 60 L358 60 M352 54 L358 60 L352 66" fill="none" stroke="var(--border)" stroke-width="2"/>
    <path d="M435 92 L435 130 L85 130 L85 94 M79 102 L85 94 L91 102" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="260" y="156" fill="var(--fg)">repeat until HALT or the end</text>
  </g>
</svg>
```

```narrate
A virtual machine is a small loop. [[fetch]] First it fetches the byte at the current address. [[lookup]] Then it looks that byte up in a table, which says what the instruction is and how many operand bytes follow. [[execute]] Then it executes the instruction, usually by changing a stack. It repeats until it halts or runs out of bytes. If you ever meet an unknown machine, recovering that table is the whole job.
```

> **Why:** a VM has few moving parts: bytes, an address, a stack, a table. Each is small enough to hold in your head.

## A stack machine

Instructions work on a **stack**: last pushed, first popped. `PUSH 5, PUSH 3, SUB, OUT` computes `5 - 3` and prints it.

```svg PUSH 5 and PUSH 3 fill the stack, SUB replaces them with 2, OUT prints it
<svg viewBox="0 0 520 200" role="img" aria-label="Stack contents after each instruction">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <text x="50" y="26" fill="var(--fg-muted)">start</text>
    <g data-cue="pushes">
      <text x="150" y="26" fill="var(--fg)">PUSH 5</text>
      <rect x="120" y="122" width="60" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="150" y="141" fill="var(--fg)">5</text>
      <text x="250" y="26" fill="var(--fg)">PUSH 3</text>
      <rect x="220" y="122" width="60" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="250" y="141" fill="var(--fg)">5</text>
      <rect x="220" y="92" width="60" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="250" y="111" fill="var(--fg)">3</text>
    </g>
    <g data-cue="sub">
      <text x="350" y="26" fill="var(--accent-2)">SUB</text>
      <rect x="320" y="122" width="60" height="28" fill="var(--ok)" fill-opacity="0.35" stroke="var(--border)" stroke-width="2"/>
      <text x="350" y="141" fill="var(--fg)">2</text>
      <text x="350" y="172" fill="var(--fg-muted)" font-size="11">pops 3, pops 5</text>
    </g>
    <g data-cue="out">
      <text x="450" y="26" fill="var(--fg)">OUT</text>
      <text x="450" y="100" fill="var(--ok)">prints 2</text>
    </g>
    <path d="M30 152 L90 152" stroke="var(--border)" stroke-width="2"/>
  </g>
</svg>
```

```narrate
Watch the stack after each instruction. [[pushes]] Push five, then push three: the stack holds both, with three on top. [[sub]] Subtract pops the top value first, the three, then the five below it, and pushes five minus three. [[out]] Out pops the result and prints it. The order of the two pops matters, because three minus five is a different number.
```

| Byte | Name | Operand | Effect |
|---|---|---|---|
| 01 | PUSH n | 1 | push `n` |
| 02 | ADD | - | pop `b`, pop `a`, push `(a + b) & 255` |
| 03 | SUB | - | pop `b`, pop `a`, push `(a - b) & 255` |
| 04 | XOR | - | pop `b`, pop `a`, push `a ^ b` |
| 05 | DUP | - | push a copy of the top |
| 06 | SWAP | - | swap the top two |
| 07 | POP | - | drop the top |
| 08 | LOAD i | 1 | push input number `i` |
| 09 | OUT | - | pop and print one byte |
| 0A | JMP a | 1 | continue at address `a` |
| 0B | JZ a | 1 | pop; if it is 0, continue at `a` |
| 0C | HALT | - | stop |

```quiz
q: The stack holds 5 then 3 (3 on top) and SUB runs. What is pushed?
options:
  - 2
  - 254
  - 8
answer: 0
why: SUB pops the right operand first (3), then the left (5), and pushes 5 minus 3, which is 2.
```

## A disassembler is a table lookup

Walk the bytes with the **same table**: look up the name, read the operands, print a line, move on by `1 + operands`.

```text
0000: PUSH 0x05
0002: PUSH 0x03
0004: SUB
0005: OUT
0006: HALT
```

A byte that is not an opcode prints as `DB 0xNN` ("define byte", data) and the walk moves on one byte.

> **Not this:** two separate tables, one for running and one for printing. They drift. Keep **one** table; the runner and the disassembler both read it.

> **Trap:** `PUSH 0x0c` is not a `HALT`. An operand byte is data. Skip over it.

```narrate
A disassembler is the same table read the other way. Look up the byte, read as many operand bytes as the table says, print a line, and jump forward by that many. Bytes that are not in the table are shown as raw data. And be careful: an operand byte is just data. A push of twelve does not stop the machine. Keep one table that both the runner and the disassembler share.
```

## Static and dynamic analysis

| | Static | Dynamic |
|---|---|---|
| How | read it, never run it | run it, watch it |
| Tools | disassembler, `strings`, decompiler (Ghidra) | debugger, tracing, trying inputs |
| Sees | every path | only the paths you trigger |
| Risk | none | the code runs, so **sandbox it** |

Good analysts mix both: read to form a theory, run to test it. Our VM is safe because **we** wrote the interpreter. It still has a step limit, so a loop cannot hang it.

```quiz
q: You read a disassembly and spot a compare against a constant, without running anything. Which kind of analysis is that?
options:
  - Static
  - Dynamic
  - Neither
answer: 0
why: Static analysis studies the code without executing it. Dynamic analysis observes it while it runs.
```

```narrate
Static analysis means reading the code without running it. It sees every path, and it is safe, but it can be slow. Dynamic analysis means running the code and watching what happens. You see real values, but only on the paths you trigger, and the code actually executes, so it belongs in a sandbox. Strong analysts use both. Read to form a theory, then run to test it.
```

## Your turn

Open `vm.py`. The opcode table is given. Write:

- `run(program, inputs=(), max_steps=10_000)`: returns the printed bytes. Raise `VMError` for stack underflow, an unknown opcode, a missing operand, a missing input, a jump past the end of the program and for too many steps. Falling off the end stops quietly
- `disassemble(program)`: lines like `0005: JZ 0x08` (address in 4 hex digits, operand as `0x` plus 2 digits). Unknown or cut-off bytes become `0003: DB 0xff`

Then crack it. `crackme.hex` is a program that reads one input byte. Disassemble it, or run all 256 inputs. Set `PASSCODE` in `vm.py` to the byte that unlocks it.

```hint
Decode first, then execute: look up `INSTRUCTIONS[opcode]`, read the operand if there is one, move the address forward, and only then run the instruction. Jumps just overwrite the address.
```

```hint
For SUB, pop the right value first: `right = pop(); left = pop(); push(left - right)`, then mask with `& 0xFF`. Count steps in a loop and raise when they pass `max_steps`.
```

```hint
In a scratch script in the same folder, load the program with `bytes.fromhex(open("crackme.hex").read())` and print `disassemble(...)`. In the listing, find the instruction that compares against a constant just before a `JZ`, and undo whatever happens to the input before it.
```
