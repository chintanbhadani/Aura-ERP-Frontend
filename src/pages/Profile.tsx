import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardTitle, CardDescription } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Shield, KeyRound, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { setLoggedUser } from '../lib/slice/Base';
import dataService from '../axios/dataService';

export default function Profile() {
  const { user } = useSelector((state: any) => state.base);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (user) {
      setFormData(prev => ({ ...prev, username: user.username }));
    } else {
      // Fetch user profile if not populated
      dataService.get('/auth/me').then(res => {
        dispatch(setLoggedUser(res.data));
        setFormData(prev => ({ ...prev, username: res.data.username }));
      }).catch(err => console.error("Failed to load profile:", err));
    }
  }, [user, dispatch]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password && formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = { username: formData.username };
      if (formData.password) {
        payload.password = formData.password;
      }
      
      const response = await dataService.put('/auth/me', payload);
      dispatch(setLoggedUser(response.data));
      setSuccessMsg('Profile updated successfully!');
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error: any) {
      setErrorMsg(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  const initials = user?.username ? user.username.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase() : 'U';
  const roleName = (user?.role || 'Admin').replace('_', ' ').toLowerCase();

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-12 font-sans relative">
        <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <header>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">My Profile</h1>
            <p className="text-gray-500 mt-1">Manage your account details and security settings.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Left Column: Avatar & Basic Info */}
            <div className="md:col-span-1 space-y-6">
              <Card className="p-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white font-bold text-3xl shadow-inner mb-4">
                  {initials}
                </div>
                <h2 className="text-xl font-bold text-gray-900">{user?.username || 'Loading...'}</h2>
                <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-sm font-medium capitalize">
                  <Shield className="w-4 h-4" />
                  {roleName}
                </div>
              </Card>
            </div>

            {/* Right Column: Edit Form */}
            <div className="md:col-span-2">
              <Card className="p-6">
                <CardTitle>Account Details</CardTitle>
                <CardDescription className="mb-6">Update your username or password here.</CardDescription>
                
                <form onSubmit={handleSubmit} className="space-y-5">
                  <Input 
                    label="Username" 
                    name="username" 
                    value={formData.username} 
                    onChange={handleChange} 
                    required 
                    placeholder="Enter new username"
                  />
                  
                  <div className="pt-2">
                    <h4 className="text-sm font-medium text-gray-900 mb-4 flex items-center gap-2 border-b border-gray-100 pb-2">
                      <KeyRound className="w-4 h-4 text-gray-400" />
                      Change Password (Optional)
                    </h4>
                    
                    <div className="space-y-4">
                      <Input 
                        label="New Password" 
                        name="password" 
                        type="password" 
                        value={formData.password} 
                        onChange={handleChange} 
                        placeholder="Leave blank to keep current"
                      />
                      <Input 
                        label="Confirm New Password" 
                        name="confirmPassword" 
                        type="password" 
                        value={formData.confirmPassword} 
                        onChange={handleChange} 
                        placeholder="Confirm new password"
                      />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium flex items-center gap-2 animate-in zoom-in-95 duration-200">
                      <Shield className="w-4 h-4" /> {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl font-medium flex items-center gap-2 animate-in zoom-in-95 duration-200">
                      <CheckCircle2 className="w-4 h-4" /> {successMsg}
                    </div>
                  )}

                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={isSubmitting} className="min-w-[120px] gap-2">
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>
            </div>

          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
