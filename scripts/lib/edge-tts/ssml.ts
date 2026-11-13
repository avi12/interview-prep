const XML_ESCAPES: Record<string, string> = {
  "<": "&lt;",
  ">": "&gt;",
  "&": "&amp;",
  '"': "&quot;",
  "'": "&apos;"
};

const STRAIGHT_QUOTES: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‛": "'",
  "‚": "'",
  "′": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "‟": '"',
  "″": '"'
};

const NON_WHITESPACE_CONTROL = /[^\P{Cc}\t\n\r\v\f]/gu;
const XML_SPECIAL_CHARACTERS = new RegExp(`[${Object.keys(XML_ESCAPES).join("")}]`, "g");
const XML_UNESCAPES = Object.fromEntries(Object.entries(XML_ESCAPES).map(([character, entity]) => [entity, character]));
const XML_ENTITIES = new RegExp(Object.keys(XML_UNESCAPES).join("|"), "g");
const TYPOGRAPHIC_QUOTES = new RegExp(`[${Object.keys(STRAIGHT_QUOTES).join("")}]`, "g");

const SSML_NAMESPACE = "http://www.w3.org/2001/10/synthesis";
const LOCALE_SEPARATOR = "-";
const VOICE_LOCALE_PARTS = 2;
const NEUTRAL_PROSODY = "pitch='+0Hz' rate='+0%' volume='+0%'";

export function sanitizeText(text: string) {
  return text
    .replace(NON_WHITESPACE_CONTROL, " ")
    .replace(TYPOGRAPHIC_QUOTES, quote => STRAIGHT_QUOTES[quote] ?? quote);
}

function escapeXml(text: string) {
  return text.replace(XML_SPECIAL_CHARACTERS, character => XML_ESCAPES[character] ?? character);
}

export function unescapeXml(text: string) {
  return text.replace(XML_ENTITIES, entity => XML_UNESCAPES[entity] ?? entity);
}

export function getVoiceLocale(voice: string) {
  return voice.split(LOCALE_SEPARATOR).slice(0, VOICE_LOCALE_PARTS).join(LOCALE_SEPARATOR);
}

export function buildSsml({ text, voice }: { text: string; voice: string }) {
  return (
    `<speak version='1.0' xmlns='${SSML_NAMESPACE}' xml:lang='${getVoiceLocale(voice)}'>` +
    `<voice name='${voice}'>` +
    `<prosody ${NEUTRAL_PROSODY}>` +
    escapeXml(sanitizeText(text)) +
    `</prosody></voice></speak>`
  );
}
