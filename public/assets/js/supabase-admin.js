/* ============================================================
   IN3D Store - Kết nối Supabase cho trang QUẢN TRỊ
   Dùng chung backend với website bán hàng (Website-GameOver).
   Yêu cầu: nạp CDN supabase-js TRƯỚC file này, và (tuỳ trang)
   đặt window.APP3D_GOC = '../../..' để trỏ về thư mục gốc public/.
   Schema: xem D:\3d\backend\schema.sql
   ============================================================ */
(function () {
    'use strict';

    var SUPABASE_URL = 'https://nmptxzbtngztzxpwdprs.supabase.co';
    var SUPABASE_KEY = 'sb_publishable_OJjvcAtUPib9bvdNNA-Bjg_vbz7CuQ-';
    var GOC = (typeof window.APP3D_GOC === 'string') ? window.APP3D_GOC : '.';

    // Backend Java (Spring Boot). Nếu đang chạy thì admin đọc/ghi qua Java;
    // nếu tắt thì tự động quay về gọi thẳng Supabase.
    var JAVA_API = 'http://localhost:8090/api';
    var nguonDon = 'supabase';   // 'java' | 'supabase' — nguồn dữ liệu đơn hàng hiện tại
    var nguonSp = 'supabase';    // nguồn dữ liệu sản phẩm hiện tại

    async function goiJava(duongDan, tuyChon) {
        var resp = await fetch(JAVA_API + duongDan, tuyChon || {});
        if (!resp.ok) {
            var loi = 'HTTP ' + resp.status;
            try { var du = await resp.json(); if (du && du.loi) loi = du.loi; } catch (e) {}
            throw new Error(loi);
        }
        return resp.status === 204 ? null : resp.json();
    }

    window.sbAdmin = null;
    if (window.supabase && window.supabase.createClient) {
        window.sbAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    } else {
        console.warn('[IN3D Store] Chưa nạp được supabase-js (cần Internet).');
    }

    /* ---------------- Tiện ích ---------------- */

    function esc(t) {
        return String(t == null ? '' : t)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function giaVND(so) {
        return Number(so || 0).toLocaleString('vi-VN') + '\u20AB';
    }

    function ngayVN(iso) {
        try { return new Date(iso).toLocaleString('vi-VN'); } catch (e) { return iso || ''; }
    }

    var TT_DON = {
        cho_xac_nhan: { ten: 'Chờ xác nhận', mau: 'warning', icon: 'fa-clock' },
        dang_xu_ly:   { ten: 'Đang xử lý',   mau: 'primary', icon: 'fa-redo' },
        dang_giao:    { ten: 'Đang giao',    mau: 'info',    icon: 'fa-truck' },
        hoan_thanh:   { ten: 'Hoàn thành',   mau: 'success', icon: 'fa-check' },
        da_huy:       { ten: 'Đã huỷ',       mau: 'danger',  icon: 'fa-ban' }
    };
    var TT_THANH_TOAN = {
        chua_thanh_toan: { ten: 'Chưa thanh toán', mau: 'secondary' },
        da_thanh_toan:   { ten: 'Đã thanh toán',   mau: 'success' },
        hoan_tien:       { ten: 'Hoàn tiền',       mau: 'danger' }
    };

    function badge(mau, chu, icon) {
        return '<span class="badge rounded-pill d-block badge-soft-' + mau + '">' + esc(chu) +
            (icon ? '<span class="ms-1 fas ' + icon + '" data-fa-transform="shrink-2"></span>' : '') +
            '</span>';
    }

    function dongThongBao(soCot, html) {
        return '<tr><td colspan="' + soCot + '" class="text-center py-4">' + html + '</td></tr>';
    }

    function loiHtml(loi) {
        var goiY = '';
        var chu = String(loi || '');
        if (chu.indexOf('schema cache') >= 0 || chu.indexOf('does not exist') >= 0) {
            goiY = '<br><span class="text-600 fs--1">Chưa tạo bảng: hãy chạy file <code>backend/schema.sql</code> trong Supabase SQL Editor.</span>';
        } else if (chu.indexOf('JWT') >= 0 || chu.indexOf('row-level security') >= 0 || chu.indexOf('permission') >= 0) {
            goiY = '<br><span class="text-600 fs--1">Cần đăng nhập tài khoản admin: <a href="' + GOC + '/dang-nhap.html">Đăng nhập</a></span>';
        }
        return '<span class="text-danger">Không tải được dữ liệu: ' + esc(chu) + '</span>' + goiY;
    }

    /* ---------------- Đăng nhập / phiên admin ---------------- */

    // Đăng nhập và kiểm tra quyền admin. Trả về { ok, loi }
    window.dangNhapAdmin = async function (email, matKhau) {
        if (!window.sbAdmin) return { ok: false, loi: 'Chưa kết nối được Supabase (cần Internet).' };

        var kq = await window.sbAdmin.auth.signInWithPassword({ email: email, password: matKhau });
        if (kq.error) {
            var l = kq.error.message;
            if (/Invalid login credentials/i.test(l)) l = 'Email hoặc mật khẩu không đúng.';
            if (/Email not confirmed/i.test(l)) l = 'Email chưa được xác nhận. Hãy kiểm tra hộp thư.';
            return { ok: false, loi: l };
        }

        var hoSo = await window.sbAdmin
            .from('profiles').select('vai_tro, ho_ten')
            .eq('id', kq.data.user.id).single();

        if (hoSo.error) {
            return { ok: false, loi: 'Không đọc được hồ sơ (đã chạy backend/schema.sql chưa?): ' + hoSo.error.message };
        }
        if (hoSo.data.vai_tro !== 'admin') {
            await window.sbAdmin.auth.signOut();
            return { ok: false, loi: 'Tài khoản này không có quyền quản trị. Hãy cấp quyền bằng câu SQL ở cuối file backend/schema.sql.' };
        }
        return { ok: true, hoTen: hoSo.data.ho_ten };
    };

    window.dangXuatAdmin = async function () {
        if (window.sbAdmin) await window.sbAdmin.auth.signOut();
        window.location.href = GOC + '/dang-nhap.html';
    };

    /* ---------------- Trang: DANH SÁCH ĐƠN HÀNG ---------------- */

    // Đổi đơn từ dạng JSON của Java (camelCase) về dạng Supabase (snake_case) để dùng chung 1 mẫu hiển thị
    function chuyenDonJava(d) {
        return {
            id: d.id,
            ma_don: d.maDon,
            ten_khach: d.tenKhach,
            so_dien_thoai: d.soDienThoai,
            dia_chi: d.diaChi,
            ghi_chu: d.ghiChu,
            tong_tien: d.tongTien,
            trang_thai: d.trangThai,
            created_at: d.createdAt,
            don_hang_chi_tiet: (d.chiTiet || []).map(function (ct) {
                return { ten_san_pham: ct.tenSanPham, so_luong: ct.soLuong };
            }),
            thanh_toan: (d.thanhToan || []).map(function (tt) {
                return { phuong_thuc: tt.phuongThuc, trang_thai: tt.trangThai };
            })
        };
    }

    async function layDonHang() {
        // Ưu tiên backend Java
        try {
            var ds = await goiJava('/don-hang');
            nguonDon = 'java';
            return { data: ds.map(chuyenDonJava), error: null };
        } catch (e) {
            console.warn('[IN3D Store] Backend Java không phản hồi (' + e.message + '), dùng Supabase.');
        }
        nguonDon = 'supabase';
        return await window.sbAdmin
            .from('don_hang')
            .select('id, ma_don, ten_khach, so_dien_thoai, dia_chi, ghi_chu, tong_tien, trang_thai, created_at, don_hang_chi_tiet(ten_san_pham, so_luong), thanh_toan(phuong_thuc, trang_thai)')
            .order('created_at', { ascending: false });
    }

    async function taiDonHang() {
        var tbody = document.getElementById('table-orders-body');
        tbody.innerHTML = dongThongBao(7, 'Đang tải đơn hàng...');

        var kq = await layDonHang();

        if (kq.error) { tbody.innerHTML = dongThongBao(7, loiHtml(kq.error.message)); return; }
        var tieuDe = document.querySelector('#ordersTable h5');
        if (tieuDe) tieuDe.textContent = 'Đơn hàng (' + (nguonDon === 'java' ? 'Java API' : 'Supabase') + ')';
        if (!kq.data.length) { tbody.innerHTML = dongThongBao(7, 'Chưa có đơn hàng nào. Hãy đặt thử một đơn trên website bán hàng!'); return; }

        tbody.innerHTML = kq.data.map(function (d, i) {
            var tt = TT_DON[d.trang_thai] || TT_DON.cho_xac_nhan;
            var ttTT = (d.thanh_toan && d.thanh_toan[0]) ? (TT_THANH_TOAN[d.thanh_toan[0].trang_thai] || TT_THANH_TOAN.chua_thanh_toan) : null;
            var mon = (d.don_hang_chi_tiet || [])
                .map(function (ct) { return esc(ct.ten_san_pham) + ' x' + ct.so_luong; })
                .join(', ');

            var menuTT = Object.keys(TT_DON).map(function (k) {
                return '<a class="dropdown-item doi-trang-thai" data-id="' + d.id + '" data-tt="' + k + '" href="#!">' + TT_DON[k].ten + '</a>';
            }).join('');

            return '<tr class="btn-reveal-trigger">' +
                '<td class="align-middle" style="width:28px"><div class="form-check fs-0 mb-0 d-flex align-items-center"><input class="form-check-input" type="checkbox" /></div></td>' +
                '<td class="order py-2 align-middle white-space-nowrap"><strong>' + esc(d.ma_don) + '</strong><br>bởi <strong>' + esc(d.ten_khach) + '</strong><br><a href="tel:' + esc(d.so_dien_thoai) + '">' + esc(d.so_dien_thoai) + '</a></td>' +
                '<td class="date py-2 align-middle">' + ngayVN(d.created_at) + '</td>' +
                '<td class="address py-2 align-middle">' + esc(d.dia_chi) +
                    '<p class="mb-0 text-500">' + mon + (d.ghi_chu ? ' — Ghi chú: ' + esc(d.ghi_chu) : '') + '</p></td>' +
                '<td class="status py-2 align-middle text-center fs-0 white-space-nowrap">' + badge(tt.mau, tt.ten, tt.icon) +
                    (ttTT ? badge(ttTT.mau, ttTT.ten) : '') + '</td>' +
                '<td class="amount py-2 align-middle text-end fs-0 fw-medium">' + giaVND(d.tong_tien) + '</td>' +
                '<td class="py-2 align-middle white-space-nowrap text-end">' +
                    '<div class="dropdown font-sans-serif position-static">' +
                    '<button class="btn btn-link text-600 btn-sm dropdown-toggle btn-reveal" type="button" id="order-dd-' + i + '" data-bs-toggle="dropdown" data-boundary="viewport"><span class="fas fa-ellipsis-h fs--1"></span></button>' +
                    '<div class="dropdown-menu dropdown-menu-end border py-0" aria-labelledby="order-dd-' + i + '"><div class="bg-white py-2">' +
                    menuTT +
                    '<div class="dropdown-divider"></div>' +
                    '<a class="dropdown-item text-success danh-dau-da-thanh-toan" data-id="' + d.id + '" href="#!">Đã thanh toán</a>' +
                    '<a class="dropdown-item text-danger xoa-don" data-id="' + d.id + '" data-ma="' + esc(d.ma_don) + '" href="#!">Xoá đơn</a>' +
                    '</div></div></div></td>' +
                '</tr>';
        }).join('');

        // Đổi trạng thái đơn
        tbody.querySelectorAll('.doi-trang-thai').forEach(function (a) {
            a.addEventListener('click', async function (e) {
                e.preventDefault();
                try {
                    if (nguonDon === 'java') {
                        await goiJava('/don-hang/' + a.dataset.id + '/trang-thai', {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ trangThai: a.dataset.tt })
                        });
                    } else {
                        var kqUp = await window.sbAdmin.from('don_hang')
                            .update({ trang_thai: a.dataset.tt }).eq('id', a.dataset.id);
                        if (kqUp.error) throw new Error(kqUp.error.message + ' (Bạn đã đăng nhập tài khoản admin chưa?)');
                    }
                } catch (loi) { alert('Lỗi cập nhật: ' + loi.message); }
                taiDonHang();
            });
        });
        // Đánh dấu đã thanh toán
        tbody.querySelectorAll('.danh-dau-da-thanh-toan').forEach(function (a) {
            a.addEventListener('click', async function (e) {
                e.preventDefault();
                try {
                    if (nguonDon === 'java') {
                        await goiJava('/don-hang/' + a.dataset.id + '/da-thanh-toan', { method: 'PUT' });
                    } else {
                        var kqUp = await window.sbAdmin.from('thanh_toan')
                            .update({ trang_thai: 'da_thanh_toan', thanh_toan_luc: new Date().toISOString() })
                            .eq('don_hang_id', a.dataset.id);
                        if (kqUp.error) throw new Error(kqUp.error.message);
                    }
                } catch (loi) { alert('Lỗi cập nhật thanh toán: ' + loi.message); }
                taiDonHang();
            });
        });
        // Xoá đơn
        tbody.querySelectorAll('.xoa-don').forEach(function (a) {
            a.addEventListener('click', async function (e) {
                e.preventDefault();
                if (!confirm('Xoá đơn ' + a.dataset.ma + '? Hành động này không hoàn tác được.')) return;
                try {
                    if (nguonDon === 'java') {
                        await goiJava('/don-hang/' + a.dataset.id, { method: 'DELETE' });
                    } else {
                        var kqXoa = await window.sbAdmin.from('don_hang').delete().eq('id', a.dataset.id);
                        if (kqXoa.error) throw new Error(kqXoa.error.message);
                    }
                } catch (loi) { alert('Lỗi xoá: ' + loi.message); }
                taiDonHang();
            });
        });
    }

    /* ---------------- Trang: SẢN PHẨM ---------------- */

    async function laySanPham() {
        // Ưu tiên backend Java
        try {
            var ds = await goiJava('/san-pham?tatCa=true');
            nguonSp = 'java';
            return {
                data: ds.map(function (sp) {
                    return { id: sp.id, ten: sp.ten, gia: sp.gia, gia_chu: sp.giaChu,
                             ton_kho: sp.tonKho, dang_ban: sp.dangBan, danh_muc: null };
                }),
                error: null
            };
        } catch (e) {
            console.warn('[IN3D Store] Backend Java không phản hồi (' + e.message + '), dùng Supabase.');
        }
        nguonSp = 'supabase';
        return await window.sbAdmin
            .from('san_pham')
            .select('id, ten, gia, gia_chu, ton_kho, dang_ban, danh_muc(ten)')
            .order('id');
    }

    async function taiSanPham() {
        var khung = document.getElementById('danh-sach-san-pham');
        khung.innerHTML = '<div class="col-12 p-card text-center">Đang tải sản phẩm...</div>';

        var kq = await laySanPham();

        if (kq.error) { khung.innerHTML = '<div class="col-12 p-card text-center">' + loiHtml(kq.error.message) + '</div>'; return; }

        var demEl = document.getElementById('dem-san-pham');
        if (demEl) demEl.textContent = 'Có ' + kq.data.length + ' sản phẩm (' + (nguonSp === 'java' ? 'Java API' : 'Supabase') + ')';

        khung.innerHTML = kq.data.map(function (sp, i) {
            return '<div class="col-12 p-card' + (i % 2 ? ' bg-100' : '') + '"><div class="row align-items-center">' +
                '<div class="col-md-6">' +
                    '<h5 class="fs-0 mb-1">' + esc(sp.ten) + (sp.dang_ban ? '' : ' <span class="badge bg-secondary">Đang ẩn</span>') + '</h5>' +
                    '<p class="fs--1 mb-0 text-500">' + esc(sp.danh_muc ? sp.danh_muc.ten : 'Chưa phân loại') + '</p>' +
                '</div>' +
                '<div class="col-md-3">' +
                    '<h5 class="fs-0 text-warning mb-1">' + (sp.gia > 0 ? giaVND(sp.gia) : esc(sp.gia_chu || 'Liên hệ')) + '</h5>' +
                    '<p class="fs--1 mb-0">Tồn kho: <strong class="' + (sp.ton_kho > 0 ? 'text-success' : 'text-danger') + '">' + sp.ton_kho + '</strong></p>' +
                '</div>' +
                '<div class="col-md-3 text-md-end mt-2 mt-md-0">' +
                    '<button class="btn btn-sm btn-falcon-default me-1 sua-sp" data-id="' + sp.id + '" data-ten="' + esc(sp.ten) + '" data-gia="' + sp.gia + '" data-ton="' + sp.ton_kho + '" type="button"><span class="fas fa-edit"></span> Sửa</button>' +
                    '<button class="btn btn-sm btn-falcon-' + (sp.dang_ban ? 'warning' : 'success') + ' an-hien-sp" data-id="' + sp.id + '" data-dangban="' + sp.dang_ban + '" type="button">' + (sp.dang_ban ? 'Ẩn' : 'Hiện') + '</button>' +
                '</div>' +
            '</div></div>';
        }).join('');

        khung.querySelectorAll('.sua-sp').forEach(function (nut) {
            nut.addEventListener('click', async function () {
                var giaMoi = prompt('Giá mới (VNĐ, chỉ nhập số) cho "' + nut.dataset.ten + '":', nut.dataset.gia);
                if (giaMoi === null) return;
                var tonMoi = prompt('Tồn kho mới:', nut.dataset.ton);
                if (tonMoi === null) return;
                try {
                    if (nguonSp === 'java') {
                        await goiJava('/san-pham/' + nut.dataset.id, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ gia: parseInt(giaMoi, 10) || 0, tonKho: parseInt(tonMoi, 10) || 0 })
                        });
                    } else {
                        var kqUp = await window.sbAdmin.from('san_pham')
                            .update({ gia: parseInt(giaMoi, 10) || 0, gia_chu: giaVND(parseInt(giaMoi, 10) || 0), ton_kho: parseInt(tonMoi, 10) || 0 })
                            .eq('id', nut.dataset.id);
                        if (kqUp.error) throw new Error(kqUp.error.message + ' (Cần đăng nhập tài khoản admin)');
                    }
                } catch (loi) { alert('Lỗi cập nhật: ' + loi.message); }
                taiSanPham();
            });
        });
        khung.querySelectorAll('.an-hien-sp').forEach(function (nut) {
            nut.addEventListener('click', async function () {
                try {
                    if (nguonSp === 'java') {
                        await goiJava('/san-pham/' + nut.dataset.id, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ dangBan: nut.dataset.dangban !== 'true' })
                        });
                    } else {
                        var kqUp = await window.sbAdmin.from('san_pham')
                            .update({ dang_ban: nut.dataset.dangban !== 'true' })
                            .eq('id', nut.dataset.id);
                        if (kqUp.error) throw new Error(kqUp.error.message + ' (Cần đăng nhập tài khoản admin)');
                    }
                } catch (loi) { alert('Lỗi cập nhật: ' + loi.message); }
                taiSanPham();
            });
        });
    }

    // Thêm sản phẩm mới (gọi từ nút trên trang sản phẩm)
    window.themSanPham = async function () {
        var ten = prompt('Tên sản phẩm mới:');
        if (!ten) return;
        var gia = prompt('Giá bán (VNĐ, chỉ nhập số):', '0');
        if (gia === null) return;
        var ton = prompt('Tồn kho ban đầu:', '0');
        if (ton === null) return;
        var giaSo = parseInt(gia, 10) || 0;
        try {
            if (nguonSp === 'java') {
                await goiJava('/san-pham', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ten: ten, gia: giaSo, giaChu: giaSo > 0 ? giaVND(giaSo) : 'Liên hệ', tonKho: parseInt(ton, 10) || 0, dangBan: true })
                });
            } else {
                var kq = await window.sbAdmin.from('san_pham').insert({
                    ten: ten, gia: giaSo, gia_chu: giaSo > 0 ? giaVND(giaSo) : 'Liên hệ', ton_kho: parseInt(ton, 10) || 0
                });
                if (kq.error) throw new Error(kq.error.message + ' (Cần đăng nhập tài khoản admin)');
            }
        } catch (loi) { alert('Lỗi thêm sản phẩm: ' + loi.message); }
        taiSanPham();
    };

    /* ---------------- Trang: KHÁCH HÀNG ---------------- */

    async function taiKhachHang() {
        var tbody = document.getElementById('table-customers-body');
        tbody.innerHTML = dongThongBao(7, 'Đang tải danh sách người dùng từ Supabase...');

        var kq = await window.sbAdmin
            .from('profiles')
            .select('id, ho_ten, email, so_dien_thoai, dia_chi, vai_tro, created_at')
            .order('created_at', { ascending: false });

        if (kq.error) { tbody.innerHTML = dongThongBao(7, loiHtml(kq.error.message)); return; }
        if (!kq.data.length) { tbody.innerHTML = dongThongBao(7, 'Chưa có người dùng nào đăng ký.'); return; }

        tbody.innerHTML = kq.data.map(function (u) {
            return '<tr class="btn-reveal-trigger">' +
                '<td class="align-middle" style="width:28px"><div class="form-check fs-0 mb-0 d-flex align-items-center"><input class="form-check-input" type="checkbox" /></div></td>' +
                '<td class="name py-2 align-middle white-space-nowrap"><strong>' + esc(u.ho_ten || '(chưa đặt tên)') + '</strong> ' +
                    (u.vai_tro === 'admin' ? '<span class="badge badge-soft-danger">ADMIN</span>' : '<span class="badge badge-soft-info">Khách hàng</span>') + '</td>' +
                '<td class="email py-2 align-middle"><a href="mailto:' + esc(u.email || '') + '">' + esc(u.email || '') + '</a></td>' +
                '<td class="phone py-2 align-middle">' + esc(u.so_dien_thoai || '—') + '</td>' +
                '<td class="address py-2 align-middle">' + esc(u.dia_chi || '—') + '</td>' +
                '<td class="joined py-2 align-middle">' + ngayVN(u.created_at) + '</td>' +
                '<td class="py-2 align-middle"></td>' +
            '</tr>';
        }).join('');
    }

    /* ---------------- Tự chạy theo trang ---------------- */

    function khoiDong() {
        if (!window.sbAdmin) return;
        if (document.getElementById('table-orders-body')) taiDonHang();
        if (document.getElementById('danh-sach-san-pham')) taiSanPham();
        if (document.getElementById('table-customers-body')) taiKhachHang();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', khoiDong);
    } else {
        khoiDong();
    }
})();
