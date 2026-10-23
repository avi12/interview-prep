import { z } from "zod";
import { TutorBlockKind } from "./tutor-view.ts";

export const Lang = { ts: "ts", py: "py", sql: "sql", none: "none" } as const;
export const Role = { backend: "backend", analyst: "analyst", ai: "ai" } as const;

const MINUTES_MIN = 5;
const MINUTES_MAX = 60;
const RUN_SECONDS_MIN = 10;
const RUN_SECONDS_MAX = 600;
const RUN_SECONDS_DEFAULT = 90;

export const lessonMetaSchema = z.object({
  title: z.string().min(3),
  lang: z.enum(Lang),
  minutes: z.number().int().min(MINUTES_MIN).max(MINUTES_MAX),
  level: z.enum(["junior", "mid"]).default("junior"),
  roles: z.array(z.enum(Role)).min(1),
  files: z.array(z.string()).default([]),
  timeoutSeconds: z.number().int().min(RUN_SECONDS_MIN).max(RUN_SECONDS_MAX).default(RUN_SECONDS_DEFAULT),
  sources: z.array(z.url()).default([])
});

export const tracksSchema = z.array(
  z.object({
    id: z.string(),
    title: z.string(),
    blurb: z.string()
  })
);

export const EXERCISE_CARD_TITLE = "Your turn";

export const quizSchema = z.object({
  q: z.string(),
  options: z.array(z.coerce.string()).min(2).max(5),
  answer: z.number().int().min(0),
  why: z.string()
});

export const lastTestSchema = z.object({
  id: z.string(),
  isPass: z.boolean(),
  at: z.string(),
  output: z.string()
});

export const tutorNotesSchema = z.array(z.object({ kind: z.enum(TutorBlockKind), text: z.string() }));

export const progressSchema = z.record(
  z.string(),
  z.object({
    attempts: z.number().int(),
    passedAt: z.string().nullable()
  })
);

export const sqlTableSchema = z.object({
  name: z.string(),
  columns: z.array(z.object({ name: z.string(), type: z.string() }))
});

export const lessonIndexSchema = z.object({
  tracks: tracksSchema,
  orders: z.record(z.string(), z.array(z.string())),
  lessons: z.array(
    z.object({
      id: z.string(),
      track: z.string(),
      title: z.string(),
      minutes: z.number(),
      lang: z.enum(Lang),
      roles: z.array(z.enum(Role)),
      files: z.array(z.string()),
      hasExercise: z.boolean(),
      isNarrated: z.boolean(),
      html: z.string(),
      tutor: z.string(),
      sqlTables: z.array(sqlTableSchema).default([])
    })
  )
});

export type Quiz = z.infer<typeof quizSchema>;
