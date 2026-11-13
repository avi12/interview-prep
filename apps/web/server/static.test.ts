import {
  createTestApp,
  KNOWN_LESSON,
  LESSON_HTML,
  PAGE_STYLE_TEXT,
  RUNNER_ENGINE_FILE,
  SECRET_TEXT,
  SPA_HTML,
  WEBVIEW_HOST_FILE
} from "@server/test-fixture.ts";
import { HEALTH_PATH } from "#scripts/lib/gcp.ts";
import { describe, expect, it } from "vitest";

const LESSON_PATH = `/course/dist/lessons/${KNOWN_LESSON}.html`;

describe("health and index", () => {
  it("answers the health check", async () => {
    const { app } = createTestApp();
    const response = await app.request(HEALTH_PATH);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("ok");
  });

  it("serves the lesson index", async () => {
    const { app } = createTestApp();
    const response = await app.request("/course/dist/index.json");
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect((await response.json()).lessons).toHaveLength(2);
  });
});

describe("test runner files", () => {
  it("serves engine files with their real content type", async () => {
    const { app } = createTestApp();
    const response = await app.request(`/runner/${RUNNER_ENGINE_FILE}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/wasm");
    expect(response.headers.get("cache-control")).toBe("no-cache");
  });

  it("does not serve files outside the runner folder", async () => {
    const { app } = createTestApp();
    const response = await app.request("/runner/..%2F..%2Fsecret.txt");
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(SECRET_TEXT);
  });

  it("answers a missing runner file with 404", async () => {
    const { app } = createTestApp();
    const response = await app.request("/runner/lessons/nope.json");
    expect(response.status).toBe(404);
  });
});

describe("course files", () => {
  it("serves a lesson page as-is for the extension to put in a webview", async () => {
    const { app } = createTestApp();
    const response = await app.request(LESSON_PATH);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(LESSON_HTML);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-cache");
  });

  it.each(["/course/assets/skin.css", "/course/assets/lesson.css"])("serves the page styles: %s", async path => {
    const { app } = createTestApp();
    const response = await app.request(path);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(PAGE_STYLE_TEXT);
    expect(response.headers.get("content-type")).toContain("text/css");
  });

  it("404s a lesson that is not in the index", async () => {
    const { app } = createTestApp();
    expect((await app.request("/course/dist/lessons/support/99-missing.html")).status).toBe(404);
  });

  it.each([
    "/course/dist/runner/kit.json",
    "/course/secret.txt",
    "/course/..%2Fsecret.txt",
    "/course/dist/lessons/..%2F..%2F..%2Fsecret.txt",
    "/course/%2e%2e/%2e%2e/secret.txt"
  ])("serves only the course files the extension reads: %s", async path => {
    const { app } = createTestApp();
    const response = await app.request(path);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(SECRET_TEXT);
  });
});

describe("client", () => {
  it("serves the SPA entry with no-cache", async () => {
    const { app } = createTestApp();
    const response = await app.request("/");
    expect(await response.text()).toBe(SPA_HTML);
    expect(response.headers.get("cache-control")).toBe("no-cache");
  });

  it("titles the page after the lesson when a lesson is opened directly", async () => {
    const { app } = createTestApp();
    const response = await app.request(`/?lesson=${KNOWN_LESSON}`);
    expect(await response.text()).toContain(`<title>Title of ${KNOWN_LESSON} - Shell</title>`);
  });

  it("keeps the generic title for an unknown lesson", async () => {
    const { app } = createTestApp();
    const response = await app.request("/?lesson=nope/99-missing");
    expect(await response.text()).toBe(SPA_HTML);
  });

  it("falls back to the SPA entry for unknown routes", async () => {
    const { app } = createTestApp();
    const response = await app.request("/track/sql");
    expect(response.status).toBe(200);
    expect(await response.text()).toBe(SPA_HTML);
  });

  it("serves hashed assets as immutable and 404s missing ones", async () => {
    const { app } = createTestApp();
    const asset = await app.request("/assets/app-abc123.js");
    expect(asset.headers.get("cache-control")).toBe("public, max-age=31536000, immutable");
    expect(asset.headers.get("content-type")).toContain("text/javascript");
    expect((await app.request("/assets/gone-123.js")).status).toBe(404);
    expect((await app.request("/missing.png")).status).toBe(404);
  });

  it("serves the webview host pages with only frame-ancestors, so their own meta CSP applies", async () => {
    const { app } = createTestApp();
    const response = await app.request(`/${WEBVIEW_HOST_FILE}`);
    expect(response.status).toBe(200);
    expect(response.headers.get("content-security-policy")).toBe("frame-ancestors 'self'");
    expect(response.headers.get("cross-origin-resource-policy")).toBe("same-origin");
  });

  it.each([
    "/..%2Fsecret.txt",
    "/..%2F..%2Fsecret.txt",
    "/%2e%2e/secret.txt",
    "/assets/..%2F..%2Fsecret.txt",
    "/..%5Csecret.txt",
    "/%00index.html"
  ])("blocks path traversal on static files: %s", async path => {
    const { app } = createTestApp();
    const response = await app.request(path);
    expect(response.status).toBe(404);
    expect(await response.text()).not.toContain(SECRET_TEXT);
  });
});
