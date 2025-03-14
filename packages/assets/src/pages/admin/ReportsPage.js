import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, Button, ButtonGroup, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Select, MenuItem, FormControl, InputLabel, Tabs, Tab, TextField,
  Alert
} from '@mui/material';
import {
  CloudDownload as DownloadIcon,
  Description as ReportIcon,
  DateRange as DateRangeIcon
} from '@mui/icons-material';
import api from '../../services/api';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ReportsPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Date ranges
  const [dateRange, setDateRange] = useState('month'); // week, month, quarter, year, custom
  const [customDate, setCustomDate] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Reports data
  const [revenueData, setRevenueData] = useState({
    timeline: [],
    byStatus: [],
    summary: {}
  });
  
  const [ordersData, setOrdersData] = useState({
    timeline: [],
    byStatus: [],
    summary: {}
  });
  
  const [productData, setProductData] = useState({
    topProducts: [],
    salesByCategory: [],
    summary: {}
  });
  
  const [customerData, setCustomerData] = useState({
    newCustomers: [],
    customersByRegion: [],
    topCustomers: [],
    summary: {}
  });
  
  // Colors for charts
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
  
  useEffect(() => {
    if (dateRange !== 'custom' || (customDate.startDate && customDate.endDate)) {
      fetchReports();
    }
  }, [dateRange]);
  
  const fetchReports = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters for date range
      const params = new URLSearchParams();
      params.append('range', dateRange);
      
      if (dateRange === 'custom') {
        if (!customDate.startDate || !customDate.endDate) {
          return; // Don't fetch if custom dates are not provided
        }
        params.append('startDate', customDate.startDate);
        params.append('endDate', customDate.endDate);
      }
      
      // Fetch revenue data
      const revenueResponse = await api.get(`/api/admin/reports/revenue?${params.toString()}`);
      setRevenueData(revenueResponse.data.data);
      
      // Fetch orders data
      const ordersResponse = await api.get(`/api/admin/reports/orders?${params.toString()}`);
      setOrdersData(ordersResponse.data.data);
      
      // Fetch product data
      const productResponse = await api.get(`/api/admin/reports/products?${params.toString()}`);
      setProductData(productResponse.data.data);
      
      // Fetch customer data
      const customerResponse = await api.get(`/api/admin/reports/customers?${params.toString()}`);
      setCustomerData(customerResponse.data.data);
      
    } catch (error) {
      console.error('Error fetching reports:', error);
      setError('Failed to load reports. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleDateRangeChange = (event) => {
    setDateRange(event.target.value);
  };
  
  const handleCustomDateChange = (e) => {
    const { name, value } = e.target;
    setCustomDate((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleApplyCustomDate = () => {
    fetchReports();
  };
  
  const handleExportReport = async (type) => {
    try {
      const params = new URLSearchParams();
      params.append('range', dateRange);
      
      if (dateRange === 'custom') {
        params.append('startDate', customDate.startDate);
        params.append('endDate', customDate.endDate);
      }
      
      // Use the browser's native download mechanism
      window.open(`/api/admin/reports/export/${type}?${params.toString()}`);
    } catch (error) {
      console.error('Error exporting report:', error);
      setError('Failed to export report. Please try again later.');
    }
  };
  
  if (loading && activeTab === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports & Analytics
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Date Range Selector */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Date Range</InputLabel>
              <Select
                value={dateRange}
                onChange={handleDateRangeChange}
                label="Date Range"
              >
                <MenuItem value="week">Last 7 Days</MenuItem>
                <MenuItem value="month">Last 30 Days</MenuItem>
                <MenuItem value="quarter">Last 90 Days</MenuItem>
                <MenuItem value="year">Last 12 Months</MenuItem>
                <MenuItem value="custom">Custom Range</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {dateRange === 'custom' && (
            <>
              <Grid item xs={12} md={3}>
                <TextField
                  label="Start Date"
                  type="date"
                  name="startDate"
                  value={customDate.startDate}
                  onChange={handleCustomDateChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <TextField
                  label="End Date"
                  type="date"
                  name="endDate"
                  value={customDate.endDate}
                  onChange={handleCustomDateChange}
                  fullWidth
                  size="small"
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={3}>
                <Button 
                  variant="contained" 
                  onClick={handleApplyCustomDate}
                  startIcon={<DateRangeIcon />}
                  disabled={!customDate.startDate || !customDate.endDate}
                  fullWidth
                >
                  Apply Range
                </Button>
              </Grid>
            </>
          )}
          
          <Grid item xs={12} md={dateRange === 'custom' ? 12 : 9}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <ButtonGroup variant="outlined">
                <Button 
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExportReport('csv')}
                >
                  Export CSV
                </Button>
                <Button 
                  startIcon={<DownloadIcon />}
                  onClick={() => handleExportReport('pdf')}
                >
                  Export PDF
                </Button>
              </ButtonGroup>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Report Tabs */}
      <Paper>
        <Tabs value={activeTab} onChange={handleTabChange} aria-label="report tabs">
          <Tab label="Revenue" id="report-tab-0" aria-controls="report-tabpanel-0" />
          <Tab label="Orders" id="report-tab-1" aria-controls="report-tabpanel-1" />
          <Tab label="Products" id="report-tab-2" aria-controls="report-tabpanel-2" />
          <Tab label="Customers" id="report-tab-3" aria-controls="report-tabpanel-3" />
        </Tabs>
        
        {/* Revenue Tab */}
        <TabPanel value={activeTab} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Revenue Over Time
              </Typography>
              <Paper sx={{ p: 2, height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={revenueData.timeline || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="revenue" 
                      name="Revenue" 
                      stroke="#8884d8" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Revenue by Status
              </Typography>
              <Paper sx={{ p: 2, height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={revenueData.byStatus || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {(revenueData.byStatus || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Revenue</TableCell>
                      <TableCell align="right">{formatCurrency(revenueData.summary?.totalRevenue || 0)}</TableCell>
                      <TableCell align="right" sx={{ 
                        color: (revenueData.summary?.revenueChange || 0) >= 0 
                          ? 'success.main' 
                          : 'error.main'
                      }}>
                        {(revenueData.summary?.revenueChange || 0) >= 0 ? '+' : ''}
                        {revenueData.summary?.revenueChange || 0}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Order Value</TableCell>
                      <TableCell align="right">{formatCurrency(revenueData.summary?.averageOrderValue || 0)}</TableCell>
                      <TableCell align="right" sx={{ 
                        color: (revenueData.summary?.aovChange || 0) >= 0 
                          ? 'success.main' 
                          : 'error.main'
                      }}>
                        {(revenueData.summary?.aovChange || 0) >= 0 ? '+' : ''}
                        {revenueData.summary?.aovChange || 0}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Orders Tab */}
        <TabPanel value={activeTab} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Orders Over Time
              </Typography>
              <Paper sx={{ p: 2, height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={ordersData.timeline || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="orders" 
                      name="Orders" 
                      stroke="#0088FE" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Orders by Status
              </Typography>
              <Paper sx={{ p: 2, height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={ordersData.byStatus || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Orders" fill="#0088FE" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Orders</TableCell>
                      <TableCell align="right">{ordersData.summary?.totalOrders || 0}</TableCell>
                      <TableCell align="right" sx={{ 
                        color: (ordersData.summary?.ordersChange || 0) >= 0 
                          ? 'success.main' 
                          : 'error.main'
                      }}>
                        {(ordersData.summary?.ordersChange || 0) >= 0 ? '+' : ''}
                        {ordersData.summary?.ordersChange || 0}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Order Completion Rate</TableCell>
                      <TableCell align="right">{(ordersData.summary?.completionRate || 0)}%</TableCell>
                      <TableCell align="right" sx={{ 
                        color: (ordersData.summary?.completionRateChange || 0) >= 0 
                          ? 'success.main' 
                          : 'error.main'
                      }}>
                        {(ordersData.summary?.completionRateChange || 0) >= 0 ? '+' : ''}
                        {ordersData.summary?.completionRateChange || 0}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Products Tab */}
        <TabPanel value={activeTab} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Top Products
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Units Sold</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(productData.topProducts || []).map((product) => (
                      <TableRow key={product.id} hover>
                        <TableCell>{product.name}</TableCell>
                        <TableCell align="right">{product.unitsSold}</TableCell>
                        <TableCell align="right">{formatCurrency(product.revenue)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Sales by Category
              </Typography>
              <Paper sx={{ p: 2, height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={productData.salesByCategory || []}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {(productData.salesByCategory || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        {/* Customers Tab */}
        <TabPanel value={activeTab} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                New Customers
              </Typography>
              <Paper sx={{ p: 2, height: 350 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={customerData.newCustomers || []}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      name="New Customers" 
                      stroke="#00C49F" 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                Top Customers
              </Typography>
              <TableContainer component={Paper} sx={{ maxHeight: 350, overflow: 'auto' }}>
                <Table stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>Customer</TableCell>
                      <TableCell align="right">Orders</TableCell>
                      <TableCell align="right">Spent</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(customerData.topCustomers || []).map((customer) => (
                      <TableRow key={customer.id} hover>
                        <TableCell>{customer.companyName || customer.name}</TableCell>
                        <TableCell align="right">{customer.orderCount}</TableCell>
                        <TableCell align="right">{formatCurrency(customer.totalSpent)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Summary
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Metric</TableCell>
                      <TableCell align="right">Value</TableCell>
                      <TableCell align="right">Change</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow>
                      <TableCell>Total Customers</TableCell>
                      <TableCell align="right">{customerData.summary?.totalCustomers || 0}</TableCell>
                      <TableCell align="right" sx={{ 
                        color: (customerData.summary?.customerGrowth || 0) >= 0 
                          ? 'success.main' 
                          : 'error.main'
                      }}>
                        {(customerData.summary?.customerGrowth || 0) >= 0 ? '+' : ''}
                        {customerData.summary?.customerGrowth || 0}%
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Average Customer Value</TableCell>
                      <TableCell align="right">{formatCurrency(customerData.summary?.averageCustomerValue || 0)}</TableCell>
                      <TableCell align="right" sx={{ 
                        color: (customerData.summary?.acvChange || 0) >= 0 
                          ? 'success.main' 
                          : 'error.main'
                      }}>
                        {(customerData.summary?.acvChange || 0) >= 0 ? '+' : ''}
                        {customerData.summary?.acvChange || 0}%
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>
            </Grid>
          </Grid>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ReportsPage; 