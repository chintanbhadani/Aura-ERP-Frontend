import { type BulkImportColumn } from '../../components/ERPList';

export const SUPPLIER_IMPORT_COLUMNS: BulkImportColumn[] = [
  {
    key: 'name',
    label: 'Supplier Name',
    required: true,
    aliases: ['Supplier Name', 'supplierName', 'Company Name', 'companyName', 'name', 'Name', 'Supplier', 'supplier'],
    exampleValue: 'Gujarat Petchem Polymers',
    description: 'Full supplier or company name (Required)'
  },
  {
    key: 'supplierType',
    label: 'Supplier Type',
    aliases: ['supplier_type', 'supplierType', 'Supplier Type', 'Type'],
    exampleValue: 'Company',
    description: 'Company or Individual (default: Company)'
  },
  {
    key: 'supplierGroup',
    label: 'Supplier Group',
    aliases: ['supplier_group', 'supplierGroup', 'Supplier Group', 'Group'],
    exampleValue: 'Raw Material',
    description: 'Supplier category (e.g. Raw Material, Hardware, Services)'
  },
  {
    key: 'country',
    label: 'Country',
    aliases: ['Country', 'country'],
    exampleValue: 'India',
    description: 'Country (default: India)'
  },
  {
    key: 'contactPersonName',
    label: 'Contact Person',
    aliases: ['contact_person', 'contactPerson', 'contactPersonName', 'Contact Person Name', 'Contact Person'],
    exampleValue: 'Dharmesh Vora',
    description: 'Primary contact person name'
  },
  {
    key: 'contact',
    label: 'Phone / Contact',
    aliases: ['Phone', 'Contact', 'phone', 'contact', 'Mobile', 'mobile', 'Phone Number'],
    exampleValue: '+91 9825123456',
    description: 'Contact phone or mobile number'
  },
  {
    key: 'email',
    label: 'Email',
    aliases: ['Email', 'email', 'E-mail', 'Email Address'],
    exampleValue: 'orders@gujaratpetchem.com',
    description: 'Official supplier email address'
  },
  {
    key: 'taxId',
    label: 'Tax ID / GSTIN',
    aliases: ['GST', 'GSTIN', 'taxId', 'tax_id', 'Tax ID', 'GST Number', 'GST No', 'Tax ID / GSTIN'],
    exampleValue: '24AAACG1234E1Z1',
    description: 'GSTIN or Tax identification number'
  },
  {
    key: 'vrnNo',
    label: 'VRN / PAN',
    aliases: ['VRN', 'vrnNo', 'vrn_no', 'PAN', 'PAN No', 'VRN / PAN'],
    exampleValue: 'AAACG1234E',
    description: 'PAN or State registration / VRN'
  },
  {
    key: 'address',
    label: 'Address',
    aliases: ['Address', 'address', 'Street', 'Street Address'],
    exampleValue: 'Plot 88, GIDC Dahej Industrial Area',
    description: 'Office or factory address'
  },
  {
    key: 'city',
    label: 'City',
    aliases: ['City', 'city'],
    exampleValue: 'Dahej',
    description: 'City'
  },
  {
    key: 'state',
    label: 'State',
    aliases: ['State', 'state', 'Province'],
    exampleValue: 'Gujarat',
    description: 'State'
  },
  {
    key: 'postalCode',
    label: 'Postal Code',
    aliases: ['Postal Code', 'Pin Code', 'Pincode', 'postalCode', 'postal_code', 'Zip', 'Zip Code'],
    exampleValue: '392130',
    description: 'PIN or postal code'
  },
  {
    key: 'isTransporter',
    label: 'Is Transporter',
    type: 'boolean',
    aliases: ['isTransporter', 'is_transporter', 'Transporter'],
    exampleValue: 'No',
    description: 'Yes or No (default: No)'
  },
  {
    key: 'creditLimit',
    label: 'Credit Limit',
    type: 'number',
    aliases: ['Credit Limit', 'creditLimit', 'credit_limit', 'Credit'],
    exampleValue: 1500000,
    description: 'Credit limit in INR (default: 0)'
  },
  {
    key: 'paymentTerms',
    label: 'Payment Terms',
    aliases: ['Payment Terms', 'paymentTerms', 'payment_terms', 'Terms'],
    exampleValue: 'Net 30',
    description: 'Payment terms (e.g. Net 30, Net 15, Immediate)'
  },
  {
    key: 'priceList',
    label: 'Price List',
    aliases: ['priceList', 'price_list', 'Price List'],
    exampleValue: 'Standard Buying',
    description: 'Price list (default: Standard Buying)'
  },
  {
    key: 'disabled',
    label: 'Disabled',
    type: 'boolean',
    aliases: ['Disabled', 'disabled', 'is_disabled', 'isDisabled'],
    exampleValue: 'No',
    description: 'Yes or No (default: No)'
  }
];

export const SUPPLIER_IMPORT_SAMPLE_DATA: Record<string, any>[] = [
  {
    'Supplier Name': 'Gujarat Petchem Polymers',
    'Supplier Type': 'Company',
    'Supplier Group': 'Raw Material',
    'Country': 'India',
    'Contact Person': 'Dharmesh Vora',
    'Phone / Contact': '+91 9825123456',
    'Email': 'orders@gujaratpetchem.com',
    'Tax ID / GSTIN': '24AAACG1234E1Z1',
    'VRN / PAN': 'AAACG1234E',
    'Address': 'Plot 88, GIDC Dahej Industrial Area',
    'City': 'Dahej',
    'State': 'Gujarat',
    'Postal Code': '392130',
    'Is Transporter': 'No',
    'Credit Limit': 1500000,
    'Payment Terms': 'Net 30',
    'Price List': 'Standard Buying',
    'Disabled': 'No'
  },
  {
    'Supplier Name': 'Kailash Core & Tubes',
    'Supplier Type': 'Company',
    'Supplier Group': 'Packaging Material',
    'Country': 'India',
    'Contact Person': 'Kailashbhai Patel',
    'Phone / Contact': '+91 9898112233',
    'Email': 'kailashcores@gmail.com',
    'Tax ID / GSTIN': '24AAACK5678B1Z4',
    'VRN / PAN': 'AAACK5678B',
    'Address': 'Shed 4, Mahagujarat Industrial Estate, Moraiya',
    'City': 'Ahmedabad',
    'State': 'Gujarat',
    'Postal Code': '382213',
    'Is Transporter': 'No',
    'Credit Limit': 400000,
    'Payment Terms': 'Net 15',
    'Price List': 'Standard Buying',
    'Disabled': 'No'
  },
  {
    'Supplier Name': 'Om Roadways & Logistics',
    'Supplier Type': 'Company',
    'Supplier Group': 'Services',
    'Country': 'India',
    'Contact Person': 'Mahesh Yadav',
    'Phone / Contact': '+91 9712345678',
    'Email': 'booking@omroadways.in',
    'Tax ID / GSTIN': '24AAAFO9012A1Z8',
    'VRN / PAN': 'AAAFO9012A',
    'Address': 'Transport Nagar, Aslali Ring Road',
    'City': 'Ahmedabad',
    'State': 'Gujarat',
    'Postal Code': '382427',
    'Is Transporter': 'Yes',
    'Credit Limit': 250000,
    'Payment Terms': 'Immediate',
    'Price List': 'Standard Buying',
    'Disabled': 'No'
  }
];
