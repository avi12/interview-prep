import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadImpl } from "#kit/impl.ts";

type Endpoint = { method: string; url: string };
type Module = { extractEndpoints: (source: string) => Endpoint[] };

const { extractEndpoints } = await loadImpl<Module>({ testUrl: import.meta.url, file: "extractEndpoints.ts" });

const bundle = readFileSync(new URL("../starter/bundle.min.js", import.meta.url), "utf8");

const OTHER_BUNDLE = `var a="https://api.other.test",b=["/x/","/y","/unused"];function f(c,d){fetch(a+b[0]+c,{method:"patch",body:d});fetch(b[1]);q.open("POST",a+"/z");window.open("https://other.test","_self");g.open("get","/rel")}`;

describe("extractEndpoints on the shop bundle", () => {
  it("finds every network call, in order of appearance", () => {
    expect(extractEndpoints(bundle)).toEqual([
      { method: "GET", url: "https://api.shop.test/v1/products/{r}" },
      { method: "POST", url: "https://api.shop.test/v2/cart" },
      { method: "DELETE", url: "https://api.shop.test/v2/orders/{r}" },
      { method: "PUT", url: "https://api.shop.test/v2/session" },
      { method: "GET", url: "https://api.shop.test/v1/health" },
      { method: "GET", url: "https://cdn.shop.test/config.json" }
    ]);
  });

  it("does not report window.open, which opens a tab and is not an HTTP call", () => {
    const urls = extractEndpoints(bundle).map(({ url }) => url);
    expect(urls).not.toContain("https://shop.test/help");
  });
});

describe("extractEndpoints on small snippets", () => {
  it("treats fetch without options as GET", () => {
    expect(extractEndpoints('fetch("https://a.test/one")')).toEqual([{ method: "GET", url: "https://a.test/one" }]);
  });

  it("reads the method from the options object and upper-cases it", () => {
    expect(extractEndpoints('fetch("https://a.test/one",{method:"post"})')).toEqual([{ method: "POST", url: "https://a.test/one" }]);
  });

  it("joins string literals built by concatenation", () => {
    expect(extractEndpoints('fetch("https://a.test"+"/v1"+"/items")')).toEqual([{ method: "GET", url: "https://a.test/v1/items" }]);
  });

  it("replaces a constant with the string it was assigned", () => {
    expect(extractEndpoints('var h="https://a.test";fetch(h+"/ping")')).toEqual([{ method: "GET", url: "https://a.test/ping" }]);
  });

  it("looks up string-table entries by their index", () => {
    expect(extractEndpoints('var t=["/zero","/one","/two"];fetch("https://a.test"+t[2])')).toEqual([{ method: "GET", url: "https://a.test/two" }]);
  });

  it("keeps unknown names as {name} placeholders", () => {
    expect(extractEndpoints('fetch("https://a.test/users/"+id)')).toEqual([{ method: "GET", url: "https://a.test/users/{id}" }]);
  });

  it("returns nothing when the code makes no network call", () => {
    expect(extractEndpoints("var total=1+2;console.log(total)")).toEqual([]);
  });
});

describe("extractEndpoints on a second bundle with other names", () => {
  it("is not hard-coded to the first bundle", () => {
    expect(extractEndpoints(OTHER_BUNDLE)).toEqual([
      { method: "PATCH", url: "https://api.other.test/x/{c}" },
      { method: "GET", url: "/y" },
      { method: "POST", url: "https://api.other.test/z" },
      { method: "GET", url: "/rel" }
    ]);
  });
});
