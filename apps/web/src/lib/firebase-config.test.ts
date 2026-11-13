import { describe, expect, it, vi } from "vitest";

import { GCP } from "#scripts/lib/gcp.ts";
import { loadFirebaseConfig, NO_CONFIG_REASON } from "@/lib/firebase-config.ts";
import { FIREBASE_INIT_PATH } from "@/lib/web-paths.ts";

const HOSTING_CONFIG = {
  apiKey: "public-key",
  authDomain: `${GCP.projectId}.firebaseapp.com`,
  projectId: GCP.projectId,
  appId: "1:2:web:3",
  storageBucket: "ignored"
};

function serving(body: unknown) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status: 200 }));
}

describe("loadFirebaseConfig", () => {
  it("uses the Hosting config and keeps its auth domain", async () => {
    const fetchJson = serving(HOSTING_CONFIG);
    const result = await loadFirebaseConfig({
      fetchJson,
      env: {}
    });
    expect(fetchJson.mock.calls[0]?.[0]).toBe(FIREBASE_INIT_PATH);
    expect(result).toEqual({
      isReady: true,
      config: {
        apiKey: HOSTING_CONFIG.apiKey,
        authDomain: HOSTING_CONFIG.authDomain,
        projectId: HOSTING_CONFIG.projectId,
        appId: HOSTING_CONFIG.appId
      }
    });
  });

  it("falls back to the Vite env when Hosting has no config", async () => {
    const result = await loadFirebaseConfig({
      fetchJson: vi.fn<typeof fetch>(async () => new Response("<!doctype html>", { status: 200 })),
      env: {
        VITE_FIREBASE_API_KEY: "dev-key",
        VITE_FIREBASE_AUTH_DOMAIN: "dev.firebaseapp.com",
        VITE_FIREBASE_APP_ID: "1:2:web:dev"
      }
    });
    expect(result.isReady && result.config.apiKey).toBe("dev-key");
  });

  it("explains why sign-in is off when nothing is configured", async () => {
    const result = await loadFirebaseConfig({
      fetchJson: vi.fn<typeof fetch>(async () => {
        throw new TypeError("offline");
      }),
      env: {}
    });
    expect(result).toEqual({
      isReady: false,
      reason: NO_CONFIG_REASON
    });
  });
});
