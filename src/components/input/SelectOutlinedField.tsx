import React from 'react';
import { FormControl, FormHelperText, InputAdornment, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { FormikContext } from 'formik';

export interface ISelectOption {
  label: string;
  value: string | number;
}

export interface ISelectField<T = any> {
  options: Array<ISelectOption>;
  name?: string;
  value?: any;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  size?: 'small' | 'medium';
  sx?: any;
  startIcon?: React.ReactNode;
  onChange?: (value: any, event?: SelectChangeEvent<string | number>) => void;
  children?: React.ReactNode;
}

export const SelectOutlinedField = <T extends {}>({
  name,
  value: controlledValue,
  options,
  disabled = false,
  placeholder,
  label,
  size = 'small',
  sx = {},
  startIcon,
  onChange,
  children
}: ISelectField<T>) => {
  const formik = React.useContext<any>(FormikContext);
  const isFormikControlled = Boolean(formik && name && controlledValue === undefined);
  const formikField = isFormikControlled && name ? formik.getFieldProps(name) : null;
  const formikMeta = isFormikControlled && name ? formik.getFieldMeta(name) : null;

  const value = controlledValue !== undefined
    ? controlledValue
    : (formikField && formikField.value !== undefined && formikField.value !== null ? formikField.value : '');

  const [isOpen, setIsOpen] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const hasValue = value !== undefined && value !== null && value !== '';
  const hasStartAdornment = Boolean(startIcon);
  const isShrunk = Boolean(hasValue || isOpen || isFocused || hasStartAdornment);

  const uniqueId = React.useId();
  const labelId = label ? `${name || uniqueId}-label` : undefined;
  const selectId = `${name || uniqueId}-select`;

  const handleChange = (event: SelectChangeEvent<string | number>) => {
    if (isFormikControlled && name && formik) {
      formik.setFieldValue(name, event.target.value);
    }
    if (onChange) {
      onChange(event.target.value, event);
    }
  };

  const hasError = Boolean(formikMeta && formikMeta.touched && formikMeta.error);
  const errorText = formikMeta && formikMeta.touched && formikMeta.error ? String(formikMeta.error) : '';

  return (
    <FormControl
      fullWidth
      error={hasError}
      size={size}
      disabled={disabled}
      sx={{
        '& .MuiInputLabel-root': {
          color: '#4b5563',
          fontWeight: 500,
          fontSize: '0.875rem',
          '&.Mui-focused': {
            color: '#059669'
          },
          ...(hasStartAdornment ? {
            '&:not(.MuiInputLabel-shrink)': {
              transform: 'translate(36px, 9px) scale(1)'
            }
          } : {})
        },
        '& .MuiOutlinedInput-root': {
          borderRadius: '10px',
          backgroundColor: '#ffffff',
          fontSize: '0.875rem',
          fontWeight: 500,
          '& fieldset': {
            borderColor: '#e5e7eb'
          },
          '&:hover fieldset': {
            borderColor: '#cbd5e1'
          },
          '&.Mui-focused fieldset': {
            borderColor: '#059669'
          }
        },
        '& .MuiSelect-select': {
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#111827',
          py: '8.5px !important'
        },
        ...sx
      }}
    >
      {label && (
        <InputLabel id={labelId} shrink={isShrunk}>
          {label}
        </InputLabel>
      )}
      <Select
        labelId={labelId}
        label={label}
        id={selectId}
        value={value !== undefined && value !== null ? value : ''}
        onChange={handleChange}
        onOpen={() => setIsOpen(true)}
        onClose={() => setIsOpen(false)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        notched={isShrunk}
        startAdornment={
          startIcon ? (
            <InputAdornment position="start" sx={{ mr: 0.5, color: '#059669', flexShrink: 0 }}>
              {startIcon}
            </InputAdornment>
          ) : undefined
        }
        sx={{ minWidth: '150px' }}
      >
        {placeholder && (
          <MenuItem value="" disabled sx={{ color: '#9e9e9e' }}>
            {placeholder}
          </MenuItem>
        )}
        {options.map(option => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
        {children}
      </Select>
      {hasError && errorText && <FormHelperText>{errorText}</FormHelperText>}
    </FormControl>
  );
};

export default SelectOutlinedField;
