import React, { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  TextField,
  IconButton,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Receipt as ReceiptIcon,
  Send as SendIcon,
  Person as PersonIcon,
  AdminPanelSettings as AdminPanelSettingsIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate, formatDateTime } from '../../helpers/formatters';
import api from '@/api';

/**
 * Transaction Details Component
 * Displays detailed information about a transaction and allows adding notes
 */
const TransactionDetails = ({
  transaction,
  loading,
  error,
  onBack,
  onRefresh
}) => {
  const [userNote, setUserNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteError, setNoteError] = useState('');
  const [noteSuccess, setNoteSuccess] = useState('');

  // Get status color based on transaction status
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

  // Handle saving user notes
  const handleSaveUserNote = async () => {
    if (!userNote.trim()) return;
    
    try {
      setSavingNote(true);
      setNoteError('');
      setNoteSuccess('');
      
      await api.transactions.addUserNote(transaction.id, userNote);
      
      setNoteSuccess('Note added successfully!');
      setUserNote('');
      
      // Refresh transaction data
      if (onRefresh) onRefresh();
      
      // Clear success message after a delay
      setTimeout(() => {
        setNoteSuccess('');
      }, 3000);
    } catch (error) {
      console.error('Error adding note:', error);
      setNoteError(error.message || 'Failed to add note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
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

  // Prepare notes for display
  const adminNotes = [...(transaction.adminNotes || [])].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  const userNotes = [...(transaction.userNotes || [])].sort((a, b) => 
    new Date(b.createdAt) - new Date(a.createdAt)
  );
  
  // Combined notes for the timeline view, sorted by date (newest first)
  const allNotes = [
    ...adminNotes.map(note => ({...note, type: 'admin'})), 
    ...userNotes.map(note => ({...note, type: 'user'}))
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
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
      
      {noteSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {noteSuccess}
        </Alert>
      )}
      
      {noteError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {noteError}
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
                <Typography variant="h6" sx={{ mb: 2, color: transaction.type === 'deposit' ? 'success.main' : 'error.main' }}>
                  {transaction.type === 'withdrawal' || transaction.type === 'payment' ? '-' : '+'}{formatCurrency(transaction.amount)}
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
                value={userNote}
                onChange={(e) => setUserNote(e.target.value)}
                placeholder="Add your note..."
                variant="outlined"
                disabled={savingNote}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton 
                        edge="end" 
                        color="primary" 
                        onClick={handleSaveUserNote}
                        disabled={!userNote.trim() || savingNote}
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

export default TransactionDetails; 