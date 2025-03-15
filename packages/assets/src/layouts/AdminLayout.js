import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Box, Drawer, Divider,
  List, ListItem, ListItemIcon, ListItemText, IconButton,
  Container, Avatar, Menu, MenuItem, Tooltip, Badge
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  Inventory as InventoryIcon,
  ReceiptLong as ReceiptIcon,
  AttachMoney as MoneyIcon,
  AccountCircle as AccountIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
  Notifications as NotificationsIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useAuth } from '../hooks/useAuth';

const drawerWidth = 240;

// Styled components similar to MainLayout
const Main = styled('main', { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }),
);

const AppBarStyled = styled(AppBar, { shouldForwardProp: (prop) => prop !== 'open' })(
  ({ theme, open }) => ({
    transition: theme.transitions.create(['margin', 'width'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
      width: `calc(100% - ${drawerWidth}px)`,
      transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.easeOut,
        duration: theme.transitions.duration.enteringScreen,
      }),
    }),
  }),
);

const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 1),
  ...theme.mixins.toolbar,
  justifyContent: 'flex-end',
}));

const AdminLayout = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsEl, setNotificationsEl] = useState(null);
  const { userDetails, signOut } = useAuth();
  const navigate = useNavigate();

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationsOpen = (event) => {
    setNotificationsEl(event.currentTarget);
  };

  const handleNotificationsClose = () => {
    setNotificationsEl(null);
  };

  const handleLogout = async () => {
    try {
      console.log('AdminLayout: Attempting to log out...');
      const success = await signOut();
      
      if (success) {
        console.log('AdminLayout: Logout successful, redirecting to login page');
        // Đóng menu nếu đang mở
        if (anchorEl) {
          setAnchorEl(null);
        }
        
        // Điều hướng về trang đăng nhập
        navigate('/login', { replace: true });
      } else {
        console.error('AdminLayout: Logout was not successful');
        alert('An error occurred during logout. Please try again.');
      }
    } catch (error) {
      console.error('AdminLayout: Error during logout:', error);
      alert('An error occurred during logout. Please try again.');
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Products', icon: <InventoryIcon />, path: '/admin/products' },
    { text: 'Orders', icon: <ReceiptIcon />, path: '/admin/orders' },
    { text: 'Transactions', icon: <MoneyIcon />, path: '/admin/transactions' },
  ];

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBarStyled position="fixed" open={open} color="secondary">
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            Admin Dashboard
          </Typography>

          {userDetails && (
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Tooltip title="Notifications">
                <IconButton color="inherit" onClick={handleNotificationsOpen}>
                  <Badge badgeContent={3} color="error">
                    <NotificationsIcon />
                  </Badge>
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={notificationsEl}
                open={Boolean(notificationsEl)}
                onClose={handleNotificationsClose}
                onClick={handleNotificationsClose}
              >
                <MenuItem>New user registration pending approval</MenuItem>
                <MenuItem>3 new orders received</MenuItem>
                <MenuItem>2 payment proofs pending review</MenuItem>
              </Menu>

              <Tooltip title="Account settings">
                <IconButton onClick={handleMenu} color="inherit">
                  <Avatar
                    alt={userDetails?.companyName || userDetails?.name || 'Admin User'}
                    src="/static/avatar/admin.jpg"
                    sx={{ width: 32, height: 32 }}
                  />
                </IconButton>
              </Tooltip>

              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleClose}
                onClick={handleClose}
              >
                <MenuItem onClick={handleLogout}>Logout</MenuItem>
              </Menu>
            </Box>
          )}
        </Toolbar>
      </AppBarStyled>
      {open && (
        <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
          },
        }}
        variant="persistent"
        anchor="left"
        open={open}
      >
        <DrawerHeader>
          <IconButton onClick={handleDrawerToggle}>
            <ChevronLeftIcon />
          </IconButton>
        </DrawerHeader>
        <Divider />
        
        <List>
          {menuItems.map((item) => (
            <ListItem 
              button 
              key={item.text} 
              component={Link} 
              to={item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}
        </List>
      </Drawer>
      )}

      <Main open={open}>
        <DrawerHeader />
        <Container maxWidth={false} sx={{ px: 2 }}>
          {children}
        </Container>
      </Main>
    </Box>
  );
};

export default AdminLayout; 