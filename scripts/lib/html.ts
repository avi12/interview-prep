export function escapeHtml(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll("\"", "&quot;");
}

const SCRIPT_UNSAFE_CHARACTER = /</g;
const ESCAPED_LESS_THAN = "\u003c";

export function scriptJson(value: unknown) {
  return JSON.stringify(value).replaceAll(SCRIPT_UNSAFE_CHARACTER, ESCAPED_LESS_THAN);
}
