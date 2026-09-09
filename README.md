# Bedecraft — Trang quản trị (giao diện Apex shadcn)

Giao diện quản trị bán hàng máy in 3D, dựng theo phong cách [Apex shadcn dashboard](https://apex-shadcn.dashboardpack.com/): sidebar tối 260px, nền sáng, thẻ trắng bo góc 14px viền mảnh, accent xanh ngọc.

## Chạy

```bash
cd D:\3d\3d\public && python -m http.server 8124
```

Mở `http://localhost:8124`. Trang **bắt buộc** có backend Java (nối Supabase PostgreSQL) chạy kèm:

```bash
cd D:\3d\3d-backend && java -jar target\in3d-backend-1.0.0.jar
```

Backend tắt thì các bảng để trống và đầu trang hiện thông báo đỏ *"Không kết nối được backend Java (cổng 8090)"* — không có dữ liệu mẫu, không gọi thẳng Supabase.

## Đăng nhập

Chỉ **một email quản trị duy nhất** (`in3d.admin.email` trong `application.properties` của backend) vào được. Đăng nhập 2 bước: mật khẩu → mã OTP 6 số gửi về email (xem `3d-backend/HUONG-DAN-DANG-NHAP-OTP.md`).

## Cấu trúc

```
public/
├── index.html                 Tổng quan (KPI + 2 biểu đồ + đơn mới + sắp hết hàng)
├── don-hang.html              Đơn hàng (lọc trạng thái, đổi trạng thái, xác nhận TT, xoá)
├── khach-hang.html            Khách hàng (tài khoản đăng ký + khách vãng lai)
├── san-pham.html              Sản phẩm — modal chi tiết/sửa/xoá/đổi trạng thái, lọc theo danh mục
├── danh-muc.html              Danh mục sản phẩm + LOẠI VẬT TƯ (ô "Loại" ở Kho lấy từ đây; tính chất nhựa/máy in/phụ kiện/khác)
├── kho.html                   Kho & vật tư — trạng thái tự suy từ số gram còn lại
├── nha-cung-cap.html          Nhà cung cấp (nơi mua vật tư)
├── mau-sac.html               Bảng màu (tên + mã màu) cho nhựa và sản phẩm
├── khuyen-mai.html            Khuyến mãi: giảm theo đơn (có mã) + giảm giá sản phẩm
├── bai-viet.html              Bài viết hiện ở cuối trang chủ khách
├── quan-ly-von.html           Vốn + chi phí + CHIA TIỀN + giá bán theo gram
├── bao-cao.html               Báo cáo doanh thu (3 biểu đồ + bảng chi tiết)
├── cai-dat.html               Cài đặt cửa hàng + trạng thái hệ thống
├── dang-nhap.html             Đăng nhập admin (không có sidebar)
└── assets/
    ├── css/apex.css           Design system (biến màu, thẻ, bảng, badge, nút, form)
    ├── js/apex.js             Khung dùng chung + nạp dữ liệu + thao tác
    └── img/                   logo.png
```

## Trạng thái

**Sản phẩm:** Dự kiến · Đã đặt · Đang in · Sẵn hàng · Đang vận chuyển · Thành công · Hoàn hàng · Hết hàng

**Vật tư:** Còn hàng · Sắp hết · Hết hàng · Đã đặt · Đang vận chuyển

Với cuộn nhựa, *Còn hàng / Sắp hết / Hết hàng* **tự suy từ số gram còn lại** (còn ≤ 200g là Sắp hết, dùng hết là Hết hàng) — `Apex.ttVatTuThucTe(v)`. *Đã đặt*, *Đang vận chuyển* và *Hết hàng* đặt tay được giữ nguyên. Lọc theo trạng thái ở đầu bảng; đổi trạng thái nhanh trong modal chi tiết.

## Màu sắc

Cột **Màu** ở Kho, Nhà cung cấp, Quản lý vốn luôn có ô màu. Vật tư chỉ lưu tên màu (chưa trỏ sang bảng màu) thì `Apex.maMauCua(maMau, tenMau)` tra theo tên trong bảng màu, rồi tới bảng tra sẵn (Đỏ, Vàng, Đen, Trắng, Be, Xám, Xanh lá, Xanh dương, Cam, Hồng, Tím...).

## Chia tiền (Quản lý vốn)

Nhập **Giá vốn**, **Số chia** và **Lãi** → hiện cả hai chiều: *Tổng* (nhân với số chia) và *Mỗi phần* (chia cho số chia), cho vốn, lãi và vốn + lãi. Số nhập được nhớ trong trình duyệt.

## Ảnh sản phẩm

Bấm **Chọn ảnh từ máy** trong modal → trình duyệt tự nén còn ≤1200px (WebP 82%, lùi JPEG nếu
trình duyệt cũ) → gửi lên `POST /api/anh` → backend lưu ở **`3d/public/anh`** (ngay trong project trang quản trị này), DB lưu
**đường dẫn tương đối** `/anh/<uuid>.webp`. Ảnh 3,8MB xuống còn ~104KB. Không tốn tiền,
không phụ thuộc dịch vụ ngoài.

Khi hiển thị luôn dùng `Apex.anhDayDu(duongDan)` để ghép thành URL đầy đủ — nhờ vậy đổi
tên miền/host sau này không làm chết link ảnh cũ.
So sánh các phương án khác (Supabase Storage, Cloudinary...): xem
[HUONG-DAN-LUU-ANH.md](https://github.com/TXP52/3d-backend/blob/main/HUONG-DAN-LUU-ANH.md) trong repo backend.

## Nạp dữ liệu & vẽ lại (không tải lại trang)

`apex.js` gọi **song song, bất đồng bộ** 9 API lúc mở trang (thanh tải mảnh ở mép trên trong lúc chờ), rồi gọi hàm vẽ lại mà trang đã đăng ký bằng `Apex.datVeLai(veLaiTrang)`. Sau mỗi thao tác ghi, `Apex.capNhatXong(['vat-tu', ...], 'Đã lưu')` nạp lại đúng các bộ dữ liệu đó (song song), đóng hộp thoại, gọi lại `veLaiTrang()` và hiện toast — **không `location.reload()`**, giữ nguyên bộ lọc và vị trí cuộn.

Quy ước cho trang: không vẽ dữ liệu ở đầu script (lúc đó mảng còn trống); mọi thứ tính từ dữ liệu phải nằm trong `veLaiTrang()`. Các mảng `Apex.vatTu`, `Apex.products`… được thay nội dung tại chỗ nên tham chiếu cầm từ đầu vẫn dùng được.

## Thêm trang mới

Copy khuôn từ `index.html`, đổi `Apex.shell('key-menu', 'Tiêu đề')`, thêm mục vào mảng `NAV` trong `assets/js/apex.js`. Toàn bộ sidebar/topbar do `Apex.shell()` sinh — sửa 1 chỗ áp dụng mọi trang.

## API của Apex (assets/js/apex.js)

| Nhóm | Hàm |
|---|---|
| Dữ liệu | `Apex.orders`, `.products`, `.customers`, `.inventory`, `.vatTu`, `.nhaCungCap`, `.mauSac`, `.danhMuc`, `.stats`, `.backendOk()`, `.daNap()` |
| Chi phí | `tinhChiPhi()`, `giaBanMoiGram(tiLe)`, `layTiLeLai()`, `luuTiLeLai(v)`, `laySanPhamIn()`, `luuSanPhamIn(ds)` |
| Vật tư | `ttVatTuThucTe(v)`, `gramConLai(v)`, `nguongNhuaSapHet`, `datDaDung()`, `dungThemGram()`, `themVatTu()`, `xoaVatTu()`, `themNhaCungCap()`, `suaNhaCungCap()`, `xoaNhaCungCap()` |
| Danh mục | `danhMucSanPham()`, `danhMucVatTu()`, `tinhChatVatTu`, `tenLoaiVatTu(v)`, `soVatTuTheoDanhMuc(id)`, `timDanhMuc(id)`, `tenDanhMuc(id)`, `badgeDanhMuc(id)`, `soSanPhamTheoDanhMuc(id)`, `themDanhMuc`, `suaDanhMuc`, `xoaDanhMuc` |
| Định dạng | `money(n)`, `number(n)`, `esc(s)`, `ngayVN(iso)`, `anhSanPham(ten)` |
| Hiển thị | `fill(sel, html)`, `badgeTrangThai(tt)`, `badgeTon(ton, min)`, `shell(key, tieuDe)` |
| Trạng thái | `ttSanPham`, `ttVatTu` (bảng tra), `badgeTtSanPham(tt)`, `badgeTtVatTu(v hoặc tt)` |
| Màu sắc | `mauSac`, `oMau(maMau, tenMau, co)`, `nhanMau(v, co)`, `maMauCua(maMau, tenMau)`, `timMau(id)`, `themMauSac`, `suaMauSac`, `xoaMauSac` |
| Hộp thoại | `moHopThoai(html, rong)`, `dongHopThoai()` — bấm nền hoặc Esc để đóng |
| Ảnh | `taiAnhLen(file, xong, loi)`, `htmlOTaiAnh(idGoc, url, nhan)`, `ganOTaiAnh(idGoc, url)` |
| Thao tác | `doiTrangThai`, `danhDauDaTT`, `xoaDon`, `luuSanPham`, `xoaSanPham`, `anHienSanPham`, `nhapKho`, `doiTrangThaiSanPham`, `doiTrangThaiVatTu` |
| Biểu đồ | `bieuDoDuong(id, nhan, days)`, `bieuDoCot(id, nhan, data, ten)`, `bieuDoTron(id, data)` |
| Phiên | `layPhien()`, `dangXuat()` |
