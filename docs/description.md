# Phân chia tính năng theo ứng dụng

## 1. Tổng quan phân quyền

Hệ thống có 2 vai trò chính:
- **Admin**: Quản trị hệ thống, quản lý Partner, sản phẩm, đơn hàng và giao dịch
- **User (Partner)**: Đối tác doanh nghiệp hoặc cá nhân sử dụng hệ thống để đặt hàng

## 2. Quản lý người dùng

### 2.1. Đăng ký và xác thực
- **User**: Đăng ký tài khoản (thông tin cá nhân/công ty, email, số điện thoại, mật khẩu)
- **Admin**: Duyệt/từ chối đăng ký tài khoản mới
- **Chung**: Đăng nhập, đăng xuất hệ thống
- **Chung**: Khôi phục mật khẩu qua email

### 2.2. Quản lý hồ sơ
- **User**: Cập nhật thông tin cá nhân/công ty (tên, email, số điện thoại, logo)
- **User**: Xem lịch sử hoạt động bản thân
- **Admin**: Xem danh sách tất cả người dùng
- **Admin**: Kích hoạt/vô hiệu hóa tài khoản User
- **Admin**: Xem lịch sử hoạt động của tất cả User
- **Admin**: Quản lý phân quyền hệ thống

## 3. Quản lý sản phẩm

### 3.1. Quản lý danh mục
- **Admin**: Thêm/sửa/xóa danh mục sản phẩm
- **Admin**: Tạo cây danh mục đa cấp
- **Admin**: Gán nhà cung cấp cho danh mục
- **User**: Xem cây danh mục

### 3.2. Quản lý sản phẩm cơ bản
- **Admin**: Thêm/sửa/xóa sản phẩm
- **Admin**: Nhập thông tin chi tiết sản phẩm (tên, SKU, giá, thuộc tính...)
- **Admin**: Upload hình ảnh sản phẩm
- **Admin**: Quản lý tồn kho
- **User**: Xem danh sách sản phẩm có sẵn
- **User**: Tìm kiếm và lọc sản phẩm
- **User**: Xem chi tiết thông tin sản phẩm

### 3.3. Import sản phẩm hàng loạt
- **Admin**: Tạo và cung cấp template file Excel/CSV
- **Admin**: Import sản phẩm từ file
- **Admin**: Kiểm tra và xử lý lỗi khi import
- **Admin**: Cập nhật sản phẩm hàng loạt

### 3.4. Quản lý tùy chỉnh sản phẩm
- **Admin**: Thêm/sửa/xóa công nghệ tùy chỉnh (IN, THÊU)
- **Admin**: Thêm/sửa/xóa vị trí tùy chỉnh (mặt trước, sau, ngực trái...)
- **Admin**: Thiết lập giá cho mỗi công nghệ và vị trí
- **Admin**: Cấu hình quy tắc tính giá tùy chỉnh
- **User**: Xem các tùy chọn tùy chỉnh có sẵn

## 4. Quản lý đơn hàng

### 4.1. Tạo đơn hàng
- **User**: Chọn sản phẩm có sẵn
- **User**: Chọn các tùy chỉnh (IN hoặc THÊU) cho sản phẩm
- **User**: Upload file thiết kế cho các vị trí tùy chỉnh
- **User**: Nhập số lượng và thông tin người nhận
- **User**: Xem tính toán giá trước khi đặt hàng
- **User**: Xác nhận đơn hàng
- **Admin**: Tạo đơn hàng thay cho User khi cần

### 4.2. Import đơn hàng hàng loạt
- **User**: Download template file Excel/CSV
- **User**: Upload file chứa danh sách đơn hàng
- **User**: Xem preview danh sách đơn hàng đã import
- **User**: Kiểm tra chi tiết từng đơn và tổng giá
- **User**: Xác nhận (Confirm) danh sách đơn hàng
- **Admin**: Hỗ trợ User xử lý lỗi khi import

### 4.3. Quản lý và theo dõi đơn hàng
- **User**: Xem danh sách các đơn hàng đã tạo
- **User**: Lọc đơn hàng theo trạng thái, thời gian
- **User**: Xem chi tiết từng đơn hàng
- **User**: Theo dõi trạng thái xử lý đơn hàng
- **User**: Hủy đơn hàng (chỉ ở trạng thái chờ xác nhận)
- **Admin**: Xem tất cả đơn hàng trong hệ thống
- **Admin**: Lọc đơn hàng theo User, trạng thái, thời gian

### 4.4. Xử lý đơn hàng
- **Admin**: Xác nhận hoặc từ chối đơn hàng
- **Admin**: Cập nhật trạng thái đơn hàng (đang xử lý, sản xuất, đóng gói, vận chuyển, đã giao)
- **Admin**: Gán mã vận đơn và đơn vị vận chuyển
- **Admin**: Gửi thông báo cho User khi cập nhật trạng thái
- **User**: Nhận thông báo khi trạng thái đơn hàng thay đổi

## 5. Quản lý giao dịch (Transaction)

### 5.1. Nạp tiền vào tài khoản
- **User**: Tạo yêu cầu nạp tiền thủ công qua chuyển khoản
- **User**: Upload ảnh biên lai giao dịch
- **User**: Nhập thông tin giao dịch (số tiền, thời gian, ngân hàng)
- **User**: Xem trạng thái yêu cầu nạp tiền
- **Admin**: Xem tất cả yêu cầu nạp tiền trong hệ thống
- **Admin**: Duyệt/từ chối yêu cầu nạp tiền

### 5.2. Thanh toán đơn hàng
- **User**: Sử dụng số dư Transaction thanh toán cho đơn hàng
- **User**: Thanh toán nhiều đơn hàng cùng lúc
- **User**: Xem số dư khả dụng và số dư sau khi thanh toán
- **Admin**: Kiểm tra và xác nhận thanh toán
- **Admin**: Quản lý số dư tài khoản của User
- **Admin**: Tạo điều chỉnh số dư khi cần thiết

### 5.3. Quản lý lịch sử giao dịch
- **User**: Xem lịch sử nạp tiền và thanh toán
- **User**: Lọc giao dịch theo thời gian, loại giao dịch
- **User**: Xuất báo cáo giao dịch (PDF, Excel)
- **Admin**: Xem lịch sử giao dịch của tất cả User
- **Admin**: Xuất báo cáo giao dịch theo thời gian

## 6. Vận chuyển và giao hàng

### 6.1. Quản lý phương thức vận chuyển
- **Admin**: Thiết lập phương thức vận chuyển
- **Admin**: Cấu hình giá ship theo khu vực địa lý
- **Admin**: Thiết lập điều kiện miễn phí vận chuyển (VN free ship)
- **Admin**: Quản lý đơn vị vận chuyển đối tác
- **User**: Xem các phương thức vận chuyển có sẵn

### 6.2. Theo dõi đơn hàng
- **User**: Theo dõi trạng thái vận chuyển đơn hàng
- **User**: Nhận thông báo khi trạng thái vận chuyển thay đổi
- **Admin**: Cập nhật thông tin vận chuyển
- **Admin**: Xử lý các vấn đề phát sinh trong quá trình vận chuyển

## 7. Báo cáo và thống kê

### 7.1. Báo cáo dành cho User
- **User**: Xem tổng quan đơn hàng (số lượng, giá trị)
- **User**: Xem thống kê đơn hàng theo trạng thái
- **User**: Xem biểu đồ đơn hàng theo thời gian
- **User**: Xem sản phẩm đã đặt nhiều nhất

### 7.2. Báo cáo dành cho Admin
- **Admin**: Thống kê doanh số theo thời gian (ngày, tuần, tháng, năm)
- **Admin**: Thống kê doanh số theo User, sản phẩm, danh mục
- **Admin**: Xem biểu đồ doanh số trực quan
- **Admin**: Thống kê sản phẩm bán chạy
- **Admin**: Theo dõi tồn kho và cảnh báo hết hàng
- **Admin**: Thống kê số lượng đơn hàng theo trạng thái
- **Admin**: Phân tích đơn hàng theo khu vực địa lý

## 8. Cấu hình hệ thống

### 8.1. Cấu hình chung
- **Admin**: Quản lý thông tin công ty (tên, logo, thông tin liên hệ)
- **Admin**: Cấu hình email tự động (template, nội dung)
- **Admin**: Quản lý ngôn ngữ và đơn vị tiền tệ
- **Admin**: Cấu hình quy tắc tính giá và thuế
- **Admin**: Sao lưu và khôi phục dữ liệu

### 8.2. Phân quyền và bảo mật
- **Admin**: Quản lý vai trò và quyền hạn trong hệ thống
- **Admin**: Thiết lập các quy tắc bảo mật
- **Admin**: Xem nhật ký hoạt động hệ thống

## 9. Kế hoạch phát triển

Việc phát triển hệ thống sẽ được chia thành các giai đoạn sau:

### Giai đoạn 1: Chức năng cốt lõi
- Quản lý người dùng
- Quản lý sản phẩm cơ bản
- Tạo đơn hàng đơn lẻ
- Thanh toán đơn giản

### Giai đoạn 2: Mở rộng chức năng
- Import sản phẩm hàng loạt
- Import đơn hàng hàng loạt
- Quản lý giao dịch nâng cao
- Báo cáo cơ bản

### Giai đoạn 3: Hoàn thiện hệ thống
- Vận chuyển và giao hàng nâng cao
- Báo cáo và thống kê nâng cao
- Cấu hình hệ thống
- Tối ưu hóa và kiểm thử toàn diện

### Giai đoạn 4: Tích hợp nâng cao
- Tích hợp với các cổng thanh toán trực tuyến
- Tích hợp với các nhà cung cấp vận chuyển
- API cho các hệ thống bên thứ ba
- Tiếp thị liên kết và hệ thống giới thiệu