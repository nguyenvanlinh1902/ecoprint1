import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import useHistory from '../../hooks/useHistory';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Divider,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  InputAdornment
} from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import { formatCurrency, formatDate, formatDateTime } from '../../helpers/formatters';
import { useFetchApi } from '../../hooks';
import { api } from '../../helpers';
import { useSafeAdmin } from '../../hooks/useSafeAdmin';

/**
 * Transaction Detail Page for Admin
 * Displays detailed information about a specific transaction
 */
const TransactionDetailPage = () => {
  const { transactionId } = useParams();
  const history = useHistory();
  const [loading, setLoading] = useState(true);
  const [transaction, setTransaction] = useState(null);
  const [error, setError] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  
  // Notes states
  const [adminNote, setAdminNote] = useState('');
  const [addingNote, setAddingNote] = useState(false);
  const [notesError, setNotesError] = useState('');
  const [notesSuccess, setNotesSuccess] = useState('');
  
  // Use safe admin hook to access users data
  const { getUserByEmail, getAllUsers, isContextAvailable } = useSafeAdmin();
  
  // Define fallback icons in case they fail to load
  const FallbackIcon = () => <span>⚠️</span>;
  
  // Create references to the icons
  const ArrowBackIcon = MuiIcons.ArrowBack || FallbackIcon;
  const CheckCircleIcon = MuiIcons.CheckCircle || FallbackIcon;
  const CancelIcon = MuiIcons.Cancel || FallbackIcon;
  const ReceiptIcon = MuiIcons.Receipt || FallbackIcon;
  const EditIcon = MuiIcons.Edit || FallbackIcon;
  const SaveIcon = MuiIcons.Save || FallbackIcon;
  const PersonIcon = MuiIcons.Person || FallbackIcon;
  const AdminPanelSettingsIcon = MuiIcons.AdminPanelSettings || FallbackIcon;
  const SendIcon = MuiIcons.Send || FallbackIcon;
  
  // Fetch transaction details
  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        console.log(`[TransactionDetailPage] Fetching transaction details for ID: ${transactionId}`);
        const response = await api.admin.getTransactionById(transactionId);
        console.log('[TransactionDetailPage] Transaction response:', response);
        
        let transactionData;
        
        // Make sure we access the data correctly and have default values
        if (response.data && response.data.success && response.data.data) {
          console.log('[TransactionDetailPage] Using nested data format');
          transactionData = response.data.data;
        } else if (response.data) {
          console.log('[TransactionDetailPage] Using direct data format');
          transactionData = response.data;
        } else {
          throw new Error('Invalid response format');
        }
        
        console.log('[TransactionDetailPage] Parsed transaction data:', transactionData);
        setTransaction(transactionData);
        
        // If AdminContext is not available, log a warning
        if (!isContextAvailable) {
          console.warn('AdminContext is not available. User data will not be displayed.');
        }
      } catch (error) {
        console.error('[TransactionDetailPage] Error fetching transaction details:', error);
        setError('Failed to load transaction details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactionDetails();
  }, [transactionId, isContextAvailable]);
  
  // Get user data from context based on email
  const userData = transaction?.email ? getUserByEmail(transaction.email) : null;
  
  // Handle approval of transaction
  const handleApprove = async () => {
    try {
      setActionLoading(true);
      setError('');
      setActionSuccess('');
      
      await api.admin.approveTransaction(transactionId);
      
      setActionSuccess('Transaction approved successfully!');
      
      // Update the transaction
      const response = await api.admin.getTransactionById(transactionId);
      
      if (response.data && response.data.success && response.data.data) {
        setTransaction(response.data.data);
      } else if (response.data) {
        setTransaction(response.data);
      }
    } catch (error) {
      console.error('[TransactionDetailPage] Error approving transaction:', error);
      setError('Failed to approve transaction. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle rejection of transaction
  const handleReject = async () => {
    try {
      setActionLoading(true);
      setOpenDialog(false);
      setError('');
      setActionSuccess('');
      
      await api.admin.rejectTransaction(transactionId, { reason: rejectionReason });
      
      setActionSuccess('Transaction rejected successfully!');
      
      // Update the transaction
      const response = await api.admin.getTransactionById(transactionId);
      
      if (response.data && response.data.success && response.data.data) {
        setTransaction(response.data.data);
      } else if (response.data) {
        setTransaction(response.data);
      }
    } catch (error) {
      console.error('[TransactionDetailPage] Error rejecting transaction:', error);
      setError('Failed to reject transaction. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Add admin note
  const handleAddAdminNote = async () => {
    if (!adminNote.trim()) return;
    
    try {
      setAddingNote(true);
      setNotesError('');
      setNotesSuccess('');
      
      console.log('Attempting to add admin note:', { transactionId, adminNote });
      
      const response = await api.admin.addTransactionAdminNote(transactionId, adminNote);
      console.log('Add note response:', response);
      
      setNotesSuccess('Note added successfully!');
      setAdminNote('');
      
      // Update transaction data
      const transactionResponse = await api.admin.getTransactionById(transactionId);
      console.log('Refreshed transaction data:', transactionResponse);
      
      if (transactionResponse.data && transactionResponse.data.success && transactionResponse.data.data) {
        setTransaction(transactionResponse.data.data);
      } else if (transactionResponse.data) {
        setTransaction(transactionResponse.data);
      }
      
      // Clear success message after a delay
      setTimeout(() => {
        setNotesSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error adding admin note:', error);
      setNotesError(error.message || 'Failed to add note. Please try again.');
    } finally {
      setAddingNote(false);
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
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
    <Box>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => history.push('/admin/transactions')}
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
      
      {actionSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {actionSuccess}
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
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
                  Customer
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {userData?.displayName || userData?.name || 'Unknown User'}
                </Typography>
                
                <Typography variant="subtitle2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {transaction.email || userData?.email || 'No email provided'}
                </Typography>
                
                {userData?.phone && (
                  <>
                    <Typography variant="subtitle2" color="text.secondary">
                      Phone
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {userData.phone}
                    </Typography>
                  </>
                )}
                
                <Typography variant="subtitle2" color="text.secondary">
                  Method
                </Typography>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  {transaction.bankName || 'Bank Transfer'}
                </Typography>
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
            
            {/* Action Buttons for Pending Transactions */}
            {transaction.status === 'pending' && (
              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  onClick={handleApprove}
                  disabled={actionLoading}
                >
                  Approve
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<CancelIcon />}
                  onClick={() => setOpenDialog(true)}
                  disabled={actionLoading}
                >
                  Reject
                </Button>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
            <Typography variant="h6" gutterBottom>
              Discussion
            </Typography>
            
            {notesSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                {notesSuccess}
              </Alert>
            )}
            
            {notesError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {notesError}
              </Alert>
            )}
            
            {/* Add Note Form */}
            <Box sx={{ mb: 3 }}>
              <TextField
                fullWidth
                multiline
                rows={2}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add admin note..."
                variant="outlined"
                disabled={addingNote}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        edge="end" 
                        color="primary" 
                        onClick={handleAddAdminNote}
                        disabled={!adminNote.trim() || addingNote}
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
                            {note.type === 'admin' ? 'Admin' : (note.userName || 'User')}
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
      
      {/* Rejection Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Reject Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a reason for rejecting this transaction.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Rejection Reason"
            fullWidth
            multiline
            rows={4}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            disabled={!rejectionReason || actionLoading}
          >
            Reject
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionDetailPage; 