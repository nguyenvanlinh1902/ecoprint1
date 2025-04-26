import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Grid, Paper, Card, CardContent, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  ArrowUpward as IncreaseIcon,
  ArrowDownward as DecreaseIcon,
  PeopleAlt as UsersIcon,
  Inventory as ProductsIcon,
  ShoppingCart as OrdersIcon,
  AccountBalance as RevenueIcon,
  FiberNew as NewIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { api } from '../../helpers';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../helpers/formatters';

const DashboardPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalUsers: 0,
      activeUsers: 0,
      totalProducts: 0,
      totalOrders: 0,
      pendingOrders: 0,
      totalRevenue: 0,
      revenueChange: 0,
      newUsers: 0,
      newOrders: 0
    },
    recentOrders: [],
    recentUsers: [],
    pendingApprovals: 0
  });
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // Use the correct API function name
        const response = await api.admin.getDashboard();
        
        // Log response để debug
        console.log('Dashboard API response:', response);
        
        // Kiểm tra cấu trúc dữ liệu trả về
        if (response.data && response.data.data) {
          setDashboardData(response.data.data);
        } else if (response.data) {
          // Cấu trúc dữ liệu đơn giản hơn
          setDashboardData(response.data);
        } else {
          // Fallback
          console.error('Unexpected API response structure:', response);
          setError('Định dạng dữ liệu không đúng. Vui lòng liên hệ quản trị viên.');
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.');
        
        // Retry logic nếu lỗi và số lần retry còn ít
        if (retryCount < 3) {
          console.log(`Retrying dashboard fetch (${retryCount + 1}/3)...`);
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 1000);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [retryCount]);
  
  // Fallback cho trường hợp không có dữ liệu
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError('');
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error" variant="h6" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleRetry}
        >
          Retry
        </Button>
      </Box>
    );
  }

  const { stats, recentOrders, recentUsers, pendingApprovals } = dashboardData;

  // Đảm bảo stats có đủ dữ liệu
  const ensuredStats = {
    totalUsers: stats?.totalUsers || 0,
    activeUsers: stats?.activeUsers || 0,
    totalProducts: stats?.totalProducts || 0,
    totalOrders: stats?.totalOrders || 0,
    pendingOrders: stats?.pendingOrders || 0,
    totalRevenue: stats?.totalRevenue || 0,
    revenueChange: stats?.revenueChange || 0,
    newUsers: stats?.newUsers || 0,
    newOrders: stats?.newOrders || 0
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Admin Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Total Users
              </Typography>
              <Typography variant="h4">
                {ensuredStats.totalUsers}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                  <IncreaseIcon fontSize="small" />
                  {ensuredStats.newUsers} new
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Products
              </Typography>
              <Typography variant="h4">
                {ensuredStats.totalProducts}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
                <Button 
                  component={Link} 
                  to="/admin/products" 
                  size="small"
                >
                  View All
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Orders
              </Typography>
              <Typography variant="h4">
                {ensuredStats.totalOrders}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1 }}>
                <Typography variant="body2" color={ensuredStats.newOrders > 0 ? 'success.main' : 'text.secondary'} sx={{ display: 'flex', alignItems: 'center' }}>
                  <NewIcon fontSize="small" sx={{ mr: 0.5 }} />
                  {ensuredStats.newOrders} new
                </Typography>
                <Typography variant="body2" color="warning.main">
                  {ensuredStats.pendingOrders} pending
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Revenue
              </Typography>
              <Typography variant="h4">
                {formatCurrency(ensuredStats.totalRevenue)}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                {ensuredStats.revenueChange >= 0 ? (
                  <Typography variant="body2" color="success.main" sx={{ display: 'flex', alignItems: 'center' }}>
                    <IncreaseIcon fontSize="small" />
                    {ensuredStats.revenueChange}% vs last month
                  </Typography>
                ) : (
                  <Typography variant="body2" color="error.main" sx={{ display: 'flex', alignItems: 'center' }}>
                    <DecreaseIcon fontSize="small" />
                    {Math.abs(ensuredStats.revenueChange)}% vs last month
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Orders */}
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Recent Orders
              </Typography>
              <Button 
                component={Link} 
                to="/admin/orders" 
                size="small"
              >
                View All
              </Button>
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Customer</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Date</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id || `order-${Math.random()}`} hover>
                      <TableCell>
                        <Link to={`/admin/orders/${order.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                          <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                            {order.id ? (order.id.substring(0, 8) + '...') : 'N/A'}
                          </Typography>
                        </Link>
                      </TableCell>
                      <TableCell>{order.user?.companyName || 'N/A'}</TableCell>
                      <TableCell align="right">{formatCurrency(order.totalPrice || 0)}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status || 'unknown'} />
                      </TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                  {recentOrders.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">
                        <Typography variant="body2" color="text.secondary">
                          No recent orders
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Recent Users & Actions Needed */}
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Recent Users
            </Typography>
            
            <List dense>
              {recentUsers.map((user) => (
                <React.Fragment key={user.id || `user-${Math.random()}`}>
                  <ListItem>
                    <ListItemIcon>
                      <UsersIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={user.companyName || user.displayName || 'Unknown User'}
                      secondary={`${user.email || 'No Email'} • Joined ${formatDate(user.createdAt)}`}
                    />
                    <Button 
                      component={Link} 
                      to={`/admin/users/${user.id}`} 
                      size="small"
                    >
                      View
                    </Button>
                  </ListItem>
                  <Divider variant="inset" component="li" />
                </React.Fragment>
              ))}
              {recentUsers.length === 0 && (
                <ListItem>
                  <ListItemText
                    primary="No recent users"
                    secondary="New users will appear here"
                  />
                </ListItem>
              )}
            </List>
            
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 1 }}>
              <Button 
                component={Link} 
                to="/admin/users" 
                size="small"
              >
                View All Users
              </Button>
            </Box>
          </Paper>

          {pendingApprovals > 0 && (
            <Paper sx={{ p: 3, bgcolor: 'warning.light' }}>
              <Typography variant="h6" gutterBottom>
                Action Required
              </Typography>
              
              <List dense>
                <ListItem>
                  <ListItemIcon>
                    <UsersIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${pendingApprovals} user${pendingApprovals > 1 ? 's' : ''} pending approval`}
                    secondary="New registration requests require your review"
                  />
                  <Button 
                    component={Link} 
                    to="/admin/users?status=pending" 
                    size="small"
                    variant="contained"
                    color="warning"
                  >
                    Review
                  </Button>
                </ListItem>
              </List>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage; 