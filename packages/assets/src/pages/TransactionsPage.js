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
import api from '@/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime, formatDate } from '../helpers/formatters';
import { useApp } from '../context/AppContext';
import useFetchApi from '../hooks/api/useFetchApi';
import ReceiptUploader from '../components/ReceiptUploader';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

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
  const handleFetchTransactions = () => {
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
    
    // Use direct API call instead of useFetchApi hook
    api.transactions.getAll(params)
      .then(response => {
        console.log('API Response:', response);
        
        // Handle the API response which is nested in success.data
        if (response.data?.success && response.data?.data) {
          const responseData = response.data.data;
          
          if (responseData.transactions) {
            setTransactions(responseData.transactions || []);
          } else {
            setTransactions([]);
          }
          
          if (responseData.pagination) {
            setTotalPages(responseData.pagination.totalPages || responseData.pagination.pages || 1);
          } else {
            setTotalPages(1);
          }
        } else if (response.data?.transactions) {
          // Direct response structure
          setTransactions(response.data.transactions || []);
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.totalPages || response.data.pagination.pages || 1);
          }
        } else {
          // Fallback if data structure is unexpected
          console.warn('Unexpected API response structure:', response.data);
          setTransactions([]);
          setTotalPages(1);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching transactions:", error);
        setError("Failed to load transactions. Please try again.");
        setTransactions([]);
        setLoading(false);
      });
  };
  
  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
    
    const newParams = {
      ...queryParams,
      page: value
    };
    
    setQueryParams(newParams);
    setLoading(true);
    
    // Use direct API call instead of useFetchApi hook
    api.transactions.getAll(newParams)
      .then(response => {
        // Handle the API response which is nested in success.data
        if (response.data?.success && response.data?.data) {
          const responseData = response.data.data;
          
          if (responseData.transactions) {
            setTransactions(responseData.transactions || []);
          } else {
            setTransactions([]);
          }
          
          if (responseData.pagination) {
            setTotalPages(responseData.pagination.totalPages || responseData.pagination.pages || 1);
          } else {
            setTotalPages(1);
          }
        } else if (response.data?.transactions) {
          // Direct response structure
          setTransactions(response.data.transactions || []);
          if (response.data.pagination) {
            setTotalPages(response.data.pagination.totalPages || response.data.pagination.pages || 1);
          }
        } else {
          // Fallback if data structure is unexpected
          console.warn('Unexpected API response structure:', response.data);
          setTransactions([]);
          setTotalPages(1);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error("Error fetching transactions:", error);
        setError("Failed to load transactions. Please try again.");
        setLoading(false);
      });
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
  
  // Render transaction details
  const renderTransactionDetail = () => {
    if (detailLoading) {
      return (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress />
        </Box>
      );
    }
    
    if (detailError) {
      return (
        <Alert severity="error" sx={{ mt: 2 }}>
          {detailError}
        </Alert>
      );
    }
    
    if (!transaction) {
      return (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Transaction not found.
        </Alert>
      );
    }
    
    // Sort notes by date (newest first)
    const adminNotes = [...(transaction.adminNotes || [])].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    const userNotes = [...(transaction.userNotes || [])].sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Combined notes for the timeline view
    const allNotes = [...adminNotes.map(note => ({...note, type: 'admin'})), 
                     ...userNotes.map(note => ({...note, type: 'user'}))]
                    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return (
      <>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={handleBackToList}
            sx={{ mb: 2 }}
          >
            Back to Transactions
          </Button>
          
          <Chip 
            label={(transaction.status || 'unknown').toUpperCase()}
            color={getStatusColor(transaction.status)}
            variant="outlined"
            sx={{ textTransform: 'uppercase' }}
          />
        </Box>
        
        {notesSuccess && (
          <Alert severity="success" sx={{ mb: 3 }}>
            {notesSuccess}
          </Alert>
        )}
        
        {notesError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {notesError}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h5" component="h1" gutterBottom>
                Transaction #{transaction.id.substring(0, 8)}
              </Typography>
              
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {transaction.type || 'Deposit'}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Amount
                  </Typography>
                  <Typography variant="h6" sx={{ mb: 2, color: 'success.main' }}>
                    {formatCurrency(transaction.amount)}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Date
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {formatDate(transaction.createdAt)}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Status
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {transaction.status}
                  </Typography>
                  
                  <Typography variant="subtitle2" color="text.secondary">
                    Method
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {transaction.bankName || 'Bank Transfer'}
                  </Typography>
                  
                  {transaction.description && (
                    <>
                      <Typography variant="subtitle2" color="text.secondary">
                        Description
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {transaction.description}
                      </Typography>
                    </>
                  )}
                </Grid>
              </Grid>
              
              {transaction.status === 'rejected' && (
                <Box sx={{ mt: 2, p: 2, bgcolor: '#fff4f4', borderRadius: 1 }}>
                  <Typography variant="subtitle2" color="error">
                    Rejection Reason:
                  </Typography>
                  <Typography variant="body2">
                    {transaction.rejectionReason || 'No reason provided'}
                  </Typography>
                </Box>
              )}
              
              {/* Receipt Image */}
              {transaction.receiptUrl && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>
                    <ReceiptIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
                    Receipt Image
                  </Typography>
                  <Box 
                    component="img"
                    src={transaction.receiptUrl}
                    alt="Receipt"
                    sx={{
                      maxWidth: '100%',
                      maxHeight: 400,
                      objectFit: 'contain',
                      border: '1px solid #eee',
                      borderRadius: 1
                    }}
                  />
                </Box>
              )}
              
              {/* Transfer Details */}
              {(transaction.transferDate || transaction.reference) && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Transfer Details
                  </Typography>
                  <Grid container spacing={2}>
                    {transaction.transferDate && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Transfer Date
                        </Typography>
                        <Typography variant="body1">
                          {formatDate(transaction.transferDate)}
                        </Typography>
                      </Grid>
                    )}
                    {transaction.reference && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Reference
                        </Typography>
                        <Typography variant="body1">
                          {transaction.reference}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
              <Typography variant="h6" gutterBottom>
                Notes & Comments
              </Typography>
              
              {/* Add Note Form */}
              <Box sx={{ mb: 3 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  placeholder="Add your note..."
                  variant="outlined"
                  disabled={savingNotes}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton 
                          edge="end" 
                          color="primary" 
                          onClick={handleSaveUserNotes}
                          disabled={!userNotes.trim() || savingNotes}
                        >
                          <SendIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{ mb: 2 }}
                />
              </Box>
              
              <Divider sx={{ mb: 2 }} />
              
              {/* Notes Timeline */}
              {allNotes.length > 0 ? (
                <List sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
                  {allNotes.map((note, index) => (
                    <React.Fragment key={note.id || index}>
                      <ListItem alignItems="flex-start" sx={{ px: 0 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: note.type === 'admin' ? 'primary.main' : 'secondary.main' }}>
                            {note.type === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography
                              variant="subtitle2"
                              color={note.type === 'admin' ? 'primary' : 'secondary'}
                            >
                              {note.type === 'admin' ? 'Admin' : (note.userName || 'You')}
                            </Typography>
                          }
                          secondary={
                            <>
                              <Typography
                                component="span"
                                variant="body2"
                                color="text.primary"
                                sx={{ display: 'inline', whiteSpace: 'pre-wrap' }}
                              >
                                {note.text}
                              </Typography>
                              <Typography
                                component="span"
                                variant="caption"
                                color="text.secondary"
                                sx={{ display: 'block', mt: 0.5 }}
                              >
                                {formatDateTime(note.createdAt)}
                              </Typography>
                            </>
                          }
                        />
                      </ListItem>
                      {index < allNotes.length - 1 && <Divider variant="inset" component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', textAlign: 'center' }}>
                  No notes yet
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </>
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
        
        {/* Transactions Table */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>Transaction History</Typography>
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          ) : transactions.length > 0 ? (
            <>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell align="right">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {transactions.map((transaction) => (
                      <TableRow key={transaction.id || `transaction-${Math.random()}`} hover>
                        <TableCell>{transaction.id ? transaction.id.substring(0, 8) + '...' : 'N/A'}</TableCell>
                        <TableCell>{transaction.createdAt ? formatDate(transaction.createdAt) : 'N/A'}</TableCell>
                        <TableCell>
                          {transaction.type 
                            ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
                            : 'N/A'}
                        </TableCell>
                        <TableCell 
                          sx={{ 
                            color: transaction.type === 'deposit' || transaction.type === 'refund' 
                              ? 'success.main' 
                              : transaction.type === 'payment' || transaction.type === 'withdrawal'
                                ? 'error.main' 
                                : 'inherit',
                            fontWeight: 'medium'
                          }}
                        >
                          {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                          {formatCurrency(transaction.amount || 0)}
                        </TableCell>
                        <TableCell>
                          <Chip 
                            label={transaction.status || 'unknown'} 
                            color={getStatusColor(transaction.status)}
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={() => handleViewTransaction(transaction.id)}
                            aria-label="View transaction details"
                            disabled={!transaction.id}
                          >
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Pagination 
                  count={totalPages}
                  page={page}
                  onChange={handlePageChange}
                  color="primary"
                />
              </Box>
            </>
          ) : (
            <Alert severity="info">No transactions found.</Alert>
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