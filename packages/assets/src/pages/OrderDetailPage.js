import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Button, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Stepper, Step, StepLabel, CircularProgress, Alert, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle,
  List, ListItem, ListItemText, TextField
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Send as SendIcon
} from '@mui/icons-material';
import api from '@/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../helpers/formatters';
import { useAuth } from '../hooks/useAuth';
import useFetchApi from '../hooks/api/useFetchApi';
import axios from 'axios';

const OrderDetailPage = ({ admin = false }) => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const auth = useAuth() || {};
  const userProfile = auth.userProfile;
  const { token } = auth;
  
  // Theo dõi số lượng request để tránh các lần gọi trùng lặp
  const requestCountRef = useRef(0);
  
  // Theo dõi lần render đầu tiên
  const isFirstRenderRef = useRef(true);
  
  // Tham chiếu để lưu AbortController
  const abortControllerRef = useRef(null);
  
  // Khai báo orderStatusSteps trước khi sử dụng trong useMemo
  const orderStatusSteps = ['pending'];
  
  // Sử dụng useFetchApi với cách thiết lập đúng
  const { 
    data: orderFromHook, 
    loading: hookLoading, 
    error: hookError,
    fetchResource
  } = useFetchApi('/orders', {
    fetchOnMount: false  // Disable automatic fetch on mount
  });

  // Add direct API calling approach as fallback
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Direct API call approach - memoized để tránh tạo lại function khi re-render
  const fetchOrderDirectly = useCallback(async () => {
    // Add more debugging to check what values are available
    console.log('Debug token values:', { 
      orderId, 
      authToken: token,
      hasToken: !!token,
      localStorageToken: localStorage.getItem('token'),
      userEmail: localStorage.getItem('user_email')
    });
    
    const actualToken = token || localStorage.getItem('token');
    
    if (!orderId) {
      console.log('Missing orderId, cannot fetch order');
      setLoading(false);
      setError('Missing order ID');
      return;
    }
    
    if (!actualToken) {
      console.log('Missing authentication token, cannot fetch order');
      setLoading(false);
      setError('Missing authentication token. Please try logging in again.');
      return;
    }
    
    // Hủy request cũ nếu có
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    // Tạo AbortController mới
    abortControllerRef.current = new AbortController();
    
    // Kiểm tra nếu đã có request đang chạy, tránh gọi API nhiều lần
    const currentRequestId = ++requestCountRef.current;
    
    // Thiết lập timeout cho request
    const timeoutId = setTimeout(() => {
      if (abortControllerRef.current) {
        console.log('[OrderDetailPage] Request timeout - aborting');
        abortControllerRef.current.abort();
      }
    }, 15000); // 15 seconds timeout
    
    try {
      setLoading(true);
      console.log('Directly fetching order with ID:', orderId, 'RequestID:', currentRequestId);
      
      // Try using Axios directly for more control
      const API_URL = 'http://localhost:5001/ecoprint1-3cd5c/us-central1/api';
      
      console.log('[OrderDetailPage] Sending API request with axios');
      const response = await axios.get(`${API_URL}/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${actualToken}`,
          'X-User-Email': localStorage.getItem('user_email') || '',
          'X-User-Role': localStorage.getItem('user_role') || 'user'
        },
        signal: abortControllerRef.current.signal
      });
      
      // Xóa timeout khi đã nhận response
      clearTimeout(timeoutId);
      
      // Kiểm tra xem request này có phải là request gần nhất không
      if (currentRequestId !== requestCountRef.current) {
        console.log('Ignoring outdated response for request', currentRequestId);
        return;
      }
      
      console.log('[OrderDetailPage] API response:', response);
      
      if (response.data) {
        let orderData;
        if (response.data.data) {
          orderData = response.data.data;
        } else {
          orderData = response.data;
        }
        
        console.log('Successfully got order data, setting state:', orderData);
        setOrder(orderData);
        setError('');
      } else {
        console.error('No data in response');
        setError('No data returned from server');
      }
    } catch (err) {
      // Xóa timeout khi có lỗi
      clearTimeout(timeoutId);
      
      // Kiểm tra nếu lỗi do hủy request
      if (err.name === 'AbortError' || err.message === 'canceled') {
        console.log('Request was canceled due to component unmount, timeout or new request');
        setError('Request was canceled. Please try again.');
        return;
      }
      
      // Kiểm tra xem request này có phải là request gần nhất không
      if (currentRequestId !== requestCountRef.current) {
        console.log('Ignoring outdated error for request', currentRequestId);
        return;
      }
      
      console.error('Error in direct order fetch:', err);
      
      // Hiển thị thông tin chi tiết hơn về lỗi
      let errorMessage = 'Failed to fetch order details';
      
      if (err.response) {
        const status = err.response.status;
        
        if (status === 401 || status === 403) {
          // Unauthorized error - refresh auth token
          console.log('Authentication error. Refreshing token required.');
          errorMessage = 'Your session may have expired. Please try logging in again.';
          
          // Potentially redirect to login page here
          // navigate('/auth/login');
        } else {
          errorMessage = `Server error: ${status} ${err.response.statusText || ''}`;
        }
        
        console.error('Error response:', err.response.data);
      } else if (err.request) {
        errorMessage = 'No response received from server. Please check your connection.';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      setError(errorMessage);
    } finally {
      // Chỉ cập nhật trạng thái loading nếu là request gần nhất
      if (currentRequestId === requestCountRef.current) {
        console.log('Setting loading to false for request', currentRequestId);
        setLoading(false);
      }
    }
  }, [orderId, token]);
  
  // Try direct API approach only if orderId exists - chỉ chạy khi dependency thay đổi
  useEffect(() => {
    if (orderId) {
      // Đặt lại trạng thái để fetch mới khi orderId thay đổi
      isFirstRenderRef.current = true;
      console.log('Fetching order details for ID:', orderId);
      
      // Gọi trực tiếp fetchOrderDirectly ngay lập tức
      fetchOrderDirectly();
    }
    
    // Cleanup function để hủy request khi component unmount
    return () => {
      if (abortControllerRef.current) {
        console.log('Aborting any in-flight requests');
        abortControllerRef.current.abort();
      }
    };
  }, [orderId, fetchOrderDirectly]);
  
  // Memoize các giá trị phức tạp được tính toán từ order để tránh re-render không cần thiết
  const orderStatusInfo = useMemo(() => {
    if (!order) return { activeStep: -1, isPending: false, canUpdateStatus: false, canPayForOrder: false };
    
    const activeStep = orderStatusSteps.indexOf(order.status);
    const isPending = order.status === 'pending';
    const canUpdateStatus = admin && order.status !== 'cancelled' && order.status !== 'delivered';
    const canPayForOrder = !admin && isPending && !order.paid;
    
    return { activeStep, isPending, canUpdateStatus, canPayForOrder };
  }, [order, admin, orderStatusSteps]);
  
  // Add debugging of order structure
  useEffect(() => {
    if (order) {
      console.log('Order structure:', order);
    }
  }, [order]);
  
  // Helper function to safely format dates - memoized to avoid re-rendering
  const safeFormatDateTime = useCallback((dateValue) => {
    try {
      if (!dateValue) return 'N/A';
      return formatDateTime(dateValue);
    } catch (err) {
      console.error('Error formatting date:', err, dateValue);
      return 'Invalid date';
    }
  }, []);
  
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  
  // For admin status updates
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  
  const handlePayForOrder = useCallback(async () => {
    try {
      setPaymentLoading(true);
      setPaymentError('');
      
      await api.transactions.payOrder(orderId);
      
      setPaymentSuccess(true);
      
      // Làm mới dữ liệu đơn hàng sau khi thanh toán
      fetchOrderDirectly();
      
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError(error.response?.data?.message || 'Payment failed. Please try again later.');
    } finally {
      setPaymentLoading(false);
    }
  }, [orderId, fetchOrderDirectly]);
  
  const handleOpenStatusDialog = useCallback((status) => {
    setNewStatus(status);
    setStatusDialogOpen(true);
  }, []);
  
  const handleCloseStatusDialog = useCallback(() => {
    setStatusDialogOpen(false);
  }, []);
  
  const handleUpdateStatus = useCallback(async () => {
    try {
      setStatusLoading(true);
      setStatusError('');
      
      await api.orders.updateStatus(orderId, newStatus);
      
      // Làm mới dữ liệu đơn hàng sau khi cập nhật trạng thái
      fetchOrderDirectly();
      
      handleCloseStatusDialog();
    } catch (error) {
      console.error('Status update error:', error);
      setStatusError(error.response?.data?.message || 'Failed to update status. Please try again.');
    } finally {
      setStatusLoading(false);
    }
  }, [orderId, newStatus, fetchOrderDirectly, handleCloseStatusDialog]);

  // Additional state for the user comments feature
  const [comment, setComment] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [commentError, setCommentError] = useState('');
  
  const handleSendComment = async () => {
    if (!comment.trim()) return;
    
    try {
      setCommentSending(true);
      setCommentError('');
      
      await api.orders.addComment(orderId, comment.trim());
      
      // Clear the comment field after successful submission
      setComment('');
      
      // Refresh order data to show the new comment
      fetchOrderDirectly();
      
    } catch (err) {
      console.error('Error sending comment:', err);
      setCommentError('Failed to send your comment. Please try again.');
    } finally {
      setCommentSending(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading order details...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Unable to load order details. This might be due to:
        </Typography>
        <ul>
          <li>Network connection issues</li>
          <li>The order ID might be invalid</li>
          <li>You may not have permission to view this order</li>
          <li>The server may be experiencing issues</li>
        </ul>
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
        <Alert severity="warning" sx={{ mb: 2 }}>
          Order not found.
        </Alert>
        <Typography variant="body1" sx={{ mb: 2 }}>
          We couldn't find an order with ID: {orderId}
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
  
  // Dùng destructuring để lấy các giá trị từ orderStatusInfo
  const { activeStep, isPending, canUpdateStatus, canPayForOrder } = orderStatusInfo;

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
                    <TableCell>{safeFormatDateTime(order.createdAt)}</TableCell>
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
            
            {/* Handle for single product model */}
            {order.product && (
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
            )}
            
            {/* Handle for items array (multiple products) */}
            {order.items && order.items.length > 0 && (
              <TableContainer sx={{ mb: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="center">Quantity</TableCell>
                      <TableCell align="right">Price</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            {item.imageUrl && (
                              <Box
                                component="img"
                                src={item.imageUrl}
                                alt={item.name}
                                sx={{ width: 40, height: 40, mr: 2, objectFit: 'contain' }}
                              />
                            )}
                            <Box>
                              <Typography variant="body1">{item.name || 'N/A'}</Typography>
                              {item.sku && (
                                <Typography variant="caption" color="text.secondary">
                                  SKU: {item.sku}
                                </Typography>
                              )}
                            </Box>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            
            {/* If neither product nor items exist, show empty state */}
            {(!order.product && (!order.items || order.items.length === 0)) && (
              <Typography color="text.secondary" align="center" sx={{ py: 2 }}>
                No product information available for this order.
              </Typography>
            )}
            
            {/* Handle product options in a better format */}
            {order.options && Object.keys(order.options).length > 0 && (
              <Box sx={{ mt: 3, border: '1px solid #eee', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Selected Options
                </Typography>
                <Grid container spacing={2}>
                  {Object.entries(order.options).map(([key, value]) => (
                    <Grid item xs={12} sm={6} key={key}>
                      <Typography variant="body2" color="text.secondary" component="span">
                        {key}:
                      </Typography>{' '}
                      <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                        {typeof value === 'object' 
                          ? JSON.stringify(value) 
                          : String(value)}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}
            
            {/* Display Print Options if available */}
            {order.items && order.items.some(item => item.printOptions) && (
              <Box sx={{ mt: 3, border: '1px solid #eee', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Print Options
                </Typography>
                {order.items.map((item, idx) => 
                  item.printOptions && (
                    <Box key={`print-options-${idx}`} sx={{ mb: idx < order.items.length - 1 ? 2 : 0 }}>
                      {item.name && (
                        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 1 }}>
                          {item.name} ({item.quantity}x)
                        </Typography>
                      )}
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6}>
                          <Typography variant="body2" color="text.secondary" component="span">
                            Base Position:
                          </Typography>{' '}
                          <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                            {item.printOptions.basePosition.replace('_', ' ')}
                          </Typography>
                        </Grid>
                        
                        {item.printOptions.additionalPositions && Object.entries(item.printOptions.additionalPositions)
                          .filter(([_, value]) => value.available)
                          .map(([position, details]) => (
                            <Grid item xs={12} sm={6} key={position}>
                              <Typography variant="body2" color="text.secondary" component="span">
                                {position.replace('_', ' ')}:
                              </Typography>{' '}
                              <Typography variant="body2" component="span" sx={{ fontWeight: 'medium' }}>
                                {formatCurrency(details.price)} additional
                              </Typography>
                            </Grid>
                          ))
                        }
                      </Grid>
                    </Box>
                  )
                )}
              </Box>
            )}
            
            {/* Display Customizations if available */}
            {order.customizations && order.customizations.length > 0 && (
              <Box sx={{ mt: 3, border: '1px solid #eee', borderRadius: 1, p: 2 }}>
                <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                  Customizations
                </Typography>
                <Grid container spacing={2}>
                  {order.customizations.map((customization, index) => (
                    <Grid item xs={12} key={index}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                            {customization.type} - {customization.position.replace('_', ' ')}
                          </Typography>
                          {customization.designUrl && (
                            <Typography variant="body2" color="text.secondary">
                              <Link href={customization.designUrl} target="_blank" rel="noopener">
                                View Design
                              </Link>
                            </Typography>
                          )}
                        </Box>
                        <Chip 
                          label={formatCurrency(customization.price)} 
                          color={customization.price > 0 ? 'primary' : 'default'}
                          variant="outlined" 
                          size="small"
                        />
                      </Box>
                    </Grid>
                  ))}
                </Grid>
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
            
            {/* User Comments Section */}
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Communication with Admin
              </Typography>
              
              {/* Existing comments display */}
              {order.userComments && order.userComments.length > 0 ? (
                <List sx={{ bgcolor: 'background.paper', mb: 2, borderRadius: 1, border: '1px solid #eee' }}>
                  {order.userComments.map((userComment) => (
                    <ListItem key={userComment.id} divider alignItems="flex-start">
                      <ListItemText
                        primary={userComment.text}
                        secondary={
                          <React.Fragment>
                            <Typography variant="caption" color="text.secondary">
                              {userComment.createdAt ? new Date(userComment.createdAt).toLocaleString() : 'Unknown date'}
                            </Typography>
                          </React.Fragment>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, fontStyle: 'italic' }}>
                  No communication yet. Use the form below to send a message to admin.
                </Typography>
              )}
              
              {/* Comment input form */}
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Type your message here..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  disabled={commentSending}
                  error={!!commentError}
                  helperText={commentError}
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  onClick={handleSendComment}
                  disabled={commentSending || !comment.trim()}
                  sx={{ mt: 0.5 }}
                >
                  Send
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
              <ShippingIcon sx={{ mr: 1 }} /> Shipping Information
            </Typography>
            
            <Box sx={{ mt: 2, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 'bold', mb: 1 }}>
                {order.shippingAddress?.recipientName || order.shipping?.recipientName || 'Not specified'}
              </Typography>
              <Typography variant="body2">
                {order.shippingAddress?.address || order.shipping?.address || 'Address not provided'}
              </Typography>
              <Typography variant="body2">
                {[
                  order.shippingAddress?.city || order.shipping?.city, 
                  order.shippingAddress?.state || order.shipping?.state, 
                  order.shippingAddress?.zipCode || order.shipping?.zipCode
                ].filter(Boolean).join(', ') || 'Location details not provided'}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Phone: {order.shippingAddress?.phone || order.shipping?.phone || 'Not provided'}
              </Typography>
            </Box>
            
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 'medium' }}>
                  Shipping Method
                </Typography>
                <Typography variant="body2">
                  {(order.shippingAddress?.shippingMethod || order.shipping?.shippingMethod) === 'express' 
                    ? 'Express Shipping (1-2 business days)' 
                    : 'Standard Shipping (3-5 business days)'}
                </Typography>
              </Box>
              <Chip 
                label={(order.shippingAddress?.shippingMethod || order.shipping?.shippingMethod) === 'express' ? 'Express' : 'Standard'} 
                color={(order.shippingAddress?.shippingMethod || order.shipping?.shippingMethod) === 'express' ? 'primary' : 'default'}
                variant="outlined"
              />
            </Box>
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
                      {formatCurrency(
                        // Handle different order structures
                        order.subtotal ||  // Use subtotal if available 
                        (order.items ? order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0) : 0) || // Calculate from items
                        (order.product ? order.product.basePrice * order.quantity : 0) // Legacy structure
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {(order.discounts && order.discounts > 0) && (
                    <TableRow>
                      <TableCell>Discounts</TableCell>
                      <TableCell align="right" sx={{ color: 'success.main' }}>
                        -{formatCurrency(order.discounts)}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {(order.customizationTotal && order.customizationTotal > 0) && (
                    <TableRow>
                      <TableCell>Customizations</TableCell>
                      <TableCell align="right">
                        {formatCurrency(order.customizationTotal)}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  <TableRow>
                    <TableCell>Shipping</TableCell>
                    <TableCell align="right">
                      {formatCurrency(
                        order.shipping?.cost || 
                        order.shippingFee || 
                        (order.shipping?.shippingMethod === 'express' ? 15 : 5) || 
                        0
                      )}
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(
                        order.total || 
                        order.totalPrice || 
                        (order.subtotal + (order.shipping?.cost || order.shippingFee || 0))
                      )}
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