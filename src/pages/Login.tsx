import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Leaf, AlertCircle } from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setToken, setLoggedUser } from '../lib/slice/Base';
import { loginApi } from '../services/auth.service';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const response = await loginApi(formData);
      dispatch(setToken(response.token));
      dispatch(setLoggedUser(response.user));
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      setErrorMsg(error.response?.data?.error || 'Invalid credentials or server error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  return (
    <AuthLayout>
      <div className="mb-10 lg:hidden flex items-center justify-center">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center">
          <Leaf className="text-primary-600" size={32} />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
        <p className="text-gray-500 mt-2">Please enter your details to sign in.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input 
          label="Username" 
          name="username"
          type="text" 
          placeholder="Enter your username" 
          value={formData.username}
          onChange={handleChange}
          required 
        />
        
        <div>
          <Input 
            label="Password" 
            name="password"
            type="password" 
            placeholder="••••••••" 
            value={formData.password}
            onChange={handleChange}
            required 
          />
          <div className="flex justify-end mt-2">
            <a href="#" className="text-sm font-medium text-primary-600 hover:text-primary-700">
              Forgot password?
            </a>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> {errorMsg}
          </div>
        )}

        <Button fullWidth type="submit" size="lg" className="mt-2" disabled={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </form>

      <p className="text-center mt-8 text-sm text-gray-600">
        Don't have an account?{' '}
        <Link to="/signup" className="font-semibold text-primary-600 hover:text-primary-700">
          Sign up now
        </Link>
      </p>
    </AuthLayout>
  );
}
