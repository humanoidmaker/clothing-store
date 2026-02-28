import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import { useSearchParams } from 'react-router-dom';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import api from '../api';
import ProductCard from '../components/ProductCard';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const defaultPriceRange = [500, 8000];
const fallbackCategoryOptions = ['T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Dresses', 'Jackets', 'Tops', 'Activewear', 'Polos', 'Skirts', 'Shoes'];
const fallbackGenderOptions = ['Men', 'Women', 'Unisex'];
const fallbackSizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '26', '28', '30', '32', '34', '36', '38', '6', '7', '8', '9', '10', '11'];
const fallbackColorOptions = ['Black', 'White', 'Navy', 'Grey', 'Beige', 'Olive', 'Maroon', 'Blue', 'Sky Blue', 'Mint', 'Coral', 'Off White', 'Red', 'Green'];
const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' }
];

const withAll = (values) => ['All', ...values.filter(Boolean)];

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
  priceRange: [...priceRange],
  sort: 'newest'
});

const fallbackFilterOptions = {
  categories: withAll(fallbackCategoryOptions),
  genders: withAll(fallbackGenderOptions),
  sizes: fallbackSizeOptions,
  colors: fallbackColorOptions,
  brands: ['All'],
  materials: ['All'],
  fits: ['All']
};

const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFilterOptions, setLoadingFilterOptions] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(() => createInitialFilters(defaultPriceRange));
  const [appliedFilters, setAppliedFilters] = useState(() => createInitialFilters(defaultPriceRange));
  const [filterOptions, setFilterOptions] = useState(fallbackFilterOptions);
  const [priceBounds, setPriceBounds] = useState({
    min: defaultPriceRange[0],
    max: defaultPriceRange[1]
  });
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(products, 9);

  const navbarSearch = useMemo(() => String(searchParams.get('q') || '').trim(), [searchParams]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      setLoadingFilterOptions(true);

      try {
        const { data } = await api.get('/products/filters');
        const nextMin = Math.max(0, Math.floor(Number(data.minPrice ?? 0)));
        const normalizedMax = Math.ceil(Number(data.maxPrice ?? 0));
        const nextMax = Math.max(nextMin + 100, normalizedMax || nextMin + 100);
        const nextPriceRange = [nextMin, nextMax];

        setFilterOptions({
          categories: withAll(data.categories?.length ? data.categories : fallbackCategoryOptions),
          genders: withAll(data.genders?.length ? data.genders : fallbackGenderOptions),
          sizes: data.sizes?.length ? data.sizes : fallbackSizeOptions,
          colors: data.colors?.length ? data.colors : fallbackColorOptions,
          brands: withAll(data.brands || []),
          materials: withAll(data.materials || []),
          fits: withAll(data.fits || [])
        });
        setPriceBounds({ min: nextMin, max: nextMax });
        setFilters((current) => ({ ...current, priceRange: [...nextPriceRange] }));
        setAppliedFilters((current) => ({ ...current, priceRange: [...nextPriceRange] }));
      } catch {
        setFilterOptions(fallbackFilterOptions);
      } finally {
        setLoadingFilterOptions(false);
      }
    };

    fetchFilterOptions();
  }, []);

  useEffect(() => {
    setFilters((current) => (current.search === navbarSearch ? current : { ...current, search: navbarSearch }));
    setAppliedFilters((current) => (current.search === navbarSearch ? current : { ...current, search: navbarSearch }));
  }, [navbarSearch]);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError('');

      try {
        const params = {
          minPrice: appliedFilters.priceRange[0],
          maxPrice: appliedFilters.priceRange[1],
          sort: appliedFilters.sort
        };

        if (appliedFilters.search.trim()) params.search = appliedFilters.search.trim();
        if (appliedFilters.category !== 'All') params.category = appliedFilters.category;
        if (appliedFilters.gender !== 'All') params.gender = appliedFilters.gender;
        if (appliedFilters.brand !== 'All') params.brand = appliedFilters.brand;
        if (appliedFilters.material !== 'All') params.material = appliedFilters.material;
        if (appliedFilters.fit !== 'All') params.fit = appliedFilters.fit;
        if (appliedFilters.size) params.size = appliedFilters.size;
        if (appliedFilters.color) params.color = appliedFilters.color;
        if (appliedFilters.availability !== 'all') params.availability = appliedFilters.availability;

        const { data } = await api.get('/products', { params });
        setProducts(data);
      } catch (requestError) {
        setError(requestError.response?.data?.message || 'Failed to load clothing products');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [appliedFilters]);

  const hasAdvancedFilters =
    Boolean(appliedFilters.search.trim()) ||
    appliedFilters.category !== 'All' ||
    appliedFilters.gender !== 'All' ||
    appliedFilters.brand !== 'All' ||
    appliedFilters.material !== 'All' ||
    appliedFilters.fit !== 'All' ||
    Boolean(appliedFilters.size) ||
    Boolean(appliedFilters.color) ||
    appliedFilters.availability !== 'all' ||
    appliedFilters.priceRange[0] !== priceBounds.min ||
    appliedFilters.priceRange[1] !== priceBounds.max ||
    appliedFilters.sort !== 'newest';

  const heading = useMemo(() => {
    if (products.length === 0) return 'No Styles Found';
    if (hasAdvancedFilters) return 'Filtered Styles';
    return 'All Products';
  }, [products.length, hasAdvancedFilters]);

  const applyFilters = () => {
    const next = { ...filters, search: filters.search.trim() };
    setAppliedFilters(next);

    const nextParams = new URLSearchParams(searchParams);
    if (next.search) nextParams.set('q', next.search);
    else nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
  };

  const resetFilters = () => {
    const resetTo = createInitialFilters([priceBounds.min, priceBounds.max]);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('q');
    setSearchParams(nextParams, { replace: true });
    setFilters(resetTo);
    setAppliedFilters(resetTo);
  };

  return (
    <Box>
      <Paper
        variant="outlined"
        sx={{
          p: 1.1,
          mb: 1.2,
          borderLeft: '4px solid',
          borderColor: 'secondary.main',
          bgcolor: 'background.paper'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={0.6}>
          <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: '0.08em' }}>
            STYLE DESK
          </Typography>
          <Typography variant="caption" color="text.secondary">
            New drops weekly • curated for compact browsing
          </Typography>
        </Stack>
      </Paper>

      <PageHeader
        eyebrow="Store"
        title={heading}
        subtitle="Filter by category, gender, brand, material, fit, size, color, stock and price."
        actions={
          <Stack direction="row" spacing={0.7} alignItems="center">
            {(loading || loadingFilterOptions) && <CircularProgress size={14} />}
            <Typography color="text.secondary">
              {loading || loadingFilterOptions ? 'Loading items...' : `${totalItems} items`}
            </Typography>
          </Stack>
        }
      />

      <Box
        sx={{
          display: 'grid',
          gap: 1.2,
          gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
          alignItems: 'start'
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Card sx={{ position: { md: 'sticky' }, top: { md: 68 } }}>
            <CardContent sx={{ p: 1.2 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.2 }}>
                <Typography variant="subtitle1">Filters</Typography>
                <TuneOutlinedIcon color="action" fontSize="small" />
              </Stack>

              <Stack spacing={1.1}>
                <TextField
                  label="Search"
                  placeholder="shirt, denim"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  size="small"
                />

                <FormControl size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(event) => setFilters((current) => ({ ...current, category: event.target.value }))}
                  >
                    {filterOptions.categories.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Gender</InputLabel>
                  <Select
                    value={filters.gender}
                    label="Gender"
                    onChange={(event) => setFilters((current) => ({ ...current, gender: event.target.value }))}
                  >
                    {filterOptions.genders.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Brand</InputLabel>
                  <Select
                    value={filters.brand}
                    label="Brand"
                    onChange={(event) => setFilters((current) => ({ ...current, brand: event.target.value }))}
                  >
                    {filterOptions.brands.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Material</InputLabel>
                  <Select
                    value={filters.material}
                    label="Material"
                    onChange={(event) => setFilters((current) => ({ ...current, material: event.target.value }))}
                  >
                    {filterOptions.materials.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Fit</InputLabel>
                  <Select
                    value={filters.fit}
                    label="Fit"
                    onChange={(event) => setFilters((current) => ({ ...current, fit: event.target.value }))}
                  >
                    {filterOptions.fits.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Size</InputLabel>
                  <Select
                    value={filters.size}
                    label="Size"
                    onChange={(event) => setFilters((current) => ({ ...current, size: event.target.value }))}
                  >
                    <MenuItem value="">All Sizes</MenuItem>
                    {filterOptions.sizes.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Color</InputLabel>
                  <Select
                    value={filters.color}
                    label="Color"
                    onChange={(event) => setFilters((current) => ({ ...current, color: event.target.value }))}
                  >
                    <MenuItem value="">All Colors</MenuItem>
                    {filterOptions.colors.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <FormControl size="small">
                  <InputLabel>Stock</InputLabel>
                  <Select
                    value={filters.availability}
                    label="Stock"
                    onChange={(event) => setFilters((current) => ({ ...current, availability: event.target.value }))}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="in_stock">In Stock</MenuItem>
                    <MenuItem value="out_of_stock">Out of Stock</MenuItem>
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.6 }}>
                    Price: {formatINR(filters.priceRange[0])} - {formatINR(filters.priceRange[1])}
                  </Typography>
                  <Slider
                    value={filters.priceRange}
                    onChange={(event, nextValue) => {
                      if (!Array.isArray(nextValue)) return;
                      setFilters((current) => ({ ...current, priceRange: nextValue }));
                    }}
                    valueLabelDisplay="auto"
                    min={priceBounds.min}
                    max={priceBounds.max}
                    step={50}
                    size="small"
                  />
                </Box>

                <FormControl size="small">
                  <InputLabel>Sort</InputLabel>
                  <Select
                    value={filters.sort}
                    label="Sort"
                    onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
                  >
                    {sortOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Stack direction="row" spacing={0.8}>
                  <Button
                    variant="contained"
                    onClick={applyFilters}
                    fullWidth
                    disabled={loading || loadingFilterOptions}
                    startIcon={loading ? <CircularProgress size={14} color="inherit" /> : undefined}
                  >
                    {loading ? 'Applying...' : 'Apply'}
                  </Button>
                  <Button
                    variant="outlined"
                    startIcon={<RestartAltOutlinedIcon fontSize="small" />}
                    onClick={resetFilters}
                    fullWidth
                    disabled={loading || loadingFilterOptions}
                  >
                    Reset
                  </Button>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        </Box>

        <Box sx={{ minWidth: 0 }}>
          {loading && (
            <Stack alignItems="center" sx={{ py: 4 }}>
              <CircularProgress size={28} />
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && products.length === 0 && (
            <Alert severity="info">No styles match the selected filters.</Alert>
          )}

          {!loading && !error && products.length > 0 && (
            <>
              <Box
                sx={{
                  display: 'grid',
                  gap: 1,
                  gridTemplateColumns: {
                    xs: '1fr',
                    sm: 'repeat(2, minmax(0, 1fr))',
                    lg: 'repeat(3, minmax(0, 1fr))'
                  }
                }}
              >
                {paginatedItems.map((product) => (
                  <Box key={product._id}>
                    <ProductCard product={product} />
                  </Box>
                ))}
              </Box>

              <AppPagination
                totalItems={totalItems}
                page={page}
                totalPages={totalPages}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
                pageSizeOptions={[6, 9, 12, 18]}
              />
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
