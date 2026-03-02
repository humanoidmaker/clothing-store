import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import StatusPill from '../../components/StatusPill';
import { orderStatuses } from '../../constants/options';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';
import { formatINR } from '../../utils/currency';
import { toDateLabel } from '../../utils/format';

const createInitialManualInvoice = () => ({
  customerMode: 'manual',
  existingUserId: '',
  manualCustomer: {
    name: '',
    email: '',
    phone: ''
  },
  itemProductId: '',
  itemQuantity: '1',
  itemSize: '',
  itemColor: '',
  shippingAddress: {
    fullName: '',
    phone: '',
    email: '',
    street: '',
    addressLine2: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  },
  billingDetails: {
    sameAsShipping: true,
    fullName: '',
    phone: '',
    email: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
    country: 'India'
  },
  taxDetails: {
    businessPurchase: false,
    businessName: '',
    gstin: '',
    pan: '',
    purchaseOrderNumber: '',
    notes: ''
  },
  paymentMethod: 'Manual Invoice',
  status: 'paid'
});

const AdminOrdersScreen = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [orderStatusDrafts, setOrderStatusDrafts] = useState({});
  const [statusUpdatingId, setStatusUpdatingId] = useState('');

  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [invoiceSubmitting, setInvoiceSubmitting] = useState(false);
  const [manualInvoice, setManualInvoice] = useState(createInitialManualInvoice);
  const [customerOptions, setCustomerOptions] = useState([]);
  const [productOptions, setProductOptions] = useState([]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/orders', { showSuccessToast: false, showErrorToast: false });
      const nextOrders = Array.isArray(data) ? data : [];
      setOrders(nextOrders);
      setOrderStatusDrafts(
        nextOrders.reduce((acc, order) => {
          acc[order._id] = order.status;
          return acc;
        }, {})
      );
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load orders', 'error');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const preloadManualInvoiceDependencies = async () => {
    try {
      const [usersResponse, productsResponse] = await Promise.all([
        api.get('/auth/admin/users', {
          params: { limit: 200 },
          showSuccessToast: false,
          showErrorToast: false
        }),
        api.get('/products', {
          params: { includeOutOfStock: true, limit: 100, page: 1 },
          showSuccessToast: false,
          showErrorToast: false
        })
      ]);

      setCustomerOptions(Array.isArray(usersResponse?.data?.users) ? usersResponse.data.users : []);
      setProductOptions(Array.isArray(productsResponse?.data?.products) ? productsResponse.data.products : []);
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to preload manual invoice data', 'error');
    }
  };

  useEffect(() => {
    void fetchOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredOrders = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    return orders.filter((order) => {
      if (statusFilter !== 'all' && order.status !== statusFilter) {
        return false;
      }

      if (!query) {
        return true;
      }

      const orderId = String(order?._id || '').toLowerCase();
      const userName = String(order?.user?.name || '').toLowerCase();
      const userEmail = String(order?.user?.email || '').toLowerCase();
      return orderId.includes(query) || userName.includes(query) || userEmail.includes(query);
    });
  }, [orders, searchText, statusFilter]);

  const onStatusUpdate = async (order) => {
    const orderId = String(order._id || '');
    const nextStatus = orderStatusDrafts[orderId] || order.status;
    if (!orderId || nextStatus === order.status) {
      return;
    }

    setStatusUpdatingId(orderId);
    try {
      const { data } = await api.put(`/orders/${orderId}/status`, { status: nextStatus });
      setOrders((current) =>
        current.map((entry) => (entry._id === orderId ? { ...entry, ...data } : entry))
      );
      showToast('Order status updated', 'success');
    } catch {
      // Error toasts handled by interceptor.
    } finally {
      setStatusUpdatingId('');
    }
  };

  const onOpenInvoice = () => {
    setInvoiceOpen((current) => !current);
    if (!invoiceOpen) {
      void preloadManualInvoiceDependencies();
    }
  };

  const onCreateManualInvoice = async () => {
    if (!isAdmin) {
      showToast('Only main admin can create manual invoices', 'error');
      return;
    }

    if (!manualInvoice.itemProductId) {
      showToast('Select product for manual invoice', 'error');
      return;
    }

    const payload = {
      customerMode: manualInvoice.customerMode,
      userId: manualInvoice.customerMode === 'existing' ? manualInvoice.existingUserId : undefined,
      manualCustomer:
        manualInvoice.customerMode === 'manual'
          ? {
              ...manualInvoice.manualCustomer
            }
          : undefined,
      items: [
        {
          productId: manualInvoice.itemProductId,
          quantity: Number(manualInvoice.itemQuantity || 1),
          selectedSize: manualInvoice.itemSize,
          selectedColor: manualInvoice.itemColor
        }
      ],
      shippingAddress: {
        ...manualInvoice.shippingAddress
      },
      billingDetails: manualInvoice.billingDetails.sameAsShipping
        ? {
            sameAsShipping: true
          }
        : {
            ...manualInvoice.billingDetails,
            sameAsShipping: false
          },
      taxDetails: {
        ...manualInvoice.taxDetails
      },
      paymentMethod: manualInvoice.paymentMethod,
      status: manualInvoice.status
    };

    setInvoiceSubmitting(true);
    try {
      await api.post('/orders/admin/manual-invoice', payload);
      setManualInvoice(createInitialManualInvoice());
      setInvoiceOpen(false);
      await fetchOrders();
      showToast('Manual invoice created', 'success');
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setInvoiceSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Dashboard" title="Orders" subtitle="Track and update order fulfillment status." rightSlot={isAdmin ? <AppButton onPress={onOpenInvoice}>{invoiceOpen ? 'Close Invoice' : 'Manual Invoice'}</AppButton> : null} />

      <SectionCard>
        <AppInput label="Search" value={searchText} onChangeText={setSearchText} placeholder="Order id, customer name, email" />
        <View style={styles.wrapButtons}>
          {['all', ...orderStatuses].map((status) => (
            <AppButton
              key={status}
              variant={statusFilter === status ? 'primary' : 'ghost'}
              onPress={() => setStatusFilter(status)}
            >
              {status}
            </AppButton>
          ))}
        </View>
      </SectionCard>

      {invoiceOpen ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Create Manual Invoice</Text>
          <View style={styles.wrapButtons}>
            <AppButton variant={manualInvoice.customerMode === 'manual' ? 'primary' : 'ghost'} onPress={() => setManualInvoice((current) => ({ ...current, customerMode: 'manual' }))}>
              Manual Customer
            </AppButton>
            <AppButton variant={manualInvoice.customerMode === 'existing' ? 'primary' : 'ghost'} onPress={() => setManualInvoice((current) => ({ ...current, customerMode: 'existing' }))}>
              Existing User
            </AppButton>
          </View>

          {manualInvoice.customerMode === 'existing' ? (
            <AppInput
              label="Existing User ID"
              value={manualInvoice.existingUserId}
              onChangeText={(value) =>
                setManualInvoice((current) => ({
                  ...current,
                  existingUserId: value
                }))
              }
              placeholder={customerOptions[0]?._id || 'Paste user id'}
            />
          ) : (
            <>
              <AppInput
                label="Customer Name"
                value={manualInvoice.manualCustomer.name}
                onChangeText={(value) =>
                  setManualInvoice((current) => ({
                    ...current,
                    manualCustomer: {
                      ...current.manualCustomer,
                      name: value
                    }
                  }))
                }
              />
              <AppInput
                label="Customer Email"
                value={manualInvoice.manualCustomer.email}
                onChangeText={(value) =>
                  setManualInvoice((current) => ({
                    ...current,
                    manualCustomer: {
                      ...current.manualCustomer,
                      email: value
                    }
                  }))
                }
              />
            </>
          )}

          <AppInput
            label="Product ID"
            value={manualInvoice.itemProductId}
            onChangeText={(value) => setManualInvoice((current) => ({ ...current, itemProductId: value }))}
            placeholder={productOptions[0]?._id || 'Paste product id'}
          />
          <View style={styles.row2}>
            <AppInput style={styles.flex} label="Quantity" value={manualInvoice.itemQuantity} onChangeText={(value) => setManualInvoice((current) => ({ ...current, itemQuantity: value }))} keyboardType="numeric" />
            <AppInput style={styles.flex} label="Size" value={manualInvoice.itemSize} onChangeText={(value) => setManualInvoice((current) => ({ ...current, itemSize: value }))} />
            <AppInput style={styles.flex} label="Color" value={manualInvoice.itemColor} onChangeText={(value) => setManualInvoice((current) => ({ ...current, itemColor: value }))} />
          </View>

          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <AppInput label="Full Name" value={manualInvoice.shippingAddress.fullName} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, fullName: value } }))} />
          <AppInput label="Phone" value={manualInvoice.shippingAddress.phone} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, phone: value } }))} />
          <AppInput label="Email" value={manualInvoice.shippingAddress.email} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, email: value } }))} />
          <AppInput label="Street" value={manualInvoice.shippingAddress.street} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, street: value } }))} />
          <View style={styles.row2}>
            <AppInput style={styles.flex} label="City" value={manualInvoice.shippingAddress.city} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, city: value } }))} />
            <AppInput style={styles.flex} label="State" value={manualInvoice.shippingAddress.state} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, state: value } }))} />
          </View>
          <View style={styles.row2}>
            <AppInput style={styles.flex} label="Postal" value={manualInvoice.shippingAddress.postalCode} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, postalCode: value } }))} />
            <AppInput style={styles.flex} label="Country" value={manualInvoice.shippingAddress.country} onChangeText={(value) => setManualInvoice((current) => ({ ...current, shippingAddress: { ...current.shippingAddress, country: value } }))} />
          </View>

          <View style={styles.row2}>
            <AppInput style={styles.flex} label="Payment Method" value={manualInvoice.paymentMethod} onChangeText={(value) => setManualInvoice((current) => ({ ...current, paymentMethod: value }))} />
            <AppInput style={styles.flex} label="Status" value={manualInvoice.status} onChangeText={(value) => setManualInvoice((current) => ({ ...current, status: value.toLowerCase() }))} />
          </View>

          <AppButton onPress={onCreateManualInvoice} disabled={invoiceSubmitting}>
            {invoiceSubmitting ? 'Creating...' : 'Create Manual Invoice'}
          </AppButton>
        </SectionCard>
      ) : null}

      {loading ? <LoadingView message="Loading orders..." /> : null}
      {!loading && filteredOrders.length === 0 ? <EmptyState title="No orders found" message="Try changing search or status filter." /> : null}

      {!loading && filteredOrders.map((order) => {
        const selectedStatus = orderStatusDrafts[order._id] || order.status;
        return (
          <SectionCard key={order._id}>
            <View style={styles.rowBetween}>
              <Text style={styles.orderCode}>#{String(order._id || '').slice(-8).toUpperCase()}</Text>
              <StatusPill label={order.status} status={order.status} />
            </View>
            <Text style={styles.meta}>{order?.user?.name || 'Customer'} - {order?.user?.email || '-'}</Text>
            <Text style={styles.meta}>Date: {toDateLabel(order.createdAt)} - Payment: {order.paymentMethod || '-'}</Text>
            <Text style={styles.total}>{formatINR(order.totalPrice)}</Text>

            <View style={styles.wrapButtons}>
              {orderStatuses.map((status) => (
                <AppButton
                  key={`${order._id}-${status}`}
                  variant={selectedStatus === status ? 'primary' : 'ghost'}
                  onPress={() =>
                    setOrderStatusDrafts((current) => ({
                      ...current,
                      [order._id]: status
                    }))
                  }
                >
                  {status}
                </AppButton>
              ))}
            </View>

            <AppButton
              variant="secondary"
              onPress={() => onStatusUpdate(order)}
              disabled={statusUpdatingId === order._id || selectedStatus === order.status}
            >
              {statusUpdatingId === order._id ? 'Updating...' : 'Update Status'}
            </AppButton>
          </SectionCard>
        );
      })}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  row2: {
    flexDirection: 'row',
    gap: 8
  },
  flex: {
    flex: 1
  },
  wrapButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
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
    fontWeight: '700'
  }
});

export default AdminOrdersScreen;

