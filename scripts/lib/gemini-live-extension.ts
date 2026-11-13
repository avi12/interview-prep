import { WEB_ORIGIN } from "#scripts/lib/gcp.ts";
import { REPOSITORY_URL as GITHUB_REPOSITORY_URL } from "#scripts/lib/repository.ts";

export const GEMINI_LIVE_VERSION_ATTRIBUTE = "data-gemini-live-version";
export const GEMINI_LIVE_NAME = "Interview Prep: Gemini Live tutor";
const GEMINI_LIVE_TAG_PREFIX = "gemini-live-v";
export const EXTENSIONS_PAGE = "chrome://extensions";

const WEB_VITE_DEV_ORIGIN = "http://localhost:5173";
const WEB_SERVER_DEV_ORIGIN = "http://localhost:8090";

export const GEMINI_LIVE_PAGE_MATCHES = [WEB_ORIGIN, WEB_VITE_DEV_ORIGIN, WEB_SERVER_DEV_ORIGIN].map(
  origin => `${origin}/*`
);

export const GeminiLiveAsset = {
  ZIP: "interview-prep-gemini-live.zip",
  CRX: "interview-prep-gemini-live.crx"
} as const;
export type GeminiLiveAsset = (typeof GeminiLiveAsset)[keyof typeof GeminiLiveAsset];

export function geminiLiveDownloadUrl(asset: GeminiLiveAsset) {
  return `${GITHUB_REPOSITORY_URL}/releases/latest/download/${asset}`;
}

export function geminiLiveTag(version: string) {
  return `${GEMINI_LIVE_TAG_PREFIX}${version}`;
}

export interface GuideStep {
  text: string;
  copy?: string;
}

export const SIDELOAD_STEPS: GuideStep[] = [
  { text: `Download ${GeminiLiveAsset.ZIP} (or ${GeminiLiveAsset.CRX}). No need to unzip it.` },
  {
    text: "Open this address in a new tab. Pages cannot link to it, so copy it:",
    copy: EXTENSIONS_PAGE
  },
  { text: "Turn on Developer mode at the top right." },
  {
    text: "Drag the downloaded file from your Downloads bar or folder and drop it onto that page, then confirm Add extension."
  },
  { text: "Pin it: open the puzzle piece menu next to the address bar and click the pin beside Interview Prep." },
  { text: "Reload the Interview Prep page." }
];

export const UPDATE_STEPS: GuideStep[] = [
  { text: `Download ${GeminiLiveAsset.ZIP} again.` },
  {
    text: "Drag it onto the same page again. It replaces the old version and keeps your settings:",
    copy: EXTENSIONS_PAGE
  }
];

export const CRX_NOTE = `Both files install the same way. Chrome on Windows and macOS may turn off a .crx that does not come from the Chrome Web Store, so if that happens, drop the zip instead.`;

function markdownSteps(steps: GuideStep[]) {
  return steps.map(({ text, copy }, iStep) => {
    const suffix = copy ? ` \`${copy}\`` : "";
    return `${iStep + 1}. ${text}${suffix}`;
  });
}

export function geminiLiveReleaseNotes() {
  return [
    `The ${GEMINI_LIVE_NAME}: the Gemini Live voice tutor as a Chrome extension. It is not in the Chrome Web Store, so you add it yourself.`,
    "",
    "## Install",
    "",
    ...markdownSteps(SIDELOAD_STEPS),
    "",
    "## Update",
    "",
    ...markdownSteps(UPDATE_STEPS),
    "",
    "## The .crx file",
    "",
    CRX_NOTE,
    ""
  ].join("\n");
}
