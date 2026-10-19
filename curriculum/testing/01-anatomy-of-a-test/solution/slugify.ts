const ACCENT_MARKS = /[̀-ͯ]/g;
const NON_ALPHANUMERIC_RUN = /[^a-zA-Z0-9]+/g;
const EDGE_HYPHENS = /^-+|-+$/g;
const SEPARATOR = "-";

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(ACCENT_MARKS, "")
    .toLowerCase()
    .replace(NON_ALPHANUMERIC_RUN, SEPARATOR)
    .replace(EDGE_HYPHENS, "");
}
