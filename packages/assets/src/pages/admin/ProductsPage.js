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
  Delete as DeleteIcon,
  Add as AddIcon
} from '@mui/icons-material';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../helpers/formatters';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [categories, setCategories] = useState([]);
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10); // Products per page
      
      if (category) {
        params.append('category', category);
      }
      
      if (status) {
        params.append('status', status);
      }
      
      if (search) {
        params.append('search', search);
      }
      
      const response = await api.get(`/api/admin/products?${params.toString()}`);
      
      setProducts(response.data.data.products || []);
      setTotalPages(response.data.data.totalPages || 1);
      
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to load products. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    try {
      const response = await api.get('/api/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };
  
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, category, status]);
  
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };
  
  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };
  
  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };
  
  const handleDeleteDialogOpen = (product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setDeleteLoading(false);
  };
  
  const handleDeleteProduct = async () => {
    if (!selectedProduct) return;
    
    setDeleteLoading(true);
    
    try {
      await api.delete(`/api/admin/products/${selectedProduct.id}`);
      
      // Refresh product list
      fetchProducts();
      handleDeleteDialogClose();
      
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product. Please try again later.');
    } finally {
      setDeleteLoading(false);
    }
  };
  
  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">
          Products Management
        </Typography>
        
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          component={Link}
          to="/admin/products/create"
        >
          Add Product
        </Button>
      </Box>
      
      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          <Grid item xs={12} sm={6} md={3}>
            <form onSubmit={handleSearchSubmit}>
              <TextField
                fullWidth
                size="small"
                placeholder="Search products..."
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
          
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                onChange={handleCategoryChange}
                label="Category"
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
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
                <MenuItem value="outOfStock">Out of Stock</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                onClick={fetchProducts}
                size="small"
              >
                Filter
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Products List */}
      <Paper>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Product Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <CircularProgress size={30} sx={{ my: 2 }} />
                  </TableCell>
                </TableRow>
              ) : products.length > 0 ? (
                products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        {product.imageUrl && (
                          <Box
                            component="img"
                            src={product.imageUrl}
                            alt={product.name}
                            sx={{ width: 40, height: 40, mr: 2, objectFit: 'contain' }}
                          />
                        )}
                        <Typography variant="body2">
                          {product.name}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>{product.category?.name || 'N/A'}</TableCell>
                    <TableCell align="right">{formatCurrency(product.price)}</TableCell>
                    <TableCell align="center">
                      <StatusBadge status={product.status} />
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                        <IconButton 
                          component={Link} 
                          to={`/admin/products/${product.id}`}
                          title="View Details"
                          size="small"
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                        
                        <IconButton 
                          component={Link} 
                          to={`/admin/products/${product.id}/edit`}
                          title="Edit Product"
                          size="small"
                          color="primary"
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        
                        <IconButton 
                          title="Delete Product"
                          size="small"
                          color="error"
                          onClick={() => handleDeleteDialogOpen(product)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No products found.
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
      
      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleDeleteDialogClose}
      >
        <DialogTitle>
          Delete Product
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the product <strong>{selectedProduct?.name}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} disabled={deleteLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteProduct}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage; 