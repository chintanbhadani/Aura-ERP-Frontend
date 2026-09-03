import * as Yup from 'yup';

export const validateString = Yup?.string();
export const validateNumber = Yup.number().typeError('Invalid number');
export const validateInteger = validateNumber.integer();
export const validateDate = Yup.date().typeError('Invalid date');
export const validateDateBoolean = Yup.boolean();
export const validateBoolean = Yup.boolean();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_FILE_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];

export const onLoginValidation = Yup.object({
  email: validateString.email().required('Email is required'),
  password: validateString.min(8).required().label('Password')
});
