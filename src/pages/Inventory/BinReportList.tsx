import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { fetchBinReport, type BinReportItem } from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';
import { 
  Boxes, 
  FileSpreadsheet, 
  Printer, 
  RefreshCw,
  Search,
  Filter,
  Layers,
  Building2,
  Package
} from 'lucide-react';

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'itemCode', placeholder: 'Item Code' },
  { key: 'itemName', placeholder: 'Item Name' },
  { key: 'itemGroup', placeholder: 'Item Group' },
  { key: 'warehouse', placeholder: 'Warehouse' },
  { key: 'partOf', placeholder: 'Part Of' }
];

const FILTER_RULE_FIELDS = [
  'Item Code',
  'Item Name',
  'Item Group',
  'Part Of',
  'Sub Part of',
  'Warehouse',
  'UOM'
];

function BinReportListBase() {
  const navigate = useNavigate();
  const [items, setItems] = useState<BinReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Filters State
  const [globalSearch, setGlobalSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [itemGroupFilter, setItemGroupFilter] = useState('');
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
        itemGroup: itemGroupFilter
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
    loadData();
  }, [globalSearch, warehouseFilter, itemGroupFilter]);

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

  // Total aggregated Actual Quantity
  const totalActualQuantity = useMemo(() => {
    return filteredItems.reduce((sum, item) => sum + (Number(item.actualQuantity) || 0), 0);
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
      width: '260px',
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
      width: '130px',
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
      width: '140px',
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
      width: '160px',
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
      width: '80px',
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
      width: '140px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        const qty = Number(val ?? row.actualQuantity) || 0;
        const formatted = qty.toFixed(3);
        return (
          <span className={`font-mono text-sm font-semibold text-right block ${qty > 0 ? 'text-emerald-700' : 'text-gray-400'}`}>
            {formatted}
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
    const headers = ['#', 'Item Code', 'Item Name', 'Item Group', 'Part Of', 'Sub Part of', 'UOM', 'Actual Quantity', 'Warehouse'];
    const rows = filteredItems.map((item, index) => [
      index + 1,
      `"${item.itemCode}"`,
      `"${item.itemName}"`,
      `"${item.itemGroup}"`,
      `"${item.partOf}"`,
      `"${item.subPartOf}"`,
      `"${item.uom}"`,
      item.actualQuantity.toFixed(3),
      `"${item.warehouse}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Neelkanth_Bin_Report_${new Date().toISOString().split('T')[0]}.csv`);
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
      assignedToOptions={['Administrator', 'John Doe', 'System User']}
      tagOptions={['HEME', 'BELT', 'FILTERS', 'HARDWARE', 'TOOLS', 'ELECTRICAL']}
      
      customSidebarItems={
        <div className="space-y-4 pt-3">
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
      onToggleFavorite={(id: string) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
      favorites={favorites}
    >
      {/* Bottom Summary Bar matching screenshot */}
      <div className="bg-slate-900 text-white px-6 py-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 font-sans text-sm rounded-b-lg shadow-inner">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-slate-300 uppercase tracking-wider text-xs">Total Records:</span>
            <span className="font-mono font-semibold text-white bg-slate-800 px-2 py-0.5 rounded text-xs">
              {filteredItems.length} items
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-400 uppercase tracking-wider text-xs">Total Actual Quantity:</span>
          <span className="font-mono text-lg font-extrabold text-emerald-400 bg-slate-800 px-3 py-1 rounded border border-slate-700">
            {totalActualQuantity.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}
          </span>
        </div>
      </div>
    </ERPListPageLayout>
  );
}

export const BinReportList = WithAuth(BinReportListBase, ModuleName.BIN_REPORT, Permission.LIST);
export default BinReportList;
