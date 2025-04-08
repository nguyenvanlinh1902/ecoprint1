import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Button, CircularProgress,
  Breadcrumbs, Divider, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableRow, Card, CardMedia,
  FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import api from '@/api';
import { formatCurrency } from '../helpers/formatters';

const TabPanel = (props) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`product-tabpanel-${index}`}
      aria-labelledby={`product-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
};

const ProductDetailPage = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tabValue, setTabValue] = useState(0);
  
  // State để quản lý sản phẩm con được chọn (đối với sản phẩm cấu hình)
  const [selectedChildProduct, setSelectedChildProduct] = useState(null);
  // State để quản lý các vị trí in/thêu được chọn
  const [selectedPrintPositions, setSelectedPrintPositions] = useState({
    base: true,
    sleeve: false,
    back: false,
    special: false
  });
  // Tính toán giá cuối cùng dựa trên các tùy chọn
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await api.products.getById(productId);
        
        if (response.data && response.data.success) {
          const productData = response.data.product;
          setProduct(productData);
          
          // Nếu là sản phẩm cấu hình, tải thêm thông tin về các sản phẩm con
          if (productData.productType === 'configurable' && productData.childProducts?.length > 0) {
            const firstChildId = productData.childProducts[0];
            const childResponse = await api.products.getById(firstChildId);
            
            if (childResponse.data && childResponse.data.success) {
              setSelectedChildProduct(childResponse.data.product);
            }
          }
          
          // Khởi tạo giá ban đầu
          if (productData.price) {
            setCalculatedPrice(productData.price);
          }
        } else {
          setError('Product not found or not available.');
        }
      } catch (error) {
        console.error('Error loading product details:', error);
        setError('Failed to load product details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);
  
  // Cập nhật giá khi thay đổi vị trí in/thêu
  useEffect(() => {
    if (!product) return;
    
    let basePrice = selectedChildProduct?.price || product.price || 0;
    let additionalCost = 0;
    
    const printOptions = product.printOptions || {
      basePosition: 'chest_left',
      additionalPositions: {
        sleeve: { price: 2, available: true },
        back: { price: 4, available: true },
        special: { price: 4, available: true }
      }
    };
    
    // Giá cơ bản đã bao gồm 1 vị trí in chính
    if (selectedPrintPositions.sleeve && printOptions.additionalPositions.sleeve) {
      additionalCost += printOptions.additionalPositions.sleeve.price || 0;
    }
    
    if (selectedPrintPositions.back && printOptions.additionalPositions.back) {
      additionalCost += printOptions.additionalPositions.back.price || 0;
    }
    
    if (selectedPrintPositions.special && printOptions.additionalPositions.special) {
      additionalCost += printOptions.additionalPositions.special.price || 0;
    }
    
    setCalculatedPrice(basePrice + additionalCost);
  }, [product, selectedChildProduct, selectedPrintPositions]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Xử lý khi chọn sản phẩm con
  const handleChildProductChange = async (childId) => {
    try {
      const response = await api.products.getById(childId);
      
      if (response.data && response.data.success) {
        setSelectedChildProduct(response.data.product);
      } else {
        console.error('Error fetching child product: Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching child product:', error);
    }
  };
  
  // Xử lý khi thay đổi vị trí in/thêu
  const handlePrintPositionChange = (position) => {
    setSelectedPrintPositions(prev => ({
      ...prev,
      [position]: !prev[position]
    }));
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography color="error" variant="h6" sx={{ mb: 2 }}>
          {error}
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/products')}
        >
          Back to Products
        </Button>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Product not found.
        </Typography>
        <Button 
          variant="outlined" 
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/products')}
        >
          Back to Products
        </Button>
      </Box>
    );
  }

  return (
    <Box>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link to="/products" style={{ textDecoration: 'none', color: 'inherit' }}>
          Products
        </Link>
        <Typography color="text.primary">{product.name}</Typography>
      </Breadcrumbs>
      
      {/* Product Overview */}
      <Grid container spacing={4}>
        {/* Product Image */}
        <Grid item xs={12} md={5}>
          <Card>
            <CardMedia
              component="img"
              height="400"
              image={product.images && product.images.length > 0 
                ? product.images[0] 
                : (product.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image')}
              alt={product.name}
              sx={{ objectFit: 'contain', bgcolor: '#f5f5f5' }}
            />
          </Card>
        </Grid>
        
        {/* Product Info */}
        <Grid item xs={12} md={7}>
          <Typography variant="h4" gutterBottom>
            {product.name}
          </Typography>
          
          <Typography 
            variant="subtitle1" 
            color="primary.main" 
            sx={{ mb: 2, display: 'inline-block', bgcolor: 'primary.lightest', px: 1, py: 0.5, borderRadius: 1 }}
          >
            {product.category || 'General Product'}
          </Typography>
          
          <Typography variant="h5" color="primary" sx={{ my: 2 }}>
            {formatCurrency(calculatedPrice)}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {product.description}
          </Typography>
          
          {/* Tùy chọn sản phẩm cấu hình */}
          {product.productType === 'configurable' && product.childProducts?.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Product Options
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Select Option</InputLabel>
                <Select
                  value={selectedChildProduct?.id || ''}
                  onChange={(e) => handleChildProductChange(e.target.value)}
                  label="Select Option"
                >
                  {product.childProducts.map((childId) => (
                    <MenuItem key={childId} value={childId}>
                      {product.childProductsMap?.[childId]?.name || childId}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
          
          {/* Tùy chọn vị trí in/thêu */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Print/Embroidery Options
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={<Checkbox checked={true} disabled />}
                label={`Base position (${product.printOptions?.basePosition?.replace('_', ' ') || 'chest left'}) (included in price)`}
              />
              {product.printOptions?.additionalPositions?.sleeve?.available && (
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedPrintPositions.sleeve} 
                      onChange={() => handlePrintPositionChange('sleeve')}
                    />
                  }
                  label={`Sleeve (+${formatCurrency(product.printOptions?.additionalPositions?.sleeve?.price || 2)})`}
                />
              )}
              {product.printOptions?.additionalPositions?.back?.available && (
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedPrintPositions.back} 
                      onChange={() => handlePrintPositionChange('back')}
                    />
                  }
                  label={`Back (+${formatCurrency(product.printOptions?.additionalPositions?.back?.price || 4)})`}
                />
              )}
              {product.printOptions?.additionalPositions?.special?.available && (
                <FormControlLabel
                  control={
                    <Checkbox 
                      checked={selectedPrintPositions.special} 
                      onChange={() => handlePrintPositionChange('special')}
                    />
                  }
                  label={`Special position (collar, hem, etc.) (+${formatCurrency(product.printOptions?.additionalPositions?.special?.price || 4)})`}
                />
              )}
            </FormGroup>
          </Box>
          
          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to={`/create-order?productId=${product.id}`}
              startIcon={<ShoppingCartIcon />}
              sx={{ mr: 2 }}
            >
              Order Now
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/products')}
              startIcon={<ArrowBackIcon />}
            >
              Back to Products
            </Button>
          </Box>
        </Grid>
      </Grid>
      
      {/* Product Details Tabs */}
      <Box sx={{ mt: 6 }}>
        <Paper>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            variant="fullWidth"
          >
            <Tab label="Specifications" />
            <Tab label="Pricing Details" />
            <Tab label="Delivery Information" />
          </Tabs>
          
          {/* Specifications Tab */}
          <TabPanel value={tabValue} index={0}>
            <TableContainer>
              <Table>
                <TableBody>
                  {product.specifications && Object.entries(product.specifications).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                        {key}
                      </TableCell>
                      <TableCell>{value}</TableCell>
                    </TableRow>
                  ))}
                  {(!product.specifications || Object.keys(product.specifications).length === 0) && (
                    <TableRow>
                      <TableCell colSpan={2} align="center">
                        No specifications available for this product.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          
          {/* Pricing Details Tab */}
          <TabPanel value={tabValue} index={1}>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                      Base Price
                    </TableCell>
                    <TableCell>{formatCurrency(selectedChildProduct?.price || product.price || 0)}</TableCell>
                  </TableRow>
                  
                  {/* Print Position Pricing */}
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Print/Embroidery Options
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        Base position (front left/right/center): Included in price
                      </Typography>
                      
                      {product.printOptions?.additionalPositions?.sleeve?.available && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Sleeve (left/right): +${product.printOptions?.additionalPositions?.sleeve?.price || 2} per position
                        </Typography>
                      )}
                      
                      {product.printOptions?.additionalPositions?.back?.available && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Back: +${product.printOptions?.additionalPositions?.back?.price || 4}
                        </Typography>
                      )}
                      
                      {product.printOptions?.additionalPositions?.special?.available && (
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          Special position (collar, hem, etc.): +${product.printOptions?.additionalPositions?.special?.price || 4}
                        </Typography>
                      )}
                    </TableCell>
                  </TableRow>
                  
                  {/* Current Price Calculation */}
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Current Price Calculation
                    </TableCell>
                    <TableCell>
                      <Box sx={{ mb: 1 }}>
                        Base product: {formatCurrency(selectedChildProduct?.price || product.price || 0)}
                      </Box>
                      
                      {selectedPrintPositions.sleeve && (
                        <Box sx={{ mb: 1 }}>
                          Sleeve: +{formatCurrency(product.printOptions?.additionalPositions?.sleeve?.price || 2)}
                        </Box>
                      )}
                      
                      {selectedPrintPositions.back && (
                        <Box sx={{ mb: 1 }}>
                          Back: +{formatCurrency(product.printOptions?.additionalPositions?.back?.price || 4)}
                        </Box>
                      )}
                      
                      {selectedPrintPositions.special && (
                        <Box sx={{ mb: 1 }}>
                          Special position: +{formatCurrency(product.printOptions?.additionalPositions?.special?.price || 4)}
                        </Box>
                      )}
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ fontWeight: 'bold' }}>
                        Total: {formatCurrency(calculatedPrice)}
                      </Box>
                    </TableCell>
                  </TableRow>
                  
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Discount Options
                    </TableCell>
                    <TableCell>
                      {product.discounts && product.discounts.length > 0 ? (
                        product.discounts.map((discount, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            {discount.description}: {discount.value}% discount
                          </Box>
                        ))
                      ) : (
                        "No discount options available"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Bulk Pricing
                    </TableCell>
                    <TableCell>
                      {product.bulkPricing && product.bulkPricing.length > 0 ? (
                        product.bulkPricing.map((pricing, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            {pricing.minQuantity}+ units: {formatCurrency(pricing.price)} per unit
                          </Box>
                        ))
                      ) : (
                        "No bulk pricing available"
                      )}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
          
          {/* Delivery Information Tab */}
          <TabPanel value={tabValue} index={2}>
            <TableContainer>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ width: '30%', fontWeight: 'bold' }}>
                      Estimated Delivery
                    </TableCell>
                    <TableCell>{product.deliveryEstimate || '3-5 business days'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Delivery Options
                    </TableCell>
                    <TableCell>
                      {product.deliveryOptions && product.deliveryOptions.length > 0 ? (
                        product.deliveryOptions.map((option, index) => (
                          <Box key={index} sx={{ mb: 1 }}>
                            {option.name}: {formatCurrency(option.price)}
                          </Box>
                        ))
                      ) : (
                        "Standard shipping available"
                      )}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Shipping Policy
                    </TableCell>
                    <TableCell>
                      {product.shippingPolicy || 'Standard shipping policy applies. Please contact for international shipping details.'}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </TabPanel>
        </Paper>
      </Box>
    </Box>
  );
};

export default ProductDetailPage; 