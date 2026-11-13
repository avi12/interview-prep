import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchDeployedVersion, VERSION_POLL_INTERVAL_MS, watchForUpdates } from "@/lib/update-check.ts";
import { VERSION_PATH } from "@/lib/web-paths.ts";

const CURRENT_VERSION = "2026-11-10T10:00:00.000Z";
const NEXT_VERSION = "2026-11-10T11:00:00.000Z";
const NOT_FOUND_STATUS = 404;

function versionFetch({ body, status }: { body: unknown; status?: number }) {
  return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
}

describe("fetchDeployedVersion", () => {
  it("reads the deployed version without the cache", async () => {
    const fetchJson = versionFetch({
      body: {
        version: NEXT_VERSION
      }
    });
    expect(await fetchDeployedVersion(fetchJson)).toBe(NEXT_VERSION);
    expect(fetchJson).toHaveBeenCalledWith(VERSION_PATH, { cache: "no-store" });
  });

  it("ignores a missing or malformed version file", async () => {
    expect(
      await fetchDeployedVersion(
        versionFetch({
          body: {},
          status: NOT_FOUND_STATUS
        })
      )
    ).toBeNull();
    expect(
      await fetchDeployedVersion(
        versionFetch({
          body: {
            build: NEXT_VERSION
          }
        })
      )
    ).toBeNull();
    expect(
      await fetchDeployedVersion(
        vi.fn<typeof fetch>(async () => {
          throw new TypeError("offline");
        })
      )
    ).toBeNull();
  });
});

describe("watchForUpdates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports a new deploy on the next poll", async () => {
    const onUpdate = vi.fn();
    const stop = watchForUpdates({
      currentVersion: CURRENT_VERSION,
      onUpdate,
      fetchJson: versionFetch({
        body: {
          version: NEXT_VERSION
        }
      })
    });
    await vi.advanceTimersByTimeAsync(VERSION_POLL_INTERVAL_MS);
    expect(onUpdate).toHaveBeenCalledOnce();
    stop();
  });

  it("stays quiet while the version matches and after stopping", async () => {
    const onUpdate = vi.fn();
    const stop = watchForUpdates({
      currentVersion: CURRENT_VERSION,
      onUpdate,
      fetchJson: versionFetch({
        body: {
          version: CURRENT_VERSION
        }
      })
    });
    await vi.advanceTimersByTimeAsync(VERSION_POLL_INTERVAL_MS);
    stop();
    await vi.advanceTimersByTimeAsync(VERSION_POLL_INTERVAL_MS);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
