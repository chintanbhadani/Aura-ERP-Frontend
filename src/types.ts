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
  roleDetails?: any;
}

export interface Supplier {
  id: string | number;
  name: string;
  contact?: string;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string | number;
  name: string;
  disabled?: boolean;
}

export interface Unit {
  id: string | number;
  name: string;
}

export interface Product {
  id?: string;
  sku: string;
  name: string;
  quantity?: number;
  cost_price?: number;
  selling_price?: number;
  min_stock?: number;
  location?: string;
  status?: string;
  categoryId?: string;
  category?: Category;
  supplierId?: string;
  supplier?: Supplier;
  unitId?: string;
  unit?: Unit;
  fifoPrice?: number;
  fifoValue?: number;
  wacPrice?: number;
  wacValue?: number;
  [key: string]: any;
}

export interface Customer {
  id: string | number;
  name: string;
  contact?: string;
  email?: string;
  customerName?: string;
  companyName?: string;
  phone?: string;
  imageUrl?: string;
  attachments?: any;
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

export type PaymentType = 'CASH' | 'BANK' | 'CREDIT' | 'PARTIAL';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  type: 'PURCHASE' | 'SALES';
  date: string;
  totalAmount: number;
  paymentType?: PaymentType;
  cashAmount?: number;
  bankAmount?: number;
  creditAmount?: number;
  customerId?: string | null;
  supplierId?: string | null;
  items?: InvoiceItem[];
  customer?: Customer;
  client?: any;
  supplier?: any;
  status?: string;
  createdAt: string;
  updatedAt: string;
}
