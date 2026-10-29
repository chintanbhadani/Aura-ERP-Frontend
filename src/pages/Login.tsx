import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../layouts/AuthLayout';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { AuraLogo } from '../components/AuraLogo';
import { 
  AlertCircle, 
  ShieldCheck, 
  QrCode, 
  ArrowLeft, 
  Copy, 
  Check, 
  Smartphone,
  Lock
} from 'lucide-react';
import { useDispatch } from 'react-redux';
import { setToken, setLoggedUser, setRoleDetails } from '../lib/slice/Base';
import { loginApi, verify2FAApi } from '../services/auth.service';
import { successToast, errorToast } from '../helper/toast';

export default function Login() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Step: 'LOGIN' or '2FA'
  const [step, setStep] = useState<'LOGIN' | '2FA'>('LOGIN');

  // Step 1: Login Form Data
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Step 2: 2FA State
  const [twoFactorData, setTwoFactorData] = useState<{
    tempToken: string;
    isSetup: boolean;
    qrCode?: string;
    secret?: string;
    message?: string;
  }>({
    tempToken: '',
    isSetup: false,
  });
  const [otpCode, setOtpCode] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);

  // Handle standard credentials submission
  const handleSubmitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    
    try {
      const response = await loginApi(formData);
      
      if (response?.requires2FA) {
        setTwoFactorData({
          tempToken: response.tempToken,
          isSetup: Boolean(response.isSetup),
          qrCode: response.qrCode,
          secret: response.secret,
          message: response.message
        });
        setStep('2FA');
        setOtpCode('');
        setErrorMsg('');
      } else if (response?.token) {
        // Direct login fallback if 2FA is bypassed
        dispatch(setToken(response.token));
        dispatch(setLoggedUser(response.user));
        if (response?.roleDetails) {
          dispatch(setRoleDetails(response.roleDetails));
          try {
            localStorage.setItem('roleDetails', JSON.stringify(response.roleDetails));
          } catch (e) {}
        }
        successToast('Logged in successfully');
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const msg = error.response?.data?.error || 'Invalid credentials or server error';
      setErrorMsg(msg);
      errorToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle 6-digit Google Authenticator code submission
  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim().replace(/\s+/g, '');
    
    if (!cleanCode || cleanCode.length !== 6) {
      setErrorMsg('Please enter a 6-digit code from Google Authenticator');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const response = await verify2FAApi({
        tempToken: twoFactorData.tempToken,
        code: cleanCode
      });

      dispatch(setToken(response.token));
      dispatch(setLoggedUser(response.user));
      if (response?.roleDetails) {
        dispatch(setRoleDetails(response.roleDetails));
        try {
          localStorage.setItem('roleDetails', JSON.stringify(response.roleDetails));
        } catch (e) {}
      }
      successToast(
        twoFactorData.isSetup 
          ? 'Google Authenticator paired & logged in successfully!' 
          : 'Authenticated successfully'
      );
      navigate('/');
    } catch (error: any) {
      console.error('2FA error:', error);
      const msg = error.response?.data?.error || 'Invalid Google Authenticator code. Please try again.';
      setErrorMsg(msg);
      errorToast(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyKey = () => {
    if (twoFactorData.secret) {
      navigator.clipboard.writeText(twoFactorData.secret);
      setCopiedKey(true);
      successToast('Secret key copied to clipboard');
      setTimeout(() => setCopiedKey(false), 2500);
    }
  };

  const handleBackToLogin = () => {
    setStep('LOGIN');
    setOtpCode('');
    setErrorMsg('');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrorMsg('');
  };

  return (
    <AuthLayout>
      <div className="mb-8 lg:hidden flex items-center justify-center">
        <AuraLogo variant="prism" size={48} showText={true} />
      </div>

      {step === 'LOGIN' ? (
        <>
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 mt-2 text-sm">Please enter your username and password to sign in.</p>
          </div>

          <form onSubmit={handleSubmitLogin} className="space-y-5">
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
                <a href="#" className="text-xs font-semibold text-primary-600 hover:text-primary-700">
                  Forgot password?
                </a>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl font-medium flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <Button fullWidth type="submit" size="lg" className="mt-2" disabled={isLoading}>
              {isLoading ? 'Verifying...' : 'Sign In'}
            </Button>
          </form>
        </>
      ) : (
        /* 2FA VERIFICATION STEP */
        <div className="animate-in fade-in duration-300">
          <button
            type="button"
            onClick={handleBackToLogin}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 mb-6 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to username & password
          </button>

          {twoFactorData.isSetup ? (
            /* FIRST-TIME SETUP: QR CODE */
            <div className="space-y-5">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Security Setup
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Set up Google Authenticator</h2>
                <p className="text-gray-500 mt-1 text-xs leading-relaxed">
                  Protect your account with Time-based Two-Factor Authentication. Scan the code below in <strong>Google Authenticator</strong> or <strong>Microsoft Authenticator</strong>.
                </p>
              </div>

              {/* QR Code Container */}
              {twoFactorData.qrCode && (
                <div className="bg-white border-2 border-dashed border-gray-200 rounded-2xl p-4 flex flex-col items-center justify-center shadow-xs">
                  <img 
                    src={twoFactorData.qrCode} 
                    alt="Google Authenticator QR Code" 
                    className="w-44 h-44 rounded-xl border border-gray-100 shadow-xs"
                  />
                  <div className="mt-3 text-center w-full">
                    <p className="text-[11px] text-gray-500 font-medium">Or enter key manually:</p>
                    <div className="mt-1 flex items-center justify-center gap-2 bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200/80">
                      <span className="font-mono text-xs font-bold text-gray-800 tracking-wider">
                        {twoFactorData.secret}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyKey}
                        className="text-gray-500 hover:text-primary-600 transition-colors cursor-pointer"
                        title="Copy Secret Key"
                      >
                        {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* OTP Form for Activation */}
              <form onSubmit={handleVerify2FA} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Enter the 6-digit code from the app:
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    placeholder="000 000"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      setErrorMsg('');
                    }}
                    className="w-full text-center text-2xl font-mono tracking-[0.3em] font-bold py-3 px-4 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all bg-gray-50/50"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium flex items-center gap-2 border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button fullWidth type="submit" size="lg" disabled={isLoading || otpCode.length !== 6}>
                  {isLoading ? 'Activating & Verifying...' : 'Activate & Sign In'}
                </Button>
              </form>
            </div>
          ) : (
            /* SUBSEQUENT LOGIN: 6-DIGIT CODE PROMPT */
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="w-14 h-14 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Smartphone className="w-7 h-7" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Two-Step Verification</h2>
                <p className="text-gray-500 text-xs max-w-sm mx-auto leading-relaxed">
                  Open your <strong>Google Authenticator</strong> app on your mobile device and enter the 6-digit code.
                </p>
              </div>

              <form onSubmit={handleVerify2FA} className="space-y-5">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2 text-center">
                    6-Digit Verification Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    placeholder="······"
                    value={otpCode}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setOtpCode(val);
                      setErrorMsg('');
                    }}
                    className="w-full text-center text-3xl font-mono tracking-[0.4em] font-bold py-3.5 px-4 rounded-2xl border-2 border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all bg-gray-50/50 text-gray-800 placeholder-gray-300 shadow-inner"
                  />
                </div>

                {errorMsg && (
                  <div className="p-3 bg-red-50 text-red-600 text-xs rounded-xl font-medium flex items-center gap-2 border border-red-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <Button fullWidth type="submit" size="lg" disabled={isLoading || otpCode.length !== 6}>
                  {isLoading ? 'Verifying Code...' : 'Verify & Sign In'}
                </Button>
              </form>
            </div>
          )}
        </div>
      )}
    </AuthLayout>
  );
}
