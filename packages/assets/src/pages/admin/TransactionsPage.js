import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField,
  InputAdornment, Button, Pagination, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Alert, Chip
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../helpers/formatters';

const TransactionsPage = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [userId, setUserId] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  // Add manual transaction dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newTransaction, setNewTransaction] = useState({
    userId: '',
    type: 'deposit',
    amount: '',
    description: '',
    status: 'completed'
  });
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState(false);
  const [users, setUsers] = useState([]);
  
  // Transaction details dialog
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  useEffect(() => {
    fetchTransactions();
    
    // Get URL parameters if any
    const params = new URLSearchParams(window.location.search);
    const userIdParam = params.get('userId');
    if (userIdParam) {
      setUserId(userIdParam);
    }
  }, [page]);
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10); // Transactions per page
      
      if (type) {
        params.append('type', type);
      }
      
      if (status) {
        params.append('status', status);
      }
      
      if (search) {
        params.append('search', search);
      }
      
      if (userId) {
        params.append('userId', userId);
      }
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      const response = await api.get(`/api/admin/transactions?${params.toString()}`);
      
      setTransactions(response.data.data.transactions || []);
      setTotalPages(response.data.data.totalPages || 1);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/admin/users/list');
      setUsers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching users list:', error);
    }
  };
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleTypeChange = (event) => {
    setType(event.target.value);
  };
  
  const handleStatusChange = (event) => {
    setStatus(event.target.value);
  };
  
  const handleSearchChange = (event) => {
    setSearch(event.target.value);
  };
  
  const handleDateRangeChange = (event) => {
    const { name, value } = event.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleFilter = () => {
    setPage(1);
    fetchTransactions();
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTransactions();
  };
  
  const handleAddDialogOpen = () => {
    setAddDialogOpen(true);
    setAddSuccess(false);
    setAddError('');
    fetchUsers();
  };
  
  const handleAddDialogClose = () => {
    setAddDialogOpen(false);
    setNewTransaction({
      userId: '',
      type: 'deposit',
      amount: '',
      description: '',
      status: 'completed'
    });
  };
  
  const handleNewTransactionChange = (e) => {
    const { name, value } = e.target;
    setNewTransaction(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleAddTransaction = async () => {
    try {
      setAddLoading(true);
      setAddError('');
      
      const response = await api.post('/api/admin/transactions', newTransaction);
      
      setAddSuccess(true);
      setTimeout(() => {
        setAddDialogOpen(false);
        fetchTransactions();
        setSuccess('Transaction added successfully');
      }, 1500);
      
    } catch (error) {
      console.error('Error adding transaction:', error);
      setAddError('Failed to add transaction. Please check the details and try again.');
    } finally {
      setAddLoading(false);
    }
  };
  
  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setDetailsDialogOpen(true);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Transactions</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddDialogOpen}
        >
          Add Manual Transaction
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search transactions..."
                value={search}
                onChange={handleSearchChange}
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
              <InputLabel>Type</InputLabel>
              <Select
                value={type}
                onChange={handleTypeChange}
                label="Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="deposit">Deposit</MenuItem>
                <MenuItem value="payment">Payment</MenuItem>
                <MenuItem value="refund">Refund</MenuItem>
                <MenuItem value="adjustment">Adjustment</MenuItem>
              </Select>
            </FormControl>
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
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
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
              onChange={handleDateRangeChange}
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
              onChange={handleDateRangeChange}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={1}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={handleFilter}
                fullWidth
              >
                Filter
              </Button>
            </Box>
          </Grid>
        </Grid>
        
        {userId && (
          <Box sx={{ mt: 2 }}>
            <Chip 
              label={`Filtered by User ID: ${userId}`} 
              onDelete={() => {
                setUserId('');
                fetchTransactions();
              }} 
              color="primary"
            />
          </Box>
        )}
      </Paper>
      
      {/* Transactions List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>User</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <CircularProgress size={30} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                        {transaction.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Link to={`/admin/users/${transaction.userId}`}>
                        {transaction.user?.companyName || transaction.user?.name || transaction.userId.substring(0, 8) + '...'}
                      </Link>
                    </TableCell>
                    <TableCell>{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell align="right" sx={{ 
                      color: transaction.type === 'deposit' || transaction.type === 'refund' 
                        ? 'success.main' 
                        : transaction.type === 'payment' 
                          ? 'error.main' 
                          : 'inherit'
                    }}>
                      {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        startIcon={<VisibilityIcon />}
                        onClick={() => handleViewDetails(transaction)}
                      >
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    No transactions found.
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
      
      {/* Add Transaction Dialog */}
      <Dialog open={addDialogOpen} onClose={handleAddDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Add Manual Transaction</DialogTitle>
        <DialogContent>
          {!addSuccess ? (
            <>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>User</InputLabel>
                    <Select
                      name="userId"
                      value={newTransaction.userId}
                      onChange={handleNewTransactionChange}
                      label="User"
                    >
                      {users.map(user => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.companyName || user.name} ({user.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      value={newTransaction.type}
                      onChange={handleNewTransactionChange}
                      label="Type"
                    >
                      <MenuItem value="deposit">Deposit</MenuItem>
                      <MenuItem value="refund">Refund</MenuItem>
                      <MenuItem value="adjustment">Adjustment</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="amount"
                    label="Amount"
                    type="number"
                    value={newTransaction.amount}
                    onChange={handleNewTransactionChange}
                    fullWidth
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    label="Description"
                    value={newTransaction.description}
                    onChange={handleNewTransactionChange}
                    fullWidth
                    multiline
                    rows={2}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={newTransaction.status}
                      onChange={handleNewTransactionChange}
                      label="Status"
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
              
              {addError && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {addError}
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="success">
              Transaction added successfully!
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleAddDialogClose}>
            {addSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!addSuccess && (
            <Button 
              onClick={handleAddTransaction} 
              variant="contained"
              disabled={addLoading || !newTransaction.userId || !newTransaction.amount || !newTransaction.description}
            >
              {addLoading ? <CircularProgress size={24} /> : 'Add Transaction'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* Transaction Details Dialog */}
      <Dialog open={detailsDialogOpen} onClose={() => setDetailsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transaction Details</DialogTitle>
        <DialogContent>
          {selectedTransaction && (
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Typography variant="subtitle2">Transaction ID</Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {selectedTransaction.id}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Type</Typography>
                <Typography variant="body1">
                  {selectedTransaction.type.charAt(0).toUpperCase() + selectedTransaction.type.slice(1)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Status</Typography>
                <StatusBadge status={selectedTransaction.status} />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Amount</Typography>
                <Typography 
                  variant="body1"
                  sx={{ 
                    color: selectedTransaction.type === 'deposit' || selectedTransaction.type === 'refund' 
                      ? 'success.main' 
                      : selectedTransaction.type === 'payment' 
                        ? 'error.main' 
                        : 'inherit',
                    fontWeight: 'bold'
                  }}
                >
                  {selectedTransaction.type === 'deposit' || selectedTransaction.type === 'refund' ? '+' : '-'}
                  {formatCurrency(selectedTransaction.amount)}
                </Typography>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <Typography variant="subtitle2">Date</Typography>
                <Typography variant="body1">
                  {formatDateTime(selectedTransaction.createdAt)}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">User</Typography>
                <Typography variant="body1">
                  <Link to={`/admin/users/${selectedTransaction.userId}`}>
                    {selectedTransaction.user?.companyName || selectedTransaction.user?.name || 'Unknown'}
                  </Link>
                  {' '}
                  ({selectedTransaction.user?.email || 'No email'})
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="subtitle2">Description</Typography>
                <Typography variant="body1">
                  {selectedTransaction.description}
                </Typography>
              </Grid>
              
              {selectedTransaction.metadata && Object.keys(selectedTransaction.metadata).length > 0 && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2">Additional Information</Typography>
                  <List dense>
                    {Object.entries(selectedTransaction.metadata).map(([key, value]) => (
                      <ListItem key={key}>
                        <ListItemText 
                          primary={`${key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')}`}
                          secondary={value}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              )}
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionsPage; 