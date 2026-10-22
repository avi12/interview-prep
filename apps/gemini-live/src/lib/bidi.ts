const CAPTION_LABEL = /^\s*(You|Gemini)\s*:\s*/;
const FIRST_LETTER = /\p{L}/u;
const HEBREW_LETTER = /\p{Script=Hebrew}/u;
const CAPTIONS_TAG = "CAPTIONS-SCROLLER";

const ROUND_DIRECTION_CSS = `
  user-query :is(p, li, h1, h2, h3, h4, .query-text-line),
  .presented-response-container :is(p, li, h1, h2, h3, h4, td, th, blockquote),
  message-content :is(p, li, h1, h2, h3, h4, td, th, blockquote) {
    unicode-bidi: plaintext;
    text-align: start;
  }
`;

function captionLines() {
  const lines = new Set<HTMLElement>();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node.nodeValue ?? "";
    const parent = node.parentElement;
    if (!CAPTION_LABEL.test(text) || !parent?.closest("captions-scroller")) {
      continue;
    }

    const isLabelAlone = !text.replace(CAPTION_LABEL, "").trim();
    const line = isLabelAlone ? parent.parentElement : parent;
    if (line && line.tagName !== CAPTIONS_TAG) {
      lines.add(line);
    }
  }
  return lines;
}

function directCaptions() {
  for (const line of captionLines()) {
    const rest = (line.textContent ?? "").replace(CAPTION_LABEL, "");
    const letter = FIRST_LETTER.exec(rest)?.[0];
    const direction = letter && HEBREW_LETTER.test(letter) ? "rtl" : "ltr";
    if (line.dir !== direction) {
      line.dir = direction;
    }
  }
}

export function installBidi() {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(ROUND_DIRECTION_CSS);
  document.adoptedStyleSheets.push(sheet);
  document.addEventListener("DOMContentLoaded", () => {
    new MutationObserver(directCaptions).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  });
}
