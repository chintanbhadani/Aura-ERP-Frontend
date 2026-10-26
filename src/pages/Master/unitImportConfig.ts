import { type BulkImportColumn } from '../../components/ERPList';

export const UNIT_IMPORT_COLUMNS: BulkImportColumn[] = [
  {
    key: 'name',
    label: 'Unit Name',
    required: true,
    aliases: ['unit_name', 'unitName', 'unit', 'uom', 'Name', 'symbol', 'unit_of_measure'],
    exampleValue: 'Meter',
    description: 'Unit of measure name / symbol (e.g. kg, Pcs, Roll, Meter, Box, Pack, Ton)'
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

export const UNIT_IMPORT_SAMPLE_DATA: Record<string, any>[] = [
  { 'Unit Name': 'Meter', 'Disabled': 'No' },
  { 'Unit Name': 'Box', 'Disabled': 'No' },
  { 'Unit Name': 'Roll', 'Disabled': 'No' },
  { 'Unit Name': 'Pack', 'Disabled': 'No' },
  { 'Unit Name': 'Dozen', 'Disabled': 'No' },
  { 'Unit Name': 'Ton', 'Disabled': 'No' }
];
