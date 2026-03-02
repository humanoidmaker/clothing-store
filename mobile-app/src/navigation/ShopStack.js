import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import CartScreen from '../screens/store/CartScreen';
import CheckoutScreen from '../screens/store/CheckoutScreen';
import HomeScreen from '../screens/store/HomeScreen';
import ProductDetailsScreen from '../screens/store/ProductDetailsScreen';
import WishlistScreen from '../screens/store/WishlistScreen';

const Stack = createNativeStackNavigator();

const defaultScreenOptions = {
  headerShown: false,
  animation: 'slide_from_right'
};

const StoreStackNavigator = ({ initialRouteName = 'Home' }) => (
  <Stack.Navigator initialRouteName={initialRouteName} screenOptions={defaultScreenOptions}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Wishlist" component={WishlistScreen} />
    <Stack.Screen name="Cart" component={CartScreen} />
    <Stack.Screen name="ProductDetails" component={ProductDetailsScreen} />
    <Stack.Screen name="Checkout" component={CheckoutScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

export const HomeStack = () => <StoreStackNavigator initialRouteName="Home" />;
export const WishlistStack = () => <StoreStackNavigator initialRouteName="Wishlist" />;
export const CartStack = () => <StoreStackNavigator initialRouteName="Cart" />;

export default HomeStack;
