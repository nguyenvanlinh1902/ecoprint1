# Frontend for EcoPrint B2B Platform

## Cấu trúc dự án
- Sử dụng Vite làm build tool
- Kết nối với Firebase (Firestore, Auth, Storage)
- Hỗ trợ cả môi trường phát triển và sản xuất

## Môi trường phát triển

### Cài đặt
```bash
cd packages/assets
npm install
```

### Chạy ứng dụng
```bash
npm run dev
```

Ứng dụng sẽ chạy ở `http://localhost:3001`

## Môi trường sản xuất

### Chuẩn bị môi trường sản xuất
1. Đảm bảo đã tạo file `.env.production` với các biến môi trường đúng
2. Đặc biệt chú ý các biến:
   - `VITE_API_BASE_URL`: URL của API endpoint (production)
   - `VITE_USE_FIREBASE_EMULATORS`: đã được đặt thành `false`

### Build cho môi trường sản xuất
```bash
npm run build:prod
```

Build output sẽ được tạo trong thư mục `../../static` để Firebase Hosting có thể sử dụng.

### Kiểm tra build sản xuất
```bash
npm run preview:prod
```

## Các tính năng tối ưu cho sản xuất

1. **Code Splitting**: Chia nhỏ bundle để tải trang nhanh hơn
2. **Tree Shaking**: Loại bỏ code không sử dụng
3. **Minification**: Nén code để giảm kích thước
4. **Lazy Loading**: Tải các module theo nhu cầu
5. **Production Logging**: Loại bỏ console.log trong môi trường sản xuất

## Firebase

### Môi trường phát triển
- Có thể sử dụng Firebase Emulator Suite cho Auth, Firestore, Storage
- Cấu hình trong `.env` với `VITE_USE_FIREBASE_EMULATORS=true`

### Môi trường sản xuất
- Kết nối trực tiếp đến Firebase Cloud
- Cấu hình trong `.env.production` với `VITE_USE_FIREBASE_EMULATORS=false`
- Sử dụng các dịch vụ Firebase thật: Auth, Firestore, Storage

## Quy trình triển khai (CI/CD)

1. Build sản xuất: `npm run build:prod`
2. Kiểm tra build: `npm run preview:prod`
3. Deploy lên Firebase Hosting: `firebase deploy --only hosting`

## Giải thích cấu trúc thư mục

- `/src`: Mã nguồn chính
  - `/components`: Các component React được chia sẻ
  - `/pages`: Các trang chính
  - `/layouts`: Bố cục trang
  - `/contexts`: Context API và các provider
  - `/services`: Logic nghiệp vụ và gọi API
  - `/hooks`: Các React hooks tùy chỉnh
  - `/config`: Cấu hình ứng dụng
  - `/styles`: CSS và theme

- `/public`: Tài nguyên tĩnh 