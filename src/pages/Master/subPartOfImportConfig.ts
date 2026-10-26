import { type BulkImportColumn } from '../../components/ERPList';

export const SUB_PART_OF_IMPORT_COLUMNS: BulkImportColumn[] = [
  {
    key: 'name',
    label: 'Sub Part Of Name',
    required: true,
    aliases: ['sub_part_of_name', 'subPartOfName', 'subPartOf', 'sub_part_of', 'Sub Part Of', 'Name', 'name'],
    exampleValue: 'PP Strap',
    description: 'Sub-part classification (e.g. PP Strap, PET Strap, Paper Core 200mm, Metal Clip)'
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

export const SUB_PART_OF_IMPORT_SAMPLE_DATA: Record<string, any>[] = [
  { 'Sub Part Of Name': 'PP Strap', 'Disabled': 'No' },
  { 'Sub Part Of Name': 'PET Strap', 'Disabled': 'No' },
  { 'Sub Part Of Name': 'Paper Core 200mm', 'Disabled': 'No' },
  { 'Sub Part Of Name': 'Serrated Metal Clip', 'Disabled': 'No' },
  { 'Sub Part Of Name': 'Plain Metal Clip', 'Disabled': 'No' },
  { 'Sub Part Of Name': 'Plastic Strap Seal', 'Disabled': 'No' }
];
