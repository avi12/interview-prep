---
title: Scaling reads and writes
lang: none
minutes: 20
level: junior
roles: [backend, ai]
sources:
  - https://learn.microsoft.com/en-us/azure/architecture/patterns/sharding
  - https://www.postgresql.org/docs/current/warm-standby.html
  - https://aws.amazon.com/rds/features/read-replicas/
  - https://www.mongodb.com/docs/manual/core/sharding-choose-a-shard-key/
  - https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf
  - https://cs.brown.edu/courses/csci2950-u/f09/papers/chash97stoc.pdf
  - https://en.wikipedia.org/wiki/Consistent_hashing
  - https://martin.kleppmann.com/2015/05/11/please-stop-calling-databases-cp-or-ap.html
  - https://www.infoq.com/articles/cap-twelve-years-later-how-the-rules-have-changed/
---

## Scale up first, then out

**Vertical** scaling is a bigger machine. **Horizontal** scaling is more machines.

| | Vertical | Horizontal |
|---|---|---|
| Effort | Almost none | Real design work |
| Limit | One machine's size | Far higher |
| If it dies | Everything stops | The rest carry on |
| Queries and transactions | Stay simple | Get harder |

In an interview, climb the ladder in order and say where you stop, and why.

```svg Each step costs more complexity than the one before. Shard last
<svg viewBox="0 0 640 250" role="img" aria-label="Scaling ladder: reach for the cheap steps first, and shard last" font-family="var(--font-mono)" font-size="13">
<g data-cue="index">
<rect x="8" y="112" width="112" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="64" y="140.6" font-size="13" fill="var(--fg)" text-anchor="middle">Fix queries</text>
<text x="64" y="156.6" font-size="13" fill="var(--fg)" text-anchor="middle">add indexes</text>
<text x="64" y="196" font-size="16" fill="var(--fg)" text-anchor="middle" font-weight="700">1</text>
</g>
<g data-cue="bigger">
<path d="M120 132 L134 132" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="134,132 124,137 124,127" fill="var(--fg-muted)"/>
<rect x="134" y="88" width="112" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="190" y="116.6" font-size="13" fill="var(--fg)" text-anchor="middle">Bigger</text>
<text x="190" y="132.6" font-size="13" fill="var(--fg)" text-anchor="middle">machine</text>
<text x="190" y="172" font-size="16" fill="var(--fg)" text-anchor="middle" font-weight="700">2</text>
</g>
<g data-cue="cache">
<path d="M246 108 L260 108" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="260,108 250,113 250,103" fill="var(--fg-muted)"/>
<rect x="260" y="64" width="112" height="64" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="316" y="92.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<text x="316" y="108.6" font-size="13" fill="var(--fg)" text-anchor="middle">the reads</text>
<text x="316" y="148" font-size="16" fill="var(--fg)" text-anchor="middle" font-weight="700">3</text>
</g>
<g data-cue="replicas">
<path d="M372 84 L386 84" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="386,84 376,89 376,79" fill="var(--fg-muted)"/>
<rect x="386" y="40" width="112" height="64" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="442" y="68.6" font-size="13" fill="var(--fg)" text-anchor="middle">Read</text>
<text x="442" y="84.6" font-size="13" fill="var(--fg)" text-anchor="middle">replicas</text>
<text x="442" y="124" font-size="16" fill="var(--fg)" text-anchor="middle" font-weight="700">4</text>
</g>
<g data-cue="shard">
<path d="M498 60 L512 60" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="512,60 502,65 502,55" fill="var(--fg-muted)"/>
<rect x="512" y="16" width="112" height="64" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="568" y="44.6" font-size="13" fill="var(--fg)" text-anchor="middle">Shard</text>
<text x="568" y="60.6" font-size="13" fill="var(--fg)" text-anchor="middle">the data</text>
<text x="568" y="100" font-size="16" fill="var(--fg)" text-anchor="middle" font-weight="700">5</text>
</g>
<path d="M10 238 L630 238" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="630,238 620,243 620,233" fill="var(--fg-muted)"/>
<text x="10" y="228" font-size="12" fill="var(--fg-muted)" text-anchor="start">more complexity, more that can go wrong</text>
</svg>
```

```narrate
Climb the ladder one step at a time. [[index]] First, check the slow queries and add indexes. It is free, and it often fixes everything. [[bigger]] Second, a bigger machine. Boring, and it works. [[cache]] Third, cache the reads. [[replicas]] Fourth, add read replicas for more read capacity. [[shard]] Only at the top, when writes or data no longer fit on one machine, do you shard.
```

> **Why:** most junior-level problems end at step 3 or 4. Sharding is the last resort, not the first idea.

> **Not this:** jump to sharding and microservices. That is permanent complexity for a problem a cache would have solved.

```quiz
q: A read-heavy app has its database at 90 percent CPU. What do you try first?
options:
  - Shard the database
  - Check slow queries and indexes, then add a cache or read replicas
  - Split it into microservices
answer: 1
why: The load is reads, so cheap steps come first. Sharding is for write volume or data size that one machine cannot hold.
```

## Read replicas and replication lag

A **read replica** is a copy of the primary that answers read-only queries. All writes go to the **primary**, and changes stream to the replicas, usually **asynchronously**. So a replica can be a moment behind: **replication lag**.

PostgreSQL says the delay is typically under a second, if the standby keeps up.

The classic bug: you save your profile, the next page reads from a replica, and shows your **old** name.

```svg The write is acknowledged before the replica has it
<svg viewBox="0 0 640 302" role="img" aria-label="A write goes to the primary, and a read from the replica a moment later still sees the old value" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 296" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">User</text>
<path d="M320 38 L320 296" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="260" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="16.6" font-size="13" fill="var(--fg)" text-anchor="middle">Primary</text>
<text x="320" y="32.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">all writes</text>
<path d="M574 38 L574 296" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="16.6" font-size="13" fill="var(--fg)" text-anchor="middle">Replica</text>
<text x="574" y="32.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">read only</text>
<g data-cue="write">
<path d="M68 79.4 L318 79.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="318,79.4 308,84.4 308,74.4" fill="var(--fg)"/>
<text x="193" y="72.4" font-size="12" fill="var(--fg)" text-anchor="middle">save name = Dana</text>
</g>
<g data-cue="write">
<path d="M318 117.4 L68 117.4" fill="none" stroke="var(--ok)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,117.4 78,112.4 78,122.4" fill="var(--ok)"/>
<text x="193" y="110.4" font-size="12" fill="var(--fg)" text-anchor="middle">ok</text>
</g>
<g data-cue="read">
<path d="M68 155.4 L572 155.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,155.4 562,160.4 562,150.4" fill="var(--fg)"/>
<text x="193" y="148.4" font-size="12" fill="var(--fg)" text-anchor="middle">show my name</text>
</g>
<g data-cue="stale">
<path d="M572 193.4 L68 193.4" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,193.4 78,188.4 78,198.4" fill="var(--danger)"/>
<text x="193" y="186.4" font-size="12" fill="var(--fg)" text-anchor="middle">Danny (old!)</text>
</g>
<g data-cue="late">
<path d="M322 231.4 L572 231.4" fill="none" stroke="var(--fg-muted)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="572,231.4 562,236.4 562,226.4" fill="var(--fg-muted)"/>
<text x="447" y="224.4" font-size="12" fill="var(--fg)" text-anchor="middle">copy arrives later</text>
</g>
<g data-cue="lag">
<rect x="300" y="245" width="294" height="40" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="447" y="262" font-size="12" fill="var(--fg)" text-anchor="middle">The gap is replication lag.</text>
<text x="447" y="277" font-size="12" fill="var(--fg)" text-anchor="middle">Postgres: typically under a second.</text>
</g>
</svg>
```

```narrate
Follow one save. [[write]] The user saves a new name on the primary, and gets an okay. [[read]] The next page asks a replica for the name. [[stale]] The replica has not caught up, so it answers with the old name. [[late]] A moment later the copy arrives. [[lag]] That gap is replication lag. It is usually tiny, but it is real, and the user saw it.
```

> **Why:** after a write, read that user's data from the **primary** for a short time. Everyone else can read from replicas.

> **Not this:** replicas to fix a **write** bottleneck. Every write still lands on the one primary. Replicas add read capacity, and a standby for failover.

```quiz
q: A user saves a setting and the next page still shows the old value. The likely cause is...
options:
  - The cache expired too early
  - Replication lag on a read replica
  - The database lost the write
answer: 1
why: The write went to the primary, but the read hit a replica that had not caught up yet.
```

## Sharding: split the data

When one primary cannot take the writes or hold the data, split the rows across servers by a **shard key**. Each shard has the same schema and its own rows.

A good key is **immutable**, has **high cardinality**, spreads load evenly, and matches your most common query.

A bad key **only grows**, like an auto-increment id or a timestamp. Every new row lands on the newest shard, a hot shard.

| Strategy | Good for | Watch out |
|---|---|---|
| Range | Range queries | Hot spots |
| Hash | Even spread | No range scans, hard to rebalance |
| Lookup table | Flexible | The table is a new dependency |

```svg The router turns the shard key into one shard. Cross-shard questions are the expensive ones
<svg viewBox="0 0 640 238" role="img" aria-label="A router sends each request to one shard using the shard key, here user id mod 3" font-family="var(--font-mono)" font-size="13">
<g data-cue="router">
<rect x="10" y="92" width="92" height="52" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="56" y="122.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client</text>
<path d="M102 118 L150 118" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="150,118 140,123 140,113" fill="var(--fg)"/>
<rect x="150" y="70" width="150" height="96" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="225" y="114.6" font-size="13" fill="var(--fg)" text-anchor="middle">Router</text>
<text x="225" y="130.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">shard = user_id mod 3</text>
</g>
<g data-cue="shards">
<rect x="460" y="14" width="160" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="540" y="37.6" font-size="13" fill="var(--fg)" text-anchor="middle">Shard 0</text>
<text x="540" y="53.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">users 0, 3, 6, 9...</text>
<rect x="460" y="92" width="160" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="540" y="115.6" font-size="13" fill="var(--fg)" text-anchor="middle">Shard 1</text>
<text x="540" y="131.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">users 1, 4, 7, 10...</text>
<rect x="460" y="170" width="160" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="540" y="193.6" font-size="13" fill="var(--fg)" text-anchor="middle">Shard 2</text>
<text x="540" y="209.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">users 2, 5, 8, 11...</text>
</g>
<g data-cue="pick">
<path d="M300 100 L400 100 L400 41 L460 41" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="460,41 450,46 450,36" fill="var(--ok)"/>
<text x="308" y="70" font-size="12" fill="var(--fg)" text-anchor="start">user 42</text>
<text x="308" y="86" font-size="12" fill="var(--fg)" text-anchor="start">42 mod 3 = 0</text>
</g>
<g data-cue="cross">
<path d="M300 140 L430 140 L430 118 L460 118" fill="none" stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="460,118 450,123 450,113" fill="var(--danger)"/>
<path d="M430 140 L430 197 L460 197" fill="none" stroke="var(--danger)" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="460,197 450,202 450,192" fill="var(--danger)"/>
<text x="10" y="214" font-size="12" fill="var(--fg-muted)" text-anchor="start">A query across all users must ask every shard</text>
<text x="10" y="230" font-size="12" fill="var(--fg-muted)" text-anchor="start">and wait for the slowest.</text>
</g>
</svg>
```

```narrate
Here is a sharded system. [[router]] Every request meets a router, which knows how to compute the shard from the shard key. [[shards]] Behind it are three shards, each holding only its own users. [[pick]] User forty two, divided by three, leaves zero, so the router sends the request to shard zero only. [[cross]] A question about all users is the painful case. It has to ask every shard and wait for the slowest.
```

> **Why:** choose the shard key from your most common query, so most requests touch exactly one shard.

> **Not this:** shard early. Azure calls the cost "substantial and permanent". Changing the key later means moving all the data.

## Hot keys

Sharding spreads **keys**. It cannot split **one key**. If one celebrity profile gets 80 percent of the reads, the shard that holds it melts, however many shards you have.

Common fixes:

- **Cache** the hot key in memory, or at the edge
- **Replicate** it, so many nodes can serve the reads
- **Split** a hot write counter into several sub-keys, and add them up on read

```svg Adding shards does nothing for one hot key. A cache and a split key do
<svg viewBox="0 0 640 232" role="img" aria-label="One hot key overloads a single shard, caching it and splitting its counter spreads the load" font-family="var(--font-mono)" font-size="13">
<g data-cue="hot">
<text x="20" y="28" font-size="13" fill="var(--fg)" text-anchor="start" font-weight="700">ONE HOT KEY</text>
<path d="M20 170 L280 170" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="40" y="146" width="56" height="24" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<rect x="120" y="50" width="56" height="120" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<rect x="200" y="152" width="56" height="18" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="68" y="188" font-size="11" fill="var(--fg-muted)" text-anchor="middle">Shard A</text>
<text x="148" y="188" font-size="11" fill="var(--fg-muted)" text-anchor="middle">Shard B</text>
<text x="228" y="188" font-size="11" fill="var(--fg-muted)" text-anchor="middle">Shard C</text>
<text x="20" y="214" font-size="12" fill="var(--fg)" text-anchor="start">one celebrity lives on shard B</text>
</g>
<g data-cue="fix">
<text x="340" y="28" font-size="13" fill="var(--fg)" text-anchor="start" font-weight="700">CACHE IT, SPLIT IT</text>
<path d="M340 170 L600 170" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="360" y="120" width="56" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="440" y="116" width="56" height="54" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<rect x="520" y="122" width="56" height="48" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="388" y="188" font-size="11" fill="var(--fg-muted)" text-anchor="middle">Shard A</text>
<text x="468" y="188" font-size="11" fill="var(--fg-muted)" text-anchor="middle">Shard B</text>
<text x="548" y="188" font-size="11" fill="var(--fg-muted)" text-anchor="middle">Shard C</text>
<text x="340" y="214" font-size="12" fill="var(--fg)" text-anchor="start">load is spread out again</text>
</g>
</svg>
```

```narrate
Look at the left chart. [[hot]] One key is far busier than all the rest, and it lives on shard B. Adding more shards would not help, because that key can only live in one place. [[fix]] On the right, the hot key is served from a cache, and its counter is split over several sub-keys. Now every shard carries a fair share of the load.
```

> **Trap:** testing with even traffic only. Real traffic follows a power law: a few keys get most of the requests.

## Consistent hashing, the intuition

The naive way to pick a server is `hash(key) mod N`. Change `N` from 3 to 4 and **about three quarters of all keys move**. For a cache, that means a flood of misses.

**Consistent hashing** puts servers and keys on a circle. A key belongs to the first server clockwise from it. Add a server and only the keys next to it move.

Dynamo gives each server many points on the ring ("virtual nodes") so the load is even.

```svg Adding D takes over one slice of the ring. Everything else stays where it was
<svg viewBox="0 0 640 276" role="img" aria-label="Consistent hashing ring: adding server D moves only the keys between D and the server before it" font-family="var(--font-mono)" font-size="13">
<g data-cue="ring">
<text x="160" y="14" font-size="13" fill="var(--fg)" text-anchor="middle" font-weight="700">3 servers</text>
<circle cx="160" cy="130" r="78" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="175.7" y="45.7" width="22" height="22" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
<text x="196.3" y="35.4" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">A</text>
<rect x="175.7" y="192.3" width="22" height="22" fill="var(--cat-2)" stroke="var(--border)" stroke-width="2"/>
<text x="196.3" y="234.6" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">B</text>
<rect x="71" y="119" width="22" height="22" fill="var(--cat-3)" stroke="var(--border)" stroke-width="2"/>
<text x="54" y="135" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">C</text>
</g>
<g data-cue="keys">
<rect x="224.7" y="91" width="12" height="12" fill="var(--cat-2)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="217.9" y="168.7" width="12" height="12" fill="var(--cat-2)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="121" y="194.7" width="12" height="12" fill="var(--cat-3)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="86.5" y="163" width="12" height="12" fill="var(--cat-3)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="94.2" y="73.9" width="12" height="12" fill="var(--cat-1)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="140.5" y="47.2" width="12" height="12" fill="var(--cat-1)" stroke="var(--fg)" stroke-width="1.5"/>
<text x="160" y="262" font-size="12" fill="var(--fg-muted)" text-anchor="middle">each key goes to the first server clockwise</text>
</g>
<g data-cue="add">
<text x="480" y="14" font-size="13" fill="var(--fg)" text-anchor="middle" font-weight="700">add server D</text>
<circle cx="480" cy="130" r="78" fill="none" stroke="var(--border)" stroke-width="2"/>
<rect x="495.7" y="45.7" width="22" height="22" fill="var(--cat-1)" stroke="var(--border)" stroke-width="2"/>
<text x="516.3" y="35.4" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">A</text>
<rect x="495.7" y="192.3" width="22" height="22" fill="var(--cat-2)" stroke="var(--border)" stroke-width="2"/>
<text x="516.3" y="234.6" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">B</text>
<rect x="391" y="119" width="22" height="22" fill="var(--cat-3)" stroke="var(--border)" stroke-width="2"/>
<text x="374" y="135" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">C</text>
<rect x="546.7" y="125.8" width="22" height="22" fill="var(--cat-4)" stroke="var(--border)" stroke-width="2"/>
<text x="585.6" y="144.2" font-size="14" fill="var(--fg)" text-anchor="middle" font-weight="700">D</text>
<rect x="544.7" y="91" width="12" height="12" fill="var(--cat-4)" stroke="var(--danger)" stroke-width="3"/>
<rect x="537.9" y="168.7" width="12" height="12" fill="var(--cat-2)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="441" y="194.7" width="12" height="12" fill="var(--cat-3)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="406.5" y="163" width="12" height="12" fill="var(--cat-3)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="414.2" y="73.9" width="12" height="12" fill="var(--cat-1)" stroke="var(--fg)" stroke-width="1.5"/>
<rect x="460.5" y="47.2" width="12" height="12" fill="var(--cat-1)" stroke="var(--fg)" stroke-width="1.5"/>
</g>
<g data-cue="moved">
<text x="480" y="262" font-size="12" fill="var(--danger)" text-anchor="middle">only 1 of 6 keys moved (red outline)</text>
</g>
</svg>
```

```narrate
Picture a clock face. [[ring]] Three servers sit at points on a circle. [[keys]] Each key is also hashed onto the circle, and belongs to the first server clockwise from it. [[add]] Now add server D between A and B. [[moved]] Only the keys that sit between A and D change owner. Here that is one key out of six. Everything else stays exactly where it was.
```

> **Why:** you can add and remove servers without reshuffling the whole data set. That is why caches and databases like Dynamo use it.

```quiz
q: With hash(key) mod N, going from 3 servers to 4 moves roughly how many keys?
options:
  - About a quarter
  - About three quarters
  - None
answer: 1
why: A key stays put only if key mod 3 equals key mod 4. That holds for just 3 of every 12 values, so 9 in 12 move.
```

## CAP in plain words

When a **network split** cuts two replicas off from each other, a read at one of them has two honest answers:

- **Refuse** (stay consistent): never wrong, sometimes unavailable
- **Answer** (stay available): always responds, maybe with stale data

You cannot have both **during the split**. When the network is healthy, you can have both. Splits are rare, and you do not choose whether they happen.

> **Why:** decide **per feature**. A bank balance should refuse. A like counter can answer with old data.

> **Not this:** "pick any two of three". Kleppmann: partitions are a fault, not a choice. Labels like "CP database" hide that guarantees differ per operation.

```svg During a split, East either refuses or answers with an old value
<svg viewBox="0 0 640 256" role="img" aria-label="When the link between two replicas breaks, a read at one replica must refuse or risk an old answer" font-family="var(--font-mono)" font-size="13">
<g data-cue="write">
<rect x="460" y="14" width="150" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="535" y="38.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client 1</text>
<path d="M535 54 L535 98" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="535,98 530,88 540,88" fill="var(--fg)"/>
<text x="525" y="80" font-size="12" fill="var(--fg)" text-anchor="end">set balance = 50</text>
<rect x="460" y="100" width="150" height="60" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="535" y="126.6" font-size="13" fill="var(--fg)" text-anchor="middle">Replica West</text>
<text x="535" y="142.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">balance = 50</text>
</g>
<g data-cue="split">
<path d="M180 130 L460 130" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<path d="M304 118 L336 142" fill="none" stroke="var(--danger)" stroke-width="4"/>
<path d="M336 118 L304 142" fill="none" stroke="var(--danger)" stroke-width="4"/>
<text x="320" y="106" font-size="12" fill="var(--fg)" text-anchor="middle">network split</text>
</g>
<g data-cue="read">
<rect x="30" y="14" width="150" height="40" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="105" y="38.6" font-size="13" fill="var(--fg)" text-anchor="middle">Client 2</text>
<path d="M105 54 L105 98" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="105,98 100,88 110,88" fill="var(--fg)"/>
<text x="115" y="80" font-size="12" fill="var(--fg)" text-anchor="start">read balance</text>
<rect x="30" y="100" width="150" height="60" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="105" y="126.6" font-size="13" fill="var(--fg)" text-anchor="middle">Replica East</text>
<text x="105" y="142.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">balance = 100 (old)</text>
</g>
<g data-cue="consistent">
<path d="M105 160 L105 192" fill="none" stroke="var(--fg-muted)" stroke-width="1.5"/>
<polygon points="105,192 100,182 110,182" fill="var(--fg-muted)"/>
<rect x="20" y="192" width="280" height="52" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="160" y="214.6" font-size="13" fill="var(--fg)" text-anchor="middle">CONSISTENT</text>
<text x="160" y="230.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">East says try later: never wrong</text>
</g>
<g data-cue="available">
<path d="M105 160 L340 192" fill="none" stroke="var(--fg-muted)" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="340,192 329.4,195.6 330.8,185.7" fill="var(--fg-muted)"/>
<rect x="340" y="192" width="280" height="52" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="480" y="214.6" font-size="13" fill="var(--fg)" text-anchor="middle">AVAILABLE</text>
<text x="480" y="230.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">East answers 100: maybe stale</text>
</g>
</svg>
```

```narrate
Two replicas are cut off from each other. [[write]] A client writes a new balance of fifty to West. [[split]] The link between them is down, so East never hears about it. [[read]] Another client asks East for the balance, and East still holds one hundred. [[consistent]] East can refuse, and say try later, which keeps it correct but unavailable. [[available]] Or East can answer one hundred, which keeps it up but stale.
```

## The cheat sheet

Say the **symptom** first, then the fix.

| Symptom | First move |
|---|---|
| Queries are slow | Look at the query plan, add indexes |
| Too many reads | Cache, then read replicas |
| One machine is full or busy with writes | Scale up, then shard |
| One key is hot | Cache it, replicate it, split it |
| Servers come and go | Consistent hashing |
| A user sees old data after saving | Read from the primary after a write |
| The network can split | Choose consistency or availability per feature |

```narrate
Use this table as your script. Say the symptom first, then the fix. Slow queries mean indexes. Too many reads mean a cache, then replicas. Too many writes mean a bigger machine first, and sharding last. A hot key needs a cache. Servers coming and going call for consistent hashing. And whenever the network can split, say out loud which you would give up for this feature, consistency or availability.
```

```quiz
q: One user's profile gets most of the traffic, and the shard holding it is overloaded. What helps most?
options:
  - Add more shards
  - Cache that profile, and replicate its reads
  - Change the database engine
answer: 1
why: One key lives on one shard, so more shards do not split it. A cache and replicas spread the reads.
```
