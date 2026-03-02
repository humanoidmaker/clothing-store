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
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';
import { formatINR } from '../../utils/currency';
import { normalizeMarginNumber } from '../../utils/validation';

const createInitialForm = (brandFallback = 'Clothing Store') => ({
  name: '',
  description: '',
  brand: brandFallback,
  category: 'T-Shirts',
  gender: 'Unisex',
  material: '',
  fit: 'Regular',
  price: '',
  purchasePrice: '',
  countInStock: '',
  image: '',
  imagesCsv: '',
  variantsJson: ''
});

const isGlobalProduct = (product) => !String(product?.resellerId || '').trim();

const AdminProductsScreen = ({ navigation }) => {
  const { user, isAdmin, isResellerAdmin } = useAuth();
  const { showToast } = useToast();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState('');
  const [editingProductId, setEditingProductId] = useState('');
  const [form, setForm] = useState(() => createInitialForm());

  const [resellerProfile, setResellerProfile] = useState(null);
  const [marginDrafts, setMarginDrafts] = useState({});
  const [savingMarginId, setSavingMarginId] = useState('');

  const loadProducts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products', {
        params: {
          includeOutOfStock: true,
          sort: 'newest',
          page: 1,
          limit: 100
        },
        showSuccessToast: false,
        showErrorToast: false
      });

      const nextProducts = Array.isArray(data?.products) ? data.products : [];
      setProducts(nextProducts);
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load products', 'error');
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadResellerProfile = async () => {
    if (!isResellerAdmin || isAdmin) {
      setResellerProfile(null);
      setMarginDrafts({});
      return;
    }

    try {
      const { data } = await api.get('/resellers/me', { showSuccessToast: false, showErrorToast: false });
      const reseller = data?.reseller || null;
      setResellerProfile(reseller);

      const overrides = reseller?.productMargins || {};
      const nextDrafts = {};
      for (const [productId, margin] of Object.entries(overrides)) {
        nextDrafts[productId] = String(margin);
      }
      setMarginDrafts(nextDrafts);
    } catch {
      setResellerProfile(null);
      setMarginDrafts({});
    }
  };

  useEffect(() => {
    void loadProducts();
    void loadResellerProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProducts = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    if (!query) {
      return products;
    }

    return products.filter((product) => {
      const name = String(product?.name || '').toLowerCase();
      const category = String(product?.category || '').toLowerCase();
      const brand = String(product?.brand || '').toLowerCase();
      return name.includes(query) || category.includes(query) || brand.includes(query);
    });
  }, [products, searchText]);

  const resetForm = () => {
    setEditingProductId('');
    setForm(createInitialForm(user?.name || 'Clothing Store'));
  };

  const openCreateForm = () => {
    resetForm();
    setFormOpen(true);
  };

  const openEditForm = (product) => {
    if (!product) {
      return;
    }

    if (isResellerAdmin && !isAdmin && isGlobalProduct(product)) {
      showToast('Main catalog product details are controlled by main admin. Use margin controls.', 'error');
      return;
    }

    setEditingProductId(product._id);
    setForm({
      name: String(product.name || ''),
      description: String(product.description || ''),
      brand: String(product.brand || ''),
      category: String(product.category || ''),
      gender: String(product.gender || ''),
      material: String(product.material || ''),
      fit: String(product.fit || ''),
      price: String(product.price ?? ''),
      purchasePrice: String(product.purchasePrice ?? ''),
      countInStock: String(product.countInStock ?? ''),
      image: String(product.image || ''),
      imagesCsv: Array.isArray(product.images) ? product.images.join(', ') : '',
      variantsJson: Array.isArray(product.variants) && product.variants.length > 0
        ? JSON.stringify(
            product.variants.map((variant) => ({
              size: variant.size,
              color: variant.color,
              price: variant.price,
              purchasePrice: variant.purchasePrice,
              stock: variant.stock,
              images: Array.isArray(variant.images) ? variant.images : []
            })),
            null,
            2
          )
        : ''
    });
    setFormOpen(true);
  };

  const parseVariants = () => {
    const raw = String(form.variantsJson || '').trim();
    if (!raw) {
      return [];
    }

    try {
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) {
        throw new Error('Variants JSON must be an array');
      }
      return parsed;
    } catch (error) {
      throw new Error(error.message || 'Invalid variants JSON');
    }
  };

  const onSaveProduct = async () => {
    if (!String(form.name || '').trim()) {
      showToast('Product name is required', 'error');
      return;
    }
    if (!String(form.description || '').trim()) {
      showToast('Description is required', 'error');
      return;
    }
    if (!String(form.category || '').trim()) {
      showToast('Category is required', 'error');
      return;
    }

    let variants = [];
    try {
      variants = parseVariants();
    } catch (error) {
      showToast(error.message || 'Invalid variants data', 'error');
      return;
    }

    const hasVariants = variants.length > 0;
    if (!hasVariants) {
      if (Number(form.price) < 0 || Number.isNaN(Number(form.price))) {
        showToast('Base price is required when no variants are provided', 'error');
        return;
      }
      if (Number(form.purchasePrice) < 0 || Number.isNaN(Number(form.purchasePrice))) {
        showToast('Base purchase price is required when no variants are provided', 'error');
        return;
      }
      if (Number(form.countInStock) < 0 || Number.isNaN(Number(form.countInStock))) {
        showToast('Base stock is required when no variants are provided', 'error');
        return;
      }
    }

    const payload = {
      name: form.name,
      description: form.description,
      brand: form.brand,
      category: form.category,
      gender: form.gender,
      material: form.material,
      fit: form.fit,
      image: form.image,
      images: String(form.imagesCsv || '')
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean),
      variants
    };

    if (!hasVariants) {
      payload.price = Number(form.price || 0);
      payload.purchasePrice = Number(form.purchasePrice || 0);
      payload.countInStock = Number(form.countInStock || 0);
    }

    setSavingProduct(true);
    try {
      if (editingProductId) {
        await api.put(`/products/${editingProductId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setFormOpen(false);
      resetForm();
      await loadProducts();
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setSavingProduct(false);
    }
  };

  const onDeleteProduct = async (product) => {
    if (!product?._id) {
      return;
    }

    if (isResellerAdmin && !isAdmin && isGlobalProduct(product)) {
      showToast('Main catalog products cannot be deleted by reseller admins.', 'error');
      return;
    }

    setDeletingProductId(product._id);
    try {
      await api.delete(`/products/${product._id}`);
      await loadProducts();
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setDeletingProductId('');
    }
  };

  const onSaveMargin = async (product) => {
    const productId = String(product?._id || '');
    if (!productId || !resellerProfile?.id) {
      return;
    }

    setSavingMarginId(productId);
    try {
      const currentOverrides = resellerProfile?.productMargins || {};
      const currentMargin = Object.prototype.hasOwnProperty.call(currentOverrides, productId)
        ? currentOverrides[productId]
        : resellerProfile.defaultMarginPercent || 0;
      const marginPercent = normalizeMarginNumber(marginDrafts[productId], currentMargin);

      await api.put('/resellers/me/margins/products', {
        updates: [
          {
            productId,
            marginPercent
          }
        ]
      });
      await loadResellerProfile();
      showToast('Product margin saved', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingMarginId('');
    }
  };

  const onResetMargin = async (product) => {
    const productId = String(product?._id || '');
    if (!productId || !resellerProfile?.id) {
      return;
    }

    setSavingMarginId(productId);
    try {
      await api.put('/resellers/me/margins/products', {
        updates: [
          {
            productId,
            remove: true
          }
        ]
      });
      await loadResellerProfile();
      showToast('Product margin reset to default', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSavingMarginId('');
    }
  };

  const renderProductActions = (product) => {
    const canMutate = isAdmin || (!isGlobalProduct(product) && String(product.resellerId || '') === String(user?.resellerId || ''));

    if (canMutate) {
      return (
        <View style={styles.rowActions}>
          <AppButton variant="ghost" onPress={() => openEditForm(product)}>
            Edit
          </AppButton>
          <AppButton variant="danger" onPress={() => onDeleteProduct(product)} disabled={deletingProductId === product._id}>
            {deletingProductId === product._id ? 'Deleting...' : 'Delete'}
          </AppButton>
        </View>
      );
    }

    if (isResellerAdmin && !isAdmin && isGlobalProduct(product)) {
      const productId = String(product._id || '');
      const overrides = resellerProfile?.productMargins || {};
      const hasOverride = Object.prototype.hasOwnProperty.call(overrides, productId);
      const effectiveMargin = hasOverride
        ? Number(overrides[productId])
        : Number(resellerProfile?.defaultMarginPercent || 0);
      const purchasePrice = Number(product.price || 0);
      const resellerPrice = Number((purchasePrice * (1 + effectiveMargin / 100)).toFixed(2));
      const draftValue = Object.prototype.hasOwnProperty.call(marginDrafts, productId)
        ? marginDrafts[productId]
        : String(effectiveMargin);

      return (
        <>
          <Text style={styles.infoText}>Main catalog price is purchase price. Set margin for your sale price.</Text>
          <Text style={styles.meta}>Purchase: {formatINR(purchasePrice)} - Sale: {formatINR(resellerPrice)} - Margin: {effectiveMargin}%</Text>

          <View style={styles.row2}>
            <AppInput
              style={styles.flex}
              label="Margin Override (%)"
              keyboardType="numeric"
              value={String(draftValue)}
              onChangeText={(value) =>
                setMarginDrafts((current) => ({
                  ...current,
                  [productId]: value
                }))
              }
            />
            <View style={styles.marginActionCol}>
              <AppButton onPress={() => onSaveMargin(product)} disabled={savingMarginId === productId}>
                {savingMarginId === productId ? 'Saving...' : 'Save'}
              </AppButton>
              <AppButton variant="ghost" onPress={() => onResetMargin(product)} disabled={savingMarginId === productId || !hasOverride}>
                Clear
              </AppButton>
            </View>
          </View>
        </>
      );
    }

    return null;
  };

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Dashboard"
        title="Products"
        subtitle="Manage reseller-created products and apply margins on main catalog products."
        rightSlot={<AppButton onPress={openCreateForm}>Add Product</AppButton>}
      />

      <SectionCard>
        <AppInput label="Search" value={searchText} onChangeText={setSearchText} placeholder="Name, category, brand" />
        <View style={styles.rowActions}>
          <AppButton variant="ghost" onPress={() => navigation.navigate('ResellerMediaLibrary')}>
            Media Library
          </AppButton>
          <AppButton variant="ghost" onPress={() => loadProducts()}>
            Refresh
          </AppButton>
        </View>
      </SectionCard>

      {formOpen ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>{editingProductId ? 'Edit Product' : 'Create Product'}</Text>
          <AppInput label="Name" value={form.name} onChangeText={(value) => setForm((current) => ({ ...current, name: value }))} />
          <AppInput label="Description" value={form.description} onChangeText={(value) => setForm((current) => ({ ...current, description: value }))} multiline numberOfLines={5} />
          <View style={styles.row2}>
            <AppInput style={styles.flex} label="Brand" value={form.brand} onChangeText={(value) => setForm((current) => ({ ...current, brand: value }))} />
            <AppInput style={styles.flex} label="Category" value={form.category} onChangeText={(value) => setForm((current) => ({ ...current, category: value }))} />
          </View>
          <View style={styles.row2}>
            <AppInput style={styles.flex} label="Gender" value={form.gender} onChangeText={(value) => setForm((current) => ({ ...current, gender: value }))} />
            <AppInput style={styles.flex} label="Fit" value={form.fit} onChangeText={(value) => setForm((current) => ({ ...current, fit: value }))} />
          </View>
          <AppInput label="Material" value={form.material} onChangeText={(value) => setForm((current) => ({ ...current, material: value }))} />

          <View style={styles.row2}>
            <AppInput style={styles.flex} label="Price" keyboardType="numeric" value={form.price} onChangeText={(value) => setForm((current) => ({ ...current, price: value }))} />
            <AppInput style={styles.flex} label="Purchase Price" keyboardType="numeric" value={form.purchasePrice} onChangeText={(value) => setForm((current) => ({ ...current, purchasePrice: value }))} />
            <AppInput style={styles.flex} label="Stock" keyboardType="numeric" value={form.countInStock} onChangeText={(value) => setForm((current) => ({ ...current, countInStock: value }))} />
          </View>

          <AppInput label="Primary Image URL" value={form.image} onChangeText={(value) => setForm((current) => ({ ...current, image: value }))} />
          <AppInput label="Gallery Images (comma separated URLs)" value={form.imagesCsv} onChangeText={(value) => setForm((current) => ({ ...current, imagesCsv: value }))} multiline numberOfLines={3} />
          <AppInput label="Variants JSON (optional array)" value={form.variantsJson} onChangeText={(value) => setForm((current) => ({ ...current, variantsJson: value }))} multiline numberOfLines={6} />

          <View style={styles.rowActions}>
            <AppButton onPress={onSaveProduct} disabled={savingProduct}>
              {savingProduct ? 'Saving...' : editingProductId ? 'Update Product' : 'Create Product'}
            </AppButton>
            <AppButton variant="ghost" onPress={() => setFormOpen(false)}>
              Close
            </AppButton>
          </View>
        </SectionCard>
      ) : null}

      {loading ? <LoadingView message="Loading products..." /> : null}
      {!loading && filteredProducts.length === 0 ? <EmptyState title="No products" message="Create product or adjust search filter." /> : null}

      {!loading && filteredProducts.map((product) => (
        <SectionCard key={product._id}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.meta}>{product.brand || '-'} - {product.category || '-'} - {product.gender || '-'}</Text>
          <Text style={styles.meta}>Price: {formatINR(product.price)} - Purchase: {formatINR(product.purchasePrice || 0)} - Stock: {product.countInStock}</Text>
          {!isGlobalProduct(product) ? (
            <Text style={styles.meta}>Owner: Reseller Product ({product.resellerName || product.resellerId})</Text>
          ) : (
            <Text style={styles.meta}>Owner: Main Catalog</Text>
          )}
          {renderProductActions(product)}
        </SectionCard>
      ))}
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
  productName: {
    color: palette.textPrimary,
    fontSize: 14,
    fontWeight: '700'
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  infoText: {
    color: palette.textSecondary,
    fontSize: 12
  },
  marginActionCol: {
    width: 120,
    justifyContent: 'flex-end',
    gap: 8
  }
});

export default AdminProductsScreen;

