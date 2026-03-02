import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import StatusPill from '../../components/StatusPill';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useWishlist } from '../../context/WishlistContext';
import { palette, radii, spacing } from '../../theme/colors';
import { formatINR } from '../../utils/currency';
import { stripHtml } from '../../utils/format';

const placeholderImage = 'https://placehold.co/900x900?text=Product';

const ProductDetailsScreen = ({ route, navigation }) => {
  const { id } = route.params;
  const { isAuthenticated, isAdmin } = useAuth();
  const { addToCart } = useCart();
  const { showToast } = useToast();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState('1');
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeImage, setActiveImage] = useState('');
  const [reviewRating, setReviewRating] = useState('5');
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    let active = true;

    const fetchProduct = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/products/${id}`, { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }
        setProduct(data);
      } catch (error) {
        if (!active) {
          return;
        }
        setProduct(null);
        showToast(error?.response?.data?.message || error.message || 'Failed to load product', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void fetchProduct();

    return () => {
      active = false;
    };
  }, [id, showToast]);

  const variants = useMemo(() => (Array.isArray(product?.variants) ? product.variants : []), [product]);

  const availableSizes = useMemo(() => {
    if (!product) {
      return [];
    }
    if (variants.length > 0) {
      return [...new Set(variants.map((variant) => variant.size))];
    }
    return Array.isArray(product.sizes) ? product.sizes : [];
  }, [product, variants]);

  const availableColors = useMemo(() => {
    if (!product) {
      return [];
    }
    if (variants.length > 0) {
      const sizeFiltered = selectedSize ? variants.filter((variant) => variant.size === selectedSize) : variants;
      return [...new Set(sizeFiltered.map((variant) => variant.color).filter(Boolean))];
    }
    return Array.isArray(product.colors) ? product.colors : [];
  }, [product, variants, selectedSize]);

  useEffect(() => {
    if (!product) {
      return;
    }

    if (variants.length > 0) {
      const firstAvailableVariant = variants.find((variant) => Number(variant?.stock || 0) > 0) || variants[0];
      setSelectedSize(firstAvailableVariant?.size || '');
      setSelectedColor(firstAvailableVariant?.color || '');
      return;
    }

    setSelectedSize(product?.sizes?.[0] || '');
    setSelectedColor(product?.colors?.[0] || '');
  }, [product, variants]);

  const selectedVariant = useMemo(() => {
    if (!selectedSize || variants.length === 0) {
      return null;
    }
    const sizeMatches = variants.filter((variant) => variant.size === selectedSize);
    if (sizeMatches.length === 0) {
      return null;
    }
    if (!selectedColor) {
      return sizeMatches[0];
    }
    return sizeMatches.find((variant) => (variant.color || '') === selectedColor) || null;
  }, [selectedSize, selectedColor, variants]);

  const galleryImages = useMemo(() => {
    const images = [];

    if (Array.isArray(selectedVariant?.images)) {
      images.push(...selectedVariant.images.filter(Boolean));
    }
    if (Array.isArray(product?.images)) {
      images.push(...product.images.filter(Boolean));
    }
    if (product?.image) {
      images.push(product.image);
    }

    return [...new Set(images)].length > 0 ? [...new Set(images)] : [placeholderImage];
  }, [product, selectedVariant]);

  useEffect(() => {
    if (!activeImage || !galleryImages.includes(activeImage)) {
      setActiveImage(galleryImages[0] || '');
    }
  }, [galleryImages, activeImage]);

  const selectedPrice = Number(selectedVariant?.price ?? product?.price ?? 0);
  const availableStock = Number(selectedVariant?.stock ?? product?.countInStock ?? 0);
  const reviewPolicy = product?.reviewPolicy || {
    canSubmit: false,
    reason: 'login_required'
  };

  const addCurrentToCart = () => {
    const qty = Math.max(1, Number(quantity || 1));
    addToCart(product, qty, selectedSize, selectedColor, selectedPrice, availableStock);
    showToast('Added to bag', 'success');
  };

  const submitReview = async () => {
    if (!reviewComment.trim()) {
      showToast('Review comment is required', 'error');
      return;
    }

    setSubmittingReview(true);
    try {
      const { data } = await api.post(`/products/${id}/reviews`, {
        rating: Number(reviewRating || 5),
        comment: reviewComment.trim()
      });

      setProduct((current) => {
        if (!current) {
          return current;
        }
        return {
          ...current,
          reviews: data?.review ? [data.review, ...(current.reviews || [])] : current.reviews,
          numReviews: Number(data?.rating?.numReviews ?? current.numReviews ?? 0),
          rating: Number(data?.rating?.rating ?? current.rating ?? 0),
          reviewPolicy: {
            ...reviewPolicy,
            alreadyReviewed: true,
            canSubmit: false,
            reason: 'already_reviewed'
          }
        };
      });
      setReviewComment('');
    } catch {
      // Error toasts handled by interceptor.
    } finally {
      setSubmittingReview(false);
    }
  };

  if (loading) {
    return (
      <AppScreen>
        <LoadingView message="Loading product..." />
      </AppScreen>
    );
  }

  if (!product) {
    return (
      <AppScreen>
        <EmptyState title="Product not found" message="This product may be removed or unavailable." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Product"
        title={product.name}
        subtitle={`${product.brand || 'Brand'} - ${product.category || 'Category'} - ${product.gender || 'Unisex'}`}
      />

      <SectionCard>
        <Image source={{ uri: activeImage || placeholderImage }} style={styles.hero} resizeMode="cover" />

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.thumbList}>
          {galleryImages.map((image) => {
            const selected = image === activeImage;
            return (
              <AppButton
                key={image}
                variant="ghost"
                style={[styles.thumbButton, selected ? styles.thumbSelected : null]}
                onPress={() => setActiveImage(image)}
              >
                Image
              </AppButton>
            );
          })}
        </ScrollView>

        <View style={styles.rowWrap}>
          <StatusPill label={product.category} status="active" />
          <StatusPill label={product.gender} status="processing" />
          {product.fit ? <StatusPill label={`${product.fit} fit`} status="pending" /> : null}
        </View>

        <Text style={styles.description}>{stripHtml(product.description)}</Text>

        <View style={styles.row3}>
          <AppInput style={styles.flex} label="Size" value={selectedSize} onChangeText={setSelectedSize} placeholder="Select size" />
          <AppInput style={styles.flex} label="Color" value={selectedColor} onChangeText={setSelectedColor} placeholder="Select color" />
          <AppInput style={styles.qty} label="Qty" keyboardType="numeric" value={quantity} onChangeText={setQuantity} />
        </View>

        <View style={styles.rowWrap}>
          {availableSizes.map((size) => (
            <AppButton key={size} variant={selectedSize === size ? 'primary' : 'ghost'} onPress={() => setSelectedSize(size)}>
              {size}
            </AppButton>
          ))}
        </View>

        {availableColors.length > 0 ? (
          <View style={styles.rowWrap}>
            {availableColors.map((color) => (
              <AppButton key={color} variant={selectedColor === color ? 'secondary' : 'ghost'} onPress={() => setSelectedColor(color)}>
                {color}
              </AppButton>
            ))}
          </View>
        ) : null}

        <Text style={styles.price}>{formatINR(selectedPrice)}</Text>
        <Text style={styles.stock}>Stock: {availableStock}</Text>

        <View style={styles.actionRow}>
          <AppButton style={styles.flex} onPress={addCurrentToCart} disabled={availableStock < 1}>
            {availableStock > 0 ? 'Add to Bag' : 'Sold Out'}
          </AppButton>
          <AppButton
            style={styles.flex}
            variant={isInWishlist(product._id) ? 'secondary' : 'ghost'}
            onPress={() => toggleWishlist(product, { selectedSize, selectedColor })}
          >
            {isInWishlist(product._id) ? 'Wishlisted' : 'Wishlist'}
          </AppButton>
        </View>

        <AppButton variant="ghost" onPress={() => navigation.navigate('Cart')}>
          View Bag
        </AppButton>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Reviews</Text>
        <Text style={styles.ratingText}>
          {Number(product.rating || 0).toFixed(1)} / 5 ({Number(product.numReviews || 0)} reviews)
        </Text>

        {(Array.isArray(product.reviews) ? product.reviews : []).map((review) => (
          <View key={review._id} style={styles.reviewCard}>
            <Text style={styles.reviewName}>{review.name || 'Verified Customer'} - {review.rating}/5</Text>
            <Text style={styles.reviewComment}>{review.comment}</Text>
          </View>
        ))}

        {isAuthenticated && !isAdmin && reviewPolicy.canSubmit ? (
          <>
            <AppInput label="Rating (1-5)" keyboardType="numeric" value={reviewRating} onChangeText={setReviewRating} />
            <AppInput label="Review" value={reviewComment} onChangeText={setReviewComment} multiline numberOfLines={4} />
            <AppButton onPress={submitReview} disabled={submittingReview || !reviewComment.trim()}>
              {submittingReview ? 'Submitting...' : 'Submit Review'}
            </AppButton>
          </>
        ) : (
          <Text style={styles.policyText}>
            {isAdmin
              ? 'Admin accounts cannot submit reviews.'
              : reviewPolicy.reason === 'already_reviewed'
                ? 'You already submitted a review for this product.'
                : 'Verified purchase is required to submit a review.'}
          </Text>
        )}
      </SectionCard>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  hero: {
    width: '100%',
    height: 300,
    borderRadius: radii.lg,
    backgroundColor: '#edf2f7'
  },
  thumbList: {
    gap: spacing.xs
  },
  thumbButton: {
    minWidth: 80
  },
  thumbSelected: {
    borderColor: palette.primary,
    backgroundColor: palette.primarySoft
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    color: palette.textSecondary
  },
  row3: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  flex: {
    flex: 1
  },
  qty: {
    width: 90
  },
  price: {
    color: palette.primary,
    fontSize: 24,
    fontWeight: '700'
  },
  stock: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: palette.textPrimary
  },
  ratingText: {
    color: palette.textSecondary,
    fontSize: 13,
    fontWeight: '600'
  },
  reviewCard: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 4
  },
  reviewName: {
    color: palette.textPrimary,
    fontWeight: '700'
  },
  reviewComment: {
    color: palette.textSecondary,
    lineHeight: 19
  },
  policyText: {
    color: palette.textSecondary,
    fontSize: 13
  }
});

export default ProductDetailsScreen;

