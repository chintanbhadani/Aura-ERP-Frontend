import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { fetchBinReport, fetchCompanies, type BinReportItem, type Company } from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';
import { useCurrency } from '../../helper/currency';
import { 
  Boxes, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw,
  Search,
  Filter,
  Layers,
  Building2,
  Package,
  TrendingUp,
  AlertTriangle,
  Coins,
  Scale
} from 'lucide-react';

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'itemCode', placeholder: 'Item Code' },
  { key: 'itemName', placeholder: 'Item Name' },
  { key: 'itemGroup', placeholder: 'Item Group' },
  { key: 'company', placeholder: 'Company' },
  { key: 'warehouse', placeholder: 'Warehouse' },
  { key: 'partOf', placeholder: 'Part Of' }
];

const FILTER_RULE_FIELDS = [
  'Item Code',
  'Item Name',
  'Item Group',
  'Company',
  'Part Of',
  'Sub Part of',
  'Warehouse',
  'UOM'
];

function BinReportListBase() {
  const navigate = useNavigate();
  const { format, symbol } = useCurrency();
  const [items, setItems] = useState<BinReportItem[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Filters State
  const [globalSearch, setGlobalSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [itemGroupFilter, setItemGroupFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'available' | 'zero'>('all');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('Report View');

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({});

  // Filter Rules Modal
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchBinReport({
        search: globalSearch,
        warehouse: warehouseFilter,
        itemGroup: itemGroupFilter,
        companyId: companyFilter || undefined
      });
      setItems(data);
    } catch (err: any) {
      console.error('Failed to load Bin Report:', err);
      errorToast('Failed to load Bin Report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies().then(res => setCompanies(res || [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [globalSearch, warehouseFilter, itemGroupFilter, companyFilter]);

  // Derived Warehouses and Item Groups options for dropdown filter
  const warehouseOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.warehouse) set.add(i.warehouse); });
    return Array.from(set);
  }, [items]);

  const itemGroupOptions = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => { if (i.itemGroup) set.add(i.itemGroup); });
    return Array.from(set);
  }, [items]);

  // Filtered dataset
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Global Search
      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const match = 
          item.itemCode.toLowerCase().includes(q) ||
          item.itemName.toLowerCase().includes(q) ||
          item.itemGroup.toLowerCase().includes(q) ||
          item.partOf.toLowerCase().includes(q) ||
          item.subPartOf.toLowerCase().includes(q) ||
          item.warehouse.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Stock status filter
      if (stockStatusFilter === 'available' && item.actualQuantity <= 0) return false;
      if (stockStatusFilter === 'zero' && item.actualQuantity > 0) return false;

      // Quick Filters
      for (const [key, val] of Object.entries(quickFilters)) {
        if (!val) continue;
        const fieldVal = (item as any)[key];
        if (fieldVal === undefined || fieldVal === null) return false;
        if (!String(fieldVal).toLowerCase().includes(val.toLowerCase())) return false;
      }

      // Sidebar Filters
      if (assignedToFilter && item.assignedTo !== assignedToFilter) return false;
      if (tagFilter && (!item.tags || !item.tags.includes(tagFilter))) return false;

      return true;
    });
  }, [items, globalSearch, stockStatusFilter, quickFilters, assignedToFilter, tagFilter]);

  // Total aggregated Actual Quantity, Cost Valuation, Sales Valuation & Net Invoiced Balance
  const { totalActualQuantity, totalStockValuation, totalSalesValuation, totalNetInvoicedBalance, totalItemsWithStock, totalZeroStock } = useMemo(() => {
    let qty = 0;
    let costVal = 0;
    let salesVal = 0;
    let netInvoiced = 0;
    let inStock = 0;
    let zeroStock = 0;

    for (const item of filteredItems) {
      const q = Number(item.actualQuantity) || 0;
      const cv = Number(item.stockValuation) || 0;
      const sv = Number(item.salesValuation) || 0;
      const nib = Number(item.netInvoicedBalance) || 0;
      qty += q;
      costVal += cv;
      salesVal += sv;
      netInvoiced += nib;
      if (q > 0) inStock++;
      else zeroStock++;
    }

    return {
      totalActualQuantity: qty,
      totalStockValuation: costVal,
      totalSalesValuation: salesVal,
      totalNetInvoicedBalance: netInvoiced,
      totalItemsWithStock: inStock,
      totalZeroStock: zeroStock
    };
  }, [filteredItems]);

  // Table Columns
  const columns: ColumnDef<BinReportItem>[] = useMemo(() => [
    {
      key: 'id',
      title: '#',
      width: '50px',
      render: (_, __, index) => (
        <span className="text-gray-400 font-mono text-xs">
          {index + 1}
        </span>
      )
    },
    {
      key: 'itemCode',
      title: 'Item Code',
      width: '130px',
      sortable: true,
      render: (val, row) => (
        <span className="font-semibold text-primary-700 hover:underline cursor-pointer" onClick={() => navigate('/master/skus')}>
          {val || row.itemCode}
        </span>
      )
    },
    {
      key: 'itemName',
      title: 'Item Name',
      width: '240px',
      sortable: true,
      render: (val, row) => (
        <span className="font-medium text-gray-800 title-truncate max-w-xs block" title={val || row.itemName}>
          {val || row.itemName}
        </span>
      )
    },
    {
      key: 'itemGroup',
      title: 'Item Group',
      width: '120px',
      sortable: true,
      render: (val, row) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
          {val || row.itemGroup}
        </span>
      )
    },
    {
      key: 'partOf',
      title: 'Part Of',
      width: '120px',
      sortable: true,
      render: (val, row) => (
        <span className="text-gray-700 text-xs font-mono uppercase">
          {val || row.partOf}
        </span>
      )
    },
    {
      key: 'subPartOf',
      title: 'Sub Part of',
      width: '130px',
      sortable: true,
      render: (val, row) => (
        <span className="text-gray-600 text-xs">
          {val || row.subPartOf}
        </span>
      )
    },
    {
      key: 'uom',
      title: 'UOM',
      width: '70px',
      sortable: true,
      render: (val, row) => (
        <span className="text-gray-600 text-xs font-semibold">
          {val || row.uom}
        </span>
      )
    },
    {
      key: 'actualQuantity',
      title: 'Actual Quantity',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const qty = Number(val ?? row.actualQuantity) || 0;
        const formatted = qty.toFixed(3);
        return (
          <span className={`font-mono text-xs font-bold text-right block ${qty > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
            {formatted}
          </span>
        );
      }
    },
    {
      key: 'purchaseRate',
      title: 'Purchase Rate',
      width: '110px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const rate = Number(val ?? row.purchaseRate) || 0;
        return (
          <span className={`font-mono text-xs font-semibold text-right block ${rate > 0 ? 'text-gray-800' : 'text-gray-400'}`}>
            {rate > 0 ? format(rate) : '—'}
          </span>
        );
      }
    },
    {
      key: 'stockValuation',
      title: 'Cost Valuation',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const valAmt = Number(val ?? row.stockValuation) || 0;
        return (
          <span className={`font-mono text-xs font-black text-right block ${valAmt > 0 ? 'text-emerald-900 bg-emerald-50/70 px-2 py-0.5 rounded border border-emerald-200/50' : 'text-gray-400'}`}>
            {valAmt > 0 ? format(valAmt) : '0'}
          </span>
        );
      }
    },
    {
      key: 'sellingRate',
      title: 'Selling Rate',
      width: '110px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const rate = Number(val ?? row.sellingRate) || 0;
        return (
          <span className={`font-mono text-xs font-semibold text-right block ${rate > 0 ? 'text-blue-800' : 'text-gray-400'}`}>
            {rate > 0 ? format(rate) : '—'}
          </span>
        );
      }
    },
    {
      key: 'salesValuation',
      title: 'Sales Valuation',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const sv = Number(val ?? row.salesValuation) || 0;
        return (
          <span className={`font-mono text-xs font-bold text-right block ${sv > 0 ? 'text-blue-900 bg-blue-50/70 px-2 py-0.5 rounded border border-blue-200/50' : 'text-gray-400'}`}>
            {sv > 0 ? format(sv) : '0'}
          </span>
        );
      }
    },
    {
      key: 'netInvoicedBalance',
      title: 'Net Invoiced Bal',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const nib = Number(val ?? row.netInvoicedBalance) || 0;
        return (
          <span 
            className={`font-mono text-xs font-bold text-right block px-2 py-0.5 rounded border ${
              nib > 0 
                ? 'text-purple-900 bg-purple-50/70 border-purple-200/50' 
                : nib < 0 
                ? 'text-rose-900 bg-rose-50/70 border-rose-200/50' 
                : 'text-gray-400 border-transparent'
            }`} 
            title={`Purchases: ${format(row.totalPurchasedValue || 0)} | Sales: ${format(row.totalSoldValue || 0)}`}
          >
            {format(nib)}
          </span>
        );
      }
    },
    {
      key: 'warehouse',
      title: 'Warehouse',
      width: '180px',
      sortable: true,
      render: (val, row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-200">
          <Building2 className="w-3 h-3 text-slate-400" />
          {val || row.warehouse}
        </span>
      )
    },
    {
      key: 'company',
      title: 'Company',
      width: '180px',
      sortable: true,
      render: (_, row) => (
        <span 
          onClick={(e) => {
            if (row.companyName) {
              e.stopPropagation();
              setQuickFilters(prev => ({
                ...prev,
                company: prev.company === row.companyName ? '' : row.companyName!
              }));
            }
          }}
          className="inline-flex items-center gap-1.5 text-xs text-emerald-800 font-semibold bg-emerald-50/70 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200 cursor-pointer transition-colors"
          title="Filter by this Company"
        >
          <Building2 className="w-3 h-3 text-emerald-600 shrink-0" />
          <span className="truncate">{row.companyName || 'All Companies'}</span>
        </span>
      )
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '180px',
      render: (_, row) => (
        <span className="text-xs text-gray-600 font-mono font-medium">
          {formatFullDateTime((row as any).updatedAt || (row as any).createdAt)}
        </span>
      )
    }
  ], [navigate]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredItems.length === 0) {
      errorToast('No data to export');
      return;
    }
    const headers = ['#', 'Item Code', 'Item Name', 'Item Group', 'Part Of', 'Sub Part of', 'UOM', 'Actual Quantity', 'Purchase Rate', 'Cost Valuation', 'Selling Rate', 'Sales Valuation', 'Net Invoiced Balance', 'Warehouse', 'Company'];
    const rows = filteredItems.map((item, index) => [
      index + 1,
      `"${item.itemCode}"`,
      `"${item.itemName}"`,
      `"${item.itemGroup}"`,
      `"${item.partOf}"`,
      `"${item.subPartOf}"`,
      `"${item.uom}"`,
      item.actualQuantity.toFixed(3),
      item.purchaseRate || 0,
      item.stockValuation || 0,
      item.sellingRate || 0,
      item.salesValuation || 0,
      item.netInvoicedBalance || 0,
      `"${item.warehouse}"`,
      `"${item.companyName || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Aura_ERP_Bin_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    successToast('Bin Report exported successfully');
  };

  // Print handler
  const handlePrint = () => {
    window.print();
  };

  // Filter rules handlers
  const handleAddFilterRule = () => {
    setFilterRules(prev => [...prev, { id: Date.now().toString(), field: FILTER_RULE_FIELDS[0], operator: 'Equals', value: '' }]);
  };
  const handleRemoveFilterRule = (id: string) => {
    setFilterRules(prev => prev.filter(r => r.id !== id));
  };
  const handleUpdateFilterRule = (id: string, key: keyof FilterRule, val: string) => {
    setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r));
  };

  return (
    <ERPListPageLayout<BinReportItem>
      title="Aura ERP Bin Report"
      viewType={viewType}
      onViewTypeChange={setViewType}
      viewTypeOptions={['Report View', 'List View', 'Summary View']}
      loading={loading}
      onRefresh={loadData}
      onFetchAllRecords={async () => {
        const res = await fetchBinReport();
        return res || [];
      }}
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
      assignedToOptions={['Administrator', 'John Doe', 'System User']}
      tagOptions={['HEME', 'BELT', 'FILTERS', 'HARDWARE', 'TOOLS', 'ELECTRICAL']}
      
      customSidebarItems={
        <div className="space-y-4 pt-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Company</label>
            <select
              value={companyFilter}
              onChange={(e) => setCompanyFilter(e.target.value)}
              className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Companies</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.code ? `(${c.code})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filter by Warehouse</label>
            <select
              value={warehouseFilter}
              onChange={(e) => setWarehouseFilter(e.target.value)}
              className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="">All Warehouses</option>
              {warehouseOptions.map(w => (
                <option key={w} value={w}>{w}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Stock Status</label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full text-xs rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500"
            >
              <option value="all">All Items</option>
              <option value="available">Available (&gt; 0)</option>
              <option value="zero">Zero Stock (0)</option>
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
      onAddFilterRule={handleAddFilterRule}
      onRemoveFilterRule={handleRemoveFilterRule}
      onUpdateFilterRule={handleUpdateFilterRule}
      onClearFilterRules={() => setFilterRules([])}
      onApplyFilterRules={loadData}
      hasActiveFilters={Boolean(globalSearch || warehouseFilter || itemGroupFilter || stockStatusFilter !== 'all')}
      onClearAllFilters={() => {
        setGlobalSearch('');
        setWarehouseFilter('');
        setItemGroupFilter('');
        setStockStatusFilter('all');
        setQuickFilters({});
        setFilterRules([]);
      }}

      // Table & Selection Data
      data={filteredItems}
      columns={columns}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      onRowClick={(row) => navigate(row.id ? `/products/edit?id=${row.id}` : '/master/skus')}
      onToggleFavorite={(id: string) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
      favorites={favorites}

      // Top Content: Summary Cards for Stock Valuation, Sales Valuation & Net Invoiced Balance
      topContent={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-2">
          {/* 1. Total Cost Valuation */}
          <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-50/60 to-white p-4.5 rounded-2xl border border-emerald-200/80 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center font-black text-lg shadow-md shadow-emerald-600/20 shrink-0">
              {symbol || 'USh'}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-900/70">Cost Valuation</p>
              <h3 className="text-xl sm:text-2xl font-black text-emerald-950 mt-0.5 tracking-tight truncate">
                {format(totalStockValuation)}
              </h3>
              <p className="text-[10px] text-emerald-700/80 font-medium">Physical stock × Purchase rate</p>
            </div>
          </div>

          {/* 2. Sales Valuation (Retail) */}
          <div className="bg-gradient-to-br from-blue-500/10 via-blue-50/60 to-white p-4.5 rounded-2xl border border-blue-200/80 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-blue-600/20">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-blue-900/70">Sales Valuation</p>
              <h3 className="text-xl sm:text-2xl font-black text-blue-950 mt-0.5 tracking-tight truncate">
                {format(totalSalesValuation)}
              </h3>
              <p className="text-[10px] text-blue-700/80 font-medium">Physical stock × Selling price</p>
            </div>
          </div>

          {/* 3. Net Invoiced Balance */}
          <div className="bg-gradient-to-br from-purple-500/10 via-purple-50/60 to-white p-4.5 rounded-2xl border border-purple-200/80 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-12 h-12 bg-purple-600 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md shadow-purple-600/20">
              <Scale className="w-6 h-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-purple-900/70">Net Invoiced Balance</p>
              <h3 className="text-xl sm:text-2xl font-black text-purple-950 mt-0.5 tracking-tight truncate">
                {format(totalNetInvoicedBalance)}
              </h3>
              <p className="text-[10px] text-purple-700/80 font-medium">Total Purchases − Total Sales</p>
            </div>
          </div>

          {/* 4. Total Actual Stock Quantity */}
          <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
            <div className="w-12 h-12 bg-slate-100 text-slate-700 border border-slate-200 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
              <Boxes className="w-6 h-6 text-slate-700" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Stock Quantity</p>
              <h3 className="text-xl sm:text-2xl font-black text-gray-900 mt-0.5 tracking-tight truncate">
                {totalActualQuantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
              </h3>
              <p className="text-[10px] text-gray-500 font-medium">{totalItemsWithStock} active in stock · {totalZeroStock} zero</p>
            </div>
          </div>
        </div>
      }
    >
      {/* Bottom Summary Bar */}
      <div className="bg-slate-900 text-white px-6 py-3.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 font-sans text-sm rounded-b-lg shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-xs">Total Records:</span>
            <span className="font-mono font-semibold text-white bg-slate-800 px-2 py-0.5 rounded text-xs">
              {filteredItems.length} items
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="font-bold text-amber-400 uppercase tracking-wider text-xs">Total Actual Quantity:</span>
            <span className="font-mono text-base font-extrabold text-white bg-slate-800 px-3 py-1 rounded border border-slate-700">
              {totalActualQuantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-emerald-400 uppercase tracking-wider text-xs">Cost Valuation:</span>
            <span className="font-mono text-base font-black text-emerald-300 bg-slate-800 px-3 py-1 rounded border border-slate-700">
              {format(totalStockValuation)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-blue-400 uppercase tracking-wider text-xs">Sales Valuation:</span>
            <span className="font-mono text-base font-black text-blue-300 bg-slate-800 px-3 py-1 rounded border border-slate-700">
              {format(totalSalesValuation)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-bold text-purple-400 uppercase tracking-wider text-xs">Net Invoiced:</span>
            <span className="font-mono text-base font-black text-purple-300 bg-slate-800 px-3 py-1 rounded border border-slate-700">
              {format(totalNetInvoicedBalance)}
            </span>
          </div>
        </div>
      </div>
    </ERPListPageLayout>
  );
}

export const BinReportList = WithAuth(BinReportListBase, ModuleName.BIN_REPORT, Permission.LIST);
export default BinReportList;
