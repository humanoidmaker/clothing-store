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
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';
import { formatINR } from '../../utils/currency';
import { normalizeMarginNumber } from '../../utils/validation';

const createInitialForm = () => ({
  name: '',
  websiteName: '',
  primaryDomain: '',
  extraDomainsCsv: '',
  defaultMarginPercent: '0',
  isActive: true,
  adminUserName: '',
  adminUserEmail: '',
  adminUserPassword: ''
});

const resolveAllProducts = async () => {
  const allProducts = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { data } = await api.get('/products', {
      params: {
        includeOutOfStock: true,
        sort: 'newest',
        page,
        limit: 100
      },
      showSuccessToast: false,
      showErrorToast: false
    });

    const pageItems = Array.isArray(data?.products) ? data.products : [];
    allProducts.push(...pageItems);

    totalPages = Number(data?.totalPages || 1);
    page += 1;
    if (page > 100) {
      break;
    }
  }

  return allProducts;
};

const AdminResellersScreen = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();

  const [resellers, setResellers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingResellers, setLoadingResellers] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [form, setForm] = useState(createInitialForm());
  const [editingResellerId, setEditingResellerId] = useState('');
  const [selectedResellerId, setSelectedResellerId] = useState('');
  const [savingReseller, setSavingReseller] = useState(false);
  const [busyResellerId, setBusyResellerId] = useState('');

  const [savingAllMargin, setSavingAllMargin] = useState(false);
  const [savingProductMarginId, setSavingProductMarginId] = useState('');
  const [globalMarginDraft, setGlobalMarginDraft] = useState('0');
  const [productMarginDrafts, setProductMarginDrafts] = useState({});
  const [productSearch, setProductSearch] = useState('');

  const selectedReseller = useMemo(
    () => resellers.find((reseller) => reseller.id === selectedResellerId) || null,
    [resellers, selectedResellerId]
  );

  const refreshProducts = async () => {
    setLoadingProducts(true);
    try {
      setProducts(await resolveAllProducts());
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load products', 'error');
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const refreshResellers = async () => {
    setLoadingResellers(true);
    try {
      const { data } = await api.get('/resellers/admin', { showSuccessToast: false, showErrorToast: false });
      const nextResellers = Array.isArray(data?.resellers) ? data.resellers : [];
      setResellers(nextResellers);
      setSelectedResellerId((current) => {
        if (current && nextResellers.some((entry) => entry.id === current)) {
          return current;
        }
        return nextResellers[0]?.id || '';
      });
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load resellers', 'error');
      setResellers([]);
      setSelectedResellerId('');
    } finally {
      setLoadingResellers(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) {
      setLoadingResellers(false);
      setLoadingProducts(false);
      return;
    }

    void refreshResellers();
    void refreshProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  useEffect(() => {
    if (!selectedReseller) {
      setGlobalMarginDraft('0');
      setProductMarginDrafts({});
      return;
    }

    setGlobalMarginDraft(String(selectedReseller.defaultMarginPercent ?? 0));
    const nextDrafts = {};
    const overrides = selectedReseller.productMargins && typeof selectedReseller.productMargins === 'object'
      ? selectedReseller.productMargins
      : {};

    for (const [productId, margin] of Object.entries(overrides)) {
      nextDrafts[productId] = String(margin);
    }

    setProductMarginDrafts(nextDrafts);
  }, [selectedReseller]);

  const filteredProducts = useMemo(() => {
    const query = String(productSearch || '').trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product?.name || '').toLowerCase();
      const category = String(product?.category || '').toLowerCase();
      const brand = String(product?.brand || '').toLowerCase();
      return name.includes(query) || category.includes(query) || brand.includes(query);
    });
  }, [products, productSearch]);

  const resetForm = () => {
    setEditingResellerId('');
    setForm(createInitialForm());
  };

  const onEditReseller = (reseller) => {
    const domains = Array.isArray(reseller?.domains) ? reseller.domains : [];

    setEditingResellerId(reseller.id);
    setForm({
      name: String(reseller?.name || ''),
      websiteName: String(reseller?.websiteName || ''),
      primaryDomain: String(reseller?.primaryDomain || domains[0] || ''),
      extraDomainsCsv: domains
        .filter((domain) => domain !== String(reseller?.primaryDomain || '').trim())
        .join(', '),
      defaultMarginPercent: String(reseller?.defaultMarginPercent ?? 0),
      isActive: reseller?.isActive !== false,
      adminUserName: String(reseller?.adminUserName || ''),
      adminUserEmail: String(reseller?.adminUserEmail || ''),
      adminUserPassword: ''
    });
  };

  const onSubmitReseller = async () => {
    const baseDomains = [form.primaryDomain, ...String(form.extraDomainsCsv || '').split(',')]
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (!String(form.name || '').trim()) {
      showToast('Reseller name is required', 'error');
      return;
    }
    if (!String(form.primaryDomain || '').trim()) {
      showToast('Primary domain is required', 'error');
      return;
    }
    if (baseDomains.length === 0) {
      showToast('At least one domain is required', 'error');
      return;
    }

    setSavingReseller(true);
    try {
      const payload = {
        name: form.name,
        websiteName: form.websiteName,
        primaryDomain: form.primaryDomain,
        domains: baseDomains,
        defaultMarginPercent: Number(form.defaultMarginPercent || 0),
        isActive: Boolean(form.isActive)
      };

      if (editingResellerId) {
        await api.put(`/resellers/admin/${editingResellerId}`, payload);
      } else {
        const createPayload = {
          ...payload,
          adminUser: {
            name: String(form.adminUserName || '').trim() || `${String(form.name || '').trim()} Admin`,
            email: String(form.adminUserEmail || '').trim(),
            password: String(form.adminUserPassword || '').trim()
          }
        };

        if (!createPayload.adminUser.email) {
          showToast('Reseller login email is required', 'error');
          setSavingReseller(false);
          return;
        }

        await api.post('/resellers/admin', createPayload);
      }

      resetForm();
      await refreshResellers();
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setSavingReseller(false);
    }
  };

  const onDeleteReseller = async (resellerId) => {
    setBusyResellerId(resellerId);
    try {
      await api.delete(`/resellers/admin/${resellerId}`);
      await refreshResellers();
      if (editingResellerId === resellerId) {
        resetForm();
      }
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setBusyResellerId('');
    }
  };

  const onApplyMarginToAllProducts = async () => {
    if (!selectedReseller?.id) {
      return;
    }

    setSavingAllMargin(true);
    try {
      const marginPercent = normalizeMarginNumber(globalMarginDraft, selectedReseller.defaultMarginPercent || 0);
      await api.put(`/resellers/admin/${selectedReseller.id}/margins/default`, {
        marginPercent,
        clearProductOverrides: true
      });
      await refreshResellers();
      showToast('Default margin applied', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingAllMargin(false);
    }
  };

  const onSaveProductMargin = async (productId) => {
    if (!selectedReseller?.id || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    try {
      const fallback = selectedReseller.defaultMarginPercent || 0;
      const marginPercent = normalizeMarginNumber(productMarginDrafts[productId], fallback);
      await api.put(`/resellers/admin/${selectedReseller.id}/margins/products`, {
        updates: [
          {
            productId,
            marginPercent
          }
        ]
      });
      await refreshResellers();
      showToast('Product margin saved', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingProductMarginId('');
    }
  };

  const onClearProductOverride = async (productId) => {
    if (!selectedReseller?.id || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    try {
      await api.put(`/resellers/admin/${selectedReseller.id}/margins/products`, {
        updates: [
          {
            productId,
            remove: true
          }
        ]
      });
      await refreshResellers();
      showToast('Product margin reset to default', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingProductMarginId('');
    }
  };

  if (!isAdmin) {
    return (
      <AppScreen>
        <EmptyState title="Access denied" message="Only main admin can manage reseller websites." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader eyebrow="Dashboard" title="Resellers" subtitle="Create reseller websites and manage domain-based pricing margins." />

      <SectionCard>
        <Text style={styles.sectionTitle}>{editingResellerId ? 'Update Reseller' : 'Create Reseller'}</Text>
        <AppInput label="Reseller Name" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
        <AppInput label="Website Name" value={form.websiteName} onChangeText={(value) => setForm((current) => ({ ...current, websiteName: value }))} />
        <AppInput label="Primary Domain" value={form.primaryDomain} onChangeText={(value) => setForm((current) => ({ ...current, primaryDomain: value }))} placeholder="reseller.example.com" />
        <AppInput label="Additional Domains (comma separated)" value={form.extraDomainsCsv} onChangeText={(value) => setForm((current) => ({ ...current, extraDomainsCsv: value }))} />
        <AppInput label="Default Margin (%)" keyboardType="numeric" value={form.defaultMarginPercent} onChangeText={(value) => setForm((current) => ({ ...current, defaultMarginPercent: value }))} />
        <AppInput label="Is Active (true/false)" value={String(form.isActive)} onChangeText={(value) => setForm((current) => ({ ...current, isActive: String(value || '').trim().toLowerCase() !== 'false' }))} />

        {!editingResellerId ? (
          <>
            <AppInput label="Admin User Name" value={form.adminUserName} onChangeText={(value) => setForm((current) => ({ ...current, adminUserName: value }))} />
            <AppInput label="Admin User Email" value={form.adminUserEmail} onChangeText={(value) => setForm((current) => ({ ...current, adminUserEmail: value }))} autoCapitalize="none" keyboardType="email-address" />
            <AppInput label="Admin User Password (optional)" value={form.adminUserPassword} onChangeText={(value) => setForm((current) => ({ ...current, adminUserPassword: value }))} secureTextEntry />
          </>
        ) : null}

        <View style={styles.rowActions}>
          <AppButton onPress={onSubmitReseller} disabled={savingReseller}>
            {savingReseller ? 'Saving...' : editingResellerId ? 'Update Reseller' : 'Create Reseller'}
          </AppButton>
          {editingResellerId ? (
            <AppButton variant="ghost" onPress={resetForm}>
              Cancel Edit
            </AppButton>
          ) : null}
        </View>
      </SectionCard>

      {loadingResellers ? <LoadingView message="Loading resellers..." /> : null}
      {!loadingResellers && resellers.length === 0 ? <EmptyState title="No resellers configured" message="Create reseller website to begin domain-based selling." /> : null}

      {!loadingResellers && resellers.map((reseller) => (
        <SectionCard key={reseller.id}>
          <Text style={styles.resellerName}>{reseller.name}</Text>
          <Text style={styles.meta}>Website: {reseller.websiteName || reseller.name}</Text>
          <Text style={styles.meta}>Primary domain: {reseller.primaryDomain || '-'}</Text>
          <Text style={styles.meta}>Domains: {(Array.isArray(reseller.domains) ? reseller.domains : []).join(', ') || '-'}</Text>
          <Text style={styles.meta}>Login: {reseller.adminUserEmail || '-'}</Text>
          <Text style={styles.meta}>Default margin: {reseller.defaultMarginPercent}% - Overrides: {reseller.productMarginOverrides || 0}</Text>
          <StatusPill label={reseller.isActive ? 'Active' : 'Inactive'} status={reseller.isActive ? 'active' : 'inactive'} />

          <View style={styles.rowActions}>
            <AppButton variant={selectedResellerId === reseller.id ? 'primary' : 'ghost'} onPress={() => setSelectedResellerId(reseller.id)}>
              {selectedResellerId === reseller.id ? 'Selected' : 'Select'}
            </AppButton>
            <AppButton variant="ghost" onPress={() => onEditReseller(reseller)}>
              Edit
            </AppButton>
            <AppButton variant="danger" disabled={busyResellerId === reseller.id} onPress={() => onDeleteReseller(reseller.id)}>
              {busyResellerId === reseller.id ? 'Deleting...' : 'Delete'}
            </AppButton>
          </View>
        </SectionCard>
      ))}

      {selectedReseller ? (
        <>
          <SectionCard>
            <Text style={styles.sectionTitle}>Margin Controls for {selectedReseller.name}</Text>
            <View style={styles.row2}>
              <AppInput style={styles.flex} label="Default Margin (%)" keyboardType="numeric" value={globalMarginDraft} onChangeText={setGlobalMarginDraft} />
              <View style={styles.marginActionWrap}>
                <AppButton onPress={onApplyMarginToAllProducts} disabled={savingAllMargin}>
                  {savingAllMargin ? 'Applying...' : 'Apply to All'}
                </AppButton>
              </View>
            </View>
          </SectionCard>

          <SectionCard>
            <AppInput label="Search Products" value={productSearch} onChangeText={setProductSearch} placeholder="Name, category, brand" />
          </SectionCard>

          {loadingProducts ? <LoadingView message="Loading products..." /> : null}
          {!loadingProducts && filteredProducts.length === 0 ? <EmptyState title="No products found" message="Try different search text." /> : null}

          {!loadingProducts && filteredProducts.map((product) => {
            const productId = String(product?._id || '');
            const overrides = selectedReseller.productMargins || {};
            const hasOverride = Object.prototype.hasOwnProperty.call(overrides, productId);
            const effectiveMargin = hasOverride
              ? normalizeMarginNumber(overrides[productId], selectedReseller.defaultMarginPercent || 0)
              : normalizeMarginNumber(selectedReseller.defaultMarginPercent || 0, 0);
            const basePrice = Number(product?.price || 0);
            const resellerPrice = Number((basePrice * (1 + effectiveMargin / 100)).toFixed(2));
            const draftValue = Object.prototype.hasOwnProperty.call(productMarginDrafts, productId)
              ? productMarginDrafts[productId]
              : String(effectiveMargin);

            return (
              <SectionCard key={productId}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.meta}>{product.brand || '-'} - {product.category || '-'}</Text>
                <Text style={styles.meta}>Purchase: {formatINR(basePrice)} - Sale: {formatINR(resellerPrice)} - Margin: {effectiveMargin}%</Text>

                <View style={styles.row2}>
                  <AppInput
                    style={styles.flex}
                    label="Override Margin (%)"
                    keyboardType="numeric"
                    value={String(draftValue)}
                    onChangeText={(value) =>
                      setProductMarginDrafts((current) => ({
                        ...current,
                        [productId]: value
                      }))
                    }
                  />
                  <View style={styles.marginActionCol}>
                    <AppButton onPress={() => onSaveProductMargin(productId)} disabled={savingProductMarginId === productId}>
                      {savingProductMarginId === productId ? 'Saving...' : 'Save'}
                    </AppButton>
                    <AppButton variant="ghost" disabled={savingProductMarginId === productId || !hasOverride} onPress={() => onClearProductOverride(productId)}>
                      Clear
                    </AppButton>
                  </View>
                </View>
              </SectionCard>
            );
          })}
        </>
      ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  row2: {
    flexDirection: 'row',
    gap: 8
  },
  flex: {
    flex: 1
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8
  },
  resellerName: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  productName: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  marginActionWrap: {
    width: 140,
    justifyContent: 'flex-end'
  },
  marginActionCol: {
    width: 120,
    justifyContent: 'flex-end',
    gap: 8
  }
});

export default AdminResellersScreen;

