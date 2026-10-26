import React from 'react';
import { motion } from 'framer-motion';
import { AnimatedNumber } from './AnimatedNumber';

interface StatSparkCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  badge?: {
    text: string;
    trend?: 'up' | 'down' | 'neutral' | 'alert';
  };
  subtitle?: string;
  sparklineData?: number[];
  icon?: React.ElementType;
  className?: string;
}

export const StatSparkCard: React.FC<StatSparkCardProps> = ({
  title,
  value,
  prefix = '',
  suffix = '',
  decimals = 0,
  badge,
  subtitle,
  sparklineData = [10, 14, 12, 19, 16, 22, 28],
  icon: Icon,
  className = '',
}) => {
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData) || 1;
  const range = max - min || 1;

  const w = 110;
  const h = 36;
  const pts = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * w;
    const y = h - ((val - min) / range) * (h - 8) - 4;
    return { x, y };
  });

  const path = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const badgeColors = {
    up: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    down: 'bg-rose-50 text-rose-700 border-rose-200',
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    alert: 'bg-amber-50 text-amber-700 border-amber-200',
  }[badge?.trend || 'up'];

  return (
    <motion.div
      whileHover={{ y: -3, transition: { duration: 0.2 } }}
      className={`p-5 bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between ${className}`}
    >
      {/* Top Title & Badge / Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Icon className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-semibold text-gray-500 tracking-tight">{title}</span>
        </div>

        {badge && (
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${badgeColors} inline-flex items-center gap-0.5`}
          >
            {badge.trend === 'up' && '↗ '}
            {badge.trend === 'down' && '↘ '}
            {badge.text}
          </span>
        )}
      </div>

      {/* Center Value */}
      <div className="my-2">
        <AnimatedNumber
          value={value}
          prefix={prefix}
          suffix={suffix}
          decimals={decimals}
          className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight block"
        />
      </div>

      {/* Bottom Sparkline & Subtitle */}
      <div className="flex items-end justify-between gap-3 pt-2 border-t border-gray-50 mt-1">
        <span className="text-[11px] font-medium text-gray-400 truncate">
          {subtitle || 'Updated just now'}
        </span>

        {/* Sparkline SVG */}
        <div className="w-[100px] h-[32px] shrink-0">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full overflow-visible">
            <defs>
              <linearGradient id={`sparkGrad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <path
              d={`${path} L ${w} ${h} L 0 ${h} Z`}
              fill={`url(#sparkGrad-${title.replace(/\s+/g, '')})`}
            />
            <motion.path
              d={path}
              fill="none"
              stroke="#10b981"
              strokeWidth="2.5"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, ease: 'easeOut' }}
            />
          </svg>
        </div>
      </div>
    </motion.div>
  );
};

export default StatSparkCard;
