export type TableVisit = {
  id?: string;
  orderId: string;
  partySize: number;
};

export type Table = {
  id: string;
  code: string;
  capacity: number;
  isActive: boolean;
  version: number;
  visit?: TableVisit | null;
};

export type TableQr = {
  id: string;
  code: string;
  version: number;
  qrToken: string;
  qrPath: string;
  qrUrl: string;
};

export type TableQrPublicInfo = {
  tableId?: string;
  tableCode?: string;
  hasActiveVisit?: boolean;
};

