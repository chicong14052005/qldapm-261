export type ItemsResponse<T> = {
  items: T[];
};

export type PaginatedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type PendingRequest = {
  path: string;
  body: unknown;
  method: string;
  key: string;
  guest: boolean;
};

export type FormField = {
  name: string;
  label: string;
  type?: string;
  value?: string | number;
  options?: string[];
  required?: boolean;
};

export type FormConfig = {
  title: string;
  description?: string;
  fields: FormField[];
  submit: (values: Record<string, string>) => Promise<void>;
};

