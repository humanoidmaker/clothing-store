'use client';

import { useMemo } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Box, Container, CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import AppFooter from './components/AppFooter';
import AdminSectionLayout from './components/AdminSectionLayout';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { StoreSettingsProvider, useStoreSettings } from './context/StoreSettingsContext';
import { ToastProvider } from './context/ToastContext';
import { WishlistProvider } from './context/WishlistContext';
import AdminOrdersPage from './pages/AdminOrdersPage';
import AdminProductsPage from './pages/AdminProductsPage';
import AdminReportsPage from './pages/AdminReportsPage';
import AdminReviewsPage from './pages/AdminReviewsPage';
import AdminSeoPage from './pages/AdminSeoPage';
import AdminPaymentGatewaysPage from './pages/AdminPaymentGatewaysPage';
import AdminAuthSecuritySettingsPage from './pages/AdminAuthSecuritySettingsPage';
import AdminResellersPage from './pages/AdminResellersPage';
import AdminSettingsPage from './pages/AdminSettingsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import OrderInvoicePage from './pages/OrderInvoicePage';
import OrdersPage from './pages/OrdersPage';
import ProductPage from './pages/ProductPage';
import RegisterPage from './pages/RegisterPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UserAccountSettingsPage from './pages/UserAccountSettingsPage';
import UserBillingProfileSettingsPage from './pages/UserBillingProfileSettingsPage';
import UserSettingsLayout from './pages/UserSettingsLayout';
import WishlistPage from './pages/WishlistPage';
import { createAppTheme } from './theme';

const AppShell = () => {
  const { themeSettings } = useStoreSettings();
  const theme = useMemo(() => createAppTheme(themeSettings), [themeSettings]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalStyles
        styles={(muiTheme) => ({
          body: {
            background: muiTheme.palette.background.default
          }
        })}
      />

      <ToastProvider>
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
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route path="/reset-password" element={<ResetPasswordPage />} />
                        <Route
                          path="/checkout"
                          element={(
                            <ProtectedRoute>
                              <CheckoutPage />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/orders"
                          element={(
                            <ProtectedRoute>
                              <OrdersPage />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/orders/:id"
                          element={(
                            <ProtectedRoute>
                              <OrderInvoicePage />
                            </ProtectedRoute>
                          )}
                        />
                        <Route
                          path="/settings"
                          element={(
                            <ProtectedRoute>
                              <UserSettingsLayout />
                            </ProtectedRoute>
                          )}
                        >
                          <Route index element={<Navigate to="account" replace />} />
                          <Route path="account" element={<UserAccountSettingsPage />} />
                          <Route path="billing-profile" element={<UserBillingProfileSettingsPage />} />
                        </Route>
                        <Route
                          path="/admin"
                          element={(
                            <ProtectedRoute adminOrReseller>
                              <AdminSectionLayout />
                            </ProtectedRoute>
                          )}
                        >
                          <Route index element={<Navigate to="reports" replace />} />
                          <Route path="reports" element={<AdminReportsPage />} />
                          <Route path="seo" element={<AdminSeoPage />} />
                          <Route path="products" element={<AdminProductsPage />} />
                          <Route path="reviews" element={<AdminReviewsPage />} />
                          <Route path="orders" element={<AdminOrdersPage />} />
                          <Route
                            path="resellers"
                            element={(
                              <ProtectedRoute adminOnly>
                                <AdminResellersPage />
                              </ProtectedRoute>
                            )}
                          />
                          <Route path="settings" element={<AdminSettingsPage />} />
                          <Route
                            path="settings/payment-gateways"
                            element={(
                              <ProtectedRoute adminOnly>
                                <AdminPaymentGatewaysPage />
                              </ProtectedRoute>
                            )}
                          />
                          <Route
                            path="settings/auth-security"
                            element={(
                              <ProtectedRoute adminOnly>
                                <AdminAuthSecuritySettingsPage />
                              </ProtectedRoute>
                            )}
                          />
                        </Route>
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
      </ToastProvider>
    </ThemeProvider>
  );
};

const App = () => (
  <StoreSettingsProvider>
    <AppShell />
  </StoreSettingsProvider>
);

export default App;
