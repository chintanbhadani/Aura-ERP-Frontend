import { type BulkImportColumn } from '../../components/ERPList';

export const getInvoiceImportColumns = (type: 'PURCHASE' | 'SALES' = 'PURCHASE'): BulkImportColumn[] => [
  {
    key: 'invoiceNumber',
    label: 'Invoice Number',
    aliases: ['invoice_number', 'invoiceNo', 'invoice_no', 'billNo', 'bill_number', 'invNo', 'bill_no', 'invoice number', 'bill no'],
    exampleValue: type === 'PURCHASE' ? 'INV-2026-P0005' : 'INV-2026-S0005',
    description: 'Invoice number (e.g. INV-2026-P0005). Leave empty to auto-generate unique number.'
  },
  {
    key: 'date',
    label: 'Invoice Date',
    required: true,
    aliases: ['invoice_date', 'billDate', 'bill_date', 'date', 'invoicedate', 'invoice date'],
    type: 'date',
    exampleValue: '2026-10-30',
    description: 'Date of invoice (YYYY-MM-DD or DD/MM/YYYY)'
  },
  {
    key: 'partyName',
    label: type === 'PURCHASE' ? 'Supplier Name' : 'Customer Name',
    required: true,
    aliases: [
      'supplier', 'supplierName', 'customer', 'customerName', 'party', 'partyName', 'party_name', 
      'vendor', 'client', 'supplier name', 'customer name', 'party name', 'client name'
    ],
    exampleValue: type === 'PURCHASE' ? 'ABC Enterprise' : 'Katumba Hardware',
    description: `${type === 'PURCHASE' ? 'Supplier / Vendor' : 'Customer / Client'} name (auto-creates in Master if new)`
  },
  {
    key: 'sku',
    label: 'Item Code (SKU)',
    aliases: [
      'itemCode', 'item_code', 'sku', 'code', 'productCode', 'item code (sku)', 
      'item code', 'item sku', 'sku code', 'sku id', 'skuid', 'item id', 'itemid'
    ],
    exampleValue: 'BAT-100',
    description: 'Item SKU / Code (auto-creates in Item Master if new)'
  },
  {
    key: 'itemName',
    label: 'Item Name',
    required: true,
    aliases: ['item_name', 'name', 'productName', 'product_name', 'product', 'item', 'item name', 'product name'],
    exampleValue: 'Battery',
    description: 'Item name / description (Required)'
  },
  {
    key: 'category',
    label: 'Category (Item Group)',
    aliases: ['category', 'categoryName', 'itemGroup', 'item_group', 'group', 'item group', 'category name'],
    exampleValue: 'Raw Materials',
    description: 'Item category / group (auto-creates in Master if new, default: General)'
  },
  {
    key: 'unit',
    label: 'Unit of Measure',
    aliases: ['unit', 'uom', 'unitName', 'unit_of_measure', 'defaultUnitOfMeasure', 'unit of measure'],
    exampleValue: 'Pcs',
    description: 'Unit of measure (e.g. Pcs, Kg, Roll, Box, default: Pcs)'
  },
  {
    key: 'quantity',
    label: 'Quantity',
    required: true,
    type: 'number',
    aliases: ['qty', 'quantity', 'count', 'units'],
    exampleValue: 100,
    description: 'Number of units (Required)'
  },
  {
    key: 'unitPrice',
    label: type === 'PURCHASE' ? 'Purchase Rate / Unit Price' : 'Selling Rate / Unit Price',
    required: true,
    type: 'number',
    aliases: [
      'unit_price', 'rate', 'price', 'costPrice', 'cost_price', 'unitPrice', 
      'selling rate / unit price', 'purchase rate / unit price', 'selling rate', 
      'purchase rate', 'selling price', 'cost price', 'rate / unit price'
    ],
    exampleValue: 3000,
    description: 'Rate per unit'
  },
  {
    key: 'paymentType',
    label: 'Payment Mode',
    aliases: ['payment_type', 'paymentType', 'mode', 'paymentMode', 'payment_mode', 'payment mode', 'payment type'],
    exampleValue: 'CASH',
    description: 'CASH, BANK, CREDIT, or MOBILE_MONEY (Default: CASH)'
  },
  {
    key: 'cashAmount',
    label: 'Cash Paid',
    aliases: ['cash', 'cash_amount', 'paidCash', 'cash paid', 'cash amount'],
    type: 'number',
    exampleValue: 300000,
    description: 'Explicit cash amount (defaults to total for CASH)'
  },
  {
    key: 'bankAmount',
    label: 'Bank Paid',
    aliases: ['bank', 'bank_amount', 'bankTransfer', 'bank paid', 'bank amount'],
    type: 'number',
    exampleValue: 0,
    description: 'Explicit bank amount (defaults to total for BANK)'
  },
  {
    key: 'dueDate',
    label: 'Due Date',
    type: 'date',
    aliases: ['due_date', 'dueDate', 'due date'],
    exampleValue: '2026-11-09',
    description: 'Due date for credit balance settlement'
  },
  {
    key: 'notes',
    label: 'Notes / Remarks',
    aliases: ['remarks', 'notes', 'comment', 'memo'],
    exampleValue: 'Bulk imported via Excel',
    description: 'Optional invoice notes or internal reference'
  }
];

export const PURCHASE_INVOICE_IMPORT_SAMPLE_DATA = [
  {
    invoiceNumber: 'INV-2026-P0001',
    date: '2026-10-01',
    partyName: 'Mahadev Enterprises',
    sku: 'SPL-BRK-200',
    itemName: 'Splender Break',
    category: 'Auto Parts',
    unit: 'Pcs',
    quantity: 200,
    unitPrice: 40,
    paymentType: 'CASH',
    notes: 'Initial purchase batch'
  },
  {
    invoiceNumber: 'INV-2026-P0002',
    date: '2026-10-14',
    partyName: 'ABC Enterprise',
    sku: 'SPL-BRK-200',
    itemName: 'Splender Break',
    category: 'Auto Parts',
    unit: 'Pcs',
    quantity: 200,
    unitPrice: 41,
    paymentType: 'CASH',
    notes: 'Secondary batch'
  },
  {
    invoiceNumber: 'INV-2026-P0003',
    date: '2026-10-30',
    partyName: 'Alpha Chemicals Inc.',
    sku: 'BAT-125',
    itemName: 'Battery',
    category: 'Batteries',
    unit: 'Pcs',
    quantity: 125,
    unitPrice: 3000,
    paymentType: 'CASH',
    notes: 'Chemical supplies'
  },
  {
    invoiceNumber: 'INV-2026-P0004',
    date: '2026-10-30',
    partyName: 'ABC Enterprise',
    sku: 'BAT-100',
    itemName: 'Battery',
    category: 'Batteries',
    unit: 'Pcs',
    quantity: 100,
    unitPrice: 3000,
    paymentType: 'CASH',
    notes: 'Main power packs'
  }
];

export const SALES_INVOICE_IMPORT_SAMPLE_DATA = [
  {
    invoiceNumber: 'INV-2026-S0001',
    date: '2026-10-05',
    partyName: 'Katumba Hardware',
    sku: 'BAT-100',
    itemName: 'Battery',
    category: 'Batteries',
    unit: 'Pcs',
    quantity: 10,
    unitPrice: 3800,
    paymentType: 'CASH',
    notes: 'Counter retail sale'
  },
  {
    invoiceNumber: 'INV-2026-S0002',
    date: '2026-10-12',
    partyName: 'Mukwano Wholesalers',
    sku: 'SPL-BRK-200',
    itemName: 'Splender Break',
    category: 'Auto Parts',
    unit: 'Pcs',
    quantity: 50,
    unitPrice: 65,
    paymentType: 'BANK',
    notes: 'Wholesale order'
  }
];
