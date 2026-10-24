import { contentTypeOf, resolveVoiceFile } from "@/server/voiceFiles.ts";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const buildDir = resolve("voice-build");

function fileFor(pathname: string) {
  return resolveVoiceFile({
    buildDir,
    pathname
  });
}

describe("resolveVoiceFile", () => {
  it("serves index.html for the voice directory", () => {
    expect(fileFor("/voice/")).toBe(resolve(buildDir, "index.html"));
  });

  it("serves nested files", () => {
    expect(fileFor("/voice/assets/app.js")).toBe(resolve(buildDir, "assets", "app.js"));
  });

  it("decodes escaped names", () => {
    expect(fileFor("/voice/my%20file.css")).toBe(resolve(buildDir, "my file.css"));
  });

  it("rejects paths outside the build folder", () => {
    for (const pathname of ["/voice/../secret.txt", "/voice/%2e%2e/secret.txt", "/voice/..%5Csecret.txt", "/voice/%2e%2e%2f%2e%2e/etc", "/voice/%E0%A4%A", "/voice/a%00.js", "/other/index.html"]) {
      expect(fileFor(pathname)).toBeNull();
    }
  });
});

describe("contentTypeOf", () => {
  it("knows the page's file types", () => {
    expect(contentTypeOf("index.html")).toMatch(/^text\/html/);
    expect(contentTypeOf("app.JS")).toMatch(/^text\/javascript/);
    expect(contentTypeOf("worklet.wasm")).toBe("application/wasm");
    expect(contentTypeOf("chime.mp3")).toBe("audio/mpeg");
  });

  it("refuses unknown types", () => {
    expect(contentTypeOf("notes.txt")).toBeUndefined();
  });
});
