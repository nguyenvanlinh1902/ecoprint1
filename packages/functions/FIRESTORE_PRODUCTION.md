# Hướng dẫn kết nối API Local với Firestore Production

## Tổng quan
Tài liệu này hướng dẫn cách cấu hình và chạy API trên môi trường local nhưng lưu dữ liệu vào **Firestore thật** thay vì emulator.

## Các bước thiết lập

### 1. Chuẩn bị serviceAccount.json

1. Đảm bảo đã tạo và cấu hình `serviceAccount.json` theo hướng dẫn trong README.md
2. Đặt file này trong thư mục `packages/functions/`

### 2. Chạy API Local với Firestore thật

Sử dụng lệnh đặc biệt sau để chạy API local mà không khởi động Firestore emulator:

```bash
npm run serve:production-db
```

Lệnh này sẽ:
- Khởi động Functions emulator (API local)
- Khởi động Auth và Storage emulator
- **KHÔNG** khởi động Firestore emulator, điều này buộc kết nối đến Firestore thật
- Sử dụng serviceAccount.json để xác thực với Firebase Cloud

### 3. Xác nhận kết nối đúng

Khi khởi động, bạn sẽ thấy các thông báo:
- `Using serviceAccount.json for Firebase authentication`
- `Firestore PRODUCTION connection successful`
- `KHÔNG dùng Firestore emulator, tất cả dữ liệu sẽ lưu vào Firestore THẬT`

Bạn cũng có thể kiểm tra API endpoint `/api/test-firestore` để xác nhận kết nối Firestore thành công.

## Sự khác biệt giữa các lệnh

| Lệnh | Mô tả |
|------|-------|
| `npm run serve` | Chỉ khởi động Functions emulator |
| `npm run dev` | Khởi động tất cả emulator, dữ liệu lưu vào emulator |
| `npm run serve:production-db` | API chạy trên local, dữ liệu lưu vào Firestore thật |

## Lưu ý quan trọng

- Khi sử dụng `serve:production-db`, mọi thay đổi dữ liệu sẽ được lưu vào database thật
- Cẩn thận khi thử nghiệm các tính năng xóa hoặc sửa dữ liệu
- Nên sử dụng collection riêng cho môi trường dev (ví dụ: thêm tiền tố `dev_` cho collection) 