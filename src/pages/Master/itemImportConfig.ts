import { type BulkImportColumn } from '../../components/ERPList';

export const ITEM_IMPORT_COLUMNS: BulkImportColumn[] = [
  // Basic Information
  { 
    key: 'name', 
    label: 'Item Name', 
    required: true, 
    aliases: ['item_name', 'itemName', 'product_name', 'productName', 'Title'],
    exampleValue: '15 X 0.5 Roll', 
    description: 'Item full name / description (Required)' 
  },
  { 
    key: 'sku', 
    label: 'Item Code (SKU)', 
    aliases: ['item_code', 'itemCode', 'sku', 'code'],
    exampleValue: 'PSRO001', 
    description: 'Leave empty to auto-generate unique SKU' 
  },
  { 
    key: 'category', 
    label: 'Item Group', 
    aliases: ['categoryName', 'itemGroup', 'category', 'item_group', 'group'],
    exampleValue: 'Roll', 
    description: 'Category name (e.g. Roll, TOOLS, RAW MATERIAL)' 
  },
  { 
    key: 'partOf', 
    label: 'Part Of', 
    aliases: ['part_of', 'partOf'],
    exampleValue: 'FINISHED GOODS', 
    description: 'e.g. FINISHED GOODS, RAW MATERIAL, PACKING' 
  },
  { 
    key: 'subPartOf', 
    label: 'Sub Part Of', 
    aliases: ['sub_part_of', 'subPartOf'],
    exampleValue: 'WORKSHOP', 
    description: 'e.g. WORKSHOP, PACKING, STORE' 
  },
  { 
    key: 'uom', 
    label: 'Default Unit of Measure', 
    aliases: ['unit', 'unitName', 'defaultUnitOfMeasure', 'uom', 'unit_of_measure'],
    exampleValue: 'Pcs', 
    description: 'e.g. Pcs, kg, Roll, Box, Meter' 
  },
  { 
    key: 'location', 
    label: 'Bin Location', 
    aliases: ['binLocation', 'bin', 'location'],
    exampleValue: 'D-31', 
    description: 'Storage warehouse location' 
  },
  { 
    key: 'company', 
    label: 'Company', 
    exampleValue: 'PATEL STRAP INDUSTRIES LTD', 
    description: 'Company name' 
  },

  // Pricing & Stock
  { 
    key: 'cost_price', 
    label: 'Standard Cost Price (₹)', 
    aliases: ['costPrice', 'cost_price', 'cost'],
    type: 'number', 
    exampleValue: 120.00,
    description: 'Standard purchase/cost rate'
  },
  { 
    key: 'selling_price', 
    label: 'Standard Selling Rate (₹)', 
    aliases: ['sellingPrice', 'selling_price', 'sellingRate', 'rate', 'price'],
    type: 'number', 
    exampleValue: 150.00,
    description: 'Standard selling rate'
  },
  { 
    key: 'min_stock', 
    label: 'Min Stock', 
    aliases: ['minStock', 'min_stock'],
    type: 'number', 
    exampleValue: 50,
    description: 'Re-order minimum quantity'
  },
  { 
    key: 'quantity', 
    label: 'Opening Quantity', 
    aliases: ['qty', 'stock', 'openingStock'],
    type: 'number', 
    exampleValue: 0 
  },
  { 
    key: 'valuationRate', 
    label: 'Valuation Rate (₹)', 
    aliases: ['valuation_rate'],
    type: 'number', 
    exampleValue: 118.00 
  },

  // Status & Accounts
  { 
    key: 'status', 
    label: 'Status', 
    exampleValue: 'Active', 
    description: 'Active or Inactive' 
  },
  { 
    key: 'disabled', 
    label: 'Disabled', 
    type: 'boolean', 
    exampleValue: 'No', 
    description: 'Yes / No' 
  },
  { 
    key: 'maintainStock', 
    label: 'Maintain Stock', 
    type: 'boolean', 
    exampleValue: 'Yes', 
    description: 'Yes / No' 
  },
  { 
    key: 'hsnCode', 
    label: 'HSN Code', 
    aliases: ['hsn', 'hsn_code'],
    exampleValue: '39269099' 
  },
  { 
    key: 'taxRate', 
    label: 'GST Rate (%)', 
    aliases: ['tax_rate', 'gstRate', 'gst'],
    type: 'number', 
    exampleValue: 18 
  },
  { 
    key: 'incomeAccount', 
    label: 'Income Account', 
    exampleValue: 'Sales Account - PS' 
  },
  { 
    key: 'expenseAccount', 
    label: 'Expense Account', 
    exampleValue: 'Cost of Goods Sold - PS' 
  },

  // Operational Attributes
  { 
    key: 'activityType', 
    label: 'Activity Type', 
    exampleValue: 'Manufacturing' 
  },
  { 
    key: 'allowAlternativeItem', 
    label: 'Allow Alternative Item', 
    type: 'boolean', 
    exampleValue: 'No' 
  },
  { 
    key: 'excisableItem', 
    label: 'Excisable Item', 
    type: 'boolean', 
    exampleValue: 'No' 
  },
  { 
    key: 'hasVariants', 
    label: 'Has Variants', 
    type: 'boolean', 
    exampleValue: 'No' 
  },
  { 
    key: 'includeInManufacturing', 
    label: 'Include Item In Manufacturing', 
    type: 'boolean', 
    exampleValue: 'Yes' 
  },
  { 
    key: 'isFixedAsset', 
    label: 'Is Fixed Asset', 
    type: 'boolean', 
    exampleValue: 'No' 
  },
  { 
    key: 'overDeliveryAllowance', 
    label: 'Over Delivery Allowance (%)', 
    type: 'number', 
    exampleValue: 0 
  },
  { 
    key: 'overBillingAllowance', 
    label: 'Over Billing Allowance (%)', 
    type: 'number', 
    exampleValue: 0 
  },
  { 
    key: 'assignedTo', 
    label: 'Assigned To', 
    exampleValue: 'Julius Daffa' 
  },
  { 
    key: 'tags', 
    label: 'Tags', 
    exampleValue: 'TOOLS,WORKSHOP' 
  },

  // Roll Specifications (Required/Optional when Item Group is Roll)
  { 
    key: 'rollLength', 
    label: 'Roll Length', 
    aliases: ['length', 'roll_length'],
    type: 'number', 
    exampleValue: 15, 
    description: 'Roll length (for Roll items)' 
  },
  { 
    key: 'rollWidth', 
    label: 'Roll Width', 
    aliases: ['width', 'roll_width'],
    type: 'number', 
    exampleValue: 15, 
    description: 'Roll width (for Roll items)' 
  },
  { 
    key: 'rollCoreLength', 
    label: 'Roll Core Length', 
    aliases: ['coreLength', 'core_length'],
    type: 'number', 
    exampleValue: 150, 
    description: 'Core length in mm' 
  },
  { 
    key: 'rollCoreDiameter', 
    label: 'Roll Core Diameter', 
    aliases: ['coreDiameter', 'core_diameter'],
    type: 'number', 
    exampleValue: 406, 
    description: 'Core diameter in mm' 
  },
  { 
    key: 'rollDiaSize', 
    label: 'Roll Dia Size', 
    aliases: ['diaSize', 'dia_size'],
    type: 'number', 
    exampleValue: 396, 
    description: 'Outer diameter in mm' 
  },
  { 
    key: 'rollSurface', 
    label: 'Roll Surface', 
    aliases: ['surface', 'surfaceType'],
    exampleValue: 'Roll Emboss', 
    description: 'Roll Emboss or Roll Plain' 
  },
  { 
    key: 'rollWeight', 
    label: 'Roll Weight', 
    aliases: ['weight', 'roll_weight'],
    type: 'number', 
    exampleValue: 10, 
    description: 'Weight in kg' 
  },
  { 
    key: 'rollJoint', 
    label: 'Roll Joint Status', 
    aliases: ['joint', 'jointStatus', 'roll_joint'],
    exampleValue: 'No Joint', 
    description: 'Joint or No Joint' 
  }
];

export const ITEM_IMPORT_SAMPLE_DATA: Record<string, any>[] = [
  {
    'Item Name': '15 X 0.5 Roll',
    'Item Code (SKU)': 'PSRO001',
    'Item Group': 'Roll',
    'Part Of': 'FINISHED GOODS',
    'Sub Part Of': 'WORKSHOP',
    'Default Unit of Measure': 'Pcs',
    'Bin Location': 'D-31',
    'Company': 'PATEL STRAP INDUSTRIES LTD',
    'Standard Cost Price (₹)': 120.00,
    'Standard Selling Rate (₹)': 150.00,
    'Min Stock': 50,
    'Opening Quantity': 100,
    'Valuation Rate (₹)': 118.00,
    'Status': 'Active',
    'Disabled': 'No',
    'Maintain Stock': 'Yes',
    'HSN Code': '39269099',
    'GST Rate (%)': 18,
    'Income Account': 'Sales Account - PS',
    'Expense Account': 'Cost of Goods Sold - PS',
    'Activity Type': 'Manufacturing',
    'Allow Alternative Item': 'No',
    'Excisable Item': 'No',
    'Has Variants': 'No',
    'Include Item In Manufacturing': 'Yes',
    'Is Fixed Asset': 'No',
    'Over Delivery Allowance (%)': 0,
    'Over Billing Allowance (%)': 0,
    'Assigned To': 'Julius Daffa',
    'Tags': 'ROLL,FINISHED',
    'Roll Length': 15,
    'Roll Width': 15,
    'Roll Core Length': 150,
    'Roll Core Diameter': 406,
    'Roll Dia Size': 396,
    'Roll Surface': 'Roll Emboss',
    'Roll Weight': 10,
    'Roll Joint Status': 'No Joint'
  },
  {
    'Item Name': '16 X 0.5 Roll',
    'Item Code (SKU)': 'PSRO002',
    'Item Group': 'Roll',
    'Part Of': 'FINISHED GOODS',
    'Sub Part Of': 'WORKSHOP',
    'Default Unit of Measure': 'kg',
    'Bin Location': 'D-31',
    'Company': 'PATEL STRAP INDUSTRIES LTD',
    'Standard Cost Price (₹)': 125.00,
    'Standard Selling Rate (₹)': 158.00,
    'Min Stock': 40,
    'Opening Quantity': 80,
    'Valuation Rate (₹)': 122.00,
    'Status': 'Active',
    'Disabled': 'No',
    'Maintain Stock': 'Yes',
    'HSN Code': '39269099',
    'GST Rate (%)': 18,
    'Income Account': 'Sales Account - PS',
    'Expense Account': 'Cost of Goods Sold - PS',
    'Activity Type': 'Manufacturing',
    'Allow Alternative Item': 'No',
    'Excisable Item': 'No',
    'Has Variants': 'No',
    'Include Item In Manufacturing': 'Yes',
    'Is Fixed Asset': 'No',
    'Over Delivery Allowance (%)': 0,
    'Over Billing Allowance (%)': 0,
    'Assigned To': 'Julius Daffa',
    'Tags': 'ROLL,HEAVY',
    'Roll Length': 16,
    'Roll Width': 15,
    'Roll Core Length': 150,
    'Roll Core Diameter': 406,
    'Roll Dia Size': 410,
    'Roll Surface': 'Roll Plain',
    'Roll Weight': 12,
    'Roll Joint Status': 'No Joint'
  },
  {
    'Item Name': 'Adhesive Screw M6',
    'Item Code (SKU)': 'PSTL001',
    'Item Group': 'SCREW',
    'Part Of': 'RAW MATERIAL',
    'Sub Part Of': 'WORKSHOP',
    'Default Unit of Measure': 'Pcs',
    'Bin Location': 'D-31',
    'Company': 'PATEL STRAP INDUSTRIES LTD',
    'Standard Cost Price (₹)': 2.50,
    'Standard Selling Rate (₹)': 4.00,
    'Min Stock': 500,
    'Opening Quantity': 1500,
    'Valuation Rate (₹)': 2.50,
    'Status': 'Active',
    'Disabled': 'No',
    'Maintain Stock': 'Yes',
    'HSN Code': '73181500',
    'GST Rate (%)': 18,
    'Income Account': 'Sales Account - PS',
    'Expense Account': 'Cost of Goods Sold - PS',
    'Activity Type': 'Purchasing',
    'Allow Alternative Item': 'Yes',
    'Excisable Item': 'No',
    'Has Variants': 'No',
    'Include Item In Manufacturing': 'Yes',
    'Is Fixed Asset': 'No',
    'Over Delivery Allowance (%)': 5,
    'Over Billing Allowance (%)': 5,
    'Assigned To': 'Julius Daffa',
    'Tags': 'HARDWARE,SCREW',
    'Roll Length': 0,
    'Roll Width': 0,
    'Roll Core Length': 0,
    'Roll Core Diameter': 0,
    'Roll Dia Size': 0,
    'Roll Surface': '',
    'Roll Weight': 0,
    'Roll Joint Status': ''
  },
  {
    'Item Name': 'Stretch Wrapping Film 20 Micron',
    'Item Code (SKU)': 'PSWR001',
    'Item Group': 'WRAPPING FILM',
    'Part Of': 'RAW MATERIAL',
    'Sub Part Of': 'PACKING',
    'Default Unit of Measure': 'kg',
    'Bin Location': 'D-40',
    'Company': 'PATEL STRAP INDUSTRIES LTD',
    'Standard Cost Price (₹)': 180.00,
    'Standard Selling Rate (₹)': 220.00,
    'Min Stock': 100,
    'Opening Quantity': 250,
    'Valuation Rate (₹)': 180.00,
    'Status': 'Active',
    'Disabled': 'No',
    'Maintain Stock': 'Yes',
    'HSN Code': '39201019',
    'GST Rate (%)': 18,
    'Income Account': 'Sales Account - PS',
    'Expense Account': 'Cost of Goods Sold - PS',
    'Activity Type': 'Packaging',
    'Allow Alternative Item': 'No',
    'Excisable Item': 'No',
    'Has Variants': 'No',
    'Include Item In Manufacturing': 'Yes',
    'Is Fixed Asset': 'No',
    'Over Delivery Allowance (%)': 0,
    'Over Billing Allowance (%)': 0,
    'Assigned To': 'Julius Daffa',
    'Tags': 'PACKING,FILM',
    'Roll Length': 0,
    'Roll Width': 0,
    'Roll Core Length': 0,
    'Roll Core Diameter': 0,
    'Roll Dia Size': 0,
    'Roll Surface': '',
    'Roll Weight': 0,
    'Roll Joint Status': ''
  }
];
