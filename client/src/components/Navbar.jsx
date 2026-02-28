import { useEffect, useMemo, useState } from 'react';
import {
  AppBar,
  Badge,
  Box,
  Button,
  Container,
  Divider,
  Drawer,
  InputAdornment,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Toolbar,
  Typography
} from '@mui/material';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuRoundedIcon from '@mui/icons-material/MenuRounded';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import { Link as RouterLink, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';

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
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();
  const { itemsCount: cartItemsCount } = useCart();
  const { itemsCount: wishlistItemsCount } = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const drawerLinks = useMemo(() => {
    const links = [
      { label: 'Shop', to: '/' },
      { label: 'Cart', to: '/cart' }
    ];
    if (user) links.push({ label: 'My Orders', to: '/orders' });
    if (isAdmin) links.push({ label: 'Admin', to: '/admin' });
    return links;
  }, [user, isAdmin]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const q = params.get('q') || '';
    setSearchText(q);
  }, [location.pathname, location.search]);

  const navigateToSearch = (query) => {
    const q = String(query || '').trim();
    const params = new URLSearchParams();
    if (q) params.set('q', q);

    navigate({
      pathname: '/',
      search: params.toString() ? `?${params.toString()}` : ''
    });
  };

  const onSearchSubmit = (event) => {
    event.preventDefault();
    navigateToSearch(searchText);
  };

  const onClearSearch = () => {
    setSearchText('');
    navigateToSearch('');
  };

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

            <Stack direction="row" spacing={0.4} alignItems="center" sx={{ display: { xs: 'none', md: 'flex' }, flexGrow: 1 }}>
              <Box component={NavLink} to="/" sx={navLinkSx}>
                Shop
              </Box>
              {user && (
                <Box component={NavLink} to="/orders" sx={navLinkSx}>
                  Orders
                </Box>
              )}
              {isAdmin && (
                <Box component={NavLink} to="/admin" sx={navLinkSx}>
                  Admin
                </Box>
              )}

              <Box
                component="form"
                onSubmit={onSearchSubmit}
                sx={{ ml: 'auto', width: 420, display: 'flex', gap: 0.6, alignItems: 'center' }}
              >
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Search products..."
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  inputProps={{ 'aria-label': 'Search products' }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'rgba(255,255,255,0.96)'
                    }
                  }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlinedIcon fontSize="small" />
                      </InputAdornment>
                    ),
                    endAdornment: searchText ? (
                      <InputAdornment position="end">
                        <IconButton
                          type="button"
                          size="small"
                          aria-label="Clear search"
                          onClick={onClearSearch}
                        >
                          <CloseOutlinedIcon fontSize="small" />
                        </IconButton>
                      </InputAdornment>
                    ) : null
                  }}
                />
                <Button type="submit" variant="contained" color="secondary" sx={{ flexShrink: 0 }}>
                  Search
                </Button>
              </Box>
            </Stack>

            <Stack direction="row" spacing={0.4} alignItems="center" sx={{ ml: 'auto' }}>
              <IconButton component={RouterLink} to="/wishlist" sx={{ color: 'common.white' }} size="small">
                <Badge badgeContent={wishlistItemsCount} color="secondary">
                  <FavoriteBorderOutlinedIcon fontSize="small" />
                </Badge>
              </IconButton>

              <IconButton component={RouterLink} to="/cart" sx={{ color: 'common.white' }} size="small">
                <Badge badgeContent={cartItemsCount} color="secondary">
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

          <Box sx={{ display: { xs: 'block', md: 'none' }, pb: 0.8 }}>
            <Box component="form" onSubmit={onSearchSubmit} sx={{ display: 'flex', gap: 0.6, alignItems: 'center' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search products..."
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                inputProps={{ 'aria-label': 'Search products' }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: 'rgba(255,255,255,0.96)'
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlinedIcon fontSize="small" />
                    </InputAdornment>
                  ),
                  endAdornment: searchText ? (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        size="small"
                        aria-label="Clear search"
                        onClick={onClearSearch}
                      >
                        <CloseOutlinedIcon fontSize="small" />
                      </IconButton>
                    </InputAdornment>
                  ) : null
                }}
              />
              <Button type="submit" variant="contained" color="secondary" sx={{ flexShrink: 0 }}>
                Search
              </Button>
            </Box>
          </Box>
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
