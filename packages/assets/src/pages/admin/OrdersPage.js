import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton,
  TextField, InputAdornment, FormControl, InputLabel, 
  Select, MenuItem, Pagination, CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate } from '../../helpers/formatters';

const OrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    processing: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  });
  
  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {
        page,
        limit: 10 // Orders per page
      };
      
      if (status) {
        params.status = status;
      }
      
      if (search) {
        params.search = search;
      }
      
      if (dateRange.startDate) {
        params.startDate = dateRange.startDate;
      }
      
      if (dateRange.endDate) {
        params.endDate = dateRange.endDate;
      }
      
      // Sử dụng endpoint admin đã được cấu hình
      const response = await api.admin.getAllOrders(params);
      
      // Kiểm tra cấu trúc dữ liệu trả về
      if (response.data && response.data.data) {
        setOrders(response.data.data.orders || []);
        setTotalPages(response.data.data.totalPages || 1);
        
        // Update stats if provided
        if (response.data.data.stats) {
          setStats(response.data.data.stats);
        }
      } else if (response.data) {
        // Cấu trúc dữ liệu đơn giản hơn
        setOrders(response.data.orders || []);
        setTotalPages(response.data.totalPages || 1);
        
        // Update stats if provided
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      } else {
        // Fallback
        setOrders([]);
        setTotalPages(1);
        console.error('Unexpected API response structure:', response);
      }
      
    } catch (error) {
      console.error('Error fetching orders:', error);
      setError('Không thể tải danh sách đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchOrders();
  }, [page, status]);
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1); // Reset về trang 1 khi tìm kiếm
    fetchOrders();
  };
  
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };
  
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleFilterReset = () => {
    setSearch('');
    setStatus('');
    setDateRange({
      startDate: '',
      endDate: ''
    });
    setPage(1);
    
    // Fetch with reset filters
    fetchOrders();
  };
  
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Orders Management
      </Typography>
      
      {/* Stats Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h5">{stats.total}</Typography>
            <Typography variant="body2">Total Orders</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'warning.lighter' }}>
            <Typography variant="h5">{stats.pending}</Typography>
            <Typography variant="body2">Pending</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.lighter' }}>
            <Typography variant="h5">{stats.processing}</Typography>
            <Typography variant="body2">Processing</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.lighter' }}>
            <Typography variant="h5">{stats.shipped}</Typography>
            <Typography variant="body2">Shipped</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.lighter' }}>
            <Typography variant="h5">{stats.delivered}</Typography>
            <Typography variant="body2">Delivered</Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'error.lighter' }}>
            <Typography variant="h5">{stats.cancelled}</Typography>
            <Typography variant="body2">Cancelled</Typography>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search orders or customers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={handleStatusChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="shipped">Shipped</MenuItem>
                <MenuItem value="delivered">Delivered</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="From Date"
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="To Date"
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={12} md={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button
                variant="outlined"
                size="small"
                onClick={handleFilterReset}
              >
                Reset
              </Button>
              
              <Button
                variant="contained"
                startIcon={<FilterIcon />}
                onClick={fetchOrders}
                size="small"
              >
                Filter
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Orders List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Product</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
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
                    <TableCell>{order.user?.companyName || 'N/A'}</TableCell>
                    <TableCell>{order.product?.name || 'N/A'}</TableCell>
                    <TableCell align="right">{formatCurrency(order.totalPrice)}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton 
                        component={Link} 
                        to={`/admin/orders/${order.id}`}
                        title="View Details"
                        size="small"
                      >
                        <VisibilityIcon fontSize="small" />
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