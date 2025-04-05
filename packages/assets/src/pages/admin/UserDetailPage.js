import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Button, Chip, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  CircularProgress, Alert, TextField, Tab, Tabs, Card, CardContent,
  Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
  List, ListItem, ListItemText
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Person as PersonIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
  Key as KeyIcon
} from '@mui/icons-material';
import api from '@/api';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency, formatDate, formatDateTime } from '../../helpers/formatters';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`user-tab-${index}`}
      aria-labelledby={`user-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const UserDetailPage = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState(0);
  
  // Edit profile state
  const [editMode, setEditMode] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    phone: '',
    companyName: '',
    companyAddress: '',
    companyVat: '',
    role: ''
  });
  
  // Status dialog state
  const [statusDialog, setStatusDialog] = useState({
    open: false,
    action: '',
    loading: false,
    error: ''
  });
  
  // Reset password dialog state
  const [resetPasswordDialog, setResetPasswordDialog] = useState({
    open: false,
    loading: false,
    error: '',
    success: false
  });
  
  // Recent orders state
  const [recentOrders, setRecentOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  
  // Transaction history state
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  
  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        setLoading(true);
        setError(''); // Xóa lỗi cũ nếu có
        
        console.log('Fetching user details for userId:', userId);
        // Sử dụng admin.getUserById từ api client thay vì gọi trực tiếp
        const response = await api.admin.getUserById(userId);
        
        console.log('User details response:', response);
        
        if (response.data && response.data.success && response.data.data) {
          const userData = response.data.data;
          setUser(userData);
          setUserProfile({
            name: userData.name || userData.displayName || '',
            email: userData.email || '',
            phone: userData.phone || '',
            companyName: userData.companyName || '',
            companyAddress: userData.companyAddress || '',
            companyVat: userData.companyVat || '',
            role: userData.role || 'user'
          });
        } else {
          // Xử lý khi API trả về success: false
          throw new Error(response.data?.message || 'Failed to load user data');
        }
      } catch (error) {
        console.error('Error fetching user details:', error);
        setError(error.response?.data?.message || error.message || 'Failed to load user details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUserDetails();
    } else {
      setError('User ID is missing or invalid');
      setLoading(false);
    }
  }, [userId]);
  
  useEffect(() => {
    if (activeTab === 1) {
      fetchRecentOrders();
    } else if (activeTab === 2) {
      fetchTransactions();
    }
  }, [activeTab]);
  
  const fetchRecentOrders = async () => {
    try {
      setOrdersLoading(true);
      // Sử dụng phương thức từ api.admin 
      const response = await api.admin.getUserOrders(userId, { limit: 5 });
      
      if (response.data && response.data.success) {
        setRecentOrders(response.data.data || []);
      } else {
        console.warn('No orders data found or unexpected response format');
        setRecentOrders([]);
      }
    } catch (error) {
      console.error('Error fetching user orders:', error);
      // Không hiển thị lỗi cho người dùng, chỉ ghi log
      setRecentOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  };
  
  const fetchTransactions = async () => {
    try {
      setTransactionsLoading(true);
      // Sử dụng phương thức từ api.admin
      const response = await api.admin.getUserTransactions(userId, { limit: 5 });
      
      if (response.data && response.data.success) {
        setTransactions(response.data.data || []);
      } else {
        console.warn('No transactions data found or unexpected response format');
        setTransactions([]);
      }
    } catch (error) {
      console.error('Error fetching user transactions:', error);
      // Không hiển thị lỗi cho người dùng, chỉ ghi log
      setTransactions([]);
    } finally {
      setTransactionsLoading(false);
    }
  };
  
  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserProfile(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleSaveProfile = async () => {
    try {
      setError('');
      setSuccess('');
      
      console.log('Updating user profile for userId:', userId, 'with data:', userProfile);
      
      // Sử dụng phương thức từ api client
      const response = await api.admin.updateUser(userId, userProfile);
      
      if (response.data && response.data.success) {
        setUser(prev => ({...prev, ...userProfile}));
        setEditMode(false);
        setSuccess('User profile updated successfully');
      } else {
        throw new Error(response.data?.message || 'Failed to update user profile');
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      setError(error.response?.data?.message || error.message || 'Failed to update user profile. Please try again.');
    }
  };
  
  const handleStatusDialogOpen = (action) => {
    setStatusDialog({
      ...statusDialog,
      open: true,
      action,
      error: ''
    });
  };
  
  const handleStatusDialogClose = () => {
    setStatusDialog({
      ...statusDialog,
      open: false,
      loading: false
    });
  };
  
  const handleUpdateStatus = async () => {
    try {
      setStatusDialog({
        ...statusDialog,
        loading: true,
        error: ''
      });
      
      const response = await api.patch(`/api/admin/users/${userId}/status`, {
        status: statusDialog.action
      });
      
      setUser(response.data.data);
      setSuccess(`User status updated to ${statusDialog.action}`);
      handleStatusDialogClose();
    } catch (error) {
      /* error removed */
      setStatusDialog({
        ...statusDialog,
        loading: false,
        error: 'Failed to update user status. Please try again.'
      });
    }
  };
  
  const handleResetPasswordDialogOpen = () => {
    setResetPasswordDialog({
      open: true,
      loading: false,
      error: '',
      success: false
    });
  };
  
  const handleResetPasswordDialogClose = () => {
    setResetPasswordDialog({
      ...resetPasswordDialog,
      open: false
    });
  };
  
  const handleResetPassword = async () => {
    try {
      setResetPasswordDialog({
        ...resetPasswordDialog,
        loading: true,
        error: '',
        success: false
      });
      
      await api.post(`/api/admin/users/${userId}/reset-password`);
      
      setResetPasswordDialog({
        ...resetPasswordDialog,
        loading: false,
        success: true
      });
    } catch (error) {
      /* error removed */
      setResetPasswordDialog({
        ...resetPasswordDialog,
        loading: false,
        error: 'Failed to reset user password. Please try again.'
      });
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (!user) {
    return (
      <Box>
        <Button 
          component={Link} 
          to="/admin/users"
          startIcon={<ArrowBackIcon />}
          sx={{ mb: 2 }}
        >
          Back to Users
        </Button>
        <Alert severity="error">User not found.</Alert>
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Button 
          component={Link} 
          to="/admin/users"
          startIcon={<ArrowBackIcon />}
        >
          Back to Users
        </Button>
        
        <Box>
          {user.status === 'pending' && (
            <Button
              variant="contained"
              color="success"
              onClick={() => handleStatusDialogOpen('approved')}
              sx={{ mr: 1 }}
              startIcon={<CheckCircleIcon />}
            >
              Approve
            </Button>
          )}
          
          {user.status !== 'active' && user.status !== 'pending' && (
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleStatusDialogOpen('active')}
              sx={{ mr: 1 }}
              startIcon={<CheckCircleIcon />}
            >
              Activate
            </Button>
          )}
          
          {user.status === 'active' && (
            <Button
              variant="outlined"
              color="error"
              onClick={() => handleStatusDialogOpen('inactive')}
              sx={{ mr: 1 }}
              startIcon={<BlockIcon />}
            >
              Deactivate
            </Button>
          )}
          
          <Button
            variant="outlined"
            color="primary"
            onClick={handleResetPasswordDialogOpen}
            startIcon={<KeyIcon />}
          >
            Reset Password
          </Button>
        </Box>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Typography variant="h4" gutterBottom>
        User Details
      </Typography>
      
      <Paper sx={{ mb: 3 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={activeTab} onChange={handleTabChange} aria-label="user tabs">
            <Tab label="Profile" id="user-tab-0" aria-controls="user-tabpanel-0" />
            <Tab label="Orders" id="user-tab-1" aria-controls="user-tabpanel-1" />
            <Tab label="Transactions" id="user-tab-2" aria-controls="user-tabpanel-2" />
          </Tabs>
        </Box>
        
        {/* Profile Tab */}
        <TabPanel value={activeTab} index={0}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <StatusBadge status={user.status} size="large" sx={{ mr: 2 }} />
              <Chip 
                label={user.role.charAt(0).toUpperCase() + user.role.slice(1)} 
                color={user.role === 'admin' ? 'secondary' : 'default'}
                variant="outlined"
              />
            </Box>
            
            {!editMode ? (
              <Button
                startIcon={<EditIcon />}
                onClick={() => setEditMode(true)}
              >
                Edit Profile
              </Button>
            ) : (
              <Box>
                <Button
                  color="primary"
                  startIcon={<SaveIcon />}
                  onClick={handleSaveProfile}
                  sx={{ mr: 1 }}
                >
                  Save
                </Button>
                <Button
                  startIcon={<CancelIcon />}
                  onClick={() => {
                    setEditMode(false);
                    setUserProfile({
                      name: user.name || '',
                      email: user.email || '',
                      phone: user.phone || '',
                      companyName: user.companyName || '',
                      companyAddress: user.companyAddress || '',
                      companyVat: user.companyVat || '',
                      role: user.role || 'user'
                    });
                  }}
                >
                  Cancel
                </Button>
              </Box>
            )}
          </Box>
          
          <Divider sx={{ mb: 3 }} />
          
          <Grid container spacing={3}>
            {editMode ? (
              // Edit form
              <>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Full Name"
                    name="name"
                    value={userProfile.name}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Email"
                    name="email"
                    value={userProfile.email}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    type="email"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Phone"
                    name="phone"
                    value={userProfile.phone}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Company Name"
                    name="companyName"
                    value={userProfile.companyName}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="Company Address"
                    name="companyAddress"
                    value={userProfile.companyAddress}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                    multiline
                    rows={2}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    label="VAT/Tax ID"
                    name="companyVat"
                    value={userProfile.companyVat}
                    onChange={handleInputChange}
                    fullWidth
                    margin="normal"
                  />
                </Grid>
              </>
            ) : (
              // Profile view
              <>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Personal Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Full Name" 
                            secondary={user.name || 'Not provided'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Email" 
                            secondary={user.email} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Phone" 
                            secondary={user.phone || 'Not provided'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Account Created" 
                            secondary={formatDate(user.createdAt)} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Last Login" 
                            secondary={user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Company Information
                      </Typography>
                      <List dense>
                        <ListItem>
                          <ListItemText 
                            primary="Company Name" 
                            secondary={user.companyName || 'Not provided'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="Company Address" 
                            secondary={user.companyAddress || 'Not provided'} 
                          />
                        </ListItem>
                        <ListItem>
                          <ListItemText 
                            primary="VAT/Tax ID" 
                            secondary={user.companyVat || 'Not provided'} 
                          />
                        </ListItem>
                      </List>
                    </CardContent>
                  </Card>
                </Grid>
                
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        Account Summary
                      </Typography>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={4}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                            <Typography variant="h4">{user.orderCount || 0}</Typography>
                            <Typography variant="body2">Total Orders</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                            <Typography variant="h4">{formatCurrency(user.totalSpent || 0)}</Typography>
                            <Typography variant="body2">Total Spent</Typography>
                          </Paper>
                        </Grid>
                        <Grid item xs={12} sm={4}>
                          <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'background.default' }}>
                            <Typography variant="h4">{formatCurrency(user.accountBalance || 0)}</Typography>
                            <Typography variant="body2">Account Balance</Typography>
                          </Paper>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              </>
            )}
          </Grid>
        </TabPanel>
        
        {/* Orders Tab */}
        <TabPanel value={activeTab} index={1}>
          <Box sx={{ mb: 2 }}>
            <Button 
              component={Link} 
              to={`/admin/orders?userId=${userId}`}
              variant="outlined"
            >
              View All Orders
            </Button>
          </Box>
          
          {ordersLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : recentOrders.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Product</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentOrders.map((order) => (
                    <TableRow key={order.id} hover>
                      <TableCell>{order.id.substring(0, 8)}...</TableCell>
                      <TableCell>{order.product?.name || 'N/A'}</TableCell>
                      <TableCell>{formatDate(order.createdAt)}</TableCell>
                      <TableCell align="right">{formatCurrency(order.totalPrice)}</TableCell>
                      <TableCell>
                        <StatusBadge status={order.status} />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          component={Link}
                          to={`/admin/orders/${order.id}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No orders found for this user.</Alert>
          )}
        </TabPanel>
        
        {/* Transactions Tab */}
        <TabPanel value={activeTab} index={2}>
          <Box sx={{ mb: 2 }}>
            <Button 
              component={Link} 
              to={`/admin/transactions?userId=${userId}`}
              variant="outlined"
            >
              View All Transactions
            </Button>
          </Box>
          
          {transactionsLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress />
            </Box>
          ) : transactions.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Transaction ID</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {transactions.map((transaction) => (
                    <TableRow key={transaction.id} hover>
                      <TableCell>{transaction.id.substring(0, 8)}...</TableCell>
                      <TableCell>{transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}</TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell align="right" sx={{ 
                        color: transaction.type === 'deposit' || transaction.type === 'refund' 
                          ? 'success.main' 
                          : transaction.type === 'payment' 
                            ? 'error.main' 
                            : 'inherit'
                      }}>
                        {transaction.type === 'deposit' || transaction.type === 'refund' ? '+' : '-'}
                        {formatCurrency(transaction.amount)}
                      </TableCell>
                      <TableCell>{formatDateTime(transaction.createdAt)}</TableCell>
                      <TableCell>
                        <StatusBadge status={transaction.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Alert severity="info">No transactions found for this user.</Alert>
          )}
        </TabPanel>
      </Paper>
      
      {/* Status Update Dialog */}
      <Dialog
        open={statusDialog.open}
        onClose={handleStatusDialogClose}
      >
        <DialogTitle>
          Update User Status
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to change this user's status to{' '}
            <strong>{statusDialog.action}</strong>?
            {statusDialog.action === 'inactive' && (
              ' This will prevent the user from logging in and placing orders.'
            )}
          </DialogContentText>
          
          {statusDialog.error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {statusDialog.error}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleStatusDialogClose} disabled={statusDialog.loading}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateStatus} 
            color={statusDialog.action === 'inactive' ? 'error' : 'primary'}
            variant="contained"
            disabled={statusDialog.loading}
          >
            {statusDialog.loading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Reset Password Dialog */}
      <Dialog
        open={resetPasswordDialog.open}
        onClose={handleResetPasswordDialogClose}
      >
        <DialogTitle>
          Reset User Password
        </DialogTitle>
        <DialogContent>
          {!resetPasswordDialog.success ? (
            <>
              <DialogContentText>
                This will send a password reset link to {user.email}. The user will be able to set a new password through this link.
              </DialogContentText>
              
              {resetPasswordDialog.error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {resetPasswordDialog.error}
                </Alert>
              )}
            </>
          ) : (
            <Alert severity="success" sx={{ mt: 2 }}>
              Password reset email has been sent to {user.email}.
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleResetPasswordDialogClose}>
            {resetPasswordDialog.success ? 'Close' : 'Cancel'}
          </Button>
          {!resetPasswordDialog.success && (
            <Button 
              onClick={handleResetPassword} 
              color="primary"
              variant="contained"
              disabled={resetPasswordDialog.loading}
            >
              {resetPasswordDialog.loading ? <CircularProgress size={24} /> : 'Send Reset Link'}
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserDetailPage; 