export type Category = {
  id: string;
  code: string;
  name: string;
  sortOrder?: number;
  isActive?: boolean;
};

export type MenuItem = {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  priceVnd: number;
  description: string;
  imageUrl: string;
  isAvailable: boolean;
  isActive: boolean;
  version: number;
};

export type MenuData = {
  items: MenuItem[];
  categories: Category[];
};

