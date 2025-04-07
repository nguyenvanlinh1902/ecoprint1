import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  Typography,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  IconButton,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  Alert,
  Grid,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import api from '@/api';

const CategoriesPage = () => {
  // State for categories list
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // State for add/edit category modal
  const [modalOpen, setModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  
  // State for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Fetch data when component mounts
  useEffect(() => {
    fetchCategories();
  }, []);
  
  // Fetch categories list
  const fetchCategories = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await api.products.getCategories();
      
      if (response.data && response.data.success) {
        setCategories(response.data.data || []);
      } else {
        setError('Failed to load categories');
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError(err.message || 'An error occurred while loading categories');
    } finally {
      setLoading(false);
    }
  };
  
  // Open modal to add new category
  const handleAddCategory = () => {
    setCurrentCategory(null);
    setFormData({
      name: '',
      description: ''
    });
    setFormError('');
    setModalOpen(true);
  };
  
  // Open modal to edit category
  const handleEditCategory = (category) => {
    setCurrentCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || ''
    });
    setFormError('');
    setModalOpen(true);
  };
  
  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentCategory(null);
    setFormData({
      name: '',
      description: ''
    });
  };
  
  // Handle input change in form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Save category
  const handleSaveCategory = async () => {
    // Validate
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    
    setSaving(true);
    setFormError('');
    
    try {
      let response;
      
      if (currentCategory) {
        // Update
        response = await api.admin.updateCategory(currentCategory.id, formData);
      } else {
        // Create
        response = await api.products.createCategory(formData);
      }
      
      if (response.data && response.data.success) {
        // Refresh list
        await fetchCategories();
        handleCloseModal();
      } else {
        throw new Error(response.data?.message || 'Failed to save category');
      }
    } catch (err) {
      console.error('Error saving category:', err);
      setFormError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (category) => {
    setCategoryToDelete(category);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCategoryToDelete(null);
  };
  
  // Delete category
  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    
    setDeleting(true);
    
    try {
      const response = await api.admin.deleteCategory(categoryToDelete.id);
      
      if (response.data && response.data.success) {
        // Refresh list
        await fetchCategories();
        handleCloseDeleteDialog();
      } else {
        throw new Error(response.data?.message || 'Failed to delete category');
      }
    } catch (err) {
      console.error('Error deleting category:', err);
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setDeleting(false);
    }
  };
  
  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Categories</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAddCategory}
        >
          Add Category
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 2 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : categories.length === 0 ? (
          <Typography align="center" sx={{ p: 3 }}>
            No categories found. Click "Add Category" to create one.
          </Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Products Count</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.map((category) => (
                <TableRow key={category.id}>
                  <TableCell>{category.name}</TableCell>
                  <TableCell>{category.description}</TableCell>
                  <TableCell>
                    {category.productCount || 0}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => handleEditCategory(category)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDeleteClick(category)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>
      
      {/* Dialog for adding/editing category */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="sm" fullWidth>
        <DialogTitle>
          {currentCategory ? 'Edit Category' : 'Add Category'}
        </DialogTitle>
        <DialogContent>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                name="name"
                label="Category Name"
                fullWidth
                required
                value={formData.name}
                onChange={handleInputChange}
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                name="description"
                label="Description"
                fullWidth
                multiline
                rows={3}
                value={formData.description}
                onChange={handleInputChange}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal}>Cancel</Button>
          <Button
            onClick={handleSaveCategory}
            variant="contained"
            startIcon={saving ? <CircularProgress size={24} /> : <SaveIcon />}
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the category "{categoryToDelete?.name}"?
            This cannot be undone, and any products in this category will need to be reassigned.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            onClick={handleDeleteCategory}
            color="error"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CategoriesPage; 