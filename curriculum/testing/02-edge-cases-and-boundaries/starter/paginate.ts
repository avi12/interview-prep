const FIRST_PAGE = 1;

function isPositiveWholeNumber(value: number) {
  return Number.isInteger(value) && value >= 1;
}

export function paginate<T>({ items, page, pageSize }: {
  items: T[];
  page: number;
  pageSize: number;
}) {
  if (!isPositiveWholeNumber(page)) {
    throw new RangeError("page must be a whole number of 1 or more");
  }

  if (!isPositiveWholeNumber(pageSize)) {
    throw new RangeError("pageSize must be a whole number of 1 or more");
  }

  const totalPages = Math.ceil(items.length / pageSize);
  const start = (page - FIRST_PAGE) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    totalPages,
    hasNextPage: page < totalPages
  };
}
