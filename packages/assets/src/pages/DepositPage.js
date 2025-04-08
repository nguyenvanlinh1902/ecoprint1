import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider
} from '@mui/material';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { LocalizationProvider, DatePicker } from '@mui/x-date-pickers';
import api from '@/api';

const DepositPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    amount: '',
    bankName: '',
    transferDate: new Date(),
    reference: '',
    note: '',
    email: localStorage.getItem('user_email')
  });
  const [receiptFile, setReceiptFile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState(null);
  const [step, setStep] = useState(1); // 1 = deposit details, 2 = upload receipt
  const [receiptPreview, setReceiptPreview] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleDateChange = (date) => {
    setFormData({
      ...formData,
      transferDate: date
    });
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

  const handleSubmitDeposit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!formData.amount || !formData.bankName) {
      setError('Please fill in all required fields');
      setLoading(false);
      return;
    }

    if (isNaN(formData.amount) || Number(formData.amount) <= 0) {
      setError('Amount must be a positive number');
      setLoading(false);
      return;
    }

    try {
      const response = await api.transactions.requestDeposit(formData);
      
      // Check for transactionId in the response
      if (response && response.data && response.data.transactionId) {
        setTransactionId(response.data.transactionId);
        setStep(2);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (err) {
      console.error("Deposit request error:", err);
      setError(err.response?.data?.error || 'Failed to create deposit request. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!receiptFile) {
      setError('Please select a receipt file - this is required to process your deposit');
      setLoading(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('receipt', receiptFile);

      await api.transactions.uploadReceipt(transactionId, formData);
      setSuccess(true);
      setTimeout(() => {
        navigate('/transactions');
      }, 3000);
    } catch (err) {
      console.error("Receipt upload error:", err);
      
      // Handle common error cases
      if (err.response?.data?.error?.includes('Missing required fields')) {
        setError('Receipt image is required. Please select a valid image file.');
      } else if (err.response?.data?.error?.includes('Receipt image is required')) {
        setError('The selected file could not be processed. Please try again with a different image.');
      } else {
        setError(err.response?.data?.error || 'Failed to upload receipt. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography component="h1" variant="h5" gutterBottom>
            Deposit Funds
          </Typography>
          <Divider sx={{ mb: 4 }} />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Deposit request submitted successfully! Redirecting to transactions page...
            </Alert>
          )}

          {step === 1 && (
            <Box component="form" onSubmit={handleSubmitDeposit} noValidate>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Amount"
                    name="amount"
                    type="number"
                    fullWidth
                    required
                    value={formData.amount}
                    onChange={handleChange}
                    inputProps={{ min: "0", step: "0.01" }}
                  />
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Bank Name</InputLabel>
                    <Select
                      name="bankName"
                      value={formData.bankName}
                      onChange={handleChange}
                      label="Bank Name"
                    >
                      <MenuItem value=""></MenuItem>
                      <MenuItem value="Vietcombank">Vietcombank</MenuItem>
                      <MenuItem value="BIDV">BIDV</MenuItem>
                      <MenuItem value="Techcombank">Techcombank</MenuItem>
                      <MenuItem value="VPBank">VPBank</MenuItem>
                      <MenuItem value="ACB">ACB</MenuItem>
                      <MenuItem value="MBBank">MB Bank</MenuItem>
                      <MenuItem value="TPBank">TPBank</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} md={6}>
                  <LocalizationProvider dateAdapter={AdapterDateFns}>
                    <DatePicker
                      label="Transfer Date"
                      value={formData.transferDate}
                      onChange={handleDateChange}
                      renderInput={(params) => (
                        <TextField {...params} fullWidth required />
                      )}
                    />
                  </LocalizationProvider>
                </Grid>

                <Grid item xs={12} md={6}>
                  <TextField
                    label="Reference/Transaction ID"
                    name="reference"
                    fullWidth
                    value={formData.reference}
                    onChange={handleChange}
                    helperText="Optional: Enter bank transaction reference ID"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <TextField
                    label="Note"
                    name="note"
                    fullWidth
                    multiline
                    rows={3}
                    value={formData.note}
                    onChange={handleChange}
                    helperText="Optional: Additional information about your deposit"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Box sx={{ mt: 2, background: '#f5f5f5', p: 2, borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Bank Account Details for Transfer:
                    </Typography>
                    <Typography variant="body2">
                      Account Name: EcoPrint Company
                      <br />
                      Account Number: 1234567890
                      <br />
                      Bank: Vietcombank
                      <br />
                      Branch: Ho Chi Minh City
                      <br />
                      Message: [Your Email Address]
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Button
                type="submit"
                variant="contained"
                fullWidth
                sx={{ mt: 3 }}
                disabled={loading}
              >
                {loading ? 'Submitting...' : 'Next: Upload Receipt'}
              </Button>
            </Box>
          )}

          {step === 2 && (
            <Box component="form" onSubmit={handleSubmitReceipt} noValidate>
              <Alert severity="warning" sx={{ mb: 3, fontWeight: 'bold' }}>
                Please upload a screenshot or photo of your bank transfer receipt. This step is required to process your deposit request.
              </Alert>
              
              <Box sx={{ 
                border: '2px dashed #1976d2', 
                borderRadius: 2, 
                p: 3, 
                mb: 3, 
                backgroundColor: '#f5f9ff',
                textAlign: 'center' 
              }}>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Upload Receipt Image
                </Typography>
                
                <Button
                  variant="contained"
                  component="label"
                  sx={{ mb: 2 }}
                >
                  Select Receipt File
                  <input
                    type="file"
                    hidden
                    onChange={handleFileChange}
                    accept="image/png, image/jpeg, image/jpg, application/pdf"
                  />
                </Button>
                
                {receiptFile && (
                  <Box sx={{ mt: 2, mb: 1 }}>
                    <Typography variant="body2" color="primary" fontWeight="bold">
                      Selected file: {receiptFile.name}
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
                        maxHeight: '250px', 
                        border: '1px solid #ddd',
                        borderRadius: '4px'
                      }} 
                    />
                  </Box>
                )}
                
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                  Accepted formats: JPG, PNG, PDF (max 10MB)
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
                <Button 
                  variant="outlined" 
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={loading || !receiptFile}
                  sx={{ fontWeight: 'bold' }}
                >
                  {loading ? 'Uploading...' : 'Submit Deposit Request'}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default DepositPage; 