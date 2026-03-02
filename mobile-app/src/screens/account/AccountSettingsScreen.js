import { useEffect, useState } from 'react';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const AccountSettingsScreen = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

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

  useEffect(() => {
    setDraft({
      name: String(user?.name || ''),
      email: String(user?.email || ''),
      phone: String(user?.phone || '')
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

  const onSubmit = async () => {
    const wantsPasswordUpdate =
      Boolean(passwordDraft.currentPassword) ||
      Boolean(passwordDraft.newPassword) ||
      Boolean(passwordDraft.confirmPassword);

    if (wantsPasswordUpdate) {
      if (!passwordDraft.currentPassword || !passwordDraft.newPassword || !passwordDraft.confirmPassword) {
        showToast('Fill all password fields to update password', 'error');
        return;
      }
      if (passwordDraft.newPassword.length < 6) {
        showToast('New password must be at least 6 characters', 'error');
        return;
      }
      if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
        showToast('New password and confirm password do not match', 'error');
        return;
      }
    }

    setSaving(true);
    try {
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
      showToast('Account settings saved', 'success');
    } catch (error) {
      showToast(error.message || 'Failed to save account', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Account" title="Account Details" subtitle="Update email, phone and optional password." />

      <SectionCard>
        <AppInput label="Full Name" value={draft.name} onChangeText={(value) => setField('name', value)} />
        <AppInput label="Login Email" value={draft.email} onChangeText={(value) => setField('email', value)} autoCapitalize="none" keyboardType="email-address" />
        <AppInput label="Phone" value={draft.phone} onChangeText={(value) => setField('phone', value)} keyboardType="phone-pad" />
      </SectionCard>

      <SectionCard>
        <AppInput
          label="Current Password"
          value={passwordDraft.currentPassword}
          onChangeText={(value) => setPasswordField('currentPassword', value)}
          secureTextEntry
        />
        <AppInput
          label="New Password"
          value={passwordDraft.newPassword}
          onChangeText={(value) => setPasswordField('newPassword', value)}
          secureTextEntry
        />
        <AppInput
          label="Confirm New Password"
          value={passwordDraft.confirmPassword}
          onChangeText={(value) => setPasswordField('confirmPassword', value)}
          secureTextEntry
        />
      </SectionCard>

      <AppButton onPress={onSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save Account'}
      </AppButton>
    </AppScreen>
  );
};

export default AccountSettingsScreen;
