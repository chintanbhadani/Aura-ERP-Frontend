import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { signupApi } from '../services/api';
import { setToken, setLoggedUser } from '../slices/Base';
import { Leaf } from 'lucide-react';

export const Signup: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user, token } = await signupApi({ name, email, password });
      
      // Store in Redux
      dispatch(setToken(token));
      dispatch(setLoggedUser(user));

      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0f8b5a] flex-col items-center justify-center p-12 text-center">
        <div className="bg-white/20 p-4 rounded-3xl mb-8">
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

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm text-center mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" 
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0f8b5a]/50 focus:border-[#0f8b5a] transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@auraerp.com" 
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0f8b5a]/50 focus:border-[#0f8b5a] transition-colors"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" 
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0f8b5a]/50 focus:border-[#0f8b5a] transition-colors"
                required
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#0f8b5a] text-white py-3 rounded-lg font-medium hover:bg-[#0b6b45] transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-[#0f8b5a] hover:text-[#0b6b45]">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
