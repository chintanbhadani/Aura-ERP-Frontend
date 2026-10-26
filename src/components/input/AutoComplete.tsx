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
  noOptionsText?: React.ReactNode;
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
  const [inputValue, setInputValue] = React.useState('');

  const selectedValue = useMemo(() => {
    if (multiple) {
      return (
        options?.filter(option => {
          if (!Array.isArray(field.value)) return false;
          const optVal = (option as any)[compareKey] ?? (option as any).id;
          return field.value.some((v: any) => v === optVal || (v !== undefined && optVal !== undefined && String(v) === String(optVal)));
        }) || []
      );
    }

    if (field.value === undefined || field.value === null || field.value === '') {
      return null;
    }

    const valToMatch = typeof field.value === 'object' && field.value !== null
      ? ((field.value as any)[compareKey] ?? (field.value as any).id ?? (field.value as any).name)
      : field.value;

    const found = options?.find(option => {
      const optVal = (option as any)[compareKey] ?? (option as any).id;
      if (optVal === valToMatch) return true;
      if (optVal !== undefined && valToMatch !== undefined && String(optVal) === String(valToMatch)) return true;
      if (typeof option === 'object' && option !== null && (option as any).name) {
        if (String((option as any).name).toLowerCase() === String(valToMatch).toLowerCase()) return true;
      }
      return false;
    }) || null;

    if (found) return found;

    if (typeof field.value === 'object' && field.value !== null) {
      return field.value;
    }

    return null;
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

  // Context-aware empty-state message
  const resolvedNoOptionsText = noOptionsText ?? (
    options.length === 0
      ? (
        <Box sx={{ py: 1.5, px: 1, textAlign: 'center' }}>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
            No data available
          </Box>
          {creatable && (
            <Box sx={{ fontSize: 12, color: 'text.disabled' }}>
              Type to add a new entry
            </Box>
          )}
        </Box>
      )
      : (
        <Box sx={{ py: 1.5, px: 1, textAlign: 'center' }}>
          <Box sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
            No matching results
          </Box>
          {creatable && (
            <Box sx={{ fontSize: 12, color: 'text.disabled' }}>
              Type to add a new entry
            </Box>
          )}
        </Box>
      )
  );

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
          const optId = (option as any)[compareKey] ?? (option as any).id ?? (option as any).name;
          const valId = (val as any)[compareKey] ?? (val as any).id ?? (val as any).name ?? val;
          return optId === valId || (optId !== undefined && valId !== undefined && String(optId) === String(valId));
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
        inputValue={inputValue}
        onInputChange={(_, val) => setInputValue(val)}
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
        noOptionsText={resolvedNoOptionsText}
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
            slotProps={params.slotProps}
            sx={{ width: '100%' }}
          />
        )}
      />
    </Box>
  );
};

export const StandaloneAutocomplete = <T extends Record<string, any>>({
  value,
  onChange,
  options = [],
  getOptionLabel,
  renderOptionLabel,
  placeholder = 'Select an option',
  label,
  disabled = false,
  size = 'small',
  filterOptions,
  sx = { width: '100%' },
  creatable = false,
  onCreate,
  noOptionsText,
  startIcon,
}: {
  value: T | null;
  onChange: (value: T | null) => void;
  options: T[];
  getOptionLabel: (option: T) => string;
  renderOptionLabel?: (option: T) => React.ReactNode;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
  filterOptions?: (options: T[], state: FilterOptionsState<T>) => T[];
  sx?: any;
  creatable?: boolean;
  onCreate?: (inputValue: string) => Promise<T | void> | T | void;
  noOptionsText?: React.ReactNode;
  startIcon?: React.ReactNode;
}) => {
  const [inputValue, setInputValue] = React.useState('');

  const customDefaultFilter = createFilterOptions<T>({
    matchFrom: 'any',
    ignoreCase: true,
    stringify: (option) => {
      if (!option) return '';
      if (typeof option === 'string') return option;
      const labelStr = getOptionLabel ? getOptionLabel(option) : '';
      const fieldsStr = Object.values(option)
        .filter(v => typeof v === 'string' || typeof v === 'number')
        .join(' ');
      return `${labelStr} ${fieldsStr}`;
    },
  });

  const customFilterOptions = (rawOptions: T[], params: FilterOptionsState<T>) => {
    const filtered = filterOptions ? filterOptions(rawOptions, params) : customDefaultFilter(rawOptions, params);
    const { inputValue: query } = params;

    if (creatable && query && query.trim() !== '') {
      const isExisting = rawOptions.some(opt => {
        const optLabel = getOptionLabel(opt);
        return optLabel?.trim().toLowerCase() === query.trim().toLowerCase();
      });

      if (!isExisting) {
        filtered.push({
          itemName: query.trim(),
          name: query.trim(),
          inputValue: query.trim(),
          isNew: true,
        } as any);
      }
    }

    return filtered;
  };

  return (
    <Autocomplete<T, false, false, boolean>
      value={value}
      inputValue={inputValue}
      onInputChange={(_, newInputValue) => setInputValue(newInputValue)}
      onChange={async (_, newValue: any) => {
        if (!newValue) {
          onChange(null);
          return;
        }

        if (creatable && newValue?.isNew) {
          const newName = newValue.inputValue || newValue.itemName || newValue.name;
          if (onCreate) {
            const createdItem = await onCreate(newName);
            if (createdItem) {
              onChange(createdItem);
            }
          }
          return;
        }

        if (typeof newValue === 'string' && creatable) {
          if (onCreate && newValue.trim() !== '') {
            const createdItem = await onCreate(newValue.trim());
            if (createdItem) {
              onChange(createdItem);
            }
          }
          return;
        }

        onChange(newValue as T);
      }}
      options={options}
      getOptionLabel={(opt) => {
        if (typeof opt === 'string') return opt;
        if ((opt as any)?.inputValue) return (opt as any).inputValue;
        if ((opt as any)?.isNew) return (opt as any).itemName || (opt as any).name || '';
        return opt ? getOptionLabel(opt) : '';
      }}
      filterOptions={customFilterOptions}
      isOptionEqualToValue={(option, val) => {
        if (!option || !val) return false;
        if (typeof val === 'string') return getOptionLabel(option) === val;
        if ((option as any).id && (val as any).id) return (option as any).id === (val as any).id;
        if ((option as any).itemCode && (val as any).itemCode) return (option as any).itemCode === (val as any).itemCode;
        return getOptionLabel(option) === getOptionLabel(val as T);
      }}
      disabled={disabled}
      size={size}
      openOnFocus
      autoHighlight
      freeSolo={creatable}
      noOptionsText={
        noOptionsText || (
          <Box sx={{ py: 1.5, px: 1, textAlign: 'center' }}>
            <Box sx={{ fontSize: 13, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>
              No matching items
            </Box>
            {creatable && (
              <Box sx={{ fontSize: 12, color: '#059669', fontWeight: 600 }}>
                Type to add as new item
              </Box>
            )}
          </Box>
        )
      }
      sx={{
        width: '100%',
        '& .MuiInputLabel-root': {
          color: '#4b5563',
          fontWeight: 500,
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: '#059669'
          }
        },
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#111827',
          backgroundColor: '#ffffff',
          '& fieldset': {
            borderColor: '#e5e7eb',
          },
          '&:hover fieldset': {
            borderColor: '#cbd5e1',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#059669',
          },
        },
        '& .MuiInputBase-input': {
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#111827'
        },
        ...sx,
      }}
      renderOption={(props, option) => {
        const { key, ...optionProps } = props;
        if ((option as any)?.isNew) {
          return (
            <Box
              component="li"
              key={key}
              {...optionProps}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                py: 1.2,
                px: 1.5,
                color: '#059669',
                fontWeight: 700,
                cursor: 'pointer',
                backgroundColor: '#f0fdf4 !important',
                borderTop: '1px dashed #a7f3d0',
                '&:hover': {
                  backgroundColor: '#dcfce7 !important',
                }
              }}
            >
              <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Plus size={14} className="stroke-[3]" />
              </div>
              <div>
                <span className="text-xs font-black text-emerald-900 block">
                  + Add &quot;{(option as any).inputValue || (option as any).itemName || (option as any).name}&quot;
                </span>
                <span className="text-[10px] text-emerald-700 font-semibold block">
                  Create as new item in dropdown
                </span>
              </div>
            </Box>
          );
        }

        return (
          <Box component="li" key={key} {...optionProps} sx={{ fontSize: '0.75rem', fontWeight: 600, py: 1 }}>
            {renderOptionLabel ? renderOptionLabel(option) : getOptionLabel(option)}
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          size={size}
          variant="outlined"
          slotProps={{
            ...params.slotProps,
            input: {
              ...params.slotProps?.input,
              startAdornment: (
                <>
                  {startIcon && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.75, color: '#059669', flexShrink: 0 }}>
                      {startIcon}
                    </Box>
                  )}
                  {params.slotProps?.input?.startAdornment}
                </>
              ),
            },
            inputLabel: params.slotProps?.inputLabel
          }}
        />
      )}
    />
  );
};

export default memo(ReusableAutocomplete);
