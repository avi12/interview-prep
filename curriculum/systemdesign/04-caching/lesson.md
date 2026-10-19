---
title: Caching
lang: py
minutes: 25
level: junior
roles: [backend, ai]
files: [lru_cache.py]
sources:
  - https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Strategies.html
  - https://redis.io/docs/latest/develop/reference/eviction/
  - https://en.wikipedia.org/wiki/Cache_stampede
  - https://docs.python.org/3/library/collections.html
  - https://github.com/donnemartin/system-design-primer
  - https://gist.github.com/jboner/2841832
---

## Cache-aside: the default

A cache is a **small, fast copy** of data that is slow to fetch.

| Read from | About |
|---|---|
| Memory | 100 ns |
| SSD, random | 150 microseconds |
| Another machine in the datacenter | 500 microseconds |

In **cache-aside** (lazy loading) the app runs the show: look in the cache, on a miss read the database, then fill the cache. The score is the **hit ratio**: hits divided by hits plus misses.

```svg The first read pays for the database trip. Later reads are answered from memory
<svg viewBox="0 0 640 294" role="img" aria-label="Cache-aside: on a miss the app reads the database and fills the cache, and the next read is a hit" font-family="var(--font-mono)" font-size="13">
<path d="M66 38 L66 288" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="6" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="66" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">App</text>
<path d="M320 38 L320 288" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="260" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="320" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<path d="M574 38 L574 288" fill="none" stroke="var(--border)" stroke-width="2" stroke-dasharray="6 4"/>
<rect x="514" y="2" width="120" height="36" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="574" y="24.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<g data-cue="ask">
<path d="M68 79.4 L318 79.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="318,79.4 308,84.4 308,74.4" fill="var(--fg)"/>
<text x="193" y="72.4" font-size="12" fill="var(--fg)" text-anchor="middle">get user:42</text>
</g>
<g data-cue="miss">
<path d="M318 117.4 L68 117.4" fill="none" stroke="var(--danger)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,117.4 78,112.4 78,122.4" fill="var(--danger)"/>
<text x="193" y="110.4" font-size="12" fill="var(--fg)" text-anchor="middle">miss</text>
</g>
<g data-cue="miss">
<path d="M68 155.4 L572 155.4" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="572,155.4 562,160.4 562,150.4" fill="var(--fg)"/>
<text x="193" y="148.4" font-size="12" fill="var(--fg)" text-anchor="middle">SELECT user 42</text>
</g>
<g data-cue="miss">
<path d="M572 193.4 L68 193.4" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="68,193.4 78,188.4 78,198.4" fill="var(--fg)"/>
<text x="193" y="186.4" font-size="12" fill="var(--fg)" text-anchor="middle">row</text>
</g>
<g data-cue="fill">
<path d="M68 231.4 L318 231.4" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="318,231.4 308,236.4 308,226.4" fill="var(--ok)"/>
<text x="193" y="224.4" font-size="12" fill="var(--fg)" text-anchor="middle">set user:42, TTL 5 min</text>
</g>
<g data-cue="hit">
<rect x="4" y="247.5" width="384" height="27" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="196" y="264.5" font-size="12" fill="var(--fg)" text-anchor="middle">Next read: get user:42 is a hit. No database trip.</text>
</g>
</svg>
```

```narrate
The app wants user forty two. [[ask]] It asks the cache first. [[miss]] The cache has nothing, so the app goes to the database and gets the row. [[fill]] It then stores the row in the cache with an expiry time. [[hit]] The next read is a hit and never touches the database. The price is paid once per key, and only for keys somebody actually asks for.
```

> **Why:** only requested data is cached, and a dead cache node is not fatal. The app falls back to the database: slower, not broken.

## Writes: through, behind, or invalidate

| Strategy | Write path | Cost or risk |
|---|---|---|
| Write-through | Write cache, cache writes database, then answer | Slower writes. Never stale. Caches data nobody reads |
| Write-behind | Write cache, answer, database later | Fast writes. Data lost if the cache dies first |
| Invalidate | Write database, delete the cache key | Next read refills it. Simple, very common |

```svg Write-through finishes both writes first. Write-behind promises the database write for later
<svg viewBox="0 0 640 214" role="img" aria-label="Write-through writes both places before answering. Write-behind answers first and writes the database later" font-family="var(--font-mono)" font-size="13">
<g data-cue="through">
<text x="20" y="24" font-size="12" fill="var(--fg-muted)" text-anchor="start">WRITE-THROUGH</text>
<rect x="20" y="34" width="120" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="80" y="63.6" font-size="13" fill="var(--fg)" text-anchor="middle">App</text>
<path d="M140 59 L200 59" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="200,59 190,64 190,54" fill="var(--fg)"/>
<text x="170" y="51" font-size="11" fill="var(--fg)" text-anchor="middle">1 write</text>
<rect x="200" y="34" width="120" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="260" y="63.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<path d="M320 59 L380 59" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="380,59 370,64 370,54" fill="var(--fg)"/>
<text x="350" y="51" font-size="11" fill="var(--fg)" text-anchor="middle">2 write</text>
<rect x="380" y="34" width="120" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="440" y="63.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<text x="520" y="56" font-size="12" fill="var(--fg)" text-anchor="start">slower writes</text>
<text x="520" y="74" font-size="12" fill="var(--fg)" text-anchor="start">never stale</text>
</g>
<g data-cue="behind">
<text x="20" y="118" font-size="12" fill="var(--fg-muted)" text-anchor="start">WRITE-BEHIND</text>
<rect x="20" y="128" width="120" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="80" y="157.6" font-size="13" fill="var(--fg)" text-anchor="middle">App</text>
<path d="M140 153 L200 153" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="200,153 190,158 190,148" fill="var(--fg)"/>
<text x="170" y="145" font-size="11" fill="var(--fg)" text-anchor="middle">1 write</text>
<rect x="200" y="128" width="120" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="260" y="157.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<path d="M320 153 L380 153" fill="none" stroke="var(--fg)" stroke-width="2" stroke-dasharray="6 4"/>
<polygon points="380,153 370,158 370,148" fill="var(--fg)"/>
<text x="350" y="145" font-size="11" fill="var(--fg)" text-anchor="middle">2 later</text>
<rect x="380" y="128" width="120" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="440" y="157.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<text x="520" y="150" font-size="12" fill="var(--danger)" text-anchor="start">fast writes</text>
<text x="520" y="168" font-size="12" fill="var(--danger)" text-anchor="start">may lose writes</text>
</g>
</svg>
```

```narrate
Two ways to write. [[through]] With write-through, the app writes the cache, the cache writes the database, and only then is the caller answered. Writes are slower, but readers never see stale data. [[behind]] With write-behind, the caller is answered right after the cache write, and the database catches up later. That is fast, but if the cache dies first, the write is gone.
```

> **Why:** people tolerate a slow save more than a slow page. Write-through moves the cost to the write, where it hurts less.

> **Not this:** write-behind for orders or money. The cache is memory. A crash before the flush loses the write.

```quiz
q: Which write strategy can lose an acknowledged write if the cache crashes?
options:
  - Write-through
  - Write-behind
  - Invalidate on write
answer: 1
why: Write-behind answers the caller after the cache write only. The database write is still pending when the cache dies.
```

## TTL: how stale can you afford?

**TTL** (time to live) makes a key expire. An expired key counts as a miss, so the next read refreshes it. A TTL does not make data fresh. It **bounds** how stale it can get.

Ask: "how wrong may this be, and for how long?" A price: seconds. A profile: minutes. Rarely changed config: hours.

```svg After the database changes, readers see the old value until the TTL ends
<svg viewBox="0 0 640 184" role="img" aria-label="A TTL bounds how long readers can see old data after the database changes" font-family="var(--font-mono)" font-size="13">
<path d="M40 110 L610 110" fill="none" stroke="var(--border)" stroke-width="2"/>
<g data-cue="fill">
<path d="M80 98 L80 122" fill="none" stroke="var(--border)" stroke-width="2"/>
<text x="80" y="142" font-size="12" fill="var(--fg)" text-anchor="middle">cache filled</text>
<path d="M80 60 L440 60" fill="none" stroke="var(--primary)" stroke-width="2"/>
<path d="M80 54 L80 66" fill="none" stroke="var(--primary)" stroke-width="2"/>
<path d="M440 54 L440 66" fill="none" stroke="var(--primary)" stroke-width="2"/>
<text x="260" y="46" font-size="13" fill="var(--fg)" text-anchor="middle">TTL: 60 seconds</text>
</g>
<g data-cue="stale">
<rect x="200" y="92" width="240" height="32" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="320" y="112" font-size="12" fill="var(--fg)" text-anchor="middle">readers see old data</text>
</g>
<g data-cue="change">
<path d="M200 98 L200 122" fill="none" stroke="var(--border)" stroke-width="2"/>
<text x="200" y="142" font-size="12" fill="var(--fg)" text-anchor="middle">database</text>
<text x="200" y="158" font-size="12" fill="var(--fg)" text-anchor="middle">changes</text>
</g>
<g data-cue="expire">
<path d="M440 98 L440 122" fill="none" stroke="var(--border)" stroke-width="2"/>
<text x="440" y="142" font-size="12" fill="var(--fg)" text-anchor="middle">TTL ends</text>
<text x="440" y="158" font-size="12" fill="var(--ok)" text-anchor="middle">next read refreshes</text>
</g>
</svg>
```

```narrate
Follow the timeline. [[fill]] The cache is filled, with a time to live of sixty seconds. [[change]] Later, the database changes. [[stale]] Until the time to live runs out, readers keep seeing the old value. [[expire]] Then the key expires, and the next read refreshes it. The worst case staleness is the time to live. That is the whole promise.
```

> **Trap:** no TTL at all. If one invalidation is ever missed, that key stays wrong forever. The TTL is your safety net.

> **Trap:** filling many keys together with the same TTL. They all expire together. Add a little random jitter.

## Stampede: the crowd at the door

A hot key expires. In the same instant 1,000 requests miss, and **all 1,000 rebuild it** from the database. The database collapses, the key is never refilled, and the hit ratio stays near zero.

Fixes:

- **Lock**: one request rebuilds, the others wait or get the old value
- **Refresh early**: a job renews the key before it expires
- **Jitter** the TTLs so keys do not expire together

```svg A lock turns 1,000 identical queries into one
<svg viewBox="0 0 640 236" role="img" aria-label="Cache stampede: 1,000 requests all rebuild an expired key. The fix lets one request rebuild it" font-family="var(--font-mono)" font-size="13">
<g data-cue="stampede">
<text x="10" y="24" font-size="12" fill="var(--fg-muted)" text-anchor="start">STAMPEDE</text>
<rect x="10" y="34" width="150" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="85" y="57.6" font-size="13" fill="var(--fg)" text-anchor="middle">1,000 requests</text>
<text x="85" y="73.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">same key</text>
<path d="M160 61 L220 61" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="220,61 210,66 210,56" fill="var(--fg)"/>
<rect x="220" y="34" width="150" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="295" y="57.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<text x="295" y="73.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">key expired</text>
<path d="M370 61 L430 61" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="430,61 420,66 420,56" fill="var(--danger)"/>
<rect x="430" y="34" width="150" height="54" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="505" y="57.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<text x="505" y="73.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">1,000 queries</text>
<text x="430" y="108" font-size="12" fill="var(--danger)" text-anchor="start">overloaded, never refills</text>
</g>
<g data-cue="fix">
<text x="10" y="130" font-size="12" fill="var(--fg-muted)" text-anchor="start">FIX: ONE REBUILDS, THE REST WAIT</text>
<rect x="10" y="140" width="150" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="85" y="163.6" font-size="13" fill="var(--fg)" text-anchor="middle">1,000 requests</text>
<text x="85" y="179.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">same key</text>
<path d="M160 167 L220 167" fill="none" stroke="var(--fg)" stroke-width="2"/>
<polygon points="220,167 210,172 210,162" fill="var(--fg)"/>
<rect x="220" y="140" width="150" height="54" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="295" y="163.6" font-size="13" fill="var(--fg)" text-anchor="middle">Cache</text>
<text x="295" y="179.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">expired + lock</text>
<path d="M370 167 L430 167" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="430,167 420,172 420,162" fill="var(--ok)"/>
<rect x="430" y="140" width="150" height="54" fill="var(--primary-container)" stroke="var(--ok)" stroke-width="2"/>
<text x="505" y="163.6" font-size="13" fill="var(--fg)" text-anchor="middle">Database</text>
<text x="505" y="179.6" font-size="11" fill="var(--fg-muted)" text-anchor="middle">1 query</text>
<text x="430" y="214" font-size="12" fill="var(--fg)" text-anchor="start">rest wait or use old value</text>
</g>
</svg>
```

```narrate
Picture a very popular key expiring. [[stampede]] A thousand requests arrive at once, all find the cache empty, and all send the same query to the database. It is overloaded, and the cache never gets refilled. [[fix]] The fix is a lock. One request rebuilds the value. The other nine hundred ninety nine wait a moment, or are served the old value. The database sees one query.
```

> **Not this:** just a longer TTL. It delays the stampede, but the key still expires one day, with the same crowd waiting.

```quiz
q: 1,000 requests hit an expired hot key at the same moment. What is the best fix?
options:
  - Let every request rebuild it, the database can cope
  - Let one request rebuild it while the rest wait or use the old value
  - Remove the TTL for good
answer: 1
why: One rebuild protects the database from 999 identical queries. Removing the TTL means data can stay stale forever.
```

## Eviction: what leaves when it is full

A cache has a size limit. When it is full, a policy picks who goes.

| Policy | Evicts | Good when |
|---|---|---|
| LRU | Least recently used | A few keys are much hotter than the rest |
| LFU | Least frequently used | Popularity is stable over time |
| Random | Any key | All keys are used about equally |
| TTL-first | Soonest to expire | You set TTLs on purpose |

Redis recommends `allkeys-lru` as the default. It does not track exact order. It **samples** about 5 keys and drops the oldest of them. That is nearly as good, and cheaper.

> **Why:** LRU bets that what was used lately will be used again. Real traffic is lumpy, a few hot keys, so the bet usually pays.

> **Not this:** evict the key that was inserted first. A key that is hot all day would still be thrown out.

```narrate
When the cache is full, a policy chooses who leaves. Least recently used is the usual default, because real traffic is lumpy and a few keys are very hot. Least frequently used suits stable popularity. Random works when everything is used about equally. Redis does not even keep exact order. It samples a few keys and removes the oldest of those, which is nearly as good and much cheaper.
```

## How an LRU stays O(1)

An LRU needs three moves, all **O(1)**: find a key, mark it recent, drop the oldest.

- A **hash map** finds a key fast, but has no order
- A **doubly linked list** keeps the order. With the node in hand, unlinking and moving it is O(1), because it knows both neighbors
- A plain array makes moving a key O(n)

Combine them: the map points to nodes, the list holds the order. Python's `OrderedDict` is exactly this pair in one object.

```svg The map finds the node. The list says who is next to go
<svg viewBox="0 0 640 252" role="img" aria-label="LRU cache: a hash map finds the node, a doubly linked list keeps the order" font-family="var(--font-mono)" font-size="13">
<g data-cue="list">
<text x="14" y="80" font-size="11" fill="var(--fg-muted)" text-anchor="start">most</text>
<text x="14" y="93" font-size="11" fill="var(--fg-muted)" text-anchor="start">recent</text>
<text x="432" y="126" font-size="11" fill="var(--fg-muted)" text-anchor="start">least recent</text>
<rect x="90" y="60" width="100" height="50" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
<text x="140" y="89.6" font-size="13" fill="var(--fg)" text-anchor="middle">A = 1</text>
<rect x="230" y="60" width="100" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="280" y="89.6" font-size="13" fill="var(--fg)" text-anchor="middle">B = 2</text>
<rect x="370" y="60" width="100" height="50" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
<text x="420" y="89.6" font-size="13" fill="var(--fg)" text-anchor="middle">C = 3</text>
<path d="M190 76 L230 76" fill="none" stroke="var(--fg)" stroke-width="1.5"/>
<polygon points="230,76 220,81 220,71" fill="var(--fg)"/>
<path d="M230 96 L190 96" fill="none" stroke="var(--fg)" stroke-width="1.5"/>
<polygon points="190,96 200,91 200,101" fill="var(--fg)"/>
<path d="M330 76 L370 76" fill="none" stroke="var(--fg)" stroke-width="1.5"/>
<polygon points="370,76 360,81 360,71" fill="var(--fg)"/>
<path d="M370 96 L330 96" fill="none" stroke="var(--fg)" stroke-width="1.5"/>
<polygon points="330,96 340,91 340,101" fill="var(--fg)"/>
</g>
<g data-cue="map">
<rect x="90" y="170" width="100" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="140" y="186.2" font-size="12" fill="var(--fg)" text-anchor="middle">A</text>
<text x="140" y="202.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">points to node</text>
<path d="M140 170 L140 112" fill="none" stroke="var(--fg-muted)" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="140,112 145,122 135,122" fill="var(--fg-muted)"/>
<rect x="230" y="170" width="100" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="280" y="186.2" font-size="12" fill="var(--fg)" text-anchor="middle">B</text>
<text x="280" y="202.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">points to node</text>
<path d="M280 170 L280 112" fill="none" stroke="var(--fg-muted)" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="280,112 285,122 275,122" fill="var(--fg-muted)"/>
<rect x="370" y="170" width="100" height="40" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
<text x="420" y="186.2" font-size="12" fill="var(--fg)" text-anchor="middle">C</text>
<text x="420" y="202.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">points to node</text>
<path d="M420 170 L420 112" fill="none" stroke="var(--fg-muted)" stroke-width="1.5" stroke-dasharray="6 4"/>
<polygon points="420,112 425,122 415,122" fill="var(--fg-muted)"/>
<text x="20" y="194" font-size="12" fill="var(--fg-muted)" text-anchor="start">hash map</text>
</g>
<g data-cue="get">
<path d="M280 60 L280 22 L140 22 L140 58" fill="none" stroke="var(--ok)" stroke-width="2"/>
<polygon points="140,58 135,48 145,48" fill="var(--ok)"/>
<text x="210" y="16" font-size="12" fill="var(--fg)" text-anchor="middle">get B: move it to the front</text>
</g>
<g data-cue="evict">
<path d="M470 85 L514 85" fill="none" stroke="var(--danger)" stroke-width="2"/>
<polygon points="514,85 504,90 504,80" fill="var(--danger)"/>
<rect x="514" y="62" width="116" height="46" fill="var(--surface-3)" stroke="var(--danger)" stroke-width="2"/>
<text x="572" y="81.2" font-size="12" fill="var(--fg)" text-anchor="middle">put when full:</text>
<text x="572" y="97.2" font-size="10" fill="var(--fg-muted)" text-anchor="middle">drop the tail</text>
</g>
<text x="20" y="240" font-size="12" fill="var(--fg-muted)" text-anchor="start">Find in O(1) with the map. Reorder in O(1) with the list.</text>
</svg>
```

```narrate
Here are the two parts. [[list]] The doubly linked list keeps the order, most recent at the front and least recent at the back. [[map]] The hash map points from each key straight to its node, so lookups are instant. [[get]] On a get, we unlink that node and move it to the front, which takes constant time because the node knows its neighbors. [[evict]] When we put a new key into a full cache, the node at the back is dropped.
```

> **Why:** say the design out loud before you code: a map for lookup, a list for order. Then use `OrderedDict` if allowed.

> **Not this:** a plain list of keys ordered by use. Finding and moving a key is O(n), and 200,000 calls would crawl.

## Your turn

Open `lru_cache.py` and implement `LRUCache(capacity)`.

- `get(key)` returns the value, or `-1` if missing (the classic interview signature). A hit counts as a use
- `put(key, value)` stores it. Updating a key counts as a use. When over capacity, drop the **least recently used** key
- Both must be O(1). `OrderedDict` is fine, or build the linked list yourself

Run the tests from the Run button, or `pnpm lesson test systemdesign/04-caching`.

```hint
`from collections import OrderedDict` keeps keys in order. The front is the oldest, the back is the newest.
```

```hint
`move_to_end(key)` marks a key as most recent. `popitem(last=False)` removes the oldest.
```

```hint
In `get`, return early if the key is missing. In `put`, store the value, move the key to the end, then drop from the front while `len(...) > capacity`.
```
