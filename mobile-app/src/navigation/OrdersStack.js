import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import OrderDetailsScreen from '../screens/orders/OrderDetailsScreen';
import OrdersScreen from '../screens/orders/OrdersScreen';

const Stack = createNativeStackNavigator();

const OrdersStack = () => (
  <Stack.Navigator
    initialRouteName="Orders"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right'
    }}
  >
    <Stack.Screen name="Orders" component={OrdersScreen} />
    <Stack.Screen name="OrderDetails" component={OrderDetailsScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

export default OrdersStack;
