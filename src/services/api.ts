import dataService from '../axios/dataService';
import type { User } from '../types';

export const buildQueryParams = (search?: string, status?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status && status !== 'ALL') params.append('status', status);
  return params.toString() ? '?' + params.toString() : '';
};


export const loginApi = async (credentials: any): Promise<{ user: User; token: string }> => {
  const response = await dataService.post('/auth/login', credentials);
  return response.data;
};

export const signupApi = async (data: any): Promise<{ user: User; token: string }> => {
  const response = await dataService.post('/auth/signup', data);
  return response.data;
};

export const fetchUserProfile = async (): Promise<User> => {
  const response = await dataService.get('/auth/me');
  return response.data;
};

export interface Category {
  id: string;
  name: string;
}

export interface Unit {
  id: string;
  name: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact?: string;
  email?: string;
}

export interface Product {
  id?: string;
  sku: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  categoryId: string;
  category?: Category;
  supplierId: string;
  supplier?: Supplier;
  unitId?: string;
  unit?: Unit;
  location: string;
  status: 'Active' | 'Inactive';
  wacPrice?: number;
  wacValue?: number;
  fifoPrice?: number;
  fifoValue?: number;
}

export const fetchInventory = async (search?: string, stockFilter?: string): Promise<Product[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (stockFilter && stockFilter !== 'all') params.append('stockFilter', stockFilter);
  
  const url = `/inventory${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await dataService.get(url);
  return response.data;
};

export const fetchProducts = async (search?: string): Promise<Product[]> => {
  const url = search ? `/products?search=${encodeURIComponent(search)}` : '/products';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchInventoryById = async (id: string): Promise<Product> => {
  const response = await dataService.get(`/inventory/${id}`);
  return response.data;
};

export const fetchCategories = async (search?: string, status?: string): Promise<Category[]> => {
  const response = await dataService.get(`/categories${buildQueryParams(search, status)}`);
  return response.data;
};

export const createCategory = async (data: { name: string }): Promise<Category> => {
  const response = await dataService.post('/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: { name?: string; status?: string }): Promise<Category> => {
  const response = await dataService.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await dataService.delete(`/categories/${id}`);
};

export const bulkUploadCategories = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/categories/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const fetchUnits = async (search?: string, status?: string): Promise<Unit[]> => {
  const response = await dataService.get(`/units${buildQueryParams(search, status)}`);
  return response.data;
};

export const createUnit = async (data: { name: string }): Promise<Unit> => {
  const response = await dataService.post('/units', data);
  return response.data;
};

export const updateUnit = async (id: string, data: { name?: string; status?: string }): Promise<Unit> => {
  const response = await dataService.put(`/units/${id}`, data);
  return response.data;
};

export const deleteUnit = async (id: string): Promise<void> => {
  await dataService.delete(`/units/${id}`);
};

export const bulkUploadUnits = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/units/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const fetchSuppliers = async (search?: string, status?: string): Promise<Supplier[]> => {
  const response = await dataService.get(`/suppliers${buildQueryParams(search, status)}`);
  return response.data;
};

export const createSupplier = async (data: { name: string; contact?: string; email?: string }): Promise<Supplier> => {
  const response = await dataService.post('/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id: string, data: { name?: string; contact?: string; email?: string; status?: string }): Promise<Supplier> => {
  const response = await dataService.put(`/suppliers/${id}`, data);
  return response.data;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await dataService.delete(`/suppliers/${id}`);
};

export const bulkUploadSuppliers = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/suppliers/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const createProduct = async (product: Product): Promise<Product> => {
  const response = await dataService.post('/inventory', product);
  return response.data;
};

export const updateProduct = async (id: string, product: Product): Promise<Product> => {
  const response = await dataService.put(`/inventory/${id}`, product);
  return response.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await dataService.delete(`/inventory/${id}`);
};

export const fetchCustomers = async (search?: string, status?: string): Promise<any[]> => {
  const response = await dataService.get(`/customers${buildQueryParams(search, status)}`);
  return response.data;
};

export const createCustomer = async (data: { name: string; contact?: string; email?: string }): Promise<any> => {
  const response = await dataService.post('/customers', data);
  return response.data;
};

export const updateCustomer = async (id: string, data: { name?: string; contact?: string; email?: string; status?: string }): Promise<any> => {
  const response = await dataService.put(`/customers/${id}`, data);
  return response.data;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await dataService.delete(`/customers/${id}`);
};

export const bulkUploadCustomers = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/customers/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const fetchInvoices = async (search?: string, type?: string): Promise<any[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (type && type !== 'ALL') params.append('type', type);
  
  const url = `/invoices${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await dataService.get(url);
  return response.data;
};

export const createInvoice = async (data: any): Promise<any> => {
  const response = await dataService.post('/invoices', data);
  return response.data;
};

export const bulkUploadInventory = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/inventory/bulk-upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export interface SkuMaster {
  id: string;
  name: string;
  sku: string;
  categoryId?: string | null;
  category?: Category | null;
  status?: string;
}

export const fetchSkus = async (search?: string, status?: string): Promise<SkuMaster[]> => {
  const response = await dataService.get(`/skus${buildQueryParams(search, status)}`);
  return response.data;
};

export const createSku = async (data: Partial<SkuMaster>): Promise<SkuMaster> => {
  const response = await dataService.post("/skus", data);
  return response.data;
};

export const updateSku = async (id: string, data: Partial<SkuMaster>): Promise<SkuMaster> => {
  const response = await dataService.put(`/skus/${id}`, data);
  return response.data;
};

export const deleteSku = async (id: string): Promise<void> => {
  await dataService.delete(`/skus/${id}`);
};

export const bulkUploadSkus = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/skus/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  paymentType?: 'CASH' | 'BANK' | 'CREDIT' | 'PARTIAL';
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseDescriptionOption {
  id: string;
  description: string;
  name: string;
}

export const fetchExpenses = async (search?: string): Promise<Expense[]> => {
  const url = search ? `/expenses?search=${encodeURIComponent(search)}` : '/expenses';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchExpenseDescriptions = async (): Promise<ExpenseDescriptionOption[]> => {
  const response = await dataService.get('/expenses/descriptions');
  return response.data;
};

export const createExpenseDescription = async (description: string): Promise<ExpenseDescriptionOption> => {
  const response = await dataService.post('/expenses/descriptions', { description });
  return response.data;
};

export const createExpense = async (data: { date?: string; description: string; amount: number; notes?: string }): Promise<Expense> => {
  const response = await dataService.post('/expenses', data);
  return response.data;
};

export const updateExpense = async (id: string, data: { date?: string; description: string; amount: number; notes?: string }): Promise<Expense> => {
  const response = await dataService.put(`/expenses/${id}`, data);
  return response.data;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await dataService.delete(`/expenses/${id}`);
};

export const fetchDailyCashFlow = async (startDate?: string, endDate?: string): Promise<any[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = `/reports/daily-cash-flow${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await dataService.get(url);
  return response.data;
};

