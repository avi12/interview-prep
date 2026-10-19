import { describe, expect, it } from "vitest";
import { slugify } from "./slugify.ts";

describe("slugify", () => {
  it("joins two words with a hyphen", () => {
    const title = "hello world";

    const slug = slugify(title);

    expect(slug).toBe("hello-world");
  });

  it("turns capital letters into lowercase", () => {
    const title = "Hello World";

    const slug = slugify(title);

    expect(slug).toBe("hello-world");
  });

  it("merges a run of separators into one hyphen", () => {
    const title = "hello,   world";

    const slug = slugify(title);

    expect(slug).toBe("hello-world");
  });

  it("replaces punctuation between words with a hyphen", () => {
    const title = "rock & roll";

    const slug = slugify(title);

    expect(slug).toBe("rock-roll");
  });

  it("keeps digits in the slug", () => {
    const title = "Top 10 tips";

    const slug = slugify(title);

    expect(slug).toBe("top-10-tips");
  });

  it("removes accents from letters", () => {
    const title = "Café au lait";

    const slug = slugify(title);

    expect(slug).toBe("cafe-au-lait");
  });

  it("drops separators at the start", () => {
    const title = "  hello";

    const slug = slugify(title);

    expect(slug).toBe("hello");
  });

  it("drops separators at the end", () => {
    const title = "hello!!";

    const slug = slugify(title);

    expect(slug).toBe("hello");
  });

  it("returns an empty string for an empty title", () => {
    const title = "";

    const slug = slugify(title);

    expect(slug).toBe("");
  });

  it("returns an empty string when nothing usable is left", () => {
    const title = "?!?";

    const slug = slugify(title);

    expect(slug).toBe("");
  });
});
