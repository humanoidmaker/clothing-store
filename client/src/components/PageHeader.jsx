import { Box, Stack, Typography } from '@mui/material';

const PageHeader = ({ eyebrow, title, subtitle, actions }) => {
  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      justifyContent="space-between"
      alignItems={{ xs: 'flex-start', md: 'flex-end' }}
      spacing={0.8}
      sx={{ mb: 1.6 }}
    >
      <Box>
        {eyebrow && (
          <Typography variant="overline" sx={{ color: 'secondary.main', fontWeight: 700, letterSpacing: '0.08em' }}>
            {eyebrow}
          </Typography>
        )}
        <Typography variant="h4" sx={{ mb: subtitle ? 0.2 : 0 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography color="text.secondary" sx={{ maxWidth: 720, fontSize: '0.85rem' }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {actions ? <Box>{actions}</Box> : null}
    </Stack>
  );
};

export default PageHeader;

