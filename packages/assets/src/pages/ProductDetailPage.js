import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Button, CircularProgress,
  Breadcrumbs, Divider, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableRow, Card, CardMedia
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ShoppingCart as ShoppingCartIcon
} from '@mui/icons-material';
import api from '../services/api';
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

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/api/products/${productId}`);
        setProduct(response.data.data);
      } catch (error) {
        console.error('Error fetching product:', error);
        setError('Failed to load product details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [productId]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
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
              image={product.imageUrl || 'https://via.placeholder.com/600x400?text=No+Image'}
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
            {formatCurrency(product.basePrice)}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {product.description}
          </Typography>
          
          <Box sx={{ mt: 4 }}>
            <Button
              variant="contained"
              size="large"
              component={Link}
              to={`/orders/create?product=${product.id}`}
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
                    <TableCell>{formatCurrency(product.basePrice)}</TableCell>
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