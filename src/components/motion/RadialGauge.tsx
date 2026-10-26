import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

interface RadialGaugeProps {
  value: number; // 0 to 100
  title?: string;
  subtitle?: string;
  currentLabel?: string;
  targetLabel?: string;
  extraStats?: { label: string; value: string | number }[];
  className?: string;
}

export const RadialGauge: React.FC<RadialGaugeProps> = ({
  value,
  title = 'Sales goal',
  subtitle = 'Monthly production & delivery',
  currentLabel = '₹16,495',
  targetLabel = '₹24,500',
  extraStats = [],
  className = '',
}) => {
  // Semi-circle gauge geometry
  const radius = 70;
  const strokeWidth = 14;
  const circumference = Math.PI * radius; // Half-circle perimeter
  const clampedValue = Math.min(Math.max(value, 0), 100);
  const strokeDashoffset = circumference - (clampedValue / 100) * circumference;

  return (
    <div className={`flex flex-col items-center justify-between p-5 bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow duration-300 ${className}`}>
      {/* Header */}
      <div className="w-full flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900 tracking-tight">{title}</h3>
        <span className="text-[11px] font-medium text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
          On Track
        </span>
      </div>

      {/* Gauge SVG */}
      <div className="relative w-52 h-32 flex items-end justify-center mb-4 mt-1">
        <svg
          viewBox="0 0 160 92"
          className="w-full h-full overflow-visible"
        >
          {/* Background Track (semi-circle) */}
          <path
            d="M 15 80 A 65 65 0 0 1 145 80"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />

          {/* Dotted Accent Guide */}
          <path
            d="M 15 80 A 65 65 0 0 1 145 80"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1.5"
            strokeDasharray="2 6"
            className="opacity-50"
          />

          {/* Animated Gradient Fill */}
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="70%" stopColor="#059669" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
          </defs>

          {/* Progress Path */}
          <motion.path
            d="M 15 80 A 65 65 0 0 1 145 80"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{
              duration: 1.4,
              ease: [0.16, 1, 0.3, 1],
            }}
          />
        </svg>

        {/* Center Percentage Display */}
        <div className="absolute inset-0 top-5 flex flex-col items-center justify-center pointer-events-none">
          <div className="flex items-baseline">
            <AnimatedNumber
              value={clampedValue}
              decimals={1}
              className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight"
            />
            <span className="text-sm font-bold text-gray-600 ml-0.5">%</span>
          </div>
          <span className="text-[11px] font-medium text-gray-400 -mt-0.5">{title}</span>
        </div>
      </div>

      {/* Target & Current Values */}
      <div className="w-full flex items-center justify-between text-xs pt-3 border-t border-gray-100">
        <div className="text-left">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Current</p>
          <p className="text-xs font-bold text-emerald-700">{currentLabel}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Target</p>
          <p className="text-xs font-semibold text-gray-700">{targetLabel}</p>
        </div>
      </div>

      {/* Extra Stats Row (e.g., Number of Orders) */}
      {extraStats.length > 0 && (
        <div className="w-full grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-dashed border-gray-100">
          {extraStats.map((stat, i) => (
            <div key={i} className="text-center bg-gray-50/80 rounded-xl py-1.5 px-2">
              <span className="text-[10px] text-gray-400 block">{stat.label}</span>
              <span className="text-xs font-bold text-gray-800">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RadialGauge;
