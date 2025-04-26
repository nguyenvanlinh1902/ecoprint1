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
  CloudUpload as UploadIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { api } from '../../helpers';
import ImageUploader from '@/components/ImageUploader';
import { TableContainer, Table, TableHead, TableBody, TableRow, TableCell } from '@mui/material';

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
    categoryId: '',
    status: 'active',
    features: [],
    specifications: {},
    deliveryOptions: [],
    imageUrl: '',
    imageFile: null,
    productType: 'simple',
    childProducts: [],
    isVisible: true,
    stock: 999,
    hasProductionOptions: false,
    productionOptionType: '',
    optionPrices: {
      'embroidery-standard': 0,
      'embroidery-fabric': 2,
      'embroidery-sequin': 2
    },
    printPositions: []
  });
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState([]);
  const [simpleProducts, setSimpleProducts] = useState([]);
  const [productOptions, setProductOptions] = useState([]);
  
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
  
  // Child Products Dialog state
  const [childProductsDialogOpen, setChildProductsDialogOpen] = useState(false);
  
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
              price: product.basePrice?.toString() || product.price?.toString() || '',
              sku: product.sku || '',
              categoryId: product.categoryId || '',
              status: product.status || 'active',
              features: product.features || [],
              specifications: formattedSpecs,
              deliveryOptions: product.deliveryOptions || [],
              imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
              imageFile: null,
              productType: product.productType || 'simple',
              parentSku: product.parentSku || '',
              childProducts: product.childProducts || [],
              isVisible: product.isVisible !== undefined ? product.isVisible : (product.productType === 'configurable'),
              stock: product.stock || 999,
              hasProductionOptions: product.hasProductionOptions || false,
              productionOptionType: product.productionOptionType || '',
              optionPrices: product.optionPrices || {
                'embroidery-standard': 0,
                'embroidery-fabric': 2,
                'embroidery-sequin': 2
              },
              printPositions: product.printPositions || []
            });
          } else {
            console.error('Failed to load product data:', response);
            setError('Failed to load product data. ' + (response?.data?.message || 'Invalid response format.'));
          }
        }
        
        // Fetch categories using the dedicated function
        await fetchCategories();
        
        // Fetch simple products for configurable product
        await fetchSimpleProducts();
        
        // Fetch product options
        await fetchProductOptions();
        
      } catch (error) {
        console.error('Error in ProductFormPage fetchData:', error);
        setError('Failed to load data: ' + (error.response?.data?.message || error.message || 'Unknown error'));
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [productId, isEditMode]);
  
  // Fetch simple products for configurable product
  const fetchSimpleProducts = async () => {
    try {
      const response = await api.admin.getAllProducts();
      if (response.data && response.data.success) {
        const products = response.data.data?.products || [];
        // Filter to get only simple products
        const simpleProductsList = products.filter(product => 
          product.productType === 'simple' || !product.productType
        );
        setSimpleProducts(simpleProductsList);
      } else {
        console.error('Failed to fetch simple products');
      }
    } catch (error) {
      console.error('Error fetching simple products:', error);
    }
  };
  
  // Fetch product options
  const fetchProductOptions = async () => {
    try {
      const response = await api.productOptions.getAllProductOptions();
      
      if (response.data && response.data.success) {
        setProductOptions(response.data.data || []);
      } else {
        console.error('Failed to load product options:', response);
        
        // Fallback to default options if API fails
        setProductOptions([
          { 
            id: 'embroidery',
            name: 'Thêu',
            description: 'Các loại thêu khác nhau',
            type: 'embroidery', 
            variants: [
              { 
                id: 'embroidery-standard',
                name: 'Thêu thường',
                basePrice: 0
              },
              { 
                id: 'embroidery-fabric',
                name: 'Thêu đáp vải',
                basePrice: 2
              },
              { 
                id: 'embroidery-sequin',
                name: 'Thêu kim tuyến',
                basePrice: 2
              }
            ]
          },
          { 
            id: 'print-position',
            name: 'Vị trí in',
            description: 'Các vị trí in ấn',
            type: 'position',
            variants: [
              { 
                id: 'position-front',
                name: 'Mặt trước',
                basePrice: 3
              },
              { 
                id: 'position-back',
                name: 'Mặt sau',
                basePrice: 3
              },
              { 
                id: 'position-slit',
                name: 'Xẻ tà bên trái/phải',
                basePrice: 1.5
              },
              { 
                id: 'position-other',
                name: 'Vị trí khác',
                basePrice: 1
              },
              { 
                id: 'position-hat',
                name: 'Vị trí mũ',
                basePrice: 1
              }
            ]
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching product options:', error);
      
      // Fallback to default options if API fails
      setProductOptions([
        { 
          id: 'embroidery',
          name: 'Thêu',
          description: 'Các loại thêu khác nhau',
          type: 'embroidery', 
          variants: [
            { 
              id: 'embroidery-standard',
              name: 'Thêu thường',
              basePrice: 0
            },
            { 
              id: 'embroidery-fabric',
              name: 'Thêu đáp vải',
              basePrice: 2
            },
            { 
              id: 'embroidery-sequin',
              name: 'Thêu kim tuyến',
              basePrice: 2
            }
          ]
        },
        { 
          id: 'print-position',
          name: 'Vị trí in',
          description: 'Các vị trí in ấn',
          type: 'position',
          variants: [
            { 
              id: 'position-front',
              name: 'Mặt trước',
              basePrice: 3
            },
            { 
              id: 'position-back',
              name: 'Mặt sau',
              basePrice: 3
            },
            { 
              id: 'position-slit',
              name: 'Xẻ tà bên trái/phải',
              basePrice: 1.5
            },
            { 
              id: 'position-other',
              name: 'Vị trí khác',
              basePrice: 1
            },
            { 
              id: 'position-hat',
              name: 'Vị trí mũ',
              basePrice: 1
            }
          ]
        }
      ]);
    }
  };
  
  // Hàm xử lý dữ liệu phức tạp của optionPrices và printPositions
  const normalizeProductData = (data) => {
    // Chuyển đổi childProducts để đảm bảo chỉ lưu ID hoặc dữ liệu cần thiết
    const normalizedChildProducts = Array.isArray(data.childProducts) 
      ? data.childProducts.map(child => {
          if (typeof child === 'string') return child;
          return child.id || child.sku || child;
        })
      : [];
    
    // Chuyển đổi optionPrices thành object đơn giản
    const normalizedOptionPrices = {};
    if (data.optionPrices) {
      Object.entries(data.optionPrices).forEach(([key, value]) => {
        normalizedOptionPrices[key] = typeof value === 'object' ? value.price || 0 : Number(value);
      });
    }
    
    // Đảm bảo printPositions là mảng đơn giản
    const normalizedPrintPositions = Array.isArray(data.printPositions)
      ? data.printPositions.map(pos => {
          if (typeof pos === 'string') return { id: pos, price: 0 };
          if (typeof pos === 'object') return { 
            id: pos.id || '', 
            name: pos.name || '',
            price: Number(pos.price || 0) 
          };
          return pos;
        })
      : [];
    
    return {
      ...data,
      childProducts: normalizedChildProducts,
      optionPrices: normalizedOptionPrices,
      printPositions: normalizedPrintPositions
    };
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'productType') {
      // Nếu thay đổi loại sản phẩm, tự động cập nhật isVisible
      // Simple products mặc định ẩn (false), configurable mặc định hiển thị (true)
      setFormData((prev) => ({
        ...prev,
        [name]: value,
        isVisible: value === 'configurable'
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
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
        // Fallback to predefined categories
        setCategories([
          {
            id: 'hoodies',
            name: 'Hoodies',
            description: 'Áo hoodie các loại'
          },
          {
            id: 'tshirts',
            name: 'T-shirts',
            description: 'Áo thun ngắn tay'
          },
          {
            id: 'polos',
            name: 'Polos',
            description: 'Áo polo có cổ'
          },
          {
            id: 'hats',
            name: 'Hats',
            description: 'Mũ các loại'
          },
          {
            id: 'tanktops',
            name: 'Tank Tops',
            description: 'Áo không tay'
          },
          {
            id: 'pants',
            name: 'Pants',
            description: 'Quần các loại'
          },
          {
            id: 'sweatshirts',
            name: 'Sweatshirts',
            description: 'Áo nỉ không mũ'
          },
          {
            id: 'jackets',
            name: 'Jackets',
            description: 'Áo khoác các loại'
          },
          {
            id: 'others',
            name: 'Other Products',
            description: 'Các sản phẩm khác'
          }
        ]);
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
            categoryId: newCategory.id
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
    
    if (!formData.categoryId) {
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
      
      // Normalize product data to ensure proper format
      const normalizedFormData = normalizeProductData(formData);
      
      // Prepare product data
      const productData = {
        name: normalizedFormData.name,
        description: normalizedFormData.description || '',
        basePrice: Number(normalizedFormData.price),
        sku: normalizedFormData.sku || `SKU-${Date.now()}`,
        categoryId: normalizedFormData.categoryId,
        stock: Number(normalizedFormData.stock) || 999,
        status: normalizedFormData.status || 'active',
        features: normalizedFormData.features || [],
        specifications: normalizedFormData.specifications || {},
        deliveryOptions: normalizedFormData.deliveryOptions || [],
        productType: normalizedFormData.productType || 'simple',
        childProducts: normalizedFormData.childProducts || [],
        isVisible: normalizedFormData.isVisible || true,
        hasProductionOptions: normalizedFormData.hasProductionOptions || false,
        productionOptionType: normalizedFormData.productionOptionType || '',
        optionPrices: normalizedFormData.optionPrices || {
          'embroidery-standard': 0,
          'embroidery-fabric': 2,
          'embroidery-sequin': 2
        },
        printPositions: normalizedFormData.printPositions || []
      };
      
      // Add the image URL (either existing or newly uploaded)
      if (uploadedImageUrl) {
        productData.images = [uploadedImageUrl];
      }
      
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
                  <TextField
                    name="stock"
                    label="Stock Quantity"
                    type="number"
                    fullWidth
                    value={formData.stock}
                    onChange={handleInputChange}
                    InputProps={{
                      inputProps: { min: 0 }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth required>
                    <InputLabel>Category</InputLabel>
                    <Select
                      name="categoryId" 
                      label="Category"
                      value={formData.categoryId}
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
                Product Type
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <FormControl fullWidth required>
                <InputLabel>Product Type</InputLabel>
                <Select
                  name="productType"
                  label="Product Type"
                  value={formData.productType}
                  onChange={handleInputChange}
                >
                  <MenuItem value="simple">Simple</MenuItem>
                  <MenuItem value="configurable">Configurable</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* Child Products */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                Child Products
              </Typography>
              <Divider sx={{ mb: 2 }} />
              {formData.productType === 'configurable' ? (
                <>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle1">
                      Child Products ({formData.childProducts.length})
                    </Typography>
                    <Button
                      variant="outlined"
                      size="small"
                      color="primary"
                      onClick={() => {
                        // Mở dialog hiển thị child products
                        setChildProductsDialogOpen(true);
                      }}
                      disabled={formData.childProducts.length === 0}
                    >
                      View Child Products
                    </Button>
                  </Box>
                  
                  <List dense>
                    {formData.childProducts.map((childId, index) => {
                      // Find child product information from simpleProducts list
                      const childProduct = simpleProducts.find(p => p.id === childId);
                      
                      // Handle the case where childId might be an object
                      const isChildObject = typeof childId === 'object' && childId !== null;
                      const displayId = isChildObject ? (childId.sku || childId.id || 'Unknown') : childId;
                      
                      return (
                        <ListItem
                          key={index}
                          secondaryAction={
                            <IconButton edge="end" onClick={() => {
                              const updatedChildProducts = formData.childProducts.filter((_, i) => i !== index);
                              setFormData((prev) => ({
                                ...prev,
                                childProducts: updatedChildProducts
                              }));
                            }}>
                              <DeleteIcon />
                            </IconButton>
                          }
                        >
                          <ListItemText
                            primary={childProduct ? childProduct.name : displayId}
                            secondary={childProduct ? `SKU: ${childProduct.sku || 'N/A'}` : 'Product not found'}
                          />
                        </ListItem>
                      );
                    })}
                  </List>

                  <FormControl fullWidth sx={{ mt: 2 }}>
                    <InputLabel>Add Child Product</InputLabel>
                    <Select
                      label="Add Child Product"
                      value=""
                      onChange={(e) => {
                        if (e.target.value) {
                          // Check for duplicates
                          if (!formData.childProducts.includes(e.target.value)) {
                            setFormData((prev) => ({
                              ...prev,
                              childProducts: [...prev.childProducts, e.target.value]
                            }));
                          }
                        }
                      }}
                    >
                      <MenuItem value="">-- Select a product --</MenuItem>
                      {simpleProducts
                        .filter(p => !formData.childProducts.includes(p.id))
                        .map((product) => (
                          <MenuItem key={product.id} value={product.id}>
                            {product.name} (SKU: {product.sku})
                          </MenuItem>
                        ))}
                    </Select>
                  </FormControl>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Note: Only simple products can be added as child products.
                  </Typography>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Child products are only available for configurable products. Change product type to "Configurable" first.
                </Typography>
              )}
            </Grid>
            
            {/* Visibility */}
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={formData.isVisible}
                    onChange={(e) => setFormData((prev) => ({
                      ...prev,
                      isVisible: e.target.checked
                    }))}
                    color="primary"
                  />
                }
                label={formData.productType === 'configurable' 
                  ? "Visible (Configurable products should be visible for customers to see)" 
                  : "Visible (Simple products are typically hidden and only selectable as child products)"}
              />
              {formData.productType === 'simple' && formData.isVisible && (
                <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 1 }}>
                  Warning: Simple products are typically hidden. Only make this product visible if it needs to be purchased directly.
                </Typography>
              )}
            </Grid>
            
            {/* Production Options */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                  Production Options
                </Typography>
                <FormControlLabel
                  control={
                    <Switch
                      checked={formData.hasProductionOptions}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        hasProductionOptions: e.target.checked
                      }))}
                      color="primary"
                    />
                  }
                  label="Enable Production Options"
                />
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {formData.hasProductionOptions ? (
                <>
                  {/* Select Production Option Type */}
                  <Box sx={{ mb: 3 }}>
                    <FormControl fullWidth required>
                      <InputLabel>Production Option Type</InputLabel>
                      <Select
                        name="productionOptionType"
                        label="Production Option Type"
                        value={formData.productionOptionType || ''}
                        onChange={(e) => {
                          const selectedOptionType = e.target.value;
                          setFormData(prev => ({
                            ...prev,
                            productionOptionType: selectedOptionType
                          }));
                        }}
                      >
                        <MenuItem value="">-- Select Option Type --</MenuItem>
                        {productOptions.map(option => (
                          <MenuItem key={option.id} value={option.id}>
                            {option.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Box>

                  {formData.productionOptionType === 'embroidery' && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Embroidery Options
                      </Typography>
                      <Grid container spacing={2}>
                        {productOptions.find(opt => opt.id === 'embroidery')?.variants.map(variant => {
                          // Get current price value safely handling complex objects
                          const currentOption = formData.optionPrices?.[variant.id];
                          const currentPrice = typeof currentOption === 'object' 
                            ? currentOption.price || variant.basePrice
                            : (currentOption !== undefined ? currentOption : variant.basePrice);
                            
                          return (
                            <Grid item xs={12} sm={4} key={variant.id}>
                              <Paper elevation={2} sx={{ p: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>
                                  {variant.name}
                                </Typography>
                                <TextField
                                  fullWidth
                                  label="Price"
                                  type="number"
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                  }}
                                  value={currentPrice}
                                  onChange={(e) => setFormData(prev => ({
                                    ...prev,
                                    optionPrices: {
                                      ...prev.optionPrices,
                                      [variant.id]: Number(e.target.value)
                                    }
                                  }))}
                                />
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}

                  {formData.productionOptionType === 'print-position' && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Print Positions
                      </Typography>
                      <Grid container spacing={2}>
                        {productOptions.find(opt => opt.id === 'print-position')?.variants.map(position => {
                          // Find position in formData.printPositions by id
                          let existingPosition = null;
                          if (Array.isArray(formData.printPositions)) {
                            existingPosition = formData.printPositions.find(p => 
                              typeof p === 'object' ? p.id === position.id : p === position.id
                            );
                          }
                          
                          // Get current price safely
                          const currentPrice = existingPosition 
                            ? (typeof existingPosition === 'object' ? existingPosition.price : position.basePrice)
                            : position.basePrice;
                          
                          return (
                            <Grid item xs={12} sm={4} key={position.id}>
                              <Paper 
                                elevation={2} 
                                sx={{ 
                                  p: 2,
                                  border: existingPosition ? '2px solid #1976d2' : 'none'
                                }}
                              >
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                  <Typography variant="subtitle2">{position.name}</Typography>
                                  <Switch
                                    checked={!!existingPosition}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        // Add position if not already in the array
                                        if (!existingPosition) {
                                          setFormData(prev => ({
                                            ...prev,
                                            printPositions: [
                                              ...(Array.isArray(prev.printPositions) ? prev.printPositions : []),
                                              {
                                                id: position.id,
                                                name: position.name,
                                                price: position.basePrice
                                              }
                                            ]
                                          }));
                                        }
                                      } else {
                                        // Remove position if it exists
                                        setFormData(prev => ({
                                          ...prev,
                                          printPositions: Array.isArray(prev.printPositions)
                                            ? prev.printPositions.filter(p => 
                                                typeof p === 'object' ? p.id !== position.id : p !== position.id
                                              )
                                            : []
                                        }));
                                      }
                                    }}
                                    color="primary"
                                  />
                                </Box>
                                <TextField
                                  fullWidth
                                  label="Price"
                                  type="number"
                                  InputProps={{
                                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                  }}
                                  value={currentPrice}
                                  onChange={(e) => {
                                    if (existingPosition) {
                                      // Update price if position exists
                                      setFormData(prev => ({
                                        ...prev,
                                        printPositions: Array.isArray(prev.printPositions)
                                          ? prev.printPositions.map(p => {
                                              if (typeof p === 'object' && p.id === position.id) {
                                                return {...p, price: Number(e.target.value)};
                                              } else if (p === position.id) {
                                                return {id: position.id, name: position.name, price: Number(e.target.value)};
                                              }
                                              return p;
                                            })
                                          : [{id: position.id, name: position.name, price: Number(e.target.value)}]
                                      }));
                                    } else {
                                      // Add position with new price
                                      setFormData(prev => ({
                                        ...prev,
                                        printPositions: [
                                          ...(Array.isArray(prev.printPositions) ? prev.printPositions : []),
                                          {
                                            id: position.id,
                                            name: position.name,
                                            price: Number(e.target.value)
                                          }
                                        ]
                                      }));
                                    }
                                  }}
                                  disabled={!existingPosition}
                                />
                              </Paper>
                            </Grid>
                          );
                        })}
                      </Grid>
                    </Box>
                  )}
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Production options are disabled for this product. Enable the switch above to configure production options.
                </Typography>
              )}
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
      
      {/* Child Products Dialog */}
      <Dialog
        open={childProductsDialogOpen}
        onClose={() => setChildProductsDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Child Products
          <IconButton
            aria-label="close"
            onClick={() => setChildProductsDialogOpen(false)}
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {formData.childProducts.length > 0 ? (
            <TableContainer component={Paper}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>SKU</TableCell>
                    <TableCell>Name</TableCell>
                    <TableCell>Color</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>Price</TableCell>
                    <TableCell>Stock</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formData.childProducts.map((childId, index) => {
                    // Find child product information
                    const childProduct = simpleProducts.find(p => p.id === childId);
                    const isChildObject = typeof childId === 'object' && childId !== null;
                    
                    if (!childProduct && !isChildObject) {
                      return (
                        <TableRow key={index}>
                          <TableCell colSpan={7} align="center">
                            <Typography color="error">
                              Product data not found (ID: {childId})
                            </Typography>
                          </TableCell>
                        </TableRow>
                      );
                    }
                    
                    // Get data either from childProduct object or from childId if it's an object
                    const data = childProduct || childId;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>{data.sku || 'N/A'}</TableCell>
                        <TableCell>{data.name || 'Unknown'}</TableCell>
                        <TableCell>{data.color || (isChildObject ? childId.color : 'N/A')}</TableCell>
                        <TableCell>{data.size || (isChildObject ? childId.size : 'N/A')}</TableCell>
                        <TableCell>
                          ${parseFloat(data.price || data.basePrice || (isChildObject ? childId.price : 0)).toFixed(2)}
                        </TableCell>
                        <TableCell>{data.stock || 'In stock'}</TableCell>
                        <TableCell>
                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => {
                              if (childProduct) {
                                // Navigate to edit page for this child product
                                navigate(`/admin/products/edit/${childProduct.id}`);
                              }
                            }}
                            disabled={!childProduct}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" align="center" py={3}>
              No child products available
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChildProductsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductFormPage; 