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
import { reviewVisibilityOptions } from '../../constants/options';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';
import { toDateLabel } from '../../utils/format';

const AdminReviewsScreen = () => {
  const { showToast } = useToast();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState('all');
  const [statusUpdatingKey, setStatusUpdatingKey] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/products/admin/reviews', {
        showSuccessToast: false,
        showErrorToast: false
      });
      setReviews(Array.isArray(data?.reviews) ? data.reviews : []);
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to load reviews', 'error');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const onToggleVisibility = async (review) => {
    const nextHidden = !Boolean(review.isHidden);
    const key = `${review.productId}:${review.reviewId}`;

    setStatusUpdatingKey(key);
    try {
      await api.put(`/products/admin/reviews/${review.productId}/${review.reviewId}/visibility`, {
        hidden: nextHidden
      });
      setReviews((current) =>
        current.map((entry) =>
          entry.productId === review.productId && entry.reviewId === review.reviewId
            ? {
                ...entry,
                isHidden: nextHidden,
                hiddenAt: nextHidden ? new Date().toISOString() : null
              }
            : entry
        )
      );
    } catch {
      // Error toast handled by interceptor.
    } finally {
      setStatusUpdatingKey('');
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Dashboard" title="Reviews" subtitle="Moderate review visibility for storefront listings." />

      <SectionCard>
        <AppInput label="Search" value={searchText} onChangeText={setSearchText} placeholder="Product, reviewer, comment" />
        <View style={styles.filtersRow}>
          {reviewVisibilityOptions.map((option) => (
            <AppButton
              key={option.value}
              variant={visibilityFilter === option.value ? 'primary' : 'ghost'}
              onPress={() => setVisibilityFilter(option.value)}
            >
              {option.label}
            </AppButton>
          ))}
        </View>
      </SectionCard>

      {loading ? <LoadingView message="Loading reviews..." /> : null}

      {!loading && filteredReviews.length === 0 ? (
        <EmptyState title="No reviews found" message="Try changing filters or search text." />
      ) : null}

      {!loading && filteredReviews.map((review) => {
        const key = `${review.productId}:${review.reviewId}`;
        const updating = statusUpdatingKey === key;

        return (
          <SectionCard key={key}>
            <Text style={styles.productName}>{review.productName}</Text>
            <Text style={styles.meta}>{review.name || 'Verified Customer'} - {review.rating}/5 - {toDateLabel(review.createdAt)}</Text>
            <Text style={styles.comment}>{review.comment}</Text>
            <StatusPill label={review.isHidden ? 'Hidden' : 'Visible'} status={review.isHidden ? 'hidden' : 'visible'} />
            <AppButton
              variant={review.isHidden ? 'secondary' : 'ghost'}
              onPress={() => onToggleVisibility(review)}
              disabled={updating}
            >
              {updating ? 'Saving...' : review.isHidden ? 'Unhide' : 'Hide'}
            </AppButton>
          </SectionCard>
        );
      })}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  productName: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  comment: {
    color: palette.textPrimary,
    fontSize: 13,
    lineHeight: 20
  }
});

export default AdminReviewsScreen;

