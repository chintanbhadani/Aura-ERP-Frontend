import dataService from '../axios/dataService';
import type { User } from '../types';

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
  location: string;
  status: 'Active' | 'Inactive';
}

export const fetchInventory = async (search?: string): Promise<Product[]> => {
  const url = search ? `/inventory?search=${encodeURIComponent(search)}` : '/inventory';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchCategories = async (): Promise<Category[]> => {
  const response = await dataService.get('/categories');
  return response.data;
};

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const response = await dataService.get('/suppliers');
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
