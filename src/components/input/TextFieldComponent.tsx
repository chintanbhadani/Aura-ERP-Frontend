import React, { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { useField, useFormikContext } from 'formik';
import { Eye, EyeOff } from 'lucide-react';

export interface IOutlineTextField<T = any> {
  label?: string;
  name: string;
  type?: string;
  disabled?: boolean;
  max?: number;
  sx?: any;
  size?: 'small' | 'medium';
  onChange?: (val: any) => void;
  onBlur?: (e: any) => void;
  inputProps?: any;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
  helperText?: string;
}

export const TextFieldComponent = <T extends {}>({
  label,
  name,
  type = 'text',
  disabled = false,
  max = Infinity,
  sx = {},
  size = 'small',
  onChange,
  onBlur,
  inputProps,
  placeholder,
  multiline,
  rows,
  fullWidth = true,
  helperText,
  ...rest
}: IOutlineTextField<T> & Record<string, any>) => {
  const { setFieldValue, handleBlur } = useFormikContext<T>();
  const [field, meta] = useField(name.toString() ?? '');
  const [showPassword, setShowPassword] = useState(false);

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  const value = field.value;

  const isTextarea = type === 'textarea' || multiline;

  return (
    <TextField
      label={label}
      variant='outlined'
      type={type === 'password' ? (showPassword ? 'text' : 'password') : (isTextarea ? undefined : type)}
      multiline={isTextarea}
      rows={isTextarea ? (rows || 3) : undefined}
      name={name.toString() ?? ''}
      value={value !== undefined && value !== null ? value : ''}
      placeholder={placeholder}
      fullWidth={fullWidth}
      onChange={e => {
        const newValue = e.target.value;

        if (type === 'number') {
          const numberValue = parseFloat(newValue);
          if (newValue === '' || (!isNaN(numberValue) && numberValue >= 0 && numberValue <= max)) {
            setFieldValue(name as string, newValue);
            onChange && onChange(newValue);
          }
        } else {
          setFieldValue(name as string, newValue);
          onChange && onChange(newValue);
        }
      }}
      onBlur={(e) => {
        handleBlur(e);
        onBlur && onBlur(e);
      }}
      error={Boolean(meta.touched && meta.error)}
      helperText={meta.touched && meta.error ? meta.error : (helperText || '')}
      disabled={disabled}
      size={size}
      sx={{
        width: fullWidth ? '100%' : undefined,
        ...sx
      }}
      slotProps={{
        inputLabel: {
          shrink: true,
          ...(rest.slotProps?.inputLabel || rest.InputLabelProps || {})
        },
        htmlInput: {
          ...(type === 'number' ? { step: 'any' } : {}),
          ...inputProps
        },
        input: {
          ...(rest.slotProps?.input || rest.InputProps || {}),
          endAdornment:
            type === 'password' ? (
              <InputAdornment position='end'>
                <IconButton
                  size='small'
                  edge='end'
                  onClick={togglePasswordVisibility}
                  onMouseDown={e => e.preventDefault()}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </IconButton>
              </InputAdornment>
            ) : (rest.slotProps?.input?.endAdornment || rest.InputProps?.endAdornment || null)
        }
      }}
      {...rest}
    />
  );
};

export default TextFieldComponent;
