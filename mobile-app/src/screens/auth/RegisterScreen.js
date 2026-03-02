import { useState } from 'react';
import { Text } from 'react-native';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useToast } from '../../context/ToastContext';
import { validatePasswordMatch } from '../../utils/validation';

const RegisterScreen = ({ navigation }) => {
  const { register } = useAuth();
  const { storeName } = useStoreSettings();
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    const passwordError = validatePasswordMatch(password, confirmPassword);
    if (passwordError) {
      showToast(passwordError, 'error');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password);
    } catch (error) {
      showToast(error.message || 'Failed to create account', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Join" title={`Create account for ${storeName}`} subtitle="Register once and checkout faster every time." />

      <SectionCard>
        <AppInput label="Full Name" value={name} onChangeText={setName} />
        <AppInput label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AppInput label="Password" secureTextEntry value={password} onChangeText={setPassword} />
        <AppInput label="Confirm Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />

        <AppButton onPress={onSubmit} disabled={submitting || !name || !email || !password || !confirmPassword}>
          {submitting ? 'Creating Account...' : 'Create Account'}
        </AppButton>

        <Text style={{ color: '#1b3557', fontWeight: '600' }} onPress={() => navigation.navigate('Login')}>
          Already a member? Login
        </Text>
      </SectionCard>
    </AppScreen>
  );
};

export default RegisterScreen;
