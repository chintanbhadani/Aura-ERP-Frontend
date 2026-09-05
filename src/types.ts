export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
  username?: string;
}

export interface BaseState {
  token: string | null;
  user: User | null;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
}

export interface Category {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
}

export interface Product {
  id?: string;
  sku: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  min_stock?: number;
  location?: string;
  status?: string;
  categoryId: string;
  supplierId: string;
  unitId?: string;
}

export interface Customer {
  id: string;
  name: string;
  contact?: string;
  email?: string;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  product?: any; // To hold related product info
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'PURCHASE' | 'SALES';
  date: string;
  totalAmount: number;
  customerId?: string | null;
  supplierId?: string | null;
  items?: InvoiceItem[];
  customer?: Customer;
  supplier?: any;
  createdAt: string;
  updatedAt: string;
}
