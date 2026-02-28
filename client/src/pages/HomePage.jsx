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
import PageHeader from '../components/PageHeader';
import api from '../api';
import ProductCard from '../components/ProductCard';
import { formatINR } from '../utils/currency';

const categoryOptions = ['All', 'T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Dresses', 'Jackets', 'Tops', 'Activewear', 'Polos', 'Skirts', 'Shoes'];
const genderOptions = ['All', 'Men', 'Women', 'Unisex'];
const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '26', '28', '30', '32', '34', '36', '38', '6', '7', '8', '9', '10', '11'];
const colorOptions = ['Black', 'White', 'Navy', 'Grey', 'Beige', 'Olive', 'Maroon', 'Blue', 'Sky Blue', 'Mint', 'Coral', 'Off White', 'Red', 'Green'];
const sortOptions = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' }
];

const initialFilters = {
  search: '',
  category: 'All',
  gender: 'All',
  size: '',
  color: '',
  priceRange: [500, 8000],
  sort: 'newest'
};

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialFilters);

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
        if (appliedFilters.size) params.size = appliedFilters.size;
        if (appliedFilters.color) params.color = appliedFilters.color;

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

  const heading = useMemo(() => {
    if (products.length === 0) return 'No Styles Found';
    if (appliedFilters.search || appliedFilters.category !== 'All' || appliedFilters.gender !== 'All') return 'Filtered Styles';
    return 'All Products';
  }, [products.length, appliedFilters]);

  const applyFilters = () => {
    setAppliedFilters(filters);
  };

  const resetFilters = () => {
    setFilters(initialFilters);
    setAppliedFilters(initialFilters);
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
        subtitle="Filter by category, size, color and price with a fixed desktop sidebar."
        actions={<Typography color="text.secondary">{products.length} items</Typography>}
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
                    {categoryOptions.map((option) => (
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
                    {genderOptions.map((option) => (
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
                    {sizeOptions.map((option) => (
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
                    {colorOptions.map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.6 }}>
                    Price: {formatINR(filters.priceRange[0])} - {formatINR(filters.priceRange[1])}
                  </Typography>
                  <Slider
                    value={filters.priceRange}
                    onChange={(event, nextValue) => setFilters((current) => ({ ...current, priceRange: nextValue }))}
                    valueLabelDisplay="auto"
                    min={500}
                    max={8000}
                    step={100}
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
                  <Button variant="contained" onClick={applyFilters} fullWidth>
                    Apply
                  </Button>
                  <Button variant="outlined" startIcon={<RestartAltOutlinedIcon fontSize="small" />} onClick={resetFilters} fullWidth>
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
              {products.map((product) => (
                <Box key={product._id}>
                  <ProductCard product={product} />
                </Box>
              ))}
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default HomePage;
