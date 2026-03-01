import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { Link as RouterLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getRecaptchaToken } from '../utils/recaptcha';

const ForgotPasswordPage = () => {
  const { forgotPassword } = useAuth();
  const { storeName, authSecuritySettings } = useStoreSettings();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      let recaptchaToken = '';
      if (authSecuritySettings?.recaptcha?.enabled) {
        recaptchaToken = await getRecaptchaToken(authSecuritySettings?.recaptcha?.siteKey, 'forgot_password');
      }
      const response = await forgotPassword(email, recaptchaToken);
      setSuccess(response?.message || 'Password reset email has been sent if account exists.');
    } catch (requestError) {
      setError(requestError.message || 'Unable to process request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: 'unset', md: '68vh' }, py: { xs: 0.6, md: 1.2 } }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: '0.12em' }}>
            Account Recovery
          </Typography>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Reset Password
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Enter your login email for {storeName}. We will send a reset link.
          </Typography>

          <Stack spacing={1.4}>
            <TextField
              label="Login Email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            {authSecuritySettings?.recaptcha?.enabled && (
              <Typography variant="caption" color="text.secondary">
                Protected by Google reCAPTCHA.
              </Typography>
            )}

            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <MailOutlineIcon />}
            >
              {submitting ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              Back to <RouterLink to="/login">Login</RouterLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default ForgotPasswordPage;
