import { useMemo, useState } from 'react';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { validatePasswordMatch } from '../../utils/validation';

const ResetPasswordScreen = ({ navigation, route }) => {
  const { resetPassword } = useAuth();
  const { showToast } = useToast();
  const presetEmail = useMemo(() => String(route?.params?.email || '').trim(), [route?.params?.email]);

  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState('');
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
      await resetPassword({
        email,
        token,
        newPassword: password
      });
      showToast('Password updated. Please login.', 'success');
      navigation.navigate('Login');
    } catch (error) {
      showToast(error.message || 'Failed to reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Account Recovery" title="Reset Password" subtitle="Paste reset token and set your new password." />
      <SectionCard>
        <AppInput label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AppInput label="Reset Token" value={token} onChangeText={setToken} />
        <AppInput label="New Password" secureTextEntry value={password} onChangeText={setPassword} />
        <AppInput label="Confirm Password" secureTextEntry value={confirmPassword} onChangeText={setConfirmPassword} />
        <AppButton onPress={onSubmit} disabled={submitting || !email || !token || !password || !confirmPassword}>
          {submitting ? 'Resetting...' : 'Reset Password'}
        </AppButton>
      </SectionCard>
    </AppScreen>
  );
};

export default ResetPasswordScreen;
