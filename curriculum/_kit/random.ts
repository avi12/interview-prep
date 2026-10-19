const LCG_MULTIPLIER = 1_664_525;
const LCG_INCREMENT = 1_013_904_223;
const LCG_MODULUS = 2 ** 32;

export const createSeededRandom = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS;
    return state / LCG_MODULUS;
  };
};

export const createSeededPicker = (seed: number) => {
  const random = createSeededRandom(seed);
  return (limit: number) => Math.floor(random() * limit);
};
