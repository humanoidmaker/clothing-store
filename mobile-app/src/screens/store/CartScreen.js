import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { palette, spacing } from '../../theme/colors';
import { formatINR } from '../../utils/currency';

const CartScreen = ({ navigation }) => {
  const { isAuthenticated } = useAuth();
  const { items, subtotal, updateQuantity, removeFromCart } = useCart();

  const proceedToCheckout = () => {
    if (items.length === 0) {
      return;
    }

    if (isAuthenticated) {
      navigation.navigate('Checkout');
      return;
    }

    navigation.navigate('Login', {
      redirectTo: {
        name: 'Checkout'
      }
    });
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Cart" title="Your Shopping Bag" subtitle="Review quantity and product variant before checkout." />

      {items.length === 0 ? (
        <EmptyState title="Bag is empty" message="Add products from catalog to continue." />
      ) : (
        <>
          {items.map((item) => (
            <SectionCard key={item.cartKey}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>
                {formatINR(item.price)} each
                {item.selectedSize ? ` - Size ${item.selectedSize}` : ''}
                {item.selectedColor ? ` - ${item.selectedColor}` : ''}
              </Text>

              <View style={styles.row}>
                <AppInput
                  style={styles.qtyInput}
                  label="Qty"
                  keyboardType="numeric"
                  value={String(item.quantity)}
                  onChangeText={(value) => updateQuantity(item.cartKey, Math.max(1, Number(value || 1)))}
                />
                <AppButton variant="ghost" onPress={() => navigation.navigate('ProductDetails', { id: item.productId })}>
                  Product
                </AppButton>
                <AppButton variant="danger" onPress={() => removeFromCart(item.cartKey)}>
                  Remove
                </AppButton>
              </View>
            </SectionCard>
          ))}

          <SectionCard>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatINR(subtotal)}</Text>
            </View>
            <AppButton onPress={proceedToCheckout}>Proceed to Checkout</AppButton>
          </SectionCard>
        </>
      )}
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: palette.textPrimary
  },
  meta: {
    color: palette.textSecondary,
    fontSize: 12
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm
  },
  qtyInput: {
    width: 90
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  summaryLabel: {
    color: palette.textSecondary,
    fontSize: 13
  },
  summaryValue: {
    color: palette.primary,
    fontSize: 20,
    fontWeight: '700'
  }
});

export default CartScreen;

