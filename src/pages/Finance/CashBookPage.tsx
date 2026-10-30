import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Landmark, 
  Wallet, 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  RefreshCw, 
  PlusCircle, 
  Settings, 
  ChevronRight, 
  ChevronDown, 
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Building2, 
  Smartphone, 
  FileSpreadsheet, 
  AlertCircle, 
  X, 
  CheckCircle2, 
  SlidersHorizontal,
  Receipt
} from 'lucide-react';
import { 
  fetchCashBookReport, 
  fetchCashBookConfig, 
  updateCashBookConfig, 
  createCashQuickEntry, 
  type CashBookDay, 
  type CashBookSummary,
  type CashBookConfig
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { StatSparkCard } from '../../components/motion/StatSparkCard';
import { PillTabs, type TabOption } from '../../components/motion/PillTabs';
import { useCurrency } from '../../helper/currency';

const DATE_PRESET_TABS: TabOption[] = [
  { id: 'all', label: 'All History' },
  { id: 'today', label: 'Today' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
];

const CashBookPageBase: React.FC = () => {
  const [data, setData] = useState<{ summary: CashBookSummary | null; days: CashBookDay[] }>({
    summary: null,
    days: []
  });
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState<'all' | 'today' | 'this_month' | 'last_month'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [search, setSearch] = useState('');
  const [onlyActiveDays, setOnlyActiveDays] = useState(false);
  const [expandedDay, setExpandedDay] = useState<string | null>(null);

  // Pagination state (default 20 records)
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Modals
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState({
    initialOpeningCash: 201000,
    initialOpeningBank: 0,
    initialOpeningAirtel: 0,
    notes: ''
  });

  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    type: 'BANK_DEPOSIT',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    paymentType: 'CASH'
  });
  const [entrySubmitting, setEntrySubmitting] = useState(false);

  // Load report data
  const loadReport = async () => {
    setLoading(true);
    try {
      const res = await fetchCashBookReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search || undefined
      });
      setData(res);
    } catch (err: any) {
      console.error('Failed to load cash book report:', err);
      errorToast(err.response?.data?.error || 'Failed to load Cash Book & Balance Sheet');
    } finally {
      setLoading(false);
    }
  };

  // Load initial configuration
  const loadConfig = async () => {
    try {
      const cfg = await fetchCashBookConfig();
      if (cfg) {
        setConfigForm({
          initialOpeningCash: Number(cfg.initialOpeningCash || 0),
          initialOpeningBank: Number(cfg.initialOpeningBank || 0),
          initialOpeningAirtel: Number(cfg.initialOpeningAirtel || 0),
          notes: cfg.notes || ''
        });
      }
    } catch (err) {
      console.error('Failed to load cash book config:', err);
    }
  };

  useEffect(() => {
    loadReport();
    loadConfig();
  }, [startDate, endDate]);

  // Handle Preset selection
  const handleSelectPreset = (preset: 'all' | 'today' | 'this_month' | 'last_month') => {
    setActivePreset(preset);
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const toStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const todayStr = toStr(now);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      setStartDate(toStr(firstDay));
      setEndDate(toStr(lastDay));
    } else if (preset === 'last_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      setStartDate(toStr(firstDay));
      setEndDate(toStr(lastDay));
    }
  };

  // Save config
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateCashBookConfig({
        initialOpeningCash: Number(configForm.initialOpeningCash),
        initialOpeningBank: Number(configForm.initialOpeningBank),
        initialOpeningAirtel: Number(configForm.initialOpeningAirtel),
        notes: configForm.notes
      });
      successToast('Opening balances saved successfully');
      setIsConfigModalOpen(false);
      loadReport();
    } catch (err: any) {
      errorToast('Failed to save opening balance configuration');
    }
  };

  // Save Quick Entry
  const handleSaveQuickEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entryForm.amount || Number(entryForm.amount) <= 0) {
      errorToast('Please enter a valid amount');
      return;
    }

    setEntrySubmitting(true);
    try {
      await createCashQuickEntry({
        type: entryForm.type,
        amount: Number(entryForm.amount),
        date: entryForm.date,
        description: entryForm.description,
        paymentType: entryForm.paymentType
      });
      successToast('Cash movement recorded successfully');
      setIsEntryModalOpen(false);
      setEntryForm({
        type: 'BANK_DEPOSIT',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        description: '',
        paymentType: 'CASH'
      });
      loadReport();
    } catch (err: any) {
      errorToast(err.response?.data?.error || 'Failed to save cash entry');
    } finally {
      setEntrySubmitting(false);
    }
  };

  const { symbol } = useCurrency();

  // Format currency
  const formatCur = (num: number) => {
    return `${symbol ? `${symbol} ` : '₹ '}${Number(num || 0).toLocaleString('en-IN')}`;
  };

  const formatNum = (num: number) => {
    if (!num && num !== 0) return '—';
    if (num === 0) return '0';
    return Number(num).toLocaleString('en-IN');
  };

  // Filtered rows
  const displayedDays = useMemo(() => {
    let list = data.days;
    if (onlyActiveDays) {
      list = list.filter(d => d.hasActivity);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter(d => d.date.includes(q));
    }
    // Latest days on top
    return [...list].reverse();
  }, [data.days, onlyActiveDays, search]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, startDate, endDate, onlyActiveDays, activePreset, pageSize]);

  // Pagination calculations (Default 20 records per page)
  const totalItems = displayedDays.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const paginatedDays = useMemo(() => {
    const startIndex = (validCurrentPage - 1) * pageSize;
    return displayedDays.slice(startIndex, startIndex + pageSize);
  }, [displayedDays, validCurrentPage, pageSize]);

  // Visible page numbers generator
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (validCurrentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (validCurrentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        pages.push(validCurrentPage - 1);
        pages.push(validCurrentPage);
        pages.push(validCurrentPage + 1);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  }, [validCurrentPage, totalPages]);

  // Period totals for summary footer
  const periodTotals = useMemo(() => {
    return displayedDays.reduce(
      (acc, d) => ({
        totalSale: acc.totalSale + (d.totalSale || 0),
        creditSale: acc.creditSale + (d.creditSale || 0),
        bankSale: acc.bankSale + (d.bankSale || 0),
        mobileMoneySale: acc.mobileMoneySale + (d.mobileMoneySale || 0),
        cashSale: acc.cashSale + (d.cashSale || 0),
        receivedCreditSale: acc.receivedCreditSale + (d.receivedCreditSale || 0),
        cashPurchase: acc.cashPurchase + (d.cashPurchase || 0),
        cashExpense: acc.cashExpense + (d.cashExpense || 0),
        cashPaymentForPurchase: acc.cashPaymentForPurchase + (d.cashPaymentForPurchase || 0),
        cashInBank: acc.cashInBank + (d.cashInBank || 0),
        cashOutFromBank: acc.cashOutFromBank + (d.cashOutFromBank || 0),
      }),
      {
        totalSale: 0,
        creditSale: 0,
        bankSale: 0,
        mobileMoneySale: 0,
        cashSale: 0,
        receivedCreditSale: 0,
        cashPurchase: 0,
        cashExpense: 0,
        cashPaymentForPurchase: 0,
        cashInBank: 0,
        cashOutFromBank: 0,
      }
    );
  }, [displayedDays]);

  // Sparklines computed from chronological transaction series
  const sparklines = useMemo(() => {
    const list = [...data.days];
    if (list.length === 0) {
      return {
        storeCash: [180000, 185000, 190000, 184700, 204300, data.summary?.currentStoreCash || 204300],
        bank: [0, 0, 0, 0, 0, data.summary?.currentBankBalance || 0],
        airtel: [0, 0, 0, 0, 0, data.summary?.currentAirtelBalance || 0],
        receivable: [0, 0, 0, 0, 0, data.summary?.totalCreditReceivable || 0],
        payable: [0, 0, 0, 0, 0, data.summary?.totalCreditPayable || 0],
      };
    }
    const last7 = list.slice(-7);
    return {
      storeCash: last7.map(d => d.closingBalance),
      bank: last7.map(d => d.cashInBank - d.cashOutFromBank),
      airtel: last7.map(d => d.mobileMoneySale),
      receivable: last7.map(d => d.creditSale),
      payable: last7.map(d => d.cashPurchase),
    };
  }, [data.days, data.summary]);

  // Export CSV
  const handleExportCSV = () => {
    if (data.days.length === 0) {
      errorToast('No data available to export');
      return;
    }

    const headers = [
      'DATE',
      'OPENING BALANCE',
      'TOTAL SALE',
      'CREDIT SALE',
      'BANK SALE',
      'MOBILE MONEY SALE',
      'CASH SALE',
      'RECEIVED FOR CREDIT SALE',
      'CASH PURCHASE',
      'CASH EXPENSE',
      'CASH PAYMENT FOR PURCHASE',
      'CASH IN BANK',
      'CASH OUT FROM BANK',
      'CLOSING BALANCE'
    ];

    const rows = data.days.map(d => [
      d.date,
      d.openingBalance,
      d.totalSale,
      d.creditSale,
      d.bankSale,
      d.mobileMoneySale,
      d.cashSale,
      d.receivedCreditSale,
      d.cashPurchase,
      d.cashExpense,
      d.cashPaymentForPurchase,
      d.cashInBank,
      d.cashOutFromBank,
      d.closingBalance
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `cash_book_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    successToast('Exported Cash Book to CSV');
  };

  const summary = data.summary;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 font-sans space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-600/20">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl md:text-2xl font-black text-gray-900 tracking-tight">
                Cash Book & Balance Sheet
              </h1>
              <p className="text-xs text-gray-500 font-medium">
                Live cash at store, bank liquidity, mobile money, and credit ledger auto-calculated from invoices
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsEntryModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-emerald-600/25 transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ Quick Cash Movement</span>
          </button>

          <button
            onClick={() => setIsConfigModalOpen(true)}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3.5 py-2 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            title="Setup Starting Opening Balances"
          >
            <Settings className="w-3.5 h-3.5 text-gray-500" />
            <span>Opening Balances</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-2 rounded-full text-xs font-semibold transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3.5 py-2 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-gray-500" />
            <span>Print</span>
          </button>

          <button
            onClick={loadReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3.5 py-2 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
            title="Reload live telemetry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* BALANCE SHEET KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Cash at Store */}
        <StatSparkCard
          title="Cash at Store"
          value={summary?.currentStoreCash || 0}
          prefix={symbol ? `${symbol} ` : '₹ '}
          decimals={0}
          badge={{ 
            text: (summary?.currentStoreCash || 0) >= 0 ? 'Surplus' : 'Deficit', 
            trend: (summary?.currentStoreCash || 0) >= 0 ? 'up' : 'alert' 
          }}
          subtitle="Physical counter cash vault"
          sparklineData={sparklines.storeCash}
          icon={Wallet}
        />

        {/* 2. Bank Balance */}
        <StatSparkCard
          title="Bank Balance"
          value={summary?.currentBankBalance || 0}
          prefix={symbol ? `${symbol} ` : '₹ '}
          decimals={0}
          badge={{ text: 'Liquid Funds', trend: 'neutral' }}
          subtitle="Bank transfers & cheques"
          sparklineData={sparklines.bank}
          icon={Building2}
        />

        {/* 3. Airtel / Mobile Money */}
        <StatSparkCard
          title="Airtel / Mobile Money"
          value={summary?.currentAirtelBalance || 0}
          prefix={symbol ? `${symbol} ` : '₹ '}
          decimals={0}
          badge={{ text: 'Digital Wallet', trend: 'neutral' }}
          subtitle="Digital mobile float"
          sparklineData={sparklines.airtel}
          icon={Smartphone}
        />

        {/* 4. Customer Credit Outstanding */}
        <StatSparkCard
          title="Customer Credit"
          value={summary?.totalCreditReceivable || 0}
          prefix={symbol ? `${symbol} ` : '₹ '}
          decimals={0}
          badge={{ text: 'Receivables', trend: 'alert' }}
          subtitle="Uncollected sales invoices"
          sparklineData={sparklines.receivable}
          icon={CreditCard}
        />

        {/* 5. Supplier Credit (Payable) */}
        <StatSparkCard
          title="Supplier Payables"
          value={summary?.totalCreditPayable || 0}
          prefix={symbol ? `${symbol} ` : '₹ '}
          decimals={0}
          badge={{ text: 'Payables', trend: 'down' }}
          subtitle="Outstanding PO balances"
          sparklineData={sparklines.payable}
          icon={DollarSign}
        />
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Preset PillTabs */}
          <div className="flex items-center gap-2">
            <PillTabs
              tabs={DATE_PRESET_TABS}
              activeId={activePreset}
              onChange={(id) => handleSelectPreset(id as any)}
              layoutId="cash-book-preset-pill"
              variant="subtle"
              size="sm"
            />
          </div>

          {/* Date Picker & Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-1.5 text-xs">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  setActivePreset('all');
                }}
                className="bg-transparent outline-none text-gray-700 text-xs"
              />
              <span className="text-gray-400 font-bold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  setActivePreset('all');
                }}
                className="bg-transparent outline-none text-gray-700 text-xs"
              />
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search date (YYYY-MM-DD)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs outline-none focus:border-emerald-500 w-48 text-gray-800"
              />
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyActiveDays}
                onChange={e => setOnlyActiveDays(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span>Only Days with Activity</span>
            </label>
          </div>
        </div>
      </div>

      {/* CASH BOOK SPREADSHEET TABLE */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Category Super Header (Distinct Section Backgrounds) */}
              <tr className="text-gray-600 font-bold text-[11px] border-b border-gray-200/80">
                <th colSpan={3} className="py-2.5 px-3 text-left bg-emerald-50/80 border-r border-emerald-200/60">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/80 text-emerald-800 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-200">
                    <Wallet className="w-3 h-3" />
                    Cash Book
                  </span>
                </th>
                <th colSpan={5} className="py-2.5 px-3 text-left bg-blue-50/80 border-r border-blue-200/60">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100/80 text-blue-800 font-extrabold text-[10px] uppercase tracking-wider border border-blue-200">
                    <TrendingUp className="w-3 h-3" />
                    Sales Breakdown
                  </span>
                </th>
                <th colSpan={4} className="py-2.5 px-3 text-left bg-rose-50/80 border-r border-rose-200/60">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100/80 text-rose-800 font-extrabold text-[10px] uppercase tracking-wider border border-rose-200">
                    <DollarSign className="w-3 h-3" />
                    Store Outflows & Purchases
                  </span>
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-left bg-indigo-50/80 border-r border-indigo-200/60">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-100/80 text-indigo-800 font-extrabold text-[10px] uppercase tracking-wider border border-indigo-200">
                    <Building2 className="w-3 h-3" />
                    Bank Transfers
                  </span>
                </th>
                <th className="py-2.5 px-3 text-right bg-emerald-100/60">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900 font-extrabold text-[10px] uppercase tracking-wider border border-emerald-300">
                    Closing
                  </span>
                </th>
              </tr>

              {/* Exact Column Headers with Section Background Differentiation */}
              <tr className="font-bold border-b border-gray-200 text-[11px]">
                {/* Cash Book Columns */}
                <th className="py-3.5 px-2 w-8 text-center text-gray-400 bg-emerald-50/40">#</th>
                <th className="py-3.5 px-3 whitespace-nowrap text-gray-700 bg-emerald-50/40">Date</th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap bg-emerald-100/60 text-emerald-950 font-black border-r border-emerald-200/60">
                  Opening Balance
                </th>

                {/* Sales Breakdown Columns */}
                <th className="py-3.5 px-3 text-right whitespace-nowrap font-black bg-blue-100/60 text-blue-950">
                  Total Sale
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-amber-800 bg-blue-50/40 font-semibold">
                  Credit Sale
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-blue-800 bg-blue-50/40 font-semibold">
                  Bank Sale
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-purple-800 bg-blue-50/40 font-semibold">
                  Mobile Money Sale
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap font-extrabold text-emerald-800 bg-blue-100/50 border-r border-blue-200/60">
                  Cash Sale
                </th>

                {/* Store Outflows & Purchases Columns */}
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-teal-800 bg-rose-50/40 font-semibold">
                  Received for Credit
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-rose-800 bg-rose-100/50 font-bold">
                  Cash Purchase
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-rose-800 bg-rose-100/50 font-bold">
                  Cash Expense
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-amber-900 bg-rose-50/40 font-semibold border-r border-rose-200/60">
                  Cash Payment PO
                </th>

                {/* Bank Transfers Columns */}
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-indigo-800 bg-indigo-50/40 font-semibold">
                  Cash in Bank
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap text-indigo-800 bg-indigo-50/40 font-semibold border-r border-indigo-200/60">
                  Cash Out Bank
                </th>

                {/* Closing Column */}
                <th className="py-3.5 px-3 text-right whitespace-nowrap font-black bg-emerald-200/70 text-emerald-950">
                  Closing Balance
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 font-mono text-xs">
              {loading ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-8 h-8 animate-spin text-emerald-600" />
                      <span className="text-sm font-semibold">Balancing accounts & computing cash ledgers...</span>
                    </div>
                  </td>
                </tr>
              ) : displayedDays.length === 0 ? (
                <tr>
                  <td colSpan={15} className="py-16 text-center text-gray-500 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-9 h-9 text-gray-400" />
                      <span className="text-sm font-bold text-gray-700">No transactions found</span>
                      <span className="text-xs text-gray-400">Try adjusting your date range or clear search</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedDays.map((row, idx) => {
                  const isExpanded = expandedDay === row.date;
                  const rowNumber = (validCurrentPage - 1) * pageSize + idx + 1;

                  return (
                    <React.Fragment key={row.date}>
                      <motion.tr 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(idx * 0.02, 0.3), duration: 0.2 }}
                        onClick={() => setExpandedDay(isExpanded ? null : row.date)}
                        className={`transition-colors cursor-pointer select-none ${
                          isExpanded 
                            ? 'bg-emerald-50/50' 
                            : row.hasActivity 
                              ? 'hover:bg-emerald-50/20 bg-white' 
                              : 'hover:bg-gray-50/80 bg-gray-50/20 text-gray-400'
                        }`}
                      >
                        {/* Expand Icon / Index */}
                        <td className="py-3 px-2 text-center text-gray-400 font-sans">
                          {row.hasActivity ? (
                            <button
                              type="button"
                              className="text-gray-400 hover:text-emerald-700 transition-colors"
                              title="Toggle day transaction breakdown"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-gray-300">{rowNumber}</span>
                          )}
                        </td>

                        {/* Date */}
                        <td className="py-3 px-3 font-sans font-bold text-gray-900 whitespace-nowrap">
                          {new Date(row.date).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: '2-digit'
                          })}
                        </td>

                        {/* Opening Balance */}
                        <td className="py-3 px-3 text-right bg-emerald-50/50 font-bold text-emerald-950 border-r border-emerald-200/50">
                          {formatNum(row.openingBalance)}
                        </td>

                        {/* Total Sale */}
                        <td className="py-3 px-3 text-right font-black text-gray-900 bg-blue-100/35">
                          {formatNum(row.totalSale)}
                        </td>

                        {/* Credit Sale */}
                        <td className={`py-3 px-3 text-right bg-blue-50/20 ${row.creditSale > 0 ? 'text-amber-800 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.creditSale)}
                        </td>

                        {/* Bank Sale */}
                        <td className={`py-3 px-3 text-right bg-blue-50/20 ${row.bankSale > 0 ? 'text-blue-800 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.bankSale)}
                        </td>

                        {/* Mobile Money Sale */}
                        <td className={`py-3 px-3 text-right bg-blue-50/20 ${row.mobileMoneySale > 0 ? 'text-purple-800 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.mobileMoneySale)}
                        </td>

                        {/* Cash Sale */}
                        <td className={`py-3 px-3 text-right bg-blue-100/40 border-r border-blue-200/50 ${row.cashSale > 0 ? 'text-emerald-800 font-black' : 'text-gray-300'}`}>
                          {formatNum(row.cashSale)}
                        </td>

                        {/* Received for Credit Sale */}
                        <td className={`py-3 px-3 text-right bg-rose-50/20 ${row.receivedCreditSale > 0 ? 'text-teal-800 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.receivedCreditSale)}
                        </td>

                        {/* Cash Purchase */}
                        <td className={`py-3 px-3 text-right bg-rose-50/30 ${row.cashPurchase > 0 ? 'text-rose-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashPurchase)}
                        </td>

                        {/* Cash Expense */}
                        <td className={`py-3 px-3 text-right bg-rose-50/30 ${row.cashExpense > 0 ? 'text-rose-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashExpense)}
                        </td>

                        {/* Cash Payment For Purchase */}
                        <td className={`py-3 px-3 text-right bg-rose-50/20 border-r border-rose-200/50 ${row.cashPaymentForPurchase > 0 ? 'text-amber-900 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashPaymentForPurchase)}
                        </td>

                        {/* Cash in Bank */}
                        <td className={`py-3 px-3 text-right bg-indigo-50/20 ${row.cashInBank > 0 ? 'text-indigo-800 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashInBank)}
                        </td>

                        {/* Cash Out Bank */}
                        <td className={`py-3 px-3 text-right bg-indigo-50/20 border-r border-indigo-200/50 ${row.cashOutFromBank > 0 ? 'text-indigo-800 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashOutFromBank)}
                        </td>

                        {/* Closing Balance */}
                        <td className="py-3 px-3 text-right font-black bg-emerald-100/50 text-emerald-950">
                          {formatNum(row.closingBalance)}
                        </td>
                      </motion.tr>

                      {/* Expandable Transaction Details Drawer */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={15} className="bg-slate-50/80 p-4 font-sans border-b border-emerald-100">
                            <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs space-y-4">
                              <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-2">
                                  <Receipt className="w-4 h-4 text-emerald-600" />
                                  <span>Transactions Audit for {row.date}</span>
                                </h4>
                                <span className="text-[11px] font-bold text-gray-500">
                                  Closing Cash at Store: <span className="text-emerald-700 font-mono">{formatCur(row.closingBalance)}</span>
                                </span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
                                {/* Sales Invoices */}
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1">
                                    <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
                                    <span>Sales Invoices ({row.details?.sales?.length || 0})</span>
                                  </span>
                                  {row.details?.sales && row.details.sales.length > 0 ? (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {row.details.sales.map((s: any) => (
                                        <div key={s.id} className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-[11px]">
                                          <div className="flex justify-between font-bold text-gray-900">
                                            <span>{s.invoiceNumber}</span>
                                            <span>{formatCur(s.totalAmount)}</span>
                                          </div>
                                          <div className="text-gray-500 flex justify-between mt-0.5">
                                            <span>{s.customer?.name || 'Walk-in'}</span>
                                            <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.2 bg-gray-200 rounded">
                                              {s.paymentType}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-gray-400 italic">No sales recorded</p>
                                  )}
                                </div>

                                {/* Purchase Invoices */}
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1">
                                    <Building2 className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Purchases ({row.details?.purchases?.length || 0})</span>
                                  </span>
                                  {row.details?.purchases && row.details.purchases.length > 0 ? (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {row.details.purchases.map((p: any) => (
                                        <div key={p.id} className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-[11px]">
                                          <div className="flex justify-between font-bold text-gray-900">
                                            <span>{p.invoiceNumber}</span>
                                            <span>{formatCur(p.totalAmount)}</span>
                                          </div>
                                          <div className="text-gray-500 flex justify-between mt-0.5">
                                            <span>{p.supplier?.name || 'Vendor'}</span>
                                            <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.2 bg-gray-200 rounded">
                                              {p.paymentType}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-gray-400 italic">No purchases recorded</p>
                                  )}
                                </div>

                                {/* Expenses */}
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1">
                                    <Wallet className="w-3.5 h-3.5 text-rose-500" />
                                    <span>Expenses ({row.details?.expenses?.length || 0})</span>
                                  </span>
                                  {row.details?.expenses && row.details.expenses.length > 0 ? (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {row.details.expenses.map((e: any) => (
                                        <div key={e.id} className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-[11px]">
                                          <div className="flex justify-between font-bold text-gray-900">
                                            <span className="truncate max-w-[120px]">{e.description}</span>
                                            <span>{formatCur(e.amount)}</span>
                                          </div>
                                          <div className="text-gray-500 flex justify-between mt-0.5">
                                            <span>{e.notes || 'Operating Expense'}</span>
                                            <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.2 bg-gray-200 rounded">
                                              {e.paymentType}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-gray-400 italic">No expenses recorded</p>
                                  )}
                                </div>

                                {/* Payments & Movements */}
                                <div className="space-y-2">
                                  <span className="text-[11px] font-bold text-gray-600 uppercase flex items-center gap-1">
                                    <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>Movements ({row.details?.payments?.length || 0})</span>
                                  </span>
                                  {row.details?.payments && row.details.payments.length > 0 ? (
                                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                      {row.details.payments.map((m: any) => (
                                        <div key={m.id} className="p-2 rounded-xl bg-gray-50 border border-gray-100 text-[11px]">
                                          <div className="flex justify-between font-bold text-gray-900">
                                            <span className="truncate max-w-[120px]">{m.description || m.direction}</span>
                                            <span>{formatCur(m.amount)}</span>
                                          </div>
                                          <div className="text-gray-500 flex justify-between mt-0.5">
                                            <span>{m.direction === 'IN' ? 'Cash IN' : 'Cash OUT'}</span>
                                            <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.2 bg-gray-200 rounded">
                                              {m.paymentType}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-[11px] text-gray-400 italic">No cash movements recorded</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>

            {/* Summary Totals Footer */}
            {displayedDays.length > 0 && (
              <tfoot className="font-mono text-xs border-t-2 border-gray-300 font-bold">
                <tr className="text-gray-800">
                  <td colSpan={2} className="py-3.5 px-3 text-left font-sans font-extrabold text-emerald-950 uppercase tracking-wider text-[11px] bg-emerald-50/60">
                    Period Totals ({displayedDays.length} Days)
                  </td>
                  <td className="py-3.5 px-3 text-right text-gray-400 font-sans text-[11px] bg-emerald-50/60 border-r border-emerald-200/60">—</td>
                  <td className="py-3.5 px-3 text-right font-black text-blue-950 bg-blue-100/60">
                    {formatNum(periodTotals.totalSale)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-amber-800 bg-blue-50/50">
                    {formatNum(periodTotals.creditSale)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-blue-800 bg-blue-50/50">
                    {formatNum(periodTotals.bankSale)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-purple-800 bg-blue-50/50">
                    {formatNum(periodTotals.mobileMoneySale)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-black text-emerald-800 bg-blue-100/60 border-r border-blue-200/60">
                    {formatNum(periodTotals.cashSale)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-teal-800 bg-rose-50/50">
                    {formatNum(periodTotals.receivedCreditSale)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-rose-800 bg-rose-100/60 font-bold">
                    {formatNum(periodTotals.cashPurchase)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-rose-800 bg-rose-100/60 font-bold">
                    {formatNum(periodTotals.cashExpense)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-amber-900 bg-rose-50/50 border-r border-rose-200/60">
                    {formatNum(periodTotals.cashPaymentForPurchase)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-indigo-800 bg-indigo-50/50">
                    {formatNum(periodTotals.cashInBank)}
                  </td>
                  <td className="py-3.5 px-3 text-right text-indigo-800 bg-indigo-50/50 border-r border-indigo-200/60">
                    {formatNum(periodTotals.cashOutFromBank)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-black bg-emerald-200/80 text-emerald-950 font-sans">
                    {formatCur(summary?.currentStoreCash || 0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* PAGINATION FOOTER */}
        {totalItems > 0 && (
          <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 select-none">
            {/* Left: Rows Per Page & Counter */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 font-medium">Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-gray-200 hover:border-emerald-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none cursor-pointer font-semibold transition-all shadow-2xs"
                >
                  {[10, 20, 50, 100].map(opt => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <span className="text-gray-500 font-medium">
                Showing <span className="font-bold text-gray-900">{(validCurrentPage - 1) * pageSize + 1}</span> to{' '}
                <span className="font-bold text-gray-900">{Math.min(validCurrentPage * pageSize, totalItems)}</span> of{' '}
                <span className="font-bold text-gray-900">{totalItems}</span> records
              </span>
            </div>

            {/* Right: Page Navigation Buttons */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg hover:bg-emerald-100/70 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
                title="First Page"
              >
                <ChevronsLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg hover:bg-emerald-100/70 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1 mx-1">
                {pageNumbers.map((p, i) => {
                  if (typeof p === 'string') {
                    return (
                      <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400">
                        {p}
                      </span>
                    );
                  }
                  return (
                    <button
                      key={p}
                      onClick={() => setCurrentPage(p)}
                      className={`min-w-7 h-7 px-2 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                        validCurrentPage === p
                          ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-emerald-100/70 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-emerald-100/70 hover:text-emerald-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
                title="Last Page"
              >
                <ChevronsRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: SETUP OPENING BALANCES */}
      <AnimatePresence>
        {isConfigModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-gray-900 text-lg">Setup Starting Opening Balances</h3>
                </div>
                <button
                  onClick={() => setIsConfigModalOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Initial Cash at Store Opening Balance (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={configForm.initialOpeningCash}
                    onChange={e => setConfigForm({ ...configForm, initialOpeningCash: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 font-mono font-bold"
                  />
                  <span className="text-[11px] text-gray-400 mt-0.5 block">
                    Starting cash balance before earliest transaction (e.g. 201,000 as per your sheet).
                  </span>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Initial Bank Account Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={configForm.initialOpeningBank}
                    onChange={e => setConfigForm({ ...configForm, initialOpeningBank: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Initial Airtel / Mobile Money Balance (₹)
                  </label>
                  <input
                    type="number"
                    value={configForm.initialOpeningAirtel}
                    onChange={e => setConfigForm({ ...configForm, initialOpeningAirtel: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 outline-none focus:border-emerald-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Audit Notes / Reference
                  </label>
                  <input
                    type="text"
                    value={configForm.notes}
                    onChange={e => setConfigForm({ ...configForm, notes: e.target.value })}
                    placeholder="e.g. Audited cash balance on Day 1"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-800 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsConfigModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
                  >
                    Save & Recalculate
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: QUICK CASH MOVEMENT ENTRY */}
      <AnimatePresence>
        {isEntryModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-black text-gray-900 text-lg">Record Cash Movement</h3>
                </div>
                <button
                  onClick={() => setIsEntryModalOpen(false)}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveQuickEntry} className="space-y-4 text-xs">
                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Movement Type *
                  </label>
                  <select
                    value={entryForm.type}
                    onChange={e => setEntryForm({ ...entryForm, type: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-xs text-gray-900 font-bold outline-none focus:border-emerald-500"
                  >
                    <option value="BANK_DEPOSIT">🏦 Deposit Store Cash into Bank (Cash in Bank)</option>
                    <option value="BANK_WITHDRAWAL">💵 Withdraw Cash from Bank into Store (Cash out from Bank)</option>
                    <option value="CREDIT_COLLECTION">👥 Received Cash for Credit Sale (Customer Payment)</option>
                    <option value="CREDIT_PAYMENT">🤝 Cash Payment for Purchase (Supplier Payout)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={entryForm.date}
                      onChange={e => setEntryForm({ ...entryForm, date: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-700 font-bold mb-1">
                      Amount (₹) *
                    </label>
                    <input
                      type="number"
                      required
                      placeholder="0.00"
                      value={entryForm.amount}
                      onChange={e => setEntryForm({ ...entryForm, amount: e.target.value })}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 font-mono font-bold outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-1">
                    Description / Narration
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bank slip #1042 / Client cash settlement"
                    value={entryForm.description}
                    onChange={e => setEntryForm({ ...entryForm, description: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-900 outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEntryModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={entrySubmitting}
                    className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 disabled:opacity-50"
                  >
                    {entrySubmitting ? 'Recording...' : 'Record Transaction'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      </div>
    </DashboardLayout>
  );
};

export const CashBookPage = WithAuth(CashBookPageBase, ModuleName.EXPENSES, Permission.LIST);
export default CashBookPage;
