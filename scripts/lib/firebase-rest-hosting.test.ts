import { describe, expect, it } from "vitest";

import { findGcpMismatches, readFirebaseJson, toServingConfig } from "#scripts/lib/firebase-rest-hosting.ts";
import { GCP } from "#scripts/lib/gcp.ts";

const TARGET = {
  hostingSiteId: "site",
  runService: "service",
  region: "europe-west1"
};

function configWith({
  site = TARGET.hostingSiteId,
  serviceId = TARGET.runService,
  region = TARGET.region
}: {
  site?: string;
  serviceId?: string;
  region?: string;
}) {
  return {
    hosting: {
      site,
      rewrites: [
        {
          source: "**",
          run: {
            serviceId,
            region
          }
        }
      ]
    },
    firestore: {
      rules: "firestore.rules"
    }
  };
}

describe("toServingConfig", () => {
  it("maps firebase.json rewrites to the Hosting REST shape", () => {
    expect(toServingConfig(configWith({}).hosting)).toEqual({
      rewrites: [
        {
          glob: "**",
          run: {
            serviceId: TARGET.runService,
            region: TARGET.region
          }
        }
      ]
    });
  });
});

describe("findGcpMismatches", () => {
  it("finds nothing when firebase.json matches", () => {
    expect(
      findGcpMismatches({
        config: configWith({}),
        target: TARGET
      })
    ).toEqual([]);
  });

  it("names every field that disagrees", () => {
    const mismatches = findGcpMismatches({
      config: configWith({
        site: "other-site",
        serviceId: "other-service",
        region: "us-central1"
      }),
      target: TARGET
    });
    expect(mismatches).toHaveLength(3);
    expect(mismatches.join("\n")).toMatch(/hostingSiteId[\s\S]*runService[\s\S]*region/);
  });

  it("holds for the real firebase.json and scripts/lib/gcp.ts", () => {
    expect(
      findGcpMismatches({
        config: readFirebaseJson(),
        target: GCP
      })
    ).toEqual([]);
  });
});
