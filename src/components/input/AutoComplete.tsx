import React, { memo, useMemo, useState, useEffect, useCallback } from 'react';
import { Autocomplete, Box, TextField, createFilterOptions, type FilterOptionsState } from '@mui/material';
import { useField, useFormikContext } from 'formik';
import { Plus } from 'lucide-react';
import dataService from '../../axios/dataService';

export interface ReusableAutocompleteProps<T> {
  // Required props
  keyName: string;
  getOptionLabel: (option: any) => string;

  // Optional data props
  options?: T[];
  defaultOptions?: T[];
  apiEndpoint?: string;
  filterPayload?: any;
  searchKey?: string;
  refreshKey?: number | string;
  optionKey?: string;
  getOptions?: (data: any) => void;
  compareKey?: string;

  // UI & Formik props
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
  creatable?: boolean;
  onCreate?: (inputValue: string) => Promise<T | void> | T | void;
  startIcon?: React.ReactNode;
  renderOption?: (props: React.HTMLAttributes<HTMLLIElement>, option: T, state?: any) => React.ReactNode;
}

const defaultFilter = createFilterOptions<any>();

export const ReusableAutocomplete = <T extends { id?: string | number }>({
  keyName,
  options = [],
  defaultOptions = [],
  getOptionLabel,
  apiEndpoint,
  filterPayload,
  searchKey,
  refreshKey,
  optionKey = 'items',
  getOptions,
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
  startIcon,
  renderOption,
}: ReusableAutocompleteProps<T>) => {
  const { setFieldValue, submitCount } = useFormikContext<any>();
  const [field, meta] = useField(keyName);
  const [inputValue, setInputValue] = useState<string>('');
  const [fetchedOptions, setFetchedOptions] = useState<T[]>(defaultOptions.length > 0 ? defaultOptions : options);
  const [apiLoading, setApiLoading] = useState<boolean>(false);

  // Sync initial options when no apiEndpoint is passed
  useEffect(() => {
    if (!apiEndpoint) {
      setFetchedOptions(options.length > 0 ? options : defaultOptions);
    }
  }, [options, defaultOptions, apiEndpoint]);

  // Debounced fetch when apiEndpoint is provided
  useEffect(() => {
    if (!apiEndpoint) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      try {
        setApiLoading(true);
        const params: Record<string, any> = { ...(filterPayload || {}) };
        if (searchKey && inputValue) {
          params[searchKey] = inputValue;
        }

        const res = await dataService.get(apiEndpoint, { params });
        if (!isMounted) return;

        const data = res?.data;
        getOptions && getOptions(data);

        // Resolve data from common payload structures:
        let resolvedList: T[] = [];
        if (optionKey && Array.isArray(data?.[optionKey])) {
          resolvedList = data[optionKey];
        } else if (optionKey && Array.isArray(data?.data?.[optionKey])) {
          resolvedList = data.data[optionKey];
        } else if (Array.isArray(data?.data)) {
          resolvedList = data.data;
        } else if (Array.isArray(data?.items)) {
          resolvedList = data.items;
        } else if (Array.isArray(data)) {
          resolvedList = data;
        }

        setFetchedOptions(resolvedList || []);
      } catch (err) {
        console.error(`Error fetching options from ${apiEndpoint}:`, err);
      } finally {
        if (isMounted) setApiLoading(false);
      }
    }, searchKey && inputValue ? 400 : 0);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [apiEndpoint, refreshKey, JSON.stringify(filterPayload), searchKey ? inputValue : undefined]);

  const activeOptions = apiEndpoint ? fetchedOptions : (options.length > 0 ? options : fetchedOptions);
  const isComponentLoading = loading || apiLoading;

  interface OptionType {
    id?: string | number;
    [key: string]: any;
  }

  // Selected value with dummy fallback for pending or paginated records
  const selectedValue = useMemo(() => {
    if (multiple) {
      const selected =
        activeOptions?.filter(option => {
          if (!Array.isArray(field.value)) return false;
          const optVal = (option as OptionType)[compareKey] ?? (option as OptionType).id;
          return field.value.some((v: any) => v === optVal || (v !== undefined && optVal !== undefined && String(v) === String(optVal)));
        }) || [];

      if (Array.isArray(field.value)) {
        field.value.forEach((val: any) => {
          const valToMatch = typeof val === 'object' && val !== null
            ? ((val as any)[compareKey] ?? (val as any).id)
            : val;
          const exists = selected.some(option => {
            const optVal = (option as OptionType)[compareKey] ?? (option as OptionType).id;
            return optVal === valToMatch || (optVal !== undefined && valToMatch !== undefined && String(optVal) === String(valToMatch));
          });
          if (!exists && valToMatch) {
            const dummyOption: any = typeof val === 'object' && val !== null ? val : { id: valToMatch, [compareKey]: valToMatch, name: String(valToMatch) };
            selected.push(dummyOption);
          }
        });
      }
      return selected;
    }

    if (field.value === undefined || field.value === null || field.value === '') {
      return null;
    }

    const valToMatch = typeof field.value === 'object' && field.value !== null
      ? ((field.value as any)[compareKey] ?? (field.value as any).id ?? (field.value as any).name)
      : field.value;

    const found = activeOptions?.find(option => {
      const optVal = (option as OptionType)[compareKey] ?? (option as OptionType).id;
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

    if (field.value) {
      const dummyOption: any = { id: field.value, [compareKey]: field.value, name: String(field.value) };
      return dummyOption;
    }

    return null;
  }, [activeOptions, field.value, multiple, compareKey]);

  const customFilterOptions = (rawOptions: T[], params: FilterOptionsState<T>) => {
    const filtered = filterOptions ? filterOptions(rawOptions, params) : defaultFilter(rawOptions, params);
    const { inputValue: query } = params;

    if (creatable && query && query.trim() !== '') {
      const isExisting = rawOptions.some(opt => {
        const optLabel = getOptionLabel(opt);
        return optLabel?.trim().toLowerCase() === query.trim().toLowerCase();
      });

      if (!isExisting) {
        filtered.push({
          [compareKey]: `__new__:${query.trim()}`,
          name: query.trim(),
          inputValue: query.trim(),
          isNew: true,
        } as any);
      }
    }

    return filtered;
  };

  const resolvedNoOptionsText = noOptionsText ?? (
    activeOptions.length === 0 ? (
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
    ) : (
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
        options={activeOptions}
        getOptionLabel={(option) => {
          if (!option) return '';
          if (typeof option === 'string') return option;
          if ((option as any)?.inputValue) return (option as any).inputValue;
          if ((option as any)?.isNew) return (option as any).name || '';
          if (getOptionLabel) {
            const labelStr = getOptionLabel(option);
            if (labelStr !== undefined && labelStr !== null && labelStr !== '') return labelStr;
          }
          return (option as any)?.name || (option as any)?.title || (option as any)?.label || (option as any)?.[compareKey] || String((option as any)?.id || '');
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
        onInputChange={(_, val) => setInputValue(val || '')}
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

          // Handle freeSolo string input directly
          if (typeof newValue === 'string' && creatable) {
            const existing = activeOptions.find(opt => getOptionLabel(opt)?.trim().toLowerCase() === newValue.trim().toLowerCase());
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
        loading={isComponentLoading}
        loadingText={loadingText}
        noOptionsText={resolvedNoOptionsText}
        disabled={disabled}
        renderOption={(props, option, state) => {
          const { key, ...optionProps } = props;
          if ((option as any)?.isNew) {
            return (
              <li key={key} {...optionProps}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, color: '#059669', fontWeight: 600 }}>
                  <Plus size={16} />
                  <span>Add &quot;{(option as any).inputValue || (option as any).name}&quot;</span>
                </Box>
              </li>
            );
          }
          if (renderOption) {
            return renderOption(props, option, state);
          }
          return (
            <li key={key} {...optionProps}>
              {getOptionLabel ? getOptionLabel(option) : ((option as any).name || (option as any).title || (option as any)[compareKey])}
            </li>
          );
        }}
        renderInput={params => {
          const isTouched = Boolean(meta.touched || (submitCount && submitCount > 0));
          const hasError = Boolean(isTouched && meta.error);

          return (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              size={size}
              error={hasError}
              helperText={hasError && meta.error ? String(meta.error) : ''}
              slotProps={{
                ...params.slotProps,
                input: {
                  ...params.slotProps?.input,
                  startAdornment: (
                    <>
                      {startIcon && (
                        <Box sx={{ display: 'flex', alignItems: 'center', mr: 0.5, color: '#059669', flexShrink: 0 }}>
                          {startIcon}
                        </Box>
                      )}
                      {params.slotProps?.input?.startAdornment}
                    </>
                  ),
                },
                inputLabel: params.slotProps?.inputLabel
              }}
              sx={{
                width: '100%',
                '& .MuiInputLabel-root': {
                  color: '#4b5563',
                  fontWeight: 500,
                  fontSize: '0.875rem',
                  '&.Mui-focused': {
                    color: hasError ? '#ef4444' : '#059669'
                  },
                  '&.Mui-error': {
                    color: '#ef4444 !important'
                  }
                },
                '& .MuiOutlinedInput-root': {
                  borderRadius: '10px',
                  backgroundColor: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  '& fieldset': {
                    borderColor: hasError ? '#ef4444 !important' : '#e5e7eb'
                  },
                  '&:hover fieldset': {
                    borderColor: hasError ? '#dc2626 !important' : '#cbd5e1'
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: hasError ? '#ef4444 !important' : '#059669'
                  },
                  '&.Mui-error fieldset': {
                    borderColor: '#ef4444 !important'
                  },
                  '&.Mui-error:hover fieldset': {
                    borderColor: '#dc2626 !important'
                  },
                  '&.Mui-error.Mui-focused fieldset': {
                    borderColor: '#ef4444 !important'
                  }
                },
                '& .MuiInputBase-input': {
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  color: '#111827'
                },
                '& .MuiFormHelperText-root': {
                  marginLeft: '4px',
                  marginRight: '4px',
                  marginTop: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  '&.Mui-error': {
                    color: '#ef4444 !important'
                  }
                }
              }}
            />
          );
        }}
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
  error = false,
  helperText,
  onBlur,
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
  error?: boolean;
  helperText?: React.ReactNode;
  onBlur?: (e: any) => void;
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
      onBlur={onBlur}
      sx={{
        width: '100%',
        '& .MuiInputLabel-root': {
          color: '#4b5563',
          fontWeight: 500,
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: error ? '#ef4444' : '#059669'
          },
          '&.Mui-error': {
            color: '#ef4444 !important'
          }
        },
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#111827',
          backgroundColor: '#ffffff',
          '& fieldset': {
            borderColor: error ? '#ef4444 !important' : '#e5e7eb',
          },
          '&:hover fieldset': {
            borderColor: error ? '#dc2626 !important' : '#cbd5e1',
          },
          '&.Mui-focused fieldset': {
            borderColor: error ? '#ef4444 !important' : '#059669',
          },
          '&.Mui-error fieldset': {
            borderColor: '#ef4444 !important'
          },
          '&.Mui-error:hover fieldset': {
            borderColor: '#dc2626 !important'
          },
          '&.Mui-error.Mui-focused fieldset': {
            borderColor: '#ef4444 !important'
          }
        },
        '& .MuiInputBase-input': {
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#111827'
        },
        '& .MuiFormHelperText-root': {
          marginLeft: '4px',
          marginRight: '4px',
          marginTop: '4px',
          fontSize: '0.75rem',
          fontWeight: 500,
          '&.Mui-error': {
            color: '#ef4444 !important'
          }
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
          error={error}
          helperText={helperText}
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
