import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Box, Button } from '@mui/material';
import { signupApi } from '../services/api';
import { setToken, setLoggedUser } from '../slices/Base';
import { Leaf } from 'lucide-react';
import { successToast, errorToast } from '../helper/toast';
import { TextFieldComponent } from './input/index';

const signupValidationSchema = Yup.object({
  name: Yup.string().trim().required('Full name is required'),
  email: Yup.string().trim().email('Invalid email address').required('Email is required'),
  password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
});

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-center transition-colors">
        <div className="bg-white/20 p-4 rounded-3xl mb-8 backdrop-blur-sm">
          <Leaf className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
          Join Aura ERP Today.
        </h1>
        <p className="text-white/90 text-lg max-w-md">
          Streamline your manufacturing process and take control of your supply chain operations.
        </p>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#f8faf8] p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Create an account</h2>
          <p className="text-gray-500 mb-8">Please enter your details to sign up.</p>

          <Formik
            initialValues={{ name: '', email: '', password: '' }}
            validationSchema={signupValidationSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                setSubmitting(true);
                const { user, token } = await signupApi({
                  name: values.name.trim(),
                  email: values.email.trim(),
                  password: values.password
                });
                dispatch(setToken(token));
                dispatch(setLoggedUser(user));
                successToast('Account created successfully');
                navigate('/');
              } catch (err: any) {
                const msg = err.response?.data?.error || 'Registration failed';
                errorToast(msg);
              } finally {
                setSubmitting(false);
              }
            }}
          >
            {({ isSubmitting }) => (
              <Form noValidate className="space-y-6">
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                  <TextFieldComponent
                    name="name"
                    label="Full Name"
                    placeholder="John Doe"
                    autoFocus
                  />
                  <TextFieldComponent
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="admin@auraerp.com"
                  />
                  <TextFieldComponent
                    name="password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                  />
                </Box>

                <Button 
                  type="submit" 
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                  sx={{ py: 1.5, fontSize: '1rem', fontWeight: 600, mt: 2 }}
                >
                  {isSubmitting ? 'Creating account...' : 'Sign up'}
                </Button>
              </Form>
            )}
          </Formik>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Signup;
