import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Stack,
  Typography
} from '@mui/material';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import ProductImageViewport from '../components/ProductImageViewport';
import { Link as RouterLink } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import usePaginationState from '../hooks/usePaginationState';
import { formatINR } from '../utils/currency';

const WishlistPage = () => {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();
  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(items, 6);

  const handleAddToCart = (item) => {
    addToCart(
      {
        _id: item.productId,
        name: item.name,
        image: item.image,
        price: item.price,
        countInStock: item.countInStock
      },
      1,
      item.selectedSize || '',
      item.selectedColor || '',
      item.price,
      item.countInStock
    );
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Wishlist"
        title="Saved Styles"
        subtitle="Keep your shortlisted items here and move them to bag anytime."
      />

      {items.length === 0 && (
        <Alert severity="info">
          Wishlist is empty. <RouterLink to="/">Explore products</RouterLink>
        </Alert>
      )}

      {items.length > 0 && (
        <Stack spacing={1}>
          {paginatedItems.map((item) => (
            <Card key={item.productId}>
              <CardContent sx={{ p: 1.1 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} alignItems={{ sm: 'center' }}>
                  <ProductImageViewport
                    src={item.image}
                    alt={item.name}
                    aspectRatio="1 / 1"
                    fit="cover"
                    containerSx={{ width: 70, minWidth: 70 }}
                  />

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography component={RouterLink} to={`/products/${item.productId}`} sx={{ textDecoration: 'none' }} variant="h6">
                      {item.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.35 }}>
                      {item.brand || 'Fashion'} - {formatINR(item.price)}
                    </Typography>

                    <Stack direction="row" spacing={0.6} flexWrap="wrap" useFlexGap sx={{ mt: 0.6 }}>
                      {item.category && <Chip size="small" label={item.category} />}
                      {item.gender && <Chip size="small" label={item.gender} variant="outlined" />}
                      {item.selectedSize && <Chip size="small" label={`Size: ${item.selectedSize}`} />}
                      {item.selectedColor && <Chip size="small" label={`Color: ${item.selectedColor}`} variant="outlined" />}
                    </Stack>
                  </Box>

                  <Stack direction={{ xs: 'row', sm: 'column' }} spacing={0.7} sx={{ width: { xs: '100%', sm: 'auto' } }}>
                    <Button
                      component={RouterLink}
                      to={`/products/${item.productId}`}
                      variant="outlined"
                      size="small"
                    >
                      Details
                    </Button>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<ShoppingBagOutlinedIcon />}
                      disabled={Number(item.countInStock) < 1}
                      onClick={() => handleAddToCart(item)}
                    >
                      {Number(item.countInStock) > 0 ? 'Add to Bag' : 'Sold Out'}
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      size="small"
                      startIcon={<DeleteOutlineOutlinedIcon />}
                      onClick={() => removeFromWishlist(item.productId)}
                    >
                      Remove
                    </Button>
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
          ))}

          <AppPagination
            totalItems={totalItems}
            page={page}
            totalPages={totalPages}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            pageSizeOptions={[4, 6, 8, 12]}
          />
        </Stack>
      )}
    </Box>
  );
};

export default WishlistPage;
