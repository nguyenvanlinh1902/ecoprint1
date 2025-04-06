import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Button, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Stepper, Step, StepLabel, CircularProgress, Alert, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle,
  List, ListItem, ListItemText
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import api from '@/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../helpers/formatters';
import { useAuth } from '../hooks/useAuth';
import useFetchApi from '../hooks/api/useFetchApi';

const OrderDetailPage = ({ admin = false }) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  
  // Sử dụng useFetchApi thay vì gọi API trực tiếp
  const { 
    data: order, 
    loading, 
    error, 
    refetch: refreshOrder 
  } = useFetchApi('orders', {
    fetchOnMount: false
  });
  
  // Fetch order data when orderId changes
  useEffect(() => {
    if (orderId) {
      refreshOrder(orderId);
    }
  }, [orderId, refreshOrder]);
  
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // For admin status updates
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  
  const orderStatusSteps = ['pending', 'processing', 'shipped', 'delivered'];

  const handlePayForOrder = async () => {
    try {
      setPaymentLoading(true);
      setPaymentError('');
      
      await api.transactions.payOrder(orderId);
      
      setPaymentSuccess(true);
      
      // Làm mới dữ liệu đơn hàng sau khi thanh toán
      refreshOrder();
      
    } catch (error) {
      /* error removed */
      setPaymentError(error.response?.data?.message || 'Payment failed. Please try again later.');
    } finally {
      setPaymentLoading(false);
    }
  };
  
  const handleOpenStatusDialog = (status) => {
    setNewStatus(status);
    setStatusDialogOpen(true);
  };
  
  const handleCloseStatusDialog = () => {
    setStatusDialogOpen(false);
  };
  
  const handleUpdateStatus = async () => {
    try {
      setStatusLoading(true);
      setStatusError('');
      
      await api.orders.updateStatus(orderId, newStatus);
      
      // Làm mới dữ liệu đơn hàng sau khi cập nhật trạng thái
      refreshOrder();
      
      handleCloseStatusDialog();
    } catch (error) {
      /* error removed */
      setStatusError(error.response?.data?.message || 'Failed to update status. Please try again.');
    } finally {
      setStatusLoading(false);
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
          onClick={() => navigate(admin ? '/admin/orders' : '/orders')}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }

  if (!order) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Order not found.
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(admin ? '/admin/orders' : '/orders')}
        >
          Back to Orders
        </Button>
      </Box>
    );
  }
  
  const activeStep = orderStatusSteps.indexOf(order.status);
  const canUpdateStatus = admin && order.status !== 'cancelled' && order.status !== 'delivered';
  const isPending = order.status === 'pending';
  const canPayForOrder = !admin && isPending && !order.paid;

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Order #{order.id.substring(0, 8)}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(admin ? '/admin/orders' : '/orders')}
        >
          Back to Orders
        </Button>
      </Box>
      
      {/* Order Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Order Status</Typography>
          <StatusBadge status={order.status} />
        </Box>
        
        <Stepper activeStep={activeStep} alternativeLabel>
          <Step>
            <StepLabel>Pending</StepLabel>
          </Step>
          <Step>
            <StepLabel>Processing</StepLabel>
          </Step>
          <Step>
            <StepLabel>Shipped</StepLabel>
          </Step>
          <Step>
            <StepLabel>Delivered</StepLabel>
          </Step>
        </Stepper>
        
        {order.status === 'cancelled' && (
          <Alert severity="error" sx={{ mt: 2 }}>
            This order has been cancelled.
          </Alert>
        )}
        
        {canUpdateStatus && (
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary"
              onClick={() => handleOpenStatusDialog(orderStatusSteps[activeStep + 1])}
            >
              Update to {orderStatusSteps[activeStep + 1].charAt(0).toUpperCase() + orderStatusSteps[activeStep + 1].slice(1)}
            </Button>
            
            {order.status !== 'cancelled' && (
              <Button 
                variant="outlined" 
                color="error"
                sx={{ ml: 2 }}
                onClick={() => handleOpenStatusDialog('cancelled')}
              >
                Cancel Order
              </Button>
            )}
          </Box>
        )}
        
        {isPending && !order.paid && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            This order is awaiting payment.
          </Alert>
        )}
        
        {canPayForOrder && (
          <Box sx={{ mt: 2 }}>
            {paymentError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {paymentError}
              </Alert>
            )}
            
            {paymentSuccess && (
              <Alert severity="success" sx={{ mb: 2 }}>
                Payment successful! Your order is now being processed.
              </Alert>
            )}
            
            <Button
              variant="contained"
              color="primary"
              onClick={handlePayForOrder}
              disabled={paymentLoading || paymentSuccess}
              startIcon={<ReceiptIcon />}
            >
              {paymentLoading ? <CircularProgress size={24} /> : 'Pay for Order'}
            </Button>
          </Box>
        )}
      </Paper>
      
      {/* Order Details */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Details
            </Typography>
            
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Order ID
                    </TableCell>
                    <TableCell>{order.id}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Date Placed
                    </TableCell>
                    <TableCell>{formatDateTime(order.createdAt)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Status
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Payment Status
                    </TableCell>
                    <TableCell>
                      {order.paid ? (
                        <Chip 
                          icon={<CheckCircleIcon />} 
                          label="Paid" 
                          color="success" 
                          variant="outlined" 
                        />
                      ) : (
                        <Chip label="Unpaid" color="error" variant="outlined" />
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Product Information
            </Typography>
            
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={4}>
                <img 
                  src={order.product?.imageUrl || 'https://via.placeholder.com/150'} 
                  alt={order.product?.name} 
                  style={{ 
                    width: '100%', 
                    height: 'auto', 
                    maxHeight: '150px', 
                    objectFit: 'contain'
                  }} 
                />
              </Grid>
              <Grid item xs={12} sm={8}>
                <Typography variant="h6">{order.product?.name}</Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {order.product?.description}
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Unit Price:
                    </Typography>
                    <Typography>
                      {formatCurrency(order.product?.basePrice)}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Quantity:
                    </Typography>
                    <Typography>
                      {order.quantity}
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
            
            {order.options && Object.keys(order.options).length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Selected Options
                </Typography>
                <List dense>
                  {Object.entries(order.options).map(([key, value]) => (
                    <ListItem key={key} disablePadding>
                      <ListItemText 
                        primary={`${key}: ${value}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
            
            {order.additionalRequirements && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Additional Requirements
                </Typography>
                <Typography variant="body2">
                  {order.additionalRequirements}
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Shipping Information
            </Typography>
            
            <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
              {order.shipping?.recipientName}
            </Typography>
            <Typography variant="body2">
              {order.shipping?.address}
            </Typography>
            <Typography variant="body2">
              {order.shipping?.city}, {order.shipping?.state} {order.shipping?.zipCode}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              Phone: {order.shipping?.phone}
            </Typography>
            
            <Divider sx={{ my: 2 }} />
            
            <Typography variant="subtitle1">
              Shipping Method
            </Typography>
            <Typography variant="body2">
              {order.shipping?.shippingMethod === 'express' 
                ? 'Express Shipping (1-2 business days)' 
                : 'Standard Shipping (3-5 business days)'}
            </Typography>
          </Paper>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>Subtotal</TableCell>
                    <TableCell align="right">
                      {formatCurrency(order.product?.basePrice * order.quantity)}
                    </TableCell>
                  </TableRow>
                  
                  {order.discounts && order.discounts > 0 && (
                    <TableRow>
                      <TableCell>Discounts</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        -{formatCurrency(order.discounts)}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  <TableRow>
                    <TableCell>Shipping</TableCell>
                    <TableCell align="right">
                      {formatCurrency(order.shipping?.cost || 0)}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(order.totalPrice)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Status Update Dialog (Admin only) */}
      <Dialog open={statusDialogOpen} onClose={handleCloseStatusDialog}>
        <DialogTitle>
          Update Order Status
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change the order status to{' '}
            <strong>{newStatus === 'cancelled' ? 'Cancelled' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong>?
            {newStatus === 'cancelled' && (
              ' This action cannot be undone.'
            )}
          </DialogContentText>
          
          {statusError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {statusError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStatusDialog} disabled={statusLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateStatus} 
            color={newStatus === 'cancelled' ? 'error' : 'primary'}
            variant="contained"
            disabled={statusLoading}
          >
            {statusLoading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetailPage; 