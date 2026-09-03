import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { Leaf } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    // Simulate signup
    setTimeout(() => {
      setIsLoading(false);
      navigate('/');
    }, 1000);
  };

  return (
    <AuthLayout>
      <div className="mb-10 lg:hidden flex items-center justify-center">
        <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center">
          <Leaf className="text-primary-600" size={32} />
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Create an account</h2>
        <p className="text-gray-500 mt-2">Join the plant floor and track production.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Input label="First name" placeholder="John" required />
          <Input label="Last name" placeholder="Doe" required />
        </div>
        
        <Input 
          label="Email address" 
          type="email" 
          placeholder="Enter your email" 
          required 
        />
        
        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Password" 
            type="password" 
            placeholder="••••••••" 
            required 
          />
          <Input 
            label="Role (Code)" 
            type="text" 
            placeholder="e.g. SUP-123" 
            required 
          />
        </div>

        <Button fullWidth type="submit" size="lg" className="mt-4" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </form>

      <p className="text-center mt-8 text-sm text-gray-600">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
