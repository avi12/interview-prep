import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Finding = { rule: string; severity: "high" | "medium" | "low"; subject: string };
type Manifest = Record<string, unknown>;
type Module = { auditManifest: (manifest: Manifest) => Finding[] };

const { auditManifest } = await loadImpl<Module>({ testUrl: import.meta.url, file: "auditManifest.ts" });

const readFixture = (name: string): Manifest => JSON.parse(readFileSync(new URL(`../starter/${name}`, import.meta.url), "utf8"));

const BASE: Manifest = { manifest_version: 3, name: "Test", version: "1" };
const BROAD_PATTERNS = ["<all_urls>", "*://*/*", "http://*/*", "https://*/*"];

const finding = (rule: string, severity: Finding["severity"], subject: string): Finding => ({ rule, severity, subject });
const ordered = (findings: Finding[]) => [...findings].sort((a, b) => `${a.rule}|${a.subject}`.localeCompare(`${b.rule}|${b.subject}`));
const audit = (changes: Manifest) => ordered(auditManifest({ ...BASE, ...changes }));

describe("auditManifest on whole manifests", () => {
  it("finds nothing in a narrow, single-purpose extension", () => {
    expect(auditManifest(readFixture("voice-reader.json"))).toEqual([]);
  });

  it("flags everything wrong with the flashlight extension", () => {
    expect(ordered(auditManifest(readFixture("super-flashlight.json")))).toEqual(
      ordered([
        finding("broad-host-access", "high", "<all_urls>"),
        finding("broad-content-script", "high", "<all_urls>"),
        finding("open-web-accessible-resources", "medium", "<all_urls>"),
        finding("remote-code", "high", "'unsafe-eval'"),
        finding("remote-code", "high", "https://cdn.example.test"),
        finding("risky-permission", "high", "cookies"),
        finding("risky-permission", "high", "debugger"),
        finding("risky-permission", "medium", "tabs"),
        finding("risky-permission", "low", "downloads")
      ])
    );
  });

  it("reads an old manifest version 2 file, where host patterns live in permissions", () => {
    const manifest = {
      manifest_version: 2,
      name: "Old",
      version: "1",
      permissions: ["https://*/*", "storage", "webRequest", "http://api.shop.test/*"],
      content_security_policy: "script-src 'self' https://cdn.example.test; object-src 'self'",
      web_accessible_resources: ["inject.js"]
    };
    expect(ordered(auditManifest(manifest))).toEqual(
      ordered([
        finding("old-manifest-version", "medium", "2"),
        finding("broad-host-access", "high", "https://*/*"),
        finding("risky-permission", "medium", "webRequest"),
        finding("remote-code", "high", "https://cdn.example.test")
      ])
    );
  });
});

describe("auditManifest rules", () => {
  it.each(BROAD_PATTERNS)("flags %s as broad host access", pattern => {
    expect(audit({ host_permissions: [pattern] })).toEqual([finding("broad-host-access", "high", pattern)]);
  });

  it.each(BROAD_PATTERNS)("flags %s as a broad content script", pattern => {
    expect(audit({ content_scripts: [{ matches: [pattern], js: ["a.js"] }] })).toEqual([finding("broad-content-script", "high", pattern)]);
  });

  it("does not flag specific hosts, even with a subdomain wildcard", () => {
    const narrow = ["https://api.shop.test/*", "https://*.shop.test/*", "*://mail.shop.test/*"];
    expect(audit({ host_permissions: narrow, content_scripts: [{ matches: narrow }] })).toEqual([]);
  });

  it.each([
    ["debugger", "high"],
    ["proxy", "high"],
    ["cookies", "high"],
    ["webRequest", "medium"],
    ["history", "medium"],
    ["tabs", "medium"],
    ["clipboardRead", "medium"],
    ["nativeMessaging", "medium"],
    ["management", "medium"],
    ["declarativeNetRequest", "medium"],
    ["downloads", "low"]
  ])("ranks the %s permission as %s", (permission, severity) => {
    expect(audit({ permissions: [permission] })).toEqual([finding("risky-permission", severity as Finding["severity"], permission)]);
  });

  it("leaves harmless permissions alone", () => {
    expect(audit({ permissions: ["storage", "offscreen", "activeTab", "declarativeNetRequestWithHostAccess"] })).toEqual([]);
  });

  it("flags unsafe-eval in the extension pages policy", () => {
    const policy = { extension_pages: "script-src 'self' 'unsafe-eval'; object-src 'self'" };
    expect(audit({ content_security_policy: policy })).toEqual([finding("remote-code", "high", "'unsafe-eval'")]);
  });

  it("accepts the default policy and wasm", () => {
    const policy = { extension_pages: "script-src 'self' 'wasm-unsafe-eval'; object-src 'self'" };
    expect(audit({ content_security_policy: policy })).toEqual([]);
  });

  it("looks at script-src only", () => {
    const policy = { extension_pages: "script-src 'self'; object-src https://objects.example.test" };
    expect(audit({ content_security_policy: policy })).toEqual([]);
  });

  it("flags a web accessible resource that every site can load", () => {
    const resources = [{ resources: ["a.png"], matches: ["https://*/*"] }];
    expect(audit({ web_accessible_resources: resources })).toEqual([finding("open-web-accessible-resources", "medium", "https://*/*")]);
  });

  it("flags a manifest that is not version 3", () => {
    expect(ordered(auditManifest({ name: "x", version: "1", manifest_version: 2 }))).toEqual([finding("old-manifest-version", "medium", "2")]);
  });

  it("reports the same pattern once", () => {
    const result = audit({ host_permissions: ["<all_urls>"], permissions: ["<all_urls>"] });
    expect(result).toEqual([finding("broad-host-access", "high", "<all_urls>")]);
  });

  it("copes with a manifest that has almost nothing in it", () => {
    expect(auditManifest(BASE)).toEqual([]);
  });
});
