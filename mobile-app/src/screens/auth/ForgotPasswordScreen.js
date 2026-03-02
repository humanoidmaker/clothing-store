import { useState } from 'react';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const ForgotPasswordScreen = ({ navigation }) => {
  const { forgotPassword } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      const response = await forgotPassword(email);
      showToast(response?.message || 'Reset email sent if account exists.', 'success');
      navigation.navigate('ResetPassword', { email });
    } catch (error) {
      showToast(error.message || 'Failed to send reset email', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Account Recovery" title="Forgot Password" subtitle="Enter your email to receive reset instructions." />
      <SectionCard>
        <AppInput label="Login Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <AppButton onPress={onSubmit} disabled={submitting || !email}>
          {submitting ? 'Sending...' : 'Send Reset Link'}
        </AppButton>
      </SectionCard>
    </AppScreen>
  );
};

export default ForgotPasswordScreen;
