import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  Notifications as NotificationsIcon,
  Inbox as InboxIcon,
  Category as CategoryIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import { useApp } from '../context/AppContext';

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

// Define the missing nestedItemStyle
const nestedItemStyle = {
  pl: 4,
  '&.Mui-selected': {
    backgroundColor: 'rgba(0, 0, 0, 0.08)'
  },
  '&.Mui-selected:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.12)'
  }
};

const AdminLayout = ({ children }) => {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsEl, setNotificationsEl] = useState(null);
  const { user, logout } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const pathname = location.pathname;

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
      await logout();
      
      // Đóng menu nếu đang mở
      if (anchorEl) {
        setAnchorEl(null);
      }
      
      // Điều hướng về trang đăng nhập
      navigate('/login', { replace: true });
    } catch (error) {
      alert('An error occurred during logout. Please try again.');
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
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

          {user && (
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
                    alt={user?.companyName || user?.name || 'Admin User'}
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
              selected={pathname.startsWith(item.path)}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItem>
          ))}

          {/* Products section with sub-menu items */}
          <ListItem 
            button 
            component={Link} 
            to="/admin/products"
            selected={pathname.startsWith('/admin/products') || 
                     pathname.startsWith('/admin/categories') || 
                     pathname.startsWith('/admin/product-options')}
          >
            <ListItemIcon><InventoryIcon /></ListItemIcon>
            <ListItemText primary="Products" />
          </ListItem>
          
          {/* Sub-items for Products */}
          <List component="div" disablePadding>
            <ListItem
              button
              component={Link}
              to="/admin/products"
              selected={pathname === '/admin/products'}
              sx={nestedItemStyle}
            >
              <ListItemIcon>
                <InboxIcon />
              </ListItemIcon>
              <ListItemText primary="All Products" />
            </ListItem>
            
            <ListItem
              button
              component={Link}
              to="/admin/categories"
              selected={pathname.startsWith('/admin/categories')}
              sx={nestedItemStyle}
            >
              <ListItemIcon>
                <CategoryIcon />
              </ListItemIcon>
              <ListItemText primary="Categories" />
            </ListItem>
            
            <ListItem
              button
              component={Link}
              to="/admin/product-options"
              selected={pathname.startsWith('/admin/product-options')}
              sx={nestedItemStyle}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Production Options" />
            </ListItem>
          </List>
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