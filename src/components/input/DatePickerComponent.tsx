import React from 'react';
import { TextField } from '@mui/material';
import { useField, useFormikContext } from 'formik';

export interface DatePickerComponentProps {
  name: string;
  label?: string;
  onChange?: (date: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  sx?: any;
  helperText?: string;
}

export const DatePickerComponent: React.FC<DatePickerComponentProps> = ({
  name,
  label,
  onChange,
  disabled = false,
  fullWidth = true,
  size = 'small',
  sx = {},
  helperText
}) => {
  const { setFieldValue } = useFormikContext<any>();
  const [field, meta] = useField(name);

  return (
    <TextField
      type="date"
      label={label}
      name={name}
      value={field.value || ''}
      onChange={(e) => {
        setFieldValue(name, e.target.value);
        onChange && onChange(e.target.value);
      }}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      slotProps={{
        inputLabel: {
          shrink: true
        }
      }}
      error={Boolean(meta.touched && meta.error)}
      helperText={meta.touched && meta.error ? meta.error : (helperText || '')}
      sx={sx}
    />
  );
};

export default DatePickerComponent;
