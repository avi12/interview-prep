---
title: Binary formats and hex dumps
lang: py
minutes: 25
level: junior
roles: [backend, analyst, ai]
files: [frames.py]
sources:
  - https://docs.python.org/3/library/struct.html
  - https://developer.mozilla.org/en-US/docs/Glossary/Endianness
  - https://www.rfc-editor.org/rfc/rfc6455
  - https://pronom.nationalarchives.gov.uk/fmt/573
  - https://en.wikipedia.org/wiki/Extensible_Binary_Meta_Language
---

## Reading a hex dump

A file or a network message is a list of **bytes**, each 0 to 255, written as two hex digits. A **hex dump** shows three columns: the offset, the bytes, and the same bytes as text where they are printable.

```text
00000000  00 67 50 61 74 68 3a 61 75 64 69 6f 0d 0a 58 2d  |.gPath:audio..X-|
00000010  52 65 71 75 65 73 74 49 64 3a 30 66 33 61 39 63  |RequestId:0f3a9c|
```

Scan the right column first. Readable words (`Path:audio`) mark text. Then ask what the bytes before them mean. Tools: `xxd file`, `hexdump -C file`, `strings file`, or `data.hex()` in Python.

> **Why:** you do not need the spec to start. Words in the text column tell you where headers live, and the bytes in front tell you how they are measured.

```narrate
A hex dump has three columns. On the left, the position in the file. In the middle, every byte as two hex digits. On the right, the same bytes as characters, with dots for the ones you cannot print. Scan the right column first. Readable words show you where the text lives, and the odd bytes in front of them usually hold a length or a type.
```

## One frame: length, header, payload

The binary messages on Edge's Read Aloud WebSocket have a simple shape: a **2-byte length**, a **text header** of that many bytes, then the **audio**. This toy frame is modeled on it.

```svg A frame is a 2-byte length, then exactly that many bytes of header text, then the payload
<svg viewBox="0 0 520 190" role="img" aria-label="Layout of a length-prefixed frame">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="length">
      <rect x="10" y="30" width="70" height="60" fill="var(--accent-2)" fill-opacity="0.35" stroke="var(--border)" stroke-width="2"/>
      <text x="45" y="56" fill="var(--fg)">00 67</text>
      <text x="45" y="76" fill="var(--fg)">= 103</text>
      <text x="45" y="110" fill="var(--fg-muted)">2 bytes</text>
    </g>
    <g data-cue="header">
      <rect x="84" y="30" width="270" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="219" y="54" fill="var(--fg)">Path:audio</text>
      <text x="219" y="72" fill="var(--fg)">X-RequestId:0f3a...</text>
      <text x="219" y="110" fill="var(--fg-muted)">103 bytes of text, lines end with CR LF</text>
    </g>
    <g data-cue="payload">
      <rect x="358" y="30" width="152" height="60" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="434" y="54" fill="var(--fg)">1a 45 df a3 ...</text>
      <text x="434" y="72" fill="var(--fg-muted)">raw audio</text>
      <text x="434" y="110" fill="var(--fg-muted)">the rest</text>
    </g>
    <path d="M45 124 L45 140 L219 140 L219 124" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="132" y="162" fill="var(--fg)">length says where the header stops</text>
  </g>
</svg>
```

```narrate
Here is the frame, left to right. [[length]] The first two bytes are a number: one hundred and three. [[header]] That many bytes of plain text follow, a few name and value lines. The number is the exact distance to the end of the header. [[payload]] Everything after it is the payload, the audio itself, which can hold any byte at all.
```

> **Not this:** searching for the blank line `\r\n\r\n` to end the header. That works for **text** bodies. Audio can contain those bytes anywhere. A length prefix is exact.

## Byte order

A number bigger than 255 needs several bytes, and the question is **which comes first**. Big-endian puts the most significant byte first. Little-endian puts it last. Network protocols use big-endian (MDN, RFC).

```svg The same two bytes 01 2C read as 300 in big-endian and as 11265 in little-endian
<svg viewBox="0 0 520 170" role="img" aria-label="Two byte orders for the bytes 01 2C">
  <g font-family="var(--font-mono)" font-size="15" text-anchor="middle">
    <rect x="20" y="20" width="70" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="55" y="46" fill="var(--fg)">01</text>
    <rect x="90" y="20" width="70" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="125" y="46" fill="var(--fg)">2C</text>
    <g data-cue="big">
      <text x="20" y="96" text-anchor="start" fill="var(--ok)">big-endian    0x012C = 300</text>
    </g>
    <g data-cue="little">
      <text x="20" y="124" text-anchor="start" fill="var(--danger)">little-endian 0x2C01 = 11265</text>
    </g>
  </g>
</svg>
```

```narrate
Take the two bytes zero one and two C. [[big]] Read big-endian, the first byte is the high part, and you get three hundred. [[little]] Read little-endian, the second byte is the high part, and you get eleven thousand two hundred sixty-five. Same bytes, very different number. If a length looks absurdly large, suspect the wrong byte order first.
```

In Python's `struct`, the first character picks the order:

| Prefix | Order |
|---|---|
| `>` or `!` | big-endian (network) |
| `<` | little-endian |
| none or `@` | **native**, plus padding |

`struct.unpack_from(">H", data)` reads an unsigned 16-bit number and returns a **tuple**.

> **Trap:** always write the prefix. Without it you get your computer's order and alignment, and the code breaks on another machine.

```quiz
q: The bytes 01 2C start a message. Read as a big-endian unsigned 16-bit number, what is the length?
options:
  - 44
  - 300
  - 11265
answer: 1
why: Big-endian puts 01 first as the high byte, so the value is 1 x 256 + 44 = 300.
```

## Bytes are not characters

The header length counts **bytes**. In UTF-8 an `é` takes 2 bytes, so a header with 10 characters can be 11 bytes long.

- Slice the **bytes** first, then decode only the header
- Never decode the payload: audio is not text
- Split each header line on the **first** colon only: `X-Timestamp:12:30:45` has a value with colons
- A file's first bytes are often a **magic number**: `1a 45 df a3` starts every WebM (and Matroska) file, so this payload really is WebM-style audio

```narrate
Two habits save you here. The length counts bytes, not letters, so slice the bytes before you decode anything, and decode only the header. And split each header line at the first colon only, because values such as timestamps contain more colons. Finally, notice the first bytes of the payload. One a, forty-five, D F, A three is the magic number that begins every WebM file.
```

```quiz
q: A header is "Voice:Zoé" in UTF-8. Its length prefix, in bytes, is
options:
  - 9, one per character
  - 10, because é takes two bytes
  - 11
answer: 1
why: Voice:Zo is 8 bytes, and é is 2 bytes in UTF-8, so the header is 10 bytes long.
```

## Your turn

Open `frames.py`. `audio-frame.hex` is one real-looking frame as hex text: load it with `bytes.fromhex(text)` and look at it first.

- `parse_frame(data)`: returns `{"headers": {name: value}, "payload": bytes}`. Raise `ValueError` if `data` is shorter than the length prefix, or the header claims more bytes than exist
- `extract_audio(frames)`: given a list of frames, join the payloads of those whose `Path` header is `audio`, skipping empty ones, in order

Tests build their own frames with a different encoder, including headers with non-ASCII text and payloads with `\r\n\r\n` inside.

```hint
`struct.unpack_from(">H", data)` returns a tuple, so unpack it as `(header_length,)`. The payload starts at `2 + header_length`.
```

```hint
Slice `data[2:payload_start]`, then call `.decode("utf-8")` on that slice only. Use `line.partition(":")` to split on the first colon.
```

```hint
`extract_audio` can call `parse_frame` for each frame, skip it unless `headers.get("Path") == "audio"` and the payload is not empty, and finish with `b"".join(chunks)`.
```
