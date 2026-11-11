import { createTestApp, WORKER_FILE } from "@server/test-fixture.ts";
import { FIREBASE_AUTH_ORIGIN } from "#scripts/lib/gcp.ts";
import { describe, expect, it } from "vitest";

describe("security headers", () => {
  it("sends the app shell CSP and the hardening headers", async () => {
    const { app } = createTestApp();
    const response = await app.request("/");
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("script-src 'self' 'wasm-unsafe-eval' https://apis.google.com;");
    expect(csp).toContain("worker-src 'self' blob:");
    expect(csp).toContain("font-src 'self' https://fonts.gstatic.com");
    expect(csp).toContain(`frame-src 'self' ${FIREBASE_AUTH_ORIGIN} https://accounts.google.com`);
    expect(csp).toContain("connect-src 'self' https://identitytoolkit.googleapis.com https://securetoken.googleapis.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("sandbox");
    expect(response.headers.get("strict-transport-security")).toContain("max-age=");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("cross-origin-opener-policy")).toBe("same-origin-allow-popups");
    expect(response.headers.get("permissions-policy")).toContain("microphone=()");
    expect(response.headers.get("x-powered-by")).toBeNull();
  });

  it("gives test worker scripts their own CSP that allows WebAssembly and blob bundles", async () => {
    const { app } = createTestApp();
    const response = await app.request(`/${WORKER_FILE}`);
    const csp = response.headers.get("content-security-policy") ?? "";
    expect(response.status).toBe(200);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("script-src 'self' blob: 'wasm-unsafe-eval'");
    expect(csp).toContain("worker-src 'self'");
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toContain("https://apis.google.com");
  });

  it("lets the workbench compile WebAssembly but never evaluate strings or run blob scripts", async () => {
    const { app } = createTestApp();
    const csp = (await app.request("/")).headers.get("content-security-policy") ?? "";
    const scriptSources = csp.split("; ").find(directive => directive.startsWith("script-src ")) ?? "";
    expect(scriptSources).toContain("'wasm-unsafe-eval'");
    expect(scriptSources).not.toContain("'unsafe-eval'");
    expect(scriptSources).not.toContain("'unsafe-inline'");
    expect(scriptSources).not.toContain("blob:");
  });

  it("logs one structured line per request without the token", async () => {
    const { app, logs } = createTestApp();
    await app.request("/api/progress?x=1", {
      headers: {
        authorization: "Bearer secret.token"
      }
    });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      severity: "WARNING",
      httpRequest: {
        requestMethod: "GET",
        requestUrl: "/api/progress",
        status: 401
      }
    });
    expect(JSON.stringify(logs)).not.toContain("secret.token");
  });
});
