import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  Typography, Box, Paper, Grid, TextField, Button, Divider, FormControlLabel, Checkbox,
  RadioGroup, Radio, FormControl, FormLabel, InputAdornment, CircularProgress, Alert,
  Card, CardContent, CardMedia, Select, MenuItem, InputLabel, IconButton, List, ListItem,
  ListItemText, ListItemSecondaryAction, FormGroup
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { api } from '../helpers';
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

  // Parse params from URL query parameters
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const productId = params.get('productId');
    const childSku = params.get('childSku');
    const color = params.get('color');
    const size = params.get('size');
    const quantity = params.get('quantity');
    const embroideryOption = params.get('embroideryOption');
    const productionType = params.get('productionType');
    const printPositionsJson = params.get('printPositions');
    const designFilesJson = params.get('designFiles');
    const price = params.get('price');
    
    // Nếu có productId thì đặt vào currentProductId
    if (productId) {
      setCurrentProductId(productId);
      
      // Đặt số lượng nếu có
      if (quantity) {
        setCurrentQuantity(parseInt(quantity, 10) || 1);
      }
      
      // Nếu có dữ liệu embroidery hoặc printPositions, lưu để xử lý sau khi load sản phẩm
      if (productionType === 'embroidery' && embroideryOption) {
        // Sẽ xử lý trong useEffect dành riêng cho product details
        localStorage.setItem('embroideryOption', embroideryOption);
      }
      
      if (productionType === 'print' && printPositionsJson) {
        try {
          // Lưu print positions vào localStorage để xử lý sau khi load product
          localStorage.setItem('printPositions', printPositionsJson);
        } catch (e) {
          console.error('Error parsing print positions:', e);
        }
      }
      
      // Lưu childSku, color, size để xử lý sau khi load product
      if (childSku) localStorage.setItem('childSku', childSku);
      if (color) localStorage.setItem('color', color);
      if (size) localStorage.setItem('size', size);
      
      // Lưu designFiles nếu có
      if (designFilesJson) {
        localStorage.setItem('designFiles', designFilesJson);
      }
      
      // Lưu giá nếu có
      if (price) {
        localStorage.setItem('calculatedPrice', price);
      }
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
            // Tạo bản sao của productData để có thể chỉnh sửa
            const productCopy = { ...productData };
            
            // Xử lý childSku nếu có
            const childSku = localStorage.getItem('childSku');
            const color = localStorage.getItem('color');
            const size = localStorage.getItem('size');
            
            // Nếu là sản phẩm configurable và có childSku
            if (productData.productType === 'configurable' && childSku && productData.childProducts) {
              // Tìm sản phẩm con phù hợp
              const childProduct = productData.childProducts.find(child => {
                if (typeof child === 'object' && child.sku === childSku) {
                  return true;
                }
                return false;
              });
              
              // Nếu tìm thấy childProduct, cập nhật thông tin
              if (childProduct) {
                productCopy.selectedChild = childProduct;
                productCopy.color = color || childProduct.color;
                productCopy.size = size || childProduct.size;
                
                // Cập nhật giá nếu childProduct có giá
                if (childProduct.price || childProduct.basePrice) {
                  productCopy.price = childProduct.price || childProduct.basePrice;
                }
              }
            }
            
            // Cập nhật giá từ localStorage nếu có
            const calculatedPrice = localStorage.getItem('calculatedPrice');
            if (calculatedPrice) {
              productCopy.price = parseFloat(calculatedPrice);
            }
            
            setCurrentProduct(productCopy);
            
            // Khởi tạo print positions hoặc embroidery options
            
            // Xử lý embroidery option
            const embroideryOption = localStorage.getItem('embroideryOption');
            if (productData.productionOptionType === 'embroidery' && embroideryOption) {
              // Tạo customizations cho embroidery
              const customizations = [{
                type: 'EMBROIDERY',
                option: embroideryOption,
                price: productData.optionPrices?.[embroideryOption] || 0,
                designUrl: ''
              }];
              
              // Lưu vào state
              setCurrentCustomizations(customizations);
            }
            
            // Xử lý print positions
            const printPositionsJson = localStorage.getItem('printPositions');
            if (productData.productionOptionType === 'print-position' && printPositionsJson) {
              try {
                const printPositions = JSON.parse(printPositionsJson);
                
                // Tạo customizations cho print positions
                const customizations = printPositions.map(posId => {
                  // Tìm position trong product.printPositions
                  const position = productData.printPositions?.find(p => 
                    (typeof p === 'string' && p === posId) || 
                    (typeof p === 'object' && p.id === posId)
                  );
                  
                  return {
                    type: 'PRINT',
                    position: typeof position === 'string' ? position : position?.id,
                    positionName: typeof position === 'object' ? position?.name : posId,
                    price: typeof position === 'object' ? (position?.price || 0) : 0,
                    designUrl: ''
                  };
                });
                
                // Lưu vào state
                setCurrentCustomizations(customizations);
                setCurrentPrintPositions({
                  selectedPositions: printPositions
                });
              } catch (e) {
                console.error('Error parsing print positions:', e);
              }
            } else {
              // Khởi tạo mặc định nếu không có dữ liệu từ URL
              if (productData.printOptions) {
                const basePosition = productData.printOptions.basePosition || 'chest_left';
                setCurrentPrintPositions({
                  basePosition,
                  additionalPositions: {}
                });
              }
            }
            
            // Xử lý design files
            const designFilesJson = localStorage.getItem('designFiles');
            if (designFilesJson) {
              try {
                const designFiles = JSON.parse(designFilesJson);
                setDesignFiles(designFiles);
              } catch (e) {
                console.error('Error parsing design files:', e);
              }
            }
            
            // Xóa dữ liệu đã xử lý trong localStorage
            localStorage.removeItem('childSku');
            localStorage.removeItem('color');
            localStorage.removeItem('size');
            localStorage.removeItem('embroideryOption');
            localStorage.removeItem('printPositions');
            localStorage.removeItem('designFiles');
            localStorage.removeItem('calculatedPrice');
            
            // Tự động thêm vào đơn hàng nếu có đủ thông tin
            if (
              (productData.productType !== 'configurable' || childSku) &&
              ((productData.productionOptionType !== 'print-position' || (printPositionsJson && JSON.parse(printPositionsJson).length > 0)))
            ) {
              // Đợi một chút để các state được cập nhật đầy đủ
              setTimeout(() => {
                handleAddToOrderFromUrl(productCopy);
              }, 500);
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

  // Thêm state mới để lưu customizations
  const [currentCustomizations, setCurrentCustomizations] = useState([]);
  // Thêm state để lưu design files
  const [designFiles, setDesignFiles] = useState([]);

  // Hàm để tự động thêm sản phẩm vào giỏ hàng từ URL params
  const handleAddToOrderFromUrl = (productData) => {
    if (!productData) return;
    
    // Đảm bảo giá cơ bản có giá trị
    let basePrice = parseFloat(localStorage.getItem('calculatedPrice'));
    
    // Nếu không có giá trong localStorage, lấy từ sản phẩm
    if (!basePrice || isNaN(basePrice)) {
      basePrice = parseFloat(productData.price) || parseFloat(productData.basePrice) || 19.99;
      
      // Nếu có sản phẩm con, sử dụng giá của sản phẩm con
      if (productData.selectedChild) {
        if (typeof productData.selectedChild.price === 'number' && productData.selectedChild.price > 0) {
          basePrice = productData.selectedChild.price;
        } else if (typeof productData.selectedChild.basePrice === 'number' && productData.selectedChild.basePrice > 0) {
          basePrice = productData.selectedChild.basePrice;
        }
      }
    }
    
    console.log(`Creating order item for ${productData.name} with base price: ${basePrice}`);
    
    // Kiểm tra giá và đảm bảo là số hợp lệ
    if (isNaN(basePrice) || basePrice <= 0) {
      console.warn(`Invalid price for ${productData.name}, using default price`);
      basePrice = 19.99;
    }
    
    // Tạo order item mới
    const newOrderItem = {
      id: Date.now().toString(),
      productId: productData.id,
      product: {
        ...productData,
        price: basePrice
      },
      quantity: currentQuantity,
      customizations: currentCustomizations,
      printPositions: currentPrintPositions
    };
    
    // Thêm design files nếu có
    if (designFiles.length > 0) {
      newOrderItem.designFiles = designFiles;
    }
    
    // Log để debug
    console.log("Adding order item with price:", newOrderItem.product.price, "Product data:", productData);
    console.log("Customizations:", currentCustomizations);
    
    // Thêm vào order items
    setOrderItems(prev => [...prev, newOrderItem]);
    
    // Reset states
    setCurrentProductId('');
    setCurrentProduct(null);
    setCurrentQuantity(1);
    setCurrentPrintPositions({
      basePosition: '',
      additionalPositions: {}
    });
    setCurrentCustomizations([]);
  };

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

  // Kiểm tra xem sản phẩm có hỗ trợ embroidery không
  const canCustomizeEmbroidery = (product) => {
    return product?.productionOptionType === 'embroidery' || 
           product?.customizationOptions?.some(option => option.type === 'embroidery');
  };

  // Kiểm tra xem sản phẩm có hỗ trợ print position không
  const canCustomizePrintPosition = (product) => {
    return product?.productionOptionType === 'print-position' || 
           product?.customizationOptions?.some(option => option.type === 'position');
  };

  // Add current product to the order items
  const handleAddToOrder = () => {
    if (!currentProduct) return;
    
    // Chuẩn bị customizations dựa trên tùy chọn đã chọn
    const customizations = [];
    
    // Kiểm tra loại sản phẩm và tùy chọn sản xuất
    if (currentProduct.productionOptionType === 'print-position') {
      // Thêm các vị trí in đã chọn
      if (currentPrintPositions.selectedPositions && currentPrintPositions.selectedPositions.length > 0) {
        currentPrintPositions.selectedPositions.forEach(posId => {
          // Tìm vị trí in trong sản phẩm
          const position = Array.isArray(currentProduct.printPositions) ? 
            currentProduct.printPositions.find(p => 
              (typeof p === 'string' && p === posId) || 
              (typeof p === 'object' && p.id === posId)
            ) : null;
          
          // Lấy giá và tên vị trí in
          let positionPrice = 0;
          let positionName = posId;
          
          if (position) {
            if (typeof position === 'object') {
              positionPrice = parseFloat(position.price) || 0;
              positionName = position.name || posId;
            }
          }
          
          // Thêm vào customizations
          customizations.push({
            type: 'PRINT',
            position: posId,
            positionName: positionName,
            price: positionPrice,
            designUrl: ''
          });
          
          console.log(`Added print position: ${positionName} with price: ${positionPrice}`);
        });
      } else if (currentPrintPositions.basePosition) {
        // Sử dụng basePosition nếu không có selectedPositions
        customizations.push({
          type: 'PRINT',
          position: currentPrintPositions.basePosition,
          positionName: currentPrintPositions.basePosition.replace('_', ' '),
          price: 0, // Giá cơ bản đã bao gồm vị trí in đầu tiên
          designUrl: ''
        });
        
        console.log(`Added base position: ${currentPrintPositions.basePosition}`);
        
        // Thêm các vị trí bổ sung
        if (currentPrintPositions.additionalPositions) {
          Object.entries(currentPrintPositions.additionalPositions).forEach(([position, selected]) => {
            if (selected && currentProduct.printOptions?.additionalPositions?.[position]) {
              const positionPrice = parseFloat(currentProduct.printOptions.additionalPositions[position].price) || 0;
              
              customizations.push({
                type: 'PRINT',
                position,
                positionName: position.replace('_', ' '),
                price: positionPrice,
                designUrl: ''
              });
              
              console.log(`Added additional position: ${position} with price: ${positionPrice}`);
            }
          });
        }
      }
    } else if (currentProduct.productionOptionType === 'embroidery' && currentCustomizations.length > 0) {
      // Sử dụng customizations hiện có cho embroidery
      currentCustomizations.forEach(customization => {
        const optionPrice = parseFloat(customization.price) || 0;
        
        customizations.push({
          ...customization,
          price: optionPrice
        });
        
        console.log(`Added embroidery option: ${customization.option} with price: ${optionPrice}`);
      });
    }
    
    // Tính toán giá chính xác
    let basePrice = parseFloat(currentProduct.price) || parseFloat(currentProduct.basePrice) || 19.99;
    console.log(`Base price for ${currentProduct.name}: ${basePrice}`);
    
    // Nếu có sản phẩm con được chọn, sử dụng giá của nó
    if (currentProduct.selectedChild) {
      if (typeof currentProduct.selectedChild.price === 'number' && currentProduct.selectedChild.price > 0) {
        basePrice = currentProduct.selectedChild.price;
      } else if (typeof currentProduct.selectedChild.basePrice === 'number' && currentProduct.selectedChild.basePrice > 0) {
        basePrice = currentProduct.selectedChild.basePrice;
      }
      console.log(`Selected child product price: ${basePrice}`);
    }
    
    // Tạo order item mới
    const newOrderItem = {
      id: Date.now().toString(),
      productId: currentProduct.id,
      product: {
        ...currentProduct,
        price: basePrice // Đảm bảo giá cơ bản được lưu chính xác
      },
      quantity: currentQuantity,
      customizations
    };
    
    // Log để debug
    console.log(`Adding ${currentProduct.name} to order with base price ${basePrice} and ${customizations.length} customizations`);
    
    // Thêm vào đơn hàng
    setOrderItems(prev => [...prev, newOrderItem]);
    
    // Reset lựa chọn
    setCurrentProductId('');
    setCurrentProduct(null);
    setCurrentQuantity(1);
    setCurrentPrintPositions({
      basePosition: '',
      additionalPositions: {}
    });
    setCurrentCustomizations([]);
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
  const calculateOrderSummary = () => {
    let subtotal = 0;
    let customizationTotal = 0;
    
    orderItems.forEach(item => {
      // Lấy giá sản phẩm (đảm bảo dùng giá đúng)
      const itemPrice = typeof item.product.price === 'number' ? item.product.price : 
                       (typeof item.product.basePrice === 'number' ? item.product.basePrice : 0);
      
      // Tính tổng phụ = giá sản phẩm * số lượng
      subtotal += itemPrice * item.quantity;
      
      // Tính chi phí tùy chỉnh
      if (item.customizations && item.customizations.length > 0) {
        // Tổng hợp chi phí tùy chỉnh cho mỗi sản phẩm
        const itemCustomizationCost = item.customizations.reduce((sum, c) => {
          // Đảm bảo giá tùy chỉnh là số
          const optionPrice = typeof c.price === 'number' ? c.price : 0;
          return sum + optionPrice;
        }, 0);
        
        // Thêm vào tổng chi phí tùy chỉnh = chi phí tùy chỉnh * số lượng
        customizationTotal += itemCustomizationCost * item.quantity;
      }
    });
    
    // Phí vận chuyển (có thể thay đổi sau)
    const shippingCost = shippingInfo.shippingMethod === 'express' ? 15 : 5;
    
    // Tổng cộng = tổng phụ + chi phí tùy chỉnh + phí vận chuyển
    const total = subtotal + customizationTotal + shippingCost;
    
    return {
      subtotal,
      customizationTotal,
      shippingCost,
      total
    };
  };

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
                          Quantity: {item.quantity} × {formatCurrency(item.product.price || item.product.basePrice || 0)}
                        </Typography>
                        
                        {item.customizations && item.customizations.length > 0 ? (
                          <Typography variant="body2" color="text.secondary">
                            {item.customizations.map(c => 
                              c.type === 'PRINT' 
                                ? `Print: ${c.positionName || c.position}` 
                                : `${c.type}: ${c.option}`
                            ).join(', ')}
                          </Typography>
                        ) : item.printPositions?.basePosition && (
                          <Typography variant="body2" color="text.secondary">
                            Print positions: {item.printPositions.basePosition.replace('_', ' ')}
                            {Object.entries(item.printPositions.additionalPositions || {})
                              .filter(([_, selected]) => selected)
                              .map(([position]) => position.replace('_', ' '))
                              .join(', ')}
                          </Typography>
                        )}
                        
                        {item.product.selectedChild && (
                          <Typography variant="body2" color="text.secondary">
                            Variant: {item.product.color || ''} {item.product.size || ''}
                          </Typography>
                        )}
                        
                        <Typography variant="subtitle2" color="primary">
                          Item Total: {formatCurrency((item.product.price || item.product.basePrice || 0) * item.quantity + 
                            ((item.customizations?.reduce((sum, c) => sum + (c.price || 0), 0) || 0) * item.quantity))}
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
                    {products.map((product) => {
                      // Tính toán giá hiển thị cho sản phẩm
                      const displayPrice = parseFloat(product.price) || parseFloat(product.basePrice) || 19.99;
                      return (
                        <MenuItem key={product.id} value={product.id}>
                          {product.name} - {formatCurrency(displayPrice)}
                        </MenuItem>
                      );
                    })}
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
                              {formatCurrency(parseFloat(currentProduct.price) || parseFloat(currentProduct.basePrice) || 19.99)}
                            </Typography>
                            {currentProduct.selectedChild && (
                              <Typography variant="body2" sx={{ mt: 1 }}>
                                Selected variant: {currentProduct.color || ''} {currentProduct.size || ''}
                              </Typography>
                            )}
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
                  
                  {/* Print Positions Options - chỉ hiển thị nếu sản phẩm hỗ trợ */}
                  {canCustomizePrintPosition(currentProduct) && currentProduct.printPositions && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Print Positions
                      </Typography>
                      
                      <FormGroup>
                        {Array.isArray(currentProduct.printPositions) && 
                          currentProduct.printPositions
                            .filter(position => {
                              // Chỉ hiển thị vị trí hợp lệ
                              if (typeof position === 'string') return true;
                              if (typeof position === 'object' && (position.id || position.name)) return true;
                              return false;
                            })
                            .map((position, index) => {
                              const positionId = typeof position === 'string' ? position : position.id;
                              const positionName = typeof position === 'object' ? 
                                (position.name || positionId) : positionId;
                              const positionPrice = typeof position === 'object' ? 
                                (parseFloat(position.price) || 0) : 0;
                              
                              return (
                                <FormControlLabel
                                  key={positionId || `position-${index}`}
                                  control={
                                    <Checkbox 
                                      checked={currentPrintPositions.selectedPositions?.includes(positionId) || false}
                                      onChange={(e) => {
                                        const isChecked = e.target.checked;
                                        // Cập nhật selectedPositions
                                        setCurrentPrintPositions(prev => {
                                          const newPositions = isChecked 
                                            ? [...(prev.selectedPositions || []), positionId]
                                            : (prev.selectedPositions || []).filter(id => id !== positionId);
                                          
                                          return {
                                            ...prev,
                                            selectedPositions: newPositions
                                          };
                                        });
                                      }}
                                    />
                                  }
                                  label={`${positionName} ${positionPrice > 0 ? `(+${formatCurrency(positionPrice)})` : ''}`}
                                />
                              );
                            })
                        }
                      </FormGroup>
                    </Grid>
                  )}
                  
                  {/* Embroidery Options - chỉ hiển thị nếu sản phẩm hỗ trợ */}
                  {canCustomizeEmbroidery(currentProduct) && currentProduct.optionPrices && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle1" gutterBottom>
                        Embroidery Options
                      </Typography>
                      
                      <FormControl component="fieldset">
                        <RadioGroup
                          value={currentCustomizations.find(c => c.type === 'EMBROIDERY')?.option || ''}
                          onChange={(e) => {
                            const selectedOption = e.target.value;
                            const optionPrice = currentProduct.optionPrices[selectedOption] || 0;
                            
                            // Cập nhật customizations
                            setCurrentCustomizations(prev => {
                              // Lọc bỏ các tùy chọn EMBROIDERY cũ
                              const filtered = prev.filter(c => c.type !== 'EMBROIDERY');
                              
                              // Thêm tùy chọn mới
                              return [
                                ...filtered,
                                {
                                  type: 'EMBROIDERY',
                                  option: selectedOption,
                                  price: parseFloat(optionPrice) || 0,
                                  designUrl: ''
                                }
                              ];
                            });
                          }}
                        >
                          {Object.entries(currentProduct.optionPrices)
                            .filter(([key]) => key.includes('embroidery'))
                            .map(([optionId, price]) => {
                              const optionName = optionId.replace('embroidery-', '').replace('-', ' ');
                              const optionPrice = typeof price === 'number' ? price : 0;
                              
                              return (
                                <FormControlLabel
                                  key={optionId}
                                  value={optionId}
                                  control={<Radio />}
                                  label={`${optionName} ${optionPrice > 0 ? `(+${formatCurrency(optionPrice)})` : ''}`}
                                />
                              );
                            })
                          }
                        </RadioGroup>
                      </FormControl>
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
          <Paper style={{ padding: '1rem', marginTop: '1rem' }}>
            <Typography variant="h6" gutterBottom>Order Summary</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography>Subtotal:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography align="right">{formatCurrency(orderSummary.subtotal)}</Typography>
              </Grid>
              
              {orderSummary.customizationTotal > 0 && (
                <>
                  <Grid item xs={6}>
                    <Typography>Print Customization:</Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography align="right">{formatCurrency(orderSummary.customizationTotal)}</Typography>
                  </Grid>
                </>
              )}
              
              <Grid item xs={6}>
                <Typography>Shipping:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography align="right">{formatCurrency(orderSummary.shippingCost)}</Typography>
              </Grid>
              
              <Grid item xs={6}>
                <Typography variant="h6">Total:</Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="h6" align="right">{formatCurrency(orderSummary.total)}</Typography>
              </Grid>
            </Grid>
            
            {user && (
              <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #eee' }}>
                <Typography variant="body2">
                  Your current balance: {formatCurrency(user.balance || 0)}
                </Typography>
                {hasInsufficientCredit && (
                  <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                    Insufficient balance to place this order. Please add funds to your account.
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
          
          <Button
            variant="contained"
            color="primary"
            size="large"
            fullWidth
            sx={{ mt: 2 }}
            onClick={handleSubmitOrder}
            disabled={loading || orderItems.length === 0 || hasInsufficientCredit}
          >
            {loading ? <CircularProgress size={24} /> : 'Place Order'}
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CreateOrderPage; 