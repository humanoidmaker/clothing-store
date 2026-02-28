import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Stack, TextField, Typography } from '@mui/material';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStoreSettings } from '../context/StoreSettingsContext';

const LoginPage = () => {
  const { login } = useAuth();
  const { storeName } = useStoreSettings();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const destination = location.state?.from?.pathname || '/';

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await login(email, password);
      navigate(destination, { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: 'unset', md: '68vh' }, py: { xs: 0.6, md: 1.2 } }}>
      <Card sx={{ width: '100%', maxWidth: 440 }}>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: '0.12em' }}>
            Welcome Back
          </Typography>
          <Typography variant="h5" sx={{ mb: 0.5 }}>
            Login to {storeName}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Continue from where you left off and manage your orders in one place.
          </Typography>

          <Stack spacing={1.6}>
            <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              startIcon={submitting ? <CircularProgress size={14} color="inherit" /> : <LoginOutlinedIcon />}
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              New here? <RouterLink to="/register">Create account</RouterLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default LoginPage;

