import { StyleSheet, Text, View } from 'react-native';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { palette, spacing } from '../../theme/colors';

const AccountHomeScreen = ({ navigation }) => {
  const { isAuthenticated, user, isResellerAdmin, logout } = useAuth();
  const { storeName } = useStoreSettings();

  if (!isAuthenticated) {
    return (
      <AppScreen>
        <AppHeader eyebrow="Account" title="Welcome" subtitle={`Login to ${storeName} for orders and faster checkout.`} />
        <SectionCard>
          <AppButton onPress={() => navigation.navigate('Login')}>Login</AppButton>
          <AppButton variant="ghost" onPress={() => navigation.navigate('Register')}>
            Create Account
          </AppButton>
        </SectionCard>
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader eyebrow="Account" title={user?.name || 'My Account'} subtitle={user?.email || ''} />

      <SectionCard>
        <Text style={styles.rowLabel}>Phone</Text>
        <Text style={styles.rowValue}>{user?.phone || '-'}</Text>
      </SectionCard>

      <SectionCard>
        <View style={styles.actions}>
          <AppButton onPress={() => navigation.navigate('AccountSettings')}>Account Details</AppButton>
          <AppButton variant="ghost" onPress={() => navigation.navigate('BillingProfile')}>
            Billing Profile
          </AppButton>
          <AppButton variant="ghost" onPress={() => navigation.getParent()?.navigate('Orders')}>
            My Orders
          </AppButton>
          {isResellerAdmin ? (
            <AppButton variant="secondary" onPress={() => navigation.getParent()?.navigate('Reseller')}>
              Open Reseller Dashboard
            </AppButton>
          ) : null}
          <AppButton variant="danger" onPress={logout}>
            Logout
          </AppButton>
        </View>
      </SectionCard>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  rowLabel: {
    color: palette.textSecondary,
    fontSize: 12,
    fontWeight: '600'
  },
  rowValue: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  actions: {
    gap: spacing.sm
  }
});

export default AccountHomeScreen;
