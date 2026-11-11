---
title: How a device is identified on a network
lang: ts
minutes: 25
level: junior
roles: [support, backend]
files: [network.ts]
sources:
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/hostname
  - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
  - https://www.rfc-editor.org/rfc/rfc2131
  - https://www.rfc-editor.org/rfc/rfc3927
  - https://www.rfc-editor.org/rfc/rfc826
---

## Three names for one device

Every device on a network carries three identities:

- **Host name**: a name for people, like `DESK-07`. Set at install, can be renamed. See it with `hostname`
- **IP address**: where the device sits on the network, four numbers from 0 to 255, like `10.13.2.17`. It can change. See it with `ipconfig`
- **MAC address**: the physical address burned into the network card (NIC, Network Interface Card), like `00-1A-2B-3C-4D-5E`. See it with `ipconfig /all`

A computer with two network cards has two IPs and two MACs, but one host name.

```svg One device, three identities: a name for people, an IP for routing, a MAC for the local wire
<svg viewBox="0 0 560 170" role="img" aria-label="Host name, IP address and MAC address of one device">
  <rect x="20" y="20" width="160" height="130" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
  <text x="100" y="140" text-anchor="middle" font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">one computer</text>
  <g data-cue="name" font-family="var(--font-mono)" font-size="13">
    <rect x="40" y="30" width="120" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="100" y="49" text-anchor="middle" fill="var(--fg)">DESK-07</text>
    <path d="M160 44 L230 44" stroke="var(--fg)" stroke-width="2"/>
    <text x="240" y="49" fill="var(--fg)">host name: for people</text>
  </g>
  <g data-cue="ip" font-family="var(--font-mono)" font-size="13">
    <rect x="40" y="66" width="120" height="28" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="100" y="85" text-anchor="middle" fill="var(--fg)">10.13.2.17</text>
    <path d="M160 80 L230 80" stroke="var(--fg)" stroke-width="2"/>
    <text x="240" y="85" fill="var(--fg)">IP: where it is, can change</text>
  </g>
  <g data-cue="mac" font-family="var(--font-mono)" font-size="13">
    <rect x="40" y="102" width="120" height="28" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
    <text x="100" y="121" text-anchor="middle" fill="var(--fg)">00-1A-2B-...</text>
    <path d="M160 116 L230 116" stroke="var(--fg)" stroke-width="2"/>
    <text x="240" y="121" fill="var(--fg)">MAC: the card, fixed</text>
  </g>
</svg>
```

```narrate
One computer, three identities. [[name]] First the host name, a label for people, which you can rename. [[ip]] Next the I P address, which says where the device sits on the network and can change when it moves. [[mac]] Last the M A C address, the media access control address, burned into the network card by its maker.
```

## How the IP arrives: DHCP or static

Most devices get their IP **automatically** from a **DHCP** server (Dynamic Host Configuration Protocol). In four messages:

1. **Discover**: the device shouts "any DHCP server?"
2. **Offer**: a server offers a free address
3. **Request**: the device asks for it
4. **Acknowledge**: the server lends it for a time (a **lease**)

`ipconfig /all` shows `DHCP Enabled` and the `DHCP Server`.

A **static** IP is typed in by hand (Settings, Network and internet, IP assignment). Use it for printers and servers others must always find.

> **Why:** DHCP keeps one list of who has what, so it never hands out an address twice.

> **Not this:** static IPs on every laptop. Two people type the same address, both lose the network, and nobody knows which one is wrong.

```narrate
Most devices get their address automatically from a dynamic host configuration protocol server. The device shouts a discover message, a server offers a free address, the device requests it, and the server acknowledges and lends it for a while. A static address is typed in by hand, which suits printers and servers. Doing it on every laptop invites two machines with the same address.
```

## No DHCP server? 169.254

If a device is set to automatic but no DHCP server answers, Windows gives itself an address with **APIPA** (Automatic Private IP Addressing) from **169.254.0.0/16**. It checks the address is free with a local broadcast, and tries another if it is taken.

An APIPA device can talk to other APIPA devices on the same local network, but **not** to the router, the internet or other networks. `ipconfig /all` shows it as `Autoconfiguration IPv4 Address`.

> **Trap:** `169.254.x.x` does not mean "the internet is down". It means **this device never got a lease**. Check the cable, the Wi-Fi, and whether the DHCP server is up, before anything else.

```narrate
If a device is set to automatic but no server answers, Windows gives itself an address starting with one six nine dot two five four. This is called automatic private I P addressing. It works only with neighbors on the same local network, never the router or the internet. When you see that prefix, the device never got a lease, so check the cable and the server first.
```

## MAC addresses and ARP

On the local network, data travels in **frames** addressed to a MAC. The card reads each frame's destination MAC. If it matches its own, it passes the data up to the higher layers. If not, it ignores it.

But programs only know the **IP**. **ARP** (Address Resolution Protocol) bridges the gap:

```svg ARP: ask everyone who has the IP, only the owner answers with its MAC
<svg viewBox="0 0 560 180" role="img" aria-label="ARP request broadcast and reply">
  <g font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="70" width="110" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="75" y="95" text-anchor="middle" fill="var(--fg)">PC .17</text>
    <rect x="420" y="20" width="120" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="480" y="43" text-anchor="middle" fill="var(--fg)">printer .40</text>
    <rect x="420" y="72" width="120" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="480" y="95" text-anchor="middle" fill="var(--fg)">router .254</text>
    <rect x="420" y="124" width="120" height="36" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="480" y="147" text-anchor="middle" fill="var(--fg)">laptop .52</text>
  </g>
  <g data-cue="ask" font-family="var(--font-mono)" font-size="12">
    <path d="M130 84 L420 38 M130 88 L420 88 M130 92 L420 140" fill="none" stroke="var(--accent-2)" stroke-width="2" stroke-dasharray="6 4"/>
    <text x="150" y="60" fill="var(--fg)">who has .254?</text>
  </g>
  <g data-cue="reply" font-family="var(--font-mono)" font-size="12">
    <path d="M420 100 L130 100" stroke="var(--ok)" stroke-width="3"/>
    <text x="180" y="118" fill="var(--fg)">.254 is at 00-50-56-AB-01-02</text>
  </g>
</svg>
```

```narrate
The P C wants to reach the router but only knows its I P. [[ask]] So it broadcasts an address resolution protocol question to everyone on the local network: who has this address? [[reply]] Only the router answers, with its M A C address. The P C remembers the answer and sends the frames straight to that card.
```

```quiz
q: Which command shows a computer's MAC address on Windows?
options:
  - hostname
  - ipconfig
  - ipconfig /all
  - ping
answer: 2
why: Plain ipconfig shows IP, mask and gateway; only /all adds the Physical Address and DHCP details.
```

## The ping ladder

`ping` sends small packets and waits for a reply. Climb outward, one rung at a time, and the **first rung that fails** tells you where the fault is:

1. Do I have a real address? (`ipconfig`, no `169.254`)
2. `ping` the **default gateway** (the router): is the local network OK?
3. `ping 8.8.8.8`, a public IP: does traffic leave the building?
4. `ping google.com`, a name: does name lookup (DNS) work?

```svg Climb outward; the first rung without a reply is where the fault lives
<svg viewBox="0 0 560 190" role="img" aria-label="Ping ladder from local address to public name">
  <g data-cue="address" font-family="var(--font-mono)" font-size="13">
    <rect x="20" y="140" width="240" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="162" fill="var(--fg)">1. own address, not 169.254</text>
  </g>
  <g data-cue="gateway" font-family="var(--font-mono)" font-size="13">
    <rect x="60" y="100" width="240" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="70" y="122" fill="var(--fg)">2. ping default gateway</text>
    <text x="320" y="122" fill="var(--fg-muted)">fails: local network</text>
  </g>
  <g data-cue="public" font-family="var(--font-mono)" font-size="13">
    <rect x="100" y="60" width="240" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="110" y="82" fill="var(--fg)">3. ping 8.8.8.8</text>
    <text x="360" y="82" fill="var(--fg-muted)">fails: router or ISP</text>
  </g>
  <g data-cue="dns" font-family="var(--font-mono)" font-size="13">
    <rect x="140" y="20" width="240" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="150" y="42" fill="var(--fg)">4. ping google.com</text>
    <text x="400" y="42" fill="var(--fg-muted)">fails: DNS</text>
  </g>
</svg>
```

```narrate
Climb from the bottom. [[address]] First, does the device have a real address and not one six nine dot two five four? [[gateway]] Next, ping the default gateway. No reply means the local network or cable. [[public]] Then ping a public address like eight dot eight dot eight dot eight. No reply means the router or the internet provider. [[dns]] Finally ping a name like google dot com. If only that fails, name lookup is broken.
```

```quiz
q: The gateway replies to ping but google.com does not. Where is the fault?
options:
  - The network card
  - The local cable
  - Past the router, or in name lookup
  - The DHCP server
answer: 2
why: The local network works, so the fault is further out; pinging a public IP like 8.8.8.8 splits internet from DNS.
```

## Practice: diagnose the desk

```quiz
q: ipconfig shows 169.254.31.8 on a laptop that worked yesterday. What do you check first?
options:
  - Replace the network card
  - Whether the cable, Wi-Fi and DHCP server are working
  - Type a static IP on the laptop
  - Ping google.com
answer: 1
why: That prefix means no DHCP server answered, so the device never got a lease. Fix the path to the server before anything else.
```

```quiz
q: A device has a real IP and the gateway replies, but ping 8.8.8.8 gets no reply. Where does the fault live?
options:
  - The device's network card
  - The local cable
  - The router's link to the internet provider
  - DNS
answer: 2
why: The local network works, and a public IP needs no name lookup, so the fault is past the router, in its link out or at the provider.
```

```quiz
q: Two printers lose the network after someone types the same static IP into both. What prevents this at scale?
options:
  - Longer cables
  - A DHCP server, or a reservation for each printer
  - Renaming the host names
  - Changing the MAC addresses
answer: 1
why: DHCP keeps one list of who holds each address, so it never lends the same one twice.
```

```narrate
Test yourself on the ladder. Read each symptom, then decide which rung failed first: the address, the gateway, a public address, or the name. Say your reasoning out loud, the way you would in an interview.
```

## Your turn

This one is a tangent, and it is worth doing if you want to feel how the ladder works. Open `network.ts`. Write two functions.

**`readAdapter(ipconfigOutput)`** reads `ipconfig /all` text and returns `{ hostName, ipv4, mac, gateway, isDhcpEnabled }` for the **active** adapter: the first one that has an IPv4 line (`IPv4 Address` or `Autoconfiguration IPv4 Address`). Drop `(Preferred)`. Missing values are `""`.

**`diagnose({ adapter, pings })`** walks the ping ladder and returns one `VERDICT`. `pings` says which rungs got a reply.

Run `pnpm lesson test networking/01-how-a-device-is-identified`.

```narrate
This last part is a tangent, and it is optional in spirit. Write two functions. The first reads the output of the network adapter listing and returns the host name, address, hardware address, gateway and whether automatic addressing is on, for the active adapter. The second walks the ping ladder and returns one verdict. Press Run my tests when you are ready.
```

```hint
Split into lines. A line that does not start with a space is a section header. Every other line looks like `   Key . . . . : value`.
```

```hint
This regex splits a value line: `/^\s+(\S.*?)[ .]*:\s*(.*)$/`. Group 1 is the key, group 2 the value. Remember the host name lives in the first section, the adapters come after.
```

```hint
In `diagnose`, check in ladder order with early returns: no IPv4, then `169.254.`, then gateway, public address, public name. The APIPA check must come before the gateway check.
```
