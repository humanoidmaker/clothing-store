import {
  FormControl,
  MenuItem,
  Pagination,
  Select,
  Stack,
  Typography
} from '@mui/material';

const AppPagination = ({
  totalItems,
  page,
  totalPages,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange,
  pageSizeOptions = [5, 10, 20, 50]
}) => {
  if (!totalItems) return null;

  const start = (page - 1) * rowsPerPage + 1;
  const end = Math.min(page * rowsPerPage, totalItems);

  return (
    <Stack
      direction={{ xs: 'column', sm: 'row' }}
      spacing={0.8}
      justifyContent="space-between"
      alignItems={{ sm: 'center' }}
      sx={{ mt: 1 }}
    >
      <Typography variant="body2" color="text.secondary">
        Showing {start}-{end} of {totalItems}
      </Typography>

      <Stack direction="row" spacing={0.8} alignItems="center">
        <Typography variant="caption" color="text.secondary">
          Rows
        </Typography>
        <FormControl size="small" sx={{ minWidth: 72 }}>
          <Select
            value={rowsPerPage}
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Pagination
          page={page}
          count={totalPages}
          onChange={(event, value) => onPageChange(value)}
          size="small"
          shape="rounded"
          showFirstButton
          showLastButton
        />
      </Stack>
    </Stack>
  );
};

export default AppPagination;
