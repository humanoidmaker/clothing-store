import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { palette, spacing } from '../../theme/colors';
import { formatINR } from '../../utils/currency';

const WishlistScreen = ({ navigation }) => {
  const { items, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  return (
    <AppScreen>
      <AppHeader eyebrow="Wishlist" title="Saved Styles" subtitle="Move saved items to bag or open full product details." />

      {items.length === 0 ? (
        <EmptyState title="No saved styles" message="Wishlist products will appear here." />
      ) : (
        items.map((item) => (
          <SectionCard key={item.productId}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.meta}>
              {item.brand || 'Fashion'} - {item.category || 'General'} - {formatINR(item.price)}
            </Text>

            <View style={styles.actions}>
              <AppButton variant="ghost" onPress={() => navigation.navigate('ProductDetails', { id: item.productId })}>
                Details
              </AppButton>
              <AppButton
                onPress={() =>
                  addToCart(
                    {
                      _id: item.productId,
                      name: item.name,
                      image: item.image,
                      price: item.price,
                      countInStock: item.countInStock
                    },
                    1,
                    item.selectedSize,
                    item.selectedColor,
                    item.price,
                    item.countInStock
                  )
                }
                disabled={Number(item.countInStock || 0) < 1}
              >
                {Number(item.countInStock || 0) > 0 ? 'Add to Bag' : 'Sold Out'}
              </AppButton>
              <AppButton variant="danger" onPress={() => removeFromWishlist(item.productId)}>
                Remove
              </AppButton>
            </View>
          </SectionCard>
        ))
      )}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  name: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm
  }
});

export default WishlistScreen;

