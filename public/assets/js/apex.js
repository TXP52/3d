window.Apex = (function () {
  'use strict';

  var BRAND = 'Bedemaker';
  var JAVA_API = (window.IN3D_API || 'http://localhost:8090/api');

  /* ---------------- Tiện ích ---------------- */

  var vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
  var num = new Intl.NumberFormat('vi-VN');
  var money = function (v) { return vnd.format(v || 0); };
  var number = function (v) { return num.format(v || 0); };

  var esc = function (t) {
    return String(t == null ? '' : t).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  var fill = function (selector, html) {
    var el = document.querySelector(selector);
    if (!el) return;
    el.innerHTML = html;
    // Vẽ lại bảng thì áp dụng lại kiểu sắp xếp và từ khoá đang tìm (xem apDungBang)
    if (typeof apDungBang === 'function' && (el.closest('table.bang') || el.querySelector('table.bang'))) {
      apDungBang();
    }
  };

  var ngayVN = function (iso) {
    try { return new Date(iso).toLocaleDateString('vi-VN'); } catch (e) { return ''; }
  };

  /**
   * Đổi đường dẫn ảnh lưu trong DB thành URL xem được.
   * DB lưu dạng TƯƠNG ĐỐI ("/anh/xxx.jpg") để đổi host/tên miền sau này không chết link.
   */
  var anhDayDu = function (duongDan) {
    if (!duongDan) return '';
    if (/^(https?:)?\/\//.test(duongDan) || duongDan.indexOf('data:') === 0) return duongDan;
    if (duongDan.charAt(0) === '/') return JAVA_API.replace(/\/api$/, '') + duongDan;
    return duongDan;
  };

  /**
   * Ảnh dùng tạm cho sản phẩm CHƯA tải ảnh lên.
   * Trước đây đoán theo tên rồi trả về ảnh trong assets/img/sanpham/ —
   * toàn ảnh thừa của giao diện mẫu (ảnh game), sản phẩm thật hiện lên
   * kèm ảnh chẳng liên quan mà chủ shop tưởng đã có ảnh rồi.
   * Giờ trả ô xám ghi "Chưa có ảnh", nhìn là biết cần tải ảnh lên.
   */
  var anhSanPham = function () {
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">' +
      '<rect width="400" height="300" fill="#eef0f2"/>' +
      '<g fill="none" stroke="#b3bcc6" stroke-width="6" stroke-linejoin="round">' +
      '<path d="M200 96 L252 126 L252 186 L200 216 L148 186 L148 126 Z"/>' +
      '<path d="M148 126 L200 156 L252 126 M200 156 L200 216"/></g>' +
      '<text x="200" y="250" text-anchor="middle" fill="#9aa4ae" '+
      'font-family="Inter,Arial,sans-serif" font-size="18">Chưa có ảnh</text></svg>'
    );
  };

  /* ---------------- Trạng thái & badge ---------------- */

  var TT_MAP = { cho_xac_nhan: 'Chờ xác nhận', dang_xu_ly: 'Đang xử lý', dang_giao: 'Đang giao', hoan_thanh: 'Hoàn thành', da_huy: 'Đã huỷ' };
  var PT_MAP = { cod: 'COD', chuyen_khoan: 'Chuyển khoản', vi_dien_tu: 'Ví điện tử', the: 'Thẻ' };
  var MAU_TT = {
    'Hoàn thành': 'badge-xanh', 'Đang giao': 'badge-duong', 'Đang xử lý': 'badge-duong',
    'Chờ xác nhận': 'badge-vang', 'Đã huỷ': 'badge-xam', 'Hoàn tiền': 'badge-do'
  };

  var badgeTrangThai = function (tt) {
    return '<span class="badge ' + (MAU_TT[tt] || 'badge-xam') + '"><span class="cham"></span>' + esc(tt) + '</span>';
  };

  /* Trạng thái SẢN PHẨM theo quy trình in 3D */
  var TT_SAN_PHAM = {
    du_kien:         { ten: 'Dự kiến',          mau: 'badge-xam',   icon: 'fa-lightbulb' },
    da_dat:          { ten: 'Đã đặt',           mau: 'badge-tim',   icon: 'fa-bookmark' },
    dang_in:         { ten: 'Đang in',          mau: 'badge-cam',   icon: 'fa-print' },
    da_in:           { ten: 'Đã in',            mau: 'badge-duong', icon: 'fa-check-double' },
    san_hang:        { ten: 'Sẵn hàng',         mau: 'badge-xanh',  icon: 'fa-box-open' },
    dang_van_chuyen: { ten: 'Đang vận chuyển',  mau: 'badge-duong', icon: 'fa-truck-fast' },
    thanh_cong:      { ten: 'Thành công',       mau: 'badge-xanh',  icon: 'fa-circle-check' },
    hoan_hang:       { ten: 'Hoàn hàng',        mau: 'badge-do',    icon: 'fa-rotate-left' },
    het_hang:        { ten: 'Hết hàng',         mau: 'badge-toi',   icon: 'fa-ban' }
  };

  /* Loại sản phẩm: hàng bán / hàng mẫu trưng bày / dịch vụ nhận in */
  var LOAI_SAN_PHAM = {
    ban:     { ten: 'Hàng bán', mau: 'badge-xanh', icon: 'fa-tag' },
    mau:     { ten: 'Hàng mẫu', mau: 'badge-tim',  icon: 'fa-eye' },
    dich_vu: { ten: 'Dịch vụ',  mau: 'badge-duong', icon: 'fa-screwdriver-wrench' }
  };

  /* Loại khuyến mãi: giảm %, giảm thẳng tiền, miễn phí ship */
  var LOAI_KHUYEN_MAI = {
    phan_tram: { ten: 'Giảm %',        mau: 'badge-tim',   icon: 'fa-percent' },
    so_tien:   { ten: 'Giảm tiền',     mau: 'badge-xanh',  icon: 'fa-money-bill-wave' },
    mien_ship: { ten: 'Miễn phí ship', mau: 'badge-duong', icon: 'fa-truck-fast' }
  };

  /* Trạng thái khuyến mãi — backend tự tính từ ngày tháng và số lượt, không lưu trong database */
  var TT_KHUYEN_MAI = {
    dang_chay:   { ten: 'Đang chạy',   mau: 'badge-xanh', icon: 'fa-circle-play' },
    sap_dien_ra: { ten: 'Sắp diễn ra', mau: 'badge-vang', icon: 'fa-hourglass-start' },
    het_han:     { ten: 'Hết hạn',     mau: 'badge-toi',  icon: 'fa-calendar-xmark' },
    het_luot:    { ten: 'Hết lượt',    mau: 'badge-cam',  icon: 'fa-ticket' },
    tam_dung:    { ten: 'Tạm dừng',    mau: 'badge-xam',  icon: 'fa-circle-pause' }
  };

  /* Hai kiểu khuyến mãi */
  var KIEU_KHUYEN_MAI = {
    don_hang: { ten: 'Theo đơn hàng', mau: 'badge-duong', icon: 'fa-receipt' },
    san_pham: { ten: 'Giá sản phẩm',  mau: 'badge-cam',   icon: 'fa-tag' }
  };

  /* Phạm vi áp dụng — hiện chỉ để chủ shop ghi nhớ, chưa lọc theo giỏ hàng */
  var AP_DUNG_CHO = {
    tat_ca:   { ten: 'Tất cả',   mau: 'badge-xam',   icon: 'fa-layer-group' },
    san_pham: { ten: 'Sản phẩm', mau: 'badge-xanh',  icon: 'fa-cube' },
    dich_vu:  { ten: 'Dịch vụ',  mau: 'badge-duong', icon: 'fa-screwdriver-wrench' }
  };

  /* Trạng thái VẬT TƯ trong kho.
     con_hang / sap_het / het_hang nói về lượng còn dùng được;
     da_dat / dang_van_chuyen là hàng đã mua nhưng CHƯA về tới kho. */
  var TT_VAT_TU = {
    con_hang:        { ten: 'Còn hàng',         mau: 'badge-xanh',  icon: 'fa-circle-check' },
    sap_het:         { ten: 'Sắp hết',          mau: 'badge-vang',  icon: 'fa-triangle-exclamation' },
    het_hang:        { ten: 'Hết hàng',         mau: 'badge-do',    icon: 'fa-ban' },
    da_dat:          { ten: 'Đã đặt',           mau: 'badge-tim',   icon: 'fa-bookmark' },
    dang_van_chuyen: { ten: 'Đang vận chuyển',  mau: 'badge-duong', icon: 'fa-truck-fast' }
  };

  var badgeTheoMap = function (map, khoa) {
    var t = map[khoa] || { ten: khoa || '—', mau: 'badge-xam', icon: 'fa-circle' };
    return '<span class="badge ' + t.mau + '"><i class="fa-solid ' + t.icon + '"></i>' + esc(t.ten) + '</span>';
  };
  var badgeTtSanPham = function (tt) { return badgeTheoMap(TT_SAN_PHAM, tt); };
  /**
   * Nhận khoá trạng thái hoặc cả bản ghi vật tư. Với bản ghi thì dùng trangThaiTinh
   * backend đã suy sẵn từ số còn lại (VatTu.getTrangThaiTinh). Trước đây JS giữ một bản
   * sao quy tắc đó và lệch với Java (nhựa hết gram / đồ khác hết cái) — giờ chỉ một nơi tính.
   */
  var badgeTtVatTu = function (tt) {
    if (typeof tt === 'object') tt = tt ? (tt.trangThaiTinh || tt.trangThai || 'con_hang') : 'con_hang';
    return badgeTheoMap(TT_VAT_TU, tt);
  };
  var badgeLoaiSanPham = function (l) { return badgeTheoMap(LOAI_SAN_PHAM, l || 'ban'); };
  var badgeLoaiKm = function (l) { return badgeTheoMap(LOAI_KHUYEN_MAI, l || 'phan_tram'); };
  var badgeTtKm = function (tt) { return badgeTheoMap(TT_KHUYEN_MAI, tt || 'tam_dung'); };
  var badgeKieuKm = function (k) { return badgeTheoMap(KIEU_KHUYEN_MAI, k || 'don_hang'); };

  /** "Giảm 10% (tối đa 50.000₫)" — mô tả ưu đãi bằng một câu ngắn. */
  var moTaUuDai = function (km) {
    if (!km) return '—';
    if (km.loai === 'phan_tram') {
      return 'Giảm ' + km.giaTri + '%' + (km.giamToiDa > 0 ? ' (tối đa ' + money(km.giamToiDa) + ')' : '');
    }
    if (km.loai === 'mien_ship') return 'Miễn ship ' + money(km.giaTri);
    return 'Giảm ' + money(km.giaTri);
  };

  /**
   * Ngưỡng cảnh báo sắp hết hàng. Đây là QUY ƯỚC HIỂN THỊ dùng chung,
   * không phải số liệu của từng sản phẩm — bản cũ gắn min = 5 vào mọi
   * sản phẩm như thể đó là mức tồn tối thiểu chủ shop đã đặt.
   */
  var NGUONG_SAP_HET = 5;

  var badgeTon = function (ton, toiThieu) {
    if (ton <= 0) return '<span class="badge badge-do">Hết hàng</span>';
    if (ton <= (toiThieu || NGUONG_SAP_HET)) return '<span class="badge badge-vang">Sắp hết</span>';
    return '<span class="badge badge-xanh">Còn hàng</span>';
  };

  /* ---------------- Dữ liệu ----------------
     Trước đây chỗ này có sẵn 4 sản phẩm và 2 đơn hàng giả để trang không trống
     lúc backend chưa chạy. Bỏ hết: nhìn "Creality Ender-3" hay "Nguyễn Văn A"
     trong trang quản trị dễ tưởng là hàng thật, mà xoá thì không xoá được.
     Backend chưa chạy thì bảng để trống kèm dòng nhắc, rõ ràng hơn nhiều. */

  var PRODUCTS = [];
  var ORDERS = [];
  var MAU_SAC = [];       // bảng màu dùng cho nhựa in và sản phẩm
  var DANH_MUC = [];      // danh mục sắp xếp sản phẩm (móc khoá, mô hình, đồ trang trí...)
  var BAI_VIET = [];      // bài viết kiến thức in 3D hiện ở cuối trang chủ khách
  var KHUYEN_MAI = [];    // mã giảm giá khách nhập ở giỏ hàng
  var VAT_TU = [];        // kho vật tư: máy in, cuộn nhựa...
  var NHA_CUNG_CAP = [];  // nơi mua vật tư
  var NGUOI_DUNG = [];    // tài khoản đăng ký — chỉ lấy được khi đang đăng nhập admin
  /**
   * Kết quả THÔ của lần khởi tạo gần nhất, theo khoá: cả bộ dữ liệu lẫn số liệu TỔNG HỢP
   * (tong-quan, bao-cao, khach-hang, von, tk-*...). Số tổng hợp do backend tính từ cache —
   * trước đây doanh thu theo tháng, khách hàng, chi phí vốn... đều tính bằng JS trên toàn bộ
   * đơn hàng / vật tư tải về, mỗi trang một kiểu nên số chỗ này lệch chỗ kia.
   * Trang đọc bằng Apex.tk('tong-quan').
   */
  var DU_LIEU = {};
  var DEM = null;          // { donChoXacNhan } — số đỏ cạnh mục Đơn hàng trên menu
  var BACKEND_OK = false;  // true khi gọi được backend Java; tắt thì bảng trống + báo đỏ đầu trang

  /* Tính chất vật tư — CỐ ĐỊNH 3 kiểu, quyết định cách kho tính:
     nhựa theo dõi gram, máy in tính vào vốn máy, dụng cụ chỉ tính tiền mua.
     Tên loại thì tự đặt thoải mái ở bảng danh mục. */
  var LOAI_VAT_TU = { may_in: 'Máy in', nhua: 'Nhựa in', dung_cu: 'Dụng cụ' };

  /* ---------------- Phiên đăng nhập ---------------- */

  var layPhien = function () {
    try { return JSON.parse(localStorage.getItem('in3d_phien')); } catch (e) { return null; }
  };

  var dangXuat = function () {
    localStorage.removeItem('in3d_phien');
    window.location.href = 'dang-nhap.html';
  };

  /** Gắn token admin vào header khi đang đăng nhập — nguoi-dung, khach-hang và các lệnh ghi cần. */
  var themToken = function (headers) {
    var phien = layPhien();
    if (phien && phien.token) headers.Authorization = 'Bearer ' + phien.token;
    return headers;
  };

  /* Đổi nội dung mảng nhưng GIỮ tham chiếu: các trang đã cầm Apex.vatTu, Apex.products...
     từ lúc mở trang vẫn nhìn thấy dữ liệu mới sau khi nạp lại — nhờ vậy thêm/sửa/xoá
     chỉ cần vẽ lại bảng, không phải tải lại cả trang. */
  var thayMang = function (mang, moi) {
    mang.length = 0;
    Array.prototype.push.apply(mang, moi || []);
  };

  /* ---------------- Đổi dữ liệu API sang dạng các bảng đang dùng ---------------- */

  var chuyenDonHang = function (d) {
    var tt = (d.thanhToan && d.thanhToan[0]) || null;
    return {
      dbId: d.id, id: d.maDon, customer: d.tenKhach, phone: d.soDienThoai || '',
      // Địa chỉ giao và ghi chú của khách — bản cũ bỏ mất nên hộp chi tiết đơn không xem được
      diaChi: d.diaChi || '', ghiChu: d.ghiChu || '', nguoiDungId: d.nguoiDungId || null,
      // date là chuỗi đã định dạng để hiện; ngayGoc giữ nguyên ISO
      date: ngayVN(d.createdAt), ngayGoc: d.createdAt,
      items: (d.chiTiet || []).reduce(function (s, c) { return s + (c.soLuong || 0); }, 0),
      total: d.tongTien || 0, status: TT_MAP[d.trangThai] || d.trangThai,
      maKhuyenMai: d.maKhuyenMai || '', tienGiam: d.tienGiam || 0, tamTinh: d.tamTinh || d.tongTien || 0,
      tienGiamSanPham: d.tienGiamSanPham || 0, tienHangGoc: d.tienHangGoc || d.tongTien || 0,
      // Khoản cộng thêm / phí của đơn gõ tay (đơn web luôn 0)
      phuThu: d.phuThu || 0, phi: d.phi || 0,
      payment: tt ? (PT_MAP[tt.phuongThuc] || 'COD') + (tt.trangThai === 'da_thanh_toan' ? ' (đã TT)' : '') : 'COD',
      // Kênh bán backend đã dịch sẵn (đơn cũ chưa có kênh thì là website)
      channel: d.kenhTen || 'Website',
      chiTiet: (d.chiTiet || []).map(function (c) {
        return { ten: c.tenSanPham, soLuong: c.soLuong, donGia: c.donGia, donGiaGoc: c.donGiaGoc || c.donGia };
      })
    };
  };

  var chuyenSanPham = function (s) {
    return {
      // Mã chủ shop đặt (backend cũ chưa có maSanPham thì vẫn là SP-<id> như trước)
      dbId: s.id, sku: s.maSanPham || ('SP-' + s.id), name: s.ten, cat: s.dangBan ? 'Đang bán' : 'Đang ẩn',
      // Không đặt giá vốn ở đây. Bản cũ để cost = 70% giá bán, tức là bịa ra
      // một con số vốn rồi tính lãi trên đó. Vốn thật nằm ở trang Quản lý vốn,
      // tính từ tiền mua vật tư và số gram nhựa đã dùng.
      price: s.gia || 0,
      stock: s.tonKho || 0, img: s.hinhAnh || '', dangBan: !!s.dangBan,
      moTa: s.moTa || '', trangThai: s.trangThai || 'san_hang', ngayTao: s.createdAt || '',
      loaiSanPham: s.loaiSanPham || 'ban', danhMucId: s.danhMucId || null,
      // Nhựa đã trừ khỏi kho — một sản phẩm in được bằng nhiều cuộn (xem SanPhamVatTu.java).
      // mauSac là MÀU CỦA CHÍNH MẤY CUỘN ĐÓ, backend suy ra chứ không lưu riêng.
      vatTus: s.vatTus || [], mauSac: s.mauSac || [],
      // soLuong = TỔNG số cái đã in (nhập tay, không cộng từ các dòng nhựa: một cái
      // nhiều màu ăn nhiều cuộn). Mỗi dòng vatTus ghi cuộn đó dùng cho mấy cái.
      soLuong: s.soLuong || 1,
      // Nhiều màu: mỗi cái dùng mọi cuộn, một số lượng chung. Một màu: mỗi dòng một lô.
      nhieuMau: !!s.nhieuMau,
      // Tất cả ảnh, ảnh đầu = ảnh bìa (img ở trên luôn bằng ảnh đầu)
      dsAnh: s.danhSachAnh || (s.hinhAnh ? [s.hinhAnh] : []),
      gramMoiCaiMin: s.gramMoiCaiMin || 0, gramMoiCaiMax: s.gramMoiCaiMax || 0,
      tongGramNhua: s.tongGramNhua || 0, tienNhua: s.tienNhua || 0
    };
  };

  /** Khoá bộ dữ liệu -> cách đổ vào mảng toàn cục. Khoá khác (tong-quan, tk-*, dem...) giữ thô. */
  var BO_DU_LIEU = {
    'san-pham':     function (ds) { thayMang(PRODUCTS, ds.map(chuyenSanPham)); },
    'don-hang':     function (ds) { thayMang(ORDERS, ds.map(chuyenDonHang)); },
    'vat-tu':       function (ds) { thayMang(VAT_TU, ds); },
    'nha-cung-cap': function (ds) { thayMang(NHA_CUNG_CAP, ds); },
    'mau-sac':      function (ds) { thayMang(MAU_SAC, ds); },
    'danh-muc':     function (ds) { thayMang(DANH_MUC, ds); },
    'bai-viet':     function (ds) { thayMang(BAI_VIET, ds); },
    'khuyen-mai':   function (ds) { thayMang(KHUYEN_MAI, ds); },
    'nguoi-dung':   function (ds) { thayMang(NGUOI_DUNG, ds); }
  };

  /* ---------------- Thanh tải mảnh ở mép trên ---------------- */
  var DANG_TAI = 0;
  var batTai = function () { DANG_TAI++; document.documentElement.classList.add('dang-tai'); };
  var tatTai = function () {
    DANG_TAI = Math.max(0, DANG_TAI - 1);
    if (!DANG_TAI) document.documentElement.classList.remove('dang-tai');
  };

  /* ---------------- Khởi tạo trang: MỘT request cho cả trang ----------------
     Trước đây mọi trang tự nạp đủ 9 bộ dữ liệu (9 request song song) và không vẽ gì cho
     tới khi cái chậm nhất về — /san-pham mất ~2,4 s, kể cả trang Màu sắc chẳng dùng tới
     sản phẩm. Giờ mỗi trang khai đúng các khoá nó cần:

       Apex.trang({ bo: ['mau-sac', 'tk-mau-sac'], ve: veLaiTrang });

     Apex gửi MỘT request GET /api/quan-tri/khoi-tao?bo=...,dem (server trả từ cache trong
     bộ nhớ), đổ các bộ dữ liệu vào Apex.products, Apex.vatTu... như cũ, cất số liệu tổng hợp
     cho Apex.tk(khoa), rồi gọi ve(). Sau mỗi lần ghi, nạp lại đúng các khoá đó. */

  var TRANG = null;       // { bo, thamSo, ve } — trang đã khai bằng Apex.trang()
  var VE_CHO = null;      // hàm vẽ đăng ký bằng datVeLai() trước khi trang khai
  var DA_NAP = false;     // đã nạp được ít nhất một lần
  var DA_THU = false;     // đã có kết quả (được hoặc lỗi) — lúc đó mới biết có báo đỏ hay không
  var LUOT_NAP = 0;       // lượt nạp mới nhất; kết quả của lượt cũ về muộn thì bỏ qua
  var LOI_NAP = null;     // lỗi của lần nạp gần nhất — để nút đang chờ nạp báo đúng lý do

  /** Đường dẫn khởi tạo: luôn kèm 'dem' cho số trên menu, cộng các tham số trang cần (vd tiLeLai). */
  var duongDanKhoiTao = function (lamMoi) {
    var bo = [];
    TRANG.bo.concat(['dem']).forEach(function (k) {
      if (k && bo.indexOf(k) < 0) bo.push(k);
    });
    var url = '/quan-tri/khoi-tao?bo=' + bo.map(encodeURIComponent).join(',');
    var ts = null;
    try { ts = typeof TRANG.thamSo === 'function' ? TRANG.thamSo() : TRANG.thamSo; } catch (e) { ts = null; }
    Object.keys(ts || {}).forEach(function (k) {
      var v = ts[k];
      if (v === null || v === undefined || v === '') return;
      url += '&' + encodeURIComponent(k) + '=' + encodeURIComponent(v);
    });
    if (lamMoi) url += '&lamMoi=1';
    return url;
  };

  var apDungKetQua = function (kq) {
    DU_LIEU = kq || {};
    Object.keys(BO_DU_LIEU).forEach(function (khoa) {
      if (!(khoa in DU_LIEU)) return;
      var ds = DU_LIEU[khoa];
      if (Array.isArray(ds)) BO_DU_LIEU[khoa](ds);
      // nguoi-dung = null khi không có token admin hợp lệ -> danh sách trống
      else if (khoa === 'nguoi-dung') thayMang(NGUOI_DUNG, []);
    });
    if (DU_LIEU.dem) DEM = DU_LIEU.dem;
  };

  /** Gọi hàm vẽ của trang. Trang vẽ lỗi thì chỉ ghi console — không phải lỗi backend. */
  var veLaiNeuCo = function (lanDau) {
    capNhatBadgeMenu();
    if (!TRANG || typeof TRANG.ve !== 'function') return;
    try { TRANG.ve(DU_LIEU, !!lanDau); }
    catch (e) { if (window.console) console.error('Apex: lỗi khi vẽ trang', e); }
  };

  var napTrang = function (lamMoi) {
    if (!TRANG) return Promise.resolve(false);
    var luot = ++LUOT_NAP;
    batTai();
    return fetch(JAVA_API + duongDanKhoiTao(lamMoi), { headers: themToken({}), cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) {
          // 401/403: token hết hạn hoặc không phải admin (vd nút Làm mới cần quyền admin)
          var loiHttp = new Error(r.status === 401 || r.status === 403
            ? 'Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Hãy đăng nhập lại.'
            : 'Lỗi backend: HTTP ' + r.status);
          loiHttp.status = r.status;
          throw loiHttp;
        }
        return r.json();
      })
      .then(function (kq) {
        tatTai();
        LOI_NAP = null;
        if (luot !== LUOT_NAP) return true;   // đã có lượt nạp mới hơn, để lượt đó vẽ
        var lanDau = !DA_NAP;
        try { apDungKetQua(kq); } catch (e) { if (window.console) console.error('Apex: dữ liệu khởi tạo lạ', e); }
        BACKEND_OK = true;
        DA_NAP = true;
        DA_THU = true;
        capNhatBanner();
        veLaiNeuCo(lanDau);
        return true;
      }, function (e) {
        tatTai();
        // Lỗi mạng (fetch tự reject) không mang câu tiếng Việt nào -> nói thẳng là chưa gọi được backend
        LOI_NAP = (e && e.status) ? e
          : new Error('Không kết nối được server. Thử lại sau ít phút.');
        // Backend tắt thì bảng để TRỐNG và có thông báo đỏ ở đầu trang (capNhatBanner),
        // không gọi hàm vẽ với số liệu rỗng — nhìn "0 đơn, 0 ₫" dễ tưởng là thật.
        if (luot === LUOT_NAP) {
          BACKEND_OK = false;
          DA_THU = true;
          capNhatBanner();
        }
        return false;
      });
  };

  /**
   * Khai báo trang và nạp ngay:
   *   bo     : các khoá cần (bộ dữ liệu + số liệu tổng hợp); 'dem' tự thêm
   *   thamSo : object hoặc hàm trả object — tham số thêm cho khởi tạo (vd { tiLeLai: 120 });
   *            là hàm thì đọc lại mỗi lần nạp
   *   ve     : hàm vẽ lại cả trang, gọi ve(duLieu, lanDau) khi dữ liệu về và sau mỗi lần ghi
   * Trả Promise<boolean> của lần nạp đầu.
   */
  var trang = function (khai) {
    khai = khai || {};
    TRANG = {
      bo: (khai.bo || []).slice(),
      thamSo: khai.thamSo || null,
      ve: khai.ve || (TRANG && TRANG.ve) || VE_CHO
    };
    return napTrang(false);
  };

  /* Trang KHÔNG tự vẽ lúc mở — lúc đó mảng còn trống, vẽ ra toàn "Chưa có..." rồi nháy
     sang dữ liệu thật, nhìn như lỗi. Apex gọi hàm vẽ khi dữ liệu về. */
  var datVeLai = function (fn) {
    if (TRANG) TRANG.ve = fn;
    else VE_CHO = fn;
    if (DA_NAP) veLaiNeuCo(false);
  };

  /* Lưới an toàn: trang cũ chỉ gọi datVeLai mà chưa khai Apex.trang() thì nạp đủ các bộ
     dữ liệu như trước, để khỏi trắng trang. Trang mới luôn khai bo. */
  var napMacDinh = function () {
    if (TRANG || !VE_CHO) return;
    if (window.console) console.warn('Apex: trang chưa khai Apex.trang({ bo: [...] }), tạm nạp đủ các bộ dữ liệu.');
    trang({ bo: Object.keys(BO_DU_LIEU), ve: VE_CHO });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', napMacDinh);
  else setTimeout(napMacDinh, 0);

  /** Nạp lại các khoá của trang (server trả từ cache, rất nhanh) rồi vẽ lại. Trả Promise<boolean>. */
  var taiLai = function () { return napTrang(false); };

  /* Nút bấm chờ một lần NẠP (không phải ghi) thì phải biết khi nạp trượt: napTrang chỉ trả
     false nên Apex.dangLuu tưởng là xong, tắt nút mà không báo gì — chủ shop thấy "thành công"
     trong lúc số trên trang vẫn là số cũ. Hai hàm dưới NÉM đúng câu lỗi để dangLuu hiện ra;
     Apex.trang()/Apex.taiLai() giữ nếp cũ (trả false, banner đỏ đầu trang lo phần báo). */
  var nemNeuKhongNap = function (hua) {
    return hua.then(function (duoc) {
      if (duoc) return true;
      throw (LOI_NAP || new Error('Chưa nạp lại được dữ liệu, thử lại sau.'));
    });
  };

  /** Như taiLai nhưng nạp trượt thì reject — cho nút bấm chờ nạp xong (dùng kèm Apex.dangLuu). */
  var taiLaiHoacLoi = function () { return nemNeuKhongNap(napTrang(false)); };

  /** Nút "Làm mới": bắt server đọc lại mọi thứ từ database (sau khi sửa tay trên Supabase
      Dashboard) rồi vẽ lại. Nạp trượt / không đủ quyền thì reject để nút báo lỗi thật. */
  var lamMoi = function () { return nemNeuKhongNap(napTrang(true)); };

  /** Nút "Làm mới" ở topbar: khoá nút + "Đang làm mới…", xong thì toast, trượt thì toast đỏ. */
  var bamLamMoi = function (nut) {
    return dangLuu(nut, lamMoi(), null, 'Đang làm mới…').then(function (duoc) {
      if (duoc) baoNhanh('Đã làm mới dữ liệu');
    });
  };

  /** Giá trị thô của một khoá trong lần khởi tạo gần nhất (vd 'tong-quan', 'tk-kho'); chưa có thì null. */
  var tk = function (khoa) {
    return DU_LIEU[khoa] === undefined ? null : DU_LIEU[khoa];
  };

  /** Toast nhỏ góc dưới phải, tự ẩn sau 2,2 giây (báo lỗi thì đỏ và ở lại 5 giây). */
  var baoNhanh = function (chu, icon, laLoi) {
    var cu = document.getElementById('bao-nhanh');
    if (cu) cu.parentNode.removeChild(cu);
    var o = document.createElement('div');
    o.id = 'bao-nhanh';
    o.className = 'bao-nhanh' + (laLoi ? ' loi' : '');
    o.innerHTML = '<i class="fa-solid ' + (icon || 'fa-circle-check') + '"></i>' + esc(chu);
    document.body.appendChild(o);
    requestAnimationFrame(function () { o.classList.add('hien'); });
    setTimeout(function () {
      o.classList.remove('hien');
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 300);
    }, laLoi ? 5000 : 2200);
  };

  /** Toast đỏ — cho lỗi không có ô .bao-loi nào để hiện (vd nút xoá ở hộp chi tiết). */
  var baoLoi = function (chu) { baoNhanh(chu, 'fa-circle-exclamation', true); };

  /** Số đơn chờ xác nhận trên menu — backend đếm sẵn (khoá 'dem'), không đếm lại bằng JS. */
  var capNhatBadgeMenu = function () {
    var muc = document.querySelector('.apex-muc[href="don-hang.html"]');
    if (!muc || !DEM) return;
    var so = DEM.donChoXacNhan || 0;
    var badge = muc.querySelector('.badge-muc');
    if (so) {
      if (!badge) { badge = document.createElement('span'); badge.className = 'badge-muc'; muc.appendChild(badge); }
      badge.textContent = so;
    } else if (badge) {
      badge.parentNode.removeChild(badge);
    }
  };

  /** Backend tắt: nói thẳng ở đầu trang, không để bảng trống mà không rõ lý do. */
  var capNhatBanner = function () {
    var cu = document.getElementById('bao-backend');
    if (cu) cu.parentNode.removeChild(cu);
    if (!DA_THU || BACKEND_OK) return;
    var trangEl = document.querySelector('.apex-trang');
    if (trangEl) {
      trangEl.insertAdjacentHTML('afterbegin',
        '<div class="bao-backend" id="bao-backend"><i class="fa-solid fa-plug-circle-xmark"></i> ' +
        (DA_NAP ? 'Mất kết nối server' : 'Không kết nối được server') +
        '</div>');
    }
  };

  /* ---------------- Thao tác gọi backend Java ----------------
     Bản cũ dùng XMLHttpRequest ĐỒNG BỘ: cả tab đứng hình tới khi database ghi xong (có lúc
     vài giây), không hiện được "Đang lưu…", lỗi thì bật alert() rồi form lại báo thêm một câu
     "kiểm tra backend" dù backend chỉ từ chối dữ liệu. Giờ gọi bất đồng bộ, trả Promise;
     lỗi thì reject Error mang đúng câu backend báo ({loi}) để hiện ngay trong form. */

  /** Gọi ghi (POST/PUT/DELETE). Resolve JSON trả về (204 -> null); lỗi reject Error(thông báo). */
  var ghi = function (method, duongDan, body) {
    var tuyChon = { method: method, headers: themToken({ 'Content-Type': 'application/json' }) };
    if (body !== undefined && body !== null) tuyChon.body = JSON.stringify(body);
    batTai();
    return fetch(JAVA_API + duongDan, tuyChon).then(function (r) {
      return r.text().then(function (chu) {
        tatTai();
        var j = null;
        try { j = chu ? JSON.parse(chu) : null; } catch (e) { j = null; }
        if (r.ok) return j;
        var loi = new Error((j && j.loi) ||
          (r.status === 401 || r.status === 403
            ? 'Phiên đăng nhập đã hết hạn hoặc không đủ quyền. Hãy đăng nhập lại.'
            : 'Lỗi backend: HTTP ' + r.status));
        loi.status = r.status;
        loi.duLieu = j;
        throw loi;
      }, function () {
        tatTai();
        var loi = new Error('Lỗi backend: HTTP ' + r.status);
        loi.status = r.status;
        throw loi;
      });
    }, function () {
      tatTai();
      var loi = new Error('Không kết nối được server. Thử lại sau ít phút.');
      loi.status = 0;
      throw loi;
    });
  };

  /**
   * Gọi sau khi backend ghi xong: đóng hộp thoại, nạp lại các khoá của trang (cache ấm,
   * số mới), vẽ lại, rồi hiện toast. Trả Promise.
   * Giữ cách gọi cũ capNhatXong(['vat-tu'], 'Đã lưu') — mảng bộ dữ liệu giờ bỏ qua vì trang
   * luôn nạp lại đúng các khoá đã khai; gọi gọn capNhatXong('Đã lưu') cũng được.
   */
  var capNhatXong = function (cacBo, thongBao) {
    if (typeof cacBo === 'string' && thongBao === undefined) thongBao = cacBo;
    dongHopThoai();
    return taiLai().then(function () {
      if (thongBao) baoNhanh(thongBao);
    });
  };

  /** Ghi rồi cập nhật trang; Promise resolve đúng JSON backend trả sau khi trang đã vẽ lại. */
  var ghiRoiCapNhat = function (method, duongDan, body, thongBao) {
    return ghi(method, duongDan, body).then(function (kq) {
      return capNhatXong(null, thongBao).then(function () { return kq; });
    });
  };

  /** Hỏi lại trước khi xoá. Bấm Huỷ -> Promise(false), không gọi backend; xoá xong -> Promise(true). */
  var xoaSauKhiHoi = function (cauHoi, duongDan, thongBao) {
    if (!confirm(cauHoi)) return Promise.resolve(false);
    return ghiRoiCapNhat('DELETE', duongDan, null, thongBao).then(function () { return true; });
  };

  /* Nút đang chờ backend: khoá lại, đổi chữ thành "Đang lưu…" kèm vòng quay; xong trả như cũ.
     select/input thì chỉ khoá, không đụng nội dung. */
  var batNutBan = function (nut, chu) {
    if (!nut || nut._apexBan) return;
    nut._apexBan = true;
    nut._apexKhoaSan = !!nut.disabled;
    nut.disabled = true;
    nut.classList.add('dang-ban');
    if (nut.tagName === 'BUTTON' || nut.tagName === 'A') {
      nut._apexHtml = nut.innerHTML;
      nut.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ' +
        esc(chu || (nut.classList.contains('nut-do') ? 'Đang xoá…' : 'Đang lưu…'));
    }
  };
  var tatNutBan = function (nut) {
    if (!nut || !nut._apexBan) return;
    nut._apexBan = false;
    nut.disabled = nut._apexKhoaSan;
    nut.classList.remove('dang-ban');
    if (nut._apexHtml !== undefined) { nut.innerHTML = nut._apexHtml; nut._apexHtml = undefined; }
  };

  /**
   * Chạy một thao tác ghi gắn với nút bấm, thay cho alert():
   *   nut  : nút vừa bấm (truyền this), selector, hoặc null — khoá + "Đang lưu…" trong lúc chờ
   *   viec : Promise hoặc hàm trả Promise, vd Apex.suaMauSac(id, duLieu)
   *   oLoi : ô báo lỗi (phần tử / selector); bỏ trống thì tự tìm .bao-loi trong hộp thoại
   *          chứa nút, không có thì hiện toast đỏ
   *   chu  : chữ trên nút lúc chờ; mặc định "Đang xoá…" cho nút đỏ, "Đang lưu…" cho nút khác
   * Promise trả về KHÔNG BAO GIỜ reject: thành công -> kết quả của viec; lỗi -> undefined
   * (lỗi đã hiện rồi), nên gọi thẳng trong onclick="..." được.
   */
  var dangLuu = function (nut, viec, oLoi, chu) {
    if (nut && nut.currentTarget) nut = nut.currentTarget;   // lỡ truyền event thay vì this
    if (typeof nut === 'string') nut = document.querySelector(nut);
    if (typeof oLoi === 'string') oLoi = document.querySelector(oLoi);
    if (!oLoi) {
      var hop = (nut && nut.closest && nut.closest('.hop-thoai')) ||
        document.querySelector('#lop-phu-chung.hien .hop-thoai');
      oLoi = hop ? hop.querySelector('.bao-loi') : null;
    }
    if (oLoi) oLoi.textContent = '';
    batNutBan(nut, chu);

    var hua;
    try { hua = Promise.resolve(typeof viec === 'function' ? viec() : viec); }
    catch (e) { hua = Promise.reject(e); }

    return hua.then(function (kq) {
      tatNutBan(nut);
      return kq;
    }, function (e) {
      tatNutBan(nut);
      var thongBao = (e && e.message) || 'Không lưu được, thử lại sau.';
      if (oLoi && document.body.contains(oLoi)) oLoi.textContent = thongBao;
      else baoLoi(thongBao);
      return undefined;
    });
  };

  /* Mọi hàm ghi bên dưới trả Promise: thành công thì đóng hộp thoại, nạp lại trang, vẽ lại,
     hiện toast rồi mới resolve; lỗi thì reject Error(câu backend báo) — dùng kèm Apex.dangLuu.
     thongBao (tham số cuối, tuỳ chọn) thay câu toast mặc định. */

  var doiTrangThai = function (dbId, tt, thongBao) {
    return ghiRoiCapNhat('PUT', '/don-hang/' + dbId + '/trang-thai', { trangThai: tt }, thongBao || 'Đã đổi trạng thái đơn');
  };
  var danhDauDaTT = function (dbId, thongBao) {
    return ghiRoiCapNhat('PUT', '/don-hang/' + dbId + '/da-thanh-toan', null, thongBao || 'Đã ghi nhận thanh toán');
  };
  var xoaDon = function (dbId) {
    return xoaSauKhiHoi('Xoá đơn hàng này? Hành động không hoàn tác được.', '/don-hang/' + dbId, 'Đã xoá đơn hàng');
  };

  /** Lưu sản phẩm: có dbId thì sửa, không có thì thêm mới. */
  var luuSanPham = function (dbId, duLieu, thongBao) {
    return dbId
      ? ghiRoiCapNhat('PUT', '/san-pham/' + dbId, duLieu, thongBao || 'Đã lưu sản phẩm')
      : ghiRoiCapNhat('POST', '/san-pham', duLieu, thongBao || 'Đã thêm sản phẩm');
  };
  var xoaSanPham = function (dbId, ten) {
    return xoaSauKhiHoi('Xoá hẳn sản phẩm "' + (ten || '') + '"? Hành động không hoàn tác được.',
      '/san-pham/' + dbId, 'Đã xoá sản phẩm');
  };

  /* ---------------- Hộp thoại (modal) dùng chung ---------------- */

  var moHopThoai = function (html, rong) {
    var lop = document.getElementById('lop-phu-chung');
    if (!lop) {
      lop = document.createElement('div');
      lop.className = 'lop-phu';
      lop.id = 'lop-phu-chung';
      // KHÔNG đóng khi bấm ra ngoài hộp: đang sửa dở mà lỡ tay bấm trượt là mất hết.
      // Chỉ đóng bằng nút X hoặc nút Huỷ.
      document.body.appendChild(lop);
    }
    // rong = true -> lớp "rong"; truyền chuỗi (vd "rong-lon") thì dùng đúng lớp đó
    lop.innerHTML = '<div class="hop-thoai' + (rong ? ' ' + (typeof rong === 'string' ? rong : 'rong') : '') + '">' +
      html + '</div>';
    lop.classList.add('hien');
    document.body.style.overflow = 'hidden';
    var oDau = lop.querySelector('input, select, textarea');
    if (oDau) oDau.focus();
  };

  var dongHopThoai = function () {
    var lop = document.getElementById('lop-phu-chung');
    if (lop) { lop.classList.remove('hien'); lop.innerHTML = ''; }
    document.body.style.overflow = '';
  };


  /* ---------------- Tải ảnh lên (lưu ở backend, miễn phí) ---------------- */

  /**
   * Nén ảnh ngay trên trình duyệt trước khi gửi: thu về tối đa 1200px, WebP chất lượng 82%
   * (trình duyệt cũ không mã hoá được WebP thì lùi về JPEG 80%).
   * Ảnh 4MB từ điện thoại thường còn ~120KB -> tiết kiệm chỗ lưu và tải trang nhanh.
   */
  var nenAnh = function (file, xong) {
    try {
      var doc = new FileReader();
      doc.onload = function (e) {
        var img = new Image();
        img.onload = function () {
          var toiDa = 1200;
          var w = img.width, h = img.height;
          var ti = Math.min(1, toiDa / Math.max(w, h));  // không phóng to ảnh nhỏ
          w = Math.round(w * ti); h = Math.round(h * ti);

          var canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          var ctx = canvas.getContext('2d');
          ctx.imageSmoothingQuality = 'high';
          ctx.fillStyle = '#ffffff';           // nền trắng thay cho vùng trong suốt của PNG
          ctx.fillRect(0, 0, w, h);
          ctx.drawImage(img, 0, 0, w, h);

          canvas.toBlob(function (blob) {
            if (blob && blob.type === 'image/webp') { xong(blob, 'webp'); return; }
            canvas.toBlob(function (b2) { xong(b2 || file, 'jpg'); }, 'image/jpeg', 0.8);
          }, 'image/webp', 0.82);
        };
        img.onerror = function () { xong(file, 'jpg'); };
        img.src = e.target.result;
      };
      doc.onerror = function () { xong(file, 'jpg'); };
      doc.readAsDataURL(file);
    } catch (err) { xong(file, 'jpg'); }
  };

  /** Tải 1 ảnh lên backend, gọi xong(duongDan) khi thành công hoặc loi(thongBao) khi lỗi. */
  var taiAnhLen = function (file, xong, loi) {
    if (!file) { loi('Chưa chọn ảnh.'); return; }
    if (!/^image\//.test(file.type)) { loi('File này không phải ảnh.'); return; }
    nenAnh(file, function (blob, duoi) {
      var fd = new FormData();
      fd.append('file', blob, 'anh-' + Date.now() + '.' + (duoi || 'jpg'));
      // Không đặt Content-Type: trình duyệt tự điền multipart kèm boundary
      fetch(JAVA_API + '/anh', { method: 'POST', headers: themToken({}), body: fd })
        .then(function (r) {
          return r.text().then(function (t) {
            var j = {};
            try { j = JSON.parse(t); } catch (e) {}
            return { ok: r.ok, j: j, status: r.status };
          });
        })
        .then(function (kq) {
          // Trả về đường dẫn TƯƠNG ĐỐI để lưu DB; dùng anhDayDu() khi cần hiển thị.
          if (kq.ok && kq.j.duongDan) xong(kq.j.duongDan, kq.j);
          else loi(kq.j.loi || ('Không lưu được ảnh (HTTP ' + kq.status + ')'));
        })
        .catch(function () {
          loi('Không kết nối được server nên chưa lưu được ảnh.');
        });
    });
  };

  /**
   * Gắn 1 ô tải ảnh vào hộp thoại.
   * idGoc: tiền tố id của các phần tử <input file>, <img xem trước>, <div trạng thái>.
   * Trả về hàm layUrl() cho biết URL ảnh hiện tại.
   */
  /** Link ảnh ngoài (http/https) — khác với đường dẫn tương đối /anh/... do máy chủ lưu. */
  var laLinkNgoai = function (u) { return /^https?:\/\/\S+$/i.test(u || ''); };

  var ganOTaiAnh = function (idGoc, urlBanDau) {
    var url = urlBanDau || '';
    var oFile = document.getElementById(idGoc + '-file');
    var xemTruoc = document.getElementById(idGoc + '-xem');
    var bao = document.getElementById(idGoc + '-bao');
    var oLink = document.getElementById(idGoc + '-link');
    var nutLink = document.getElementById(idGoc + '-dung-link');
    if (!oFile) return function () { return url; };

    var baoLoi = function (chu) { bao.className = 'trang-thai-anh loi'; bao.textContent = chu; };
    var baoOk = function (chu) { bao.className = 'trang-thai-anh'; bao.textContent = chu; };

    // Cách 1: chọn file -> nén -> tải lên máy chủ
    oFile.addEventListener('change', function () {
      var f = oFile.files && oFile.files[0];
      if (!f) return;
      baoOk('Đang nén và tải ảnh lên...');
      taiAnhLen(f, function (u) {
        url = u;
        if (oLink) oLink.value = '';
        if (xemTruoc) xemTruoc.src = anhDayDu(u);
        baoOk('Đã lưu ảnh vào máy chủ ✓');
      }, baoLoi);
    });

    /* Cách 2: dán link ảnh có sẵn trên web khác. Thử nạp bằng thẻ <img> trước khi nhận:
       link trỏ vào trang web, Google Drive, hay web kia chặn hotlink thì nạp hỏng và
       được báo ngay, thay vì lưu xong mới thấy ô vỡ ngoài bảng. */
    var dungLink = function () {
      var u = (oLink.value || '').trim();
      if (!u) { baoLoi('Dán link ảnh vào ô trước đã.'); return; }
      if (!laLinkNgoai(u)) { baoLoi('Link phải bắt đầu bằng http:// hoặc https://'); return; }
      baoOk('Đang kiểm tra link...');
      var thu = new Image();
      thu.onload = function () {
        url = u;
        if (xemTruoc) xemTruoc.src = u;
        baoOk('Đã dùng ảnh từ link ngoài ✓');
      };
      thu.onerror = function () {
        baoLoi('Không tải được ảnh từ link này. Link phải trỏ thẳng tới file ảnh (.jpg/.png/.webp)');
      };
      thu.src = u;
    };
    if (nutLink) nutLink.addEventListener('click', dungLink);
    if (oLink) oLink.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); dungLink(); }
    });

    return function () { return url; };
  };

  /**
   * BỘ NHIỀU ẢNH — cho sản phẩm, web khách dùng làm slide ở trang chi tiết.
   * Ảnh đầu tiên là ảnh bìa (hiện ở thẻ sản phẩm, giỏ hàng). Thêm bằng file
   * (chọn nhiều file một lúc) hoặc dán link; mỗi ảnh đổi được thứ tự và bỏ đi.
   * htmlBoAnh vẽ khung, ganBoAnh gắn sự kiện rồi trả về hàm lấy danh sách.
   */
  var htmlBoAnh = function (idGoc) {
    return '<div class="bo-anh">' +
      '<div class="luoi-bo-anh" id="' + idGoc + '-luoi"></div>' +
      '<div class="thanh-bo-anh">' +
      '<label class="nut-tai-anh" for="' + idGoc + '-file"><i class="fa-solid fa-images"></i> Thêm ảnh</label>' +
      '<input type="file" id="' + idGoc + '-file" accept="image/*" multiple />' +
      '<div class="dan-link-anh">' +
      '<input type="url" id="' + idGoc + '-link" aria-label="Link ảnh từ web khác" />' +
      '<button type="button" class="nut nut-vien nut-nho" id="' + idGoc + '-them-link">Thêm link</button>' +
      '</div></div>' +
      '<div class="trang-thai-anh" id="' + idGoc + '-bao"></div>' +
      '</div>';
  };

  /** khiDoi(ds): gọi mỗi lần danh sách ảnh đổi — để hộp sửa cập nhật ảnh bìa to bên trái. */
  var ganBoAnh = function (idGoc, dsBanDau, khiDoi) {
    var ds = (dsBanDau || []).filter(Boolean).slice();
    var luoi = document.getElementById(idGoc + '-luoi');
    var oFile = document.getElementById(idGoc + '-file');
    var oLink = document.getElementById(idGoc + '-link');
    var nutLink = document.getElementById(idGoc + '-them-link');
    var bao = document.getElementById(idGoc + '-bao');
    if (!luoi) return function () { return ds.slice(); };

    var baoLoi = function (chu) { bao.className = 'trang-thai-anh loi'; bao.textContent = chu; };
    var baoOk = function (chu) { bao.className = 'trang-thai-anh'; bao.textContent = chu; };

    var ve = function () {
      luoi.innerHTML = ds.map(function (u, i) {
        return '<div class="o-bo-anh' + (i === 0 ? ' bia' : '') + '">' +
          '<img src="' + esc(anhDayDu(u)) + '" alt="" onerror="this.style.opacity=\'.25\'" />' +
          (i === 0 ? '<span class="nhan-bia">Ảnh bìa</span>' : '') +
          '<div class="nut-bo-anh">' +
          (i > 0 ? '<button type="button" data-lam="trai" data-i="' + i + '" title="Lên trước">' +
                   '<i class="fa-solid fa-arrow-left"></i></button>' : '') +
          (i < ds.length - 1 ? '<button type="button" data-lam="phai" data-i="' + i + '" title="Ra sau">' +
                               '<i class="fa-solid fa-arrow-right"></i></button>' : '') +
          '<button type="button" data-lam="xoa" data-i="' + i + '" title="Bỏ ảnh">' +
          '<i class="fa-solid fa-xmark"></i></button>' +
          '</div></div>';
      }).join('') || '<div class="bo-anh-trong">Chưa có ảnh</div>';
      if (typeof khiDoi === 'function') khiDoi(ds.slice());
    };

    luoi.addEventListener('click', function (e) {
      var nut = e.target.closest('button[data-lam]');
      if (!nut) return;
      var i = parseInt(nut.getAttribute('data-i'), 10);
      var lam = nut.getAttribute('data-lam');
      if (lam === 'xoa') ds.splice(i, 1);
      if (lam === 'trai' && i > 0) ds.splice(i - 1, 0, ds.splice(i, 1)[0]);
      if (lam === 'phai' && i < ds.length - 1) ds.splice(i + 1, 0, ds.splice(i, 1)[0]);
      ve();
    });

    // Chọn nhiều file: nén và tải lên LẦN LƯỢT, xong cái nào hiện cái đó
    oFile.addEventListener('change', function () {
      var files = Array.prototype.slice.call(oFile.files || []);
      oFile.value = '';
      if (!files.length) return;
      var xong = 0, loi = 0;
      var tiep = function () {
        if (!files.length) {
          if (loi) baoLoi('Thêm được ' + xong + ' ảnh, ' + loi + ' ảnh lỗi.');
          else baoOk('Đã thêm ' + xong + ' ảnh ✓');
          return;
        }
        baoOk('Đang tải ảnh ' + (xong + loi + 1) + '...');
        taiAnhLen(files.shift(), function (u) {
          ds.push(u); xong++; ve(); tiep();
        }, function () { loi++; tiep(); });
      };
      tiep();
    });

    // Dán link: thử nạp bằng <img> trước khi nhận, link hỏng thì báo ngay
    var themLink = function () {
      var u = (oLink.value || '').trim();
      if (!u) { baoLoi('Dán link ảnh vào ô trước đã.'); return; }
      if (!laLinkNgoai(u)) { baoLoi('Link phải bắt đầu bằng http:// hoặc https://'); return; }
      baoOk('Đang kiểm tra link...');
      var thu = new Image();
      thu.onload = function () {
        if (ds.indexOf(u) < 0) ds.push(u);
        oLink.value = '';
        ve();
        baoOk('Đã thêm ảnh từ link ✓');
      };
      thu.onerror = function () {
        baoLoi('Không tải được ảnh từ link này. Link phải trỏ thẳng tới file ảnh (.jpg/.png/.webp)');
      };
      thu.src = u;
    };
    nutLink.addEventListener('click', themLink);
    oLink.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); themLink(); }
    });

    ve();
    return function () { return ds.slice(); };
  };

  /** HTML của ô ảnh dùng chung (sản phẩm, vật tư, bài viết): chọn file HOẶC dán link ngoài. */
  var htmlOTaiAnh = function (idGoc, urlHienTai, nhan) {
    var linkCu = laLinkNgoai(urlHienTai) ? urlHienTai : '';
    return '<div class="o-anh">' +
      '<img class="xem-truoc" id="' + idGoc + '-xem" alt="" ' +
      (urlHienTai ? 'src="' + esc(anhDayDu(urlHienTai)) + '" ' : '') +
      'onerror="this.removeAttribute(\'src\')" />' +
      '<div class="phai-anh">' +
      '<label class="nut-tai-anh" for="' + idGoc + '-file"><i class="fa-solid fa-image"></i> ' +
      esc(nhan || 'Chọn ảnh') + '</label>' +
      '<input type="file" id="' + idGoc + '-file" accept="image/*" />' +
      '<div class="dan-link-anh">' +
      '<input type="url" id="' + idGoc + '-link" aria-label="Link ảnh từ web khác" value="' +
      esc(linkCu) + '" />' +
      '<button type="button" class="nut nut-vien nut-nho" id="' + idGoc + '-dung-link">Dùng link</button></div>' +
      '<div class="trang-thai-anh" id="' + idGoc + '-bao">' +
      (linkCu ? 'Đang dùng ảnh từ link ngoài.' : '') +
      '</div></div></div>';
  };

  /* ---------------- Thao tác vật tư & nhà cung cấp ---------------- */

  var suaVatTu = function (id, thayDoi, thongBao) {
    return ghiRoiCapNhat('PUT', '/vat-tu/' + id, thayDoi, thongBao || 'Đã lưu vật tư');
  };
  var themVatTu = function (duLieu, thongBao) {
    return ghiRoiCapNhat('POST', '/vat-tu', duLieu, thongBao || 'Đã thêm vật tư');
  };
  var xoaVatTu = function (id) {
    return xoaSauKhiHoi('Xoá vật tư này khỏi kho?', '/vat-tu/' + id, 'Đã xoá vật tư');
  };
  /**
   * Mã màu dự phòng theo TÊN — dùng khi bản ghi chỉ có chữ "Trắng", "Xám"...
   * mà chưa trỏ sang bảng màu (dữ liệu nhập từ trước khi có bảng mau_sac).
   * Không có bảng này thì cột Màu chỉ hiện một ô xám trống, nhìn như chưa chọn màu.
   */
  var MA_MAU_THEO_TEN = {
    'do': '#e03131', 'vang': '#f5b400', 'den': '#1c1c1c', 'trang': '#f8f9fa',
    'be': '#e0cda9', 'xam': '#868e96', 'ghi': '#868e96', 'cam': '#f76707',
    'hong': '#e64980', 'tim': '#7048e8', 'nau': '#8b5e34', 'bac': '#c9ced6',
    'vang kim': '#d4af37', 'xanh la': '#2f9e44', 'xanh luc': '#2f9e44',
    'xanh duong': '#1971c2', 'xanh bien': '#1971c2', 'xanh ngoc': '#10b981',
    'xanh': '#1971c2', 'trong suot': '#dee2e6', 'da quang': '#b2f2bb'
  };

  /** "Xanh Lá" -> "xanh la" để tra bảng trên (bỏ dấu, thường hoá). */
  var khongDau = function (t) {
    return String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
  };

  /** Mã hex của một màu: ưu tiên mã đã lưu, rồi bảng màu, cuối cùng là bảng tra theo tên. */
  var maMauCua = function (maMau, tenMau) {
    if (/^#[0-9a-fA-F]{6}$/.test(maMau || '')) return maMau;
    var ten = khongDau(tenMau);
    if (ten) {
      for (var i = 0; i < MAU_SAC.length; i++) {
        if (khongDau(MAU_SAC[i].ten) === ten && /^#[0-9a-fA-F]{6}$/.test(MAU_SAC[i].maMau || '')) {
          return MAU_SAC[i].maMau;
        }
      }
      if (MA_MAU_THEO_TEN[ten]) return MA_MAU_THEO_TEN[ten];
    }
    return '';
  };

  /** Ô vuông màu nhỏ đứng trước tên màu. Truyền thêm tên màu để tra mã khi thiếu. */
  var oMau = function (maMau, tenMau, co) {
    var m = maMauCua(maMau, tenMau) || '#e4e6e9';
    var px = (co || 13) + 'px';
    return '<span style="display:inline-block;width:' + px + ';height:' + px + ';border-radius:4px;' +
      'vertical-align:-2px;margin-right:6px;border:1px solid rgba(0,0,0,.18);background:' + m + '"></span>';
  };

  /** Ô màu + tên màu của một vật tư, dùng chung cho mọi bảng có cột Màu. */
  var nhanMau = function (v, co) {
    if (!v || !v.mau) return '<span style="color:var(--chu-mo)">—</span>';
    return '<span class="badge badge-xam">' + oMau(v.maMau, v.mau, co) + esc(v.mau) + '</span>';
  };

  /**
   * Dãy màu của một SẢN PHẨM. Không có ô "chọn màu" cho sản phẩm: màu ở đây
   * là màu của những cuộn nhựa đã dùng để in nó, nên không bao giờ lệch với kho.
   */
  var mauSanPham = function (p, co) {
    var ds = (p && p.mauSac) || [];
    if (!ds.length) return '<span style="color:var(--chu-mo)">—</span>';
    return ds.map(function (m) {
      return '<span class="badge badge-xam">' + oMau(m.maMau, m.ten, co) + esc(m.ten) + '</span>';
    }).join(' ');
  };

  /** Tìm màu theo id trong bảng màu đã nạp. */
  var timMau = function (id) {
    for (var i = 0; i < MAU_SAC.length; i++) if (MAU_SAC[i].id === id) return MAU_SAC[i];
    return null;
  };

  var themMauSac = function (duLieu, thongBao) {
    return ghiRoiCapNhat('POST', '/mau-sac', duLieu, thongBao || 'Đã thêm màu');
  };
  var suaMauSac = function (id, td, thongBao) {
    return ghiRoiCapNhat('PUT', '/mau-sac/' + id, td, thongBao || 'Đã lưu màu');
  };
  var xoaMauSac = function (id) {
    return xoaSauKhiHoi('Xoá màu này? Vật tư đang dùng màu vẫn giữ nguyên tên màu cũ.', '/mau-sac/' + id, 'Đã xoá màu');
  };

  /* ---------------- Danh mục sản phẩm ---------------- */

  /** Tìm danh mục theo id trong danh sách đã nạp. */
  var timDanhMuc = function (id) {
    for (var i = 0; i < DANH_MUC.length; i++) if (DANH_MUC[i].id === id) return DANH_MUC[i];
    return null;
  };

  /** Tên danh mục để hiện trong bảng; chưa xếp danh mục thì trả về chuỗi rỗng. */
  var tenDanhMuc = function (id) {
    var d = timDanhMuc(id);
    return d ? d.ten : '';
  };

  /** Huy hiệu danh mục — chưa xếp thì hiện "Chưa phân loại" màu xám. */
  var badgeDanhMuc = function (id) {
    var d = timDanhMuc(id);
    if (!d) return '<span class="badge badge-xam"><i class="fa-solid fa-folder-open"></i>Chưa phân loại</span>';
    return '<span class="badge badge-duong"><i class="fa-solid ' + esc(d.icon || 'fa-folder') + '"></i>' +
      esc(d.ten) + '</span>';
  };

  /* Bảng danh mục chứa HAI nhóm: danh mục sản phẩm (nhom = san_pham) và loại vật tư
     (nhom = vat_tu). Trang Sản phẩm chỉ lấy nhóm đầu, ô "Loại" ở Kho chỉ lấy nhóm sau. */
  var danhMucSanPham = function () {
    return DANH_MUC.filter(function (d) { return d.nhom !== 'vat_tu'; });
  };
  var danhMucVatTu = function () {
    return DANH_MUC.filter(function (d) { return d.nhom === 'vat_tu'; });
  };

  /** Tên loại của một vật tư: ưu tiên tên loại trong bảng danh mục, không có thì tên tính chất. */
  var tenLoaiVatTu = function (v) {
    var d = timDanhMuc(v && v.danhMucId);
    return d ? d.ten : (LOAI_VAT_TU[v && v.loai] || 'Khác');
  };

  /** Các cuộn nhựa trong kho — dùng cho ô chọn nhựa ở trang Sản phẩm. */
  var cuonNhua = function () {
    return VAT_TU.filter(function (v) { return v.loai === 'nhua'; });
  };

  /** Tra một vật tư theo id. */
  var timVatTu = function (id) {
    for (var i = 0; i < VAT_TU.length; i++) if (VAT_TU[i].id === id) return VAT_TU[i];
    return null;
  };

  var themDanhMuc = function (duLieu, thongBao) {
    return ghiRoiCapNhat('POST', '/danh-muc', duLieu, thongBao || 'Đã thêm');
  };
  var suaDanhMuc = function (id, td, thongBao) {
    return ghiRoiCapNhat('PUT', '/danh-muc/' + id, td, thongBao || 'Đã lưu');
  };
  var xoaDanhMuc = function (id) {
    return xoaSauKhiHoi('Xoá danh mục này? Sản phẩm / vật tư đang thuộc sẽ chuyển về "Chưa phân loại".',
      '/danh-muc/' + id, 'Đã xoá danh mục');
  };

  var themKhuyenMai = function (duLieu, thongBao) {
    return ghiRoiCapNhat('POST', '/khuyen-mai', duLieu, thongBao || 'Đã tạo khuyến mãi');
  };
  var suaKhuyenMai = function (id, td, thongBao) {
    return ghiRoiCapNhat('PUT', '/khuyen-mai/' + id, td, thongBao || 'Đã lưu khuyến mãi');
  };
  var xoaKhuyenMai = function (id) {
    return xoaSauKhiHoi('Xoá mã khuyến mãi này? Mã vào thùng rác, đơn cũ đã dùng vẫn giữ nguyên.',
      '/khuyen-mai/' + id, 'Đã xoá khuyến mãi');
  };

  var themBaiViet = function (duLieu, thongBao) {
    return ghiRoiCapNhat('POST', '/bai-viet', duLieu, thongBao || 'Đã đăng bài viết');
  };
  var suaBaiViet = function (id, td, thongBao) {
    return ghiRoiCapNhat('PUT', '/bai-viet/' + id, td, thongBao || 'Đã lưu bài viết');
  };
  var xoaBaiViet = function (id) {
    return xoaSauKhiHoi('Xoá bài viết này? Bài vào thùng rác, khôi phục lại được.', '/bai-viet/' + id, 'Đã xoá bài viết');
  };

  /** Bảng tra chuyên mục bài viết — dùng chung cho trang quản trị và trang khách. */
  var CHUYEN_MUC = {
    'huong-dan':   { ten: 'Hướng dẫn',   mau: 'badge-duong', icon: 'fa-screwdriver-wrench' },
    'vat-lieu':    { ten: 'Vật liệu',    mau: 'badge-xanh',  icon: 'fa-layer-group' },
    'kinh-nghiem': { ten: 'Kinh nghiệm', mau: 'badge-vang',  icon: 'fa-lightbulb' },
    'tin-shop':    { ten: 'Tin shop',    mau: 'badge-tim',   icon: 'fa-bullhorn' }
  };
  var badgeChuyenMuc = function (cm) { return badgeTheoMap(CHUYEN_MUC, cm || 'huong-dan'); };

  var themNhaCungCap = function (duLieu, thongBao) {
    return ghiRoiCapNhat('POST', '/nha-cung-cap', duLieu, thongBao || 'Đã thêm nhà cung cấp');
  };
  var suaNhaCungCap = function (id, td, thongBao) {
    return ghiRoiCapNhat('PUT', '/nha-cung-cap/' + id, td, thongBao || 'Đã lưu nhà cung cấp');
  };
  var xoaNhaCungCap = function (id) {
    return xoaSauKhiHoi('Xoá nhà cung cấp này?', '/nha-cung-cap/' + id, 'Đã xoá nhà cung cấp');
  };

  /* ---------------- Menu ---------------- */

  var NAV = [
    { label: 'Quản lý bán hàng', items: [
      { key: 'tong-quan', text: 'Tổng quan', href: 'index.html', icon: 'fa-chart-pie' },
      { key: 'don-hang', text: 'Đơn hàng', href: 'don-hang.html', icon: 'fa-cart-shopping', badge: function () { return (DEM && DEM.donChoXacNhan) || ''; } },
      { key: 'khach-hang', text: 'Khách hàng', href: 'khach-hang.html', icon: 'fa-users' },
      { key: 'khuyen-mai', text: 'Khuyến mãi', href: 'khuyen-mai.html', icon: 'fa-tags' }
    ]},
    { label: 'Quản lý sản phẩm', items: [
      { key: 'san-pham', text: 'Sản phẩm', href: 'san-pham.html', icon: 'fa-cube' },
      { key: 'danh-muc', text: 'Danh mục', href: 'danh-muc.html', icon: 'fa-folder-tree' },
      // Bộ sưu tập: gom sản phẩm thành chủ đề trên web khách (một sản phẩm nằm được nhiều bộ)
      { key: 'bo-suu-tap', text: 'Bộ sưu tập', href: 'bo-suu-tap.html', icon: 'fa-layer-group' },
      { key: 'kho', text: 'Kho & vật tư', href: 'kho.html', icon: 'fa-warehouse' },
      { key: 'nha-cung-cap', text: 'Nhà cung cấp', href: 'nha-cung-cap.html', icon: 'fa-truck-field' },
      { key: 'mau-sac', text: 'Màu sắc', href: 'mau-sac.html', icon: 'fa-palette' }
    ]},
    { label: 'Nội dung website', items: [
      { key: 'bai-viet', text: 'Bài viết', href: 'bai-viet.html', icon: 'fa-newspaper' }
    ]},
    { label: 'Quản lý tài chính', items: [
      { key: 'quan-ly-von', text: 'Quản lý vốn', href: 'quan-ly-von.html', icon: 'fa-coins' },
      { key: 'bao-cao', text: 'Doanh thu', href: 'bao-cao.html', icon: 'fa-chart-line' }
    ]},
    { label: 'Hệ thống', items: [
      { key: 'cai-dat', text: 'Cài đặt cửa hàng', href: 'cai-dat.html', icon: 'fa-gear' }
    ]}
  ];

  /* ---------------- Vẽ khung trang ---------------- */

  var shell = function (activeKey, tieuDe) {
    var phien = layPhien();

    // Sidebar
    var sb = '<aside class="apex-sidebar" id="apex-sidebar">' +
      '<a class="thuong-hieu" href="index.html">' +
      '<img src="assets/img/logo.png" alt="IN3D" />' +
      '<div><div class="ten">' + BRAND + '</div></div></a>' +
      '<div class="cuon">';
    NAV.forEach(function (g) {
      sb += '<div class="apex-nhom">' + esc(g.label) + '</div>';
      g.items.forEach(function (m) {
        var badge = typeof m.badge === 'function' ? m.badge() : '';
        sb += '<a class="apex-muc' + (m.key === activeKey ? ' active' : '') + '" href="' + m.href + '">' +
          '<i class="fa-solid ' + m.icon + '"></i><span>' + esc(m.text) + '</span>' +
          (badge ? '<span class="badge-muc">' + badge + '</span>' : '') + '</a>';
      });
    });
    sb += '<div class="apex-nhom">Tài khoản</div>';
    sb += phien
      ? '<a class="apex-muc" href="#" onclick="Apex.dangXuat();return false;"><i class="fa-solid fa-right-from-bracket"></i><span>Đăng xuất</span></a>'
      : '<a class="apex-muc' + (activeKey === 'dang-nhap' ? ' active' : '') + '" href="dang-nhap.html"><i class="fa-solid fa-right-to-bracket"></i><span>Đăng nhập</span></a>';
    sb += '</div></aside><div class="apex-phu-mo" id="apex-phu-mo" onclick="Apex.dongMenu()"></div>';
    fill('#apex-sidebar-cho', sb);

    // Topbar
    var tat = phien && phien.hoTen
      ? phien.hoTen.split(' ').slice(-2).map(function (w) { return w.charAt(0); }).join('').toUpperCase()
      : '?';
    var tb = '<header class="apex-topbar">' +
      '<button class="nut-menu" onclick="Apex.moMenu()" aria-label="Mở menu"><i class="fa-solid fa-bars"></i></button>' +
      '<div class="tieu-de">' + esc(tieuDe || '') + '</div>' +
      '<div class="tim"><span class="bieu-tuong"><i class="fa-solid fa-magnifying-glass"></i></span>' +
      '<input type="search" aria-label="Tìm trong bảng" oninput="Apex.timTrongBang(this.value)" /></div>' +
      // Sửa tay trên Supabase Dashboard thì bộ nhớ đệm của server còn giữ số cũ tới 10 phút:
      // nút này bắt server đọc lại cả 9 bộ dữ liệu rồi vẽ lại trang. Cần token admin nên chỉ
      // hiện khi đang đăng nhập; hết quyền / mất backend thì Apex.lamMoi() reject và dangLuu báo đỏ.
      (phien
        ? '<button class="nut-lam-moi" type="button" onclick="Apex.bamLamMoi(this)" ' +
          'title="Đọc lại dữ liệu từ database (sau khi sửa tay trên Supabase Dashboard)">' +
          '<i class="fa-solid fa-rotate"></i><span>Làm mới</span></button>'
        : '') +
      '<div class="nguoi-dung" onclick="' + (phien ? '' : "window.location.href='dang-nhap.html'") + '">' +
      '<span class="avatar">' + esc(tat) + '</span>' +
      '<span class="ten">' + esc(phien ? phien.hoTen : 'Đăng nhập') + '</span>' +
      (phien ? '<a class="thoat" href="#" onclick="event.stopPropagation();Apex.dangXuat();return false;">Thoát</a>' : '') +
      '</div></header>';
    fill('#apex-topbar-cho', tb);

    // Thông báo backend tắt + số đơn chờ trên menu được điền sau khi dữ liệu về
    // (capNhatBanner / capNhatBadgeMenu); shell() thường chạy trước lúc đó.
    if (DA_THU) { capNhatBanner(); capNhatBadgeMenu(); }
  };

  var moMenu = function () {
    document.getElementById('apex-sidebar').classList.add('mo');
    document.getElementById('apex-phu-mo').classList.add('hien');
  };
  var dongMenu = function () {
    document.getElementById('apex-sidebar').classList.remove('mo');
    document.getElementById('apex-phu-mo').classList.remove('hien');
  };

  /* ---------------- Tìm trong bảng + sắp xếp theo cột ----------------
     Hai thứ này chạy trên CHÍNH các hàng đang hiện, không cần từng trang sửa gì: ô tìm ở
     thanh trên lọc hàng theo từ khoá, bấm tiêu đề cột thì sắp xếp tăng / giảm dần.
     Trang vẽ lại bảng (sau mỗi lần lưu, mỗi lần đổi bộ lọc) thì tự áp dụng lại cả hai. */

  var TU_KHOA_TIM = '';     // từ khoá đang gõ ở ô tìm
  var SAP_XEP = {};         // khoá bảng -> { cot: số thứ tự cột, giam: true/false }

  /** Khoá nhớ kiểu sắp xếp của một bảng: id của bảng / thẻ chứa, không có thì theo thứ tự trên trang. */
  function khoaBang(bang) {
    var than = bang.querySelector('tbody');
    if (than && than.id) return than.id;
    if (bang.id) return bang.id;
    return 'bang-' + Array.prototype.indexOf.call(document.querySelectorAll('table.bang'), bang);
  }

  /**
   * Giá trị để so sánh của một ô: số (tiền, gram, số lượng, %) thì so theo số, ngày
   * dd/mm/yyyy so theo thời gian, còn lại so theo chữ (có dấu tiếng Việt).
   * Ô trống / "—" luôn xuống cuối.
   */
  function giaTriSap(td) {
    var chu = (td ? td.textContent : '').replace(/\s+/g, ' ').trim();
    if (!chu || chu === '—' || chu === '-') return { trong: true, so: 0, chu: '' };
    var ngay = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(chu);
    if (ngay) {
      return { trong: false, so: new Date(+ngay[3], +ngay[2] - 1, +ngay[1]).getTime(), chu: '' };
    }
    // "19.000 ₫", "1.611.777", "2–9g/cái", "73,5%" -> lấy cụm số đầu tiên (chấm = phân nhóm nghìn)
    var m = /-?\d[\d.]*(,\d+)?/.exec(chu);
    if (m && /\d/.test(chu.charAt(0)) || (m && /^[^a-zA-ZÀ-ỹ]*\d/.test(chu))) {
      var so = parseFloat(m[0].replace(/\./g, '').replace(',', '.'));
      if (!isNaN(so)) return { trong: false, so: so, chu: '' };
    }
    return { trong: false, so: null, chu: chu.toLowerCase() };
  }

  /** Sắp xếp các hàng của một bảng theo kiểu đang nhớ; chưa chọn cột nào thì để nguyên. */
  function sapXepBang(bang) {
    var kieu = SAP_XEP[khoaBang(bang)];
    var than = bang.querySelector('tbody');
    if (!kieu || !than) return;
    var hang = Array.prototype.slice.call(than.rows);
    // Hàng báo trống ("Chưa có ...") chỉ có một ô trải dài: để yên, không sắp xếp
    if (hang.length < 2 || hang.some(function (tr) { return tr.cells.length <= 1; })) return;

    var dau = hang.map(function (tr, i) {
      return { tr: tr, i: i, v: giaTriSap(tr.cells[kieu.cot]) };
    });
    dau.sort(function (a, b) {
      if (a.v.trong !== b.v.trong) return a.v.trong ? 1 : -1;      // ô trống xuống cuối
      var d;
      if (a.v.so !== null && b.v.so !== null) d = a.v.so - b.v.so;
      else d = String(a.v.chu).localeCompare(String(b.v.chu), 'vi');
      if (d) return kieu.giam ? -d : d;
      return a.i - b.i;                                            // giữ thứ tự cũ khi bằng nhau
    });
    dau.forEach(function (x) { than.appendChild(x.tr); });

    // Mũi tên trên tiêu đề cột
    var oTieuDe = bang.querySelectorAll('thead th');
    Array.prototype.forEach.call(oTieuDe, function (th, k) {
      th.classList.toggle('sx-tang', k === kieu.cot && !kieu.giam);
      th.classList.toggle('sx-giam', k === kieu.cot && kieu.giam);
    });
  }

  /** Ẩn hàng không khớp từ khoá đang gõ. */
  function locTheoTuKhoa(bang) {
    var than = bang.querySelector('tbody');
    if (!than) return;
    Array.prototype.forEach.call(than.rows, function (tr) {
      tr.style.display = !TU_KHOA_TIM || tr.textContent.toLowerCase().indexOf(TU_KHOA_TIM) >= 0 ? '' : 'none';
    });
  }

  /** Áp dụng lại sắp xếp + lọc cho mọi bảng trên trang (gọi sau mỗi lần trang vẽ lại bảng). */
  var apDungBang = function () {
    document.querySelectorAll('table.bang').forEach(function (bang) {
      sapXepBang(bang);
      locTheoTuKhoa(bang);
    });
  };

  var timTrongBang = function (tuKhoa) {
    TU_KHOA_TIM = (tuKhoa || '').toLowerCase().trim();
    document.querySelectorAll('table.bang').forEach(locTheoTuKhoa);
  };

  function batSapXep() {
    if (!document.getElementById('css-sap-xep')) {
      var st = document.createElement('style');
      st.id = 'css-sap-xep';
      st.textContent =
        'table.bang thead th{cursor:pointer;user-select:none;position:relative;padding-right:18px}' +
        'table.bang thead th::after{content:"\\f0dc";font-family:"Font Awesome 6 Free";font-weight:900;' +
        'font-size:9px;position:absolute;right:6px;top:50%;transform:translateY(-50%);opacity:.22}' +
        'table.bang thead th:hover::after{opacity:.55}' +
        'table.bang thead th.sx-tang::after{content:"\\f0de";opacity:1;color:var(--accent-dam)}' +
        'table.bang thead th.sx-giam::after{content:"\\f0dd";opacity:1;color:var(--accent-dam)}' +
        'table.bang thead th.phai{padding-right:18px}';
      document.head.appendChild(st);
    }

    // Bấm tiêu đề cột: lần 1 tăng dần, lần 2 giảm dần, lần 3 về thứ tự gốc của trang
    document.addEventListener('click', function (e) {
      var th = e.target.closest('table.bang thead th');
      if (!th) return;
      var bang = th.closest('table.bang');
      var cot = Array.prototype.indexOf.call(th.parentElement.cells, th);
      var khoa = khoaBang(bang);
      var kieu = SAP_XEP[khoa];
      if (!kieu || kieu.cot !== cot) SAP_XEP[khoa] = { cot: cot, giam: false };
      else if (!kieu.giam) kieu.giam = true;
      else {
        delete SAP_XEP[khoa];
        Array.prototype.forEach.call(bang.querySelectorAll('thead th'), function (x) {
          x.classList.remove('sx-tang', 'sx-giam');
        });
        if (typeof veLaiTrang === 'function') { try { veLaiTrang(); } catch (bo) { } }
        return;
      }
      sapXepBang(bang);
      locTheoTuKhoa(bang);
    });

    // Trang vẽ lại bảng thì áp dụng lại — khỏi phải sửa từng trang
    // KHÔNG theo dõi DOM bằng MutationObserver: chính việc sắp xếp cũng đổi DOM nên nó tự
    // gọi lại mình mãi, trang treo cứng. Chỗ duy nhất cần bám là Apex.fill (mọi trang đều
    // vẽ bảng qua đó) — xem hàm fill.
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batSapXep);
  else batSapXep();

  // Menu thao tác (dropdown ba chấm)
  var batMenuThaoTac = function () {
    document.addEventListener('click', function (e) {
      var nut = e.target.closest('.thao-tac > button');
      document.querySelectorAll('.thao-tac.mo').forEach(function (t) {
        if (!nut || t !== nut.parentElement) t.classList.remove('mo');
      });
      if (nut) nut.parentElement.classList.toggle('mo');
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', batMenuThaoTac);
  else batMenuThaoTac();

  /* ---------------- Biểu đồ (ECharts qua CDN) ---------------- */

  var MAU_BIEU_DO = ['#10b981', '#f5b400', '#059669', '#c49000', '#84cc16', '#94a3b8'];

  var BIEU_DO = {};         // id khung -> biểu đồ đang vẽ, để resize và huỷ đúng cái cũ
  var CHO_VE = {};          // id khung -> option đang chờ echarts tải xong
  var DA_CHO_ECHARTS = false;
  var DA_GAN_RESIZE = false;

  /* echarts (~1 MB) có thể tải SAU apex.js (defer) để dữ liệu được gọi sớm: dữ liệu về trước
     thì cất option lại, script echarts chạy xong mới vẽ. */
  var veHangCho = function () {
    if (!window.echarts) return;
    Object.keys(CHO_VE).forEach(function (id) {
      var option = CHO_VE[id];
      delete CHO_VE[id];
      veBieuDo(id, option);
    });
  };
  var choEcharts = function (id, option) {
    CHO_VE[id] = option;
    if (DA_CHO_ECHARTS) return;
    DA_CHO_ECHARTS = true;
    var the = document.querySelector('script[src*="echarts"]');
    if (the) the.addEventListener('load', veHangCho);
    document.addEventListener('DOMContentLoaded', veHangCho);
    window.addEventListener('load', veHangCho);
  };

  /* MỘT listener resize cho mọi biểu đồ. Bản cũ gắn thêm một listener mỗi lần vẽ lại,
     listener cũ vẫn gọi resize vào biểu đồ đã huỷ — càng lưu nhiều càng nặng. */
  var ganResize = function () {
    if (DA_GAN_RESIZE) return;
    DA_GAN_RESIZE = true;
    window.addEventListener('resize', function () {
      Object.keys(BIEU_DO).forEach(function (id) {
        var c = BIEU_DO[id];
        if (!c || c.isDisposed()) { delete BIEU_DO[id]; return; }
        if (!document.body.contains(c.getDom())) { c.dispose(); delete BIEU_DO[id]; return; }
        c.resize();
      });
    });
  };

  var veBieuDo = function (id, option) {
    var el = document.getElementById(id);
    if (!el) return null;
    if (!window.echarts) { choEcharts(id, option); return null; }
    delete CHO_VE[id];
    // Khung cũ bị thay bằng HTML mới (trang fill lại cả khối) thì huỷ biểu đồ nằm trên khung cũ
    var cu = BIEU_DO[id];
    if (cu && !cu.isDisposed() && cu.getDom() !== el) cu.dispose();
    cu = window.echarts.getInstanceByDom(el);
    if (cu) cu.dispose();   // vẽ lại sau khi nạp dữ liệu mới thì bỏ instance cũ trước
    var chart = window.echarts.init(el);
    chart.setOption(option);
    BIEU_DO[id] = chart;
    ganResize();
    return chart;
  };

  var truc = { axisLine: { lineStyle: { color: '#e4e6e9' } }, axisLabel: { color: '#6b7280' }, axisTick: { show: false } };

  /** 1200000 -> "1,2 tr" | 450000 -> "450 ng" — trục biểu đồ cho gọn. */
  var tienNgan = function (v) {
    v = Number(v) || 0;
    if (v >= 1000000) return (Math.round(v / 100000) / 10).toString().replace('.', ',') + ' tr';
    if (v >= 1000) return Math.round(v / 1000) + ' ng';
    return String(v);
  };

  var bieuDoDuong = function (id, nhan, cacDay, laTien) {
    return veBieuDo(id, {
      color: MAU_BIEU_DO,
      tooltip: {
        trigger: 'axis',
        valueFormatter: laTien ? function (v) { return money(v); } : undefined
      },
      legend: { bottom: 0, textStyle: { color: '#6b7280' } },
      grid: { left: 10, right: 16, top: 20, bottom: 40, containLabel: true },
      xAxis: Object.assign({ type: 'category', data: nhan, boundaryGap: false }, truc),
      yAxis: Object.assign({
        type: 'value',
        splitLine: { lineStyle: { color: '#eef0f2' } },
        axisLabel: laTien ? { formatter: tienNgan } : undefined
      }, truc),
      series: cacDay.map(function (d, i) {
        return { name: d.ten, type: 'line', smooth: true, symbolSize: 5, data: d.duLieu,
          lineStyle: { width: i === 0 ? 3 : 2, type: i === 0 ? 'solid' : 'dashed' },
          areaStyle: i === 0 ? { opacity: 0.12 } : undefined };
      })
    });
  };

  var bieuDoCot = function (id, nhan, duLieu, tenDay) {
    return veBieuDo(id, {
      color: MAU_BIEU_DO,
      tooltip: { trigger: 'axis' },
      grid: { left: 10, right: 16, top: 20, bottom: 24, containLabel: true },
      xAxis: Object.assign({ type: 'category', data: nhan }, truc),
      yAxis: Object.assign({ type: 'value', splitLine: { lineStyle: { color: '#eef0f2' } } }, truc),
      series: [{ name: tenDay || '', type: 'bar', barMaxWidth: 22, itemStyle: { borderRadius: [5, 5, 0, 0] }, data: duLieu }]
    });
  };

  var bieuDoTron = function (id, duLieu) {
    return veBieuDo(id, {
      color: MAU_BIEU_DO,
      tooltip: { trigger: 'item', formatter: '{b}: <strong>{c}</strong> ({d}%)' },
      legend: { bottom: 0, textStyle: { color: '#6b7280' } },
      series: [{ type: 'pie', radius: ['55%', '78%'], center: ['50%', '44%'],
        itemStyle: { borderColor: '#fff', borderWidth: 2 }, label: { show: false }, data: duLieu }]
    });
  };

  /* ---------------- Xuất API ---------------- */

  return {
    brand: BRAND,
    // Khởi tạo trang & dữ liệu
    trang: trang,
    datVeLai: datVeLai,
    taiLai: taiLai,
    taiLaiHoacLoi: taiLaiHoacLoi,
    lamMoi: lamMoi,
    bamLamMoi: bamLamMoi,
    tk: tk,
    dem: function () { return DEM; },
    backendOk: function () { return BACKEND_OK; },   // hàm, vì giá trị chỉ biết sau khi nạp xong
    daNap: function () { return DA_NAP; },
    orders: ORDERS,
    products: PRODUCTS,
    vatTu: VAT_TU,
    nhaCungCap: NHA_CUNG_CAP,
    mauSac: MAU_SAC,
    danhMuc: DANH_MUC,
    baiViet: BAI_VIET,
    khuyenMai: KHUYEN_MAI,
    nguoiDung: NGUOI_DUNG,
    loaiVatTu: LOAI_VAT_TU,
    // Ghi
    ghi: ghi,
    dangLuu: dangLuu,
    capNhatXong: capNhatXong,
    baoNhanh: baoNhanh,
    baoLoi: baoLoi,
    tienNgan: tienNgan,
    nguongSapHet: NGUONG_SAP_HET,
    suaVatTu: suaVatTu,
    themVatTu: themVatTu,
    xoaVatTu: xoaVatTu,
    oMau: oMau,
    nhanMau: nhanMau,
    mauSanPham: mauSanPham,
    maMauCua: maMauCua,
    timMau: timMau,
    timDanhMuc: timDanhMuc,
    tenDanhMuc: tenDanhMuc,
    badgeDanhMuc: badgeDanhMuc,
    danhMucSanPham: danhMucSanPham,
    danhMucVatTu: danhMucVatTu,
    tinhChatVatTu: LOAI_VAT_TU,
    tenLoaiVatTu: tenLoaiVatTu,
    cuonNhua: cuonNhua,
    timVatTu: timVatTu,
    themDanhMuc: themDanhMuc,
    suaDanhMuc: suaDanhMuc,
    xoaDanhMuc: xoaDanhMuc,
    themMauSac: themMauSac,
    suaMauSac: suaMauSac,
    xoaMauSac: xoaMauSac,
    themKhuyenMai: themKhuyenMai,
    suaKhuyenMai: suaKhuyenMai,
    xoaKhuyenMai: xoaKhuyenMai,
    loaiKhuyenMai: LOAI_KHUYEN_MAI,
    ttKhuyenMai: TT_KHUYEN_MAI,
    kieuKhuyenMai: KIEU_KHUYEN_MAI,
    apDungCho: AP_DUNG_CHO,
    badgeLoaiKm: badgeLoaiKm,
    badgeTtKm: badgeTtKm,
    badgeKieuKm: badgeKieuKm,
    moTaUuDai: moTaUuDai,
    themBaiViet: themBaiViet,
    suaBaiViet: suaBaiViet,
    xoaBaiViet: xoaBaiViet,
    chuyenMuc: CHUYEN_MUC,
    badgeChuyenMuc: badgeChuyenMuc,
    themNhaCungCap: themNhaCungCap,
    suaNhaCungCap: suaNhaCungCap,
    xoaNhaCungCap: xoaNhaCungCap,
    javaApi: JAVA_API,
    money: money,
    number: number,
    esc: esc,
    fill: fill,
    ngayVN: ngayVN,
    anhSanPham: anhSanPham,
    anhDayDu: anhDayDu,
    badgeTrangThai: badgeTrangThai,
    badgeTon: badgeTon,
    badgeTtSanPham: badgeTtSanPham,
    badgeTtVatTu: badgeTtVatTu,
    ttMap: TT_MAP,
    ttSanPham: TT_SAN_PHAM,
    ttVatTu: TT_VAT_TU,
    loaiSanPham: LOAI_SAN_PHAM,
    badgeLoaiSanPham: badgeLoaiSanPham,
    moHopThoai: moHopThoai,
    dongHopThoai: dongHopThoai,
    taiAnhLen: taiAnhLen,
    ganOTaiAnh: ganOTaiAnh,
    htmlOTaiAnh: htmlOTaiAnh,
    htmlBoAnh: htmlBoAnh,
    ganBoAnh: ganBoAnh,
    luuSanPham: luuSanPham,
    xoaSanPham: xoaSanPham,
    shell: shell,
    moMenu: moMenu,
    dongMenu: dongMenu,
    timTrongBang: timTrongBang,
    apDungBang: apDungBang,
    layPhien: layPhien,
    dangXuat: dangXuat,
    doiTrangThai: doiTrangThai,
    danhDauDaTT: danhDauDaTT,
    xoaDon: xoaDon,
    bieuDoDuong: bieuDoDuong,
    bieuDoCot: bieuDoCot,
    bieuDoTron: bieuDoTron
  };
})();

/* ================================================================
   DROPDOWN CÓ Ô TÌM THEO TÊN — cho MỌI <select> của trang quản trị
   (bộ lọc, ô chọn trong form, kể cả select vẽ sau bằng JS).

   Bấm vào select thì mở bảng chọn riêng: ô tìm ở trên, danh sách bên
   dưới, gõ tới đâu lọc tới đó (không phân biệt hoa thường, bỏ dấu:
   gõ "moc khoa" vẫn ra "Móc khoá"). <select> gốc vẫn là nơi giữ giá
   trị: chọn xong thì gán value và bắn sự kiện change / input như người
   dùng tự chọn, nên onchange sẵn có của từng trang chạy y như cũ.
   Select ít lựa chọn (<= 4), select nhiều dòng, select bị khoá, hoặc có
   data-khong-tim thì để nguyên dropdown của trình duyệt.
   ================================================================ */
(function () {
  var IT_NHAT = 5;
  var bang = null, oTim = null, dsEl = null, selDangMo = null, dongSang = -1, dsDong = [];

  var boDau = function (s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();
  };

  var dungDuoc = function (sel) {
    return sel && sel.tagName === 'SELECT' && !sel.multiple && !sel.disabled &&
      !(sel.size > 1) && !sel.hasAttribute('data-khong-tim') && sel.options.length >= IT_NHAT;
  };

  var themCss = function () {
    if (document.getElementById('css-chon-tim')) return;
    var st = document.createElement('style');
    st.id = 'css-chon-tim';
    st.textContent =
      '.chon-tim{position:fixed;z-index:350;background:var(--the,#fff);color:var(--chu,#1c2024);' +
      'border:1px solid var(--vien,#e4e6e9);border-radius:var(--radius-nho,10px);' +
      'box-shadow:0 12px 32px rgba(0,0,0,.16);display:flex;flex-direction:column;overflow:hidden;font-size:13.5px}' +
      '.chon-tim .ct-o{padding:8px;border-bottom:1px solid var(--vien,#e4e6e9);position:relative}' +
      '.chon-tim .ct-o i{position:absolute;left:18px;top:50%;transform:translateY(-50%);color:var(--chu-mo,#6b7280);font-size:12px}' +
      '.chon-tim input{width:100%;box-sizing:border-box;padding:8px 10px 8px 30px;border:1px solid var(--vien,#e4e6e9);' +
      'border-radius:8px;font:inherit;background:var(--nen,#f7f8f9);color:inherit;outline:none}' +
      '.chon-tim input:focus{border-color:var(--accent,#10b981);background:var(--the,#fff)}' +
      '.chon-tim .ct-ds{overflow-y:auto;padding:4px;overscroll-behavior:contain}' +
      '.chon-tim .ct-dong{padding:7px 10px;border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}' +
      '.chon-tim .ct-dong.sang{background:var(--nen,#f1f3f5)}' +
      '.chon-tim .ct-dong.dang-chon{font-weight:600;color:var(--accent-dam,#059669)}' +
      '.chon-tim .ct-dong.khoa{opacity:.45;cursor:not-allowed}' +
      '.chon-tim .ct-nhom{padding:8px 10px 4px;font-size:11.5px;font-weight:700;color:var(--chu-mo,#6b7280);text-transform:uppercase;letter-spacing:.3px}' +
      '.chon-tim .ct-trong{padding:12px 10px;color:var(--chu-mo,#6b7280);text-align:center}';
    document.head.appendChild(st);
  };

  var dong = function (traFocus) {
    if (!bang) return;
    bang.remove();
    bang = null;
    var sel = selDangMo;
    selDangMo = null;
    if (traFocus && sel) sel.focus();
  };

  var datSang = function (i) {
    if (dongSang >= 0 && dsDong[dongSang]) dsDong[dongSang].classList.remove('sang');
    dongSang = i;
    var el = dsDong[i];
    if (!el) return;
    el.classList.add('sang');
    var top = el.offsetTop, day = top + el.offsetHeight;
    if (top < dsEl.scrollTop) dsEl.scrollTop = top - 4;
    else if (day > dsEl.scrollTop + dsEl.clientHeight) dsEl.scrollTop = day - dsEl.clientHeight + 4;
  };

  var chon = function (el) {
    if (!el || el.classList.contains('khoa')) return;
    var sel = selDangMo, i = +el.getAttribute('data-i');
    dong(true);
    if (!sel || sel.selectedIndex === i) return;
    sel.selectedIndex = i;
    sel.dispatchEvent(new Event('input', { bubbles: true }));
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  };

  var veDanhSach = function () {
    var sel = selDangMo, tu = boDau(oTim.value), html = '', nhomDaIn = null;
    dsDong = [];
    Array.prototype.forEach.call(sel.options, function (op, i) {
      if (op.hidden) return;
      var chu = op.text;
      if (tu && boDau(chu).indexOf(tu) < 0) return;
      var nhom = op.parentNode && op.parentNode.tagName === 'OPTGROUP' ? op.parentNode.label : null;
      if (nhom && nhom !== nhomDaIn) html += '<div class="ct-nhom">' + Apex.esc(nhom) + '</div>';
      nhomDaIn = nhom;
      html += '<div class="ct-dong' + (i === sel.selectedIndex ? ' dang-chon' : '') +
        (op.disabled ? ' khoa' : '') + '" data-i="' + i + '" title="' + Apex.esc(chu) + '">' +
        (Apex.esc(chu) || '&nbsp;') + '</div>';
    });
    dsEl.innerHTML = html || '<div class="ct-trong">Không có mục nào khớp</div>';
    dsDong = Array.prototype.slice.call(dsEl.querySelectorAll('.ct-dong'));
    dongSang = -1;
    // Sáng sẵn dòng đang chọn (lúc chưa gõ gì) hoặc dòng khớp đầu tiên
    var k = -1;
    dsDong.some(function (d, j) { if (d.classList.contains('dang-chon')) { k = j; return true; } return false; });
    if (tu || k < 0) dsDong.some(function (d, j) { if (!d.classList.contains('khoa')) { k = j; return true; } return false; });
    if (k >= 0) datSang(k);
  };

  var datViTri = function () {
    var r = selDangMo.getBoundingClientRect();
    var rong = Math.max(r.width, 240);
    var trai = Math.min(r.left, window.innerWidth - rong - 8);
    var duoi = window.innerHeight - r.bottom - 12, tren = r.top - 12;
    var moLen = duoi < 220 && tren > duoi;
    var cao = Math.min(360, Math.max(160, moLen ? tren : duoi));
    bang.style.left = Math.max(8, trai) + 'px';
    bang.style.width = rong + 'px';
    bang.style.maxHeight = cao + 'px';
    bang.style.top = moLen ? '' : (r.bottom + 4) + 'px';
    bang.style.bottom = moLen ? (window.innerHeight - r.top + 4) + 'px' : '';
  };

  var mo = function (sel) {
    dong(false);
    themCss();
    selDangMo = sel;
    bang = document.createElement('div');
    bang.className = 'chon-tim';
    bang.innerHTML = '<div class="ct-o"><i class="fa-solid fa-magnifying-glass"></i>' +
      '<input type="text" aria-label="Tìm theo tên" autocomplete="off" spellcheck="false"></div>' +
      '<div class="ct-ds"></div>';
    document.body.appendChild(bang);
    oTim = bang.querySelector('input');
    dsEl = bang.querySelector('.ct-ds');
    datViTri();
    veDanhSach();
    oTim.focus();

    oTim.addEventListener('input', veDanhSach);
    oTim.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (!dsDong.length) return;
        var b = e.key === 'ArrowDown' ? 1 : -1, i = dongSang;
        for (var n = 0; n < dsDong.length; n++) {
          i = (i + b + dsDong.length) % dsDong.length;
          if (!dsDong[i].classList.contains('khoa')) break;
        }
        datSang(i);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        chon(dsDong[dongSang]);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();       // Esc chỉ đóng bảng chọn, không đóng luôn hộp thoại phía sau
        dong(true);
      } else if (e.key === 'Tab') {
        dong(false);
      }
    });
    // mousedown thay vì click: chọn xong trước khi ô tìm mất focus
    dsEl.addEventListener('mousedown', function (e) {
      e.preventDefault();
      chon(e.target.closest('.ct-dong'));
    });
    dsEl.addEventListener('mousemove', function (e) {
      var d = e.target.closest('.ct-dong');
      var i = dsDong.indexOf(d);
      if (i >= 0 && i !== dongSang && !d.classList.contains('khoa')) datSang(i);
    });
  };

  // Chặn dropdown của trình duyệt ngay từ mousedown (click thì nó đã mở mất rồi)
  document.addEventListener('mousedown', function (e) {
    if (bang && bang.contains(e.target)) return;
    var sel = e.target.closest && e.target.closest('select');
    if (bang && sel === selDangMo) { e.preventDefault(); dong(true); return; }
    if (bang) dong(false);
    if (e.button !== 0 || !dungDuoc(sel)) return;
    e.preventDefault();
    sel.focus();
    mo(sel);
  }, true);

  // Bàn phím: Enter / Space / Alt+↓ / F4 trên select thì mở bảng; gõ chữ thì mở bảng và
  // đưa luôn chữ đó vào ô tìm
  document.addEventListener('keydown', function (e) {
    var sel = e.target;
    if (bang || !dungDuoc(sel) || e.ctrlKey || e.metaKey) return;
    var moBang = e.key === 'Enter' || e.key === ' ' || e.key === 'F4' || (e.altKey && e.key === 'ArrowDown');
    var chu = !e.altKey && e.key.length === 1 && e.key !== ' ';
    if (!moBang && !chu) return;
    e.preventDefault();
    mo(sel);
    if (chu) { oTim.value = e.key; veDanhSach(); }
  }, true);

  // Cuộn trang / đổi cỡ cửa sổ: bảng đang mở bám theo select (cuộn bên trong danh sách thì thôi)
  window.addEventListener('scroll', function (e) {
    if (!bang || (e.target && e.target.nodeType === 1 && bang.contains(e.target))) return;
    if (!document.body.contains(selDangMo)) { dong(false); return; }
    datViTri();
  }, true);
  window.addEventListener('resize', function () { if (bang) dong(false); });
})();
