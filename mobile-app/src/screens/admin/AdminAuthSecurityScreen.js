import { useEffect, useState } from 'react';
import { Switch, Text, View, StyleSheet } from 'react-native';
import api from '../../api/client';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import LoadingView from '../../components/LoadingView';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';

const defaultForm = {
  sendLoginAlertEmail: false,
  recaptcha: {
    enabled: false,
    siteKey: '',
    secretKey: '',
    secretKeyConfigured: false
  },
  smtp: {
    enabled: false,
    host: 'smtp.example.com',
    port: '587',
    secure: false,
    username: '',
    password: '',
    passwordConfigured: false,
    fromEmail: '',
    fromName: 'Humanoid Maker'
  }
};

const AdminAuthSecurityScreen = () => {
  const { isAdmin } = useAuth();
  const { showToast } = useToast();
  const [form, setForm] = useState(defaultForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/settings/admin', { showSuccessToast: false, showErrorToast: false });
        if (!active) {
          return;
        }

        const authSecurity = data?.authSecurity || {};
        setForm({
          sendLoginAlertEmail: Boolean(authSecurity?.sendLoginAlertEmail),
          recaptcha: {
            enabled: Boolean(authSecurity?.recaptcha?.enabled),
            siteKey: String(authSecurity?.recaptcha?.siteKey || ''),
            secretKey: '',
            secretKeyConfigured: Boolean(authSecurity?.recaptcha?.secretKeyConfigured)
          },
          smtp: {
            enabled: Boolean(authSecurity?.smtp?.enabled),
            host: String(authSecurity?.smtp?.host || 'smtp.example.com'),
            port: String(authSecurity?.smtp?.port || '587'),
            secure: Boolean(authSecurity?.smtp?.secure),
            username: String(authSecurity?.smtp?.username || ''),
            password: '',
            passwordConfigured: Boolean(authSecurity?.smtp?.passwordConfigured),
            fromEmail: String(authSecurity?.smtp?.fromEmail || ''),
            fromName: String(authSecurity?.smtp?.fromName || 'Humanoid Maker')
          }
        });
      } catch (error) {
        if (!active) {
          return;
        }
        showToast(error?.response?.data?.message || error.message || 'Failed to load auth settings', 'error');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    if (isAdmin) {
      void loadSettings();
    } else {
      setLoading(false);
    }

    return () => {
      active = false;
    };
  }, [isAdmin, showToast]);

  const updateRecaptcha = (field, value) => {
    setForm((current) => ({
      ...current,
      recaptcha: {
        ...current.recaptcha,
        [field]: value
      }
    }));
  };

  const updateSmtp = (field, value) => {
    setForm((current) => ({
      ...current,
      smtp: {
        ...current.smtp,
        [field]: value
      }
    }));
  };

  const onSubmit = async () => {
    if (!isAdmin) {
      showToast('Only main admin can modify authentication security.', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        authSecurity: {
          sendLoginAlertEmail: Boolean(form.sendLoginAlertEmail),
          recaptcha: {
            enabled: Boolean(form.recaptcha.enabled),
            siteKey: String(form.recaptcha.siteKey || '').trim()
          },
          smtp: {
            enabled: Boolean(form.smtp.enabled),
            host: String(form.smtp.host || '').trim(),
            port: Number(form.smtp.port || 587),
            secure: Boolean(form.smtp.secure),
            username: String(form.smtp.username || '').trim(),
            fromEmail: String(form.smtp.fromEmail || '').trim(),
            fromName: String(form.smtp.fromName || '').trim()
          }
        }
      };

      const recaptchaSecret = String(form.recaptcha.secretKey || '').trim();
      if (recaptchaSecret) {
        payload.authSecurity.recaptcha.secretKey = recaptchaSecret;
      }

      const smtpPassword = String(form.smtp.password || '').trim();
      if (smtpPassword) {
        payload.authSecurity.smtp.password = smtpPassword;
      }

      await api.put('/settings', payload);
      showToast('Auth and security settings updated', 'success');
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to save auth settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin) {
    return (
      <AppScreen>
        <SectionCard>
          <Text style={styles.infoText}>Only main admin can access authentication and security settings.</Text>
        </SectionCard>
      </AppScreen>
    );
  }

  if (loading) {
    return (
      <AppScreen>
        <LoadingView message="Loading auth settings..." />
      </AppScreen>
    );
  }

  return (
    <AppScreen>
      <AppHeader eyebrow="Dashboard" title="Auth & Security" subtitle="Configure login alerts, reCAPTCHA and SMTP credentials." />

      <SectionCard>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Send login alert email</Text>
          <Switch
            value={form.sendLoginAlertEmail}
            onValueChange={(value) => setForm((current) => ({ ...current, sendLoginAlertEmail: value }))}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={form.sendLoginAlertEmail ? palette.primary : '#f4f4f5'}
          />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>reCAPTCHA</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable reCAPTCHA for auth forms</Text>
          <Switch
            value={form.recaptcha.enabled}
            onValueChange={(value) => updateRecaptcha('enabled', value)}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={form.recaptcha.enabled ? palette.primary : '#f4f4f5'}
          />
        </View>

        <AppInput label="Site Key" value={form.recaptcha.siteKey} onChangeText={(value) => updateRecaptcha('siteKey', value)} />
        <AppInput
          label={form.recaptcha.secretKeyConfigured ? 'Secret Key (leave blank to keep existing)' : 'Secret Key'}
          value={form.recaptcha.secretKey}
          onChangeText={(value) => updateRecaptcha('secretKey', value)}
          secureTextEntry
        />
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>SMTP</Text>
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable SMTP</Text>
          <Switch
            value={form.smtp.enabled}
            onValueChange={(value) => updateSmtp('enabled', value)}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={form.smtp.enabled ? palette.primary : '#f4f4f5'}
          />
        </View>

        <AppInput label="SMTP Host" value={form.smtp.host} onChangeText={(value) => updateSmtp('host', value)} />
        <AppInput label="SMTP Port" value={form.smtp.port} onChangeText={(value) => updateSmtp('port', value)} keyboardType="numeric" />
        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Use secure SMTP</Text>
          <Switch
            value={form.smtp.secure}
            onValueChange={(value) => updateSmtp('secure', value)}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={form.smtp.secure ? palette.primary : '#f4f4f5'}
          />
        </View>
        <AppInput label="SMTP Username" value={form.smtp.username} onChangeText={(value) => updateSmtp('username', value)} />
        <AppInput
          label={form.smtp.passwordConfigured ? 'SMTP Password (leave blank to keep existing)' : 'SMTP Password'}
          value={form.smtp.password}
          onChangeText={(value) => updateSmtp('password', value)}
          secureTextEntry
        />
        <AppInput label="From Email" value={form.smtp.fromEmail} onChangeText={(value) => updateSmtp('fromEmail', value)} autoCapitalize="none" keyboardType="email-address" />
        <AppInput label="From Name" value={form.smtp.fromName} onChangeText={(value) => updateSmtp('fromName', value)} />
      </SectionCard>

      <AppButton onPress={onSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save Auth Settings'}
      </AppButton>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
  infoText: {
    color: palette.textSecondary,
    fontSize: 13
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  switchLabel: {
    flex: 1,
    color: palette.textSecondary,
    fontSize: 13,
    paddingRight: 8
  }
});

export default AdminAuthSecurityScreen;
