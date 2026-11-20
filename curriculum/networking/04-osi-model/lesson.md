---
title: The OSI model - seven layers to isolate a fault
lang: none
minutes: 25
level: junior
roles: [support, backend]
files: []
sources:
  - https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/
  - https://www.iso.org/standard/20269.html
  - https://learn.microsoft.com/en-us/windows-hardware/drivers/network/windows-network-architecture-and-the-osi-model
---

## One shared language

Before 1977, makers such as IBM and Digital built **closed** protocols. Their machines could not talk to each other. The standards body ISO published the **OSI** model (Open Systems Interconnection) as a common language, so equipment from different makers works together.

OSI splits network communication into **7 layers**. Each layer has one job and talks only to its neighbours.

> **Why:** layers let you change or debug one part without touching the rest, and they give engineers exact words: "that is a layer 2 problem".

> **Not this:** thinking every real network runs OSI. Most run **TCP/IP**. OSI is a teaching and troubleshooting map, not the wiring.

```svg Seven layers, top to bottom. Data names change on the way down
<svg viewBox="0 0 560 250" role="img" aria-label="The seven OSI layers with data units">
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="top"><rect x="20" y="8" width="340" height="30" fill="var(--primary-container)"/><text x="30" y="28" stroke="none">7 Application</text><text x="380" y="28" stroke="none">data</text></g>
    <g><rect x="20" y="40" width="340" height="30" fill="var(--primary-container)"/><text x="30" y="60" stroke="none">6 Presentation</text><text x="380" y="60" stroke="none">data</text></g>
    <g><rect x="20" y="72" width="340" height="30" fill="var(--primary-container)"/><text x="30" y="92" stroke="none">5 Session</text><text x="380" y="92" stroke="none">data</text></g>
    <g data-cue="transport"><rect x="20" y="104" width="340" height="30" fill="var(--surface-3)"/><text x="30" y="124" stroke="none">4 Transport</text><text x="380" y="124" stroke="none">segments</text></g>
    <g data-cue="network"><rect x="20" y="136" width="340" height="30" fill="var(--surface-3)"/><text x="30" y="156" stroke="none">3 Network</text><text x="380" y="156" stroke="none">packets</text></g>
    <g data-cue="datalink"><rect x="20" y="168" width="340" height="30" fill="var(--surface-2)"/><text x="30" y="188" stroke="none">2 Data Link</text><text x="380" y="188" stroke="none">frames</text></g>
    <g data-cue="physical"><rect x="20" y="200" width="340" height="30" fill="var(--surface-2)"/><text x="30" y="220" stroke="none">1 Physical</text><text x="380" y="220" stroke="none">bits</text></g>
  </g>
</svg>
```

```video
id: AYgXr1dynKU
title: "Understanding the OSI Model - CompTIA Network+ N10-009 - 1.1"
caption: Watch a plain walk through the seven OSI layers.
```

```narrate
[[top]] The top three layers, application, presentation and session, all work with plain data. [[transport]] Layer four, transport, cuts data into segments. [[network]] Layer three, network, builds packets. [[datalink]] Layer two, data link, builds frames. [[physical]] Layer one, physical, sends bits. A memory trick is to read from the bottom: please do not throw sausage pizza away.
```

```quiz
q: What is the data unit at layer 3?
options:
  - Bit
  - Frame
  - Packet
  - Segment
answer: 2
why: Layer 3 builds packets. Layer 4 has segments, layer 2 frames and layer 1 bits.
```

## Layers 7 to 5: what the software sees

- **7 Application**: the window to the network for programs such as a browser or e-mail. Protocols: HTTP, DNS, SMTP, FTP, Telnet.
- **6 Presentation**: the translator. It converts formats (text, JPEG), **encrypts** (TLS) and **compresses**, so both sides understand the data.
- **5 Session**: the conversation manager. It opens, keeps and closes a conversation, and can **resume** from a checkpoint after a drop.

> **Trap:** "HTTPS is layer 7". The protocol is application layer, but the encryption that protects it is a presentation job, and real TCP/IP blends these three layers.

```svg Three layers, three jobs: talk, translate, keep the conversation
<svg viewBox="0 0 560 130" role="img" aria-label="Application, presentation, session jobs">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="app"><rect x="10" y="30" width="170" height="70" fill="var(--primary-container)"/><text x="95" y="60" stroke="none">7 application</text><text x="95" y="82" stroke="none">HTTP, DNS, SMTP</text></g>
    <g data-cue="pres"><rect x="195" y="30" width="170" height="70" fill="var(--primary-container)"/><text x="280" y="60" stroke="none">6 presentation</text><text x="280" y="82" stroke="none">format, TLS, zip</text></g>
    <g data-cue="sess"><rect x="380" y="30" width="170" height="70" fill="var(--primary-container)"/><text x="465" y="60" stroke="none">5 session</text><text x="465" y="82" stroke="none">open, resume, close</text></g>
  </g>
</svg>
```

```video
id: OhrOv9z2iyc
title: "OSI layer 5 6 7 ver 1"
caption: Watch what the application, presentation and session layers do.
```

```narrate
[[app]] The application layer is where programs reach the network, with protocols like H T T P and D N S. [[pres]] The presentation layer translates formats, encrypts and compresses. [[sess]] The session layer opens a conversation, keeps it going, and can resume it after a break.
```

```quiz
q: Which layer handles encryption and compression in the OSI model?
options:
  - Session
  - Presentation
  - Transport
  - Network
answer: 1
why: Presentation prepares the data for both sides, in format, encryption and compression.
```

## Layer 4: transport, TCP and UDP

The transport layer delivers data **end to end** and splits it into **segments**. It uses **ports** to find the right program on the target machine.

| | TCP | UDP |
| - | --- | --- |
| Style | reliable | fast |
| Checks | acknowledges, fixes errors, keeps order | no checks, "fire and forget" |
| Used for | web, e-mail, file transfer | video calls, games, DNS lookups |

Well-known ports: HTTP **80**, HTTPS **443**.

> **Why:** when a page loads but a call stutters, the protocol choice explains it. TCP waits for lost data, UDP skips it.

> **Not this:** "UDP is bad". It is the right choice when speed beats perfection.

```svg TCP confirms each delivery, UDP just sends
<svg viewBox="0 0 560 150" role="img" aria-label="TCP with acknowledgement and UDP without">
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="tcp"><rect x="20" y="25" width="250" height="40" fill="var(--primary-container)"/><text x="30" y="50" stroke="none">TCP: send, then ack</text><path d="M240 40 L270 40" stroke="var(--ok)"/></g>
    <g data-cue="udp"><rect x="20" y="85" width="250" height="40" fill="var(--surface-3)"/><text x="30" y="110" stroke="none">UDP: send, no ack</text></g>
    <g data-cue="ports"><rect x="310" y="25" width="230" height="100" fill="var(--surface-2)"/><text x="325" y="60" stroke="none">port 80 = HTTP</text><text x="325" y="90" stroke="none">port 443 = HTTPS</text></g>
  </g>
</svg>
```

```video
id: TnGmkn_xOW8
title: "TCP vs UDP"
caption: Watch the difference between TCP and UDP.
```

```narrate
Layer four moves data end to end. [[tcp]] TCP is reliable: it confirms each delivery, repairs errors and keeps order. [[udp]] UDP is fast but makes no promises, which suits calls and games. [[ports]] Port numbers point to the right program, such as eighty for H T T P and four four three for H T T P S.
```

```quiz
q: A video call can tolerate a few lost packets but not delay. Which protocol fits?
options:
  - TCP
  - UDP
  - FTP
  - SMTP
answer: 1
why: UDP skips acknowledgements, so there is no waiting for lost data.
```

## Layers 3 and 2: packets and frames

**Layer 3, network**: **logical** addresses (IP) and **routing** between networks. The device is the **router**. It checks the destination IP in its **routing table**, picks the most specific match (**longest prefix match**) and sends the packet to the **next hop**. A router does not pass broadcasts, so each of its networks is a separate **broadcast domain**.

**Layer 2, data link**: **physical** addresses (MAC) inside one local network. The device is the **switch**. It learns which MAC sits on which port and keeps a **MAC table**: known address, send only there. Unknown, **flood** to all ports. Each port is a separate **collision domain**. Lesson 1 covered MAC and ARP.

> **Why:** the router and the switch are different because they read different addresses: IP for the world, MAC for the room.

```svg The switch reads MACs inside the network. The router reads IPs between networks
<svg viewBox="0 0 560 150" role="img" aria-label="Switch at layer 2 and router at layer 3">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="switch"><rect x="20" y="40" width="220" height="70" fill="var(--surface-3)"/><text x="130" y="70" stroke="none">SWITCH, layer 2</text><text x="130" y="92" stroke="none">MAC table, frames</text></g>
    <g data-cue="router"><rect x="320" y="40" width="220" height="70" fill="var(--primary-container)"/><text x="430" y="70" stroke="none">ROUTER, layer 3</text><text x="430" y="92" stroke="none">routing table, packets</text></g>
  </g>
  <path d="M240 75 L320 75" stroke="var(--fg)" stroke-width="2" fill="none"/>
</svg>
```

```video
id: Be6-RR86hNY
title: "How Switches learn MAC addresses and forward frames | Switching Methods and Types"
caption: Watch how a switch learns MAC addresses and forwards frames to the right port.
```

```narrate
[[switch]] A switch works at layer two. It reads MAC addresses, remembers which port each one is on, and sends frames only where needed. [[router]] A router works at layer three. It reads the destination I P address, finds the most specific match in its routing table, and passes the packet to the next hop.
```

```quiz
q: Which device keeps a MAC address table?
options:
  - Hub
  - Switch
  - Router
  - Repeater
answer: 1
why: A switch learns MAC addresses per port. A router uses IP routes. A hub has no logic.
```

## Layer 1 and the hardware ladder

**Layer 1, physical** moves **bits** as electricity, light or radio.

- **Hub**: a "dumb" box that repeats every signal to every port. One shared collision domain.
- **Repeater**: boosts a weak signal to extend the distance.

| | Hub | Switch | Router |
| - | --- | ------ | ------ |
| Layer | 1 | 2 | 3 |
| Decides by | nothing, floods | MAC address | IP address |
| Collision domains | one | one per port | one per port |
| Passes broadcasts | yes | yes | no |

> **Trap:** calling a switch a hub. A hub makes collisions common. A switch removes most of them.

```svg Each device lives on a layer. Higher layer means smarter
<svg viewBox="0 0 560 150" role="img" aria-label="Hub, switch, router by layer">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="hub"><rect x="10" y="40" width="170" height="70" fill="var(--surface-2)"/><text x="95" y="70" stroke="none">HUB, layer 1</text><text x="95" y="92" stroke="none">repeats to all</text></g>
    <g data-cue="sw"><rect x="195" y="40" width="170" height="70" fill="var(--surface-3)"/><text x="280" y="70" stroke="none">SWITCH, layer 2</text><text x="280" y="92" stroke="none">by MAC</text></g>
    <g data-cue="rt"><rect x="380" y="40" width="170" height="70" fill="var(--primary-container)"/><text x="465" y="70" stroke="none">ROUTER, layer 3</text><text x="465" y="92" stroke="none">by IP</text></g>
  </g>
</svg>
```

```video
id: 1z0ULvg_pW8
title: "Hub, Switch, & Router Explained - What's the difference?"
caption: Watch the difference between a hub, a switch and a router.
```

```narrate
[[hub]] A hub is layer one. It repeats every signal to every port, with no thinking. [[sw]] A switch is layer two and forwards by MAC address. [[rt]] A router is layer three and forwards by I P address, and it also stops broadcasts from spreading. Higher layer, smarter device.
```

```quiz
q: Which device does NOT forward broadcasts to other networks?
options:
  - Hub
  - Switch
  - Router
  - Repeater
answer: 2
why: A router separates broadcast domains, so broadcasts stay inside their own network.
```

## Use the layers to find a fault

Send: each layer **adds a header** and passes the data down. Receive: each layer **reads its header** and passes clean data up. So a fault can be pinned to **one layer**.

| Symptom | Layer to suspect | Check |
| ------- | ---------------- | ----- |
| No link light, unplugged cable | 1 physical | cable, port, card |
| Link up, no local contact | 2 data link | switch port, VLAN, MAC |
| Cannot reach another network | 3 network | IP, gateway, `ping`, `tracert` |
| Reached, but the service refuses | 4 transport | port blocked, `netstat` |
| Everything reaches, the page fails | 7 application | DNS, browser, `nslookup` |

Work **bottom up**: the ping ladder of lesson 1 is exactly this, one layer at a time.

> **Why:** each answer removes a whole layer of suspects, so you never debug the web server while the cable is out.

> **Not this:** starting at the top with "reinstall the browser" when the real cause is a loose cable.

```svg Start at layer 1 and climb until something fails
<svg viewBox="0 0 560 150" role="img" aria-label="Bottom up troubleshooting">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="cable"><rect x="10" y="40" width="120" height="60" fill="var(--surface-2)"/><text x="70" y="75" stroke="none">1 cable?</text></g>
    <g data-cue="ip"><rect x="150" y="40" width="120" height="60" fill="var(--surface-3)"/><text x="210" y="75" stroke="none">3 IP, ping?</text></g>
    <g data-cue="port"><rect x="290" y="40" width="120" height="60" fill="var(--surface-3)"/><text x="350" y="75" stroke="none">4 port open?</text></g>
    <g data-cue="app2"><rect x="430" y="40" width="120" height="60" fill="var(--primary-container)"/><text x="490" y="75" stroke="none">7 DNS, app?</text></g>
  </g>
  <g stroke="var(--fg)" stroke-width="2" fill="none"><path d="M130 70 L150 70"/><path d="M270 70 L290 70"/><path d="M410 70 L430 70"/></g>
</svg>
```

```video
id: kdFOCleUkVE
title: "Troubleshooting With the OSI Model"
caption: Watch how the OSI layers guide network troubleshooting.
```

```narrate
Climb from the bottom. [[cable]] First the cable and the link light. [[ip]] Then the I P address and a ping. [[port]] Then check whether the port is open. [[app2]] Last, D N S and the application. The first layer that fails is where your fault lives.
```

```quiz
q: A ping to the gateway fails and the cable is plugged in. Which layer do you check next?
options:
  - Layer 7
  - Layers 2 and 3 (switch port, IP settings, gateway)
  - Layer 6
  - Layer 5
answer: 1
why: The cable is fine, so look at local delivery and addressing before you blame an application.
```
