import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, TextField, Button, Divider, FormControlLabel, Checkbox,
  RadioGroup, Radio, FormControl, FormLabel, InputAdornment, CircularProgress, Alert,
  Card, CardContent, CardMedia, Select, MenuItem, InputLabel, IconButton, List, ListItem,
  ListItemText, ListItemSecondaryAction
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import api from '@/api';
import { formatCurrency } from '../helpers/formatters';
import { useAuth } from '../hooks/useAuth';

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth() || {};
  const user = auth.user;
  
  // Product selection state
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Order items state - array of items in the order
  const [orderItems, setOrderItems] = useState([]);
  
  // Selected product for adding to order
  const [currentProductId, setCurrentProductId] = useState('');
  const [currentProduct, setCurrentProduct] = useState(null);
  const [currentQuantity, setCurrentQuantity] = useState(1);
  const [currentPrintPositions, setCurrentPrintPositions] = useState({
    basePosition: '',
    additionalPositions: {}
  });
  
  // Shipping information state
  const [shippingInfo, setShippingInfo] = useState({
    recipientName: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    phone: '',
    shippingMethod: 'standard',
    useCompanyAddress: false
  });
  
  // Notes for the order
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Parse productId from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productId = params.get('productId');
    if (productId) {
      setCurrentProductId(productId);
    }
  }, [location.search]);

  // Fetch products when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await api.products.getAllProducts();
        
        if (response.data && response.data.success) {
          setProducts(response.data.products || []);
        } else {
          console.error('Unexpected API response format:', response);
          setError('Unable to load products. Please try again.');
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch product details when a product is selected
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!currentProductId) {
        setCurrentProduct(null);
        return;
      }
      
      try {
        setLoadingProducts(true);
        const response = await api.products.getById(currentProductId);
        
        if (response.data && response.data.success) {
          const productData = response.data.product;
          
          if (productData) {
            setCurrentProduct(productData);
            
            // Initialize print positions from product data
            if (productData.printOptions) {
              const basePosition = productData.printOptions.basePosition || 'chest_left';
              
              // Initialize with default selections
              setCurrentPrintPositions({
                basePosition,
                additionalPositions: {}
              });
            }
          } else {
            console.error('No product data found in response');
            setError('Product details not found');
          }
        } else {
          console.error('Unexpected API response format:', response);
          setError('Unable to load product details');
        }
      } catch (error) {
        console.error('Error fetching product details:', error);
        setError('Failed to load product details. Please try again.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProductDetails();
  }, [currentProductId]);

  const handleShippingChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    setShippingInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (name === 'useCompanyAddress' && checked && user) {
      setShippingInfo(prev => ({
        ...prev,
        recipientName: user.companyName || '',
        address: user.address || '',
        city: user.city || '',
        state: user.state || '',
        zipCode: user.zipCode || '',
        phone: user.phone || ''
      }));
    }
  };

  const handlePrintPositionChange = (positionType, positionKey, checked) => {
    if (positionType === 'base') {
      setCurrentPrintPositions(prev => ({
        ...prev,
        basePosition: positionKey
      }));
    } else if (positionType === 'additional') {
      setCurrentPrintPositions(prev => ({
        ...prev,
        additionalPositions: {
          ...prev.additionalPositions,
          [positionKey]: checked
        }
      }));
    }
  };

  // Add current product to the order items
  const handleAddToOrder = () => {
    if (!currentProduct) return;
    
    // Prepare customizations array based on selected print positions
    const customizations = [];
    
    // Add base position
    if (currentPrintPositions.basePosition) {
      customizations.push({
        type: 'PRINT',
        position: currentPrintPositions.basePosition,
        price: 0, // Base position is included in product price
        designUrl: '' // Assuming no design URL for now
      });
    }
    
    // Add additional positions
    if (currentProduct.printOptions && currentProduct.printOptions.additionalPositions) {
      Object.entries(currentPrintPositions.additionalPositions).forEach(([position, selected]) => {
        if (selected && currentProduct.printOptions.additionalPositions[position]) {
          customizations.push({
            type: 'PRINT',
            position,
            price: currentProduct.printOptions.additionalPositions[position].price || 0,
            designUrl: ''
          });
        }
      });
    }
    
    // Create the new order item
    const newOrderItem = {
      id: Date.now().toString(), // Unique ID for this item
      productId: currentProduct.id,
      product: currentProduct,
      quantity: currentQuantity,
      printPositions: currentPrintPositions,
      customizations
    };
    
    // Add to order items
    setOrderItems(prev => [...prev, newOrderItem]);
    
    // Reset current product selection
    setCurrentProductId('');
    setCurrentProduct(null);
    setCurrentQuantity(1);
    setCurrentPrintPositions({
      basePosition: '',
      additionalPositions: {}
    });
  };

  // Remove an item from the order
  const handleRemoveItem = (itemId) => {
    setOrderItems(prev => prev.filter(item => item.id !== itemId));
  };

  // Edit an existing order item
  const handleEditItem = (item) => {
    // Set the current product to the one being edited
    setCurrentProductId(item.productId);
    setCurrentProduct(item.product);
    setCurrentQuantity(item.quantity);
    setCurrentPrintPositions(item.printPositions);
    
    // Remove the item from the list (it will be re-added when user clicks "Add to Order")
    handleRemoveItem(item.id);
  };

  const handleSubmitOrder = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate required fields
      if (orderItems.length === 0) {
        setError('Please add at least one product to your order');
        setLoading(false);
        return;
      }
      
      if (!shippingInfo?.address || !shippingInfo?.city || !shippingInfo?.state || !shippingInfo?.zipCode) {
        setError('Please fill in all shipping information');
        setLoading(false);
        return;
      }
      
      // Prepare order data
      const orderData = {
        items: orderItems.map(item => ({
          productId: item.productId,
          quantity: item.quantity,
          customizationOptions: []
        })),
        shippingAddress: {
          recipientName: shippingInfo.recipientName,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          phone: shippingInfo.phone || ''
        },
        notes: additionalRequirements || '',
        customizations: orderItems.flatMap(item => item.customizations || [])
      };
      
      // Add retry logic
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          const response = await api.orders.create(orderData);
          setSuccess(true);
          
          // Navigate to the orders page with a query parameter to indicate order was created
          navigate('/orders?fromCreation=true');
          return; // Success, exit the function
        } catch (error) {
          lastError = error;
          retries--;
          
          if (retries > 0) {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, 3 - retries) * 1000));
          }
        }
      }
      
      // If we get here, all retries failed
      throw lastError;
      
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.response?.data?.error || 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Calculate order summary
  const calculateOrderSummary = useCallback(() => {
    let subtotal = 0;
    let customizationCost = 0;
    let totalQuantity = 0;
    
    // Calculate costs for all items
    orderItems.forEach(item => {
      const basePrice = Number(item.product.price) || 0;
      subtotal += basePrice * item.quantity;
      totalQuantity += item.quantity;
      
      // Add costs for additional print positions
      if (item.customizations) {
        item.customizations.forEach(customization => {
          if (customization.price) {
            customizationCost += Number(customization.price) * item.quantity;
          }
        });
      }
    });
    
    // Calculate shipping cost
    const shippingCost = shippingInfo.shippingMethod === 'express' ? 15 : 5;
    const total = subtotal + customizationCost + shippingCost;

    return { 
      subtotal, 
      customizationCost, 
      shippingCost, 
      total,
      totalQuantity
    };
  }, [orderItems, shippingInfo.shippingMethod]);

  const orderSummary = calculateOrderSummary();
  const hasInsufficientCredit = user?.balance < orderSummary.total;

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create Order
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Order created successfully! You will be redirected to your order details.
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* Left column - Product selection and details */}
        <Grid item xs={12} md={8}>
          {/* Order Items List */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Items
            </Typography>
            
            {orderItems.length > 0 ? (
              <List>
                {orderItems.map((item) => (
                  <ListItem key={item.id} divider sx={{ py: 2 }}>
                    <Box sx={{ display: 'flex', width: '100%' }}>
                      <Box sx={{ width: 80, height: 80, mr: 2 }}>
                        <img 
                          src={item.product.images && item.product.images.length > 0 
                            ? item.product.images[0] 
                            : 'https://via.placeholder.com/80x80?text=No+Image'} 
                          alt={item.product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </Box>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1">
                          {item.product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Quantity: {item.quantity} × {formatCurrency(item.product.price)}
                        </Typography>
                        
                        {/* Print positions */}
                        <Typography variant="body2" color="text.secondary">
                          Print positions: {item.printPositions.basePosition.replace('_', ' ')}
                          {Object.entries(item.printPositions.additionalPositions)
                            .filter(([_, selected]) => selected)
                            .map(([position]) => position.replace('_', ' '))
                            .join(', ')}
                        </Typography>
                        
                        <Typography variant="subtitle2" color="primary">
                          Item Total: {formatCurrency(item.quantity * item.product.price + 
                            (item.customizations.reduce((sum, c) => sum + (c.price || 0), 0) * item.quantity))}
                        </Typography>
                      </Box>
                      <Box>
                        <IconButton onClick={() => handleEditItem(item)} color="primary">
                          <EditIcon />
                        </IconButton>
                        <IconButton onClick={() => handleRemoveItem(item.id)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Box>
                    </Box>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No items added to order yet
              </Typography>
            )}
          </Paper>

          {/* Add Product Section */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Add Product to Order
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Select Product</InputLabel>
                  <Select
                    value={currentProductId}
                    label="Select Product"
                    onChange={(e) => setCurrentProductId(e.target.value)}
                    disabled={loading || loadingProducts}
                  >
                    <MenuItem value="">
                      <em>Select a product</em>
                    </MenuItem>
                    {products.map((product) => (
                      <MenuItem key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              {currentProduct && (
                <>
                  <Grid item xs={12}>
                    <Card>
                      <Grid container>
                        <Grid item xs={12} md={4}>
                          <CardMedia
                            component="img"
                            height="150"
                            image={currentProduct.images && currentProduct.images.length > 0 
                              ? currentProduct.images[0] 
                              : 'https://via.placeholder.com/300x150?text=No+Image'}
                            alt={currentProduct.name}
                          />
                        </Grid>
                        <Grid item xs={12} md={8}>
                          <CardContent>
                            <Typography variant="h6">{currentProduct.name}</Typography>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              {currentProduct.description}
                            </Typography>
                            <Typography variant="h6" color="primary">
                              {formatCurrency(currentProduct.price)}
                            </Typography>
                            {currentProduct.stock !== undefined && (
                              <Typography variant="body2" color={currentProduct.stock > 0 ? 'success.main' : 'error.main'}>
                                {currentProduct.stock > 0 ? `In stock: ${currentProduct.stock}` : 'Out of stock'}
                              </Typography>
                            )}
                          </CardContent>
                        </Grid>
                      </Grid>
                    </Card>
                  </Grid>
                  
                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Quantity"
                      type="number"
                      fullWidth
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                      InputProps={{
                        inputProps: { min: 1 }
                      }}
                      disabled={loading}
                    />
                  </Grid>
                  
                  {currentProduct.printOptions && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Print Positions
                      </Typography>
                      
                      <FormControl component="fieldset" sx={{ mt: 1 }}>
                        <FormLabel component="legend">Base Position (included)</FormLabel>
                        <RadioGroup
                          name="basePosition"
                          value={currentPrintPositions.basePosition}
                          onChange={(e) => handlePrintPositionChange('base', e.target.value)}
                        >
                          <FormControlLabel
                            value={currentProduct.printOptions.basePosition || 'chest_left'}
                            control={<Radio />}
                            label={`${(currentProduct.printOptions.basePosition || 'chest_left').replace('_', ' ')} (included)`}
                          />
                        </RadioGroup>
                      </FormControl>
                      
                      {currentProduct.printOptions.additionalPositions && 
                       Object.keys(currentProduct.printOptions.additionalPositions).length > 0 && (
                        <FormControl component="fieldset" sx={{ mt: 2 }}>
                          <FormLabel component="legend">Additional Positions (extra cost)</FormLabel>
                          {Object.entries(currentProduct.printOptions.additionalPositions).map(([position, details]) => (
                            details.available && (
                              <FormControlLabel
                                key={position}
                                control={
                                  <Checkbox
                                    checked={!!currentPrintPositions.additionalPositions[position]}
                                    onChange={(e) => handlePrintPositionChange('additional', position, e.target.checked)}
                                    disabled={loading}
                                  />
                                }
                                label={`${position.replace('_', ' ')} (+${formatCurrency(details.price || 0)} per item)`}
                              />
                            )
                          ))}
                        </FormControl>
                      )}
                    </Grid>
                  )}
                  
                  <Grid item xs={12}>
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<AddIcon />}
                      onClick={handleAddToOrder}
                      disabled={!currentProduct || loading}
                      fullWidth
                    >
                      Add to Order
                    </Button>
                  </Grid>
                </>
              )}
            </Grid>
          </Paper>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Additional Requirements
            </Typography>
            
            <TextField
              label="Order Notes"
              fullWidth
              multiline
              rows={4}
              value={additionalRequirements}
              onChange={(e) => setAdditionalRequirements(e.target.value)}
              placeholder="Special instructions, design requirements, etc."
              disabled={loading}
              sx={{ mb: 2 }}
            />
          </Paper>
          
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Shipping Information
            </Typography>
            
            {user && (
              <FormControlLabel
                control={
                  <Checkbox
                    name="useCompanyAddress"
                    checked={shippingInfo.useCompanyAddress}
                    onChange={handleShippingChange}
                    disabled={loading}
                  />
                }
                label="Use my company address"
                sx={{ mb: 2 }}
              />
            )}
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Recipient Name"
                  name="recipientName"
                  fullWidth
                  value={shippingInfo.recipientName}
                  onChange={handleShippingChange}
                  disabled={loading}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  name="address"
                  fullWidth
                  value={shippingInfo.address}
                  onChange={handleShippingChange}
                  disabled={loading}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  name="city"
                  fullWidth
                  value={shippingInfo.city}
                  onChange={handleShippingChange}
                  disabled={loading}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="State/Province"
                  name="state"
                  fullWidth
                  value={shippingInfo.state}
                  onChange={handleShippingChange}
                  disabled={loading}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="ZIP/Postal Code"
                  name="zipCode"
                  fullWidth
                  value={shippingInfo.zipCode}
                  onChange={handleShippingChange}
                  disabled={loading}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Phone Number"
                  name="phone"
                  fullWidth
                  value={shippingInfo.phone}
                  onChange={handleShippingChange}
                  disabled={loading}
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl component="fieldset">
                  <FormLabel component="legend">Shipping Method</FormLabel>
                  <RadioGroup
                    name="shippingMethod"
                    value={shippingInfo.shippingMethod}
                    onChange={handleShippingChange}
                  >
                    <FormControlLabel 
                      value="standard" 
                      control={<Radio disabled={loading} />} 
                      label={`Standard Shipping (${formatCurrency(5)})`} 
                    />
                    <FormControlLabel 
                      value="express" 
                      control={<Radio disabled={loading} />} 
                      label={`Express Shipping (${formatCurrency(15)})`} 
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
        
        {/* Right column - Order summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, position: 'sticky', top: '20px' }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography>Subtotal ({orderSummary.totalQuantity} items):</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography align="right">{formatCurrency(orderSummary.subtotal)}</Typography>
              </Grid>
              
              {orderSummary.customizationCost > 0 && (
                <>
                  <Grid item xs={6}>
                    <Typography>Print Customization:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography align="right">{formatCurrency(orderSummary.customizationCost)}</Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={6}>
                <Typography>Shipping ({shippingInfo.shippingMethod}):</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography align="right">{formatCurrency(orderSummary.shippingCost)}</Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="h6">Total:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" align="right">
                  {formatCurrency(orderSummary.total)}
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Typography 
                  color={hasInsufficientCredit ? "error" : "text.secondary"} 
                  variant="body2"
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}
                >
                  <span>Current Balance:</span>
                  <span>{formatCurrency(user?.balance || 0)}</span>
                </Typography>
              </Grid>
              
              <Grid item xs={12}>
                <Button
                  fullWidth
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleSubmitOrder}
                  disabled={loading || orderItems.length === 0 || hasInsufficientCredit}
                  sx={{ mt: 2 }}
                >
                  {loading ? <CircularProgress size={24} color="inherit" /> : 'Place Order'}
                </Button>
                
                {hasInsufficientCredit && (
                  <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                    Insufficient balance. Please deposit funds before placing this order.
                  </Typography>
                )}
                
                {orderItems.length === 0 && (
                  <Typography color="warning.main" variant="body2" sx={{ mt: 1 }}>
                    Please add at least one product to your order.
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateOrderPage; 