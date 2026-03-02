import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/auth/ResetPasswordScreen';
import AccountHomeScreen from '../screens/account/AccountHomeScreen';
import AccountSettingsScreen from '../screens/account/AccountSettingsScreen';
import BillingProfileScreen from '../screens/account/BillingProfileScreen';

const Stack = createNativeStackNavigator();

const AccountStack = () => (
  <Stack.Navigator
    initialRouteName="AccountHome"
    screenOptions={{
      headerShown: false,
      animation: 'slide_from_right'
    }}
  >
    <Stack.Screen name="AccountHome" component={AccountHomeScreen} />
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    <Stack.Screen name="BillingProfile" component={BillingProfileScreen} />
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

export default AccountStack;
