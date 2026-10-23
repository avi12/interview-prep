import { describe, expect, it } from "vitest";
import { paginate } from "./paginate.ts";

const numbered = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe("paginate", () => {
  it("returns the items of a page in the middle", () => {
    const items = numbered(9);

    const result = paginate({ items, page: 2, pageSize: 3 });

    expect(result.items).toEqual([4, 5, 6]);
  });
});
