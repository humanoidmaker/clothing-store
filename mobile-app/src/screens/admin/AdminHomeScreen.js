import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';

const AdminHomeScreen = ({ navigation }) => {
  const { isAdmin, isResellerAdmin } = useAuth();

  if (!isAdmin && !isResellerAdmin) {
    return (
      <AppScreen>
        <EmptyState title="Access denied" message="Admin or reseller dashboard access is required." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Dashboard"
        title={isAdmin ? 'Admin Dashboard' : 'Reseller Dashboard'}
        subtitle="Manage catalog, orders, reviews, SEO, settings and pricing from mobile native UI."
      />

      <SectionCard>
        <AppButton onPress={() => navigation.navigate('AdminReports')}>Reports</AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('AdminSeo')}>SEO</AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('AdminProducts')}>Products</AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('AdminReviews')}>Reviews</AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('AdminOrders')}>Orders</AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('AdminSettings')}>General Settings</AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('AdminPaymentGateways')}>Payment Gateways</AppButton>

        {isAdmin ? (
          <>
            <AppButton variant="ghost" onPress={() => navigation.navigate('AdminAuthSecurity')}>Auth & Security</AppButton>
            <AppButton variant="ghost" onPress={() => navigation.navigate('AdminResellers')}>Resellers</AppButton>
          </>
        ) : null}

        {isResellerAdmin ? (
          <>
            <AppButton variant="secondary" onPress={() => navigation.navigate('ResellerPricing')}>
              Reseller Product Pricing
            </AppButton>
            <AppButton variant="secondary" onPress={() => navigation.navigate('ResellerMediaLibrary')}>
              Reseller Media Library
            </AppButton>
          </>
        ) : null}
      </SectionCard>
    </AppScreen>
  );
};

export default AdminHomeScreen;
