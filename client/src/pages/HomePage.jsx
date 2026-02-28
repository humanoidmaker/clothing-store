import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import RestartAltOutlinedIcon from '@mui/icons-material/RestartAltOutlined';
import TuneOutlinedIcon from '@mui/icons-material/TuneOutlined';
import api from '../api';
import ProductCard from '../components/ProductCard';
import { formatINR } from '../utils/currency';

const categoryOptions = ['All', 'T-Shirts', 'Shirts', 'Jeans', 'Trousers', 'Dresses', 'Jackets', 'Tops', 'Activewear', 'Polos', 'Skirts'];
const genderOptions = ['All', 'Men', 'Women', 'Unisex'];
const sizeOptions = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '26', '28', '30', '32', '34', '36', '38'];
const colorOptions = ['Black', 'White', 'Navy', 'Grey', 'Beige', 'Olive', 'Maroon', 'Blue', 'Sky Blue', 'Mint', 'Coral'];
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
  priceRange: [500, 5000],
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
    return 'Trending This Week';
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
      <Card
        sx={{
          mb: 3,
          borderRadius: 4,
          color: 'common.white',
          background:
            'linear-gradient(110deg, rgba(31,58,95,0.95), rgba(193,91,115,0.9)), url(https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=1400&q=80)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Typography variant="h3" sx={{ mb: 1 }}>
            Curated Fashion in One Place
          </Typography>
          <Typography variant="body1" sx={{ maxWidth: 640, opacity: 0.92 }}>
            Discover premium shirts, dresses, denim and street staples. Filter by category, fit and color to find the exact look.
          </Typography>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={3}>
          <Card sx={{ borderRadius: 4, position: { md: 'sticky' }, top: { md: 96 } }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Filters</Typography>
                <TuneOutlinedIcon color="action" />
              </Stack>

              <Stack spacing={2}>
                <TextField
                  label="Search"
                  placeholder="shirt, denim, dress"
                  value={filters.search}
                  onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))}
                  size="small"
                />

                <FormControl size="small">
                  <InputLabel id="category-label">Category</InputLabel>
                  <Select
                    labelId="category-label"
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
                  <InputLabel id="gender-label">Gender</InputLabel>
                  <Select
                    labelId="gender-label"
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
                  <InputLabel id="size-label">Size</InputLabel>
                  <Select
                    labelId="size-label"
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
                  <InputLabel id="color-label">Color</InputLabel>
                  <Select
                    labelId="color-label"
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
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Price Range: {formatINR(filters.priceRange[0])} - {formatINR(filters.priceRange[1])}
                  </Typography>
                  <Slider
                    value={filters.priceRange}
                    onChange={(event, nextValue) => setFilters((current) => ({ ...current, priceRange: nextValue }))}
                    valueLabelDisplay="auto"
                    min={500}
                    max={5000}
                    step={100}
                  />
                </Box>

                <FormControl size="small">
                  <InputLabel id="sort-label">Sort By</InputLabel>
                  <Select
                    labelId="sort-label"
                    value={filters.sort}
                    label="Sort By"
                    onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value }))}
                  >
                    {sortOptions.map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button variant="contained" onClick={applyFilters}>
                  Apply Filters
                </Button>
                <Button variant="outlined" startIcon={<RestartAltOutlinedIcon />} onClick={resetFilters}>
                  Reset
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={9}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" sx={{ mb: 2 }}>
            <Typography variant="h4">{heading}</Typography>
            <Typography color="text.secondary">{products.length} items</Typography>
          </Stack>

          {loading && (
            <Stack alignItems="center" sx={{ py: 6 }}>
              <CircularProgress />
            </Stack>
          )}

          {error && <Alert severity="error">{error}</Alert>}

          {!loading && !error && products.length === 0 && (
            <Alert severity="info">No styles match the current filter selection.</Alert>
          )}

          {!loading && !error && products.length > 0 && (
            <Grid container spacing={2.2}>
              {products.map((product) => (
                <Grid item xs={12} sm={6} lg={4} key={product._id}>
                  <ProductCard product={product} />
                </Grid>
              ))}
            </Grid>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default HomePage;
