import { useState, useCallback } from 'react';

export function usePagination(initialPage = 1, initialLimit = 20) {
  const [page, setPage] = useState(initialPage);
  const [limit, setLimit] = useState(initialLimit);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  const updateMeta = useCallback((meta) => {
    if (meta) {
      setPage(meta.page || 1);
      setTotal(meta.total || 0);
      setTotalPages(meta.totalPages || 0);
    }
  }, []);

  const goToPage = useCallback((newPage) => {
    setPage(Math.max(1, newPage));
  }, []);

  const nextPage = useCallback(() => {
    if (page < totalPages) setPage((p) => p + 1);
  }, [page, totalPages]);

  const prevPage = useCallback(() => {
    if (page > 1) setPage((p) => p - 1);
  }, [page]);

  const changeLimit = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return {
    page, limit, total, totalPages,
    setPage: goToPage, nextPage, prevPage, changeLimit, updateMeta,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export default usePagination;
