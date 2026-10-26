import { type BulkImportColumn } from '../../components/ERPList';

export const CATEGORY_IMPORT_COLUMNS: BulkImportColumn[] = [
  {
    key: 'name',
    label: 'Item Group Name',
    required: true,
    aliases: ['category_name', 'categoryName', 'category', 'item_group', 'itemGroup', 'Name', 'Category', 'item_group_name', 'Item Group Name'],
    exampleValue: 'STRAP ROLLS',
    description: 'Item group name (e.g. STRAP ROLLS, PACKING CLIPS, PET RESIN)'
  },
  {
    key: 'disabled',
    label: 'Disabled',
    type: 'boolean',
    aliases: ['is_disabled', 'isDisabled'],
    exampleValue: 'No',
    description: 'Yes or No (defaults to No)'
  }
];

export const CATEGORY_IMPORT_SAMPLE_DATA: Record<string, any>[] = [
  { 'Item Group Name': 'STRAP ROLLS', 'Disabled': 'No' },
  { 'Item Group Name': 'PACKING CLIPS', 'Disabled': 'No' },
  { 'Item Group Name': 'PET RESIN', 'Disabled': 'No' },
  { 'Item Group Name': 'COLOR MASTERBATCH', 'Disabled': 'No' },
  { 'Item Group Name': 'CARTON BOXES', 'Disabled': 'No' },
  { 'Item Group Name': 'TOOLING SPARES', 'Disabled': 'No' }
];
