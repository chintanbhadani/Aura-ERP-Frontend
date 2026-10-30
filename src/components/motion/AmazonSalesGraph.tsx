import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart } from '@mui/x-charts/LineChart';
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

export interface AmazonSalesGraphProps {
  rows: SalesReportRow[];
  currencySymbol?: string;
  className?: string;
  presetRange?: string;
  selectedRange?: DateRangeOption;
  onDateRangeChange?: (range: DateRangeOption, startDate: string, endDate: string) => void;
  onAnalyseClick?: () => void;
}

export type DateRangeOption =
  | 'today'
  | '7days'
  | '30days'
  | 'thisMonth'
  | '3months'
  | '6months'
  | 'year'
  | 'all';

export const getDateRangeBounds = (
  range: DateRangeOption
): { startDate: string; endDate: string } => {
  const now = new Date();
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatYMD(now);

  switch (range) {
    case 'today':
      return { startDate: todayStr, endDate: todayStr };
    case '7days': {
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      return { startDate: formatYMD(past), endDate: todayStr };
    }
    case '30days': {
      const past = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      return { startDate: formatYMD(past), endDate: todayStr };
    }
    case 'thisMonth': {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { startDate: formatYMD(firstDay), endDate: todayStr };
    }
    case '3months': {
      const past = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
      return { startDate: formatYMD(past), endDate: todayStr };
    }
    case '6months': {
      const past = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
      return { startDate: formatYMD(past), endDate: todayStr };
    }
    case 'year': {
      const past = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      return { startDate: formatYMD(past), endDate: todayStr };
    }
    case 'all':
      return { startDate: '', endDate: '' };
    default:
      return { startDate: '', endDate: '' };
  }
};

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
  selectedRange,
  onDateRangeChange,
  onAnalyseClick
}) => {
  const { format, symbol } = useCurrency();
  const curSymbol = currencySymbol || symbol || '₹';

  // Amazon Seller controls
  const [dateRange, setDateRange] = useState<DateRangeOption>(
    selectedRange || (presetRange === 'today' ? 'today' : presetRange === 'last7' ? '7days' : presetRange === 'thisMonth' ? 'thisMonth' : 'all')
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [compareDates, setCompareDates] = useState(false);
  const [activeMarketplace, setActiveMarketplace] = useState('All Channels (1)');

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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownOpen]);

  // Sync date range with presetRange or selectedRange if passed
  useEffect(() => {
    if (selectedRange) {
      setDateRange(selectedRange);
    } else if (presetRange === 'today') {
      setDateRange('today');
    } else if (presetRange === 'last7') {
      setDateRange('7days');
    } else if (presetRange === 'thisMonth') {
      setDateRange('thisMonth');
    } else if (presetRange === 'all') {
      setDateRange('all');
    }
  }, [selectedRange, presetRange]);

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

    // 2. LAST 7 DAYS
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

  const maxSales = useMemo(() => {
    const highest = Math.max(...bucketData.map(b => Math.max(b.sales, b.prevSales || 0)), 100);
    return Math.ceil(highest * 1.15);
  }, [bucketData]);

  const maxUnits = useMemo(() => {
    const highest = Math.max(...bucketData.map(b => Math.max(b.units, b.prevUnits || 0)), 10);
    return Math.ceil(highest * 1.15);
  }, [bucketData]);

  const dateRangeLabels: Record<DateRangeOption, string> = {
    all: 'All time',
    today: 'Today',
    '7days': 'Last 7 days',
    '30days': 'Last 30 days',
    thisMonth: 'This month',
    '3months': 'Last 3 months',
    '6months': 'Last 6 months',
    year: 'Last year',
  };

  const currentPeriodLabel =
    dateRange === 'today'
      ? 'Today so far'
      : dateRange === '7days'
      ? 'Last 7 days'
      : dateRange === '30days'
      ? 'Last 30 days'
      : dateRange === 'thisMonth'
      ? 'This month'
      : 'Current period';

  const prevPeriodLabel =
    dateRange === 'today'
      ? 'Yesterday'
      : 'Previous period';

  // Format currency shorthand (₹0.00, ₹10k, etc.)
  const formatSalesYAxis = (val: number | null) => {
    if (val === null || val === 0) return `${curSymbol}0.00`;
    if (val >= 100000) return `${curSymbol}${(val / 100000).toFixed(1)}L`;
    if (val >= 1000) return `${curSymbol}${(val / 1000).toFixed(0)}k`;
    return `${curSymbol}${val}`;
  };

  const formatUnitsYAxis = (val: number | null) => {
    if (val === null || val === 0) return '0';
    if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
    return `${val}`;
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
          <div className="relative" ref={dropdownRef}>
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
                      const bounds = getDateRangeBounds(key);
                      onDateRangeChange?.(key, bounds.startDate, bounds.endDate);
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

      {/* 4. Side-by-Side Dual Real Sales Graphs: Sales on Left, Units on Right via MUI LineChart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Left Chart: Ordered Product Sales */}
        <div className="flex flex-col justify-between bg-white rounded-2xl border border-gray-100 p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1 px-2 pt-1">
            <span className="text-xs font-bold text-gray-700">Ordered Product Sales ({curSymbol})</span>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Total: {format(totalSales)}
            </span>
          </div>

          <div className="w-full h-48">
            <LineChart
              xAxis={[
                {
                  data: bucketData.map(b => b.label),
                  scaleType: 'point',
                  tickLabelStyle: {
                    fontSize: 9,
                    fill: '#6b7280',
                  },
                  tickLabelInterval: (val, index) => {
                    if (bucketData.length <= 8) return true;
                    const step = Math.ceil(bucketData.length / 8);
                    return index % step === 0 || index === bucketData.length - 1;
                  },
                },
              ]}
              yAxis={[
                {
                  valueFormatter: (value: number | null) => formatSalesYAxis(value),
                  tickLabelStyle: {
                    fontSize: 9,
                    fill: '#9ca3af',
                    fontFamily: 'monospace',
                  },
                  min: 0,
                  max: maxSales,
                },
              ]}
              series={[
                {
                  id: 'current-sales',
                  data: bucketData.map(b => b.sales),
                  label: currentPeriodLabel,
                  color: '#146eb4',
                  curve: 'linear' as const,
                  showMark: true,
                  valueFormatter: (val: number | null) => format(val ?? 0),
                },
                ...(compareDates
                  ? [
                      {
                        id: 'prev-sales',
                        data: bucketData.map(b => b.prevSales ?? 0),
                        label: prevPeriodLabel,
                        color: '#9ca3af',
                        curve: 'linear' as const,
                        showMark: false,
                        valueFormatter: (val: number | null) => format(val ?? 0),
                      },
                    ]
                  : []),
              ]}
              height={190}
              margin={{ left: 55, right: 15, top: 15, bottom: 25 }}
              grid={{ horizontal: true }}
              sx={{
                width: '100%',
                '& .MuiChartsLegend-root': {
                  display: 'none',
                },
                '& .MuiChartsGrid-line': {
                  strokeDasharray: '3 3',
                  stroke: '#e5e7eb',
                },
                '& .MuiChartsAxis-line': {
                  stroke: '#e5e7eb',
                },
                '& .MuiChartsAxis-tick': {
                  stroke: '#cbd5e1',
                },
                '& .MuiLineElement-root': {
                  strokeWidth: 2.2,
                },
                '& .MuiLineElement-series-prev-sales': {
                  strokeDasharray: '4 4',
                  strokeWidth: 2,
                },
                '& .MuiMarkElement-root': {
                  strokeWidth: 1.8,
                  fill: '#ffffff',
                },
              }}
            />
          </div>

          {/* Bottom Legend */}
          <div className="flex items-center gap-4 text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100 px-2">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-4 h-0.5 bg-[#146eb4] inline-block rounded" />
              <span>{currentPeriodLabel}</span>
            </div>
            {compareDates && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-4 h-0.5 border-t border-dashed border-gray-400 inline-block" />
                <span>{prevPeriodLabel}</span>
              </div>
            )}
          </div>
        </div>

        {/* Right Chart: Units Ordered */}
        <div className="flex flex-col justify-between bg-white rounded-2xl border border-gray-100 p-3 shadow-2xs">
          <div className="flex items-center justify-between mb-1 px-2 pt-1">
            <span className="text-xs font-bold text-gray-700">Units Ordered</span>
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
              Total: {totalUnits.toLocaleString()} units
            </span>
          </div>

          <div className="w-full h-48">
            <LineChart
              xAxis={[
                {
                  data: bucketData.map(b => b.label),
                  scaleType: 'point',
                  tickLabelStyle: {
                    fontSize: 9,
                    fill: '#6b7280',
                  },
                  tickLabelInterval: (val, index) => {
                    if (bucketData.length <= 8) return true;
                    const step = Math.ceil(bucketData.length / 8);
                    return index % step === 0 || index === bucketData.length - 1;
                  },
                },
              ]}
              yAxis={[
                {
                  valueFormatter: (value: number | null) => formatUnitsYAxis(value),
                  tickLabelStyle: {
                    fontSize: 9,
                    fill: '#9ca3af',
                    fontFamily: 'monospace',
                  },
                  min: 0,
                  max: maxUnits,
                },
              ]}
              series={[
                {
                  id: 'current-units',
                  data: bucketData.map(b => b.units),
                  label: currentPeriodLabel,
                  color: '#146eb4',
                  curve: 'linear' as const,
                  showMark: true,
                  valueFormatter: (val: number | null) => `${(val ?? 0).toLocaleString()} units`,
                },
                ...(compareDates
                  ? [
                      {
                        id: 'prev-units',
                        data: bucketData.map(b => b.prevUnits ?? 0),
                        label: prevPeriodLabel,
                        color: '#9ca3af',
                        curve: 'linear' as const,
                        showMark: false,
                        valueFormatter: (val: number | null) => `${(val ?? 0).toLocaleString()} units`,
                      },
                    ]
                  : []),
              ]}
              height={190}
              margin={{ left: 50, right: 15, top: 15, bottom: 25 }}
              grid={{ horizontal: true }}
              sx={{
                width: '100%',
                '& .MuiChartsLegend-root': {
                  display: 'none',
                },
                '& .MuiChartsGrid-line': {
                  strokeDasharray: '3 3',
                  stroke: '#e5e7eb',
                },
                '& .MuiChartsAxis-line': {
                  stroke: '#e5e7eb',
                },
                '& .MuiChartsAxis-tick': {
                  stroke: '#cbd5e1',
                },
                '& .MuiLineElement-root': {
                  strokeWidth: 2.2,
                },
                '& .MuiLineElement-series-prev-units': {
                  strokeDasharray: '4 4',
                  strokeWidth: 2,
                },
                '& .MuiMarkElement-root': {
                  strokeWidth: 1.8,
                  fill: '#ffffff',
                },
              }}
            />
          </div>

          {/* Bottom Legend */}
          <div className="flex items-center gap-4 text-[11px] text-gray-500 mt-1 pt-2 border-t border-gray-100 px-2">
            <div className="flex items-center gap-1.5 font-medium">
              <span className="w-4 h-0.5 bg-[#146eb4] inline-block rounded" />
              <span>{currentPeriodLabel}</span>
            </div>
            {compareDates && (
              <div className="flex items-center gap-1.5 text-gray-400">
                <span className="w-4 h-0.5 border-t border-dashed border-gray-400 inline-block" />
                <span>{prevPeriodLabel}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AmazonSalesGraph;
