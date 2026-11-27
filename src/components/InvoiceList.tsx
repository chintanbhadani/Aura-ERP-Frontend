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
  Trash2,
  Ban
} from 'lucide-react';
import { fetchInvoices, deleteInvoice, cancelInvoice, bulkImportInvoices, bulkSubmitInvoices, bulkCancelInvoices } from '../services/api';
import { successToast, errorToast } from '../helper/toast';
import type { Invoice } from '../types';
import { printInvoice, downloadInvoicePdf } from '../helper/invoicePrinter';
import { useCurrency } from '../helper/currency';
import { ERPListPageLayout, ERPBulkImportModal, type QuickFilterField, type FilterRule } from './ERPList';
import { type ColumnDef } from './CustomTable';
import { StatusBadge } from './StatusBadge';
import WithAuth from './WithAuth';
import { ModuleName, Permission } from '../helper/constants';
import { formatFullDateTime } from '../helper/helper';
import { getInvoiceImportColumns, PURCHASE_INVOICE_IMPORT_SAMPLE_DATA, SALES_INVOICE_IMPORT_SAMPLE_DATA } from '../pages/Sales/invoiceImportConfig';
import { CancelInvoiceConfirmModal } from './CancelInvoiceConfirmModal';
import { SubmitInvoiceConfirmModal } from './SubmitInvoiceConfirmModal';
import Tooltip from '@mui/material/Tooltip';

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
  const [showImportModal, setShowImportModal] = useState(false);
  const [cancelModalInvoices, setCancelModalInvoices] = useState<Invoice[] | null>(null);
  const [submitModalInvoices, setSubmitModalInvoices] = useState<Invoice[] | null>(null);

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

  // KPI Calculations: Only active/submitted invoices count towards turnover, spend, and settlements (Cancelled & Draft are excluded)
  const activeInvoices = useMemo(() => invoices.filter(inv => inv.status !== 'Cancelled' && inv.status !== 'Draft'), [invoices]);
  const grandTotal = useMemo(() => activeInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [activeInvoices]);
  const cashTotal = useMemo(() => activeInvoices.filter(inv => (inv as any).paymentType === 'CASH').reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [activeInvoices]);
  const creditTotal = useMemo(() => activeInvoices.filter(inv => (inv as any).paymentType === 'CREDIT').reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [activeInvoices]);
  const bankTotal = useMemo(() => activeInvoices.filter(inv => (inv as any).paymentType === 'BANK').reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0), [activeInvoices]);

  const pageTitle = fixedType === 'SALES' ? 'Sales Invoices' : fixedType === 'PURCHASE' ? 'Purchase Invoices' : 'Invoices';
  const partyHeader = fixedType === 'SALES' ? 'Customer' : fixedType === 'PURCHASE' ? 'Supplier' : 'Customer / Supplier';
  const addNewLabel = fixedType === 'SALES' ? 'Add Sales Invoice' : fixedType === 'PURCHASE' ? 'Add Purchase Invoice' : 'Add Invoice';
  const addNewPath = fixedType === 'PURCHASE' ? '/invoices/purchase/new' : '/invoices/sales/new';

  const importColumns = useMemo(() => getInvoiceImportColumns(fixedType === 'SALES' ? 'SALES' : 'PURCHASE'), [fixedType]);
  const importSampleData = useMemo(() => fixedType === 'SALES' ? SALES_INVOICE_IMPORT_SAMPLE_DATA : PURCHASE_INVOICE_IMPORT_SAMPLE_DATA, [fixedType]);

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

  const [submittingBulk, setSubmittingBulk] = useState(false);

  const handleBulkSubmit = () => {
    if (selectedIds.length === 0) return;
    const draftSelected = invoices.filter(inv => selectedIds.includes(inv.id) && (!inv.status || inv.status.trim().toLowerCase() === 'draft'));
    if (draftSelected.length === 0) {
      errorToast('None of the selected invoices are in Draft status (only Draft invoices can be submitted).');
      return;
    }
    setSubmitModalInvoices(draftSelected);
  };

  const [cancellingBulk, setCancellingBulk] = useState(false);

  const handleBulkCancel = () => {
    if (selectedIds.length === 0) return;
    const nonCancelled = invoices.filter(inv => selectedIds.includes(inv.id) && inv.status !== 'Cancelled');
    if (nonCancelled.length === 0) {
      errorToast('Selected invoice(s) are already cancelled.');
      return;
    }
    setCancelModalInvoices(nonCancelled);
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

  const handleCancelInvoice = async (row: Invoice) => {
    if (row.status === 'Cancelled') {
      errorToast('Invoice is already cancelled.');
      return;
    }

    const confirmMsg = row.type === 'PURCHASE'
      ? `Are you sure you want to cancel Purchase Invoice "${row.invoiceNumber}"? This will safely revert added stock in inventory.`
      : `Are you sure you want to cancel Sales Invoice "${row.invoiceNumber}"? This will safely return deducted stock to inventory and maintain the stock ledger.`;

    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await cancelInvoice(row.id);
      successToast(res.message || 'Invoice cancelled successfully');
      loadInvoices();
    } catch (err: any) {
      console.error('Failed to cancel invoice:', err);
      errorToast(err.response?.data?.error || 'Failed to cancel invoice');
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
        const fullDisplay = val || row.id;
        return (
          <Tooltip title={fullDisplay} arrow placement="top" enterDelay={200}>
            <div className="flex flex-col py-0.5 truncate max-w-[200px]">
              <span className="font-bold text-gray-900 font-mono text-sm tracking-tight hover:text-emerald-700 transition-colors truncate">
                {fullDisplay}
              </span>
              <span className="text-xs text-gray-500 font-normal truncate">
                {itemSubtitle}
              </span>
            </div>
          </Tooltip>
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
          <Tooltip title={contact ? `${partyName} (${contact})` : partyName} arrow placement="top" enterDelay={200}>
            <div className="flex flex-col truncate max-w-[170px]">
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickFilters(prev => ({ ...prev, party: partyName }));
                }}
                className="font-semibold text-gray-800 text-sm hover:text-emerald-700 hover:underline cursor-pointer truncate"
              >
                {partyName}
              </span>
              {contact && <span className="text-[11px] text-gray-400 truncate">{contact}</span>}
            </div>
          </Tooltip>
        );
      }
    },
    {
      key: 'date',
      title: 'DATE',
      width: '120px',
      sortable: true,
      render: (val, row) => (
        <div className="flex flex-col">
          <span className="text-xs font-medium text-gray-700">
            {new Date(val).toLocaleDateString()}
          </span>
          {row.dueDate && (
            <span className="text-[10px] text-gray-400">
              Due: {new Date(row.dueDate).toLocaleDateString()}
            </span>
          )}
        </div>
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

        const tooltipNode = (
          <div className="p-1.5 space-y-2 max-w-sm text-xs">
            <div className="flex items-center justify-between gap-3 pb-1.5 border-b border-gray-600/70">
              <span className="font-bold text-emerald-400 text-xs">
                Invoice Items ({items.length})
              </span>
              <span className="text-[10px] text-gray-300 font-mono">
                {row.invoiceNumber}
              </span>
            </div>
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {items.map((it: any, idx: number) => {
                const itName = it.product?.name || it.product?.sku || it.name || `Item ${idx + 1}`;
                const itQty = it.quantity || 0;
                const itUom = it.product?.unit?.name || it.uom || '';
                return (
                  <div key={idx} className="flex items-start justify-between gap-2.5 text-[11px] leading-tight">
                    <span className="text-gray-100 font-medium">
                      {idx + 1}. {itName}
                    </span>
                    <span className="font-mono font-bold text-emerald-300 shrink-0 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-700/50">
                      × {itQty} {itUom}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );

        return (
          <Tooltip title={tooltipNode} arrow placement="top" enterDelay={150}>
            <div className="text-xs text-gray-700 truncate max-w-[180px] cursor-pointer hover:text-emerald-700">
              <span className="font-semibold">{firstName}</span>{' '}
              <span className="font-mono text-emerald-800 bg-emerald-50 px-1 py-0.2 rounded text-[11px]">× {first?.quantity}</span>
              {moreCount > 0 && <span className="text-gray-400 text-[11px] ml-1 font-medium">+{moreCount} more</span>}
            </div>
          </Tooltip>
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
        else if (val === 'MOBILE_MONEY' || val === 'AIRTEL') badgeStyle = 'bg-rose-50 text-rose-700 border-rose-300';
        else if (val === 'PARTIAL') badgeStyle = 'bg-purple-50 text-purple-700 border-purple-300';

        const displayLabel = val === 'MOBILE_MONEY' ? 'AIRTEL' : val;

        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, paymentType: val }));
            }}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-2xs cursor-pointer ${badgeStyle}`}
          >
            {displayLabel}
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
      width: '180px',
      sortable: true,
      render: (_, row) => (
        <span className="text-xs text-gray-600 font-mono font-medium">
          {formatFullDateTime((row as any).updatedAt || row.date)}
        </span>
      )
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      width: '105px',
      render: (_, row) => {
        const isCancelled = row.status === 'Cancelled';
        const isPurchase = row.type === 'PURCHASE';
        const canCancel = !isCancelled;

        return (
          <div className="flex items-center justify-end gap-1.5 text-gray-500 text-xs select-none">
            {canCancel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setCancelModalInvoices([row]);
                }}
                className="p-1 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                title={isPurchase ? "Cancel Purchase Invoice" : "Cancel Sales Invoice"}
              >
                <Ban className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />
              </button>
            )}
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
          </div>
        );
      }
    }
  ];

  return (
    <>
      <ERPListPageLayout<Invoice>
      title={pageTitle}
      viewType={viewType}
      onViewTypeChange={setViewType}
      loading={loading}
      onRefresh={() => { loadInvoices(); successToast('Invoice records refreshed'); }}
      onFetchAllRecords={async () => {
        const res = await fetchInvoices(fixedType);
        return res || [];
      }}
      onPrint={() => window.print()}
      onAddNew={() => navigate(addNewPath)}
      addNewLabel={addNewLabel}
      onImport={() => setShowImportModal(true)}
      importLabel="Add Bulk"

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
      selectable={true}
      selectedIds={selectedIds}
      onSelectionChange={(ids) => setSelectedIds(ids)}
      onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
      onSelectAll={() => setSelectedIds(selectedIds.length === filteredInvoices.length ? [] : filteredInvoices.map(inv => inv.id))}
      onRowClick={(row) => navigate(row.type === 'PURCHASE' ? `/invoices/purchase/new?id=${row.id}` : `/invoices/sales/new?id=${row.id}`)}
      emptyMessage="No invoices found"

      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}

      onBulkSubmit={handleBulkSubmit}
      onBulkCancel={handleBulkCancel}
      onBulkDelete={handleBulkDelete}
      onBulkExport={handleBulkExport}
      onBulkPrint={() => window.print()}
      submittingBulk={submittingBulk}
      cancellingBulk={cancellingBulk}

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
              <p className="text-[11px] text-gray-400 mt-0.5">{activeInvoices.length} {activeInvoices.length === 1 ? 'Invoice' : 'Invoices'}</p>
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

    {/* BULK IMPORT EXCEL MODAL */}
    <ERPBulkImportModal
      isOpen={showImportModal}
      onClose={() => setShowImportModal(false)}
      title={fixedType === 'PURCHASE' ? 'Bulk Import Purchase Invoices' : 'Bulk Import Sales Invoices'}
      entityName={fixedType === 'PURCHASE' ? 'Purchase Invoice' : 'Sales Invoice'}
      columns={importColumns}
      sampleData={importSampleData}
      templateFileName={fixedType === 'PURCHASE' ? 'aura_erp_purchase_invoices_template.xlsx' : 'aura_erp_sales_invoices_template.xlsx'}
      instructions={[
        'Upload Excel (.xlsx, .xls) or CSV files with invoice line items.',
        'Items sharing the same Invoice Number will automatically be grouped into a single multi-item invoice.',
        'Stock quantities for item SKUs will automatically be updated and tracked in the Stock Ledger.',
        'Cash and Bank amounts will automatically update the Cashflow Ledger and Cash Book & Balance Sheet.'
      ]}
      onImport={async (rows) => {
        const res = await bulkImportInvoices(rows, fixedType === 'SALES' ? 'SALES' : 'PURCHASE');
        return res;
      }}
      onSuccess={() => {
        loadInvoices();
        successToast('Invoices imported successfully!');
      }}
    />

    {/* SUBMIT INVOICE CONFIRMATION MODAL */}
    <SubmitInvoiceConfirmModal
      isOpen={Boolean(submitModalInvoices && submitModalInvoices.length > 0)}
      invoices={submitModalInvoices || []}
      onClose={() => setSubmitModalInvoices(null)}
      onSuccess={() => {
        setSelectedIds([]);
        loadInvoices();
      }}
    />

    {/* CANCEL INVOICE CONFIRMATION MODAL */}
    <CancelInvoiceConfirmModal
      isOpen={Boolean(cancelModalInvoices && cancelModalInvoices.length > 0)}
      invoices={cancelModalInvoices || []}
      onClose={() => setCancelModalInvoices(null)}
      onSuccess={() => {
        setSelectedIds([]);
        loadInvoices();
      }}
    />
  </>
  );
};

export const InvoiceList = WithAuth(InvoiceListBase);

export default InvoiceList;
