import React from 'react';
import { FormControl, FormHelperText, InputLabel, MenuItem, Select, type SelectChangeEvent } from '@mui/material';
import { useField, useFormikContext } from 'formik';

export interface ISelectOption {
  label: string;
  value: string | number;
}

export interface ISelectField<T = any> {
  options: Array<ISelectOption>;
  name: string;
  disabled?: boolean;
  placeholder?: string;
  label?: string;
  size?: 'small' | 'medium';
  sx?: any;
  onChange?: (value: string | number) => void;
  children?: React.ReactNode;
}

export const SelectOutlinedField = <T extends {}>({
  name,
  options,
  disabled = false,
  placeholder,
  label,
  size = 'small',
  sx = {},
  onChange,
  children
}: ISelectField<T>) => {
  const { setFieldValue } = useFormikContext<T>();
  const [field, meta] = useField(name.toString());

  const labelId = label ? `${name}-select-label` : undefined;
  const selectId = `${name}-select`;

  const handleChange = (event: SelectChangeEvent<string | number>) => {
    setFieldValue(name, event.target.value);
    onChange && onChange(event.target.value);
  };

  return (
    <FormControl
      fullWidth
      error={Boolean(meta.touched && meta.error)}
      size={size}
      disabled={disabled}
      sx={sx}
    >
      {label && <InputLabel id={labelId}>{label}</InputLabel>}
      <Select
        labelId={labelId}
        label={label}
        id={selectId}
        value={field.value !== undefined && field.value !== null ? field.value : ''}
        onChange={handleChange}
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
      {meta.touched && meta.error && <FormHelperText>{meta.error}</FormHelperText>}
    </FormControl>
  );
};

export default SelectOutlinedField;
