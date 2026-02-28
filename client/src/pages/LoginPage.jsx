import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const { login } = useAuth();
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
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: '65vh' }}>
      <Card sx={{ width: '100%', maxWidth: 460, borderRadius: 4 }}>
        <CardContent component="form" onSubmit={onSubmit}>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Welcome Back
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Login to continue shopping your favorite styles.
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

            <Button type="submit" variant="contained" size="large" disabled={submitting} startIcon={<LoginOutlinedIcon />}>
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
