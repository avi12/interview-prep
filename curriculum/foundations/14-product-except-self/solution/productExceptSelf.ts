export function productExceptSelf(numbers: number[]) {
  const products = numbers.map(() => 1);
  let productToTheLeft = 1;
  for (const [i, value] of numbers.entries()) {
    products[i] = productToTheLeft;
    productToTheLeft *= value;
  }
  let productToTheRight = 1;
  for (let i = numbers.length - 1; i >= 0; i--) {
    products[i] *= productToTheRight;
    productToTheRight *= numbers[i];
  }
  return products;
}
