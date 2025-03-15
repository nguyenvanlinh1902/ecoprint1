import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  Container
} from '@mui/material';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 240;

// Icon components được thay thế bằng React components đơn giản
const MenuIcon = () => <span style={{ fontFamily: 'monospace' }}>☰</span>;
const ChevronLeftIcon = () => <span style={{ fontFamily: 'monospace' }}>←</span>;
const DashboardIcon = () => <span>📊</span>;
const ShoppingCartIcon = () => <span>🛒</span>;
const PeopleIcon = () => <span>👥</span>;
const CategoryIcon = () => <span>📦</span>;
const ReceiptIcon = () => <span>🧾</span>;
const AccountBalanceIcon = () => <span>💰</span>;
const PersonIcon = () => <span>👤</span>;
const LogoutIcon = () => <span>🚪</span>;
const SettingsIcon = () => <span>⚙️</span>;
const NotificationsIcon = () => <span>🔔</span>;

const MainLayout = () => {
  const { userProfile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsMenuOpen = (event) => {
    setNotificationsAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenuClose = () => {
    setNotificationsAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const userMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Products', icon: <CategoryIcon />, path: '/products' },
    { text: 'Orders', icon: <ShoppingCartIcon />, path: '/orders' },
    { text: 'Create Order', icon: <ReceiptIcon />, path: '/create-order' },
    { text: 'Transactions', icon: <AccountBalanceIcon />, path: '/transactions' },
  ];

  const adminMenuItems = [
    { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Products', icon: <CategoryIcon />, path: '/admin/products' },
    { text: 'Orders', icon: <ShoppingCartIcon />, path: '/admin/orders' },
    { text: 'Transactions', icon: <AccountBalanceIcon />, path: '/admin/transactions' },
  ];

  const menuItems = isAdmin ? [...userMenuItems, { divider: true }, ...adminMenuItems] : userMenuItems;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: (theme) => theme.zIndex.drawer + 1,
          transition: (theme) => theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          ...(open && {
            width: `calc(100% - ${drawerWidth}px)`,
            transition: (theme) => theme.transitions.create(['width', 'margin'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }),
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            {open ? <ChevronLeftIcon /> : <MenuIcon />}
          </IconButton>
          
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            EcoPrint
          </Typography>

          {/* Notifications */}
          <IconButton color="inherit" onClick={handleNotificationsMenuOpen}>
            <Badge badgeContent={3} color="error">
              <NotificationsIcon />
            </Badge>
          </IconButton>
          <Menu
            anchorEl={notificationsAnchorEl}
            open={Boolean(notificationsAnchorEl)}
            onClose={handleNotificationsMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                minWidth: 300,
                '& .MuiMenuItem-root': {
                  px: 2,
                  py: 1,
                },
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={handleNotificationsMenuClose}>
              <Typography variant="body2">
                Your order #ORD-123456 has been confirmed
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleNotificationsMenuClose}>
              <Typography variant="body2">
                Your deposit of $100.00 has been approved
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleNotificationsMenuClose}>
              <Typography variant="body2">
                New products are available in the catalog
              </Typography>
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => navigate('/notifications')} sx={{ justifyContent: 'center' }}>
              <Typography variant="body2" color="primary">
                View All Notifications
              </Typography>
            </MenuItem>
          </Menu>

          {/* User Menu */}
          <Tooltip title="Account settings">
            <IconButton
              onClick={handleProfileMenuOpen}
              size="small"
              edge="end"
              aria-label="account of current user"
              aria-haspopup="true"
              color="inherit"
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {userProfile?.displayName?.charAt(0) || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            PaperProps={{
              elevation: 0,
              sx: {
                overflow: 'visible',
                filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
                mt: 1.5,
                minWidth: 200,
              },
            }}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          >
            <MenuItem onClick={() => {
              handleProfileMenuClose();
              navigate('/profile');
            }}>
              <Box sx={{ mr: 2 }}>
                <PersonIcon />
              </Box>
              Profile
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => {
              handleProfileMenuClose();
              navigate('/deposit');
            }}>
              <Box sx={{ mr: 2 }}>
                <AccountBalanceIcon />
              </Box>
              Deposit Funds
            </MenuItem>
            <Divider />
            <MenuItem onClick={handleLogout}>
              <Box sx={{ mr: 2 }}>
                <LogoutIcon />
              </Box>
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      {/* Drawer */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          ...(open && {
            width: drawerWidth,
            '& .MuiDrawer-paper': {
              width: drawerWidth,
              overflowX: 'hidden',
            },
          }),
          ...(!open && {
            width: theme => theme.spacing(7),
            '& .MuiDrawer-paper': {
              width: theme => theme.spacing(7),
              overflowX: 'hidden',
            },
          }),
        }}
      >
        <Toolbar
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            px: [1],
          }}
        >
          {open && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography 
                sx={{ 
                  fontWeight: 'bold', 
                  color: 'primary.main',
                  fontSize: '24px'
                }}
              >
                🌿 EcoPrint
              </Typography>
            </Box>
          )}
        </Toolbar>
        
        <Divider />
        <List>
          {menuItems.map((item, index) => (
            item.divider ? (
              <Divider key={`divider-${index}`} sx={{ my: 1 }} />
            ) : (
              <ListItem
                key={item.text}
                component={Link}
                to={item.path}
                button
                selected={location.pathname === item.path}
                sx={{
                  minHeight: 48,
                  px: 2.5,
                  ...(!open && {
                    justifyContent: 'center',
                  }),
                  ...(location.pathname === item.path && {
                    backgroundColor: 'rgba(0, 0, 0, 0.08)',
                  }),
                }}
              >
                <Box
                  sx={{
                    minWidth: 0,
                    mr: open ? 3 : 'auto',
                    justifyContent: 'center',
                    color: location.pathname === item.path ? 'primary.main' : 'inherit',
                  }}
                >
                  {item.icon}
                </Box>
                {open && (
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      color: location.pathname === item.path ? 'primary' : 'inherit',
                    }}
                  />
                )}
              </ListItem>
            )
          ))}
        </List>
        <Box sx={{ flexGrow: 1 }} />
        <Divider />
        {open && (
          <Box sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Balance: ${userProfile?.balance || 0}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              v1.0.0
            </Typography>
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Container maxWidth={false}>
          <Outlet />
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout; 