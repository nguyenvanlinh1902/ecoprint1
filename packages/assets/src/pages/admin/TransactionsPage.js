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
  Clear as ClearIcon,
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon
} from '@mui/icons-material';
import api from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../../helpers/formatters';
import { useAdmin } from '../../context/AdminContext';
import { useSafeAdmin } from '../../hooks/useSafeAdmin';

const TransactionsPage = () => {
  const navigate = useNavigate();
  const { transactionId } = useParams();
  const location = useLocation();
  const { getAllUsers, refreshUsers } = useAdmin();
  
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
  
  // Transaction approval/rejection
  const [approveLoading, setApproveLoading] = useState(false);
  const [rejectLoading, setRejectLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  
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
      setError('');
      
      console.log(`[TransactionsPage] Fetching details for transaction ID: ${id}`);
      
      // Sử dụng endpoint admin đã được cấu hình
      const response = await api.admin.getTransactionById(id);
      
      console.log(`[TransactionsPage] Transaction details response:`, response);
      
      // Handle both new and legacy response formats
      if (response && response.data) {
        console.log(`[TransactionsPage] Response data structure:`, JSON.stringify(response.data).substring(0, 100) + '...');
        
        if (response.data.success && response.data.data) {
          // New format with nested data
          console.log(`[TransactionsPage] Using new response format with nested data`);
          setSelectedTransaction(response.data.data);
          setSuccess('');
        } else if (response.data.id) {
          // Legacy format where data is directly in response.data
          console.log(`[TransactionsPage] Using legacy response format with direct data`);
          setSelectedTransaction(response.data);
          setSuccess('');
        } else {
          console.error(`[TransactionsPage] Invalid response format:`, response.data);
          setError('Không tìm thấy thông tin giao dịch');
          setSelectedTransaction(null);
        }
      } else {
        console.error('[TransactionsPage] Unexpected API response structure:', response);
        setError('Định dạng dữ liệu không đúng. Vui lòng liên hệ quản trị viên.');
      }
    } catch (error) {
      console.error('[TransactionsPage] Error fetching transaction details:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          error.friendlyMessage || 
                          'Không thể tải chi tiết giao dịch. Vui lòng thử lại sau.';
      setError(errorMessage);
      setSelectedTransaction(null);
    } finally {
      setLoadingDetails(false);
    }
  };
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Xây dựng tham số truy vấn
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
      
      if (userId) {
        params.userId = userId;
      }
      
      if (dateRange.startDate) {
        params.startDate = dateRange.startDate;
      }
      
      if (dateRange.endDate) {
        params.endDate = dateRange.endDate;
      }
      
      // Sử dụng endpoint admin đã được cấu hình
      const response = await api.admin.getAllTransactions(params);
      
      // Properly handle API response structure
      if (response.data && response.data.success && response.data.data) {
        // Get data from the nested structure
        const { transactions, pagination } = response.data.data;
        
        setTransactions(transactions || []);
        setTotalPages(pagination?.totalPages || 1);
        
        // Clear error và success message nếu thành công
        setError('');
      } else if (response.data) {
        // Legacy format support
        setTransactions(response.data.transactions || []);
        const pagination = response.data.pagination || {};
        setTotalPages(pagination.totalPages || 1);
        setError('');
      } else {
        setTransactions([]);
        setTotalPages(1);
        console.error('Unexpected API response structure:', response);
        setError('Định dạng dữ liệu không đúng. Vui lòng liên hệ quản trị viên.');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      const errorMessage = error.response?.data?.message || 
                           error.response?.data?.error || 
                           error.friendlyMessage || 
                           'Không thể tải danh sách giao dịch. Vui lòng thử lại sau.';
      setError(errorMessage);
      setTransactions([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchUsers = () => {
    // Lấy toàn bộ danh sách users từ context
    const allUsers = getAllUsers();
    if (allUsers && allUsers.length > 0) {
      // Không cần lọc theo role, hiển thị tất cả user trong dropdown
      setUsers(allUsers);
    } else {
      // Nếu chưa có dữ liệu, refresh để lấy
      refreshUsers().then(() => {
        setUsers(getAllUsers());
      }).catch(error => {
        console.error('Error fetching users:', error);
      });
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
      
      const response = await api.admin.addTransaction(newTransaction);
      
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
    console.log('[TransactionsPage] Viewing transaction details for:', transaction.id);
    
    // Store transaction in localStorage for fallback
    try {
      localStorage.setItem('current_transaction', JSON.stringify(transaction));
      console.log('[TransactionsPage] Stored transaction in localStorage for fallback');
    } catch (error) {
      console.error('[TransactionsPage] Error storing transaction in localStorage:', error);
    }
    
    navigate(`/admin/transactions/${transaction.id}`);
  };
  
  const handleBackToList = () => {
    navigate('/admin/transactions');
  };
  
  const handleApproveTransaction = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await api.admin.approveTransaction(selectedTransaction.id);
      
      // Handle both response formats
      if (response && response.data) {
        // New success format with nested data
        if (response.data.success) {
          setSuccess(response.data.message || response.data.data?.message || 'Transaction approved successfully');
          
          // Update the approved transaction
          if (selectedTransaction) {
            setSelectedTransaction({
              ...selectedTransaction,
              status: 'approved'
            });
          }
          
          // Refresh transaction list
          fetchTransactions();
        } 
        // Legacy format
        else if (response.data.message) {
          setSuccess(response.data.message || 'Transaction approved successfully');
          
          if (selectedTransaction) {
            setSelectedTransaction({
              ...selectedTransaction,
              status: 'approved'
            });
          }
          
          fetchTransactions();
        }
        else {
          console.error('Error approving transaction:', response);
          setError(response.data.message || response.data.error || 'Failed to approve transaction');
        }
      } else {
        console.error('Unexpected API response:', response);
        setError('Unexpected API response. Please try again.');
      }
    } catch (error) {
      console.error('Error approving transaction:', error);
      const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Failed to approve transaction';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const handleOpenRejectDialog = () => {
    setRejectDialogOpen(true);
    setRejectReason('');
  };
  
  const handleCloseRejectDialog = () => {
    setRejectDialogOpen(false);
  };
  
  const handleRejectTransaction = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Call reject API
      const response = await api.admin.rejectTransaction(selectedTransaction.id, { reason: rejectReason });
      
      // Handle both response formats
      if (response && response.data) {
        // New format with success flag
        if (response.data.success) {
          setSuccess(response.data.message || response.data.data?.message || 'Transaction rejected successfully');
          
          // Update transaction status
          if (selectedTransaction) {
            setSelectedTransaction({
              ...selectedTransaction,
              status: 'rejected',
              rejectionReason: rejectReason
            });
          }
          
          // Refresh transaction list
          fetchTransactions();
          
          // Reset rejection reason and close dialog
          setRejectReason('');
          setRejectDialogOpen(false);
        }
        // Legacy format
        else if (response.data.message) {
          setSuccess(response.data.message || 'Transaction rejected successfully');
          
          if (selectedTransaction) {
            setSelectedTransaction({
              ...selectedTransaction,
              status: 'rejected',
              rejectionReason: rejectReason
            });
          }
          
          fetchTransactions();
          setRejectReason('');
          setRejectDialogOpen(false);
        }
        else {
          console.error('Error rejecting transaction:', response);
          setError(response.data.message || response.data.error || 'Failed to reject transaction');
        }
      } else {
        console.error('Unexpected API response:', response);
        setError('Unexpected API response. Please try again.');
      }
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      const errorMessage = error.response?.data?.message || 
                            error.response?.data?.error || 
                            error.message || 
                            'Failed to reject transaction';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  // Render transaction details view
  const renderTransactionDetails = () => {
    // Add fallback support from localStorage if API call fails
    useEffect(() => {
      if (!selectedTransaction && !loadingDetails && transactionId) {
        console.log('[TransactionsPage] No transaction data from API, attempting to use localStorage fallback');
        try {
          const savedTransaction = localStorage.getItem('current_transaction');
          if (savedTransaction) {
            const parsedTransaction = JSON.parse(savedTransaction);
            if (parsedTransaction.id === transactionId) {
              console.log('[TransactionsPage] Using localStorage fallback data for transaction');
              setSelectedTransaction(parsedTransaction);
            } else {
              console.log('[TransactionsPage] Saved transaction ID does not match current ID');
            }
          }
        } catch (error) {
          console.error('[TransactionsPage] Error reading from localStorage:', error);
        }
      }
    }, [selectedTransaction, loadingDetails, transactionId]);

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
    
    const isPending = selectedTransaction.status === 'pending';
    const isDeposit = selectedTransaction.type === 'deposit';
    const showApproveReject = isPending && isDeposit;
    
    return (
      <Paper sx={{ p: 3, width: '100%' }}>
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
        
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button 
            startIcon={<ArrowBackIcon />} 
            onClick={handleBackToList}
          >
            Back to Transactions
          </Button>
          
          {showApproveReject && (
            <Box>
              <Button 
                variant="contained" 
                color="success"
                startIcon={<ApproveIcon />}
                onClick={handleApproveTransaction}
                disabled={approveLoading}
                sx={{ mr: 1 }}
              >
                {approveLoading ? 'Approving...' : 'Approve'}
              </Button>
              <Button 
                variant="contained" 
                color="error"
                startIcon={<RejectIcon />}
                onClick={handleOpenRejectDialog}
                disabled={rejectLoading}
              >
                {rejectLoading ? 'Rejecting...' : 'Reject'}
              </Button>
            </Box>
          )}
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
              {selectedTransaction.user ? 
                `${selectedTransaction.user.name} (${selectedTransaction.user.email})` : 
                selectedTransaction.email || selectedTransaction.userId}
            </Typography>
          </Grid>
          
          {selectedTransaction.user && selectedTransaction.user.phone && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                User Phone
              </Typography>
              <Typography variant="body1">
                {selectedTransaction.user.phone}
              </Typography>
            </Grid>
          )}
          
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
          
          {selectedTransaction.bankName && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Bank Name
              </Typography>
              <Typography variant="body1">
                {selectedTransaction.bankName}
              </Typography>
            </Grid>
          )}
          
          {selectedTransaction.reference && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Reference
              </Typography>
              <Typography variant="body1">
                {selectedTransaction.reference}
              </Typography>
            </Grid>
          )}
          
          {selectedTransaction.transferDate && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle2" color="text.secondary">
                Transfer Date
              </Typography>
              <Typography variant="body1">
                {formatDateTime(selectedTransaction.transferDate)}
              </Typography>
            </Grid>
          )}
          
          {selectedTransaction.receiptUrl && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="text.secondary">
                Receipt
              </Typography>
              <Box sx={{ mt: 1 }}>
                <a href={selectedTransaction.receiptUrl} target="_blank" rel="noopener noreferrer">
                  <img 
                    src={selectedTransaction.receiptUrl} 
                    alt="Receipt" 
                    style={{ maxWidth: '300px', maxHeight: '300px', border: '1px solid #eee' }} 
                  />
                </a>
              </Box>
            </Grid>
          )}
          
          {selectedTransaction.rejectionReason && (
            <Grid item xs={12}>
              <Typography variant="subtitle2" color="error">
                Rejection Reason
              </Typography>
              <Typography variant="body1">
                {selectedTransaction.rejectionReason}
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
                          {user.displayName || user.email} ({user.email})
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
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    name="description"
                    label="Description"
                    fullWidth
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
                color="primary" 
                variant="contained"
                disabled={addLoading || !newTransaction.userId || !newTransaction.amount}
              >
                {addLoading ? 'Processing...' : 'Add Transaction'}
              </Button>
            </DialogActions>
          </Dialog>
          
          {/* Rejection Dialog */}
          <Dialog open={rejectDialogOpen} onClose={handleCloseRejectDialog}>
            <DialogTitle>Reject Transaction</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Please provide a reason for rejecting this transaction:
              </DialogContentText>
              <TextField
                autoFocus
                margin="dense"
                fullWidth
                multiline
                rows={3}
                label="Reason for Rejection"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseRejectDialog}>Cancel</Button>
              <Button 
                onClick={handleRejectTransaction} 
                variant="contained" 
                color="error"
                disabled={!rejectReason.trim() || rejectLoading}
              >
                {rejectLoading ? 'Rejecting...' : 'Reject Transaction'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      )}
    </Box>
  );
};

export default TransactionsPage; 