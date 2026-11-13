import { groupTracksByCategory } from "#scripts/lib/course-filter.ts";
import { escapeHtml, scriptJson } from "#scripts/lib/html.ts";
import { ALL_ROLES, ALL_ROLES_TITLE } from "#scripts/lib/path.ts";
import type { categoriesSchema, rolesSchema, tracksSchema } from "#scripts/lib/schema.ts";
import { describeProgress, type TrackProgress } from "#scripts/lib/study.ts";
import { zod } from "#scripts/lib/zod.ts";

export const OnboardingAction = {
  START: "start",
  SKIP: "skip",
  ADD_TOPIC: "addTopic"
} as const;

export const onboardingMessageSchema = zod.discriminatedUnion("action", [
  zod.object({
    action: zod.literal(OnboardingAction.START),
    role: zod.string(),
    trackIds: zod.array(zod.string())
  }),
  zod.object({ action: zod.literal(OnboardingAction.SKIP) }),
  zod.object({ action: zod.literal(OnboardingAction.ADD_TOPIC) })
]);

function onboardingScript(roleTrackIds: Record<string, string[]>) {
  return `
const roleTrackIds = ${scriptJson(roleTrackIds)};
const host = acquireVsCodeApi();
const elRole = document.querySelector("vscode-single-select");
const trackBoxes = group => [...group.querySelectorAll("vscode-checkbox[data-track]")];
const allTrackBoxes = () => [...document.querySelectorAll("vscode-checkbox[data-track]")];
const syncCategory = group => {
  const boxes = trackBoxes(group);
  const checkedCount = boxes.filter(box => box.checked).length;
  const elAll = group.querySelector("vscode-checkbox[data-category]");
  elAll.checked = checkedCount === boxes.length;
  elAll.indeterminate = checkedCount > 0 && checkedCount < boxes.length;
};
for (const group of document.querySelectorAll("section[data-category-group]")) {
  syncCategory(group);
  group.addEventListener("change", e => {
    if (e.target.matches("vscode-checkbox[data-category]")) {
      for (const box of trackBoxes(group)) box.checked = e.target.checked;
    }
    syncCategory(group);
  });
}
elRole.addEventListener("change", () => {
  const picked = roleTrackIds[elRole.value] ?? [];
  for (const box of allTrackBoxes()) box.checked = picked.includes(box.value);
  for (const group of document.querySelectorAll("section[data-category-group]")) syncCategory(group);
});
document.addEventListener("click", e => {
  const elAction = e.target.closest("[data-action]");
  if (!elAction) return;
  if (elAction.dataset.action !== ${JSON.stringify(OnboardingAction.START)}) {
    host.postMessage({ action: elAction.dataset.action });
    return;
  }
  const trackIds = allTrackBoxes().filter(box => box.checked).map(box => box.value);
  host.postMessage({ action: elAction.dataset.action, role: elRole.value, trackIds });
});`;
}

const ONBOARDING_CSS = `
body { max-width: 760px; margin: 0 auto; padding: 24px 16px 48px; font-family: var(--vscode-font-family); font-size: var(--vscode-font-size); color: var(--vscode-foreground); background: var(--vscode-editor-background); }
h1 { font-weight: 400; font-size: 2em; margin: 0 0 8px; }
p { color: var(--vscode-descriptionForeground); line-height: 1.5; }
main > div { display: grid; gap: 20px; }
section { padding: 12px 16px; border: 1px solid var(--vscode-widget-border, var(--vscode-panel-border)); border-radius: 4px; background: var(--vscode-sideBar-background); display: grid; gap: 6px; }
.category-blurb, .track-blurb { margin: 0; color: var(--vscode-descriptionForeground); font-size: 0.9em; }
.track-blurb { margin-inline-start: 22px; }
.progress { display: grid; gap: 4px; margin-inline-start: 22px; color: var(--vscode-descriptionForeground); font-size: 0.9em; }
.progress-bar { block-size: 4px; border-radius: 2px; background: var(--vscode-progressBar-background); opacity: 0.25; position: relative; overflow: hidden; }
.progress-bar::before { content: ""; position: absolute; inset: 0; inline-size: calc(var(--done) * 100%); background: var(--vscode-progressBar-background); opacity: 1; }
.progress-bar::after { content: ""; position: absolute; inset: 0; inline-size: calc(var(--started) * 100%); background: var(--vscode-progressBar-background); opacity: 0.5; }
.role { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.actions { display: flex; gap: 8px; flex-wrap: wrap; }
`;

function ratio({ part, total }: { part: number; total: number }) {
  return total === 0 ? 0 : part / total;
}

function renderProgress(progress: TrackProgress | undefined) {
  const isNoProgress = !progress || progress.total === 0;
  if (isNoProgress) {
    return "";
  }

  const done = ratio({
    part: progress.passed,
    total: progress.total
  });
  const started = ratio({
    part: progress.passed + progress.inProgress,
    total: progress.total
  });
  return `<div class="progress"><span>${escapeHtml(describeProgress(progress))}</span><div class="progress-bar" style="--done:${done};--started:${started}"></div></div>`;
}

function renderTrack({
  track,
  isPicked,
  progress
}: {
  track: zod.infer<typeof tracksSchema>[number];
  isPicked: boolean;
  progress: TrackProgress | undefined;
}) {
  return `<div><vscode-checkbox data-track value="${escapeHtml(track.id)}" label="${escapeHtml(track.title)}"${isPicked ? " checked" : ""}></vscode-checkbox>
<p class="track-blurb">${escapeHtml(track.blurb)}</p>${renderProgress(progress)}</div>`;
}

function sumProgress(parts: readonly (TrackProgress | undefined)[]) {
  const sum = {
    total: 0,
    passed: 0,
    inProgress: 0
  };
  for (const part of parts) {
    sum.total += part?.total ?? 0;
    sum.passed += part?.passed ?? 0;
    sum.inProgress += part?.inProgress ?? 0;
  }
  return sum;
}

export function renderOnboarding({
  elementsBundle,
  categories,
  tracks,
  roles,
  roleTrackIds,
  role,
  trackIds,
  trackProgress,
  isReturning
}: {
  elementsBundle: string;
  categories: zod.infer<typeof categoriesSchema>;
  tracks: zod.infer<typeof tracksSchema>;
  roles: zod.infer<typeof rolesSchema>;
  roleTrackIds: Record<string, string[]>;
  role: string;
  trackIds: readonly string[];
  trackProgress: Record<string, TrackProgress>;
  isReturning: boolean;
}) {
  const isEverythingPicked = trackIds.length === 0;
  function renderPickedTrack(track: (typeof tracks)[number]) {
    return renderTrack({
      track,
      isPicked: isEverythingPicked || trackIds.includes(track.id),
      progress: trackProgress[track.id]
    });
  }
  const groups = groupTracksByCategory({
    categories,
    tracks
  })
    .map(
      ({ category, tracks: categoryTracks }) => `
<section data-category-group>
  <vscode-checkbox data-category label="${escapeHtml(category.title)}"></vscode-checkbox>
  <p class="category-blurb">${escapeHtml(category.blurb)}</p>
  ${renderProgress(sumProgress(categoryTracks.map(track => trackProgress[track.id])))}
  ${categoryTracks.map(renderPickedTrack).join("\n")}
</section>`
    )
    .join("\n");
  const roleOptions = [
    {
      id: ALL_ROLES,
      title: ALL_ROLES_TITLE
    },
    ...roles
  ]
    .map(
      ({ id, title }) =>
        `<vscode-option value="${escapeHtml(id)}"${id === role ? " selected" : ""}>${escapeHtml(title)}</vscode-option>`
    )
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Choose what to learn</title>
<style>${ONBOARDING_CSS}</style>
</head>
<body>
<main>
<header>
<h1>Choose what to learn</h1>
<p>${isReturning ? "Change your topics any time. Progress you have made stays saved, even for topics you switch off." : "Pick the topics you want. Your study path and next lesson use only these, and you can change them any time from Topics in the status bar."}</p>
</header>
<div>
${groups}
<div class="role"><span id="role-label">Target role</span> <vscode-single-select aria-labelledby="role-label">${roleOptions}</vscode-single-select></div>
<footer class="actions">
  <vscode-button data-action="${OnboardingAction.START}">${isReturning ? "Save topics" : "Start learning"}</vscode-button>
  <vscode-button secondary data-action="${OnboardingAction.SKIP}">${isReturning ? "Show everything" : "Skip, show everything"}</vscode-button>
  <vscode-button secondary data-action="${OnboardingAction.ADD_TOPIC}">+ Add a topic</vscode-button>
</footer>
</div>
</main>
<script>${elementsBundle.replaceAll("</script", String.raw`<\/script`)}</script>
<script>${onboardingScript(roleTrackIds)}</script>
</body>
</html>`;
}
