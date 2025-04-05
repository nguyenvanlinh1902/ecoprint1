import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, IconButton,
  Button, TextField, InputAdornment, MenuItem, Select,
  FormControl, InputLabel, Pagination, CircularProgress, Alert
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Search as SearchIcon,
  Add as AddIcon,
  CloudUpload as ImportIcon
} from '@mui/icons-material';
import api from '@/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../helpers/formatters';
import { useAuth } from '../hooks/useAuth';

const OrdersPage = () => {
  const { userProfile, currentUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab state (All, Pending, Processing, Shipped, Delivered, Cancelled)
  const [tabValue, setTabValue] = useState(0);
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering & Sorting
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt_desc');
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });
  
  const statusFilters = ['', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'];
  
  // Log user data for debugging
  useEffect(() => {
    /* log removed */
    /* log removed */
  }, [userProfile, currentUser]);
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10); // Orders per page
      
      const status = statusFilters[tabValue];
      if (status) {
        params.append('status', status);
      }
      
      if (search) {
        params.append('search', search);
      }
      
      const [sortField, sortDirection] = sortBy.split('_');
      params.append('sort', sortField);
      params.append('direction', sortDirection);
      
      // Add user ID filter for regular users (not admin)
      if (userProfile && userProfile.role !== 'admin') {
        params.append('userId', userProfile.uid);
      }
      
      const response = await api.get(`/api/orders?${params.toString()}`);
      
      setOrders(response.data.data.orders || []);
      setTotalPages(response.data.data.totalPages || 1);
      
      // Update stats if provided in response
      if (response.data.data.stats) {
        setStats(response.data.data.stats);
      }
    } catch (error) {
      /* error removed */
      setError('Failed to load orders. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (userProfile) {
      fetchOrders();
    }
  }, [page, tabValue, sortBy, userProfile]);
  
  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
    setPage(1); // Reset to first page when changing tabs
  };
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1); // Reset to first page when searching
    fetchOrders();
  };
  
  const handleSortChange = (e) => {
    setSortBy(e.target.value);
  };
  
  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Orders</Typography>
        <Box>
          {userProfile?.role === 'admin' && (
            <Button
              variant="outlined"
              component={Link}
              to="/orders/import"
              startIcon={<ImportIcon />}
              sx={{ mr: 2 }}
            >
              Import Orders
            </Button>
          )}
          <Button
            variant="contained"
            component={Link}
            to="/orders/create"
            startIcon={<AddIcon />}
          >
            Create Order
          </Button>
        </Box>
      </Box>
      
      {/* Order Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h6">{stats.total}</Typography>
            <Typography variant="body2">Total</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.light' }}>
            <Typography variant="h6">{stats.pending}</Typography>
            <Typography variant="body2">Pending</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light' }}>
            <Typography variant="h6">{stats.processing}</Typography>
            <Typography variant="body2">Processing</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light' }}>
            <Typography variant="h6">{stats.shipped}</Typography>
            <Typography variant="body2">Shipped</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light' }}>
            <Typography variant="h6">{stats.delivered}</Typography>
            <Typography variant="body2">Delivered</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.light' }}>
            <Typography variant="h6">{stats.cancelled}</Typography>
            <Typography variant="body2">Cancelled</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="All Orders" />
          <Tab label="Pending" />
          <Tab label="Processing" />
          <Tab label="Shipped" />
          <Tab label="Delivered" />
          <Tab label="Cancelled" />
        </Tabs>
      </Paper>
      
      {/* Search and Sort Controls */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <form onSubmit={handleSearchSubmit}>
            <TextField
              fullWidth
              placeholder="Search orders by ID, product name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Button type="submit" variant="contained" size="small">
                      Search
                    </Button>
                  </InputAdornment>
                )
              }}
            />
          </form>
        </Grid>
        <Grid item xs={12} md={6}>
          <FormControl fullWidth>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortBy}
              onChange={handleSortChange}
              label="Sort By"
            >
              <MenuItem value="createdAt_desc">Newest First</MenuItem>
              <MenuItem value="createdAt_asc">Oldest First</MenuItem>
              <MenuItem value="totalPrice_desc">Price: High to Low</MenuItem>
              <MenuItem value="totalPrice_asc">Price: Low to High</MenuItem>
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {/* Orders Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Product</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <CircularProgress size={30} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : orders.length > 0 ? (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                        {order.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>{order.product?.name || 'N/A'}</TableCell>
                    <TableCell align="center">{order.quantity}</TableCell>
                    <TableCell align="right">{formatCurrency(order.totalPrice)}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        component={Link} 
                        to={`/orders/${order.id}`}
                        title="View Details"
                        size="small"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    No orders found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};

export default OrdersPage; 