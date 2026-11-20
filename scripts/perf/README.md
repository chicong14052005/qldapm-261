# Công cụ đo mục tiêu hiệu quả O1–O5

Bổ sung 20/11/2026 cho Task 3.5 (Báo cáo kiểm soát chất lượng, mục 4). Các script **chỉ thêm file**,
không sửa code ứng dụng, schema hay migration. Ngưỡng lấy từ ADR-0006 §5 và bảng O1–O5 của báo cáo QA.

> ⚠️ Mọi script (trừ file SQL) **ghi dữ liệu thử vào DB** (đơn, thanh toán, audit) rồi tự dọn: hủy đơn chưa nấu,
> thu tiền ZERO/CASH các đơn đã nấu để trả bàn. Không xóa gì. Nên chạy trên môi trường đo riêng
> (GUIDE/DOCKER.md mục 7) để không lẫn với dữ liệu demo. `o4_billing_check.py` tạm tăng giá 1 món +5.000đ rồi trả lại.
>
> Server giới hạn **10 lần đăng nhập/phút/IP**: chạy các script lần lượt; nếu gặp 429 script tự chờ 61 giây rồi thử lại.

## Chuẩn bị

```powershell
docker compose up -d --build        # app chạy ở http://localhost:3000
git rev-parse --short HEAD           # ghi commit vào báo cáo
```

Script Python dùng standard library (Python ≥ 3.9), dùng chung `Client` của `scripts/smoke.py`.
Biến môi trường như smoke: `BASE_URL` (mặc định `http://127.0.0.1:3000`), `DEMO_PASSWORD`.
Nếu máy không có Python, chạy trong container như smoke:

```powershell
docker run --rm --network restaurant_ordering_default -e BASE_URL=http://gateway -v "${PWD}:/workspace" -w /workspace python:3.12-alpine python scripts/perf/o2_no_duplicate.py
```

Kết quả JSON ghi vào `docs/verification/perf/`.

| Mục tiêu | Lệnh | Đo gì | Kết quả |
|---|---|---|---|
| **O1** gửi bếp ≤ 3 s | xem mục O1 bên dưới (Playwright trong Docker) | Từ lúc server commit (đợt đầu tự duyệt, hoặc duyệt đợt gọi thêm) tới khi thẻ món hiện trên trang `/kitchen` thật; 20 lần, p50/p95/max; kiểm tra đợt chờ duyệt không lọt lên KDS | `o1-kds-latency-result.json`, `o1-kds-cuoi-phien-do.png` |
| **O2** 0 trùng, 0 sai/sót | `python scripts/perf/o2_no_duplicate.py` | Retry cùng Idempotency-Key 10 lần (tạo đơn, gọi thêm), 8 request đồng thời cùng key, dùng lại key với nội dung khác (409), đối chiếu từng dòng gửi ↔ dòng lưu (món, SL, ghi chú, giá) | `o2-no-duplicate-result.json` |
| **O3** chặn món hết, hủy sau nấu có lý do | `python scripts/perf/o3_guards.py` | 3 vòng × (tạo đơn/gọi thêm/duyệt khi món hết, giá sai) và (hủy món PREPARING/READY thiếu lý do 422, lý do rỗng 422, bếp tự hủy 403, hủy toàn đơn sau nấu 409, hủy hợp lệ có lý do trong audit) | `o3-guards-result.json` |
| **O4** khớp tiền | `python scripts/perf/o4_billing_check.py` | 10 hóa đơn mẫu (SL 99, hủy trước/sau nấu, đợt từ chối/rút/duyệt, đổi giá sau khi đặt, tổng 0); tổng kỳ vọng tự tính độc lập so với tổng chốt, biên nhận, tiền thối, lịch sử admin; ca âm sai số tiền/thiếu tiền mặt | `o4-billing-result.json` |
| **O4** thu tiền ≤ 1 phút | `python scripts/perf/o4_billing_check.py --prepare-timing 5` rồi thu ngân thao tác trên UI | Tạo 5 đơn đã phục vụ, chờ thanh toán; người thật bấm giờ | `o4-thu-tien-bam-gio.csv` (điền tay) |
| **O5** tải 30 bàn | `python scripts/perf/o5_load_30_tables.py` (≈ 13 phút) | 30 khách + 10 phục vụ + 7 bếp + 2 thu ngân + 1 quản lý; khởi động 120 s, ổn định 600 s; p95 API, p95 hàng đợi nhân viên, 5xx, 409, thời gian duyệt→hàng đợi bếp | `o5-load-result.json` |
| **O5** ≥ 80% khách tự gọi ≤ 3 phút | theo `docs/verification/perf/o5-uat-kich-ban.md` | UAT ≥ 5 người thật, bấm giờ | `o5-uat-phieu-ghi.csv` (điền tay) |
| O2/O3/O4 toàn DB | `Get-Content scripts/perf/o2_o3_db_checks.sql \| docker compose exec -T postgres psql -U restaurant -d restaurant` | Chỉ SELECT: payment trùng, lượt OPEN trùng, key trùng, đợt trùng nghi vấn, hủy sau nấu thiếu lý do, payment lệch tổng | in ra màn hình (chụp lại làm bằng chứng) |

Thử nhanh O5 trước khi chạy thật: `python scripts/perf/o5_load_30_tables.py --tables 5 --warmup 10 --duration 30`.
O5 cần đủ số bàn trống đang hoạt động (seed có 30 bàn); đóng các lượt đang mở trước khi chạy.

## O1 — Playwright trong Docker (không cần cài Node trên máy)

```powershell
docker run --rm --network restaurant_ordering_default -e BASE_URL=http://gateway -v "${PWD}:/work" -w /work mcr.microsoft.com/playwright:v1.49.1-noble sh -c "npm i --prefix /tmp/pw playwright@1.49.1 >/dev/null && NODE_PATH=/tmp/pw/node_modules node scripts/perf/o1_kds_latency.cjs"
```

Đổi số lần đo bằng `-e RUNS=30`. Nếu máy đã có Node và Playwright: `set BASE_URL=http://127.0.0.1:3000` rồi `node scripts/perf/o1_kds_latency.cjs`.
Lưu ý: KDS hỏi server mỗi 1 giây và dừng khi tab bị ẩn, nên độ trễ lý thuyết nằm trong khoảng 0–1 s + thời gian request/render.

## Cách đọc kết quả

- Mỗi JSON có `result` = `PASS`/`FAIL`, phần `environment` (commit, thời điểm, Python/OS). **Ghi thêm tay** CPU/RAM máy và tài nguyên Docker Desktop vào báo cáo.
- 409 trong O5 là xung đột nghiệp vụ có chủ đích (2 nhân viên cùng thao tác 1 món), đếm riêng, không tính là lỗi server.
- O5 đo "duyệt → hàng đợi bếp" ở mức API; O1 mới là số đo trên giao diện.
- Không suy ra mục tiêu đạt nếu chưa chạy; điền đúng số trong JSON/CSV vào báo cáo.
