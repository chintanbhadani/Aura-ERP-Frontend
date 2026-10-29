import React, { useState } from 'react';
import { IconButton, InputAdornment, TextField } from '@mui/material';
import { FormikContext } from 'formik';
import { Eye, EyeOff } from 'lucide-react';

export interface IOutlineTextField<T = any> {
  label?: string;
  name?: string;
  value?: any;
  type?: string;
  disabled?: boolean;
  max?: number;
  sx?: any;
  size?: 'small' | 'medium';
  onChange?: (e: any) => void;
  onBlur?: (e: any) => void;
  inputProps?: any;
  InputProps?: any;
  InputLabelProps?: any;
  slotProps?: any;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
  helperText?: string;
  startIcon?: React.ReactNode;
  autoComplete?: string;
}

export const TextFieldComponent = <T extends {}>({
  label,
  name,
  value: controlledValue,
  type = 'text',
  disabled = false,
  max = Infinity,
  sx = {},
  size = 'small',
  onChange,
  onBlur,
  inputProps,
  InputProps: customInputProps,
  InputLabelProps: customInputLabelProps,
  slotProps: customSlotProps,
  placeholder,
  multiline,
  rows,
  fullWidth = true,
  helperText,
  startIcon,
  autoComplete = 'off',
  ...rest
}: IOutlineTextField<T> & Record<string, any>) => {
  const formik = React.useContext<any>(FormikContext);
  const [showPassword, setShowPassword] = useState(false);

  const isFormikControlled = Boolean(formik && name && controlledValue === undefined);
  const formikField = isFormikControlled && name ? formik.getFieldProps(name) : null;
  const formikMeta = formik && name ? formik.getFieldMeta(name) : null;

  const togglePasswordVisibility = () => setShowPassword(!showPassword);

  const value = controlledValue !== undefined
    ? controlledValue
    : (formikField && formikField.value !== undefined && formikField.value !== null ? formikField.value : '');

  const isTextarea = type === 'textarea' || multiline;

  const isTouched = Boolean(formikMeta && (formikMeta.touched || (formik && formik.submitCount > 0)));
  const hasError = Boolean((isTouched && formikMeta?.error) || rest.error);
  const displayHelperText = (isTouched && formikMeta?.error) ? String(formikMeta.error) : (helperText || '');

  return (
    <TextField
      label={label}
      variant='outlined'
      type={type === 'password' ? (showPassword ? 'text' : 'password') : (isTextarea ? undefined : type)}
      multiline={isTextarea}
      rows={isTextarea ? (rows || 3) : undefined}
      name={name ? name.toString() : (label ? label.toLowerCase().replace(/[^a-z0-9]/g, '_') : '')}
      value={value !== undefined && value !== null ? value : ''}
      placeholder={placeholder}
      fullWidth={fullWidth}
      disabled={disabled}
      size={size}
      autoComplete={autoComplete}
      onChange={e => {
        const rawVal = e && e.target ? e.target.value : e;
        let newValue = typeof rawVal === 'string' ? rawVal : (rawVal !== undefined && rawVal !== null ? String(rawVal) : '');

        if (type === 'number') {
          if (newValue.length > 1 && newValue.startsWith('0') && newValue[1] !== '.') {
            newValue = newValue.replace(/^0+/, '');
          }

          const numberValue = parseFloat(newValue);
          if (newValue === '' || (!isNaN(numberValue) && numberValue >= 0 && numberValue <= max)) {
            if (name && formik) {
              formik.setFieldValue(name, newValue);
            }
            onChange && onChange(e);
          }
        } else {
          if (name && formik) {
            formik.setFieldValue(name, newValue);
          }
          onChange && onChange(e);
        }
      }}
      onBlur={(e) => {
        if (formik && name) {
          formik.setFieldTouched(name, true);
          formik.handleBlur(e);
        }
        onBlur && onBlur(e);
      }}
      error={hasError}
      helperText={displayHelperText}
      sx={{
        width: fullWidth ? '100%' : undefined,
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
        },
        ...sx
      }}
      slotProps={{
        ...customSlotProps,
        htmlInput: {
          ...(type === 'number' ? { step: 'any' } : {}),
          autoComplete: autoComplete || 'off',
          ...inputProps,
          ...(customSlotProps?.htmlInput || {})
        },
        inputLabel: {
          ...(type === 'date' || type === 'time' || type === 'datetime-local' ? { shrink: true } : {}),
          ...(customSlotProps?.inputLabel || customInputLabelProps || {})
        },
        input: {
          ...(customSlotProps?.input || customInputProps || {}),
          startAdornment: startIcon ? (
            <InputAdornment position='start' sx={{ mr: 0.5, color: '#059669', flexShrink: 0 }}>
              {startIcon}
            </InputAdornment>
          ) : (customSlotProps?.input?.startAdornment || customInputProps?.startAdornment || null),
          endAdornment: type === 'password' ? (
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
          ) : (customSlotProps?.input?.endAdornment || customInputProps?.endAdornment || null)
        }
      }}
      {...rest}
    />
  );
};

export default TextFieldComponent;
