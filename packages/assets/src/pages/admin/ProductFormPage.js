import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, TextField, Button, 
  FormControl, InputLabel, Select, MenuItem, Switch,
  FormControlLabel, Divider, InputAdornment, 
  CircularProgress, Alert, Chip, IconButton, List, 
  ListItem, ListItemText, Dialog, DialogTitle,
  DialogContent, DialogActions, DialogContentText
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  ArrowBack as ArrowBackIcon,
  CloudUpload as UploadIcon
} from '@mui/icons-material';
import api from '@/api';
import ImageUploader from '@/components/ImageUploader';

const ProductFormPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(productId);
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    category: '',
    status: 'active',
    features: [],
    specifications: {},
    deliveryOptions: [],
    imageUrl: '',
    imageFile: null
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  
  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDescription, setNewCategoryDescription] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState('');
  
  // Temporary fields for adding items
  const [newFeature, setNewFeature] = useState('');
  const [newSpecKey, setNewSpecKey] = useState('');
  const [newSpecValue, setNewSpecValue] = useState('');
  const [newDeliveryName, setNewDeliveryName] = useState('');
  const [newDeliveryPrice, setNewDeliveryPrice] = useState('');
  
  // Load product data if in edit mode
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isEditMode) {
          setLoading(true);
          const response = await api.admin.getProduct(productId);
          
          if (response.data && response.data.success) {
            const product = response.data.data;
            
            // Convert specifications from API format to form format if needed
            const formattedSpecs = typeof product.specifications === 'object' 
              ? product.specifications 
              : {};
            
            setFormData({
              name: product.name || '',
              description: product.description || '',
              price: product.price?.toString() || '',
              sku: product.sku || '',
              category: product.categoryId || '',
              status: product.status || 'active',
              features: product.features || [],
              specifications: formattedSpecs,
              deliveryOptions: product.deliveryOptions || [],
              imageUrl: product.images && product.images.length > 0 ? product.images[0] : ''
            });
          } else {
            setError('Failed to load product data. Please try again later.');
          }
        }
        
        // Fetch categories using the dedicated function
        await fetchCategories();
        
      } catch (error) {
        setError('Failed to load data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [productId, isEditMode]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleStatusChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      status: e.target.checked ? 'active' : 'inactive'
    }));
  };
  
  const handleImageChange = (imageData) => {
    if (typeof imageData === 'object') {
      // New format with local preview
      setFormData((prev) => ({
        ...prev,
        imageUrl: imageData.previewUrl,
        imageFile: imageData.file
      }));
    } else {
      // Backward compatibility for string URLs
      setFormData((prev) => ({
        ...prev,
        imageUrl: imageData,
        imageFile: null
      }));
    }
  };
  
  // Add feature to the list
  const handleAddFeature = () => {
    if (newFeature.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, newFeature.trim()]
      }));
      setNewFeature('');
    }
  };
  
  // Remove feature from the list
  const handleRemoveFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index)
    }));
  };
  
  // Add specification
  const handleAddSpecification = () => {
    if (newSpecKey.trim() && newSpecValue.trim()) {
      setFormData((prev) => ({
        ...prev,
        specifications: {
          ...prev.specifications,
          [newSpecKey.trim()]: newSpecValue.trim()
        }
      }));
      setNewSpecKey('');
      setNewSpecValue('');
    }
  };
  
  // Remove specification
  const handleRemoveSpecification = (key) => {
    setFormData((prev) => {
      const updatedSpecs = { ...prev.specifications };
      delete updatedSpecs[key];
      return {
        ...prev,
        specifications: updatedSpecs
      };
    });
  };
  
  // Add delivery option
  const handleAddDeliveryOption = () => {
    if (newDeliveryName.trim() && newDeliveryPrice) {
      setFormData((prev) => ({
        ...prev,
        deliveryOptions: [
          ...prev.deliveryOptions,
          {
            name: newDeliveryName.trim(),
            price: parseFloat(newDeliveryPrice)
          }
        ]
      }));
      setNewDeliveryName('');
      setNewDeliveryPrice('');
    }
  };
  
  // Remove delivery option
  const handleRemoveDeliveryOption = (index) => {
    setFormData((prev) => ({
      ...prev,
      deliveryOptions: prev.deliveryOptions.filter((_, i) => i !== index)
    }));
  };
  
  // Fetch categories function (separate for reuse)
  const fetchCategories = async () => {
    try {
      const categoriesResponse = await api.products.getCategories();
      
      if (categoriesResponse.data && categoriesResponse.data.success) {
        setCategories(categoriesResponse.data.data || []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      setError('Failed to load categories. Please try again.');
    }
  };
  
  // Category modal handlers
  const handleOpenCategoryModal = () => {
    setCategoryModalOpen(true);
    setNewCategoryName('');
    setNewCategoryDescription('');
    setCategoryError('');
  };
  
  const handleCloseCategoryModal = () => {
    setCategoryModalOpen(false);
  };
  
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) {
      setCategoryError('Category name is required');
      return;
    }
    
    setSavingCategory(true);
    setCategoryError('');
    
    try {
      // Use the product API service since admin createCategory doesn't exist
      const response = await api.products.createCategory({
        name: newCategoryName.trim(),
        description: newCategoryDescription.trim()
      });
      
      if (response.data && response.data.success) {
        // Fetch updated categories
        await fetchCategories();
        
        // Set the newly created category as selected
        const newCategory = response.data.data;
        if (newCategory && newCategory.id) {
          setFormData(prev => ({
            ...prev,
            category: newCategory.id
          }));
        }
        
        // Close modal
        handleCloseCategoryModal();
      } else {
        setCategoryError('Failed to create category');
      }
    } catch (error) {
      setCategoryError(error.response?.data?.message || 'Failed to create category. Please try again.');
    } finally {
      setSavingCategory(false);
    }
  };
  
  const validateForm = () => {
    if (!formData.name) {
      setError('Product name is required');
      return false;
    }
    
    if (!formData.price || isNaN(parseFloat(formData.price)) || parseFloat(formData.price) <= 0) {
      setError('Please enter a valid price');
      return false;
    }
    
    if (!formData.category) {
      setError('Please select a category');
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
    setError('');
    setSuccess(false);
    
    try {
      // Handle image upload first if we have a new file
      let uploadedImageUrl = formData.imageUrl;
      
      if (formData.imageFile) {
        try {
          console.log('Starting image upload process...');
          console.log('Image file details:', {
            name: formData.imageFile.name,
            type: formData.imageFile.type,
            size: formData.imageFile.size,
            lastModified: formData.imageFile.lastModified
          });
          
          // Create FormData for image upload
          const imageFormData = new FormData();
          
          // IMPORTANT: Make sure the field name is 'image' - this is what the server expects
          imageFormData.append('image', formData.imageFile, formData.imageFile.name);
          
          // Add additional metadata - ensure productId is always included
          const productIdParam = productId || 'new';
          imageFormData.append('productId', productIdParam);
          imageFormData.append('path', `products/${productIdParam}`);
          
          // Log FormData contents
          console.log('Form data keys:', [...imageFormData.keys()]);
          console.log('Product ID being sent:', productIdParam);
          
          // Upload the image first
          console.log('Sending image upload request...');
          const uploadResponse = await api.products.uploadImage(imageFormData);
          console.log('Image upload response:', uploadResponse);
          
          if (uploadResponse && uploadResponse.data && uploadResponse.data.success) {
            uploadedImageUrl = uploadResponse.data.imageUrl;
            console.log('Successfully uploaded image:', uploadedImageUrl);
          } else {
            // Extract error message from response
            const errorMsg = 
              (uploadResponse?.data?.message) || 
              (uploadResponse?.data?.error) || 
              'Failed to upload image';
            console.error('Upload error response:', errorMsg);
            throw new Error(errorMsg);
          }
        } catch (uploadError) {
          console.error('Image upload error:', uploadError);
          console.error('Error details:', uploadError.response?.data || uploadError.message);
          setError(`Failed to upload product image. ${uploadError.message || 'Please try again.'}`);
          setSaving(false);
          return;
        }
      } else if (!formData.imageUrl && isEditMode) {
        // If in edit mode and no image provided, keep existing image
        console.log('No new image provided, keeping existing image if available');
      } else if (!formData.imageUrl) {
        console.log('No image provided for product');
      }
      
      // Prepare product data
      const productData = {
        name: formData.name,
        description: formData.description || '',
        price: Number(formData.price),
        sku: formData.sku || `SKU-${Date.now()}`,
        categoryId: formData.category,
        stock: Number(formData.stock) || 0,
        status: formData.status || 'active',
        features: formData.features || [],
        specifications: formData.specifications || {},
        deliveryOptions: formData.deliveryOptions || []
      };
      
      // Add the image URL (either existing or newly uploaded)
      if (uploadedImageUrl) {
        // Lưu URL hình ảnh vào mảng images
        productData.images = [uploadedImageUrl];
        // Thêm trường imageUrl để đảm bảo tương thích
        productData.imageUrl = uploadedImageUrl;
      }
      
      console.log('Saving product with image data:', {
        hasImage: !!uploadedImageUrl,
        imageUrl: uploadedImageUrl,
        images: productData.images
      });
      
      console.log('Saving product with data:', productData);
      
      let response;
      if (isEditMode) {
        response = await api.admin.updateProduct(productId, productData);
      } else {
        response = await api.admin.createProduct(productData);
      }
      
      console.log('Product save response:', response);
      setSuccess(true);
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/admin/products');
      }, 1500);
      
    } catch (error) {
      console.error('Product save error:', error);
      setError(
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message ||
        'Failed to save product. Please try again.'
      );
    } finally {
      setSaving(false);
    }
  };
  
  const handleImageUpload = async (imageData) => {
    console.log('[ProductFormPage] Starting image upload with data:', imageData);
    if (!imageData || !imageData.file) {
      console.error('[ProductFormPage] No file provided for upload');
      setError('Vui lòng chọn file hình ảnh để tải lên');
      return null;
    }
    
    try {
      setSaving(true);
      
      // Tạo FormData cho upload
      const formData = new FormData();
      formData.append('file', imageData.file);
      
      // Thêm productId nếu có (hoặc 'new' nếu là sản phẩm mới)
      const currentProductId = productId || 'new';
      formData.append('productId', currentProductId);
      
      // Log FormData để debug
      console.log('[ProductFormPage] FormData details:');
      formData.forEach((value, key) => {
        if (key === 'file') {
          console.log(`[ProductFormPage] - ${key}: ${value.name}, type: ${value.type}, size: ${value.size} bytes`);
        } else {
          console.log(`[ProductFormPage] - ${key}: ${value}`);
        }
      });
      
      // Gọi API upload với formData
      const response = await api.products.uploadImage(formData, currentProductId);
      console.log('[ProductFormPage] Upload successful, response:', response);
      
      // Nếu upload thành công, lấy URL từ response
      if (response && response.imageUrl) {
        console.log('[ProductFormPage] Image URL received:', response.imageUrl);
        return response.imageUrl;
      } else {
        console.error('[ProductFormPage] No imageUrl in response:', response);
        setError('Lỗi khi tải lên: Server không trả về URL hình ảnh');
        return null;
      }
    } catch (error) {
      console.error('[ProductFormPage] Upload error:', error);
      setError(`Lỗi khi tải lên: ${error.message || 'Không rõ lỗi'}`);
      return null;
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/admin/products')}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4">
          {isEditMode ? 'Edit Product' : 'Add New Product'}
        </Typography>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Product {isEditMode ? 'updated' : 'created'} successfully!
        </Alert>
      )}
      
      {/* Category Management Modal */}
      <Dialog open={categoryModalOpen} onClose={handleCloseCategoryModal}>
        <DialogTitle>Add New Category</DialogTitle>
        <DialogContent>
          {categoryError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {categoryError}
            </Alert>
          )}
          <DialogContentText sx={{ mb: 2 }}>
            Create a new product category that will be available for all products.
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="Category Name"
            fullWidth
            required
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            multiline
            rows={3}
            value={newCategoryDescription}
            onChange={(e) => setNewCategoryDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryModal} color="primary">
            Cancel
          </Button>
          <Button 
            onClick={handleCreateCategory} 
            color="primary"
            disabled={savingCategory || !newCategoryName.trim()}
          >
            {savingCategory ? <CircularProgress size={24} /> : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
      
      <Paper sx={{ p: 3 }}>
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
              <Typography variant="body2" gutterBottom>
                Product Image
              </Typography>
              <ImageUploader 
                imageUrl={formData.imageUrl}
                onImageChange={handleImageChange}
                path={`products/${productId || 'new'}`}
                disabled={saving}
              />
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
                    >
                      {categories.map((category) => (
                        <MenuItem key={category.id} value={category.id}>
                          {category.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Box sx={{ mt: 1 }}>
                    <Button 
                      size="small" 
                      onClick={handleOpenCategoryModal}
                      startIcon={<AddIcon />}
                    >
                      Manage Categories
                    </Button>
                  </Box>
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={formData.status === 'active'}
                        onChange={handleStatusChange}
                        color="primary"
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
                    onDelete={() => handleRemoveFeature(index)}
                    sx={{ mr: 1, mb: 1 }}
                  />
                ))}
              </Box>
              
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
                      <IconButton edge="end" onClick={() => handleRemoveSpecification(key)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={<Typography component="span" fontWeight="bold">{key}</Typography>}
                      secondary={value}
                    />
                  </ListItem>
                ))}
              </List>
              
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
                      <IconButton edge="end" onClick={() => handleRemoveDeliveryOption(index)}>
                        <DeleteIcon />
                      </IconButton>
                    }
                  >
                    <ListItemText
                      primary={option.name}
                      secondary={`$${option.price.toFixed(2)}`}
                    />
                  </ListItem>
                ))}
              </List>
              
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
            </Grid>
            
            {/* Submit Button */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                <Button
                  type="submit"
                  variant="contained"
                  size="large"
                  disabled={saving}
                >
                  {saving ? (
                    <CircularProgress size={24} />
                  ) : isEditMode ? (
                    'Update Product'
                  ) : (
                    'Create Product'
                  )}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Box>
  );
};

export default ProductFormPage; 