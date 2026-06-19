import { useEffect, useMemo, useState } from "react";

export const DEFAULT_PAGE_SIZE = 6;

export function getPageCount(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function paginateItems<T>(items: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function usePagination<T>(items: T[], pageSize: number = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1);

  const pageCount = useMemo(() => getPageCount(items.length, pageSize), [items.length, pageSize]);

  const paginatedItems = useMemo(
    () => paginateItems(items, page, pageSize),
    [items, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  return {
    page,
    setPage,
    pageCount,
    paginatedItems,
    pageSize,
    total: items.length,
  };
}
