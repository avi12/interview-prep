import { readJsonFile } from "#scripts/lib/files.ts";
import { buildOrders } from "#scripts/lib/path.ts";
import {
  CURRICULUM_DIR,
  KIT_DIR_NAME,
  PATH_FILE,
  ROLES_FILE,
  TRACKS_FILE,
  WORK_DIR
} from "#scripts/lib/paths.ts";
import {
  lessonMetaSchema,
  type Quiz,
  quizSchema,
  rolesSchema,
  tracksSchema
} from "#scripts/lib/schema.ts";
import { z } from "#scripts/lib/zod.ts";
import { marked, type Token, type Tokens } from "marked";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { basename, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const CARD_HEADING_DEPTH = 2;
const SPECIAL_FENCES = new Set(["narrate", "hint", "quiz", "svg"]);

export function readStudyOrders(lessons: ReturnType<typeof readLessons>) {
  return buildOrders({
    lessons: lessons.map(({ id, track, meta }) => ({
      id,
      track,
      roles: meta.roles
    })),
    cycle: readJsonFile({
      path: PATH_FILE,
      schema: z.array(z.string())
    }),
    roles: readRoles().map(({ id }) => id)
  });
}

export function readRoles() {
  return readJsonFile({
    path: ROLES_FILE,
    schema: rolesSchema
  });
}

export function readTracks() {
  return readJsonFile({
    path: TRACKS_FILE,
    schema: tracksSchema
  });
}

function isDirectory(path: string) {
  return statSync(path).isDirectory();
}

function listDirectories(parent: string) {
  return readdirSync(parent)
    .filter(name => !name.startsWith("_") && !name.startsWith("."))
    .map(name => resolve(parent, name))
    .filter(isDirectory);
}

function splitFrontmatter({ source, id }: {
  source: string;
  id: string;
}) {
  const match = FRONTMATTER_PATTERN.exec(source);
  if (!match) {
    throw new Error(`${id}: lesson.md has no frontmatter`);
  }

  return {
    rawMeta: parseYaml(match[1]),
    body: match[2]
  };
}

function fenceName(token: Tokens.Code) {
  return (token.lang ?? "").split(/\s+/)[0];
}
function fenceRest(token: Tokens.Code) {
  return (token.lang ?? "").split(/\s+/).slice(1).join(" ");
}

export type Figure = {
  caption: string;
  svg: string;
};
export type Block =
  | {
    kind: "tokens";
    tokens: Token[];
  }
  | {
    kind: "figure";
    figure: Figure;
  }
  | {
    kind: "quiz";
    quiz: Quiz;
  }
  | {
    kind: "hint";
    text: string;
  };

function emptyCard(title: string) {
  const tokens: Token[] = [];
  const blocks: Block[] = [];
  const hints: string[] = [];
  const quizzes: Quiz[] = [];
  const figures: Figure[] = [];
  return {
    title,
    tokens,
    blocks,
    narrate: "",
    hints,
    quizzes,
    figures
  };
}

export type Card = ReturnType<typeof emptyCard>;

function absorbSpecialFence({ card, token }: {
  card: Card;
  token: Tokens.Code;
}) {
  const name = fenceName(token);
  if (name === "narrate") {
    card.narrate = token.text.trim();
  }

  if (name === "hint") {
    card.hints.push(token.text.trim());
    card.blocks.push({
      kind: "hint",
      text: token.text.trim()
    });
  }

  if (name === "quiz") {
    const quiz = quizSchema.parse(parseYaml(token.text));
    card.quizzes.push(quiz);
    card.blocks.push({
      kind: "quiz",
      quiz
    });
  }

  if (name === "svg") {
    const figure = {
      caption: fenceRest(token),
      svg: token.text.trim()
    };
    card.figures.push(figure);
    card.blocks.push({
      kind: "figure",
      figure
    });
  }
}

function pushToken({ card, token }: {
  card: Card;
  token: Token;
}) {
  card.tokens.push(token);
  const last = card.blocks.at(-1);
  if (last?.kind === "tokens") {
    return last.tokens.push(token);
  }

  card.blocks.push({
    kind: "tokens",
    tokens: [token]
  });
}

function isCodeToken(token: Token): token is Tokens.Code {
  return token.type === "code";
}

function isSpecialFence(token: Token): token is Tokens.Code {
  return isCodeToken(token) && SPECIAL_FENCES.has(fenceName(token));
}

function parseCards(body: string) {
  const cards: Card[] = [];
  for (const token of marked.lexer(body)) {
    const isCardStart = token.type === "heading" && token.depth === CARD_HEADING_DEPTH;
    if (isCardStart) {
      cards.push(emptyCard(token.text));
      continue;
    }

    const card = cards.at(-1);
    if (!card) {
      continue;
    }

    if (isSpecialFence(token)) {
      absorbSpecialFence({
        card,
        token
      });
      continue;
    }

    pushToken({
      card,
      token
    });
  }
  return cards;
}

function lessonIdOf({ dir, track }: {
  dir: string;
  track: string;
}) {
  return `${track}/${basename(dir)}`;
}

function readLesson({ dir, track }: {
  dir: string;
  track: string;
}) {
  const slug = basename(dir);
  const id = lessonIdOf({
    dir,
    track
  });
  const { rawMeta, body } = splitFrontmatter({
    source: readFileSync(resolve(dir, "lesson.md"), "utf8"),
    id
  });
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
}

function readLessonEntry({ dir, track }: {
  dir: string;
  track: string;
}) {
  const id = lessonIdOf({
    dir,
    track
  });
  try {
    return {
      id,
      lesson: readLesson({
        dir,
        track
      }),
      error: null
    };
  } catch (error) {
    return {
      id,
      lesson: null,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function readLessonEntries() {
  const entries = [];
  for (const trackDir of listDirectories(CURRICULUM_DIR)) {
    if (basename(trackDir) === KIT_DIR_NAME) {
      continue;
    }

    for (const dir of listDirectories(trackDir)) {
      if (!existsSync(resolve(dir, "lesson.md"))) {
        continue;
      }

      entries.push(
        readLessonEntry({
          dir,
          track: basename(trackDir)
        })
      );
    }
  }
  return entries;
}

export function readLessons({ isStrict = true }: { isStrict?: boolean } = {}) {
  const entries = readLessonEntries();
  const broken = entries.find(entry => entry.error);
  if (broken && isStrict) {
    throw new Error(`${broken.id}: ${broken.error}`);
  }

  const trackOrder = new Map(readTracks().map(({ id }, i) => [id, i]));
  return entries
    .flatMap(entry => (entry.lesson ? [entry.lesson] : []))
    .sort((left, right) =>
      (trackOrder.get(left.track) ?? Infinity) - (trackOrder.get(right.track) ?? Infinity) ||
      left.slug.localeCompare(right.slug));
}

export type Lesson = ReturnType<typeof readLessons>[number];

export function findLesson(id: string) {
  const entry = readLessonEntries().find(({ lesson }) => lesson && (lesson.id === id || lesson.slug === id));
  if (entry?.lesson) {
    return entry.lesson;
  }

  const broken = readLessonEntries().find(candidate => candidate.id === id && candidate.error);
  if (broken) {
    throw new Error(`${broken.id}: ${broken.error}`);
  }

  throw new Error(`No lesson "${id}". Run: pnpm lesson list`);
}
