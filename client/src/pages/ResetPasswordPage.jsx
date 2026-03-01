import { useMemo, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import { Link as RouterLink, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';
import { getRecaptchaToken } from '../utils/recaptcha';

const ResetPasswordPage = () => {
  const { resetPassword } = useAuth();
  const { authSecuritySettings } = useStoreSettings();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetEmail = useMemo(() => String(searchParams.get('email') || '').trim(), [searchParams]);
  const presetToken = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams]);

  const [email, setEmail] = useState(presetEmail);
  const [token, setToken] = useState(presetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    try {
      let recaptchaToken = '';
      if (authSecuritySettings?.recaptcha?.enabled) {
        recaptchaToken = await getRecaptchaToken(authSecuritySettings?.recaptcha?.siteKey, 'reset_password');
      }

      const response = await resetPassword({
        email,
        token,
        newPassword,
        recaptchaToken
      });
      setSuccess(response?.message || 'Password reset successful');
      window.setTimeout(() => {
        navigate('/login', { replace: true });
      }, 1200);
    } catch (requestError) {
      setError(requestError.message || 'Unable to reset password');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: 'unset', md: '68vh' }, py: { xs: 0.6, md: 1.2 } }}>
      <Card sx={{ width: '100%', maxWidth: 460 }}>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: '0.12em' }}>
            Account Recovery
          </Typography>
          <Typography variant="h5" sx={{ mb: 0.7 }}>
            Set New Password
          </Typography>

          <Stack spacing={1.4}>
            <TextField label="Login Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <TextField label="Reset Token" value={token} onChange={(event) => setToken(event.target.value)} required />
            <TextField
              label="New Password"
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={6}
              required
            />
            <TextField
              label="Confirm New Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
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
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <LockResetIcon />}
            >
              {submitting ? 'Resetting...' : 'Reset Password'}
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

export default ResetPasswordPage;
