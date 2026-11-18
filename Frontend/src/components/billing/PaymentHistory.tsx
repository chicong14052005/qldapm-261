"use client";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { api, labels, money } from "@/lib/api";
import { dateTime } from "@/lib/date-time";
import { paymentMethodNames } from "@/config/status";
import Pagination from "@/components/common/Pagination";
import type {
  PaymentFilters,
  PaymentHistoryPage,
  PaymentRecipient,
} from "@/types/payment";
import styles from "./PaymentHistory.module.css";

const emptyFilters: PaymentFilters = {
  search: "",
  fromDate: "",
  toDate: "",
  method: "",
  orderType: "",
  receivedByStaffId: "",
};

function Receiver({ value }: { value: PaymentRecipient }) {
  return (
    <div className="history-receiver">
      <strong>{value.displayName ?? "Chưa ghi nhận tên"}</strong>
      <small>{value.username ?? value.staffId}</small>
      {!value.snapshotAvailable && (
        <small className="history-legacy">
          Dữ liệu dev cũ, chưa lưu tên lúc nhận
        </small>
      )}
    </div>
  );
}

export default function PaymentHistory({
  refreshToken,
}: {
  refreshToken: number;
}) {
  const [draft, setDraft] = useState<PaymentFilters>(emptyFilters);
  const [filters, setFilters] = useState<PaymentFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<PaymentHistoryPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [detailError, setDetailError] = useState("");

  useEffect(() => {
    let active = true;
    api("/staff")
      .then((data) => {
        if (active) setStaff(data.items);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    const params = new URLSearchParams({
      page: String(page),
      pageSize: "20",
    });
    Object.entries(filters).forEach(([name, value]) => {
      if (value) params.set(name, value);
    });
    api<PaymentHistoryPage>("/admin/payments?" + params.toString())
      .then((data) => {
        if (active) setResult(data);
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          setResult(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, page, refreshToken]);

  useEffect(() => {
    if (!selectedId) return;
    let active = true;
    setDetail(null);
    setDetailError("");
    api("/admin/payments/" + selectedId)
      .then((data) => {
        if (active) setDetail(data);
      })
      .catch((e) => {
        if (active) setDetailError(e.message);
      });
    return () => {
      active = false;
    };
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [selectedId]);

  const field = (name: keyof PaymentFilters, value: string) =>
    setDraft((old) => ({ ...old, [name]: value }));

  return (
    <section
      className="payment-history"
      aria-label="Lịch sử thanh toán của admin"
    >
      <p className="muted">
        Tra cứu toàn bộ đơn đã thanh toán. Thời gian và bộ lọc ngày theo giờ
        Việt Nam (UTC+07:00).
      </p>
      <form
        className={`history-filters panel ${styles.filters}`}
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setFilters({ ...draft });
        }}
      >
        <label className="history-search">
          Tìm đơn, biên nhận, bàn hoặc người nhận
          <input
            value={draft.search}
            onChange={(e) => field("search", e.target.value)}
            maxLength={120}
            placeholder="VD: DH-..., BN-..., B01, tên thu ngân"
          />
        </label>
        <label>
          Từ ngày
          <input
            type="date"
            value={draft.fromDate}
            onChange={(e) => field("fromDate", e.target.value)}
          />
        </label>
        <label>
          Đến hết ngày
          <input
            type="date"
            value={draft.toDate}
            onChange={(e) => field("toDate", e.target.value)}
          />
        </label>
        <label>
          Phương thức
          <select
            value={draft.method}
            onChange={(e) => field("method", e.target.value)}
          >
            <option value="">Tất cả</option>
            {Object.entries(paymentMethodNames).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Loại đơn
          <select
            value={draft.orderType}
            onChange={(e) => field("orderType", e.target.value)}
          >
            <option value="">Tất cả</option>
            <option value="DINE_IN">Tại bàn</option>
            <option value="TAKEAWAY">Mang về</option>
          </select>
        </label>
        <label>
          Người nhận tiền
          <select
            value={draft.receivedByStaffId}
            onChange={(e) => field("receivedByStaffId", e.target.value)}
          >
            <option value="">Tất cả nhân viên</option>
            {staff.map((u) => (
              <option key={u.id} value={u.id}>
                {u.displayName} ({u.username}){u.isActive ? "" : " · Đã khóa"}
              </option>
            ))}
          </select>
        </label>
        <div className="history-filter-actions">
          <button className="primary" disabled={loading}>
            Áp dụng bộ lọc
          </button>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setDraft({ ...emptyFilters });
              setFilters({ ...emptyFilters });
              setPage(1);
            }}
          >
            Xóa bộ lọc
          </button>
        </div>
      </form>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <div className="section-bar">
        <h2>
          Đơn đã thanh toán <small>{result?.totalCount ?? 0} kết quả</small>
        </h2>
        <span className="muted">
          {loading ? "Đang tải…" : "Xếp theo thời điểm thanh toán mới nhất"}
        </span>
      </div>
      <div className="table-wrap">
        <table className="history-table">
          <thead>
            <tr>
              <th>Đơn / Biên nhận</th>
              <th>Bàn / Mang về</th>
              <th>Thời điểm thanh toán</th>
              <th>Người nhận tiền</th>
              <th>Phương thức</th>
              <th>Số tiền</th>
              <th>Chi tiết</th>
            </tr>
          </thead>
          <tbody>
            {result?.items.map((row) => (
              <tr key={row.paymentId}>
                <td>
                  <strong>{row.orderCode}</strong>
                  <small>{row.receiptNo}</small>
                </td>
                <td>
                  <strong>{row.tableCode ?? row.pickupCode}</strong>
                  <small>
                    {row.orderType === "DINE_IN" ? "Tại bàn" : "Mang về"}
                    {row.pickupName ? " · " + row.pickupName : ""}
                  </small>
                </td>
                <td>
                  <time dateTime={row.paidAt}>{dateTime(row.paidAt)}</time>
                  <small>UTC+07:00</small>
                </td>
                <td>
                  <Receiver value={row.receivedBy} />
                </td>
                <td>{paymentMethodNames[row.method] ?? row.method}</td>
                <td className="history-amount">{money(row.amountVnd)}</td>
                <td>
                  <button
                    className="secondary"
                    aria-label={"Xem đơn " + row.orderCode}
                    onClick={() => setSelectedId(row.paymentId)}
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
            {!loading && result?.items.length === 0 && (
              <tr>
                <td colSpan={7} className="history-empty">
                  Không có đơn đã thanh toán phù hợp với bộ lọc.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {result && (
        <Pagination
          page={result.page}
          totalPages={result.totalPages}
          totalCount={result.totalCount}
          loading={loading}
          onPrev={() => setPage((v) => v - 1)}
          onNext={() => setPage((v) => v + 1)}
        />
      )}
      {selectedId && (
        <div className="modal-backdrop" onClick={() => setSelectedId(null)}>
          <section
            className={`modal payment-history-detail ${styles.detailModal}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-history-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-bar">
              <div>
                <span className="eyebrow">LỊCH SỬ THANH TOÁN · CHỈ ĐỌC</span>
                <h2 id="payment-history-title">
                  {detail?.order.code ?? "Đang tải đơn…"}
                </h2>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Đóng chi tiết thanh toán"
                onClick={() => setSelectedId(null)}
              >
                <X size={20} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            {detailError && (
              <div className="alert error" role="alert">
                {detailError}
              </div>
            )}
            {detail && (
              <>
                <div className="history-detail-grid">
                  <div>
                    <small>Biên nhận</small>
                    <strong>{detail.receiptNo}</strong>
                  </div>
                  <div>
                    <small>Thanh toán lúc (UTC+07:00)</small>
                    <strong>{dateTime(detail.paidAt)}</strong>
                  </div>
                  <div>
                    <small>Người nhận thanh toán lúc ghi nhận</small>
                    <Receiver value={detail.receivedBy} />
                    <small>ID: {detail.receivedBy.staffId}</small>
                  </div>
                  <div>
                    <small>Bàn / Mã mang về</small>
                    <strong>
                      {detail.order.tableCode ?? detail.order.pickupCode}
                    </strong>
                    <span>{detail.order.pickupName}</span>
                  </div>
                  <div>
                    <small>Đơn tạo lúc</small>
                    <strong>{dateTime(detail.order.createdAt)}</strong>
                  </div>
                  <div>
                    <small>Phương thức</small>
                    <strong>
                      {paymentMethodNames[detail.method] ?? detail.method}
                    </strong>
                  </div>
                </div>
                {detail.transferReference && (
                  <p className="note">
                    Mã/nội dung chuyển khoản: {detail.transferReference}
                  </p>
                )}
                <h3>Toàn bộ các đợt gọi món</h3>
                <p className="muted">
                  Giữ cả món hủy, đợt từ chối/rút và ghi chú. Các dòng này không
                  được tính vào tiền nếu không SERVED.
                </p>
                {detail.order.batches.map((batch: any) => (
                  <section className="history-batch" key={batch.id}>
                    <div className="batch-heading">
                      <strong>
                        Đợt {batch.sequenceNo} · {dateTime(batch.createdAt)}
                      </strong>
                      <span className={"badge " + batch.status.toLowerCase()}>
                        {labels[batch.status] ?? batch.status}
                      </span>
                    </div>
                    {batch.decisionReason && (
                      <p className="reason">Lý do: {batch.decisionReason}</p>
                    )}
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Món</th>
                            <th>SL</th>
                            <th>Đơn giá lúc gọi</th>
                            <th>Trạng thái</th>
                            <th>Tính tiền</th>
                          </tr>
                        </thead>
                        <tbody>
                          {batch.items.map((item: any) => (
                            <tr key={item.id}>
                              <td>
                                <strong>{item.menuNameSnapshot}</strong>
                                <small>{item.menuCodeSnapshot}</small>
                                {item.note && (
                                  <small>Ghi chú: {item.note}</small>
                                )}
                              </td>
                              <td>{item.quantity}</td>
                              <td>{money(item.unitPriceVnd)}</td>
                              <td>
                                <span
                                  className={
                                    "badge " + item.status.toLowerCase()
                                  }
                                >
                                  {labels[item.status] ?? item.status}
                                </span>
                              </td>
                              <td>
                                {item.status === "SERVED"
                                  ? money(item.quantity * item.unitPriceVnd)
                                  : "Không tính"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                ))}
                <div className="history-payment-totals">
                  <div>
                    <span>Tổng đã thanh toán</span>
                    <strong>{money(detail.amountVnd)}</strong>
                  </div>
                  {detail.tenderedVnd != null && (
                    <>
                      <div>
                        <span>Tiền khách đưa</span>
                        <strong>{money(detail.tenderedVnd)}</strong>
                      </div>
                      <div>
                        <span>Tiền trả lại</span>
                        <strong>{money(detail.changeVnd)}</strong>
                      </div>
                    </>
                  )}
                </div>
                <p className="muted">
                  Thông tin thanh toán và đơn đã chốt được lưu bền vững. Đổi tên
                  hoặc khóa tài khoản nhân viên không sửa thông tin người nhận
                  đã lưu.
                </p>
              </>
            )}
          </section>
        </div>
      )}
    </section>
  );
}

