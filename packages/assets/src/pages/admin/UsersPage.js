import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton,
  TextField, InputAdornment, FormControl, InputLabel, 
  Select, MenuItem, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, CircularProgress, Pagination, Alert
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  Clear as RejectIcon
} from '@mui/icons-material';
import api from '@/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../helpers/formatters';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = {
        page, 
        limit: 10 // Users per page
      };
      
      if (status) {
        params.status = status;
      }
      
      if (search) {
        params.search = search;
      }
      
      // Use admin API endpoint from configured service
      const response = await api.admin.getUsers(params);
      
      // Check response data structure
      if (response.data && response.data.data) {
        setUsers(response.data.data.users || []);
        setTotalPages(response.data.data.totalPages || 1);
      } else if (response.data) {
        // Simpler data structure
        setUsers(response.data.users || []);
        setTotalPages(response.data.totalPages || 1);
      } else {
        // Fallback
        setUsers([]);
        setTotalPages(1);
        console.error('Unexpected API response structure:', response);
      }
      
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Unable to load user list. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchUsers();
  }, [page, status]);
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 when searching
    fetchUsers();
  };
  
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };
  
  const handleDialogOpen = (action, user) => {
    setDialogAction(action);
    setSelectedUser(user);
    setDialogOpen(true);
  };
  
  const handleDialogClose = () => {
    setDialogOpen(false);
    setActionLoading(false);
  };
  
  const handleUserAction = async () => {
    if (!selectedUser) return;
    
    setActionLoading(true);
    setError('');
    
    try {
      console.log(`Performing ${dialogAction} on user:`, selectedUser.id);
      
      switch (dialogAction) {
        case 'approve':
          await api.admin.approveUser(selectedUser.id);
          break;
        case 'reject':
          await api.admin.rejectUser(selectedUser.id);
          break;
        case 'activate':
          await api.admin.updateUserStatus(selectedUser.id, 'active');
          break;
        case 'deactivate':
          await api.admin.updateUserStatus(selectedUser.id, 'inactive');
          break;
        default:
          break;
      }
      
      // Set success message
      const actionText = dialogAction === 'approve' ? 'approved' : 
                        dialogAction === 'reject' ? 'rejected' :
                        dialogAction === 'activate' ? 'activated' : 'deactivated';
      
      // Refresh user list
      await fetchUsers();
      handleDialogClose();
      
      // Show success message
      setSuccess(`User ${selectedUser.companyName || 'selected'} was successfully ${actionText}.`);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
    } catch (error) {
      console.error(`Error ${dialogAction} user:`, error);
      setError(`Failed to ${dialogAction} user. ${error.response?.data?.message || 'Please try again later.'}`);
    } finally {
      setActionLoading(false);
    }
  };
  
  const getDialogTitle = () => {
    switch (dialogAction) {
      case 'approve':
        return 'Approve User';
      case 'reject':
        return 'Reject User';
      case 'activate':
        return 'Activate User';
      case 'deactivate':
        return 'Deactivate User';
      default:
        return 'Confirm Action';
    }
  };
  
  const getDialogContent = () => {
    if (!selectedUser) return '';
    
    switch (dialogAction) {
      case 'approve':
        return `Are you sure you want to approve ${selectedUser.companyName}? This will give them full access to the platform.`;
      case 'reject':
        return `Are you sure you want to reject ${selectedUser.companyName}? They will not be able to access the platform.`;
      case 'activate':
        return `Are you sure you want to activate ${selectedUser.companyName}? This will restore their access to the platform.`;
      case 'deactivate':
        return `Are you sure you want to deactivate ${selectedUser.companyName}? This will temporarily revoke their access to the platform.`;
      default:
        return 'Are you sure you want to perform this action?';
    }
  };
  
  const renderStatus = (status) => {
    switch (status) {
      case 'active':
        return <StatusBadge status="active" label="Active" />;
      case 'inactive':
        return <StatusBadge status="inactive" label="Inactive" />;
      case 'pending':
        return <StatusBadge status="pending" label="Pending" />;
      case 'suspended':
        return <StatusBadge status="suspended" label="Suspended" />;
      case 'deleted':
        return <StatusBadge status="deleted" label="Deleted" />;
      default:
        return <StatusBadge status="unknown" label="Unknown" />;
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Users Management
      </Typography>
      
      {/* Success message */}
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      {/* Error message */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={4}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon fontSize="small" />
                    </InputAdornment>
                  ),
                }}
              />
            </form>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={handleStatusChange}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="suspended">Suspended</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={4}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSearchSubmit}
              sx={{ height: 40 }}
            >
              Search
            </Button>
            
            <Button
              variant="outlined"
              onClick={() => {
                setSearch('');
                setStatus('');
                setPage(1);
              }}
              sx={{ ml: 1, height: 40 }}
            >
              Reset
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Users Table */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>User Details</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Registration Date</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <CircularProgress size={40} />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1">No users found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {user.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                        {user.companyName || user.displayName || 'N/A'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {user.email}
                      </Typography>
                      {user.phone && (
                        <Typography variant="body2" color="text.secondary">
                          {user.phone}
                        </Typography>
                      )}
                    </TableCell>
                    
                    <TableCell>
                      {renderStatus(user.status)}
                    </TableCell>
                    
                    <TableCell>
                      <Chip
                        size="small"
                        label={user.role === 'admin' ? 'Admin' : 'User'}
                        color={user.role === 'admin' ? 'secondary' : 'default'}
                        variant="outlined"
                      />
                    </TableCell>
                    
                    <TableCell>
                      {formatDate(user.createdAt)}
                    </TableCell>
                    
                    <TableCell>
                      <IconButton
                        component={Link}
                        to={`/admin/users/${user.id}`}
                        color="primary"
                        size="small"
                        title="View Details"
                      >
                        <VisibilityIcon fontSize="small" />
                      </IconButton>
                      
                      {user.status === 'pending' && (
                        <>
                          <IconButton
                            color="success"
                            size="small"
                            title="Approve User"
                            onClick={() => handleDialogOpen('approve', user)}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                          
                          <IconButton
                            color="error"
                            size="small"
                            title="Reject User"
                            onClick={() => handleDialogOpen('reject', user)}
                          >
                            <RejectIcon fontSize="small" />
                          </IconButton>
                        </>
                      )}
                      
                      {user.status === 'active' && (
                        <IconButton
                          color="warning"
                          size="small"
                          title="Deactivate User"
                          onClick={() => handleDialogOpen('deactivate', user)}
                        >
                          <BlockIcon fontSize="small" />
                        </IconButton>
                      )}
                      
                      {user.status === 'inactive' && (
                        <IconButton
                          color="success"
                          size="small"
                          title="Activate User"
                          onClick={() => handleDialogOpen('activate', user)}
                        >
                          <ApproveIcon fontSize="small" />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        {!loading && users.length > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <Pagination
              count={totalPages}
              page={page}
              onChange={handlePageChange}
              color="primary"
            />
          </Box>
        )}
      </Paper>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={handleDialogClose}
        aria-labelledby="user-action-dialog-title"
      >
        <DialogTitle id="user-action-dialog-title">
          {getDialogTitle()}
        </DialogTitle>
        
        <DialogContent>
          <DialogContentText>
            {getDialogContent()}
          </DialogContentText>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={handleDialogClose} disabled={actionLoading}>
            Cancel
          </Button>
          
          <Button
            onClick={handleUserAction}
            variant="contained"
            color={dialogAction === 'reject' || dialogAction === 'deactivate' ? 'error' : 'primary'}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={20} /> : null}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage; 