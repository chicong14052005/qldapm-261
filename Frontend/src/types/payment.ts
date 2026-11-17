import type { Order } from "./order";

export type PaymentRecipient = {
  staffId: string;
  username: string | null;
  displayName: string | null;
  snapshotAvailable: boolean;
};

export type PaymentRow = {
  paymentId: string;
  orderId: string;
  orderCode: string;
  orderType: string;
  tableCode: string | null;
  pickupCode: string | null;
  pickupName: string | null;
  receiptNo: string;
  method: string;
  amountVnd: number;
  tenderedVnd: number | null;
  changeVnd: number | null;
  transferReference: string | null;
  paidAt: string;
  receivedBy: PaymentRecipient;
};

export type PaymentHistoryPage = {
  items: PaymentRow[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type PaymentFilters = {
  search: string;
  fromDate: string;
  toDate: string;
  method: string;
  orderType: string;
  receivedByStaffId: string;
};

export type Receipt = {
  paymentId?: string;
  receiptNo: string;
  method: string;
  amountVnd: number;
  tenderedVnd?: number | null;
  changeVnd?: number | null;
  transferReference?: string | null;
  paidAt: string;
  receivedBy?: PaymentRecipient | null;
  order: Order;
};

