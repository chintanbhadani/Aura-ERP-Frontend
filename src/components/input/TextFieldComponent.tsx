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
  onChange?: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  inputProps?: any;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
  fullWidth?: boolean;
  helperText?: string;
  startIcon?: React.ReactNode;
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
  placeholder,
  multiline,
  rows,
  fullWidth = true,
  helperText,
  startIcon,
  ...rest
}: IOutlineTextField<T> & Record<string, any>) => {
  const formik = React.useContext<any>(FormikContext);
  const [showPassword, setShowPassword] = useState(false);

  const [isFocused, setIsFocused] = useState(false);

  const isFormikControlled = Boolean(formik && name && controlledValue === undefined);
  const formikField = isFormikControlled && name ? formik.getFieldProps(name) : null;
  const formikMeta = isFormikControlled && name ? formik.getFieldMeta(name) : null;

  const togglePasswordVisibility = () => setShowPassword(!showPassword);
  
  const value = controlledValue !== undefined 
    ? controlledValue 
    : (formikField && formikField.value !== undefined && formikField.value !== null ? formikField.value : '');

  const isTextarea = type === 'textarea' || multiline;

  const hasValue = value !== undefined && value !== null && String(value).trim() !== '';
  const isDateOrTime = type === 'date' || type === 'time' || type === 'datetime-local';
  const hasStartAdornment = Boolean(
    startIcon || 
    rest.slotProps?.input?.startAdornment || 
    rest.InputProps?.startAdornment
  );
  const explicitShrink = rest.slotProps?.inputLabel?.shrink ?? rest.InputLabelProps?.shrink;
  const isShrunk = explicitShrink !== undefined
    ? explicitShrink
    : Boolean(hasValue || isFocused || isDateOrTime || hasStartAdornment || !label);

  const effectivePlaceholder = (isShrunk || !label) ? placeholder : undefined;

  const triggerChange = (newVal: string, originalEvent?: any) => {
    if (isFormikControlled && name && formik) {
      formik.setFieldValue(name, newVal);
    }
    if (onChange) {
      const syntheticEvent: any = originalEvent ? originalEvent : {
        target: { value: newVal, name: name || '' },
        currentTarget: { value: newVal, name: name || '' }
      };
      if (syntheticEvent.target) {
        syntheticEvent.target.value = newVal;
      }
      onChange(syntheticEvent);
    }
  };

  return (
    <TextField
      label={label}
      variant='outlined'
      type={type === 'password' ? (showPassword ? 'text' : 'password') : (isTextarea ? undefined : type)}
      multiline={isTextarea}
      rows={isTextarea ? (rows || 3) : undefined}
      name={name ? name.toString() : undefined}
      value={value !== undefined && value !== null ? value : ''}
      fullWidth={fullWidth}
      onFocus={(e) => {
        setIsFocused(true);
        if (type === 'number') {
          (e.target as HTMLInputElement).select();
        }
        rest.onFocus && rest.onFocus(e);
      }}
      onClick={(e) => {
        if (type === 'number') {
          (e.target as HTMLInputElement).select();
        }
        rest.onClick && rest.onClick(e);
      }}
      onKeyDown={(e) => {
        rest.onKeyDown && rest.onKeyDown(e);
      }}
      onChange={e => {
        let newValue = e.target.value;

        if (type === 'number') {
          // Remove leading zeros when typing e.g. "05" -> "5", except for decimals like "0.5"
          if (newValue.length > 1 && newValue.startsWith('0') && newValue[1] !== '.') {
            newValue = newValue.replace(/^0+/, '');
          }

          const numberValue = parseFloat(newValue);
          if (newValue === '' || (!isNaN(numberValue) && numberValue >= 0 && numberValue <= max)) {
            triggerChange(newValue, e);
          }
        } else {
          triggerChange(newValue, e);
        }
      }}
      onBlur={(e) => {
        setIsFocused(false);
        if (isFormikControlled && formik) {
          formik.handleBlur(e);
        }
        onBlur && onBlur(e);
      }}
      error={Boolean(formikMeta && formikMeta.touched && formikMeta.error)}
      helperText={formikMeta && formikMeta.touched && formikMeta.error ? String(formikMeta.error) : (helperText || '')}
      disabled={disabled}
      size={size}
      sx={{
        width: fullWidth ? '100%' : undefined,
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
        '& .MuiInputBase-input': {
          fontSize: '0.875rem',
          fontWeight: 500,
          color: '#111827'
        },
        ...sx
      }}
      slotProps={{
        inputLabel: {
          shrink: isShrunk,
          ...(type === 'date' || type === 'time' ? { shrink: true } : {}),
          ...(rest.slotProps?.inputLabel || rest.InputLabelProps || {})
        },
        htmlInput: {
          placeholder: effectivePlaceholder,
          ...(type === 'number' ? { step: 'any' } : {}),
          ...inputProps
        },
        input: {
          notched: isShrunk,
          ...(rest.slotProps?.input || rest.InputProps || {}),
          startAdornment: (
            <>
              {startIcon && (
                <InputAdornment position='start' sx={{ mr: 0.5, color: '#059669', flexShrink: 0 }}>
                  {startIcon}
                </InputAdornment>
              )}
              {rest.slotProps?.input?.startAdornment || rest.InputProps?.startAdornment || null}
            </>
          ),
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
