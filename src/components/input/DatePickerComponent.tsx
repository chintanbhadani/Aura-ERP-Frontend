import React from 'react';
import { TextFieldComponent } from './TextFieldComponent';

export interface DatePickerComponentProps {
  name: string;
  label?: string;
  onChange?: (date: string) => void;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
  sx?: any;
  helperText?: string;
  placeholder?: string;
  required?: boolean;
}

export const DatePickerComponent: React.FC<DatePickerComponentProps> = ({
  name,
  label,
  onChange,
  disabled = false,
  fullWidth = true,
  size = 'small',
  sx = {},
  helperText,
  placeholder,
  required
}) => {
  return (
    <TextFieldComponent
      type="date"
      name={name}
      label={label}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      placeholder={placeholder}
      required={required}
      helperText={helperText}
      sx={{
        '& input[type="date"]::-webkit-calendar-picker-indicator': {
          cursor: 'pointer',
          opacity: 0.7,
          transition: 'opacity 0.2s',
          '&:hover': {
            opacity: 1,
          }
        },
        ...sx
      }}
      onChange={(e: any) => {
        const val = e?.target ? e.target.value : e;
        onChange && onChange(val);
      }}
    />
  );
};

export default DatePickerComponent;
