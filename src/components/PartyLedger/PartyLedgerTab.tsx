import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  CreditCard, 
  Wallet, 
  Calendar, 
  Search, 
  Download, 
  Printer, 
  Plus, 
  FileText, 
  ExternalLink, 
  Loader2, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  DollarSign, 
  X,
  TrendingUp,
  Receipt,
  Scale,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../../helper/currency';
import { successToast, errorToast } from '../../helper/toast';
import { ERPExportModal } from '../ERPList/ERPExportModal';
import { RecordPaymentModal } from './RecordPaymentModal';
import type { ColumnDef } from '../CustomTable';
import { 
  fetchCustomerLedger, 
  fetchSupplierLedger, 
} from '../../services/api';
import { useNavigate } from 'react-router-dom';

interface PartyLedgerTabProps {
  partyId: string;
  partyType: 'CUSTOMER' | 'SUPPLIER';
  partyName: string;
}

export const PartyLedgerTab: React.FC<PartyLedgerTabProps> = ({
  partyId,
  partyType,
  partyName,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Filters
  const [datePreset, setDatePreset] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'THIS_YEAR' | 'CUSTOM'>('ALL');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Payment Modal State
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const isCustomer = partyType === 'CUSTOMER';

  const loadLedger = async () => {
    if (!partyId || partyId === 'new') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      let params: { startDate?: string; endDate?: string } = {};

      if (datePreset === 'THIS_MONTH') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        params.startDate = start.toISOString().split('T')[0];
      } else if (datePreset === 'LAST_MONTH') {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const end = new Date(now.getFullYear(), now.getMonth(), 0);
        params.startDate = start.toISOString().split('T')[0];
        params.endDate = end.toISOString().split('T')[0];
      } else if (datePreset === 'THIS_YEAR') {
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        params.startDate = start.toISOString().split('T')[0];
      } else if (datePreset === 'CUSTOM') {
        if (customStart) params.startDate = customStart;
        if (customEnd) params.endDate = customEnd;
      }

      const data = isCustomer 
        ? await fetchCustomerLedger(partyId, params)
        : await fetchSupplierLedger(partyId, params);

      setLedgerData(data);
    } catch (err: any) {
      console.error('Failed to load ledger:', err);
      errorToast(err?.response?.data?.error || 'Failed to load ledger data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [partyId, partyType, datePreset, customStart, customEnd]);

  // Filter transactions by search query
  const filteredTransactions = useMemo(() => {
    if (!ledgerData?.transactions) return [];
    if (!searchQuery.trim()) return ledgerData.transactions;

    const q = searchQuery.toLowerCase();
    return ledgerData.transactions.filter((tx: any) => 
      (tx.refNo && tx.refNo.toLowerCase().includes(q)) ||
      (tx.particulars && tx.particulars.toLowerCase().includes(q)) ||
      (tx.voucherType && tx.voucherType.toLowerCase().includes(q)) ||
      (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(q))
    );
  }, [ledgerData?.transactions, searchQuery]);

  // Export to CSV
  const exportToCSV = () => {
    if (!filteredTransactions.length) {
      errorToast('No transactions to export');
      return;
    }

    const headers = ['Date', 'Voucher Type', 'Ref No', 'Particulars', 'Payment Mode', 'Debit (DR)', 'Credit (CR)', 'Balance', 'Type'];
    const rows = filteredTransactions.map((tx: any) => [
      new Date(tx.date).toLocaleDateString(),
      `"${tx.voucherType || ''}"`,
      `"${tx.refNo || ''}"`,
      `"${(tx.particulars || '').replace(/"/g, '""')}"`,
      tx.paymentMethod || '',
      tx.debit || 0,
      tx.credit || 0,
      tx.runningBalance || 0,
      tx.balanceType || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r: any) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${partyName.replace(/\s+/g, '_')}_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!partyId || partyId === 'new') {
    return (
      <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200 m-6">
        <Scale className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-base font-bold text-gray-800">Ledger Not Available Yet</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
          Please save this {isCustomer ? 'customer' : 'supplier'} first to begin tracking their sales, purchases, and debit/credit ledger transactions.
        </p>
      </div>
    );
  }

  const summary = ledgerData?.summary || {
    totalSales: 0,
    totalPurchases: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    advanceAmount: 0,
    netBalance: 0,
    status: 'SETTLED'
  };

  const netBalance = summary.netBalance || 0;
  const isNetDue = isCustomer ? netBalance > 0.001 : netBalance > 0.001;
  const isAdvance = isCustomer ? netBalance < -0.001 : netBalance < -0.001;
  const isSettled = !isNetDue && !isAdvance;

  return (
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
      {/* 1. TOP SUMMARY KPI BANNER */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Status Card (Hero) */}
        <div className={`p-5 rounded-2xl border shadow-2xs flex flex-col justify-between transition-all ${
          isNetDue 
            ? 'bg-amber-50/70 border-amber-200 text-amber-950' 
            : isAdvance 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-gray-50 border-gray-200 text-gray-800'
        }`}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-gray-500">
              {isCustomer ? 'Net Customer Balance' : 'Net Supplier Balance'}
            </span>
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
              isNetDue 
                ? 'bg-amber-100 text-amber-800 border-amber-300' 
                : isAdvance 
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                  : 'bg-gray-200 text-gray-700 border-gray-300'
            }`}>
              {isNetDue 
                ? (isCustomer ? 'Pending Due' : 'Credit Payable') 
                : isAdvance 
                  ? 'Advance Balance' 
                  : 'Settled'}
            </span>
          </div>

          <div className="my-2">
            <div className={`text-2xl sm:text-3xl font-black tracking-tight ${
              isNetDue ? 'text-amber-900' : isAdvance ? 'text-emerald-900' : 'text-gray-900'
            }`}>
              {formatCurrency(Math.abs(netBalance))}
            </div>
            <p className="text-xs font-semibold mt-0.5 opacity-80">
              {isNetDue && (isCustomer ? 'Customer owes this amount' : 'You owe this amount to supplier')}
              {isAdvance && (isCustomer ? 'Customer has overpaid / advance on file' : 'Advance paid to supplier')}
              {isSettled && 'All invoices and payments are fully cleared'}
            </p>
          </div>

          <div className="text-[11px] font-mono font-bold opacity-70">
            Accounting: {isCustomer ? (netBalance > 0 ? 'Debit (DR)' : netBalance < 0 ? 'Credit (CR)' : '0.00') : (netBalance > 0 ? 'Credit (CR)' : netBalance < 0 ? 'Debit (DR)' : '0.00')}
          </div>
        </div>

        {/* Total Billed / Invoiced */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">
              {isCustomer ? 'Total Sales' : 'Total Purchases'}
            </span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-gray-900">
              {formatCurrency(isCustomer ? summary.totalSales : summary.totalPurchases)}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Across {summary.invoicesCount || 0} {isCustomer ? 'sales invoices' : 'purchase bills'}
            </p>
          </div>
          <div className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Lifetime business volume</span>
          </div>
        </div>

        {/* Total Paid / Settled */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">
              {isCustomer ? 'Total Collected' : 'Total Paid Out'}
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-emerald-800">
              {formatCurrency(summary.totalPaid)}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Settled via Cash, Bank & Mobile Money
            </p>
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Cleared ledger receipts</span>
          </div>
        </div>

        {/* Credit & Advance Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-500">
            <span className="text-[11px] font-black uppercase tracking-wider">
              Credit vs Advance
            </span>
            <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Pending Credit:</span>
              <strong className="text-amber-700 font-mono font-bold">
                {formatCurrency(summary.outstandingBalance)}
              </strong>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500 font-medium">Advance Amount:</span>
              <strong className="text-emerald-700 font-mono font-bold">
                {formatCurrency(summary.advanceAmount)}
              </strong>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full mt-1 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isCustomer ? 'Receive Payment' : 'Make Payment'}</span>
          </button>
        </div>
      </div>

      {/* 2. CONTROLS BAR: FILTERS, SEARCH, EXPORT */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
        {/* Date Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Time' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'LAST_MONTH', label: 'Last Month' },
            { id: 'THIS_YEAR', label: 'This Year' },
            { id: 'CUSTOM', label: 'Custom' }
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDatePreset(preset.id as any)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                datePreset === preset.id
                  ? 'bg-primary-600 text-white shadow-2xs'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {preset.label}
            </button>
          ))}

          {datePreset === 'CUSTOM' && (
            <div className="flex items-center gap-1.5 ml-2">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg outline-none bg-white font-medium"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-2.5 py-1 text-xs border border-gray-300 rounded-lg outline-none bg-white font-medium"
              />
            </div>
          )}
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search ref #, note, mode..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs outline-none focus:border-primary-500 shadow-2xs font-medium"
            />
          </div>

          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            title="Export Ledger Report (Excel / PDF / CSV)"
            className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            title="Print Ledger Statement"
            className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl transition-colors cursor-pointer shadow-2xs"
          >
            <Printer className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. TRANSACTIONS LEDGER TABLE */}
      <div className="border border-gray-200 rounded-2xl bg-white shadow-2xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-600">
              Transaction Ledger ({filteredTransactions.length})
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Chronological statement showing all invoices, receipts, debits, credits, and running balance.
            </p>
          </div>
          <span className="text-xs font-mono text-gray-500 font-bold">
            Currency: {ledgerData?.party?.currency || 'USh / UGX'}
          </span>
        </div>

        {/* Advance Balance Notice when no invoices exist */}
        {isCustomer && (summary?.advanceAmount > 0) && (summary?.totalSales === 0) && (
          <div className="mx-5 my-3 p-3 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                <strong>Customer Advance Recorded ({formatCurrency(summary.advanceAmount)}):</strong> Recorded under <strong>Credit (Received)</strong> as advance funds. Once a sales invoice is billed for this customer, this advance balance will automatically settle against it.
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Loading ledger transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-semibold">No ledger transactions found</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Transactions will automatically appear here when invoices or payments are recorded for this {isCustomer ? 'customer' : 'supplier'}.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[720px]">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 w-24">Date</th>
                  <th className="py-2.5 px-2.5 w-36">Voucher Type</th>
                  <th className="py-2.5 px-2.5 w-28">Ref No</th>
                  <th className="py-2.5 px-3">Particulars</th>
                  <th className="py-2.5 px-2 text-center w-16">Mode</th>
                  <th className="py-2.5 px-3 text-right w-32 bg-amber-50/40">
                    <div>{isCustomer ? 'Debit (Billed)' : 'Debit (Paid)'}</div>
                    <div className="text-[9px] font-normal normal-case text-amber-700/80">
                      {isCustomer ? 'Sales to customer' : 'Payment to supplier'}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right w-32 bg-emerald-50/50">
                    <div className="text-emerald-900">{isCustomer ? 'Credit (Received)' : 'Credit (Billed)'}</div>
                    <div className="text-[9px] font-normal normal-case text-emerald-700">
                      {isCustomer ? 'Money received (IN)' : 'Purchase PO billed'}
                    </div>
                  </th>
                  <th className="py-2.5 px-3 text-right w-36 bg-gray-50/80">Running Bal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredTransactions.map((tx: any, idx: number) => {
                  const isInv = tx.type === 'INVOICE';
                  const isPayment = tx.type === 'PAYMENT';
                  const hasCredit = tx.credit > 0;
                  const hasDebit = tx.debit > 0;

                  return (
                    <tr 
                      key={tx.id || idx}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      {/* Date */}
                      <td className="py-2.5 px-3 text-gray-600 font-medium whitespace-nowrap text-[11px]">
                        {new Date(tx.date).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: '2-digit'
                        })}
                      </td>

                      {/* Voucher Type + Quick Amount Pill */}
                      <td className="py-2.5 px-2.5 whitespace-nowrap">
                        <div className="flex flex-col gap-0.5 items-start">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${
                            isInv 
                              ? 'bg-blue-50 text-blue-700 border-blue-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isInv ? (
                              <Receipt className="w-3 h-3 text-blue-500 shrink-0" />
                            ) : (
                              <Wallet className="w-3 h-3 text-emerald-500 shrink-0" />
                            )}
                            <span className="truncate max-w-[100px]">{tx.voucherType || (isInv ? 'Invoice' : 'Payment')}</span>
                          </span>
                          {/* Quick Amount Pill for instant readability */}
                          {hasCredit ? (
                            <span className="text-[10px] font-mono font-black text-emerald-700">
                              +{formatCurrency(tx.credit)}
                            </span>
                          ) : hasDebit ? (
                            <span className="text-[10px] font-mono font-black text-amber-700">
                              -{formatCurrency(tx.debit)}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* Ref No */}
                      <td className="py-2.5 px-2.5 font-mono font-bold whitespace-nowrap text-xs">
                        {tx.invoiceId ? (
                          <button
                            type="button"
                            onClick={() => {
                              const route = isCustomer 
                                ? `/invoices/sales/new?id=${tx.invoiceId}` 
                                : `/invoices/purchase/new?id=${tx.invoiceId}`;
                              navigate(route);
                            }}
                            className="text-primary-700 hover:text-primary-900 underline flex items-center gap-1 cursor-pointer"
                            title="View / Edit Invoice"
                          >
                            <span className="truncate max-w-[90px]">{tx.refNo}</span>
                            <ExternalLink className="w-3 h-3 opacity-60 shrink-0" />
                          </button>
                        ) : (
                          <span className="text-gray-800 truncate max-w-[90px] block">{tx.refNo}</span>
                        )}
                      </td>

                      {/* Particulars */}
                      <td className="py-2.5 px-3 text-gray-800 font-medium max-w-[180px] truncate" title={tx.particulars}>
                        {tx.particulars}
                      </td>

                      {/* Payment Mode */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[9.5px] font-extrabold bg-gray-100 text-gray-700 uppercase border border-gray-200">
                          {tx.paymentMethod || 'CASH'}
                        </span>
                      </td>

                      {/* Debit (DR) */}
                      <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap bg-amber-50/20">
                        {tx.debit > 0 ? (
                          <span className={isCustomer ? 'text-amber-800' : 'text-emerald-800'}>
                            {formatCurrency(tx.debit)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Credit (CR) - Prominently highlighted for Customer Receipts */}
                      <td className="py-2.5 px-3 text-right font-mono font-black whitespace-nowrap bg-emerald-50/40">
                        {tx.credit > 0 ? (
                          <span className="text-emerald-800 bg-emerald-100/60 px-1.5 py-0.5 rounded border border-emerald-300/60">
                            {formatCurrency(tx.credit)}
                          </span>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>

                      {/* Running Balance */}
                      <td className="py-2.5 px-3 text-right font-mono whitespace-nowrap bg-gray-50/30">
                        <div className="flex items-center justify-end gap-1">
                          <span className="font-extrabold text-gray-900">
                            {formatCurrency(tx.runningBalance || 0)}
                          </span>
                          <span className={`text-[9px] font-black px-1 py-0.2 rounded ${
                            tx.balanceType === 'DR'
                              ? (isCustomer ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800')
                              : tx.balanceType === 'CR'
                                ? (isCustomer ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {tx.balanceType}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* Table Footer: Totals */}
              <tfoot>
                <tr className="bg-gray-50/90 border-t-2 border-gray-200 font-bold text-gray-900 text-xs">
                  <td colSpan={5} className="py-2.5 px-3 text-right uppercase text-[10.5px] text-gray-500 font-sans">
                    Total Summary:
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-800 bg-amber-50/30">
                    <div className="text-[9px] font-sans font-medium text-amber-700 uppercase">
                      {isCustomer ? 'Total Billed' : 'Total Paid'}
                    </div>
                    <div className="font-extrabold text-xs">
                      {formatCurrency(
                        filteredTransactions.reduce((acc: number, t: any) => acc + (t.debit || 0), 0)
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-800 bg-emerald-50/50">
                    <div className="text-[9px] font-sans font-bold text-emerald-700 uppercase">
                      {isCustomer ? 'Total Received' : 'Total Billed'}
                    </div>
                    <div className="font-black text-xs text-emerald-800">
                      +{formatCurrency(
                        filteredTransactions.reduce((acc: number, t: any) => acc + (t.credit || 0), 0)
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-primary-900 bg-gray-50/80">
                    <div className="text-[9px] font-sans font-medium text-gray-500 uppercase">Net Balance</div>
                    <div className="font-black text-xs">
                      {formatCurrency(Math.abs(summary.netBalance))} {isCustomer ? (summary.netBalance > 0 ? 'DR (Due)' : summary.netBalance < 0 ? 'CR (Advance)' : 'Settled') : (summary.netBalance > 0 ? 'CR (Payable)' : summary.netBalance < 0 ? 'DR (Advance)' : 'Settled')}
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* 4. RECORD PAYMENT MODAL (WITH MULTI-SELECT & AUTO-ALLOCATE) */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        initialPartyType={partyType}
        initialPartyId={partyId}
        initialPartyName={partyName}
        onSuccess={loadLedger}
      />

      {/* 5. ERP EXPORT MODAL (EXCEL / PDF / CSV) */}
      <ERPExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title={`${partyName} — Statement Ledger`}
        fileNamePrefix={`${partyName.toLowerCase().replace(/[^a-z0-9]+/g, '_')}_ledger`}
        columns={[
          {
            key: 'date',
            title: 'Date',
            render: (tx: any) => new Date(tx.date).toLocaleDateString('en-GB')
          },
          {
            key: 'voucherType',
            title: 'Voucher Type',
            render: (tx: any) => tx.voucherType || ''
          },
          {
            key: 'refNo',
            title: 'Ref / Invoice #',
            render: (tx: any) => tx.refNo || ''
          },
          {
            key: 'particulars',
            title: 'Particulars',
            render: (tx: any) => tx.particulars || ''
          },
          {
            key: 'paymentMethod',
            title: 'Mode',
            render: (tx: any) => tx.paymentMethod || 'CASH'
          },
          {
            key: 'debit',
            title: 'Debit (DR)',
            render: (tx: any) => tx.debit > 0 ? formatCurrency(tx.debit) : '-'
          },
          {
            key: 'credit',
            title: 'Credit (CR)',
            render: (tx: any) => tx.credit > 0 ? formatCurrency(tx.credit) : '-'
          },
          {
            key: 'runningBalance',
            title: 'Running Balance',
            render: (tx: any) => `${formatCurrency(tx.runningBalance || 0)} ${tx.balanceType || ''}`
          }
        ]}
        data={filteredTransactions}
        onFetchAllRecords={async () => {
          const res = isCustomer 
            ? await fetchCustomerLedger(partyId) 
            : await fetchSupplierLedger(partyId);
          return res?.transactions || filteredTransactions;
        }}
      />
    </div>
  );
};
export default PartyLedgerTab;

