# Kịch bản UAT O5 — khách tự gọi món qua QR

Mục tiêu O5 (vế usability): **≥ 80% khách mới (ít nhất 4/5 người) tự quét QR và gửi được đợt món đầu tiên trong ≤ 3 phút**, không cần nhân viên thao tác hộ. Ngưỡng lấy từ ADR-0006 §5.

Phần này **phải làm với người thật**; không script nào thay thế được. Ghi kết quả vào `o5-uat-phieu-ghi.csv` ngay trong buổi thử, không điền lại sau.

## Chuẩn bị (người điều phối)

1. Chạy hệ thống: `docker compose up -d --build`. Ghi lại commit đang chạy (`git rev-parse --short HEAD`).
2. Chọn ≥ 5 người **chưa từng dùng hệ thống** (bạn cùng lớp ngoài nhóm, người thân...). Ghi mã P1–P5, không ghi họ tên đầy đủ nếu không cần.
3. Đăng nhập `waiter`, mở lượt cho một bàn trống, bấm **Xem QR & link**, hiển thị ảnh QR trên màn hình thứ hai hoặc in ra.
4. Điện thoại của người thử phải truy cập được máy chạy demo. Vì gateway chỉ bind `127.0.0.1`, cách đơn giản nhất là cho người thử dùng **trình duyệt trên chính máy demo** (cửa sổ ẩn danh, F12 → Ctrl+Shift+M để giả lập điện thoại) và mở link QR; ghi rõ cách này trong cột "Thiết bị". Nếu muốn dùng điện thoại thật, cần đổi cấu hình bind cổng trên máy demo (ngoài phạm vi kịch bản này).
5. Chuẩn bị đồng hồ bấm giờ; người điều phối **không** hướng dẫn thao tác, chỉ trả lời khi người thử hỏi và ghi lại số lần hỏi.

## Nhiệm vụ giao cho người thử (đọc nguyên văn)

> "Bạn vừa ngồi vào bàn ở nhà hàng. Hãy dùng mã QR trên bàn để gọi 2 món bất kỳ, trong đó một món ghi chú 'ít cay', rồi gửi cho bếp. Khi bạn nghĩ đã gửi xong thì báo tôi."

## Cách bấm giờ

- **Bắt đầu:** lúc người thử bắt đầu quét QR / mở link.
- **Kết thúc:** lúc màn hình hiện đợt đầu đã gửi (món ở trạng thái đã vào bếp). Người điều phối xác nhận thêm trên màn hình KDS (tài khoản `kitchen`).
- Quá 3 phút thì vẫn để người thử làm tiếp tới khi xong hoặc bỏ cuộc, nhưng đánh dấu "Không" ở cột Đạt.

## Sau mỗi người

1. Hỏi 1 câu: "Bước nào khiến bạn lúng túng nhất?" và ghi vào cột Khó khăn.
2. Hỏi mức hài lòng 1–5.
3. Thu ngân/quản lý hủy đơn thử hoặc hoàn tất thanh toán, đóng lượt; mở lượt mới cho người kế tiếp.

## Tổng hợp

- Tỷ lệ đạt = số người có thời gian ≤ 180 giây **và** tự làm không cần trợ giúp ÷ tổng số người.
- O5 (usability) **Đạt** khi tỷ lệ ≥ 80% với ít nhất 5 người.
- Đưa bảng tổng hợp + các khó khăn lặp lại vào mục 4 báo cáo QA; khó khăn nghiêm trọng mở thành lỗi/việc cần làm.
