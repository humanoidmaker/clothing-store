import { Button, Stack } from '@mui/material';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const subNavButtonSx = {
  minWidth: 170,
  '&.active': {
    backgroundColor: 'primary.main',
    color: 'common.white',
    borderColor: 'primary.main'
  }
};

const AdminSettingsSubnav = () => {
  const { isAdmin, isResellerAdmin } = useAuth();

  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
      <Button component={NavLink} to="/admin/settings" end variant="outlined" sx={subNavButtonSx}>
        General Settings
      </Button>
      {isAdmin || isResellerAdmin ? (
        <Button component={NavLink} to="/admin/settings/payment-gateways" variant="outlined" sx={subNavButtonSx}>
          Payment Gateways
        </Button>
      ) : null}
      {isAdmin || isResellerAdmin ? (
        <Button component={NavLink} to="/admin/settings/coupons" variant="outlined" sx={subNavButtonSx}>
          Coupons
        </Button>
      ) : null}
      {isAdmin ? (
        <Button component={NavLink} to="/admin/settings/auth-security" variant="outlined" sx={subNavButtonSx}>
          Auth & Security
        </Button>
      ) : null}
    </Stack>
  );
};

export default AdminSettingsSubnav;
