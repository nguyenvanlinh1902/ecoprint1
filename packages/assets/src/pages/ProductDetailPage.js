import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Box, Typography, Grid, Paper, Button, CircularProgress,
  Breadcrumbs, Divider, Tabs, Tab, Table, TableBody,
  TableCell, TableContainer, TableRow, Card, CardMedia,
  FormControl, InputLabel, Select, MenuItem, FormGroup, FormControlLabel, Checkbox,
  ToggleButton, ToggleButtonGroup, Alert, TextField, List, ListItem, ListItemIcon, ListItemText, IconButton
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  ShoppingCart as ShoppingCartIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  AttachFile as AttachFileIcon
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
  
  // State cho configurable product
  const [variants, setVariants] = useState({
    colors: [],
    sizes: []
  });
  const [selectedVariant, setSelectedVariant] = useState({
    color: '',
    size: ''
  });
  const [selectedChildSku, setSelectedChildSku] = useState('');
  
  // State cho embroidery options
  const [selectedEmbroideryOption, setSelectedEmbroideryOption] = useState('embroidery-standard');
  
  // State cho print positions
  const [selectedPrintPositions, setSelectedPrintPositions] = useState([]);
  
  // Tính toán giá cuối cùng dựa trên các tùy chọn
  const [calculatedPrice, setCalculatedPrice] = useState(0);

  // Thêm state cho giỏ hàng và tải file
  const [quantity, setQuantity] = useState(1);
  const [designFiles, setDesignFiles] = useState([]);
  const [addingToCart, setAddingToCart] = useState(false);
  const [cartSuccess, setCartSuccess] = useState(false);

  // Tải thông tin sản phẩm
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await api.products.getById(productId);
        
        if (response.data && response.data.success) {
          const productData = response.data.product;
          setProduct(productData);
          
          // Khởi tạo giá ban đầu
          setCalculatedPrice(productData.basePrice || productData.price || 0);
          
          // Nếu là sản phẩm có thể cấu hình, xử lý thông tin variants
          if (productData.productType === 'configurable' && Array.isArray(productData.childProducts)) {
            // Lấy danh sách sản phẩm con và trích xuất variants
            try {
              const childProducts = [];
              const colors = new Set();
              const sizes = new Set();
              
              // Xử lý childProducts để lấy ra color và size
              for (const child of productData.childProducts) {
                if (typeof child === 'object') {
                  if (child.color) colors.add(child.color);
                  if (child.size) sizes.add(child.size);
                  
                  childProducts.push(child);
                } else if (typeof child === 'string') {
                  // Nếu childProduct là string ID, cần lấy thông tin chi tiết
                  try {
                    const childResponse = await api.products.getById(child);
                    if (childResponse.data && childResponse.data.success) {
                      const childData = childResponse.data.product;
                      if (childData.color) colors.add(childData.color);
                      if (childData.size) sizes.add(childData.size);
                      
                      childProducts.push(childData);
                    }
                  } catch (err) {
                    console.error(`Failed to fetch child product ${child}:`, err);
                  }
                }
              }
              
              // Cập nhật state của variants
              setVariants({
                colors: Array.from(colors),
                sizes: Array.from(sizes)
              });
              
              // Chọn variant đầu tiên
              if (colors.size > 0 && sizes.size > 0) {
                const firstColor = Array.from(colors)[0];
                const firstSize = Array.from(sizes)[0];
                
                setSelectedVariant({
                  color: firstColor,
                  size: firstSize
                });
                
                // Tìm SKU tương ứng với variant đầu tiên
                const matchingChild = childProducts.find(
                  child => child.color === firstColor && child.size === firstSize
                );
                
                if (matchingChild) {
                  setSelectedChildSku(matchingChild.sku || '');
                }
              }
            } catch (error) {
              console.error('Error processing child products:', error);
            }
          }
          
          // Khởi tạo embroidery option
          if (productData.productionOptionType === 'embroidery' && productData.optionPrices) {
            const defaultOption = Object.keys(productData.optionPrices)[0] || 'embroidery-standard';
            setSelectedEmbroideryOption(defaultOption);
          }
          
          // Khởi tạo print positions
          if (productData.productionOptionType === 'print-position' && Array.isArray(productData.printPositions)) {
            if (productData.printPositions.length > 0) {
              // Chọn vị trí đầu tiên mặc định
              const firstPosition = productData.printPositions[0];
              const positionId = typeof firstPosition === 'string' ? firstPosition : firstPosition.id;
              setSelectedPrintPositions([positionId]);
            }
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
  
  // Tính toán giá dựa trên các tùy chọn đã chọn
  useEffect(() => {
    if (!product) return;
    
    // Giá cơ bản từ sản phẩm hoặc biến thể đã chọn (đảm bảo có giá trị)
    let basePrice = parseFloat(product.price) || parseFloat(product.basePrice) || 19.99;
    
    console.log("Initial basePrice:", basePrice, "from product:", product);
    
    // Nếu đã chọn một biến thể (childSku), sử dụng giá của biến thể đó
    if (product.productType === 'configurable' && selectedChildSku) {
      const selectedVariantData = product.childProducts?.find(child => 
        (typeof child === 'object' && child.sku === selectedChildSku));
      
      if (selectedVariantData) {
        if (selectedVariantData.price) {
          basePrice = parseFloat(selectedVariantData.price);
        } else if (selectedVariantData.basePrice) {
          basePrice = parseFloat(selectedVariantData.basePrice);
        }
        console.log("Selected variant price:", basePrice, "for SKU:", selectedChildSku);
      }
    }
    
    // Cộng thêm giá từ các vị trí in đã chọn
    let additionalPositionCost = 0;
    if (product.productionOptionType === 'print-position' && selectedPrintPositions.length > 0) {
      selectedPrintPositions.forEach(positionId => {
        // Tìm thông tin vị trí in trong danh sách printPositions của sản phẩm
        const position = Array.isArray(product.printPositions) ? 
          product.printPositions.find(p => 
            (typeof p === 'string' && p === positionId) || 
            (typeof p === 'object' && p.id === positionId)
          ) : null;
        
        // Nếu tìm thấy và có giá, cộng vào
        if (position && typeof position === 'object' && position.price) {
          const positionPrice = parseFloat(position.price) || 0;
          additionalPositionCost += positionPrice;
          console.log("Added position price:", positionPrice, "for position:", position.id || position.name);
        }
      });
    }
    
    // Cộng thêm giá từ tùy chọn thêu (nếu đã chọn)
    let embroideryOptionCost = 0;
    if (product.productionOptionType === 'embroidery' && selectedEmbroideryOption && product.optionPrices) {
      const optionPrice = product.optionPrices[selectedEmbroideryOption];
      if (optionPrice) {
        embroideryOptionCost = parseFloat(optionPrice) || 0;
        console.log("Embroidery option price:", embroideryOptionCost, "for option:", selectedEmbroideryOption);
      }
    }
    
    // Tính tổng giá cho một sản phẩm
    const singleItemPrice = basePrice + additionalPositionCost + embroideryOptionCost;
    
    // Tính tổng giá với số lượng
    const total = singleItemPrice * quantity;
    
    // Debug logging
    console.log('Price calculation:', {
      basePrice,
      additionalPositionCost,
      embroideryOptionCost,
      singleItemPrice,
      quantity,
      total
    });
    
    // Cập nhật giá đã tính toán
    setCalculatedPrice(total);
  }, [product, selectedChildSku, selectedVariant, selectedPrintPositions, selectedEmbroideryOption, quantity]);
  
  // Khi thay đổi variant (color hoặc size)
  useEffect(() => {
    if (!product || !product.childProducts || product.productType !== 'configurable') return;
    
    const { color, size } = selectedVariant;
    if (!color || !size) return;
    
    // Tìm child product phù hợp với variant đã chọn
    const matchingChild = product.childProducts.find(child => {
      if (typeof child === 'object') {
        return child.color === color && child.size === size;
      }
      return false;
    });
    
    if (matchingChild) {
      setSelectedChildSku(matchingChild.sku || '');
    } else {
      setSelectedChildSku('');
    }
  }, [product, selectedVariant]);

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };
  
  // Xử lý khi thay đổi variant
  const handleVariantChange = (type, value) => {
    setSelectedVariant(prev => ({
      ...prev,
      [type]: value
    }));
  };
  
  // Khi chọn embroidery option
  const handleEmbroideryOptionChange = (event, newOption) => {
    if (newOption !== null) {
      console.log(`Changed embroidery option to: ${newOption}`);
      setSelectedEmbroideryOption(newOption);
    }
  };
  
  // Kiểm tra xem sản phẩm có hỗ trợ vị trí in này không
  const isPositionAvailable = (position) => {
    if (!product || !product.printPositions) return false;
    
    // Nếu vị trí có trong danh sách printPositions của sản phẩm
    if (Array.isArray(product.printPositions)) {
      return product.printPositions.some(pos => 
        (typeof pos === 'string' && pos === position) || 
        (typeof pos === 'object' && (pos.id === position || pos.name === position))
      );
    }
    
    return false;
  };

  // Kiểm tra xem loại sản phẩm có thể tùy chỉnh embroidery không
  const canCustomizeEmbroidery = () => {
    return product?.productionOptionType === 'embroidery' || 
           product?.customizationOptions?.some(option => option.type === 'embroidery');
  };

  // Kiểm tra xem loại sản phẩm có thể tùy chỉnh vị trí in không
  const canCustomizePrintPosition = () => {
    return product?.productionOptionType === 'print-position' || 
           product?.customizationOptions?.some(option => option.type === 'position');
  };

  // Xử lý khi thay đổi print position
  const handlePrintPositionChange = (position) => {
    if (selectedPrintPositions.includes(position)) {
      setSelectedPrintPositions(selectedPrintPositions.filter(p => p !== position));
    } else {
      setSelectedPrintPositions([...selectedPrintPositions, position]);
    }
  };

  // Xử lý thay đổi số lượng
  const handleQuantityChange = (event) => {
    const value = parseInt(event.target.value, 10);
    setQuantity(isNaN(value) || value < 1 ? 1 : value);
  };

  // Xử lý tải lên file thiết kế
  const handleFileChange = (event) => {
    const newFiles = Array.from(event.target.files);
    setDesignFiles([...designFiles, ...newFiles]);
  };

  // Xóa file thiết kế đã tải lên
  const handleRemoveFile = (index) => {
    const newFiles = [...designFiles];
    newFiles.splice(index, 1);
    setDesignFiles(newFiles);
  };

  // Xử lý đặt hàng ngay
  const handleOrderNow = async () => {
    // Kiểm tra điều kiện trước khi cho phép đặt hàng
    if (
      (product.productType === 'configurable' && !selectedChildSku) ||
      (product.productionOptionType === 'print-position' && selectedPrintPositions.length === 0)
    ) {
      return;
    }

    try {
      // Upload design files nếu có
      let designUrls = [];
      if (designFiles.length > 0) {
        for (const file of designFiles) {
          try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('path', `designs/${Date.now()}`);
            
            const response = await api.products.uploadImage(formData);
            if (response && response.data && response.data.imageUrl) {
              designUrls.push({
                name: file.name,
                url: response.data.imageUrl
              });
            }
          } catch (error) {
            console.error('Error uploading design file:', error);
          }
        }
      }

      // Chuẩn bị các tham số cho URL
      const params = new URLSearchParams();
      
      // Thêm thông tin cơ bản
      params.append('productId', product.id);
      params.append('quantity', quantity);
      
      // Thêm thông tin về sản phẩm con (nếu là sản phẩm configurable)
      if (product.productType === 'configurable') {
        params.append('childSku', selectedChildSku);
        params.append('color', selectedVariant.color);
        params.append('size', selectedVariant.size);
      }
      
      // Thêm thông tin về tùy chọn embroidery (nếu có)
      if (product.productionOptionType === 'embroidery' && selectedEmbroideryOption) {
        params.append('embroideryOption', selectedEmbroideryOption);
        params.append('productionType', 'embroidery');
      }
      
      // Thêm thông tin về print positions (nếu có)
      if (product.productionOptionType === 'print-position' && selectedPrintPositions.length > 0) {
        // Chuyển mảng positions thành một chuỗi JSON để truyền qua URL
        params.append('printPositions', JSON.stringify(selectedPrintPositions));
        params.append('productionType', 'print');
      }
      
      // Thêm thông tin về design files
      if (designUrls.length > 0) {
        params.append('designFiles', JSON.stringify(designUrls));
      }
      
      // Thêm giá tính toán
      params.append('price', calculatedPrice.toString());
      
      // Chuyển hướng đến trang tạo đơn hàng với tất cả thông tin đã chọn
      navigate(`/orders/create?${params.toString()}`);
    } catch (error) {
      console.error('Error preparing order:', error);
    }
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
            {product.categoryId || 'General Product'}
          </Typography>
          
          <Typography variant="h5" color="primary" sx={{ my: 2 }}>
            {formatCurrency(calculatedPrice)}
          </Typography>
          
          <Typography variant="body1" paragraph>
            {product.description}
          </Typography>
          
          {/* Tùy chọn cho sản phẩm configurable */}
          {product.productType === 'configurable' && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Product Options
              </Typography>
              
              {/* Color Selection */}
              {variants.colors.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Color:</Typography>
                  <ToggleButtonGroup
                    value={selectedVariant.color}
                    exclusive
                    onChange={(e, value) => handleVariantChange('color', value)}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    {variants.colors.map(color => (
                      <ToggleButton key={color} value={color} sx={{ mb: 1, mr: 1 }}>
                        {color}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}
              
              {/* Size Selection */}
              {variants.sizes.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>Size:</Typography>
                  <ToggleButtonGroup
                    value={selectedVariant.size}
                    exclusive
                    onChange={(e, value) => handleVariantChange('size', value)}
                    sx={{ flexWrap: 'wrap' }}
                  >
                    {variants.sizes.map(size => (
                      <ToggleButton key={size} value={size} sx={{ mb: 1, mr: 1 }}>
                        {size}
                      </ToggleButton>
                    ))}
                  </ToggleButtonGroup>
                </Box>
              )}
              
              {selectedChildSku ? (
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Selected product: {selectedChildSku}
                </Typography>
              ) : (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Please select all options to continue
                </Alert>
              )}
            </Box>
          )}
          
          {/* Tùy chọn embroidery CHỈ khi sản phẩm hỗ trợ */}
          {canCustomizeEmbroidery() && product.optionPrices && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Embroidery Options
              </Typography>
              <ToggleButtonGroup
                value={selectedEmbroideryOption}
                exclusive
                onChange={handleEmbroideryOptionChange}
                sx={{ flexWrap: 'wrap' }}
              >
                {Object.entries(product.optionPrices).filter(([key]) => key.includes('embroidery')).map(([optionId, price]) => {
                  const optionName = optionId.replace('embroidery-', '').replace('-', ' ');
                  const optionPrice = typeof price === 'number' ? price : (price?.price || 0);
                  return (
                    <ToggleButton key={optionId} value={optionId} sx={{ mb: 1, mr: 1 }}>
                      {optionName.charAt(0).toUpperCase() + optionName.slice(1)} 
                      {optionPrice > 0 && ` (+${formatCurrency(optionPrice)})`}
                    </ToggleButton>
                  );
                })}
              </ToggleButtonGroup>
            </Box>
          )}
          
          {/* Tùy chọn print positions CHỈ khi sản phẩm hỗ trợ */}
          {canCustomizePrintPosition() && Array.isArray(product.printPositions) && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
                Print Positions
              </Typography>
              <FormGroup>
                {product.printPositions
                  .filter(position => {
                    // Chỉ hiển thị các vị trí có thể chọn (có ID hoặc name)
                    if (typeof position === 'string') return true;
                    if (typeof position === 'object' && (position.id || position.name)) return true;
                    return false;
                  })
                  .map((position, index) => {
                    const positionId = typeof position === 'string' ? position : position.id;
                    const positionName = typeof position === 'object' ? 
                      (position.name || positionId.replace('position-', '').replace('-', ' ')) : 
                      positionId.replace('position-', '').replace('-', ' ');
                    const positionPrice = typeof position === 'object' ? (parseFloat(position.price) || 0) : 0;
                    
                    return (
                      <FormControlLabel
                        key={positionId || `position-${index}`}
                        control={
                          <Checkbox 
                            checked={selectedPrintPositions.includes(positionId)} 
                            onChange={() => handlePrintPositionChange(positionId)}
                            disabled={!positionId || !isPositionAvailable(positionId)}
                          />
                        }
                        label={`${positionName.charAt(0).toUpperCase() + positionName.slice(1)} ${positionPrice > 0 ? `(+${formatCurrency(positionPrice)})` : ''}`}
                      />
                    );
                  })}
              </FormGroup>
              
              {selectedPrintPositions.length === 0 && canCustomizePrintPosition() && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  Please select at least one print position
                </Alert>
              )}
            </Box>
          )}
          
          {/* Quantity Controls */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mr: 2 }}>
              Quantity:
            </Typography>
            <TextField
              type="number"
              size="small"
              InputProps={{ inputProps: { min: 1 } }}
              value={quantity}
              onChange={handleQuantityChange}
              sx={{ width: 80 }}
            />
          </Box>
          
          {/* Design File Upload */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1 }}>
              Upload Design Files (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Upload your design files to help our team understand your customization needs.
            </Typography>
            
            <Button
              variant="outlined"
              component="label"
              startIcon={<UploadIcon />}
              sx={{ mb: 2 }}
            >
              Upload Files
              <input
                type="file"
                hidden
                multiple
                onChange={handleFileChange}
                accept="image/*, application/pdf"
              />
            </Button>
            
            {designFiles.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" fontWeight="bold" sx={{ mb: 1 }}>
                  Uploaded Files:
                </Typography>
                <List dense>
                  {designFiles.map((file, index) => (
                    <ListItem 
                      key={index}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleRemoveFile(index)}>
                          <DeleteIcon />
                        </IconButton>
                      }
                    >
                      <ListItemIcon>
                        <AttachFileIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={file.name}
                        secondary={`${(file.size / 1024).toFixed(2)} KB`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
          
          {/* Action Buttons */}
          <Box sx={{ mt: 4, display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
            <Button
              variant="contained"
              size="large"
              onClick={handleOrderNow}
              startIcon={<ShoppingCartIcon />}
              disabled={
                (product.productType === 'configurable' && !selectedChildSku) ||
                (product.productionOptionType === 'print-position' && selectedPrintPositions.length === 0)
              }
              fullWidth
              sx={{ py: 1.5 }}
            >
              Order Now
            </Button>
            
            <Button
              variant="outlined"
              size="large"
              onClick={() => navigate('/products')}
              startIcon={<ArrowBackIcon />}
            >
              Back
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
                    <TableCell>{formatCurrency(product.basePrice || product.price || 0)}</TableCell>
                  </TableRow>
                  
                  {/* Embroidery Options Pricing */}
                  {product.productionOptionType === 'embroidery' && product.optionPrices && (
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Embroidery Options
                      </TableCell>
                      <TableCell>
                        {Object.entries(product.optionPrices).map(([optionId, price]) => {
                          const optionName = optionId.replace('embroidery-', '').replace('-', ' ');
                          const optionPrice = typeof price === 'number' ? price : (price?.price || 0);
                          return (
                            <Typography key={optionId} variant="body2" sx={{ mb: 1, textTransform: 'capitalize' }}>
                              {optionName}: {optionPrice > 0 ? `+${formatCurrency(optionPrice)}` : 'Included in price'}
                            </Typography>
                          );
                        })}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Print Position Pricing */}
                  {product.productionOptionType === 'print-position' && Array.isArray(product.printPositions) && (
                    <TableRow>
                      <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                        Print Positions
                      </TableCell>
                      <TableCell>
                        {product.printPositions.map((position, index) => {
                          const positionId = typeof position === 'string' ? position : position.id;
                          const positionName = typeof position === 'object' ? position.name : positionId.replace('position-', '').replace('-', ' ');
                          const positionPrice = typeof position === 'object' ? position.price : 0;
                          
                          return (
                            <Typography key={positionId} variant="body2" sx={{ mb: 1, textTransform: 'capitalize' }}>
                              {positionName}: {positionPrice > 0 ? `+${formatCurrency(positionPrice)}` : 'Included in price'}
                            </Typography>
                          );
                        })}
                      </TableCell>
                    </TableRow>
                  )}
                  
                  {/* Current Price Calculation */}
                  <TableRow>
                    <TableCell component="th" scope="row" sx={{ fontWeight: 'bold' }}>
                      Current Price Calculation
                    </TableCell>
                    <TableCell>
                      <Box sx={{ mb: 1 }}>
                        Base product: {formatCurrency(product.basePrice || product.price || 0)}
                      </Box>
                      
                      {product.productionOptionType === 'embroidery' && selectedEmbroideryOption && (
                        <Box sx={{ mb: 1, textTransform: 'capitalize' }}>
                          {selectedEmbroideryOption.replace('embroidery-', '').replace('-', ' ')} (embroidery): 
                          {' '}+{formatCurrency(
                            typeof product.optionPrices[selectedEmbroideryOption] === 'number' 
                              ? product.optionPrices[selectedEmbroideryOption] 
                              : (product.optionPrices[selectedEmbroideryOption]?.price || 0)
                          )}
                        </Box>
                      )}
                      
                      {product.productionOptionType === 'print-position' && selectedPrintPositions.length > 0 && (
                        <>
                          {selectedPrintPositions.map(posId => {
                            const position = product.printPositions.find(p => 
                              (typeof p === 'string' && p === posId) || 
                              (typeof p === 'object' && p.id === posId)
                            );
                            
                            if (!position) return null;
                            
                            const positionName = typeof position === 'object' ? position.name : posId.replace('position-', '').replace('-', ' ');
                            const positionPrice = typeof position === 'object' ? position.price : 0;
                            
                            return (
                              <Box key={posId} sx={{ mb: 1, textTransform: 'capitalize' }}>
                                {positionName} (print position): +{formatCurrency(positionPrice)}
                              </Box>
                            );
                          })}
                        </>
                      )}
                      
                      <Divider sx={{ my: 1 }} />
                      
                      <Box sx={{ fontWeight: 'bold' }}>
                        Total: {formatCurrency(calculatedPrice)} {quantity > 1 ? `× ${quantity} = ${formatCurrency(calculatedPrice * quantity)}` : ''}
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