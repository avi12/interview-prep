import type { Mutant } from "#kit/mutation.ts";

export const SLUGIFY_MUTANTS: Mutant[] = [
  { name: "capital letters are kept", edits: [{ find: ".toLowerCase()", replace: "" }] },
  { name: "a run of separators becomes several hyphens", edits: [{ find: "/[^a-zA-Z0-9]+/g", replace: "/[^a-zA-Z0-9]/g" }] },
  { name: "hyphens are left at the start and the end", edits: [{ find: '.replace(EDGE_HYPHENS, "");', replace: ";" }] },
  { name: "hyphens are left at the start only", edits: [{ find: "/^-+|-+$/g", replace: "/-+$/g" }] },
  { name: "digits are removed", edits: [{ find: "/[^a-zA-Z0-9]+/g", replace: "/[^a-zA-Z]+/g" }] },
  { name: "accents are not removed", edits: [{ find: '.normalize("NFD")', replace: "" }, { find: '.replace(ACCENT_MARKS, "")', replace: "" }] },
  { name: "punctuation is kept, only spaces split words", edits: [{ find: "/[^a-zA-Z0-9]+/g", replace: "/\\s+/g" }] },
  { name: "an empty result is replaced by a default word", edits: [{ find: '.replace(EDGE_HYPHENS, "");', replace: '.replace(EDGE_HYPHENS, "") || "untitled";' }] }
];
