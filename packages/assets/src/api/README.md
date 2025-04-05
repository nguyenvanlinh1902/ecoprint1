# Hướng dẫn sử dụng API và Hooks

## Cấu trúc API Response

Tất cả các API của hệ thống đều trả về dữ liệu với cấu trúc thống nhất:

### Response Thành công

```javascript
{
  "success": true,
  "data": {}, // Dữ liệu trả về, có thể là object hoặc array
  "message": "Operation successful", // Thông báo thành công
  "timestamp": "2023-04-04T09:00:00.000Z" // Thời điểm response được tạo
}
```

### Response Lỗi

```javascript
{
  "success": false,
  "message": "Error message", // Thông báo lỗi
  "code": "error_code", // Mã lỗi
  "details": {}, // Chi tiết lỗi (tùy chọn)
  "timestamp": "2023-04-04T09:00:00.000Z" // Thời điểm response được tạo
}
```

### Response Phân trang

```javascript
{
  "success": true,
  "data": [], // Mảng dữ liệu
  "pagination": {
    "page": 1, // Trang hiện tại
    "limit": 10, // Số lượng item mỗi trang
    "total": 100, // Tổng số item
    "totalPages": 10 // Tổng số trang
  },
  "message": "Data retrieved successfully",
  "timestamp": "2023-04-04T09:00:00.000Z"
}
```

## Sử dụng API Hooks

Hệ thống cung cấp các hooks để thao tác với API:

### 1. Hook cơ bản

- `useFetchApi`: Lấy dữ liệu từ API
- `useCreateApi`: Tạo dữ liệu mới
- `useEditApi`: Cập nhật dữ liệu
- `useDeleteApi`: Xóa dữ liệu
- `usePaginate`: Phân trang dữ liệu

### 2. Hook theo tài nguyên

- `useUsersApi`: Quản lý người dùng
- `useProductsApi`: Quản lý sản phẩm
- `useOrdersApi`: Quản lý đơn hàng
- `useAuthApi`: Xác thực người dùng

## Quy tắc sử dụng

### 1. Sử dụng hooks API

```jsx
import { useUsersApi } from '../hooks/api';

function UserList() {
  const { fetchUsers, users, usersLoading, usersError } = useUsersApi();
  
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  
  if (usersLoading) return <div>Loading...</div>;
  if (usersError) return <div>Error: {usersError}</div>;
  
  return (
    <div>
      {users?.map(user => (
        <div key={user.id}>{user.displayName}</div>
      ))}
    </div>
  );
}
```

### 2. Sử dụng useAuth hook

```jsx
import { useAuth } from '../hooks/useAuth';

function LoginForm() {
  const { login, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(email, password);
    
    if (result.success) {
      // Redirect sau khi đăng nhập thành công
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {error && <div className="error">{error}</div>}
      <button type="submit" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}
```

### 3. Xử lý lỗi

Luôn kiểm tra thuộc tính `success` trong response:

```javascript
const response = await authApi.login(email, password);

if (response.success) {
  // Xử lý thành công
  const userData = response.data;
} else {
  // Xử lý lỗi
  const errorMessage = response.message;
  const errorCode = response.code;
}
```

### 4. Sử dụng TypeScript (Khuyến nghị)

```typescript
// Type definitions for API responses
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message: string;
  timestamp: string;
}

interface ApiError {
  success: false;
  message: string;
  code: string;
  details?: any;
  timestamp: string;
}

// Use with hooks
const { data, loading, error } = useFetchApi<User[]>('/users');
```

## Quy tắc phát triển mới

Khi thêm một API endpoint mới:

1. Tuân thủ cấu trúc response chuẩn
2. Thêm hook API tương ứng trong `src/hooks/api/index.js`
3. Đảm bảo xử lý lỗi đầy đủ
4. Luôn thêm timestamp vào response
5. Sử dụng mã lỗi rõ ràng và có ý nghĩa 