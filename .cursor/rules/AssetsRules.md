# Frontend Development Rules and Best Practices

This document outlines the rules, patterns, and best practices for frontend development in our application.

## Architecture Overview

Our frontend application follows the Atomic Design methodology with a clean, structured architecture:

```
src/
  ├── main.js             # Entry point for the application
  ├── App.js              # Root component
  ├── components/         # Reusable UI components
  │   ├── atoms/          # Basic components (Button, Input, Label)
  │   ├── molecules/      # More complex components (FormField, SearchBar)
  │   ├── organisms/      # Large combined components (Header, Sidebar, ProductList)
  │   └── ...             # Other functional components
  ├── pages/              # Application pages
  ├── layouts/            # Page layouts
  ├── routes/             # Routing
  ├── contexts/           # Context API for state management
  ├── services/           # API calls and external services
  ├── hooks/              # Custom React hooks
  ├── helpers/            # Utility functions
  ├── config/             # Configuration
  ├── const/              # Constants
  ├── styles/             # CSS/SCSS
  ├── resources/          # Resources (images, icons)
  └── loadable/           # Code splitting components
```

## Core Principles

1. **Atomic Design**: Use Atomic Design methodology for component organization
2. **Component-Based**: Create reusable and independent components
3. **Separation of Concerns**: Separate UI and logic
4. **Responsive Design**: Ensure UI works well on all screen sizes

## Technologies

1. **React**: Main UI framework
2. **Vite**: Build tool for fast development
3. **Material UI**: UI component library following Material Design principles
4. **React Router**: Handling application routing
5. **Axios**: HTTP client for API requests
6. **SCSS with BEM**: Styling following BEM methodology

## File Extensions and Naming Rules

### Required Extensions

1. **Component Files**:
   - `.js`: Use for all React components, utility functions, and configurations
   - Follow PascalCase for component names (e.g., `Button.js`, `ProductCard.js`)

2. **Style Files**:
   - `.scss`: Use for all styling files
   - Match component names (e.g., `Button.scss` for `Button.js`)
   - Follow BEM methodology for class names

3. **Test Files**:
   - `.test.js`: For unit and integration tests
   - Name should match the file being tested (e.g., `Button.test.js`)

4. **Type Definition Files**:
   - Avoid using TypeScript definitions
   - Use JSDoc comments for documenting types

5. **Asset Files**:
   - `.svg`: Vector graphics (preferred format)
   - `.png`: Raster images when necessary
   - `.jpg`: Photos and complex images
   - `.webp`: Optimized web images (preferred for photos)

6. **Configuration Files**:
   - `.json`: For static configuration
   - `.js`: For dynamic configuration

## Component Structure Rules

### Folder Organization

Each component should be organized in its own folder:

```
ComponentName/
  ├── index.js           # Export component
  ├── ComponentName.js   # Component implementation
  ├── ComponentName.scss # Component styles
  ├── ComponentName.test.js # Component tests
  └── components/        # Sub-components (if needed)
```

### Component Implementation

```js
// Button.js - Example component structure
import React from 'react';
import PropTypes from 'prop-types';
import './Button.scss';

export function Button({ variant, onClick, isLoading, children, className, ...rest }) {
  // BEM class naming
  const baseClass = 'button';
  const modifierClass = variant ? `${baseClass}--${variant}` : '';
  const loadingClass = isLoading ? `${baseClass}--loading` : '';
  
  const combinedClassName = [
    baseClass,
    modifierClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');
  
  return (
    <button 
      className={combinedClassName}
      onClick={onClick}
      disabled={isLoading}
      {...rest}
    >
      {isLoading ? <span className="button__spinner" /> : null}
      <span className="button__content">{children}</span>
    </button>
  );
}

// Define prop types
Button.propTypes = {
  variant: PropTypes.oneOf(['contained', 'outlined', 'text']),
  onClick: PropTypes.func,
  isLoading: PropTypes.bool,
  children: PropTypes.node.isRequired,
  className: PropTypes.string
};

export default Button;
```

## Styling Rules with BEM

### BEM Naming Convention

```scss
// Button.scss - Example BEM structure
.button {
  // Base styles for the button
  padding: 8px 16px;
  
  // Elements (use &__element-name)
  &__content {
    display: inline-block;
  }
  
  &__spinner {
    display: inline-block;
    width: 16px;
    height: 16px;
  }
  
  // Modifiers (use &--modifier-name)
  &--contained {
    background-color: #1976d2;
    color: white;
  }
  
  &--outlined {
    background-color: transparent;
    color: #1976d2;
    border: 1px solid currentColor;
  }
  
  // State modifiers
  &--loading {
    opacity: 0.7;
    cursor: not-allowed;
  }
}
```

## Material UI Integration

### Theme Configuration

```javascript
// src/theme.js - Example theme configuration
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#9c27b0',
    }
  },
  // Other theme configurations
});

export default theme;
```

## API Hook Rules

### Base API Call Pattern

```javascript
// services/api.js - Base API utilities
import axios from 'axios';

export async function api(url, options = {}) {
  const { body, method = 'GET', headers = {}, ...rest } = options;
  
  try {
    const token = localStorage.getItem('authToken');
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
    
    const response = await axios({
      url: `/api/${url}`,
      method,
      headers: { ...defaultHeaders, ...headers },
      data: body,
      ...rest
    });
    
    return response.data;
  } catch (error) {
    // Error handling
    return { success: false, error: error.message };
  }
}
```

### Custom API Hooks

```javascript
// hooks/api/useFetchApi.js - Example of a fetch hook
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/services/api';

export default function useFetchApi({
  url,
  defaultData = null,
  initLoad = false,
  initQueries = {},
  presentData = data => data,
  successCallback = () => {}
}) {
  const [data, setData] = useState(defaultData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  
  const fetchApi = useCallback(async (endpoint = url, queries = {}) => {
    setLoading(true);
    setError(null);
    
    try {
      const queryString = new URLSearchParams(queries).toString();
      const fullUrl = queryString ? `${endpoint}?${queryString}` : endpoint;
      
      const response = await api(fullUrl);
      
      if (response.success === false) {
        throw new Error(response.error);
      }
      
      const processedData = presentData(response.data || response);
      setData(processedData);
      
      if (response.count !== undefined) {
        setCount(response.count);
      }
      
      successCallback(processedData);
      return processedData;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, presentData, successCallback]);
  
  useEffect(() => {
    if (initLoad) {
      fetchApi(url, initQueries);
    }
  }, [fetchApi, url, initLoad]);
  
  return {
    data,
    loading,
    error,
    fetchApi,
    count
  };
}
```

## Testing Rules

### Component Testing

```js
// Button.test.js - Example test structure
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Button from './Button';

describe('Button Component', () => {
  test('renders with children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
  
  test('calls onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    fireEvent.click(screen.getByText('Click me'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
  
  test('displays loading state', () => {
    render(<Button isLoading>Click me</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });
});
```

## Performance Optimization Rules

1. **Code Splitting**:
   - Use React.lazy and Suspense for component code splitting
   - Implement route-based code splitting for pages

2. **Component Optimization**:
   - Use React.memo for pure functional components
   - Implement useCallback for event handlers
   - Use useMemo for expensive calculations

3. **Bundle Size Management**:
   - Monitor bundle size with performance tools
   - Import only needed components from libraries
   - Use tree-shaking friendly imports

4. **Image Optimization**:
   - Use WebP format where possible
   - Implement responsive images with srcset
   - Lazy load images below the fold

## Accessibility Rules

1. **Semantic HTML**:
   - Use proper HTML elements (button for actions, a for links)
   - Implement appropriate heading hierarchy (h1-h6)

2. **Keyboard Navigation**:
   - Ensure all interactive elements are keyboard accessible
   - Implement focus states for keyboard users

3. **ARIA Attributes**:
   - Use aria-* attributes when semantic HTML is not enough
   - Implement aria-live regions for dynamic content

4. **Color Contrast**:
   - Maintain WCAG AA standard (4.5:1 for normal text)
   - Don't rely on color alone to convey information
