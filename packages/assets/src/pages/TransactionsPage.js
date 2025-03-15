import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField,
  InputAdornment, Button, Pagination, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, IconButton, Tooltip, Divider, Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  AccountBalance as AccountBalanceIcon
} from '@mui/icons-material';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../helpers/formatters';
import { useAuth } from '../hooks/useAuth';
import { useFetchApi } from '../hooks/useFetchApi';

const TransactionsPage = () => {
  const { userProfile } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });

  // API params state
  const [queryParams, setQueryParams] = useState({
    page: 1,
    limit: 10
  });

  // Use useFetchApi for transactions
  const { 
    data: transactionsData,
    loading: fetchLoading,
    error: fetchError,
    refetch: refetchTransactions
  } = useFetchApi({
    resource: 'transactions',
    autoFetch: false,
    params: queryParams
  });

  // Update state when data is fetched
  useEffect(() => {
    if (transactionsData) {
      setTransactions(transactionsData.transactions || []);
      setTotalPages(transactionsData.totalPages || 1);
    }
    if (fetchError) {
      setError('Failed to load transactions. Please try again later.');
    }
    setLoading(fetchLoading);
  }, [transactionsData, fetchError, fetchLoading]);

  // Deposit Dialog
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('bank_transfer');
  const [depositNote, setDepositNote] = useState('');
  const [receiptFile, setReceiptFile] = useState(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);
  
  const fetchTransactions = () => {
    // Build query parameters
    const params = {
      page,
      limit: 10
    };
    
    if (type) {
      params.type = type;
    }
    
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
    
    // Update params and trigger fetch
    setQueryParams(params);
    refetchTransactions();
  };
  
  useEffect(() => {
    fetchTransactions();
  }, [page, type, status]);
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };
  
  const handleFilterReset = () => {
    setType('');
    setStatus('');
    setSearch('');
    setDateRange({ startDate: '', endDate: '' });
    setPage(1);
  };

  const handleOpenDepositDialog = () => {
    setDepositDialogOpen(true);
    setDepositError('');
    setDepositSuccess(false);
  };

  const handleCloseDepositDialog = () => {
    if (!depositLoading) {
      setDepositDialogOpen(false);
      // Reset form on close
      setTimeout(() => {
        setDepositAmount('');
        setDepositMethod('bank_transfer');
        setDepositNote('');
        setReceiptFile(null);
        setDepositError('');
        setDepositSuccess(false);
      }, 300);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setReceiptFile(e.target.files[0]);
    }
  };

  const handleCreateDeposit = async () => {
    try {
      // Validate form
      if (!depositAmount || parseFloat(depositAmount) <= 0) {
        setDepositError('Please enter a valid amount.');
        return;
      }

      if (!depositMethod) {
        setDepositError('Please select a payment method.');
        return;
      }

      setDepositLoading(true);
      setDepositError('');

      // 1. Create deposit transaction
      const depositData = {
        amount: parseFloat(depositAmount),
        method: depositMethod,
        note: depositNote,
      };

      const depositResponse = await api.transactions.requestDeposit(depositData);
      const transactionId = depositResponse.data.data.id;

      // 2. Upload receipt if provided
      if (receiptFile && transactionId) {
        const formData = new FormData();
        formData.append('receipt', receiptFile);
        
        await api.transactions.uploadReceipt(transactionId, formData);
      }

      setDepositSuccess(true);
      
      // Refresh transaction list
      refetchTransactions();

      // Close dialog after success
      setTimeout(() => {
        handleCloseDepositDialog();
      }, 3000);

    } catch (error) {
      console.error('Error creating deposit:', error);
      setDepositError(
        error.response?.data?.message || 
        'Failed to create deposit request. Please try again later.'
      );
    } finally {
      setDepositLoading(false);
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Transactions</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 1 }}>
            Current Balance:
          </Typography>
          <Typography variant="h6" color="primary" sx={{ mr: 2 }}>
            {formatCurrency(userProfile?.balance || 0)}
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenDepositDialog}
          >
            Deposit Funds
          </Button>
        </Box>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                label="Transaction Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="deposit">Deposits</MenuItem>
                <MenuItem value="payment">Payments</MenuItem>
                <MenuItem value="refund">Refunds</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4} md={3}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search transactions..."
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
                size="small"
                onClick={fetchTransactions}
              >
                Filter
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Transactions List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
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
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {transaction.type}
                      </Typography>
                    </TableCell>
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
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
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

      {/* Deposit Dialog */}
      <Dialog 
        open={depositDialogOpen} 
        onClose={handleCloseDepositDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Deposit Funds
        </DialogTitle>
        <DialogContent>
          {depositSuccess ? (
            <Alert severity="success" sx={{ my: 2 }}>
              Deposit request submitted successfully! Your account balance will be updated after admin review.
            </Alert>
          ) : (
            <>
              {depositError && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  {depositError}
                </Alert>
              )}
              
              <Typography variant="body2" color="text.secondary" paragraph sx={{ mt: 1 }}>
                Add funds to your account by filling in the form below. Your deposit will be processed after admin verification.
              </Typography>
              
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={12}>
                  <TextField
                    label="Amount"
                    type="number"
                    fullWidth
                    required
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    disabled={depositLoading}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControl fullWidth required>
                    <InputLabel>Payment Method</InputLabel>
                    <Select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      label="Payment Method"
                      disabled={depositLoading}
                    >
                      <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                      <MenuItem value="credit_card">Credit Card</MenuItem>
                      <MenuItem value="paypal">PayPal</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Notes"
                    multiline
                    rows={2}
                    fullWidth
                    value={depositNote}
                    onChange={(e) => setDepositNote(e.target.value)}
                    disabled={depositLoading}
                    placeholder="Any additional information about this deposit"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Payment Receipt
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<UploadIcon />}
                    disabled={depositLoading}
                    fullWidth
                  >
                    {receiptFile ? receiptFile.name : 'Upload Receipt'}
                    <input
                      type="file"
                      hidden
                      accept="image/*, application/pdf"
                      onChange={handleFileChange}
                    />
                  </Button>
                  
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    Upload a screenshot or PDF of your payment confirmation. Supported formats: JPG, PNG, PDF.
                  </Typography>
                </Grid>
              </Grid>
              
              <Divider sx={{ my: 3 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Payment Instructions:
              </Typography>
              
              <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1 }}>
                <Stack spacing={1}>
                  <Typography variant="body2">
                    <strong>Bank Transfer Details:</strong>
                  </Typography>
                  <Typography variant="body2">
                    Bank Name: Example Bank<br />
                    Account Name: EcoPrint Inc.<br />
                    Account Number: 1234567890<br />
                    Routing/Swift Code: EXBKUS123
                  </Typography>
                  <Typography variant="body2">
                    <strong>Reference:</strong> Please include your user ID ({userProfile?.id?.substring(0, 8) || 'User ID'}) as the payment reference.
                  </Typography>
                </Stack>
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDepositDialog} disabled={depositLoading}>
            {depositSuccess ? 'Close' : 'Cancel'}
          </Button>
          {!depositSuccess && (
            <Button 
              onClick={handleCreateDeposit} 
              variant="contained" 
              disabled={depositLoading}
              startIcon={depositLoading ? <CircularProgress size={20} /> : <AccountBalanceIcon />}
            >
              {depositLoading ? 'Processing...' : 'Submit Deposit Request'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionsPage; 