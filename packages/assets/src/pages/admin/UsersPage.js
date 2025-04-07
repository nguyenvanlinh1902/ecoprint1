import React, { useState, useEffect, useCallback } from 'react';
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
import { get, put } from '../../api';
import StatusBadge from '../../components/StatusBadge';
import { formatDate } from '../../helpers/formatters';
import { useSafeAdmin } from '../../hooks/useSafeAdmin';

// No-op logging function for production
const devLog = () => {};

const UsersPage = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 10; // Thêm biến limit ở đây với giá trị 10
  
  // Filtering
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  
  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dùng admin context
  const { 
    users: contextUsers, 
    usersLoading: contextLoading, 
    refreshUsers, 
    searchUsers,
    updateUserInContext,
    isContextAvailable
  } = useSafeAdmin();
  
  // State để lưu trữ dữ liệu trang hiện tại
  const [usersData, setUsersData] = useState([]);
  
  // Thêm state memoized search
  const [lastSearchTerm, setLastSearchTerm] = useState('');
  
  // Lấy users từ context khi component mount hoặc khi params thay đổi
  useEffect(() => {
    const filterUsersFromContext = async () => {
      // Nếu admin context có sẵn và không quá 10 phút, dùng data từ context
      if (isContextAvailable) {
        setLoading(true);
        
        try {
          // Nếu cần refresh dữ liệu users
          if (contextUsers.length === 0) {
            await refreshUsers();
          }
          
          // Sắp xếp và lọc users từ context theo search, status
          let filteredUsers = [...contextUsers];
          
          // Áp dụng filter theo status nếu có
          if (status) {
            filteredUsers = filteredUsers.filter(user => user.status === status);
          }
          
          // Áp dụng search nếu có
          if (search) {
            if (search !== lastSearchTerm) {
              setLastSearchTerm(search);
            }
            
            filteredUsers = searchUsers(search);
          }
          
          // Tính toán phân trang client-side
          const totalUsers = filteredUsers.length;
          const totalPages = Math.ceil(totalUsers / parseInt(limit));
          
          // Lấy mảng con cho trang hiện tại
          const startIndex = (page - 1) * parseInt(limit);
          const endIndex = startIndex + parseInt(limit);
          const paginatedUsers = filteredUsers.slice(startIndex, endIndex);
          
          setUsers(paginatedUsers);
          setTotalPages(totalPages);
          setError('');
        } catch (err) {
          console.error('Error filtering users from context:', err);
          setError('Failed to process users data');
          
          // Fallback to API if context fails
          fetchUsers();
        } finally {
          setLoading(false);
        }
      } else {
        // Nếu không có context, dùng API
        fetchUsers();
      }
    };
    
    filterUsersFromContext();
  }, [page, limit, status, search, isContextAvailable, contextUsers, refreshUsers, searchUsers]);
  
  // Using useCallback to memoize fetchUsers
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Build query parameters
      const params = {
        page,
        limit // Sử dụng biến limit thay vì giá trị cố định 10
      };
      
      if (status) {
        params.status = status;
      }
      
      if (search) {
        params.search = search;
      }
      
      devLog('Fetching users with params:', params);
      
      // Use the api object directly instead of axios
      const response = await get('admin/users', { params });
      
      devLog('Users API response:', response.data);
      
      if (response.data && response.data.data) {
        setUsers(response.data.data.users || []);
        setTotalPages(response.data.data.totalPages || 1);
      } else {
        setUsers([]);
        setTotalPages(1);
        setError('Unable to parse user data from server response');
        console.error('Unexpected API response structure:', response);
      }
      
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Unable to load user list: ' + (error.response?.data?.message || error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [page, status, search, limit]); // Thêm limit vào dependencies
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]); // Only dependency is the memoized fetchUsers function
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1); // Reset to page 1 when searching
    // No need to call fetchUsers() here as the useEffect will handle it when search/page changes
  };
  
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
    // No need to call fetchUsers() here as the useEffect will handle it when status/page changes
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
  
  const handleUserAction = async (userId, action) => {
    try {
      setActionLoading(true);
      
      let response;
      
      // Xác định API endpoint dựa vào action
      if (action === 'approve') {
        response = await put(`admin/users/${userId}/approve`);
      } else if (action === 'reject') {
        response = await put(`admin/users/${userId}/reject`);
      } else if (action === 'activate') {
        response = await put(`admin/users/${userId}/activate`);
      } else if (action === 'deactivate') {
        response = await put(`admin/users/${userId}/deactivate`);
      }
      
      // Cập nhật context nếu có
      if (isContextAvailable && response.data && response.data.data) {
        updateUserInContext(userId, response.data.data);
      }
      
      // Cập nhật UI sau khi action thành công
      setSuccess(`User ${action}d successfully.`);
      
      // Xóa success message sau 3 giây
      setTimeout(() => {
        setSuccess('');
      }, 3000);
      
      // Refresh dữ liệu users
      if (isContextAvailable) {
        // Nếu dùng context, chỉ cần reload trang hiện tại
        const updatedUser = response.data.data;
        setUsers(prevUsers => 
          prevUsers.map(user => 
            user.id === userId ? updatedUser : user
          )
        );
      } else {
        // Nếu không dùng context, gọi lại API
        fetchUsers();
      }
    } catch (error) {
      console.error(`Error ${action}ing user:`, error);
      setError(`Failed to ${action} user. ${error.response?.data?.message || error.message}`);
    } finally {
      setActionLoading(false);
      setDialogOpen(false);
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
            onClick={() => handleUserAction(selectedUser.id, dialogAction)}
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