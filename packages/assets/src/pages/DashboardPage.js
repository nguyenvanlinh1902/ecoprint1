import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography, Grid, Paper, Box, Button, Card, CardContent,
  CardActions, Divider, LinearProgress, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
  ShoppingBag as OrderIcon,
  AccountBalance as BalanceIcon,
  AddShoppingCart as CreateOrderIcon
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../hooks/useAuth';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../helpers/formatters';

const DashboardPage = () => {
  const { userDetails } = useAuth();
  const [loading, setLoading] = useState(true);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Get recent orders
        const ordersResponse = await api.get('/api/orders?limit=5');
        setRecentOrders(ordersResponse.data.data.orders || []);
        
        // Calculate order stats
        const allOrders = ordersResponse.data.data.orders || [];
        const stats = {
          total: allOrders.length,
          pending: allOrders.filter(order => order.status === 'pending').length,
          processing: allOrders.filter(order => order.status === 'processing').length,
          shipped: allOrders.filter(order => order.status === 'shipped').length,
          delivered: allOrders.filter(order => order.status === 'delivered').length
        };
        setOrderStats(stats);
        
        // Get recent transactions
        const transactionsResponse = await api.get('/api/transactions?limit=5');
        setRecentTransactions(transactionsResponse.data.data.transactions || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return <LinearProgress />;
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {userDetails?.companyName || 'User'}
      </Typography>
      
      {/* Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderLeft: '4px solid #1976d2',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography component="h2" variant="h6" color="primary" gutterBottom>
                Account Balance
              </Typography>
              <BalanceIcon color="primary" />
            </Box>
            <Typography component="p" variant="h4">
              {formatCurrency(userDetails?.balance || 0)}
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button component={Link} to="/deposit" size="small" variant="outlined">
                Deposit Funds
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderLeft: '4px solid #388e3c',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography component="h2" variant="h6" color="success" gutterBottom>
                Total Orders
              </Typography>
              <OrderIcon color="success" />
            </Box>
            <Typography component="p" variant="h4">
              {orderStats.total}
            </Typography>
            <Box sx={{ mt: 'auto' }}>
              <Button component={Link} to="/orders" size="small" variant="outlined" color="success">
                View All Orders
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper
            sx={{
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              height: 140,
              borderLeft: '4px solid #9c27b0',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography component="h2" variant="h6" color="secondary" gutterBottom>
                Quick Actions
              </Typography>
              <CreateOrderIcon color="secondary" />
            </Box>
            <Box sx={{ mt: 'auto', display: 'flex', gap: 1 }}>
              <Button component={Link} to="/orders/create" size="small" variant="contained" color="secondary">
                Create Order
              </Button>
              <Button component={Link} to="/orders/import" size="small" variant="outlined" color="secondary">
                Import Orders
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Order Status Summary */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Status Summary
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Pending</Typography>
                  <Typography variant="h5">{orderStats.pending}</Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Processing</Typography>
                  <Typography variant="h5">{orderStats.processing}</Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Shipped</Typography>
                  <Typography variant="h5">{orderStats.shipped}</Typography>
                </Box>
              </Grid>
              <Grid item xs={2}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">Delivered</Typography>
                  <Typography variant="h5">{orderStats.delivered}</Typography>
                </Box>
              </Grid>
              <Grid item xs={4} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <Button component={Link} to="/orders/create" variant="contained" startIcon={<CreateOrderIcon />}>
                  Create New Order
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Recent Orders & Transactions */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Orders
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.length > 0 ? (
                    recentOrders.map((order) => (
                      <TableRow key={order.id} hover>
                        <TableCell>
                          <Link to={`/orders/${order.id}`} style={{ textDecoration: 'none', color: '#1976d2' }}>
                            #{order.id.substring(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell>{order.productName}</TableCell>
                        <TableCell>{formatDate(order.createdAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={order.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No recent orders
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button component={Link} to="/orders" size="small">
                View All Orders
              </Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Recent Transactions
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentTransactions.length > 0 ? (
                    recentTransactions.map((transaction) => (
                      <TableRow key={transaction.id} hover>
                        <TableCell>
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </TableCell>
                        <TableCell>{formatCurrency(transaction.amount)}</TableCell>
                        <TableCell>{formatDate(transaction.createdAt)}</TableCell>
                        <TableCell>
                          <StatusBadge status={transaction.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} align="center">
                        No recent transactions
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
              <Button component={Link} to="/transactions" size="small">
                View All Transactions
              </Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage; 