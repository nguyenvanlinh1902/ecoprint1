import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  Box, Drawer, AppBar, Toolbar, List, Typography, Divider,
  IconButton, ListItem, ListItemButton, ListItemIcon, ListItemText,
  Container, useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  People as PeopleIcon,
  ShoppingCart as OrdersIcon,
  Inventory as ProductsIcon,
  Payment as PaymentIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon
} from '@mui/icons-material';

import { AdminProvider } from '../../context/AdminContext';

// Drawer width
const drawerWidth = 240;

// Navigation items
const mainNavItems = [
  { title: 'Dashboard', icon: <DashboardIcon />, path: '/admin' },
  { title: 'Users', icon: <PeopleIcon />, path: '/admin/users' },
  { title: 'Orders', icon: <OrdersIcon />, path: '/admin/orders' },
  { title: 'Products', icon: <ProductsIcon />, path: '/admin/products' },
  { title: 'Transactions', icon: <PaymentIcon />, path: '/admin/transactions' }
];

const secondaryNavItems = [
  { title: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' }
];

const AdminLayout = () => {
  const theme = useTheme();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(true);
  
  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  return (
    <AdminProvider>
      <Box sx={{ display: 'flex' }}>
        {/* Drawer component */}
        <Drawer
          variant="permanent"
          open={drawerOpen}
          sx={{
            width: drawerWidth,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: {
              width: drawerWidth,
              boxSizing: 'border-box',
              backgroundColor: 'background.paper',
              borderRight: '1px solid',
              borderColor: 'divider'
            },
          }}
        >
          <Toolbar
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              px: [1],
            }}
          >
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Admin Panel
            </Typography>
            <IconButton onClick={toggleDrawer}>
              <ChevronLeftIcon />
            </IconButton>
          </Toolbar>
          <Divider />
          
          {/* Main navigation items */}
          <List>
            {mainNavItems.map((item) => (
              <ListItem key={item.title} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
          
          {/* Secondary navigation items */}
          <List>
            {secondaryNavItems.map((item) => (
              <ListItem key={item.title} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Drawer>
        
        {/* Main content */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: { sm: `calc(100% - ${drawerWidth}px)` },
            ml: { sm: `${drawerWidth}px` },
            overflow: 'auto',
            height: '100vh',
          }}
        >
          {/* App bar for mobile */}
          <AppBar
            position="fixed"
            sx={{
              display: { sm: 'none' },
              width: { sm: `calc(100% - ${drawerWidth}px)` },
              ml: { sm: `${drawerWidth}px` },
            }}
          >
            <Toolbar>
              <IconButton
                color="inherit"
                edge="start"
                onClick={toggleDrawer}
                sx={{ mr: 2, display: { sm: 'none' } }}
              >
                <MenuIcon />
              </IconButton>
              <Typography variant="h6" noWrap component="div">
                Admin Panel
              </Typography>
            </Toolbar>
          </AppBar>
          
          {/* Toolbar placeholder for mobile */}
          <Toolbar sx={{ display: { sm: 'none' } }} />
          
          {/* Content area */}
          <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Outlet />
          </Container>
        </Box>
      </Box>
    </AdminProvider>
  );
};

export default AdminLayout; 