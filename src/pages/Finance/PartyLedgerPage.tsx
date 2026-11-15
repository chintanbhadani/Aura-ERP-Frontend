import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { 
  Users, 
  Truck, 
  Search, 
  Download, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  Receipt, 
  Wallet, 
  ExternalLink, 
  Loader2, 
  Scale, 
  CheckCircle2, 
  AlertCircle,
  Calendar
} from 'lucide-react';
import { formatCurrency } from '../../helper/currency';
import { fetchPartyLedgerReport } from '../../services/api';
import { errorToast } from '../../helper/toast';

export const PartyLedgerPageBase: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ rows: any[]; summary: any }>({
    rows: [],
    summary: {
      totalCreditPurchase: 0,
      totalPaymentForPurchase: 0,
      totalSale: 0,
      totalCredit: 0,
      totalCash: 0,
      netPending: 0,
      totalCreditDue: 0,
      totalAdvance: 0,
    }
  });

  const [activeTab, setActiveTab] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchPartyLedgerReport({
        type: activeTab,
        search: searchQuery || undefined
      });
      setData(res || { rows: [], summary: {} });
    } catch (err: any) {
      console.error('Failed to load party ledger report:', err);
      errorToast('Failed to load Party Ledger report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const filteredRows = useMemo(() => {
    if (!data?.rows) return [];
    if (!searchQuery.trim()) return data.rows;
    const q = searchQuery.toLowerCase();
    return data.rows.filter((r) => 
      r.partyName.toLowerCase().includes(q) ||
      (r.contact && r.contact.toLowerCase().includes(q))
    );
  }, [data?.rows, searchQuery]);

  const exportToCSV = () => {
    if (!filteredRows.length) return;
    const headers = [
      'NO',
      'PARTY NAME',
      'TYPE',
      'CREDIT PURCHASE',
      'PAYMENT FOR PURCHASE',
      'SALE',
      'CREDIT',
      'CASH',
      'PENDING',
      'CLOSING MONTH END',
      'DATE'
    ];

    const rows = filteredRows.map((r, i) => [
      i + 1,
      `"${r.partyName.replace(/"/g, '""')}"`,
      r.partyType,
      r.creditPurchase || 0,
      r.paymentForPurchase || 0,
      r.sale || 0,
      r.credit || 0,
      r.cash || 0,
      r.pending || 0,
      r.closingMonthEnd || 0,
      `"${r.date || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PARTY_LEDGER_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const summary = data?.summary || {
    totalCreditPurchase: 0,
    totalPaymentForPurchase: 0,
    totalSale: 0,
    totalCredit: 0,
    totalCash: 0,
    netPending: 0,
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-primary-100 text-primary-700">
                <Scale className="w-5 h-5" />
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                Party Ledger (Master Statement)
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Consolidated view of all customer sales, supplier purchases, credit extensions, payments, and net pending balances.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportToCSV}
              className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
            <button
              type="button"
              onClick={loadData}
              className="p-2 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* HERO BANNER: MASTER PENDING BALANCE (MATCHING GOOGLE SHEET TOP BLUE ROW) */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                Net Overall Position (All Parties)
              </span>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-tight mt-1">
                {formatCurrency(summary.netPending)}
              </div>
              <p className="text-xs text-blue-200/80 mt-1">
                {summary.netPending >= 0 
                  ? 'Net positive balance across all customer accounts receivable and supplier payables.'
                  : 'Net negative balance: Advance collections and advance supplier deposits exceed outstanding.'}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 text-xs font-mono">
              <div>
                <span className="text-blue-300/70 block text-[11px] font-sans">Total Sales</span>
                <strong className="text-emerald-400 text-sm">{formatCurrency(summary.totalSale)}</strong>
              </div>
              <div>
                <span className="text-blue-300/70 block text-[11px] font-sans">Credit Purchase</span>
                <strong className="text-blue-300 text-sm">{formatCurrency(summary.totalCreditPurchase)}</strong>
              </div>
              <div>
                <span className="text-blue-300/70 block text-[11px] font-sans">Total Cash Received</span>
                <strong className="text-white text-sm">{formatCurrency(summary.totalCash)}</strong>
              </div>
            </div>
          </div>
        </div>

        {/* CONTROLS: TABS & SEARCH */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-2xl w-fit">
            {[
              { id: 'ALL', label: 'All Parties' },
              { id: 'CUSTOMER', label: 'Customers' },
              { id: 'SUPPLIER', label: 'Suppliers' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by party name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-xs outline-none focus:border-primary-500 shadow-2xs font-medium"
            />
          </div>
        </div>

        {/* MASTER SPREADSHEET TABLE (MATCHING GOOGLE SHEET COLUMNS) */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-16 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-2" />
              <p className="text-xs text-gray-500">Loading party ledger records...</p>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="p-16 text-center text-gray-500">
              <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-semibold">No party ledger records found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-blue-900 text-white text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12">No</th>
                    <th className="py-3.5 px-4">Party Name</th>
                    <th className="py-3.5 px-3">Type</th>
                    <th className="py-3.5 px-3 text-right">Credit Purchase</th>
                    <th className="py-3.5 px-3 text-right">Payment for Purchase</th>
                    <th className="py-3.5 px-3 text-right">Sale</th>
                    <th className="py-3.5 px-3 text-right">Credit</th>
                    <th className="py-3.5 px-3 text-right">Cash</th>
                    <th className="py-3.5 px-4 text-right">Pending</th>
                    <th className="py-3.5 px-3 text-center">Month End</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredRows.map((row: any, idx: number) => {
                    const isCust = row.partyType === 'CUSTOMER';
                    const pendingVal = Number(row.pending || 0);
                    const isPositive = pendingVal > 0.001;
                    const isNegative = pendingVal < -0.001;

                    return (
                      <tr 
                        key={row.partyId || idx}
                        className="hover:bg-blue-50/40 transition-colors"
                      >
                        {/* NO */}
                        <td className="py-3 px-4 text-center font-bold text-gray-500">
                          {idx + 1}
                        </td>

                        {/* PARTY NAME */}
                        <td className="py-3 px-4 font-bold text-gray-900">
                          <button
                            type="button"
                            onClick={() => {
                              const route = isCust
                                ? `/master/customers/${row.partyId}?tab=ledger`
                                : `/master/suppliers/${row.partyId}?tab=ledger`;
                              navigate(route);
                            }}
                            className="hover:text-primary-700 hover:underline flex items-center gap-1.5 text-left cursor-pointer"
                          >
                            <span>{row.partyName}</span>
                            <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />
                          </button>
                        </td>

                        {/* TYPE */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${
                            isCust 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                          }`}>
                            {isCust ? <Users className="w-3 h-3" /> : <Truck className="w-3 h-3" />}
                            <span>{isCust ? 'Customer' : 'Supplier'}</span>
                          </span>
                        </td>

                        {/* CREDIT PURCHASE */}
                        <td className="py-3 px-3 text-right font-mono font-medium text-gray-700">
                          {row.creditPurchase > 0 ? formatCurrency(row.creditPurchase) : '-'}
                        </td>

                        {/* PAYMENT FOR PURCHASE */}
                        <td className="py-3 px-3 text-right font-mono font-medium text-gray-700">
                          {row.paymentForPurchase > 0 ? formatCurrency(row.paymentForPurchase) : '-'}
                        </td>

                        {/* SALE */}
                        <td className="py-3 px-3 text-right font-mono font-medium text-gray-700">
                          {row.sale > 0 ? formatCurrency(row.sale) : '-'}
                        </td>

                        {/* CREDIT */}
                        <td className="py-3 px-3 text-right font-mono font-medium text-gray-700">
                          {row.credit > 0 ? formatCurrency(row.credit) : '-'}
                        </td>

                        {/* CASH */}
                        <td className="py-3 px-3 text-right font-mono font-medium text-gray-700">
                          {row.cash > 0 ? formatCurrency(row.cash) : '-'}
                        </td>

                        {/* PENDING (COLOR CODED LIKE GOOGLE SHEETS) */}
                        <td className="py-3 px-4 text-right font-mono font-bold whitespace-nowrap">
                          {isPositive ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-emerald-100/90 text-emerald-900 border border-emerald-300 text-xs">
                              {formatCurrency(pendingVal)}
                            </span>
                          ) : isNegative ? (
                            <span className="inline-block px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 text-xs">
                              {formatCurrency(pendingVal)}
                            </span>
                          ) : (
                            <span className="text-gray-400">0.00</span>
                          )}
                        </td>

                        {/* CLOSING MONTH END */}
                        <td className="py-3 px-3 text-center text-gray-400 font-mono">
                          {row.closingMonthEnd || 0}
                        </td>

                        {/* DATE */}
                        <td className="py-3 px-4 text-gray-600 font-mono text-[11px] whitespace-nowrap">
                          {row.date || '-'}
                        </td>

                        {/* ACTIONS */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              const route = isCust
                                ? `/master/customers/${row.partyId}?tab=ledger`
                                : `/master/suppliers/${row.partyId}?tab=ledger`;
                              navigate(route);
                            }}
                            className="px-2.5 py-1 text-[11px] font-bold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg border border-primary-200 transition-colors cursor-pointer"
                          >
                            Open Ledger
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                {/* SPREADSHEET FOOTER TOTALS */}
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900 text-xs">
                    <td colSpan={3} className="py-3.5 px-4 text-right uppercase text-[11px] text-gray-600 font-black">
                      Total:
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-blue-900">
                      {formatCurrency(summary.totalCreditPurchase)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-blue-900">
                      {formatCurrency(summary.totalPaymentForPurchase)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-emerald-900">
                      {formatCurrency(summary.totalSale)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-gray-900">
                      {formatCurrency(summary.totalCredit)}
                    </td>
                    <td className="py-3.5 px-3 text-right font-mono font-extrabold text-gray-900">
                      {formatCurrency(summary.totalCash)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-black text-sm whitespace-nowrap">
                      <span className={summary.netPending < 0 ? 'text-rose-700' : 'text-emerald-800'}>
                        {formatCurrency(summary.netPending)}
                      </span>
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export const PartyLedgerPage = WithAuth(PartyLedgerPageBase, ModuleName.EXPENSES, Permission.LIST);
export default PartyLedgerPage;
