import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Card,
  CardContent,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from '@mui/material';
import api from '../api';
import { formatINR } from '../utils/currency';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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
      <Typography variant="h4" sx={{ mb: 2 }}>
        My Orders
      </Typography>

      {loading && (
        <Box sx={{ py: 8, display: 'grid', placeItems: 'center' }}>
          <CircularProgress />
        </Box>
      )}

      {error && <Alert severity="error">{error}</Alert>}

      {!loading && !error && orders.length === 0 && <Alert severity="info">You have no orders yet.</Alert>}

      {!loading && !error && orders.length > 0 && (
        <Card sx={{ borderRadius: 3 }}>
          <CardContent sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Order ID</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Payment</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order._id} hover>
                    <TableCell>{order._id.slice(-8).toUpperCase()}</TableCell>
                    <TableCell>{new Date(order.createdAt).toLocaleDateString('en-IN')}</TableCell>
                    <TableCell>{order.paymentMethod}</TableCell>
                    <TableCell sx={{ textTransform: 'capitalize' }}>{order.status}</TableCell>
                    <TableCell align="right">{formatINR(order.totalPrice)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default OrdersPage;
