import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import ArrowBackOutlinedIcon from '@mui/icons-material/ArrowBackOutlined';
import LocalPrintshopOutlinedIcon from '@mui/icons-material/LocalPrintshopOutlined';
import { Link as RouterLink, useParams } from 'react-router-dom';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import ProductImageViewport from '../components/ProductImageViewport';
import api from '../api';
import { useStoreSettings } from '../context/StoreSettingsContext';
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

const formatDateTime = (value) => {
  if (!value) return '-';

  try {
    return new Date(value).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '-';
  }
};

const OrderInvoicePage = () => {
  const { id } = useParams();
  const { storeName } = useStoreSettings();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const orderItems = useMemo(
    () => (Array.isArray(order?.orderItems) ? order.orderItems : []),
    [order]
  );
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(orderItems, 8);

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      setError('');

      try {
        const { data } = await api.get(`/orders/my/${id}`);
        setOrder(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load order invoice');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [id]);

  const itemsSubtotal = useMemo(() => {
    if (!orderItems.length) return 0;
    return orderItems.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }, [orderItems]);

  const invoiceNumber = useMemo(() => {
    if (!order?._id) return '-';
    return `INV-${order._id.slice(-8).toUpperCase()}`;
  }, [order?._id]);

  if (loading) {
    return (
      <Stack alignItems="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return (
      <Stack spacing={1}>
        <Alert severity="error">{error}</Alert>
        <Button component={RouterLink} to="/orders" variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>
          Back to Orders
        </Button>
      </Stack>
    );
  }

  if (!order) {
    return <Alert severity="info">Order not found.</Alert>;
  }

  const shipping = order.shippingAddress || {};
  const shippingAddress = [shipping.street, shipping.city, shipping.state, shipping.postalCode, shipping.country]
    .map((part) => String(part || '').trim())
    .filter(Boolean)
    .join(', ');

  return (
    <Box>
      <PageHeader
        eyebrow="Invoice"
        title={invoiceNumber}
        subtitle={`Order ${order._id.slice(-8).toUpperCase()} - ${formatDateTime(order.createdAt)}`}
        actions={
          <Stack direction="row" spacing={0.8}>
            <Button component={RouterLink} to="/orders" variant="outlined" startIcon={<ArrowBackOutlinedIcon />}>
              Back
            </Button>
            <Button variant="contained" startIcon={<LocalPrintshopOutlinedIcon />} onClick={() => window.print()}>
              Print
            </Button>
          </Stack>
        }
      />

      <Card>
        <CardContent sx={{ p: 1.2 }}>
          <Box
            sx={{
              display: 'grid',
              gap: 1.2,
              gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 280px' },
              alignItems: 'start'
            }}
          >
            <Stack spacing={0.4}>
              <Typography sx={{ fontWeight: 700 }}>{storeName}</Typography>
              <Typography variant="body2" color="text.secondary">
                India
              </Typography>
              <Typography variant="body2" color="text.secondary">
                support@astra-attire.example
              </Typography>
            </Stack>

            <Stack spacing={0.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Invoice No</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>{invoiceNumber}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Order Date</Typography>
                <Typography variant="body2">{formatDateTime(order.createdAt)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Payment Date</Typography>
                <Typography variant="body2">{formatDateTime(order.paidAt)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">Status</Typography>
                <Chip
                  label={order.status}
                  size="small"
                  color={statusColorMap[order.status] || 'default'}
                  sx={{ textTransform: 'capitalize' }}
                />
              </Stack>
            </Stack>
          </Box>

          <Divider sx={{ my: 1.2 }} />

          <Box
            sx={{
              display: 'grid',
              gap: 1.2,
              gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }
            }}
          >
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.4 }}>
                Shipping Address
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {shippingAddress || '-'}
              </Typography>
            </Box>

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.4 }}>
                Payment Details
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Method: {order.paymentMethod || '-'}
              </Typography>
              {order.paymentResult?.razorpayPaymentId && (
                <Typography variant="body2" color="text.secondary">
                  Razorpay Payment ID: {order.paymentResult.razorpayPaymentId}
                </Typography>
              )}
              {order.paymentResult?.razorpayOrderId && (
                <Typography variant="body2" color="text.secondary">
                  Razorpay Order ID: {order.paymentResult.razorpayOrderId}
                </Typography>
              )}
            </Box>
          </Box>

          <Divider sx={{ my: 1.2 }} />

          <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Item</TableCell>
                  <TableCell>Details</TableCell>
                  <TableCell align="right">Qty</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">Line Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {paginatedItems.map((item, index) => (
                  <TableRow key={`${item.product}-${index}`}>
                    <TableCell sx={{ width: 72 }}>
                      <ProductImageViewport
                        src={item.image}
                        alt={item.name}
                        aspectRatio="1 / 1"
                        fit="cover"
                        containerSx={{ width: 56, minWidth: 56 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {item.selectedSize ? `Size ${item.selectedSize}` : 'Size -'}
                        {item.selectedColor ? ` - ${item.selectedColor}` : ''}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{item.quantity}</TableCell>
                    <TableCell align="right">{formatINR(item.price)}</TableCell>
                    <TableCell align="right">{formatINR(Number(item.price || 0) * Number(item.quantity || 0))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          <AppPagination
            totalItems={totalItems}
            page={page}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            pageSizeOptions={[5, 8, 12, 20]}
          />

          <Divider sx={{ my: 1.2 }} />

          <Stack spacing={0.5} sx={{ ml: 'auto', width: { xs: '100%', sm: 260 } }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Subtotal</Typography>
              <Typography variant="body2">{formatINR(itemsSubtotal)}</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Total</Typography>
              <Typography variant="subtitle1" color="primary" sx={{ fontWeight: 700 }}>
                {formatINR(order.totalPrice)}
              </Typography>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default OrderInvoicePage;
