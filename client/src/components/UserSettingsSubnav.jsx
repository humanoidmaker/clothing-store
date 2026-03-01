import { Button, Stack } from '@mui/material';
import { NavLink } from 'react-router-dom';

const subNavButtonSx = {
  minWidth: 190,
  '&.active': {
    backgroundColor: 'primary.main',
    color: 'common.white',
    borderColor: 'primary.main'
  }
};

const UserSettingsSubnav = () => (
  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
    <Button component={NavLink} to="/settings/account" variant="outlined" sx={subNavButtonSx}>
      Account
    </Button>
    <Button component={NavLink} to="/settings/billing-profile" variant="outlined" sx={subNavButtonSx}>
      Billing Profile
    </Button>
  </Stack>
);

export default UserSettingsSubnav;
