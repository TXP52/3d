window.Apex = (function () {
  'use strict';

  var BRAND = 'Bedecraft';
  var JAVA_API = 'http://localhost:8090/api';

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
    if (el) el.innerHTML = html;
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

  /** Cuộn nhựa còn từ 200g trở xuống là SẮP HẾT — mốc dùng chung cả trang Kho lẫn Tổng quan. */
  var NGUONG_NHUA_SAP_HET = 200;

  /** Số gram còn lại của một cuộn nhựa (backend tính sẵn, tính lại phòng khi thiếu). */
  var gramConLai = function (v) {
    if (v.conLaiGram != null) return v.conLaiGram;
    var tong = (v.khoiLuongGram || 0) * (v.soLuong || 0);
    return Math.max(0, tong - (v.daDungGram || 0));
  };

  /**
   * Trạng thái THỰC TẾ của vật tư.
   *
   * Với nhựa, "còn hàng / sắp hết / hết hàng" suy từ số gram còn lại chứ không
   * bắt chủ shop tự sửa tay mỗi lần in xong — in hết cuộn mà bảng vẫn ghi
   * "Còn hàng" thì trạng thái chẳng có ý nghĩa gì.
   *
   * Hàng chưa về kho (đã đặt / đang vận chuyển) và hàng bị đánh dấu hết bằng tay
   * thì giữ nguyên, không suy diễn đè lên.
   */
  var ttVatTuThucTe = function (v) {
    if (!v) return 'con_hang';
    if (v.trangThaiTinh) return v.trangThaiTinh;
    var tt = v.trangThai || 'con_hang';
    if (tt === 'da_dat' || tt === 'dang_van_chuyen' || tt === 'het_hang') return tt;
    if (v.loai !== 'nhua') return tt;
    var con = gramConLai(v);
    if (con <= 0) return 'het_hang';
    if (con <= NGUONG_NHUA_SAP_HET) return 'sap_het';
    return 'con_hang';
  };

  var badgeTheoMap = function (map, khoa) {
    var t = map[khoa] || { ten: khoa || '—', mau: 'badge-xam', icon: 'fa-circle' };
    return '<span class="badge ' + t.mau + '"><i class="fa-solid ' + t.icon + '"></i>' + esc(t.ten) + '</span>';
  };
  var badgeTtSanPham = function (tt) { return badgeTheoMap(TT_SAN_PHAM, tt); };
  var badgeTtVatTu = function (tt) {
    return badgeTheoMap(TT_VAT_TU, typeof tt === 'object' ? ttVatTuThucTe(tt) : tt);
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
  var CUSTOMERS = [];
  var INVENTORY = [];
  /**
   * Số liệu vẽ biểu đồ. TÍNH TỪ ĐƠN HÀNG THẬT trong database, không bịa.
   *
   * Trước đây chỗ này là 3 dãy số viết cứng (412, 386, 524... triệu) hiện lên
   * biểu đồ như doanh thu thật. Shop mới mở chưa bán được đồng nào mà trang
   * Tổng quan vẫn khoe gần một tỉ mỗi tháng.
   *
   * Điền bằng tinhThongKe() ngay sau khi nạp xong đơn hàng.
   */
  var STATS = {
    nam: new Date().getFullYear(),
    thang: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    doanhThuNam: [],
    doanhThuNamTruoc: [],
    donTheoThang: [],
    coDuLieu: false
  };
  var MAU_SAC = [];       // bảng màu dùng cho nhựa in và sản phẩm
  var DANH_MUC = [];      // danh mục sắp xếp sản phẩm (móc khoá, mô hình, đồ trang trí...)
  var BAI_VIET = [];      // bài viết kiến thức in 3D hiện ở cuối trang chủ khách
  var KHUYEN_MAI = [];    // mã giảm giá khách nhập ở giỏ hàng
  var VAT_TU = [];        // kho vật tư: máy in, cuộn nhựa...
  var NHA_CUNG_CAP = [];  // nơi mua vật tư
  var BACKEND_OK = false;  // true khi gọi được backend Java; tắt thì bảng trống + báo đỏ đầu trang

  /* Tính chất vật tư — CỐ ĐỊNH 3 kiểu, quyết định cách kho tính:
     nhựa theo dõi gram, máy in tính vào vốn máy, dụng cụ chỉ tính tiền mua.
     Tên loại thì tự đặt thoải mái ở bảng danh mục. */
  var LOAI_VAT_TU = { may_in: 'Máy in', nhua: 'Nhựa in', dung_cu: 'Dụng cụ' };

  /* ---------------- Nạp dữ liệu thật (bất đồng bộ, song song) ---------------- */

  var layPhien = function () {
    try { return JSON.parse(localStorage.getItem('in3d_phien')); } catch (e) { return null; }
  };

  var dangXuat = function () {
    localStorage.removeItem('in3d_phien');
    window.location.href = 'dang-nhap.html';
  };

  /* Đổi nội dung mảng nhưng GIỮ tham chiếu: các trang đã cầm Apex.vatTu, Apex.products...
     từ lúc mở trang vẫn nhìn thấy dữ liệu mới sau khi nạp lại — nhờ vậy thêm/sửa/xoá
     chỉ cần vẽ lại bảng, không phải tải lại cả trang. */
  var thayMang = function (mang, moi) {
    mang.length = 0;
    Array.prototype.push.apply(mang, moi || []);
  };

  /**
   * Gọi API bất đồng bộ. Bản cũ dùng XMLHttpRequest ĐỒNG BỘ, 8 API nối đuôi nhau và
   * treo cứng giao diện tới khi xong: database ở xa nên mỗi API vài trăm ms, cộng lại
   * người dùng nhìn trang trắng vài giây. Giờ gọi song song, khung trang hiện ngay,
   * bảng đổ dữ liệu khi về, thanh tải mảnh ở mép trên báo là đang chờ.
   */
  var taiJson = function (duongDan, headers) {
    return fetch(JAVA_API + duongDan, { headers: headers || {} })
      .then(function (r) { return r.ok ? r.json() : null; })
      .catch(function () { return null; });
  };

  var NGUOI_DUNG = [];   // tài khoản đăng ký — chỉ lấy được khi đang đăng nhập admin

  var napDonHang = function () {
    return taiJson('/don-hang').then(function (donJava) {
      if (!donJava) return false;
      thayMang(ORDERS, donJava.map(function (d) {
        var tt = (d.thanhToan && d.thanhToan[0]) || null;
        return {
          dbId: d.id, id: d.maDon, customer: d.tenKhach, phone: d.soDienThoai || '',
          // date là chuỗi đã định dạng để hiện; ngayGoc giữ nguyên ISO để gom theo tháng
          date: ngayVN(d.createdAt), ngayGoc: d.createdAt,
          items: (d.chiTiet || []).reduce(function (s, c) { return s + (c.soLuong || 0); }, 0),
          total: d.tongTien || 0, status: TT_MAP[d.trangThai] || d.trangThai,
          maKhuyenMai: d.maKhuyenMai || '', tienGiam: d.tienGiam || 0, tamTinh: d.tamTinh || d.tongTien || 0,
          tienGiamSanPham: d.tienGiamSanPham || 0, tienHangGoc: d.tienHangGoc || d.tongTien || 0,
          payment: tt ? (PT_MAP[tt.phuongThuc] || 'COD') + (tt.trangThai === 'da_thanh_toan' ? ' (đã TT)' : '') : 'COD',
          channel: 'Website',
          chiTiet: (d.chiTiet || []).map(function (c) {
            return { ten: c.tenSanPham, soLuong: c.soLuong, donGia: c.donGia, donGiaGoc: c.donGiaGoc || c.donGia };
          })
        };
      }));
      tinhThongKe();
      return true;
    });
  };

  var napSanPham = function () {
    return taiJson('/san-pham?tatCa=true').then(function (spJava) {
      if (!spJava) return false;
      thayMang(PRODUCTS, spJava.map(function (s) {
        return {
          dbId: s.id, sku: 'SP-' + s.id, name: s.ten, cat: s.dangBan ? 'Đang bán' : 'Đang ẩn',
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
          // Mỗi dòng trong vatTus là một lần in: soLuong cái × (gram + thừa) mỗi cái.
          // soLuong ở đây là TỔNG số cái, tongGramNhua là phần kho thật sự mất.
          soLuong: s.soLuong || 0,
          gramMoiCaiMin: s.gramMoiCaiMin || 0, gramMoiCaiMax: s.gramMoiCaiMax || 0,
          tongGramNhua: s.tongGramNhua || 0, tienNhua: s.tienNhua || 0
        };
      }));
      thayMang(INVENTORY, PRODUCTS.map(function (p) {
        return { sku: p.sku, name: p.name, type: p.cat, stock: p.stock, min: p.min, location: 'Kho chính', updated: ngayVN(new Date().toISOString()) };
      }));
      return true;
    });
  };

  /** Các bộ dữ liệu nhỏ: backend trả về đúng dạng cần dùng, chỉ việc thay mảng. */
  var napBo = function (mang, duongDan) {
    return taiJson(duongDan).then(function (ds) {
      if (!ds) return false;
      thayMang(mang, ds);
      return true;
    });
  };
  var napVatTu = function () { return napBo(VAT_TU, '/vat-tu'); };
  var napNhaCungCap = function () { return napBo(NHA_CUNG_CAP, '/nha-cung-cap'); };
  var napMauSac = function () { return napBo(MAU_SAC, '/mau-sac'); };
  var napDanhMuc = function () { return napBo(DANH_MUC, '/danh-muc'); };
  // tatCa=true: trang quản trị thấy cả bài đang tắt hiển thị / mã tạm dừng, hết hạn
  var napBaiViet = function () { return napBo(BAI_VIET, '/bai-viet?tatCa=true'); };
  var napKhuyenMai = function () { return napBo(KHUYEN_MAI, '/khuyen-mai?tatCa=true'); };

  /** Tài khoản đăng ký — cần token admin; chưa đăng nhập thì danh sách trống. */
  var napNguoiDung = function () {
    var phien = layPhien();
    if (!phien || !phien.token) { thayMang(NGUOI_DUNG, []); return Promise.resolve(false); }
    return taiJson('/nguoi-dung', { Authorization: 'Bearer ' + phien.token }).then(function (ds) {
      thayMang(NGUOI_DUNG, ds || []);
      return !!ds;
    });
  };

  /** Khách hàng: tài khoản đăng ký + khách vãng lai gom từ đơn. Tính thuần từ dữ liệu đã nạp. */
  var tinhKhachHang = function () {
    var nhom = {};
    ORDERS.forEach(function (o) {
      var k = o.customer + '|' + o.phone;
      if (!nhom[k]) nhom[k] = { id: 'KH-' + (Object.keys(nhom).length + 1), name: o.customer, email: '—', phone: o.phone || '—', group: 'Khách lẻ', orders: 0, spent: 0, since: o.date };
      nhom[k].orders += 1;
      nhom[k].spent += o.total;
    });
    var ds = Object.keys(nhom).map(function (k) { return nhom[k]; });

    if (NGUOI_DUNG.length) {
      var coTK = {};
      NGUOI_DUNG.forEach(function (u) { coTK[u.hoTen] = true; });
      ds = NGUOI_DUNG.map(function (u) {
        var don = ORDERS.filter(function (o) { return o.customer === u.hoTen; });
        return {
          id: 'KH-' + u.id, name: u.hoTen, email: u.email, phone: u.soDienThoai || '—',
          group: u.vaiTro === 'admin' ? 'Quản trị' : 'Khách hàng',
          orders: don.length, spent: don.reduce(function (s, o) { return s + o.total; }, 0),
          since: ngayVN(u.createdAt)
        };
      }).concat(ds.filter(function (c) { return !coTK[c.name]; }));
    }
    thayMang(CUSTOMERS, ds);
  };

  /* ---------------- Thanh tải mảnh ở mép trên ---------------- */
  var DANG_TAI = 0;
  var batTai = function () { DANG_TAI++; document.documentElement.classList.add('dang-tai'); };
  var tatTai = function () {
    DANG_TAI = Math.max(0, DANG_TAI - 1);
    if (!DANG_TAI) document.documentElement.classList.remove('dang-tai');
  };

  /* ---------------- Vẽ lại trang ----------------
     Trang đăng ký hàm vẽ lại bằng Apex.datVeLai(); Apex gọi nó khi dữ liệu về lần đầu
     và sau mỗi lần ghi. Trang KHÔNG tự gọi lúc mở — lúc đó mảng còn trống, vẽ ra toàn
     "Chưa có..." rồi nháy sang dữ liệu thật, nhìn như lỗi. */
  var DA_NAP = false;
  var _veLaiTrang = null;
  var datVeLai = function (fn) {
    _veLaiTrang = fn;
    if (DA_NAP) { fn(); capNhatBadgeMenu(); }
  };
  var veLaiNeuCo = function () {
    if (_veLaiTrang) _veLaiTrang();
    capNhatBadgeMenu();
  };

  (function napDuLieuThat() {
    batTai();
    Promise.all([
      napDonHang(), napSanPham(),
      napVatTu(), napNhaCungCap(), napMauSac(), napDanhMuc(), napBaiViet(), napKhuyenMai(),
      napNguoiDung()
    ]).then(function (kq) {
      BACKEND_OK = !!(kq[0] && kq[1]);
      // Backend tắt thì mọi bảng để TRỐNG và có thông báo đỏ ở đầu trang (capNhatBanner).
      // Trước đây chỗ này còn gọi thẳng Supabase REST rồi hiện dữ liệu chỉ-đọc kèm
      // dòng "dữ liệu mẫu" — trang trông như vẫn chạy, chủ shop sửa gì cũng không ăn.
      tinhKhachHang();
      DA_NAP = true;
      tatTai();
      capNhatBanner();
      veLaiNeuCo();
    });
  })();

  /* ---------------- Cập nhật tại chỗ sau khi ghi ----------------
     Trước đây mọi thao tác lưu/xoá đều tải lại cả trang: mất vị trí cuộn, mất bộ lọc
     đang chọn, trang nháy trắng. Giờ: nạp lại đúng bộ dữ liệu vừa đổi (song song,
     không chặn), đóng hộp thoại, gọi hàm vẽ lại của trang, rồi hiện toast. */

  var BO_NAP = {
    'don-hang': napDonHang, 'san-pham': napSanPham, 'vat-tu': napVatTu,
    'nha-cung-cap': napNhaCungCap, 'mau-sac': napMauSac, 'danh-muc': napDanhMuc,
    'bai-viet': napBaiViet, 'khuyen-mai': napKhuyenMai
  };

  /** Nạp lại một hay nhiều bộ dữ liệu (song song). Trả Promise. */
  var taiLai = function (cacBo) {
    cacBo = cacBo || [];
    batTai();
    var viec = cacBo.map(function (b) { return BO_NAP[b] ? BO_NAP[b]() : Promise.resolve(false); });
    if (cacBo.indexOf('don-hang') >= 0) viec.push(napNguoiDung());
    return Promise.all(viec).then(function (kq) {
      if (cacBo.indexOf('don-hang') >= 0) tinhKhachHang();
      tatTai();
      return kq;
    });
  };

  /** Toast nhỏ góc dưới phải, tự ẩn sau 2,2 giây. */
  var baoNhanh = function (chu, icon) {
    var cu = document.getElementById('bao-nhanh');
    if (cu) cu.parentNode.removeChild(cu);
    var o = document.createElement('div');
    o.id = 'bao-nhanh';
    o.className = 'bao-nhanh';
    o.innerHTML = '<i class="fa-solid ' + (icon || 'fa-circle-check') + '"></i>' + esc(chu);
    document.body.appendChild(o);
    requestAnimationFrame(function () { o.classList.add('hien'); });
    setTimeout(function () {
      o.classList.remove('hien');
      setTimeout(function () { if (o.parentNode) o.parentNode.removeChild(o); }, 300);
    }, 2200);
  };

  /** Số đơn chờ xác nhận trên menu cũng phải đổi theo, không thì lệch với bảng. */
  var capNhatBadgeMenu = function () {
    var muc = document.querySelector('.apex-muc[href="don-hang.html"]');
    if (!muc) return;
    var so = ORDERS.filter(function (o) { return o.status === 'Chờ xác nhận'; }).length;
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
    if (BACKEND_OK) return;
    var trang = document.querySelector('.apex-trang');
    if (trang) {
      trang.insertAdjacentHTML('afterbegin',
        '<div class="bao-backend" id="bao-backend"><i class="fa-solid fa-plug-circle-xmark"></i> ' +
        'Không kết nối được backend Java (cổng 8090) nên chưa nạp được dữ liệu. ' +
        'Chạy backend rồi tải lại trang.</div>');
    }
  };

  /** Gọi sau khi backend ghi xong: đóng hộp thoại, nạp lại bộ liên quan, vẽ lại, báo. */
  var capNhatXong = function (cacBo, thongBao) {
    dongHopThoai();
    if (!_veLaiTrang) { location.reload(); return; }
    taiLai(cacBo).then(function () {
      veLaiNeuCo();
      if (thongBao) baoNhanh(thongBao);
    });
  };

  /**
   * Gom đơn hàng thật thành số liệu 12 tháng cho biểu đồ.
   *
   * Doanh thu KHÔNG tính đơn đã huỷ — đơn huỷ không mang về đồng nào,
   * cộng vào là báo cáo sai. Số đơn thì đếm hết vì đó là số đơn đã nhận.
   */
  function tinhThongKe() {
    var namNay = new Date().getFullYear();
    var dtNamNay = [0,0,0,0,0,0,0,0,0,0,0,0];
    var dtNamTruoc = [0,0,0,0,0,0,0,0,0,0,0,0];
    var soDon = [0,0,0,0,0,0,0,0,0,0,0,0];
    var coDon = false;

    ORDERS.forEach(function (o) {
      if (!o.ngayGoc) return;
      var d = new Date(o.ngayGoc);
      if (isNaN(d.getTime())) return;
      var thang = d.getMonth();
      var nam = d.getFullYear();
      var tien = o.total || 0;

      if (nam === namNay) {
        soDon[thang] += 1;
        if (o.status !== 'Đã huỷ') dtNamNay[thang] += tien;
        coDon = true;
      } else if (nam === namNay - 1) {
        if (o.status !== 'Đã huỷ') dtNamTruoc[thang] += tien;
        coDon = true;
      }
    });

    STATS.nam = namNay;
    STATS.doanhThuNam = dtNamNay;
    STATS.doanhThuNamTruoc = dtNamTruoc;
    STATS.donTheoThang = soDon;
    STATS.coDuLieu = coDon;
  }

  /* ---------------- Thao tác gọi backend Java ---------------- */

  var goiJava = function (method, duongDan, body) {
    var xhr = new XMLHttpRequest();
    xhr.open(method, JAVA_API + duongDan, false);
    xhr.setRequestHeader('Content-Type', 'application/json');
    try { xhr.send(body ? JSON.stringify(body) : null); } catch (e) { alert('Không gọi được backend Java (đã chạy chưa?)'); return false; }
    if (xhr.status >= 200 && xhr.status < 300) return true;
    try { alert('Lỗi backend: ' + (JSON.parse(xhr.responseText).loi || ('HTTP ' + xhr.status))); }
    catch (e2) { alert('Lỗi backend: HTTP ' + xhr.status); }
    return false;
  };

  var doiTrangThai = function (dbId, tt) {
    if (goiJava('PUT', '/don-hang/' + dbId + '/trang-thai', { trangThai: tt })) capNhatXong(['don-hang'], 'Đã đổi trạng thái đơn');
  };
  var danhDauDaTT = function (dbId) {
    if (goiJava('PUT', '/don-hang/' + dbId + '/da-thanh-toan', null)) capNhatXong(['don-hang'], 'Đã ghi nhận thanh toán');
  };
  var xoaDon = function (dbId) {
    if (!confirm('Xoá đơn hàng này? Hành động không hoàn tác được.')) return;
    if (goiJava('DELETE', '/don-hang/' + dbId, null)) capNhatXong(['don-hang'], 'Đã xoá đơn hàng');
  };
  var anHienSanPham = function (dbId, dangBan) {
    if (goiJava('PUT', '/san-pham/' + dbId, { dangBan: !dangBan })) capNhatXong(['san-pham'], dangBan ? 'Đã ẩn sản phẩm' : 'Đã hiện sản phẩm');
  };
  /** Nhập thêm hàng vào kho — mở hộp thoại thay cho prompt của trình duyệt. */
  var nhapKho = function (dbId, tenHienTai, tonHienTai) {
    var ton = parseInt(tonHienTai, 10) || 0;
    moHopThoai(
      '<div class="ht-dau"><div><h3>Nhập thêm kho</h3>' +
      '<div class="phu">' + esc(tenHienTai) + ' — đang có ' + number(ton) + '</div></div>' +
      '<button class="nut-dong" type="button" onclick="Apex.dongHopThoai()"><i class="fa-solid fa-xmark"></i></button></div>' +
      '<div class="ht-than">' +
      '<div class="o-nhap"><label for="ht-them-kho">Nhập thêm bao nhiêu?</label>' +
      '<input type="number" id="ht-them-kho" min="1" step="1" value="10" /></div>' +
      '<div class="bao-loi" id="ht-loi-kho"></div></div>' +
      '<div class="ht-chan"><div class="day-phai">' +
      '<button class="nut nut-vien" type="button" onclick="Apex.dongHopThoai()">Huỷ</button>' +
      '<button class="nut nut-chinh" type="button" onclick="Apex.luuNhapKho(' + dbId + ',' + ton + ')">' +
      '<i class="fa-solid fa-floppy-disk"></i> Lưu</button></div></div>'
    );
  };

  var luuNhapKho = function (dbId, ton) {
    var loi = document.getElementById('ht-loi-kho');
    var them = parseInt(document.getElementById('ht-them-kho').value, 10);
    if (isNaN(them) || them <= 0) { loi.textContent = 'Số lượng phải lớn hơn 0.'; return; }
    if (goiJava('PUT', '/san-pham/' + dbId, { tonKho: ton + them })) capNhatXong(['san-pham'], 'Đã nhập thêm ' + number(them));
    else loi.textContent = 'Không lưu được. Kiểm tra lại backend Java (cổng 8090).';
  };
  var themSanPhamMoi = function (duLieu) {
    return goiJava('POST', '/san-pham', duLieu);
  };

  /** Lưu sản phẩm: có dbId thì sửa, không có thì thêm mới. */
  var luuSanPham = function (dbId, duLieu) {
    return dbId ? goiJava('PUT', '/san-pham/' + dbId, duLieu) : goiJava('POST', '/san-pham', duLieu);
  };
  var xoaSanPham = function (dbId, ten) {
    if (!confirm('Xoá hẳn sản phẩm "' + (ten || '') + '"? Hành động không hoàn tác được.')) return false;
    if (goiJava('DELETE', '/san-pham/' + dbId, null)) { capNhatXong(['san-pham', 'danh-muc'], 'Đã xoá sản phẩm'); return true; }
    return false;
  };
  var doiTrangThaiSanPham = function (dbId, tt) {
    if (goiJava('PUT', '/san-pham/' + dbId, { trangThai: tt })) capNhatXong(['san-pham'], 'Đã đổi trạng thái');
  };
  var doiTrangThaiVatTu = function (id, tt) {
    if (goiJava('PUT', '/vat-tu/' + id, { trangThai: tt })) capNhatXong(['vat-tu'], 'Đã đổi trạng thái vật tư');
  };

  /* ---------------- Hộp thoại (modal) dùng chung ---------------- */

  var moHopThoai = function (html, rong) {
    var lop = document.getElementById('lop-phu-chung');
    if (!lop) {
      lop = document.createElement('div');
      lop.className = 'lop-phu';
      lop.id = 'lop-phu-chung';
      lop.addEventListener('click', function (e) { if (e.target === lop) dongHopThoai(); });
      document.body.appendChild(lop);
    }
    lop.innerHTML = '<div class="hop-thoai' + (rong ? ' rong' : '') + '">' + html + '</div>';
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

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') dongHopThoai();
  });

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
      fetch(JAVA_API + '/anh', { method: 'POST', body: fd })
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
          loi('Không kết nối được backend Java (cổng 8090) nên chưa lưu được ảnh.');
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

  var suaVatTu = function (id, thayDoi) { return goiJava('PUT', '/vat-tu/' + id, thayDoi); };

  /**
   * Hộp thoại ghi nhận số gram nhựa đã dùng — thay cho prompt của trình duyệt.
   * Nhập tổng đã dùng, hoặc cộng thêm phần vừa in xong.
   */
  var moFormGram = function (id) {
    var v = null;
    for (var i = 0; i < VAT_TU.length; i++) if (VAT_TU[i].id === id) v = VAT_TU[i];
    if (!v) return;
    var tong = (v.khoiLuongGram || 0) * (v.soLuong || 0);

    moHopThoai(
      '<div class="ht-dau"><div><h3>' + esc(v.ten) + '</h3>' +
      '<div class="phu">' + (v.mau ? oMau(v.maMau) + esc(v.mau) + ' · ' : '') +
      'cuộn ' + number(tong) + 'g · ' + money(Math.round(v.donGiaMoiGram || 0)) + '/g</div></div>' +
      '<button class="nut-dong" type="button" onclick="Apex.dongHopThoai()"><i class="fa-solid fa-xmark"></i></button></div>' +

      '<div class="ht-than">' +
      '<div class="o-nhap"><label for="ht-gram">Tổng số gram đã dùng</label>' +
      '<input type="number" id="ht-gram" min="0" max="' + tong + '" step="1" value="' + (v.daDungGram || 0) + '" /></div>' +
      '<div class="o-nhap"><label for="ht-them-gram">Hoặc cộng thêm vừa in xong (gram)</label>' +
      '<input type="number" id="ht-them-gram" min="0" step="1" /></div>' +
      '<div class="bao-loi" id="ht-loi-gram"></div></div>' +

      '<div class="ht-chan"><div class="day-phai">' +
      '<button class="nut nut-vien" type="button" onclick="Apex.dongHopThoai()">Huỷ</button>' +
      '<button class="nut nut-chinh" type="button" onclick="Apex.luuGram(' + id + ',' + tong + ')">' +
      '<i class="fa-solid fa-floppy-disk"></i> Lưu</button></div></div>'
    );
  };

  var luuGram = function (id, tong) {
    var loi = document.getElementById('ht-loi-gram');
    var them = parseInt(document.getElementById('ht-them-gram').value, 10);
    var gram = parseInt(document.getElementById('ht-gram').value, 10);
    if (!isNaN(them) && them > 0) gram = (isNaN(gram) ? 0 : gram) + them;
    if (isNaN(gram) || gram < 0) { loi.textContent = 'Số gram không hợp lệ.'; return; }
    if (gram > tong) { loi.textContent = 'Không thể dùng quá ' + tong + 'g của cuộn này.'; return; }
    if (suaVatTu(id, { daDungGram: gram })) capNhatXong(['vat-tu'], 'Đã ghi nhận số gram');
    else loi.textContent = 'Không lưu được. Kiểm tra lại backend Java (cổng 8090).';
  };

  /* Giữ tên cũ cho các trang đang gọi */
  var datDaDung = function (id) { moFormGram(id); };
  var dungThemGram = function (id) { moFormGram(id); };

  var themVatTu = function (duLieu) { return goiJava('POST', '/vat-tu', duLieu); };
  var xoaVatTu = function (id) {
    if (!confirm('Xoá vật tư này khỏi kho?')) return false;
    if (goiJava('DELETE', '/vat-tu/' + id, null)) { capNhatXong(['vat-tu', 'danh-muc'], 'Đã xoá vật tư'); return true; }
    return false;
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
    return String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
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

  var themMauSac = function (duLieu) { return goiJava('POST', '/mau-sac', duLieu); };
  var suaMauSac = function (id, td) { return goiJava('PUT', '/mau-sac/' + id, td); };
  var xoaMauSac = function (id) {
    if (!confirm('Xoá màu này? Vật tư đang dùng màu vẫn giữ nguyên tên màu cũ.')) return false;
    if (goiJava('DELETE', '/mau-sac/' + id, null)) { capNhatXong(['mau-sac', 'vat-tu'], 'Đã xoá màu'); return true; }
    return false;
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

  /** Đếm số sản phẩm đang thuộc một danh mục. */
  var soSanPhamTheoDanhMuc = function (id) {
    return PRODUCTS.filter(function (p) { return p.danhMucId === id; }).length;
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

  /** Đếm số vật tư đang thuộc một loại. */
  var soVatTuTheoDanhMuc = function (id) {
    return VAT_TU.filter(function (v) { return v.danhMucId === id; }).length;
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

  var themDanhMuc = function (duLieu) { return goiJava('POST', '/danh-muc', duLieu); };
  var suaDanhMuc = function (id, td) { return goiJava('PUT', '/danh-muc/' + id, td); };
  var xoaDanhMuc = function (id) {
    if (!confirm('Xoá danh mục này? Sản phẩm / vật tư đang thuộc sẽ chuyển về "Chưa phân loại".')) return false;
    if (goiJava('DELETE', '/danh-muc/' + id, null)) { capNhatXong(['danh-muc', 'san-pham', 'vat-tu'], 'Đã xoá danh mục'); return true; }
    return false;
  };

  var themKhuyenMai = function (duLieu) { return goiJava('POST', '/khuyen-mai', duLieu); };
  var suaKhuyenMai = function (id, td) { return goiJava('PUT', '/khuyen-mai/' + id, td); };
  var xoaKhuyenMai = function (id) {
    if (!confirm('Xoá mã khuyến mãi này? Mã vào thùng rác, đơn cũ đã dùng vẫn giữ nguyên.')) return false;
    if (goiJava('DELETE', '/khuyen-mai/' + id, null)) { capNhatXong(['khuyen-mai'], 'Đã xoá khuyến mãi'); return true; }
    return false;
  };

  var themBaiViet = function (duLieu) { return goiJava('POST', '/bai-viet', duLieu); };
  var suaBaiViet = function (id, td) { return goiJava('PUT', '/bai-viet/' + id, td); };
  var xoaBaiViet = function (id) {
    if (!confirm('Xoá bài viết này? Bài vào thùng rác, khôi phục lại được.')) return false;
    if (goiJava('DELETE', '/bai-viet/' + id, null)) { capNhatXong(['bai-viet'], 'Đã xoá bài viết'); return true; }
    return false;
  };

  /** Bảng tra chuyên mục bài viết — dùng chung cho trang quản trị và trang khách. */
  var CHUYEN_MUC = {
    'huong-dan':   { ten: 'Hướng dẫn',   mau: 'badge-duong', icon: 'fa-screwdriver-wrench' },
    'vat-lieu':    { ten: 'Vật liệu',    mau: 'badge-xanh',  icon: 'fa-layer-group' },
    'kinh-nghiem': { ten: 'Kinh nghiệm', mau: 'badge-vang',  icon: 'fa-lightbulb' },
    'tin-shop':    { ten: 'Tin shop',    mau: 'badge-tim',   icon: 'fa-bullhorn' }
  };
  var badgeChuyenMuc = function (cm) { return badgeTheoMap(CHUYEN_MUC, cm || 'huong-dan'); };

  var themNhaCungCap = function (duLieu) { return goiJava('POST', '/nha-cung-cap', duLieu); };
  var suaNhaCungCap = function (id, td) { return goiJava('PUT', '/nha-cung-cap/' + id, td); };
  var xoaNhaCungCap = function (id) {
    if (!confirm('Xoá nhà cung cấp này?')) return false;
    if (goiJava('DELETE', '/nha-cung-cap/' + id, null)) { capNhatXong(['nha-cung-cap', 'vat-tu'], 'Đã xoá nhà cung cấp'); return true; }
    return false;
  };

  /* ---------------- Tính chi phí & giá bán theo gram ---------------- */

  /**
   * Bảng chi phí:
   *  - tienMuaVatTu : tổng tiền đã bỏ ra mua toàn bộ vật tư trong kho (máy in + nhựa)
   *  - tienNhuaDaDung: tiền nhựa đã tiêu hao (đơn giá/gram × số gram đã in)
   *  - tongChiPhi   : tienMuaVatTu + tienNhuaDaDung
   *  - giaNhuaTrungBinhMoiGram: trung bình có trọng số của các cuộn nhựa
   */
  var tinhChiPhi = function () {
    var tienMuaVatTu = VAT_TU.reduce(function (s, v) { return s + (v.tongTienMua || 0); }, 0);
    var nhua = VAT_TU.filter(function (v) { return v.loai === 'nhua'; });
    var tienNhuaDaDung = nhua.reduce(function (s, v) { return s + (v.tienDaDung || 0); }, 0);
    var tongGramDaDung = nhua.reduce(function (s, v) { return s + (v.daDungGram || 0); }, 0);
    var tongGramMua = nhua.reduce(function (s, v) { return s + (v.khoiLuongGram || 0) * (v.soLuong || 0); }, 0);
    var tienNhuaTong = nhua.reduce(function (s, v) { return s + (v.tongTienMua || 0); }, 0);
    var tienMayIn = VAT_TU.filter(function (v) { return v.loai === 'may_in'; })
      .reduce(function (s, v) { return s + (v.tongTienMua || 0); }, 0);

    return {
      tienMuaVatTu: tienMuaVatTu,
      tienMayIn: tienMayIn,
      tienNhuaTong: tienNhuaTong,
      tienNhuaDaDung: tienNhuaDaDung,
      tongChiPhi: tienMuaVatTu + tienNhuaDaDung,
      tongGramDaDung: tongGramDaDung,
      tongGramMua: tongGramMua,
      gramConLai: Math.max(0, tongGramMua - tongGramDaDung),
      giaNhuaTrungBinhMoiGram: tongGramMua > 0 ? tienNhuaTong / tongGramMua : 0
    };
  };

  /**
   * Giá bán đề xuất mỗi gram = giá vốn nhựa/gram × (1 + tỉ lệ lãi).
   * Mặc định tỉ lệ lãi lấy từ localStorage 'in3d_ti_le_lai' (đơn vị %, mặc định 120%).
   */
  var layTiLeLai = function () {
    var v = parseFloat(localStorage.getItem('in3d_ti_le_lai'));
    return isNaN(v) ? 120 : v;
  };
  var luuTiLeLai = function (v) { localStorage.setItem('in3d_ti_le_lai', String(v)); };

  var giaBanMoiGram = function (tiLeLai) {
    var cp = tinhChiPhi();
    var lai = tiLeLai === undefined ? layTiLeLai() : tiLeLai;
    return cp.giaNhuaTrungBinhMoiGram * (1 + lai / 100);
  };

  /** Danh sách mẫu vật in để ước tính giá bán (lưu localStorage). Chưa nhập thì trống. */
  var laySanPhamIn = function () {
    try {
      var ds = JSON.parse(localStorage.getItem('in3d_san_pham_in'));
      if (Array.isArray(ds)) return ds;
    } catch (e) {}
    return [];
  };
  var luuSanPhamIn = function (ds) { localStorage.setItem('in3d_san_pham_in', JSON.stringify(ds)); };

  /* ---------------- Menu ---------------- */

  var NAV = [
    { label: 'Quản lý bán hàng', items: [
      { key: 'tong-quan', text: 'Tổng quan', href: 'index.html', icon: 'fa-chart-pie' },
      { key: 'don-hang', text: 'Đơn hàng', href: 'don-hang.html', icon: 'fa-cart-shopping', badge: function () { return ORDERS.filter(function (o) { return o.status === 'Chờ xác nhận'; }).length || ''; } },
      { key: 'khach-hang', text: 'Khách hàng', href: 'khach-hang.html', icon: 'fa-users' },
      { key: 'khuyen-mai', text: 'Khuyến mãi', href: 'khuyen-mai.html', icon: 'fa-tags' }
    ]},
    { label: 'Quản lý sản phẩm', items: [
      { key: 'san-pham', text: 'Sản phẩm', href: 'san-pham.html', icon: 'fa-cube' },
      { key: 'danh-muc', text: 'Danh mục', href: 'danh-muc.html', icon: 'fa-folder-tree' },
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
      '<div class="nguoi-dung" onclick="' + (phien ? '' : "window.location.href='dang-nhap.html'") + '">' +
      '<span class="avatar">' + esc(tat) + '</span>' +
      '<span class="ten">' + esc(phien ? phien.hoTen : 'Đăng nhập') + '</span>' +
      (phien ? '<a class="thoat" href="#" onclick="event.stopPropagation();Apex.dangXuat();return false;">Thoát</a>' : '') +
      '</div></header>';
    fill('#apex-topbar-cho', tb);

    // Thông báo backend tắt + số đơn chờ trên menu được điền sau khi dữ liệu về
    // (capNhatBanner / capNhatBadgeMenu); shell() thường chạy trước lúc đó.
    if (DA_NAP) { capNhatBanner(); capNhatBadgeMenu(); }
  };

  var moMenu = function () {
    document.getElementById('apex-sidebar').classList.add('mo');
    document.getElementById('apex-phu-mo').classList.add('hien');
  };
  var dongMenu = function () {
    document.getElementById('apex-sidebar').classList.remove('mo');
    document.getElementById('apex-phu-mo').classList.remove('hien');
  };

  // Tìm nhanh: ẩn/hiện hàng của bảng đầu tiên trên trang theo từ khoá
  var timTrongBang = function (tuKhoa) {
    var tk = (tuKhoa || '').toLowerCase();
    document.querySelectorAll('table.bang tbody tr').forEach(function (tr) {
      tr.style.display = tr.textContent.toLowerCase().indexOf(tk) >= 0 ? '' : 'none';
    });
  };

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

  var veBieuDo = function (id, option) {
    var el = document.getElementById(id);
    if (!el || !window.echarts) return null;
    var cu = window.echarts.getInstanceByDom(el);
    if (cu) cu.dispose();   // vẽ lại sau khi nạp dữ liệu mới thì bỏ instance cũ trước
    var chart = window.echarts.init(el);
    chart.setOption(option);
    window.addEventListener('resize', function () { chart.resize(); });
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
    backendOk: function () { return BACKEND_OK; },   // hàm, vì giá trị chỉ biết sau khi nạp xong
    datVeLai: datVeLai,
    daNap: function () { return DA_NAP; },
    capNhatXong: capNhatXong,
    taiLai: taiLai,
    baoNhanh: baoNhanh,
    orders: ORDERS,
    products: PRODUCTS,
    customers: CUSTOMERS,
    inventory: INVENTORY,
    vatTu: VAT_TU,
    nhaCungCap: NHA_CUNG_CAP,
    mauSac: MAU_SAC,
    danhMuc: DANH_MUC,
    baiViet: BAI_VIET,
    khuyenMai: KHUYEN_MAI,
    loaiVatTu: LOAI_VAT_TU,
    stats: STATS,
    tienNgan: tienNgan,
    nguongSapHet: NGUONG_SAP_HET,
    nguongNhuaSapHet: NGUONG_NHUA_SAP_HET,
    ttVatTuThucTe: ttVatTuThucTe,
    gramConLai: gramConLai,
    tinhChiPhi: tinhChiPhi,
    giaBanMoiGram: giaBanMoiGram,
    layTiLeLai: layTiLeLai,
    luuTiLeLai: luuTiLeLai,
    laySanPhamIn: laySanPhamIn,
    luuSanPhamIn: luuSanPhamIn,
    suaVatTu: suaVatTu,
    moFormGram: moFormGram,
    luuGram: luuGram,
    luuNhapKho: luuNhapKho,
    datDaDung: datDaDung,
    dungThemGram: dungThemGram,
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
    soSanPhamTheoDanhMuc: soSanPhamTheoDanhMuc,
    danhMucSanPham: danhMucSanPham,
    danhMucVatTu: danhMucVatTu,
    tinhChatVatTu: LOAI_VAT_TU,
    tenLoaiVatTu: tenLoaiVatTu,
    soVatTuTheoDanhMuc: soVatTuTheoDanhMuc,
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
    luuSanPham: luuSanPham,
    xoaSanPham: xoaSanPham,
    doiTrangThaiSanPham: doiTrangThaiSanPham,
    doiTrangThaiVatTu: doiTrangThaiVatTu,
    shell: shell,
    moMenu: moMenu,
    dongMenu: dongMenu,
    timTrongBang: timTrongBang,
    layPhien: layPhien,
    dangXuat: dangXuat,
    doiTrangThai: doiTrangThai,
    danhDauDaTT: danhDauDaTT,
    xoaDon: xoaDon,
    anHienSanPham: anHienSanPham,
    nhapKho: nhapKho,
    themSanPhamMoi: themSanPhamMoi,
    bieuDoDuong: bieuDoDuong,
    bieuDoCot: bieuDoCot,
    bieuDoTron: bieuDoTron
  };
})();
