import { type BulkImportColumn } from '../../components/ERPList';

export const PART_OF_IMPORT_COLUMNS: BulkImportColumn[] = [
  {
    key: 'name',
    label: 'Part Of Name',
    required: true,
    aliases: ['part_of_name', 'partOfName', 'partOf', 'part_of', 'Part Of', 'Name', 'name'],
    exampleValue: 'Roll',
    description: 'Component Part Of classification (e.g. Roll, Clip, Core, Raw Material, Packaging)'
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

export const PART_OF_IMPORT_SAMPLE_DATA: Record<string, any>[] = [
  { 'Part Of Name': 'Roll', 'Disabled': 'No' },
  { 'Part Of Name': 'Clip', 'Disabled': 'No' },
  { 'Part Of Name': 'Paper Core', 'Disabled': 'No' },
  { 'Part Of Name': 'Plastic Seal', 'Disabled': 'No' },
  { 'Part Of Name': 'Raw Material', 'Disabled': 'No' },
  { 'Part Of Name': 'Packaging', 'Disabled': 'No' }
];
