import { Box, Button, Card, CardContent, Stack } from '@mui/material';
import { NavLink, Outlet } from 'react-router-dom';

const adminNavItems = [
  { label: 'Products', to: '/admin/products' },
  { label: 'Orders', to: '/admin/orders' }
];

const navButtonSx = {
  minWidth: 120,
  '&.active': {
    backgroundColor: 'primary.main',
    color: 'common.white',
    borderColor: 'primary.main'
  }
};

const AdminSectionLayout = () => {
  return (
    <Stack spacing={1.2}>
      <Card>
        <CardContent sx={{ p: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
            {adminNavItems.map((item) => (
              <Button
                key={item.to}
                component={NavLink}
                to={item.to}
                variant="outlined"
                sx={navButtonSx}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Box>
        <Outlet />
      </Box>
    </Stack>
  );
};

export default AdminSectionLayout;
