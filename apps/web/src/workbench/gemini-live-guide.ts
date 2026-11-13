import {
  CRX_NOTE,
  GEMINI_LIVE_NAME,
  GeminiLiveAsset,
  geminiLiveDownloadUrl,
  type GuideStep,
  SIDELOAD_STEPS,
  UPDATE_STEPS
} from "#scripts/lib/gemini-live-extension.ts";

function stepList(steps: GuideStep[]) {
  return steps
    .map((step, iStep) => {
      const copyLine = step.copy ? `\n\n   \`${step.copy}\`` : "";
      return `${iStep + 1}. ${step.text}${copyLine}`;
    })
    .join("\n");
}

export function geminiLiveGuide() {
  return [
    `# Add the ${GEMINI_LIVE_NAME}`,
    "",
    "A Chrome extension that brings the Gemini Live voice tutor. It is not in the Chrome Web Store, so you add it yourself in about a minute.",
    "",
    `- [Download .zip](${geminiLiveDownloadUrl(GeminiLiveAsset.ZIP)})`,
    `- [Download .crx](${geminiLiveDownloadUrl(GeminiLiveAsset.CRX)})`,
    "",
    "## Install",
    "",
    stepList(SIDELOAD_STEPS),
    "",
    "## Update it, or use the .crx",
    "",
    stepList(UPDATE_STEPS),
    "",
    CRX_NOTE,
    ""
  ].join("\n");
}
