import { useState } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useToast } from '../../context/ToastContext';
import { palette, spacing } from '../../theme/colors';

const LoginScreen = ({ navigation, route }) => {
  const { login } = useAuth();
  const { storeName } = useStoreSettings();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const destination = route?.params?.redirectTo || null;

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await login(email, password);
      if (destination) {
        navigation.navigate(destination.name, destination.params || {});
      }
    } catch (error) {
      showToast(error.message || 'Failed to login', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Welcome Back" title={`Login to ${storeName}`} subtitle="Access orders, settings and dashboard from one place." />

      <SectionCard>
        <AppInput label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AppInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />

        <AppButton onPress={onSubmit} disabled={submitting || !email || !password}>
          {submitting ? 'Signing In...' : 'Sign In'}
        </AppButton>

        <View style={styles.links}>
          <Text style={styles.link} onPress={() => navigation.navigate('Register')}>
            Create account
          </Text>
          <Text style={styles.link} onPress={() => navigation.navigate('ForgotPassword')}>
            Forgot password
          </Text>
        </View>
      </SectionCard>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  link: {
    color: palette.primary,
    fontSize: 13,
    fontWeight: '600'
  }
});

export default LoginScreen;
