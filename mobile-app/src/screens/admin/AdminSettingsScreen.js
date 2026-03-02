import { useEffect, useState } from 'react';
import { Switch, Text, View, StyleSheet } from 'react-native';
import AppButton from '../../components/AppButton';
import AppHeader from '../../components/AppHeader';
import AppInput from '../../components/AppInput';
import AppScreen from '../../components/AppScreen';
import SectionCard from '../../components/SectionCard';
import { useStoreSettings } from '../../context/StoreSettingsContext';
import { useToast } from '../../context/ToastContext';
import { palette } from '../../theme/colors';

const AdminSettingsScreen = () => {
  const {
    storeName,
    footerText,
    showOutOfStockProducts,
    themeSettings,
    updateStoreSettings
  } = useStoreSettings();
  const { showToast } = useToast();

  const [nameDraft, setNameDraft] = useState(storeName);
  const [footerDraft, setFooterDraft] = useState(footerText);
  const [showOutOfStockDraft, setShowOutOfStockDraft] = useState(showOutOfStockProducts);
  const [themeDraft, setThemeDraft] = useState(themeSettings);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNameDraft(storeName);
    setFooterDraft(footerText);
    setShowOutOfStockDraft(showOutOfStockProducts);
    setThemeDraft(themeSettings);
  }, [storeName, footerText, showOutOfStockProducts, themeSettings]);

  const updateThemeField = (field, value) => {
    setThemeDraft((current) => ({
      ...current,
      [field]: value
    }));
  };

  const onSubmit = async () => {
    if (!String(nameDraft || '').trim()) {
      showToast('Store name is required', 'error');
      return;
    }
    if (!String(footerDraft || '').trim()) {
      showToast('Footer text is required', 'error');
      return;
    }

    setSaving(true);
    try {
      await updateStoreSettings({
        storeName: nameDraft,
        footerText: footerDraft,
        showOutOfStockProducts: showOutOfStockDraft,
        theme: themeDraft
      });
      showToast('General settings saved', 'success');
    } catch (error) {
      showToast(error?.response?.data?.message || error.message || 'Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AppScreen>
      <AppHeader eyebrow="Dashboard" title="General Settings" subtitle="Store identity, theme and stock visibility settings." />

      <SectionCard>
        <AppInput label="Store Name" value={nameDraft} onChangeText={setNameDraft} />
        <AppInput label="Footer Text" value={footerDraft} onChangeText={setFooterDraft} multiline numberOfLines={3} />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Show out-of-stock products on storefront</Text>
          <Switch
            value={showOutOfStockDraft}
            onValueChange={setShowOutOfStockDraft}
            trackColor={{ true: palette.primarySoft, false: '#d7dce5' }}
            thumbColor={showOutOfStockDraft ? palette.primary : '#f4f4f5'}
          />
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Theme</Text>
        <AppInput label="Primary Color (#rrggbb)" value={themeDraft.primaryColor} onChangeText={(value) => updateThemeField('primaryColor', value)} autoCapitalize="none" />
        <AppInput label="Secondary Color (#rrggbb)" value={themeDraft.secondaryColor} onChangeText={(value) => updateThemeField('secondaryColor', value)} autoCapitalize="none" />
        <AppInput label="Background Default" value={themeDraft.backgroundDefault} onChangeText={(value) => updateThemeField('backgroundDefault', value)} autoCapitalize="none" />
        <AppInput label="Background Paper" value={themeDraft.backgroundPaper} onChangeText={(value) => updateThemeField('backgroundPaper', value)} autoCapitalize="none" />
        <AppInput label="Text Primary" value={themeDraft.textPrimary} onChangeText={(value) => updateThemeField('textPrimary', value)} autoCapitalize="none" />
        <AppInput label="Text Secondary" value={themeDraft.textSecondary} onChangeText={(value) => updateThemeField('textSecondary', value)} autoCapitalize="none" />
        <AppInput label="Body Font Family" value={themeDraft.bodyFontFamily} onChangeText={(value) => updateThemeField('bodyFontFamily', value)} />
        <AppInput label="Heading Font Family" value={themeDraft.headingFontFamily} onChangeText={(value) => updateThemeField('headingFontFamily', value)} />
      </SectionCard>

      <AppButton onPress={onSubmit} disabled={saving}>
        {saving ? 'Saving...' : 'Save Settings'}
      </AppButton>
    </AppScreen>
  );
};

const styles = StyleSheet.create({
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
  },
  sectionTitle: {
    color: palette.textPrimary,
    fontSize: 15,
    fontWeight: '700'
  }
});

export default AdminSettingsScreen;
