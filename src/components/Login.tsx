import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { Box, Button, Checkbox, FormControlLabel } from '@mui/material';
import { loginApi } from '../services/api';
import { setToken, setLoggedUser } from '../slices/Base';
import { Leaf } from 'lucide-react';
import { successToast, errorToast } from '../helper/toast';
import { TextFieldComponent } from './input/index';

const loginValidationSchema = Yup.object({
  email: Yup.string().trim().email('Invalid email address').required('Email is required'),
  password: Yup.string().required('Password is required'),
});

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [rememberMe, setRememberMe] = useState(false);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary flex-col items-center justify-center p-12 text-center transition-colors">
        <div className="bg-white/20 p-4 rounded-3xl mb-8 backdrop-blur-sm">
          <Leaf className="w-12 h-12 text-white" />
        </div>
        <h1 className="text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
          Manage your production with ease.
        </h1>
        <p className="text-white/90 text-lg max-w-md">
          The next generation ERP system for manufacturing. Real-time data, automated BOM, and precise QC tracking.
        </p>
      </div>

      {/* Right Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-[#f8faf8] p-8">
        <div className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome back</h2>
          <p className="text-gray-500 mb-8">Please enter your details to sign in.</p>

          <Formik
            initialValues={{ email: '', password: '' }}
            validationSchema={loginValidationSchema}
            onSubmit={async (values, { setSubmitting }) => {
              try {
                setSubmitting(true);
                const { user, token } = await loginApi({ email: values.email.trim(), password: values.password });
                dispatch(setToken(token));
                dispatch(setLoggedUser(user));
                successToast('Logged in successfully');
                navigate('/');
              } catch (err: any) {
                const msg = err.response?.data?.error || 'Invalid credentials';
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
                    name="email"
                    label="Email Address"
                    type="email"
                    placeholder="admin@auraerp.com"
                    autoFocus
                  />
                  <TextFieldComponent
                    name="password"
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                  />
                </Box>

                <div className="flex items-center justify-between">
                  <FormControlLabel
                    control={
                      <Checkbox
                        color="primary"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        size="small"
                      />
                    }
                    label={<span className="text-sm text-gray-600">Remember me</span>}
                  />
                  <a href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </a>
                </div>

                <Button 
                  type="submit" 
                  variant="contained"
                  color="primary"
                  fullWidth
                  size="large"
                  disabled={isSubmitting}
                  sx={{ py: 1.5, fontSize: '1rem', fontWeight: 600 }}
                >
                  {isSubmitting ? 'Signing in...' : 'Sign in'}
                </Button>
              </Form>
            )}
          </Formik>

          <p className="mt-8 text-center text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Login;
