---
title: Ping errors and tracert - find where the path breaks
lang: ts
minutes: 25
level: junior
roles: [support, backend]
files: [trace.ts]
sources:
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
  - https://www.rfc-editor.org/rfc/rfc792
---

## What ping really does

`ping` speaks **ICMP** (Internet Control Message Protocol). It sends an **Echo Request** and waits for an **Echo Reply**. One answer gives you three facts:

- **Reachable**: someone answered
- **Latency**: the round trip time (RTT) in milliseconds
- **Packet loss**: how many requests got no answer

Useful flags on Windows:

| Flag      | Does                              |
| --------- | --------------------------------- |
| `-t`      | keep pinging until Ctrl+C         |
| `-n 10`   | send 10 requests, not 4           |
| `-a`      | show the host name of the address |
| `-l 1000` | set the packet size in bytes      |
| `-i 5`    | set the TTL (Time To Live)        |
| `-w 8000` | wait 8000 ms for each reply       |

> **Why:** `ping -t` while you wiggle a cable or restart a router shows the exact moment the replies return.

> **Not this:** "no reply means the machine is off". A firewall can block ICMP on a healthy machine, so a silent ping proves nothing alone.

```svg Echo Request goes out, Echo Reply comes back, and the time between them is the RTT
<svg viewBox="0 0 560 150" role="img" aria-label="Echo request and echo reply between source and destination">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="30" width="110" height="90" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="75" y="80" text-anchor="middle" fill="var(--fg)">source</text>
    <rect x="430" y="30" width="110" height="90" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="485" y="80" text-anchor="middle" fill="var(--fg)">destination</text>
  </g>
  <g data-cue="request" font-family="var(--font-mono)" font-size="12">
    <path d="M130 60 L430 60" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="150" y="52" fill="var(--fg)">Echo Request</text>
  </g>
  <g data-cue="reply" font-family="var(--font-mono)" font-size="12">
    <path d="M430 100 L130 100" stroke="var(--ok)" stroke-width="3"/>
    <text x="150" y="120" fill="var(--fg)">Echo Reply</text>
  </g>
  <g data-cue="rtt" font-family="var(--font-mono)" font-size="12">
    <text x="300" y="82" text-anchor="middle" fill="var(--fg-muted)">RTT = both ways</text>
  </g>
</svg>
```

```video
id: d7Ch5-g5Nek
title: "How Ping Works: IP Packets, ARP & Ethernet Explained for Beginners"
caption: Watch one ping travel from the command to an echo reply, step by step.
```

```narrate
Ping uses the internet control message protocol. [[request]] It sends an echo request to the destination. [[reply]] A healthy destination sends back an echo reply. [[rtt]] The time for the whole trip, both ways, is the round trip time. Count the requests that never came back and you have the packet loss.
```

```quiz
q: Ping to a server gets no reply, yet users reach its website. What is the likely cause?
options:
  - The server is off
  - A firewall blocks ICMP
  - The cable is cut
  - DNS is broken
answer: 1
why: The site works, so the server is up. Many firewalls drop ICMP on purpose, which only silences ping.
```

## Four failures, four meanings

Each error text points at a different place. Read the words before you guess.

| ping says                      | It means                                     | Next step                          |
| ------------------------------ | -------------------------------------------- | ---------------------------------- |
| `Request timed out`            | no reply in 4 seconds: loss, or ICMP blocked | try `-w 8000`, ping something else |
| `Destination host unreachable` | the sender has no route to it                | check the default gateway          |
| `TTL expired in transit`       | the packet crossed more routers than its TTL | suspect a routing loop             |
| `could not find host <name>`   | the name did not turn into an IP             | a DNS problem, not a network one   |

> **Trap:** `unreachable` and `timed out` feel the same, but they are not. Unreachable is an answer ("I have no path"). Timed out is silence.

```video
id: zFxuvmOKapI
title: "Destination host unreachable vs Request timed out in Ping Command"
caption: Watch how the two ping error messages point to different causes.
```

```narrate
Read the words, not just the failure. Request timed out is silence: loss, or a firewall blocking pings. Destination host unreachable is an answer: the sender has no route, so check the default gateway. T T L expired in transit means the packet crossed too many routers, which can hint at a routing loop. And could not find host means the name never became an address, so look at D N S.
```

```quiz
q: ping 192.168.99.1 prints "Destination host unreachable" four times. What do you check?
options:
  - The firewall on the destination
  - The default gateway setting
  - The website's DNS record
  - The destination's cable
answer: 1
why: Unreachable is the sender saying it has no route to that network, so the gateway setting is the first suspect.
```

## Two more rungs for the ladder

Lesson 1 gave you four rungs. A complete ladder starts one rung lower and adds one at the top:

1. `ping 127.0.0.1` (loopback): is the TCP/IP software on this machine alive?
2. `ping` your own IP: do the network card and its driver work?
3. gateway, then a public IP: as before
4. `ping` a **remote host** by IP: does the router route out?
5. `ping` a **name**: does DNS work?

If rung 1 fails, no cable will help: the problem is inside the operating system.

> **Why:** each rung removes a whole group of suspects, so you never debug the internet when the card is dead.

```video
id: BFoPQN_CNHE
title: "IPv4 Loopback Address: Understanding 127.0.0.1 | COMPTIA A+"
caption: Watch what the loopback address tests and why it sits at the bottom of the ladder.
```

```narrate
You already climbed four rungs. Add one at the very bottom: ping the loopback address, one two seven dot zero dot zero dot one. It tests the network software inside the machine itself. If that fails, no cable or router can be the cause. Everything above it works exactly as before.
```

## tracert: where does the path break?

`ping` says **whether**. `tracert` says **where**. It lists every router (a **hop**) on the way, with three round trip times each.

It works by sending packets with TTL 1, then 2, then 3. Each router drops the packet that runs out of TTL and answers `TTL expired`, which reveals the router's address.

Add `-d` to skip turning addresses into names. It is much faster.

```svg Each hop is one router; the first big jump in time marks the slow link
<svg viewBox="0 0 560 200" role="img" aria-label="Tracert hops with round trip times">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="local">
      <rect x="20" y="80" width="90" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="65" y="104" text-anchor="middle" fill="var(--fg)">hop 1</text>
      <text x="65" y="140" text-anchor="middle" fill="var(--fg-muted)">2 ms</text>
    </g>
    <path d="M110 100 L150 100" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="silent">
      <rect x="150" y="80" width="90" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
      <text x="195" y="104" text-anchor="middle" fill="var(--fg)">hop 2</text>
      <text x="195" y="140" text-anchor="middle" fill="var(--fg-muted)">* * *</text>
    </g>
    <path d="M240 100 L280 100" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="jump">
      <rect x="280" y="80" width="90" height="40" fill="var(--primary-container)" stroke="var(--danger)" stroke-width="3"/>
      <text x="325" y="104" text-anchor="middle" fill="var(--fg)">hop 3</text>
      <text x="325" y="140" text-anchor="middle" fill="var(--danger)">124 ms</text>
    </g>
    <path d="M370 100 L410 100" stroke="var(--border)" stroke-width="2"/>
    <g data-cue="end">
      <rect x="410" y="80" width="90" height="40" fill="var(--surface-2)" stroke="var(--ok)" stroke-width="3"/>
      <text x="455" y="104" text-anchor="middle" fill="var(--fg)">target</text>
      <text x="455" y="140" text-anchor="middle" fill="var(--fg-muted)">120 ms</text>
    </g>
  </g>
</svg>
```

```video
id: up3bcBLZS74
title: "Traceroute (tracert) Explained - Network Troubleshooting"
caption: Watch how tracert lists each router and where the path stops answering.
```

```narrate
Tracert walks the path one router at a time. [[local]] Hop one is your own router, fast. [[silent]] Hop two shows stars: it did not answer, often on purpose. [[jump]] At hop three the time jumps from a few milliseconds to over a hundred. That is the slow link. [[end]] The rest stay high and the target is reached, so the slowness lives at that hop.
```

> **Why:** a time jump that stays high on every later hop marks the link to blame. The route has to cross it.

> **Not this:** reading a single `*` row as "the break". Routers often ignore these probes while still forwarding. It is a break only when every hop after it is silent too.

```quiz
q: Hop 5 shows * * * but hops 6 to 9 answer and the trace completes. What does that mean?
options:
  - Hop 5 is broken
  - Hop 5 does not answer probes but still forwards
  - The target is down
  - DNS failed
answer: 1
why: Traffic reached hop 6 through hop 5, so hop 5 forwards fine. It only ignores the probes.
```

## Your turn

This exercise is optional: press **Skip the exercise** and the lesson still counts. To do it, open `trace.ts` and write two functions.

**`classifyPing(output)`** reads ping text and returns one `PING_RESULT`. Check in this order: unknown host, TTL expired, unreachable, then the loss line.

**`analyzeTrace(output)`** reads `tracert -d` text and returns `{ hopCount, isReached, lastReplyAddress, firstSlowHop }`. A hop is slow when its average time is at least `SLOW_JUMP_MS` above the previous answering hop. `firstSlowHop` is its number, or `null`.

Run `pnpm lesson test networking/02-ping-errors-and-tracert`.

```video
id: 5n1I6476G9M
title: "Can't Connect to Internet? Here's How to Diagnose It with CMD"
caption: Watch a full diagnosis of a connection problem using ipconfig, ping and tracert.
```

```narrate
This exercise is optional. If you take it, write two functions. The first reads the text a ping printed and returns what went wrong, checking the specific messages before the loss line. The second reads a trace and reports how many hops it had, whether it reached the target, the last router that answered, and the first hop where the time jumped. Press Run my tests when ready.
```

```hint
In `classifyPing`, test `includes("could not find host")`, then `TTL expired`, then `Destination host unreachable`. Only then look at `Received = N`.
```

```hint
Match a hop line with `/^\s*(\d+)\s+(.+?)\s*$/`. Collect times with `rest.matchAll(/<?(\d+)\s*ms/g)`, and an address with `/(\d+\.\d+\.\d+\.\d+)\s*$/`.
```

```hint
Keep the previous answering hop's average in a variable. A hop with no times is skipped, and does not update it.
```
