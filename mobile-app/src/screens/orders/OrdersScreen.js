import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import StatusPill from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { palette, spacing } from '../../theme/colors';
import { formatINR } from '../../utils/currency';
import { toDateLabel } from '../../utils/format';

const OrdersScreen = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchOrders = async () => {
      if (!isAuthenticated) {
        return;
      }

      setLoading(true);
      try {
        const { data } = await api.get('/orders/my', { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }
        setOrders(Array.isArray(data) ? data : []);
      } catch (error) {
        if (!active) {
          return;
        }
        showToast(error?.response?.data?.message || error.message || 'Failed to load orders', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchOrders();

    return () => {
      active = false;
    };
  }, [isAuthenticated, showToast]);

  if (!isAuthenticated) {
    return (
      <AppScreen>
        <EmptyState title="Login required" message="Sign in to track your orders and invoices." />
        <AppButton onPress={() => navigation.navigate('Login')}>Login</AppButton>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader eyebrow="Orders" title="My Orders" subtitle="Track status updates and open full invoice details." />
      {loading ? <LoadingView message="Loading orders..." /> : null}
      {!loading && orders.length === 0 ? <EmptyState title="No orders yet" message="Your confirmed orders will appear here." /> : null}

      {orders.map((order) => (
        <SectionCard key={order._id}>
          <View style={styles.headerRow}>
            <Text style={styles.orderCode}>#{String(order._id || '').slice(-8).toUpperCase()}</Text>
            <StatusPill label={order.status} status={order.status} />
          </View>
          <Text style={styles.meta}>Date: {toDateLabel(order.createdAt)}</Text>
          <Text style={styles.meta}>Payment: {order.paymentMethod || '-'}</Text>
          <Text style={styles.total}>{formatINR(order.totalPrice)}</Text>
          <AppButton variant="ghost" onPress={() => navigation.navigate('OrderDetails', { id: order._id })}>
            View Invoice
          </AppButton>
        </SectionCard>
      ))}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  orderCode: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  total: {
    color: palette.primary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: spacing.xs
  }
});

export default OrdersScreen;
