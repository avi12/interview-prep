import { loadImpl } from "#kit/impl.ts";
import { describe, expect, it } from "vitest";

type Response = {
  status: number;
  headers: Record<string, string>;
  body?: unknown;
};
type Module = {
  etagFor: (resource: unknown) => string;
  conditionalResponse: (input: {
    resource: unknown;
    ifNoneMatch?: string;
    maxAgeSeconds: number;
  }) => Response;
};

const { etagFor, conditionalResponse } = await loadImpl<Module>({
  testUrl: import.meta.url,
  file: "conditional.ts"
});

const MAX_AGE_SECONDS = 60;
const profile = {
  id: 7,
  name: "Dana",
  plan: "pro"
};

function request(ifNoneMatch?: string, resource: unknown = profile) {
  return conditionalResponse({
    resource,
    ifNoneMatch,
    maxAgeSeconds: MAX_AGE_SECONDS
  });
}

describe("etagFor", () => {
  it("is a quoted string, as HTTP requires", () => {
    expect(etagFor(profile)).toMatch(/^"[^"]+"$/);
  });

  it("is the same for equal content, even in separate objects", () => {
    expect(
      etagFor({
        id: 7,
        name: "Dana",
        plan: "pro"
      })
    ).toBe(etagFor(profile));
  });

  it("changes when the content changes, even by one character", () => {
    expect(
      etagFor({
        ...profile,
        name: "Danb"
      })
    ).not.toBe(etagFor(profile));
    expect(
      etagFor({
        ...profile,
        plan: "free"
      })
    ).not.toBe(etagFor(profile));
  });

  it("tells apart content that has the same letters in another order", () => {
    expect(etagFor(["ab"])).not.toBe(etagFor(["ba"]));
    expect(
      etagFor({
        id: 7,
        name: "Dana"
      })
    ).not.toBe(
      etagFor({
        id: 7,
        name: "Dnaa"
      })
    );
    expect(etagFor({ id: 12 })).not.toBe(etagFor({ id: 21 }));
  });

  it("works for lists and for text", () => {
    expect(etagFor([1, 2, 3])).not.toBe(etagFor([1, 2, 4]));
    expect(etagFor("hello")).not.toBe(etagFor("hello!"));
  });
});

describe("a request with no If-None-Match", () => {
  it("is 200 with the body, the ETag and the cache policy", () => {
    const response = request();
    expect(response.status).toBe(200);
    expect(response.body).toEqual(profile);
    expect(response.headers.etag).toBe(etagFor(profile));
    expect(response.headers["cache-control"]).toBe("private, max-age=60");
  });

  it("with max age zero asks caches to revalidate every time", () => {
    const response = conditionalResponse({
      resource: profile,
      maxAgeSeconds: 0
    });
    expect(response.headers["cache-control"]).toBe("private, no-cache");
  });
});

describe("a request whose If-None-Match matches the current version", () => {
  it("is 304 with no body", () => {
    const response = request(etagFor(profile));
    expect(response.status).toBe(304);
    expect(response.body).toBeUndefined();
  });

  it("still sends the ETag and Cache-Control, so the cache can refresh its copy", () => {
    const response = request(etagFor(profile));
    expect(response.headers.etag).toBe(etagFor(profile));
    expect(response.headers["cache-control"]).toBe("private, max-age=60");
  });

  it("matches when the right tag is one of several in the list", () => {
    expect(request(`"old-1", ${etagFor(profile)} , "old-2"`).status).toBe(304);
  });

  it("matches a weak copy of the tag inside a list too", () => {
    expect(request(`"old-1", W/${etagFor(profile)}`).status).toBe(304);
  });

  it("matches the wildcard, which means any current version", () => {
    expect(request("*").status).toBe(304);
  });

  it("matches a weak copy of the tag, because If-None-Match uses weak comparison", () => {
    expect(request(`W/${etagFor(profile)}`).status).toBe(304);
  });
});

describe("a request whose If-None-Match is out of date", () => {
  it("is a full 200 when the tag is unknown", () => {
    const response = request("\"something-else\"");
    expect(response.status).toBe(200);
    expect(response.body).toEqual(profile);
  });

  it("is a full 200 with the new ETag after the resource changed", () => {
    const staleTag = etagFor(profile);
    const changed = {
      ...profile,
      plan: "free"
    };
    const response = request(staleTag, changed);
    expect(response.status).toBe(200);
    expect(response.body).toEqual(changed);
    expect(response.headers.etag).toBe(etagFor(changed));
    expect(response.headers.etag).not.toBe(staleTag);
  });

  it("is a full 200 for a weak tag of some other version", () => {
    expect(request("W/\"something-else\"").status).toBe(200);
  });

  it("is a full 200 for an empty header", () => {
    expect(request("").status).toBe(200);
  });

  it("does not match a tag that only contains the current one as text", () => {
    expect(request(`"x${etagFor(profile)}"`).status).toBe(200);
  });
});
