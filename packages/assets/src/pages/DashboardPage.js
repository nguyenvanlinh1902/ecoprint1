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
import api from '@/api';
import { useApp } from '../context/AppContext';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../helpers/formatters';

const DashboardPage = () => {
  const { user, isAuthenticated, token } = useApp();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderStats, setOrderStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0
  });
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);

  // Fetch dashboard data once when component mounts and user is authenticated
  useEffect(() => {
    let isMounted = true;
    
    const loadDashboardData = async () => {
      // Only fetch if user is authenticated and we have a token
      if (!isAuthenticated || !token || !user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Get recent orders
        try {
          // Use direct API client rather than hook-based API
          const ordersResponse = await api.get('/orders', { 
            params: { 
              limit: 5,
              email: user.email  // Add user email parameter
            },
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (isMounted) {
            const orders = ordersResponse.data.data?.orders || [];
            setRecentOrders(orders);
            
            // Calculate order stats
            const stats = {
              total: orders.length,
              pending: orders.filter(order => order.status === 'pending').length,
              processing: orders.filter(order => order.status === 'processing').length,
              shipped: orders.filter(order => order.status === 'shipped').length,
              delivered: orders.filter(order => order.status === 'delivered').length
            };
            setOrderStats(stats);
          }
        } catch (orderError) {
          console.error('Error fetching orders:', orderError);
        }
        
        // Get recent transactions via API endpoint directly
        try {
          // Only fetch transactions if we're still mounted
          if (isMounted) {
            const transactionsResponse = await api.get('/transactions', {
              params: { 
                limit: 5,
                email: user.email  // Add user email as parameter
              },
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (transactionsResponse.status === 200) {
              setRecentTransactions(transactionsResponse.data.data?.transactions || []);
            } else {
              console.log('Failed to fetch transactions:', transactionsResponse.status);
            }
          }
        } catch (transactionError) {
          console.error('Error fetching transactions:', transactionError);
        }
        
      } catch (error) {
        if (isMounted) {
          setError('Failed to load dashboard data. Please try again later.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadDashboardData();
    
    // Cleanup function to prevent state updates if component unmounts
    return () => {
      isMounted = false;
    };
  }, [user, isAuthenticated, token]);

  // Handler for retry button
  const handleRetry = () => {
    setLoading(true);
    setError(null);
    
    // Re-fetch dashboard data
    const loadData = async () => {
      try {
        // Get recent orders
        try {
          const ordersResponse = await api.get('/orders', { 
            params: { 
              limit: 5,
              email: user.email  // Add user email parameter
            },
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          const orders = ordersResponse.data.data?.orders || [];
          setRecentOrders(orders);
          
          // Calculate order stats
          const stats = {
            total: orders.length,
            pending: orders.filter(order => order.status === 'pending').length,
            processing: orders.filter(order => order.status === 'processing').length,
            shipped: orders.filter(order => order.status === 'shipped').length,
            delivered: orders.filter(order => order.status === 'delivered').length
          };
          setOrderStats(stats);
        } catch (orderError) {
          console.error('Error fetching orders:', orderError);
        }
        
        // Get recent transactions
        try {
          const transactionsResponse = await api.get('/transactions', {
            params: { 
              limit: 5,
              email: user.email  // Add user email as parameter
            },
            headers: { 'Authorization': `Bearer ${token}` }
          });
          
          if (transactionsResponse.status === 200) {
            setRecentTransactions(transactionsResponse.data.data?.transactions || []);
          } else {
            console.log('Failed to fetch transactions:', transactionsResponse.status);
          }
        } catch (transactionError) {
          console.error('Error fetching transactions:', transactionError);
        }
      } catch (error) {
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <LinearProgress sx={{ width: '50%' }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Paper
        sx={{
          p: 3,
          textAlign: 'center',
          mt: 3
        }}
      >
        <Typography variant="h6" color="error" gutterBottom>
          {error}
        </Typography>
        <Button
          variant="contained"
          onClick={handleRetry}
          sx={{ mt: 2 }}
        >
          Retry
        </Button>
      </Paper>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Welcome, {user?.displayName || user?.companyName || 'User'}
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
              {formatCurrency(user?.balance || 0)}
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