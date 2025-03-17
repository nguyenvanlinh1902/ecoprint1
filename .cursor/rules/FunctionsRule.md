# KoaJS Development Rules and Best Practices

This document outlines the rules, patterns, and best practices for developing with KoaJS in our functions architecture.

## Architecture Overview

Kiến trúc serverless functions của chúng ta tuân theo mô hình phân lớp rõ ràng, mỗi thư mục đóng một vai trò cụ thể và có trách nhiệm riêng biệt. Cấu trúc này giúp dễ dàng mở rộng, bảo trì và kiểm thử.

```
src/
  ├── index.js            # Điểm khởi chạy chính của Firebase Functions
  ├── handlers/           # Xử lý các ứng dụng Koa, điều phối request
  ├── routes/             # Định nghĩa các đường dẫn API và phương thức
  ├── controllers/        # Xử lý request và định dạng response
  ├── services/           # Xử lý logic nghiệp vụ chính
  ├── repositories/       # Tương tác với cơ sở dữ liệu
  ├── middleware/         # Các middleware tái sử dụng
  ├── helpers/            # Các hàm tiện ích
  ├── config/             # Cấu hình ứng dụng
  ├── const/              # Các hằng số
  └── exceptions/         # Định nghĩa lỗi tùy chỉnh
```

### Vai trò chi tiết của các thư mục:

- **index.js**: Điểm khởi đầu, nơi đăng ký các Firebase Functions
- **handlers/**: Chứa các ứng dụng Koa, nơi khởi tạo middleware và routes
- **routes/**: Định nghĩa các endpoint API và kết nối chúng với controllers
- **controllers/**: Xử lý input từ request, gọi services, và định dạng response
- **services/**: Chứa toàn bộ logic nghiệp vụ, độc lập với framework
- **repositories/**: Trừu tượng hóa việc truy cập database, thực hiện CRUD
- **middleware/**: Các hàm xử lý trung gian như xác thực, phân quyền, kiểm tra input
- **helpers/**: Các tiện ích phổ biến dùng trong ứng dụng
- **config/**: Cấu hình cho Firebase, database và các dịch vụ khác
- **const/**: Các giá trị không thay đổi như mã lỗi, trạng thái
- **exceptions/**: Các lớp lỗi tùy chỉnh để xử lý ngoại lệ

## Core Principles

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Single Responsibility**: Each file should do one thing well
3. **Dependency Injection**: Dependencies should be passed in, not imported directly when possible
4. **Async/Await**: Use modern async/await syntax instead of callbacks or promise chains
5. **Error Handling**: Centralized error handling with proper logging and client-friendly messages

## KoaJS Setup Rules

### Application Setup

```javascript
// Create Koa application instance
const api = new App();
api.proxy = true;

// Register global middleware (executed in order)
api.use(createErrorHandler());
api.use(authMiddleware());
api.use(corsMiddleware());

// Register routes
const router = apiRouter();
api.use(router.allowedMethods());
api.use(router.routes());
```

### Middleware Development

1. **Middleware Function Signature**: Factory function returning async middleware
2. **Error Handling Middleware**: Catch errors and format responses

## Routing Rules

1. **Route Organization**:
   - Group routes by feature or resource
   - Use prefixes to segment API
   - Export router factory functions
   - Use HTTP verbs correctly (GET, POST, PUT, PATCH, DELETE)

## Controller Rules

1. **Keep Controllers Thin**:
   - Focus on request/response handling
   - Delegate business logic to services
   - Extract validation to separate middleware

## Service Rules

1. **Business Logic Encapsulation**:
   - Services contain all business logic
   - Independent from web framework
   - Can be unit tested in isolation

## Repository Rules

1. **Data Access Abstraction**:
   - Repositories abstract all database operations
   - Return business entities, not DB models
   - Hide database implementation details

## Error Handling Rules

1. **Custom Error Classes**:
   - Define custom errors for different scenarios
   - Include HTTP status codes
   - Provide user-friendly messages

2. **Centralized Error Logging**:
   - Log errors with request context
   - Include request ID for traceability

## Firebase Functions Integration

1. **Exporting Koa Apps as Functions**: Use proper function export syntax
2. **Function Configuration**: Configure memory, timeout as needed

## Testing Guidelines

1. **Unit Testing**:
   - Test services and repositories in isolation
   - Mock dependencies
   - Focus on business logic

2. **Integration Testing**:
   - Test API endpoints with supertest
   - Use test database
   - Validate response structure

## Performance Best Practices

1. **Avoid Blocking Operations**
2. **Use Promise.all for Concurrent Operations**
3. **Implement Proper Caching Strategies**
4. **Optimize Database Queries**
5. **Minimize Function Cold Starts**

## Security Guidelines

1. **Validate All Input**
2. **Use Middleware for Authentication**
3. **Implement Proper CORS Settings**
4. **Apply Rate Limiting**
5. **Set Appropriate Response Headers**

## Deployment Checklist

1. **Remove Development Code**
2. **Set Environment Variables**
3. **Configure Proper Memory Allocation**
4. **Set Timeouts Appropriately**
5. **Enable Logging and Monitoring**

## Firebase Integration Guidelines

### Firebase Admin SDK Setup

- Initialize Firebase Admin SDK properly
- Export utility functions for Firestore, Storage access

### Firestore Data Access Pattern

- Follow Repository pattern for database operations
- Implement CRUD operations consistently
- Handle errors appropriately

### Authentication Middleware

- Verify Firebase ID tokens
- Set user context for downstream middleware
- Return appropriate status codes for auth failures

### Role-Based Authorization

- Implement role checks in middleware
- Support multiple roles when needed
- Return clear permission denied messages

### Firebase Storage Usage

- Implement secure file upload/download
- Generate unique filenames
- Set appropriate metadata and caching

### Firebase Cloud Functions

- Configure function resources appropriately
- Implement event triggers (Firestore, Auth, etc.)
- Create scheduled functions when needed

### Firebase Best Practices

1. **Security Rules**: Always define proper Firestore and Storage security rules
2. **Transactions**: Use transactions for atomic operations
3. **Batched Writes**: Use batch operations for multiple writes
4. **Indexes**: Create composite indexes for complex queries
5. **Data Denormalization**: Strategically duplicate data to minimize reads
6. **Collection Groups**: Use collection groups for querying across sub-collections
7. **Security**: Never store API keys or secrets in client-side code
8. **Error Handling**: Always handle Firebase operation errors gracefully
9. **Offline Support**: Implement offline capabilities when appropriate
10. **Cost Management**: Monitor usage to prevent unexpected billing

---

By following these rules and patterns, we ensure our KoaJS functions are maintainable, scalable, and performant.
