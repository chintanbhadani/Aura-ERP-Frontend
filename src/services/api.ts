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
  disabled?: boolean;
  status?: string;
}

export interface Unit {
  id: string | number;
  name: string;
  disabled?: boolean;
  status?: string;
}

export interface Supplier {
  id: string | number;
  name: string;
  contact?: string;
  email?: string;
  status?: string;
  supplierGroup?: string;
  country?: string;
  supplierType?: string;
  isTransporter?: boolean;
  contactPersonName?: string;
  billingCurrency?: string;
  priceList?: string;
  bankAccount?: string;
  trackExchangeDifferences?: boolean;
  taxId?: string;
  vrnNo?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  website?: string;
  payableAccount?: string;
  paymentTerms?: string;
  creditLimit?: number;
  disabled?: boolean;
  assignedTo?: string;
  tags?: string;
  kycDocs?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface Product {
  id?: string;
  sku: string;
  name: string;
  quantity: number;
  cost_price: number;
  selling_price: number;
  min_stock?: number;
  categoryId?: string;
  category?: Category;
  supplierId?: string;
  supplier?: Supplier;
  unitId?: string;
  unit?: Unit;
  location?: string;
  status?: 'Active' | 'Inactive' | string;
  fifoPrice?: number;
  fifoValue?: number;
  wacPrice?: number;
  wacValue?: number;
  assignedTo?: string;
  tags?: string;
  imageUrl?: string;
  attachments?: any;
  company?: string;
  partOf?: string;
  subPartOf?: string;
  itemGroup?: string;
  uom?: string;
  tansadNo?: string;
  withholdingTaxPurchase?: number;
  withholdingTaxSales?: number;
  activityType?: string;
  createdAt?: string;
  updatedAt?: string;
  disabled?: boolean;
  allowAlternativeItem?: boolean;
  maintainStock?: boolean;
  excisableItem?: boolean;
  hasVariants?: boolean;
  includeInManufacturing?: boolean;
  isFixedAsset?: boolean;
  valuationRate?: number;
  overDeliveryAllowance?: number;
  overBillingAllowance?: number;
  incomeAccount?: string;
  expenseAccount?: string;
  hsnCode?: string;
  taxRate?: number;
  invoiceDate?: string | Date;
  rollLength?: number;
  rollWidth?: number;
  rollCoreLength?: number;
  rollCoreDiameter?: number;
  rollDiaSize?: number;
  rollSurface?: string;
  rollWeight?: number;
  rollJoint?: string;
}

export const fetchInventory = async (paramsOrSearch?: string | Record<string, any>, stockFilter?: string): Promise<Product[]> => {
  let queryParams: Record<string, any> = {};
  if (typeof paramsOrSearch === 'string') {
    if (paramsOrSearch) queryParams.search = paramsOrSearch;
    if (stockFilter && stockFilter !== 'all') queryParams.stockFilter = stockFilter;
  } else if (paramsOrSearch && typeof paramsOrSearch === 'object') {
    queryParams = { ...paramsOrSearch };
  }

  const response = await dataService.get('/products', { params: queryParams });
  return response.data;
};

export const fetchInventoryById = async (id: string): Promise<Product> => {
  const response = await dataService.get(`/products/${id}`);
  return response.data;
};

export const fetchProducts = async (search?: string): Promise<Product[]> => {
  const url = search ? `/products?search=${encodeURIComponent(search)}` : '/products';
  const response = await dataService.get(url);
  return response.data;
};

export interface BinReportItem {
  id: string;
  itemCode: string;
  itemName: string;
  itemGroup: string;
  partOf: string;
  subPartOf: string;
  uom: string;
  actualQuantity: number;
  warehouse: string;
  assignedTo?: string;
  tags?: string;
}

export const fetchBinReport = async (params?: Record<string, any>): Promise<BinReportItem[]> => {
  const response = await dataService.get('/products/bin-report', { params });
  return response.data;
};

export const fetchCategories = async (search?: string, status?: string): Promise<Category[]> => {
  const params: Record<string, any> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await dataService.get('/categories', { params: Object.keys(params).length ? params : undefined });
  return response.data;
};

export const fetchCategoryById = async (id: string): Promise<Category> => {
  const response = await dataService.get(`/categories/${id}`);
  return response.data;
};

export const createCategory = async (data: { name: string; disabled?: boolean; status?: string }): Promise<Category> => {
  const response = await dataService.post('/categories', data);
  return response.data;
};

export const updateCategory = async (id: string, data: { name?: string; disabled?: boolean; status?: string }): Promise<Category> => {
  const response = await dataService.put(`/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await dataService.delete(`/categories/${id}`);
};

export const bulkImportCategories = async (items: any[]): Promise<any> => {
  const response = await dataService.post('/categories/bulk-import', { items });
  return response.data;
};

export const bulkUploadCategories = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/categories/bulk-upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export const fetchUnits = async (search?: string, status?: string): Promise<Unit[]> => {
  const params: Record<string, any> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await dataService.get('/units', { params: Object.keys(params).length ? params : undefined });
  return response.data;
};

export const fetchUnitById = async (id: string): Promise<Unit> => {
  const response = await dataService.get(`/units/${id}`);
  return response.data;
};

export const createUnit = async (data: { name: string; disabled?: boolean; status?: string }): Promise<Unit> => {
  const response = await dataService.post('/units', data);
  return response.data;
};

export const updateUnit = async (id: string, data: { name?: string; disabled?: boolean; status?: string }): Promise<Unit> => {
  const response = await dataService.put(`/units/${id}`, data);
  return response.data;
};

export const deleteUnit = async (id: string): Promise<void> => {
  await dataService.delete(`/units/${id}`);
};

export const bulkImportUnits = async (items: any[]): Promise<any> => {
  const response = await dataService.post('/units/bulk-import', { items });
  return response.data;
};

export const bulkUploadUnits = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/units/bulk-upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export interface PartOf {
  id: string | number;
  name: string;
  disabled?: boolean;
}

export interface SubPartOf {
  id: string | number;
  name: string;
  disabled?: boolean;
}

export const fetchPartOfs = async (search?: string): Promise<PartOf[]> => {
  const response = await dataService.get('/part-of', { params: search ? { search } : undefined });
  return response.data;
};

export const fetchPartOfById = async (id: string): Promise<PartOf> => {
  const response = await dataService.get(`/part-of/${id}`);
  return response.data;
};

export const createPartOf = async (data: { name: string; disabled?: boolean }): Promise<PartOf> => {
  const response = await dataService.post('/part-of', data);
  return response.data;
};

export const updatePartOf = async (id: string, data: { name?: string; disabled?: boolean }): Promise<PartOf> => {
  const response = await dataService.put(`/part-of/${id}`, data);
  return response.data;
};

export const deletePartOf = async (id: string): Promise<void> => {
  await dataService.delete(`/part-of/${id}`);
};

export const bulkImportPartOfs = async (items: any[]): Promise<any> => {
  const response = await dataService.post('/part-of/bulk-import', { items });
  return response.data;
};

export const bulkUploadPartOfs = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/part-of/bulk-upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export const fetchSubPartOfs = async (search?: string): Promise<SubPartOf[]> => {
  const response = await dataService.get('/sub-part-of', { params: search ? { search } : undefined });
  return response.data;
};

export const fetchSubPartOfById = async (id: string): Promise<SubPartOf> => {
  const response = await dataService.get(`/sub-part-of/${id}`);
  return response.data;
};

export const createSubPartOf = async (data: { name: string; disabled?: boolean }): Promise<SubPartOf> => {
  const response = await dataService.post('/sub-part-of', data);
  return response.data;
};

export const updateSubPartOf = async (id: string, data: { name?: string; disabled?: boolean }): Promise<SubPartOf> => {
  const response = await dataService.put(`/sub-part-of/${id}`, data);
  return response.data;
};

export const deleteSubPartOf = async (id: string): Promise<void> => {
  await dataService.delete(`/sub-part-of/${id}`);
};

export const bulkImportSubPartOfs = async (items: any[]): Promise<any> => {
  const response = await dataService.post('/sub-part-of/bulk-import', { items });
  return response.data;
};

export const bulkUploadSubPartOfs = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/sub-part-of/bulk-upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export const fetchSuppliers = async (search?: string, status?: string): Promise<Supplier[]> => {
  const params: Record<string, any> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await dataService.get('/suppliers', { params: Object.keys(params).length ? params : undefined });
  return response.data;
};

export const fetchSupplierById = async (id: string): Promise<any> => {
  const response = await dataService.get(`/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (data: any): Promise<any> => {
  const response = await dataService.post('/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id: string, data: any): Promise<any> => {
  const response = await dataService.put(`/suppliers/${id}`, data);
  return response.data;
};

export const deleteSupplier = async (id: string): Promise<void> => {
  await dataService.delete(`/suppliers/${id}`);
};

export const bulkImportSuppliers = async (items: any[]): Promise<any> => {
  const response = await dataService.post('/suppliers/bulk-import', { items });
  return response.data;
};

export const bulkUploadSuppliers = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/suppliers/bulk-upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export const createProduct = async (product: Product): Promise<Product> => {
  const response = await dataService.post('/products', product);
  return response.data;
};

export const updateProduct = async (id: string, product: Partial<Product>): Promise<Product> => {
  const response = await dataService.put(`/products/${id}`, product);
  return response.data;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await dataService.delete(`/products/${id}`);
};

export interface Customer {
  id: string | number;
  name: string;
  companyName?: string;
  customerName?: string;
  customerType?: string;
  customerGroup?: string;
  territory?: string;
  fromLead?: string;
  fromOpportunity?: string;
  fromProspect?: string;
  accountManager?: string;
  isAuthOtpApplied?: boolean;
  defaultAuthOtpMethod?: string;
  defaultPriceList?: string;
  billingCurrency?: string;
  defaultCompanyBankAccount?: string;
  internalCustomer?: string;
  isAutoCloseDn?: boolean;
  contact?: string;
  phone?: string;
  email?: string;
  contactPersonName?: string;
  taxId?: string;
  vrnNo?: string;
  taxCategory?: string;
  receivableAccount?: string;
  paymentTerms?: string;
  creditLimit?: number;
  trackExchangeDifferences?: boolean;
  salesPerson?: string;
  contributionPercent?: number;
  allowSoWithoutSopp?: boolean;
  disabled?: boolean;
  assignedTo?: string;
  tags?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  website?: string;
  imageUrl?: string;
  attachments?: any;
  addresses?: any;
  gstNumber?: string;
  kycDocs?: any;
  createdAt?: string;
  updatedAt?: string;
}

export const fetchCustomers = async (search?: string, status?: string): Promise<Customer[]> => {
  try {
    const params: Record<string, any> = {};
    if (search) params.search = search;
    if (status) params.status = status;
    const response = await dataService.get('/clients', { params: Object.keys(params).length ? params : undefined });
    return response.data.map((c: any) => ({
      ...c,
      id: c.id,
      name: c.companyName || c.name,
      customerName: c.companyName || c.name,
      contact: c.phone || c.contact,
      email: c.email
    }));
  } catch (err) {
    console.warn('Failed to fetch customers from API', err);
    return [];
  }
};

export const fetchClients = fetchCustomers;

export const fetchCustomerById = async (id: string): Promise<Customer | null> => {
  try {
    const response = await dataService.get(`/clients/${id}`);
    const c = response.data;
    return {
      ...c,
      name: c.companyName || c.name,
      customerName: c.companyName || c.name,
      contact: c.phone || c.contact,
      email: c.email
    };
  } catch (err) {
    console.warn(`Failed to fetch customer ${id} from API`, err);
    return null;
  }
};

export const createCustomer = async (data: Partial<Customer>): Promise<Customer> => {
  const response = await dataService.post('/clients', {
    ...data,
    companyName: data.customerName || data.name,
    phone: data.phone || data.contact,
    email: data.email
  });
  const c = response.data;
  return { ...c, name: c.companyName || c.name, customerName: c.companyName || c.name };
};

export const updateCustomer = async (id: string | number, data: Partial<Customer> & { status?: string }): Promise<Customer> => {
  const response = await dataService.put(`/clients/${id}`, {
    ...data,
    companyName: data.customerName || data.name,
    phone: data.phone || data.contact,
    email: data.email
  });
  const c = response.data;
  return { ...c, name: c.companyName || c.name, customerName: c.companyName || c.name };
};

export const deleteCustomer = async (id: string): Promise<void> => {
  await dataService.delete(`/clients/${id}`);
};

export const bulkImportCustomers = async (items: any[]): Promise<any> => {
  const response = await dataService.post('/clients/bulk-import', { items });
  return response.data;
};

export const bulkUploadCustomers = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/clients/bulk-upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export const fetchInvoices = async (paramsOrSearch?: string | Record<string, any>, typeFilter?: string): Promise<any[]> => {
  let params: Record<string, any> = {};
  if (typeof paramsOrSearch === 'string') {
    if (paramsOrSearch) params.search = paramsOrSearch;
    if (typeFilter && typeFilter !== 'ALL') params.type = typeFilter;
  } else if (paramsOrSearch) {
    params = { ...paramsOrSearch };
  }
  const response = await dataService.get('/invoices', { params: Object.keys(params).length ? params : undefined });
  return response.data;
};

export const createInvoice = async (data: any): Promise<any> => {
  const response = await dataService.post('/invoices', data);
  return response.data;
};

export const fetchInvoiceById = async (id: string): Promise<any> => {
  const response = await dataService.get(`/invoices/${id}`);
  return response.data;
};

export const deleteInvoice = async (id: string): Promise<any> => {
  const response = await dataService.delete(`/invoices/${id}`);
  return response.data;
};

export interface AvailableBatch {
  purchaseItemId: string;
  poNumber: string;
  date: string;
  supplierName: string;
  unitCost: number;
  initialQuantity: number;
  availableQuantity: number;
}

export interface ProductBatchData {
  productId: string;
  productName: string;
  sku: string;
  totalStock: number;
  defaultSellingPrice: number;
  batches: AvailableBatch[];
}

export const fetchAvailableBatches = async (productId: string): Promise<ProductBatchData> => {
  const response = await dataService.get(`/invoices/available-batches/${productId}`);
  return response.data;
};

export const fetchStockEntries = async (params?: Record<string, string>): Promise<any[]> => {
  const response = await dataService.get('/stock-entries', { params });
  return response.data;
};

export const createStockEntry = async (data: { productId: string; type?: string; quantityChange: number; date?: string; notes?: string }): Promise<any> => {
  const response = await dataService.post('/stock-entries', data);
  return response.data;
};

export const updateStockEntry = async (id: string, data: { quantityChange?: number; type?: string; date?: string }): Promise<any> => {
  const response = await dataService.put(`/stock-entries/${id}`, data);
  return response.data;
};

export const deleteStockEntry = async (id: string): Promise<void> => {
  await dataService.delete(`/stock-entries/${id}`);
};

export const fetchGrns = async (search?: string | Record<string, string>): Promise<any[]> => {
  if (typeof search === 'object') {
    const response = await dataService.get('/grn', { params: search });
    return response.data;
  }
  const url = search ? `/grn?search=${encodeURIComponent(search)}` : '/grn';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchGrnById = async (id: string): Promise<any> => {
  const response = await dataService.get(`/grn/${id}`);
  return response.data;
};

export const createGrn = async (data: any): Promise<any> => {
  const response = await dataService.post('/grn', data);
  return response.data;
};

export const updateGrn = async (id: string, data: any): Promise<any> => {
  const response = await dataService.put(`/grn/${id}`, data);
  return response.data;
};

export const acceptGrn = async (id: string): Promise<any> => {
  const response = await dataService.post(`/grn/${id}/accept`);
  return response.data;
};

export const rejectGrn = async (id: string): Promise<any> => {
  const response = await dataService.post(`/grn/${id}/reject`);
  return response.data;
};

export const deleteGrn = async (id: string): Promise<void> => {
  await dataService.delete(`/grn/${id}`);
};

export const bulkUploadInventory = async (file: File): Promise<any> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/products/bulk-upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export const bulkImportProducts = async (items: any[]): Promise<any> => {
  const response = await dataService.post('/products/bulk-import', { items });
  return response.data;
};

export const uploadFile = async (file: File): Promise<{ url: string; filename: string; provider?: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/upload', formData, {
    headers: {
      'Content-Type': undefined,
    },
  });
  return response.data;
};

export interface SkuMaster {
  id: string;
  name: string;
  sku: string;
  status?: string;
  categoryId?: string | null;
  category?: Category | null;
}

export const fetchSkus = async (search?: string, status?: string): Promise<SkuMaster[]> => {
  const params: Record<string, any> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await dataService.get("/skuMaster", { params: Object.keys(params).length ? params : undefined });
  return response.data;
};

export const createSku = async (data: Partial<SkuMaster>): Promise<SkuMaster> => {
  const response = await dataService.post("/skuMaster", data);
  return response.data;
};

export const updateSku = async (id: string, data: Partial<SkuMaster> & { status?: string }): Promise<SkuMaster> => {
  const response = await dataService.put(`/skuMaster/${id}`, data);
  return response.data;
};

export const deleteSku = async (id: string): Promise<void> => {
  await dataService.delete(`/skuMaster/${id}`);
};

export interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  paymentType?: string;
  notes?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface ExpenseDescriptionOption {
  id: string;
  description: string;
  name: string;
}

export const fetchExpenses = async (search?: string, startDate?: string, endDate?: string): Promise<Expense[]> => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  const query = params.toString();
  const url = query ? `/expenses?${query}` : '/expenses';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchExpenseById = async (id: string): Promise<Expense> => {
  const response = await dataService.get(`/expenses/${id}`);
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

export const createExpense = async (data: { date?: string; description: string; amount: number; paymentType?: string; notes?: string }): Promise<Expense> => {
  const response = await dataService.post('/expenses', data);
  return response.data;
};

export const updateExpense = async (id: string, data: { date?: string; description: string; amount: number; paymentType?: string; notes?: string }): Promise<Expense> => {
  const response = await dataService.put(`/expenses/${id}`, data);
  return response.data;
};

export const deleteExpense = async (id: string): Promise<void> => {
  await dataService.delete(`/expenses/${id}`);
};

export interface MaterialRequestItem {
  id: string;
  itemCode: string;
  sparePart?: string;
  requiredByDate?: string;
  quantity: number;
  uom: string;
  warehouse?: string;
}

export interface MaterialRequest {
  id: string;
  series?: string;
  submit?: boolean;
  docStatus?: number;
  approvalStatus?: 'Draft' | 'Pending' | 'Approved' | 'Rejected' | string;
  status?: 'Draft' | 'Submitted' | 'Partially Received' | 'Received' | 'Stopped' | 'Cancelled' | string;
  purpose: string;
  transactionDate: string;
  requiredByDate?: string;
  department?: string;
  requiredFor?: string;
  priceList?: string;
  company?: string;
  attendBy?: string;
  purchaseType?: string;
  linkedSpareRequisition?: string;
  scanBarcode?: string;
  setWarehouse?: string;
  assignedTo?: string;
  tags?: string;
  attachments?: { name: string; url: string }[];
  createdAt?: string;
  createdBy?: string;
  lastEditedBy?: string;
  updatedAt?: string;
  items: MaterialRequestItem[];
}

export const fetchNextMaterialRequestId = async (date?: string): Promise<{ id: string; series: string }> => {
  const url = date ? `/material-request/next-id?date=${encodeURIComponent(date)}` : '/material-request/next-id';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchMaterialRequests = async (search?: string): Promise<MaterialRequest[]> => {
  const url = search ? `/material-request?search=${encodeURIComponent(search)}` : '/material-request';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchMaterialRequestById = async (id: string): Promise<MaterialRequest> => {
  const response = await dataService.get(`/material-request/${id}`);
  return response.data;
};

export const createMaterialRequest = async (data: Partial<MaterialRequest>): Promise<MaterialRequest> => {
  const response = await dataService.post('/material-request', data);
  return response.data;
};

export const updateMaterialRequest = async (id: string, data: Partial<MaterialRequest>): Promise<MaterialRequest> => {
  const response = await dataService.put(`/material-request/${id}`, data);
  return response.data;
};

export const deleteMaterialRequest = async (id: string): Promise<void> => {
  await dataService.delete(`/material-request/${id}`);
};

export interface PurchaseOrderItem {
  id?: string;
  itemCode: string;
  requiredByDate?: string;
  itemGroup?: string;
  quantity: number;
  uom: string;
  rate: number;
  receivedQty?: number;
  amount: number;
  warehouse?: string;
  rollLength?: string | number;
  rollWidth?: string | number;
  rollCoreDiameter?: string | number;
  rollSurface?: string;
  rollWeight?: string | number;
}

export interface PurchaseOrder {
  id: string;
  series?: string;
  status?: 'Draft' | 'Submitted' | 'To Receive' | 'Completed' | 'Cancelled' | string;
  approvalStatus?: string;
  company?: string;
  supplier?: string;
  transactionDate?: string;
  requiredByDate?: string;
  paymentTerms?: string;
  purchaseType?: string;
  gstin?: string;
  tin?: string;
  vrn?: string;
  pfiNo?: string;
  user?: string;
  contact?: string;
  email?: string;
  setWarehouse?: string;
  currency?: string;
  priceList?: string;
  applyTaxWithholding?: boolean;
  isSubcontracted?: boolean;
  assignedTo?: string;
  tags?: string;
  attachments?: { name: string; url: string }[];
  createdAt?: string;
  createdBy?: string;
  updatedAt?: string;
  items: PurchaseOrderItem[];
}

export const fetchNextPurchaseOrderId = async (date?: string): Promise<{ id: string; series: string }> => {
  const url = date ? `/purchase-orders/next-id?date=${encodeURIComponent(date)}` : '/purchase-orders/next-id';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchPurchaseOrders = async (search?: string): Promise<PurchaseOrder[]> => {
  const url = search ? `/purchase-orders?search=${encodeURIComponent(search)}` : '/purchase-orders';
  const response = await dataService.get(url);
  return response.data;
};

export const fetchPurchaseOrderById = async (id: string): Promise<PurchaseOrder> => {
  const response = await dataService.get(`/purchase-orders/${id}`);
  return response.data;
};

export const createPurchaseOrder = async (data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
  const response = await dataService.post('/purchase-orders', data);
  return response.data;
};

export const updatePurchaseOrder = async (id: string, data: Partial<PurchaseOrder>): Promise<PurchaseOrder> => {
  const response = await dataService.put(`/purchase-orders/${id}`, data);
  return response.data;
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  await dataService.delete(`/purchase-orders/${id}`);
};

export interface GrnItemRow {
  id?: string;
  itemCode: string;
  uom: string;
  acceptedQuantity: number;
  rate: number;
  amount: number;
  wbNo?: string;
  wbSlipNo?: string;
  mine?: string;
}

export interface GrnTaxRow {
  id?: string;
  type: string;
  accountHead: string;
  taxRate: number;
  amount: number;
  total: number;
}

export const getSupplierName = (supplier: any, supplierObj?: any): string => {
  if (supplierObj && (supplierObj.name || supplierObj.supplierName)) {
    return supplierObj.name || supplierObj.supplierName;
  }
  if (!supplier) return '';
  if (typeof supplier === 'object') {
    return supplier.name || supplier.supplierName || supplier.companyName || supplier.id || '';
  }
  return String(supplier);
};

export interface GrnRecord {
  id: string;
  grnNumber?: string;
  series?: string;
  status?: 'Draft' | 'Submitted' | 'ACCEPTED' | 'REJECTED' | 'PENDING_INSPECTION' | string;
  postingDate?: string;
  postingTime?: string;
  supplier?: string | any;
  supplierDeliveryNote?: string;
  supplierInvoiceNumber?: string;
  efdReceipt?: string;
  company?: string;
  applyPutawayRule?: boolean;
  isReturn?: boolean;
  defaultHod?: string;
  payment?: string;
  acceptedWarehouse?: string;
  scanBarcode?: string;
  purchaseOrderId?: string;
  invoiceId?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  totalQuantity?: number;
  totalTrips?: number;
  totalAmount?: number;
  items: GrnItemRow[];
  taxes?: GrnTaxRow[];
}

export interface UserRecord {
  id?: string;
  employeeId?: string;
  username: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  contactNumber?: string;
  password?: string;
  role: string;
  status?: 'Active' | 'Inactive' | string;
  isBlock?: boolean;
  twoFactorEnabled?: boolean;
  isTwoFactorSetup?: boolean;
  imageUrl?: string;
  attachments?: any[];
  createdAt?: string;
  updatedAt?: string;
}

export const fetchUsers = async (search?: string, role?: string, status?: string): Promise<UserRecord[]> => {
  const params: Record<string, any> = {};
  if (search) params.search = search;
  if (role) params.role = role;
  if (status) params.status = status;
  const response = await dataService.get('/users', { params });
  return response.data;
};

export const fetchUserById = async (id: string): Promise<UserRecord> => {
  const response = await dataService.get(`/users/${id}`);
  return response.data;
};

export const createUser = async (data: Partial<UserRecord>): Promise<UserRecord> => {
  const response = await dataService.post('/users', data);
  return response.data;
};

export const updateUser = async (id: string, data: Partial<UserRecord>): Promise<UserRecord> => {
  const response = await dataService.put(`/users/${id}`, data);
  return response.data;
};

export const toggleBlockUser = async (id: string): Promise<{ id: string; isBlock: boolean }> => {
  const response = await dataService.patch(`/users/${id}/toggle-block`);
  return response.data;
};

export const deleteUser = async (id: string): Promise<void> => {
  await dataService.delete(`/users/${id}`);
};

export const resetUserTwoFactor = async (id: string): Promise<{ success: boolean; message: string }> => {
  const response = await dataService.post(`/users/${id}/reset-2fa`);
  return response.data;
};

export const changeUserPassword = async (id: string, password: string): Promise<{ success: boolean; message: string }> => {
  const response = await dataService.post(`/users/${id}/change-password`, { password });
  return response.data;
};

export interface PermissionItem {
  id: number;
  name: string;
}

export interface ModuleWithPermissions {
  id: number;
  name: string;
  category?: string;
  moduleDetail: PermissionItem[];
}

export interface ModulePermissionSelection {
  module: number;
  permissions: number[];
}

export interface RoleRecord {
  id?: string;
  name: string;
  code?: string;
  description?: string;
  status?: 'Active' | 'Inactive' | string;
  userCount?: number;
  permissionDetails?: ModulePermissionSelection[];
  createdAt?: string;
  updatedAt?: string;
}

export const fetchRoles = async (search?: string, status?: string): Promise<RoleRecord[]> => {
  const params: Record<string, any> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await dataService.get('/roles', { params });
  return response.data;
};

export const fetchRoleById = async (id: string): Promise<RoleRecord> => {
  const response = await dataService.get(`/roles/${id}`);
  return response.data;
};

export const fetchRolePermissionsMatrix = async (): Promise<ModuleWithPermissions[]> => {
  const response = await dataService.get('/roles/permissions-matrix');
  return response.data?.data?.modules || [];
};

export const createRole = async (data: Partial<RoleRecord>): Promise<RoleRecord> => {
  const response = await dataService.post('/roles', data);
  return response.data;
};

export const updateRole = async (id: string, data: Partial<RoleRecord>): Promise<RoleRecord> => {
  const response = await dataService.put(`/roles/${id}`, data);
  return response.data;
};

export const deleteRole = async (id: string): Promise<void> => {
  await dataService.delete(`/roles/${id}`);
};

export interface ProductionOrderItem {
  id?: string;
  productionOrderId?: string;
  srNo?: number;
  strapSizeLength?: string;
  sizeLength?: string;
  color?: string;
  colour?: string;
  coreSize?: string;
  surface?: string;
  noOfArticles?: number;
  netWtOfArticles?: number;
  netWtArticles?: number;
  mtrsPerArticles?: number;
  totalWt?: number;
  qty?: number;
  quantity?: number;
  unit?: string;
  unitOfMeasurement?: string;
  ratePerUnit?: number;
  wComm?: string;
  breakingLoad?: string;
  palletQty?: string;
  palletQuantity?: string;
  gstPercent?: number;
  freightTerms?: string;
  totalAmount?: number;
  bomId?: string;
  bomNumber?: string;
  description?: string;
}

export interface ProductionOrder {
  id: string;
  orderNumber?: string;
  clientId?: number;
  orderSheetDate?: string;
  customerCategory?: string;
  state?: string;
  city?: string;
  customerType?: string;
  creditDays?: string;
  dispatchPeriod?: string;
  piNo?: string;
  customerName?: string;
  buyerBillingAddress?: string;
  billingAddress?: string;
  consigneeDeliveryAddress?: string;
  consigneeAddress?: string;
  email?: string;
  contactNo?: string;
  contactPerson?: string;
  deliveryTerms?: string;
  purchaseOrderNo?: string;
  poDate?: string;
  customerGstin?: string;
  packingDetails?: string;
  stackingDetails?: string;
  remarksSpecialInstructions?: string;
  remarks?: string;
  status?: string;
  ndAmount?: number;
  odAmount?: number;
  odDays?: number;
  paymentStatus?: string;
  marketingApproval?: string;
  marketing?: string;
  productionApproval?: string;
  production?: string;
  logisticApproval?: string;
  logistic?: string;
  accountApproval?: string;
  account?: string;
  mdApproval?: string;
  md?: string;
  managingDirector?: string;
  authorisedSign?: string;
  transporterName?: string;
  transportGstin?: string;
  lrNo?: string;
  lrDate?: string;
  vehicleNo?: string;
  driverName?: string;
  mobileNo?: string;
  dispatchDate?: string;
  insurance?: string;
  waybillPartB?: string;
  createdAt?: string;
  updatedAt?: string;
  items: ProductionOrderItem[];
}

export const fetchProductionOrders = async (search?: string, status?: string): Promise<ProductionOrder[]> => {
  const params: Record<string, any> = {};
  if (search) params.search = search;
  if (status) params.status = status;
  const response = await dataService.get('/production-orders', { params });
  return response.data;
};

export const fetchProductionOrderById = async (id: string): Promise<ProductionOrder> => {
  const response = await dataService.get(`/production-orders/${id}`);
  return response.data;
};

export const createProductionOrder = async (data: Partial<ProductionOrder>): Promise<ProductionOrder> => {
  const response = await dataService.post('/production-orders', data);
  return response.data;
};

export const updateProductionOrder = async (id: string, data: Partial<ProductionOrder>): Promise<ProductionOrder> => {
  const response = await dataService.put(`/production-orders/${id}`, data);
  return response.data;
};

export const deleteProductionOrder = async (id: string): Promise<void> => {
  await dataService.delete(`/production-orders/${id}`);
};

export const fetchNextProductionOrderId = async (): Promise<{ nextId: string }> => {
  const response = await dataService.get('/production-orders/next-id');
  return response.data;
};

export const buildQueryParams = (search?: string, status?: string) => {
  const params = new URLSearchParams();
  if (search) params.append('search', search);
  if (status && status !== 'ALL') params.append('status', status);
  return params.toString() ? '?' + params.toString() : '';
};

export const bulkUploadSkus = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await dataService.post('/skus/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const fetchDailyCashFlow = async (startDate?: string, endDate?: string): Promise<any[]> => {
  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  
  const url = `/reports/daily-cash-flow${params.toString() ? `?${params.toString()}` : ''}`;
  const response = await dataService.get(url);
  return response.data;
};

export interface SalesReportBatch {
  poNumber: string;
  supplierName: string;
  supplierId?: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  totalRevenue: number;
  profit: number;
}

export interface SalesReportRow {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  date: string;
  paymentType: string;
  clientName: string;
  clientContact?: string;
  customerId?: string;
  productId?: string;
  itemCode: string;
  itemName: string;
  categoryName?: string;
  uom: string;
  quantity: number;
  purchasePrice: number;
  salesPrice: number;
  totalCost: number;
  totalSales: number;
  grossProfit: number;
  marginPct: number;
  supplierName: string;
  poReference: string;
  batches: SalesReportBatch[];
}

export interface SalesReportSummary {
  totalUnits: number;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  overallMargin: number;
  totalInvoices: number;
}

export interface SalesReportResponse {
  rows: SalesReportRow[];
  summary: SalesReportSummary;
}

export const fetchSalesReport = async (params?: {
  startDate?: string;
  endDate?: string;
  search?: string;
  customerId?: string;
  supplierId?: string;
  productId?: string;
}): Promise<SalesReportResponse> => {
  const response = await dataService.get('/reports/sales-summary', { params });
  return response.data;
};

