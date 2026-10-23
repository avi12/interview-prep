import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const PUPPETEER_CHROME_DIR = join(homedir(), ".cache", "puppeteer", "chrome");

export const CHROME_FOR_TESTING_MISSING = "no Chrome for Testing found: set CHROME_FOR_TESTING to its chrome.exe";

export function chromeExecutable() {
  if (process.env.CHROME_FOR_TESTING) {
    return process.env.CHROME_FOR_TESTING;
  }

  if (!existsSync(PUPPETEER_CHROME_DIR)) {
    return null;
  }

  const builds = readdirSync(PUPPETEER_CHROME_DIR)
    .map(name => join(PUPPETEER_CHROME_DIR, name, "chrome-win64", "chrome.exe"))
    .filter(path => existsSync(path))
    .sort();
  return builds.at(-1) ?? null;
}
