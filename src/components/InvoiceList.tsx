import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { 
  FileText, 
  Eye, 
  Printer, 
  Download, 
  Share2, 
  Check, 
  ShoppingCart, 
  Plus, 
  TrendingUp, 
  Wallet,
  Heart,
  MessageSquare,
  Trash2
} from 'lucide-react';
import { fetchInvoices, deleteInvoice } from '../services/api';
import { successToast, errorToast } from '../helper/toast';
import type { Invoice } from '../types';
import { printInvoice, downloadInvoicePdf } from '../helper/invoicePrinter';
import { useCurrency } from '../helper/currency';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from './ERPList';
import { type ColumnDef } from './CustomTable';
import { StatusBadge } from './StatusBadge';
import WithAuth from './WithAuth';
import { ModuleName, Permission } from '../helper/constants';
import { formatFullDateTime } from '../helper/helper';

export interface InvoiceListProps {
  fixedType?: 'SALES' | 'PURCHASE';
}

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'party', placeholder: 'Party Name', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'paymentType', placeholder: 'Payment Type', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
];

const FILTER_RULE_FIELDS = ['Invoice Number', 'Party Name', 'Payment Type', 'Status', 'Date', 'Total Amount'];

const InvoiceListBase: React.FC<InvoiceListProps> = ({ fixedType: propFixedType }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewType, setViewType] = useState('List View');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);

  // Quick filters & rule filters
  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({
    id: '',
    party: '',
    paymentType: '',
    status: ''
  });
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [sortField, setSortField] = useState('Last Updated On');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [globalSearch, setGlobalSearch] = useState('');

  // Sidebar filters
  const [assignedToFilter, setAssignedToFilter] = useState('All');
  const [createdByFilter, setCreatedByFilter] = useState('All');
  const [tagFilter, setTagFilter] = useState('All');
  const [showTags, setShowTags] = useState(false);

  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { format } = useCurrency();

  // Determine fixed type from prop or path
  const fixedType = propFixedType || (location.pathname.includes('/sales') ? 'SALES' : location.pathname.includes('/purchase') ? 'PURCHASE' : undefined);

  useEffect(() => {
    loadInvoices();
  }, [fixedType]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const queryParams: Record<string, string> = {};
      if (fixedType) queryParams.type = fixedType;
      const data = await fetchInvoices(queryParams);
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices', error);
      errorToast('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // KPI Calculations matching user spreadsheet summary
  const grandTotal = useMemo(() => invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [invoices]);
  const cashTotal = useMemo(() => invoices.filter(inv => (inv as any).paymentType === 'CASH').reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [invoices]);
  const creditTotal = useMemo(() => invoices.filter(inv => (inv as any).paymentType === 'CREDIT').reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [invoices]);
  const bankTotal = useMemo(() => invoices.filter(inv => (inv as any).paymentType === 'BANK').reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [invoices]);

  const pageTitle = fixedType === 'SALES' ? 'Sales Invoices' : fixedType === 'PURCHASE' ? 'Purchase Invoices' : 'Invoices';
  const partyHeader = fixedType === 'SALES' ? 'Customer' : fixedType === 'PURCHASE' ? 'Supplier' : 'Customer / Supplier';
  const addNewLabel = fixedType === 'SALES' ? 'Add Sales Invoice' : fixedType === 'PURCHASE' ? 'Add Purchase Invoice' : 'Add Invoice';
  const addNewPath = fixedType === 'PURCHASE' ? '/invoices/purchase/new' : '/invoices/sales/new';

  // Client-side filtering & sorting
  const filteredInvoices = useMemo(() => {
    return invoices.filter(inv => {
      // Favorite filter
      if (headerFavorite && !favorites[inv.id]) return false;

      // Global search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const partyName = (inv.type === 'SALES'
          ? (inv.customer?.name || inv.client?.name || inv.client?.companyName || (inv as any).customerName || '')
          : (inv.supplier?.name || inv.supplier?.companyName || (inv as any).supplierName || '')).toLowerCase();
        const match = (inv.invoiceNumber || '').toLowerCase().includes(q) ||
          partyName.includes(q) ||
          ((inv as any).paymentType || '').toLowerCase().includes(q) ||
          (inv.status || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      // Quick filter: ID
      if (quickFilters.id.trim()) {
        const idVal = (inv.invoiceNumber || inv.id || '').toLowerCase();
        if (!idVal.includes(quickFilters.id.trim().toLowerCase())) return false;
      }

      // Quick filter: Party
      if (quickFilters.party.trim()) {
        const partyName = (inv.type === 'SALES'
          ? (inv.customer?.name || inv.client?.name || inv.client?.companyName || (inv as any).customerName || '')
          : (inv.supplier?.name || inv.supplier?.companyName || (inv as any).supplierName || '')).toLowerCase();
        if (!partyName.includes(quickFilters.party.trim().toLowerCase())) return false;
      }

      // Quick filter: Payment Type
      if (quickFilters.paymentType.trim()) {
        const pType = ((inv as any).paymentType || '').toLowerCase();
        if (!pType.includes(quickFilters.paymentType.trim().toLowerCase())) return false;
      }

      // Quick filter: Status
      if (quickFilters.status.trim()) {
        const st = (inv.status || '').toLowerCase();
        if (!st.includes(quickFilters.status.trim().toLowerCase())) return false;
      }

      // Rule filters
      for (const rule of filterRules) {
        if (!rule.value) continue;
        const targetVal = String(
          rule.field === 'Invoice Number' ? inv.invoiceNumber :
          rule.field === 'Party Name' ? (inv.type === 'SALES' ? (inv.customer?.name || inv.client?.name) : inv.supplier?.name) :
          rule.field === 'Payment Type' ? (inv as any).paymentType :
          rule.field === 'Status' ? inv.status :
          rule.field === 'Total Amount' ? inv.totalAmount : ''
        ).toLowerCase();
        const ruleVal = rule.value.toLowerCase();
        if (rule.operator === 'Equals' && targetVal !== ruleVal) return false;
        if (rule.operator === 'Contains' && !targetVal.includes(ruleVal)) return false;
        if (rule.operator === 'Starts With' && !targetVal.startsWith(ruleVal)) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Invoice Number') {
        comparison = (a.invoiceNumber || '').localeCompare(b.invoiceNumber || '');
      } else if (sortField === 'Party Name') {
        const pA = a.type === 'SALES' ? (a.customer?.name || a.client?.name || '') : (a.supplier?.name || '');
        const pB = b.type === 'SALES' ? (b.customer?.name || b.client?.name || '') : (b.supplier?.name || '');
        comparison = pA.localeCompare(pB);
      } else if (sortField === 'Total Amount') {
        comparison = Number(a.totalAmount || 0) - Number(b.totalAmount || 0);
      } else if (sortField === 'Date') {
        comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else {
        // Last Updated On default
        const dateA = new Date((a as any).updatedAt || a.date).getTime();
        const dateB = new Date((b as any).updatedAt || b.date).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [invoices, headerFavorite, favorites, globalSearch, quickFilters, filterRules, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch.trim() || 
    quickFilters.id || 
    quickFilters.party || 
    quickFilters.paymentType || 
    quickFilters.status || 
    filterRules.length > 0 ||
    headerFavorite
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ id: '', party: '', paymentType: '', status: '' });
    setFilterRules([]);
    setHeaderFavorite(false);
  };

  const handleBulkExport = () => {
    if (filteredInvoices.length === 0) {
      errorToast('No invoice records to export');
      return;
    }
    const headers = ['Invoice Number', 'Type', 'Date', 'Party Name', 'Payment Type', 'Total Amount', 'Status'];
    const rows = filteredInvoices.map(inv => [
      inv.invoiceNumber,
      inv.type,
      new Date(inv.date).toLocaleDateString(),
      inv.type === 'SALES' ? (inv.customer?.name || inv.client?.name || '') : (inv.supplier?.name || ''),
      (inv as any).paymentType || 'CASH',
      inv.totalAmount,
      inv.status || 'PAID'
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${pageTitle.toLowerCase().replace(/\s+/g, '_')}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    successToast('Exported CSV successfully');
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${selectedIds.length} invoice(s)?`)) return;
    try {
      await Promise.all(selectedIds.map(id => deleteInvoice(id)));
      successToast(`Deleted ${selectedIds.length} invoice(s)`);
      setSelectedIds([]);
      loadInvoices();
    } catch (err: any) {
      errorToast('Failed to delete selected invoices');
    }
  };

  // Table Columns aligned with Item Master (CustomTable layout)
  const columns: ColumnDef<Invoice>[] = [
    {
      key: 'invoiceNumber',
      title: 'ITEM',
      width: '210px',
      sortable: true,
      render: (val, row) => {
        const itemSubtitle = `${row.type === 'PURCHASE' ? 'Purchase' : 'Sales'} • ${row.items?.length || 0} ${row.items?.length === 1 ? 'Item' : 'Items'}`;
        return (
          <div className="flex flex-col py-0.5">
            <span className="font-bold text-gray-900 font-mono text-sm tracking-tight hover:text-emerald-700 transition-colors">
              {val || row.id}
            </span>
            <span className="text-xs text-gray-500 font-normal">
              {itemSubtitle}
            </span>
          </div>
        );
      }
    },
    {
      key: 'party',
      title: partyHeader.toUpperCase(),
      width: '180px',
      sortable: true,
      render: (_, row) => {
        const partyName = row.type === 'SALES'
          ? (row.customer?.name || row.client?.name || row.client?.companyName || (row as any).customerName || 'Walk-in Customer')
          : (row.supplier?.name || row.supplier?.companyName || (row as any).supplierName || 'Primary Supplier');
        const contact = row.type === 'SALES'
          ? (row.customer?.contact || row.client?.contact)
          : row.supplier?.contact;
        return (
          <div className="flex flex-col">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, party: partyName }));
              }}
              className="font-semibold text-gray-800 text-sm hover:text-emerald-700 hover:underline cursor-pointer"
            >
              {partyName}
            </span>
            {contact && <span className="text-[11px] text-gray-400">{contact}</span>}
          </div>
        );
      }
    },
    {
      key: 'date',
      title: 'DATE',
      width: '120px',
      sortable: true,
      render: (val) => (
        <span className="text-xs font-medium text-gray-700">
          {new Date(val).toLocaleDateString()}
        </span>
      )
    },
    {
      key: 'itemsSummary',
      title: 'PRIMARY ITEM',
      width: '190px',
      render: (_, row) => {
        const items = row.items || [];
        if (items.length === 0) return <span className="text-gray-400 text-xs">-</span>;
        const first = items[0];
        const firstName = first?.product?.name || first?.product?.sku || (first as any)?.name || 'Line Item';
        const moreCount = items.length - 1;
        return (
          <div className="text-xs text-gray-700 truncate max-w-[180px]">
            <span className="font-semibold">{firstName}</span>{' '}
            <span className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded text-[11px]">× {first?.quantity}</span>
            {moreCount > 0 && <span className="text-gray-400 text-[11px] ml-1">+{moreCount} more</span>}
          </div>
        );
      }
    },
    {
      key: 'paymentType',
      title: 'PAYMENT TYPE',
      width: '130px',
      sortable: true,
      render: (_, row) => {
        const val = ((row as any).paymentType || 'CASH').toUpperCase();
        let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-300';
        if (val === 'CREDIT') badgeStyle = 'bg-amber-50 text-amber-800 border-amber-300';
        else if (val === 'BANK') badgeStyle = 'bg-blue-50 text-blue-700 border-blue-300';
        else if (val === 'PARTIAL') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-300';

        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, paymentType: val }));
            }}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-2xs cursor-pointer ${badgeStyle}`}
          >
            {val}
          </span>
        );
      }
    },
    {
      key: 'totalAmount',
      title: 'TOTAL AMOUNT',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (val) => (
        <span className="font-extrabold text-gray-900 text-sm tracking-tight font-mono">
          {format(Number(val) || 0)}
        </span>
      )
    },
    {
      key: 'status',
      title: 'STATUS',
      width: '110px',
      render: (_, row) => (
        <StatusBadge
          status={row.status || 'Paid'}
          size="sm"
        />
      )
    },
    {
      key: 'updatedAt',
      title: 'UPDATED AT',
      align: 'right',
      width: '140px',
      headerRender: ({ currentPageCount, totalCount }) => (
        <div className="flex items-center justify-end gap-2 font-normal text-gray-500 lowercase text-xs select-none">
          <span>{currentPageCount} of {totalCount.toLocaleString()}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setHeaderFavorite(!headerFavorite);
            }}
            className="focus:outline-none p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
            title={headerFavorite ? "Remove Favorite Filter" : "Filter Favorites"}
          >
            <Heart className={`w-3.5 h-3.5 transition-all ${headerFavorite ? 'text-red-500 fill-red-500 scale-110' : 'text-gray-400 hover:text-red-500'}`} />
          </button>
        </div>
      ),
      render: (_, row) => {
        const isFav = favorites[row.id];
        return (
          <div className="flex items-center justify-end gap-2 text-gray-500 text-xs select-none">
            {/* Print icon */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                printInvoice(row);
              }}
              className="p-1 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
              title="Print Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>

            {/* Download PDF */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadInvoicePdf(row);
              }}
              className="p-1 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
              title="Download PDF"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            {/* Comments Counter */}
            <div className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors" title="Comments">
              <MessageSquare className="w-3 h-3 text-gray-400" />
              <span>0</span>
            </div>

            {/* Favorite toggle */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(row.id);
                if (!isFav) {
                  successToast(`Marked ${row.invoiceNumber} as favorite`);
                } else {
                  successToast(`Removed ${row.invoiceNumber} from favorites`);
                }
              }} 
              className="focus:outline-none p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title={isFav ? "Remove Favorite" : "Add Favorite"}
            >
              <Heart className={`w-3.5 h-3.5 transition-all ${isFav ? 'fill-red-500 text-red-500 scale-110' : 'text-gray-400 hover:text-red-500'}`} />
            </button>
          </div>
        );
      }
    }
  ];

  return (
    <ERPListPageLayout<Invoice>
      title={pageTitle}
      viewType={viewType}
      onViewTypeChange={setViewType}
      loading={loading}
      onRefresh={() => { loadInvoices(); successToast('Invoice records refreshed'); }}
      onExportAll={handleBulkExport}
      onPrint={() => window.print()}
      onAddNew={() => navigate(addNewPath)}
      addNewLabel={addNewLabel}

      assignedToFilter={assignedToFilter}
      onAssignedToChange={setAssignedToFilter}
      createdByFilter={createdByFilter}
      onCreatedByChange={setCreatedByFilter}
      tagFilter={tagFilter}
      onTagChange={setTagFilter}
      showTags={showTags}
      onShowTagsChange={setShowTags}

      quickFilters={quickFilters}
      onQuickFilterChange={(key, val) => setQuickFilters(prev => ({ ...prev, [key]: val }))}
      quickFilterFields={QUICK_FILTER_FIELDS}
      filterRules={filterRules}
      filterRuleFields={FILTER_RULE_FIELDS}
      onAddFilterRule={() => setFilterRules(prev => [...prev, { id: `rule-${Date.now()}`, field: 'Invoice Number', operator: 'Equals', value: '' }])}
      onRemoveFilterRule={(id) => setFilterRules(prev => prev.filter(r => r.id !== id))}
      onUpdateFilterRule={(id, key, val) => setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))}
      onClearFilterRules={() => setFilterRules([])}
      onApplyFilterRules={() => successToast('Filters applied')}
      hasActiveFilters={hasActiveFilters}
      onClearAllFilters={clearAllFilters}

      sortField={sortField}
      sortOrder={sortOrder}
      onSortChange={(field, order) => { setSortField(field); setSortOrder(order); }}
      sortOptions={['Last Updated On', 'Invoice Number', 'Party Name', 'Total Amount', 'Date']}

      data={filteredInvoices}
      columns={columns}
      selectedIds={selectedIds}
      onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
      onSelectAll={() => setSelectedIds(selectedIds.length === filteredInvoices.length ? [] : filteredInvoices.map(inv => inv.id))}
      onRowClick={(row) => navigate(row.type === 'PURCHASE' ? `/invoices/purchase/new?id=${row.id}` : `/invoices/sales/new?id=${row.id}`)}
      emptyMessage="No invoices found"

      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}

      bulkActions={
        selectedIds.length > 0 && (
          <div className="flex items-center gap-2 p-2 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900">
            <span>{selectedIds.length} invoice(s) selected</span>
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer font-bold ml-auto"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
          </div>
        )
      }

      topContent={
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-2 select-none">
          {/* Total Turnover / Spend */}
          <div className="bg-white border border-gray-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-gray-500 text-xs font-semibold uppercase tracking-wider">
              <span>{fixedType === 'PURCHASE' ? 'Total Purchases' : 'Total Revenue'}</span>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-extrabold text-gray-900 tracking-tight">{format(grandTotal)}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{invoices.length} {invoices.length === 1 ? 'Invoice' : 'Invoices'}</p>
            </div>
          </div>

          {/* Cash Settlement */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-800 text-xs font-bold uppercase tracking-wider">
              <span>Cash Settled</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-600 text-white text-[10px] font-black">CASH</span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-extrabold text-emerald-900 tracking-tight">{format(cashTotal)}</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">Instant Settlement</p>
            </div>
          </div>

          {/* Credit Outstanding */}
          <div className="bg-amber-50/60 border border-amber-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-800 text-xs font-bold uppercase tracking-wider">
              <span>Credit Balance</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-600 text-white text-[10px] font-black">CREDIT</span>
            </div>
            <div className="mt-2">
              <p className="text-xl font-extrabold text-amber-900 tracking-tight">{format(creditTotal)}</p>
              <p className="text-[11px] text-amber-700 mt-0.5">Payment Pending</p>
            </div>
          </div>

          {/* Bank / Wire */}
          <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 shadow-2xs flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-800 text-xs font-bold uppercase tracking-wider">
              <span>Bank Transfers</span>
              <Wallet className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <p className="text-xl font-extrabold text-blue-900 tracking-tight">{format(bankTotal)}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">Online / Wire</p>
            </div>
          </div>
        </div>
      }
    />
  );
};

export const InvoiceList = WithAuth(InvoiceListBase);

export default InvoiceList;
