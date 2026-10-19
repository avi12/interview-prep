import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { resolve, basename } from "node:path";
import { marked, type Tokens, type Token } from "marked";
import { parse as parseYaml } from "yaml";
import { z } from "zod";
import { CURRICULUM_DIR, KIT_DIR_NAME, TRACKS_FILE, WORK_DIR } from "#scripts/lib/paths.ts";
import { lessonMetaSchema, quizSchema, tracksSchema } from "#scripts/lib/schema.ts";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const CARD_HEADING_DEPTH = 2;
const SPECIAL_FENCES = new Set(["narrate", "hint", "quiz", "svg"]);

export const readTracks = () => tracksSchema.parse(JSON.parse(readFileSync(TRACKS_FILE, "utf8")));

const isDirectory = (path: string) => statSync(path).isDirectory();

const listDirectories = (parent: string) =>
  readdirSync(parent)
    .filter(name => !name.startsWith("_") && !name.startsWith("."))
    .map(name => resolve(parent, name))
    .filter(isDirectory);

const splitFrontmatter = ({ source, id }: { source: string; id: string }) => {
  const match = FRONTMATTER_PATTERN.exec(source);
  if (!match) throw new Error(`${id}: lesson.md has no frontmatter`);
  return { rawMeta: parseYaml(match[1]), body: match[2] };
};

const fenceName = (token: Tokens.Code) => (token.lang ?? "").split(/\s+/)[0];
const fenceRest = (token: Tokens.Code) => (token.lang ?? "").split(/\s+/).slice(1).join(" ");

type Quiz = z.infer<typeof quizSchema>;
type Figure = { caption: string; svg: string };
type Block =
  | { kind: "tokens"; tokens: Token[] }
  | { kind: "figure"; figure: Figure }
  | { kind: "quiz"; quiz: Quiz }
  | { kind: "hint"; text: string };

const emptyCard = (title: string) => ({
  title,
  tokens: [] as Token[],
  blocks: [] as Block[],
  narrate: "",
  hints: [] as string[],
  quizzes: [] as Quiz[],
  figures: [] as Figure[]
});

const absorbSpecialFence = ({ card, token }: { card: ReturnType<typeof emptyCard>; token: Tokens.Code }) => {
  const name = fenceName(token);
  if (name === "narrate") card.narrate = token.text.trim();
  if (name === "hint") {
    card.hints.push(token.text.trim());
    card.blocks.push({ kind: "hint", text: token.text.trim() });
  }
  if (name === "quiz") {
    const quiz = quizSchema.parse(parseYaml(token.text));
    card.quizzes.push(quiz);
    card.blocks.push({ kind: "quiz", quiz });
  }
  if (name === "svg") {
    const figure = { caption: fenceRest(token), svg: token.text.trim() };
    card.figures.push(figure);
    card.blocks.push({ kind: "figure", figure });
  }
};

const pushToken = ({ card, token }: { card: ReturnType<typeof emptyCard>; token: Token }) => {
  card.tokens.push(token);
  const last = card.blocks.at(-1);
  if (last?.kind === "tokens") return last.tokens.push(token);
  card.blocks.push({ kind: "tokens", tokens: [token] });
};

const isSpecialFence = (token: Token) => token.type === "code" && SPECIAL_FENCES.has(fenceName(token as Tokens.Code));

export const parseCards = (body: string) => {
  const cards: ReturnType<typeof emptyCard>[] = [];
  for (const token of marked.lexer(body)) {
    const isCardStart = token.type === "heading" && token.depth === CARD_HEADING_DEPTH;
    if (isCardStart) {
      cards.push(emptyCard(token.text));
      continue;
    }
    const card = cards.at(-1);
    if (!card) continue;
    if (isSpecialFence(token)) {
      absorbSpecialFence({ card, token: token as Tokens.Code });
      continue;
    }
    pushToken({ card, token });
  }
  return cards;
};

const readLesson = ({ dir, track }: { dir: string; track: string }) => {
  const slug = basename(dir);
  const id = `${track}/${slug}`;
  const { rawMeta, body } = splitFrontmatter({ source: readFileSync(resolve(dir, "lesson.md"), "utf8"), id });
  const meta = lessonMetaSchema.parse(rawMeta);
  return {
    id,
    track,
    slug,
    dir,
    meta,
    body,
    cards: parseCards(body),
    workDir: resolve(WORK_DIR, track, slug),
    hasExercise: meta.lang !== "none"
  };
};

const readLessonEntry = ({ dir, track }: { dir: string; track: string }) => {
  const id = `${track}/${basename(dir)}`;
  try {
    return { id, lesson: readLesson({ dir, track }), error: null };
  } catch (error) {
    return { id, lesson: null, error: error instanceof Error ? error.message : String(error) };
  }
};

export const readLessonEntries = () => {
  const entries = [];
  for (const trackDir of listDirectories(CURRICULUM_DIR)) {
    if (basename(trackDir) === KIT_DIR_NAME) continue;
    for (const dir of listDirectories(trackDir)) {
      if (!existsSync(resolve(dir, "lesson.md"))) continue;
      entries.push(readLessonEntry({ dir, track: basename(trackDir) }));
    }
  }
  return entries;
};

export const readLessons = () => {
  const entries = readLessonEntries();
  const broken = entries.find(entry => entry.error);
  if (broken) throw new Error(`${broken.id}: ${broken.error}`);
  const trackOrder = new Map(readTracks().map(({ id }, i) => [id, i]));
  return entries
    .flatMap(entry => (entry.lesson ? [entry.lesson] : []))
    .sort((a, b) => (trackOrder.get(a.track) ?? Infinity) - (trackOrder.get(b.track) ?? Infinity) || a.slug.localeCompare(b.slug));
};

export type Lesson = ReturnType<typeof readLessons>[number];

export const findLesson = (id: string) => {
  const lesson = readLessons().find(l => l.id === id || l.slug === id);
  if (!lesson) throw new Error(`No lesson "${id}". Run: pnpm lesson list`);
  return lesson;
};
