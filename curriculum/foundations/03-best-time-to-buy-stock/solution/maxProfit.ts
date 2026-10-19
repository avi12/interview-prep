export function maxProfit(prices: number[]) {
  let lowestPrice = Infinity;
  let bestProfit = 0;
  for (const price of prices) {
    lowestPrice = Math.min(lowestPrice, price);
    bestProfit = Math.max(bestProfit, price - lowestPrice);
  }
  return bestProfit;
}
