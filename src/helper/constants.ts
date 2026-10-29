export const logoWidth = 150;
export const logoHeight = 200;

export const MAX_FILES_UPLOAD = 1;
export const FILE_SIZE_5_MB = 5242880;

export const viewRecordOptions = [
  { label: 'Choose', value: '' },
  { label: 'View my records', value: 'dc2dd828-d895-496c-8ac0-affc6e8b4175' },
  { label: 'View all records', value: '95c00b0c-cf13-4f2e-a117-824302ace8d9' },
  { label: 'View pending records', value: '798d4767-71c1-45f9-a94e-9908a3e914ef' }
];

export const chemicalTypeOptions = [
  { label: 'Solid', value: 'solid', id: 1 },
  { label: 'Solvent', value: 'solvent', id: 2 },
  { label: 'Dry Indicators', value: 'dry-indicators', id: 3 },
  { label: 'Hydroscopic', value: 'hydroscopic', id: 4 },
  { label: 'Readymade liquid indicator', value: 'readymade-liquid-indicator', id: 5 },
  { label: 'Readymade PH/ Conductivity Buffer Solution', value: 'ph-conductivity-buffer-solution', id: 6 },
  { label: 'Karl Fisher Reagent', value: 'karl-fisher-reagent', id: 7 },
  { label: 'Volumetric Solution (Readymade)', value: 'volumetric-solution-readymade', id: 8 },
  { label: 'TLC Plate', value: 'tlc-plate', id: 9 }
];

export const Permission = {
  LIST: 'List',
  EDIT: 'Edit',
  ADD: 'Add',
  DELETE: 'Delete',
  ISSUE: 'Issue',
  APPROVE: 'Approve',
  EXPORT_DATA: 'Export Data',
  VIEW_DASHBOARD: 'View Dashboard',
  AUDIT: 'Audit',
  VIEW_HISTORY: 'View History',
  PRINT: 'Print',
  RESET_2FA: 'Reset 2FA',
  GENERATE_PASSWORD: 'Generate Password'
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];

export const ModuleName = {
  DASHBOARD: 'Dashboard',
  PRODUCTION_ORDERS: 'Production Orders',
  PRODUCTION_PLANNING: 'Production Planning',
  BOM: 'BOM (Bill of Materials)',
  PRODUCTION_WEIGHING: 'Production Weighing',
  STOCK_ENTRIES: 'Stock Entries',
  INVENTORY_PRODUCTS: 'Inventory Products',
  MATERIAL_REQUISITION: 'Material Requisition',
  PURCHASE_ORDERS: 'Purchase Orders',
  SUPPLIERS: 'Suppliers',
  GRN: 'Goods Receipt Note (GRN)',
  CLIENTS: 'Clients',
  INQUIRIES: 'Inquiries',
  QUOTATIONS: 'Quotations',
  PROFORMA_INVOICES: 'Proforma Invoices',
  TAX_INVOICES: 'Tax Invoices',
  EXPENSES: 'Expenses',
  USER_MANAGEMENT: 'User Management',
  ROLE_PERMISSIONS: 'Role & Permissions',
  MASTER_DATA: 'Master Data',
  STICKER_CODE_CONFIG: 'Sticker Code Config',
  WEIGHMENT_LEDGER: 'Weighment Ledger',
  USER_AUDIT_LOGS: 'User Audit Logs',
  DATABASE_BACKUP: 'Database Backup',

  // Convenience aliases for Master data submodules
  CATEGORY: 'Master Data',
  UNIT: 'Master Data',
  PART_OF: 'Master Data',
  SUB_PART_OF: 'Master Data',
  MACHINE: 'Master Data',
  STOCK_LEDGER: 'Stock Entries',
  BIN_REPORT: 'Inventory Products'
} as const;

export type ModuleName = (typeof ModuleName)[keyof typeof ModuleName];

