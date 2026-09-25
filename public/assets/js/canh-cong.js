/* ============================================================
   CỔNG CHẶN TRANG QUẢN TRỊ

   Chạy trong <head>, TRƯỚC khi trình duyệt dựng phần thân trang. Chưa đăng nhập
   thì đá thẳng sang dang-nhap.html — không kịp hiện menu, bảng biểu hay bất cứ
   thứ gì, nên người lạ mở địa chỉ trang quản trị chỉ thấy đúng ô đăng nhập.

   Hai lớp kiểm tra:
   1. Ngay lập tức, không cần mạng: có phiên trong máy không, token còn hạn không,
      vai trò có phải admin không. Nhanh nên trang không bị nháy nội dung.
   2. Hỏi lại backend: token này có chữ ký thật không. Cần lớp này vì lớp 1 chỉ đọc
      chữ ghi trong token — ai cũng tự gõ được một chuỗi giả vào bộ nhớ trình duyệt.
      Chỉ backend giữ chìa khoá mới biết chữ ký đúng hay sai.

   Đây mới là chặn ở phần nhìn. Chặn thật nằm ở backend (BaoVeApiConfig.java):
   không có token admin thì mọi API đều trả 401, người lạ có tự mở được trang
   cũng chỉ thấy bảng trống.
   ============================================================ */
(function () {
    'use strict';

    var KHOA_PHIEN = 'in3d_phien';
    var TRANG_DANG_NHAP = 'dang-nhap.html';

    function veDangNhap() {
        // Giấu trang lại trước: từ lúc gọi replace tới lúc trình duyệt thật sự chuyển
        // trang vẫn còn một nhịp, đủ để phần thân kịp hiện ra nếu không giấu.
        if (document.documentElement) document.documentElement.style.display = 'none';
        // replace chứ không href: bấm Back không quay ngược lại trang quản trị được
        window.location.replace(TRANG_DANG_NHAP);
    }

    function xoaPhien() {
        try { localStorage.removeItem(KHOA_PHIEN); } catch (e) { /* trình duyệt chặn lưu trữ */ }
    }

    function docPhien() {
        try { return JSON.parse(localStorage.getItem(KHOA_PHIEN)); }
        catch (e) { return null; }
    }

    /* Token dạng: base64url(email|vaiTro|hạn) + "." + chữ ký.
       Đọc phần hạn ngay tại chỗ để biết đã quá hạn chưa, khỏi chờ backend trả lời. */
    function laAdminConHan(token) {
        try {
            var p = String(token).split('.')[0].replace(/-/g, '+').replace(/_/g, '/');
            while (p.length % 4) p += '=';           // token bỏ dấu '=' ở đuôi, atob cần đủ
            var truong = atob(p).split('|');
            return truong.length === 3
                && truong[1] === 'admin'
                && Number(truong[2]) > Date.now();
        } catch (e) {
            return false;
        }
    }

    var phien = docPhien();
    if (!phien || !phien.token || !laAdminConHan(phien.token)) {
        xoaPhien();
        veDangNhap();
        return;
    }

    /* Lớp 2 — hỏi backend. Chạy song song với việc trang tải nên không làm chậm.
       Mất kết nối backend thì KHÔNG đá ra: chủ shop đang làm việc mà mạng chập một
       nhịp lại bị văng về đăng nhập thì rất khó chịu, mà cũng chẳng lộ gì — không có
       backend thì mọi bảng đều trống, đầu trang đã có banner đỏ báo mất kết nối. */
    var goc = (window.IN3D_API || 'http://localhost:8090/api');
    fetch(goc + '/auth/toi', {
        headers: { Authorization: 'Bearer ' + phien.token },
        cache: 'no-store'
    }).then(function (r) {
        if (r.status === 401 || r.status === 403) return null;
        return r.ok ? r.json() : false;
    }).then(function (toi) {
        if (toi === false) return;                 // lỗi lạ của backend — để yên
        if (!toi || toi.vaiTro !== 'admin') {      // null = token giả / hết hạn
            xoaPhien();
            veDangNhap();
        }
    }).catch(function () { /* mất mạng — để yên, xem ghi chú ở trên */ });
})();
