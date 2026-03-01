import { useEffect, useState } from 'react';
import { Alert, Box, Button, Card, CardContent, CircularProgress, Divider, Stack, TextField, Typography } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import { useAuth } from '../context/AuthContext';

const UserAccountSettingsPage = () => {
  const { user, updateProfile } = useAuth();
  const [draft, setDraft] = useState({
    name: String(user?.name || ''),
    email: String(user?.email || ''),
    phone: String(user?.phone || '')
  });
  const [passwordDraft, setPasswordDraft] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft({
      name: String(user?.name || ''),
      email: String(user?.email || ''),
      phone: String(user?.phone || '')
    });
    setPasswordDraft({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  }, [user]);

  const setField = (field, value) => {
    setDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const setPasswordField = (field, value) => {
    setPasswordDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);
    try {
      const wantsPasswordUpdate =
        Boolean(passwordDraft.currentPassword) ||
        Boolean(passwordDraft.newPassword) ||
        Boolean(passwordDraft.confirmPassword);

      if (wantsPasswordUpdate) {
        if (!passwordDraft.currentPassword || !passwordDraft.newPassword || !passwordDraft.confirmPassword) {
          throw new Error('Fill current password, new password, and confirm password to change password');
        }
        if (passwordDraft.newPassword.length < 6) {
          throw new Error('New password must be at least 6 characters');
        }
        if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
          throw new Error('New password and confirm password do not match');
        }
      }

      const accountPayload = {
        name: draft.name,
        email: draft.email,
        phone: draft.phone
      };
      if (wantsPasswordUpdate) {
        accountPayload.currentPassword = passwordDraft.currentPassword;
        accountPayload.newPassword = passwordDraft.newPassword;
      }

      await updateProfile({
        account: accountPayload
      });
      setPasswordDraft({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (requestError) {
      setError(requestError.message || 'Failed to update account settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }}>
        <Stack spacing={1}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            Account Details
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Update your login email and contact identity. This applies to both admin and normal users.
          </Typography>

          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
            <TextField
              required
              label="Full Name"
              value={draft.name}
              onChange={(event) => setField('name', event.target.value)}
              inputProps={{ maxLength: 120 }}
            />
            <TextField
              required
              type="email"
              label="Login Email"
              value={draft.email}
              onChange={(event) => setField('email', event.target.value)}
              inputProps={{ maxLength: 180 }}
            />
          </Box>

          <TextField
            label="Phone Number"
            value={draft.phone}
            onChange={(event) => setField('phone', event.target.value)}
            inputProps={{ maxLength: 30 }}
            helperText="Used to prefill checkout and billing contacts."
          />

          <Divider />

          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Change Password (Optional)
          </Typography>
          <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
            <TextField
              type="password"
              label="Current Password"
              value={passwordDraft.currentPassword}
              onChange={(event) => setPasswordField('currentPassword', event.target.value)}
              autoComplete="current-password"
            />
            <TextField
              type="password"
              label="New Password"
              value={passwordDraft.newPassword}
              onChange={(event) => setPasswordField('newPassword', event.target.value)}
              autoComplete="new-password"
              helperText="Minimum 6 characters."
            />
            <TextField
              type="password"
              label="Confirm New Password"
              value={passwordDraft.confirmPassword}
              onChange={(event) => setPasswordField('confirmPassword', event.target.value)}
              autoComplete="new-password"
            />
          </Box>

          <Stack direction="row">
            <Button
              type="submit"
              variant="contained"
              startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Account'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

export default UserAccountSettingsPage;
