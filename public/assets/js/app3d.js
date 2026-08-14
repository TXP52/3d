/* -------------------------------------------------------------------------- */
/*  IN3D Store - Hệ thống quản trị bán hàng máy in 3D                          */
/*  Dữ liệu mẫu + bộ khung giao diện dùng chung cho toàn bộ trang quản trị      */
/* -------------------------------------------------------------------------- */

window.App3D = (function () {
  'use strict';

  /* ---------------------------------- Cấu hình --------------------------------- */

  var BRAND = 'IN3D Store';
  var TAGLINE = 'Quản trị bán hàng máy in 3D';

  var NAV = [
    {
      label: 'Quản lý bán hàng',
      items: [
        { key: 'tong-quan', text: 'Tổng quan', href: 'index.html', icon: 'fas fa-chart-pie' },
        { key: 'don-hang', text: 'Đơn hàng', href: 'don-hang.html', icon: 'fas fa-shopping-cart' },
        { key: 'khach-hang', text: 'Khách hàng', href: 'khach-hang.html', icon: 'fas fa-users' }
      ]
    },
    {
      label: 'Quản lý sản phẩm',
      items: [
        { key: 'san-pham', text: 'Danh sách sản phẩm', href: 'san-pham.html', icon: 'fas fa-cube' },
        { key: 'them-san-pham', text: 'Thêm sản phẩm', href: 'them-san-pham.html', icon: 'fas fa-plus-square' },
        { key: 'kho', text: 'Kho & vật tư', href: 'kho.html', icon: 'fas fa-warehouse' }
      ]
    },
    {
      label: 'Quản lý tài chính',
      items: [
        { key: 'quan-ly-von', text: 'Quản lý vốn', href: 'quan-ly-von.html', icon: 'fas fa-coins' },
        { key: 'quan-ly-xuat-nhap', text: 'Quản lý xuất nhập', href: 'quan-ly-xuat-nhap.html', icon: 'fas fa-exchange-alt' },
        { key: 'bao-cao', text: 'Báo cáo doanh thu', href: 'bao-cao.html', icon: 'fas fa-chart-line' }
      ]
    },
    {
      label: 'Hệ thống',
      items: [
        { key: 'cai-dat', text: 'Cài đặt cửa hàng', href: 'cai-dat.html', icon: 'fas fa-cog' },
        { key: 'dang-nhap', text: 'Đăng nhập', href: 'dang-nhap.html', icon: 'fas fa-sign-in-alt' }
      ]
    }
  ];

  /* --------------------------------- Tiện ích ---------------------------------- */

  var vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  var num = new Intl.NumberFormat('vi-VN');

  var money = function (value) {
    return vnd.format(value || 0);
  };

  var number = function (value) {
    return num.format(value || 0);
  };

  var escapeHtml = function (text) {
    return String(text == null ? '' : text).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  // Chèn HTML ngay tại vị trí thẻ <script> đang chạy (chạy trong lúc trình duyệt
  // phân tích trang), nhờ vậy theme.js vẫn khởi tạo được list.js, tooltip...
  var write = function (html) {
    var current = document.currentScript;
    if (current) {
      current.insertAdjacentHTML('afterend', html);
    }
  };

  // Đổ nội dung vào một phần tử đã được phân tích trước đó trên trang
  var fill = function (selector, html) {
    var el = document.querySelector(selector);
    if (el) {
      el.innerHTML = html;
    }
  };

  /* ------------------------- Trạng thái & nhãn màu sắc ------------------------- */

  var ORDER_STATUS = {
    'Hoàn thành': { badge: 'success', icon: 'fas fa-check' },
    'Đang giao': { badge: 'primary', icon: 'fas fa-truck' },
    'Đang xử lý': { badge: 'info', icon: 'fas fa-cogs' },
    'Chờ xác nhận': { badge: 'warning', icon: 'fas fa-stream' },
    'Đã huỷ': { badge: 'secondary', icon: 'fas fa-ban' },
    'Hoàn tiền': { badge: 'danger', icon: 'fas fa-undo' }
  };

  var statusBadge = function (status) {
    var meta = ORDER_STATUS[status] || { badge: 'secondary', icon: 'fas fa-circle' };
    return (
      '<span class="badge badge rounded-pill d-block badge-soft-' +
      meta.badge +
      '">' +
      escapeHtml(status) +
      '<span class="ms-1 ' +
      meta.icon +
      '" data-fa-transform="shrink-2"></span></span>'
    );
  };

  var stockBadge = function (stock, min) {
    if (stock <= 0) return '<span class="badge badge-soft-danger">Hết hàng</span>';
    if (stock <= (min || 5)) return '<span class="badge badge-soft-warning">Sắp hết</span>';
    return '<span class="badge badge-soft-success">Còn hàng</span>';
  };

  // Chọn ảnh minh hoạ theo tên sản phẩm (bộ ảnh dùng chung với website bán hàng)
  var anhSanPham = function (ten) {
    var t = (ten || '').toLowerCase();
    if (t.indexOf('resin') >= 0) return 'assets/img/sanpham/p26.jpg';
    if (t.indexOf('máy in') >= 0 || t.indexOf('bambu') >= 0 || t.indexOf('creality') >= 0 || t.indexOf('prusa') >= 0 || t.indexOf('kobra') >= 0 || t.indexOf('ender') >= 0) return 'assets/img/sanpham/p25.jpg';
    if (t.indexOf('nhựa') >= 0 || t.indexOf('pla') >= 0 || t.indexOf('petg') >= 0 || t.indexOf('abs') >= 0 || t.indexOf('tpu') >= 0 || t.indexOf('filament') >= 0) return 'assets/img/sanpham/p27.jpg';
    if (t.indexOf('đầu phun') >= 0 || t.indexOf('nozzle') >= 0 || t.indexOf('bàn in') >= 0 || t.indexOf('dụng cụ') >= 0 || t.indexOf('pei') >= 0 || t.indexOf('hotend') >= 0) return 'assets/img/sanpham/p49.webp';
    if (t.indexOf('scan') >= 0 || t.indexOf('dịch vụ') >= 0 || t.indexOf('thiết kế') >= 0) return 'assets/img/sanpham/p46.jpg';
    if (t.indexOf('mô hình') >= 0 || t.indexOf('stl') >= 0) return 'assets/img/sanpham/p48.jpg';
    return 'assets/img/sanpham/p50.jpg';
  };

  /* --------------------------------- Dữ liệu ---------------------------------- */

  var CATEGORIES = ['Máy in FDM', 'Máy in Resin', 'Máy in công nghiệp', 'Vật tư tiêu hao', 'Linh kiện & phụ kiện'];

  var PRODUCTS = [
    { sku: 'FDM-E3V3', name: 'Creality Ender-3 V3 SE', brand: 'Creality', cat: 'Máy in FDM', price: 4990000, cost: 3750000, stock: 24, min: 6, sold: 142, rating: 4.6, img: 'assets/img/products/1.jpg' },
    { sku: 'FDM-K1MAX', name: 'Creality K1 Max', brand: 'Creality', cat: 'Máy in FDM', price: 21900000, cost: 17400000, stock: 7, min: 4, sold: 38, rating: 4.8, img: 'assets/img/products/2.jpg' },
    { sku: 'FDM-P1S', name: 'Bambu Lab P1S Combo', brand: 'Bambu Lab', cat: 'Máy in FDM', price: 18500000, cost: 14900000, stock: 11, min: 4, sold: 64, rating: 4.9, img: 'assets/img/products/3.jpg' },
    { sku: 'FDM-A1M', name: 'Bambu Lab A1 mini', brand: 'Bambu Lab', cat: 'Máy in FDM', price: 6900000, cost: 5350000, stock: 3, min: 5, sold: 97, rating: 4.7, img: 'assets/img/products/4.jpg' },
    { sku: 'FDM-MK4', name: 'Prusa MK4S bản lắp sẵn', brand: 'Prusa', cat: 'Máy in FDM', price: 26500000, cost: 21800000, stock: 5, min: 3, sold: 21, rating: 4.9, img: 'assets/img/products/5.jpg' },
    { sku: 'FDM-KB2', name: 'Anycubic Kobra 2 Neo', brand: 'Anycubic', cat: 'Máy in FDM', price: 5290000, cost: 4100000, stock: 18, min: 6, sold: 88, rating: 4.4, img: 'assets/img/products/6.jpg' },
    { sku: 'RES-M4U', name: 'Elegoo Mars 4 Ultra 9K', brand: 'Elegoo', cat: 'Máy in Resin', price: 7490000, cost: 5900000, stock: 14, min: 5, sold: 56, rating: 4.6, img: 'assets/img/products/7.jpg' },
    { sku: 'RES-M5S', name: 'Anycubic Photon Mono M5s', brand: 'Anycubic', cat: 'Máy in Resin', price: 9900000, cost: 7850000, stock: 9, min: 4, sold: 41, rating: 4.5, img: 'assets/img/products/8.jpg' },
    { sku: 'RES-SAT4', name: 'Elegoo Saturn 4 Ultra 16K', brand: 'Elegoo', cat: 'Máy in Resin', price: 13900000, cost: 11200000, stock: 0, min: 3, sold: 27, rating: 4.8, img: 'assets/img/products/9.jpg' },
    { sku: 'IND-X1E', name: 'Bambu Lab X1E bản doanh nghiệp', brand: 'Bambu Lab', cat: 'Máy in công nghiệp', price: 62500000, cost: 52000000, stock: 2, min: 2, sold: 6, rating: 5.0, img: 'assets/img/products/10.png' },
    { sku: 'VT-PLA1', name: 'Nhựa in PLA+ eSUN 1kg', brand: 'eSUN', cat: 'Vật tư tiêu hao', price: 350000, cost: 235000, stock: 320, min: 60, sold: 1240, rating: 4.7, img: 'assets/img/products/11.png' },
    { sku: 'VT-PETG', name: 'Nhựa in PETG Sunlu 1kg', brand: 'Sunlu', cat: 'Vật tư tiêu hao', price: 420000, cost: 290000, stock: 186, min: 50, sold: 640, rating: 4.5, img: 'assets/img/products/12.png' },
    { sku: 'VT-RES1', name: 'Resin ABS-like Elegoo 1kg', brand: 'Elegoo', cat: 'Vật tư tiêu hao', price: 650000, cost: 470000, stock: 42, min: 40, sold: 385, rating: 4.4, img: 'assets/img/products/13.png' },
    { sku: 'VT-TPU', name: 'Nhựa dẻo TPU 95A 0.5kg', brand: 'eSUN', cat: 'Vật tư tiêu hao', price: 480000, cost: 355000, stock: 64, min: 30, sold: 210, rating: 4.3, img: 'assets/img/products/14.png' },
    { sku: 'LK-NOZ4', name: 'Đầu phun hardened steel 0.4mm', brand: 'Phụ kiện', cat: 'Linh kiện & phụ kiện', price: 180000, cost: 95000, stock: 240, min: 50, sold: 830, rating: 4.6, img: 'assets/img/products/1-2.jpg' },
    { sku: 'LK-PEI', name: 'Tấm in PEI từ tính 235x235mm', brand: 'Phụ kiện', cat: 'Linh kiện & phụ kiện', price: 650000, cost: 410000, stock: 78, min: 25, sold: 296, rating: 4.7, img: 'assets/img/products/1-3.jpg' },
    { sku: 'LK-HOT', name: 'Bộ hotend all-metal 300°C', brand: 'Phụ kiện', cat: 'Linh kiện & phụ kiện', price: 890000, cost: 560000, stock: 4, min: 15, sold: 124, rating: 4.5, img: 'assets/img/products/1-4.jpg' },
    { sku: 'LK-UVB', name: 'Máy rửa & sấy UV Wash and Cure 3.0', brand: 'Anycubic', cat: 'Linh kiện & phụ kiện', price: 3290000, cost: 2450000, stock: 16, min: 6, sold: 74, rating: 4.6, img: 'assets/img/products/1-5.jpg' }
  ];

  var CUSTOMERS = [
    { id: 'KH-1042', name: 'Nguyễn Minh Quân', email: 'quan.nguyen@makerlab.vn', phone: '0903 118 246', city: 'TP. Hồ Chí Minh', group: 'Doanh nghiệp', orders: 14, spent: 186400000, since: '12/03/2023' },
    { id: 'KH-1043', name: 'Trần Thị Bảo Ngọc', email: 'ngoc.tran@gmail.com', phone: '0912 664 037', city: 'Hà Nội', group: 'Cá nhân', orders: 6, spent: 42350000, since: '02/07/2023' },
    { id: 'KH-1044', name: 'Lê Hoàng Phúc', email: 'phuc.le@3dworks.vn', phone: '0987 201 558', city: 'Đà Nẵng', group: 'Đại lý', orders: 23, spent: 412900000, since: '18/11/2022' },
    { id: 'KH-1045', name: 'Phạm Thu Hà', email: 'ha.pham@edu.vn', phone: '0356 908 114', city: 'Hà Nội', group: 'Trường học', orders: 9, spent: 97800000, since: '25/01/2024' },
    { id: 'KH-1046', name: 'Đặng Quốc Huy', email: 'huy.dang@outlook.com', phone: '0938 447 210', city: 'TP. Hồ Chí Minh', group: 'Cá nhân', orders: 3, spent: 15600000, since: '09/05/2024' },
    { id: 'KH-1047', name: 'Vũ Thanh Tùng', email: 'tung.vu@protoshop.vn', phone: '0967 335 902', city: 'Bình Dương', group: 'Đại lý', orders: 18, spent: 288750000, since: '30/08/2023' },
    { id: 'KH-1048', name: 'Ngô Khánh Linh', email: 'linh.ngo@gmail.com', phone: '0345 776 118', city: 'Hải Phòng', group: 'Cá nhân', orders: 4, spent: 21400000, since: '14/02/2025' },
    { id: 'KH-1049', name: 'Bùi Anh Tuấn', email: 'tuan.bui@techviet.com', phone: '0901 553 668', city: 'TP. Hồ Chí Minh', group: 'Doanh nghiệp', orders: 11, spent: 154200000, since: '21/06/2024' },
    { id: 'KH-1050', name: 'Hoàng Diệu Linh', email: 'linh.hoang@studio3d.vn', phone: '0977 120 483', city: 'Cần Thơ', group: 'Cá nhân', orders: 7, spent: 58900000, since: '03/10/2024' },
    { id: 'KH-1051', name: 'Trịnh Văn Nam', email: 'nam.trinh@gmail.com', phone: '0932 806 771', city: 'Nghệ An', group: 'Cá nhân', orders: 2, spent: 9880000, since: '17/03/2025' }
  ];

  var ORDERS = [
    { id: 'DH-2508', customer: 'Lê Hoàng Phúc', date: '12/08/2026', items: 3, total: 46700000, status: 'Đang xử lý', payment: 'Chuyển khoản', channel: 'Website' },
    { id: 'DH-2507', customer: 'Nguyễn Minh Quân', date: '12/08/2026', items: 1, total: 21900000, status: 'Chờ xác nhận', payment: 'COD', channel: 'Hotline' },
    { id: 'DH-2506', customer: 'Vũ Thanh Tùng', date: '11/08/2026', items: 8, total: 63450000, status: 'Đang giao', payment: 'Chuyển khoản', channel: 'Đại lý' },
    { id: 'DH-2505', customer: 'Phạm Thu Hà', date: '11/08/2026', items: 5, total: 34600000, status: 'Hoàn thành', payment: 'Chuyển khoản', channel: 'Website' },
    { id: 'DH-2504', customer: 'Trần Thị Bảo Ngọc', date: '10/08/2026', items: 2, total: 7250000, status: 'Hoàn thành', payment: 'Ví MoMo', channel: 'Shopee' },
    { id: 'DH-2503', customer: 'Đặng Quốc Huy', date: '10/08/2026', items: 1, total: 5290000, status: 'Đã huỷ', payment: 'COD', channel: 'Website' },
    { id: 'DH-2502', customer: 'Bùi Anh Tuấn', date: '09/08/2026', items: 4, total: 28900000, status: 'Đang giao', payment: 'Chuyển khoản', channel: 'Website' },
    { id: 'DH-2501', customer: 'Hoàng Diệu Linh', date: '09/08/2026', items: 6, total: 12480000, status: 'Hoàn thành', payment: 'Ví MoMo', channel: 'Facebook' },
    { id: 'DH-2500', customer: 'Ngô Khánh Linh', date: '08/08/2026', items: 2, total: 8400000, status: 'Hoàn tiền', payment: 'Chuyển khoản', channel: 'Shopee' },
    { id: 'DH-2499', customer: 'Trịnh Văn Nam', date: '08/08/2026', items: 1, total: 4990000, status: 'Hoàn thành', payment: 'COD', channel: 'Website' },
    { id: 'DH-2498', customer: 'Lê Hoàng Phúc', date: '07/08/2026', items: 12, total: 118600000, status: 'Hoàn thành', payment: 'Chuyển khoản', channel: 'Đại lý' },
    { id: 'DH-2497', customer: 'Nguyễn Minh Quân', date: '07/08/2026', items: 3, total: 19740000, status: 'Hoàn thành', payment: 'Chuyển khoản', channel: 'Hotline' },
    { id: 'DH-2496', customer: 'Phạm Thu Hà', date: '06/08/2026', items: 2, total: 13800000, status: 'Đang xử lý', payment: 'Chuyển khoản', channel: 'Website' },
    { id: 'DH-2495', customer: 'Vũ Thanh Tùng', date: '06/08/2026', items: 9, total: 74200000, status: 'Hoàn thành', payment: 'Chuyển khoản', channel: 'Đại lý' },
    { id: 'DH-2494', customer: 'Trần Thị Bảo Ngọc', date: '05/08/2026', items: 1, total: 6900000, status: 'Chờ xác nhận', payment: 'COD', channel: 'Facebook' },
    { id: 'DH-2493', customer: 'Bùi Anh Tuấn', date: '05/08/2026', items: 5, total: 41250000, status: 'Hoàn thành', payment: 'Chuyển khoản', channel: 'Website' },
    { id: 'DH-2492', customer: 'Đặng Quốc Huy', date: '04/08/2026', items: 2, total: 1030000, status: 'Hoàn thành', payment: 'Ví MoMo', channel: 'Shopee' },
    { id: 'DH-2491', customer: 'Hoàng Diệu Linh', date: '04/08/2026', items: 3, total: 26480000, status: 'Đã huỷ', payment: 'COD', channel: 'Website' }
  ];

  // Chi tiết một đơn hàng mẫu dùng cho trang don-hang-chi-tiet.html
  var ORDER_DETAIL = {
    id: 'DH-2508',
    date: '12/08/2026 - 09:24',
    status: 'Đang xử lý',
    payment: 'Chuyển khoản ngân hàng - Vietcombank',
    shipping: 'Giao nhanh nội thành (GHN Express)',
    note: 'Khách yêu cầu kiểm tra máy trước khi giao, xuất hoá đơn VAT cho công ty.',
    customer: {
      name: 'Lê Hoàng Phúc',
      company: 'Công ty TNHH 3D Works',
      email: 'phuc.le@3dworks.vn',
      phone: '0987 201 558',
      address: '128 Nguyễn Văn Linh, P. Nam Dương, Q. Hải Châu, TP. Đà Nẵng',
      taxCode: '0401998877'
    },
    lines: [
      { sku: 'FDM-P1S', name: 'Bambu Lab P1S Combo', qty: 2, price: 18500000 },
      { sku: 'VT-PLA1', name: 'Nhựa in PLA+ eSUN 1kg', qty: 10, price: 350000 },
      { sku: 'LK-PEI', name: 'Tấm in PEI từ tính 235x235mm', qty: 4, price: 650000 }
    ],
    shippingFee: 300000,
    discount: 1500000
  };

  var INVENTORY = [
    { sku: 'VT-PLA1', name: 'Nhựa in PLA+ eSUN 1kg', type: 'Vật tư tiêu hao', stock: 320, min: 60, location: 'Kho HCM - Kệ A1', updated: '12/08/2026' },
    { sku: 'VT-PETG', name: 'Nhựa in PETG Sunlu 1kg', type: 'Vật tư tiêu hao', stock: 186, min: 50, location: 'Kho HCM - Kệ A2', updated: '12/08/2026' },
    { sku: 'VT-RES1', name: 'Resin ABS-like Elegoo 1kg', type: 'Vật tư tiêu hao', stock: 42, min: 40, location: 'Kho HCM - Kệ B1', updated: '11/08/2026' },
    { sku: 'VT-TPU', name: 'Nhựa dẻo TPU 95A 0.5kg', type: 'Vật tư tiêu hao', stock: 64, min: 30, location: 'Kho HN - Kệ A3', updated: '10/08/2026' },
    { sku: 'LK-NOZ4', name: 'Đầu phun hardened steel 0.4mm', type: 'Linh kiện', stock: 240, min: 50, location: 'Kho HCM - Ngăn C4', updated: '12/08/2026' },
    { sku: 'LK-PEI', name: 'Tấm in PEI từ tính 235x235mm', type: 'Linh kiện', stock: 78, min: 25, location: 'Kho HCM - Kệ C1', updated: '09/08/2026' },
    { sku: 'LK-HOT', name: 'Bộ hotend all-metal 300°C', type: 'Linh kiện', stock: 4, min: 15, location: 'Kho HN - Ngăn D2', updated: '11/08/2026' },
    { sku: 'FDM-A1M', name: 'Bambu Lab A1 mini', type: 'Máy in', stock: 3, min: 5, location: 'Kho HCM - Khu máy', updated: '12/08/2026' },
    { sku: 'RES-SAT4', name: 'Elegoo Saturn 4 Ultra 16K', type: 'Máy in', stock: 0, min: 3, location: 'Kho HCM - Khu máy', updated: '08/08/2026' },
    { sku: 'IND-X1E', name: 'Bambu Lab X1E bản doanh nghiệp', type: 'Máy in', stock: 2, min: 2, location: 'Kho HN - Khu máy', updated: '07/08/2026' }
  ];

  var MONTHS = ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'];

  var STATS = {
    revenueThisYear: [412, 386, 524, 498, 611, 587, 702, 668, 741, 795, 862, 934], // triệu đồng
    revenueLastYear: [318, 302, 401, 388, 452, 439, 516, 495, 548, 592, 634, 688],
    ordersByMonth: [86, 79, 104, 98, 121, 116, 138, 131, 146, 158, 171, 184],
    categoryShare: [
      { name: 'Máy in FDM', value: 46 },
      { name: 'Máy in Resin', value: 21 },
      { name: 'Vật tư tiêu hao', value: 18 },
      { name: 'Linh kiện & phụ kiện', value: 9 },
      { name: 'Máy in công nghiệp', value: 6 }
    ],
    channelShare: [
      { name: 'Website', value: 44 },
      { name: 'Đại lý', value: 26 },
      { name: 'Shopee', value: 14 },
      { name: 'Hotline', value: 10 },
      { name: 'Facebook', value: 6 }
    ]
  };

  var ACTIVITIES = [
    { icon: 'fas fa-box', color: 'primary', text: 'Đơn hàng <strong>DH-2508</strong> vừa được tạo bởi Lê Hoàng Phúc', time: '9 phút trước' },
    { icon: 'fas fa-exclamation-triangle', color: 'warning', text: 'Sản phẩm <strong>Bambu Lab A1 mini</strong> chỉ còn 3 máy trong kho', time: '42 phút trước' },
    { icon: 'fas fa-truck', color: 'info', text: 'Đơn <strong>DH-2506</strong> đã bàn giao cho GHN Express', time: '2 giờ trước' },
    { icon: 'fas fa-user-plus', color: 'success', text: 'Khách hàng mới <strong>Trịnh Văn Nam</strong> đăng ký tài khoản', time: '5 giờ trước' },
    { icon: 'fas fa-undo', color: 'danger', text: 'Yêu cầu hoàn tiền đơn <strong>DH-2500</strong> đã được duyệt', time: 'Hôm qua' }
  ];

  /* ------------------------------ Khung giao diện ------------------------------ */

  var navLink = function (item, active) {
    return (
      '<a class="nav-link' +
      (item.key === active ? ' active' : '') +
      '" href="' +
      item.href +
      '" role="button" aria-expanded="false">' +
      '<div class="d-flex align-items-center"><span class="nav-link-icon"><span class="' +
      item.icon +
      '"></span></span><span class="nav-link-text ps-1">' +
      escapeHtml(item.text) +
      '</span></div></a>'
    );
  };

  var sidebar = function (active) {
    var html =
      '<nav class="navbar navbar-light navbar-vertical navbar-expand-xl">' +
      '<div class="d-flex align-items-center">' +
      '<div class="toggle-icon-wrapper">' +
      '<button class="btn navbar-toggler-humburger-icon navbar-vertical-toggle" data-bs-toggle="tooltip" data-bs-placement="left" title="Thu gọn menu"><span class="navbar-toggle-icon"><span class="toggle-line"></span></span></button>' +
      '</div>' +
      '<a class="navbar-brand" href="index.html"><div class="d-flex align-items-center py-3">' +
      '<img class="app3d-logo me-2" src="assets/img/logo.png" alt="IN3D Store" />' +
      '<span class="font-sans-serif">' + BRAND + '</span></div></a>' +
      '</div>' +
      '<div class="collapse navbar-collapse" id="navbarVerticalCollapse">' +
      '<div class="navbar-vertical-content scrollbar">' +
      '<ul class="navbar-nav flex-column mb-3" id="navbarVerticalNav">';

    NAV.forEach(function (group, index) {
      html +=
        '<li class="nav-item">' +
        '<div class="row navbar-vertical-label-wrapper' +
        (index === 0 ? '' : ' mt-3') +
        ' mb-2"><div class="col-auto navbar-vertical-label">' +
        escapeHtml(group.label) +
        '</div><div class="col ps-0"><hr class="mb-0 navbar-vertical-divider" /></div></div>';
      group.items.forEach(function (item) {
        html += navLink(item, active);
      });
      html += '</li>';
    });

    html += '</ul></div></div></nav>';

    write(html);

    // Áp dụng kiểu thanh điều hướng mà người dùng đã chọn trước đó
    var navbarStyle = localStorage.getItem('navbarStyle');
    var navbarVertical = document.querySelector('.navbar-vertical');
    if (navbarStyle && navbarStyle !== 'transparent' && navbarVertical) {
      navbarVertical.classList.add('navbar-' + navbarStyle);
    }
  };

  var topbar = function (title) {
    var html =
      '<nav class="navbar navbar-light navbar-glass navbar-top navbar-expand">' +
      '<button class="btn navbar-toggler-humburger-icon navbar-toggler me-1 me-sm-3" type="button" data-bs-toggle="collapse" data-bs-target="#navbarVerticalCollapse" aria-controls="navbarVerticalCollapse" aria-expanded="false" aria-label="Mở menu"><span class="navbar-toggle-icon"><span class="toggle-line"></span></span></button>' +
      '<a class="navbar-brand me-1 me-sm-3" href="index.html"><div class="d-flex align-items-center">' +
      '<img class="app3d-logo me-2" src="assets/img/logo.png" alt="IN3D Store" />' +
      '<span class="font-sans-serif">' + BRAND + '</span></div></a>' +
      '<ul class="navbar-nav align-items-center d-none d-lg-block">' +
      '<li class="nav-item"><div class="search-box" data-list=\'{"valueNames":["title"]}\'>' +
      '<form class="position-relative" data-bs-toggle="search" data-bs-display="static" onsubmit="return false;">' +
      '<input class="form-control search-input fuzzy-search" type="search" placeholder="Tìm sản phẩm, đơn hàng, khách hàng..." aria-label="Tìm kiếm" />' +
      '<span class="fas fa-search search-box-icon"></span></form>' +
      '<div class="btn-close-falcon-container position-absolute end-0 top-50 translate-middle shadow-none" data-bs-dismiss="search"><div class="btn-close-falcon" aria-label="Đóng"></div></div>' +
      '<div class="dropdown-menu border font-base start-0 mt-2 py-0 overflow-hidden w-100">' +
      '<div class="scrollbar list py-3" style="max-height: 24rem;">' +
      '<h6 class="dropdown-header fw-medium text-uppercase px-card fs--2 pt-0 pb-2">Truy cập nhanh</h6>' +
      '<a class="dropdown-item fs--1 px-card py-1 hover-primary" href="don-hang.html"><div class="d-flex align-items-center"><span class="fas fa-circle me-2 text-300 fs--2"></span><div class="fw-normal title">Bán hàng <span class="fas fa-chevron-right mx-1 text-500 fs--2" data-fa-transform="shrink-2"></span> Đơn hàng</div></div></a>' +
      '<a class="dropdown-item fs--1 px-card py-1 hover-primary" href="san-pham.html"><div class="d-flex align-items-center"><span class="fas fa-circle me-2 text-300 fs--2"></span><div class="fw-normal title">Sản phẩm <span class="fas fa-chevron-right mx-1 text-500 fs--2" data-fa-transform="shrink-2"></span> Danh sách máy in 3D</div></div></a>' +
      '<a class="dropdown-item fs--1 px-card py-1 hover-primary" href="kho.html"><div class="d-flex align-items-center"><span class="fas fa-circle me-2 text-300 fs--2"></span><div class="fw-normal title">Kho <span class="fas fa-chevron-right mx-1 text-500 fs--2" data-fa-transform="shrink-2"></span> Vật tư tiêu hao</div></div></a>' +
      '<hr class="bg-200 dark__bg-900" />' +
      '<h6 class="dropdown-header fw-medium text-uppercase px-card fs--2 pt-0 pb-2">Bộ lọc gợi ý</h6>' +
      '<a class="dropdown-item px-card py-1 fs-0" href="don-hang.html"><div class="d-flex align-items-center"><span class="badge fw-medium text-decoration-none me-2 badge-soft-warning">đơn hàng:</span><div class="flex-1 fs--1 title">Đơn chờ xác nhận hôm nay</div></div></a>' +
      '<a class="dropdown-item px-card py-1 fs-0" href="kho.html"><div class="d-flex align-items-center"><span class="badge fw-medium text-decoration-none me-2 badge-soft-danger">kho:</span><div class="flex-1 fs--1 title">Vật tư dưới mức tồn tối thiểu</div></div></a>' +
      '<a class="dropdown-item px-card py-1 fs-0" href="khach-hang.html"><div class="d-flex align-items-center"><span class="badge fw-medium text-decoration-none me-2 badge-soft-info">khách hàng:</span><div class="flex-1 fs--1 title">Đại lý có doanh số cao nhất</div></div></a>' +
      '</div>' +
      '<div class="text-center mt-n3"><p class="fallback fw-bold fs-1 d-none">Không tìm thấy kết quả.</p></div>' +
      '</div></div></li></ul>' +
      '<ul class="navbar-nav navbar-nav-icons ms-auto flex-row align-items-center">' +
      '<li class="nav-item"><div class="theme-control-toggle fa-icon-wait px-2">' +
      '<input class="form-check-input ms-0 theme-control-toggle-input" id="themeControlToggle" type="checkbox" data-theme-control="theme" value="dark" />' +
      '<label class="mb-0 theme-control-toggle-label theme-control-toggle-light" for="themeControlToggle" data-bs-toggle="tooltip" data-bs-placement="left" title="Chuyển sang giao diện sáng"><span class="fas fa-sun fs-0"></span></label>' +
      '<label class="mb-0 theme-control-toggle-label theme-control-toggle-dark" for="themeControlToggle" data-bs-toggle="tooltip" data-bs-placement="left" title="Chuyển sang giao diện tối"><span class="fas fa-moon fs-0"></span></label>' +
      '</div></li>' +
      '<li class="nav-item"><a class="nav-link px-0 notification-indicator notification-indicator-warning notification-indicator-fill fa-icon-wait" href="don-hang.html"><span class="fas fa-shopping-cart" data-fa-transform="shrink-7" style="font-size: 33px;"></span><span class="notification-indicator-number">2</span></a></li>' +
      '<li class="nav-item dropdown">' +
      '<a class="nav-link notification-indicator notification-indicator-primary px-0 fa-icon-wait" id="navbarDropdownNotification" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="fas fa-bell" data-fa-transform="shrink-6" style="font-size: 33px;"></span></a>' +
      '<div class="dropdown-menu dropdown-menu-end dropdown-menu-card dropdown-menu-notification" aria-labelledby="navbarDropdownNotification">' +
      '<div class="card card-notification shadow-none">' +
      '<div class="card-header"><div class="row justify-content-between align-items-center"><div class="col-auto"><h6 class="card-header-title mb-0">Thông báo</h6></div><div class="col-auto ps-0 ps-sm-3"><a class="card-link fw-normal" href="#!">Đánh dấu đã đọc</a></div></div></div>' +
      '<div class="scrollbar-overlay" style="max-height:19rem">' +
      '<div class="list-group list-group-flush fw-normal fs--1">' +
      '<div class="list-group-title border-bottom">MỚI</div>' +
      '<div class="list-group-item"><a class="notification notification-flush notification-unread" href="don-hang-chi-tiet.html"><div class="notification-avatar"><div class="avatar avatar-2xl me-3"><div class="avatar-name rounded-circle bg-soft-primary text-primary"><span>ĐH</span></div></div></div><div class="notification-body"><p class="mb-1">Đơn hàng <strong>DH-2508</strong> vừa được tạo, tổng giá trị 46.700.000 ₫</p><span class="notification-time">9 phút trước</span></div></a></div>' +
      '<div class="list-group-item"><a class="notification notification-flush notification-unread" href="kho.html"><div class="notification-avatar"><div class="avatar avatar-2xl me-3"><div class="avatar-name rounded-circle bg-soft-warning text-warning"><span>!</span></div></div></div><div class="notification-body"><p class="mb-1"><strong>Bambu Lab A1 mini</strong> sắp hết hàng - còn 3 máy</p><span class="notification-time">42 phút trước</span></div></a></div>' +
      '<div class="list-group-title border-bottom">TRƯỚC ĐÓ</div>' +
      '<div class="list-group-item"><a class="notification notification-flush" href="don-hang.html"><div class="notification-avatar"><div class="avatar avatar-2xl me-3"><div class="avatar-name rounded-circle bg-soft-info text-info"><span>GH</span></div></div></div><div class="notification-body"><p class="mb-1">Đơn <strong>DH-2506</strong> đã bàn giao cho đơn vị vận chuyển</p><span class="notification-time">2 giờ trước</span></div></a></div>' +
      '</div></div>' +
      '<div class="card-footer text-center border-top"><a class="card-link d-block" href="don-hang.html">Xem tất cả</a></div>' +
      '</div></div></li>' +
      '<li class="nav-item dropdown">' +
      (function () {
        var p = layPhien();
        var ten = p && p.hoTen ? p.hoTen : 'Chưa đăng nhập';
        var email = p && p.email ? p.email : 'Bấm để đăng nhập';
        var tat = p && p.hoTen
          ? p.hoTen.split(' ').slice(-2).map(function (w) { return w.charAt(0); }).join('').toUpperCase()
          : '?';
        return '<a class="nav-link pe-0 ps-2" id="navbarDropdownUser" href="#" role="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><div class="avatar avatar-xl"><div class="avatar-name rounded-circle bg-soft-primary text-primary"><span>' + escapeHtml(tat) + '</span></div></div></a>' +
          '<div class="dropdown-menu dropdown-caret dropdown-menu-end py-0" aria-labelledby="navbarDropdownUser">' +
          '<div class="bg-white dark__bg-1000 rounded-2 py-2">' +
          '<div class="px-3 py-2"><h6 class="mb-0">' + escapeHtml(ten) + '</h6><p class="fs--2 mb-0 text-500">' + escapeHtml(email) + '</p></div>' +
          '<div class="dropdown-divider"></div>' +
          '<a class="dropdown-item" href="cai-dat.html"><span class="fas fa-user-cog me-2"></span>Hồ sơ &amp; cài đặt</a>' +
          '<a class="dropdown-item" href="bao-cao.html"><span class="fas fa-chart-line me-2"></span>Báo cáo doanh thu</a>' +
          '<div class="dropdown-divider"></div>' +
          (p
            ? '<a class="dropdown-item" href="#!" onclick="App3D.dangXuat();return false;"><span class="fas fa-sign-out-alt me-2"></span>Đăng xuất</a>'
            : '<a class="dropdown-item" href="dang-nhap.html"><span class="fas fa-sign-in-alt me-2"></span>Đăng nhập</a>') +
          '</div></div>';
      })() +
      '</li>' +
      '</ul></nav>';

    write(html);
  };

  var footer = function () {
    var year = new Date().getFullYear();
    write(
      '<footer class="footer"><div class="row g-0 justify-content-between fs--1 mt-4 mb-3">' +
      '<div class="col-12 col-sm-auto text-center"><p class="mb-0 text-600">' +
      BRAND +
      ' &mdash; ' +
      TAGLINE +
      ' <span class="d-none d-sm-inline-block">| </span><br class="d-sm-none" /> ' +
      year +
      ' &copy; Bản quyền thuộc IN3D Store</p></div>' +
      '<div class="col-12 col-sm-auto text-center"><p class="mb-0 text-600">Phiên bản 1.0.0 &middot; Dữ liệu: ' +
      (DATA_SOURCE === 'java' ? 'Backend Java' : DATA_SOURCE === 'supabase' ? 'Supabase' : 'Mẫu (chưa kết nối backend)') +
      '</p></div>' +
      '</div></footer>'
    );
  };

  /* ------------------------------ Khối tiêu đề trang --------------------------- */

  var pageHeader = function (title, subtitle, actionsHtml) {
    write(
      '<div class="card mb-3"><div class="card-body"><div class="row flex-between-center g-3">' +
      '<div class="col-md"><h5 class="mb-2 mb-md-0">' +
      escapeHtml(title) +
      '</h5><p class="fs--1 mb-0 text-600">' +
      (subtitle || '') +
      '</p></div>' +
      '<div class="col-auto">' +
      (actionsHtml || '') +
      '</div></div></div></div>'
    );
  };

  /* -------------------------------- Bảng dữ liệu ------------------------------- */

  var productRows = function (list) {
    return (list || PRODUCTS)
      .map(function (p) {
        var margin = Math.round(((p.price - p.cost) / p.price) * 100);
        return (
          '<tr class="btn-reveal-trigger">' +
          '<td class="align-middle white-space-nowrap"><div class="d-flex align-items-center">' +
          '<img class="anh-sp-nho me-2" src="' + (p.img || anhSanPham(p.name)) + '" alt="" />' +
          '<div class="flex-1"><h6 class="mb-0 fs--1 name">' + escapeHtml(p.name) + '</h6>' +
          '<p class="fs--2 mb-0 text-500">' + escapeHtml(p.brand) + '</p></div></div></td>' +
          '<td class="align-middle white-space-nowrap sku"><span class="badge badge-soft-secondary">' + escapeHtml(p.sku) + '</span></td>' +
          '<td class="align-middle white-space-nowrap category">' + escapeHtml(p.cat) + '</td>' +
          '<td class="align-middle text-end price" data-price="' + p.price + '">' + money(p.price) + '</td>' +
          '<td class="align-middle text-center">' + margin + '%</td>' +
          '<td class="align-middle text-center stock">' + number(p.stock) + '</td>' +
          '<td class="align-middle text-center sold">' + number(p.sold) + '</td>' +
          '<td class="align-middle text-center">' + stockBadge(p.stock, p.min) + '</td>' +
          '<td class="align-middle white-space-nowrap text-end"><div class="dropdown font-sans-serif position-static">' +
          '<button class="btn btn-link text-600 btn-sm dropdown-toggle btn-reveal" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="fas fa-ellipsis-h fs--1"></span></button>' +
          '<div class="dropdown-menu dropdown-menu-end border py-2">' +
          '<a class="dropdown-item" href="them-san-pham.html">Chỉnh sửa</a>' +
          '<a class="dropdown-item" href="kho.html">Nhập kho</a>' +
          '<div class="dropdown-divider"></div>' +
          '<a class="dropdown-item text-danger" href="#!">Ngừng kinh doanh</a>' +
          '</div></div></td></tr>'
        );
      })
      .join('');
  };

  var orderRows = function (list) {
    return (list || ORDERS)
      .map(function (o) {
        return (
          '<tr class="btn-reveal-trigger">' +
          '<td class="align-middle white-space-nowrap order"><a class="fw-semi-bold" href="don-hang-chi-tiet.html">' + escapeHtml(o.id) + '</a></td>' +
          '<td class="align-middle white-space-nowrap customer">' + escapeHtml(o.customer) + '</td>' +
          '<td class="align-middle white-space-nowrap channel"><span class="badge badge-soft-secondary">' + escapeHtml(o.channel) + '</span></td>' +
          '<td class="align-middle text-center items">' + o.items + '</td>' +
          '<td class="align-middle white-space-nowrap payment">' + escapeHtml(o.payment) + '</td>' +
          '<td class="align-middle text-center fs-0 white-space-nowrap status">' + statusBadge(o.status) + '</td>' +
          '<td class="align-middle white-space-nowrap date">' + escapeHtml(o.date) + '</td>' +
          '<td class="align-middle text-end fw-semi-bold total">' + money(o.total) + '</td>' +
          '<td class="align-middle white-space-nowrap text-end"><div class="dropdown font-sans-serif position-static">' +
          '<button class="btn btn-link text-600 btn-sm dropdown-toggle btn-reveal" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="fas fa-ellipsis-h fs--1"></span></button>' +
          '<div class="dropdown-menu dropdown-menu-end border py-2">' +
          (o.dbId
            ? '<h6 class="dropdown-header">Đổi trạng thái</h6>' +
              Object.keys(TT_MAP).map(function (k) {
                return '<a class="dropdown-item" href="#!" onclick="App3D.doiTrangThai(' + o.dbId + ',\'' + k + '\');return false;">' + TT_MAP[k] + '</a>';
              }).join('') +
              '<div class="dropdown-divider"></div>' +
              '<a class="dropdown-item text-success" href="#!" onclick="App3D.danhDauDaTT(' + o.dbId + ');return false;">Đã thanh toán</a>' +
              '<a class="dropdown-item text-danger" href="#!" onclick="App3D.xoaDon(' + o.dbId + ');return false;">Xoá đơn</a>'
            : '<a class="dropdown-item" href="don-hang-chi-tiet.html">Xem chi tiết</a>' +
              '<a class="dropdown-item" href="#!">In hoá đơn</a>' +
              '<div class="dropdown-divider"></div>' +
              '<a class="dropdown-item text-danger" href="#!">Huỷ đơn</a>') +
          '</div></div></td></tr>'
        );
      })
      .join('');
  };

  var customerRows = function (list) {
    return (list || CUSTOMERS)
      .map(function (c) {
        var initials = c.name
          .split(' ')
          .slice(-2)
          .map(function (w) {
            return w.charAt(0);
          })
          .join('');
        return (
          '<tr class="btn-reveal-trigger">' +
          '<td class="align-middle white-space-nowrap"><div class="d-flex align-items-center">' +
          '<div class="avatar avatar-xl me-2"><div class="avatar-name rounded-circle bg-soft-info text-info"><span>' + escapeHtml(initials) + '</span></div></div>' +
          '<div class="flex-1"><h6 class="mb-0 fs--1 name">' + escapeHtml(c.name) + '</h6>' +
          '<p class="fs--2 mb-0 text-500">' + escapeHtml(c.id) + '</p></div></div></td>' +
          '<td class="align-middle white-space-nowrap email"><a href="mailto:' + escapeHtml(c.email) + '">' + escapeHtml(c.email) + '</a></td>' +
          '<td class="align-middle white-space-nowrap phone"><a href="tel:' + escapeHtml(c.phone.replace(/\s/g, '')) + '">' + escapeHtml(c.phone) + '</a></td>' +
          '<td class="align-middle white-space-nowrap city">' + escapeHtml(c.city) + '</td>' +
          '<td class="align-middle white-space-nowrap group"><span class="badge badge-soft-primary">' + escapeHtml(c.group) + '</span></td>' +
          '<td class="align-middle text-center orders">' + c.orders + '</td>' +
          '<td class="align-middle text-end fw-semi-bold spent">' + money(c.spent) + '</td>' +
          '<td class="align-middle white-space-nowrap since">' + escapeHtml(c.since) + '</td>' +
          '<td class="align-middle white-space-nowrap text-end"><div class="dropdown font-sans-serif position-static">' +
          '<button class="btn btn-link text-600 btn-sm dropdown-toggle btn-reveal" type="button" data-bs-toggle="dropdown" aria-haspopup="true" aria-expanded="false"><span class="fas fa-ellipsis-h fs--1"></span></button>' +
          '<div class="dropdown-menu dropdown-menu-end border py-2">' +
          '<a class="dropdown-item" href="#!">Xem hồ sơ</a>' +
          '<a class="dropdown-item" href="don-hang.html">Lịch sử mua hàng</a>' +
          '<div class="dropdown-divider"></div>' +
          '<a class="dropdown-item text-danger" href="#!">Khoá tài khoản</a>' +
          '</div></div></td></tr>'
        );
      })
      .join('');
  };

  var inventoryRows = function (list) {
    return (list || INVENTORY)
      .map(function (i) {
        var percent = Math.min(100, Math.round((i.stock / (i.min * 4 || 1)) * 100));
        var bar = i.stock <= 0 ? 'danger' : i.stock <= i.min ? 'warning' : 'success';
        return (
          '<tr>' +
          '<td class="align-middle white-space-nowrap sku"><span class="badge badge-soft-secondary">' + escapeHtml(i.sku) + '</span></td>' +
          '<td class="align-middle name"><div class="d-flex align-items-center"><img class="anh-sp-nho me-2" src="' + anhSanPham(i.name) + '" alt="" /><h6 class="mb-0 fs--1">' + escapeHtml(i.name) + '</h6></div></td>' +
          '<td class="align-middle white-space-nowrap type">' + escapeHtml(i.type) + '</td>' +
          '<td class="align-middle text-center stock fw-semi-bold">' + number(i.stock) + '</td>' +
          '<td class="align-middle text-center text-500">' + number(i.min) + '</td>' +
          '<td class="align-middle" style="min-width:8rem"><div class="progress" style="height:6px"><div class="progress-bar bg-' + bar + '" role="progressbar" style="width:' + percent + '%" aria-valuenow="' + percent + '" aria-valuemin="0" aria-valuemax="100"></div></div></td>' +
          '<td class="align-middle white-space-nowrap location">' + escapeHtml(i.location) + '</td>' +
          '<td class="align-middle white-space-nowrap updated text-500">' + escapeHtml(i.updated) + '</td>' +
          '<td class="align-middle text-center">' + stockBadge(i.stock, i.min) + '</td>' +
          '<td class="align-middle text-end"><button class="btn btn-sm btn-falcon-default" type="button"><span class="fas fa-plus me-1"></span>Nhập</button></td>' +
          '</tr>'
        );
      })
      .join('');
  };

  var activityList = function () {
    return ACTIVITIES.map(function (a) {
      return (
        '<div class="border-bottom border-200 py-x1"><div class="d-flex align-items-center">' +
        '<div class="avatar avatar-xl me-3"><div class="avatar-name rounded-circle bg-soft-' + a.color + ' text-' + a.color + '"><span class="' + a.icon + ' fs--1"></span></div></div>' +
        '<div class="flex-1"><p class="mb-0 fs--1">' + a.text + '</p>' +
        '<span class="fs--2 text-500">' + a.time + '</span></div></div></div>'
      );
    }).join('');
  };

  /* ---------------------------------- Biểu đồ ---------------------------------- */

  var chartTheme = function () {
    var dark = document.documentElement.classList.contains('dark');
    return {
      dark: dark,
      text: dark ? '#9da9bb' : '#5e6e82',
      line: dark ? '#232e3c' : '#edf2f9',
      tooltipBg: dark ? '#121e2d' : '#fff'
    };
  };

  var PALETTE = ['#76b900', '#f5b400', '#00d27a', '#c49000', '#a3e635', '#748194'];

  var initChart = function (id, buildOption) {
    var el = document.getElementById(id);
    if (!el || !window.echarts) return null;
    var chart = window.echarts.init(el);
    var render = function () {
      chart.setOption(buildOption(chartTheme()), true);
    };
    render();
    window.addEventListener('resize', function () {
      chart.resize();
    });
    // Vẽ lại khi người dùng đổi giao diện sáng/tối (theme.js phát sự kiện trên body)
    document.body.addEventListener('clickControl', function (e) {
      if (e.detail && e.detail.control === 'theme') {
        setTimeout(render, 50);
      }
    });
    return chart;
  };

  var revenueChart = function (id) {
    return initChart(id, function (t) {
      return {
        color: PALETTE,
        tooltip: {
          trigger: 'axis',
          backgroundColor: t.tooltipBg,
          borderColor: t.line,
          textStyle: { color: t.text },
          formatter: function (params) {
            var out = params[0].axisValue + '<br/>';
            params.forEach(function (p) {
              out += p.marker + ' ' + p.seriesName + ': <strong>' + number(p.value) + ' triệu ₫</strong><br/>';
            });
            return out;
          }
        },
        legend: { data: ['Năm nay', 'Năm trước'], textStyle: { color: t.text }, bottom: 0 },
        grid: { left: 8, right: 12, top: 24, bottom: 36, containLabel: true },
        xAxis: {
          type: 'category',
          data: MONTHS,
          axisLine: { lineStyle: { color: t.line } },
          axisTick: { show: false },
          axisLabel: { color: t.text }
        },
        yAxis: {
          type: 'value',
          splitLine: { lineStyle: { color: t.line } },
          axisLabel: { color: t.text, formatter: '{value} tr' }
        },
        series: [
          {
            name: 'Năm nay',
            type: 'line',
            smooth: true,
            symbolSize: 6,
            lineStyle: { width: 3 },
            areaStyle: { opacity: 0.15 },
            data: STATS.revenueThisYear
          },
          {
            name: 'Năm trước',
            type: 'line',
            smooth: true,
            symbolSize: 6,
            lineStyle: { width: 2, type: 'dashed' },
            data: STATS.revenueLastYear
          }
        ]
      };
    });
  };

  var pieChart = function (id, data, title) {
    return initChart(id, function (t) {
      return {
        color: PALETTE,
        tooltip: {
          trigger: 'item',
          backgroundColor: t.tooltipBg,
          borderColor: t.line,
          textStyle: { color: t.text },
          formatter: '{b}: <strong>{c}%</strong>'
        },
        legend: { orient: 'horizontal', bottom: 0, textStyle: { color: t.text } },
        series: [
          {
            name: title || '',
            type: 'pie',
            radius: ['55%', '78%'],
            center: ['50%', '45%'],
            avoidLabelOverlap: true,
            itemStyle: { borderWidth: 2, borderColor: t.dark ? '#0b1727' : '#fff' },
            label: { show: false },
            data: data
          }
        ]
      };
    });
  };

  var ordersChart = function (id) {
    return initChart(id, function (t) {
      return {
        color: PALETTE,
        tooltip: {
          trigger: 'axis',
          backgroundColor: t.tooltipBg,
          borderColor: t.line,
          textStyle: { color: t.text },
          formatter: '{b}: <strong>{c} đơn</strong>'
        },
        grid: { left: 8, right: 12, top: 20, bottom: 20, containLabel: true },
        xAxis: {
          type: 'category',
          data: MONTHS,
          axisLine: { lineStyle: { color: t.line } },
          axisTick: { show: false },
          axisLabel: { color: t.text }
        },
        yAxis: { type: 'value', splitLine: { lineStyle: { color: t.line } }, axisLabel: { color: t.text } },
        series: [
          {
            type: 'bar',
            barMaxWidth: 20,
            itemStyle: { borderRadius: [4, 4, 0, 0] },
            data: STATS.ordersByMonth
          }
        ]
      };
    });
  };

  var sparkline = function (id, data, color) {
    return initChart(id, function () {
      return {
        grid: { left: 0, right: 0, top: 4, bottom: 4 },
        xAxis: { type: 'category', show: false, boundaryGap: false, data: data.map(function (_, i) { return i; }) },
        yAxis: { type: 'value', show: false, min: Math.min.apply(null, data) * 0.9 },
        tooltip: { show: false },
        series: [
          {
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: { width: 2, color: color || PALETTE[0] },
            areaStyle: { opacity: 0.2, color: color || PALETTE[0] },
            data: data
          }
        ]
      };
    });
  };

  /* ------------------- Dữ liệu THẬT từ backend (Java / Supabase) ---------------- */
  /*  Ưu tiên backend Java (cổng 8090); Java tắt thì đọc Supabase REST;            */
  /*  cả hai không có thì giữ dữ liệu mẫu để trang vẫn xem được.                    */

  var JAVA_API = 'http://localhost:8090/api';
  var SB_URL = 'https://nmptxzbtngztzxpwdprs.supabase.co';
  var SB_KEY = 'sb_publishable_OJjvcAtUPib9bvdNNA-Bjg_vbz7CuQ-';
  var DATA_SOURCE = 'demo';

  var TT_MAP = { cho_xac_nhan: 'Chờ xác nhận', dang_xu_ly: 'Đang xử lý', dang_giao: 'Đang giao', hoan_thanh: 'Hoàn thành', da_huy: 'Đã huỷ' };
  var PT_MAP = { cod: 'COD', chuyen_khoan: 'Chuyển khoản', vi_dien_tu: 'Ví điện tử', the: 'Thẻ' };

  // Tải đồng bộ để dữ liệu sẵn sàng TRƯỚC khi trang vẽ bảng (list.js, phân trang chạy trên dữ liệu thật)
  var taiDongBo = function (url, headers) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      if (headers) {
        Object.keys(headers).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });
      }
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) return JSON.parse(xhr.responseText);
    } catch (e) { /* backend tắt / mất mạng */ }
    return null;
  };

  var ngayVN = function (iso) {
    try { return new Date(iso).toLocaleDateString('vi-VN'); } catch (e) { return ''; }
  };

  var napDuLieuThat = function () {
    var don = null;
    var sp = null;

    // 1) Backend Java
    var donJava = taiDongBo(JAVA_API + '/don-hang');
    var spJava = taiDongBo(JAVA_API + '/san-pham?tatCa=true');
    if (donJava && spJava) {
      DATA_SOURCE = 'java';
      don = donJava.map(function (d) {
        var tt = (d.thanhToan && d.thanhToan[0]) || null;
        return {
          dbId: d.id,
          id: d.maDon,
          customer: d.tenKhach,
          phone: d.soDienThoai || '',
          date: ngayVN(d.createdAt),
          items: (d.chiTiet || []).reduce(function (s, ct) { return s + (ct.soLuong || 0); }, 0),
          total: d.tongTien || 0,
          status: TT_MAP[d.trangThai] || d.trangThai,
          payment: tt ? (PT_MAP[tt.phuongThuc] || 'COD') + (tt.trangThai === 'da_thanh_toan' ? ' (đã TT)' : '') : 'COD',
          channel: 'Website'
        };
      });
      sp = spJava.map(function (s) {
        return {
          dbId: s.id, sku: 'SP-' + s.id, name: s.ten, brand: 'IN3D Shop',
          cat: s.dangBan ? 'Đang bán' : 'Đang ẩn', price: s.gia || 0,
          cost: Math.round((s.gia || 0) * 0.7), // giá vốn tạm tính 70% (DB chưa có cột giá vốn)
          stock: s.tonKho || 0, min: 5, sold: 0, rating: 5, img: ''
        };
      });
    } else {
      // 2) Supabase REST (đơn hàng chỉ đọc được khi có quyền — khách vãng lai sẽ thấy trống, đúng bảo mật)
      var h = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
      var spSb = taiDongBo(SB_URL + '/rest/v1/san_pham?select=*&order=id', h);
      if (spSb) {
        DATA_SOURCE = 'supabase';
        sp = spSb.map(function (s) {
          return {
            dbId: s.id, sku: 'SP-' + s.id, name: s.ten, brand: 'IN3D Shop',
            cat: s.dang_ban ? 'Đang bán' : 'Đang ẩn', price: Number(s.gia) || 0,
            cost: Math.round((Number(s.gia) || 0) * 0.7),
            stock: s.ton_kho || 0, min: 5, sold: 0, rating: 5, img: ''
          };
        });
      }
    }

    if (sp && sp.length) {
      PRODUCTS = sp;
      INVENTORY = sp.map(function (s) {
        return { sku: s.sku, name: s.name, type: s.cat, stock: s.stock, min: s.min, location: 'Kho chính', updated: ngayVN(new Date().toISOString()) };
      });
    }
    if (don) {
      ORDERS = don;
      // Gom nhóm khách hàng từ đơn hàng thật
      var nhom = {};
      don.forEach(function (o) {
        var k = o.customer + '|' + o.phone;
        if (!nhom[k]) nhom[k] = { id: 'KH-' + (Object.keys(nhom).length + 1), name: o.customer, email: '—', phone: o.phone || '—', city: '—', group: 'Khách lẻ', orders: 0, spent: 0, since: o.date };
        nhom[k].orders += 1;
        nhom[k].spent += o.total;
        nhom[k].since = o.date;
      });
      var ds = Object.keys(nhom).map(function (k) { return nhom[k]; });
      if (ds.length) CUSTOMERS = ds;
    }

    // Tài khoản đăng ký (bảng nguoi_dung) — chỉ đọc được khi admin đã đăng nhập (token)
    var phien = layPhien();
    if (DATA_SOURCE === 'java' && phien && phien.token) {
      var users = taiDongBo(JAVA_API + '/nguoi-dung', { Authorization: 'Bearer ' + phien.token });
      if (users && users.length) {
        var taiKhoan = users.map(function (u) {
          var donCua = (ORDERS || []).filter(function (o) { return o.customer === u.hoTen; });
          return {
            id: 'KH-' + u.id, name: u.hoTen, email: u.email, phone: u.soDienThoai || '—',
            city: u.diaChi || '—', group: u.vaiTro === 'admin' ? 'Quản trị' : 'Khách hàng',
            orders: donCua.length,
            spent: donCua.reduce(function (s, o) { return s + o.total; }, 0),
            since: ngayVN(u.createdAt)
          };
        });
        // Ghép thêm khách vãng lai (đặt đơn nhưng chưa có tài khoản)
        var tenCoTaiKhoan = {};
        users.forEach(function (u) { tenCoTaiKhoan[u.hoTen] = true; });
        CUSTOMERS = taiKhoan.concat((CUSTOMERS || []).filter(function (c) { return c.group === 'Khách lẻ' && !tenCoTaiKhoan[c.name]; }));
      }
    }
  };

  // Phiên đăng nhập (token backend Java) lưu trên trình duyệt
  var layPhien = function () {
    try { return JSON.parse(localStorage.getItem('in3d_phien')); } catch (e) { return null; }
  };

  var dangXuat = function () {
    localStorage.removeItem('in3d_phien');
    window.location.href = 'dang-nhap.html';
  };

  napDuLieuThat();

  /* ------------------ Thao tác đơn hàng (chỉ khi có backend Java) --------------- */

  var goiJavaDongBo = function (method, duongDan, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, JAVA_API + duongDan, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    try { xhr.send(body ? JSON.stringify(body) : null); } catch (e) { alert('Không gọi được backend Java (đã chạy chưa?)'); return false; }
    if (xhr.status >= 200 && xhr.status < 300) return true;
    alert('Lỗi từ backend: HTTP ' + xhr.status);
    return false;
  };

  var doiTrangThai = function (dbId, tt) {
    if (goiJavaDongBo('PUT', '/don-hang/' + dbId + '/trang-thai', { trangThai: tt })) location.reload();
  };

  var danhDauDaTT = function (dbId) {
    if (goiJavaDongBo('PUT', '/don-hang/' + dbId + '/da-thanh-toan', null)) location.reload();
  };

  var xoaDon = function (dbId) {
    if (!confirm('Xoá đơn hàng này? Hành động không hoàn tác được.')) return;
    if (goiJavaDongBo('DELETE', '/don-hang/' + dbId, null)) location.reload();
  };

  /* ---------------------------------- Xuất API --------------------------------- */

  return {
    dataSource: DATA_SOURCE,
    doiTrangThai: doiTrangThai,
    danhDauDaTT: danhDauDaTT,
    xoaDon: xoaDon,
    layPhien: layPhien,
    dangXuat: dangXuat,
    anhSanPham: anhSanPham,
    brand: BRAND,
    tagline: TAGLINE,
    categories: CATEGORIES,
    products: PRODUCTS,
    customers: CUSTOMERS,
    orders: ORDERS,
    orderDetail: ORDER_DETAIL,
    inventory: INVENTORY,
    stats: STATS,
    months: MONTHS,
    palette: PALETTE,
    money: money,
    number: number,
    escapeHtml: escapeHtml,
    write: write,
    fill: fill,
    statusBadge: statusBadge,
    stockBadge: stockBadge,
    sidebar: sidebar,
    topbar: topbar,
    footer: footer,
    pageHeader: pageHeader,
    productRows: productRows,
    orderRows: orderRows,
    customerRows: customerRows,
    inventoryRows: inventoryRows,
    activityList: activityList,
    revenueChart: revenueChart,
    pieChart: pieChart,
    ordersChart: ordersChart,
    sparkline: sparkline
  };
})();
