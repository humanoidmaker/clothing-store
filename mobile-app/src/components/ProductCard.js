import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { palette, radii, spacing } from '../theme/colors';
import { formatINR } from '../utils/currency';
import AppButton from './AppButton';
import StatusPill from './StatusPill';

const fallbackImage = 'https://placehold.co/600x400?text=Product';

const ProductCard = ({
  product,
  onPress,
  onAddToCart,
  onToggleWishlist,
  wished = false,
  compact = false
}) => {
  const displayImage =
    (Array.isArray(product?.images) ? product.images.find(Boolean) : '') ||
    String(product?.image || '').trim() ||
    fallbackImage;

  const hasVariants = Array.isArray(product?.variants) && product.variants.length > 0;
  const lowestVariantPrice = hasVariants
    ? product.variants.reduce((lowest, variant) => {
        const variantPrice = Number(variant?.price || 0);
        return variantPrice < lowest ? variantPrice : lowest;
      }, Number(product.variants[0]?.price || 0))
    : Number(product?.price || 0);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}>
      <Image source={{ uri: displayImage }} style={compact ? styles.imageCompact : styles.image} resizeMode="cover" />
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.category}>{product?.category || 'Product'}</Text>
          {Number(product?.countInStock || 0) > 0 ? (
            <StatusPill label="In Stock" status="active" />
          ) : (
            <StatusPill label="Sold Out" status="cancelled" />
          )}
        </View>

        <Text style={styles.name} numberOfLines={2}>
          {product?.name || 'Product'}
        </Text>
        <Text style={styles.brand}>{product?.brand || 'Fashion'} - {product?.gender || 'Unisex'}</Text>
        <Text style={styles.price}>{hasVariants ? `From ${formatINR(lowestVariantPrice)}` : formatINR(product?.price)}</Text>

        {(onAddToCart || onToggleWishlist) ? (
          <View style={styles.actions}>
            {onToggleWishlist ? (
              <AppButton variant="ghost" onPress={onToggleWishlist} style={styles.actionBtn}>
                {wished ? 'Wishlisted' : 'Wishlist'}
              </AppButton>
            ) : null}
            {onAddToCart ? (
              <AppButton onPress={onAddToCart} style={styles.actionBtn}>
                Add
              </AppButton>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: palette.surface
  },
  pressed: {
    opacity: 0.95
  },
  image: {
    width: '100%',
    height: 180,
    backgroundColor: '#eef2f7'
  },
  imageCompact: {
    width: '100%',
    height: 130,
    backgroundColor: '#eef2f7'
  },
  content: {
    padding: spacing.sm,
    gap: 6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  category: {
    color: palette.secondary,
    fontSize: 11,
    fontWeight: '700'
  },
  name: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  brand: {
    color: palette.textSecondary,
    fontSize: 12
  },
  price: {
    color: palette.primary,
    fontSize: 16,
    fontWeight: '700'
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  actionBtn: {
    flex: 1
  }
});

export default ProductCard;

