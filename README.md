# IN3D Store — Trang quản trị bán hàng máy in 3D

Giao diện quản trị (admin dashboard) tiếng Việt dành cho cửa hàng kinh doanh **máy in 3D**, vật tư in
(nhựa PLA/PETG/TPU, resin) và linh kiện thay thế.

Dự án được xây dựng trên bộ giao diện **Falcon v3.4.0** (Bootstrap 5). Toàn bộ trang quản trị mới nằm
trong thư mục `public/` và dùng lại phần CSS/JS đã biên dịch sẵn của Falcon, nên **chạy được ngay,
không cần cài đặt hay biên dịch gì thêm**.

## Chạy thử

Cách nhanh nhất — mở thẳng tệp `public/index.html` bằng trình duyệt.

Hoặc chạy một máy chủ tĩnh để mọi đường dẫn hoạt động chuẩn xác:

```bash
python -m http.server 4173 --directory public
```

Sau đó mở http://localhost:4173

## Các trang trong hệ thống

| Trang | Tệp | Nội dung |
| --- | --- | --- |
| Tổng quan | `public/index.html` | Doanh thu, đơn hàng, máy đã bán, khách mới; biểu đồ doanh thu 12 tháng, cơ cấu danh mục và kênh bán; cảnh báo tồn kho; đơn hàng gần đây |
| Danh sách sản phẩm | `public/san-pham.html` | Bảng máy in 3D / vật tư / linh kiện, tìm kiếm, lọc theo danh mục, sắp xếp, phân trang |
| Thêm sản phẩm | `public/them-san-pham.html` | Biểu mẫu khai báo sản phẩm: thông tin cơ bản, thông số kỹ thuật máy in, giá vốn – giá bán – lợi nhuận tự tính, tồn kho, bảo hành, hình ảnh |
| Đơn hàng | `public/don-hang.html` | Danh sách đơn theo trạng thái (chờ xác nhận, đang xử lý, đang giao, hoàn thành, đã huỷ, hoàn tiền) |
| Chi tiết đơn hàng | `public/don-hang-chi-tiet.html` | Sản phẩm trong đơn, tạm tính / phí vận chuyển / giảm giá / tổng thanh toán, tiến trình xử lý, thông tin khách hàng |
| Khách hàng | `public/khach-hang.html` | Khách lẻ, đại lý, doanh nghiệp, trường học; số đơn và tổng chi tiêu |
| Kho & vật tư | `public/kho.html` | Tồn kho theo SKU, mức tồn tối thiểu, vị trí kho, đề xuất nhập hàng |
| Báo cáo doanh thu | `public/bao-cao.html` | Doanh thu năm nay so với năm trước, bảng chi tiết theo tháng, top 10 sản phẩm theo doanh thu và lợi nhuận |
| Cài đặt cửa hàng | `public/cai-dat.html` | Thông tin doanh nghiệp, phương thức thanh toán, vận chuyển – bảo hành, cảnh báo, nhân viên và phân quyền |
| Đăng nhập | `public/dang-nhap.html` | Trang đăng nhập quản trị |

## Cấu trúc mã nguồn

```
public/
├── index.html, san-pham.html, don-hang.html, ...   # các trang quản trị tiếng Việt
├── assets/
│   ├── js/app3d.js      # dữ liệu mẫu + khung giao diện dùng chung (sidebar, topbar, footer, bảng, biểu đồ)
│   ├── css/app3d.css    # phần CSS tuỳ biến riêng
│   ├── css/theme.min.css, js/theme.js   # Falcon (đã biên dịch sẵn)
└── vendors/             # thư viện: Bootstrap, ECharts, list.js, FontAwesome...
```

Điểm chính nằm ở `public/assets/js/app3d.js`:

- **Dữ liệu mẫu**: sản phẩm, đơn hàng, khách hàng, tồn kho, số liệu thống kê.
- **Khung giao diện dùng chung**: `App3D.sidebar()`, `App3D.topbar()`, `App3D.footer()`,
  `App3D.pageHeader()` — mỗi trang chỉ cần gọi một dòng thay vì lặp lại hàng trăm dòng HTML.
- **Bộ dựng bảng**: `App3D.productRows()`, `orderRows()`, `customerRows()`, `inventoryRows()`.
- **Biểu đồ ECharts**: `App3D.revenueChart()`, `pieChart()`, `ordersChart()`, `sparkline()` — tự vẽ lại
  khi người dùng chuyển giữa giao diện sáng và tối.
- **Định dạng tiền tệ Việt Nam**: `App3D.money()` cho ra dạng `4.990.000 ₫`.

## Thay dữ liệu mẫu bằng dữ liệu thật

Hiện tại toàn bộ số liệu là dữ liệu mẫu nằm ngay trong `app3d.js`. Để nối vào máy chủ thật, thay các
mảng `PRODUCTS`, `ORDERS`, `CUSTOMERS`, `INVENTORY`, `STATS` bằng kết quả gọi API, rồi gọi lại các hàm
dựng bảng tương ứng. Cấu trúc giao diện không cần sửa.

Lưu ý: các biểu mẫu (thêm sản phẩm, đăng nhập, cài đặt) mới chỉ kiểm tra dữ liệu ở phía trình duyệt —
chưa gửi dữ liệu đi đâu và **chưa có xác thực thật**.

## Tính năng có sẵn từ Falcon

- Giao diện sáng / tối, ghi nhớ lựa chọn trong `localStorage`
- Menu dọc thu gọn được, tương thích màn hình điện thoại và máy tính bảng
- Tìm kiếm, sắp xếp, phân trang bảng bằng list.js
- Biểu đồ ECharts

## Bản quyền

Bộ giao diện Falcon thuộc bản quyền của ThemeWagon / Technext Limited — xem `Copyright.txt`.
Phần mã và nội dung tiếng Việt bổ sung trong `public/assets/js/app3d.js`, `public/assets/css/app3d.css`
và các trang `*.html` ở thư mục `public/` thuộc dự án này.
