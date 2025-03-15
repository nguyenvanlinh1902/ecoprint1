import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField,
  InputAdornment, Button, Pagination, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText,
  DialogActions, Alert, Chip, IconButton
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  Visibility as VisibilityIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon
} from '@mui/icons-material';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../helpers/formatters';

const TransactionsPage = () => {
  const navigate = useNavigate();
  const { transactionId } = useParams();
  const location = useLocation();
  
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
  
  // Transaction details
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  
  useEffect(() => {
    // Get URL parameters if any
    const params = new URLSearchParams(location.search);
    const userIdParam = params.get('userId');
    if (userIdParam) {
      setUserId(userIdParam);
    }
    
    if (!transactionId) {
      fetchTransactions();
    }
  }, [page, transactionId, location.search]);
  
  // Load transaction details if transactionId is provided
  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetails(transactionId);
    }
  }, [transactionId]);
  
  const fetchTransactionDetails = async (id) => {
    try {
      setLoadingDetails(true);
      const response = await api.get(`/api/admin/transactions/${id}`);
      setSelectedTransaction(response.data.data);
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      setError('Failed to load transaction details. Please try again later.');
    } finally {
      setLoadingDetails(false);
    }
  };
  
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
  
  const handleClearFilters = () => {
    setType('');
    setStatus('');
    setSearch('');
    setDateRange({
      startDate: '',
      endDate: ''
    });
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
    navigate(`/admin/transactions/${transaction.id}`);
  };
  
  const handleBackToList = () => {
    navigate('/admin/transactions');
  };
  
  // Render transaction details view
  const renderTransactionDetails = () => {
    if (loadingDetails) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (!selectedTransaction) {
      return (
        <Alert severity="error">Transaction not found or has been deleted.</Alert>
      );
    }
    
    return (
      <Paper sx={{ p: 3, width: '100%' }}>
        <Box sx={{ mb: 3 }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBackToList}
          >
            Back to Transactions
          </Button>
        </Box>
        
        <Typography variant="h5" gutterBottom>
          Transaction Details
        </Typography>
        
        <Grid container spacing={3} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Transaction ID
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {selectedTransaction.id}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Date & Time
            </Typography>
            <Typography variant="body1">
              {formatDateTime(selectedTransaction.createdAt)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              User
            </Typography>
            <Typography variant="body1">
              {selectedTransaction.user ? (
                <span>
                  {selectedTransaction.user.name} ({selectedTransaction.user.email})
                </span>
              ) : 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Type
            </Typography>
            <Chip 
              label={selectedTransaction.type} 
              color={selectedTransaction.type === 'deposit' ? 'success' : 
                     selectedTransaction.type === 'withdrawal' ? 'error' : 'default'} 
              size="small" 
            />
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Amount
            </Typography>
            <Typography 
              variant="body1" 
              fontWeight="bold"
              color={selectedTransaction.type === 'deposit' ? 'success.main' : 
                     selectedTransaction.type === 'withdrawal' ? 'error.main' : 'text.primary'}
            >
              {formatCurrency(selectedTransaction.amount)}
            </Typography>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <Typography variant="subtitle2" color="text.secondary">
              Status
            </Typography>
            <StatusBadge status={selectedTransaction.status} />
          </Grid>
          
          <Grid item xs={12}>
            <Typography variant="subtitle2" color="text.secondary">
              Description
            </Typography>
            <Typography variant="body1">
              {selectedTransaction.description || 'No description provided'}
            </Typography>
          </Grid>
          
          {selectedTransaction.notes && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Admin Notes
              </Typography>
              <Typography variant="body1">
                {selectedTransaction.notes}
              </Typography>
            </Grid>
          )}
        </Grid>
      </Paper>
    );
  };
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Transactions</Typography>
        
        {!transactionId && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddDialogOpen}
          >
            Add Manual Transaction
          </Button>
        )}
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
      
      {/* Show transaction details if transactionId is provided, otherwise show list */}
      {transactionId ? (
        renderTransactionDetails()
      ) : (
        <>
          {/* Filters */}
          <Paper sx={{ p: 3, mb: 3, width: '100%' }}>
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
                    <MenuItem value="withdrawal">Withdrawal</MenuItem>
                    <MenuItem value="refund">Refund</MenuItem>
                    <MenuItem value="payment">Payment</MenuItem>
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
                    <MenuItem value="">All Status</MenuItem>
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
                  label="Start Date"
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
                  label="End Date"
                  type="date"
                  name="endDate"
                  value={dateRange.endDate}
                  onChange={handleDateRangeChange}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              
              <Grid item xs={12} md={1}>
                <Box sx={{ display: 'flex' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleFilter}
                    sx={{ mr: 1 }}
                  >
                    <FilterIcon />
                  </Button>
                  <Button
                    variant="outlined"
                    color="secondary"
                    onClick={handleClearFilters}
                  >
                    <ClearIcon />
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>
          
          <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell width="15%">ID</TableCell>
                  <TableCell width="15%">Date</TableCell>
                  <TableCell width="20%">User</TableCell>
                  <TableCell width="15%">Type</TableCell>
                  <TableCell width="15%">Amount</TableCell>
                  <TableCell width="15%">Status</TableCell>
                  <TableCell width="5%" align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      <CircularProgress size={24} sx={{ my: 3 }} />
                    </TableCell>
                  </TableRow>
                ) : transactions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  transactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>{transaction.id}</TableCell>
                      <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                      <TableCell>
                        {transaction.user ? transaction.user.name : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={transaction.type} 
                          color={
                            transaction.type === 'deposit' ? 'success' : 
                            transaction.type === 'withdrawal' ? 'error' : 'default'
                          } 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell 
                        sx={{ 
                          color: transaction.type === 'deposit' ? 'success.main' : 
                                 transaction.type === 'withdrawal' ? 'error.main' : 'inherit',
                          fontWeight: 'bold'
                        }}
                      >
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} />
                      </TableCell>
                      <TableCell align="center">
                        <IconButton 
                          size="small"
                          onClick={() => handleViewDetails(transaction)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
          
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
            />
          </Box>
          
          {/* Add Transaction Dialog */}
          <Dialog 
            open={addDialogOpen} 
            onClose={handleAddDialogClose} 
            maxWidth="md" 
            fullWidth
          >
            <DialogTitle>Add Manual Transaction</DialogTitle>
            <DialogContent>
              {addError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {addError}
                </Alert>
              )}
              
              {addSuccess && (
                <Alert severity="success" sx={{ mb: 2 }}>
                  Transaction added successfully!
                </Alert>
              )}
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>User</InputLabel>
                    <Select
                      name="userId"
                      value={newTransaction.userId}
                      onChange={handleNewTransactionChange}
                      label="User"
                    >
                      {users.map(user => (
                        <MenuItem key={user.id} value={user.id}>
                          {user.name} ({user.email})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Type</InputLabel>
                    <Select
                      name="type"
                      value={newTransaction.type}
                      onChange={handleNewTransactionChange}
                      label="Type"
                    >
                      <MenuItem value="deposit">Deposit</MenuItem>
                      <MenuItem value="withdrawal">Withdrawal</MenuItem>
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
                    fullWidth
                    required
                    value={newTransaction.amount}
                    onChange={handleNewTransactionChange}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Status</InputLabel>
                    <Select
                      name="status"
                      value={newTransaction.status}
                      onChange={handleNewTransactionChange}
                      label="Status"
                    >
                      <MenuItem value="pending">Pending</MenuItem>
                      <MenuItem value="completed">Completed</MenuItem>
                      <MenuItem value="failed">Failed</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    name="description"
                    label="Description"
                    fullWidth
                    multiline
                    rows={3}
                    value={newTransaction.description}
                    onChange={handleNewTransactionChange}
                  />
                </Grid>
              </Grid>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleAddDialogClose}>Cancel</Button>
              <Button 
                onClick={handleAddTransaction} 
                variant="contained" 
                disabled={addLoading || !newTransaction.userId || !newTransaction.amount}
              >
                {addLoading ? <CircularProgress size={24} /> : 'Add Transaction'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default TransactionsPage; 