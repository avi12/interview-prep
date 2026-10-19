import { describe, expect, it } from "vitest";
import { paginate } from "./paginate.ts";

const numbered = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe("paginate: normal pages", () => {
  it("returns the items of a page in the middle", () => {
    const items = numbered(9);

    const result = paginate({ items, page: 2, pageSize: 3 });

    expect(result.items).toEqual([4, 5, 6]);
  });

  it("starts the first page at the first item", () => {
    const items = numbered(9);

    const result = paginate({ items, page: 1, pageSize: 3 });

    expect(result.items).toEqual([1, 2, 3]);
  });

  it("says there is a next page when more pages follow", () => {
    const items = numbered(9);

    const result = paginate({ items, page: 1, pageSize: 3 });

    expect(result.hasNextPage).toBe(true);
  });
});

describe("paginate: sizes at the boundary", () => {
  it("counts a partly filled last page", () => {
    const items = numbered(7);

    const result = paginate({ items, page: 1, pageSize: 3 });

    expect(result.totalPages).toBe(3);
  });

  it("returns only the leftover items on a partly filled last page", () => {
    const items = numbered(7);

    const result = paginate({ items, page: 3, pageSize: 3 });

    expect(result.items).toEqual([7]);
  });

  it("does not add an empty page when the last page is exactly full", () => {
    const items = numbered(6);

    const result = paginate({ items, page: 1, pageSize: 3 });

    expect(result.totalPages).toBe(2);
  });

  it("says there is no next page on the last page", () => {
    const items = numbered(6);

    const result = paginate({ items, page: 2, pageSize: 3 });

    expect(result.hasNextPage).toBe(false);
  });

  it("returns every item when the page size is larger than the list", () => {
    const items = numbered(2);

    const result = paginate({ items, page: 1, pageSize: 10 });

    expect(result).toEqual({ items: [1, 2], page: 1, totalPages: 1, hasNextPage: false });
  });

  it("reports zero pages for an empty list", () => {
    const items: number[] = [];

    const result = paginate({ items, page: 1, pageSize: 3 });

    expect(result).toEqual({ items: [], page: 1, totalPages: 0, hasNextPage: false });
  });
});

describe("paginate: pages outside the list", () => {
  it("returns no items for a page past the end", () => {
    const items = numbered(6);

    const result = paginate({ items, page: 3, pageSize: 3 });

    expect(result.items).toEqual([]);
  });
});

describe("paginate: invalid input", () => {
  it("rejects page 0", () => {
    const items = numbered(6);

    const askForPageZero = () => paginate({ items, page: 0, pageSize: 3 });

    expect(askForPageZero).toThrow(RangeError);
  });

  it("rejects a negative page", () => {
    const items = numbered(6);

    const askForNegativePage = () => paginate({ items, page: -1, pageSize: 3 });

    expect(askForNegativePage).toThrow(RangeError);
  });

  it("rejects a page that is not a whole number", () => {
    const items = numbered(6);

    const askForHalfPage = () => paginate({ items, page: 1.5, pageSize: 3 });

    expect(askForHalfPage).toThrow(RangeError);
  });

  it("rejects a page size of 0", () => {
    const items = numbered(6);

    const askForEmptyPages = () => paginate({ items, page: 1, pageSize: 0 });

    expect(askForEmptyPages).toThrow(RangeError);
  });
});
