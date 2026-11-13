import { zod } from "#scripts/lib/zod.ts";

import { tutorBlockSchema } from "./tutor-view.ts";

export const Lang = {
  TS: "ts",
  PY: "py",
  SQL: "sql",
  NONE: "none"
} as const;

const MINUTES_MIN = 5;
const MINUTES_MAX = 60;
const RUN_SECONDS_MIN = 10;
const RUN_SECONDS_MAX = 600;
const RUN_SECONDS_DEFAULT = 90;

export const lessonMetaSchema = zod.object({
  title: zod.string().min(3),
  lang: zod.enum(Lang),
  minutes: zod.number().int().min(MINUTES_MIN).max(MINUTES_MAX),
  level: zod.enum(["junior", "mid"]).default("junior"),
  roles: zod.array(zod.string()).min(1),
  files: zod.array(zod.string()).default([]),
  timeoutSeconds: zod.number().int().min(RUN_SECONDS_MIN).max(RUN_SECONDS_MAX).default(RUN_SECONDS_DEFAULT),
  sources: zod.array(zod.url()).default([])
});

export const categoriesSchema = zod.array(
  zod.object({
    id: zod.string(),
    title: zod.string(),
    blurb: zod.string()
  })
);

export const tracksSchema = zod.array(
  zod.object({
    id: zod.string(),
    title: zod.string(),
    blurb: zod.string(),
    category: zod.string()
  })
);

export const EXERCISE_CARD_TITLE = "Your turn";

export const quizSchema = zod.object({
  q: zod.string(),
  options: zod.array(zod.coerce.string()).min(2).max(5),
  answer: zod.number().int().min(0),
  why: zod.string()
});

export const lastTestSchema = zod.object({
  id: zod.string(),
  isPass: zod.boolean(),
  at: zod.string(),
  output: zod.string()
});

export const tutorNotesSchema = zod.array(tutorBlockSchema);

export const progressSchema = zod.record(
  zod.string(),
  zod.object({
    attempts: zod.number().int(),
    passedAt: zod.string().nullable()
  })
);

const sqlTableSchema = zod.object({
  name: zod.string(),
  columns: zod.array(
    zod.object({
      name: zod.string(),
      type: zod.string()
    })
  )
});

export type SqlTable = zod.infer<typeof sqlTableSchema>;

export const rolesSchema = zod.array(
  zod.object({
    id: zod.string(),
    title: zod.string()
  })
);

export const lessonIndexSchema = zod.object({
  categories: categoriesSchema,
  tracks: tracksSchema,
  roles: rolesSchema,
  orders: zod.record(zod.string(), zod.array(zod.string())),
  lessons: zod.array(
    zod.object({
      id: zod.string(),
      track: zod.string(),
      title: zod.string(),
      minutes: zod.number(),
      lang: zod.enum(Lang),
      roles: zod.array(zod.string()),
      files: zod.array(zod.string()),
      hasExercise: zod.boolean(),
      html: zod.string(),
      tutor: zod.string(),
      sqlTables: zod.array(sqlTableSchema).default([])
    })
  )
});

export type Quiz = zod.infer<typeof quizSchema>;
