import { type BulkImportColumn } from '../../components/ERPList';

export const CUSTOMER_IMPORT_COLUMNS: BulkImportColumn[] = [
  {
    key: 'companyName',
    label: 'Customer Name',
    required: true,
    aliases: ['Customer Name', 'customerName', 'companyName', 'Company Name', 'Customer', 'Client Name', 'clientName', 'Name', 'name'],
    exampleValue: 'Patel Packaging Pvt Ltd',
    description: 'Full customer or company name (Required)'
  },
  {
    key: 'customerType',
    label: 'Customer Type',
    aliases: ['customer_type', 'customerType', 'Customer Type', 'Type'],
    exampleValue: 'Company',
    description: 'Company or Individual (default: Company)'
  },
  {
    key: 'customerGroup',
    label: 'Customer Group',
    aliases: ['customer_group', 'customerGroup', 'Customer Group', 'Group'],
    exampleValue: 'Commercial',
    description: 'Commercial, Non Profit, Individual, Government (default: Commercial)'
  },
  {
    key: 'territory',
    label: 'Territory',
    aliases: ['Territory', 'territory', 'Region', 'Country'],
    exampleValue: 'India',
    description: 'Sales territory or region (default: India)'
  },
  {
    key: 'contactPersonName',
    label: 'Contact Person',
    aliases: ['contact_person', 'contactPerson', 'contactPersonName', 'Contact Person Name', 'Contact Person'],
    exampleValue: 'Rajesh Patel',
    description: 'Primary contact person name'
  },
  {
    key: 'phone',
    label: 'Phone / Contact',
    aliases: ['Phone', 'Contact', 'phone', 'contact', 'Mobile', 'mobile', 'Phone Number'],
    exampleValue: '+91 9876543210',
    description: 'Primary phone or mobile number'
  },
  {
    key: 'email',
    label: 'Email',
    aliases: ['Email', 'email', 'E-mail', 'Email Address'],
    exampleValue: 'info@patelpackaging.com',
    description: 'Official customer email address'
  },
  {
    key: 'gstNumber',
    label: 'GST Number',
    aliases: ['GST', 'gstNumber', 'gst_number', 'GSTIN', 'GST No', 'GST Number / Tax ID'],
    exampleValue: '24AAACP1234A1Z5',
    description: '15-digit GSTIN number'
  },
  {
    key: 'taxId',
    label: 'Tax ID / PAN',
    aliases: ['taxId', 'tax_id', 'Tax ID', 'PAN', 'PAN No', 'PAN Number'],
    exampleValue: 'AAACP1234A',
    description: 'PAN or Tax ID'
  },
  {
    key: 'address',
    label: 'Address',
    aliases: ['Address', 'address', 'Street', 'Street Address'],
    exampleValue: 'Plot 45, GIDC Industrial Estate',
    description: 'Billing / street address'
  },
  {
    key: 'city',
    label: 'City',
    aliases: ['City', 'city'],
    exampleValue: 'Surat',
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
    exampleValue: '395006',
    description: 'Postal or PIN code'
  },
  {
    key: 'country',
    label: 'Country',
    aliases: ['Country', 'country'],
    exampleValue: 'India',
    description: 'Country (default: India)'
  },
  {
    key: 'creditLimit',
    label: 'Credit Limit',
    type: 'number',
    aliases: ['Credit Limit', 'creditLimit', 'credit_limit', 'Credit'],
    exampleValue: 500000,
    description: 'Credit limit in INR (default: 0)'
  },
  {
    key: 'paymentTerms',
    label: 'Payment Terms',
    aliases: ['Payment Terms', 'paymentTerms', 'payment_terms', 'Terms'],
    exampleValue: 'Net 30',
    description: 'Payment terms (e.g. Net 30, Net 60, Immediate)'
  },
  {
    key: 'taxCategory',
    label: 'Tax Category',
    aliases: ['Tax Category', 'taxCategory', 'tax_category'],
    exampleValue: 'Standard Rate',
    description: 'Tax category (default: Standard Rate)'
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

export const CUSTOMER_IMPORT_SAMPLE_DATA: Record<string, any>[] = [
  {
    'Customer Name': 'Shreeji Polymers Ltd',
    'Customer Type': 'Company',
    'Customer Group': 'Commercial',
    'Territory': 'India',
    'Contact Person': 'Ramesh Shah',
    'Phone / Contact': '+91 9825012345',
    'Email': 'purchase@shreejipolymers.com',
    'GST Number': '24AABCS1429B1Z2',
    'Tax ID / PAN': 'AABCS1429B',
    'Address': 'Survey No. 128, NH-8, Ankleshwar GIDC',
    'City': 'Ankleshwar',
    'State': 'Gujarat',
    'Postal Code': '393002',
    'Country': 'India',
    'Credit Limit': 1000000,
    'Payment Terms': 'Net 30',
    'Tax Category': 'Standard Rate',
    'Disabled': 'No'
  },
  {
    'Customer Name': 'Apex Box Manufacturing',
    'Customer Type': 'Company',
    'Customer Group': 'Commercial',
    'Territory': 'India',
    'Contact Person': 'Vikram Mehta',
    'Phone / Contact': '+91 9426098765',
    'Email': 'orders@apexbox.in',
    'GST Number': '24AAACA5567C1Z8',
    'Tax ID / PAN': 'AAACA5567C',
    'Address': 'Plot 12, Sector 3, Sanand Industrial Area',
    'City': 'Sanand',
    'State': 'Gujarat',
    'Postal Code': '382110',
    'Country': 'India',
    'Credit Limit': 500000,
    'Payment Terms': 'Net 30',
    'Tax Category': 'Standard Rate',
    'Disabled': 'No'
  },
  {
    'Customer Name': 'Krishna Logistics & Cargo',
    'Customer Type': 'Company',
    'Customer Group': 'Commercial',
    'Territory': 'India',
    'Contact Person': 'Nilesh Patel',
    'Phone / Contact': '+91 9909011223',
    'Email': 'stores@krishnalogistics.com',
    'GST Number': '',
    'Tax ID / PAN': '',
    'Address': 'Godown No 5, Bhiwandi Highway',
    'City': 'Bhiwandi',
    'State': 'Maharashtra',
    'Postal Code': '421302',
    'Country': 'India',
    'Credit Limit': 750000,
    'Payment Terms': 'Immediate',
    'Tax Category': 'Standard Rate',
    'Disabled': 'No'
  }
];
