import { useMemo, useState } from 'react';

export type UsePaginationReturn<T> = {
  page: number;
  pageSize: number;
  totalPages: number;
  totalItems: number;
  paginatedItems: T[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  /** Call whenever the source list changes (e.g. after a filter) so page resets to 1 */
  resetPage: () => void;
};

export function usePagination<T>(
  items: T[],
  defaultPageSize = 10,
): UsePaginationReturn<T> {
  const [page, setPageRaw] = useState(1);
  const [pageSize, setPageSizeRaw] = useState(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Clamp page to valid range whenever total changes
  const clampedPage = Math.min(page, totalPages);

  const paginatedItems = useMemo(
    () => items.slice((clampedPage - 1) * pageSize, clampedPage * pageSize),
    [items, clampedPage, pageSize],
  );

  const setPage = (next: number) =>
    setPageRaw(Math.max(1, Math.min(next, totalPages)));

  const setPageSize = (size: number) => {
    setPageSizeRaw(size);
    setPageRaw(1);
  };

  const resetPage = () => setPageRaw(1);

  return {
    page: clampedPage,
    pageSize,
    totalPages,
    totalItems: items.length,
    paginatedItems,
    setPage,
    setPageSize,
    resetPage,
  };
}
