import React from 'react';

export type LogoVariant = 'prism' | 'orbit' | 'shield' | 'minimal';

interface AuraLogoProps {
  variant?: LogoVariant;
  size?: number; // size in px, default 32
  showText?: boolean;
  textClassName?: string;
  className?: string;
}

export const AuraLogo: React.FC<AuraLogoProps> = ({
  variant = 'prism',
  size = 32,
  showText = true,
  textClassName = '',
  className = '',
}) => {
  const renderIcon = () => {
    switch (variant) {
      case 'orbit':
        // Orbital Aura: Interlocking concentric arcs forming dynamic 'A'
        return (
          <div 
            className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 shadow-md shadow-emerald-600/20"
            style={{ width: size, height: size }}
          >
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="w-full h-full p-1.5"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="orbitGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#a7f3d0" />
                </linearGradient>
              </defs>
              {/* Outer halo */}
              <circle cx="16" cy="16" r="13" stroke="white" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 3" />
              {/* Stylized Orbital A */}
              <path
                d="M16 6L7 24H11.5L13.5 20H18.5L20.5 24H25L16 6Z"
                fill="url(#orbitGlow)"
              />
              <path
                d="M16 11L14.2 16.5H17.8L16 11Z"
                fill="#047857"
              />
              {/* Luminous orbital node */}
              <circle cx="21" cy="9" r="2.5" fill="#38bdf8" />
            </svg>
          </div>
        );

      case 'shield':
        // Enterprise Shield Crest: Robust, geometric, secure
        return (
          <div 
            className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-tr from-emerald-700 via-emerald-600 to-teal-500 shadow-md shadow-emerald-700/25 border border-emerald-400/30"
            style={{ width: size, height: size }}
          >
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="w-full h-full p-1.5"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* Stylized Crest A */}
              <path
                d="M16 4L6 8V16C6 22 10.5 27 16 29C21.5 27 26 22 26 16V8L16 4Z"
                fill="rgba(255,255,255,0.15)"
                stroke="#a7f3d0"
                strokeWidth="1.5"
              />
              <path
                d="M16 9L10.5 21H13.8L14.9 18.2H17.1L18.2 21H21.5L16 9ZM16 12.8L16.6 15.6H15.4L16 12.8Z"
                fill="#ffffff"
              />
            </svg>
          </div>
        );

      case 'minimal':
        // Minimalist High-End: Clean circular badge with energetic dot
        return (
          <div 
            className="relative flex items-center justify-center shrink-0 rounded-xl bg-gray-900 shadow-sm border border-gray-800"
            style={{ width: size, height: size }}
          >
            <span className="font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200 text-sm tracking-tighter">
              Λ
            </span>
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        );

      case 'prism':
      default:
        // Radiant Aurora Prism: Premium geometric 'A' with multifaceted light
        return (
          <div 
            className="relative flex items-center justify-center shrink-0 rounded-xl bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400 shadow-md shadow-emerald-500/25 ring-1 ring-black/5"
            style={{ width: size, height: size }}
          >
            <svg
              viewBox="0 0 32 32"
              fill="none"
              className="w-full h-full p-1.5"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="prismLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#d1fae5" />
                </linearGradient>
                <linearGradient id="prismRight" x1="100%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#a7f3d0" />
                  <stop offset="100%" stopColor="#34d399" />
                </linearGradient>
                <linearGradient id="crossbeam" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#6ee7b7" />
                </linearGradient>
              </defs>
              {/* Left facet of A */}
              <path
                d="M16 5.5L7 24.5H12L16 15.5V5.5Z"
                fill="url(#prismLeft)"
              />
              {/* Right facet of A */}
              <path
                d="M16 5.5L25 24.5H20L16 15.5V5.5Z"
                fill="url(#prismRight)"
              />
              {/* Radiant horizontal bridge */}
              <path
                d="M11.5 18H20.5L19 15H13L11.5 18Z"
                fill="url(#crossbeam)"
                filter="drop-shadow(0 1px 2px rgba(0,0,0,0.15))"
              />
              {/* Top apex spark */}
              <circle cx="16" cy="6" r="1.5" fill="#ffffff" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className={`flex items-center gap-2.5 whitespace-nowrap overflow-hidden ${className}`}>
      {renderIcon()}
      {showText && (
        <div className={`flex items-center gap-1.5 ${textClassName}`}>
          <span className="font-extrabold text-base tracking-tight text-gray-900 font-sans">
            Aura
          </span>
          <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            ERP
          </span>
        </div>
      )}
    </div>
  );
};

export default AuraLogo;
