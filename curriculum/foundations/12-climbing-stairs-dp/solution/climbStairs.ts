export function climbStairs(n: number) {
  if (n <= 2) {
    return n;
  }

  const waysByStep = [0, 1, 2];
  for (let step = 3; step <= n; step++) {
    waysByStep.push(waysByStep[step - 1] + waysByStep[step - 2]);
  }
  return waysByStep[n];
}
