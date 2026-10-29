import React from 'react';
import { AuraLogo } from '../components/AuraLogo';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Branding/Visual */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary-600 flex-col justify-center items-center relative overflow-hidden text-white p-12">
        {/* Decorative background elements */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-primary-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-primary-400 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center w-full max-w-2xl px-4">
          <div className="w-32 h-32 bg-gradient-to-tr from-white/20 to-white/10 backdrop-blur-xl rounded-[2.5rem] flex items-center justify-center mb-10 shadow-2xl border border-white/30 transform rotate-3 hover:rotate-0 transition-transform duration-500">
            <AuraLogo variant="prism" size={84} showText={false} />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight text-white">
            Aura ERP
          </h1>
          <p className="text-primary-100 text-lg md:text-xl font-medium max-w-lg leading-relaxed">
            The next generation ERP system for manufacturing. Real-time data, automated BOM, and precise QC tracking.
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
