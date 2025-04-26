import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Typography, Box, Grid, Card, CardContent, CardMedia, CardActions,
  Button, LinearProgress, TextField, InputAdornment, 
  FormControl, InputLabel, Select, MenuItem, Pagination,
  Chip, Stack
} from '@mui/material';
import { 
  Search as SearchIcon,
  ShoppingCart as ShoppingCartIcon 
} from '@mui/icons-material';
import { api } from '../helpers';
import { formatCurrency } from '../helpers/formatters';

const ProductsPage = () => {
  // Lưu trữ tất cả sản phẩm lấy từ API
  const [allProducts, setAllProducts] = useState([]);
  // Sản phẩm đã được lọc để hiển thị
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [productsPerPage] = useState(12);
  
  // Filtering
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  // Fetch tất cả sản phẩm khi component được render
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError('');
        
        // Lấy tất cả sản phẩm, không có filter
        console.log('Fetching all products');
        const response = await api.products.getAllProducts();
        
        if (response.data && response.data.success) {
          // Lấy sản phẩm từ response, đảm bảo đúng cấu trúc dữ liệu
          const products = response.data.products || [];
          console.log('Products fetched successfully:', products.length);
          
          // Lưu trữ tất cả sản phẩm
          setAllProducts(products);
          
          // Cũng lấy danh sách danh mục
          await fetchCategories();
        } else {
          console.error('Unexpected API response format:', response);
          setError('Unable to load products. Please try again.');
          setAllProducts([]);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again later.');
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };

    // Separate function to fetch categories
    const fetchCategories = async () => {
      try {
        const categoriesResponse = await api.products.getCategories();
        if (categoriesResponse.data && categoriesResponse.data.success) {
          const categoriesData = categoriesResponse.data.data || [];
          setCategories(categoriesData);
        } else {
          console.warn('Failed to load categories');
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
    };

    fetchProducts();
  }, []);
  
  // Lọc sản phẩm dựa trên search và category
  // Sử dụng useMemo để tối ưu hiệu suất
  useMemo(() => {
    // Thực hiện lọc
    let results = [...allProducts];
    
    // Lọc theo từ khóa tìm kiếm
    if (search) {
      const searchLower = search.toLowerCase();
      results = results.filter(product => 
        (product.name && product.name.toLowerCase().includes(searchLower)) || 
        (product.description && product.description.toLowerCase().includes(searchLower)) ||
        (product.sku && product.sku.toLowerCase().includes(searchLower))
      );
    }
    
    // Lọc theo danh mục
    if (category) {
      results = results.filter(product => product.categoryId === category);
    }
    
    // Cập nhật số trang
    const newTotalPages = Math.ceil(results.length / productsPerPage);
    setTotalPages(newTotalPages);
    
    // Reset về trang 1 nếu filter thay đổi và page hiện tại > totalPages mới
    if (page > newTotalPages && newTotalPages > 0) {
      setPage(1);
    }
    
    // Cập nhật sản phẩm đã lọc
    setFilteredProducts(results);
    
  }, [allProducts, search, category, page, productsPerPage]);
  
  // Lấy sản phẩm cho trang hiện tại
  const paginatedProducts = useMemo(() => {
    const startIndex = (page - 1) * productsPerPage;
    return filteredProducts.slice(startIndex, startIndex + productsPerPage);
  }, [filteredProducts, page, productsPerPage]);

  const handlePageChange = (event, newPage) => {
    setPage(newPage);
    window.scrollTo(0, 0);
  };

  const handleSearchChange = (event) => {
    setSearch(event.target.value);
    setPage(1); // Reset to first page when search changes
  };

  const handleCategoryChange = (event) => {
    setCategory(event.target.value);
    setPage(1); // Reset to first page when category changes
  };

  const handleClearFilters = () => {
    setSearch('');
    setCategory('');
    setPage(1);
  };

  // Helper function to display product options
  const getPrintPositionsText = (product) => {
    if (!product.printOptions) return 'Standard print';
    
    const options = [];
    if (product.printOptions.basePosition) {
      options.push(`Base: ${product.printOptions.basePosition.replace('_', ' ')}`);
    }
    
    if (product.printOptions.additionalPositions) {
      const additionalPositions = Object.keys(product.printOptions.additionalPositions)
        .filter(key => product.printOptions.additionalPositions[key].available)
        .map(key => key.replace('_', ' '));
      
      if (additionalPositions.length > 0) {
        options.push(`+${additionalPositions.join(', ')}`);
      }
    }
    
    return options.join(' ');
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Products
      </Typography>
      
      {/* Filters */}
      <Box sx={{ mb: 4, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={5}>
            <TextField
              fullWidth
              label="Search Products"
              value={search}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={5}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={category}
                label="Category"
                onChange={handleCategoryChange}
              >
                <MenuItem value="">All Categories</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button 
              fullWidth 
              variant="outlined" 
              onClick={handleClearFilters}
              disabled={!search && !category}
            >
              Clear Filters
            </Button>
          </Grid>
        </Grid>
      </Box>
      
      {loading && <LinearProgress sx={{ mb: 2 }} />}
      
      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}
      
      {!loading && paginatedProducts.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No products found
          </Typography>
          <Button
            variant="outlined"
            onClick={handleClearFilters}
            sx={{ mt: 2 }}
          >
            Clear Filters
          </Button>
        </Box>
      )}
      
      {/* Product Grid */}
      <Grid container spacing={3}>
        {paginatedProducts.map((product) => (
          <Grid item key={product.id} xs={12} sm={6} md={4}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: '0 10px 20px rgba(0,0,0,0.1)'
                }
              }}
            >
              <CardMedia
                component="img"
                height="200"
                image={product.images && product.images.length > 0 ? product.images[0] : 'https://via.placeholder.com/300x200?text=No+Image'}
                alt={product.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography gutterBottom variant="h6" component="div" noWrap>
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: '40px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {product.description}
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h6" color="primary">
                    {formatCurrency(product.price)}
                  </Typography>
                  <Chip 
                    label={product.status || 'Active'} 
                    color={product.status === 'active' ? 'success' : 'default'} 
                    size="small" 
                  />
                </Box>
                {product.printOptions && (
                  <Typography variant="body2" color="text.secondary">
                    {getPrintPositionsText(product)}
                  </Typography>
                )}
                {product.stock !== undefined && (
                  <Typography variant="body2" color={product.stock > 0 ? 'success.main' : 'error.main'}>
                    {product.stock > 0 ? `In stock: ${product.stock}` : 'Out of stock'}
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button 
                  size="small" 
                  component={Link} 
                  to={`/products/${product.id}`}
                >
                  View Details
                </Button>
                <Button
                  size="small"
                  component={Link}
                  to={`/create-order?productId=${product.id}`}
                  startIcon={<ShoppingCartIcon />}
                  variant="contained"
                  color="primary"
                  disabled={product.stock <= 0}
                >
                  Order
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary" 
            showFirstButton 
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

export default ProductsPage; 