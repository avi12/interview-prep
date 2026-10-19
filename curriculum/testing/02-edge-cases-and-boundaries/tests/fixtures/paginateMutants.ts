import type { Mutant } from "#kit/mutation.ts";

const PAGE_CHECK = "if (!isPositiveWholeNumber(page))";
const PAGE_SIZE_CHECK = "if (!isPositiveWholeNumber(pageSize))";
const TOTAL_PAGES = "Math.ceil(items.length / pageSize)";

export const PAGINATE_MUTANTS: Mutant[] = [
  { name: "the first page starts one page too late", edits: [{ find: "(page - FIRST_PAGE) * pageSize", replace: "page * pageSize" }] },
  { name: "every page is one item short", edits: [{ find: "start + pageSize)", replace: "start + pageSize - 1)" }] },
  { name: "a partly filled last page is not counted", edits: [{ find: TOTAL_PAGES, replace: "Math.floor(items.length / pageSize)" }] },
  { name: "a full last page is followed by an extra empty page", edits: [{ find: TOTAL_PAGES, replace: "Math.ceil((items.length + 1) / pageSize)" }] },
  { name: "an empty list claims to have one page", edits: [{ find: TOTAL_PAGES, replace: "Math.max(1, Math.ceil(items.length / pageSize))" }] },
  { name: "the last page says there is a next page", edits: [{ find: "page < totalPages", replace: "page <= totalPages" }] },
  {
    name: "asking for a page past the end returns the last page",
    edits: [{ find: "(page - FIRST_PAGE) * pageSize", replace: "(Math.min(page, Math.max(totalPages, FIRST_PAGE)) - FIRST_PAGE) * pageSize" }]
  },
  { name: "page 0 is accepted", edits: [{ find: PAGE_CHECK, replace: "if (!Number.isInteger(page) || page < 0)" }] },
  { name: "page size 0 is accepted", edits: [{ find: PAGE_SIZE_CHECK, replace: "if (!Number.isInteger(pageSize) || pageSize < 0)" }] },
  { name: "a page such as 1.5 is accepted", edits: [{ find: "Number.isInteger(value) && value >= 1", replace: "value >= 1" }] }
];
