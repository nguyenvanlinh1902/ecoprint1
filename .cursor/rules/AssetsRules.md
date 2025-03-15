# Frontend Development Rules and Best Practices

Tài liệu này mô tả các quy tắc, mẫu thiết kế và best practices cho việc phát triển frontend trong ứng dụng của chúng ta.

## Tổng quan kiến trúc

Ứng dụng frontend của chúng ta được xây dựng dựa trên ReactJS và sử dụng nhiều công nghệ hiện đại:

```
src/
  ├── main.js             # Điểm khởi đầu cho ứng dụng
  ├── App.js              # Component gốc của ứng dụng
  ├── components/         # Các UI component có thể tái sử dụng
  │   ├── atoms/          # Các component cơ bản (buttons, inputs, etc.)
  │   ├── molecules/      # Các component phức tạp hơn
  │   ├── organisms/      # Các component lớn kết hợp nhiều molecule
  │   └── ...             # Các component chức năng khác
  ├── pages/              # Các trang trong ứng dụng
  ├── layouts/            # Bố cục trang
  ├── routes/             # Định tuyến
  ├── contexts/           # Context API cho state management
  ├── services/           # Gọi API và dịch vụ bên ngoài
  ├── hooks/              # Custom React hooks
  ├── helpers/            # Hàm tiện ích
  ├── config/             # Cấu hình
  ├── const/              # Hằng số
  ├── styles/             # CSS/SCSS
  └── resources/          # Tài nguyên (hình ảnh, icons)
```

## Nguyên tắc cốt lõi

1. **Atomic Design**: Sử dụng phương pháp Atomic Design để tổ chức component
2. **Component-Based**: Tạo các component có thể tái sử dụng và độc lập
3. **Separation of Concerns**: Tách biệt UI và logic
4. **Responsive Design**: Đảm bảo UI hoạt động tốt trên mọi kích thước màn hình

## Công nghệ chính

1. **React**: Framework UI chính
2. **Vite**: Build tool
3. **Material UI**: UI component library
4. **React Router**: Routing
5. **Axios**: HTTP client
6. **SCSS với BEM**: Styling

## Quy tắc về File Extensions

1. **`.js` files**: 
   - Tất cả các file `.js` bắt buộc phải sử dụng ReactJS
   - Các file `.js` dùng cho React components nên sử dụng cú pháp JSX
   - Import React trong mọi file `.js`

```javascript
// example.js - Đúng
import React, { useState } from 'react';

function ExampleComponent() {
  const [state, setState] = useState(null);
  return <div>Example Component</div>;
}

export default ExampleComponent;
```

2. **`.jsx` files**:
   - Khuyến khích sử dụng cho React components để phân biệt rõ ràng
   - Giúp các công cụ IDE hiểu được nội dung file và cung cấp hỗ trợ tốt hơn

3. **Phân định rõ ràng**:
   - `.js`: React components và hook logic
   - `.scss`: Styling với BEM methodology
   - `.test.js`: Test files

## Material UI Guidelines

Material UI là thư viện component chính của chúng ta, cung cấp các component đẹp và đầy đủ chức năng theo Material Design.

### Cấu hình Theme

```javascript
// src/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#9c27b0',
      light: '#ba68c8',
      dark: '#7b1fa2',
      contrastText: '#ffffff',
    },
    error: {
      main: '#d32f2f',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 500,
    },
    // Các cấu hình typography khác
  },
  shape: {
    borderRadius: 4,
  },
  components: {
    // Ghi đè styles cho các component cụ thể
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
        },
      },
    },
  },
});

export default theme;
```

### Sử dụng Material UI với SCSS

Khi sử dụng Material UI, chúng ta vẫn có thể áp dụng custom styles với SCSS BEM:

```jsx
// components/ProductCard/ProductCard.jsx
import React from 'react';
import { Card, CardContent, Typography, Button } from '@mui/material';
import './ProductCard.scss';

export function ProductCard({ product, onAddToCart }) {
  return (
    <Card className="product-card">
      <img 
        src={product.image} 
        alt={product.name} 
        className="product-card__image" 
      />
      <CardContent className="product-card__content">
        <Typography variant="h6" className="product-card__title">
          {product.name}
        </Typography>
        <Typography className="product-card__price">
          ${product.price.toFixed(2)}
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => onAddToCart(product)}
          className="product-card__button"
        >
          Add to Cart
        </Button>
      </CardContent>
    </Card>
  );
}
```

```scss
// components/ProductCard/ProductCard.scss
.product-card {
  // BEM base block
  transition: transform 0.3s ease;
  height: 100%;
  display: flex;
  flex-direction: column;
  
  &:hover {
    transform: translateY(-5px);
    box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  }
  
  // BEM elements
  &__image {
    width: 100%;
    height: 200px;
    object-fit: cover;
    
    // BEM modifier
    &--small {
      height: 120px;
    }
  }
  
  &__content {
    flex-grow: 1;
    display: flex;
    flex-direction: column;
  }
  
  &__title {
    margin-bottom: 8px !important;
    font-weight: 500 !important;
  }
  
  &__price {
    color: #e53935;
    font-weight: 700 !important;
    margin-bottom: 16px !important;
  }
  
  &__button {
    margin-top: auto !important;
  }
  
  // BEM modifiers
  &--featured {
    border: 2px solid #1976d2;
  }
  
  &--out-of-stock {
    opacity: 0.7;
    
    .product-card__button {
      background-color: #9e9e9e !important;
      pointer-events: none;
    }
  }
}
```

## Quy tắc tổ chức component

### Atomic Design

Tuân theo mẫu Atomic Design để tổ chức component:

1. **Atoms**: Component cơ bản nhất (Button, Input, Label)
2. **Molecules**: Kết hợp nhiều atom (FormField, SearchBar)
3. **Organisms**: Kết hợp nhiều molecule (Header, Sidebar, ProductList)
4. **Templates**: Bố cục trang không có dữ liệu thực
5. **Pages**: Trang hoàn chỉnh với dữ liệu

### Component Structure

Mỗi component nên được tổ chức như sau:

```
ComponentName/
  ├── index.js           # Export component
  ├── ComponentName.jsx  # Component chính
  ├── ComponentName.scss # Styles
  └── ComponentName.test.js  # Tests (nếu có)
```

### Component Rules

```jsx
// Sử dụng Functional Components với Hooks
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import './ComponentName.scss';

export function ComponentName({ prop1, prop2, children }) {
  // State và logic
  const [state, setState] = useState(initialState);
  
  // Side effects
  useEffect(() => {
    // Side effects code
    return () => {
      // Cleanup code
    };
  }, [dependencies]);
  
  // Event handlers
  const handleEvent = () => {
    // Handle event
  };
  
  // Render helpers
  const renderSomething = () => {
    return <div>...</div>;
  };
  
  // Main render
  return (
    <div className="component-name">
      {/* JSX content */}
    </div>
  );
}

// Prop types
ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
  children: PropTypes.node
};

// Default props
ComponentName.defaultProps = {
  prop2: 0,
  children: null
};

export default ComponentName;
```

## SCSS Guidelines với BEM Methodology

### BEM Naming Convention

BEM = Block, Element, Modifier. Đây là phương pháp đặt tên CSS giúp code rõ ràng, có tính mô-đun và tránh selector conflicts.

```scss
/* Cú pháp BEM */
.block {}              /* Block: component độc lập */
.block__element {}     /* Element: một phần của block */
.block--modifier {}    /* Modifier: biến thể của block */
.block__element--modifier {} /* Element với một modifier */
```

### Ví dụ BEM trong ứng dụng

```scss
// Navbar component
.navbar {
  display: flex;
  background-color: #f8f9fa;
  padding: 1rem;
  
  // Elements
  &__logo {
    font-size: 1.5rem;
    font-weight: bold;
  }
  
  &__menu {
    display: flex;
    margin-left: auto;
  }
  
  &__item {
    margin-left: 1rem;
    
    // Element modifier
    &--active {
      font-weight: bold;
      color: #007bff;
    }
  }
  
  // Block modifiers
  &--transparent {
    background-color: transparent;
    color: white;
  }
  
  &--fixed {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 1000;
  }
}
```

### Cách tổ chức file SCSS

```
styles/
  ├── _variables.scss    # Biến toàn cục (màu sắc, font, spacing...)
  ├── _mixins.scss       # Mixins chung
  ├── _functions.scss    # SCSS functions
  ├── _reset.scss        # CSS reset/normalize
  ├── _typography.scss   # Định dạng typography
  ├── _utilities.scss    # Utility classes
  ├── _animations.scss   # Animations & transitions
  └── main.scss          # File chính import tất cả
```

### Biến và mixins

```scss
// _variables.scss
$color-primary: #1976d2;
$color-secondary: #9c27b0;
$color-success: #2e7d32;
$color-error: #d32f2f;
$color-warning: #ed6c02;
$color-info: #0288d1;

$spacing-xs: 4px;
$spacing-sm: 8px;
$spacing-md: 16px;
$spacing-lg: 24px;
$spacing-xl: 32px;

$font-size-xs: 0.75rem;
$font-size-sm: 0.875rem;
$font-size-md: 1rem;
$font-size-lg: 1.25rem;
$font-size-xl: 1.5rem;

$breakpoint-xs: 0;
$breakpoint-sm: 600px;
$breakpoint-md: 960px;
$breakpoint-lg: 1280px;
$breakpoint-xl: 1920px;

// _mixins.scss
@mixin flex($direction: row, $justify: flex-start, $align: flex-start, $wrap: nowrap) {
  display: flex;
  flex-direction: $direction;
  justify-content: $justify;
  align-items: $align;
  flex-wrap: $wrap;
}

@mixin respond-to($breakpoint) {
  @if $breakpoint == xs {
    @media (max-width: $breakpoint-sm - 1) { @content; }
  }
  @else if $breakpoint == sm {
    @media (min-width: $breakpoint-sm) and (max-width: $breakpoint-md - 1) { @content; }
  }
  @else if $breakpoint == md {
    @media (min-width: $breakpoint-md) and (max-width: $breakpoint-lg - 1) { @content; }
  }
  @else if $breakpoint == lg {
    @media (min-width: $breakpoint-lg) and (max-width: $breakpoint-xl - 1) { @content; }
  }
  @else if $breakpoint == xl {
    @media (min-width: $breakpoint-xl) { @content; }
  }
}
```

### Tích hợp Material UI với SCSS/BEM

```jsx
// Button.jsx
import React from 'react';
import { Button as MuiButton } from '@mui/material';
import PropTypes from 'prop-types';
import './Button.scss';

export function Button({ children, variant, color, size, className, ...props }) {
  const baseClass = 'app-button';
  const modifierClass = variant ? `${baseClass}--${variant}` : '';
  const colorClass = color ? `${baseClass}--${color}` : '';
  const sizeClass = size ? `${baseClass}--${size}` : '';
  
  const combinedClassName = [
    baseClass,
    modifierClass,
    colorClass,
    sizeClass,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <MuiButton 
      className={combinedClassName}
      variant={variant}
      color={color}
      size={size}
      {...props}
    >
      {children}
    </MuiButton>
  );
}

Button.propTypes = {
  children: PropTypes.node.isRequired,
  variant: PropTypes.oneOf(['text', 'contained', 'outlined']),
  color: PropTypes.oneOf(['primary', 'secondary', 'error', 'info', 'success', 'warning']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  className: PropTypes.string
};

export default Button;
```

```scss
// Button.scss
.app-button {
  border-radius: 4px;
  text-transform: none !important;
  
  // Modifiers for size
  &--small {
    font-size: $font-size-xs;
  }
  
  &--large {
    font-size: $font-size-lg;
  }
  
  // Modifiers for custom styles beyond Material UI
  &--rounded {
    border-radius: 50px !important;
  }
  
  &--icon-right {
    .MuiButton-endIcon {
      margin-left: $spacing-sm;
    }
  }
  
  &--fullwidth {
    width: 100%;
  }
}
```

## API and Data Fetching

### Cấu hình API Client

```javascript
// services/apiClient.js
import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Thêm request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage nếu có
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Thêm response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Xử lý lỗi chung
    if (error.response) {
      // Lỗi phản hồi từ server (status codes không phải 2xx)
      if (error.response.status === 401) {
        // Xử lý lỗi xác thực
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

## API Hooks và tương tác với Firebase Functions

Để tương tác với Firebase Functions, chúng ta sử dụng một bộ hooks API đặc biệt được thiết kế để xử lý các tác vụ CRUD và quản lý trạng thái liên quan. Các hooks này làm việc trực tiếp với Functions backend và cung cấp các tiện ích như hiển thị thông báo toast, xử lý lỗi và quản lý trạng thái loading.

### 1. useFetchApi - Hook đọc dữ liệu (Read)

Hook này được sử dụng để lấy dữ liệu từ API, với hỗ trợ cho việc truy vấn, xử lý dữ liệu và theo dõi trạng thái.

```javascript
import { useFetchApi } from '@assets/hooks/api';

function ProductList() {
  const {
    data: products,
    loading,
    fetchApi,
    count
  } = useFetchApi({
    url: 'products', // Endpoint API
    defaultData: [], // Dữ liệu mặc định
    initLoad: true,  // Tự động gọi API khi component mount
    initQueries: { limit: 10 }, // Các tham số truy vấn ban đầu
    presentData: (data) => data.map(item => ({ ...item, price: item.price.toFixed(2) })), // Xử lý dữ liệu trước khi render
    successCallback: (data) => console.log('Data loaded:', data) // Callback khi load thành công
  });

  const handleRefresh = () => {
    // Gọi lại API với các tham số tùy chỉnh
    fetchApi('products', { category: 'electronics' });
  };

  if (loading && !products.length) {
    return <CircularProgress />;
  }

  return (
    <div>
      <Typography variant="h6">Products ({count})</Typography>
      <Button onClick={handleRefresh}>Refresh</Button>
      
      <List>
        {products.map(product => (
          <ListItem key={product.id}>
            <ListItemText 
              primary={product.name}
              secondary={`$${product.price}`} 
            />
          </ListItem>
        ))}
      </List>
    </div>
  );
}
```

### 2. useCreateApi - Hook tạo dữ liệu (Create)

Hook này được sử dụng để tạo dữ liệu mới thông qua API, với hỗ trợ cho thông báo toast và xử lý trạng thái loading.

```javascript
import { useCreateApi } from '@assets/hooks/api';

function CreateProduct() {
  const [formData, setFormData] = useState({
    name: '',
    price: 0,
    description: ''
  });

  const { creating, handleCreate } = useCreateApi({
    url: 'products', // Endpoint API
    fullResp: false, // Trả về toàn bộ response hay chỉ success flag
    useToast: true,  // Hiển thị thông báo toast
    successMsg: 'Product created successfully', // Thông báo khi thành công
    errorMsg: 'Failed to create product' // Thông báo khi lỗi
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await handleCreate(formData);
    
    if (success) {
      // Reset form sau khi tạo thành công
      setFormData({ name: '', price: 0, description: '' });
      // Các xử lý khác sau khi tạo thành công
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Product Name"
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Price"
        type="number"
        value={formData.price}
        onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Description"
        multiline
        rows={4}
        fullWidth
        margin="normal"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />
      <Button 
        type="submit" 
        variant="contained" 
        color="primary"
        disabled={creating}
      >
        {creating ? 'Creating...' : 'Create Product'}
      </Button>
    </form>
  );
}
```

### 3. useEditApi - Hook cập nhật dữ liệu (Update)

Hook này được sử dụng để cập nhật dữ liệu hiện có thông qua API.

```javascript
import { useEditApi } from '@assets/hooks/api';

function EditProduct({ product, onUpdate }) {
  const [formData, setFormData] = useState({
    id: product.id,
    name: product.name,
    price: product.price,
    description: product.description
  });

  const { editing, handleEdit } = useEditApi({
    url: `products/${product.id}`, // Endpoint API
    fullResp: false, // Trả về toàn bộ response hay chỉ success flag
    useToast: true,  // Hiển thị thông báo toast
    successMsg: 'Product updated successfully', // Thông báo khi thành công
    errorMsg: 'Failed to update product' // Thông báo khi lỗi
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await handleEdit(formData);
    
    if (success && onUpdate) {
      onUpdate(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <TextField
        label="Product Name"
        value={formData.name}
        onChange={(e) => setFormData({...formData, name: e.target.value})}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Price"
        type="number"
        value={formData.price}
        onChange={(e) => setFormData({...formData, price: Number(e.target.value) })}
        fullWidth
        margin="normal"
      />
      <TextField
        label="Description"
        multiline
        rows={4}
        fullWidth
        margin="normal"
        value={formData.description}
        onChange={(e) => setFormData({...formData, description: e.target.value})}
      />
      <Button 
        type="submit" 
        variant="contained" 
        color="primary"
        disabled={editing}
      >
        {editing ? 'Saving...' : 'Save Changes'}
      </Button>
    </form>
  );
}
```

### 4. useDeleteApi - Hook xóa dữ liệu (Delete)

Hook này được sử dụng để xóa dữ liệu thông qua API.

```javascript
import { useDeleteApi } from '@assets/hooks/api';

function DeleteProduct({ product, onDelete }) {
  const { deleting, handleDelete } = useDeleteApi({
    url: `products/${product.id}` // Endpoint API
  });

  const confirmDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${product.name}?`)) {
      const success = await handleDelete();
      
      if (success && onDelete) {
        onDelete(product.id);
      }
    }
  };

  return (
    <Button
      variant="outlined"
      color="error"
      onClick={confirmDelete}
      disabled={deleting}
      startIcon={deleting ? <CircularProgress size={20} /> : <DeleteIcon />}
    >
      {deleting ? 'Deleting...' : 'Delete'}
    </Button>
  );
}
```

### 5. usePaginate - Hook phân trang

Hook này mở rộng từ useFetchApi và thêm tính năng phân trang cho danh sách dữ liệu.

```javascript
import { usePaginate } from '@assets/hooks/api';

function PaginatedProductList() {
  const {
    data: products,
    loading,
    count,
    pageInfo,
    prevPage,
    nextPage,
    onQueryChange
  } = usePaginate({
    url: 'products',
    defaultLimit: 10,
    defaultSort: 'createdAt:desc',
    searchKey: 'name',
    initQueries: { category: 'all' }
  });

  const handleSearch = (e) => {
    onQueryChange('name', e.target.value, true); // Thay đổi query và tự động gọi API
  };

  return (
    <div className="product-list">
      <div className="product-list__header">
        <Typography variant="h6">Products ({count})</Typography>
        <TextField
          label="Search by name"
          variant="outlined"
          size="small"
          onChange={handleSearch}
        />
      </div>

      {loading && !products.length ? (
        <CircularProgress />
      ) : (
        <>
          <div className="product-list__items">
            {products.map(product => (
              <Card key={product.id} className="product-card">
                <CardContent>
                  <Typography variant="h6">{product.name}</Typography>
                  <Typography>${product.price}</Typography>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="product-list__pagination">
            <Button 
              disabled={!pageInfo.hasPrev} 
              onClick={prevPage}
            >
              Previous
            </Button>
            <Typography>Page {pageInfo.currentPage}</Typography>
            <Button 
              disabled={!pageInfo.hasNext} 
              onClick={nextPage}
            >
              Next
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
```

### 6. File index.js để Export các Hooks

```javascript
// src/hooks/api/index.js
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';

export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate
};
```

### 7. Hàm API Helper

Để các hooks hoạt động đúng, bạn cần triển khai hàm `api` helper như sau:

```javascript
// src/helpers/api.js
import axios from 'axios';

/**
 * Universal API call function 
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} - API response
 */
export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Make API call
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Handle API errors
    if (error.response) {
      // Server responded with non-2xx status
      const { data } = error.response;
      return { success: false, error: data.message || 'Server error' };
    } else if (error.request) {
      // Request made but no response received
      return { success: false, error: 'No response from server' };
    } else {
      // Error setting up request
      return { success: false, error: error.message };
    }
  }
}
```

### Quy tắc & mẹo triển khai

1. **Quản lý imports**:
   - Import chỉ những gì cần thiết
   - Sử dụng alias paths (`@assets/...`) để tránh import tương đối phức tạp

2. **Error Handling**:
   - Luôn sử dụng try/catch và xử lý lỗi phù hợp
   - Sử dụng service `handleError` để xử lý lỗi nhất quán

3. **Loading States**:
   - Quản lý trạng thái loading cho mỗi loại thao tác (fetching, creating, updating, deleting)
   - Set loading trước khi gọi API và reset sau khi hoàn thành

4. **Component Unmount**:
   - Trong `useFetchApi`, sử dụng biến `isMounted` để tránh update state sau khi component unmount
   - Có thể sử dụng Axios CancelToken hoặc AbortController để hủy requests chưa hoàn thành

5. **Kiểm soát re-renders**:
   - Sử dụng `useCallback` cho các hàm handler để tránh re-render không cần thiết
   - Cân nhắc sử dụng `React.memo` cho components sử dụng các hooks này

By following these rules and patterns, we ensure our frontend API interactions are maintainable, scalable, and performant.

## Documentation Guidelines

1. **JSDoc**: Document component props và functions
2. **README**: Hướng dẫn sử dụng, cài đặt, và development
3. **Storybook**: Visual documentation của components (nếu sử dụng)

```javascript
/**
 * Button component
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.isLoading - Loading state
 * @param {ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
export function Button({ variant, onClick, isLoading, children }) {
  // Component code
}
```

## Deployment Checklist

1. **Optimize Bundle**: Minify và chunk assets
2. **Environment Variables**: Đảm bảo environment variables được set
3. **Testing**: Chạy test trước khi deploy
4. **Lighthouse**: Kiểm tra performance
5. **Browser Compatibility**: Kiểm tra trên nhiều browser

---

Bằng cách tuân thủ các quy tắc và mẫu thiết kế này, chúng ta đảm bảo ứng dụng frontend có thể bảo trì, mở rộng, và hiệu quả. 

## Hướng dẫn triển khai API Hooks

Phần này hướng dẫn chi tiết cách triển khai các API hooks cho dự án. Các hooks này được thiết kế để tương tác với Firebase Functions và tuân theo cấu trúc dự án.

### Cấu trúc thư mục cho API Hooks

```
src/
  └── hooks/
      └── api/
          ├── index.js          # Export tất cả các hooks
          ├── useFetchApi.js    # Hook đọc dữ liệu
          ├── useCreateApi.js   # Hook tạo dữ liệu
          ├── useEditApi.js     # Hook cập nhật dữ liệu
          ├── useDeleteApi.js   # Hook xóa dữ liệu
          └── usePaginate.js    # Hook phân trang
```

### 1. Triển khai useFetchApi

```javascript
// src/hooks/api/useFetchApi.js
import { useEffect, useState } from 'react';
import { api } from '@assets/helpers';
import queryString from 'query-string';
import { handleError } from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {function} presentData - Function to transform API response data
 * @param {object} initQueries - Initial query parameters
 * @param {function} successCallback - Callback when fetch succeeds
 *
 * @returns {Object} - Hook state and functions
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {},
  successCallback = () => {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);

  /**
   * Fetch data from API
   * @param {string} apiUrl - Optional override for the API URL
   * @param {object} params - Optional query parameters
   * @param {boolean} keepPreviousData - Whether to merge new data with existing data
   */
  async function fetchApi(apiUrl, params = null, keepPreviousData = false) {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Handle pagination info if present
      if (resp.hasOwnProperty('pageInfo')) setPageInfo(resp.pageInfo);
      
      // Handle count if present
      if (resp.hasOwnProperty('count')) setCount(resp.count);
      
      // Handle data if present
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
        
        successCallback(newData);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Initial data fetch on component mount
  useEffect(() => {
    if (initLoad && !fetched) {
      fetchApi(url, initQueries).then(() => {});
    }
  }, []);

  // Helper for form inputs when working with object data
  const handleChangeInput = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    fetchApi,
    data,
    setData,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
}
```

### 2. Triển khai useCreateApi

```javascript
// src/hooks/api/useCreateApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to create data via API
 * @param {string} url - API endpoint
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} setLoading - Whether to manage loading state internally
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useCreateApi({
  url,
  fullResp = false,
  useToast = true,
  setLoading = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * Create data via API
   * @param {object} data - Data to create
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleCreate = async data => {
    try {
      setCreating(true);
      const resp = await api(url, { body: data, method: 'POST' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset loading state if needed
      setLoading && setCreating(false);
    }
  };

  return { creating, handleCreate };
}
```

### 3. Triển khai useEditApi

```javascript
// src/hooks/api/useEditApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to edit data via API
 * @param {string} url - API endpoint
 * @param {boolean|object} defaultState - Initial editing state
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * Edit data via API
   * @param {object} data - Data to edit
   * @param {boolean|string} newEditing - New editing state or key to update
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleEdit = async (data, newEditing = true) => {
    try {
      // Set editing state (boolean or object with key)
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : { ...prev, [newEditing]: true }
      );
      
      // Call API
      const resp = await api(url, { body: data, method: 'PUT' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset editing state
      setEditing(prev =>
        typeof newEditing === 'boolean' ? !newEditing : { ...prev, [newEditing]: false }
      );
    }
  };

  return { editing, handleEdit };
}
```

### 4. Triển khai useDeleteApi

```javascript
// src/hooks/api/useDeleteApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to delete data via API
 * @param {string} url - API endpoint
 * @returns {Object} - Hook state and functions
 */
export default function useDeleteApi({ url }) {
  const { dispatch } = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete data via API
   * @param {object} data - Additional data for delete request (optional)
   * @returns {Promise<boolean>} - Success result
   */
  const handleDelete = async data => {
    try {
      setDeleting(true);
      const resp = await api(url, { body: { data }, method: 'DELETE' });
      
      // Handle success response with toast
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return false;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      // Reset deleting state
      setDeleting(false);
    }
  };

  return { deleting, handleDelete };
}
```

### 5. Triển khai usePaginate

```javascript
// src/hooks/api/usePaginate.js
import { useState } from 'react';
import useFetchApi from './useFetchApi';

/**
 * Hook for paginated data fetching
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {boolean} keepPreviousData - Whether to maintain previous page data
 * @param {function} presentData - Function to transform API response data
 * @param {number} defaultLimit - Default items per page
 * @param {string} defaultSort - Default sort order (field:direction)
 * @param {string} searchKey - Field name for search queries
 * @param {object} initQueries - Initial query parameters
 * @returns {Object} - Hook state and functions
 */
export default function usePaginate({
  url,
  defaultData = [],
  initLoad = true,
  keepPreviousData = false,
  presentData = null,
  defaultLimit = 20,
  defaultSort = 'createdAt:asc',
  searchKey = 'searchKey',
  initQueries = {}
}) {
  const [queries, setQueries] = useState({
    page: 1,
    sort: defaultSort,
    limit: defaultLimit,
    [searchKey]: '',
    ...initQueries
  });

  // Use the useFetchApi hook with our configurations
  const fetchApiHook = useFetchApi({
    url, 
    defaultData, 
    initLoad, 
    presentData, 
    initQueries: queries
  });
  
  const { data, fetchApi } = fetchApiHook;

  /**
   * Fetch API with optional params
   * @param {object} params - Optional parameters to override queries
   * @param {boolean} keepData - Whether to keep previous data
   */
  const handleFetchApi = async (params = null, keepData = false) => {
    await fetchApi(url, { ...queries, ...params }, keepData);
  };

  /**
   * Change single query parameter
   * @param {string} key - Query parameter key
   * @param {any} value - Query parameter value
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueryChange = (key, value, isFetch = false) => {
    setQueries(prev => ({ ...prev, [key]: value }));
    if (isFetch) handleFetchApi({ [key]: value }).then();
  };

  /**
   * Change multiple query parameters
   * @param {object} newQueries - New query parameters
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueriesChange = (newQueries, isFetch = false) => {
    setQueries(prev => ({ ...prev, ...newQueries }));
    if (isFetch) handleFetchApi(newQueries).then();
  };

  /**
   * Handle pagination (previous/next page)
   * @param {string} paginate - Direction ('prev', 'next', or empty for reset)
   */
  const onPaginate = async (paginate = '') => {
    const [before, after, page] = (() => {
      switch (paginate) {
        case 'prev':
          return [data[0].id, '', queries.page - 1];
        case 'next':
          return ['', data[data.length - 1].id, queries.page + 1];
        default:
          return ['', '', 1];
      }
    })();
    
    await handleFetchApi({ page, before, after }, keepPreviousData);
    setQueries(prev => ({ ...prev, page }));
  };

  return {
    prevPage: () => onPaginate('prev'),
    nextPage: () => onPaginate('next'),
    onQueryChange,
    onQueriesChange,
    ...fetchApiHook
  };
}
```

### 6. File index.js để Export các Hooks

```javascript
// src/hooks/api/index.js
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';

export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate
};
```

### 7. Hàm API Helper

Để các hooks hoạt động đúng, bạn cần triển khai hàm `api` helper như sau:

```javascript
// src/helpers/api.js
import axios from 'axios';

/**
 * Universal API call function 
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} - API response
 */
export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Make API call
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Handle API errors
    if (error.response) {
      // Server responded with non-2xx status
      const { data } = error.response;
      return { success: false, error: data.message || 'Server error' };
    } else if (error.request) {
      // Request made but no response received
      return { success: false, error: 'No response from server' };
    } else {
      // Error setting up request
      return { success: false, error: error.message };
    }
  }
}
```

### Quy tắc & mẹo triển khai

1. **Quản lý imports**:
   - Import chỉ những gì cần thiết
   - Sử dụng alias paths (`@assets/...`) để tránh import tương đối phức tạp

2. **Error Handling**:
   - Luôn sử dụng try/catch và xử lý lỗi phù hợp
   - Sử dụng service `handleError` để xử lý lỗi nhất quán

3. **Loading States**:
   - Quản lý trạng thái loading cho mỗi loại thao tác (fetching, creating, updating, deleting)
   - Set loading trước khi gọi API và reset sau khi hoàn thành

4. **Component Unmount**:
   - Trong `useFetchApi`, sử dụng biến `isMounted` để tránh update state sau khi component unmount
   - Có thể sử dụng Axios CancelToken hoặc AbortController để hủy requests chưa hoàn thành

5. **Kiểm soát re-renders**:
   - Sử dụng `useCallback` cho các hàm handler để tránh re-render không cần thiết
   - Cân nhắc sử dụng `React.memo` cho components sử dụng các hooks này

By following these rules and patterns, we ensure our frontend API interactions are maintainable, scalable, and performant.

## Documentation Guidelines

1. **JSDoc**: Document component props và functions
2. **README**: Hướng dẫn sử dụng, cài đặt, và development
3. **Storybook**: Visual documentation của components (nếu sử dụng)

```javascript
/**
 * Button component
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.isLoading - Loading state
 * @param {ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
export function Button({ variant, onClick, isLoading, children }) {
  // Component code
}
```

## Deployment Checklist

1. **Optimize Bundle**: Minify và chunk assets
2. **Environment Variables**: Đảm bảo environment variables được set
3. **Testing**: Chạy test trước khi deploy
4. **Lighthouse**: Kiểm tra performance
5. **Browser Compatibility**: Kiểm tra trên nhiều browser

---

Bằng cách tuân thủ các quy tắc và mẫu thiết kế này, chúng ta đảm bảo ứng dụng frontend có thể bảo trì, mở rộng, và hiệu quả. 

## Hướng dẫn triển khai API Hooks

Phần này hướng dẫn chi tiết cách triển khai các API hooks cho dự án. Các hooks này được thiết kế để tương tác với Firebase Functions và tuân theo cấu trúc dự án.

### Cấu trúc thư mục cho API Hooks

```
src/
  └── hooks/
      └── api/
          ├── index.js          # Export tất cả các hooks
          ├── useFetchApi.js    # Hook đọc dữ liệu
          ├── useCreateApi.js   # Hook tạo dữ liệu
          ├── useEditApi.js     # Hook cập nhật dữ liệu
          ├── useDeleteApi.js   # Hook xóa dữ liệu
          └── usePaginate.js    # Hook phân trang
```

### 1. Triển khai useFetchApi

```javascript
// src/hooks/api/useFetchApi.js
import { useEffect, useState } from 'react';
import { api } from '@assets/helpers';
import queryString from 'query-string';
import { handleError } from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {function} presentData - Function to transform API response data
 * @param {object} initQueries - Initial query parameters
 * @param {function} successCallback - Callback when fetch succeeds
 *
 * @returns {Object} - Hook state and functions
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {},
  successCallback = () => {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);

  /**
   * Fetch data from API
   * @param {string} apiUrl - Optional override for the API URL
   * @param {object} params - Optional query parameters
   * @param {boolean} keepPreviousData - Whether to merge new data with existing data
   */
  async function fetchApi(apiUrl, params = null, keepPreviousData = false) {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Handle pagination info if present
      if (resp.hasOwnProperty('pageInfo')) setPageInfo(resp.pageInfo);
      
      // Handle count if present
      if (resp.hasOwnProperty('count')) setCount(resp.count);
      
      // Handle data if present
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
        
        successCallback(newData);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Initial data fetch on component mount
  useEffect(() => {
    if (initLoad && !fetched) {
      fetchApi(url, initQueries).then(() => {});
    }
  }, []);

  // Helper for form inputs when working with object data
  const handleChangeInput = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    fetchApi,
    data,
    setData,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
}
```

### 2. Triển khai useCreateApi

```javascript
// src/hooks/api/useCreateApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to create data via API
 * @param {string} url - API endpoint
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} setLoading - Whether to manage loading state internally
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useCreateApi({
  url,
  fullResp = false,
  useToast = true,
  setLoading = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * Create data via API
   * @param {object} data - Data to create
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleCreate = async data => {
    try {
      setCreating(true);
      const resp = await api(url, { body: data, method: 'POST' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset loading state if needed
      setLoading && setCreating(false);
    }
  };

  return { creating, handleCreate };
}
```

### 3. Triển khai useEditApi

```javascript
// src/hooks/api/useEditApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to edit data via API
 * @param {string} url - API endpoint
 * @param {boolean|object} defaultState - Initial editing state
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * Edit data via API
   * @param {object} data - Data to edit
   * @param {boolean|string} newEditing - New editing state or key to update
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleEdit = async (data, newEditing = true) => {
    try {
      // Set editing state (boolean or object with key)
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : { ...prev, [newEditing]: true }
      );
      
      // Call API
      const resp = await api(url, { body: data, method: 'PUT' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset editing state
      setEditing(prev =>
        typeof newEditing === 'boolean' ? !newEditing : { ...prev, [newEditing]: false }
      );
    }
  };

  return { editing, handleEdit };
}
```

### 4. Triển khai useDeleteApi

```javascript
// src/hooks/api/useDeleteApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to delete data via API
 * @param {string} url - API endpoint
 * @returns {Object} - Hook state and functions
 */
export default function useDeleteApi({ url }) {
  const { dispatch } = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete data via API
   * @param {object} data - Additional data for delete request (optional)
   * @returns {Promise<boolean>} - Success result
   */
  const handleDelete = async data => {
    try {
      setDeleting(true);
      const resp = await api(url, { body: { data }, method: 'DELETE' });
      
      // Handle success response with toast
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return false;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      // Reset deleting state
      setDeleting(false);
    }
  };

  return { deleting, handleDelete };
}
```

### 5. Triển khai usePaginate

```javascript
// src/hooks/api/usePaginate.js
import { useState } from 'react';
import useFetchApi from './useFetchApi';

/**
 * Hook for paginated data fetching
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {boolean} keepPreviousData - Whether to maintain previous page data
 * @param {function} presentData - Function to transform API response data
 * @param {number} defaultLimit - Default items per page
 * @param {string} defaultSort - Default sort order (field:direction)
 * @param {string} searchKey - Field name for search queries
 * @param {object} initQueries - Initial query parameters
 * @returns {Object} - Hook state and functions
 */
export default function usePaginate({
  url,
  defaultData = [],
  initLoad = true,
  keepPreviousData = false,
  presentData = null,
  defaultLimit = 20,
  defaultSort = 'createdAt:asc',
  searchKey = 'searchKey',
  initQueries = {}
}) {
  const [queries, setQueries] = useState({
    page: 1,
    sort: defaultSort,
    limit: defaultLimit,
    [searchKey]: '',
    ...initQueries
  });

  // Use the useFetchApi hook with our configurations
  const fetchApiHook = useFetchApi({
    url, 
    defaultData, 
    initLoad, 
    presentData, 
    initQueries: queries
  });
  
  const { data, fetchApi } = fetchApiHook;

  /**
   * Fetch API with optional params
   * @param {object} params - Optional parameters to override queries
   * @param {boolean} keepData - Whether to keep previous data
   */
  const handleFetchApi = async (params = null, keepData = false) => {
    await fetchApi(url, { ...queries, ...params }, keepData);
  };

  /**
   * Change single query parameter
   * @param {string} key - Query parameter key
   * @param {any} value - Query parameter value
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueryChange = (key, value, isFetch = false) => {
    setQueries(prev => ({ ...prev, [key]: value }));
    if (isFetch) handleFetchApi({ [key]: value }).then();
  };

  /**
   * Change multiple query parameters
   * @param {object} newQueries - New query parameters
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueriesChange = (newQueries, isFetch = false) => {
    setQueries(prev => ({ ...prev, ...newQueries }));
    if (isFetch) handleFetchApi(newQueries).then();
  };

  /**
   * Handle pagination (previous/next page)
   * @param {string} paginate - Direction ('prev', 'next', or empty for reset)
   */
  const onPaginate = async (paginate = '') => {
    const [before, after, page] = (() => {
      switch (paginate) {
        case 'prev':
          return [data[0].id, '', queries.page - 1];
        case 'next':
          return ['', data[data.length - 1].id, queries.page + 1];
        default:
          return ['', '', 1];
      }
    })();
    
    await handleFetchApi({ page, before, after }, keepPreviousData);
    setQueries(prev => ({ ...prev, page }));
  };

  return {
    prevPage: () => onPaginate('prev'),
    nextPage: () => onPaginate('next'),
    onQueryChange,
    onQueriesChange,
    ...fetchApiHook
  };
}
```

### 6. File index.js để Export các Hooks

```javascript
// src/hooks/api/index.js
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';

export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate
};
```

### 7. Hàm API Helper

Để các hooks hoạt động đúng, bạn cần triển khai hàm `api` helper như sau:

```javascript
// src/helpers/api.js
import axios from 'axios';

/**
 * Universal API call function 
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} - API response
 */
export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Make API call
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Handle API errors
    if (error.response) {
      // Server responded with non-2xx status
      const { data } = error.response;
      return { success: false, error: data.message || 'Server error' };
    } else if (error.request) {
      // Request made but no response received
      return { success: false, error: 'No response from server' };
    } else {
      // Error setting up request
      return { success: false, error: error.message };
    }
  }
}
```

### Quy tắc & mẹo triển khai

1. **Quản lý imports**:
   - Import chỉ những gì cần thiết
   - Sử dụng alias paths (`@assets/...`) để tránh import tương đối phức tạp

2. **Error Handling**:
   - Luôn sử dụng try/catch và xử lý lỗi phù hợp
   - Sử dụng service `handleError` để xử lý lỗi nhất quán

3. **Loading States**:
   - Quản lý trạng thái loading cho mỗi loại thao tác (fetching, creating, updating, deleting)
   - Set loading trước khi gọi API và reset sau khi hoàn thành

4. **Component Unmount**:
   - Trong `useFetchApi`, sử dụng biến `isMounted` để tránh update state sau khi component unmount
   - Có thể sử dụng Axios CancelToken hoặc AbortController để hủy requests chưa hoàn thành

5. **Kiểm soát re-renders**:
   - Sử dụng `useCallback` cho các hàm handler để tránh re-render không cần thiết
   - Cân nhắc sử dụng `React.memo` cho components sử dụng các hooks này

By following these rules and patterns, we ensure our frontend API interactions are maintainable, scalable, and performant.

## Documentation Guidelines

1. **JSDoc**: Document component props và functions
2. **README**: Hướng dẫn sử dụng, cài đặt, và development
3. **Storybook**: Visual documentation của components (nếu sử dụng)

```javascript
/**
 * Button component
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.isLoading - Loading state
 * @param {ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
export function Button({ variant, onClick, isLoading, children }) {
  // Component code
}
```

## Deployment Checklist

1. **Optimize Bundle**: Minify và chunk assets
2. **Environment Variables**: Đảm bảo environment variables được set
3. **Testing**: Chạy test trước khi deploy
4. **Lighthouse**: Kiểm tra performance
5. **Browser Compatibility**: Kiểm tra trên nhiều browser

---

Bằng cách tuân thủ các quy tắc và mẫu thiết kế này, chúng ta đảm bảo ứng dụng frontend có thể bảo trì, mở rộng, và hiệu quả. 

## Hướng dẫn triển khai API Hooks

Phần này hướng dẫn chi tiết cách triển khai các API hooks cho dự án. Các hooks này được thiết kế để tương tác với Firebase Functions và tuân theo cấu trúc dự án.

### Cấu trúc thư mục cho API Hooks

```
src/
  └── hooks/
      └── api/
          ├── index.js          # Export tất cả các hooks
          ├── useFetchApi.js    # Hook đọc dữ liệu
          ├── useCreateApi.js   # Hook tạo dữ liệu
          ├── useEditApi.js     # Hook cập nhật dữ liệu
          ├── useDeleteApi.js   # Hook xóa dữ liệu
          └── usePaginate.js    # Hook phân trang
```

### 1. Triển khai useFetchApi

```javascript
// src/hooks/api/useFetchApi.js
import { useEffect, useState } from 'react';
import { api } from '@assets/helpers';
import queryString from 'query-string';
import { handleError } from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {function} presentData - Function to transform API response data
 * @param {object} initQueries - Initial query parameters
 * @param {function} successCallback - Callback when fetch succeeds
 *
 * @returns {Object} - Hook state and functions
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {},
  successCallback = () => {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);

  /**
   * Fetch data from API
   * @param {string} apiUrl - Optional override for the API URL
   * @param {object} params - Optional query parameters
   * @param {boolean} keepPreviousData - Whether to merge new data with existing data
   */
  async function fetchApi(apiUrl, params = null, keepPreviousData = false) {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Handle pagination info if present
      if (resp.hasOwnProperty('pageInfo')) setPageInfo(resp.pageInfo);
      
      // Handle count if present
      if (resp.hasOwnProperty('count')) setCount(resp.count);
      
      // Handle data if present
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
        
        successCallback(newData);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Initial data fetch on component mount
  useEffect(() => {
    if (initLoad && !fetched) {
      fetchApi(url, initQueries).then(() => {});
    }
  }, []);

  // Helper for form inputs when working with object data
  const handleChangeInput = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    fetchApi,
    data,
    setData,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
}
```

### 2. Triển khai useCreateApi

```javascript
// src/hooks/api/useCreateApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to create data via API
 * @param {string} url - API endpoint
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} setLoading - Whether to manage loading state internally
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useCreateApi({
  url,
  fullResp = false,
  useToast = true,
  setLoading = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * Create data via API
   * @param {object} data - Data to create
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleCreate = async data => {
    try {
      setCreating(true);
      const resp = await api(url, { body: data, method: 'POST' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset loading state if needed
      setLoading && setCreating(false);
    }
  };

  return { creating, handleCreate };
}
```

### 3. Triển khai useEditApi

```javascript
// src/hooks/api/useEditApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to edit data via API
 * @param {string} url - API endpoint
 * @param {boolean|object} defaultState - Initial editing state
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * Edit data via API
   * @param {object} data - Data to edit
   * @param {boolean|string} newEditing - New editing state or key to update
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleEdit = async (data, newEditing = true) => {
    try {
      // Set editing state (boolean or object with key)
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : { ...prev, [newEditing]: true }
      );
      
      // Call API
      const resp = await api(url, { body: data, method: 'PUT' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset editing state
      setEditing(prev =>
        typeof newEditing === 'boolean' ? !newEditing : { ...prev, [newEditing]: false }
      );
    }
  };

  return { editing, handleEdit };
}
```

### 4. Triển khai useDeleteApi

```javascript
// src/hooks/api/useDeleteApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to delete data via API
 * @param {string} url - API endpoint
 * @returns {Object} - Hook state and functions
 */
export default function useDeleteApi({ url }) {
  const { dispatch } = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete data via API
   * @param {object} data - Additional data for delete request (optional)
   * @returns {Promise<boolean>} - Success result
   */
  const handleDelete = async data => {
    try {
      setDeleting(true);
      const resp = await api(url, { body: { data }, method: 'DELETE' });
      
      // Handle success response with toast
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return false;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      // Reset deleting state
      setDeleting(false);
    }
  };

  return { deleting, handleDelete };
}
```

### 5. Triển khai usePaginate

```javascript
// src/hooks/api/usePaginate.js
import { useState } from 'react';
import useFetchApi from './useFetchApi';

/**
 * Hook for paginated data fetching
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {boolean} keepPreviousData - Whether to maintain previous page data
 * @param {function} presentData - Function to transform API response data
 * @param {number} defaultLimit - Default items per page
 * @param {string} defaultSort - Default sort order (field:direction)
 * @param {string} searchKey - Field name for search queries
 * @param {object} initQueries - Initial query parameters
 * @returns {Object} - Hook state and functions
 */
export default function usePaginate({
  url,
  defaultData = [],
  initLoad = true,
  keepPreviousData = false,
  presentData = null,
  defaultLimit = 20,
  defaultSort = 'createdAt:asc',
  searchKey = 'searchKey',
  initQueries = {}
}) {
  const [queries, setQueries] = useState({
    page: 1,
    sort: defaultSort,
    limit: defaultLimit,
    [searchKey]: '',
    ...initQueries
  });

  // Use the useFetchApi hook with our configurations
  const fetchApiHook = useFetchApi({
    url, 
    defaultData, 
    initLoad, 
    presentData, 
    initQueries: queries
  });
  
  const { data, fetchApi } = fetchApiHook;

  /**
   * Fetch API with optional params
   * @param {object} params - Optional parameters to override queries
   * @param {boolean} keepData - Whether to keep previous data
   */
  const handleFetchApi = async (params = null, keepData = false) => {
    await fetchApi(url, { ...queries, ...params }, keepData);
  };

  /**
   * Change single query parameter
   * @param {string} key - Query parameter key
   * @param {any} value - Query parameter value
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueryChange = (key, value, isFetch = false) => {
    setQueries(prev => ({ ...prev, [key]: value }));
    if (isFetch) handleFetchApi({ [key]: value }).then();
  };

  /**
   * Change multiple query parameters
   * @param {object} newQueries - New query parameters
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueriesChange = (newQueries, isFetch = false) => {
    setQueries(prev => ({ ...prev, ...newQueries }));
    if (isFetch) handleFetchApi(newQueries).then();
  };

  /**
   * Handle pagination (previous/next page)
   * @param {string} paginate - Direction ('prev', 'next', or empty for reset)
   */
  const onPaginate = async (paginate = '') => {
    const [before, after, page] = (() => {
      switch (paginate) {
        case 'prev':
          return [data[0].id, '', queries.page - 1];
        case 'next':
          return ['', data[data.length - 1].id, queries.page + 1];
        default:
          return ['', '', 1];
      }
    })();
    
    await handleFetchApi({ page, before, after }, keepPreviousData);
    setQueries(prev => ({ ...prev, page }));
  };

  return {
    prevPage: () => onPaginate('prev'),
    nextPage: () => onPaginate('next'),
    onQueryChange,
    onQueriesChange,
    ...fetchApiHook
  };
}
```

### 6. File index.js để Export các Hooks

```javascript
// src/hooks/api/index.js
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';

export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate
};
```

### 7. Hàm API Helper

Để các hooks hoạt động đúng, bạn cần triển khai hàm `api` helper như sau:

```javascript
// src/helpers/api.js
import axios from 'axios';

/**
 * Universal API call function 
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} - API response
 */
export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Make API call
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Handle API errors
    if (error.response) {
      // Server responded with non-2xx status
      const { data } = error.response;
      return { success: false, error: data.message || 'Server error' };
    } else if (error.request) {
      // Request made but no response received
      return { success: false, error: 'No response from server' };
    } else {
      // Error setting up request
      return { success: false, error: error.message };
    }
  }
}
```

### Quy tắc & mẹo triển khai

1. **Quản lý imports**:
   - Import chỉ những gì cần thiết
   - Sử dụng alias paths (`@assets/...`) để tránh import tương đối phức tạp

2. **Error Handling**:
   - Luôn sử dụng try/catch và xử lý lỗi phù hợp
   - Sử dụng service `handleError` để xử lý lỗi nhất quán

3. **Loading States**:
   - Quản lý trạng thái loading cho mỗi loại thao tác (fetching, creating, updating, deleting)
   - Set loading trước khi gọi API và reset sau khi hoàn thành

4. **Component Unmount**:
   - Trong `useFetchApi`, sử dụng biến `isMounted` để tránh update state sau khi component unmount
   - Có thể sử dụng Axios CancelToken hoặc AbortController để hủy requests chưa hoàn thành

5. **Kiểm soát re-renders**:
   - Sử dụng `useCallback` cho các hàm handler để tránh re-render không cần thiết
   - Cân nhắc sử dụng `React.memo` cho components sử dụng các hooks này

By following these rules and patterns, we ensure our frontend API interactions are maintainable, scalable, and performant.

## Documentation Guidelines

1. **JSDoc**: Document component props và functions
2. **README**: Hướng dẫn sử dụng, cài đặt, và development
3. **Storybook**: Visual documentation của components (nếu sử dụng)

```javascript
/**
 * Button component
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.isLoading - Loading state
 * @param {ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
export function Button({ variant, onClick, isLoading, children }) {
  // Component code
}
```

## Deployment Checklist

1. **Optimize Bundle**: Minify và chunk assets
2. **Environment Variables**: Đảm bảo environment variables được set
3. **Testing**: Chạy test trước khi deploy
4. **Lighthouse**: Kiểm tra performance
5. **Browser Compatibility**: Kiểm tra trên nhiều browser

---

Bằng cách tuân thủ các quy tắc và mẫu thiết kế này, chúng ta đảm bảo ứng dụng frontend có thể bảo trì, mở rộng, và hiệu quả. 

## Hướng dẫn triển khai API Hooks

Phần này hướng dẫn chi tiết cách triển khai các API hooks cho dự án. Các hooks này được thiết kế để tương tác với Firebase Functions và tuân theo cấu trúc dự án.

### Cấu trúc thư mục cho API Hooks

```
src/
  └── hooks/
      └── api/
          ├── index.js          # Export tất cả các hooks
          ├── useFetchApi.js    # Hook đọc dữ liệu
          ├── useCreateApi.js   # Hook tạo dữ liệu
          ├── useEditApi.js     # Hook cập nhật dữ liệu
          ├── useDeleteApi.js   # Hook xóa dữ liệu
          └── usePaginate.js    # Hook phân trang
```

### 1. Triển khai useFetchApi

```javascript
// src/hooks/api/useFetchApi.js
import { useEffect, useState } from 'react';
import { api } from '@assets/helpers';
import queryString from 'query-string';
import { handleError } from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {function} presentData - Function to transform API response data
 * @param {object} initQueries - Initial query parameters
 * @param {function} successCallback - Callback when fetch succeeds
 *
 * @returns {Object} - Hook state and functions
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {},
  successCallback = () => {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);

  /**
   * Fetch data from API
   * @param {string} apiUrl - Optional override for the API URL
   * @param {object} params - Optional query parameters
   * @param {boolean} keepPreviousData - Whether to merge new data with existing data
   */
  async function fetchApi(apiUrl, params = null, keepPreviousData = false) {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Handle pagination info if present
      if (resp.hasOwnProperty('pageInfo')) setPageInfo(resp.pageInfo);
      
      // Handle count if present
      if (resp.hasOwnProperty('count')) setCount(resp.count);
      
      // Handle data if present
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
        
        successCallback(newData);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Initial data fetch on component mount
  useEffect(() => {
    if (initLoad && !fetched) {
      fetchApi(url, initQueries).then(() => {});
    }
  }, []);

  // Helper for form inputs when working with object data
  const handleChangeInput = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    fetchApi,
    data,
    setData,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
}
```

### 2. Triển khai useCreateApi

```javascript
// src/hooks/api/useCreateApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to create data via API
 * @param {string} url - API endpoint
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} setLoading - Whether to manage loading state internally
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useCreateApi({
  url,
  fullResp = false,
  useToast = true,
  setLoading = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * Create data via API
   * @param {object} data - Data to create
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleCreate = async data => {
    try {
      setCreating(true);
      const resp = await api(url, { body: data, method: 'POST' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset loading state if needed
      setLoading && setCreating(false);
    }
  };

  return { creating, handleCreate };
}
```

### 3. Triển khai useEditApi

```javascript
// src/hooks/api/useEditApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to edit data via API
 * @param {string} url - API endpoint
 * @param {boolean|object} defaultState - Initial editing state
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * Edit data via API
   * @param {object} data - Data to edit
   * @param {boolean|string} newEditing - New editing state or key to update
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleEdit = async (data, newEditing = true) => {
    try {
      // Set editing state (boolean or object with key)
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : { ...prev, [newEditing]: true }
      );
      
      // Call API
      const resp = await api(url, { body: data, method: 'PUT' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset editing state
      setEditing(prev =>
        typeof newEditing === 'boolean' ? !newEditing : { ...prev, [newEditing]: false }
      );
    }
  };

  return { editing, handleEdit };
}
```

### 4. Triển khai useDeleteApi

```javascript
// src/hooks/api/useDeleteApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to delete data via API
 * @param {string} url - API endpoint
 * @returns {Object} - Hook state and functions
 */
export default function useDeleteApi({ url }) {
  const { dispatch } = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete data via API
   * @param {object} data - Additional data for delete request (optional)
   * @returns {Promise<boolean>} - Success result
   */
  const handleDelete = async data => {
    try {
      setDeleting(true);
      const resp = await api(url, { body: { data }, method: 'DELETE' });
      
      // Handle success response with toast
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return false;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      // Reset deleting state
      setDeleting(false);
    }
  };

  return { deleting, handleDelete };
}
```

### 5. Triển khai usePaginate

```javascript
// src/hooks/api/usePaginate.js
import { useState } from 'react';
import useFetchApi from './useFetchApi';

/**
 * Hook for paginated data fetching
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {boolean} keepPreviousData - Whether to maintain previous page data
 * @param {function} presentData - Function to transform API response data
 * @param {number} defaultLimit - Default items per page
 * @param {string} defaultSort - Default sort order (field:direction)
 * @param {string} searchKey - Field name for search queries
 * @param {object} initQueries - Initial query parameters
 * @returns {Object} - Hook state and functions
 */
export default function usePaginate({
  url,
  defaultData = [],
  initLoad = true,
  keepPreviousData = false,
  presentData = null,
  defaultLimit = 20,
  defaultSort = 'createdAt:asc',
  searchKey = 'searchKey',
  initQueries = {}
}) {
  const [queries, setQueries] = useState({
    page: 1,
    sort: defaultSort,
    limit: defaultLimit,
    [searchKey]: '',
    ...initQueries
  });

  // Use the useFetchApi hook with our configurations
  const fetchApiHook = useFetchApi({
    url, 
    defaultData, 
    initLoad, 
    presentData, 
    initQueries: queries
  });
  
  const { data, fetchApi } = fetchApiHook;

  /**
   * Fetch API with optional params
   * @param {object} params - Optional parameters to override queries
   * @param {boolean} keepData - Whether to keep previous data
   */
  const handleFetchApi = async (params = null, keepData = false) => {
    await fetchApi(url, { ...queries, ...params }, keepData);
  };

  /**
   * Change single query parameter
   * @param {string} key - Query parameter key
   * @param {any} value - Query parameter value
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueryChange = (key, value, isFetch = false) => {
    setQueries(prev => ({ ...prev, [key]: value }));
    if (isFetch) handleFetchApi({ [key]: value }).then();
  };

  /**
   * Change multiple query parameters
   * @param {object} newQueries - New query parameters
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueriesChange = (newQueries, isFetch = false) => {
    setQueries(prev => ({ ...prev, ...newQueries }));
    if (isFetch) handleFetchApi(newQueries).then();
  };

  /**
   * Handle pagination (previous/next page)
   * @param {string} paginate - Direction ('prev', 'next', or empty for reset)
   */
  const onPaginate = async (paginate = '') => {
    const [before, after, page] = (() => {
      switch (paginate) {
        case 'prev':
          return [data[0].id, '', queries.page - 1];
        case 'next':
          return ['', data[data.length - 1].id, queries.page + 1];
        default:
          return ['', '', 1];
      }
    })();
    
    await handleFetchApi({ page, before, after }, keepPreviousData);
    setQueries(prev => ({ ...prev, page }));
  };

  return {
    prevPage: () => onPaginate('prev'),
    nextPage: () => onPaginate('next'),
    onQueryChange,
    onQueriesChange,
    ...fetchApiHook
  };
}
```

### 6. File index.js để Export các Hooks

```javascript
// src/hooks/api/index.js
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';

export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate
};
```

### 7. Hàm API Helper

Để các hooks hoạt động đúng, bạn cần triển khai hàm `api` helper như sau:

```javascript
// src/helpers/api.js
import axios from 'axios';

/**
 * Universal API call function 
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} - API response
 */
export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Make API call
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Handle API errors
    if (error.response) {
      // Server responded with non-2xx status
      const { data } = error.response;
      return { success: false, error: data.message || 'Server error' };
    } else if (error.request) {
      // Request made but no response received
      return { success: false, error: 'No response from server' };
    } else {
      // Error setting up request
      return { success: false, error: error.message };
    }
  }
}
```

### Quy tắc & mẹo triển khai

1. **Quản lý imports**:
   - Import chỉ những gì cần thiết
   - Sử dụng alias paths (`@assets/...`) để tránh import tương đối phức tạp

2. **Error Handling**:
   - Luôn sử dụng try/catch và xử lý lỗi phù hợp
   - Sử dụng service `handleError` để xử lý lỗi nhất quán

3. **Loading States**:
   - Quản lý trạng thái loading cho mỗi loại thao tác (fetching, creating, updating, deleting)
   - Set loading trước khi gọi API và reset sau khi hoàn thành

4. **Component Unmount**:
   - Trong `useFetchApi`, sử dụng biến `isMounted` để tránh update state sau khi component unmount
   - Có thể sử dụng Axios CancelToken hoặc AbortController để hủy requests chưa hoàn thành

5. **Kiểm soát re-renders**:
   - Sử dụng `useCallback` cho các hàm handler để tránh re-render không cần thiết
   - Cân nhắc sử dụng `React.memo` cho components sử dụng các hooks này

By following these rules and patterns, we ensure our frontend API interactions are maintainable, scalable, and performant.

## Documentation Guidelines

1. **JSDoc**: Document component props và functions
2. **README**: Hướng dẫn sử dụng, cài đặt, và development
3. **Storybook**: Visual documentation của components (nếu sử dụng)

```javascript
/**
 * Button component
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.isLoading - Loading state
 * @param {ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
export function Button({ variant, onClick, isLoading, children }) {
  // Component code
}
```

## Deployment Checklist

1. **Optimize Bundle**: Minify và chunk assets
2. **Environment Variables**: Đảm bảo environment variables được set
3. **Testing**: Chạy test trước khi deploy
4. **Lighthouse**: Kiểm tra performance
5. **Browser Compatibility**: Kiểm tra trên nhiều browser

---

Bằng cách tuân thủ các quy tắc và mẫu thiết kế này, chúng ta đảm bảo ứng dụng frontend có thể bảo trì, mở rộng, và hiệu quả. 

## Hướng dẫn triển khai API Hooks

Phần này hướng dẫn chi tiết cách triển khai các API hooks cho dự án. Các hooks này được thiết kế để tương tác với Firebase Functions và tuân theo cấu trúc dự án.

### Cấu trúc thư mục cho API Hooks

```
src/
  └── hooks/
      └── api/
          ├── index.js          # Export tất cả các hooks
          ├── useFetchApi.js    # Hook đọc dữ liệu
          ├── useCreateApi.js   # Hook tạo dữ liệu
          ├── useEditApi.js     # Hook cập nhật dữ liệu
          ├── useDeleteApi.js   # Hook xóa dữ liệu
          └── usePaginate.js    # Hook phân trang
```

### 1. Triển khai useFetchApi

```javascript
// src/hooks/api/useFetchApi.js
import { useEffect, useState } from 'react';
import { api } from '@assets/helpers';
import queryString from 'query-string';
import { handleError } from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {function} presentData - Function to transform API response data
 * @param {object} initQueries - Initial query parameters
 * @param {function} successCallback - Callback when fetch succeeds
 *
 * @returns {Object} - Hook state and functions
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {},
  successCallback = () => {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);

  /**
   * Fetch data from API
   * @param {string} apiUrl - Optional override for the API URL
   * @param {object} params - Optional query parameters
   * @param {boolean} keepPreviousData - Whether to merge new data with existing data
   */
  async function fetchApi(apiUrl, params = null, keepPreviousData = false) {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Handle pagination info if present
      if (resp.hasOwnProperty('pageInfo')) setPageInfo(resp.pageInfo);
      
      // Handle count if present
      if (resp.hasOwnProperty('count')) setCount(resp.count);
      
      // Handle data if present
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
        
        successCallback(newData);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Initial data fetch on component mount
  useEffect(() => {
    if (initLoad && !fetched) {
      fetchApi(url, initQueries).then(() => {});
    }
  }, []);

  // Helper for form inputs when working with object data
  const handleChangeInput = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    fetchApi,
    data,
    setData,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
}
```

### 2. Triển khai useCreateApi

```javascript
// src/hooks/api/useCreateApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to create data via API
 * @param {string} url - API endpoint
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} setLoading - Whether to manage loading state internally
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useCreateApi({
  url,
  fullResp = false,
  useToast = true,
  setLoading = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * Create data via API
   * @param {object} data - Data to create
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleCreate = async data => {
    try {
      setCreating(true);
      const resp = await api(url, { body: data, method: 'POST' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset loading state if needed
      setLoading && setCreating(false);
    }
  };

  return { creating, handleCreate };
}
```

### 3. Triển khai useEditApi

```javascript
// src/hooks/api/useEditApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to edit data via API
 * @param {string} url - API endpoint
 * @param {boolean|object} defaultState - Initial editing state
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * Edit data via API
   * @param {object} data - Data to edit
   * @param {boolean|string} newEditing - New editing state or key to update
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleEdit = async (data, newEditing = true) => {
    try {
      // Set editing state (boolean or object with key)
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : { ...prev, [newEditing]: true }
      );
      
      // Call API
      const resp = await api(url, { body: data, method: 'PUT' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset editing state
      setEditing(prev =>
        typeof newEditing === 'boolean' ? !newEditing : { ...prev, [newEditing]: false }
      );
    }
  };

  return { editing, handleEdit };
}
```

### 4. Triển khai useDeleteApi

```javascript
// src/hooks/api/useDeleteApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to delete data via API
 * @param {string} url - API endpoint
 * @returns {Object} - Hook state and functions
 */
export default function useDeleteApi({ url }) {
  const { dispatch } = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete data via API
   * @param {object} data - Additional data for delete request (optional)
   * @returns {Promise<boolean>} - Success result
   */
  const handleDelete = async data => {
    try {
      setDeleting(true);
      const resp = await api(url, { body: { data }, method: 'DELETE' });
      
      // Handle success response with toast
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return false;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      // Reset deleting state
      setDeleting(false);
    }
  };

  return { deleting, handleDelete };
}
```

### 5. Triển khai usePaginate

```javascript
// src/hooks/api/usePaginate.js
import { useState } from 'react';
import useFetchApi from './useFetchApi';

/**
 * Hook for paginated data fetching
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {boolean} keepPreviousData - Whether to maintain previous page data
 * @param {function} presentData - Function to transform API response data
 * @param {number} defaultLimit - Default items per page
 * @param {string} defaultSort - Default sort order (field:direction)
 * @param {string} searchKey - Field name for search queries
 * @param {object} initQueries - Initial query parameters
 * @returns {Object} - Hook state and functions
 */
export default function usePaginate({
  url,
  defaultData = [],
  initLoad = true,
  keepPreviousData = false,
  presentData = null,
  defaultLimit = 20,
  defaultSort = 'createdAt:asc',
  searchKey = 'searchKey',
  initQueries = {}
}) {
  const [queries, setQueries] = useState({
    page: 1,
    sort: defaultSort,
    limit: defaultLimit,
    [searchKey]: '',
    ...initQueries
  });

  // Use the useFetchApi hook with our configurations
  const fetchApiHook = useFetchApi({
    url, 
    defaultData, 
    initLoad, 
    presentData, 
    initQueries: queries
  });
  
  const { data, fetchApi } = fetchApiHook;

  /**
   * Fetch API with optional params
   * @param {object} params - Optional parameters to override queries
   * @param {boolean} keepData - Whether to keep previous data
   */
  const handleFetchApi = async (params = null, keepData = false) => {
    await fetchApi(url, { ...queries, ...params }, keepData);
  };

  /**
   * Change single query parameter
   * @param {string} key - Query parameter key
   * @param {any} value - Query parameter value
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueryChange = (key, value, isFetch = false) => {
    setQueries(prev => ({ ...prev, [key]: value }));
    if (isFetch) handleFetchApi({ [key]: value }).then();
  };

  /**
   * Change multiple query parameters
   * @param {object} newQueries - New query parameters
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueriesChange = (newQueries, isFetch = false) => {
    setQueries(prev => ({ ...prev, ...newQueries }));
    if (isFetch) handleFetchApi(newQueries).then();
  };

  /**
   * Handle pagination (previous/next page)
   * @param {string} paginate - Direction ('prev', 'next', or empty for reset)
   */
  const onPaginate = async (paginate = '') => {
    const [before, after, page] = (() => {
      switch (paginate) {
        case 'prev':
          return [data[0].id, '', queries.page - 1];
        case 'next':
          return ['', data[data.length - 1].id, queries.page + 1];
        default:
          return ['', '', 1];
      }
    })();
    
    await handleFetchApi({ page, before, after }, keepPreviousData);
    setQueries(prev => ({ ...prev, page }));
  };

  return {
    prevPage: () => onPaginate('prev'),
    nextPage: () => onPaginate('next'),
    onQueryChange,
    onQueriesChange,
    ...fetchApiHook
  };
}
```

### 6. File index.js để Export các Hooks

```javascript
// src/hooks/api/index.js
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';

export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate
};
```

### 7. Hàm API Helper

Để các hooks hoạt động đúng, bạn cần triển khai hàm `api` helper như sau:

```javascript
// src/helpers/api.js
import axios from 'axios';

/**
 * Universal API call function 
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} - API response
 */
export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Make API call
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Handle API errors
    if (error.response) {
      // Server responded with non-2xx status
      const { data } = error.response;
      return { success: false, error: data.message || 'Server error' };
    } else if (error.request) {
      // Request made but no response received
      return { success: false, error: 'No response from server' };
    } else {
      // Error setting up request
      return { success: false, error: error.message };
    }
  }
}
```

### Quy tắc & mẹo triển khai

1. **Quản lý imports**:
   - Import chỉ những gì cần thiết
   - Sử dụng alias paths (`@assets/...`) để tránh import tương đối phức tạp

2. **Error Handling**:
   - Luôn sử dụng try/catch và xử lý lỗi phù hợp
   - Sử dụng service `handleError` để xử lý lỗi nhất quán

3. **Loading States**:
   - Quản lý trạng thái loading cho mỗi loại thao tác (fetching, creating, updating, deleting)
   - Set loading trước khi gọi API và reset sau khi hoàn thành

4. **Component Unmount**:
   - Trong `useFetchApi`, sử dụng biến `isMounted` để tránh update state sau khi component unmount
   - Có thể sử dụng Axios CancelToken hoặc AbortController để hủy requests chưa hoàn thành

5. **Kiểm soát re-renders**:
   - Sử dụng `useCallback` cho các hàm handler để tránh re-render không cần thiết
   - Cân nhắc sử dụng `React.memo` cho components sử dụng các hooks này

By following these rules and patterns, we ensure our frontend API interactions are maintainable, scalable, and performant.

## Documentation Guidelines

1. **JSDoc**: Document component props và functions
2. **README**: Hướng dẫn sử dụng, cài đặt, và development
3. **Storybook**: Visual documentation của components (nếu sử dụng)

```javascript
/**
 * Button component
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.isLoading - Loading state
 * @param {ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
export function Button({ variant, onClick, isLoading, children }) {
  // Component code
}
```

## Deployment Checklist

1. **Optimize Bundle**: Minify và chunk assets
2. **Environment Variables**: Đảm bảo environment variables được set
3. **Testing**: Chạy test trước khi deploy
4. **Lighthouse**: Kiểm tra performance
5. **Browser Compatibility**: Kiểm tra trên nhiều browser

---

Bằng cách tuân thủ các quy tắc và mẫu thiết kế này, chúng ta đảm bảo ứng dụng frontend có thể bảo trì, mở rộng, và hiệu quả. 

## Hướng dẫn triển khai API Hooks

Phần này hướng dẫn chi tiết cách triển khai các API hooks cho dự án. Các hooks này được thiết kế để tương tác với Firebase Functions và tuân theo cấu trúc dự án.

### Cấu trúc thư mục cho API Hooks

```
src/
  └── hooks/
      └── api/
          ├── index.js          # Export tất cả các hooks
          ├── useFetchApi.js    # Hook đọc dữ liệu
          ├── useCreateApi.js   # Hook tạo dữ liệu
          ├── useEditApi.js     # Hook cập nhật dữ liệu
          ├── useDeleteApi.js   # Hook xóa dữ liệu
          └── usePaginate.js    # Hook phân trang
```

### 1. Triển khai useFetchApi

```javascript
// src/hooks/api/useFetchApi.js
import { useEffect, useState } from 'react';
import { api } from '@assets/helpers';
import queryString from 'query-string';
import { handleError } from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {function} presentData - Function to transform API response data
 * @param {object} initQueries - Initial query parameters
 * @param {function} successCallback - Callback when fetch succeeds
 *
 * @returns {Object} - Hook state and functions
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {},
  successCallback = () => {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);

  /**
   * Fetch data from API
   * @param {string} apiUrl - Optional override for the API URL
   * @param {object} params - Optional query parameters
   * @param {boolean} keepPreviousData - Whether to merge new data with existing data
   */
  async function fetchApi(apiUrl, params = null, keepPreviousData = false) {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Handle pagination info if present
      if (resp.hasOwnProperty('pageInfo')) setPageInfo(resp.pageInfo);
      
      // Handle count if present
      if (resp.hasOwnProperty('count')) setCount(resp.count);
      
      // Handle data if present
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
        
        successCallback(newData);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Initial data fetch on component mount
  useEffect(() => {
    if (initLoad && !fetched) {
      fetchApi(url, initQueries).then(() => {});
    }
  }, []);

  // Helper for form inputs when working with object data
  const handleChangeInput = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    fetchApi,
    data,
    setData,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
}
```

### 2. Triển khai useCreateApi

```javascript
// src/hooks/api/useCreateApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to create data via API
 * @param {string} url - API endpoint
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} setLoading - Whether to manage loading state internally
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useCreateApi({
  url,
  fullResp = false,
  useToast = true,
  setLoading = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * Create data via API
   * @param {object} data - Data to create
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleCreate = async data => {
    try {
      setCreating(true);
      const resp = await api(url, { body: data, method: 'POST' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset loading state if needed
      setLoading && setCreating(false);
    }
  };

  return { creating, handleCreate };
}
```

### 3. Triển khai useEditApi

```javascript
// src/hooks/api/useEditApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to edit data via API
 * @param {string} url - API endpoint
 * @param {boolean|object} defaultState - Initial editing state
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * Edit data via API
   * @param {object} data - Data to edit
   * @param {boolean|string} newEditing - New editing state or key to update
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleEdit = async (data, newEditing = true) => {
    try {
      // Set editing state (boolean or object with key)
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : { ...prev, [newEditing]: true }
      );
      
      // Call API
      const resp = await api(url, { body: data, method: 'PUT' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset editing state
      setEditing(prev =>
        typeof newEditing === 'boolean' ? !newEditing : { ...prev, [newEditing]: false }
      );
    }
  };

  return { editing, handleEdit };
}
```

### 4. Triển khai useDeleteApi

```javascript
// src/hooks/api/useDeleteApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to delete data via API
 * @param {string} url - API endpoint
 * @returns {Object} - Hook state and functions
 */
export default function useDeleteApi({ url }) {
  const { dispatch } = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete data via API
   * @param {object} data - Additional data for delete request (optional)
   * @returns {Promise<boolean>} - Success result
   */
  const handleDelete = async data => {
    try {
      setDeleting(true);
      const resp = await api(url, { body: { data }, method: 'DELETE' });
      
      // Handle success response with toast
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return false;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      // Reset deleting state
      setDeleting(false);
    }
  };

  return { deleting, handleDelete };
}
```

### 5. Triển khai usePaginate

```javascript
// src/hooks/api/usePaginate.js
import { useState } from 'react';
import useFetchApi from './useFetchApi';

/**
 * Hook for paginated data fetching
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {boolean} keepPreviousData - Whether to maintain previous page data
 * @param {function} presentData - Function to transform API response data
 * @param {number} defaultLimit - Default items per page
 * @param {string} defaultSort - Default sort order (field:direction)
 * @param {string} searchKey - Field name for search queries
 * @param {object} initQueries - Initial query parameters
 * @returns {Object} - Hook state and functions
 */
export default function usePaginate({
  url,
  defaultData = [],
  initLoad = true,
  keepPreviousData = false,
  presentData = null,
  defaultLimit = 20,
  defaultSort = 'createdAt:asc',
  searchKey = 'searchKey',
  initQueries = {}
}) {
  const [queries, setQueries] = useState({
    page: 1,
    sort: defaultSort,
    limit: defaultLimit,
    [searchKey]: '',
    ...initQueries
  });

  // Use the useFetchApi hook with our configurations
  const fetchApiHook = useFetchApi({
    url, 
    defaultData, 
    initLoad, 
    presentData, 
    initQueries: queries
  });
  
  const { data, fetchApi } = fetchApiHook;

  /**
   * Fetch API with optional params
   * @param {object} params - Optional parameters to override queries
   * @param {boolean} keepData - Whether to keep previous data
   */
  const handleFetchApi = async (params = null, keepData = false) => {
    await fetchApi(url, { ...queries, ...params }, keepData);
  };

  /**
   * Change single query parameter
   * @param {string} key - Query parameter key
   * @param {any} value - Query parameter value
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueryChange = (key, value, isFetch = false) => {
    setQueries(prev => ({ ...prev, [key]: value }));
    if (isFetch) handleFetchApi({ [key]: value }).then();
  };

  /**
   * Change multiple query parameters
   * @param {object} newQueries - New query parameters
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueriesChange = (newQueries, isFetch = false) => {
    setQueries(prev => ({ ...prev, ...newQueries }));
    if (isFetch) handleFetchApi(newQueries).then();
  };

  /**
   * Handle pagination (previous/next page)
   * @param {string} paginate - Direction ('prev', 'next', or empty for reset)
   */
  const onPaginate = async (paginate = '') => {
    const [before, after, page] = (() => {
      switch (paginate) {
        case 'prev':
          return [data[0].id, '', queries.page - 1];
        case 'next':
          return ['', data[data.length - 1].id, queries.page + 1];
        default:
          return ['', '', 1];
      }
    })();
    
    await handleFetchApi({ page, before, after }, keepPreviousData);
    setQueries(prev => ({ ...prev, page }));
  };

  return {
    prevPage: () => onPaginate('prev'),
    nextPage: () => onPaginate('next'),
    onQueryChange,
    onQueriesChange,
    ...fetchApiHook
  };
}
```

### 6. File index.js để Export các Hooks

```javascript
// src/hooks/api/index.js
import useFetchApi from './useFetchApi';
import useCreateApi from './useCreateApi';
import useEditApi from './useEditApi';
import useDeleteApi from './useDeleteApi';
import usePaginate from './usePaginate';

export {
  useFetchApi,
  useCreateApi,
  useEditApi,
  useDeleteApi,
  usePaginate
};
```

### 7. Hàm API Helper

Để các hooks hoạt động đúng, bạn cần triển khai hàm `api` helper như sau:

```javascript
// src/helpers/api.js
import axios from 'axios';

/**
 * Universal API call function 
 * @param {string} url - API endpoint
 * @param {object} options - Request options
 * @returns {Promise<object>} - API response
 */
export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    // Get auth token if available
    const token = localStorage.getItem('authToken');
    
    // Set default headers
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    // Make API call
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Handle API errors
    if (error.response) {
      // Server responded with non-2xx status
      const { data } = error.response;
      return { success: false, error: data.message || 'Server error' };
    } else if (error.request) {
      // Request made but no response received
      return { success: false, error: 'No response from server' };
    } else {
      // Error setting up request
      return { success: false, error: error.message };
    }
  }
}
```

### Quy tắc & mẹo triển khai

1. **Quản lý imports**:
   - Import chỉ những gì cần thiết
   - Sử dụng alias paths (`@assets/...`) để tránh import tương đối phức tạp

2. **Error Handling**:
   - Luôn sử dụng try/catch và xử lý lỗi phù hợp
   - Sử dụng service `handleError` để xử lý lỗi nhất quán

3. **Loading States**:
   - Quản lý trạng thái loading cho mỗi loại thao tác (fetching, creating, updating, deleting)
   - Set loading trước khi gọi API và reset sau khi hoàn thành

4. **Component Unmount**:
   - Trong `useFetchApi`, sử dụng biến `isMounted` để tránh update state sau khi component unmount
   - Có thể sử dụng Axios CancelToken hoặc AbortController để hủy requests chưa hoàn thành

5. **Kiểm soát re-renders**:
   - Sử dụng `useCallback` cho các hàm handler để tránh re-render không cần thiết
   - Cân nhắc sử dụng `React.memo` cho components sử dụng các hooks này

By following these rules and patterns, we ensure our frontend API interactions are maintainable, scalable, and performant.

## Documentation Guidelines

1. **JSDoc**: Document component props và functions
2. **README**: Hướng dẫn sử dụng, cài đặt, và development
3. **Storybook**: Visual documentation của components (nếu sử dụng)

```javascript
/**
 * Button component
 * @param {object} props - Component props
 * @param {string} props.variant - Button variant (contained, outlined, text)
 * @param {function} props.onClick - Click handler
 * @param {boolean} props.isLoading - Loading state
 * @param {ReactNode} props.children - Button content
 * @returns {JSX.Element}
 */
export function Button({ variant, onClick, isLoading, children }) {
  // Component code
}
```

## Deployment Checklist

1. **Optimize Bundle**: Minify và chunk assets
2. **Environment Variables**: Đảm bảo environment variables được set
3. **Testing**: Chạy test trước khi deploy
4. **Lighthouse**: Kiểm tra performance
5. **Browser Compatibility**: Kiểm tra trên nhiều browser

---

Bằng cách tuân thủ các quy tắc và mẫu thiết kế này, chúng ta đảm bảo ứng dụng frontend có thể bảo trì, mở rộng, và hiệu quả. 

## Hướng dẫn triển khai API Hooks

Phần này hướng dẫn chi tiết cách triển khai các API hooks cho dự án. Các hooks này được thiết kế để tương tác với Firebase Functions và tuân theo cấu trúc dự án.

### Cấu trúc thư mục cho API Hooks

```
src/
  └── hooks/
      └── api/
          ├── index.js          # Export tất cả các hooks
          ├── useFetchApi.js    # Hook đọc dữ liệu
          ├── useCreateApi.js   # Hook tạo dữ liệu
          ├── useEditApi.js     # Hook cập nhật dữ liệu
          ├── useDeleteApi.js   # Hook xóa dữ liệu
          └── usePaginate.js    # Hook phân trang
```

### 1. Triển khai useFetchApi

```javascript
// src/hooks/api/useFetchApi.js
import { useEffect, useState } from 'react';
import { api } from '@assets/helpers';
import queryString from 'query-string';
import { handleError } from '@assets/services/errorService';

/**
 * useFetchApi hook for fetch data from api with url
 *
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {function} presentData - Function to transform API response data
 * @param {object} initQueries - Initial query parameters
 * @param {function} successCallback - Callback when fetch succeeds
 *
 * @returns {Object} - Hook state and functions
 */
export default function useFetchApi({
  url,
  defaultData = [],
  initLoad = true,
  presentData = null,
  initQueries = {},
  successCallback = () => {}
}) {
  const [loading, setLoading] = useState(initLoad);
  const [fetched, setFetched] = useState(false);
  const [data, setData] = useState(defaultData);
  const [pageInfo, setPageInfo] = useState({});
  const [count, setCount] = useState(0);

  /**
   * Fetch data from API
   * @param {string} apiUrl - Optional override for the API URL
   * @param {object} params - Optional query parameters
   * @param {boolean} keepPreviousData - Whether to merge new data with existing data
   */
  async function fetchApi(apiUrl, params = null, keepPreviousData = false) {
    try {
      setLoading(true);
      const path = apiUrl || url;
      const separateChar = path.includes('?') ? '&' : '?';
      const query = params ? separateChar + queryString.stringify(params) : '';
      const resp = await api(path + query);
      
      // Handle pagination info if present
      if (resp.hasOwnProperty('pageInfo')) setPageInfo(resp.pageInfo);
      
      // Handle count if present
      if (resp.hasOwnProperty('count')) setCount(resp.count);
      
      // Handle data if present
      if (resp.hasOwnProperty('data')) {
        let newData = presentData ? presentData(resp.data) : resp.data;
        if (!Array.isArray(newData)) {
          newData = {...defaultData, ...newData};
        }
        
        setData(prev => {
          if (!keepPreviousData) {
            return newData;
          }
          return Array.isArray(newData) ? [...prev, ...newData] : {...prev, ...newData};
        });
        
        successCallback(newData);
      }
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setFetched(true);
    }
  }

  // Initial data fetch on component mount
  useEffect(() => {
    if (initLoad && !fetched) {
      fetchApi(url, initQueries).then(() => {});
    }
  }, []);

  // Helper for form inputs when working with object data
  const handleChangeInput = (key, value) => {
    setData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return {
    fetchApi,
    data,
    setData,
    pageInfo,
    count,
    setCount,
    loading,
    fetched,
    setFetched,
    handleChangeInput
  };
}
```

### 2. Triển khai useCreateApi

```javascript
// src/hooks/api/useCreateApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to create data via API
 * @param {string} url - API endpoint
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} setLoading - Whether to manage loading state internally
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useCreateApi({
  url,
  fullResp = false,
  useToast = true,
  setLoading = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [creating, setCreating] = useState(false);

  /**
   * Create data via API
   * @param {object} data - Data to create
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleCreate = async data => {
    try {
      setCreating(true);
      const resp = await api(url, { body: data, method: 'POST' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset loading state if needed
      setLoading && setCreating(false);
    }
  };

  return { creating, handleCreate };
}
```

### 3. Triển khai useEditApi

```javascript
// src/hooks/api/useEditApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to edit data via API
 * @param {string} url - API endpoint
 * @param {boolean|object} defaultState - Initial editing state
 * @param {boolean} fullResp - Whether to return full response or just success flag
 * @param {boolean} useToast - Whether to show toast messages
 * @param {string} successMsg - Success message for toast
 * @param {string} errorMsg - Error message for toast
 * @returns {Object} - Hook state and functions
 */
export default function useEditApi({
  url,
  defaultState = false,
  fullResp = false,
  useToast = true,
  successMsg = 'Saved successfully',
  errorMsg = 'Failed to save'
}) {
  const { dispatch } = useStore();
  const [editing, setEditing] = useState(defaultState);

  /**
   * Edit data via API
   * @param {object} data - Data to edit
   * @param {boolean|string} newEditing - New editing state or key to update
   * @returns {Promise<object|boolean>} - Success result or full response
   */
  const handleEdit = async (data, newEditing = true) => {
    try {
      // Set editing state (boolean or object with key)
      setEditing(prev =>
        typeof newEditing === 'boolean' ? newEditing : { ...prev, [newEditing]: true }
      );
      
      // Call API
      const resp = await api(url, { body: data, method: 'PUT' });
      
      // Handle success response with toast
      if (resp.success && useToast) {
        setToast(dispatch, resp.message || successMsg);
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return fullResp ? resp : resp.success;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, errorMsg, true);
      return fullResp ? { success: false, error: e.message } : false;
    } finally {
      // Reset editing state
      setEditing(prev =>
        typeof newEditing === 'boolean' ? !newEditing : { ...prev, [newEditing]: false }
      );
    }
  };

  return { editing, handleEdit };
}
```

### 4. Triển khai useDeleteApi

```javascript
// src/hooks/api/useDeleteApi.js
import { useState } from 'react';
import { api } from '@assets/helpers';
import { useStore } from '@assets/reducers/storeReducer';
import { setToast } from '@assets/actions/storeActions';
import { handleError } from '@assets/services/errorService';

/**
 * Hook to delete data via API
 * @param {string} url - API endpoint
 * @returns {Object} - Hook state and functions
 */
export default function useDeleteApi({ url }) {
  const { dispatch } = useStore();
  const [deleting, setDeleting] = useState(false);

  /**
   * Delete data via API
   * @param {object} data - Additional data for delete request (optional)
   * @returns {Promise<boolean>} - Success result
   */
  const handleDelete = async data => {
    try {
      setDeleting(true);
      const resp = await api(url, { body: { data }, method: 'DELETE' });
      
      // Handle success response with toast
      if (resp.success) {
        setToast(dispatch, resp.message || 'Deleted successfully');
        return true;
      }
      
      // Handle error in response
      if (resp.error) {
        setToast(dispatch, resp.error, true);
      }
      
      return false;
    } catch (e) {
      // Handle exception
      handleError(e);
      setToast(dispatch, 'Failed to delete', true);
      return false;
    } finally {
      // Reset deleting state
      setDeleting(false);
    }
  };

  return { deleting, handleDelete };
}
```

### 5. Triển khai usePaginate

```javascript
// src/hooks/api/usePaginate.js
import { useState } from 'react';
import useFetchApi from './useFetchApi';

/**
 * Hook for paginated data fetching
 * @param {string} url - API endpoint
 * @param {any} defaultData - Default data when API hasn't responded yet
 * @param {boolean} initLoad - Whether to load data on component mount
 * @param {boolean} keepPreviousData - Whether to maintain previous page data
 * @param {function} presentData - Function to transform API response data
 * @param {number} defaultLimit - Default items per page
 * @param {string} defaultSort - Default sort order (field:direction)
 * @param {string} searchKey - Field name for search queries
 * @param {object} initQueries - Initial query parameters
 * @returns {Object} - Hook state and functions
 */
export default function usePaginate({
  url,
  defaultData = [],
  initLoad = true,
  keepPreviousData = false,
  presentData = null,
  defaultLimit = 20,
  defaultSort = 'createdAt:asc',
  searchKey = 'searchKey',
  initQueries = {}
}) {
  const [queries, setQueries] = useState({
    page: 1,
    sort: defaultSort,
    limit: defaultLimit,
    [searchKey]: '',
    ...initQueries
  });

  // Use the useFetchApi hook with our configurations
  const fetchApiHook = useFetchApi({
    url, 
    defaultData, 
    initLoad, 
    presentData, 
    initQueries: queries
  });
  
  const { data, fetchApi } = fetchApiHook;

  /**
   * Fetch API with optional params
   * @param {object} params - Optional parameters to override queries
   * @param {boolean} keepData - Whether to keep previous data
   */
  const handleFetchApi = async (params = null, keepData = false) => {
    await fetchApi(url, { ...queries, ...params }, keepData);
  };

  /**
   * Change single query parameter
   * @param {string} key - Query parameter key
   * @param {any} value - Query parameter value
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueryChange = (key, value, isFetch = false) => {
    setQueries(prev => ({ ...prev, [key]: value }));
    if (isFetch) handleFetchApi({ [key]: value }).then();
  };

  /**
   * Change multiple query parameters
   * @param {object} newQueries - New query parameters
   * @param {boolean} isFetch - Whether to fetch data immediately
   */
  const onQueriesChange = (newQueries, isFetch = false) => {
    setQueries(prev => ({ ...prev, ...newQueries }));
    if (isFetch) handleFetchApi(newQueries).then();
  };

  /**
   * Handle pagination (previous/next page)
   * @param {string} paginate - Direction ('prev', 'next', or empty for reset)
   */
  const onPaginate = async (paginate = '') => {
    const [before, after, page] = (() => {
      switch (paginate) {
        case 'prev':
          return [data[0].id, '', queries.page - 1];
        case 'next':
          return ['', data[data.length - 1].id, queries.page + 1];
        default:
          return ['', '', 1];
      }
    })();
    
    await handleFetchApi({ page, before, after }, keepPreviousData);
    setQueries(prev => ({ ...prev, page }));
  };

  return {