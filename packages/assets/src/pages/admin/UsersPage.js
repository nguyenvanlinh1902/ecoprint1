import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton,
  TextField, InputAdornment, FormControl, InputLabel, 
  Select, MenuItem, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, CircularProgress, Pagination
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Block as BlockIcon,
  CheckCircle as ApproveIcon,
  Clear as RejectIcon
} from '@mui/icons-material';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../helpers/formatters';

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
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
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10); // Users per page
      
      if (status) {
        params.append('status', status);
      }
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await api.get(`/api/admin/users?${params.toString()}`);
      
      setUsers(response.data.data.users || []);
      setTotalPages(response.data.data.totalPages || 1);
      
    } catch (error) {
      /* error removed */
      setError('Failed to load users. Please try again later.');
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
    
    try {
      switch (dialogAction) {
        case 'approve':
          await api.post(`/api/admin/users/${selectedUser.id}/approve`);
          break;
        case 'reject':
          await api.post(`/api/admin/users/${selectedUser.id}/reject`);
          break;
        case 'activate':
          await api.post(`/api/admin/users/${selectedUser.id}/activate`);
          break;
        case 'deactivate':
          await api.post(`/api/admin/users/${selectedUser.id}/deactivate`);
          break;
        default:
          break;
      }
      
      // Refresh user list
      fetchUsers();
      handleDialogClose();
      
    } catch (error) {
      /* error removed */
      setError(`Failed to ${dialogAction} user. Please try again later.`);
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
  
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Users Management
      </Typography>
      
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
                <MenuItem value="pending">Pending Approval</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button 
                variant="contained"
                onClick={fetchUsers}
              >
                Filter
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Users List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Company</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Registration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={30} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id} hover>
                    <TableCell>{user.companyName}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{user.phone || 'N/A'}</TableCell>
                    <TableCell>{formatDate(user.createdAt)}</TableCell>
                    <TableCell>
                      <StatusBadge status={user.status} />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton 
                          component={Link} 
                          to={`/admin/users/${user.id}`}
                          title="View Details"
                          size="small"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        
                        {user.status === 'pending' && (
                          <>
                            <IconButton 
                              title="Approve"
                              size="small"
                              color="success"
                              onClick={() => handleDialogOpen('approve', user)}
                            >
                              <ApproveIcon fontSize="small" />
                            </IconButton>
                            
                            <IconButton 
                              title="Reject"
                              size="small"
                              color="error"
                              onClick={() => handleDialogOpen('reject', user)}
                            >
                              <RejectIcon fontSize="small" />
                            </IconButton>
                          </>
                        )}
                        
                        {user.status === 'active' && (
                          <IconButton 
                            title="Deactivate"
                            size="small"
                            color="warning"
                            onClick={() => handleDialogOpen('deactivate', user)}
                          >
                            <BlockIcon fontSize="small" />
                          </IconButton>
                        )}
                        
                        {user.status === 'inactive' && (
                          <IconButton 
                            title="Activate"
                            size="small"
                            color="success"
                            onClick={() => handleDialogOpen('activate', user)}
                          >
                            <ApproveIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No users found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <Pagination 
              count={totalPages} 
              page={page} 
              onChange={handlePageChange} 
              color="primary" 
            />
          </Box>
        )}
      </Paper>
      
      {/* Action Dialog */}
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
            color={dialogAction === 'reject' || dialogAction === 'deactivate' ? 'error' : 'primary'}
            variant="contained"
            disabled={actionLoading}
            autoFocus
          >
            {actionLoading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersPage; 