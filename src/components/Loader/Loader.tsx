import React from 'react';
import { Loader2 } from 'lucide-react';

export const Loader: React.FC = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50/50">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-9 h-9 text-emerald-600 animate-spin" />
        <span className="text-xs font-semibold text-gray-500 tracking-wide uppercase">Authenticating...</span>
      </div>
    </div>
  );
};

export default Loader;
