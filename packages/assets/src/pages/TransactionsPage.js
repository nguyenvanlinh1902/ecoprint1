import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField,
  InputAdornment, Button, Pagination, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, IconButton, Tooltip, Divider, Alert, Avatar
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  CloudUpload as UploadIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import api from '@/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../helpers/formatters';
import { useApp } from '../context/AppContext';
import useFetchApi from '../hooks/api/useFetchApi';
import ReceiptUploader from '../components/ReceiptUploader';

const TransactionsPage = () => {
  const { user } = useApp();
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
  } = useFetchApi('transactions', {
    fetchOnMount: false,
    initialParams: queryParams
  });

  // Update state when data is fetched
  useEffect(() => {
    if (transactionsData) {
      // Ensure transactions is always an array
      if (Array.isArray(transactionsData.transactions)) {
        setTransactions(transactionsData.transactions);
      } else if (transactionsData.transactions === null || transactionsData.transactions === undefined) {
        // If null or undefined, set empty array
        setTransactions([]);
      } else {
        // Handle unexpected data by setting empty array
        console.warn('Unexpected transactions data format:', transactionsData.transactions);
        setTransactions([]);
      }
      
      // Handle pagination data
      if (transactionsData.pagination) {
        setTotalPages(transactionsData.pagination.totalPages || transactionsData.pagination.pages || 1);
      } else {
        setTotalPages(1);
      }
    } else {
      // If no data at all, set empty array
      setTransactions([]);
      setTotalPages(1);
    }
    
    if (fetchError) {
      setError('Failed to load transactions. Please try again later.');
      // Ensure we still have empty transactions array on error
      setTransactions([]);
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
  
  // Define receipt preview dialog state
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');

  // Add state for Firebase uploaded receipt URL
  const [firebaseReceiptUrl, setFirebaseReceiptUrl] = useState('');

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

  // Replace handleFileChange with this handler for Firebase uploads
  const handleReceiptUploadSuccess = (url) => {
    console.log('Receipt uploaded successfully to Firebase:', url);
    setFirebaseReceiptUrl(url);
    setDepositError(''); // Clear any previous errors
  };
  
  const handleReceiptUploadError = (error) => {
    console.error('Receipt upload error:', error);
    setDepositError(`Failed to upload receipt: ${error}`);
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
      
      // Check if we have a receipt URL from Firebase upload
      if (!firebaseReceiptUrl) {
        setDepositError('Please upload a receipt image for your deposit.');
        return;
      }

      setDepositLoading(true);
      setDepositError('');

      // 1. Create deposit transaction with Firebase receipt URL included
      const depositData = {
        amount: parseFloat(depositAmount),
        bankName: depositMethod,
        transferDate: new Date(),
        reference: depositNote || '',
        email: localStorage.getItem('user_email'),
        receiptUrl: firebaseReceiptUrl // Include the Firebase URL directly
      };

      console.log('Creating deposit with data:', depositData);
      const depositResponse = await api.transactions.requestDeposit(depositData);
      
      console.log('Deposit response:', depositResponse);
      
      // Check if we have a valid response with transactionId
      if (!depositResponse || !depositResponse.data) {
        throw new Error('Invalid response from server');
      }
      
      const transactionId = depositResponse.data.transactionId;
      console.log(`Deposit transaction created with ID: ${transactionId}`);

      // Hiển thị thông báo thành công ngay lập tức
      setDepositSuccess(true);
      
      // Refresh transaction list để hiển thị giao dịch mới ngay lập tức
      await refetchTransactions();

      // Close dialog after success with delay
      setTimeout(() => {
        handleCloseDepositDialog();
        // Xóa trạng thái Firebase URL để tránh sử dụng lại
        setFirebaseReceiptUrl('');
      }, 3000);

    } catch (error) {
      console.error('Deposit error:', error);
      setDepositError(
        error.response?.data?.error || error.response?.data?.message || error.message || 
        'Failed to create deposit request. Please try again later.'
      );
    } finally {
      setDepositLoading(false);
    }
  };

  // Function to handle showing receipt preview
  const handleShowReceipt = (url, title) => {
    setPreviewImage(url);
    setPreviewTitle(title || 'Receipt');
    setReceiptPreviewOpen(true);
  };

  // Function to close receipt preview
  const handleClosePreview = () => {
    setReceiptPreviewOpen(false);
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
            {formatCurrency(user?.balance || 0)}
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
                <TableCell>Note</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Receipt</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center">
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
                    <TableCell>{transaction.reference || transaction.note || transaction.description || '-'}</TableCell>
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
                    <TableCell>
                      {transaction.thumbnailUrl || transaction.receiptUrl ? (
                        <Tooltip title="View Receipt">
                          <IconButton
                            size="small"
                            onClick={() => handleShowReceipt(
                              transaction.receiptUrl,
                              `Receipt for ${transaction.type} - ${formatCurrency(transaction.amount)}`
                            )}
                          >
                            {transaction.thumbnailUrl ? (
                              <Avatar 
                                src={transaction.thumbnailUrl} 
                                alt="Receipt" 
                                variant="rounded"
                                sx={{ width: 36, height: 36 }}
                              />
                            ) : (
                              <ReceiptIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
                      ) : transaction.type === 'deposit' ? (
                        <Tooltip title="No receipt uploaded">
                          <span>
                            <IconButton size="small" disabled>
                              <ReceiptIcon fontSize="small" color="disabled" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} align="center">
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
        keepMounted={false}
        disablePortal={false}
        disableEnforceFocus={false}
        disableAutoFocus={false}
      >
        <DialogTitle>
          Deposit Funds
        </DialogTitle>
        <DialogContent>
          {depositSuccess ? (
            <Alert severity="success" sx={{ my: 2, fontSize: '1.1rem', fontWeight: 'bold' }}>
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
                  <ReceiptUploader
                    onUploadSuccess={handleReceiptUploadSuccess}
                    onUploadError={handleReceiptUploadError}
                    transactionId={`temp_${Date.now()}`} // Create a temporary path until we have transaction ID
                    disabled={depositLoading}
                  />
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
                    <strong>Reference:</strong> Please include your email ({user?.email || 'your email'}) as the payment reference.
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
          {!depositSuccess ? (
            <Button 
              onClick={handleCreateDeposit} 
              variant="contained" 
              disabled={depositLoading}
              startIcon={depositLoading ? <CircularProgress size={20} /> : <AccountBalanceIcon />}
              aria-busy={depositLoading}
            >
              {depositLoading ? 'Processing...' : 'Submit Deposit Request'}
            </Button>
          ) : (
            <Button 
              onClick={() => {
                handleCloseDepositDialog();
                fetchTransactions();
              }}
              variant="contained" 
              color="success"
              aria-live="polite"
            >
              Done
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Receipt Preview Dialog */}
      <Dialog
        open={receiptPreviewOpen}
        onClose={handleClosePreview}
        maxWidth="md"
      >
        <DialogTitle>{previewTitle}</DialogTitle>
        <DialogContent>
          {previewImage && (
            <Box
              component="img"
              src={previewImage}
              alt="Receipt"
              sx={{
                maxWidth: '100%',
                maxHeight: '70vh',
                display: 'block',
                margin: '0 auto'
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePreview}>Close</Button>
          <Button 
            component="a" 
            href={previewImage} 
            target="_blank" 
            rel="noopener noreferrer"
            startIcon={<VisibilityIcon />}
            color="primary"
          >
            Open Full Size
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionsPage; 