import React from 'react';
import { Leaf } from 'lucide-react';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding/Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 flex-col justify-center items-center relative overflow-hidden text-white p-12">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center">
          <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-3xl flex items-center justify-center mb-8 shadow-2xl border border-white/20">
            <Leaf size={48} className="text-white" />
          </div>
          <h1 className="text-5xl font-bold mb-6 tracking-tight leading-tight">
            Manage your <br/> production with ease.
          </h1>
          <p className="text-primary-100 text-lg max-w-md">
            The next generation ERP system for PET strap manufacturing. Real-time data, automated BOM, and precise QC tracking.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white/50 backdrop-blur-xl">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}
