import React, { useState, useEffect } from 'react';
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
  Container,
  Button,
  CircularProgress,
  Alert,
  AlertTitle,
  Paper
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
const RefreshIcon = () => <span>🔄</span>;
const FileIcon = () => <span>📂</span>;

const MainLayout = ({ children }) => {
  const { userProfile, signOut, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationsAnchorEl, setNotificationsAnchorEl] = useState(null);
  const [loading, setLoading] = useState(false);

  // Kiểm tra profile
  useEffect(() => {
    /* log removed */
    if (!userProfile) {
      /* log removed */
    }
  }, [userProfile]);

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
      setLoading(true);
      /* log removed */
      const success = await signOut();
      
      if (success) {
        /* log removed */
        // Đóng menu nếu đang mở
        if (anchorEl) {
          handleProfileMenuClose();
        }
        
        // Điều hướng về trang đăng nhập
        navigate('/login', { replace: true });
      } else {
        /* error removed */
        alert('An error occurred during logout. Please try again.');
      }
    } catch (error) {
      /* error removed */
      alert('An error occurred during logout. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fallback UI if userProfile is not available
  if (!userProfile) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Box sx={{ textAlign: 'center', maxWidth: 600, p: 3 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            <AlertTitle>User Profile Missing</AlertTitle>
            There was an issue loading your profile data
          </Alert>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Authentication Problem
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Your profile information could not be loaded. This may be due to:
            </Typography>
            <ul style={{ textAlign: 'left' }}>
              <li>Session expiration</li>
              <li>Account deactivation</li>
              <li>Server connectivity issues</li>
              <li>Data corruption</li>
            </ul>
          </Paper>
          
          {/* Debug information in development mode */}
          {process.env.NODE_ENV === 'development' && (
            <Paper sx={{ p: 3, mb: 3, bgcolor: '#f5f5f5' }}>
              <Typography variant="subtitle2" gutterBottom>
                Debug Information:
              </Typography>
              <Box component="pre" sx={{ 
                textAlign: 'left', 
                fontSize: '0.75rem',
                p: 1,
                bgcolor: '#f0f0f0',
                borderRadius: 1,
                overflowX: 'auto'
              }}>
                {JSON.stringify({
                  currentPath: location.pathname,
                  authState: {
                    isAdmin: isAdmin,
                    userProfile: userProfile || 'null',
                  }
                }, null, 2)}
              </Box>
            </Paper>
          )}
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Button 
              variant="outlined" 
              onClick={() => window.location.reload()}
              startIcon={<RefreshIcon />}
            >
              Refresh Page
            </Button>
            <Button 
              variant="contained" 
              onClick={handleLogout}
              disabled={loading}
              startIcon={<LogoutIcon />}
            >
              {loading ? 'Logging out...' : 'Logout and try again'}
            </Button>
          </Box>
        </Box>
      </Box>
    );
  }

  // Menu dành cho người dùng thường
  const userMenuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { text: 'Products', icon: <CategoryIcon />, path: '/products' },
    { text: 'Orders', icon: <ShoppingCartIcon />, path: '/orders' },
    { text: 'Import Orders', icon: <FileIcon />, path: '/import-orders' },
    { text: 'Transactions', icon: <AccountBalanceIcon />, path: '/transactions' },
  ];

  // Menu dành cho admin khi vào trang admin
  const adminNavItems = [
    { text: 'Admin Dashboard', icon: <DashboardIcon />, path: '/admin/dashboard' },
    { text: 'Manage Users', icon: <PeopleIcon />, path: '/admin/users' },
    { text: 'Manage Products', icon: <CategoryIcon />, path: '/admin/products' },
    { text: 'Manage Orders', icon: <ShoppingCartIcon />, path: '/admin/orders' },
    { text: 'Manage Transactions', icon: <AccountBalanceIcon />, path: '/admin/transactions' },
    { text: 'Settings', icon: <SettingsIcon />, path: '/admin/settings' },
  ];

  // Nếu đường dẫn hiện tại bắt đầu bằng /admin, hiển thị menu admin
  const isAdminPage = location.pathname.startsWith('/admin');
  
  // Xác định menu hiển thị dựa trên vai trò và trang hiện tại
  let menuItems;
  
  if (isAdmin && isAdminPage) {
    // Admin đang xem trang admin
    menuItems = [...adminNavItems];
  } else {
    // User thường hoặc admin đang xem trang user
    menuItems = [...userMenuItems];
  }

  // Thêm nút chuyển đổi giữa giao diện admin/user nếu người dùng là admin
  const switchInterface = () => {
    if (isAdminPage) {
      navigate('/dashboard');
    } else {
      navigate('/admin/dashboard');
    }
  };

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
          ...(isAdminPage && {
            backgroundColor: 'secondary.main', // Đổi màu khi ở trang admin
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
            {isAdminPage ? 'EcoPrint Admin' : 'EcoPrint'}
          </Typography>

          {/* Nút chuyển đổi giao diện cho admin */}
          {isAdmin && (
            <Button 
              color="inherit" 
              onClick={switchInterface}
              sx={{ mr: 2, display: { xs: 'none', sm: 'block' } }}
            >
              {isAdminPage ? 'Switch to User View' : 'Switch to Admin View'}
            </Button>
          )}

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
                  color: isAdminPage ? 'secondary.main' : 'primary.main',
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
                    color: location.pathname === item.path ? (isAdminPage ? 'secondary.main' : 'primary.main') : 'inherit',
                  }}
                >
                  {item.icon}
                </Box>
                {open && (
                  <ListItemText 
                    primary={item.text} 
                    primaryTypographyProps={{
                      color: location.pathname === item.path ? (isAdminPage ? 'secondary' : 'primary') : 'inherit',
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
            {isAdmin && (
              <Typography variant="caption" sx={{ 
                display: 'block', 
                mt: 0.5, 
                bgcolor: isAdminPage ? 'secondary.light' : 'primary.light',
                color: isAdminPage ? 'secondary.contrastText' : 'primary.contrastText',
                borderRadius: 1,
                p: 0.5
              }}>
                {isAdminPage ? 'ADMIN MODE' : 'USER MODE'}
              </Typography>
            )}
          </Box>
        )}
      </Drawer>

      {/* Main Content */}
      <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8 }}>
        <Container maxWidth={false}>
          {/* Debug userProfile data */}
          {process.env.NODE_ENV === 'development' && (
            <Box sx={{ mb: 3, p: 2, border: '1px dashed #ccc', display: 'none' }}>
              <Typography variant="subtitle2" gutterBottom>
                Debug User Data:
              </Typography>
              <pre style={{ fontSize: '0.75rem' }}>
                {JSON.stringify({ userProfile }, null, 2)}
              </pre>
            </Box>
          )}
          
          {/* Render children directly instead of using Outlet */}
          {children}
        </Container>
      </Box>
    </Box>
  );
};

export default MainLayout; 