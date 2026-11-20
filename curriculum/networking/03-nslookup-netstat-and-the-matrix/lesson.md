---
title: nslookup, netstat and the diagnosis matrix
lang: ts
minutes: 25
level: junior
roles: [support, backend]
files: [connections.ts]
sources:
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netstat
  - https://www.rfc-editor.org/rfc/rfc1035
  - https://www.rfc-editor.org/rfc/rfc9293
---

## nslookup: ask DNS directly

When `ping 8.8.8.8` works and `ping google.com` fails, the fault is DNS. `nslookup` (Name Server Lookup) asks DNS the question **by itself**, with no ping in the way.

```text
C:\> nslookup cisco.com
Server:  dns.google
Address: 8.8.8.8

Non-authoritative answer:
Name:    cisco.com
Address: 198.133.219.25
```

- **Server / Address**: the DNS server that answered, your default one
- **Non-authoritative answer**: it came from a server's cache, not from the server that owns the domain
- **Name / Address**: the name you asked about and its IPv4 address

> **Why:** one command tells you whether the name resolves at all, and which server said so.

> **Not this:** running `ipconfig /flushdns` first, on a guess. Look at the answer, then clear the cache only if it is stale.

```svg A name goes to a DNS server and an address comes back; the cache answer is "non-authoritative"
<svg viewBox="0 0 560 170" role="img" aria-label="nslookup asks a DNS server for the address of a name">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="40" width="120" height="80" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="80" y="84" text-anchor="middle" fill="var(--fg)">your PC</text>
    <rect x="420" y="40" width="120" height="80" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="480" y="84" text-anchor="middle" fill="var(--fg)">DNS 8.8.8.8</text>
  </g>
  <g data-cue="ask" font-family="var(--font-mono)" font-size="12">
    <path d="M140 66 L420 66" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="160" y="58" fill="var(--fg)">cisco.com ?</text>
  </g>
  <g data-cue="answer" font-family="var(--font-mono)" font-size="12">
    <path d="M420 100 L140 100" stroke="var(--ok)" stroke-width="3"/>
    <text x="160" y="120" fill="var(--fg)">198.133.219.25</text>
  </g>
  <g data-cue="cache" font-family="var(--font-mono)" font-size="12">
    <text x="480" y="140" text-anchor="middle" fill="var(--fg-muted)">from its cache</text>
  </g>
</svg>
```

```video
id: _xnRl0WyW-0
title: "How to Use NSLookup in Windows (for Beginners)"
caption: Watch how nslookup asks DNS for the address behind a name.
```

```narrate
Nslookup asks the name system directly. [[ask]] Your computer sends the name. [[answer]] The server answers with the address. [[cache]] If the answer came from the server's memory rather than from the owner of the domain, nslookup labels it non authoritative. That is normal, and not an error.
```

## Ask a different DNS server

Add a server at the end: `nslookup cisco.com 1.1.1.1` asks Cloudflare instead of your default.

- Same answer from both: DNS is fine, look elsewhere
- Different or no answer from yours: your default server is wrong, down or stale

Type `nslookup` alone for **interactive mode**. Then `set type=AAAA` switches the record kind, so you can run several queries without retyping the command.

> **Trap:** "Non-authoritative" does not mean "wrong". It only says the answer is cached.

```quiz
q: nslookup site.com works with 1.1.1.1 but times out on your default DNS server. What is broken?
options:
  - The website
  - Your default DNS server
  - The network card
  - The gateway
answer: 1
why: The same question gets an answer elsewhere, so the name and the network are fine. Only your default server fails.
```

```video
id: ChLR0oXj3dY
title: "Troubleshooting DNS Using NSLookup"
caption: Watch how querying a chosen DNS server helps tell a bad answer from a bad resolver.
```

```narrate
Add a second server to the end of the command to compare. If both give the same address, name lookup is healthy. If your default server is silent or different, it is the one at fault. Typing nslookup alone opens interactive mode, where you can switch the record type without retyping the command.
```

## netstat: who is talking to whom

`netstat -an` lists every connection and open port on this machine: protocol, local address, foreign address, state.

| State         | Meaning                                                    |
| ------------- | ---------------------------------------------------------- |
| `ESTABLISHED` | an active TCP conversation                                 |
| `TIME_WAIT`   | closed, waiting a moment so late packets do not get lost   |
| `LISTENING`   | a program waits for incoming connections on that port      |
| UDP rows      | no state at all: UDP keeps no connection and no acknowledgment |

```svg Read a row left to right: protocol, my side, their side, state
<svg viewBox="0 0 560 190" role="img" aria-label="netstat rows with protocol, local address, foreign address and state">
  <g font-family="var(--font-mono)" font-size="12">
    <text x="20" y="24" fill="var(--fg-muted)">Proto</text>
    <text x="90" y="24" fill="var(--fg-muted)">Local</text>
    <text x="260" y="24" fill="var(--fg-muted)">Foreign</text>
    <text x="440" y="24" fill="var(--fg-muted)">State</text>
    <path d="M20 32 L540 32" stroke="var(--border)" stroke-width="2"/>
  </g>
  <g data-cue="established" font-family="var(--font-mono)" font-size="12">
    <rect x="16" y="42" width="528" height="30" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="62" fill="var(--fg)">TCP</text>
    <text x="90" y="62" fill="var(--fg)">192.168.1.105:56789</text>
    <text x="260" y="62" fill="var(--fg)">198.133.219.25:443</text>
    <text x="440" y="62" fill="var(--fg)">ESTABLISHED</text>
  </g>
  <g data-cue="wait" font-family="var(--font-mono)" font-size="12">
    <rect x="16" y="80" width="528" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="100" fill="var(--fg)">TCP</text>
    <text x="90" y="100" fill="var(--fg)">192.168.1.105:56790</text>
    <text x="260" y="100" fill="var(--fg)">198.133.219.25:80</text>
    <text x="440" y="100" fill="var(--fg)">TIME_WAIT</text>
  </g>
  <g data-cue="listen" font-family="var(--font-mono)" font-size="12">
    <rect x="16" y="118" width="528" height="30" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="138" fill="var(--fg)">TCP</text>
    <text x="90" y="138" fill="var(--fg)">0.0.0.0:3389</text>
    <text x="260" y="138" fill="var(--fg)">0.0.0.0:0</text>
    <text x="440" y="138" fill="var(--fg)">LISTENING</text>
  </g>
  <g data-cue="udp" font-family="var(--font-mono)" font-size="12">
    <rect x="16" y="156" width="528" height="30" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="20" y="176" fill="var(--fg)">UDP</text>
    <text x="90" y="176" fill="var(--fg)">192.168.1.105:137</text>
    <text x="260" y="176" fill="var(--fg)">*:*</text>
    <text x="440" y="176" fill="var(--fg-muted)">no state</text>
  </g>
</svg>
```

```video
id: 8UZFpCQeXnM
title: "NETSTAT Command Explained"
caption: Watch how netstat lists connections and which side is talking to whom.
```

```narrate
Read each row from left to right. [[established]] The first is a live TCP conversation with a web server. [[wait]] The second has just closed and is waiting for stragglers. [[listen]] The third is a program waiting for someone to connect. [[udp]] The last is a U D P row, which has no state, because U D P keeps no connection.
```

## netstat: owner, routes, statistics

Three more switches, each answering one question:

- `netstat -b`: **which program** owns each connection (run as administrator). A program you do not know, talking out, is a malware lead
- `netstat -r`: the **routing table**. `0.0.0.0` is the default gateway. When two routes match, the **lower metric** wins
- `netstat -s`: counters per protocol: packets received, header errors, packets discarded

> **Why:** `-b` turns "something is sending data" into "chrome.exe is sending data", which is a name you can act on.

> **Not this:** judging an unknown connection by its port number alone. Any program can open any port. The owner is the evidence.

```quiz
q: A laptop reaches its own subnet but no remote network. Which command shows its routes?
options:
  - netstat -b
  - netstat -r
  - nslookup
  - ipconfig /flushdns
answer: 1
why: Reaching other networks depends on a route, usually the default gateway at 0.0.0.0. netstat -r prints the routing table.
```

```video
id: f6-HBVqFcWg
title: "How to use Netstat exe to confirm which Program uses or blocks a port"
caption: Watch how to find which program owns a connection or holds a port.
```

```narrate
Three more switches. Dash b shows which program owns each connection, which is how you catch an unknown program talking out. Dash r prints the routing table, where the zero address means the default gateway and the lower metric wins. Dash s prints counters, such as packets received and discarded.
```

## The matrix: symptom, first command

You now have the whole kit. Match the symptom to the **first** command:

| Symptom                                    | Likely cause              | First command                  |
| ------------------------------------------ | ------------------------- | ------------------------------ |
| "Limited connection", address 169.254.x.x  | DHCP failed               | `ipconfig /renew`              |
| Sites will not load, an internal IP answers | DNS failure               | `nslookup <name>`              |
| Slow, with packet loss                     | a bottleneck on the path  | `tracert`, then `ping -t`      |
| An app talks out in secret                 | unknown program           | `netstat -b`                   |
| Cannot reach remote networks               | broken routing table      | `netstat -r`                   |

> **Why:** an interviewer asking "internet is slow, what do you do?" wants one specific first step and its reason, not a list of every command.

```quiz
q: Websites do not load, but ping 8.8.8.8 works. What is the first command?
options:
  - netstat -r
  - nslookup google.com
  - ipconfig /renew
  - netstat -b
answer: 1
why: A public IP answers, so routing works. Only names fail, which points at DNS, and nslookup tests DNS alone.
```

```video
id: Z3An-33EFpk
title: "How to Use PING, IPCONFIG, TRACERT, NSLOOKUP, and NETSTAT Commands for Network Troubleshooting"
caption: Watch which command answers which symptom across the whole toolbox.
```

```narrate
Match the symptom to the first command. An address starting with one six nine dot two five four means renew it. Sites failing while a public address answers means name lookup, so use nslookup. Slow with loss means trace the path. An app talking out in secret means netstat with the owner switch. And no way to remote networks means read the routing table.
```

## Your turn

This exercise is optional: press **Skip the exercise** and the lesson still counts. To do it, open `connections.ts` and write two functions.

**`parseConnections(netstatOutput)`** reads `netstat -an` text and returns one object per connection row: `{ protocol, localPort, foreignAddress, state }`. `localPort` is a number. UDP rows have `state` set to `""`. Skip every line that is not a TCP or UDP row.

**`firstCommand(symptom)`** returns the `FIRST_COMMAND` that the matrix gives for a `SYMPTOM`.

Run `pnpm lesson test networking/03-nslookup-netstat-and-the-matrix`.

```video
id: 59umwyoOniU
title: "Network Troubleshooting using IPCONFIG, PING, TRACERT, NSLOOKUP, sfc /scannow, netstat -an, Ect."
caption: Watch the toolbox commands applied one after another to a real network problem.
```

```narrate
This exercise is optional. If you take it, write two functions. The first reads the text that netstat printed and returns one record per connection, with the protocol, the local port as a number, the foreign address and the state. The second takes a symptom and returns the first command the matrix recommends. Press Run my tests when ready.
```

```hint
Split each line on whitespace with `line.trim().split(/\s+/)`. Keep a line only if its first token is `TCP` or `UDP`.
```

```hint
The local port is the text after the **last** colon of the local address, so an IPv6 address like `[::1]:80` works too: `local.slice(local.lastIndexOf(":") + 1)`.
```

```hint
For `firstCommand`, a plain object that maps each `SYMPTOM` value to its `FIRST_COMMAND` value is clearer than an if chain.
```
