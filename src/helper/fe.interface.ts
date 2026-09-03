import type { AxiosError } from 'axios';
import type { FormikProps } from 'formik';

export interface User {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export interface BaseState {
  token: string | null;
  user: User | null;
}

export type ProductType = {
  id: number;
  productName: string;
  category: string;
  stock: boolean;
  sku: number;
  price: string;
  qty: number;
  status: string;
  image: string;
  productBrand: string;
};

export type InventoryItem = {
  asin: string;
  sellerSku: string;
  productName: string;
  quantity: number;
  sellingPrice: number;
  productCost: number;
  profit: number;
  fulfillmentType: string;
  status: string;
  condition: string;
  updatedAt: string;
  imageUrl?: string;
  amazonCreatedAt?: string;
  orderCount: number;
  returnCount: number;
  shippingCharge: number;
  amazonFee: number;
  returnShippingCharge: number;
  totalNumberOrder: number;
  minPrice?: number;
  maxPrice?: number;
};


export type AxiosCustomError = AxiosError<{ message: string }>;

export interface IProduct {
  id: number;
  productName: string;
  category: string;
  stock: boolean;
  sku: number;
  price: string;
  qty: number;
  status: string;
  image: string;
  productBrand: string;
}
export interface IChemicalType {
  id: number;
  label?: string;
  value: string;
}

export interface IOutlineTextField<T> extends Partial<FormikProps<T>> {
  label?: string;
  name: keyof T | string; // Use generic type T for form field names
  type: string;
  disabled?: boolean;
  sx?: any;
  onChange?: (val: string) => void;
}

export type Chemical = {
  id: number;
  chemicalInitiationNo: string;
  chemicalName: string;
  batchNumber: string;
  totalQuantity: number;
  remainingQuantity: number;
  status: string;
  image: string;
  chemicalType: string;
  expiryDate: string; // You can use `Date` if it's parsed to a Date object
  manufacturer: string;
  storageCondition: string;
  hazardLevel: string;
};
