---
title: Method, tools and ethics
lang: none
minutes: 20
level: junior
roles: [backend, analyst, ai]
sources:
  - https://developer.chrome.com/docs/devtools/network/reference
  - https://developer.chrome.com/docs/devtools/javascript/reference
  - https://developer.chrome.com/docs/devtools/javascript/source-maps
  - https://docs.mitmproxy.org/stable/concepts/how-mitmproxy-works/
  - https://sourceware.org/binutils/docs/binutils/strings.html
  - https://github.com/NationalSecurityAgency/ghidra
  - https://github.com/morluto/rea
  - https://www.eff.org/issues/coders/reverse-engineering-faq
  - https://www.copyright.gov/title17/92chap12.html
  - https://cwe.mitre.org/data/definitions/798.html
---

## The method: a loop

Reverse engineering is a loop, not magic.

1. **Observe**: collect facts, change nothing
2. **Hypothesize**: guess one explanation
3. **Test**: run the cheapest experiment that could prove the guess wrong
4. **Document**: write down what worked, what failed, and why

Each turn narrows the unknown. The notes are part of the work, because you will forget by next week.

```svg Observe, hypothesize, test, document, then go round again with a better question
<svg viewBox="0 0 520 190" role="img" aria-label="The reverse engineering loop with an example">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle">
    <g data-cue="observe">
      <rect x="10" y="16" width="118" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="69" y="44" fill="var(--fg)">observe</text>
      <text x="69" y="80" fill="var(--fg-muted)" font-size="11">JS reads 2 bytes</text>
      <text x="69" y="94" fill="var(--fg-muted)" font-size="11">before the audio</text>
    </g>
    <g data-cue="hypothesize">
      <rect x="140" y="16" width="118" height="46" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="199" y="44" fill="var(--fg)">hypothesize</text>
      <text x="199" y="80" fill="var(--fg-muted)" font-size="11">a length, then</text>
      <text x="199" y="94" fill="var(--fg-muted)" font-size="11">header, then audio</text>
    </g>
    <g data-cue="test">
      <rect x="270" y="16" width="118" height="46" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="329" y="44" fill="var(--fg)">test</text>
      <text x="329" y="80" fill="var(--fg-muted)" font-size="11">parse a capture,</text>
      <text x="329" y="94" fill="var(--fg-muted)" font-size="11">compare the sizes</text>
    </g>
    <g data-cue="document">
      <rect x="400" y="16" width="110" height="46" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="455" y="44" fill="var(--fg)">document</text>
      <text x="455" y="80" fill="var(--fg-muted)" font-size="11">write down what</text>
      <text x="455" y="94" fill="var(--fg-muted)" font-size="11">worked and why</text>
    </g>
    <path d="M130 39 L138 39 M133 34 L138 39 L133 44 M260 39 L268 39 M263 34 L268 39 L263 44 M390 39 L398 39 M393 34 L398 39 L393 44" fill="none" stroke="var(--border)" stroke-width="2"/>
    <path d="M455 112 L455 140 L69 140 L69 112 M64 118 L69 111 L74 118" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="40" y="172" text-anchor="start" fill="var(--fg-muted)" font-size="11">repeat with the next question</text>
  </g>
</svg>
```

```narrate
Here is the loop, with the Edge example underneath. [[observe]] First observe: the extension's code reads two bytes before the audio. [[hypothesize]] Then guess: those bytes are a length, followed by a header and the audio. [[test]] Then test: parse a captured message and check that the sizes add up. [[document]] Then write down what worked. Then go round again with a sharper question.
```

> **Not this:** reading everything until it "clicks". You will drown. Pick one question, one guess, one test.

## Pick the layer

Start where it is cheapest. Go deeper only if the answer is not there.

```svg Four layers, cheapest first: network, page code, bytes, native code
<svg viewBox="0 0 520 215" role="img" aria-label="Reverse engineering layers and their tools">
  <g font-family="var(--font-mono)" font-size="13">
    <g data-cue="network">
      <rect x="30" y="14" width="480" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="42" y="39" fill="var(--fg)">1 network: DevTools Network, HAR, mitmproxy</text>
    </g>
    <g data-cue="code">
      <rect x="30" y="60" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="42" y="85" fill="var(--fg)">2 page code: Sources, pretty-print, source maps</text>
    </g>
    <g data-cue="bytes">
      <rect x="30" y="106" width="480" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="42" y="131" fill="var(--fg)">3 bytes: hex dump, strings, struct</text>
    </g>
    <g data-cue="native">
      <rect x="30" y="152" width="480" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="42" y="177" fill="var(--fg)">4 native code: disassembler, decompiler</text>
    </g>
    <path d="M14 18 L14 188 M8 180 L14 188 L20 180" fill="none" stroke="var(--accent-2)" stroke-width="2"/>
  </g>
</svg>
```

```narrate
Work from the outside in. [[network]] The network layer comes first. Watch the requests in DevTools, export a HAR file, or use a proxy such as mitmproxy. [[code]] If you need to know why, read the page code in the Sources panel. [[bytes]] If the data is binary, switch to a hex dump, the strings tool, and Python struct. [[native]] Only when the logic hides in a compiled file do you need a disassembler or a decompiler.
```

- **mitmproxy** sits between app and server. For HTTPS it makes certificates on the fly, so the client must **trust its certificate authority**
- **`strings`** prints readable text of 4 or more characters; `-e l` finds UTF-16 text
- **Ghidra** is an open source reverse engineering suite from the NSA, with a decompiler

> **Why:** each layer down costs more time and shows more detail. A ten minute network capture often answers the whole question.

```quiz
q: You want to know which web API an app calls. Where do you look first?
options:
  - A decompiler
  - The DevTools Network panel
  - A hex editor
answer: 1
why: Requests cannot hide from the network layer, and it is the cheapest to read.
```

## The Edge case, start to finish

```svg Five steps of the Read Aloud investigation
<svg viewBox="0 0 520 230" role="img" aria-label="Timeline of the Read Aloud investigation">
  <g font-family="var(--font-mono)" font-size="12">
    <g data-cue="dump">
      <circle cx="20" cy="26" r="11" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="31" text-anchor="middle" fill="var(--fg)">1</text>
      <text x="42" y="31" fill="var(--fg)">dump the browser's resource pack, find the extension</text>
    </g>
    <g data-cue="read">
      <circle cx="20" cy="70" r="11" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="75" text-anchor="middle" fill="var(--fg)">2</text>
      <text x="42" y="75" fill="var(--fg)">read its JS: socket address, frame reader, header names</text>
    </g>
    <g data-cue="probe">
      <circle cx="20" cy="114" r="11" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="119" text-anchor="middle" fill="var(--fg)">3</text>
      <text x="42" y="119" fill="var(--fg)">probe the live service: which headers does it check?</text>
    </g>
    <g data-cue="strings">
      <circle cx="20" cy="158" r="11" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="163" text-anchor="middle" fill="var(--fg)">4</text>
      <text x="42" y="163" fill="var(--fg)">list strings in the native file for the extra header</text>
    </g>
    <g data-cue="write">
      <circle cx="20" cy="202" r="11" fill="var(--ok)" fill-opacity="0.5" stroke="var(--border)" stroke-width="2"/>
      <text x="20" y="207" text-anchor="middle" fill="var(--fg)">5</text>
      <text x="42" y="207" fill="var(--fg)">build a client, test it, write the findings down</text>
    </g>
  </g>
</svg>
```

```narrate
This is the whole path of the Read Aloud project. [[dump]] First, dump the browser's resource pack and find the hidden extension. [[read]] Second, read its JavaScript for the socket address, the frame reader and the header names. [[probe]] Third, probe the live service, changing one header at a time, to learn what it checks. [[strings]] Fourth, list the strings in the native file to learn where one extra header comes from. [[write]] Fifth, build a client, test it, and write the findings down.
```

When Edge 155 moved to a new gateway, the old address began answering **403**. The loop simply ran again on the new JavaScript. Compare versions, then repeat.

> **Trap:** the probe table in the project records what the service checked on one day. Services change. Date your findings.

## Letting an AI assistant drive

**REA** is an open source server that lets an AI assistant call reverse engineering tools through MCP (a standard way for assistants to use tools). Static tools read files and run nothing. Runtime tools run or watch a target you chose. Every answer carries **evidence and limits**.

```svg The assistant calls static tools that read, or dynamic tools that run, and gets evidence back
<svg viewBox="0 0 520 200" role="img" aria-label="An assistant using static and dynamic analysis tools">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="assistant">
      <rect x="180" y="12" width="160" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="37" fill="var(--fg)">AI assistant</text>
    </g>
    <g data-cue="static">
      <rect x="20" y="80" width="220" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="130" y="104" fill="var(--fg)">static tools</text>
      <text x="130" y="122" fill="var(--fg-muted)">read files, run nothing</text>
      <path d="M230 54 L150 78 M156 68 L150 78 L160 76" fill="none" stroke="var(--border)" stroke-width="2"/>
    </g>
    <g data-cue="dynamic">
      <rect x="280" y="80" width="220" height="56" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="390" y="104" fill="var(--fg)">runtime tools</text>
      <text x="390" y="122" fill="var(--fg-muted)">run or watch what you chose</text>
      <path d="M290 54 L370 78 M364 68 L370 78 L360 76" fill="none" stroke="var(--border)" stroke-width="2"/>
    </g>
    <g data-cue="evidence">
      <rect x="20" y="156" width="360" height="30" fill="var(--ok)" fill-opacity="0.3" stroke="var(--border)" stroke-width="2"/>
      <text x="200" y="176" fill="var(--fg)">evidence and limits come back to you</text>
    </g>
  </g>
</svg>
```

```narrate
Look at the picture. [[assistant]] The assistant sits at the top and chooses which tool to call. [[static]] Static tools read files and run nothing, for example inspecting a JavaScript app, a retained network capture, or the functions of a native binary. [[dynamic]] Runtime tools run or watch a target that you picked, such as a page you have open. [[evidence]] Every result comes back with evidence and stated limits, so you can check the claim.
```

| You ask | The assistant calls |
|---|---|
| Which routes does this JS app use? | `analyze_javascript_application` |
| What is in this HAR or mitmproxy file? | `inspect_web_network_capture` |
| What does this native function do? | `open_binary`, `list_strings`, `procedure_pseudo_code`, `xrefs` |
| What does my open page do on a click? | `list_browser_targets`, then web observation tools |

> **Not this:** asking an assistant to explain a binary from memory. A guess sounds as sure as a fact. Make it show evidence, label what is observed, inferred or unknown, then **test** the claim yourself.

```quiz
q: An assistant says "this function checks the password" because of its name. What next?
options:
  - Trust it, the name is clear
  - Ask for the evidence and test it with an input
  - Rename the function and move on
answer: 1
why: A name is a hint, not proof. The loop still applies, so turn the claim into a test.
```

## Ethics and law basics

This is not legal advice. It is a habit list.

- Work only on what you **own** or have **written permission** to study
- Read the license and terms. Contracts can forbid reverse engineering
- The usual safe purpose is **interoperability**. In the US, section 1201(f) is a narrow exception: only for a lawfully obtained program, for that sole purpose
- Authentication handshakes can count as access controls (EFF cites a US case), so do not clone one lightly

```svg Three gates before you start: ownership, terms, purpose
<svg viewBox="0 0 520 190" role="img" aria-label="Three questions to ask before reverse engineering">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle">
    <g data-cue="own">
      <rect x="10" y="20" width="150" height="70" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="85" y="44" fill="var(--fg)">1 Do you own it,</text>
      <text x="85" y="62" fill="var(--fg)">or have permission?</text>
      <text x="85" y="110" fill="var(--danger)">no: stop</text>
    </g>
    <g data-cue="terms">
      <rect x="185" y="20" width="150" height="70" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="260" y="44" fill="var(--fg)">2 Do the license</text>
      <text x="260" y="62" fill="var(--fg)">and terms allow it?</text>
      <text x="260" y="110" fill="var(--danger)">no: stop or ask</text>
    </g>
    <g data-cue="purpose">
      <rect x="360" y="20" width="150" height="70" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="435" y="44" fill="var(--fg)">3 Clear goal: learn,</text>
      <text x="435" y="62" fill="var(--fg)">interoperate, report?</text>
      <text x="435" y="110" fill="var(--danger)">no: stop</text>
    </g>
    <path d="M162 55 L183 55 M177 49 L183 55 L177 61 M337 55 L358 55 M352 49 L358 55 L352 61" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="10" y="160" text-anchor="start" fill="var(--ok)">yes, yes, yes: go ahead and keep notes</text>
  </g>
</svg>
```

```narrate
Ask three questions before you start. [[own]] First, do you own it, or do you have permission? If not, stop. [[terms]] Second, do the license and the terms of service allow it? Some contracts forbid reverse engineering, and that is a reason to stop or to ask. [[purpose]] Third, is your goal clear: learning, interoperating, or reporting a bug? If all three are yes, go ahead and keep notes. This is not legal advice.
```

> **Why:** the Edge project shows the habit. Microsoft's extracted files are kept as evidence only, marked as not covered by the project's own license.

> **Trap:** a secret you find in a bundle is not yours to use. Found is not permitted. Report it, do not replay it (CWE-798).

## Say it in the interview

When asked "how would you work out how this app talks to its server?", say:

1. "I observe first: DevTools Network, a HAR, no changes."
2. "I read the page code from the request back to its caller."
3. "I write a guess and a cheap test, for example parse a captured message."
4. "I note what I checked and when, because services change."
5. "I only work on systems I own or may test."

This shows a method, the right layer order, and judgment. That is what the question is for.

```narrate
Here is a five line answer you can say out loud. Observe first, with the network panel and a capture. Read the page code from the request back to the function that sent it. Write down a guess and a cheap test. Record what you checked and when, because services change. And work only on systems you own or may test. It shows method, order and judgment.
```

```quiz
q: You find an API token inside a public website's bundle. May you use it to call that API?
options:
  - Yes, it is public
  - No, finding it is not permission; report it
  - Yes, if you rotate it afterwards
answer: 1
why: Being able to read a secret does not authorise you to use it. The safe path is to report it to the owner.
```
