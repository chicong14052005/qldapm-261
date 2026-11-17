export type OrderStatus = "SERVING" | "AWAITING_PAYMENT" | "PAID" | "CANCELLED" | string;
export type BatchStatus = "PENDING" | "APPROVED" | "REJECTED" | "WITHDRAWN" | string;
export type OrderItemStatus = "PENDING_APPROVAL" | "PLACED" | "ACCEPTED" | "PREPARING" | "READY" | "SERVED" | "CANCELLED" | string;

export type OrderItem = {
  id: string;
  menuItemId?: string;
  menuCodeSnapshot?: string;
  menuNameSnapshot: string;
  quantity: number;
  unitPriceVnd: number;
  note?: string | null;
  status: OrderItemStatus;
  version: number;
};

export type OrderBatch = {
  id: string;
  sequenceNo: number;
  status: BatchStatus;
  decisionReason?: string | null;
  createdAt?: string;
  version: number;
  items: OrderItem[];
};

export type Order = {
  id: string;
  code: string;
  orderType: "DINE_IN" | "TAKEAWAY" | string;
  tableCode?: string | null;
  pickupCode?: string | null;
  pickupName?: string | null;
  status: OrderStatus;
  subtotalVnd: number;
  pendingVnd: number;
  totalVnd: number | null;
  createdAt: string;
  version: number;
  batches: OrderBatch[];
};

export type CartItem = {
  menuItemId: string;
  name: string;
  quantity: number;
  observedPriceVnd: number;
  note: string;
};

export type KitchenQueueItem = {
  id: string;
  orderId?: string;
  orderCode: string;
  orderType: "DINE_IN" | "TAKEAWAY" | string;
  destination: string;
  sequenceNo: number;
  menuNameSnapshot: string;
  quantity: number;
  note?: string | null;
  status: OrderItemStatus;
  eligibleAt: string;
  version: number;
};

export type ApprovalBatch = {
  id: string;
  orderId?: string;
  orderCode: string;
  destination: string;
  sequenceNo: number;
  status: BatchStatus;
  createdAt: string;
  version: number;
  items: OrderItem[];
};

