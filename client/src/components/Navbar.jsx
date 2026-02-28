import { useMemo, useState } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Typography
} from '@mui/material';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Link as RouterLink, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

const navLinkSx = {
  color: 'common.white',
  textDecoration: 'none',
  px: 1,
  py: 0.4,
  fontWeight: 600,
  '&.active': {
    backgroundColor: 'rgba(255,255,255,0.14)'
  }
};

const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const { itemsCount } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const drawerLinks = useMemo(() => {
    const links = [{ label: 'Shop', to: '/' }, { label: 'Cart', to: '/cart' }];
    if (user) links.push({ label: 'My Orders', to: '/orders' });
    if (isAdmin) links.push({ label: 'Admin', to: '/admin/products' });
    return links;
  }, [user, isAdmin]);

  return (
    <>
      <AppBar position="sticky" sx={{ backgroundColor: 'primary.main', backdropFilter: 'none' }}>
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 56 }}>
            <Typography
              component={RouterLink}
              to="/"
              variant="h6"
              sx={{
                color: 'common.white',
                textDecoration: 'none',
                mr: 1.5,
                flexShrink: 0
              }}
            >
              Astra Attire
            </Typography>

            <Stack direction="row" spacing={0.4} sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
              <Box component={NavLink} to="/" sx={navLinkSx}>
                Shop
              </Box>
              {user && (
                <Box component={NavLink} to="/orders" sx={navLinkSx}>
                  Orders
                </Box>
              )}
              {isAdmin && (
                <Box component={NavLink} to="/admin/products" sx={navLinkSx}>
                  Admin
                </Box>
              )}
            </Stack>

            <Stack direction="row" spacing={0.4} alignItems="center" sx={{ ml: 'auto' }}>
              <IconButton component={RouterLink} to="/cart" sx={{ color: 'common.white' }} size="small">
                <Badge badgeContent={itemsCount} color="secondary">
                  <ShoppingBagOutlinedIcon fontSize="small" />
                </Badge>
              </IconButton>

              {!user && (
                <>
                  <Button component={RouterLink} to="/login" variant="text" sx={{ color: 'common.white', display: { xs: 'none', sm: 'inline-flex' } }}>
                    Login
                  </Button>
                  <Button component={RouterLink} to="/register" variant="contained" color="secondary" sx={{ display: { xs: 'none', sm: 'inline-flex' } }}>
                    Register
                  </Button>
                </>
              )}

              {user && (
                <>
                  <Typography variant="caption" sx={{ color: 'common.white', display: { xs: 'none', sm: 'inline' } }}>
                    {user.name}
                  </Typography>
                  <IconButton onClick={logout} sx={{ color: 'common.white', display: { xs: 'none', sm: 'inline-flex' } }} size="small">
                    <LogoutOutlinedIcon fontSize="small" />
                  </IconButton>
                </>
              )}

              <IconButton
                sx={{ color: 'common.white', display: { md: 'none' } }}
                onClick={() => setDrawerOpen(true)}
                aria-label="Open navigation"
                size="small"
              >
                <MenuRoundedIcon fontSize="small" />
              </IconButton>
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260 }} role="presentation" onClick={() => setDrawerOpen(false)}>
          <Box sx={{ p: 1.5 }}>
            <Typography variant="subtitle1">Navigation</Typography>
          </Box>
          <Divider />

          <List>
            {drawerLinks.map((link) => (
              <ListItemButton key={link.to} component={RouterLink} to={link.to}>
                <ListItemText primary={link.label} />
              </ListItemButton>
            ))}

            {!user && (
              <>
                <ListItemButton component={RouterLink} to="/login">
                  <ListItemText primary="Login" />
                </ListItemButton>
                <ListItemButton component={RouterLink} to="/register">
                  <ListItemText primary="Register" />
                </ListItemButton>
              </>
            )}

            {user && (
              <ListItemButton
                onClick={(event) => {
                  event.preventDefault();
                  logout();
                }}
              >
                <LogoutOutlinedIcon fontSize="small" sx={{ mr: 1 }} />
                <ListItemText primary="Logout" />
              </ListItemButton>
            )}
          </List>
        </Box>
      </Drawer>
    </>
  );
};

export default Navbar;
