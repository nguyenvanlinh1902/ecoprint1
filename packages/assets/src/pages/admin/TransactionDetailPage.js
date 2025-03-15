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
  TextField
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import ReceiptIcon from '@mui/icons-material/Receipt';
import { formatCurrency, formatDate } from '../../helpers/formatters';
import { useFetchApi } from '../../hooks';
import api from '../../services/api';

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
  
  // Fetch transaction details
  useEffect(() => {
    const fetchTransactionDetails = async () => {
      try {
        const response = await api.admin.getAllTransactions({ id: transactionId });
        
        // Find the specific transaction from the response
        const transactionData = response.data.find(
          t => t.id === transactionId
        ) || response.data[0]; // Fallback to first item if not found by ID
        
        setTransaction(transactionData);
      } catch (error) {
        console.error('Error fetching transaction:', error);
        setError('Failed to load transaction details. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTransactionDetails();
  }, [transactionId]);
  
  // Handle approve transaction
  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await api.transactions.approveDeposit(transactionId);
      setActionSuccess('Transaction approved successfully');
      
      // Update transaction data
      setTransaction({
        ...transaction,
        status: 'approved',
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error approving transaction:', error);
      setError('Failed to approve transaction. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle reject transaction
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      setError('Please provide a reason for rejection');
      return;
    }
    
    setActionLoading(true);
    try {
      await api.transactions.rejectDeposit(transactionId, rejectionReason);
      setActionSuccess('Transaction rejected successfully');
      setOpenDialog(false);
      
      // Update transaction data
      setTransaction({
        ...transaction,
        status: 'rejected',
        rejectionReason,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error rejecting transaction:', error);
      setError('Failed to reject transaction. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };
  
  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'warning';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !transaction) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
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
          label={transaction.status.toUpperCase()}
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
              {transaction.user?.displayName || 'Unknown User'}
            </Typography>
            
            <Typography variant="subtitle2" color="text.secondary">
              Email
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {transaction.user?.email || 'No email provided'}
            </Typography>
            
            <Typography variant="subtitle2" color="text.secondary">
              Method
            </Typography>
            <Typography variant="body1" sx={{ mb: 2 }}>
              {transaction.method || 'Bank Transfer'}
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
              {actionLoading ? 'Processing...' : 'Approve Transaction'}
            </Button>
            
            <Button
              variant="outlined"
              color="error"
              startIcon={<CancelIcon />}
              onClick={() => setOpenDialog(true)}
              disabled={actionLoading}
            >
              Reject Transaction
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* Related Transactions or Notes */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Notes & Related Information
        </Typography>
        
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body2" color="text.secondary">
              {transaction.notes || 'No additional notes for this transaction.'}
            </Typography>
          </CardContent>
        </Card>
      </Box>
      
      {/* Rejection Dialog */}
      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
      >
        <DialogTitle>Reject Transaction</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please provide a reason for rejecting this transaction. This will be visible to the user.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Reason for Rejection"
            fullWidth
            multiline
            rows={3}
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            variant="outlined"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)} disabled={actionLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleReject} 
            color="error" 
            disabled={actionLoading || !rejectionReason.trim()}
          >
            {actionLoading ? 'Processing...' : 'Confirm Rejection'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TransactionDetailPage; 