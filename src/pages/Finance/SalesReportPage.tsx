import React, { useState, useEffect, useMemo } from 'react';
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
  DollarSign
} from 'lucide-react';
import { fetchSalesReport, type SalesReportRow, type SalesReportSummary, type SalesReportBatch } from '../../services/api';
import { useCurrency } from '../../helper/currency';
import { errorToast, successToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { DashboardLayout } from '../../layouts/DashboardLayout';

const SalesReportPageBase: React.FC = () => {
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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedClient, setSelectedClient] = useState('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState('ALL');
  const [sortField, setSortField] = useState<'date' | 'totalSales' | 'grossProfit' | 'marginPct'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await fetchSalesReport({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: searchTerm || undefined
      });
      setRows(data.rows || []);
      setSummary(data.summary || {
        totalUnits: 0,
        totalRevenue: 0,
        totalCost: 0,
        totalProfit: 0,
        overallMargin: 0,
        totalInvoices: 0
      });
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

  // Quick Date Range Presets
  const handleDatePreset = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'all') => {
    const today = new Date();
    const formatDate = (d: Date) => d.toISOString().split('T')[0];

    if (preset === 'today') {
      const dStr = formatDate(today);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'yesterday') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const dStr = formatDate(y);
      setStartDate(dStr);
      setEndDate(dStr);
    } else if (preset === 'last7') {
      const past = new Date();
      past.setDate(past.getDate() - 7);
      setStartDate(formatDate(past));
      setEndDate(formatDate(today));
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDate(formatDate(firstDay));
      setEndDate(formatDate(today));
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  // Filter and sort rows
  const filteredAndSortedRows = useMemo(() => {
    return rows
      .filter(row => {
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
  }, [rows, selectedClient, selectedSupplier, searchTerm, sortField, sortOrder]);

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

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-[1700px] mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-600 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span>Finance & Profitability Reports</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
            Sales & Margin Report
            <span className="text-xs font-medium bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">
              Date & Supplier Wise
            </span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Analyze client sales, supplier procurement batches, unit purchase vs selling prices, and net gross profits.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={loadReport}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Revenue */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Sales Revenue</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {format(filteredSummary.totalRevenue)}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">Across {filteredSummary.totalInvoices} sales invoices</span>
          </div>
        </div>

        {/* Total Purchase Cost */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Purchase Cost</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {format(filteredSummary.totalCost)}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">Procurement batch valuation</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/40 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Gross Profit</span>
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-emerald-700">
              {format(filteredSummary.totalProfit)}
            </div>
            <span className="text-xs text-emerald-600 font-medium mt-0.5 block">
              Net gross margin: {filteredSummary.overallMargin.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Profit Margin */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Overall Margin</span>
            <div className={`p-2 rounded-lg ${filteredSummary.overallMargin >= 15 ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {filteredSummary.overallMargin.toFixed(2)}%
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">Markup over procurement</span>
          </div>
        </div>

        {/* Total Quantity */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Units Sold</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-bold text-gray-900">
              {filteredSummary.totalUnits.toLocaleString()}
            </div>
            <span className="text-xs text-gray-500 mt-0.5 block">{filteredAndSortedRows.length} item line records</span>
          </div>
        </div>
      </div>

      {/* Filter and Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        {/* Quick presets & search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Quick Date Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-medium text-gray-500 mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> Date:
            </span>
            <button
              onClick={() => handleDatePreset('all')}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                !startDate && !endDate ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Time
            </button>
            <button
              onClick={() => handleDatePreset('today')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Today
            </button>
            <button
              onClick={() => handleDatePreset('yesterday')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Yesterday
            </button>
            <button
              onClick={() => handleDatePreset('last7')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => handleDatePreset('thisMonth')}
              className="px-2.5 py-1 text-xs rounded-md font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              This Month
            </button>
          </div>

          {/* Search Box */}
          <div className="relative min-w-[280px] lg:w-80">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search Client, Supplier, Item, Invoice..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
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
        </div>

        {/* Detailed Secondary Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
          {/* Custom Date Pickers */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none"
              />
            </div>
          </div>

          {/* Client Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Client / Customer</label>
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="ALL">All Clients ({clientOptions.length})</option>
              {clientOptions.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Supplier Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-600 mb-1">Supplier Name</label>
            <select
              value={selectedSupplier}
              onChange={e => setSelectedSupplier(e.target.value)}
              className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
            >
              <option value="ALL">All Suppliers ({supplierOptions.length})</option>
              {supplierOptions.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Sort Control */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Sort By</label>
              <select
                value={sortField}
                onChange={e => setSortField(e.target.value as any)}
                className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-1 focus:ring-emerald-500 outline-none bg-white"
              >
                <option value="date">Date</option>
                <option value="totalSales">Sales Amount</option>
                <option value="grossProfit">Gross Profit</option>
                <option value="marginPct">Margin %</option>
              </select>
            </div>
            <div className="w-24">
              <label className="block text-[11px] font-semibold text-gray-600 mb-1">Order</label>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="w-full flex items-center justify-center gap-1 text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
                <span className="uppercase text-[11px] font-semibold text-gray-700">{sortOrder}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Report Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-200 bg-gray-50/70 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Sales Item Records</span>
            <span className="text-xs bg-gray-200 text-gray-700 font-semibold px-2 py-0.5 rounded-full">
              {filteredAndSortedRows.length} rows
            </span>
          </div>
          <span className="text-xs text-gray-500">
            Click row or expand icon to view individual supplier batch allocations
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100/90 text-gray-700 font-semibold border-b border-gray-200">
                <th className="py-3 px-3 w-8 text-center">#</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Invoice #</th>
                <th className="py-3 px-3">Client (Customer)</th>
                <th className="py-3 px-3">Item Details</th>
                <th className="py-3 px-3">Supplier Name(s)</th>
                <th className="py-3 px-3">PO Reference</th>
                <th className="py-3 px-3 text-right">Qty</th>
                <th className="py-3 px-3 text-right">Purchase Price</th>
                <th className="py-3 px-3 text-right">Sales Price</th>
                <th className="py-3 px-3 text-right">Total Cost</th>
                <th className="py-3 px-3 text-right">Total Sales</th>
                <th className="py-3 px-3 text-right">Gross Profit</th>
                <th className="py-3 px-3 text-right">Margin %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <RefreshCw className="w-6 h-6 animate-spin text-emerald-600" />
                      <span className="text-sm font-medium">Loading sales report data...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-8 h-8 text-gray-400" />
                      <span className="text-sm font-medium text-gray-700">No sales transactions found</span>
                      <span className="text-xs text-gray-400">Try adjusting your date range or search query</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((row, idx) => {
                  const isExpanded = !!expandedRows[row.id];
                  const hasMultipleBatches = row.batches && row.batches.length > 1;

                  return (
                    <React.Fragment key={row.id}>
                      <tr 
                        onClick={() => hasMultipleBatches && toggleRow(row.id)}
                        className={`hover:bg-emerald-50/40 transition-colors ${
                          isExpanded ? 'bg-emerald-50/30' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'
                        } ${hasMultipleBatches ? 'cursor-pointer' : ''}`}
                      >
                        {/* Expand toggle */}
                        <td className="py-3 px-3 text-center text-gray-400">
                          {hasMultipleBatches ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow(row.id);
                              }}
                              className="text-gray-500 hover:text-emerald-700 transition-colors"
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
                        <td className="py-3 px-3 whitespace-nowrap text-gray-800 font-medium">
                          {new Date(row.date).toLocaleDateString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>

                        {/* Invoice Number */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="font-semibold text-emerald-700 hover:underline">
                            {row.invoiceNumber}
                          </div>
                          {row.paymentType && (
                            <span className="inline-block text-[10px] font-medium uppercase px-1.5 py-0.2 bg-gray-100 text-gray-600 rounded">
                              {row.paymentType}
                            </span>
                          )}
                        </td>

                        {/* Client Name */}
                        <td className="py-3 px-3">
                          <div className="font-medium text-gray-900 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                            <span>{row.clientName || 'Walk-in Client'}</span>
                          </div>
                          {row.clientContact && (
                            <span className="text-[11px] text-gray-400 block pl-5">
                              {row.clientContact}
                            </span>
                          )}
                        </td>

                        {/* Item Details */}
                        <td className="py-3 px-3">
                          <div className="font-semibold text-gray-900">{row.itemName}</div>
                          <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                            <span className="font-mono bg-gray-100 px-1 rounded text-gray-700">{row.itemCode}</span>
                            {row.categoryName && <span>• {row.categoryName}</span>}
                          </div>
                        </td>

                        {/* Supplier Name */}
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1">
                            {row.supplierName.split(',').map((sup, sIdx) => {
                              const sTrim = sup.trim();
                              return (
                                <span
                                  key={sIdx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200"
                                >
                                  <Truck className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{sTrim}</span>
                                </span>
                              );
                            })}
                          </div>
                        </td>

                        {/* PO Reference */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className="font-mono text-[11px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                            {row.poReference || '—'}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="py-3 px-3 text-right font-semibold text-gray-800 whitespace-nowrap">
                          {row.quantity.toLocaleString()} <span className="text-[10px] text-gray-500 font-normal">{row.uom}</span>
                        </td>

                        {/* Purchase Price (Unit Cost) */}
                        <td className="py-3 px-3 text-right font-medium text-gray-700 whitespace-nowrap">
                          {format(row.purchasePrice)}
                        </td>

                        {/* Sales Price */}
                        <td className="py-3 px-3 text-right font-bold text-gray-900 whitespace-nowrap">
                          {format(row.salesPrice)}
                        </td>

                        {/* Total Cost */}
                        <td className="py-3 px-3 text-right text-gray-600 whitespace-nowrap">
                          {format(row.totalCost)}
                        </td>

                        {/* Total Sales */}
                        <td className="py-3 px-3 text-right font-bold text-emerald-700 whitespace-nowrap">
                          {format(row.totalSales)}
                        </td>

                        {/* Gross Profit */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className={`font-bold ${row.grossProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                            {row.grossProfit >= 0 ? '+' : ''}{format(row.grossProfit)}
                          </span>
                        </td>

                        {/* Margin % */}
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-bold ${
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
                      </tr>

                      {/* Expandable PO batch details row */}
                      {isExpanded && row.batches && row.batches.length > 0 && (
                        <tr className="bg-emerald-50/20 border-b border-emerald-100">
                          <td colSpan={14} className="py-3 px-8">
                            <div className="bg-white rounded-lg border border-emerald-200 p-3 shadow-sm space-y-2">
                              <div className="text-xs font-bold text-emerald-900 flex items-center gap-2">
                                <Layers className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Procurement Batch Allocation Breakdown for {row.itemName}</span>
                              </div>
                              <table className="w-full text-left text-xs border border-gray-100 rounded">
                                <thead className="bg-gray-50 text-gray-600 font-semibold border-b border-gray-200">
                                  <tr>
                                    <th className="py-1.5 px-3">PO Invoice #</th>
                                    <th className="py-1.5 px-3">Batch Supplier</th>
                                    <th className="py-1.5 px-3 text-right">Allocated Qty</th>
                                    <th className="py-1.5 px-3 text-right">Batch Unit Cost</th>
                                    <th className="py-1.5 px-3 text-right">Batch Total Cost</th>
                                    <th className="py-1.5 px-3 text-right">Sales Revenue Share</th>
                                    <th className="py-1.5 px-3 text-right">Batch Profit</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 text-gray-700">
                                  {row.batches.map((b, bIdx) => (
                                    <tr key={bIdx} className="hover:bg-gray-50">
                                      <td className="py-1.5 px-3 font-mono font-medium text-gray-800">{b.poNumber}</td>
                                      <td className="py-1.5 px-3 flex items-center gap-1.5 font-medium text-amber-900">
                                        <Truck className="w-3 h-3 text-amber-600" />
                                        <span>{b.supplierName}</span>
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-medium">{b.quantity}</td>
                                      <td className="py-1.5 px-3 text-right font-mono">{format(b.unitCost)}</td>
                                      <td className="py-1.5 px-3 text-right font-mono">{format(b.totalCost)}</td>
                                      <td className="py-1.5 px-3 text-right font-mono text-emerald-700 font-medium">{format(b.totalRevenue)}</td>
                                      <td className="py-1.5 px-3 text-right font-mono font-bold text-emerald-700">
                                        +{format(b.profit)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Totals */}
            {filteredAndSortedRows.length > 0 && (
              <tfoot className="bg-gray-100 font-bold text-gray-900 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={7} className="py-3 px-3 text-right uppercase text-xs tracking-wider">
                    Total Summary ({filteredAndSortedRows.length} Line Items):
                  </td>
                  <td className="py-3 px-3 text-right text-xs">
                    {filteredSummary.totalUnits.toLocaleString()}
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-right text-xs text-gray-500">
                    —
                  </td>
                  <td className="py-3 px-3 text-right text-xs">
                    {format(filteredSummary.totalCost)}
                  </td>
                  <td className="py-3 px-3 text-right text-xs text-emerald-800">
                    {format(filteredSummary.totalRevenue)}
                  </td>
                  <td className="py-3 px-3 text-right text-xs text-emerald-800">
                    +{format(filteredSummary.totalProfit)}
                  </td>
                  <td className="py-3 px-3 text-right text-xs">
                    <span className="inline-block px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-200 text-emerald-900">
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
