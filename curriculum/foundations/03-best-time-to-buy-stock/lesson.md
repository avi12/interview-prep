---
title: Best Time to Buy and Sell Stock
lang: ts
minutes: 15
level: junior
roles: [backend, analyst, ai]
files: [maxProfit.ts]
sources:
  - https://neetcode.io/solutions/best-time-to-buy-and-sell-stock
  - https://www.hellointerview.com/community/questions/max-profit-stock/cm5eh7nrh04qd838okyg0oqrg
  - https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/min
---

## The problem

`prices[i]` is a stock's price on day `i`. Buy on one day, sell on a **later** day. Return the biggest profit, or `0` if every trade loses money.

- `[7, 1, 5, 3, 6, 4]` returns `5`: buy at 1, sell at 6
- `[7, 6, 4, 3, 1]` returns `0`: the price only falls, so do not trade

```narrate
You get the price of a stock for each day. Pick one day to buy and a later day to sell, and return the biggest profit you can make. If the price only falls, the best move is not to trade at all, so the answer is zero.
```

## Brute force, and its price

Try every pair of days: a buy day and a later sell day. Two loops.

```ts
for (let buy = 0; buy < prices.length; buy++)
  for (let sell = buy + 1; sell < prices.length; sell++)
    best = Math.max(best, prices[sell] - prices[buy]);
```

With 100,000 days that is about 5 billion pairs. That is **O(n²)**.

> **Why:** say the cost out loud, then look for waste. Here the waste is clear: for one sell day, only the **cheapest earlier price** can be the best buy. The other pairs never win.

```narrate
The obvious way is to try every pair of days with two loops. It works, but with a hundred thousand days that is about five billion pairs. Look for the waste. For any given sell day, only the cheapest earlier price can be the best day to buy. All the other pairs can never win.
```

## One pass with a running minimum

Stand on a day and pretend it is the sell day. The best buy is the cheapest price **before** it. Keep that in one variable and update it as you walk.

For each price:

1. Lower `lowestPrice` if this price is cheaper
2. Compare `price - lowestPrice` with `bestProfit`

```svg Walking [7, 1, 5, 3, 6, 4]: the lowest price so far, and the profit if you sold today
<svg viewBox="0 0 520 224" role="img" aria-label="Prices, lowest price so far and profit per day">
  <g font-family="var(--font-mono)" font-size="16" text-anchor="middle">
    <g data-cue="prices">
      <text x="8" y="43" text-anchor="start" font-size="12" fill="var(--fg-muted)">price</text>
      <rect x="112" y="20" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="139" y="43" fill="var(--fg)">7</text>
      <rect x="174" y="20" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="201" y="43" fill="var(--fg)">1</text>
      <rect x="236" y="20" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="263" y="43" fill="var(--fg)">5</text>
      <rect x="298" y="20" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="325" y="43" fill="var(--fg)">3</text>
      <rect x="360" y="20" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="387" y="43" fill="var(--fg)">6</text>
      <rect x="422" y="20" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="449" y="43" fill="var(--fg)">4</text>
    </g>
    <g data-cue="lowest">
      <text x="8" y="103" text-anchor="start" font-size="12" fill="var(--fg-muted)">lowest so far</text>
      <rect x="112" y="80" width="54" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="139" y="103" fill="var(--fg)">7</text>
      <rect x="174" y="80" width="54" height="34" fill="var(--primary-container)" stroke="var(--border)" stroke-width="2"/>
      <text x="201" y="103" fill="var(--fg)">1</text>
      <rect x="236" y="80" width="54" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="263" y="103" fill="var(--fg)">1</text>
      <rect x="298" y="80" width="54" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="325" y="103" fill="var(--fg)">1</text>
      <rect x="360" y="80" width="54" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="387" y="103" fill="var(--fg)">1</text>
      <rect x="422" y="80" width="54" height="34" fill="var(--surface-3)" stroke="var(--border)" stroke-width="2"/>
      <text x="449" y="103" fill="var(--fg)">1</text>
    </g>
    <g data-cue="profit">
      <text x="8" y="163" text-anchor="start" font-size="12" fill="var(--fg-muted)">sell today</text>
      <rect x="112" y="140" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="139" y="163" fill="var(--fg)">0</text>
      <rect x="174" y="140" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="201" y="163" fill="var(--fg)">0</text>
      <rect x="236" y="140" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="263" y="163" fill="var(--fg)">4</text>
      <rect x="298" y="140" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="325" y="163" fill="var(--fg)">2</text>
      <rect x="360" y="140" width="54" height="34" fill="var(--primary-container)" stroke="var(--primary)" stroke-width="4"/>
      <text x="387" y="163" fill="var(--fg)">5</text>
      <rect x="422" y="140" width="54" height="34" fill="var(--surface-2)" stroke="var(--border)" stroke-width="2"/>
      <text x="449" y="163" fill="var(--fg)">3</text>
    </g>
    <g data-cue="best">
      <text x="8" y="206" text-anchor="start" font-size="14" fill="var(--fg)">best = 5: buy at 1, sell at 6</text>
    </g>
  </g>
</svg>
```

```narrate
Walk the prices once. [[prices]] Here are six days. [[lowest]] The second row is the cheapest price seen so far. It drops to one on day two and stays there. [[profit]] The third row asks: what if I sold today, having bought at that cheapest price? Day five, with a price of six, gives five. [[best]] The best of those is five, and that is the answer.
```

> **Why:** the best buy for any sell day depends only on the cheapest price **before** it, and one variable remembers that. You never look back: **O(n)** time, **O(1)** space.

## Three ways it goes wrong

> **Not this:** `Math.max(...prices) - Math.min(...prices)`. It ignores time. For `[10, 1]` it says 9, but the high comes first, so the answer is `0`.

> **Trap:** start `bestProfit` at `0`, not at a negative number. Zero means "do not trade", the right answer when the price only falls.

> **Trap:** start `lowestPrice` at `Infinity`, not `0`. A start of zero is cheaper than every real price, so every profit would just equal the price.

```narrate
Three things to watch. Do not subtract the lowest price from the highest, because that ignores the order of the days. Start the best profit at zero, so a falling market returns zero. And start the lowest price at infinity, not zero, or nothing will ever look cheaper.
```

```quiz
q: Prices are [3, 2, 6, 5, 0, 3]. What is the biggest profit?
options:
  - 3
  - 4
  - 6
answer: 1
why: The 0 comes after the 6, so you cannot sell high after buying there. The best trade is buy at 2, sell at 6.
```

## Your turn

Open `maxProfit.ts` in your copy and make the tests pass. The file exports `maxProfit(prices)`.

- One loop, two variables
- Return `0` for an empty list or a falling market

The last test counts how many times you read the prices. A check of every pair runs out of reads long before it finishes.

```hint
Make two variables before the loop: `lowestPrice` starting at `Infinity` and `bestProfit` starting at `0`.
```

```hint
Inside a `for...of` loop: lower `lowestPrice` with `Math.min`, then raise `bestProfit` with `Math.max(bestProfit, price - lowestPrice)`.
```

```hint
Lowering the minimum first is safe. Selling on the day you buy gives a profit of `0`, which can never beat `bestProfit`. Return `bestProfit` after the loop.
```
