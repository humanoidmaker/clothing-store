import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AdminPaymentGatewaysScreen from '../screens/admin/AdminPaymentGatewaysScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import MediaLibraryScreen from '../screens/reseller/MediaLibraryScreen';
import ResellerHomeScreen from '../screens/reseller/ResellerHomeScreen';
import ResellerPricingScreen from '../screens/reseller/ResellerPricingScreen';

const Stack = createNativeStackNavigator();

const ResellerStack = () => (
  <Stack.Navigator
    initialRouteName="ResellerHome"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right'
    }}
  >
    <Stack.Screen name="ResellerHome" component={ResellerHomeScreen} />
    <Stack.Screen name="ResellerProducts" component={AdminProductsScreen} />
    <Stack.Screen name="ResellerPricing" component={ResellerPricingScreen} />
    <Stack.Screen name="ResellerMediaLibrary" component={MediaLibraryScreen} />
    <Stack.Screen name="ResellerPaymentGateways" component={AdminPaymentGatewaysScreen} />
  </Stack.Navigator>
);

export default ResellerStack;
