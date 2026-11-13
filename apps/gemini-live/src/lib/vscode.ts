import { WEB_ORIGIN } from "@scripts/lib/gcp.ts";
import { browser } from "wxt/browser";

export const VSCODE_ORIGIN = String(import.meta.env.WXT_VSCODE_ORIGIN);

const VSCODE_ORIGINS = [VSCODE_ORIGIN, WEB_ORIGIN];

const VSCODE_MATCHES = VSCODE_ORIGINS.map(origin => `${origin}/*`);

export const VSCODE_CHIP_MATCHES = [`${VSCODE_ORIGIN}/*`];

export const VSCODE_SITES_TEXT = `${VSCODE_ORIGIN} or ${WEB_ORIGIN}`;

export function isVscodeUrl(url: string | undefined) {
  const isInvalidUrl = !url || !URL.canParse(url);
  if (isInvalidUrl) {
    return false;
  }

  return VSCODE_ORIGINS.includes(new URL(url).origin);
}

export async function findVscodeTab() {
  const tabs = await browser.tabs.query({ url: VSCODE_MATCHES });
  return tabs.find(tab => tab.active) ?? tabs[0] ?? null;
}
