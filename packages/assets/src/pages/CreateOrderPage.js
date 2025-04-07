import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, TextField, Button, Divider, FormControlLabel, Checkbox,
  RadioGroup, Radio, FormControl, FormLabel, InputAdornment, CircularProgress, Alert,
  Card, CardContent, CardMedia, Select, MenuItem, InputLabel
} from '@mui/material';
import api from '@/api';
import { formatCurrency } from '../helpers/formatters';
import { useAuth } from '../hooks/useAuth';
import useFetchApi from '../hooks/api/useFetchApi';

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth() || {};
  const user = auth.user;
  
  // Product selection state
  const [products, setProducts] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // Order details state
  const [quantity, setQuantity] = useState(1);
  const [additionalRequirements, setAdditionalRequirements] = useState('');
  const [selectedOptions, setSelectedOptions] = useState({});
  
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
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Fetch products only once when component mounts
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true);
        const response = await api.products.getAll();
        setProducts(response.data.products || []);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, []);

  // Fetch product details when selected
  useEffect(() => {
    const fetchProductDetails = async () => {
      if (!selectedProductId) return;
      
      try {
        setLoadingProducts(true);
        const response = await api.products.getById(selectedProductId);
        console.log('Product details response:', response);
        // Make sure we're setting the correct data structure
        const productData = response.data?.product || response.data;
        if (!productData) {
          console.error('No product data found in response');
          return;
        }
        console.log('Setting product data:', productData);
        setSelectedProduct(productData);
      } catch (error) {
        console.error('Error fetching product details:', error);
        setError('Failed to load product details. Please try again.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProductDetails();
  }, [selectedProductId]);

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

  const handleOptionChange = (e) => {
    const { name, value } = e.target;
    setSelectedOptions(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitOrder = async () => {
    try {
      setLoading(true);
      setError('');
      
      // Validate required fields
      if (!selectedProduct?.id) {
        setError('Please select a product');
        return;
      }
      
      if (!quantity || quantity < 1) {
        setError('Please enter a valid quantity');
        return;
      }
      
      if (!shippingInfo?.address || !shippingInfo?.city || !shippingInfo?.state || !shippingInfo?.zipCode) {
        setError('Please fill in all shipping information');
        return;
      }
      
      const orderData = {
        items: [{
          productId: selectedProduct.id,
          quantity: parseInt(quantity),
          customizationOptions: selectedOptions || []
        }],
        shippingAddress: {
          recipientName: shippingInfo.recipientName,
          address: shippingInfo.address,
          city: shippingInfo.city,
          state: shippingInfo.state,
          zipCode: shippingInfo.zipCode,
          phone: shippingInfo.phone || ''
        },
        notes: additionalRequirements || '',
        customizations: [] // Add customizations if needed
      };
      
      // Add retry logic
      let retries = 3;
      let lastError = null;
      
      while (retries > 0) {
        try {
          const response = await api.orders.create(orderData);
          setSuccess(true);
          
          // Navigate to the order details page after a delay
          setTimeout(() => {
            navigate(`/orders/${response.data.orderId}`);
          }, 2000);
    
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
    if (!selectedProduct) return { subtotal: 0, shippingCost: 0, total: 0 };

    console.log('Calculating summary for product:', selectedProduct);
    
    // Calculate base price from product price
    const basePrice = Number(selectedProduct.price) || 0;
    console.log('Base price:', basePrice);
    let subtotal = basePrice * quantity;
    console.log('Subtotal after quantity:', subtotal);
    
    // Add customization options costs
    if (selectedProduct.customizationOptions && Object.keys(selectedOptions).length > 0) {
      Object.entries(selectedOptions).forEach(([optionId, valueId]) => {
        const option = selectedProduct.customizationOptions.find(opt => opt.id === optionId);
        if (option) {
          const value = option.values.find(val => val.id === valueId);
          if (value && value.price) {
            const optionPrice = Number(value.price) || 0;
            subtotal += optionPrice * quantity;
            console.log(`Added option price: ${optionPrice} * ${quantity}`);
          }
        }
      });
    }
    
    // Calculate shipping cost
    const shippingCost = shippingInfo.shippingMethod === 'express' ? 15 : 5;
    const total = subtotal + shippingCost;
    console.log('Final calculation:', { subtotal, shippingCost, total });

    return { subtotal, shippingCost, total };
  }, [selectedProduct, quantity, selectedOptions, shippingInfo.shippingMethod]);

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
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Select Product
            </Typography>
            
            {loadingProducts ? (
              <CircularProgress />
            ) : (
              <Grid container spacing={3}>
                {products.map((product) => (
                  <Grid item xs={12} sm={6} key={product.id}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: selectedProductId === product.id ? '2px solid #1976d2' : 'none',
                        transform: selectedProductId === product.id ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.2s'
                      }}
                      onClick={() => setSelectedProductId(product.id)}
                    >
                      <CardMedia
                        component="img"
                        height="140"
                        image={product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}
                        alt={product.name}
                      />
                      <CardContent>
                        <Typography gutterBottom variant="h6" component="div">
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {product.description?.substring(0, 100)}
                          {product.description?.length > 100 ? '...' : ''}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {formatCurrency(product.price || 0)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Paper>

          {selectedProduct && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Order Details
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="Quantity"
                    type="number"
                    fullWidth
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    InputProps={{
                      inputProps: { min: 1 }
                    }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle1" sx={{ mt: 2 }}>
                    Price per unit: {formatCurrency(selectedProduct.price || 0)}
                  </Typography>
                </Grid>
                
                {/* Delivery Options */}
                {selectedProduct.deliveryOptions && selectedProduct.deliveryOptions.length > 0 && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1">
                      Delivery Option: {selectedProduct.deliveryOptions[0].name} (+{formatCurrency(selectedProduct.deliveryOptions[0].price || 0)})
                    </Typography>
                  </Grid>
                )}
                
                <Grid item xs={12}>
                  <TextField
                    label="Additional Requirements or Notes"
                    fullWidth
                    multiline
                    rows={4}
                    value={additionalRequirements}
                    onChange={(e) => setAdditionalRequirements(e.target.value)}
                    placeholder="Any special instructions or requirements for this order"
                  />
                </Grid>
              </Grid>
            </Paper>
          )}
        </Grid>

        {/* Right column - Shipping info and order summary */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Shipping Information
            </Typography>
            
            <FormControlLabel
              control={
                <Checkbox 
                  checked={shippingInfo.useCompanyAddress} 
                  onChange={handleShippingChange}
                  name="useCompanyAddress"
                />
              }
              label="Use company address"
            />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  label="Recipient Name"
                  fullWidth
                  name="recipientName"
                  value={shippingInfo.recipientName}
                  onChange={handleShippingChange}
                  disabled={shippingInfo.useCompanyAddress}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Address"
                  fullWidth
                  name="address"
                  value={shippingInfo.address}
                  onChange={handleShippingChange}
                  disabled={shippingInfo.useCompanyAddress}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <TextField
                  label="City"
                  fullWidth
                  name="city"
                  value={shippingInfo.city}
                  onChange={handleShippingChange}
                  disabled={shippingInfo.useCompanyAddress}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <TextField
                  label="State"
                  fullWidth
                  name="state"
                  value={shippingInfo.state}
                  onChange={handleShippingChange}
                  disabled={shippingInfo.useCompanyAddress}
                  required
                />
              </Grid>
              
              <Grid item xs={12} sm={3}>
                <TextField
                  label="Zip Code"
                  fullWidth
                  name="zipCode"
                  value={shippingInfo.zipCode}
                  onChange={handleShippingChange}
                  disabled={shippingInfo.useCompanyAddress}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  label="Phone Number"
                  fullWidth
                  name="phone"
                  value={shippingInfo.phone}
                  onChange={handleShippingChange}
                  disabled={shippingInfo.useCompanyAddress}
                  required
                />
              </Grid>
              
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <FormLabel>Shipping Method</FormLabel>
                  <RadioGroup
                    name="shippingMethod"
                    value={shippingInfo.shippingMethod}
                    onChange={handleShippingChange}
                  >
                    <FormControlLabel
                      value="standard"
                      control={<Radio />}
                      label="Standard Shipping (3-5 business days) - $5.00"
                    />
                    <FormControlLabel
                      value="express"
                      control={<Radio />}
                      label="Express Shipping (1-2 business days) - $15.00"
                    />
                  </RadioGroup>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>

          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Order Summary
            </Typography>
            
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Typography>Subtotal ({quantity} items):</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography align="right">{formatCurrency(orderSummary.subtotal)}</Typography>
              </Grid>
              
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

              {hasInsufficientCredit && (
                <Grid item xs={12}>
                  <Alert severity="warning" sx={{ mt: 1, mb: 2 }}>
                    Insufficient credit. You need {formatCurrency(orderSummary.total - (user?.balance || 0))} more to place this order.
                  </Alert>
                </Grid>
              )}
              
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleSubmitOrder}
                  disabled={loading || success || !selectedProduct || hasInsufficientCredit}
                >
                  {loading ? <CircularProgress size={24} /> : 'Place Order'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateOrderPage; 