import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';

const DEFAULT_SEO_META = {
  title: '',
  description: '',
  keywords: '',
  canonicalUrl: '',
  robots: '',
  ogTitle: '',
  ogDescription: '',
  ogImage: '',
  ogImageAlt: '',
  ogType: '',
  twitterCard: '',
  twitterTitle: '',
  twitterDescription: '',
  twitterImage: '',
  twitterImageAlt: '',
  twitterSite: '',
  twitterCreator: ''
};

const normalizeMeta = (value = {}) => ({
  title: String(value.title || ''),
  description: String(value.description || ''),
  keywords: String(value.keywords || ''),
  canonicalUrl: String(value.canonicalUrl || ''),
  robots: String(value.robots || ''),
  ogTitle: String(value.ogTitle || ''),
  ogDescription: String(value.ogDescription || ''),
  ogImage: String(value.ogImage || ''),
  ogImageAlt: String(value.ogImageAlt || ''),
  ogType: String(value.ogType || ''),
  twitterCard: String(value.twitterCard || ''),
  twitterTitle: String(value.twitterTitle || ''),
  twitterDescription: String(value.twitterDescription || ''),
  twitterImage: String(value.twitterImage || ''),
  twitterImageAlt: String(value.twitterImageAlt || ''),
  twitterSite: String(value.twitterSite || ''),
  twitterCreator: String(value.twitterCreator || '')
});

const MetaEditor = ({ value, onChange }) => (
  <View style={styles.metaEditor}>
    <AppInput label="Title" value={value.title} onChangeText={(next) => onChange('title', next)} />
    <AppInput label="Description" value={value.description} onChangeText={(next) => onChange('description', next)} multiline numberOfLines={3} />
    <AppInput label="Keywords" value={value.keywords} onChangeText={(next) => onChange('keywords', next)} />
    <AppInput label="Canonical URL" value={value.canonicalUrl} onChangeText={(next) => onChange('canonicalUrl', next)} autoCapitalize="none" />
    <AppInput label="Robots" value={value.robots} onChangeText={(next) => onChange('robots', next)} autoCapitalize="none" />
    <AppInput label="OG Title" value={value.ogTitle} onChangeText={(next) => onChange('ogTitle', next)} />
    <AppInput label="OG Description" value={value.ogDescription} onChangeText={(next) => onChange('ogDescription', next)} multiline numberOfLines={3} />
    <AppInput label="OG Image URL" value={value.ogImage} onChangeText={(next) => onChange('ogImage', next)} autoCapitalize="none" />
    <AppInput label="OG Image Alt" value={value.ogImageAlt} onChangeText={(next) => onChange('ogImageAlt', next)} />
    <AppInput label="OG Type" value={value.ogType} onChangeText={(next) => onChange('ogType', next)} autoCapitalize="none" />
    <AppInput label="Twitter Card" value={value.twitterCard} onChangeText={(next) => onChange('twitterCard', next)} autoCapitalize="none" />
    <AppInput label="Twitter Title" value={value.twitterTitle} onChangeText={(next) => onChange('twitterTitle', next)} />
    <AppInput label="Twitter Description" value={value.twitterDescription} onChangeText={(next) => onChange('twitterDescription', next)} multiline numberOfLines={3} />
    <AppInput label="Twitter Image URL" value={value.twitterImage} onChangeText={(next) => onChange('twitterImage', next)} autoCapitalize="none" />
    <AppInput label="Twitter Image Alt" value={value.twitterImageAlt} onChangeText={(next) => onChange('twitterImageAlt', next)} />
    <AppInput label="Twitter Site" value={value.twitterSite} onChangeText={(next) => onChange('twitterSite', next)} autoCapitalize="none" />
    <AppInput label="Twitter Creator" value={value.twitterCreator} onChangeText={(next) => onChange('twitterCreator', next)} autoCapitalize="none" />
  </View>
);

const AdminSeoScreen = ({ navigation }) => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [defaultsDraft, setDefaultsDraft] = useState(DEFAULT_SEO_META);
  const [publicPages, setPublicPages] = useState([]);
  const [selectedPageKey, setSelectedPageKey] = useState('');
  const [pageDraft, setPageDraft] = useState({
    key: '',
    label: '',
    path: '',
    meta: DEFAULT_SEO_META
  });

  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [productSeoDraft, setProductSeoDraft] = useState(DEFAULT_SEO_META);

  const selectedPage = useMemo(
    () => publicPages.find((page) => page.key === selectedPageKey) || null,
    [publicPages, selectedPageKey]
  );

  useEffect(() => {
    let active = true;

    const loadSeo = async () => {
      setLoading(true);
      try {
        const seoResponse = await api.get('/seo/admin', { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }

        const nextDefaults = normalizeMeta(seoResponse?.data?.defaults || {});
        const nextPages = Array.isArray(seoResponse?.data?.publicPages) ? seoResponse.data.publicPages : [];

        setDefaultsDraft(nextDefaults);
        setPublicPages(nextPages);

        if (nextPages.length > 0) {
          setSelectedPageKey(nextPages[0].key);
          setPageDraft({
            key: nextPages[0].key,
            label: nextPages[0].label,
            path: nextPages[0].path,
            meta: normalizeMeta(nextPages[0].meta || nextDefaults)
          });
        }

        if (isAdmin) {
          const productsResponse = await api.get('/seo/products', {
            showSuccessToast: false,
            showErrorToast: false
          });
          if (!active) {
            return;
          }
          setProducts(Array.isArray(productsResponse?.data) ? productsResponse.data : []);
        }
      } catch (error) {
        if (!active) {
          return;
        }
        showToast(error?.response?.data?.message || error.message || 'Failed to load SEO settings', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadSeo();

    return () => {
      active = false;
    };
  }, [isAdmin, showToast]);

  useEffect(() => {
    if (!selectedPage) {
      return;
    }

    setPageDraft({
      key: selectedPage.key,
      label: selectedPage.label,
      path: selectedPage.path,
      meta: normalizeMeta(selectedPage.meta || defaultsDraft)
    });
  }, [selectedPage, defaultsDraft]);

  const updateDefaultsMeta = (field, value) => {
    setDefaultsDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const updatePageMeta = (field, value) => {
    setPageDraft((current) => ({
      ...current,
      meta: {
        ...current.meta,
        [field]: value
      }
    }));
  };

  const updateProductMeta = (field, value) => {
    setProductSeoDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onSaveDefaults = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/seo/defaults', { meta: defaultsDraft });
      setDefaultsDraft(normalizeMeta(data?.defaults || {}));
      setPublicPages(Array.isArray(data?.publicPages) ? data.publicPages : []);
      showToast('Default SEO saved', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSaving(false);
    }
  };

  const onSavePublicPage = async () => {
    if (!String(pageDraft.key || '').trim()) {
      showToast('Page key is required', 'error');
      return;
    }
    if (!String(pageDraft.label || '').trim()) {
      showToast('Page label is required', 'error');
      return;
    }
    if (!String(pageDraft.path || '').trim()) {
      showToast('Page path is required', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.put('/seo/public-page', {
        key: pageDraft.key,
        label: pageDraft.label,
        path: pageDraft.path,
        meta: pageDraft.meta
      });
      const nextPages = Array.isArray(data?.publicPages) ? data.publicPages : [];
      setPublicPages(nextPages);
      setSelectedPageKey(pageDraft.key);
      showToast('Public page SEO saved', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSaving(false);
    }
  };

  const onDeletePublicPage = async () => {
    if (!String(pageDraft.key || '').trim()) {
      showToast('Choose page key first', 'error');
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.delete(`/seo/public-page/${pageDraft.key}`);
      const nextPages = Array.isArray(data?.publicPages) ? data.publicPages : [];
      setPublicPages(nextPages);
      setSelectedPageKey(nextPages[0]?.key || '');
      setPageDraft({
        key: '',
        label: '',
        path: '',
        meta: normalizeMeta(defaultsDraft)
      });
      showToast('Public page SEO deleted', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSaving(false);
    }
  };

  const onLoadProductSeo = async (productId) => {
    setSelectedProductId(productId);
    if (!productId) {
      setProductSeoDraft(normalizeMeta(defaultsDraft));
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.get(`/seo/products/${productId}`, { showSuccessToast: false, showErrorToast: false });
      setProductSeoDraft(normalizeMeta(data?.seo || {}));
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load product SEO', 'error');
    } finally {
      setSaving(false);
    }
  };

  const onSaveProductSeo = async () => {
    if (!selectedProductId) {
      showToast('Select product first', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.put(`/seo/products/${selectedProductId}`, { seo: productSeoDraft });
      showToast('Product SEO saved', 'success');
    } catch {
      // Error toast via interceptor.
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <LoadingView message="Loading SEO settings..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Dashboard"
        title="SEO Manager"
        subtitle="Manage default, public page and product SEO metadata from mobile."
        rightSlot={(
          <AppButton variant="ghost" onPress={() => navigation.navigate('ResellerMediaLibrary')}>
            Media
          </AppButton>
        )}
      />

      <SectionCard>
        <Text style={styles.sectionTitle}>Default SEO Meta</Text>
        <MetaEditor value={defaultsDraft} onChange={updateDefaultsMeta} />
        <AppButton onPress={onSaveDefaults} disabled={saving}>
          Save Default SEO
        </AppButton>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Public Page SEO</Text>
        <View style={styles.wrapButtons}>
          {publicPages.map((page) => (
            <AppButton
              key={page.key}
              variant={selectedPageKey === page.key ? 'primary' : 'ghost'}
              onPress={() => setSelectedPageKey(page.key)}
            >
              {page.label}
            </AppButton>
          ))}
        </View>

        <AppInput label="Page Key" value={pageDraft.key} onChangeText={(value) => setPageDraft((current) => ({ ...current, key: value }))} />
        <AppInput label="Page Label" value={pageDraft.label} onChangeText={(value) => setPageDraft((current) => ({ ...current, label: value }))} />
        <AppInput label="Page Path" value={pageDraft.path} onChangeText={(value) => setPageDraft((current) => ({ ...current, path: value }))} autoCapitalize="none" />

        <MetaEditor value={pageDraft.meta} onChange={updatePageMeta} />

        <View style={styles.rowActions}>
          <AppButton onPress={onSavePublicPage} disabled={saving}>
            Save Public Page
          </AppButton>
          <AppButton variant="danger" onPress={onDeletePublicPage} disabled={saving}>
            Delete Page
          </AppButton>
        </View>
      </SectionCard>

      {isAdmin ? (
        <SectionCard>
          <Text style={styles.sectionTitle}>Product SEO (Admin Only)</Text>
          <AppInput
            label="Product ID"
            value={selectedProductId}
            onChangeText={setSelectedProductId}
            placeholder={products[0]?._id || 'Paste product id'}
          />
          <View style={styles.rowActions}>
            <AppButton variant="ghost" onPress={() => onLoadProductSeo(selectedProductId)} disabled={saving}>
              Load Product SEO
            </AppButton>
            <AppButton variant="ghost" onPress={() => onLoadProductSeo('')} disabled={saving}>
              Reset to Defaults
            </AppButton>
          </View>

          <Text style={styles.muted}>Known products: {products.length}</Text>
          <MetaEditor value={productSeoDraft} onChange={updateProductMeta} />
          <AppButton onPress={onSaveProductSeo} disabled={saving || !selectedProductId}>
            Save Product SEO
          </AppButton>
        </SectionCard>
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
  wrapButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  rowActions: {
    flexDirection: 'row',
    gap: 8
  },
  metaEditor: {
    gap: 8
  },
  muted: {
    color: palette.textSecondary,
    fontSize: 12
  }
});

export default AdminSeoScreen;
