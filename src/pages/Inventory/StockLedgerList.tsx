import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { fetchStockEntries } from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { 
  History, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  FileSpreadsheet, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Boxes,
  PlusCircle,
  MinusCircle
} from 'lucide-react';

export interface StockLedgerItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    location?: string;
    category?: { name: string };
    unit?: { name: string };
  };
  date: string;
  type: string;
  quantityChange: number;
  runningBalance: number;
  grnId?: string | null;
  grn?: {
    id: string;
    grnNumber: string;
    status: string;
    supplier?: { name: string };
  } | null;
  invoiceId?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    type: 'PURCHASE' | 'SALES';
    date: string;
    client?: { companyName: string };
    supplier?: { name: string };
  } | null;
  createdAt: string;
}

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'itemCode', placeholder: 'Item SKU / Code' },
  { key: 'itemName', placeholder: 'Item Name' },
  { key: 'reference', placeholder: 'Invoice / GRN #' },
  { key: 'type', placeholder: 'Transaction Type' },
  { key: 'action', placeholder: 'Action (Credited/Debited)' }
];

const FILTER_RULE_FIELDS = [
  'Item Code',
  'Item Name',
  'Transaction Type',
  'Action (Credited/Debited)',
  'Reference',
  'Date'
];

function StockLedgerListBase() {
  const navigate = useNavigate();
  const [ledgers, setLedgers] = useState<StockLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Layout & Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [viewType, setViewType] = useState('Ledger View');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [sortField, setSortField] = useState('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Custom Sidebar Filters
  const [actionFilter, setActionFilter] = useState<'ALL' | 'CREDITED' | 'DEBITED'>('ALL');
  const [typeFilter, setTypeFilter] = useState('ALL');

  // Quick Filters & Filter Rules
  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({});
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchStockEntries();
      setLedgers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load stock ledger:', err);
      errorToast('Failed to load stock ledger');
      setLedgers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateVoucher = (row: StockLedgerItem) => {
    // 1. Direct GRN resolution (grn.grnNumber, grnId, or grn.id)
    const grnRef = row.grn?.grnNumber || row.grnId || row.grn?.id;
    if (grnRef) {
      navigate(`/grn/${grnRef}`);
      return;
    }

    // 2. Reference starting with PS-GR-
    const refNo = row.grn?.grnNumber || row.invoice?.invoiceNumber || '';
    if (refNo.startsWith('PS-GR-')) {
      navigate(`/grn/${refNo}`);
      return;
    }

    // 3. Invoice resolution
    if (row.invoice?.id) {
      navigate(`/invoices/${row.invoice.id}`);
      return;
    }

    // 4. Default for GRN receipt
    if (row.type === 'GRN_RECEIPT') {
      navigate('/grn');
      return;
    }
  };

  const handleExportCSV = () => {
    if (filteredLedgers.length === 0) {
      errorToast('No data to export');
      return;
    }
    const headers = ['Date', 'Reference', 'SKU', 'Item Name', 'Voucher Type', 'Action Type', 'Qty Change', 'Running Stock'];
    const rows = filteredLedgers.map(l => [
      new Date(l.date).toLocaleDateString(),
      l.grn?.grnNumber || l.invoice?.invoiceNumber || `SE-${l.id.slice(0, 8).toUpperCase()}`,
      l.product?.sku || '',
      l.product?.name || '',
      l.type,
      l.quantityChange >= 0 ? 'Credited (Add)' : 'Debited (Subtract)',
      l.quantityChange >= 0 ? `+${l.quantityChange}` : l.quantityChange,
      l.runningBalance
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Stock_Ledger_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    successToast('Stock Ledger exported to CSV');
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered dataset
  const filteredLedgers = useMemo(() => {
    return ledgers.filter(item => {
      const isCredited = item.quantityChange >= 0;
      
      // Action Filter (Credited / Debited)
      if (actionFilter === 'CREDITED' && !isCredited) return false;
      if (actionFilter === 'DEBITED' && isCredited) return false;

      // Type Filter
      if (typeFilter !== 'ALL' && item.type !== typeFilter) return false;

      // Quick Filters
      if (quickFilters.itemCode && !(item.product?.sku || '').toLowerCase().includes(quickFilters.itemCode.toLowerCase())) return false;
      if (quickFilters.itemName && !(item.product?.name || '').toLowerCase().includes(quickFilters.itemName.toLowerCase())) return false;
      if (quickFilters.type && !item.type.toLowerCase().includes(quickFilters.type.toLowerCase())) return false;
      if (quickFilters.reference) {
        const ref = item.grn?.grnNumber || item.invoice?.invoiceNumber || `SE-${item.id.slice(0, 8)}`;
        if (!ref.toLowerCase().includes(quickFilters.reference.toLowerCase())) return false;
      }
      if (quickFilters.action) {
        const actLabel = isCredited ? 'credited add' : 'debited subtract';
        if (!actLabel.includes(quickFilters.action.toLowerCase())) return false;
      }

      // Global Search
      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const ref = item.grn?.grnNumber || item.invoice?.invoiceNumber || `SE-${item.id.slice(0, 8)}`;
        const match = 
          (item.product?.name || '').toLowerCase().includes(q) ||
          (item.product?.sku || '').toLowerCase().includes(q) ||
          item.type.toLowerCase().includes(q) ||
          ref.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    });
  }, [ledgers, globalSearch, actionFilter, typeFilter, quickFilters]);

  // Summaries
  const totalCreditedQty = useMemo(() => {
    return filteredLedgers
      .filter(l => l.quantityChange > 0)
      .reduce((sum, l) => sum + l.quantityChange, 0);
  }, [filteredLedgers]);

  const totalDebitedQty = useMemo(() => {
    return filteredLedgers
      .filter(l => l.quantityChange < 0)
      .reduce((sum, l) => sum + Math.abs(l.quantityChange), 0);
  }, [filteredLedgers]);

  const columns: ColumnDef<StockLedgerItem>[] = [
    {
      key: 'date',
      title: 'Date',
      width: '130px',
      sortable: true,
      render: (_, row) => (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            handleNavigateVoucher(row);
          }}
          className="cursor-pointer group"
          title="Click to open linked record"
        >
          <span className="font-semibold text-gray-900 group-hover:text-emerald-700 block text-xs transition-colors">
            {new Date(row.date).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-gray-400 group-hover:text-emerald-600 font-mono transition-colors">
            {new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )
    },
    {
      key: 'reference',
      title: 'Reference / Voucher #',
      width: '180px',
      render: (_, row) => {
        const refNo = row.grn?.grnNumber || row.invoice?.invoiceNumber || `SE-${row.id.slice(0, 8).toUpperCase()}`;
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateVoucher(row);
            }}
            className="font-bold text-emerald-700 hover:text-emerald-900 font-mono text-xs hover:underline cursor-pointer transition-colors"
            title="Click to open linked record"
          >
            {refNo}
          </span>
        );
      }
    },
    {
      key: 'product',
      title: 'Item Code & Name',
      width: '240px',
      render: (_, row) => (
        <div 
          onClick={(e) => {
            e.stopPropagation();
            handleNavigateVoucher(row);
          }}
          className="cursor-pointer group py-0.5"
          title="Click to view linked GRN detail"
        >
          <span className="font-bold text-gray-900 group-hover:text-emerald-700 block text-xs transition-colors group-hover:underline">
            {row.product?.name || 'Item'}
          </span>
          <span className="text-[11px] text-gray-500 group-hover:text-emerald-600 font-mono transition-colors">
            SKU: {row.product?.sku || '-'}
          </span>
        </div>
      )
    },
    {
      key: 'type',
      title: 'Voucher Type',
      width: '150px',
      render: (val, row) => {
        let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
        if (val === 'GRN_RECEIPT' || val === 'STOCK_RECEIPT' || val === 'PURCHASE') {
          badgeStyle = 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';
        } else if (val === 'MATERIAL_ISSUE' || val === 'SALES') {
          badgeStyle = 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100';
        } else if (val === 'ADJUSTMENT') {
          badgeStyle = 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100';
        }

        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateVoucher(row);
            }}
            className={`px-2 py-0.5 rounded text-[11px] font-semibold border inline-block cursor-pointer transition-all hover:scale-105 shadow-2xs ${badgeStyle}`}
            title={`Click to view ${val === 'GRN_RECEIPT' ? 'linked GRN' : 'linked document'}`}
          >
            {val}
          </span>
        );
      }
    },
    {
      key: 'actionType',
      title: 'Action Type (Credited/Debited)',
      width: '180px',
      render: (_, row) => {
        const isPositive = row.quantityChange >= 0;
        return (
          <div 
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateVoucher(row);
            }}
            className="flex items-center gap-1.5 cursor-pointer"
            title="Click to open linked record"
          >
            {isPositive ? (
              <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs hover:bg-emerald-200 transition-colors">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                Credited (Add)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2.5 py-0.5 rounded-full text-xs font-bold shadow-xs hover:bg-rose-200 transition-colors">
                <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                Debited (Subtract)
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'quantityChange',
      title: 'Quantity Change',
      width: '130px',
      align: 'right',
      render: (val, row) => {
        const isPositive = Number(val) >= 0;
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateVoucher(row);
            }}
            className={`font-mono text-sm font-extrabold cursor-pointer hover:underline ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}
            title="Click to open linked record"
          >
            {isPositive ? `+${val}` : val}
          </span>
        );
      }
    },
    {
      key: 'runningBalance',
      title: 'Running Balance',
      width: '140px',
      align: 'right',
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            handleNavigateVoucher(row);
          }}
          className="font-mono text-xs font-bold text-gray-800 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border border-gray-200 cursor-pointer transition-colors"
          title="Click to open linked record"
        >
          {val} {row.product?.unit?.name || 'units'}
        </span>
      )
    },
    {
      key: 'party',
      title: 'Party / Department',
      width: '170px',
      render: (_, row) => {
        const partyName = row.invoice?.type === 'SALES' 
          ? row.invoice.client?.companyName 
          : row.invoice?.supplier?.name;
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              handleNavigateVoucher(row);
            }}
            className="text-xs text-gray-600 font-medium cursor-pointer hover:text-emerald-700 hover:underline transition-colors"
            title="Click to open linked record"
          >
            {partyName || '-'}
          </span>
        );
      }
    }
  ];

  return (
    <ERPListPageLayout<StockLedgerItem>
      title="Stock Ledger"
      viewType={viewType}
      onViewTypeChange={setViewType}
      viewTypeOptions={['Ledger View', 'Summary View']}
      loading={loading}
      onRefresh={loadData}
      onExportAll={handleExportCSV}
      onPrint={handlePrint}
      
      // Sidebar Filters
      assignedToFilter={assignedToFilter}
      onAssignedToChange={setAssignedToFilter}
      createdByFilter={createdByFilter}
      onCreatedByChange={setCreatedByFilter}
      tagFilter={tagFilter}
      onTagChange={setTagFilter}
      showTags={showTags}
      onShowTagsChange={setShowTags}
      assignedToOptions={['Administrator', 'System User']}
      tagOptions={['TOOLS', 'WORKSHOP', 'RAW MATERIAL', 'HARDWARE']}
      
      customSidebarItems={
        <div className="space-y-4 pt-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value as any)}
              className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="ALL">All Actions (Add & Subtract)</option>
              <option value="CREDITED">🟢 Credited Only (Add +)</option>
              <option value="DEBITED">🔴 Debited Only (Subtract -)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Voucher Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="ALL">All Types</option>
              <option value="GRN_RECEIPT">GRN Receipt (+Stock)</option>
              <option value="PURCHASE">Purchase Invoice (+Stock)</option>
              <option value="SALES">Sales Invoice (-Stock)</option>
              <option value="STOCK_RECEIPT">Stock Receipt (+Stock)</option>
              <option value="MATERIAL_ISSUE">Material Issue (-Stock)</option>
              <option value="ADJUSTMENT">Adjustment</option>
            </select>
          </div>
        </div>
      }

      // Quick Toolbar
      quickFilters={quickFilters}
      onQuickFilterChange={(key, val) => setQuickFilters(prev => ({ ...prev, [key]: val }))}
      quickFilterFields={QUICK_FILTER_FIELDS}
      filterRules={filterRules}
      filterRuleFields={FILTER_RULE_FIELDS}
      onAddFilterRule={() => setFilterRules(prev => [...prev, { id: Date.now().toString(), field: FILTER_RULE_FIELDS[0], operator: 'Equals', value: '' }])}
      onRemoveFilterRule={(id) => setFilterRules(prev => prev.filter(r => r.id !== id))}
      onUpdateFilterRule={(id, key, val) => setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))}
      onClearFilterRules={() => setFilterRules([])}
      onApplyFilterRules={loadData}
      hasActiveFilters={Boolean(globalSearch || actionFilter !== 'ALL' || typeFilter !== 'ALL' || Object.keys(quickFilters).length > 0)}
      onClearAllFilters={() => {
        setGlobalSearch('');
        setActionFilter('ALL');
        setTypeFilter('ALL');
        setQuickFilters({});
        setFilterRules([]);
      }}

      // Table & Selection Data
      data={filteredLedgers}
      columns={columns}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      onRowClick={handleNavigateVoucher}
      onToggleFavorite={(id: string) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
      favorites={favorites}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
    >
      {/* Bottom Summary Bar */}
      <div className="bg-slate-900 text-white px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 font-sans text-sm rounded-b-lg shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-xs">Total Ledger Records:</span>
            <span className="font-mono font-semibold text-white bg-slate-800 px-2 py-0.5 rounded text-xs">
              {filteredLedgers.length} entries
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-xs">Total Credited (+):</span>
            <span className="font-mono font-bold text-emerald-400 bg-slate-800 px-2.5 py-0.5 rounded text-xs border border-emerald-900/50">
              +{totalCreditedQty} units
            </span>
          </div>

          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-xs">Total Debited (-):</span>
            <span className="font-mono font-bold text-rose-400 bg-slate-800 px-2.5 py-0.5 rounded text-xs border border-rose-900/50">
              -{totalDebitedQty} units
            </span>
          </div>
        </div>
      </div>
    </ERPListPageLayout>
  );
}

export const StockLedgerList = WithAuth(StockLedgerListBase, ModuleName.STOCK_LEDGER, Permission.LIST);
export default StockLedgerList;
