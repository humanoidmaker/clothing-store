import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import api from '../api';
import AdminSettingsSubnav from '../components/AdminSettingsSubnav';
import PageHeader from '../components/PageHeader';

const defaultForm = {
  sendLoginAlertEmail: false,
  recaptcha: {
    enabled: false,
    siteKey: '',
    secretKey: '',
    secretKeyConfigured: false
  },
  msg91Smtp: {
    enabled: false,
    host: 'smtp.msg91.com',
    port: 587,
    secure: false,
    username: '',
    password: '',
    passwordConfigured: false,
    fromEmail: '',
    fromName: 'Humanoid Maker'
  }
};

const AdminAuthSecuritySettingsPage = () => {
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const applyResponse = (data) => {
    const authSecurity = data?.authSecurity || {};
    setForm({
      sendLoginAlertEmail: Boolean(authSecurity?.sendLoginAlertEmail),
      recaptcha: {
        enabled: Boolean(authSecurity?.recaptcha?.enabled),
        siteKey: String(authSecurity?.recaptcha?.siteKey || ''),
        secretKey: '',
        secretKeyConfigured: Boolean(authSecurity?.recaptcha?.secretKeyConfigured)
      },
      msg91Smtp: {
        enabled: Boolean(authSecurity?.msg91Smtp?.enabled),
        host: String(authSecurity?.msg91Smtp?.host || 'smtp.msg91.com'),
        port: Number(authSecurity?.msg91Smtp?.port || 587),
        secure: Boolean(authSecurity?.msg91Smtp?.secure),
        username: String(authSecurity?.msg91Smtp?.username || ''),
        password: '',
        passwordConfigured: Boolean(authSecurity?.msg91Smtp?.passwordConfigured),
        fromEmail: String(authSecurity?.msg91Smtp?.fromEmail || ''),
        fromName: String(authSecurity?.msg91Smtp?.fromName || 'Humanoid Maker')
      }
    });
  };

  useEffect(() => {
    let cancelled = false;
    const loadSettings = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/settings/admin');
        if (!cancelled) {
          applyResponse(data);
        }
      } catch (requestError) {
        if (!cancelled) {
          setError(requestError.response?.data?.message || requestError.message || 'Failed to load auth settings');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  const setRecaptchaField = (field, value) => {
    setForm((current) => ({
      ...current,
      recaptcha: {
        ...current.recaptcha,
        [field]: value
      }
    }));
  };

  const setSmtpField = (field, value) => {
    setForm((current) => ({
      ...current,
      msg91Smtp: {
        ...current.msg91Smtp,
        [field]: value
      }
    }));
  };

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {
        authSecurity: {
          sendLoginAlertEmail: Boolean(form.sendLoginAlertEmail),
          recaptcha: {
            enabled: Boolean(form.recaptcha.enabled),
            siteKey: String(form.recaptcha.siteKey || '').trim()
          },
          msg91Smtp: {
            enabled: Boolean(form.msg91Smtp.enabled),
            host: String(form.msg91Smtp.host || '').trim(),
            port: Number(form.msg91Smtp.port || 587),
            secure: Boolean(form.msg91Smtp.secure),
            username: String(form.msg91Smtp.username || '').trim(),
            fromEmail: String(form.msg91Smtp.fromEmail || '').trim(),
            fromName: String(form.msg91Smtp.fromName || '').trim()
          }
        }
      };

      const recaptchaSecret = String(form.recaptcha.secretKey || '').trim();
      if (recaptchaSecret) {
        payload.authSecurity.recaptcha.secretKey = recaptchaSecret;
      }

      const smtpPassword = String(form.msg91Smtp.password || '').trim();
      if (smtpPassword) {
        payload.authSecurity.msg91Smtp.password = smtpPassword;
      }

      const { data } = await api.put('/settings', payload);
      applyResponse(data);
      setSuccess('Authentication and security settings updated.');
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to update auth settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Auth & Security"
        subtitle="Configure reCAPTCHA, MSG91 SMTP email notifications and login alerts."
      />

      <Card sx={{ mb: 1.2 }}>
        <CardContent sx={{ p: 1 }}>
          <AdminSettingsSubnav />
        </CardContent>
      </Card>

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Card>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }}>
          {loading ? (
            <Box sx={{ py: 3, display: 'grid', placeItems: 'center' }}>
              <CircularProgress size={22} />
            </Box>
          ) : (
            <Stack spacing={1.2}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Login Alerts
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.sendLoginAlertEmail}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        sendLoginAlertEmail: event.target.checked
                      }))
                    }
                  />
                }
                label="Send login alert email to user on successful login"
              />

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Google reCAPTCHA
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.recaptcha.enabled}
                    onChange={(event) => setRecaptchaField('enabled', event.target.checked)}
                  />
                }
                label="Enable reCAPTCHA for login, signup and password reset"
              />
              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' } }}>
                <TextField
                  label="reCAPTCHA Site Key"
                  value={form.recaptcha.siteKey}
                  onChange={(event) => setRecaptchaField('siteKey', event.target.value)}
                />
                <TextField
                  label="reCAPTCHA Secret Key"
                  type="password"
                  value={form.recaptcha.secretKey}
                  onChange={(event) => setRecaptchaField('secretKey', event.target.value)}
                  autoComplete="new-password"
                  helperText={form.recaptcha.secretKeyConfigured ? 'Secret configured (leave blank to keep).' : 'No secret saved.'}
                />
              </Box>

              <Divider />

              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                MSG91 SMTP
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={form.msg91Smtp.enabled}
                    onChange={(event) => setSmtpField('enabled', event.target.checked)}
                  />
                }
                label="Enable SMTP email sending (signup, forgot password, login alerts)"
              />

              <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', md: 'repeat(3, minmax(0, 1fr))' } }}>
                <TextField
                  label="SMTP Host"
                  value={form.msg91Smtp.host}
                  onChange={(event) => setSmtpField('host', event.target.value)}
                />
                <TextField
                  label="SMTP Port"
                  type="number"
                  value={form.msg91Smtp.port}
                  onChange={(event) => setSmtpField('port', event.target.value)}
                />
                <FormControlLabel
                  sx={{ alignSelf: 'center' }}
                  control={
                    <Switch
                      checked={form.msg91Smtp.secure}
                      onChange={(event) => setSmtpField('secure', event.target.checked)}
                    />
                  }
                  label="Secure TLS"
                />
                <TextField
                  label="SMTP Username"
                  value={form.msg91Smtp.username}
                  onChange={(event) => setSmtpField('username', event.target.value)}
                />
                <TextField
                  label="SMTP Password"
                  type="password"
                  value={form.msg91Smtp.password}
                  onChange={(event) => setSmtpField('password', event.target.value)}
                  autoComplete="new-password"
                  helperText={form.msg91Smtp.passwordConfigured ? 'Password configured (leave blank to keep).' : 'No password saved.'}
                />
                <TextField
                  label="From Email"
                  type="email"
                  value={form.msg91Smtp.fromEmail}
                  onChange={(event) => setSmtpField('fromEmail', event.target.value)}
                />
                <TextField
                  label="From Name"
                  value={form.msg91Smtp.fromName}
                  onChange={(event) => setSmtpField('fromName', event.target.value)}
                />
              </Box>

              <Stack direction="row" spacing={0.8}>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={saving}
                  startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
                >
                  {saving ? 'Saving...' : 'Save Auth & Security'}
                </Button>
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminAuthSecuritySettingsPage;
