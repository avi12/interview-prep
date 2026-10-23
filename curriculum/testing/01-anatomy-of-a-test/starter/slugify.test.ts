import { slugify } from "./slugify.ts";
import { describe, expect, it } from "vitest";

describe("slugify", () => {
  it("joins two words with a hyphen", () => {
    const title = "hello world";

    const slug = slugify(title);

    expect(slug).toBe("hello-world");
  });
});
