# Hướng dẫn cấu hình Firebase Local với ServiceAccount

## Tạo và cấu hình serviceAccount.json

Để chạy API local nhưng vẫn lưu dữ liệu vào Firebase Cloud, bạn cần tạo file serviceAccount.json với thông tin xác thực của dự án Firebase.

### Bước 1: Tạo Service Account Key trên Firebase Console

1. Đăng nhập vào [Firebase Console](https://console.firebase.google.com/)
2. Chọn dự án `ecoprint1-3cd5c`
3. Vào mục **Project Settings** (biểu tượng bánh răng)
4. Chuyển đến tab **Service accounts**
5. Chọn **Generate new private key**
6. Tải xuống file JSON chứa private key

### Bước 2: Lưu file serviceAccount.json

1. Đổi tên file vừa tải xuống thành `serviceAccount.json`
2. Đặt file này vào thư mục gốc của `packages/functions/`

### Bước 3: Kiểm tra kết nối

Sau khi đã cấu hình serviceAccount.json, chạy server local:

```bash
cd packages/functions
npm run serve
```

Hệ thống sẽ tự động sử dụng thông tin xác thực từ serviceAccount.json để kết nối đến Firebase Cloud.

## Lưu ý bảo mật

- File `serviceAccount.json` chứa thông tin nhạy cảm, không được commit lên git
- File này đã được thêm vào `.gitignore`
- Mỗi thành viên trong team cần tạo và cấu hình file này riêng 