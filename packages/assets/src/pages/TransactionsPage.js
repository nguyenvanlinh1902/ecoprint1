import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Paper, Grid, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  FormControl, InputLabel, Select, MenuItem, TextField,
  InputAdornment, Button, Pagination, CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import api from '../services/api';
import StatusBadge from '../components/StatusBadge';
import { formatCurrency, formatDateTime } from '../helpers/formatters';
import { useAuth } from '../contexts/AuthContext';

const TransactionsPage = () => {
  const { userDetails } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  
  const fetchTransactions = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10); // Transactions per page
      
      if (type) {
        params.append('type', type);
      }
      
      if (status) {
        params.append('status', status);
      }
      
      if (search) {
        params.append('search', search);
      }
      
      if (dateRange.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      
      if (dateRange.endDate) {
        params.append('endDate', dateRange.endDate);
      }
      
      const response = await api.get(`/api/transactions?${params.toString()}`);
      
      setTransactions(response.data.data.transactions || []);
      setTotalPages(response.data.data.totalPages || 1);
      
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchTransactions();
  }, [page, type, status]);
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTransactions();
  };
  
  const handleFilterReset = () => {
    setType('');
    setStatus('');
    setSearch('');
    setDateRange({ startDate: '', endDate: '' });
    setPage(1);
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Transactions</Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ mr: 1 }}>
            Current Balance:
          </Typography>
          <Typography variant="h6" color="primary">
            {formatCurrency(userDetails?.balance || 0)}
          </Typography>
        </Box>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Transaction Type</InputLabel>
              <Select
                value={type}
                onChange={(e) => setType(e.target.value)}
                label="Transaction Type"
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="deposit">Deposits</MenuItem>
                <MenuItem value="payment">Payments</MenuItem>
                <MenuItem value="refund">Refunds</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                label="Status"
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4} md={3}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search transactions..."
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
          
          <Grid item xs={12} sm={12} md={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                variant="outlined" 
                size="small"
                onClick={handleFilterReset}
              >
                Reset
              </Button>
              
              <Button 
                variant="contained" 
                startIcon={<FilterIcon />}
                size="small"
                onClick={fetchTransactions}
              >
                Filter
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Transactions List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Type</TableCell>
                <TableCell>Description</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={30} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <TableRow key={transaction.id} hover>
                    <TableCell>
                      <Typography variant="body2" component="span" sx={{ fontFamily: 'monospace' }}>
                        {transaction.id.substring(0, 8)}...
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                        {transaction.type}
                      </Typography>
                    </TableCell>
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
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    No transactions found.
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
    </Box>
  );
};

export default TransactionsPage; 