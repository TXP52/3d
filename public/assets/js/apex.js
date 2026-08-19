window.Apex = (function () {
  'use strict';

  var BRAND = 'Bedecraft';
  var TAGLINE = 'Quản trị bán hàng máy in 3D';
  var JAVA_API = 'http://localhost:8090/api';
  var SB_URL = 'https://nmptxzbtngztzxpwdprs.supabase.co';
  var SB_KEY = 'sb_publishable_OJjvcAtUPib9bvdNNA-Bjg_vbz7CuQ-';

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

  var anhSanPham = function (ten) {
    var t = (ten || '').toLowerCase();
    if (t.indexOf('resin') >= 0) return 'assets/img/sanpham/p26.jpg';
    if (t.indexOf('máy in') >= 0 || t.indexOf('bambu') >= 0 || t.indexOf('creality') >= 0 || t.indexOf('prusa') >= 0 || t.indexOf('kobra') >= 0 || t.indexOf('ender') >= 0) return 'assets/img/sanpham/p25.jpg';
    if (t.indexOf('nhựa') >= 0 || t.indexOf('pla') >= 0 || t.indexOf('petg') >= 0 || t.indexOf('abs') >= 0 || t.indexOf('tpu') >= 0) return 'assets/img/sanpham/p27.jpg';
    if (t.indexOf('đầu phun') >= 0 || t.indexOf('nozzle') >= 0 || t.indexOf('bàn in') >= 0 || t.indexOf('dụng cụ') >= 0 || t.indexOf('pei') >= 0 || t.indexOf('hotend') >= 0) return 'assets/img/sanpham/p49.webp';
    if (t.indexOf('scan') >= 0 || t.indexOf('dịch vụ') >= 0 || t.indexOf('thiết kế') >= 0) return 'assets/img/sanpham/p46.jpg';
    if (t.indexOf('mô hình') >= 0 || t.indexOf('stl') >= 0) return 'assets/img/sanpham/p48.jpg';
    return 'assets/img/sanpham/p50.jpg';
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

  /* Phạm vi áp dụng — hiện chỉ để chủ shop ghi nhớ, chưa lọc theo giỏ hàng */
  var AP_DUNG_CHO = {
    tat_ca:   { ten: 'Tất cả',   mau: 'badge-xam',   icon: 'fa-layer-group' },
    san_pham: { ten: 'Sản phẩm', mau: 'badge-xanh',  icon: 'fa-cube' },
    dich_vu:  { ten: 'Dịch vụ',  mau: 'badge-duong', icon: 'fa-screwdriver-wrench' }
  };

  /* Trạng thái VẬT TƯ: đặt mua -> vận chuyển -> về kho -> hết */
  var TT_VAT_TU = {
    da_dat:          { ten: 'Đã đặt',           mau: 'badge-tim',   icon: 'fa-bookmark' },
    dang_van_chuyen: { ten: 'Đang vận chuyển',  mau: 'badge-duong', icon: 'fa-truck-fast' },
    thanh_cong:      { ten: 'Thành công',       mau: 'badge-xanh',  icon: 'fa-circle-check' },
    het_hang:        { ten: 'Hết hàng',         mau: 'badge-toi',   icon: 'fa-ban' }
  };

  var badgeTheoMap = function (map, khoa) {
    var t = map[khoa] || { ten: khoa || '—', mau: 'badge-xam', icon: 'fa-circle' };
    return '<span class="badge ' + t.mau + '"><i class="fa-solid ' + t.icon + '"></i>' + esc(t.ten) + '</span>';
  };
  var badgeTtSanPham = function (tt) { return badgeTheoMap(TT_SAN_PHAM, tt); };
  var badgeTtVatTu = function (tt) { return badgeTheoMap(TT_VAT_TU, tt); };
  var badgeLoaiSanPham = function (l) { return badgeTheoMap(LOAI_SAN_PHAM, l || 'ban'); };
  var badgeLoaiKm = function (l) { return badgeTheoMap(LOAI_KHUYEN_MAI, l || 'phan_tram'); };
  var badgeTtKm = function (tt) { return badgeTheoMap(TT_KHUYEN_MAI, tt || 'tam_dung'); };

  /** "Giảm 10% (tối đa 50.000₫)" — mô tả ưu đãi bằng một câu ngắn. */
  var moTaUuDai = function (km) {
    if (!km) return '—';
    if (km.loai === 'phan_tram') {
      return 'Giảm ' + km.giaTri + '%' + (km.giamToiDa > 0 ? ' (tối đa ' + money(km.giamToiDa) + ')' : '');
    }
    if (km.loai === 'mien_ship') return 'Miễn ship ' + money(km.giaTri);
    return 'Giảm ' + money(km.giaTri);
  };

  var badgeTon = function (ton, toiThieu) {
    if (ton <= 0) return '<span class="badge badge-do">Hết hàng</span>';
    if (ton <= (toiThieu || 5)) return '<span class="badge badge-vang">Sắp hết</span>';
    return '<span class="badge badge-xanh">Còn hàng</span>';
  };

  /* ---------------- Dữ liệu mẫu (dự phòng khi không có backend) ---------------- */

  var PRODUCTS = [
    { dbId: null, sku: 'SP-1', name: 'Creality Ender-3 V3 SE', cat: 'Đang bán', price: 6490000, cost: 4543000, stock: 20, min: 5, img: '' },
    { dbId: null, sku: 'SP-2', name: 'Máy in resin Photon Mono 4', cat: 'Đang bán', price: 8990000, cost: 6293000, stock: 12, min: 5, img: '' },
    { dbId: null, sku: 'SP-3', name: 'Nhựa PLA+ 1.75mm (1kg)', cat: 'Đang bán', price: 290000, cost: 203000, stock: 100, min: 20, img: '' },
    { dbId: null, sku: 'SP-4', name: 'Bộ đầu phun (nozzle) thép 0.4mm', cat: 'Đang bán', price: 150000, cost: 105000, stock: 200, min: 30, img: '' }
  ];
  var ORDERS = [
    { dbId: null, id: 'DH-DEMO-1', customer: 'Nguyễn Văn A', phone: '0901111222', date: '14/8/2026', items: 2, total: 6780000, status: 'Chờ xác nhận', payment: 'COD', channel: 'Website' },
    { dbId: null, id: 'DH-DEMO-2', customer: 'Trần Thị B', phone: '0903333444', date: '13/8/2026', items: 1, total: 8990000, status: 'Hoàn thành', payment: 'Chuyển khoản', channel: 'Website' }
  ];
  var CUSTOMERS = [];
  var INVENTORY = [];
  var STATS = {
    thang: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11', 'T12'],
    doanhThuNam: [412, 386, 524, 498, 611, 587, 702, 668, 741, 795, 862, 934],
    doanhThuNamTruoc: [318, 302, 401, 388, 452, 439, 516, 495, 548, 592, 634, 688],
    donTheoThang: [86, 79, 104, 98, 121, 116, 138, 131, 146, 158, 171, 184]
  };
  var MAU_SAC = [];       // bảng màu dùng cho nhựa in và sản phẩm
  var BAI_VIET = [];      // bài viết kiến thức in 3D hiện ở cuối trang chủ khách
  var KHUYEN_MAI = [];    // mã giảm giá khách nhập ở giỏ hàng
  var VAT_TU = [];        // kho vật tư: máy in, cuộn nhựa...
  var NHA_CUNG_CAP = [];  // nơi mua vật tư
  var DATA_SOURCE = 'demo';

  var LOAI_VAT_TU = { may_in: 'Máy in', nhua: 'Nhựa in', phu_kien: 'Phụ kiện', khac: 'Khác' };

  /* ---------------- Nạp dữ liệu thật (đồng bộ, trước khi trang vẽ) ---------------- */

  var taiDongBo = function (url, headers) {
    try {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, false);
      if (headers) Object.keys(headers).forEach(function (k) { xhr.setRequestHeader(k, headers[k]); });
      xhr.send(null);
      if (xhr.status >= 200 && xhr.status < 300) return JSON.parse(xhr.responseText);
    } catch (e) { /* backend tắt */ }
    return null;
  };

  var layPhien = function () {
    try { return JSON.parse(localStorage.getItem('in3d_phien')); } catch (e) { return null; }
  };

  var dangXuat = function () {
    localStorage.removeItem('in3d_phien');
    window.location.href = 'dang-nhap.html';
  };

  (function napDuLieuThat() {
    var donJava = taiDongBo(JAVA_API + '/don-hang');
    var spJava = taiDongBo(JAVA_API + '/san-pham?tatCa=true');

    if (donJava && spJava) {
      DATA_SOURCE = 'java';
      ORDERS = donJava.map(function (d) {
        var tt = (d.thanhToan && d.thanhToan[0]) || null;
        return {
          dbId: d.id, id: d.maDon, customer: d.tenKhach, phone: d.soDienThoai || '',
          date: ngayVN(d.createdAt), items: (d.chiTiet || []).reduce(function (s, c) { return s + (c.soLuong || 0); }, 0),
          total: d.tongTien || 0, status: TT_MAP[d.trangThai] || d.trangThai,
          maKhuyenMai: d.maKhuyenMai || '', tienGiam: d.tienGiam || 0, tamTinh: d.tamTinh || d.tongTien || 0,
          payment: tt ? (PT_MAP[tt.phuongThuc] || 'COD') + (tt.trangThai === 'da_thanh_toan' ? ' (đã TT)' : '') : 'COD',
          channel: 'Website',
          chiTiet: (d.chiTiet || []).map(function (c) { return { ten: c.tenSanPham, soLuong: c.soLuong, donGia: c.donGia }; })
        };
      });
      PRODUCTS = spJava.map(function (s) {
        return {
          dbId: s.id, sku: 'SP-' + s.id, name: s.ten, cat: s.dangBan ? 'Đang bán' : 'Đang ẩn',
          price: s.gia || 0, cost: Math.round((s.gia || 0) * 0.7), // giá vốn tạm tính 70%
          stock: s.tonKho || 0, min: 5, img: s.hinhAnh || '', dangBan: !!s.dangBan,
          moTa: s.moTa || '', trangThai: s.trangThai || 'san_hang', ngayTao: s.createdAt || '',
          loaiSanPham: s.loaiSanPham || 'ban'
        };
      });
    } else {
      var h = { apikey: SB_KEY, Authorization: 'Bearer ' + SB_KEY };
      var spSb = taiDongBo(SB_URL + '/rest/v1/san_pham?select=*&order=id', h);
      if (spSb) {
        DATA_SOURCE = 'supabase';
        PRODUCTS = spSb.map(function (s) {
          return {
            dbId: s.id, sku: 'SP-' + s.id, name: s.ten, cat: s.dang_ban ? 'Đang bán' : 'Đang ẩn',
            price: Number(s.gia) || 0, cost: Math.round((Number(s.gia) || 0) * 0.7),
            stock: s.ton_kho || 0, min: 5, img: s.hinh_anh || '', dangBan: !!s.dang_ban,
            moTa: s.mo_ta || '', trangThai: s.trang_thai || 'san_hang', ngayTao: s.created_at || '',
            loaiSanPham: s.loai_san_pham || 'ban'
          };
        });
      }
    }

    INVENTORY = PRODUCTS.map(function (p) {
      return { sku: p.sku, name: p.name, type: p.cat, stock: p.stock, min: p.min, location: 'Kho chính', updated: ngayVN(new Date().toISOString()) };
    });

    // Kho vật tư + nhà cung cấp (chỉ backend Java mới có)
    var vt = taiDongBo(JAVA_API + '/vat-tu');
    if (vt) VAT_TU = vt;
    var ncc = taiDongBo(JAVA_API + '/nha-cung-cap');
    if (ncc) NHA_CUNG_CAP = ncc;
    var ms = taiDongBo(JAVA_API + '/mau-sac');
    if (ms) MAU_SAC = ms;
    // tatCa=true: trang quản trị thấy cả bài đang tắt hiển thị
    var bv = taiDongBo(JAVA_API + '/bai-viet?tatCa=true');
    if (bv) BAI_VIET = bv;
    // tatCa=true: trang quản trị thấy cả mã tạm dừng và hết hạn
    var km = taiDongBo(JAVA_API + '/khuyen-mai?tatCa=true');
    if (km) KHUYEN_MAI = km;

    // Khách hàng: tài khoản đăng ký (cần token admin) + khách vãng lai từ đơn
    var nhom = {};
    ORDERS.forEach(function (o) {
      var k = o.customer + '|' + o.phone;
      if (!nhom[k]) nhom[k] = { id: 'KH-' + (Object.keys(nhom).length + 1), name: o.customer, email: '—', phone: o.phone || '—', group: 'Khách lẻ', orders: 0, spent: 0, since: o.date };
      nhom[k].orders += 1;
      nhom[k].spent += o.total;
    });
    CUSTOMERS = Object.keys(nhom).map(function (k) { return nhom[k]; });

    var phien = layPhien();
    if (DATA_SOURCE === 'java' && phien && phien.token) {
      var users = taiDongBo(JAVA_API + '/nguoi-dung', { Authorization: 'Bearer ' + phien.token });
      if (users && users.length) {
        var coTK = {};
        users.forEach(function (u) { coTK[u.hoTen] = true; });
        CUSTOMERS = users.map(function (u) {
          var don = ORDERS.filter(function (o) { return o.customer === u.hoTen; });
          return {
            id: 'KH-' + u.id, name: u.hoTen, email: u.email, phone: u.soDienThoai || '—',
            group: u.vaiTro === 'admin' ? 'Quản trị' : 'Khách hàng',
            orders: don.length, spent: don.reduce(function (s, o) { return s + o.total; }, 0),
            since: ngayVN(u.createdAt)
          };
        }).concat(CUSTOMERS.filter(function (c) { return !coTK[c.name]; }));
      }
    }
  })();

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

  var doiTrangThai = function (dbId, tt) { if (goiJava('PUT', '/don-hang/' + dbId + '/trang-thai', { trangThai: tt })) location.reload(); };
  var danhDauDaTT = function (dbId) { if (goiJava('PUT', '/don-hang/' + dbId + '/da-thanh-toan', null)) location.reload(); };
  var xoaDon = function (dbId) {
    if (!confirm('Xoá đơn hàng này? Hành động không hoàn tác được.')) return;
    if (goiJava('DELETE', '/don-hang/' + dbId, null)) location.reload();
  };
  var anHienSanPham = function (dbId, dangBan) {
    if (goiJava('PUT', '/san-pham/' + dbId, { dangBan: !dangBan })) location.reload();
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
      '<i class="fa-solid fa-boxes-packing"></i> Nhập kho</button></div></div>'
    );
  };

  var luuNhapKho = function (dbId, ton) {
    var loi = document.getElementById('ht-loi-kho');
    var them = parseInt(document.getElementById('ht-them-kho').value, 10);
    if (isNaN(them) || them <= 0) { loi.textContent = 'Số lượng phải lớn hơn 0.'; return; }
    if (goiJava('PUT', '/san-pham/' + dbId, { tonKho: ton + them })) location.reload();
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
    if (goiJava('DELETE', '/san-pham/' + dbId, null)) { location.reload(); return true; }
    return false;
  };
  var doiTrangThaiSanPham = function (dbId, tt) {
    if (goiJava('PUT', '/san-pham/' + dbId, { trangThai: tt })) location.reload();
  };
  var doiTrangThaiVatTu = function (id, tt) {
    if (goiJava('PUT', '/vat-tu/' + id, { trangThai: tt })) location.reload();
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
  var ganOTaiAnh = function (idGoc, urlBanDau) {
    var url = urlBanDau || '';
    var oFile = document.getElementById(idGoc + '-file');
    var xemTruoc = document.getElementById(idGoc + '-xem');
    var bao = document.getElementById(idGoc + '-bao');
    if (!oFile) return function () { return url; };

    oFile.addEventListener('change', function () {
      var f = oFile.files && oFile.files[0];
      if (!f) return;
      bao.className = 'trang-thai-anh';
      bao.textContent = 'Đang nén và tải ảnh lên...';
      taiAnhLen(f, function (u) {
        url = u;
        if (xemTruoc) xemTruoc.src = anhDayDu(u);
        bao.className = 'trang-thai-anh';
        bao.textContent = 'Đã lưu ảnh vào máy chủ ✓';
      }, function (thongBao) {
        bao.className = 'trang-thai-anh loi';
        bao.textContent = thongBao;
      });
    });
    return function () { return url; };
  };

  /** HTML của ô tải ảnh, dùng chung cho hộp thoại sản phẩm và vật tư. */
  var htmlOTaiAnh = function (idGoc, urlHienTai, nhan) {
    return '<div class="o-anh">' +
      '<img class="xem-truoc" id="' + idGoc + '-xem" alt="" ' +
      (urlHienTai ? 'src="' + esc(anhDayDu(urlHienTai)) + '" ' : '') +
      'onerror="this.removeAttribute(\'src\')" />' +
      '<div class="phai-anh">' +
      '<label class="nut-tai-anh" for="' + idGoc + '-file"><i class="fa-solid fa-image"></i> ' +
      esc(nhan || 'Chọn ảnh từ máy') + '</label>' +
      '<input type="file" id="' + idGoc + '-file" accept="image/*" />' +
      '<div class="trang-thai-anh" id="' + idGoc + '-bao">Ảnh được nén còn tối đa 900px rồi lưu trên máy chủ (miễn phí).</div>' +
      '</div></div>';
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
      '<input type="number" id="ht-them-gram" min="0" step="1" placeholder="VD: 5" /></div>' +
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
    if (suaVatTu(id, { daDungGram: gram })) location.reload();
    else loi.textContent = 'Không lưu được. Kiểm tra lại backend Java (cổng 8090).';
  };

  /* Giữ tên cũ cho các trang đang gọi */
  var datDaDung = function (id) { moFormGram(id); };
  var dungThemGram = function (id) { moFormGram(id); };

  var themVatTu = function (duLieu) { return goiJava('POST', '/vat-tu', duLieu); };
  var xoaVatTu = function (id) {
    if (!confirm('Xoá vật tư này khỏi kho?')) return false;
    if (goiJava('DELETE', '/vat-tu/' + id, null)) { location.reload(); return true; }
    return false;
  };
  /** Ô vuông màu nhỏ đứng trước tên màu. */
  var oMau = function (maMau) {
    var m = /^#[0-9a-fA-F]{6}$/.test(maMau || '') ? maMau : '#e4e6e9';
    return '<span style="display:inline-block;width:13px;height:13px;border-radius:4px;vertical-align:-2px;' +
      'margin-right:6px;border:1px solid rgba(0,0,0,.18);background:' + m + '"></span>';
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
    if (goiJava('DELETE', '/mau-sac/' + id, null)) { location.reload(); return true; }
    return false;
  };

  var themKhuyenMai = function (duLieu) { return goiJava('POST', '/khuyen-mai', duLieu); };
  var suaKhuyenMai = function (id, td) { return goiJava('PUT', '/khuyen-mai/' + id, td); };
  var xoaKhuyenMai = function (id) {
    if (!confirm('Xoá mã khuyến mãi này? Mã vào thùng rác, đơn cũ đã dùng vẫn giữ nguyên.')) return false;
    if (goiJava('DELETE', '/khuyen-mai/' + id, null)) { location.reload(); return true; }
    return false;
  };

  var themBaiViet = function (duLieu) { return goiJava('POST', '/bai-viet', duLieu); };
  var suaBaiViet = function (id, td) { return goiJava('PUT', '/bai-viet/' + id, td); };
  var xoaBaiViet = function (id) {
    if (!confirm('Xoá bài viết này? Bài vào thùng rác, khôi phục lại được.')) return false;
    if (goiJava('DELETE', '/bai-viet/' + id, null)) { location.reload(); return true; }
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
    if (goiJava('DELETE', '/nha-cung-cap/' + id, null)) { location.reload(); return true; }
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

  /** Danh sách mẫu vật in để ước tính giá bán (lưu localStorage). */
  var laySanPhamIn = function () {
    try {
      var ds = JSON.parse(localStorage.getItem('in3d_san_pham_in'));
      if (Array.isArray(ds) && ds.length) return ds;
    } catch (e) {}
    return [
      { ten: 'Móc khoá mini', gram: 5 },
      { ten: 'Đồ chơi nhỏ', gram: 15 },
      { ten: 'Chậu cây để bàn', gram: 60 },
      { ten: 'Mô hình trang trí', gram: 120 },
      { ten: 'Vỏ hộp kỹ thuật', gram: 200 }
    ];
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
      { key: 'san-pham', text: 'Danh sách sản phẩm', href: 'san-pham.html', icon: 'fa-cube' },
      { key: 'kho', text: 'Kho & vật tư', href: 'kho.html', icon: 'fa-warehouse' },
      { key: 'nha-cung-cap', text: 'Nhà cung cấp', href: 'nha-cung-cap.html', icon: 'fa-truck-field' },
      { key: 'mau-sac', text: 'Màu sắc', href: 'mau-sac.html', icon: 'fa-palette' }
    ]},
    { label: 'Nội dung website', items: [
      { key: 'bai-viet', text: 'Bài viết', href: 'bai-viet.html', icon: 'fa-newspaper' }
    ]},
    { label: 'Quản lý tài chính', items: [
      { key: 'quan-ly-von', text: 'Quản lý vốn', href: 'quan-ly-von.html', icon: 'fa-coins' },
      { key: 'quan-ly-xuat-nhap', text: 'Quản lý xuất nhập', href: 'quan-ly-xuat-nhap.html', icon: 'fa-right-left' },
      { key: 'bao-cao', text: 'Báo cáo doanh thu', href: 'bao-cao.html', icon: 'fa-chart-line' }
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
      '<div><div class="ten">' + BRAND + '</div><div class="phu">' + TAGLINE + '</div></div></a>' +
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
    sb += '</div>' +
      '<div class="chan">Dữ liệu: ' + (DATA_SOURCE === 'java' ? 'Backend Java' : DATA_SOURCE === 'supabase' ? 'Supabase' : 'Mẫu (chưa kết nối)') + '</div>' +
      '</aside><div class="apex-phu-mo" id="apex-phu-mo" onclick="Apex.dongMenu()"></div>';
    fill('#apex-sidebar-cho', sb);

    // Topbar
    var tat = phien && phien.hoTen
      ? phien.hoTen.split(' ').slice(-2).map(function (w) { return w.charAt(0); }).join('').toUpperCase()
      : '?';
    var tb = '<header class="apex-topbar">' +
      '<button class="nut-menu" onclick="Apex.moMenu()" aria-label="Mở menu"><i class="fa-solid fa-bars"></i></button>' +
      '<div class="tieu-de">' + esc(tieuDe || '') + '</div>' +
      '<div class="tim"><span class="bieu-tuong"><i class="fa-solid fa-magnifying-glass"></i></span>' +
      '<input type="search" placeholder="Tìm kiếm..." oninput="Apex.timTrongBang(this.value)" /></div>' +
      '<div class="nguoi-dung" onclick="' + (phien ? '' : "window.location.href='dang-nhap.html'") + '">' +
      '<span class="avatar">' + esc(tat) + '</span>' +
      '<span class="ten">' + esc(phien ? phien.hoTen : 'Đăng nhập') + '</span>' +
      (phien ? '<a class="thoat" href="#" onclick="event.stopPropagation();Apex.dangXuat();return false;">Thoát</a>' : '') +
      '</div></header>';
    fill('#apex-topbar-cho', tb);

    // Footer
    fill('#apex-chan-cho',
      '<div style="padding:14px 24px;color:var(--chu-mo);font-size:12.5px;border-top:1px solid var(--vien);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px;">' +
      '<span>' + BRAND + ' — ' + TAGLINE + '</span><span>Phiên bản 2.0 · Giao diện Apex</span></div>');
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
    var chart = window.echarts.init(el);
    chart.setOption(option);
    window.addEventListener('resize', function () { chart.resize(); });
    return chart;
  };

  var truc = { axisLine: { lineStyle: { color: '#e4e6e9' } }, axisLabel: { color: '#6b7280' }, axisTick: { show: false } };

  var bieuDoDuong = function (id, nhan, cacDay) {
    return veBieuDo(id, {
      color: MAU_BIEU_DO,
      tooltip: { trigger: 'axis' },
      legend: { bottom: 0, textStyle: { color: '#6b7280' } },
      grid: { left: 10, right: 16, top: 20, bottom: 40, containLabel: true },
      xAxis: Object.assign({ type: 'category', data: nhan, boundaryGap: false }, truc),
      yAxis: Object.assign({ type: 'value', splitLine: { lineStyle: { color: '#eef0f2' } } }, truc),
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
    dataSource: DATA_SOURCE,
    orders: ORDERS,
    products: PRODUCTS,
    customers: CUSTOMERS,
    inventory: INVENTORY,
    vatTu: VAT_TU,
    nhaCungCap: NHA_CUNG_CAP,
    mauSac: MAU_SAC,
    baiViet: BAI_VIET,
    khuyenMai: KHUYEN_MAI,
    loaiVatTu: LOAI_VAT_TU,
    stats: STATS,
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
    timMau: timMau,
    themMauSac: themMauSac,
    suaMauSac: suaMauSac,
    xoaMauSac: xoaMauSac,
    themKhuyenMai: themKhuyenMai,
    suaKhuyenMai: suaKhuyenMai,
    xoaKhuyenMai: xoaKhuyenMai,
    loaiKhuyenMai: LOAI_KHUYEN_MAI,
    ttKhuyenMai: TT_KHUYEN_MAI,
    apDungCho: AP_DUNG_CHO,
    badgeLoaiKm: badgeLoaiKm,
    badgeTtKm: badgeTtKm,
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
