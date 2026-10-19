import { describe, expect, it } from "vitest";
import { slugify } from "./slugify.ts";

describe("slugify", () => {
  it("joins two words with a hyphen", () => {
    const title = "hello world";

    const slug = slugify(title);

    expect(slug).toBe("hello-world");
  });
});
