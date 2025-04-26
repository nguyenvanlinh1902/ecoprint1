import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Button, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableRow,
  Stepper, Step, StepLabel, CircularProgress, Alert, Dialog,
  DialogActions, DialogContent, DialogContentText, DialogTitle,
  TextField, IconButton, TableHead, List, ListItem, ListItemText
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  LocalShipping as ShippingIcon,
  Receipt as ReceiptIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as TrackingIcon,
  Send as SendIcon
} from '@mui/icons-material';
import { api } from '../../helpers';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../helpers/formatters';
import { useAuth } from '../../hooks/useAuth';
import { useSafeAdmin } from '../../hooks/useSafeAdmin';

const OrderDetailPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getUserByEmail } = useSafeAdmin();
  
  // Order data state
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // UI state
  const [adminNotes, setAdminNotes] = useState('');
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  
  // Status dialog state
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  const [statusError, setStatusError] = useState('');
  
  // Tracking dialog state
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [trackingInfo, setTrackingInfo] = useState({
    carrier: '',
    trackingNumber: '',
    trackingUrl: ''
  });
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState('');
  
  // Comments state
  const [adminReply, setAdminReply] = useState('');
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState('');
  
  const orderStatusSteps = ['pending', 'processing', 'shipped', 'delivered'];
  
  // Fetch order data once on component mount
  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use the admin API endpoint to get the order
        const response = await api.admin.getOrderById(orderId);
        const orderData = response.data.data || response.data;
        
        setOrder(orderData);
        
        // Initialize admin notes if available
        if (orderData.adminNotes) {
          setAdminNotes(orderData.adminNotes);
        }
        
        // Initialize tracking info if available
        if (orderData.tracking) {
          setTrackingInfo({
            trackingNumber: orderData.tracking.trackingNumber || '',
            carrier: orderData.tracking.carrier || '',
            trackingUrl: orderData.tracking.trackingUrl || ''
          });
        }
      } catch (err) {
        console.error('Error fetching order:', err);
        setError(err.response?.data?.message || 'Failed to load order details');
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderData();
  }, [orderId]); // Only depends on orderId, will run once on mount
  
  // Handle user data with memoization to prevent unnecessary recalculations
  const userEmail = order?.email;
  const userData = useMemo(() => {
    return userEmail && getUserByEmail ? getUserByEmail(userEmail) : null;
  }, [userEmail, getUserByEmail]);
  
  // Refresh order data after updates
  const refreshOrder = async () => {
    try {
      setLoading(true);
      const response = await api.admin.getOrderById(orderId);
      const orderData = response.data.data || response.data;
      setOrder(orderData);
      
      // Refresh admin notes if they weren't being edited
      if (!editingNotes && orderData.adminNotes) {
        setAdminNotes(orderData.adminNotes);
      }
    } catch (err) {
      console.error('Error refreshing order:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle status updates
  const handleStatusDialogOpen = (status) => {
    setNewStatus(status);
    setStatusDialogOpen(true);
  };
  
  const handleStatusDialogClose = () => {
    setStatusDialogOpen(false);
    setStatusLoading(false);
    setStatusError('');
  };
  
  const handleUpdateStatus = async () => {
    if (!newStatus) return;
    
    setStatusLoading(true);
    setStatusError('');
    
    try {
      await api.admin.updateOrderStatus(orderId, newStatus);
      handleStatusDialogClose();
      await refreshOrder();
    } catch (error) {
      setStatusError(error.response?.data?.message || 'Failed to update status. Please try again.');
    } finally {
      setStatusLoading(false);
    }
  };
  
  // Handle tracking updates
  const handleTrackingDialogOpen = () => {
    setTrackingDialogOpen(true);
  };
  
  const handleTrackingDialogClose = () => {
    setTrackingDialogOpen(false);
    setTrackingLoading(false);
    setTrackingError('');
  };
  
  const handleTrackingInfoChange = (e) => {
    const { name, value } = e.target;
    setTrackingInfo((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleUpdateTracking = async () => {
    setTrackingLoading(true);
    setTrackingError('');
    
    try {
      await api.admin.updateOrderTracking(orderId, trackingInfo);
      handleTrackingDialogClose();
      await refreshOrder();
    } catch (error) {
      setTrackingError(error.response?.data?.message || 'Failed to update tracking information.');
    } finally {
      setTrackingLoading(false);
    }
  };
  
  // Handle admin notes
  const handleSaveNotes = async () => {
    setNotesLoading(true);
    
    try {
      await api.admin.updateOrderNotes(orderId, adminNotes);
      setEditingNotes(false);
      await refreshOrder();
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setNotesLoading(false);
    }
  };
  
  // Handle sending replies to customer
  const handleSendReply = async () => {
    if (!adminReply.trim()) return;
    
    try {
      setReplySending(true);
      setReplyError('');
      
      await api.orders.addComment(orderId, adminReply.trim());
      
      // Clear the reply field after successful submission
      setAdminReply('');
      
      // Refresh order data
      await refreshOrder();
    } catch (err) {
      console.error('Error sending reply:', err);
      setReplyError('Failed to send your reply. Please try again.');
    } finally {
      setReplySending(false);
    }
  };
  
  const getNextStatus = () => {
    if (!order || !order.status) return null;
    
    const currentIndex = orderStatusSteps.indexOf(order.status);
    
    if (currentIndex === -1 || currentIndex === orderStatusSteps.length - 1) {
      return null;
    }
    
    return orderStatusSteps[currentIndex + 1];
  };
  
  if (loading && !order) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error && !order) {
    return (
      <Box>
        <Button 
          component={Link} 
          to="/admin/orders"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Orders
        </Button>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  if (!order) {
    return (
      <Box>
        <Button 
          component={Link} 
          to="/admin/orders"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Orders
        </Button>
        <Alert severity="error">Order not found.</Alert>
      </Box>
    );
  }
  
  const nextStatus = getNextStatus();
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          component={Link} 
          to="/admin/orders"
          startIcon={<ArrowBackIcon />}
        >
          Back to Orders
        </Button>
        
        <Box>
          {order.status !== 'cancelled' && nextStatus && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleStatusDialogOpen(nextStatus)}
              sx={{ mr: 1 }}
            >
              Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </Button>
          )}
          
          {order.status === 'pending' && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleStatusDialogOpen('cancelled')}
            >
              Cancel Order
            </Button>
          )}
        </Box>
      </Box>
      
      {loading && (
        <Box sx={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999 }}>
          <CircularProgress />
        </Box>
      )}
      
      <Typography variant="h4" gutterBottom>
        Order #{order.id.substring(0, 8)}
      </Typography>
      
      {/* Order Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ mr: 2 }}>
                Status:
              </Typography>
              <StatusBadge status={order.status} size="large" />
            </Box>
          </Grid>
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
              <Typography variant="body2" color="text.secondary">
                Order Date: {formatDateTime(order.createdAt)}
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      <Grid container spacing={3}>
        {/* Order Info and Items */}
        <Grid item xs={12} md={8}>
          {/* Order Items */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Items
            </Typography>
            
            <TableContainer>
              <Table>
                <TableBody>
                  {order.items && order.items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell sx={{ width: '30%' }}>
                        <Typography variant="subtitle2">Product</Typography>
                      </TableCell>
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
                            <Typography variant="body2" color="text.secondary">
                              {formatCurrency(item.price)} × {item.quantity}
                            </Typography>
                            {item.sku && (
                              <Typography variant="caption" color="text.secondary">
                                SKU: {item.sku}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                  
                  {order.customizations && order.customizations.length > 0 && (
                    <TableRow>
                      <TableCell>
                        <Typography variant="subtitle2">Customizations</Typography>
                      </TableCell>
                      <TableCell>
                        <Grid container spacing={1}>
                          {order.customizations.map((customization, index) => (
                            <Grid item xs={12} key={index}>
                              <Typography variant="body2">
                                <strong>{customization.type}:</strong> {customization.position}
                                {customization.price > 0 && ` - ${formatCurrency(customization.price)}`}
                              </Typography>
                            </Grid>
                          ))}
                        </Grid>
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {order.notes && (
                    <TableRow>
                      <TableCell>
                        <Typography variant="subtitle2">Additional Notes</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {order.notes}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Shipping Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Shipping Information
              </Typography>
              
              {(order.status === 'processing' || order.status === 'shipped') && (
                <Button
                  startIcon={<TrackingIcon />}
                  variant="outlined"
                  size="small"
                  onClick={handleTrackingDialogOpen}
                >
                  {order.tracking?.trackingNumber ? 'Update Tracking' : 'Add Tracking'}
                </Button>
              )}
            </Box>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Recipient</TableCell>
                    <TableCell>{order.shippingAddress?.recipientName || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Address</TableCell>
                    <TableCell>
                      {order.shippingAddress?.address}
                      {order.shippingAddress?.city && order.shippingAddress?.state && (
                        <Box>
                          {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}
                        </Box>
                      )}
                      {order.shippingAddress?.country && <Box>{order.shippingAddress.country}</Box>}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                    <TableCell>{order.shippingAddress?.phone || 'N/A'}</TableCell>
                  </TableRow>
                  {order.shippingAddress?.email && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                      <TableCell>{order.shippingAddress.email}</TableCell>
                    </TableRow>
                  )}
                  {order.shippingAddress?.method && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Shipping Method</TableCell>
                      <TableCell>{order.shippingAddress.method}</TableCell>
                    </TableRow>
                  )}
                  {order.tracking?.carrier && order.tracking?.trackingNumber && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Tracking</TableCell>
                      <TableCell>
                        {order.tracking.carrier}: {order.tracking.trackingNumber}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          {/* Customer Information */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <TableContainer component={Paper} sx={{ mb: 3 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'background.light' }}>
                    <TableCell colSpan={2}>
                      <Typography variant="subtitle1">Customer Information</Typography>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>Company</TableCell>
                    <TableCell>{userData?.companyName || order?.companyName || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Contact Name</TableCell>
                    <TableCell>{userData?.displayName || userData?.name || order?.customerName || 'Unknown Customer'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                    <TableCell>{order?.email || userData?.email || 'No email provided'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Phone</TableCell>
                    <TableCell>{userData?.phone || order?.phone || 'No phone provided'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Customer Since</TableCell>
                    <TableCell>{formatDate(userData?.createdAt) || formatDate(order?.createdAt) || 'N/A'}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        
        {/* Order Summary and Actions */}
        <Grid item xs={12} md={4}>
          {/* Order Summary */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <TableContainer>
              <Table size="small">
                <TableBody>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Subtotal</TableCell>
                    <TableCell align="right">
                      {formatCurrency(order.subtotal)}
                    </TableCell>
                  </TableRow>
                  
                  {order.customizationTotal > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Customizations</TableCell>
                      <TableCell align="right">
                        {formatCurrency(order.customizationTotal)}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {order.shippingFee > 0 && (
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Shipping</TableCell>
                      <TableCell align="right">
                        {formatCurrency(order.shippingFee)}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                      {formatCurrency(order.total)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
            
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Payment Status
              </Typography>
              <Chip 
                label={order.paymentStatus === "paid" ? "Paid" : "Unpaid"} 
                color={order.paymentStatus === "paid" ? "success" : "error"} 
                size="small"
                variant="outlined"
                sx={{ fontWeight: 'bold' }}
              />
              {order.paymentMethod && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Payment Method: {order.paymentMethod}
                </Typography>
              )}
              {order.transactionId && (
                <Typography variant="body2" color="text.secondary">
                  Transaction ID: {order.transactionId}
                </Typography>
              )}
            </Box>
          </Paper>
          
          {/* Admin Notes */}
          <Paper sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Admin Notes
              </Typography>
              
              {editingNotes ? (
                <Box>
                  <IconButton 
                    size="small" 
                    color="primary" 
                    onClick={handleSaveNotes}
                    disabled={notesLoading}
                  >
                    <SaveIcon fontSize="small" />
                  </IconButton>
                  <IconButton 
                    size="small"
                    onClick={() => {
                      setEditingNotes(false);
                      setAdminNotes(order.adminNotes || '');
                    }}
                    disabled={notesLoading}
                  >
                    <CancelIcon fontSize="small" />
                  </IconButton>
                </Box>
              ) : (
                <IconButton 
                  size="small" 
                  onClick={() => setEditingNotes(true)}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              )}
            </Box>
            
            {editingNotes ? (
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                multiline
                rows={4}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Add private notes about this order (only visible to admins)"
              />
            ) : (
              adminNotes ? (
                <Typography variant="body2">
                  {adminNotes}
                </Typography>
              ) : (
                <Typography variant="body2" color="text.secondary" fontStyle="italic">
                  No admin notes for this order.
                </Typography>
              )
            )}
          </Paper>
          
          {/* User Comments */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">
                Customer Communication
              </Typography>
            </Box>
            
            {order.userComments && order.userComments.length > 0 ? (
              <List sx={{ bgcolor: 'background.paper', borderRadius: 1, mb: 3 }}>
                {order.userComments.map((userComment) => (
                  <ListItem key={userComment.id} divider alignItems="flex-start">
                    <ListItemText
                      primary={userComment.text}
                      secondary={
                        <React.Fragment>
                          <Typography variant="caption" color="text.secondary">
                            {userComment.createdAt ? new Date(userComment.createdAt).toLocaleString() : 'Unknown date'} by {userComment.userEmail || 'Customer'}
                          </Typography>
                        </React.Fragment>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="text.secondary" fontStyle="italic" sx={{ mb: 3 }}>
                No messages from the customer yet.
              </Typography>
            )}
            
            {/* Admin reply form */}
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Reply to Customer
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Type your reply here..."
                  value={adminReply}
                  onChange={(e) => setAdminReply(e.target.value)}
                  disabled={replySending}
                  error={!!replyError}
                  helperText={replyError}
                  size="small"
                  sx={{ flexGrow: 1 }}
                />
                <Button
                  variant="contained"
                  color="primary"
                  endIcon={<SendIcon />}
                  onClick={handleSendReply}
                  disabled={replySending || !adminReply.trim()}
                  size="small"
                  sx={{ mt: 0.5 }}
                >
                  Send
                </Button>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>
      
      {/* Status Update Dialog */}
      <Dialog open={statusDialogOpen} onClose={handleStatusDialogClose}>
        <DialogTitle>
          Update Order Status
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change the order status to{' '}
            <strong>{newStatus === 'cancelled' ? 'Cancelled' : newStatus.charAt(0).toUpperCase() + newStatus.slice(1)}</strong>?
            {newStatus === 'cancelled' && (
              ' This action cannot be undone and may affect inventory levels.'
            )}
          </DialogContentText>
          
          {statusError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {statusError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStatusDialogClose} disabled={statusLoading}>
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
      
      {/* Tracking Information Dialog */}
      <Dialog open={trackingDialogOpen} onClose={handleTrackingDialogClose}>
        <DialogTitle>
          {order.tracking?.carrier ? 'Update Tracking Information' : 'Add Tracking Information'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Carrier"
                name="carrier"
                value={trackingInfo.carrier}
                onChange={handleTrackingInfoChange}
                fullWidth
                placeholder="e.g. FedEx, UPS, USPS"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Tracking Number"
                name="trackingNumber"
                value={trackingInfo.trackingNumber}
                onChange={handleTrackingInfoChange}
                fullWidth
                placeholder="e.g. 1Z999AA10123456784"
              />
            </Grid>
          </Grid>
          
          {trackingError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {trackingError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleTrackingDialogClose} disabled={trackingLoading}>
            Cancel
          </Button>
          <Button
            onClick={handleUpdateTracking}
            color="primary"
            variant="contained"
            disabled={trackingLoading || !trackingInfo.carrier || !trackingInfo.trackingNumber}
          >
            {trackingLoading ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default OrderDetailPage; 