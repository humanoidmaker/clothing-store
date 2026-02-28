import { Box, Container, Divider, Stack, Typography } from '@mui/material';
import { useStoreSettings } from '../context/StoreSettingsContext';

const AppFooter = () => {
  const { storeName, footerText } = useStoreSettings();

  return (
    <Box component="footer" sx={{ mt: 2 }}>
      <Divider />
      <Container maxWidth="lg" sx={{ py: 1.4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            {storeName}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {footerText}
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default AppFooter;
