import { useState } from 'react';
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);

    try {
      await register(name, email, password);
      navigate('/');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: 'grid', placeItems: 'center', minHeight: { xs: 'unset', md: '68vh' }, py: { xs: 0.6, md: 1.2 } }}>
      <Card sx={{ width: '100%', maxWidth: 470 }}>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: '0.12em' }}>
            Join Astra Attire
          </Typography>
          <Typography variant="h5" sx={{ mb: 0.7 }}>
            Create Your Account
          </Typography>

          <Stack spacing={1.6}>
            <TextField label="Full Name" value={name} onChange={(event) => setName(event.target.value)} required />
            <TextField label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <TextField
              label="Password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
            <TextField
              label="Confirm Password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={6}
              required
            />

            {error && <Alert severity="error">{error}</Alert>}

            <Button
              type="submit"
              variant="contained"
              size="large"
              startIcon={<PersonAddAltOutlinedIcon />}
              disabled={submitting}
            >
              {submitting ? 'Creating...' : 'Create Account'}
            </Button>

            <Typography variant="body2" color="text.secondary">
              Already a member? <RouterLink to="/login">Login</RouterLink>
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default RegisterPage;

