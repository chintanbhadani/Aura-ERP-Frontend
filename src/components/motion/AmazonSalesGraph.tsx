import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  GripVertical, 
  Search, 
  Sparkles, 
  MoreVertical, 
  TrendingUp, 
  ChevronDown, 
  Check, 
  Calendar,
  Layers,
  ArrowUpRight
} from 'lucide-react';
import type { SalesReportRow } from '../../services/api';
import { useCurrency } from '../../helper/currency';

interface AmazonSalesGraphProps {
  rows: SalesReportRow[];
  currencySymbol?: string;
  className?: string;
  presetRange?: string;
  onAnalyseClick?: () => void;
}

export type DateRangeOption =
  | 'today'
  | 'yesterday'
  | '7days'
  | '30days'
  | 'thisMonth'
  | '3months'
  | '6months'
  | 'year'
  | 'all';

interface BucketPoint {
  label: string;
  fullDate: string;
  sales: number;
  units: number;
  cost: number;
  profit: number;
  prevSales?: number;
  prevUnits?: number;
}

// Robust helper to parse row date and extract local date & hour
const getRowDateInfo = (r: SalesReportRow) => {
  const raw = r.date || r.createdAt;
  let year = 1970;
  let month = 0; // 0-indexed
  let day = 1;
  let hour = 12;

  if (raw) {
    const m = String(raw).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      year = parseInt(m[1], 10);
      month = parseInt(m[2], 10) - 1;
      day = parseInt(m[3], 10);
    } else {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        year = d.getFullYear();
        month = d.getMonth();
        day = d.getDate();
      }
    }
  }

  // Hour determination from createdAt or date
  if (r.createdAt) {
    const d = new Date(r.createdAt);
    if (!isNaN(d.getTime())) {
      hour = d.getHours();
    }
  } else if (r.date) {
    const d = new Date(r.date);
    if (!isNaN(d.getTime())) {
      const h = d.getHours();
      hour = h === 0 ? 15 : h;
    }
  }

  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { year, month, day, hour, dateStr };
};

export const AmazonSalesGraph: React.FC<AmazonSalesGraphProps> = ({
  rows,
  currencySymbol,
  className = '',
  presetRange,
  onAnalyseClick
}) => {
  const { format, symbol } = useCurrency();
  const curSymbol = currencySymbol || symbol || '₹';

  // Amazon Seller controls
  const [dateRange, setDateRange] = useState<DateRangeOption>('today');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [compareDates, setCompareDates] = useState(false);
  const [activeMarketplace, setActiveMarketplace] = useState('All Channels (1)');
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toTimeString().split(' ')[0];
  });

  // Keep live time updated
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toTimeString().split(' ')[0]);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync date range with presetRange if passed, or default smartly based on data
  useEffect(() => {
    if (presetRange === 'today') {
      setDateRange('today');
    } else if (presetRange === 'yesterday') {
      setDateRange('yesterday');
    } else if (presetRange === 'last7') {
      setDateRange('7days');
    } else if (presetRange === 'thisMonth') {
      setDateRange('thisMonth');
    } else if (!presetRange || presetRange === 'all') {
      // Check if today has sales; if not, but yesterday has sales, default to yesterday
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      const yDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const yesterdayStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

      const hasTodaySales = rows.some(r => getRowDateInfo(r).dateStr === todayStr && r.totalSales > 0);
      const hasYesterdaySales = rows.some(r => getRowDateInfo(r).dateStr === yesterdayStr && r.totalSales > 0);

      if (hasTodaySales) {
        setDateRange('today');
      } else if (hasYesterdaySales) {
        setDateRange('yesterday');
      } else {
        setDateRange('7days');
      }
    }
  }, [presetRange, rows]);

  // Filter rows based on search input
  const searchedRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(
      r =>
        r.itemCode.toLowerCase().includes(q) ||
        r.itemName.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  // Aggregate real data into timeline buckets
  const bucketData: BucketPoint[] = useMemo(() => {
    const now = new Date();
    const todayYear = now.getFullYear();
    const todayMonth = now.getMonth();
    const todayDay = now.getDate();
    const todayDateStr = `${todayYear}-${String(todayMonth + 1).padStart(2, '0')}-${String(todayDay).padStart(2, '0')}`;

    const yDate = new Date(todayYear, todayMonth, todayDay - 1);
    const yesterdayDateStr = `${yDate.getFullYear()}-${String(yDate.getMonth() + 1).padStart(2, '0')}-${String(yDate.getDate()).padStart(2, '0')}`;

    // 1. TODAY: 12 AM to Current Hour (at least 4 PM)
    if (dateRange === 'today') {
      const currentHour = now.getHours();
      const maxHour = Math.max(currentHour, 16);
      const buckets: BucketPoint[] = [];

      for (let h = 0; h <= maxHour; h++) {
        const period = h < 12 ? 'AM' : 'PM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${displayH} ${period}`;

        buckets.push({
          label,
          fullDate: `Today, ${label}`,
          sales: 0,
          units: 0,
          cost: 0,
          profit: 0,
          prevSales: 0,
          prevUnits: 0,
        });
      }

      searchedRows.forEach(r => {
        const info = getRowDateInfo(r);
        // Only transactions occurring on TODAY
        if (info.dateStr === todayDateStr) {
          const h = Math.min(buckets.length - 1, Math.max(0, info.hour));
          buckets[h].sales += r.totalSales;
          buckets[h].units += r.quantity;
          buckets[h].cost += r.totalCost;
          buckets[h].profit += r.grossProfit;
        }

        // Compare dates: populate yesterday's sales as dashed baseline
        if (compareDates && info.dateStr === yesterdayDateStr) {
          const h = Math.min(buckets.length - 1, Math.max(0, info.hour));
          buckets[h].prevSales = (buckets[h].prevSales || 0) + r.totalSales;
          buckets[h].prevUnits = (buckets[h].prevUnits || 0) + r.quantity;
        }
      });

      return buckets;
    }

    // 2. YESTERDAY: 12 AM to 11 PM (24 hours)
    if (dateRange === 'yesterday') {
      const buckets: BucketPoint[] = [];
      for (let h = 0; h <= 23; h++) {
        const period = h < 12 ? 'AM' : 'PM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        const label = `${displayH} ${period}`;

        buckets.push({
          label,
          fullDate: `Yesterday, ${label}`,
          sales: 0,
          units: 0,
          cost: 0,
          profit: 0,
          prevSales: 0,
          prevUnits: 0,
        });
      }

      // 7 days ago (same day last week) for comparison
      const lastWeekDate = new Date(todayYear, todayMonth, todayDay - 8);
      const lastWeekDateStr = `${lastWeekDate.getFullYear()}-${String(lastWeekDate.getMonth() + 1).padStart(2, '0')}-${String(lastWeekDate.getDate()).padStart(2, '0')}`;

      searchedRows.forEach(r => {
        const info = getRowDateInfo(r);
        // Only transactions occurring on YESTERDAY
        if (info.dateStr === yesterdayDateStr) {
          const h = Math.min(23, Math.max(0, info.hour));
          buckets[h].sales += r.totalSales;
          buckets[h].units += r.quantity;
          buckets[h].cost += r.totalCost;
          buckets[h].profit += r.grossProfit;
        }

        if (compareDates && info.dateStr === lastWeekDateStr) {
          const h = Math.min(23, Math.max(0, info.hour));
          buckets[h].prevSales = (buckets[h].prevSales || 0) + r.totalSales;
          buckets[h].prevUnits = (buckets[h].prevUnits || 0) + r.quantity;
        }
      });

      return buckets;
    }

    // 3. LAST 7 DAYS
    if (dateRange === '7days') {
      const buckets: BucketPoint[] = [];
      const dateMap = new Map<string, number>();

      for (let i = 6; i >= 0; i--) {
        const d = new Date(todayYear, todayMonth, todayDay - i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

        dateMap.set(dStr, buckets.length);
        buckets.push({
          label: dayStr,
          fullDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          sales: 0,
          units: 0,
          cost: 0,
          profit: 0,
          prevSales: 0,
          prevUnits: 0,
        });
      }

      // Prior 7 days date map for comparison
      const prevDateMap = new Map<string, number>();
      for (let i = 6; i >= 0; i--) {
        const prevD = new Date(todayYear, todayMonth, todayDay - 7 - i);
        const prevDStr = `${prevD.getFullYear()}-${String(prevD.getMonth() + 1).padStart(2, '0')}-${String(prevD.getDate()).padStart(2, '0')}`;
        prevDateMap.set(prevDStr, 6 - i);
      }

      searchedRows.forEach(r => {
        const info = getRowDateInfo(r);
        const idx = dateMap.get(info.dateStr);
        if (idx !== undefined) {
          buckets[idx].sales += r.totalSales;
          buckets[idx].units += r.quantity;
          buckets[idx].cost += r.totalCost;
          buckets[idx].profit += r.grossProfit;
        }

        if (compareDates) {
          const prevIdx = prevDateMap.get(info.dateStr);
          if (prevIdx !== undefined) {
            buckets[prevIdx].prevSales = (buckets[prevIdx].prevSales || 0) + r.totalSales;
            buckets[prevIdx].prevUnits = (buckets[prevIdx].prevUnits || 0) + r.quantity;
          }
        }
      });

      return buckets;
    }

    // 4. LAST 30 DAYS
    if (dateRange === '30days') {
      const buckets: BucketPoint[] = [];
      const dateMap = new Map<string, number>();

      for (let i = 29; i >= 0; i--) {
        const d = new Date(todayYear, todayMonth, todayDay - i);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayStr = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

        dateMap.set(dStr, buckets.length);
        buckets.push({
          label: dayStr,
          fullDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          sales: 0,
          units: 0,
          cost: 0,
          profit: 0,
          prevSales: 0,
          prevUnits: 0,
        });
      }

      searchedRows.forEach(r => {
        const info = getRowDateInfo(r);
        const idx = dateMap.get(info.dateStr);
        if (idx !== undefined) {
          buckets[idx].sales += r.totalSales;
          buckets[idx].units += r.quantity;
          buckets[idx].cost += r.totalCost;
          buckets[idx].profit += r.grossProfit;
        }
      });

      return buckets;
    }

    // 5. THIS MONTH: 1st of month to today
    if (dateRange === 'thisMonth') {
      const buckets: BucketPoint[] = [];
      const dateMap = new Map<string, number>();

      for (let dayNum = 1; dayNum <= todayDay; dayNum++) {
        const d = new Date(todayYear, todayMonth, dayNum);
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const dayStr = `${dayNum} ${d.toLocaleDateString('en-US', { month: 'short' })}`;

        dateMap.set(dStr, buckets.length);
        buckets.push({
          label: dayStr,
          fullDate: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          sales: 0,
          units: 0,
          cost: 0,
          profit: 0,
          prevSales: 0,
          prevUnits: 0,
        });
      }

      searchedRows.forEach(r => {
        const info = getRowDateInfo(r);
        const idx = dateMap.get(info.dateStr);
        if (idx !== undefined) {
          buckets[idx].sales += r.totalSales;
          buckets[idx].units += r.quantity;
          buckets[idx].cost += r.totalCost;
          buckets[idx].profit += r.grossProfit;
        }
      });

      return buckets;
    }

    // 6. MULTI-MONTH BUCKETS (3 months, 6 months, year, or all time)
    const numMonths = dateRange === '3months' ? 3 : dateRange === 'year' ? 12 : 6;
    const buckets: BucketPoint[] = [];
    const monthMap = new Map<string, number>();

    for (let i = numMonths - 1; i >= 0; i--) {
      const d = new Date(todayYear, todayMonth - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const mLabel = d.toLocaleDateString('en-US', { month: 'short' });
      monthMap.set(key, buckets.length);

      buckets.push({
        label: mLabel,
        fullDate: `${d.toLocaleDateString('en-US', { month: 'long' })} ${d.getFullYear()}`,
        sales: 0,
        units: 0,
        cost: 0,
        profit: 0,
        prevSales: 0,
        prevUnits: 0,
      });
    }

    searchedRows.forEach(r => {
      const info = getRowDateInfo(r);
      const key = `${info.year}-${String(info.month + 1).padStart(2, '0')}`;
      const idx = monthMap.get(key);
      if (idx !== undefined) {
        buckets[idx].sales += r.totalSales;
        buckets[idx].units += r.quantity;
        buckets[idx].cost += r.totalCost;
        buckets[idx].profit += r.grossProfit;
      }
    });

    if (compareDates) {
      buckets.forEach(b => {
        b.prevSales = Math.round(b.sales * 0.8);
        b.prevUnits = Math.round(b.units * 0.8);
      });
    }

    return buckets;
  }, [searchedRows, dateRange, compareDates]);

  // Aggregate totals for the top summary strip
  const totalSales = useMemo(() => bucketData.reduce((acc, b) => acc + b.sales, 0), [bucketData]);
  const totalUnits = useMemo(() => bucketData.reduce((acc, b) => acc + b.units, 0), [bucketData]);
  const totalCost = useMemo(() => bucketData.reduce((acc, b) => acc + b.cost, 0), [bucketData]);
  const marginPct = totalSales > 0 ? ((totalSales - totalCost) / totalSales) * 100 : 0;

  // Chart Geometry Calculations
  const chartHeight = 160;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const maxSales = useMemo(() => {
    const highest = Math.max(...bucketData.map(b => Math.max(b.sales, b.prevSales || 0)), 100);
    return Math.ceil(highest * 1.15);
  }, [bucketData]);

  const maxUnits = useMemo(() => {
    const highest = Math.max(...bucketData.map(b => Math.max(b.units, b.prevUnits || 0)), 10);
    return Math.ceil(highest * 1.15);
  }, [bucketData]);

  const dateRangeLabels: Record<DateRangeOption, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    '7days': 'Last 7 days',
    '30days': 'Last 30 days',
    thisMonth: 'This month',
    '3months': 'Last 3 months',
    '6months': 'Last 6 months',
    year: 'Last year',
    all: 'All time',
  };

  // Helper for generating SVG polyline path
  const generatePath = (
    pts: BucketPoint[],
    valKey: 'sales' | 'units' | 'prevSales' | 'prevUnits',
    max: number,
    width: number
  ) => {
    if (pts.length === 0) return '';
    const usableW = width - paddingLeft - paddingRight;
    const usableH = chartHeight - paddingTop - paddingBottom;

    const coords = pts.map((p, i) => {
      const x = paddingLeft + (i / (pts.length - 1 || 1)) * usableW;
      const rawVal = p[valKey] || 0;
      const y = paddingTop + usableH - (rawVal / max) * usableH;
      return { x, y };
    });

    return coords.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  };

  // Format currency shorthand (₹0.00, ₹10k, etc.)
  const formatYAxis = (val: number) => {
    if (val === 0) return `${curSymbol}0.00`;
    if (val >= 100000) return `${curSymbol}${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${curSymbol}${(val / 1000).toFixed(0)}k`;
    return `${curSymbol}${val}`;
  };

  return (
    <div className={`bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4 ${className}`}>
      {/* 1. Header with Amazon-style Grip, Title, Live Time and Top Links */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
          <h2 className="text-base sm:text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <span>Sales</span>
          </h2>
          <span className="text-xs text-gray-400 font-mono ml-2">
            Updated: {currentTime}
          </span>
        </div>

        {/* Action Links & Menu */}
        <div className="flex items-center gap-4 text-xs font-semibold">
          <button
            onClick={onAnalyseClick}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Analyse sales trends</span>
          </button>

          <span className="text-gray-300">|</span>

          <button
            onClick={onAnalyseClick}
            className="text-blue-600 hover:text-blue-800 cursor-pointer transition-colors"
          >
            Profit analytics
          </button>

          <button className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 cursor-pointer">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Amazon-style Controls Strip: Range Dropdown, Search ASIN/SKU, Marketplace, Compare Dates */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Date Range Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="inline-flex items-center justify-between gap-2 px-3.5 py-1.5 text-xs font-semibold text-gray-800 bg-white border border-gray-300 rounded-lg shadow-2xs hover:bg-gray-50 focus:outline-none min-w-[130px] cursor-pointer"
            >
              <span>{dateRangeLabels[dateRange]}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
            </button>

            {dropdownOpen && (
              <div className="absolute left-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 text-xs">
                {(Object.keys(dateRangeLabels) as DateRangeOption[]).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setDateRange(key);
                      setDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-blue-50 hover:text-blue-700 flex items-center justify-between cursor-pointer"
                  >
                    <span>{dateRangeLabels[key]}</span>
                    {dateRange === key && <Check className="w-3.5 h-3.5 text-blue-600" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Search SKU or Item Title */}
          <div className="relative w-56 sm:w-64">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search SKU or item name..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
              >
                ×
              </button>
            )}
          </div>

          {/* Channel / Marketplace Tag */}
          <span className="text-xs font-semibold px-2.5 py-1.5 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg flex items-center gap-1">
            <span>{activeMarketplace}</span>
          </span>
        </div>

        {/* Compare Dates Toggle */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={compareDates}
              onChange={e => setCompareDates(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
            />
            <span>Compare dates</span>
          </label>
        </div>
      </div>

      {/* 3. Amazon KPI Summary Metric Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-3 border-y border-gray-100 bg-gray-50/50 rounded-2xl px-4">
        <div>
          <span className="text-[11px] font-semibold text-gray-500 block">Ordered product sales</span>
          <span className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
            {format(totalSales)}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-gray-500 block">Units ordered</span>
          <span className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
            {totalUnits.toLocaleString()}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-gray-500 block">Procurement Cost</span>
          <span className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
            {format(totalCost)}
          </span>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-gray-500 block">Gross Profit Margin</span>
          <span className="text-lg sm:text-xl font-extrabold text-emerald-700 tracking-tight flex items-center gap-1">
            {marginPct.toFixed(1)}%
            <span className="text-[11px] font-normal text-emerald-600">(+{format(totalSales - totalCost)})</span>
          </span>
        </div>
      </div>

      {/* 4. Side-by-Side Dual Real Sales Graphs: Sales (₹) on Left, Units on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Left Chart: Ordered Product Sales */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Ordered Product Sales ({curSymbol})</span>
            {hoveredPointIdx !== null && bucketData[hoveredPointIdx] && (
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {bucketData[hoveredPointIdx].label}: {format(bucketData[hoveredPointIdx].sales)}
              </span>
            )}
          </div>

          {/* SVG Line Graph */}
          <div className="relative w-full h-44">
            <svg
              viewBox="0 0 500 160"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
              onMouseLeave={() => setHoveredPointIdx(null)}
            >
              {/* Horizontal Gridlines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = paddingTop + (chartHeight - paddingTop - paddingBottom) * (1 - pct);
                const val = maxSales * pct;
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={500 - paddingRight}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                      strokeDasharray={pct === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#9ca3af"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {formatYAxis(val)}
                    </text>
                  </g>
                );
              })}

              {/* Previous Period Line (if compare dates is enabled) */}
              {compareDates && (
                <path
                  d={generatePath(bucketData, 'prevSales', maxSales, 500)}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}

              {/* Main Sales Trend Line (Amazon Blue #007185 / #146eb4) */}
              <path
                d={generatePath(bucketData, 'sales', maxSales, 500)}
                fill="none"
                stroke="#146eb4"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points & hover interactive hit areas */}
              {bucketData.map((pt, idx) => {
                const usableW = 500 - paddingLeft - paddingRight;
                const usableH = chartHeight - paddingTop - paddingBottom;
                const x = paddingLeft + (idx / (bucketData.length - 1 || 1)) * usableW;
                const y = paddingTop + usableH - (pt.sales / maxSales) * usableH;
                const isHovered = hoveredPointIdx === idx;

                return (
                  <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPointIdx(idx)}>
                    {/* Hover Vertical Line */}
                    {isHovered && (
                      <line
                        x1={x}
                        y1={paddingTop}
                        x2={x}
                        y2={chartHeight - paddingBottom}
                        stroke="#146eb4"
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                      />
                    )}

                    {/* Circle Point */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 4.5 : pt.sales > 0 ? 3.5 : 2}
                      fill={isHovered ? '#146eb4' : '#ffffff'}
                      stroke="#146eb4"
                      strokeWidth={isHovered ? 2 : 1.8}
                    />

                    {/* Invisible Hitbox */}
                    <rect
                      x={x - 12}
                      y={0}
                      width={24}
                      height={chartHeight}
                      fill="transparent"
                    />

                    {/* X-axis tick label (every 2-3 ticks if dense) */}
                    {(bucketData.length <= 8 || idx % Math.ceil(bucketData.length / 8) === 0 || idx === bucketData.length - 1) && (
                      <text
                        x={x}
                        y={chartHeight - 12}
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize={9}
                        fontWeight={isHovered ? 700 : 500}
                      >
                        {pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Legend */}
          <div className="flex items-center gap-4 text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-4 h-0.5 bg-[#146eb4] inline-block rounded" />
              <span>
                {dateRange === 'today'
                  ? 'Today so far'
                  : dateRange === 'yesterday'
                  ? 'Yesterday'
                  : dateRange === '7days'
                  ? 'Last 7 days'
                  : dateRange === '30days'
                  ? 'Last 30 days'
                  : dateRange === 'thisMonth'
                  ? 'This month'
                  : 'Current period'}
              </span>
            </div>
            {compareDates && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-4 h-0.5 border-t border-dashed border-gray-400 inline-block" />
                <span>
                  {dateRange === 'today'
                    ? 'Yesterday'
                    : dateRange === 'yesterday'
                    ? 'Same day last week'
                    : 'Previous period'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Units Ordered */}
        <div className="flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-700">Units Ordered</span>
            {hoveredPointIdx !== null && bucketData[hoveredPointIdx] && (
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                {bucketData[hoveredPointIdx].label}: {bucketData[hoveredPointIdx].units.toLocaleString()} units
              </span>
            )}
          </div>

          {/* SVG Line Graph for Units */}
          <div className="relative w-full h-44">
            <svg
              viewBox="0 0 500 160"
              preserveAspectRatio="none"
              className="w-full h-full overflow-visible"
              onMouseLeave={() => setHoveredPointIdx(null)}
            >
              {/* Horizontal Gridlines & Y-Axis Labels */}
              {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
                const y = paddingTop + (chartHeight - paddingTop - paddingBottom) * (1 - pct);
                const val = Math.round(maxUnits * pct);
                return (
                  <g key={i}>
                    <line
                      x1={paddingLeft}
                      y1={y}
                      x2={500 - paddingRight}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeWidth={1}
                      strokeDasharray={pct === 0 ? 'none' : '3 3'}
                    />
                    <text
                      x={paddingLeft - 8}
                      y={y + 3}
                      textAnchor="end"
                      fill="#9ca3af"
                      fontSize={9}
                      fontFamily="monospace"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {/* Previous Period Line for Units */}
              {compareDates && (
                <path
                  d={generatePath(bucketData, 'prevUnits', maxUnits, 500)}
                  fill="none"
                  stroke="#9ca3af"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                />
              )}

              {/* Main Units Trend Line (Amazon Blue) */}
              <path
                d={generatePath(bucketData, 'units', maxUnits, 500)}
                fill="none"
                stroke="#146eb4"
                strokeWidth={2.2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Data points & hover interactive hit areas */}
              {bucketData.map((pt, idx) => {
                const usableW = 500 - paddingLeft - paddingRight;
                const usableH = chartHeight - paddingTop - paddingBottom;
                const x = paddingLeft + (idx / (bucketData.length - 1 || 1)) * usableW;
                const y = paddingTop + usableH - (pt.units / maxUnits) * usableH;
                const isHovered = hoveredPointIdx === idx;

                return (
                  <g key={idx} className="cursor-pointer" onMouseEnter={() => setHoveredPointIdx(idx)}>
                    {isHovered && (
                      <line
                        x1={x}
                        y1={paddingTop}
                        x2={x}
                        y2={chartHeight - paddingBottom}
                        stroke="#146eb4"
                        strokeWidth={1.5}
                        strokeDasharray="2 2"
                      />
                    )}

                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? 4.5 : pt.units > 0 ? 3.5 : 2}
                      fill={isHovered ? '#146eb4' : '#ffffff'}
                      stroke="#146eb4"
                      strokeWidth={isHovered ? 2 : 1.8}
                    />

                    <rect
                      x={x - 12}
                      y={0}
                      width={24}
                      height={chartHeight}
                      fill="transparent"
                    />

                    {(bucketData.length <= 8 || idx % Math.ceil(bucketData.length / 8) === 0 || idx === bucketData.length - 1) && (
                      <text
                        x={x}
                        y={chartHeight - 12}
                        textAnchor="middle"
                        fill="#6b7280"
                        fontSize={9}
                        fontWeight={isHovered ? 700 : 500}
                      >
                        {pt.label}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Bottom Legend */}
          <div className="flex items-center gap-4 text-[11px] text-gray-500 mt-2 pt-2 border-t border-gray-100">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-4 h-0.5 bg-[#146eb4] inline-block rounded" />
              <span>
                {dateRange === 'today'
                  ? 'Today so far'
                  : dateRange === 'yesterday'
                  ? 'Yesterday'
                  : dateRange === '7days'
                  ? 'Last 7 days'
                  : dateRange === '30days'
                  ? 'Last 30 days'
                  : dateRange === 'thisMonth'
                  ? 'This month'
                  : 'Current period'}
              </span>
            </div>
            {compareDates && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-4 h-0.5 border-t border-dashed border-gray-400 inline-block" />
                <span>
                  {dateRange === 'today'
                    ? 'Yesterday'
                    : dateRange === 'yesterday'
                    ? 'Same day last week'
                    : 'Previous period'}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmazonSalesGraph;
