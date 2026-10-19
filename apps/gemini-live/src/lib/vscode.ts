import { browser } from "wxt/browser";

export const VSCODE_ORIGIN = String(import.meta.env.WXT_VSCODE_ORIGIN);

const VSCODE_MATCH = `${VSCODE_ORIGIN}/*`;

export const isVscodeUrl = (url: string | undefined) => {
  if (!url || !URL.canParse(url)) return false;
  return new URL(url).origin === VSCODE_ORIGIN;
};

export const findVscodeTab = async () => {
  const tabs = await browser.tabs.query({ url: VSCODE_MATCH });
  return tabs.find(tab => tab.active) ?? tabs[0] ?? null;
};
