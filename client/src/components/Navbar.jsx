import { AppBar, Badge, Box, Button, Chip, IconButton, Stack, Toolbar, Typography } from '@mui/material';
import AdminPanelSettingsOutlinedIcon from '@mui/icons-material/AdminPanelSettingsOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlinedIcon from '@mui/icons-material/PersonOutlineOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Link as RouterLink, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const linkSx = {
  color: 'common.white',
  textDecoration: 'none',
  px: 1,
  py: 0.5,
  borderRadius: 20,
  '&.active': {
    backgroundColor: 'rgba(255,255,255,0.18)'
  }
};

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const { itemsCount } = useCart();

  return (
    <AppBar position="sticky" elevation={0} sx={{ bgcolor: 'primary.main', borderBottom: '1px solid rgba(255,255,255,0.18)' }}>
      <Toolbar sx={{ minHeight: 72, gap: 2, flexWrap: 'wrap' }}>
        <Typography
          component={RouterLink}
          to="/"
          variant="h5"
          sx={{
            textDecoration: 'none',
            color: 'common.white',
            letterSpacing: '-0.02em',
            flexGrow: { xs: 1, md: 0 }
          }}
        >
          Astra Attire
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ flexGrow: 1, display: { xs: 'none', md: 'flex' } }}>
          <Box component={NavLink} to="/" sx={linkSx}>
            New Arrivals
          </Box>
          <Box component={NavLink} to="/orders" sx={linkSx}>
            Orders
          </Box>
        </Stack>

        <Stack direction="row" spacing={1} alignItems="center">
          <IconButton component={RouterLink} to="/" sx={{ color: 'common.white' }}>
            <StorefrontOutlinedIcon />
          </IconButton>

          <IconButton component={RouterLink} to="/cart" sx={{ color: 'common.white' }}>
            <Badge badgeContent={itemsCount} color="secondary">
              <ShoppingBagOutlinedIcon />
            </Badge>
          </IconButton>

          {!user && (
            <>
              <Button component={RouterLink} to="/login" variant="text" sx={{ color: 'common.white' }} startIcon={<PersonOutlineOutlinedIcon />}>
                Login
              </Button>
              <Button component={RouterLink} to="/register" variant="contained" color="secondary">
                Join
              </Button>
            </>
          )}

          {user && (
            <>
              <Chip label={user.name} sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'common.white' }} />
              {isAdmin && (
                <IconButton component={RouterLink} to="/admin/products" sx={{ color: 'common.white' }}>
                  <AdminPanelSettingsOutlinedIcon />
                </IconButton>
              )}
              <IconButton onClick={logout} sx={{ color: 'common.white' }}>
                <LogoutOutlinedIcon />
              </IconButton>
            </>
          )}
        </Stack>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
