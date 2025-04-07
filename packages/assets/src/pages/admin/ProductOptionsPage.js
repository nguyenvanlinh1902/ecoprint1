import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Box, Paper, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow,
  Button, CircularProgress, Alert, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, IconButton,
  Chip, List, ListItem, ListItemText, ListItemSecondaryAction,
  Divider, FormControl, InputLabel, Select, Menu, ButtonGroup,
  FormControlLabel, Switch
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  MoreVert as MoreVertIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import { useProductOptionsApi } from '@/hooks/api';
import api from '@/api';

// Dữ liệu mẫu cho các Print Options
const PRINT_OPTION_TEMPLATES = [
  {
    name: 'Áo thun Print Options',
    description: 'Các vị trí in ấn thông dụng cho áo thun',
    type: 'print',
    positions: [
      { id: 'chest_left', name: 'Ngực trái', basePrice: 0, default: true },
      { id: 'chest_right', name: 'Ngực phải', basePrice: 2, default: false },
      { id: 'chest_center', name: 'Ngực giữa', basePrice: 3, default: false },
      { id: 'back', name: 'Lưng', basePrice: 4, default: false },
      { id: 'sleeve_left', name: 'Tay áo trái', basePrice: 2, default: false },
      { id: 'sleeve_right', name: 'Tay áo phải', basePrice: 2, default: false }
    ]
  },
  {
    name: 'Áo hoodie Print Options',
    description: 'Các vị trí in ấn thông dụng cho áo hoodie',
    type: 'print',
    positions: [
      { id: 'chest_center', name: 'Ngực giữa', basePrice: 0, default: true },
      { id: 'back', name: 'Lưng', basePrice: 5, default: false },
      { id: 'sleeve_left', name: 'Tay áo trái', basePrice: 3, default: false },
      { id: 'sleeve_right', name: 'Tay áo phải', basePrice: 3, default: false },
      { id: 'hood', name: 'Mũ trùm', basePrice: 4, default: false },
      { id: 'pocket', name: 'Túi trước', basePrice: 3, default: false }
    ]
  },
  {
    name: 'T-shirt Embroidery Options',
    description: 'Các vị trí thêu logo thông dụng cho áo thun',
    type: 'embroidery',
    positions: [
      { id: 'chest_left', name: 'Ngực trái', basePrice: 0, default: true },
      { id: 'chest_right', name: 'Ngực phải', basePrice: 3, default: false },
      { id: 'sleeve_left', name: 'Tay áo trái', basePrice: 3, default: false },
      { id: 'sleeve_right', name: 'Tay áo phải', basePrice: 3, default: false },
      { id: 'collar', name: 'Cổ áo', basePrice: 3, default: false }
    ]
  }
];

const ProductOptionsPage = () => {
  // Use the hook for API operations
  const productOptionsApi = useProductOptionsApi();
  
  // State
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [currentOption, setCurrentOption] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'print',
    positions: []
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Position modal state
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [positionFormData, setPositionFormData] = useState({
    name: '',
    description: '',
    basePrice: 0
  });
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [optionToDelete, setOptionToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  
  // Template menu state
  const [templateMenuAnchor, setTemplateMenuAnchor] = useState(null);
  
  // Load options on component mount
  useEffect(() => {
    fetchOptions();
  }, []);
  
  // Fetch options list using direct API call for testing
  const fetchOptions = async () => {
    setLoading(true);
    setError('');
    
    try {
      // First try with hook
      let result = null;
      try {
        result = await productOptionsApi.fetchOptions();
      } catch (hookError) {
        console.warn('Hook API error:', hookError);
      }
      
      // If hook fails, try direct API call
      if (!result || result.error) {
        console.log('Trying direct API call');
        const response = await api.productOptions.getAllProductOptions();
        
        if (response.data && response.data.success) {
          setOptions(response.data.data || []);
        } else {
          throw new Error('Failed to load product options');
        }
      } else {
        // Hook succeeded
        setOptions(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching product options:', err);
      setError(err.message || 'An error occurred while loading product options');
    } finally {
      setLoading(false);
    }
  };
  
  // Open menu to select template
  const handleOpenTemplateMenu = (event) => {
    setTemplateMenuAnchor(event.currentTarget);
  };
  
  // Close template menu
  const handleCloseTemplateMenu = () => {
    setTemplateMenuAnchor(null);
  };
  
  // Select a template
  const handleSelectTemplate = (template) => {
    setFormData({
      name: template.name,
      description: template.description,
      type: template.type,
      positions: [...template.positions]
    });
    handleCloseTemplateMenu();
  };
  
  // Open modal to add new option
  const handleAddOption = () => {
    setCurrentOption(null);
    setFormData({
      name: '',
      description: '',
      type: 'print',
      positions: []
    });
    setFormError('');
    setModalOpen(true);
  };
  
  // Open modal to edit option
  const handleEditOption = (option) => {
    setCurrentOption(option);
    setFormData({
      name: option.name || '',
      description: option.description || '',
      type: option.type || 'print',
      positions: option.positions || []
    });
    setFormError('');
    setModalOpen(true);
  };
  
  // Close modal
  const handleCloseModal = () => {
    setModalOpen(false);
    setCurrentOption(null);
    setFormData({
      name: '',
      description: '',
      type: 'print',
      positions: []
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
  
  // Save option
  const handleSaveOption = async () => {
    // Validate
    if (!formData.name.trim()) {
      setFormError('Name is required');
      return;
    }
    
    setSaving(true);
    setFormError('');
    
    try {
      if (currentOption) {
        // Update
        const { data, error } = await productOptionsApi.updateOption(currentOption.id, formData);
        
        if (error) {
          throw new Error(error.message || 'Failed to update product option');
        }
        
        setSuccess('Product option updated successfully');
      } else {
        // Create
        const { data, error } = await productOptionsApi.createOption(formData);
        
        if (error) {
          throw new Error(error.message || 'Failed to create product option');
        }
        
        setSuccess('Product option created successfully');
      }
      
      // Refresh list
      await fetchOptions();
      handleCloseModal();
    } catch (err) {
      console.error('Error saving product option:', err);
      setFormError(err.message || 'An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };
  
  // Open delete confirmation dialog
  const handleDeleteClick = (option) => {
    setOptionToDelete(option);
    setDeleteDialogOpen(true);
  };
  
  // Close delete confirmation dialog
  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setOptionToDelete(null);
  };
  
  // Delete option
  const handleDeleteOption = async () => {
    if (!optionToDelete) return;
    
    setDeleting(true);
    
    try {
      const { error } = await productOptionsApi.deleteOption(optionToDelete.id);
      
      if (error) {
        throw new Error(error.message || 'Failed to delete product option');
      }
      
      setSuccess('Product option deleted successfully');
      
      // Refresh list
      await fetchOptions();
      handleCloseDeleteDialog();
    } catch (err) {
      console.error('Error deleting product option:', err);
      setError(err.message || 'An error occurred while deleting');
    } finally {
      setDeleting(false);
    }
  };
  
  // Open position modal
  const handleAddPosition = () => {
    setPositionFormData({
      name: '',
      description: '',
      basePrice: 0
    });
    setPositionModalOpen(true);
  };
  
  // Close position modal
  const handleClosePositionModal = () => {
    setPositionModalOpen(false);
  };
  
  // Handle position form input change
  const handlePositionInputChange = (e) => {
    const { name, value } = e.target;
    setPositionFormData((prev) => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Add position to current form data
  const handleAddPositionToForm = () => {
    if (!positionFormData.name.trim()) {
      return;
    }
    
    // Generate temporary ID for new position
    const newPosition = {
      ...positionFormData,
      id: positionFormData.id || `position_${Date.now()}`, // Sử dụng ID có sẵn hoặc tạo mới
      basePrice: parseFloat(positionFormData.basePrice) || 0
    };
    
    // Nếu vị trí này được đánh dấu là mặc định, đảm bảo chỉ một vị trí là default
    if (newPosition.default) {
      // Cập nhật tất cả các vị trí khác không còn là default
      const updatedPositions = formData.positions.map(pos => ({
        ...pos,
        default: false
      }));
      
      setFormData((prev) => ({
        ...prev,
        positions: [...updatedPositions, newPosition]
      }));
    } else {
      // Nếu đây là vị trí đầu tiên, đặt nó làm default
      if (formData.positions.length === 0) {
        newPosition.default = true;
      }
      
      setFormData((prev) => ({
        ...prev,
        positions: [...prev.positions, newPosition]
      }));
    }
    
    handleClosePositionModal();
  };
  
  // Remove position from form data
  const handleRemovePosition = (positionId) => {
    // Tìm vị trí cần xóa
    const positionToRemove = formData.positions.find(p => p.id === positionId);
    if (!positionToRemove) return;
    
    // Xóa vị trí khỏi mảng
    const updatedPositions = formData.positions.filter(p => p.id !== positionId);
    
    // Nếu vị trí bị xóa là default và còn các vị trí khác, đặt vị trí đầu tiên còn lại làm default
    if (positionToRemove.default && updatedPositions.length > 0) {
      updatedPositions[0].default = true;
    }
    
    setFormData((prev) => ({
      ...prev,
      positions: updatedPositions
    }));
  };
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1" gutterBottom>
          Production Options
        </Typography>
        <ButtonGroup>
          <Button
            variant="outlined"
            color="secondary"
            startIcon={<CopyIcon />}
            onClick={handleOpenTemplateMenu}
            sx={{ mr: 1 }}
          >
            Sử dụng mẫu
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleAddOption}
          >
            Add Option
          </Button>
        </ButtonGroup>
        
        {/* Template Menu */}
        <Menu
          anchorEl={templateMenuAnchor}
          open={Boolean(templateMenuAnchor)}
          onClose={handleCloseTemplateMenu}
        >
          <Typography variant="subtitle2" sx={{ px: 2, py: 1, fontWeight: 'bold' }}>
            Chọn mẫu Print Options
          </Typography>
          <Divider />
          {PRINT_OPTION_TEMPLATES.map((template, index) => (
            <MenuItem 
              key={index} 
              onClick={() => {
                handleSelectTemplate(template);
                handleAddOption(); // Mở form add new option
              }}
              sx={{ minWidth: '250px' }}
            >
              <ListItemText 
                primary={template.name} 
                secondary={`${template.positions.length} vị trí`} 
              />
            </MenuItem>
          ))}
        </Menu>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" my={4}>
            <CircularProgress />
          </Box>
        ) : options.length === 0 ? (
          <Typography variant="body1" color="textSecondary" align="center" py={4}>
            No production options found. Click "Add Option" to create one.
          </Typography>
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Positions</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {options.map((option) => (
                  <TableRow key={option.id}>
                    <TableCell>{option.name}</TableCell>
                    <TableCell>
                      <Chip 
                        label={option.type || 'print'} 
                        color={option.type === 'color' ? 'secondary' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      {option.positions && option.positions.length > 0 ? (
                        <Box>
                          {option.positions.slice(0, 2).map((pos) => (
                            <Chip 
                              key={pos.id} 
                              label={pos.name} 
                              size="small" 
                              sx={{ mr: 0.5, mb: 0.5 }}
                            />
                          ))}
                          {option.positions.length > 2 && (
                            <Chip 
                              label={`+${option.positions.length - 2} more`} 
                              size="small" 
                              variant="outlined"
                            />
                          )}
                        </Box>
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No positions
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {option.description ? (
                        option.description.length > 40 ? 
                          `${option.description.substring(0, 40)}...` : 
                          option.description
                      ) : (
                        <Typography variant="body2" color="textSecondary">
                          No description
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditOption(option)}
                        sx={{ mr: 1 }}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteClick(option)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>
      
      {/* Option Modal */}
      <Dialog open={modalOpen} onClose={handleCloseModal} maxWidth="md" fullWidth>
        <DialogTitle>
          {currentOption ? 'Edit Option' : 'Add New Option'}
        </DialogTitle>
        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {formError}
            </Alert>
          )}
          
          <Box component="form" noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Option Name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="type-label">Option Type</InputLabel>
              <Select
                labelId="type-label"
                id="type"
                name="type"
                value={formData.type}
                label="Option Type"
                onChange={handleInputChange}
              >
                <MenuItem value="print">Print Position</MenuItem>
                <MenuItem value="color">Color</MenuItem>
                <MenuItem value="size">Size</MenuItem>
                <MenuItem value="material">Material</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              margin="normal"
              fullWidth
              id="description"
              label="Description"
              name="description"
              multiline
              rows={3}
              value={formData.description}
              onChange={handleInputChange}
            />
            
            <Box sx={{ mt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">Positions</Typography>
                <Button
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={handleAddPosition}
                >
                  Add Position
                </Button>
              </Box>
              
              {formData.positions.length === 0 ? (
                <Paper sx={{ p: 2, bgcolor: '#f5f5f5', textAlign: 'center' }}>
                  <Typography color="textSecondary">
                    No positions added yet. Click "Add Position" to create one.
                  </Typography>
                </Paper>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell align="right">Price</TableCell>
                        <TableCell align="center">Default</TableCell>
                        <TableCell align="right">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {formData.positions.map((position, index) => (
                        <TableRow key={position.id || index}>
                          <TableCell>{position.name}</TableCell>
                          <TableCell align="right">
                            ${position.basePrice || position.additionalPrice || 0}
                          </TableCell>
                          <TableCell align="center">
                            {position.default ? (
                              <CheckCircleIcon color="success" fontSize="small" />
                            ) : (
                              <IconButton
                                size="small"
                                onClick={() => {
                                  // Tạo mảng positions mới với position này là default
                                  const updatedPositions = formData.positions.map((pos, i) => ({
                                    ...pos,
                                    default: i === index
                                  }));
                                  
                                  setFormData(prev => ({
                                    ...prev,
                                    positions: updatedPositions
                                  }));
                                }}
                              >
                                <Chip 
                                  label="Set Default" 
                                  size="small" 
                                  variant="outlined"
                                  color="primary"
                                  sx={{ cursor: 'pointer' }}
                                />
                              </IconButton>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            <IconButton
                              size="small"
                              onClick={() => handleRemovePosition(position.id)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseModal} color="inherit">
            Cancel
          </Button>
          <Button 
            onClick={handleSaveOption} 
            color="primary" 
            variant="contained"
            disabled={saving}
          >
            {saving ? <CircularProgress size={24} /> : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Position Modal */}
      <Dialog open={positionModalOpen} onClose={handleClosePositionModal} maxWidth="sm" fullWidth>
        <DialogTitle>Add Position</DialogTitle>
        <DialogContent dividers>
          <Box component="form" noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="name"
              label="Position Name"
              name="name"
              value={positionFormData.name}
              onChange={handlePositionInputChange}
              autoFocus
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="description"
              label="Description"
              name="description"
              value={positionFormData.description}
              onChange={handlePositionInputChange}
            />
            
            <TextField
              margin="normal"
              fullWidth
              id="basePrice"
              label="Base Price ($)"
              name="basePrice"
              type="number"
              value={positionFormData.basePrice || positionFormData.additionalPrice || 0}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                setPositionFormData(prev => ({
                  ...prev,
                  basePrice: isNaN(value) ? 0 : value
                }));
              }}
              inputProps={{ min: 0, step: 0.5 }}
            />
            
            <FormControlLabel
              control={
                <Switch
                  checked={positionFormData.default || false}
                  onChange={(e) => setPositionFormData(prev => ({
                    ...prev,
                    default: e.target.checked
                  }))}
                  color="primary"
                />
              }
              label="Set as default position (included in base price)"
              sx={{ mt: 2 }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClosePositionModal}>
            Cancel
          </Button>
          <Button 
            onClick={handleAddPositionToForm} 
            variant="contained"
            color="primary"
            disabled={!positionFormData.name}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete the production option "{optionToDelete?.name}"?
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleDeleteOption}
            color="error"
            variant="contained"
            disabled={deleting}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProductOptionsPage; 