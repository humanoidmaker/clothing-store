import { Box, Container, Divider, Stack, Typography } from '@mui/material';

const AppFooter = () => {
  return (
    <Box component="footer" sx={{ mt: 2 }}>
      <Divider />
      <Container maxWidth="lg" sx={{ py: 1.4 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
          <Typography variant="body2" color="text.secondary">
            Astra Attire
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Premium everyday clothing, delivered across India.
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
};

export default AppFooter;

