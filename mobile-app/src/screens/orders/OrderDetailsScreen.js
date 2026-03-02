import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../../api/client';
import AppHeader from '../../components/AppHeader';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import KeyValueRow from '../../components/KeyValueRow';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import StatusPill from '../../components/StatusPill';
import { useToast } from '../../context/ToastContext';
import { palette, spacing } from '../../theme/colors';
import { formatINR } from '../../utils/currency';
import { toDateTimeLabel } from '../../utils/format';

const OrderDetailsScreen = ({ route }) => {
  const { id } = route.params;
  const { showToast } = useToast();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const fetchOrder = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/orders/my/${id}`, { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }
        setOrder(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setOrder(null);
        showToast(error?.response?.data?.message || error.message || 'Failed to load invoice', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchOrder();

    return () => {
      active = false;
    };
  }, [id, showToast]);

  const itemsSubtotal = useMemo(() => {
    const items = Array.isArray(order?.orderItems) ? order.orderItems : [];
    return items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  }, [order]);

  if (loading) {
    return (
      <AppScreen>
        <LoadingView message="Loading invoice..." />
      </AppScreen>
    );
  }

  if (!order) {
    return (
      <AppScreen>
        <EmptyState title="Invoice not found" message="This order may not exist or is inaccessible." />
      </AppScreen>
    );
  }

  const shipping = order.shippingAddress || {};

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Invoice"
        title={`INV-${String(order._id || '').slice(-8).toUpperCase()}`}
        subtitle={`Placed on ${toDateTimeLabel(order.createdAt)}`}
      />

      <SectionCard>
        <View style={styles.row}>
          <Text style={styles.sectionTitle}>Order Status</Text>
          <StatusPill label={order.status} status={order.status} />
        </View>

        <KeyValueRow label="Payment Method" value={order.paymentMethod || '-'} />
        <KeyValueRow label="Paid At" value={toDateTimeLabel(order.paidAt)} muted />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Shipping Address</Text>
        <Text style={styles.addressText}>{shipping.fullName || '-'}</Text>
        <Text style={styles.addressText}>{shipping.phone || '-'}</Text>
        <Text style={styles.addressText}>{shipping.email || '-'}</Text>
        <Text style={styles.addressText}>
          {[shipping.street, shipping.addressLine2, shipping.city, shipping.state, shipping.postalCode, shipping.country]
            .filter(Boolean)
            .join(', ') || '-'}
        </Text>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Order Items</Text>
        {(Array.isArray(order.orderItems) ? order.orderItems : []).map((item, index) => (
          <View key={`${item.product}-${index}`} style={styles.itemRow}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemMeta}>
              {item.quantity} x {formatINR(item.price)}
              {item.selectedSize ? ` - Size ${item.selectedSize}` : ''}
              {item.selectedColor ? ` - ${item.selectedColor}` : ''}
            </Text>
            <Text style={styles.itemTotal}>{formatINR(Number(item.price || 0) * Number(item.quantity || 0))}</Text>
          </View>
        ))}

        <View style={styles.totalRows}>
          <KeyValueRow label="Subtotal" value={formatINR(itemsSubtotal)} />
          <KeyValueRow label="Total" value={formatINR(order.totalPrice)} />
        </View>
      </SectionCard>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 16,
    fontWeight: '700'
  },
  addressText: {
    color: palette.textSecondary,
    fontSize: 13,
    lineHeight: 19
  },
  itemRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#edf1f5',
    paddingBottom: spacing.xs,
    marginBottom: spacing.xs,
    gap: 2
  },
  itemName: {
    color: palette.textPrimary,
    fontWeight: '700'
  },
  itemMeta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  itemTotal: {
    color: palette.primary,
    fontWeight: '700'
  },
  totalRows: {
    marginTop: spacing.sm,
    gap: 6
  }
});

export default OrderDetailsScreen;

