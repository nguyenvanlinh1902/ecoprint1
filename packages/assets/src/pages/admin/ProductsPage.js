import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, IconButton,
  TextField, InputAdornment, FormControl, InputLabel, 
  Select, MenuItem, Chip, Dialog, DialogActions, DialogContent,
  DialogContentText, DialogTitle, CircularProgress, TablePagination,
  Alert, Divider, Tabs, Tab, FormControlLabel, Switch, List, ListItem,
  ListItemText, Link
} from '@mui/material';
import {
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon,
  Filter as FilterIcon,
  Clear as ClearIcon,
  Download as DownloadIcon,
  FileUpload as FileUploadIcon
} from '@mui/icons-material';
import api from '../../services/api';
import StatusBadge from '../../components/StatusBadge';
import { formatCurrency } from '../../helpers/formatters';

const ProductsPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const location = useLocation();
  
  // Determine if we're in view mode based on URL path
  const isViewMode = location.pathname.includes('/view');
  
  // Panel state - Set to form view if we have a productId in the URL
  const [activeTab, setActiveTab] = useState(productId ? 1 : 0);

  // Product list state
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: ''
  });
  
  // Product deletion state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Import Dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState('');
  const [importSuccess, setImportSuccess] = useState(false);
  const [importResult, setImportResult] = useState({
    total: 0,
    success: 0,
    failed: 0,
    errors: []
  });

  // New Product Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    status: 'active',
    features: [],
    specifications: {},
    deliveryOptions: [],
    imageUrl: '',
    imageFile: null
  });
  
  // Form UI state
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Temporary fields for adding items
  const [newFeature, setNewFeature] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [newDeliveryPrice, setNewDeliveryPrice] = useState('');
  
  // Load products and categories
  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [page, rowsPerPage, filters]);
  
  // Load product data if in edit/view mode
  useEffect(() => {
    if (productId) {
      loadProductData();
    }
  }, [productId]);
  
  const loadProductData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/admin/products/${productId}`);
      
      if (response.data) {
        const product = response.data;
        
        // Format data to match form structure
        setFormData({
          name: product.name || '',
          description: product.description || '',
          price: product.price || '',
          category: product.category?.id || '',
          status: product.status || 'active',
          features: product.features || [],
          specifications: product.specifications || {},
          deliveryOptions: product.deliveryOptions || [],
          imageUrl: product.imageUrl || '',
          imageFile: null
        });
      }
    } catch (error) {
      console.error('Error loading product:', error);
      setFormError('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchProducts = async () => {
    try {
      setLoading(true);
      
      const params = new URLSearchParams();
      params.append('page', page + 1);
      params.append('limit', rowsPerPage);
      
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.status) params.append('status', filters.status);
      
      const response = await api.get(`/api/admin/products?${params.toString()}`);
      
      setProducts(response.data.data || []);
      setTotal(response.data.total || 0);
      setError('');
    } catch (error) {
      console.error('Error fetching products:', error);
      setError('Failed to fetch products. Please try again.');
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
  
  const handlePageChange = (event, newPage) => {
    setPage(newPage);
  };
  
  const handleRowsPerPageChange = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };
  
  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  const handleApplyFilters = () => {
    setPage(0);
    fetchProducts();
  };
  
  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: ''
    });
    setPage(0);
  };
  
  const handleStatusChange = (e) => {
    setFormData(prev => ({
      ...prev,
      status: e.target.checked ? 'active' : 'inactive'
    }));
  };
  
  const handleDeleteDialogOpen = (product) => {
    setProductToDelete(product);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setProductToDelete(null);
  };
  
  const handleDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      setDeleting(true);
      await api.delete(`/api/admin/products/${productToDelete.id}`);
      
      setProducts(products.filter(p => p.id !== productToDelete.id));
      handleDeleteDialogClose();
      
      // Check if we need to go back a page
      if (products.length === 1 && page > 0) {
        setPage(prev => prev - 1);
      } else {
        fetchProducts();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      setError('Failed to delete product. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  // Form handling functions
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        imageFile: file,
        imageUrl: URL.createObjectURL(file)
      }));
    }
  };

  const handleAddFeature = () => {
    if (!newFeature.trim()) return;
    setFormData(prev => ({
      ...prev,
      features: [...prev.features, newFeature.trim()]
    }));
    setNewFeature('');
  };

  const handleRemoveFeature = (index) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };

  const handleAddSpecification = () => {
    if (!newSpecKey.trim() || !newSpecValue.trim()) return;
    
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [newSpecKey.trim()]: newSpecValue.trim()
      }
    }));
    
    setNewSpecKey('');
    setNewSpecValue('');
  };

  const handleRemoveSpecification = (key) => {
    const newSpecs = { ...formData.specifications };
    delete newSpecs[key];
    
    setFormData(prev => ({
      ...prev,
      specifications: newSpecs
    }));
  };

  const handleAddDeliveryOption = () => {
    if (!newDeliveryName.trim() || !newDeliveryPrice.trim()) return;
    
    const price = parseFloat(newDeliveryPrice);
    if (isNaN(price) || price < 0) {
      setFormError('Please enter a valid price');
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      deliveryOptions: [
        ...prev.deliveryOptions,
        {
          name: newDeliveryName.trim(),
          price: price
        }
      ]
    }));
    
    setNewDeliveryName('');
    setNewDeliveryPrice('');
  };

  const handleRemoveDeliveryOption = (index) => {
    setFormData(prev => ({
      ...prev,
      deliveryOptions: prev.deliveryOptions.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    if (!formData.name.trim()) {
      setFormError('Product name is required');
      return false;
    }
    
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) < 0) {
      setFormError('Please enter a valid price');
      return false;
    }
    
    if (!formData.category) {
      setFormError('Please select a category');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setSaving(true);
    setFormError('');
    
    try {
      // Create form data for file upload
      const submitData = new FormData();
      
      // Add all text fields
      submitData.append('name', formData.name);
      submitData.append('description', formData.description);
      submitData.append('price', formData.price);
      submitData.append('category', formData.category);
      submitData.append('status', formData.status);
      
      // Add arrays and objects as JSON strings
      submitData.append('features', JSON.stringify(formData.features));
      submitData.append('specifications', JSON.stringify(formData.specifications));
      submitData.append('deliveryOptions', JSON.stringify(formData.deliveryOptions));
      
      // Add image file if present
      if (formData.imageFile) {
        submitData.append('image', formData.imageFile);
      }
      
      let url = '/api/admin/products';
      let method = 'post';
      
      // If editing, adjust endpoint and method
      if (productId) {
        url = `/api/admin/products/${productId}`;
        method = 'put';
      }
      
      await api[method](url, submitData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setSuccess(true);
      
      // Return to products list after a short delay
      setTimeout(() => {
        navigate('/admin/products');
        setSuccess(false);
      }, 1500);
      
    } catch (error) {
      console.error('Error saving product:', error);
      setFormError(error.response?.data?.message || 'Failed to save product. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Navigation handlers
  const handleViewProduct = (id) => {
    navigate(`/admin/products/${id}/view`);
  };
  
  const handleEditProduct = (id) => {
    navigate(`/admin/products/${id}/edit`);
  };
  
  const handleAddNewProduct = () => {
    navigate('/admin/products/new');
  };
  
  const handleBackToList = () => {
    navigate('/admin/products');
  };

  // Handle actions based on URL parameters
  useEffect(() => {
    if (productId && isViewMode) {
      // View mode - just load product data
      loadProductData();
    } else if (productId) {
      // Edit mode - load product data and show form
      loadProductData();
      setActiveTab(1);
    } else {
      // List mode - reset form data
      setFormData({
        name: '',
        description: '',
        price: '',
        category: '',
        status: 'active',
        features: [],
        specifications: {},
        deliveryOptions: [],
        imageUrl: '',
        imageFile: null
      });
      setActiveTab(0);
    }
  }, [productId, isViewMode]);

  // Import Products Dialog handling
  const handleImportDialogOpen = () => {
    setImportDialogOpen(true);
    setImportFile(null);
    setImportError('');
    setImportSuccess(false);
    setImportResult({
      total: 0,
      success: 0,
      failed: 0,
      errors: []
    });
  };

  const handleImportDialogClose = () => {
    setImportDialogOpen(false);
    if (importSuccess) {
      // Refresh product list after successful import
      fetchProducts();
    }
  };

  const handleImportFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Check file type
      const fileExt = file.name.split('.').pop().toLowerCase();
      if (fileExt !== 'xlsx' && fileExt !== 'xls' && fileExt !== 'csv') {
        setImportError('Please upload a valid Excel or CSV file');
        return;
      }
      setImportFile(file);
      setImportError('');
    }
  };

  const downloadTemplateFile = async () => {
    try {
      const response = await api.get('/api/admin/products/template', {
        responseType: 'blob'
      });
      
      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'product_import_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading template:', error);
      setImportError('Failed to download template. Please try again.');
    }
  };

  const handleImportProducts = async () => {
    if (!importFile) {
      setImportError('Please select a file to import');
      return;
    }

    setImporting(true);
    setImportError('');
    setImportSuccess(false);

    try {
      const formData = new FormData();
      formData.append('file', importFile);

      const response = await api.post('/api/admin/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      setImportResult({
        total: response.data.total || 0,
        success: response.data.success || 0,
        failed: response.data.failed || 0,
        errors: response.data.errors || []
      });

      if (response.data.success > 0) {
        setImportSuccess(true);
      }
    } catch (error) {
      console.error('Error importing products:', error);
      setImportError(error.response?.data?.message || 'Failed to import products. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h4" sx={{ mb: 3 }}>
        Products Management
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {/* Conditional rendering based on URL pattern */}
      {!productId ? (
        // Products List View
        <>
          <Paper sx={{ p: 3, mb: 3, width: '100%' }}>
            <Grid container spacing={2} alignItems="flex-end">
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Search Products"
                  fullWidth
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Category</InputLabel>
                  <Select
                    value={filters.category}
                    label="Category"
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <MenuItem value="">All Categories</MenuItem>
                    {categories.map((category) => (
                      <MenuItem key={category.id} value={category.id}>
                        {category.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    label="Status"
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                  >
                    <MenuItem value="">All Status</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6} md={2}>
                <Box sx={{ display: 'flex' }}>
                  <Button 
                    variant="contained" 
                    startIcon={<FilterIcon />} 
                    onClick={handleApplyFilters}
                    sx={{ mr: 1 }}
                  >
                    Filter
                  </Button>
                  <Button 
                    variant="outlined" 
                    startIcon={<ClearIcon />} 
                    onClick={handleClearFilters}
                  >
                    Clear
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
            <Button 
              variant="outlined" 
              color="primary" 
              startIcon={<FileUploadIcon />}
              onClick={handleImportDialogOpen}
              sx={{ mr: 2 }}
            >
              Import Products
            </Button>
            <Button 
              variant="contained" 
              color="primary" 
              startIcon={<AddIcon />}
              onClick={handleAddNewProduct}
            >
              Add New Product
            </Button>
          </Box>
          
          <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading && !products.length ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  products.map((product) => (
                    <TableRow key={product.id}>
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
                          {product.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {product.category?.name || 'Uncategorized'}
                      </TableCell>
                      <TableCell>${parseFloat(product.price).toFixed(2)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={product.status} 
                          color={product.status === 'active' ? 'success' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton onClick={() => handleViewProduct(product.id)}>
                          <VisibilityIcon />
                        </IconButton>
                        <IconButton onClick={() => handleEditProduct(product.id)}>
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleDeleteDialogOpen(product)}>
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            <TablePagination
              rowsPerPageOptions={[5, 10, 25]}
              component="div"
              count={total}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handlePageChange}
              onRowsPerPageChange={handleRowsPerPageChange}
            />
          </TableContainer>
          
          {/* Delete Confirmation Dialog */}
          <Dialog
            open={deleteDialogOpen}
            onClose={handleDeleteDialogClose}
          >
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Are you sure you want to delete {productToDelete?.name}?
                This action cannot be undone.
              </DialogContentText>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleDeleteDialogClose}>Cancel</Button>
              <Button 
                onClick={handleDeleteProduct} 
                color="error" 
                disabled={deleting}
              >
                {deleting ? <CircularProgress size={24} /> : 'Delete'}
              </Button>
            </DialogActions>
          </Dialog>
        </>
      ) : (
        // Product Form View
        <Paper sx={{ p: 3, width: '100%' }}>
          <Box sx={{ mb: 2 }}>
            <Button
              startIcon={<ArrowBackIcon />}
              onClick={handleBackToList}
            >
              Back to Products
            </Button>
          </Box>
          
          {formError && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {formError}
            </Alert>
          )}
          
          {success && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Product {productId ? 'updated' : 'created'} successfully!
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Divider sx={{ mb: 2 }} />
              </Grid>
              
              {/* Product Image */}
              <Grid item xs={12} md={4}>
                <Box 
                  sx={{ 
                    width: '100%', 
                    height: 200, 
                    border: '1px dashed #ccc',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    mb: 2,
                    position: 'relative',
                    backgroundImage: formData.imageUrl ? `url(${formData.imageUrl})` : 'none',
                    backgroundSize: 'contain',
                    backgroundPosition: 'center',
                    backgroundRepeat: 'no-repeat'
                  }}
                >
                  {!formData.imageUrl && (
                    <Box sx={{ textAlign: 'center' }}>
                      <UploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        Click to upload product image
                      </Typography>
                    </Box>
                  )}
                  
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer'
                    }}
                    disabled={isViewMode}
                  />
                </Box>
                
                {!isViewMode && (
                  <Button 
                    variant="outlined" 
                    fullWidth
                    startIcon={<UploadIcon />}
                    onClick={() => document.querySelector('input[type="file"]').click()}
                  >
                    {formData.imageUrl ? 'Change Image' : 'Upload Image'}
                  </Button>
                )}
              </Grid>
              
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <TextField
                      name="name"
                      label="Product Name"
                      fullWidth
                      required
                      value={formData.name}
                      onChange={handleInputChange}
                      disabled={isViewMode}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      name="price"
                      label="Price"
                      fullWidth
                      required
                      value={formData.price}
                      onChange={handleInputChange}
                      InputProps={{
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                      }}
                      disabled={isViewMode}
                    />
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth required>
                      <InputLabel>Category</InputLabel>
                      <Select
                        name="category"
                        label="Category"
                        value={formData.category}
                        onChange={handleInputChange}
                        disabled={isViewMode}
                      >
                        {categories.map((category) => (
                          <MenuItem key={category.id} value={category.id}>
                            {category.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.status === 'active'}
                          onChange={handleStatusChange}
                          color="primary"
                          disabled={isViewMode}
                        />
                      }
                      label="Active"
                    />
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  name="description"
                  label="Description"
                  fullWidth
                  multiline
                  rows={4}
                  value={formData.description}
                  onChange={handleInputChange}
                  disabled={isViewMode}
                />
              </Grid>
              
              {/* Features */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Features
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ mb: 2 }}>
                  {formData.features.map((feature, index) => (
                    <Chip
                      key={index}
                      label={feature}
                      onDelete={isViewMode ? undefined : () => handleRemoveFeature(index)}
                      sx={{ mr: 1, mb: 1 }}
                    />
                  ))}
                </Box>
                
                {!isViewMode && (
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <TextField
                      label="Add Feature"
                      value={newFeature}
                      onChange={(e) => setNewFeature(e.target.value)}
                      sx={{ flexGrow: 1, mr: 1 }}
                    />
                    <Button
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={handleAddFeature}
                      disabled={!newFeature.trim()}
                    >
                      Add
                    </Button>
                  </Box>
                )}
              </Grid>
              
              {/* Specifications */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Specifications
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List dense>
                  {Object.entries(formData.specifications).map(([key, value]) => (
                    <ListItem
                      key={key}
                      secondaryAction={
                        isViewMode ? null : (
                          <IconButton edge="end" onClick={() => handleRemoveSpecification(key)}>
                            <DeleteIcon />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemText
                        primary={<Typography component="span" fontWeight="bold">{key}</Typography>}
                        secondary={value}
                      />
                    </ListItem>
                  ))}
                </List>
                
                {!isViewMode && (
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Specification Name"
                        fullWidth
                        value={newSpecKey}
                        onChange={(e) => setNewSpecKey(e.target.value)}
                        placeholder="e.g. Weight, Dimensions"
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Value"
                        fullWidth
                        value={newSpecValue}
                        onChange={(e) => setNewSpecValue(e.target.value)}
                        placeholder="e.g. 5kg, 10x15x2 cm"
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleAddSpecification}
                        disabled={!newSpecKey.trim() || !newSpecValue.trim()}
                      >
                        Add
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
              
              {/* Delivery Options */}
              <Grid item xs={12}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Delivery Options
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <List dense>
                  {formData.deliveryOptions.map((option, index) => (
                    <ListItem
                      key={index}
                      secondaryAction={
                        isViewMode ? null : (
                          <IconButton edge="end" onClick={() => handleRemoveDeliveryOption(index)}>
                            <DeleteIcon />
                          </IconButton>
                        )
                      }
                    >
                      <ListItemText
                        primary={option.name}
                        secondary={`$${option.price.toFixed(2)}`}
                      />
                    </ListItem>
                  ))}
                </List>
                
                {!isViewMode && (
                  <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Delivery Option"
                        fullWidth
                        value={newDeliveryName}
                        onChange={(e) => setNewDeliveryName(e.target.value)}
                        placeholder="e.g. Express Shipping"
                      />
                    </Grid>
                    <Grid item xs={12} sm={5}>
                      <TextField
                        label="Price"
                        fullWidth
                        value={newDeliveryPrice}
                        onChange={(e) => setNewDeliveryPrice(e.target.value)}
                        InputProps={{
                          startAdornment: <InputAdornment position="start">$</InputAdornment>,
                        }}
                        placeholder="e.g. 10.99"
                      />
                    </Grid>
                    <Grid item xs={12} sm={2}>
                      <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleAddDeliveryOption}
                        disabled={!newDeliveryName.trim() || !newDeliveryPrice.trim()}
                      >
                        Add
                      </Button>
                    </Grid>
                  </Grid>
                )}
              </Grid>
              
              {/* Submit Button - Only show in edit/create mode */}
              {!isViewMode && (
                <Grid item xs={12}>
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button 
                      onClick={handleBackToList} 
                      sx={{ mr: 2 }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      size="large"
                      disabled={saving}
                    >
                      {saving ? (
                        <CircularProgress size={24} />
                      ) : (
                        productId ? 'Update Product' : 'Create Product'
                      )}
                    </Button>
                  </Box>
                </Grid>
              )}
            </Grid>
          </form>
        </Paper>
      )}

      {/* Import Products Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={handleImportDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Import Products</DialogTitle>
        <DialogContent>
          {importError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {importError}
            </Alert>
          )}
          
          {importSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Products imported successfully! {importResult.success} of {importResult.total} products imported.
            </Alert>
          )}
          
          <DialogContentText sx={{ mb: 2 }}>
            Please download the template file, fill in your product details, and upload it back to import products in bulk.
          </DialogContentText>
          
          <Box sx={{ mb: 3 }}>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={downloadTemplateFile}
            >
              Download Template
            </Button>
          </Box>
          
          <Box 
            sx={{ 
              border: '1px dashed #ccc',
              borderRadius: 1,
              p: 3,
              mb: 3,
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => document.getElementById('import-file-input').click()}
          >
            <input
              id="import-file-input"
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportFileChange}
              style={{ display: 'none' }}
            />
            <FileUploadIcon sx={{ fontSize: 40, color: 'text.secondary', mb: 1 }} />
            <Typography variant="body1" gutterBottom>
              Click to browse or drag and drop your file
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Supported formats: Excel (.xlsx, .xls) or CSV (.csv)
            </Typography>
            {importFile && (
              <Box sx={{ mt: 2 }}>
                <Chip 
                  label={importFile.name} 
                  color="primary" 
                  onDelete={() => setImportFile(null)} 
                />
              </Box>
            )}
          </Box>
          
          {importResult.failed > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle1" color="error" gutterBottom>
                {importResult.failed} records failed to import:
              </Typography>
              <List dense>
                {importResult.errors.slice(0, 5).map((error, index) => (
                  <ListItem key={index}>
                    <ListItemText 
                      primary={`Row ${error.row}: ${error.message}`} 
                      secondary={error.details} 
                    />
                  </ListItem>
                ))}
                {importResult.errors.length > 5 && (
                  <ListItem>
                    <ListItemText 
                      primary={`... and ${importResult.errors.length - 5} more errors`} 
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleImportDialogClose}>
            {importSuccess ? 'Close' : 'Cancel'}
          </Button>
          <Button 
            variant="contained" 
            onClick={handleImportProducts} 
            disabled={!importFile || importing}
            startIcon={importing ? <CircularProgress size={20} /> : null}
          >
            {importing ? 'Importing...' : 'Import Products'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage; 