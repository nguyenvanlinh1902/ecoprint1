/**
 * Mô tả cấu trúc dữ liệu của Firestore
 * 
 * users: Thông tin người dùng (B2B và Admin)
 * products: Thông tin sản phẩm
 * orders: Đơn hàng
 * transactions: Lịch sử giao dịch
 * batchImports: Lưu trữ thông tin các đợt import nhiều đơn hàng
 */

const firestoreSchema = {
  collections: {
    users: {
      fields: {
        email: 'string',
        password: 'string', // Đã được mã hóa
        companyName: 'string',
        phone: 'string',
        role: 'string', // 'admin' hoặc 'b2b'
        status: 'string', // 'pending', 'active', 'inactive'
        balance: 'number', // Số dư tài khoản
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    products: {
      fields: {
        name: 'string',
        colors: 'array', // Mảng các màu có sẵn
        sizes: 'array', // Mảng các kích thước
        sku: 'string',
        basePrice: 'number',
        type: 'string', // 'USA' hoặc 'VIETNAM'
        customizationOptions: 'array', // Các tùy chỉnh khả dụng
        active: 'boolean',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    orders: {
      fields: {
        userId: 'string', // Reference đến users
        productId: 'string', // Reference đến products
        customizations: 'array', // Các tùy chỉnh đã chọn
        quantity: 'number',
        shippingAddress: 'object', // Địa chỉ giao hàng
        designFiles: 'array', // URLs của các file thiết kế
        status: 'string', // 'pending', 'processing', 'shipped', 'delivered', 'cancelled'
        basePrice: 'number', // Giá cơ bản
        customizationFee: 'number', // Phí tùy chỉnh
        shippingFee: 'number', // Phí vận chuyển
        totalPrice: 'number', // Tổng tiền
        batchImportId: 'string', // ID của đợt import (nếu có)
        isPaid: 'boolean', // Đã thanh toán chưa
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    transactions: {
      fields: {
        userId: 'string', // Reference đến users
        type: 'string', // 'deposit' hoặc 'payment'
        amount: 'number',
        status: 'string', // 'pending', 'completed', 'rejected'
        paymentProof: 'string', // URL ảnh chứng minh thanh toán
        orderId: 'string', // Reference đến orders (nếu là payment)
        note: 'string',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    },
    batchImports: {
      fields: {
        userId: 'string', // Reference đến users
        fileName: 'string', // Tên file đã import
        status: 'string', // 'draft', 'confirmed', 'processed'
        orderCount: 'number', // Số lượng đơn hàng trong batch
        totalPrice: 'number', // Tổng giá trị các đơn hàng
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      }
    }
  }
};

export default firestoreSchema; 