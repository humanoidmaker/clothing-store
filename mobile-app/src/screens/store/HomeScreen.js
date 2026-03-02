import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import ProductCard from '../../components/ProductCard';
import SectionCard from '../../components/SectionCard';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { defaultCategoryOptions, defaultGenderOptions, sortOptions } from '../../constants/options';
import { palette, radii, spacing } from '../../theme/colors';
import { normalizeText, withAllOption } from '../../utils/format';

const defaultPriceRange = [500, 8000];

const createInitialFilters = (priceRange = defaultPriceRange) => ({
  search: '',
  category: 'All',
  gender: 'All',
  brand: 'All',
  material: 'All',
  fit: 'All',
  size: '',
  color: '',
  availability: 'all',
  minPrice: priceRange[0],
  maxPrice: priceRange[1],
  sort: 'newest'
});

const HomeScreen = ({ navigation }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(() => createInitialFilters());
  const [appliedFilters, setAppliedFilters] = useState(() => createInitialFilters());
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(8);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [priceBounds, setPriceBounds] = useState({ min: defaultPriceRange[0], max: defaultPriceRange[1] });
  const [filterOptions, setFilterOptions] = useState({
    categories: withAllOption(defaultCategoryOptions),
    genders: withAllOption(defaultGenderOptions)
  });

  useEffect(() => {
    let active = true;

    const fetchFilterOptions = async () => {
      setLoadingFilters(true);
      try {
        const { data } = await api.get('/products/filters', { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }

        const min = Math.max(0, Math.floor(Number(data?.minPrice ?? 0)));
        const maxCandidate = Math.ceil(Number(data?.maxPrice ?? 0));
        const max = Math.max(min + 100, maxCandidate || min + 100);

        setFilterOptions({
          categories: withAllOption(data?.categories?.length ? data.categories : defaultCategoryOptions),
          genders: withAllOption(data?.genders?.length ? data.genders : defaultGenderOptions)
        });
        setPriceBounds({ min, max });

        setFilters((current) => ({
          ...current,
          minPrice: min,
          maxPrice: max
        }));
        setAppliedFilters((current) => ({
          ...current,
          minPrice: min,
          maxPrice: max
        }));
      } finally {
        if (active) {
          setLoadingFilters(false);
        }
      }
    };

    void fetchFilterOptions();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      setLoading(true);
      setError('');
      try {
        const params = {
          page,
          limit: rowsPerPage,
          sort: appliedFilters.sort,
          minPrice: appliedFilters.minPrice,
          maxPrice: appliedFilters.maxPrice
        };

        if (normalizeText(appliedFilters.search)) params.search = normalizeText(appliedFilters.search);
        if (appliedFilters.category !== 'All') params.category = appliedFilters.category;
        if (appliedFilters.gender !== 'All') params.gender = appliedFilters.gender;
        if (appliedFilters.brand !== 'All') params.brand = appliedFilters.brand;
        if (appliedFilters.material !== 'All') params.material = appliedFilters.material;
        if (appliedFilters.fit !== 'All') params.fit = appliedFilters.fit;
        if (normalizeText(appliedFilters.size)) params.size = normalizeText(appliedFilters.size);
        if (normalizeText(appliedFilters.color)) params.color = normalizeText(appliedFilters.color);
        if (appliedFilters.availability !== 'all') params.availability = appliedFilters.availability;

        const { data } = await api.get('/products', { params, showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }

        const nextProducts = Array.isArray(data?.products) ? data.products : [];
        setProducts(nextProducts);
        setTotalItems(Number(data?.totalItems || nextProducts.length));
        setTotalPages(Number(data?.totalPages || 1));
      } catch (requestError) {
        if (!active) {
          return;
        }
        setError(requestError?.response?.data?.message || requestError.message || 'Failed to load products');
        setProducts([]);
        setTotalItems(0);
        setTotalPages(1);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchProducts();

    return () => {
      active = false;
    };
  }, [appliedFilters, page, rowsPerPage]);

  const heading = useMemo(() => {
    if (loading || loadingFilters) {
      return 'Loading catalog...';
    }
    if (totalItems === 0) {
      return 'No products found';
    }
    return `Catalog (${totalItems})`;
  }, [loading, loadingFilters, totalItems]);

  const applyFilters = () => {
    setAppliedFilters({ ...filters, search: normalizeText(filters.search) });
    setPage(1);
  };

  const resetFilters = () => {
    const reset = createInitialFilters([priceBounds.min, priceBounds.max]);
    setFilters(reset);
    setAppliedFilters(reset);
    setPage(1);
  };

  const renderProduct = ({ item }) => {
    const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
    const defaultVariant = hasVariants
      ? item.variants.find((variant) => Number(variant?.stock || 0) > 0) || item.variants[0]
      : null;
    const selectedSize = defaultVariant?.size || item?.sizes?.[0] || '';
    const selectedColor = defaultVariant?.color || item?.colors?.[0] || '';
    const unitPrice = Number(defaultVariant?.price ?? item.price ?? 0);
    const stockLimit = Number(defaultVariant?.stock ?? item.countInStock ?? 0);

    return (
      <View style={styles.productCardWrap}>
        <ProductCard
          compact
          product={item}
          wished={isInWishlist(item._id)}
          onPress={() => navigation.navigate('ProductDetails', { id: item._id })}
          onToggleWishlist={() => toggleWishlist(item, { selectedSize, selectedColor })}
          onAddToCart={() => addToCart(item, 1, selectedSize, selectedColor, unitPrice, stockLimit)}
        />
      </View>
    );
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Store" title={heading} subtitle="Browse main catalog and reseller-added products from one feed." />

      <SectionCard>
        <AppInput label="Search" value={filters.search} onChangeText={(value) => setFilters((current) => ({ ...current, search: value }))} placeholder="Search by name, brand, material" />

        <View style={styles.row2}>
          <AppInput
            style={styles.flex}
            label="Category"
            value={filters.category === 'All' ? '' : filters.category}
            onChangeText={(value) => setFilters((current) => ({ ...current, category: value || 'All' }))}
            placeholder="All"
          />
          <AppInput
            style={styles.flex}
            label="Gender"
            value={filters.gender === 'All' ? '' : filters.gender}
            onChangeText={(value) => setFilters((current) => ({ ...current, gender: value || 'All' }))}
            placeholder="All"
          />
        </View>

        <View style={styles.row2}>
          <AppInput
            style={styles.flex}
            label="Min Price"
            keyboardType="numeric"
            value={String(filters.minPrice)}
            onChangeText={(value) => setFilters((current) => ({ ...current, minPrice: Number(value || priceBounds.min) }))}
          />
          <AppInput
            style={styles.flex}
            label="Max Price"
            keyboardType="numeric"
            value={String(filters.maxPrice)}
            onChangeText={(value) => setFilters((current) => ({ ...current, maxPrice: Number(value || priceBounds.max) }))}
          />
        </View>

        <View style={styles.quickWrap}>
          {sortOptions.map((option) => {
            const selected = filters.sort === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setFilters((current) => ({ ...current, sort: option.value }))}
                style={[styles.quickChip, selected ? styles.quickChipSelected : null]}
              >
                <Text style={[styles.quickChipText, selected ? styles.quickChipTextSelected : null]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.quickWrap}>
          {filterOptions.categories.slice(0, 8).map((category) => {
            const selected = filters.category === category;
            return (
              <Pressable
                key={category}
                onPress={() => setFilters((current) => ({ ...current, category }))}
                style={[styles.quickChip, selected ? styles.quickChipSelected : null]}
              >
                <Text style={[styles.quickChipText, selected ? styles.quickChipTextSelected : null]}>{category}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.actions}>
          <AppButton style={styles.flex} onPress={applyFilters}>
            Apply Filters
          </AppButton>
          <AppButton style={styles.flex} variant="ghost" onPress={resetFilters}>
            Reset
          </AppButton>
        </View>
      </SectionCard>

      {loading || loadingFilters ? <LoadingView message="Loading products..." /> : null}
      {!loading && error ? <EmptyState title="Unable to load products" message={error} /> : null}

      {!loading && !error && products.length === 0 ? (
        <EmptyState title="No products match filters" message="Try clearing filters or using different search terms." />
      ) : null}

      {!loading && !error && products.length > 0 ? (
        <>
          <FlatList
            data={products}
            renderItem={renderProduct}
            keyExtractor={(item) => String(item._id)}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.column}
          />

          <View style={styles.pagination}>
            <AppButton variant="ghost" disabled={page <= 1} onPress={() => setPage((current) => Math.max(1, current - 1))}>
              Prev
            </AppButton>
            <Text style={styles.pageText}>
              Page {page} / {totalPages}
            </Text>
            <AppButton variant="ghost" disabled={page >= totalPages} onPress={() => setPage((current) => Math.min(totalPages, current + 1))}>
              Next
            </AppButton>
          </View>
        </>
      ) : null}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  row2: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  flex: {
    flex: 1
  },
  quickWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  quickChip: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    backgroundColor: palette.surface
  },
  quickChipSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft
  },
  quickChipText: {
    fontSize: 12,
    color: palette.textSecondary,
    fontWeight: '600'
  },
  quickChipTextSelected: {
    color: palette.primary
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  column: {
    gap: spacing.sm,
    marginBottom: spacing.sm
  },
  productCardWrap: {
    flex: 1
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  pageText: {
    color: palette.textSecondary,
    fontWeight: '600'
  }
});

export default HomeScreen;
