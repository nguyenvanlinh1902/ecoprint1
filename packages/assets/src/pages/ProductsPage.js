import React, { useState, useEffect } from 'react';
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
import api from '../services/api';
import { formatCurrency } from '../helpers/formatters';

const ProductsPage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Filtering
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Build query parameters
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('limit', 12); // Products per page
        
        if (search) {
          params.append('search', search);
        }
        
        if (category) {
          params.append('category', category);
        }
        
        const response = await api.get(`/api/products?${params.toString()}`);
        setProducts(response.data.data.products || []);
        setTotalPages(response.data.data.totalPages || 1);
        
        // Extract unique categories for filter
        const allProducts = response.data.data.products || [];
        const uniqueCategories = [...new Set(allProducts.map(product => product.category))].filter(Boolean);
        setCategories(uniqueCategories);
      } catch (error) {
        console.error('Error fetching products:', error);
        setError('Failed to load products. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, search, category]);

  const handlePageChange = (event, value) => {
    setPage(value);
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
                  <MenuItem key={cat} value={cat}>{cat}</MenuItem>
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
      
      {!loading && products.length === 0 && (
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
        {products.map((product) => (
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
                image={product.imageUrl || 'https://via.placeholder.com/300x200?text=No+Image'}
                alt={product.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography gutterBottom variant="h6" component="div" noWrap>
                    {product.name}
                  </Typography>
                  <Chip 
                    label={product.category || 'General'} 
                    size="small" 
                    color="primary" 
                    variant="outlined" 
                  />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: '40px' }}>
                  {product.description?.substring(0, 100)}
                  {product.description?.length > 100 ? '...' : ''}
                </Typography>
                <Typography variant="h6" color="primary">
                  {formatCurrency(product.basePrice)}
                </Typography>
              </CardContent>
              <CardActions sx={{ mt: 'auto' }}>
                <Button 
                  size="small" 
                  component={Link} 
                  to={`/products/${product.id}`}
                >
                  View Details
                </Button>
                <Button 
                  size="small" 
                  variant="contained" 
                  component={Link} 
                  to={`/orders/create?product=${product.id}`}
                  startIcon={<ShoppingCartIcon />}
                  sx={{ ml: 'auto' }}
                >
                  Order Now
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination 
            count={totalPages} 
            page={page} 
            onChange={handlePageChange} 
            color="primary" 
          />
        </Box>
      )}
    </Box>
  );
};

export default ProductsPage; 