import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  MenuItem,
  Rating,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import AppPagination from '../components/AppPagination';
import PageHeader from '../components/PageHeader';
import ProductImageViewport from '../components/ProductImageViewport';
import api from '../api';
import usePaginationState from '../hooks/usePaginationState';

const visibilityOptions = ['all', 'visible', 'hidden'];

const AdminReviewsPage = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchText, setSearchText] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [statusUpdatingKey, setStatusUpdatingKey] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/products/admin/reviews');
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const filteredReviews = useMemo(() => {
    const query = String(searchText || '').trim().toLowerCase();
    return reviews.filter((review) => {
      const visibilityMatches =
        visibilityFilter === 'all' ||
        (visibilityFilter === 'visible' && !review.isHidden) ||
        (visibilityFilter === 'hidden' && review.isHidden);

      if (!visibilityMatches) {
        return false;
      }

      if (!query) {
        return true;
      }

      const matchProduct = String(review.productName || '').toLowerCase().includes(query);
      const matchReviewer = String(review.name || '').toLowerCase().includes(query);
      const matchComment = String(review.comment || '').toLowerCase().includes(query);
      return matchProduct || matchReviewer || matchComment;
    });
  }, [reviews, searchText, visibilityFilter]);

  const {
    page,
    rowsPerPage,
    totalItems,
    totalPages,
    paginatedItems,
    setPage,
    setRowsPerPage
  } = usePaginationState(filteredReviews, 10);

  const onToggleVisibility = async (review) => {
    const nextHidden = !Boolean(review.isHidden);
    const key = `${review.productId}:${review.reviewId}`;
    setStatusUpdatingKey(key);
    setError('');

    try {
      await api.put(`/products/admin/reviews/${review.productId}/${review.reviewId}/visibility`, {
        hidden: nextHidden
      });
      setReviews((current) =>
        current.map((item) =>
          item.productId === review.productId && item.reviewId === review.reviewId
            ? {
                ...item,
                isHidden: nextHidden,
                hiddenAt: nextHidden ? new Date().toISOString() : null
              }
            : item
        )
      );
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Failed to update review visibility');
    } finally {
      setStatusUpdatingKey('');
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Reviews Moderation"
        subtitle="Hide or unhide product reviews. Reviews cannot be edited or deleted."
      />

      {error ? <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert> : null}

      <Card sx={{ mb: 1.1 }}>
        <CardContent sx={{ p: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
            <TextField
              size="small"
              label="Search Product / Customer / Review"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              sx={{ minWidth: { sm: 300 } }}
            />
            <TextField
              select
              size="small"
              label="Visibility"
              value={visibilityFilter}
              onChange={(event) => setVisibilityFilter(event.target.value)}
              sx={{ minWidth: 160 }}
            >
              {visibilityOptions.map((option) => (
                <MenuItem key={option} value={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </MenuItem>
              ))}
            </TextField>
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Showing {filteredReviews.length} of {reviews.length} reviews
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent sx={{ overflowX: 'auto' }}>
          {loading ? (
            <Box sx={{ py: 4, display: 'grid', placeItems: 'center' }}>
              <CircularProgress />
            </Box>
          ) : filteredReviews.length === 0 ? (
            <Alert severity="info">No reviews found.</Alert>
          ) : (
            <>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell>Rating</TableCell>
                    <TableCell>Review</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Action</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedItems.map((review) => {
                    const key = `${review.productId}:${review.reviewId}`;
                    const updating = statusUpdatingKey === key;
                    return (
                      <TableRow key={key} hover>
                        <TableCell sx={{ minWidth: 210 }}>
                          <Stack direction="row" spacing={0.8} alignItems="center">
                            <Box sx={{ width: 56 }}>
                              <ProductImageViewport
                                src={review.productImage}
                                alt={review.productName}
                                aspectRatio="1 / 1"
                                fit="cover"
                              />
                            </Box>
                            <Stack spacing={0.2}>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {review.productName}
                              </Typography>
                              <Button
                                component={RouterLink}
                                to={`/products/${review.productId}`}
                                size="small"
                                variant="text"
                                sx={{ p: 0, justifyContent: 'flex-start', minWidth: 0 }}
                              >
                                View product
                              </Button>
                            </Stack>
                          </Stack>
                        </TableCell>
                        <TableCell>{review.name || 'Verified Customer'}</TableCell>
                        <TableCell>
                          <Rating value={Number(review.rating || 0)} precision={0.5} readOnly size="small" />
                        </TableCell>
                        <TableCell sx={{ minWidth: 260 }}>
                          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {review.comment}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            color={review.isHidden ? 'warning' : 'success'}
                            label={review.isHidden ? 'Hidden' : 'Visible'}
                          />
                        </TableCell>
                        <TableCell>
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString('en-IN') : '-'}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant={review.isHidden ? 'contained' : 'outlined'}
                            disabled={updating}
                            onClick={() => onToggleVisibility(review)}
                          >
                            {updating ? 'Saving...' : review.isHidden ? 'Unhide' : 'Hide'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <AppPagination
                totalItems={totalItems}
                page={page}
                totalPages={totalPages}
                rowsPerPage={rowsPerPage}
                onPageChange={setPage}
                onRowsPerPageChange={setRowsPerPage}
                pageSizeOptions={[5, 10, 20, 30]}
              />
            </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminReviewsPage;
