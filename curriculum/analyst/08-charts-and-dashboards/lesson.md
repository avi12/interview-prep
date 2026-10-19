---
title: Charts and dashboards
lang: none
minutes: 20
level: junior
roles: [analyst]
sources:
  - https://www.data-to-viz.com/
  - https://learn.microsoft.com/en-us/power-bi/create-reports/service-dashboards-design-tips
  - https://www.perceptualedge.com/articles/visual_business_intelligence/save_the_pies_for_dessert.pdf
  - https://www.vis4.net/blog/doing-the-line-charts-right/
  - https://www.thinkcell.com/en/resources/content-hub/how-to-tell-a-better-data-story-one-slide-at-a-time
---

## Start with the question

Pick the chart **after** you know the question.

| Question | Chart |
|---|---|
| Which is bigger? | bars, sorted |
| How did it change over time? | line |
| How are the values spread out? | histogram or box plot |
| Do two numbers move together? | scatter plot |
| What share is each part? | one stacked bar, or a pie with few slices |

```svg Four questions, four charts: bars compare, a line shows change over time, a histogram shows spread, a scatter shows a relationship
<svg viewBox="0 0 520 256" role="img" aria-label="Four basic chart types">
  <g data-cue="bars" font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="14" width="230" height="104" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="32" y="32" fill="var(--fg)">compare: sorted bars</text>
    <rect x="40" y="52" width="32" height="56" fill="var(--cat-1)"/>
    <rect x="84" y="64" width="32" height="44" fill="var(--cat-1)"/>
    <rect x="128" y="76" width="32" height="32" fill="var(--cat-1)"/>
    <rect x="172" y="88" width="32" height="20" fill="var(--cat-1)"/>
    <path d="M32 108 L240 108" stroke="var(--border)" stroke-width="2" fill="none"/>
  </g>
  <g data-cue="trend" font-family="var(--font-mono)" font-size="12">
    <rect x="270" y="14" width="230" height="104" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="282" y="32" fill="var(--fg)">trend: line</text>
    <path d="M286 96 L318 88 L350 92 L382 72 L414 68 L446 54 L478 50" stroke="var(--cat-2)" stroke-width="3" fill="none"/>
    <path d="M282 108 L490 108" stroke="var(--border)" stroke-width="2" fill="none"/>
  </g>
  <g data-cue="spread" font-family="var(--font-mono)" font-size="12">
    <rect x="20" y="136" width="230" height="104" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="32" y="154" fill="var(--fg)">spread: histogram</text>
    <rect x="40" y="216" width="26" height="14" fill="var(--cat-3)"/>
    <rect x="66" y="198" width="26" height="32" fill="var(--cat-3)"/>
    <rect x="92" y="180" width="26" height="50" fill="var(--cat-3)"/>
    <rect x="118" y="192" width="26" height="38" fill="var(--cat-3)"/>
    <rect x="144" y="208" width="26" height="22" fill="var(--cat-3)"/>
    <rect x="170" y="220" width="26" height="10" fill="var(--cat-3)"/>
    <path d="M32 230 L240 230" stroke="var(--border)" stroke-width="2" fill="none"/>
  </g>
  <g data-cue="relation" font-family="var(--font-mono)" font-size="12">
    <rect x="270" y="136" width="230" height="104" fill="none" stroke="var(--border)" stroke-width="2"/>
    <text x="282" y="154" fill="var(--fg)">relationship: scatter</text>
    <circle cx="292" cy="222" r="4" fill="var(--cat-4)"/>
    <circle cx="306" cy="214" r="4" fill="var(--cat-4)"/>
    <circle cx="318" cy="218" r="4" fill="var(--cat-4)"/>
    <circle cx="332" cy="204" r="4" fill="var(--cat-4)"/>
    <circle cx="346" cy="208" r="4" fill="var(--cat-4)"/>
    <circle cx="358" cy="194" r="4" fill="var(--cat-4)"/>
    <circle cx="372" cy="196" r="4" fill="var(--cat-4)"/>
    <circle cx="386" cy="184" r="4" fill="var(--cat-4)"/>
    <circle cx="398" cy="188" r="4" fill="var(--cat-4)"/>
    <circle cx="412" cy="176" r="4" fill="var(--cat-4)"/>
    <circle cx="426" cy="178" r="4" fill="var(--cat-4)"/>
    <circle cx="440" cy="168" r="4" fill="var(--cat-4)"/>
    <circle cx="454" cy="172" r="4" fill="var(--cat-4)"/>
    <circle cx="468" cy="162" r="4" fill="var(--cat-4)"/>
    <path d="M282 230 L490 230" stroke="var(--border)" stroke-width="2" fill="none"/>
  </g>
</svg>
```

```narrate
Four questions, four charts. [[bars]] To compare categories, use bars, sorted from biggest to smallest. [[trend]] To see change over time, use a line. [[spread]] To see how values are spread out, use a histogram or a box plot. [[relation]] To see whether two numbers move together, use a scatter plot. Always pick the chart after you know the question.
```

> **Why:** a chart answers one question. If you cannot say the question, the chart is decoration.

> **Not this:** 3D charts, donuts and gauges because they look impressive. Microsoft's own dashboard guide says to avoid hard-to-read visuals such as 3D charts.

## Bars start at zero, pies lose

The eye judges **length** and **position** well, and **angle** and **area** badly. That is why bars beat pie slices for comparing values.

A bar's length **is** its value, so the axis must start at zero. Cut it, and a 5% gap looks like a 2x gap.

```svg The same two values, 95 and 100: from zero they look 5% apart, from 90 the second bar looks twice as tall
<svg viewBox="0 0 520 230" role="img" aria-label="Truncated axis exaggerates a small difference">
  <g data-cue="honest" font-family="var(--font-mono)" font-size="13">
    <text x="120" y="36" text-anchor="middle" fill="var(--fg)">axis starts at 0</text>
    <rect x="70" y="75" width="40" height="95" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="90" y="68" text-anchor="middle" fill="var(--fg)">95</text>
    <rect x="130" y="70" width="40" height="100" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="150" y="63" text-anchor="middle" fill="var(--fg)">100</text>
    <path d="M50 170 L190 170" stroke="var(--border)" stroke-width="2" fill="none"/>
    <text x="120" y="194" text-anchor="middle" fill="var(--ok)">looks 5% apart</text>
  </g>
  <g data-cue="cut" font-family="var(--font-mono)" font-size="13">
    <text x="380" y="36" text-anchor="middle" fill="var(--fg)">axis starts at 90</text>
    <rect x="330" y="120" width="40" height="50" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
    <text x="350" y="113" text-anchor="middle" fill="var(--fg)">95</text>
    <rect x="390" y="70" width="40" height="100" fill="var(--cat-1)" stroke="var(--danger)" stroke-width="3"/>
    <text x="410" y="63" text-anchor="middle" fill="var(--fg)">100</text>
    <path d="M310 170 L450 170" stroke="var(--border)" stroke-width="2" fill="none"/>
    <text x="380" y="194" text-anchor="middle" fill="var(--danger)">looks 2x apart</text>
  </g>
</svg>
```

```narrate
Same two numbers, ninety five and one hundred. [[honest]] On the left the axis starts at zero, and the bars look almost the same, which is the truth. [[cut]] On the right the axis starts at ninety, so the visible parts are five and ten, and the second bar looks twice as tall. Nothing was falsified, but the picture lies. Bars encode length, so keep the zero.
```

> **Why:** for bars, the zero baseline is what makes length honest. A line chart encodes position instead, so it may crop its axis to show movement, as long as the axis is labelled.

```quiz
q: A bar chart's axis starts at 90. The bars show 95 and 100. How much taller does the second bar look?
options:
  - 5% taller
  - twice as tall
  - 10% taller
answer: 1
why: Above the cut the visible heights are 5 and 10, so the second bar looks twice as tall, while the real gap is about 5%.
```

## Dashboard rules

```svg Read a dashboard like a page: headline numbers first, then when, then where, then detail
<svg viewBox="0 0 520 300" role="img" aria-label="Dashboard wireframe with reading order">
  <rect x="10" y="10" width="500" height="280" fill="none" stroke="var(--border)" stroke-width="2"/>
  <g data-cue="kpi" font-family="var(--font-mono)" font-size="11">
    <rect x="22" y="22" width="150" height="60" fill="var(--surface-2)" stroke="var(--accent-2)" stroke-width="3"/>
    <text x="32" y="39" fill="var(--fg-muted)">Orders</text>
    <text x="32" y="60" font-size="20" fill="var(--fg)">12,400</text>
    <text x="32" y="75" fill="var(--danger)">-10% vs last week</text>
    <circle cx="156" cy="36" r="9" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="156" y="40" text-anchor="middle" fill="var(--fg)">1</text>
    <rect x="186" y="22" width="150" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="196" y="39" fill="var(--fg-muted)">Conversion</text>
    <text x="196" y="60" font-size="20" fill="var(--fg)">2.7%</text>
    <text x="196" y="75" fill="var(--danger)">-0.3 pts</text>
    <rect x="350" y="22" width="150" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="360" y="39" fill="var(--fg-muted)">Revenue</text>
    <text x="360" y="60" font-size="20" fill="var(--fg)">$310k</text>
    <text x="360" y="75" fill="var(--danger)">-9%</text>
  </g>
  <g data-cue="trend" font-family="var(--font-mono)" font-size="11">
    <rect x="22" y="96" width="308" height="110" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="32" y="114" fill="var(--fg)">Orders fell 10% after Tuesday</text>
    <path d="M40 140 L80 138 L120 142 L160 139 L200 141 L240 168 L280 170 L320 172" stroke="var(--cat-2)" stroke-width="3" fill="none"/>
    <circle cx="312" cy="112" r="9" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="312" y="116" text-anchor="middle" fill="var(--fg)">2</text>
  </g>
  <g data-cue="breakdown" font-family="var(--font-mono)" font-size="11">
    <rect x="344" y="96" width="156" height="110" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="354" y="114" fill="var(--fg)">iOS alone fell 40%</text>
    <text x="354" y="141" fill="var(--fg)">iOS</text>
    <rect x="388" y="129" width="100" height="16" fill="var(--danger)"/>
    <text x="354" y="165" fill="var(--fg)">Andr.</text>
    <rect x="388" y="153" width="3" height="16" fill="var(--fg-muted)"/>
    <text x="354" y="189" fill="var(--fg)">web</text>
    <rect x="388" y="177" width="3" height="16" fill="var(--fg-muted)"/>
    <circle cx="486" cy="112" r="9" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="486" y="116" text-anchor="middle" fill="var(--fg)">3</text>
  </g>
  <g data-cue="detail" font-family="var(--font-mono)" font-size="11">
    <rect x="22" y="220" width="478" height="62" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
    <text x="32" y="238" fill="var(--fg)">Detail: top products last week</text>
    <rect x="32" y="246" width="420" height="6" fill="var(--surface-3)"/>
    <rect x="32" y="258" width="420" height="6" fill="var(--surface-3)"/>
    <rect x="32" y="270" width="280" height="6" fill="var(--surface-3)"/>
    <circle cx="486" cy="236" r="9" fill="var(--primary-container)" stroke="var(--accent-2)" stroke-width="2"/>
    <text x="486" y="240" text-anchor="middle" fill="var(--fg)">4</text>
  </g>
</svg>
```

```narrate
Read a dashboard like a page, from the top left. [[kpi]] First the headline numbers, each compared with last week. [[trend]] Next one chart that shows when it changed, with a title that states the takeaway. [[breakdown]] Then one chart that shows where, again with a title that says the point. [[detail]] Details come last, for whoever wants to dig. One question per chart, and the same color should mean the same thing everywhere.
```

- **One question per chart.** The title is the takeaway ("iOS alone fell 40%"), not a label ("Orders by platform")
- **Most important top left**, detail below
- **Same color, same meaning** on every chart. One accent for the point, gray for the rest
- **Add context**: versus last week or target
- **Few visuals**, one screen, no scrolling

> **Trap:** mixing time frames: one chart on last month beside another on a single week. Keep them consistent.

## What to say when presenting

The audience reads the chart faster than you talk. Do not read the numbers out. Say what to **see** and what to **do**.

| Step | Say |
|---|---|
| Headline | "Orders fell 10%, and all of it is iOS." |
| Orient | "Each bar is a platform. Height is orders per day." |
| Point | "Look at the short iOS bar after release 4.2." |
| Next | "I recommend a rollback, and I will confirm with the crash logs." |

> **Why:** an action title states the takeaway, a chart title only describes the chart. "A chart title describes, while an action title tells the story."

> **Not this:** starting with "so this is a bar chart of orders by platform". The listener waits through the setup for the point.

```narrate
When you present a chart, remember the audience reads faster than you talk. So do not read out the numbers. Start with the headline: orders fell ten percent, all of it on i O S. Then orient them: each bar is a platform, and height is orders per day. Point at the one thing to see. End with what you recommend. In a critique question, say which question the chart answers, who it is for, and what you would remove.
```

## Say it aloud

A manager sends you this dashboard: 14 charts, a rainbow of colors, a 3D pie with 9 slices, a bar chart whose axis starts at 90, and titles like "Sales".

Set a timer for **60 seconds** and critique it out loud:

1. The one question the dashboard should answer
2. Three problems, each with the reason it hurts the reader
3. The one fix you would make first

```narrate
Time to talk. A manager sends you a dashboard with fourteen charts, a rainbow of colors, a three D pie with nine slices, a bar chart whose axis starts at ninety, and titles like Sales. Set a timer for sixty seconds and critique it out loud. Say the one question the dashboard should answer, then three problems with the reason each one hurts the reader, then the one fix you would make first.
```

```hint
Start with the question: "This should tell the team whether sales are on target, and where they are not."
```

```hint
Problems to pick from: too many charts (nothing stands out), 3D pie (hard to compare), cut axis (exaggerates), vague titles (no takeaway), too many colors (color means nothing).
```

```hint
Finish with: "First I would cut it to five charts, and give each one a title that states its point."
```
