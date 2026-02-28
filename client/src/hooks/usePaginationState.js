import { useEffect, useMemo, useState } from 'react';

const usePaginationState = (items, initialRowsPerPage = 10) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRowsPerPage);

  const totalItems = Array.isArray(items) ? items.length : 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedItems = useMemo(() => {
    if (!Array.isArray(items) || items.length === 0) return [];
    const start = (page - 1) * rowsPerPage;
    return items.slice(start, start + rowsPerPage);
  }, [items, page, rowsPerPage]);

  const updateRowsPerPage = (nextRowsPerPage) => {
    const parsed = Number(nextRowsPerPage);
    if (!Number.isFinite(parsed) || parsed < 1) return;
    setRowsPerPage(parsed);
    setPage(1);
  };

  return {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage: updateRowsPerPage
  };
};

export default usePaginationState;
