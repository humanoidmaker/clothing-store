import { Button, Stack } from '@mui/material';
import { NavLink } from 'react-router-dom';

const subNavButtonSx = {
  minWidth: 170,
  '&.active': {
    backgroundColor: 'primary.main',
    color: 'common.white',
    borderColor: 'primary.main'
  }
};

const AdminSettingsSubnav = () => (
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
    <Button component={NavLink} to="/admin/settings" end variant="outlined" sx={subNavButtonSx}>
      General Settings
    </Button>
    <Button component={NavLink} to="/admin/settings/payment-gateways" variant="outlined" sx={subNavButtonSx}>
      Payment Gateways
    </Button>
  </Stack>
);

export default AdminSettingsSubnav;
