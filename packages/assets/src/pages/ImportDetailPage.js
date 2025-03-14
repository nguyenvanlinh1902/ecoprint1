import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Button, Chip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, Divider
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Payment as PaymentIcon
} from '@mui/icons-material';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate } from '../helpers/formatters';
import { useAuth } from '../contexts/AuthContext';

const ImportDetailPage = () => {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const { userDetails } = useAuth();
  
  const [batchDetails, setBatchDetails] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  useEffect(() => {
    const fetchBatchDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch all orders for this batch
        const response = await api.get(`/api/batch-imports/${batchId}/orders`);
        
        setOrders(response.data.data.orders || []);
        setBatchDetails(response.data.data.batchDetails || {});
      } catch (error) {
        console.error('Error fetching batch details:', error);
        setError('Failed to load batch details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchBatchDetails();
  }, [batchId]);
  
  const handlePayBatch = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError('');
      
      await api.post(`/api/batch-imports/${batchId}/pay`);
      
      setPaymentSuccess(true);
      
      // Refresh batch details
      const response = await api.get(`/api/batch-imports/${batchId}/orders`);
      setOrders(response.data.data.orders || []);
      setBatchDetails(response.data.data.batchDetails || {});
      
    } catch (error) {
      console.error('Payment failed:', error);
      setPaymentError(error.response?.data?.message || 'Payment failed. Please try again later.');
    } finally {
      setPaymentLoading(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box>
        <Typography color="error" variant="h6" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/orders')}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }
  
  // Calculate batch totals
  const totalItems = orders.length;
  const totalCost = orders.reduce((sum, order) => sum + order.totalPrice, 0);
  const unpaidOrders = orders.filter(order => !order.paid);
  const unpaidCost = unpaidOrders.reduce((sum, order) => sum + order.totalPrice, 0);
  
  const canPayForBatch = unpaidOrders.length > 0 && userDetails?.balance >= unpaidCost;
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Batch Import Details
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/orders')}
        >
          Back to Orders
        </Button>
      </Box>
      
      {/* Batch Summary */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Typography variant="h6" gutterBottom>
              Batch #{batchId.substring(0, 8)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Created: {formatDate(batchDetails?.createdAt)}
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              File: {batchDetails?.fileName || 'N/A'}
            </Typography>
            
            {paymentError && (
              <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
                {paymentError}
              </Alert>
            )}
            
            {paymentSuccess && (
              <Alert severity="success" sx={{ mt: 2, mb: 2 }}>
                Payment successful! All orders have been paid.
              </Alert>
            )}
            
            {unpaidOrders.length > 0 && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<PaymentIcon />}
                onClick={handlePayBatch}
                disabled={paymentLoading || !canPayForBatch}
                sx={{ mt: 2 }}
              >
                {paymentLoading ? <CircularProgress size={24} /> : `Pay for Unpaid Orders (${unpaidOrders.length})`}
              </Button>
            )}
            
            {unpaidOrders.length > 0 && !canPayForBatch && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Insufficient funds. Your balance: {formatCurrency(userDetails?.balance || 0)}, 
                Required: {formatCurrency(unpaidCost)}
              </Alert>
            )}
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Batch Summary
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={1}>
                <Grid item xs={6}>
                  <Typography variant="body2">Total Orders:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">{totalItems}</Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2">Paid Orders:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">
                    {totalItems - unpaidOrders.length}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2">Unpaid Orders:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">{unpaidOrders.length}</Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2">Total Cost:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right">{formatCurrency(totalCost)}</Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight="bold">Remaining:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" align="right" fontWeight="bold">
                    {formatCurrency(unpaidCost)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Orders List */}
      <Typography variant="h6" sx={{ mb: 2 }}>
        Orders in this Batch
      </Typography>
      
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Order ID</TableCell>
                <TableCell>Product</TableCell>
                <TableCell align="center">Quantity</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Payment</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.id} hover>
                  <TableCell>
                    <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                      {order.id.substring(0, 8)}...
                    </Typography>
                  </TableCell>
                  <TableCell>{order.product?.name || 'N/A'}</TableCell>
                  <TableCell align="center">{order.quantity}</TableCell>
                  <TableCell align="right">{formatCurrency(order.totalPrice)}</TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} />
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={order.paid ? "Paid" : "Unpaid"} 
                      color={order.paid ? "success" : "error"} 
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Button
                      size="small"
                      component={Link}
                      to={`/orders/${order.id}`}
                    >
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default ImportDetailPage; 