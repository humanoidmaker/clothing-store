import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminAuthSecurityScreen from '../screens/admin/AdminAuthSecurityScreen';
import AdminHomeScreen from '../screens/admin/AdminHomeScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminPaymentGatewaysScreen from '../screens/admin/AdminPaymentGatewaysScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminReportsScreen from '../screens/admin/AdminReportsScreen';
import AdminResellersScreen from '../screens/admin/AdminResellersScreen';
import AdminReviewsScreen from '../screens/admin/AdminReviewsScreen';
import AdminSeoScreen from '../screens/admin/AdminSeoScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';
import MediaLibraryScreen from '../screens/reseller/MediaLibraryScreen';
import ResellerPricingScreen from '../screens/reseller/ResellerPricingScreen';

const Stack = createNativeStackNavigator();

const AdminStack = () => (
  <Stack.Navigator
    initialRouteName="AdminHome"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right'
    }}
  >
    <Stack.Screen name="AdminHome" component={AdminHomeScreen} />
    <Stack.Screen name="AdminReports" component={AdminReportsScreen} />
    <Stack.Screen name="AdminSeo" component={AdminSeoScreen} />
    <Stack.Screen name="AdminProducts" component={AdminProductsScreen} />
    <Stack.Screen name="AdminReviews" component={AdminReviewsScreen} />
    <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} />
    <Stack.Screen name="AdminResellers" component={AdminResellersScreen} />
    <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} />
    <Stack.Screen name="AdminPaymentGateways" component={AdminPaymentGatewaysScreen} />
    <Stack.Screen name="AdminAuthSecurity" component={AdminAuthSecurityScreen} />
    <Stack.Screen name="ResellerPricing" component={ResellerPricingScreen} />
    <Stack.Screen name="ResellerMediaLibrary" component={MediaLibraryScreen} />
  </Stack.Navigator>
);

export default AdminStack;
