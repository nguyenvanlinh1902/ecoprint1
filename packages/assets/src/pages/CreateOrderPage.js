import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Typography, Box, Paper, Stepper, Step, StepLabel, Grid,
  TextField, Button, Divider, FormControlLabel, Checkbox,
  RadioGroup, Radio, FormControl, FormLabel, InputAdornment,
  CircularProgress, Alert, Card, CardContent, CardMedia
} from '@mui/material';
import api from '../services/api';
import { formatCurrency } from '../helpers/formatters';
import { useAuth } from '../hooks/useAuth';
import { useFetchApi } from '../hooks/useFetchApi';

const steps = ['Select Product', 'Order Details', 'Shipping Information', 'Review & Confirm'];

const CreateOrderPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userDetails } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  
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
  
  // Order summary state
  const [orderSummary, setOrderSummary] = useState({
    subtotal: 0,
    shippingCost: 0,
    total: 0
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
  // Extract product ID from URL if provided
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productId = params.get('product');
    if (productId) {
      setSelectedProductId(productId);
    }
  }, [location]);
  
  // Sử dụng useFetchApi để lấy danh sách sản phẩm
  const { 
    data: productsData, 
    loading: loadingProductsList,
    error: productsError 
  } = useFetchApi({
    resource: 'products',
    autoFetch: true
  });
  
  // Cập nhật state products khi có dữ liệu từ API
  useEffect(() => {
    if (productsData) {
      setProducts(productsData.products || []);
    }
    if (productsError) {
      setError('Failed to load products. Please try again later.');
    }
  }, [productsData, productsError]);
  
  // Sử dụng useFetchApi để lấy chi tiết sản phẩm khi có selectedProductId
  const {
    data: productDetail,
    loading: loadingProductDetail,
    error: productDetailError
  } = useFetchApi({
    resource: 'products',
    id: selectedProductId,
    autoFetch: !!selectedProductId
  });
  
  // Cập nhật state khi có dữ liệu chi tiết sản phẩm
  useEffect(() => {
    if (productDetail) {
      setSelectedProduct(productDetail);
      
      // Initialize options if available
      if (productDetail.options) {
        const initialOptions = {};
        productDetail.options.forEach(optionGroup => {
          if (optionGroup.items && optionGroup.items.length > 0) {
            initialOptions[optionGroup.name] = optionGroup.items[0].id;
          }
        });
        setSelectedOptions(initialOptions);
      }
      
      setLoadingProducts(false);
    }
    
    if (productDetailError) {
      setError('Failed to load product details. Please try again later.');
      setLoadingProducts(false);
    }
  }, [productDetail, productDetailError]);
  
  // Calculate order total when relevant factors change
  useEffect(() => {
    if (!selectedProduct) return;
    
    let subtotal = selectedProduct.basePrice * quantity;
    
    // Add cost of selected options
    if (selectedProduct.options) {
      selectedProduct.options.forEach(optionGroup => {
        if (selectedOptions[optionGroup.name]) {
          const selectedOption = optionGroup.items.find(
            item => item.id === selectedOptions[optionGroup.name]
          );
          if (selectedOption && selectedOption.priceAdjustment) {
            subtotal += selectedOption.priceAdjustment * quantity;
          }
        }
      });
    }
    
    // Calculate shipping cost
    let shippingCost = 0;
    if (shippingInfo.shippingMethod === 'express') {
      shippingCost = 15; // Example express shipping cost
    } else if (shippingInfo.shippingMethod === 'standard') {
      shippingCost = 5; // Example standard shipping cost
    }
    
    setOrderSummary({
      subtotal,
      shippingCost,
      total: subtotal + shippingCost
    });
  }, [selectedProduct, quantity, selectedOptions, shippingInfo.shippingMethod]);
  
  const handleNext = () => {
    // Validate current step
    if (activeStep === 0 && !selectedProduct) {
      setError('Please select a product to continue');
      return;
    }
    
    if (activeStep === 1 && quantity <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    
    if (activeStep === 2) {
      if (!shippingInfo.useCompanyAddress && 
          (!shippingInfo.recipientName || !shippingInfo.address || 
           !shippingInfo.city || !shippingInfo.state || 
           !shippingInfo.zipCode || !shippingInfo.phone)) {
        setError('Please fill in all required shipping fields');
        return;
      }
    }
    
    setError('');
    setActiveStep((prevStep) => prevStep + 1);
  };
  
  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };
  
  const handleShippingChange = (e) => {
    const { name, value, checked, type } = e.target;
    
    setShippingInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // If using company address, populate with user details
    if (name === 'useCompanyAddress' && checked && userDetails) {
      setShippingInfo(prev => ({
        ...prev,
        recipientName: userDetails.companyName || '',
        address: userDetails.address || '',
        city: userDetails.city || '',
        state: userDetails.state || '',
        zipCode: userDetails.zipCode || '',
        phone: userDetails.phone || ''
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
      
      const orderData = {
        productId: selectedProduct.id,
        quantity,
        options: selectedOptions,
        additionalRequirements,
        shipping: {
          ...shippingInfo,
          cost: orderSummary.shippingCost
        },
        totalPrice: orderSummary.total
      };
      
      const response = await api.orders.create(orderData);
      
      setSuccess(true);
      
      // Navigate to the order details page after a delay
      setTimeout(() => {
        navigate(`/orders/${response.data.data.id}`);
      }, 2000);
      
    } catch (error) {
      console.error('Error creating order:', error);
      setError(error.response?.data?.message || 'Failed to create order. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderStepContent = (step) => {
    switch (step) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Select a Product
            </Typography>
            
            {loadingProducts ? (
              <CircularProgress />
            ) : (
              <Grid container spacing={3}>
                {products.map((product) => (
                  <Grid item xs={12} sm={6} md={4} key={product.id}>
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
                          {formatCurrency(product.basePrice)}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
                
                {products.length === 0 && !loadingProducts && (
                  <Box sx={{ textAlign: 'center', width: '100%', mt: 2 }}>
                    <Typography>No products available.</Typography>
                  </Box>
                )}
              </Grid>
            )}
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Order Details
            </Typography>
            
            {selectedProduct && (
              <>
                <Box sx={{ mb: 3 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={3}>
                      <img 
                        src={selectedProduct.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'} 
                        alt={selectedProduct.name}
                        style={{ width: '100%', height: 'auto', borderRadius: '4px' }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={9}>
                      <Typography variant="h5">{selectedProduct.name}</Typography>
                      <Typography variant="body1" color="text.secondary" gutterBottom>
                        {selectedProduct.description?.substring(0, 200)}
                        {selectedProduct.description?.length > 200 ? '...' : ''}
                      </Typography>
                      <Typography variant="h6" color="primary">
                        {formatCurrency(selectedProduct.basePrice)} per unit
                      </Typography>
                    </Grid>
                  </Grid>
                </Box>
                
                <Divider sx={{ mb: 3 }} />
                
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
                  
                  {/* Product Options */}
                  {selectedProduct.options && selectedProduct.options.map((optionGroup, index) => (
                    <Grid item xs={12} key={index}>
                      <FormControl component="fieldset">
                        <FormLabel component="legend">{optionGroup.name}</FormLabel>
                        <RadioGroup
                          name={optionGroup.name}
                          value={selectedOptions[optionGroup.name] || ''}
                          onChange={handleOptionChange}
                        >
                          {optionGroup.items.map((option) => (
                            <FormControlLabel
                              key={option.id}
                              value={option.id}
                              control={<Radio />}
                              label={
                                <Box component="span">
                                  {option.name} 
                                  {option.priceAdjustment !== 0 && (
                                    <Typography component="span" color={option.priceAdjustment > 0 ? 'error' : 'success'}>
                                      {' '}({option.priceAdjustment > 0 ? '+' : ''}{formatCurrency(option.priceAdjustment)})
                                    </Typography>
                                  )}
                                </Box>
                              }
                            />
                          ))}
                        </RadioGroup>
                      </FormControl>
                    </Grid>
                  ))}
                </Grid>
              </>
            )}
          </Box>
        );
        
      case 2:
        return (
          <Box>
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
            
            <Grid container spacing={3}>
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
                <FormControl component="fieldset">
                  <FormLabel component="legend">Shipping Method</FormLabel>
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
          </Box>
        );
        
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>
              Review & Confirm
            </Typography>
            
            {success && (
              <Alert severity="success" sx={{ mb: 3 }}>
                Order created successfully! You will be redirected to your order details.
              </Alert>
            )}
            
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Order Summary
              </Typography>
              
              <Grid container>
                <Grid item xs={6}>
                  <Typography>Product:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography align="right">{selectedProduct?.name}</Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography>Quantity:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography align="right">{quantity}</Typography>
                </Grid>
                
                {/* Display selected options */}
                {selectedProduct?.options && selectedProduct.options.map((optionGroup) => {
                  const selectedOption = optionGroup.items.find(
                    item => item.id === selectedOptions[optionGroup.name]
                  );
                  
                  if (!selectedOption) return null;
                  
                  return (
                    <React.Fragment key={optionGroup.name}>
                      <Grid item xs={6}>
                        <Typography>{optionGroup.name}:</Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography align="right">{selectedOption.name}</Typography>
                      </Grid>
                    </React.Fragment>
                  );
                })}
                
                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography>Subtotal:</Typography>
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
                  <Divider sx={{ my: 2 }} />
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="h6">Total:</Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="h6" align="right" color="primary">
                    {formatCurrency(orderSummary.total)}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            <Paper sx={{ p: 2, mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom>
                Shipping Information
              </Typography>
              
              <Grid container>
                <Grid item xs={12}>
                  <Typography>
                    {shippingInfo.recipientName}<br />
                    {shippingInfo.address}<br />
                    {shippingInfo.city}, {shippingInfo.state} {shippingInfo.zipCode}<br />
                    Phone: {shippingInfo.phone}
                  </Typography>
                </Grid>
              </Grid>
            </Paper>
            
            {additionalRequirements && (
              <Paper sx={{ p: 2, mb: 3 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Additional Requirements
                </Typography>
                <Typography>{additionalRequirements}</Typography>
              </Paper>
            )}
            
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
              <Typography>
                Funds will be deducted from your account balance upon confirmation.
              </Typography>
              <Typography color="primary" fontWeight="bold">
                Current Balance: {formatCurrency(userDetails?.balance || 0)}
              </Typography>
            </Box>
          </Box>
        );
        
      default:
        return 'Unknown step';
    }
  };
  
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Create Order
      </Typography>
      
      <Paper sx={{ p: 3, mb: 4 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ p: 3, mb: 4 }}>
        {renderStepContent(activeStep)}
      </Paper>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          disabled={activeStep === 0 || loading}
          onClick={handleBack}
        >
          Back
        </Button>
        
        {activeStep === steps.length - 1 ? (
          <Button
            variant="contained"
            onClick={handleSubmitOrder}
            disabled={loading || success || (userDetails?.balance < orderSummary.total)}
          >
            {loading ? <CircularProgress size={24} /> : 'Place Order'}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            Next
          </Button>
        )}
      </Box>
      
      {activeStep === steps.length - 1 && userDetails?.balance < orderSummary.total && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          Insufficient funds. Please <Button 
            color="inherit" 
            component={Link} 
            to="/deposit"
            sx={{ fontWeight: 'bold', textDecoration: 'underline' }}
          >
            deposit
          </Button> more funds to place this order.
        </Alert>
      )}
    </Box>
  );
};

export default CreateOrderPage; 