import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Grid,
  Button,
  IconButton
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Receipt as ReceiptIcon
} from '@mui/icons-material';
import { formatCurrency, formatDate } from '../../helpers/formatters';

/**
 * Transaction Card Component
 * Displays a summary of transaction information in a card format
 */
const TransactionCard = ({ 
  transaction, 
  onViewDetails,
  onUploadReceipt
}) => {
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

  // Check if it's a deposit/credit or a withdrawal/debit
  const isCredit = transaction.type === 'deposit' || transaction.type === 'refund';
  const isDebit = transaction.type === 'withdrawal' || transaction.type === 'payment';
  
  return (
    <Card sx={{ mb: 2, position: 'relative' }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" component="div" gutterBottom>
              Transaction #{transaction.id ? transaction.id.substring(0, 8) : 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(transaction.createdAt)}
            </Typography>
          </Box>
          
          <Chip 
            label={(transaction.status || 'unknown').toUpperCase()}
            color={getStatusColor(transaction.status)}
            size="small"
            variant="outlined"
          />
        </Box>
        
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Type
            </Typography>
            <Typography variant="body1">
              {transaction.type 
                ? transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)
                : 'N/A'}
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Amount
            </Typography>
            <Typography 
              variant="body1" 
              fontWeight="medium"
              color={isCredit ? 'success.main' : isDebit ? 'error.main' : 'inherit'}
            >
              {isCredit ? '+' : isDebit ? '-' : ''}
              {formatCurrency(transaction.amount || 0)}
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Method
            </Typography>
            <Typography variant="body1">
              {transaction.bankName || 'Bank Transfer'}
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Typography variant="subtitle2" color="text.secondary">
              Reference
            </Typography>
            <Typography variant="body1" noWrap sx={{ maxWidth: '100%' }}>
              {transaction.reference || 'N/A'}
            </Typography>
          </Grid>
        </Grid>
        
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
          {transaction.status === 'pending' && transaction.type === 'deposit' && !transaction.receiptUrl && (
            <Button 
              variant="outlined" 
              color="primary"
              size="small"
              startIcon={<ReceiptIcon />}
              onClick={() => onUploadReceipt(transaction)}
            >
              Upload Receipt
            </Button>
          )}
          
          <Button 
            variant="contained" 
            color="primary"
            size="small"
            startIcon={<VisibilityIcon />}
            onClick={() => onViewDetails(transaction.id)}
          >
            View Details
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
};

export default TransactionCard; 