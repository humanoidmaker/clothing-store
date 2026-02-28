import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Stack,
  TextField,
  Typography
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import PageHeader from '../components/PageHeader';
import { useStoreSettings } from '../context/StoreSettingsContext';

const AdminSettingsPage = () => {
  const { storeName, footerText, updateStoreSettings } = useStoreSettings();
  const [nameDraft, setNameDraft] = useState(storeName);
  const [footerTextDraft, setFooterTextDraft] = useState(footerText);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNameDraft(storeName);
    setFooterTextDraft(footerText);
  }, [storeName, footerText]);

  const onSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const updatedSettings = await updateStoreSettings({
        storeName: nameDraft,
        footerText: footerTextDraft
      });
      setSuccess(`Settings updated. Store name: "${updatedSettings.storeName}"`);
    } catch (requestError) {
      setError(requestError.response?.data?.message || requestError.message || 'Failed to update store settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <PageHeader
        eyebrow="Admin"
        title="Store Settings"
        subtitle="Update global store details that should reflect across the website."
      />

      {(error || success) && (
        <Stack spacing={0.8} sx={{ mb: 1.1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {success && <Alert severity="success">{success}</Alert>}
        </Stack>
      )}

      <Card>
        <CardContent component="form" onSubmit={onSubmit} sx={{ p: 1.2 }}>
          <Stack spacing={1.2} sx={{ maxWidth: 520 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Branding
            </Typography>

            <TextField
              label="Store Name"
              size="small"
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              required
              inputProps={{ maxLength: 80 }}
              helperText="Shown in navbar, auth pages, checkout and invoice."
            />

            <TextField
              label="Footer Text"
              size="small"
              value={footerTextDraft}
              onChange={(event) => setFooterTextDraft(event.target.value)}
              required
              multiline
              minRows={2}
              inputProps={{ maxLength: 220 }}
              helperText="Shown at the bottom-right of the website footer."
            />

            <Stack direction="row" spacing={0.8}>
              <Button
                type="submit"
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveOutlinedIcon />}
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

export default AdminSettingsPage;
