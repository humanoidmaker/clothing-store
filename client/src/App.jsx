import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, Container, CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import AppFooter from './components/AppFooter';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import AdminProductsPage from './pages/AdminProductsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OrdersPage from './pages/OrdersPage';
import ProductPage from './pages/ProductPage';
import RegisterPage from './pages/RegisterPage';
import WishlistPage from './pages/WishlistPage';
import theme from './theme';

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={{
          body: {
            background: '#f6f3ef'
          }
        }}
      />

      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BrowserRouter>
              <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
                <Navbar />
                <Box sx={{ flex: 1 }}>
                  <Container maxWidth="lg" sx={{ pt: { xs: 1.2, md: 1.6 }, pb: { xs: 3, md: 4 } }}>
                    <Routes>
                      <Route path="/" element={<HomePage />} />
                      <Route path="/products/:id" element={<ProductPage />} />
                      <Route path="/wishlist" element={<WishlistPage />} />
                      <Route path="/cart" element={<CartPage />} />
                      <Route path="/login" element={<LoginPage />} />
                      <Route path="/register" element={<RegisterPage />} />
                      <Route
                        path="/checkout"
                        element={
                          <ProtectedRoute>
                            <CheckoutPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/orders"
                        element={
                          <ProtectedRoute>
                            <OrdersPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route
                        path="/admin/products"
                        element={
                          <ProtectedRoute adminOnly>
                            <AdminProductsPage />
                          </ProtectedRoute>
                        }
                      />
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                  </Container>
                </Box>
                <AppFooter />
              </Box>
            </BrowserRouter>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
