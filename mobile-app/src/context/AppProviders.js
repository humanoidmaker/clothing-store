import { AuthProvider } from './AuthContext';
import { CartProvider } from './CartContext';
import { StoreSettingsProvider } from './StoreSettingsContext';
import { ToastProvider } from './ToastContext';
import { WishlistProvider } from './WishlistContext';

const AppProviders = ({ children }) => (
  <ToastProvider>
    <StoreSettingsProvider>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>{children}</WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </StoreSettingsProvider>
  </ToastProvider>
);

export default AppProviders;
