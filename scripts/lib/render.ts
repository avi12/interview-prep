import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import hljs from "highlight.js";
import { Marked } from "marked";
import { ASSETS_DIR } from "#scripts/lib/paths.ts";
import type { Block, Card, Figure, Lesson } from "#scripts/lib/lessons.ts";
import { EXERCISE_CARD_TITLE, type Quiz } from "#scripts/lib/schema.ts";

const FONTS_URL =
  "https://fonts.googleapis.com/css2?family=Chakra+Petch:wght@400;500;600;700&family=Share+Tech+Mono&display=swap";
const CALLOUT_KINDS = { Why: "ok", "Not this": "danger", Trap: "warn" } as const;
const CALLOUT_PATTERN = /^<p><strong>(Why|Not this|Trap):<\/strong>\s*/;
const HLJS_ALIASES: Record<string, string> = { ts: "typescript", py: "python", sh: "bash", js: "javascript" };

const escapeHtml = (text: string) =>
  text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");

const highlight = ({ text, lang }: { text: string; lang?: string }) => {
  const language = HLJS_ALIASES[lang ?? ""] ?? lang ?? "";
  const isKnown = hljs.getLanguage(language) !== undefined;
  const body = isKnown ? hljs.highlight(text, { language }).value : escapeHtml(text);
  return `<pre><code class="hljs">${body}</code></pre>`;
};

const markdown = new Marked({
  renderer: {
    code: ({ text, lang }) => highlight({ text, lang: lang?.split(/\s+/)[0] }),
    blockquote(token) {
      const html = this.parser.parse(token.tokens);
      const match = CALLOUT_PATTERN.exec(html);
      if (!match) return `<blockquote>${html}</blockquote>`;
      const label = match[1] as keyof typeof CALLOUT_KINDS;
      const body = html.replace(CALLOUT_PATTERN, `<p><strong>${label}:</strong> `);
      return `<aside class="callout" data-kind="${CALLOUT_KINDS[label]}">${body}</aside>`;
    }
  }
});

const renderTokens = (tokens: Card["tokens"]) => markdown.parser(tokens);

const renderFigure = ({ caption, svg }: Figure) =>
  `<figure class="figure">${svg}${caption ? `<figcaption class="caption">${escapeHtml(caption)}</figcaption>` : ""}</figure>`;

const renderQuiz = ({ quiz, id }: { quiz: Quiz; id: string }) => {
  const options = quiz.options
    .map(
      (option, i) =>
        `<label data-correct="${i === quiz.answer}"><input type="radio" name="${id}"><span>${markdown.parseInline(option)}</span></label>`
    )
    .join("");
  return `<fieldset class="quiz"><legend>Quick check</legend><p class="quiz-q">${markdown.parseInline(quiz.q)}</p>${options}<p class="quiz-why">${markdown.parseInline(quiz.why)}</p></fieldset>`;
};

const renderActions = (lesson: Lesson) =>
  `<p class="actions"><button class="btn" data-variant="primary" data-needs-host data-action="runTests">Run my tests</button><button class="btn" data-needs-host data-action="openExercise">Open my file</button><button class="btn" data-needs-host data-action="resetExercise">Reset</button><span class="cli">pnpm lesson test ${escapeHtml(lesson.id)}</span></p>`;

const renderBlock = ({ block, hintCounter, quizId }: { block: Block; hintCounter: { count: number }; quizId: string }) => {
  if (block.kind === "tokens") return renderTokens(block.tokens);
  if (block.kind === "figure") return renderFigure(block.figure);
  if (block.kind === "quiz") return renderQuiz({ quiz: block.quiz, id: quizId });
  hintCounter.count++;
  return `<details class="hint"><summary>Hint ${hintCounter.count}</summary><p>${markdown.parseInline(block.text)}</p></details>`;
};

const renderCard = ({ lesson, card, index }: { lesson: Lesson; card: Card; index: number }) => {
  const isExercise = lesson.hasExercise && card.title === EXERCISE_CARD_TITLE;
  const narrateAttributes = card.narrate
    ? ` data-narrate="${escapeHtml(card.narrate)}" data-narrate-title="${escapeHtml(card.title)}"`
    : "";
  const kind = isExercise ? ' data-kind="exercise"' : "";
  const hintCounter = { count: 0 };
  const body = [
    ...card.blocks.map((block, i) => renderBlock({ block, hintCounter, quizId: `quiz-${index}-${i}` })),
    isExercise ? renderActions(lesson) : ""
  ].join("\n");
  return `<section class="card chamfer"${kind}${narrateAttributes} id="card-${index + 1}"><h2 class="card-head">${escapeHtml(card.title)}</h2>\n${body}</section>`;
};

const renderSources = (sources: string[]) =>
  sources.length === 0
    ? ""
    : `<section class="card chamfer sources"><h2 class="card-head">Sources</h2><ul>${sources
        .map(source => `<li><a href="${escapeHtml(source)}" target="_blank" rel="noreferrer">${escapeHtml(source)}</a></li>`)
        .join("")}</ul></section>`;

const HOST_SCRIPT = `
const host = typeof acquireVsCodeApi === "function" ? acquireVsCodeApi() : null;
if (host) {
  document.documentElement.classList.add("has-host");
  document.addEventListener("click", e => {
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action) host.postMessage({ action });
  });
}`;

const readAsset = (name: string) => readFileSync(resolve(ASSETS_DIR, name), "utf8");

export const renderLesson = (lesson: Lesson) => {
  const { meta } = lesson;
  const chips = [`${meta.minutes} min`, meta.lang === "none" ? "reading" : meta.lang, ...meta.roles]
    .map(label => `<span class="chip">${escapeHtml(label)}</span>`)
    .join("");
  const cards = lesson.cards.map((card, index) => renderCard({ lesson, card, index })).join("\n");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(meta.title)}</title>
<link rel="stylesheet" href="${FONTS_URL}">
<style>${readAsset("skin.css")}
${readAsset("lesson.css")}</style>
</head>
<body>
<main class="page">
<header class="lesson-head"><p class="meta">${escapeHtml(lesson.track)} / ${escapeHtml(lesson.slug)}</p><h1>${escapeHtml(meta.title)}</h1><p class="meta">${chips}</p></header>
${cards}
${renderSources(meta.sources)}
</main>
<script>${HOST_SCRIPT}</script>
</body>
</html>
`;
};
