import React, { memo, useMemo } from 'react';
import { Autocomplete, Box, TextField, createFilterOptions, type FilterOptionsState } from '@mui/material';
import { useField, useFormikContext } from 'formik';
import { Plus } from 'lucide-react';

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
  creatable?: boolean;
  onCreate?: (inputValue: string) => Promise<T | void> | T | void;
}

const defaultFilter = createFilterOptions<any>();

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
  compareKey = 'id',
  creatable = false,
  onCreate,
}: ReusableAutocompleteProps<T>) => {
  const { setFieldValue } = useFormikContext<any>();
  const [field, meta] = useField(keyName);

  const selectedValue = useMemo(() => {
    if (multiple) {
      return (
        options?.filter(option =>
          Array.isArray(field.value) ? field.value.includes((option as any)[compareKey]) : false
        ) || []
      );
    }

    const found = options?.find(option => (option as any)[compareKey] === field.value) || null;
    return found;
  }, [options, field.value, multiple, compareKey]);

  const customFilterOptions = (rawOptions: T[], params: FilterOptionsState<T>) => {
    const filtered = filterOptions ? filterOptions(rawOptions, params) : defaultFilter(rawOptions, params);
    const { inputValue } = params;

    if (creatable && inputValue && inputValue.trim() !== '') {
      const isExisting = rawOptions.some(opt => {
        const optLabel = getOptionLabel(opt);
        return optLabel?.trim().toLowerCase() === inputValue.trim().toLowerCase();
      });

      if (!isExisting) {
        filtered.push({
          [compareKey]: `__new__:${inputValue.trim()}`,
          name: inputValue.trim(),
          inputValue: inputValue.trim(),
          isNew: true,
        } as any);
      }
    }

    return filtered;
  };

  return (
    <Box sx={{ ...sx }}>
      <Autocomplete
        multiple={multiple}
        options={options}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          if ((option as any)?.inputValue) return (option as any).inputValue;
          if ((option as any)?.isNew) return (option as any).name || '';
          return getOptionLabel ? getOptionLabel(option) : ((option as any)?.name || '');
        }}
        value={selectedValue}
        isOptionEqualToValue={(option, val) => {
          if (!val) return false;
          const optId = (option as any)[compareKey] ?? (option as any).id;
          const valId = (val as any)[compareKey] ?? (val as any).id ?? val;
          return optId === valId;
        }}
        getOptionKey={(option) => {
          if (typeof option === 'string') return option;
          return (option as any)[compareKey] ?? (option as any).id ?? (option as any).inputValue ?? Math.random();
        }}
        selectOnFocus
        clearOnBlur
        handleHomeEndKeys
        freeSolo={creatable}
        filterOptions={customFilterOptions}
        onChange={async (_, newValue) => {
          if (!newValue) {
            setFieldValue(keyName, multiple ? [] : '');
            onChange && onChange(null);
            return;
          }

          // Handle creatable item clicked / selected
          if (creatable && (newValue as any)?.isNew) {
            const newName = (newValue as any).inputValue || (newValue as any).name;
            if (onCreate) {
              const createdItem = await onCreate(newName);
              if (createdItem) {
                const newId = (createdItem as any)[compareKey] ?? (createdItem as any).id;
                setFieldValue(keyName, newId);
                onChange && onChange(createdItem);
              }
            }
            return;
          }

          // Handle freeSolo string input directly (e.g. pressing Enter on typed string)
          if (typeof newValue === 'string' && creatable) {
            const existing = options.find(opt => getOptionLabel(opt)?.trim().toLowerCase() === newValue.trim().toLowerCase());
            if (existing) {
              const id = (existing as any)[compareKey] ?? (existing as any).id;
              setFieldValue(keyName, id);
              onChange && onChange(existing);
              return;
            }

            if (onCreate && newValue.trim() !== '') {
              const createdItem = await onCreate(newValue.trim());
              if (createdItem) {
                const newId = (createdItem as any)[compareKey] ?? (createdItem as any).id;
                setFieldValue(keyName, newId);
                onChange && onChange(createdItem);
              }
            }
            return;
          }

          if (multiple) {
            const newIds = Array.isArray(newValue)
              ? (newValue as any[]).map(item => (item as any)[compareKey] ?? (item as any).id)
              : [];
            setFieldValue(keyName, newIds);
            onChange && onChange(newValue as any);
          } else {
            const newId = ((newValue as any)?.[compareKey] ?? (newValue as any)?.id) || '';
            setFieldValue(keyName, newId);
            onChange && onChange(newValue as any);
          }
        }}
        loading={loading}
        loadingText={loadingText}
        noOptionsText={noOptionsText}
        disabled={disabled}
        renderOption={(props, option) => {
          const { key, ...optionProps } = props;
          if ((option as any)?.isNew) {
            return (
              <li key={key} {...optionProps}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, color: 'primary.main', fontWeight: 600 }}>
                  <Plus size={16} />
                  <span>Add &quot;{(option as any).inputValue || (option as any).name}&quot;</span>
                </Box>
              </li>
            );
          }
          return (
            <li key={key} {...optionProps}>
              {getOptionLabel ? getOptionLabel(option) : (option as any).name}
            </li>
          );
        }}
        renderInput={params => (
          <TextField
            {...params}
            label={label}
            placeholder={placeholder}
            size={size}
            error={Boolean(meta.touched && meta.error)}
            helperText={meta.touched ? meta.error : ''}
            slotProps={{
              ...params.slotProps,
              inputLabel: {
                ...params.slotProps?.inputLabel,
                shrink: true,
              }
            }}
            sx={{ width: '100%' }}
          />
        )}
      />
    </Box>
  );
};

export default memo(ReusableAutocomplete);
