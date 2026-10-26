import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface ChartDataPoint {
  label: string;
  inVal: number;
  outVal: number;
  totalVal?: number;
}

interface TrendChartProps {
  data?: ChartDataPoint[];
  title?: string;
  className?: string;
}

const DEFAULT_DATA: ChartDataPoint[] = [
  { label: 'May', inVal: 2800, outVal: 2100, totalVal: 18500 },
  { label: 'Jun', inVal: 3200, outVal: 2600, totalVal: 21200 },
  { label: 'Jul', inVal: 4100, outVal: 3400, totalVal: 24600 },
  { label: 'Aug', inVal: 3800, outVal: 3900, totalVal: 23900 },
  { label: 'Sep', inVal: 4500, outVal: 3700, totalVal: 28400 },
  { label: 'Oct', inVal: 5230, outVal: 4120, totalVal: 32041 },
];

export const TrendChart: React.FC<TrendChartProps> = ({
  data = DEFAULT_DATA,
  title = 'Inventory statistics',
  className = '',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(data.length - 1);
  const [period, setPeriod] = useState<'monthly' | 'weekly'>('monthly');

  const width = 600;
  const height = 220;
  const paddingX = 40;
  const paddingBottom = 40;
  const paddingTop = 30;

  const chartW = width - paddingX * 2;
  const chartH = height - paddingTop - paddingBottom;

  const maxVal = Math.max(...data.map((d) => Math.max(d.inVal, d.outVal))) * 1.15 || 6000;

  // Compute (x, y) coordinates for data points
  const pointsIn = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartW;
    const y = paddingTop + chartH - (d.inVal / maxVal) * chartH;
    return { x, y, ...d };
  });

  const pointsOut = data.map((d, i) => {
    const x = paddingX + (i / (data.length - 1)) * chartW;
    const y = paddingTop + chartH - (d.outVal / maxVal) * chartH;
    return { x, y, ...d };
  });

  // Construct smooth SVG cubic bezier path
  const makeSmoothPath = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return '';
    return pts.reduce((acc, pt, i, arr) => {
      if (i === 0) return `M ${pt.x} ${pt.y}`;
      const prev = arr[i - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');
  };

  const pathIn = makeSmoothPath(pointsIn);
  const pathOut = makeSmoothPath(pointsOut);
  const areaIn = `${pathIn} L ${pointsIn[pointsIn.length - 1].x} ${paddingTop + chartH} L ${pointsIn[0].x} ${paddingTop + chartH} Z`;

  const activePoint = hoveredIdx !== null ? pointsIn[hoveredIdx] : null;
  const activeOutPoint = hoveredIdx !== null ? pointsOut[hoveredIdx] : null;

  return (
    <div className={`p-6 bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow duration-300 relative ${className}`}>
      {/* Header & Legends */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">{title}</h3>
          <p className="text-xs text-gray-400">Stock movements & production rate</p>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center gap-4 text-xs font-medium text-gray-600">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs shadow-emerald-400/40" />
            Stock in
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-gray-900 shadow-xs shadow-black/20" />
            Stock out
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-200 border border-emerald-400" />
            Stock value
          </span>

          {/* Period Toggle */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-full ml-2">
            <button
              onClick={() => setPeriod('monthly')}
              className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                period === 'monthly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setPeriod('weekly')}
              className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full transition-all cursor-pointer ${
                period === 'weekly' ? 'bg-white text-gray-900 shadow-xs' : 'text-gray-500'
              }`}
            >
              Weekly
            </button>
          </div>
        </div>
      </div>

      {/* SVG Interactive Chart */}
      <div className="relative w-full aspect-[2.6/1] select-none">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = paddingTop + chartH * pct;
            return (
              <line
                key={i}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#f1f5f9"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area fill */}
          <motion.path
            d={areaIn}
            fill="url(#areaGrad)"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
          />

          {/* Stock In Curved Stroke */}
          <motion.path
            d={pathIn}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Stock Out Curved Stroke */}
          <motion.path
            d={pathOut}
            fill="none"
            stroke="#1f2937"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray="5 5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Vertical Hover Guides & Interactive Target Columns */}
          {pointsIn.map((pt, i) => {
            const isHovered = hoveredIdx === i;
            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
              >
                {/* Invisible hit target for smooth hover */}
                <rect
                  x={pt.x - chartW / (data.length * 2)}
                  y={0}
                  width={chartW / data.length}
                  height={height}
                  fill="transparent"
                />

                {/* Vertical Dotted Guide */}
                {isHovered && (
                  <motion.line
                    x1={pt.x}
                    y1={paddingTop - 10}
                    x2={pt.x}
                    y2={paddingTop + chartH}
                    stroke="#059669"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.8 }}
                  />
                )}

                {/* X Axis Labels */}
                <text
                  x={pt.x}
                  y={height - 12}
                  textAnchor="middle"
                  className={`text-[11px] font-semibold transition-colors ${
                    isHovered ? 'fill-emerald-700 font-bold' : 'fill-gray-400'
                  }`}
                >
                  {pt.label}
                </text>

                {/* Active Dots on Curves */}
                {isHovered && (
                  <>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r="6"
                      fill="#10b981"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                      className="shadow-md"
                    />
                    <circle
                      cx={pt.x}
                      cy={pointsOut[i].y}
                      r="5"
                      fill="#1f2937"
                      stroke="#ffffff"
                      strokeWidth="2"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip Pill (matching video) */}
        <AnimatePresence>
          {hoveredIdx !== null && activePoint && activeOutPoint && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: 1,
                left: `${(activePoint.x / width) * 100}%`,
              }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              style={{
                transform: 'translate(-50%, -100%)',
                top: `${(Math.min(activePoint.y, activeOutPoint.y) / height) * 100 - 15}%`,
              }}
              className="absolute pointer-events-none z-30"
            >
              <div className="bg-white/95 dark:bg-emerald-950/95 backdrop-blur-md rounded-2xl shadow-xl border border-gray-200/80 dark:border-emerald-800/60 p-3 min-w-[150px]">
                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 border-b border-gray-100 dark:border-emerald-900/60 pb-1 mb-1.5 flex items-center justify-between">
                  <span>{activePoint.label} 2026</span>
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 px-1.5 py-0.5 rounded-full">
                    Summary
                  </span>
                </p>
                <div className="space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      In:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{activePoint.inVal.toLocaleString()} kg</span>
                  </div>
                  <div className="flex items-center justify-between text-gray-600 dark:text-gray-300">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gray-900 dark:bg-gray-400" />
                      Out:
                    </span>
                    <span className="font-bold text-gray-900 dark:text-white">{activePoint.outVal.toLocaleString()} kg</span>
                  </div>
                  {activePoint.totalVal && (
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 pt-1 border-t border-dashed border-gray-100 dark:border-emerald-900/60">
                      <span>Stock Val:</span>
                      <span className="font-bold">₹{activePoint.totalVal.toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TrendChart;
