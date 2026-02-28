import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useMediaQuery
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import PageHeader from '../components/PageHeader';
import AppPagination from '../components/AppPagination';
import api from '../api';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const statusOptions = ['all', 'pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];
const updateStatuses = ['pending', 'processing', 'paid', 'shipped', 'delivered', 'cancelled'];

const statusColorMap = {
  pending: 'warning',
  processing: 'info',
  paid: 'success',
  shipped: 'info',
  delivered: 'success',
  cancelled: 'error'
};

const toLabel = (status) => {
  if (status === 'all') return 'All';
  return `${status.charAt(0).toUpperCase()}${status.slice(1)}`;
};

const AdminOrdersPage = () => {
  const theme = useTheme();
  const isMobileTable = useMediaQuery(theme.breakpoints.down('sm'));
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [statusUpdatingId, setStatusUpdatingId] = useState('');
  const [orderStatusDrafts, setOrderStatusDrafts] = useState({});

  const fetchOrders = async () => {
    setLoading(true);
    setError('');

    try {
      const { data } = await api.get('/orders');
      setOrders(data);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load admin orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const query = searchText.trim().toLowerCase();

    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const matchesId = String(order._id || '').toLowerCase().includes(query);
      const matchesName = String(order.user?.name || '').toLowerCase().includes(query);
      const matchesEmail = String(order.user?.email || '').toLowerCase().includes(query);

      return matchesId || matchesName || matchesEmail;
    });
  }, [orders, statusFilter, searchText]);
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(filteredOrders, 10);

  const countByStatus = useMemo(() => {
    return orders.reduce(
      (counts, order) => {
        const key = order.status || 'pending';
        counts[key] = (counts[key] || 0) + 1;
        return counts;
      },
      { pending: 0, processing: 0, paid: 0, shipped: 0, delivered: 0, cancelled: 0 }
    );
  }, [orders]);

  const onStatusDraftChange = (orderId, status) => {
    setOrderStatusDrafts((current) => ({
      ...current,
      [orderId]: status
    }));
  };

  const onUpdateOrderStatus = async (orderId) => {
    const order = orders.find((item) => item._id === orderId);
    if (!order) return;

    const nextStatus = orderStatusDrafts[orderId] || order.status;
    if (nextStatus === order.status) return;

    setError('');
    setSuccess('');
    setStatusUpdatingId(orderId);

    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      setOrders((current) => current.map((item) => (item._id === orderId ? data : item)));
      setOrderStatusDrafts((current) => {
        const next = { ...current };
        delete next[orderId];
        return next;
      });
      setSuccess('Order status updated');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update order status');
    } finally {
      setStatusUpdatingId('');
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Orders Management"
        subtitle="Track all received orders, filter by status and update fulfillment stages."
        actions={
          <Stack direction="row" spacing={0.7}>
            <Chip size="small" color="warning" label={`Pending: ${countByStatus.pending + countByStatus.processing}`} />
            <Chip size="small" color="info" label={`Shipped: ${countByStatus.shipped}`} />
            <Chip size="small" color="success" label={`Delivered: ${countByStatus.delivered}`} />
          </Stack>
        }
      />

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap>
              {statusOptions.map((status) => (
                <Button
                  key={status}
                  variant={statusFilter === status ? 'contained' : 'outlined'}
                  onClick={() => setStatusFilter(status)}
                  size="small"
                  sx={{ textTransform: 'none' }}
                >
                  {toLabel(status)}
                </Button>
              ))}
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8} alignItems={{ sm: 'center' }}>
              <TextField
                size="small"
                label="Search Order / Customer"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                sx={{ minWidth: { sm: 280 } }}
              />
              <Typography variant="body2" color="text.secondary">
                Showing {filteredOrders.length} of {orders.length} orders
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          {loading && (
            <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          )}

          {!loading && filteredOrders.length === 0 && (
            <Alert severity="info">No orders match the selected filters.</Alert>
          )}

          {!loading && filteredOrders.length > 0 && (
            <>
              {isMobileTable ? (
                <Stack spacing={0.8}>
                  {paginatedItems.map((order) => {
                    const selectedStatus = orderStatusDrafts[order._id] || order.status;
                    const itemNames = (order.orderItems || [])
                      .slice(0, 2)
                      .map((item) => `${item.name} x${item.quantity}`)
                      .join(', ');
                    const extraItemCount = Math.max(0, (order.orderItems || []).length - 2);
                    const isSameStatus = selectedStatus === order.status;

                    return (
                      <Card key={order._id} variant="outlined">
                        <CardContent sx={{ p: 1 }}>
                          <Stack spacing={0.7}>
                            <Stack direction="row" justifyContent="space-between" spacing={0.8}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                  {order._id.slice(-8).toUpperCase()}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {new Date(order.createdAt).toLocaleDateString('en-IN')} • {order.paymentMethod}
                                </Typography>
                              </Box>
                              <Chip
                                label={order.status}
                                size="small"
                                color={statusColorMap[order.status] || 'default'}
                                sx={{ textTransform: 'capitalize' }}
                              />
                            </Stack>

                            <Box>
                              <Typography variant="body2">{order.user?.name || 'Guest'}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {order.user?.email || '-'}
                              </Typography>
                            </Box>

                            <Typography variant="body2">
                              {itemNames || '-'}
                              {extraItemCount > 0 ? ` (+${extraItemCount} more)` : ''}
                            </Typography>

                            <Stack direction="row" justifyContent="space-between">
                              <Typography variant="caption" color="text.secondary">Total</Typography>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatINR(order.totalPrice)}</Typography>
                            </Stack>

                            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.6}>
                              <TextField
                                select
                                size="small"
                                value={selectedStatus}
                                onChange={(event) => onStatusDraftChange(order._id, event.target.value)}
                                fullWidth
                              >
                                {updateStatuses.map((status) => (
                                  <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                                    {status}
                                  </MenuItem>
                                ))}
                              </TextField>
                              <Button
                                variant="contained"
                                size="small"
                                disabled={isSameStatus || statusUpdatingId === order._id}
                                startIcon={
                                  statusUpdatingId === order._id
                                    ? <CircularProgress size={14} color="inherit" />
                                    : undefined
                                }
                                onClick={() => onUpdateOrderStatus(order._id)}
                                fullWidth
                              >
                                {statusUpdatingId === order._id ? 'Updating...' : 'Update'}
                              </Button>
                            </Stack>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Order</TableCell>
                      <TableCell>Customer</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Items</TableCell>
                      <TableCell align="right">Total</TableCell>
                      <TableCell>Current</TableCell>
                      <TableCell>Change Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paginatedItems.map((order) => {
                      const selectedStatus = orderStatusDrafts[order._id] || order.status;
                      const itemNames = (order.orderItems || [])
                        .slice(0, 2)
                        .map((item) => `${item.name} x${item.quantity}`)
                        .join(', ');
                      const extraItemCount = Math.max(0, (order.orderItems || []).length - 2);
                      const isSameStatus = selectedStatus === order.status;

                      return (
                        <TableRow key={order._id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {order._id.slice(-8).toUpperCase()}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.paymentMethod}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{order.user?.name || 'Guest'}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {order.user?.email || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>{new Date(order.createdAt).toLocaleDateString('en-IN')}</TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Typography variant="body2">{itemNames || '-'}</Typography>
                            {extraItemCount > 0 && (
                              <Typography variant="caption" color="text.secondary">
                                +{extraItemCount} more item(s)
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="right">{formatINR(order.totalPrice)}</TableCell>
                          <TableCell>
                            <Chip
                              label={order.status}
                              size="small"
                              color={statusColorMap[order.status] || 'default'}
                              sx={{ textTransform: 'capitalize' }}
                            />
                          </TableCell>
                          <TableCell sx={{ minWidth: 220 }}>
                            <Stack direction="row" spacing={0.6}>
                              <TextField
                                select
                                size="small"
                                value={selectedStatus}
                                onChange={(event) => onStatusDraftChange(order._id, event.target.value)}
                                sx={{ minWidth: 130 }}
                              >
                                {updateStatuses.map((status) => (
                                  <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                                    {status}
                                  </MenuItem>
                                ))}
                              </TextField>
                              <Button
                                variant="contained"
                                size="small"
                                disabled={isSameStatus || statusUpdatingId === order._id}
                                startIcon={
                                  statusUpdatingId === order._id
                                    ? <CircularProgress size={14} color="inherit" />
                                    : undefined
                                }
                                onClick={() => onUpdateOrderStatus(order._id)}
                              >
                                {statusUpdatingId === order._id ? 'Updating...' : 'Update'}
                              </Button>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </>
          )}

          {!loading && filteredOrders.length > 0 && (
            <AppPagination
              totalItems={totalItems}
              page={page}
              totalPages={totalPages}
              rowsPerPage={rowsPerPage}
              onPageChange={setPage}
              onRowsPerPageChange={setRowsPerPage}
              pageSizeOptions={[5, 10, 20, 30]}
            />
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminOrdersPage;
