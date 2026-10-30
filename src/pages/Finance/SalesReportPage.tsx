import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Search, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw, 
  Users, 
  Truck, 
  Package, 
  ArrowUpDown, 
  ChevronDown, 
  ChevronRight, 
  Layers, 
  Filter, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Receipt,
  Building2,
  DollarSign,
  Plus,
  Sparkles,
  ArrowUpRight,
  Activity,
  ShieldCheck,
  Wallet
} from 'lucide-react';
import { fetchSalesReport, fetchExpenses, type SalesReportRow, type SalesReportSummary, type SalesReportBatch, type Expense } from '../../services/api';
import { useCurrency } from '../../helper/currency';
import { errorToast, successToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { PillTabs, type TabOption } from '../../components/motion/PillTabs';
import { StatSparkCard } from '../../components/motion/StatSparkCard';
import { RadialGauge } from '../../components/motion/RadialGauge';
import { AmazonSalesGraph } from '../../components/motion/AmazonSalesGraph';

const TIME_PRESET_TABS: TabOption[] = [
  { id: 'all', label: 'All Time' },
  { id: 'today', label: 'Today' },
  { id: 'last7', label: 'Last 7 Days' },
  { id: 'thisMonth', label: 'This Month' },
];

const VIEW_SEGMENT_TABS: TabOption[] = [
  { id: 'all', label: 'All Transactions' },
  { id: 'high-margin', label: 'High Margin (≥20%)' },
  { id: 'multi-batch', label: 'Multi-Batch POs' },
  { id: 'cash', label: 'Cash Sales' },
];

const SalesReportPageBase: React.FC = () => {
  const navigate = useNavigate();
  const { format, symbol } = useCurrency();

  const [loading, setLoading] = useState<boolean>(true);
  const [rows, setRows] = useState<SalesReportRow[]>([]);
  const [summary, setSummary] = useState<SalesReportSummary>({
    totalUnits: 0,
    totalRevenue: 0,
    totalCost: 0,
    totalProfit: 0,
    overallMargin: 0,
    totalInvoices: 0
  });

  // Time preset pill tab
  const [timePreset, setTimePreset] = useState('all');
  const [viewSegment, setViewSegment] = useState('all');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [sortField, setSortField] = useState<'date' | 'totalSales' | 'grossProfit' | 'marginPct'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  // Expenses State (Filtered as per date)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalExpenses, setTotalExpenses] = useState<number>(0);
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const loadReport = async () => {
    setLoading(true);
    try {
      const [salesData, expenseData] = await Promise.allSettled([
        fetchSalesReport({
          startDate: startDate || undefined,
          endDate: endDate || undefined,
          search: searchTerm || undefined
        }),
        fetchExpenses(undefined, startDate || undefined, endDate || undefined)
      ]);

      if (salesData.status === 'fulfilled') {
        setRows(salesData.value.rows || []);
        setSummary(salesData.value.summary || {
          totalUnits: 0,
          totalRevenue: 0,
          totalCost: 0,
          totalProfit: 0,
          overallMargin: 0,
          totalInvoices: 0
        });
      }

      if (expenseData.status === 'fulfilled') {
        const expList = Array.isArray(expenseData.value) ? expenseData.value : [];
        setExpenses(expList);
        const sum = expList.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
        setTotalExpenses(sum);
      }
    } catch (err: any) {
      console.error('Failed to load Sales Report:', err);
      errorToast('Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [startDate, endDate]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Handle Time Preset Tab Change
  const handleTimePresetChange = (tabId: string) => {
    setTimePreset(tabId);
    const today = new Date();
    const formatLocalDate = (d: Date) => {
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    if (tabId === 'today') {
      const dStr = formatLocalDate(today);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (tabId === 'last7') {
      const past = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);
      setStartDate(formatLocalDate(past));
      setEndDate(formatLocalDate(today));
    } else if (tabId === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatLocalDate(firstDay));
      setEndDate(formatLocalDate(today));
    } else {
      setStartDate('');
      setEndDate('');
    }
  };

  // Extract unique clients and suppliers for dropdown filters
  const clientOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      if (r.clientName) set.add(r.clientName);
    });
    return Array.from(set).sort();
  }, [rows]);

  const supplierOptions = useMemo(() => {
    const set = new Set<string>();
    rows.forEach(r => {
      if (r.supplierName) {
        r.supplierName.split(',').forEach(s => {
          const trimmed = s.trim();
          if (trimmed) set.add(trimmed);
        });
      }
    });
    return Array.from(set).sort();
  }, [rows]);

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    return rows
      .filter(row => {
        // View Segment Filter
        if (viewSegment === 'high-margin' && row.marginPct < 20) return false;
        if (viewSegment === 'multi-batch' && (!row.batches || row.batches.length <= 1)) return false;
        if (viewSegment === 'cash' && row.paymentType?.toUpperCase() !== 'CASH') return false;

        // Client filter
        if (selectedClient !== 'ALL' && row.clientName !== selectedClient) {
          return false;
        }
        // Supplier filter
        if (selectedSupplier !== 'ALL' && !row.supplierName.toLowerCase().includes(selectedSupplier.toLowerCase())) {
          return false;
        }
        // Search term
        if (searchTerm.trim()) {
          const query = searchTerm.toLowerCase();
          const matches =
            row.invoiceNumber.toLowerCase().includes(query) ||
            row.clientName.toLowerCase().includes(query) ||
            row.itemName.toLowerCase().includes(query) ||
            row.itemCode.toLowerCase().includes(query) ||
            row.supplierName.toLowerCase().includes(query) ||
            row.poReference.toLowerCase().includes(query);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];
        if (sortField === 'date') {
          valA = new Date(a.date).getTime();
          valB = new Date(b.date).getTime();
        }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [rows, viewSegment, selectedClient, selectedSupplier, searchTerm, sortField, sortOrder]);

  // Filtered totals
  const filteredSummary = useMemo(() => {
    let units = 0;
    let rev = 0;
    let cost = 0;
    let profit = 0;
    const invoiceIds = new Set<string>();

    filteredAndSortedRows.forEach(r => {
      units += r.quantity;
      rev += r.totalSales;
      cost += r.totalCost;
      profit += r.grossProfit;
      if (r.invoiceId) invoiceIds.add(r.invoiceId);
    });

    const margin = rev > 0 ? (profit / rev) * 100 : 0;

    return {
      totalUnits: units,
      totalRevenue: rev,
      totalCost: cost,
      totalProfit: profit,
      overallMargin: margin,
      totalInvoices: invoiceIds.size
    };
  }, [filteredAndSortedRows]);

  const handleExportCSV = () => {
    if (filteredAndSortedRows.length === 0) {
      errorToast('No data to export');
      return;
    }

    const headers = [
      'Date',
      'Sales Invoice #',
      'Client Name',
      'Client Contact',
      'Item Code',
      'Item Name',
      'Supplier Name',
      'PO Reference',
      'Quantity Sold',
      'UOM',
      'Purchase Price',
      'Sales Price',
      'Total Cost',
      'Total Sales',
      'Gross Profit',
      'Margin %'
    ];

    const csvRows = filteredAndSortedRows.map(r => [
      new Date(r.date).toLocaleDateString(),
      `"${r.invoiceNumber}"`,
      `"${r.clientName || ''}"`,
      `"${r.clientContact || ''}"`,
      `"${r.itemCode || ''}"`,
      `"${r.itemName || ''}"`,
      `"${r.supplierName || ''}"`,
      `"${r.poReference || ''}"`,
      r.quantity,
      r.uom,
      r.purchasePrice.toFixed(2),
      r.salesPrice.toFixed(2),
      r.totalCost.toFixed(2),
      r.totalSales.toFixed(2),
      r.grossProfit.toFixed(2),
      r.marginPct.toFixed(2) + '%'
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...csvRows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    successToast('Sales report exported to CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 font-sans max-w-7xl mx-auto space-y-6">
        
        {/* Top Header Floating Pill Navigation Tabs & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <PillTabs
              tabs={TIME_PRESET_TABS}
              activeId={timePreset}
              onChange={handleTimePresetChange}
              layoutId="sales-report-time-pill"
              variant="dark"
              size="md"
            />
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200/70 px-3 py-1.5 rounded-full shadow-2xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {currentDate}
            </span>

            <button
              onClick={loadReport}
              disabled={loading}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-gray-500" />
              <span>Print Report</span>
            </button>

            <button
              onClick={() => navigate('/invoices/purchase/new')}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-gray-500" />
              <span>Purchase PO</span>
            </button>

            <button
              onClick={() => navigate('/invoices/sales/new')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New Invoice</span>
            </button>
          </div>
        </div>

        {/* Row 1: 5 Animated Stat Cards across the top (Removed Sales & Profit Dashboard, Added Total Expenses) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* 1. Total Sales Revenue */}
          <StatSparkCard
            title="Total Sales Revenue"
            value={filteredSummary.totalRevenue}
            prefix={symbol ? `${symbol} ` : '₹ '}
            decimals={0}
            badge={{ text: '+18.4%', trend: 'up' }}
            subtitle={`From ${filteredSummary.totalInvoices} sales invoices`}
            sparklineData={[12000, 14500, 13800, 16200, 18400, filteredSummary.totalRevenue || 19600]}
            icon={TrendingUp}
          />

          {/* 2. Total Purchase Cost */}
          <StatSparkCard
            title="Total Purchase Cost"
            value={filteredSummary.totalCost}
            prefix={symbol ? `${symbol} ` : '₹ '}
            decimals={0}
            badge={{ text: 'Valuation', trend: 'neutral' }}
            subtitle="PO procurement costs"
            sparklineData={[9800, 11400, 12200, 13800, 14900, filteredSummary.totalCost || 16200]}
            icon={Truck}
          />

          {/* 3. Gross Profit */}
          <StatSparkCard
            title="Gross Profit"
            value={filteredSummary.totalProfit}
            prefix={symbol ? `${symbol} ` : '₹ '}
            decimals={0}
            badge={{ text: `${filteredSummary.overallMargin.toFixed(1)}%`, trend: filteredSummary.overallMargin >= 15 ? 'up' : 'alert' }}
            subtitle="Markup over PO batch cost"
            sparklineData={[2200, 3100, 2600, 2900, 3200, filteredSummary.totalProfit || 3400]}
            icon={DollarSign}
          />

          {/* 4. Total Expenses (As per filter) */}
          <StatSparkCard
            title="Total Expenses"
            value={totalExpenses}
            prefix={symbol ? `${symbol} ` : '₹ '}
            decimals={0}
            badge={{ text: `${expenses.length} Records`, trend: 'neutral' }}
            subtitle={startDate || endDate ? 'Filtered period expenses' : 'All-time operating expenses'}
            sparklineData={[50, 80, 70, 90, 85, totalExpenses || 100]}
            icon={Wallet}
          />

          {/* 5. Net Profit (Gross Profit - Expenses) */}
          <StatSparkCard
            title="Net Profit"
            value={filteredSummary.totalProfit - totalExpenses}
            prefix={symbol ? `${symbol} ` : '₹ '}
            decimals={0}
            badge={{ 
              text: `${filteredSummary.totalRevenue > 0 ? (((filteredSummary.totalProfit - totalExpenses) / filteredSummary.totalRevenue) * 100).toFixed(1) : 0}%`, 
              trend: (filteredSummary.totalProfit - totalExpenses) >= 0 ? 'up' : 'down' 
            }}
            subtitle="After operating expenses"
            sparklineData={[2150, 3020, 2530, 2810, 3115, (filteredSummary.totalProfit - totalExpenses) || 3300]}
            icon={ShieldCheck}
          />
        </div>

        {/* Row 2: Amazon Seller Central Real Sales & Units Graph */}
        <AmazonSalesGraph
          rows={filteredAndSortedRows}
          currencySymbol={symbol}
          presetRange={timePreset}
          onAnalyseClick={handlePrint}
        />

        {/* Row 3: Filter Pills + Search & Granular Controls */}
        <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Sales Ledger & Batch Breakdown</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full">
                  {filteredAndSortedRows.length} Items
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                Detailed purchase vs sales price audit trail with supplier PO batch allocations
              </p>
            </div>

            {/* View Segment Pill Tabs */}
            <PillTabs
              tabs={VIEW_SEGMENT_TABS}
              activeId={viewSegment}
              onChange={setViewSegment}
              layoutId="sales-report-segment-pill"
              variant="subtle"
              size="sm"
            />
          </div>

          {/* Search and Secondary Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-3 border-t border-gray-100">
            {/* Search Input */}
            <div className="lg:col-span-4 relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search Client, Supplier, Item, Invoice #..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                >
                  ×
                </button>
              )}
            </div>

            {/* Custom From / To Date */}
            <div className="lg:col-span-3 flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none bg-gray-50"
                title="From Date"
              />
              <span className="text-gray-400 text-xs font-semibold">to</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none bg-gray-50"
                title="To Date"
              />
            </div>

            {/* Client Filter */}
            <div className="lg:col-span-2">
              <select
                value={selectedClient}
                onChange={e => setSelectedClient(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="ALL">All Clients ({clientOptions.length})</option>
                {clientOptions.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Supplier Filter */}
            <div className="lg:col-span-2">
              <select
                value={selectedSupplier}
                onChange={e => setSelectedSupplier(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl focus:ring-1 focus:ring-emerald-500 outline-none bg-white font-medium"
              >
                <option value="ALL">All Suppliers ({supplierOptions.length})</option>
                {supplierOptions.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Sort Toggle */}
            <div className="lg:col-span-1 flex items-center justify-end">
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="w-full flex items-center justify-center gap-1 text-xs px-2.5 py-1.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors bg-white font-semibold text-gray-700"
                title="Toggle sort direction"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                <span className="uppercase text-[10px]">{sortOrder}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Row 4: Animated Interactive Sales Report Table */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50/80 text-gray-600 font-bold border-b border-gray-100">
                  <th className="py-3.5 px-3 w-10 text-center">#</th>
                  <th className="py-3.5 px-3">Date</th>
                  <th className="py-3.5 px-3">Invoice #</th>
                  <th className="py-3.5 px-3">Client (Customer)</th>
                  <th className="py-3.5 px-3">Item Details</th>
                  <th className="py-3.5 px-3">Supplier Name(s)</th>
                  <th className="py-3.5 px-3">PO Reference</th>
                  <th className="py-3.5 px-3 text-right">Qty</th>
                  <th className="py-3.5 px-3 text-right">Purchase Price</th>
                  <th className="py-3.5 px-3 text-right">Sales Price</th>
                  <th className="py-3.5 px-3 text-right">Total Cost</th>
                  <th className="py-3.5 px-3 text-right">Total Sales</th>
                  <th className="py-3.5 px-3 text-right">Gross Profit</th>
                  <th className="py-3.5 px-3 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
                        <span className="text-sm font-semibold">Updating sales telemetry & margins...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAndSortedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="py-16 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <AlertCircle className="w-9 h-9 text-gray-400" />
                        <span className="text-sm font-bold text-gray-700">No matching sales records</span>
                        <span className="text-xs text-gray-400">Try adjusting your filters or date preset</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedRows.map((row, idx) => {
                    const isExpanded = !!expandedRows[row.id];
                    const hasMultipleBatches = row.batches && row.batches.length > 1;

                    return (
                      <React.Fragment key={row.id}>
                        <motion.tr 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03, duration: 0.25 }}
                          onClick={() => hasMultipleBatches && toggleRow(row.id)}
                          className={`hover:bg-emerald-50/40 transition-colors ${
                            isExpanded ? 'bg-emerald-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                          } ${hasMultipleBatches ? 'cursor-pointer' : ''}`}
                        >
                          {/* Expand toggle */}
                          <td className="py-3.5 px-3 text-center text-gray-400">
                            {hasMultipleBatches ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRow(row.id);
                                }}
                                className="text-gray-500 hover:text-emerald-700 transition-colors cursor-pointer"
                                title="Toggle batch breakdown"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-emerald-600" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </button>
                            ) : (
                              <span className="text-[11px] text-gray-400 font-mono">{idx + 1}</span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="py-3.5 px-3 whitespace-nowrap text-gray-800 font-semibold">
                            {new Date(row.date).toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </td>

                          {/* Invoice Number */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <div className="font-bold text-emerald-700 hover:underline">
                              {row.invoiceNumber}
                            </div>
                            {row.paymentType && (
                              <span className="inline-block text-[10px] font-bold uppercase px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded-md">
                                {row.paymentType}
                              </span>
                            )}
                          </td>

                          {/* Client Name */}
                          <td className="py-3.5 px-3">
                            <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>{row.clientName || 'Walk-in Client'}</span>
                            </div>
                            {row.clientContact && (
                              <span className="text-[11px] text-gray-400 block pl-5 font-mono">
                                {row.clientContact}
                              </span>
                            )}
                          </td>

                          {/* Item Details */}
                          <td className="py-3.5 px-3">
                            <div className="font-bold text-gray-900">{row.itemName}</div>
                            <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                              <span className="font-mono bg-gray-100 px-1 rounded text-gray-700 font-bold">{row.itemCode}</span>
                              {row.categoryName && <span>• {row.categoryName}</span>}
                            </div>
                          </td>

                          {/* Supplier Name */}
                          <td className="py-3.5 px-3">
                            <div className="flex flex-wrap gap-1">
                              {row.supplierName.split(',').map((sup, sIdx) => {
                                const sTrim = sup.trim();
                                return (
                                  <span
                                    key={sIdx}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200"
                                  >
                                    <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                                    <span>{sTrim}</span>
                                  </span>
                                );
                              })}
                            </div>
                          </td>

                          {/* PO Reference */}
                          <td className="py-3.5 px-3 whitespace-nowrap">
                            <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200/60">
                              {row.poReference || '—'}
                            </span>
                          </td>

                          {/* Quantity */}
                          <td className="py-3.5 px-3 text-right font-extrabold text-gray-800 whitespace-nowrap">
                            {row.quantity.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">{row.uom}</span>
                          </td>

                          {/* Purchase Price (Unit Cost) */}
                          <td className="py-3.5 px-3 text-right font-semibold text-gray-700 whitespace-nowrap">
                            {format(row.purchasePrice)}
                          </td>

                          {/* Sales Price */}
                          <td className="py-3.5 px-3 text-right font-black text-gray-900 whitespace-nowrap">
                            {format(row.salesPrice)}
                          </td>

                          {/* Total Cost */}
                          <td className="py-3.5 px-3 text-right text-gray-600 font-medium whitespace-nowrap">
                            {format(row.totalCost)}
                          </td>

                          {/* Total Sales */}
                          <td className="py-3.5 px-3 text-right font-extrabold text-emerald-700 whitespace-nowrap">
                            {format(row.totalSales)}
                          </td>

                          {/* Gross Profit */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <span className={`font-black ${row.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                              {row.grossProfit >= 0 ? '+' : ''}{format(row.grossProfit)}
                            </span>
                          </td>

                          {/* Margin % */}
                          <td className="py-3.5 px-3 text-right whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                              row.marginPct >= 20 
                                ? 'bg-emerald-100 text-emerald-800' 
                                : row.marginPct >= 10 
                                ? 'bg-blue-100 text-blue-800' 
                                : row.marginPct >= 0 
                                ? 'bg-amber-100 text-amber-800' 
                                : 'bg-rose-100 text-rose-800'
                            }`}>
                              {row.marginPct.toFixed(1)}%
                            </span>
                          </td>
                        </motion.tr>

                        {/* Expandable PO batch details row */}
                        <AnimatePresence>
                          {isExpanded && row.batches && row.batches.length > 0 && (
                            <motion.tr 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25 }}
                              className="bg-emerald-50/25 border-b border-emerald-100"
                            >
                              <td colSpan={14} className="py-3.5 px-8">
                                <div className="bg-white rounded-2xl border border-emerald-200/90 p-4 shadow-sm space-y-2.5">
                                  <div className="text-xs font-bold text-emerald-950 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Layers className="w-4 h-4 text-emerald-600" />
                                      <span>Procurement Batch Breakdown for {row.itemName}</span>
                                    </div>
                                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                      {row.batches.length} Batch Allocations
                                    </span>
                                  </div>
                                  <table className="w-full text-left text-xs border border-gray-100 rounded-xl overflow-hidden">
                                    <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                      <tr>
                                        <th className="py-2 px-3">PO Invoice #</th>
                                        <th className="py-2 px-3">Supplier Name</th>
                                        <th className="py-2 px-3 text-right">Allocated Qty</th>
                                        <th className="py-2 px-3 text-right">Batch Unit Cost</th>
                                        <th className="py-2 px-3 text-right">Batch Total Cost</th>
                                        <th className="py-2 px-3 text-right">Revenue Share</th>
                                        <th className="py-2 px-3 text-right">Batch Profit</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-gray-700">
                                      {row.batches.map((b, bIdx) => (
                                        <tr key={bIdx} className="hover:bg-emerald-50/30">
                                          <td className="py-2 px-3 font-mono font-bold text-gray-900">{b.poNumber}</td>
                                          <td className="py-2 px-3 flex items-center gap-1.5 font-medium text-amber-950">
                                            <Truck className="w-3 h-3 text-amber-600" />
                                            <span>{b.supplierName}</span>
                                          </td>
                                          <td className="py-2 px-3 text-right font-bold">{b.quantity}</td>
                                          <td className="py-2 px-3 text-right font-mono font-semibold">{format(b.unitCost)}</td>
                                          <td className="py-2 px-3 text-right font-mono text-gray-700">{format(b.totalCost)}</td>
                                          <td className="py-2 px-3 text-right font-mono text-emerald-700 font-bold">{format(b.totalRevenue)}</td>
                                          <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                            +{format(b.profit)}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </motion.tr>
                          )}
                        </AnimatePresence>
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
              {/* Table Footer Totals */}
              {filteredAndSortedRows.length > 0 && (
                <tfoot className="bg-gray-100/90 font-black text-gray-900 border-t-2 border-gray-200">
                  <tr>
                    <td colSpan={7} className="py-4 px-3 text-right uppercase text-xs tracking-wider">
                      Summary Total ({filteredAndSortedRows.length} Items):
                    </td>
                    <td className="py-4 px-3 text-right text-xs">
                      {filteredSummary.totalUnits.toLocaleString()}
                    </td>
                    <td colSpan={2} className="py-4 px-3 text-right text-xs text-gray-400 font-normal">
                      —
                    </td>
                    <td className="py-4 px-3 text-right text-xs">
                      {format(filteredSummary.totalCost)}
                    </td>
                    <td className="py-4 px-3 text-right text-xs text-emerald-800">
                      {format(filteredSummary.totalRevenue)}
                    </td>
                    <td className="py-4 px-3 text-right text-xs text-emerald-800">
                      +{format(filteredSummary.totalProfit)}
                    </td>
                    <td className="py-4 px-3 text-right text-xs">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-200 text-emerald-950">
                        {filteredSummary.overallMargin.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
};

export const SalesReportPage = WithAuth(SalesReportPageBase, ModuleName.TAX_INVOICES, Permission.LIST);
export default SalesReportPage;
