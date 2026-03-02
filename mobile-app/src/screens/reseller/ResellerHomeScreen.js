import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppScreen from '../../components/AppScreen';
import EmptyState from '../../components/EmptyState';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';

const ResellerHomeScreen = ({ navigation }) => {
  const { isResellerAdmin } = useAuth();

  if (!isResellerAdmin) {
    return (
      <AppScreen>
        <EmptyState title="Access denied" message="Reseller dashboard access is required." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader
        eyebrow="Reseller"
        title="Reseller Dashboard"
        subtitle="Manage products, margins, media library and payment gateways from mobile."
      />

      <SectionCard>
        <AppButton onPress={() => navigation.navigate('ResellerProducts')}>Products</AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('ResellerPricing')}>
          Product Pricing
        </AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('ResellerMediaLibrary')}>
          Media Library
        </AppButton>
        <AppButton variant="ghost" onPress={() => navigation.navigate('ResellerPaymentGateways')}>
          Payment Gateways
        </AppButton>
      </SectionCard>
    </AppScreen>
  );
};

export default ResellerHomeScreen;
