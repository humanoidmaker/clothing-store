import { useMemo, useState } from 'react';

const usePaginatedList = (items = [], initialRows = 10) => {
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(initialRows);

  const totalItems = items.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * rowsPerPage;

  const paginatedItems = useMemo(
    () => items.slice(start, start + rowsPerPage),
    [items, start, rowsPerPage]
  );

  return {
    page: safePage,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  };
};

export default usePaginatedList;
