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

  // Format currency
  const formatCur = (num: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(num || 0);
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
      <div className="space-y-6">
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
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-3xl p-5 shadow-lg shadow-emerald-600/20 relative overflow-hidden"
        >
          <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-100 uppercase tracking-wider">Cash at Store</span>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
          </div>
          <div className="text-2xl font-black tracking-tight mb-1">
            {formatCur(summary?.currentStoreCash || 0)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-emerald-100 font-medium pt-2 border-t border-white/15">
            <span>Physical Counter Cash</span>
            <span className="bg-emerald-500/40 px-2 py-0.5 rounded-full font-bold">Live Vault</span>
          </div>
        </motion.div>

        {/* 2. Bank Balance */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Bank Balance</span>
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-blue-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {formatCur(summary?.currentBankBalance || 0)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-100">
            <span>Bank Transfers & Cheques</span>
            <span className="text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">Bank</span>
          </div>
        </motion.div>

        {/* 3. Airtel / Mobile Money */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Airtel / Mobile Money</span>
            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center">
              <Smartphone className="w-4 h-4 text-purple-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-gray-900 tracking-tight mb-1">
            {formatCur(summary?.currentAirtelBalance || 0)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-100">
            <span>Digital Mobile Wallet</span>
            <span className="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded-full">Airtel</span>
          </div>
        </motion.div>

        {/* 4. Customer Credit Outstanding */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.15 }}
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Customer Credit</span>
            <div className="w-8 h-8 rounded-full bg-amber-50 flex items-center justify-center">
              <CreditCard className="w-4 h-4 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-800 tracking-tight mb-1">
            {formatCur(summary?.totalCreditReceivable || 0)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-100">
            <span>Receivables (Credit Sales)</span>
            <span className="text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded-full">Uncollected</span>
          </div>
        </motion.div>

        {/* 5. Supplier Credit (Payable) */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-white rounded-3xl p-5 border border-gray-100 shadow-xs relative overflow-hidden"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Supplier Payables</span>
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-rose-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-800 tracking-tight mb-1">
            {formatCur(summary?.totalCreditPayable || 0)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-gray-500 font-medium pt-2 border-t border-gray-100">
            <span>Outstanding PO Invoices</span>
            <span className="text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-full">Payables</span>
          </div>
        </motion.div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
            {[
              { id: 'all', label: 'All History' },
              { id: 'today', label: 'Today' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPreset(p.id as any)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  activePreset === p.id
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
              >
                {p.label}
              </button>
            ))}
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

      {/* CASH BOOK SPREADSHEET TABLE (Exactly matching user's Google Sheet columns) */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              {/* Category Super Header (Matching Row 1 in sheet) */}
              <tr className="bg-slate-900 text-white font-bold text-[11px] tracking-wide border-b border-slate-800">
                <th colSpan={3} className="py-2.5 px-3 text-center bg-emerald-950/80 border-r border-slate-700">
                  CASH BOOK
                </th>
                <th colSpan={4} className="py-2.5 px-3 text-center bg-blue-950/80 border-r border-slate-700">
                  SALES BREAKDOWN
                </th>
                <th colSpan={4} className="py-2.5 px-3 text-center bg-amber-950/80 border-r border-slate-700">
                  STORE OUTFLOWS & PURCHASES
                </th>
                <th colSpan={2} className="py-2.5 px-3 text-center bg-indigo-950/80 border-r border-slate-700">
                  BANK TRANSFERS
                </th>
                <th className="py-2.5 px-3 text-center bg-emerald-900 border-l border-slate-700">
                  CLOSING
                </th>
              </tr>

              {/* Exact Column Headers (Matching Row 2 in sheet) */}
              <tr className="bg-gray-100/90 text-gray-700 font-extrabold text-[11px] uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-2 w-8 text-center">#</th>
                <th className="py-3 px-3 whitespace-nowrap">Date</th>
                <th className="py-3 px-3 text-right whitespace-nowrap bg-emerald-50/60 text-emerald-900">
                  Opening Balance
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap font-black bg-blue-50/40 text-gray-900">
                  Total Sale
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-amber-700">
                  Credit Sale
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-blue-700">
                  Bank Sale
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-purple-700">
                  Mobile Money Sale
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap font-bold text-emerald-700">
                  Cash Sale
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-teal-700">
                  Received for Credit
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-rose-700">
                  Cash Purchase
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-rose-700">
                  Cash Expense
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-amber-800">
                  Cash Payment PO
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-indigo-700">
                  Cash in Bank
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap text-indigo-700">
                  Cash Out Bank
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap font-black bg-emerald-100/70 text-emerald-950">
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
                displayedDays.map((row, idx) => {
                  const isExpanded = expandedDay === row.date;

                  return (
                    <React.Fragment key={row.date}>
                      <tr 
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
                            <span className="text-[10px] text-gray-300">{idx + 1}</span>
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
                        <td className="py-3 px-3 text-right bg-emerald-50/30 font-bold text-emerald-900">
                          {formatNum(row.openingBalance)}
                        </td>

                        {/* Total Sale */}
                        <td className="py-3 px-3 text-right font-black text-gray-900 bg-blue-50/20">
                          {formatNum(row.totalSale)}
                        </td>

                        {/* Credit Sale */}
                        <td className={`py-3 px-3 text-right ${row.creditSale > 0 ? 'text-amber-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.creditSale)}
                        </td>

                        {/* Bank Sale */}
                        <td className={`py-3 px-3 text-right ${row.bankSale > 0 ? 'text-blue-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.bankSale)}
                        </td>

                        {/* Mobile Money Sale */}
                        <td className={`py-3 px-3 text-right ${row.mobileMoneySale > 0 ? 'text-purple-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.mobileMoneySale)}
                        </td>

                        {/* Cash Sale */}
                        <td className={`py-3 px-3 text-right ${row.cashSale > 0 ? 'text-emerald-700 font-black' : 'text-gray-300'}`}>
                          {formatNum(row.cashSale)}
                        </td>

                        {/* Received for Credit Sale */}
                        <td className={`py-3 px-3 text-right ${row.receivedCreditSale > 0 ? 'text-teal-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.receivedCreditSale)}
                        </td>

                        {/* Cash Purchase */}
                        <td className={`py-3 px-3 text-right ${row.cashPurchase > 0 ? 'text-rose-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashPurchase)}
                        </td>

                        {/* Cash Expense */}
                        <td className={`py-3 px-3 text-right ${row.cashExpense > 0 ? 'text-rose-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashExpense)}
                        </td>

                        {/* Cash Payment For Purchase */}
                        <td className={`py-3 px-3 text-right ${row.cashPaymentForPurchase > 0 ? 'text-amber-800 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashPaymentForPurchase)}
                        </td>

                        {/* Cash in Bank */}
                        <td className={`py-3 px-3 text-right ${row.cashInBank > 0 ? 'text-indigo-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashInBank)}
                        </td>

                        {/* Cash Out Bank */}
                        <td className={`py-3 px-3 text-right ${row.cashOutFromBank > 0 ? 'text-indigo-700 font-bold' : 'text-gray-300'}`}>
                          {formatNum(row.cashOutFromBank)}
                        </td>

                        {/* Closing Balance */}
                        <td className="py-3 px-3 text-right font-black bg-emerald-100/50 text-emerald-950">
                          {formatNum(row.closingBalance)}
                        </td>
                      </tr>

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
          </table>
        </div>
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
