---
title: Talking with customers
lang: none
minutes: 25
level: junior
roles: [support]
files: []
sources:
  - https://www.skillsyouneed.com/ips/active-listening.html
  - https://en.wikipedia.org/wiki/Active_listening
  - https://www.atlassian.com/itsm/service-request-management
---

## Support is half technical, half human

A call has two problems to solve: the **machine** and the **person**. You fix the machine with knowledge. You fix the person with communication. Both are tested in a junior interview.

Start every call with the **personal model**:

- **Know**: greet the customer by name at the start
- **Connect**: a little small talk, a shared detail (a barking dog in the background), and **empathy**: "I understand how frustrating this is"
- **Understand**: find the customer's level, then match your language to it

```svg Know, connect, understand: three moves that turn a stranger into a partner
<svg viewBox="0 0 560 150" role="img" aria-label="Personal model: know, connect, understand">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle" fill="var(--fg)">
    <g data-cue="know">
      <rect x="10" y="30" width="150" height="70" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="85" y="58" font-weight="700">KNOW</text>
      <text x="85" y="80">use their name</text>
    </g>
    <g data-cue="connect">
      <rect x="205" y="30" width="150" height="70" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="280" y="58" font-weight="700">CONNECT</text>
      <text x="280" y="80">small talk + empathy</text>
    </g>
    <g data-cue="understand">
      <rect x="400" y="30" width="150" height="70" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="475" y="58" font-weight="700">UNDERSTAND</text>
      <text x="475" y="80">match their level</text>
    </g>
  </g>
  <g stroke="var(--fg)" stroke-width="2" fill="none">
    <path d="M160 65 L205 65"/>
    <path d="M355 65 L400 65"/>
  </g>
  <circle class="pkt" cx="160" cy="65" r="6" fill="var(--accent-2)" style="--dx: 45px; --delay: 0ms"/>
  <circle class="pkt" cx="355" cy="65" r="6" fill="var(--primary)" style="--dx: 45px; --delay: 2000ms"/>
</svg>
```

```narrate
[[know]] First, know the customer: use their name right at the start. [[connect]] Second, connect. A little small talk and a sentence of empathy, like I understand how frustrating this is, turn a stranger into a partner. [[understand]] Third, understand their level, and match your language to it.
```

> **Why:** a customer who feels heard follows your instructions calmly. A tense one skips steps and breaks things.

```quiz
q: A customer opens with "my laptop died right before a deadline". What is the best first reply?
options:
  - "What is your ticket number?"
  - "I understand how stressful that is, let's get it working. Can I have your name?"
  - "Have you tried turning it off and on?"
  - "That is not my department."
answer: 1
why: "Empathy first, then the name: it connects with the person before touching the machine."
```

## Open questions, then closed questions

You cannot fix what you cannot see, so you ask. Two kinds, always in this order:

| Kind | Goal | Example |
| --- | --- | --- |
| **Open** | the whole story, in their words | "What happens when you try to print?" |
| **Closed** | exact facts, one word answers | "Does it fail on every computer?" |

```svg Start wide with open questions, then narrow to facts with closed ones
<svg viewBox="0 0 560 170" role="img" aria-label="Funnel from open to closed questions">
  <g data-cue="open">
    <path d="M10 20 L300 55 L300 115 L10 150 Z" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="30" y="75" font-family="var(--font-mono)" font-size="13" fill="var(--fg)">OPEN: "What happens?"</text>
    <text x="30" y="98" font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">the story</text>
  </g>
  <g data-cue="closed">
    <path d="M300 55 L550 70 L550 100 L300 115 Z" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
    <text x="316" y="82" font-family="var(--font-mono)" font-size="13" fill="var(--fg)">CLOSED: yes / no</text>
    <text x="316" y="100" font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">the facts</text>
  </g>
  <circle class="pkt" cx="40" cy="60" r="6" fill="var(--accent-2)" style="--dx: 260px; --dy: 25px; --delay: 0ms"/>
  <circle class="pkt" cx="40" cy="110" r="6" fill="var(--primary)" style="--dx: 260px; --dy: -10px; --delay: 1500ms"/>
</svg>
```

```narrate
[[open]] Start wide. Open questions let the customer describe the problem in their own words, and you get the story. [[closed]] Then narrow down. Closed questions need a short answer, yes or no, and give you exact facts. Open first, closed second.
```

> **Not this:** firing closed questions from the first second. You steer the customer down your guess and miss what they know. Let them tell the story first.

```quiz
q: Which one is a closed question?
options:
  - "Can you describe what you see on the screen?"
  - "What were you doing when it froze?"
  - "Is the error shown on every website, or only one?"
  - "Tell me how this started."
answer: 2
why: It can be answered with a short fact, "every" or "one". The others invite a story.
```

## Six steps of diagnosis

Ask questions in a fixed order. It is a roadmap, so nothing is skipped under pressure:

1. **Scope**: how wide is it? One user or all? One device?
2. **Essence**: what exactly is the fault? What are they trying to do?
3. **Elimination**: what **does** work, and what does not? That isolates the fault
4. **Changes**: what changed since it last worked?
5. **Consistency**: constant, or does it come and go? Can you repeat it?
6. **Timing**: when did it first appear? When does it happen?

```svg Six questions, in order, narrow the fault down
<svg viewBox="0 0 560 140" role="img" aria-label="Six diagnosis steps in a row">
  <g font-family="var(--font-mono)" font-size="11" text-anchor="middle" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="scope">
      <rect x="3" y="20" width="84" height="50" fill="var(--surface-2)"/>
      <text x="45" y="50" stroke="none">1 scope</text>
    </g>
    <g data-cue="essence">
      <rect x="97" y="20" width="84" height="50" fill="var(--surface-2)"/>
      <text x="139" y="50" stroke="none">2 essence</text>
    </g>
    <g data-cue="elimination">
      <rect x="191" y="20" width="84" height="50" fill="var(--surface-3)"/>
      <text x="233" y="50" stroke="none">3 eliminate</text>
    </g>
    <g data-cue="changes">
      <rect x="285" y="20" width="84" height="50" fill="var(--surface-3)"/>
      <text x="327" y="50" stroke="none">4 changes</text>
    </g>
    <g data-cue="consistency">
      <rect x="379" y="20" width="84" height="50" fill="var(--primary-container)"/>
      <text x="421" y="50" stroke="none">5 constant?</text>
    </g>
    <g data-cue="timing">
      <rect x="473" y="20" width="84" height="50" fill="var(--primary-container)"/>
      <text x="515" y="50" stroke="none">6 timing</text>
    </g>
  </g>
  <path d="M10 100 L550 100" stroke="var(--fg-muted)" stroke-width="2"/>
  <circle class="pkt" cx="10" cy="100" r="7" fill="var(--accent-2)" style="--dx: 540px; --delay: 0ms"/>
</svg>
```

```narrate
Walk the six steps in order. [[scope]] Scope: how wide is it? [[essence]] Essence: what exactly is the fault? [[elimination]] Elimination: what still works? [[changes]] Changes: what is different since it last worked? [[consistency]] Consistency: is it constant or intermittent? [[timing]] Timing: when did it start?
```

> **Trap:** start fixing before agreeing on the problem. Always **repeat the problem back** and get a "yes, that is it" first.

```quiz
q: A user says the Wi-Fi works on their phone but not on their laptop. Which diagnosis step produced that fact?
options:
  - Timing
  - "Elimination: what works and what does not"
  - Consistency
  - Scope
answer: 1
why: Finding what still works narrows the fault to the laptop, not the network.
```

## Active listening: the 4 step circle

Listening is a skill with steps. The iron rule: **listen to the customer, do not plan your reply while they talk.**

1. **Listen fully**: let them tell it start to end. Short "I see", "okay" show you are there without interrupting
2. **Reflect and summarize**: "If I understood correctly..." in your words, then wait for a yes
3. **Clarify**: closed questions for the missing details
4. **Document**: fill the ticket and get final confirmation

```svg A loop, not a line: after documenting you are ready for the next point the customer raises
<svg viewBox="0 0 560 230" role="img" aria-label="Four step listening circle">
  <g font-family="var(--font-mono)" font-size="13" text-anchor="middle" fill="var(--fg)" stroke="var(--border)" stroke-width="2">
    <g data-cue="listen">
      <rect x="30" y="20" width="160" height="50" fill="var(--surface-2)"/>
      <text x="110" y="50" stroke="none">1 listen fully</text>
    </g>
    <g data-cue="reflect">
      <rect x="290" y="20" width="160" height="50" fill="var(--surface-3)"/>
      <text x="370" y="50" stroke="none">2 reflect</text>
    </g>
    <g data-cue="clarify">
      <rect x="290" y="150" width="160" height="50" fill="var(--primary-container)"/>
      <text x="370" y="180" stroke="none">3 clarify</text>
    </g>
    <g data-cue="document">
      <rect x="30" y="150" width="160" height="50" fill="var(--surface-3)"/>
      <text x="110" y="180" stroke="none">4 document</text>
    </g>
  </g>
  <g stroke="var(--fg)" stroke-width="2" fill="none">
    <path d="M190 45 L290 45"/>
    <path d="M370 70 L370 150"/>
    <path d="M290 175 L190 175"/>
    <path d="M110 150 L110 70"/>
  </g>
  <circle class="pkt" cx="190" cy="45" r="6" fill="var(--accent-2)" style="--dx: 100px; --delay: 0ms"/>
  <circle class="pkt" cx="370" cy="70" r="6" fill="var(--primary)" style="--dy: 80px; --delay: 1000ms"/>
  <circle class="pkt" cx="290" cy="175" r="6" fill="var(--accent-2)" style="--dx: -100px; --delay: 2000ms"/>
  <circle class="pkt" cx="110" cy="150" r="6" fill="var(--ok)" style="--dy: -80px; --delay: 3000ms"/>
</svg>
```

```narrate
[[listen]] First, listen fully, with no interruptions, even if you already know the answer. [[reflect]] Second, reflect: say back what you understood in your own words and wait for a yes. [[clarify]] Third, clarify with short closed questions for anything missing. [[document]] Fourth, document it in the ticket and confirm the final wording with the customer.
```

> **Why:** the summary catches a misunderstanding in ten seconds, before you spend twenty minutes fixing the wrong problem.

```quiz
q: The customer finishes describing a printer fault. What do you do next?
options:
  - Start the fix, you have heard enough
  - Say "If I understood correctly, the PDF does not print from your laptop. Is that right?"
  - Ask them to start again, more slowly
  - Put them on hold to look it up
answer: 1
why: Reflecting in your own words and getting a yes confirms you are solving the same problem as the customer.
```

## Hold and warm transfer

Two moments where calls go wrong: putting someone on **hold**, and **transferring** them.

**Hold:** ask permission, explain the reason ("I need to check the details with the technical team"), and thank them when you return.

**Warm transfer:** brief the next agent on the case **before** you connect the customer, so they never repeat their story.

```svg Hold: ask, explain, thank. Transfer: brief the next agent first, then connect the customer
<svg viewBox="0 0 560 200" role="img" aria-label="Hold and warm transfer sequence">
  <g font-family="var(--font-mono)" font-size="12" text-anchor="middle" fill="var(--fg)">
    <text x="80" y="16" font-weight="700">customer</text>
    <text x="280" y="16" font-weight="700">you</text>
    <text x="480" y="16" font-weight="700">next agent</text>
  </g>
  <g stroke="var(--border)" stroke-width="2" stroke-dasharray="4 4">
    <path d="M80 24 L80 196"/>
    <path d="M280 24 L280 196"/>
    <path d="M480 24 L480 196"/>
  </g>
  <g font-family="var(--font-mono)" font-size="12" fill="var(--fg)">
    <g data-cue="ask">
      <path d="M270 54 L90 54" stroke="var(--fg)" stroke-width="2"/>
      <text x="100" y="46">may I hold? here is why</text>
    </g>
    <g data-cue="thank">
      <path d="M270 94 L90 94" stroke="var(--ok)" stroke-width="2"/>
      <text x="100" y="86">thanks for waiting</text>
    </g>
    <g data-cue="brief">
      <path d="M290 134 L470 134" stroke="var(--primary)" stroke-width="2"/>
      <text x="300" y="126">name, fault, tried</text>
    </g>
    <g data-cue="connect">
      <path d="M90 174 L470 174" stroke="var(--accent-2)" stroke-width="2"/>
      <text x="190" y="166">now connect the customer</text>
    </g>
  </g>
  <circle class="pkt" cx="270" cy="54" r="5" fill="var(--fg)" style="--dx: -180px; --delay: 0ms"/>
  <circle class="pkt" cx="270" cy="94" r="5" fill="var(--ok)" style="--dx: -180px; --delay: 1000ms"/>
  <circle class="pkt" cx="290" cy="134" r="5" fill="var(--primary)" style="--dx: 180px; --delay: 2000ms"/>
  <circle class="pkt" cx="90" cy="174" r="5" fill="var(--accent-2)" style="--dx: 380px; --delay: 3000ms"/>
</svg>
```

```narrate
[[ask]] Before hold, ask permission and give the reason. [[thank]] When you come back, thank the customer for their patience. [[brief]] For a transfer, first tell the next agent the name, the fault, and what was already tried. [[connect]] Only then connect the customer, so they never repeat their story.
```

> **Not this:** a cold transfer, where you drop the customer on the next agent with no briefing. They repeat everything, and you have just made a bad call worse.

```quiz
q: You must transfer a customer to a senior technician. What is the correct order?
options:
  - Connect the customer, then brief the technician while they listen
  - Brief the technician first, then connect the customer
  - Tell the customer to call back and ask for the senior
  - Transfer silently and update the ticket afterwards
answer: 1
why: A warm transfer means the next agent already knows the case when the customer joins.
```

## Plain words, steady pace

Match the customer's level. A beginner needs plain words. An experienced user can take shared technical terms.

| Say | Not |
| --- | --- |
| "The connection to the network is slow" | "The NIC has latency problems" |
| "Click Start, then the gear icon" | "Open Settings from the Start menu context" |

Keep control of the call:

- **Pace**: speak at a moderate speed that is easy to follow
- **Precision**: break the fix into **numbered steps**
- **Pause**: stop and wait for the customer to confirm each step

```svg Jargon bounces off, plain words land
<svg viewBox="0 0 560 150" role="img" aria-label="Jargon versus plain words">
  <g data-cue="jargon">
    <rect x="10" y="20" width="240" height="90" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
    <text x="130" y="56" text-anchor="middle" font-family="var(--font-mono)" font-size="13" fill="var(--fg)">"NIC latency issue"</text>
    <text x="130" y="84" text-anchor="middle" font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">customer: lost</text>
  </g>
  <g data-cue="plain">
    <rect x="310" y="20" width="240" height="90" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
    <text x="430" y="56" text-anchor="middle" font-family="var(--font-mono)" font-size="13" fill="var(--fg)">"the connection is slow"</text>
    <text x="430" y="84" text-anchor="middle" font-family="var(--font-mono)" font-size="12" fill="var(--fg-muted)">customer: follows</text>
  </g>
  <circle class="pkt" cx="250" cy="65" r="6" fill="var(--danger)" style="--dx: -40px; --delay: 0ms"/>
  <circle class="pkt" cx="310" cy="65" r="6" fill="var(--ok)" style="--dx: 40px; --delay: 2000ms"/>
</svg>
```

```narrate
[[jargon]] Technical words like network interface latency leave a beginner lost, and they stop following you. [[plain]] Say the connection is slow instead, and they stay with you. Speak at a moderate pace, give numbered steps, and pause so the customer can confirm each one before you go on.
```

```quiz
q: A beginner cannot follow your instructions. What helps most?
options:
  - Speak faster so the call ends sooner
  - Use the exact technical terms, so they can search them
  - One numbered step at a time, in plain words, waiting for each "done"
  - Email a long manual instead
answer: 2
why: Slow, numbered, plain steps with a pause for confirmation keep you in control and the customer confident.
```

## Five kinds of customers

Each customer needs a different key. You move from a technical fix to **handling a person**.

| Customer | What they do | Your move |
| --- | --- | --- |
| **Angry** | shouts, erupts | let them vent, do not interrupt, show understanding, never argue |
| **Talkative** | talks about everything but the problem | stay friendly but steer back with closed questions |
| **Knowledgeable** | wants to run the call, dislikes Level 1 | partnership: acknowledge their skill, work as a team |
| **Rude** | negative remarks, will not cooperate | stay calm and professional, do not take it personally |
| **Inexperienced** | cannot describe the fault, skips steps | patience, plain words, one step at a time, never condescend |

> **Why:** the goal is not only to close the ticket. It is a good service experience, which is what customers remember and rate.

```narrate
Every customer needs a different key. With an angry customer, let them vent, never interrupt, and show you understand. With a talkative one, stay friendly and steer back to the fault. With a knowledgeable one, partner with them. With a rude one, stay calm and do not take it personally. With an inexperienced one, be patient, use plain words, and go one step at a time.
```

```quiz
q: A customer shouts that this is the third time the internet failed. What do you do?
options:
  - Say "calm down, sir"
  - Let them vent, then say "I understand how frustrating that is, let's solve it"
  - Explain that the line is not your fault
  - Transfer them at once to avoid conflict
answer: 1
why: Anger needs room first. Venting without interruption, then empathy, lowers the temperature so you can work.
```

```quiz
q: An experienced customer says "I already restarted the router and checked the DNS, just give me the fix". Best response?
options:
  - "I have to follow my script, please restart the router"
  - "Thanks, that helps. Since DNS is fine, let's check the gateway together"
  - "Please do not tell me how to do my job"
  - Escalate immediately without trying anything
answer: 1
why: Acknowledge their work and treat them as a partner, then use their facts to skip steps.
```

## Manage the whole case, not only the call

Great service continues outside the call. Five habits:

- **Set expectations**: clear timelines, and keep them
- **Update proactively**: do not wait for the customer to ask for status
- **Offer options**: repair or replace, when possible
- **Be transparent**: a short summary of what was done
- **Close the loop**: contact them after the fix to confirm they are fully satisfied

```svg From the first promise to the follow-up call, one case with five touchpoints
<svg viewBox="0 0 560 130" role="img" aria-label="Case timeline with five touchpoints">
  <path d="M20 60 L540 60" stroke="var(--fg-muted)" stroke-width="3"/>
  <g font-family="var(--font-mono)" font-size="11" text-anchor="middle" fill="var(--fg)">
    <g data-cue="expect">
      <circle cx="40" cy="60" r="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="40" y="95">expectations</text>
    </g>
    <g data-cue="update">
      <circle cx="170" cy="60" r="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="170" y="95">updates</text>
    </g>
    <g data-cue="options">
      <circle cx="300" cy="60" r="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="300" y="95">options</text>
    </g>
    <g data-cue="summary">
      <circle cx="400" cy="60" r="10" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="400" y="95">summary</text>
    </g>
    <g data-cue="followup">
      <circle cx="510" cy="60" r="10" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="510" y="95">follow-up</text>
    </g>
  </g>
  <circle class="pkt" cx="40" cy="60" r="6" fill="var(--accent-2)" style="--dx: 470px; --delay: 0ms"/>
</svg>
```

```narrate
[[expect]] Set clear timelines at the start, and keep them. [[update]] Update the customer yourself, before they ask. [[options]] Offer options when you can, like repair or replace. [[summary]] Give a short written summary of what was done. [[followup]] Then follow up after the fix to check they are fully satisfied.
```

> **Not this:** closing the ticket the moment the fix works. A silent customer is not a satisfied customer, and a follow-up costs one minute.

```quiz
q: A repair will take two days. What is the best handling?
options:
  - Say nothing until it is done
  - Give the timeline up front, send updates yourself, and call after the fix
  - Promise one day to keep them calm
  - Tell them to call when they want news
answer: 1
why: Clear expectations, proactive updates and a follow-up make a slow fix feel well managed.
```
