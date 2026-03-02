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
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';
import { formatINR } from '../../utils/currency';
import { normalizeMarginNumber } from '../../utils/validation';

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

const ResellerPricingScreen = () => {
  const { showToast } = useToast();
  const [reseller, setReseller] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingReseller, setLoadingReseller] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [savingAllMargin, setSavingAllMargin] = useState(false);
  const [savingProductMarginId, setSavingProductMarginId] = useState('');
  const [globalMarginDraft, setGlobalMarginDraft] = useState('0');
  const [productMarginDrafts, setProductMarginDrafts] = useState({});
  const [productSearch, setProductSearch] = useState('');

  const refreshReseller = async () => {
    setLoadingReseller(true);
    try {
      const { data } = await api.get('/resellers/me', { showSuccessToast: false, showErrorToast: false });
      setReseller(data?.reseller || null);
    } catch (error) {
      setReseller(null);
      showToast(error?.response?.data?.message || error.message || 'Failed to load reseller profile', 'error');
    } finally {
      setLoadingReseller(false);
    }
  };

  const refreshProducts = async () => {
    setLoadingProducts(true);
    try {
      const nextProducts = await resolveAllProducts();
      setProducts(nextProducts);
    } catch (error) {
      setProducts([]);
      showToast(error?.response?.data?.message || error.message || 'Failed to load products', 'error');
    } finally {
      setLoadingProducts(false);
    }
  };

  useEffect(() => {
    void refreshReseller();
    void refreshProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!reseller) {
      setGlobalMarginDraft('0');
      setProductMarginDrafts({});
      return;
    }

    setGlobalMarginDraft(String(reseller.defaultMarginPercent ?? 0));
    const nextDrafts = {};
    const overrides = reseller.productMargins && typeof reseller.productMargins === 'object' ? reseller.productMargins : {};
    for (const [productId, margin] of Object.entries(overrides)) {
      nextDrafts[productId] = String(margin);
    }
    setProductMarginDrafts(nextDrafts);
  }, [reseller]);

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

  const refreshResellerState = async () => {
    const { data } = await api.get('/resellers/me', { showSuccessToast: false, showErrorToast: false });
    setReseller(data?.reseller || null);
  };

  const onApplyMarginToAllProducts = async () => {
    if (!reseller?.id) {
      return;
    }

    setSavingAllMargin(true);
    try {
      const marginPercent = normalizeMarginNumber(globalMarginDraft, reseller.defaultMarginPercent || 0);
      await api.put('/resellers/me/margins/default', {
        marginPercent,
        clearProductOverrides: true
      });
      await refreshResellerState();
      showToast('Default margin applied to reseller catalog', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingAllMargin(false);
    }
  };

  const onSaveProductMargin = async (productId) => {
    if (!reseller?.id || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    try {
      const fallback = reseller.defaultMarginPercent || 0;
      const marginPercent = normalizeMarginNumber(productMarginDrafts[productId], fallback);
      await api.put('/resellers/me/margins/products', {
        updates: [
          {
            productId,
            marginPercent
          }
        ]
      });
      await refreshResellerState();
      showToast('Product margin saved', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingProductMarginId('');
    }
  };

  const onClearProductOverride = async (productId) => {
    if (!reseller?.id || !productId) {
      return;
    }

    setSavingProductMarginId(productId);
    try {
      await api.put('/resellers/me/margins/products', {
        updates: [
          {
            productId,
            remove: true
          }
        ]
      });
      await refreshResellerState();
      showToast('Product margin reset to default', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingProductMarginId('');
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Reseller" title="Product Pricing" subtitle="Main catalog price is purchase price; your sale price is purchase + margin." />

      {loadingReseller ? <LoadingView message="Loading reseller profile..." /> : null}

      {!loadingReseller && !reseller ? (
        <EmptyState title="Reseller profile not found" message="Contact main admin to verify reseller setup." />
      ) : null}

      {reseller ? (
        <>
          <SectionCard>
            <Text style={styles.infoText}>
              Managing margins for {reseller.websiteName || reseller.name} ({reseller.primaryDomain || 'No domain'})
            </Text>
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
            <AppInput label="Search Products" value={productSearch} onChangeText={setProductSearch} placeholder="Product name, category, brand" />
          </SectionCard>

          {loadingProducts ? <LoadingView message="Loading products..." /> : null}
          {!loadingProducts && filteredProducts.length === 0 ? <EmptyState title="No products found" message="Try different search text." /> : null}

          {!loadingProducts && filteredProducts.map((product) => {
            const productId = String(product?._id || '');
            const overrides = reseller.productMargins || {};
            const hasOverride = Object.prototype.hasOwnProperty.call(overrides, productId);
            const effectiveMargin = hasOverride
              ? normalizeMarginNumber(overrides[productId], reseller.defaultMarginPercent || 0)
              : normalizeMarginNumber(reseller.defaultMarginPercent || 0, 0);
            const basePrice = Number(product?.price || 0);
            const resellerPrice = Number((basePrice * (1 + effectiveMargin / 100)).toFixed(2));
            const draftValue = Object.prototype.hasOwnProperty.call(productMarginDrafts, productId)
              ? productMarginDrafts[productId]
              : String(effectiveMargin);

            return (
              <SectionCard key={productId}>
                <Text style={styles.productName}>{product.name}</Text>
                <Text style={styles.meta}>{product.brand || '-'} - {product.category || '-'}</Text>
                <Text style={styles.meta}>Purchase: {formatINR(basePrice)} - Margin: {effectiveMargin}% - Sale: {formatINR(resellerPrice)}</Text>

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
                  <View style={styles.actionCol}>
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
  infoText: {
    color: palette.textSecondary,
    fontSize: 13
  },
  row2: {
    flexDirection: 'row',
    gap: 8
  },
  flex: {
    flex: 1
  },
  marginActionWrap: {
    width: 140,
    justifyContent: 'flex-end'
  },
  actionCol: {
    width: 120,
    justifyContent: 'flex-end',
    gap: 8
  },
  productName: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 12
  }
});

export default ResellerPricingScreen;

