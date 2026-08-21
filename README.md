# IN3D Store — Trang quản trị (giao diện Apex shadcn)

Giao diện quản trị bán hàng máy in 3D, dựng lại theo phong cách [Apex shadcn dashboard](https://apex-shadcn.dashboardpack.com/): sidebar tối 260px, nền sáng, thẻ trắng bo góc 14px viền mảnh, accent xanh ngọc.

## Chạy

```bash
cd D:\3d\3d\public && python -m http.server 8124
```

Mở `http://localhost:8124`. Để có **dữ liệu thật**, chạy kèm backend Java:

```bash
cd D:\3d\3d-backend && java -jar target\in3d-backend-1.0.0.jar
```

## Cấu trúc

```
public/
├── index.html                 Tổng quan (KPI + 2 biểu đồ + đơn mới + sắp hết hàng)
├── don-hang.html              Đơn hàng (lọc trạng thái, đổi trạng thái, xác nhận TT, xoá)
├── khach-hang.html            Khách hàng (tài khoản đăng ký + khách vãng lai)
├── san-pham.html              Sản phẩm — bấm vào hàng để mở MODAL chi tiết/sửa/xoá/đổi trạng thái
├── kho.html                   Kho & vật tư — cũng dùng modal, có trạng thái vật tư
├── nha-cung-cap.html          Nhà cung cấp (nơi mua vật tư)
├── mau-sac.html               Bảng màu (tên + mã màu) cho nhựa và sản phẩm
├── khuyen-mai.html            Khuyến mãi: giảm theo đơn (có mã) + giảm giá sản phẩm
├── bai-viet.html              Bài viết hiện ở cuối trang chủ khách
├── quan-ly-von.html           Vốn + CHI PHÍ + giá bán theo gram
├── bao-cao.html               Báo cáo doanh thu (3 biểu đồ + bảng chi tiết)
├── cai-dat.html               Cài đặt cửa hàng + trạng thái hệ thống
├── dang-nhap.html             Đăng nhập admin (không có sidebar)
└── assets/
    ├── css/apex.css           Design system (biến màu, thẻ, bảng, badge, nút, form)
    ├── js/apex.js             Khung dùng chung + nạp dữ liệu + thao tác
    └── img/                   logo.png
```

## Nguồn dữ liệu (tự động chuyển)

1. **Backend Java** `http://localhost:8090` — đầy đủ, cho phép ghi (đổi trạng thái, sửa sản phẩm…)
2. **Supabase REST** — chỉ đọc sản phẩm khi Java tắt
3. **Dữ liệu mẫu** — khi không có cả hai, trang vẫn xem được

Nguồn đang dùng hiển thị ở chân sidebar và trang Cài đặt.

## Trạng thái

**Sản phẩm:** Dự kiến · Đã đặt · Đang in · Sẵn hàng · Đang vận chuyển · Thành công · Hoàn hàng · Hết hàng
**Vật tư:** Đã đặt · Đang vận chuyển · Thành công · Hết hàng

Lọc theo trạng thái ở đầu bảng; đổi trạng thái nhanh trong modal chi tiết.

## Ảnh sản phẩm

Bấm **Chọn ảnh từ máy** trong modal → trình duyệt tự nén còn ≤1200px (WebP 82%, lùi JPEG nếu
trình duyệt cũ) → gửi lên `POST /api/anh` → backend lưu ở `3d-backend/data/anh`, DB lưu
**đường dẫn tương đối** `/anh/<uuid>.webp`. Ảnh 3,8MB xuống còn ~104KB. Không tốn tiền,
không phụ thuộc dịch vụ ngoài.

Khi hiển thị luôn dùng `Apex.anhDayDu(duongDan)` để ghép thành URL đầy đủ — nhờ vậy đổi
tên miền/host sau này không làm chết link ảnh cũ.
So sánh các phương án khác (Supabase Storage, Cloudinary...): xem
[HUONG-DAN-LUU-ANH.md](https://github.com/TXP52/3d-backend/blob/main/HUONG-DAN-LUU-ANH.md) trong repo backend.

## Thêm trang mới

Copy khuôn từ `index.html`, đổi `Apex.shell('key-menu', 'Tiêu đề')`, thêm mục vào mảng `NAV` trong `assets/js/apex.js`. Toàn bộ sidebar/topbar/footer do `Apex.shell()` sinh — sửa 1 chỗ áp dụng mọi trang.

## API của Apex (assets/js/apex.js)

| Nhóm | Hàm |
|---|---|
| Dữ liệu | `Apex.orders`, `.products`, `.customers`, `.inventory`, `.vatTu`, `.nhaCungCap`, `.stats`, `.dataSource` |
| Chi phí | `tinhChiPhi()`, `giaBanMoiGram(tiLe)`, `layTiLeLai()`, `luuTiLeLai(v)`, `laySanPhamIn()`, `luuSanPhamIn(ds)` |
| Vật tư | `datDaDung()`, `dungThemGram()`, `themVatTu()`, `xoaVatTu()`, `themNhaCungCap()`, `suaNhaCungCap()`, `xoaNhaCungCap()` |
| Định dạng | `money(n)`, `number(n)`, `esc(s)`, `ngayVN(iso)`, `anhSanPham(ten)` |
| Hiển thị | `fill(sel, html)`, `badgeTrangThai(tt)`, `badgeTon(ton, min)`, `shell(key, tieuDe)` |
| Trạng thái | `ttSanPham`, `ttVatTu` (bảng tra), `badgeTtSanPham(tt)`, `badgeTtVatTu(tt)` |
| Màu sắc | `mauSac`, `oMau(maMau)`, `timMau(id)`, `themMauSac`, `suaMauSac`, `xoaMauSac` |
| Hộp thoại | `moHopThoai(html, rong)`, `dongHopThoai()` — bấm nền hoặc Esc để đóng |
| Ảnh | `taiAnhLen(file, xong, loi)`, `htmlOTaiAnh(idGoc, url, nhan)`, `ganOTaiAnh(idGoc, url)` |
| Thao tác | `doiTrangThai`, `danhDauDaTT`, `xoaDon`, `luuSanPham`, `xoaSanPham`, `anHienSanPham`, `nhapKho`, `doiTrangThaiSanPham`, `doiTrangThaiVatTu` |
| Biểu đồ | `bieuDoDuong(id, nhan, days)`, `bieuDoCot(id, nhan, data, ten)`, `bieuDoTron(id, data)` |
| Phiên | `layPhien()`, `dangXuat()` |
