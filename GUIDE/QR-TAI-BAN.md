# QR cố định và gọi món tại bàn

## Nhân viên

1. Đăng nhập waiter/manager/admin, vào **Bàn & lượt khách**.
2. Bấm **Xem QR & link** trên bàn. Hộp thoại có ảnh QR, URL đầy đủ, nút Sao chép URL, Mở link gốc, Tải ảnh QR.
3. Dùng cùng QR đó cho các lượt khách sau; xem hoặc tải lại không đổi mã. Không cần bấm Thay mã QR mỗi lượt.
4. Trước khi khách gọi, mở lượt trên bàn và nhập số khách. Thực khách đầu tiên tại bàn quét hoặc mở link sẽ giữ phiên duy nhất của lượt đó, không cần nhập mã.
5. Nếu thực khách giữ phiên làm mất trình duyệt/hết pin hoặc cần nhường máy khác trong bàn quét lại (mà chưa bấm **Thoát**), nhân viên (`WAITER`/`MANAGER`/`ADMIN`) bấm **Mở khóa QR** ngay trên thẻ bàn để thu hồi phiên cũ mà vẫn giữ nguyên toàn bộ đơn và món đã gọi.
6. Nhân viên cũng có thể mở chi tiết đơn để gọi hộ. Gọi thêm vẫn cần duyệt như bình thường.

## Thử vai khách trên cùng PC

- Sao chép URL bàn, mở trong cửa sổ ẩn danh/profile khác. Nếu dùng cùng browser có cookie nhân viên, QR page vẫn gọi API khách với `X-Actor: guest`; profile riêng giúp bạn dễ phân biệt vai.
- Chưa mở lượt: trang báo liên hệ nhân viên, không tự tạo lượt/order.
- Đã mở lượt (chưa ai quét hoặc sau khi mở khóa): thiết bị đầu tiên tự vào menu và đơn hiện tại.
- Đã có thiết bị khác đang giữ phiên: thiết bị thứ 2 quét cùng QR sẽ bị chặn (`409 TABLE_QR_CLAIMED`) nhằm ngăn người ngoài bàn quét chèn gọi món ngoài tầm kiểm soát. Muốn đổi sang thiết bị thứ 2, thiết bị thứ 1 bấm **Thoát** hoặc nhân viên bấm **Mở khóa QR** trên thẻ bàn.
- Đã thanh toán/hủy lượt: cookie cũ hết quyền. Chỉ khi nhân viên mở lượt mới thì thực khách tiếp theo mới quét cùng QR để tham gia lượt mới; không đọc được đơn lượt trước.

## Sao chép và tải ảnh

Input URL tự chọn toàn bộ nội dung khi focus. Nút Sao chép URL copy đúng chuỗi được mã hóa trong ảnh QR. Nếu clipboard không khả dụng, ứng dụng focus/chọn sẵn URL để bạn nhấn Ctrl+C. Tải ảnh QR lưu PNG; giữ đủ khoảng trắng quanh mã khi in để camera đọc được.

QR được sinh ngay trong trình duyệt, không gửi link tới website tạo QR bên ngoài. Mã chỉ đổi khi manager/admin chọn **Thay mã QR** và xác nhận; ảnh/link đã in trước đó sẽ hết tác dụng với khách mới, cần in/chia sẻ lại.

## Lưu ý localhost và dữ liệu cũ

URL mặc định là `http://localhost:3000/qr/...`: dùng trên chính PC đang chạy dự án. Điện thoại quét ảnh đó sẽ hiểu localhost là điện thoại, nên chưa truy cập được PC. Hiện chủ dự án chọn demo trên PC và Device Toolbar; khi chuyển LAN/Internet cần đổi `PublicOrigin` và cấu hình bind/HTTPS phù hợp trước khi in QR. Không tự thay URL theo IP đoán.

Lần nâng cấp từ bản có mã 8 chữ số: hệ thống cấp lại QR một lần cho những bàn cũ vì trước đó chỉ lưu hash. Sau nâng cấp, xem và tải QR mới trong hộp thoại; các lần restart/seed sau giữ nguyên mã. Backup DB cùng keyring `auth_keys` để mở lại được QR sau restore. Không cần xóa DB hoặc image để nâng cấp.
