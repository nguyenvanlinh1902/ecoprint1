import React, {useEffect, useState} from 'react';
import {useLocation, useNavigate, useParams} from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  IconButton,
  InputAdornment,
  InputLabel,
  List,
  ListItem,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import {
  Add as AddIcon,
  ArrowBack as ArrowBackIcon,
  Clear as ClearIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  FileUpload as FileUploadIcon,
  Filter as FilterIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import api from '@/api';

const ProductsPage = () => {
  const navigate = useNavigate();
  const { productId } = useParams();
  const location = useLocation();
  
  // Determine if we're in view mode based on URL path
  const isViewMode = location.pathname.includes('/view');
  // Determine if we're in edit mode based on URL path
  const isEditMode = location.pathname.includes('/edit');
  
  // Redirect to ProductFormPage if this is an edit route
  useEffect(() => {
    if (isEditMode && productId) {
      navigate(`/admin/products/${productId}/edit`, { replace: true });
    }
  }, [isEditMode, productId, navigate]);
  
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
  
  // Category modal state
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [categoryFormData, setCategoryFormData] = useState({ name: '', description: '' });
  const [categoryError, setCategoryError] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState(false);
  const [categoryDeleteDialogOpen, setCategoryDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  
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
    imageUrl: '',
    imageFile: null,
    productType: 'simple',
    childProducts: [],
    isVisible: true,
    stock: 0,
    hasProductionOptions: false,
    productionOptionType: 'print', // Default option type
    printOptions: {
      basePosition: 'chest_left',
      additionalPositions: {
        sleeve: { price: 2, available: true },
        back: { price: 4, available: true },
        special: { price: 4, available: true }
      }
    }
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
  
  // Product Options modal state
  const [productOptionModalOpen, setProductOptionModalOpen] = useState(false);
  const [productOptionFormData, setProductOptionFormData] = useState({ 
    name: '', 
    description: '',
    type: 'print', // print, rental, etc.
    basePrice: 0,
    positions: [] // List of positions for this option
  });
  const [productOptionError, setProductOptionError] = useState('');
  const [editingProductOption, setEditingProductOption] = useState(null);
  const [savingProductOption, setSavingProductOption] = useState(false);
  const [productOptions, setProductOptions] = useState([]);
  
  // State for delete product option dialog
  const [deleteProductOptionDialogOpen, setDeleteProductOptionDialogOpen] = useState(false);
  const [productOptionToDelete, setProductOptionToDelete] = useState(null);
  const [deletingProductOption, setDeletingProductOption] = useState(false);

  // Load products and categories
  useEffect(() => {
    fetchProducts();
    fetchCategories();
    fetchProductOptions();
  }, [page, rowsPerPage, filters]);
  
  // Load product data if in edit/view mode
  useEffect(() => {
    if (productId) {
      loadProductData();
    }
  }, [productId]);
  
  const loadProductData = async () => {
    if (!productId) return;
    
    setLoading(true);
    setFormError('');
    
    try {
      const response = await api.admin.getProduct(productId);
      
      if (response?.data?.success) {
        const product = response.data.data;
        
        // Kiểm tra xem sản phẩm có printOptions hay không
        const hasPrintOptions = product.hasProductionOptions || 
          (product.printOptions && Object.keys(product.printOptions).length > 0);
        
        // Format data to match form structure
        setFormData({
          name: product.name || '',
          description: product.description || '',
          price: product.price?.toString() || '',
          sku: product.sku || '',
          category: product.categoryId || '',
          status: product.status || 'active',
          imageUrl: product.images && product.images.length > 0 ? product.images[0] : '',
          imageFile: null,
          productType: product.productType || 'simple',
          childProducts: product.childProducts || [],
          isVisible: product.isVisible !== undefined ? product.isVisible : true,
          stock: product.stock || 0,
          hasProductionOptions: hasPrintOptions,
          productionOptionType: product.productionOptionType || 'print',
          printOptions: product.printOptions || {
            basePosition: 'chest_left',
            additionalPositions: {
              sleeve: { price: 2, available: true },
              back: { price: 4, available: true },
              special: { price: 4, available: true }
            }
          }
        });
      } else {
        setFormError('Failed to load product data. Invalid response format.');
      }
    } catch (error) {
      setFormError('Failed to load product data: ' + (error.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      // Only send pagination parameters, no filtering
      const response = await api.admin.getAllProducts({
        page: page + 1,
        limit: rowsPerPage
      });
      
      if (response?.data?.success) {
        // Cập nhật cấu trúc dữ liệu - lấy products từ data.products
        const productsData = response.data.data?.products || [];
        const paginationData = response.data.data?.pagination || { 
          total: 0, 
          page: 1, 
          totalPages: 1 
        };
        
        console.log('Fetched admin products:', productsData.length);
        
        // Ensure products is always an array
        if (!Array.isArray(productsData)) {
          setProducts([]);
        } else {
          // Apply client-side filtering
          let filteredProducts = productsData;
          
          // Filter by search term
          if (filters.search) {
            const searchLower = filters.search.toLowerCase();
            filteredProducts = filteredProducts.filter(product => 
              (product.name && product.name.toLowerCase().includes(searchLower)) ||
              (product.description && product.description.toLowerCase().includes(searchLower)) ||
              (product.sku && product.sku.toLowerCase().includes(searchLower))
            );
          }
          
          // Filter by category
          if (filters.category) {
            filteredProducts = filteredProducts.filter(product => 
              product.categoryId === filters.category
            );
          }
          
          // Filter by status
          if (filters.status) {
            filteredProducts = filteredProducts.filter(product => 
              product.status === filters.status
            );
          }
          
          console.log('Filtered to', filteredProducts.length, 'products');
          setProducts(filteredProducts);
        }
        
        setTotal(paginationData.total || 0);
        setError('');
      } else {
        setError('Failed to load products. Please try again.');
        setProducts([]);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      setError(
        error.response?.data?.message || 
        'Error fetching products: ' + (error.message || 'Unknown error')
      );
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchCategories = async () => {
    try {
      // Sử dụng api.products.getCategories thay vì api.admin.getAllCategories
      const response = await api.products.getCategories();
      
      if (response.data && response.data.success) {
        setCategories(response.data.data || []);
      } else {
        setCategories([]);
      }
    } catch (error) {
      // Không hiển thị lỗi cho người dùng, chỉ xử lý im lặng
      setCategories([]);
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
    // Just fetch the products again and apply client-side filtering
    fetchProducts();
  };
  
  const handleClearFilters = () => {
    setFilters({
      search: '',
      category: '',
      status: ''
    });
    // Refetch without filters
    fetchProducts();
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
      await api.admin.deleteProduct(productToDelete.id);
      
      setProducts(products.filter(p => p.id !== productToDelete.id));
      handleDeleteDialogClose();
      
      // Check if we need to go back a page
      if (products.length === 1 && page > 0) {
        setPage(prev => prev - 1);
      } else {
        fetchProducts();
      }
    } catch (error) {
      /* error removed */
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
      submitData.append('productType', formData.productType);
      submitData.append('isVisible', formData.isVisible);
      submitData.append('stock', formData.stock);
      submitData.append('hasProductionOptions', formData.hasProductionOptions);
      
      // Add printOptions (Production Options) as JSON string only if enabled
      if (formData.hasProductionOptions) {
        submitData.append('printOptions', JSON.stringify(formData.printOptions));
      }
      
      // Add childProducts if any
      if (formData.childProducts && formData.childProducts.length > 0) {
        submitData.append('childProducts', JSON.stringify(formData.childProducts));
      }
      
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
      
      if (productId) {
        // Use updateProduct for editing
        await api.admin.updateProduct(productId, submitData);
      } else {
        // Use createProduct for new products
        await api.admin.createProduct(submitData);
      }
      
      setSuccess(true);
      
      // Return to products list after a short delay
      setTimeout(() => {
        navigate('/admin/products');
        setSuccess(false);
      }, 1500);
      
    } catch (error) {
      /* error removed */
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
  
  const handleAddProduct = () => {
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
        imageUrl: '',
        imageFile: null,
        productType: 'simple',
        childProducts: [],
        isVisible: true,
        stock: 0,
        hasProductionOptions: false,
        productionOptionType: 'print',
        printOptions: {
          basePosition: 'chest_left',
          additionalPositions: {
            sleeve: { price: 2, available: true },
            back: { price: 4, available: true },
            special: { price: 4, available: true }
          }
        }
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
      const response = await api.get('/products/template', {
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
      /* error removed */
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

      // Use the importBatch method
      const response = await api.orders.importBatch(formData);

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
      /* error removed */
      setImportError(error.response?.data?.message || 'Failed to import products. Please try again.');
    } finally {
      setImporting(false);
    }
  };

  // Category management functions
  const handleOpenCategoryModal = (category = null) => {
    if (category) {
      setEditingCategory(category);
      setCategoryFormData({
        name: category.name || '',
        description: category.description || ''
      });
    } else {
      setEditingCategory(null);
      setCategoryFormData({
        name: '',
        description: ''
      });
    }
    setCategoryError('');
    setCategoryModalOpen(true);
  };

  const handleCloseCategoryModal = () => {
    setCategoryModalOpen(false);
    setCategoryFormData({ name: '', description: '' });
    setCategoryError('');
    setEditingCategory(null);
  };

  const handleCategoryInputChange = (e) => {
    const { name, value } = e.target;
    setCategoryFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSaveCategory = async () => {
    if (!categoryFormData.name.trim()) {
      setCategoryError('Category name is required');
      return;
    }

    try {
      setSavingCategory(true);
      setCategoryError('');

      if (editingCategory) {
        // Update existing category
        const response = await api.admin.updateCategory(editingCategory.id, categoryFormData);
        
        if (response.data && response.data.success) {
          // Update the category in the list
          setCategories(prev => 
            prev.map(cat => 
              cat.id === editingCategory.id ? response.data.data : cat
            )
          );
          
          // Also update any products that use this category
          if (products.some(p => p.category?.id === editingCategory.id)) {
            fetchProducts();
          }
        } else {
          throw new Error(response.data?.message || 'Failed to update category');
        }
      } else {
        // Create new category
        const response = await api.products.createCategory(categoryFormData);
        
        if (response.data && response.data.success) {
          // Add the new category to the list
          setCategories(prev => [...prev, response.data.data]);
        } else {
          throw new Error(response.data?.message || 'Failed to create category');
        }
      }
      
      handleCloseCategoryModal();
    } catch (error) {
      console.error('Error saving category:', error);
      setCategoryError(error.response?.data?.message || error.message || 'Failed to save category');
    } finally {
      setSavingCategory(false);
    }
  };

  const handleDeleteCategoryClick = (category) => {
    setCategoryToDelete(category);
    setCategoryDeleteDialogOpen(true);
  };

  const handleDeleteCategoryCancel = () => {
    setCategoryDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    try {
      setDeletingCategory(true);
      
      const response = await api.admin.deleteCategory(categoryToDelete.id);
      
      if (response.data && response.data.success) {
        // Remove the category from the list
        setCategories(prev => prev.filter(cat => cat.id !== categoryToDelete.id));
        
        // If products were filtered by this category, reset the filter
        if (filters.category === categoryToDelete.id) {
          setFilters(prev => ({ ...prev, category: '' }));
          fetchProducts();
        }
        
        setCategoryDeleteDialogOpen(false);
      } else {
        throw new Error(response.data?.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error.response?.data?.message || error.message || 'Failed to delete category');
      // Keep the dialog open to show the error
    } finally {
      setDeletingCategory(false);
    }
  };

  // Product Options Management functions
  const handleOpenProductOptionModal = (option = null) => {
    if (option) {
      setEditingProductOption(option);
      setProductOptionFormData({
        name: option.name || '',
        description: option.description || '',
        type: option.type || 'print',
        basePrice: option.basePrice || 0,
        positions: option.positions || []
      });
    } else {
      setEditingProductOption(null);
      setProductOptionFormData({
        name: '',
        description: '',
        type: 'print',
        basePrice: 0,
        positions: []
      });
    }
    setProductOptionError('');
    setProductOptionModalOpen(true);
  };

  const handleCloseProductOptionModal = () => {
    setProductOptionModalOpen(false);
    setProductOptionFormData({
      name: '',
      description: '',
      type: 'print',
      basePrice: 0,
      positions: []
    });
    setProductOptionError('');
    setEditingProductOption(null);
  };

  const handleProductOptionInputChange = (e) => {
    const { name, value } = e.target;
    setProductOptionFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddPosition = () => {
    setProductOptionFormData(prev => ({
      ...prev,
      positions: [
        ...prev.positions,
        {
          id: `position_${Date.now()}`,
          name: 'New Position',
          basePrice: 0,
          default: prev.positions.length === 0 // First position is default
        }
      ]
    }));
  };

  const handlePositionChange = (index, field, value) => {
    const newPositions = [...productOptionFormData.positions];
    newPositions[index] = {
      ...newPositions[index],
      [field]: value
    };
    
    setProductOptionFormData(prev => ({
      ...prev,
      positions: newPositions
    }));
  };

  const handleRemovePosition = (index) => {
    const newPositions = [...productOptionFormData.positions];
    newPositions.splice(index, 1);
    
    // If we removed the default position, make the first one default
    if (newPositions.length > 0 && productOptionFormData.positions[index].default) {
      newPositions[0].default = true;
    }
    
    setProductOptionFormData(prev => ({
      ...prev,
      positions: newPositions
    }));
  };

  const handleSetDefaultPosition = (index) => {
    const newPositions = [...productOptionFormData.positions].map((pos, i) => ({
      ...pos,
      default: i === index
    }));
    
    setProductOptionFormData(prev => ({
      ...prev,
      positions: newPositions
    }));
  };

  const handleSaveProductOption = async () => {
    if (!productOptionFormData.name.trim()) {
      setProductOptionError('Product option name is required');
      return;
    }

    try {
      setSavingProductOption(true);
      
      // Generate a unique ID if new
      const optionId = editingProductOption ? 
        editingProductOption.id : 
        productOptionFormData.name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now();
      
      const updatedOption = {
        ...productOptionFormData,
        id: optionId
      };
      
      let result;
      
      if (editingProductOption) {
        // Update existing option using API
        result = await api.productOptions.updateProductOption(optionId, updatedOption);
      } else {
        // Create new option using API
        result = await api.productOptions.createProductOption(updatedOption);
      }
      
      if (!result.data || !result.data.success) {
        throw new Error(result.data?.message || 'Failed to save product option');
      }
      
      // Refresh product options list
      await fetchProductOptions();
      
      // Show success message or notification
      setError('');
      
      // Close the modal
      handleCloseProductOptionModal();
    } catch (error) {
      console.error('Error saving product option:', error);
      setProductOptionError(error.message || 'Failed to save product option');
    } finally {
      setSavingProductOption(false);
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
          { id: 'print', name: 'Print', description: 'Print designs on clothing', type: 'print', 
            positions: [
              { id: 'chest_left', name: 'Chest Left', basePrice: 0, default: true },
              { id: 'chest_right', name: 'Chest Right', basePrice: 0 },
              { id: 'chest_center', name: 'Chest Center', basePrice: 0 },
              { id: 'back', name: 'Back', basePrice: 4 },
              { id: 'sleeve', name: 'Sleeve', basePrice: 2 },
              { id: 'special', name: 'Special', basePrice: 4 }
            ]
          },
          { id: 'rental', name: 'Rental', description: 'Rent the product', type: 'rental', positions: [] }
        ]);
      }
    } catch (error) {
      console.error('Error fetching product options:', error);
      
      // Fallback to default options if API fails
      setProductOptions([
        { id: 'print', name: 'Print', description: 'Print designs on clothing', type: 'print', 
          positions: [
            { id: 'chest_left', name: 'Chest Left', basePrice: 0, default: true },
            { id: 'chest_right', name: 'Chest Right', basePrice: 0 },
            { id: 'chest_center', name: 'Chest Center', basePrice: 0 },
            { id: 'back', name: 'Back', basePrice: 4 },
            { id: 'sleeve', name: 'Sleeve', basePrice: 2 },
            { id: 'special', name: 'Special', basePrice: 4 }
          ]
        },
        { id: 'rental', name: 'Rental', description: 'Rent the product', type: 'rental', positions: [] }
      ]);
    }
  };

  // Open delete product option dialog
  const handleOpenDeleteProductOptionDialog = (option) => {
    setProductOptionToDelete(option);
    setDeleteProductOptionDialogOpen(true);
  };

  // Close delete product option dialog
  const handleCloseDeleteProductOptionDialog = () => {
    setProductOptionToDelete(null);
    setDeleteProductOptionDialogOpen(false);
  };

  // Delete product option
  const handleDeleteProductOption = async () => {
    if (!productOptionToDelete) return;
    
    try {
      setDeletingProductOption(true);
      
      const result = await api.productOptions.deleteProductOption(productOptionToDelete.id);
      
      if (!result.data || !result.data.success) {
        throw new Error(result.data?.message || 'Failed to delete product option');
      }
      
      // Refresh product options list
      await fetchProductOptions();
      
      // Close dialog
      handleCloseDeleteProductOptionDialog();
    } catch (error) {
      console.error('Error deleting product option:', error);
      setError(error.message || 'Failed to delete product option');
    } finally {
      setDeletingProductOption(false);
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Products</Typography>
        
        <Box>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            sx={{ mr: 1 }}
            onClick={() => window.open('/api/admin/products/export-template', '_blank')}
          >
            Template
          </Button>
          
          <Button
            variant="outlined"
            startIcon={<FileUploadIcon />}
            sx={{ mr: 1 }}
            onClick={() => setImportDialogOpen(true)}
          >
            Import
          </Button>
          
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCategoryModal()}
            sx={{ mr: 1 }}
          >
            Add Category
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddProduct}
          >
            Add Product
          </Button>
        </Box>
      </Box>
      
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
                    {Array.isArray(categories) && categories.filter(Boolean).map((category) => (
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

          {/* Filters */}
          <Paper sx={{ p: 2, mb: 3 }}>
            <Grid container spacing={2} alignItems="center">
              {/* Filter fields */}
            </Grid>
          </Paper>
          
          <TableContainer component={Paper} sx={{ width: '100%', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 800 }}>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Category</TableCell>
                  <TableCell>Price</TableCell>
                  <TableCell>Stock</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="center">Image</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <CircularProgress />
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      <Alert severity="error">{error}</Alert>
                    </TableCell>
                  </TableRow>
                ) : products.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} align="center">
                      No products found.
                    </TableCell>
                  </TableRow>
                ) : (
                  Array.isArray(products) && products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {product.images && product.images.length > 0 ? (
                            <Box
                              component="img"
                              src={product.images[0]}
                              alt={product.name}
                              sx={{ width: 40, height: 40, mr: 2, objectFit: 'contain' }}
                            />
                          ) : (
                            <Box
                              component="div"
                              sx={{ 
                                width: 40, 
                                height: 40, 
                                mr: 2, 
                                bgcolor: 'grey.200', 
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'text.secondary',
                                fontSize: '10px'
                              }}
                            >
                              No Image
                            </Box>
                          )}
                          {product.name}
                        </Box>
                      </TableCell>
                      <TableCell>
                        {product.categoryName || (product.categoryId ? 'Unknown Category' : 'No Category')}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat('vi-VN', {
                          style: 'currency',
                          currency: 'VND'
                        }).format(product.price || 0)}
                      </TableCell>
                      <TableCell>
                        {product.stock}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={product.status} 
                          color={product.status === 'active' ? 'success' : 'default'} 
                          size="small" 
                        />
                      </TableCell>
                      <TableCell align="center">
                        {product.images && product.images.length > 0 ? (
                          <img 
                            src={product.images[0]} 
                            alt={product.name}
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : (
                          <Box 
                            bgcolor="grey.200" 
                            width={50} 
                            height={50} 
                            display="flex" 
                            alignItems="center" 
                            justifyContent="center"
                            borderRadius={1}
                          >
                            No Img
                          </Box>
                        )}
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
                      {!isViewMode && (
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button 
                            size="small" 
                            onClick={() => handleOpenCategoryModal()}
                            startIcon={<AddIcon />}
                          >
                            Manage Categories
                          </Button>
                        </Box>
                      )}
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
              
              {/* Production Options (Renamed from Print Options) */}
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    Production Options
                  </Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => handleOpenProductOptionModal()}
                      sx={{ mr: 2 }}
                      disabled={isViewMode}
                    >
                      Manage Options
                    </Button>
                    <FormControlLabel
                      control={
                        <Switch
                          checked={formData.hasProductionOptions}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            hasProductionOptions: e.target.checked
                          }))}
                          color="primary"
                          disabled={isViewMode}
                        />
                      }
                      label="Enable Production Options"
                    />
                  </Box>
                </Box>
                <Divider sx={{ mb: 2 }} />
                
                {formData.hasProductionOptions ? (
                  <>
                    {/* Select Production Option Type */}
                    <Box sx={{ mb: 3 }}>
                      <FormControl fullWidth required disabled={isViewMode}>
                        <InputLabel>Production Option Type</InputLabel>
                        <Select
                          name="productionOptionType"
                          label="Production Option Type"
                          value={formData.productionOptionType || 'print'}
                          onChange={(e) => {
                            const selectedOptionType = e.target.value;
                            const selectedOption = productOptions.find(opt => opt.id === selectedOptionType);
                            
                            // Find default position
                            const defaultPosition = selectedOption?.positions?.find(pos => pos.default);
                            
                            setFormData(prev => ({
                              ...prev,
                              productionOptionType: selectedOptionType,
                              printOptions: {
                                basePosition: defaultPosition?.id || (selectedOption?.positions?.[0]?.id || ''),
                                additionalPositions: selectedOption?.positions
                                  ?.filter(pos => !pos.default && pos.id !== defaultPosition?.id)
                                  ?.reduce((acc, pos) => ({
                                    ...acc,
                                    [pos.id]: { price: pos.basePrice, available: false }
                                  }), {}) || {}
                              }
                            }));
                          }}
                        >
                          {productOptions.map(option => (
                            <MenuItem key={option.id} value={option.id}>
                              {option.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Box>

                    {/* Dynamic Option Display based on selected type */}
                    {(() => {
                      const selectedOption = productOptions.find(opt => opt.id === formData.productionOptionType);
                      
                      // If no positions, show a message
                      if (!selectedOption?.positions || selectedOption.positions.length === 0) {
                        return (
                          <Typography variant="body2" color="text.secondary">
                            This option type does not have any positions. You can add positions in the Manage Options dialog.
                          </Typography>
                        );
                      }

                      return (
                        <>
                          {/* Base Position Selection - only show if positions exist */}
                          <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" gutterBottom>
                              Base Position (included in product price)
                            </Typography>
                            <FormControl fullWidth required disabled={isViewMode}>
                              <InputLabel>Base Position</InputLabel>
                              <Select
                                name="printOptions.basePosition"
                                label="Base Position"
                                value={formData.printOptions?.basePosition || ''}
                                onChange={(e) => setFormData((prev) => ({
                                  ...prev,
                                  printOptions: {
                                    ...prev.printOptions,
                                    basePosition: e.target.value
                                  }
                                }))}
                              >
                                {selectedOption.positions.map(position => (
                                  <MenuItem key={position.id} value={position.id}>
                                    {position.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Box>

                          {/* Additional Production Positions */}
                          <Box>
                            <Typography variant="subtitle1" gutterBottom>
                              Additional Production Positions (extra charge)
                            </Typography>
                            <Grid container spacing={2}>
                              {selectedOption.positions
                                .filter(pos => pos.id !== formData.printOptions?.basePosition)
                                .map((position) => (
                                  <Grid item xs={12} md={4} key={position.id}>
                                    <Paper 
                                      elevation={2} 
                                      sx={{ 
                                        p: 2, 
                                        border: formData.printOptions?.additionalPositions?.[position.id]?.available 
                                          ? '2px solid #1976d2' 
                                          : 'none',
                                        height: '100%',
                                        display: 'flex',
                                        flexDirection: 'column'
                                      }}
                                    >
                                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="subtitle2">{position.name}</Typography>
                                        <Switch
                                          checked={formData.printOptions?.additionalPositions?.[position.id]?.available || false}
                                          onChange={(e) => setFormData((prev) => ({
                                            ...prev,
                                            printOptions: {
                                              ...prev.printOptions,
                                              additionalPositions: {
                                                ...prev.printOptions?.additionalPositions,
                                                [position.id]: {
                                                  ...(prev.printOptions?.additionalPositions?.[position.id] || { price: position.basePrice }),
                                                  available: e.target.checked
                                                }
                                              }
                                            }
                                          }))}
                                          color="primary"
                                          disabled={isViewMode}
                                        />
                                      </Box>
                                      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                        Add production on the {position.name.toLowerCase()} area
                                      </Typography>
                                      <Box sx={{ mt: 'auto' }}>
                                        <TextField
                                          label="Price"
                                          type="number"
                                          size="small"
                                          fullWidth
                                          InputProps={{
                                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                                          }}
                                          value={formData.printOptions?.additionalPositions?.[position.id]?.price || position.basePrice}
                                          onChange={(e) => setFormData((prev) => ({
                                            ...prev,
                                            printOptions: {
                                              ...prev.printOptions,
                                              additionalPositions: {
                                                ...prev.printOptions?.additionalPositions,
                                                [position.id]: {
                                                  ...(prev.printOptions?.additionalPositions?.[position.id] || {}),
                                                  price: Number(e.target.value)
                                                }
                                              }
                                            }
                                          }))}
                                          disabled={isViewMode || !formData.printOptions?.additionalPositions?.[position.id]?.available}
                                        />
                                      </Box>
                                    </Paper>
                                  </Grid>
                                ))
                              }
                            </Grid>
                          </Box>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    Production options are disabled for this product. Enable the switch above to configure production options.
                  </Typography>
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

      {/* Category Management Modal */}
      <Dialog 
        open={categoryModalOpen} 
        onClose={handleCloseCategoryModal}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingCategory ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent>
          {categoryError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {categoryError}
            </Alert>
          )}
          
          <TextField
            autoFocus
            margin="dense"
            name="name"
            label="Category Name"
            type="text"
            fullWidth
            value={categoryFormData.name}
            onChange={handleCategoryInputChange}
            required
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            name="description"
            label="Description"
            type="text"
            fullWidth
            multiline
            rows={4}
            value={categoryFormData.description}
            onChange={handleCategoryInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCategoryModal}>Cancel</Button>
          <Button 
            onClick={handleSaveCategory} 
            variant="contained" 
            color="primary"
            disabled={savingCategory}
          >
            {savingCategory ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Category Delete Confirmation Dialog */}
      <Dialog
        open={categoryDeleteDialogOpen}
        onClose={handleDeleteCategoryCancel}
      >
        <DialogTitle>Delete Category</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the category "{categoryToDelete?.name}"?
            This cannot be undone, and any products assigned to this category will need to be reassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCategoryCancel}>Cancel</Button>
          <Button 
            onClick={handleDeleteCategory} 
            color="error"
            disabled={deletingCategory}
          >
            {deletingCategory ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Product Options Management Modal */}
      <Dialog
        open={productOptionModalOpen}
        onClose={handleCloseProductOptionModal}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {editingProductOption ? 'Edit Production Option' : 'Add Production Option'}
        </DialogTitle>
        <DialogContent>
          {productOptionError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {productOptionError}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                name="name"
                label="Option Name"
                fullWidth
                required
                value={productOptionFormData.name}
                onChange={handleProductOptionInputChange}
              />
            </Grid>
            
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Option Type</InputLabel>
                <Select
                  name="type"
                  label="Option Type"
                  value={productOptionFormData.type}
                  onChange={handleProductOptionInputChange}
                >
                  <MenuItem value="print">Print</MenuItem>
                  <MenuItem value="rental">Rental</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={2}
                value={productOptionFormData.description}
                onChange={handleProductOptionInputChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1">Positions</Typography>
                <Button
                  startIcon={<AddIcon />}
                  onClick={handleAddPosition}
                >
                  Add Position
                </Button>
              </Box>
              
              {productOptionFormData.positions.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ my: 2 }}>
                  No positions added yet. Click "Add Position" to add your first position.
                </Typography>
              ) : (
                <Box>
                  {productOptionFormData.positions.map((position, index) => (
                    <Paper key={index} elevation={1} sx={{ p: 2, mb: 2 }}>
                      <Grid container spacing={2} alignItems="center">
                        <Grid item xs={12} sm={6} md={4}>
                          <TextField
                            label="Position Name"
                            fullWidth
                            value={position.name}
                            onChange={(e) => handlePositionChange(index, 'name', e.target.value)}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <TextField
                            label="Base Price"
                            type="number"
                            fullWidth
                            InputProps={{
                              startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            }}
                            value={position.basePrice}
                            onChange={(e) => handlePositionChange(index, 'basePrice', Number(e.target.value))}
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={3}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={position.default || false}
                                onChange={() => handleSetDefaultPosition(index)}
                              />
                            }
                            label="Default Position"
                          />
                        </Grid>
                        
                        <Grid item xs={12} sm={6} md={2}>
                          <Button
                            color="error"
                            startIcon={<DeleteIcon />}
                            fullWidth
                            onClick={() => handleRemovePosition(index)}
                          >
                            Remove
                          </Button>
                        </Grid>
                      </Grid>
                    </Paper>
                  ))}
                </Box>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseProductOptionModal}>Cancel</Button>
          {editingProductOption && (
            <Button
              onClick={() => handleOpenDeleteProductOptionDialog(editingProductOption)}
              color="error"
              startIcon={<DeleteIcon />}
            >
              Delete
            </Button>
          )}
          <Button
            onClick={handleSaveProductOption}
            variant="contained"
            disabled={savingProductOption}
          >
            {savingProductOption ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Product Option Dialog */}
      <Dialog
        open={deleteProductOptionDialogOpen}
        onClose={handleCloseDeleteProductOptionDialog}
      >
        <DialogTitle>Delete Product Option</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the product option "{productOptionToDelete?.name}"?
            This cannot be undone, and any products assigned to this option will need to be reassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteProductOptionDialog}>Cancel</Button>
          <Button 
            onClick={handleDeleteProductOption} 
            color="error"
            disabled={deletingProductOption}
          >
            {deletingProductOption ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProductsPage; 