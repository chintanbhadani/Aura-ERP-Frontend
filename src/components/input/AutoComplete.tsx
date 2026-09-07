import React, { memo, useMemo, useState } from 'react';
import { Autocomplete, Box, TextField, type FilterOptionsState } from '@mui/material';
import { useField, useFormikContext } from 'formik';

export interface ReusableAutocompleteProps<T> {
  keyName: string;
  options?: T[];
  getOptionLabel: (option: any) => string;
  isTitleVisible?: boolean;
  placeholder?: string;
  label?: string;
  size?: 'small' | 'medium';
  sx?: any;
  disabled?: boolean;
  multiple?: boolean;
  filterOptions?: (options: T[], state: FilterOptionsState<T>) => T[];
  noOptionsText?: string;
  loadingText?: string;
  loading?: boolean;
  onChange?: (value: T | T[] | null) => void;
  compareKey?: string;
}

export const ReusableAutocomplete = <T extends { id?: string | number }>({
  keyName,
  options = [],
  getOptionLabel,
  placeholder = 'Select an option',
  label,
  size = 'small',
  sx = { width: '100%' },
  disabled = false,
  multiple = false,
  filterOptions,
  noOptionsText = 'No options',
  loadingText = 'Loading...',
  loading = false,
  onChange,
  compareKey = 'id'
}: ReusableAutocompleteProps<T>) => {
  const [inputValue, setInputValue] = useState<string>('');
  const { setFieldValue } = useFormikContext<any>();
  const [field, meta] = useField(keyName);

  const selectedValue = useMemo(() => {
    if (multiple) {
      const selected =
        options?.filter(option =>
          Array.isArray(field.value) ? field.value.includes((option as any)[compareKey]) : false
        ) || [];

      if (Array.isArray(field.value)) {
        field.value.forEach((val: any) => {
          const exists = selected.some(option => (option as any)[compareKey] === val);
          if (!exists && val) {
            const dummyOption: any = { [compareKey]: val };
            selected.push(dummyOption);
          }
        });
      }
      return selected;
    }

    const found = options?.find(option => (option as any)[compareKey] === field.value) || null;
    if (!found && field.value) {
      const dummyOption: any = { [compareKey]: field.value };
      return dummyOption;
    }
    return found;
  }, [options, field.value, multiple, compareKey]);

  return (
    <Box sx={{ ...sx }}>
      <Autocomplete
        multiple={multiple}
        options={options}
        getOptionLabel={getOptionLabel}
        value={selectedValue}
        getOptionKey={option => (option as any)[compareKey] ?? (option as any).id}
        onChange={(_, newValue) => {
          if (multiple) {
            const newIds = Array.isArray(newValue) ? newValue.map(item => (item as any)[compareKey] ?? (item as any).id) : [];
            setFieldValue(keyName, newIds);
            onChange && onChange(newValue);
          } else {
            const newId = ((newValue as any)?.[compareKey] ?? (newValue as any)?.id) || '';
            setFieldValue(keyName, newId);
            onChange && onChange(newValue);
          }
        }}
        inputValue={inputValue || ''}
        onInputChange={(_, newInputValue) => {
          setInputValue(newInputValue || '');
        }}
        loading={loading}
        loadingText={loadingText}
        noOptionsText={noOptionsText}
        filterOptions={filterOptions}
        disabled={disabled}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            size={size}
            error={Boolean(meta.touched && meta.error)}
            helperText={meta.touched ? meta.error : ''}
            sx={{ width: '100%' }}
          />
        )}
      />
    </Box>
  );
};

export default memo(ReusableAutocomplete);
