import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, TextField, Button,
  InputAdornment, CircularProgress, Alert, FormControl, 
  FormLabel, RadioGroup, FormControlLabel, Radio, Card, 
  CardContent, Divider
} from '@mui/material';
import { CreditCard as CreditCardIcon } from '@mui/icons-material';
import api from '../services/api';
import { formatCurrency } from '../helpers/formatters';
import { useAuth } from '../contexts/AuthContext';

const DepositPage = () => {
  const navigate = useNavigate();
  const { userDetails, fetchUserDetails } = useAuth();
  
  // Form state
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('creditCard');
  
  // Credit card details
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  
  // Status state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  
  const handleAmountChange = (e) => {
    const value = e.target.value;
    // Allow only positive numbers with up to 2 decimal places
    if (/^\d*\.?\d{0,2}$/.test(value) || value === '') {
      setAmount(value);
    }
  };
  
  const validateForm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return false;
    }
    
    if (paymentMethod === 'creditCard') {
      if (!cardNumber || cardNumber.length < 16) {
        setError('Please enter a valid card number');
        return false;
      }
      
      if (!cardName) {
        setError('Please enter the cardholder name');
        return false;
      }
      
      if (!expiryDate || !expiryDate.includes('/')) {
        setError('Please enter a valid expiry date (MM/YY)');
        return false;
      }
      
      if (!cvv || cvv.length < 3) {
        setError('Please enter a valid CVV');
        return false;
      }
    }
    
    return true;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const response = await api.post('/api/transactions/deposit', {
        amount: parseFloat(amount),
        paymentMethod,
        paymentDetails: paymentMethod === 'creditCard' ? {
          cardNumber,
          cardName,
          expiryDate,
          cvv
        } : {}
      });
      
      setSuccess(true);
      setTransactionId(response.data.data.transactionId);
      
      // Refresh user details to update balance
      await fetchUserDetails();
      
      // Clear form
      setAmount('');
      setCardNumber('');
      setCardName('');
      setExpiryDate('');
      setCvv('');
      
    } catch (error) {
      console.error('Deposit failed:', error);
      setError(error.response?.data?.message || 'Deposit failed. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCardNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 16) {
      setCardNumber(value);
    }
  };
  
  const handleExpiryDateChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    
    // Format as MM/YY
    if (value.length > 0) {
      if (value.length <= 2) {
        setExpiryDate(value);
      } else {
        setExpiryDate(`${value.slice(0, 2)}/${value.slice(2, 4)}`);
      }
    } else {
      setExpiryDate('');
    }
  };
  
  const handleCvvChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 4) {
      setCvv(value);
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>Deposit Funds</Typography>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            {success ? (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <Typography variant="h5" color="success.main" gutterBottom>
                  Deposit Successful!
                </Typography>
                
                <Typography paragraph>
                  Your deposit of {formatCurrency(parseFloat(amount))} has been processed successfully.
                </Typography>
                
                <Typography variant="body2" sx={{ mb: 3 }}>
                  Transaction ID: {transactionId}
                </Typography>
                
                <Grid container spacing={2} justifyContent="center">
                  <Grid item>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSuccess(false);
                        setTransactionId('');
                      }}
                    >
                      Make Another Deposit
                    </Button>
                  </Grid>
                  <Grid item>
                    <Button
                      variant="contained"
                      onClick={() => navigate('/transactions')}
                    >
                      View Transactions
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            ) : (
              <form onSubmit={handleSubmit}>
                <Typography variant="h6" gutterBottom>
                  Payment Details
                </Typography>
                
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                
                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      label="Deposit Amount"
                      fullWidth
                      required
                      value={amount}
                      onChange={handleAmountChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      helperText="Enter the amount you want to deposit"
                    />
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControl component="fieldset">
                      <FormLabel component="legend">Payment Method</FormLabel>
                      <RadioGroup 
                        row 
                        name="paymentMethod" 
                        value={paymentMethod} 
                        onChange={(e) => setPaymentMethod(e.target.value)}
                      >
                        <FormControlLabel value="creditCard" control={<Radio />} label="Credit Card" />
                        <FormControlLabel value="bankTransfer" control={<Radio />} label="Bank Transfer" />
                      </RadioGroup>
                    </FormControl>
                  </Grid>
                  
                  {paymentMethod === 'creditCard' && (
                    <>
                      <Grid item xs={12}>
                        <TextField
                          label="Card Number"
                          fullWidth
                          required
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          inputProps={{ maxLength: 16 }}
                          placeholder="1234 5678 9012 3456"
                        />
                      </Grid>
                      
                      <Grid item xs={12}>
                        <TextField
                          label="Cardholder Name"
                          fullWidth
                          required
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="John Doe"
                        />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          label="Expiry Date"
                          fullWidth
                          required
                          value={expiryDate}
                          onChange={handleExpiryDateChange}
                          placeholder="MM/YY"
                          inputProps={{ maxLength: 5 }}
                        />
                      </Grid>
                      
                      <Grid item xs={6}>
                        <TextField
                          label="CVV"
                          fullWidth
                          required
                          value={cvv}
                          onChange={handleCvvChange}
                          inputProps={{ maxLength: 4 }}
                          placeholder="123"
                        />
                      </Grid>
                    </>
                  )}
                  
                  {paymentMethod === 'bankTransfer' && (
                    <Grid item xs={12}>
                      <Alert severity="info" sx={{ mb: 2 }}>
                        For bank transfers, you will receive instructions on the next screen.
                      </Alert>
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <Button
                        type="submit"
                        variant="contained"
                        size="large"
                        startIcon={<CreditCardIcon />}
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : 'Process Deposit'}
                      </Button>
                    </Box>
                  </Grid>
                </Grid>
              </form>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Account Balance
              </Typography>
              <Typography variant="h4" color="primary" gutterBottom>
                {formatCurrency(userDetails?.balance || 0)}
              </Typography>
              
              <Divider sx={{ my: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>
                Why Deposit Funds?
              </Typography>
              <Typography variant="body2" paragraph>
                Maintaining a balance in your account allows for quick and seamless order processing without the need to enter payment details for each transaction.
              </Typography>
              
              <Typography variant="subtitle2" gutterBottom>
                Processing Time
              </Typography>
              <Typography variant="body2">
                • Credit Card: Instant
              </Typography>
              <Typography variant="body2" paragraph>
                • Bank Transfer: 1-3 business days
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, fontSize: '0.8rem' }}>
                All transactions are secure and encrypted. For assistance, contact our support team.
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DepositPage; 