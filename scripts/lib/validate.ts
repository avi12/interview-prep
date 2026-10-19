import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Token } from "marked";
import type { Lesson } from "#scripts/lib/lessons.ts";

const EXERCISE_CARD_TITLE = "Your turn";
const MIN_CARDS = 4;
const MAX_CARD_WORDS = 130;
const MAX_NARRATE_WORDS = 110;
const MIN_NARRATE_WORDS = 15;
const MIN_HINTS = 2;
const CUE_MARKER_PATTERN = /\[\[([\w-]+)\]\]/g;
const CUE_ATTRIBUTE_PATTERN = /data-cue="([\w-]+)"/g;
const EM_DASH = "—";

const NON_PROSE_TOKENS = new Set(["code", "table", "space", "html"]);

const proseWords = (tokens: Token[]) =>
  tokens
    .filter(token => !NON_PROSE_TOKENS.has(token.type))
    .map(token => token.raw)
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;

const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length;

const matchesOf = ({ pattern, text }: { pattern: RegExp; text: string }) =>
  [...text.matchAll(pattern)].map(match => match[1]);

const hasFiles = ({ dir, files }: { dir: string; files: string[] }) =>
  existsSync(dir) && files.every(file => existsSync(resolve(dir, file)));

const cardProblems = (card: Lesson["cards"][number]) => {
  const problems: string[] = [];
  const isExerciseCard = card.title === EXERCISE_CARD_TITLE;
  const words = proseWords(card.tokens);
  if (words > MAX_CARD_WORDS) problems.push(`card "${card.title}" has ${words} words of prose (max ${MAX_CARD_WORDS})`);
  const narrateWords = wordCount(card.narrate.replace(CUE_MARKER_PATTERN, ""));
  if (!isExerciseCard && narrateWords < MIN_NARRATE_WORDS) problems.push(`card "${card.title}" needs a narrate script (min ${MIN_NARRATE_WORDS} words)`);
  if (narrateWords > MAX_NARRATE_WORDS) problems.push(`card "${card.title}" narration is ${narrateWords} words (max ${MAX_NARRATE_WORDS})`);
  const figureCues = new Set(card.figures.flatMap(({ svg }) => matchesOf({ pattern: CUE_ATTRIBUTE_PATTERN, text: svg })));
  const spokenCues = new Set(matchesOf({ pattern: CUE_MARKER_PATTERN, text: card.narrate }));
  for (const cue of spokenCues) if (!figureCues.has(cue)) problems.push(`card "${card.title}": cue [[${cue}]] has no data-cue element`);
  for (const cue of figureCues) if (!spokenCues.has(cue)) problems.push(`card "${card.title}": data-cue="${cue}" is never spoken`);
  return problems;
};

export const lessonProblems = (lesson: Lesson) => {
  const problems: string[] = [];
  const { cards, body, meta } = lesson;
  if (cards.length < MIN_CARDS) problems.push(`needs at least ${MIN_CARDS} cards, has ${cards.length}`);
  if (meta.sources.length === 0) problems.push("needs at least one source URL");
  if (!body.includes("> **Why:**")) problems.push('needs a "> **Why:**" callout');
  if (!body.includes("> **Not this:**")) problems.push('needs a "> **Not this:**" callout (why not the other way)');
  if (body.includes(EM_DASH)) problems.push("contains an em dash, use a hyphen");
  if (!cards.some(card => card.quizzes.length > 0)) problems.push("needs at least one quiz");
  if (!cards.some(card => card.figures.length > 0)) problems.push("needs at least one svg diagram");
  for (const card of cards) problems.push(...cardProblems(card));
  if (!lesson.hasExercise) return problems;
  const last = cards.at(-1);
  if (last?.title !== EXERCISE_CARD_TITLE) problems.push(`last card must be "${EXERCISE_CARD_TITLE}"`);
  if ((last?.hints.length ?? 0) < MIN_HINTS) problems.push(`"${EXERCISE_CARD_TITLE}" needs at least ${MIN_HINTS} hints`);
  if (meta.files.length === 0) problems.push("frontmatter needs files: [...]");
  if (!hasFiles({ dir: resolve(lesson.dir, "starter"), files: meta.files })) problems.push("starter/ is missing a listed file");
  if (!hasFiles({ dir: resolve(lesson.dir, "solution"), files: meta.files })) problems.push("solution/ is missing a listed file");
  const testsDir = resolve(lesson.dir, "tests");
  if (!existsSync(testsDir) || readdirSync(testsDir).length === 0) problems.push("tests/ is empty");
  return problems;
};
