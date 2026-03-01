import { Box, Card, CardContent } from '@mui/material';
import { Outlet } from 'react-router-dom';
import PageHeader from '../components/PageHeader';
import UserSettingsSubnav from '../components/UserSettingsSubnav';

const UserSettingsLayout = () => (
  <Box>
    <PageHeader
      eyebrow="Account"
      title="User Settings"
      subtitle="Manage account email and reusable checkout billing profile."
    />

    <Card sx={{ mb: 1.2 }}>
      <CardContent sx={{ p: 1 }}>
        <UserSettingsSubnav />
      </CardContent>
    </Card>

    <Outlet />
  </Box>
);

export default UserSettingsLayout;
