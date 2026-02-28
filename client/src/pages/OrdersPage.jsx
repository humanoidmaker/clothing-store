import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { useNavigate } from 'react-router-dom';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import api from '../api';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const statusColorMap = {
  pending: 'warning',
  processing: 'info',
  paid: 'success',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error'
};

const OrdersPage = () => {
  const theme = useTheme();
  const isMobileTable = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(orders, 10);

  useEffect(() => {
    const fetchOrders = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get('/orders/my');
        setOrders(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load orders');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  return (
    <Box>
      <PageHeader
        eyebrow="Orders"
        title="My Orders"
        subtitle="Track payments and status updates. Click an order to open full invoice."
      />

      {loading && (
        <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && orders.length === 0 && <Alert severity="info">You have no orders yet.</Alert>}

      {!loading && !error && orders.length > 0 && (
        <Card>
          <CardContent sx={{ overflowX: 'auto' }}>
            {isMobileTable ? (
              <Stack spacing={0.8}>
                {paginatedItems.map((order) => (
                  <Card key={order._id} variant="outlined">
                    <CardContent sx={{ p: 1 }}>
                      <Stack spacing={0.7}>
                        <Stack direction="row" justifyContent="space-between" spacing={0.8}>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {order._id.slice(-8).toUpperCase()}
                          </Typography>
                          <Chip
                            label={order.status}
                            size="small"
                            color={statusColorMap[order.status] || 'default'}
                            sx={{ textTransform: 'capitalize' }}
                          />
                        </Stack>

                        <Typography variant="caption" color="text.secondary">
                          {new Date(order.createdAt).toLocaleDateString('en-IN')}
                        </Typography>

                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Payment</Typography>
                          <Typography variant="body2">{order.paymentMethod}</Typography>
                        </Stack>
                        <Stack direction="row" justifyContent="space-between">
                          <Typography variant="caption" color="text.secondary">Total</Typography>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(order.totalPrice)}</Typography>
                        </Stack>

                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<OpenInNewOutlinedIcon />}
                          onClick={() => navigate(`/orders/${order._id}`)}
                          fullWidth
                        >
                          View Invoice
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Payment</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="right">Total</TableCell>
                    <TableCell align="right">Invoice</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedItems.map((order) => (
                    <TableRow
                      key={order._id}
                      hover
                      onClick={() => navigate(`/orders/${order._id}`)}
                      sx={{ cursor: 'pointer' }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {order._id.slice(-8).toUpperCase()}
                        </Typography>
                      </TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString('en-IN')}</TableCell>
                      <TableCell>{order.paymentMethod}</TableCell>
                      <TableCell>
                        <Chip
                          label={order.status}
                          size="small"
                          color={statusColorMap[order.status] || 'default'}
                          sx={{ textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="right">{formatINR(order.totalPrice)}</TableCell>
                      <TableCell align="right">
                        <OpenInNewOutlinedIcon fontSize="small" color="action" />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            <AppPagination
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              pageSizeOptions={[5, 10, 20]}
            />
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default OrdersPage;

