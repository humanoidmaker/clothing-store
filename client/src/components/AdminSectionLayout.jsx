import { Box, Button, Card, CardContent, Stack } from '@mui/material';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const adminNavItems = [
  { label: 'Reports', to: '/admin/reports' },
  { label: 'SEO', to: '/admin/seo' },
  { label: 'Products', to: '/admin/products' },
  { label: 'Reviews', to: '/admin/reviews' },
  { label: 'Orders', to: '/admin/orders' },
  { label: 'Resellers', to: '/admin/resellers' },
  { label: 'Settings', to: '/admin/settings' }
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
  const { isAdmin } = useAuth();
  const visibleItems = isAdmin
    ? adminNavItems
    : adminNavItems.filter((item) => item.to !== '/admin/resellers');

  return (
    <Stack spacing={1.2}>
      <Card>
        <CardContent sx={{ p: 1 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={0.8}>
            {visibleItems.map((item) => (
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
