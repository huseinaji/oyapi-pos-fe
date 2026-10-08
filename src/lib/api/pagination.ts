export type PaginatedResponse<T> = {
  count: number;
  rows: T[];
};

export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<PaginatedResponse<T>>,
  limit = 100,
): Promise<PaginatedResponse<T>> {
  const firstPage = await fetchPage(1, limit);
  const pageCount = Math.ceil(firstPage.count / limit);

  if (pageCount <= 1) return firstPage;

  const remainingPages = await Promise.all(
    Array.from({ length: pageCount - 1 }, (_, index) =>
      fetchPage(index + 2, limit),
    ),
  );

  return {
    count: firstPage.count,
    rows: [firstPage, ...remainingPages].flatMap((page) => page.rows),
  };
}