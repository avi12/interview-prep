---
title: The WebSocket handshake and frames
lang: ts
minutes: 25
level: junior
roles: [backend, analyst, ai]
files: [webSocket.ts]
sources:
  - https://www.rfc-editor.org/rfc/rfc6455
  - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_servers
  - https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Sec-WebSocket-Accept
  - https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
  - https://developer.chrome.com/docs/devtools/network/reference
---

## It starts as plain HTTP

HTTP is ask and answer. A **WebSocket** is a two-way channel that stays open. It begins as an ordinary `GET` that asks to **upgrade**. If the server agrees, it answers `101 Switching Protocols`, and the same connection then carries **frames**.

Edge's Read Aloud service decides at this very step. In the project's measurements, a handshake without credentials, or with a `User-Agent` that does not say Edge, is refused before one frame is sent.

```svg The client asks to upgrade, the server answers 101, then frames flow both ways
<svg viewBox="0 0 520 220" role="img" aria-label="WebSocket upgrade sequence">
  <g font-family="var(--font-mono)" font-size="12">
    <text x="70" y="22" text-anchor="middle" fill="var(--fg)">client</text>
    <text x="450" y="22" text-anchor="middle" fill="var(--fg)">server</text>
    <path d="M70 32 L70 205 M450 32 L450 205" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="request">
      <text x="260" y="62" text-anchor="middle" fill="var(--fg)">GET /chat   Upgrade: websocket</text>
      <path d="M74 70 L444 70 M436 64 L444 70 L436 76" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="260" y="88" text-anchor="middle" fill="var(--fg-muted)">Sec-WebSocket-Key: random nonce</text>
    </g>
    <g data-cue="response">
      <text x="260" y="116" text-anchor="middle" fill="var(--fg)">101 Switching Protocols</text>
      <path d="M446 124 L76 124 M84 118 L76 124 L84 130" fill="none" stroke="var(--ok)" stroke-width="2"/>
      <text x="260" y="142" text-anchor="middle" fill="var(--fg-muted)">Sec-WebSocket-Accept: hash</text>
    </g>
    <g data-cue="frames">
      <text x="260" y="170" text-anchor="middle" fill="var(--fg)">frames, in both directions</text>
      <path d="M76 180 L444 180 M84 174 L76 180 L84 186 M436 174 L444 180 L436 186" fill="none" stroke="var(--primary)" stroke-width="2"/>
    </g>
  </g>
</svg>
```

```narrate
Follow the sequence from the top. [[request]] The client sends a normal web request that asks to upgrade, and includes a random nonce called the key. [[response]] If the server agrees, it answers with status one hundred and one, and proves it understood by sending back an accept value. [[frames]] From then on, the connection carries frames in both directions. Any other status means no WebSocket.
```

> **Why:** because the handshake is plain HTTP, anything that works on HTTP works here: proxies, cookies, headers, and a 403 for the wrong caller.

## Key in, Accept out

The server must prove it speaks WebSocket. It joins the client's key with a fixed **GUID** from the RFC, hashes it with **SHA-1**, and encodes the 20-byte result in **Base64**.

```svg Accept equals Base64 of SHA-1 of the key joined with the fixed GUID
<svg viewBox="0 0 520 150" role="img" aria-label="Computation of the Sec-WebSocket-Accept value">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="join">
      <rect x="10" y="30" width="112" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="66" y="54" fill="var(--fg)">key + GUID</text>
      <text x="66" y="72" fill="var(--fg-muted)">text joined</text>
    </g>
    <g data-cue="hash">
      <rect x="146" y="30" width="112" height="56" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="202" y="54" fill="var(--fg)">SHA-1</text>
      <text x="202" y="72" fill="var(--fg-muted)">20 bytes</text>
    </g>
    <g data-cue="encode">
      <rect x="282" y="30" width="112" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="338" y="54" fill="var(--fg)">Base64</text>
      <text x="338" y="72" fill="var(--fg-muted)">28 letters</text>
    </g>
    <path d="M124 58 L144 58 M138 52 L144 58 L138 64 M260 58 L280 58 M274 52 L280 58 L274 64" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="10" y="124" text-anchor="start" fill="var(--fg)">dGhlIHNhbXBsZSBub25jZQ== gives s3pPLMBiTxaQ9kYGzzhZRbK+xOo=</text>
  </g>
</svg>
```

```narrate
Three small steps. [[join]] First, glue the key and the fixed identifier together as text. [[hash]] Second, run the SHA one hash over it, which gives twenty bytes. [[encode]] Third, write those twenty bytes in Base sixty-four. The result is the accept value. The RFC publishes a sample key and answer, so you can test your code against it.
```

> **Trap:** the hash is **not** a secret check. Anyone can compute it. It only shows the server understood WebSocket and is not a plain HTTP server echoing bytes. Real authentication is a token, a cookie, or a signed URL.

```quiz
q: Why is SHA-1 acceptable in the handshake, though it is retired for signatures?
options:
  - Nothing secret depends on it
  - It is faster than SHA-256
  - Browsers cannot compute anything else
answer: 0
why: Accept proves the server understood the upgrade request. No secret or signature relies on it, so SHA-1 weakness does not matter here.
```

## Anatomy of a frame

After the handshake, data moves in **frames**. This is the masked `Hello` from the RFC.

```svg The frame 81 85 37 fa 21 3d 7f 9f 4d 51 58 split into flags, length, masking key and masked payload
<svg viewBox="0 0 520 200" role="img" aria-label="Bytes of a masked WebSocket text frame">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <g data-cue="flags">
      <rect x="10" y="30" width="56" height="44" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="38" y="58" fill="var(--fg)">81</text>
      <text x="38" y="96" fill="var(--fg-muted)" font-size="11">FIN, text</text>
    </g>
    <g data-cue="length">
      <rect x="70" y="30" width="56" height="44" fill="var(--accent-2)" fill-opacity="0.35" stroke="var(--border)" stroke-width="2"/>
      <text x="98" y="58" fill="var(--fg)">85</text>
      <text x="98" y="96" fill="var(--fg-muted)" font-size="11">masked, 5</text>
    </g>
    <g data-cue="key">
      <rect x="132" y="30" width="144" height="44" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="204" y="58" fill="var(--fg)">37 fa 21 3d</text>
      <text x="204" y="96" fill="var(--fg-muted)" font-size="11">masking key</text>
    </g>
    <g data-cue="payload">
      <rect x="282" y="30" width="228" height="44" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="396" y="58" fill="var(--fg)">7f 9f 4d 51 58</text>
      <text x="396" y="96" fill="var(--fg-muted)" font-size="11">payload, still masked</text>
    </g>
    <text x="10" y="150" text-anchor="start" fill="var(--fg)">length byte: 0 to 125 is the length itself</text>
    <text x="10" y="170" text-anchor="start" fill="var(--fg)">126 = next 2 bytes, 127 = next 8 bytes</text>
  </g>
</svg>
```

```narrate
Read the bytes in order. [[flags]] The first byte holds the final-fragment flag and the type, here a text message. [[length]] The second byte has its top bit set, which means masked, and the rest says five bytes of payload. A value of one twenty-six or one twenty-seven would mean the real length follows in two or eight more bytes. [[key]] Next come four bytes of masking key. [[payload]] Last, the five payload bytes, still scrambled.
```

## Masking: client to server only

Every client frame is XORed with a random 4-byte key. To decode: `plain[i] = masked[i] XOR key[i % 4]`. The same step also masks. A server **must** reject unmasked client frames.

The goal is not secrecy. The key travels in the frame. It stops a hostile page from crafting bytes that a **proxy** might mistake for a cached HTTP response (RFC 6455, section 10.3). Server frames are not masked. It applies even over `wss://`.

> **Not this:** treating masking as encryption. Anyone who sees the frame also sees the key. Encryption is TLS, the `s` in `wss://`.

```narrate
Every frame from the client is scrambled with a random four byte key, using exclusive or. Doing the same step again restores the original, so decoding is the same code as encoding. This is not secrecy, because the key is inside the frame. It protects proxies in the middle from being tricked by crafted bytes. Frames from the server are never masked.
```

```quiz
q: The masking key starts 37 fa, and the first payload byte is 7f. What is the first plain byte?
options:
  - 0x48
  - 0x37
  - 0x7f
answer: 0
why: 0x7f XOR 0x37 equals 0x48, the letter H of Hello.
```

## Your turn

Open `webSocket.ts` and write two functions.

- `computeAccept(key)`: the `Sec-WebSocket-Accept` for a `Sec-WebSocket-Key`. Use `node:crypto`
- `unmaskFrame(frame)`: takes a whole client frame as `Uint8Array`, returns `{ isFinal, opcode, payload }` with the **unmasked** payload. Support the 7-bit, 16-bit and 64-bit length forms. Throw if the frame is not masked or is shorter than its header says. Do not change the input

```hint
`createHash("sha1").update(key + GUID).digest("base64")` is the whole of computeAccept.
```

```hint
Byte 0: `& 0x80` is FIN, `& 0x0f` is the opcode. Byte 1: `& 0x80` is the mask bit, `& 0x7f` is the length code. For 126 read a big-endian 16-bit number at offset 2 with `DataView`.
```

```hint
The masking key starts right after the length field and is 4 bytes. The payload follows it. Build the result with `subarray(...).map((byte, index) => byte ^ key[index % 4])`, which makes a new array.
```
