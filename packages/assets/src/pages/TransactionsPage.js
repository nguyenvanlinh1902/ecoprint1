import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField,
  InputAdornment, Button, Pagination, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Stack, IconButton, Tooltip, Divider, Alert, Avatar, Chip, List, ListItem, ListItemAvatar, ListItemText
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  AccountBalance as AccountBalanceIcon,
  Receipt as ReceiptIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Send as SendIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  ArrowBack as ArrowBackIcon,
  MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { api } from '../helpers';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime, formatDate } from '../helpers/formatters';
import { useApp } from '../context/AppContext';
import { useFetchApi } from '../hooks';
import ReceiptUploader from '../components/ReceiptUploader';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import TransactionDetails from '../components/transactions/TransactionDetails';
import TransactionCard from '../components/transactions/TransactionCard';

// Initialize dayjs plugins
dayjs.extend(relativeTime);

const TransactionsPage = () => {
  const { user } = useApp();
  const { transactionId } = useParams();
  const navigate = useNavigate();
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
  
  // Transaction detail state
  const [showDetail, setShowDetail] = useState(false);
  const [transaction, setTransaction] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [userNotes, setUserNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSuccess, setNotesSuccess] = useState('');
  const [notesError, setNotesError] = useState('');

  // Deposit dialog
  const [openDepositDialog, setOpenDepositDialog] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('bank_transfer');
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState('');
  const [depositSuccess, setDepositSuccess] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  // Receipt uploader state
  const [receiptUploaderOpen, setReceiptUploaderOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  // Use useFetchApi for transactions
  const { 
    fetchData,
    loading: fetchLoading,
    error: fetchError
  } = useFetchApi({
    url: '/transactions',
    fetchOnMount: false
  });

  // Decide if we should show transaction list or detail
  const shouldShowDetail = Boolean(transactionId);
  
  // Fetch transaction detail if ID is provided
  useEffect(() => {
    if (transactionId) {
      fetchTransactionDetail();
    } else {
      // If no transaction ID, fetch transactions list
      if (!transactions.length && !loading) {
        handleFetchTransactions();
      }
    }
  }, [transactionId]);
  
  // Fetch transaction detail
  const fetchTransactionDetail = async () => {
    setDetailLoading(true);
    setDetailError('');
    
    try {
      const response = await api.transactions.getById(transactionId);
      console.log('Transaction detail response:', response);
      
      let transactionData;
      if (response.data?.success && response.data?.data) {
        // API response is nested in success.data
        transactionData = response.data.data;
      } else if (response.data && response.data.data) {
        transactionData = response.data.data;
      } else if (response.data) {
        transactionData = response.data;
      } else {
        throw new Error('Invalid response format');
      }
      
      setTransaction(transactionData);
      setUserNotes(transactionData.userNotes || '');
    } catch (error) {
      console.error('Error fetching transaction detail:', error);
      setDetailError('Failed to load transaction details. Please try again.');
    } finally {
      setDetailLoading(false);
    }
  };
  
  // Fetch transactions when component mounts
  useEffect(() => {
    if (!transactionId && !transactions.length) {
      handleFetchTransactions();
    }
  }, []);
  
  // Handle fetching transactions with current filters
  const handleFetchTransactions = async () => {
    setLoading(true);
    setError('');
    
    const params = {
      page,
      limit: 10
    };
    
    if (type) params.type = type;
    if (status) params.status = status;
    if (search) params.search = search;
    if (dateRange.startDate) params.startDate = dateRange.startDate;
    if (dateRange.endDate) params.endDate = dateRange.endDate;
    
    setQueryParams(params);
    
    try {
      const { data, error } = await fetchData(params);
      
      if (error) {
        throw new Error(error);
      }
      
      // Process the response data
      if (data?.transactions) {
        setTransactions(data.transactions);
      } else if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
      
      // Handle pagination
      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages || data.pagination.pages || 1);
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to load transactions. Please try again.");
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle page change
  const handlePageChange = async (event, value) => {
    setPage(value);
    
    const newParams = {
      ...queryParams,
      page: value
    };
    
    setQueryParams(newParams);
    setLoading(true);
    
    try {
      const { data, error } = await fetchData(newParams);
      
      if (error) {
        throw new Error(error);
      }
      
      // Process the response data
      if (data?.transactions) {
        setTransactions(data.transactions);
      } else if (Array.isArray(data)) {
        setTransactions(data);
      } else {
        setTransactions([]);
      }
      
      // Handle pagination
      if (data?.pagination) {
        setTotalPages(data.pagination.totalPages || data.pagination.pages || 1);
      } else {
        setTotalPages(1);
      }
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setError("Failed to load transactions. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Handle filter changes
  const handleTypeChange = (e) => {
    setType(e.target.value);
  };
  
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
  };
  
  const handleSearchChange = (e) => {
    setSearch(e.target.value);
  };
  
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange({
      ...dateRange,
      [name]: value
    });
  };
  
  const handleApplyFilters = () => {
    setPage(1);
    handleFetchTransactions();
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
    handleFetchTransactions();
  };
  
  // Handle deposit dialog
  const handleOpenDepositDialog = () => {
    setOpenDepositDialog(true);
    setDepositAmount('');
    setDepositMethod('bank_transfer');
    setDepositError('');
    setDepositSuccess(false);
    setReceiptFile(null);
    setReceiptPreview(null);
  };
  
  const handleCloseDepositDialog = () => {
    setOpenDepositDialog(false);
    setDepositAmount('');
    setDepositError('');
    setDepositSuccess(false);
    setReceiptFile(null);
    setReceiptPreview(null);
  };
  
  const handleDepositAmountChange = (e) => {
    setDepositAmount(e.target.value);
  };
  
  const handleDepositMethodChange = (e) => {
    setDepositMethod(e.target.value);
  };
  
  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      const file = e.target.files[0];
      setReceiptFile(file);
      
      // Create preview for image files
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => {
          setReceiptPreview(reader.result);
        };
        reader.readAsDataURL(file);
      } else {
        // Reset preview if not an image
        setReceiptPreview(null);
      }
    }
  };
  
  const handleDepositSubmit = async () => {
    if (!depositAmount) {
      setDepositError('Please enter an amount');
      return;
    }
    
    if (!receiptFile) {
      setDepositError('Please upload a receipt image');
      return;
    }
    
    setDepositLoading(true);
    setDepositError('');
    
    try {
      const amount = parseFloat(depositAmount);
      
      // Make sure amount is valid
      if (isNaN(amount) || amount <= 0) {
        throw new Error('Please enter a valid amount');
      }
      
      // Create deposit request
      const response = await api.transactions.requestDeposit({
        amount,
        method: depositMethod,
        bankName: 'bank_transfer', // Default for the simple form
        transferDate: new Date()
      });
      
      const transactionId = response.data.transactionId;
      
      // Upload receipt if we have transactionId
      if (transactionId && receiptFile) {
        const formData = new FormData();
        formData.append('receipt', receiptFile);
        
        await api.transactions.uploadReceipt(transactionId, formData);
      }
      
      setDepositSuccess(true);
      setDepositAmount('');
      
      // Refresh transactions after a short delay
      setTimeout(() => {
        setOpenDepositDialog(false);
        handleFetchTransactions();
      }, 1500);
      
    } catch (error) {
      console.error("Deposit error:", error);
      setDepositError('Failed to process deposit request. Please try again.');
    } finally {
      setDepositLoading(false);
    }
  };
  
  // Handle view transaction detail
  const handleViewTransaction = (id) => {
    navigate(`/transactions/${id}`);
  };
  
  // Handle back to transaction list
  const handleBackToList = () => {
    navigate('/transactions');
  };
  
  // Handle save user notes
  const handleSaveUserNotes = async () => {
    if (!userNotes.trim()) return;
    
    setNotesError('');
    setNotesSuccess('');
    setSavingNotes(true);
    
    try {
      await api.transactions.addUserNote(transaction.id, userNotes);
      
      // Update local state
      setTransaction(prev => ({
        ...prev,
        userNotes: [
          {
            id: `temp-${Date.now()}`,
            text: userNotes,
            createdAt: new Date().toISOString(),
            userName: 'You'
          },
          ...(prev.userNotes || [])
        ]
      }));
      
      setUserNotes(''); // Clear input
      setNotesSuccess('Note added successfully');
      setEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
      setNotesError(error.message || 'Failed to save your note. Please try again.');
    } finally {
      setSavingNotes(false);
    }
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };
  
  // Handle receipt uploader open
  const handleOpenReceiptUploader = (transaction) => {
    setSelectedTransaction(transaction);
    setReceiptUploaderOpen(true);
  };
  
  // Handle receipt upload success
  const handleReceiptUploadSuccess = () => {
    // Refresh transactions list
    handleFetchTransactions();
  };
  
  // Render transaction details
  const renderTransactionDetail = () => {
    return (
      <TransactionDetails
        transaction={transaction}
        loading={detailLoading}
        error={detailError}
        onBack={handleBackToList}
        onRefresh={fetchTransactionDetail}
      />
    );
  };
  
  // Render transaction list
  const renderTransactionsList = () => {
    return (
      <>
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
        
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}
        
        {/* Filters */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>Filters</Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={3}>
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
                  <MenuItem value="payment">Payment</MenuItem>
                  <MenuItem value="refund">Refund</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={3}>
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
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label="Search"
                value={search}
                onChange={handleSearchChange}
                placeholder="Search by ID, reference, etc."
              />
            </Grid>
            
            <Grid item xs={12} sm={3}>
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
            
            <Grid item xs={12} sm={3}>
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
            
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handleApplyFilters}
                sx={{ mr: 1 }}
              >
                Apply Filters
              </Button>
              <Button
                variant="outlined"
                onClick={handleClearFilters}
              >
                Clear Filters
              </Button>
            </Grid>
          </Grid>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Transaction History</Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : transactions.length > 0 ? (
            <>
              {/* Card view for transactions */}
              <Box sx={{ mb: 3 }}>
                {transactions.map(transaction => (
                  <TransactionCard
                    key={transaction.id || `transaction-${Math.random()}`}
                    transaction={transaction}
                    onViewDetails={handleViewTransaction}
                    onUploadReceipt={handleOpenReceiptUploader}
                  />
                ))}
              </Box>
              
              {/* Pagination */}
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination 
                  count={totalPages} 
                  page={page} 
                  onChange={handlePageChange} 
                  color="primary"
                  disabled={loading}
                />
              </Box>
            </>
          ) : (
            <Alert severity="info">
              No transactions found. Apply filters or make a deposit to get started.
            </Alert>
          )}
        </Paper>
        
        {/* Deposit Dialog */}
        <Dialog
          open={openDepositDialog}
          onClose={handleCloseDepositDialog}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Deposit Funds</DialogTitle>
          <DialogContent>
            {depositError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {depositError}
              </Alert>
            )}
            
            {depositSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Deposit request submitted successfully!
              </Alert>
            )}
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Amount"
                  type="number"
                  value={depositAmount}
                  onChange={handleDepositAmountChange}
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                  }}
                  disabled={depositLoading || depositSuccess}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Payment Method</InputLabel>
                  <Select
                    value={depositMethod}
                    onChange={handleDepositMethodChange}
                    label="Payment Method"
                    disabled={depositLoading || depositSuccess}
                  >
                    <MenuItem value="bank_transfer">Bank Transfer</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ 
                  border: '1px dashed #ccc', 
                  borderRadius: 1, 
                  p: 2, 
                  textAlign: 'center',
                  backgroundColor: '#f9f9f9'
                }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Receipt Image (Required)
                  </Typography>
                  
                  <Button
                    variant="outlined"
                    component="label"
                    disabled={depositLoading || depositSuccess}
                    startIcon={<CloudUploadIcon />}
                  >
                    Upload Receipt
                    <input
                      type="file"
                      hidden
                      onChange={handleFileChange}
                      accept="image/png, image/jpeg, image/jpg, application/pdf"
                    />
                  </Button>
                  
                  {receiptFile && (
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" color="primary">
                        {receiptFile.name}
                      </Typography>
                    </Box>
                  )}
                  
                  {receiptPreview && (
                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                      <img 
                        src={receiptPreview} 
                        alt="Receipt preview" 
                        style={{ 
                          maxWidth: '100%', 
                          maxHeight: '150px', 
                          border: '1px solid #ddd',
                          borderRadius: '4px'
                        }} 
                      />
                    </Box>
                  )}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={handleCloseDepositDialog} 
              disabled={depositLoading}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleDepositSubmit} 
              variant="contained"
              color="primary"
              disabled={!depositAmount || !receiptFile || depositLoading || depositSuccess}
            >
              {depositLoading ? <CircularProgress size={24} /> : 'Submit Request'}
            </Button>
          </DialogActions>
        </Dialog>
        
        {/* Receipt Uploader Dialog */}
        <ReceiptUploader
          open={receiptUploaderOpen}
          transaction={selectedTransaction}
          onClose={() => setReceiptUploaderOpen(false)}
          onSuccess={handleReceiptUploadSuccess}
        />
      </>
    );
  };
  
  return (
    <Box>
      {shouldShowDetail ? renderTransactionDetail() : renderTransactionsList()}
    </Box>
  );
};

export default TransactionsPage; 