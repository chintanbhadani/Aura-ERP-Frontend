import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import WithAuth from '../../components/WithAuth';
import { ERPListPageLayout, ERPBulkImportModal, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  fetchInventory,
  updateProduct,
  bulkImportProducts,
  type Product 
} from '../../services/api';
import { ITEM_IMPORT_COLUMNS, ITEM_IMPORT_SAMPLE_DATA } from './itemImportConfig';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Heart, 
  MessageSquare, 
  ChevronDown, 
  FileSpreadsheet, 
  Printer, 
  Trash2, 
  UserPlus, 
  UserX, 
  Edit3, 
  X 
} from 'lucide-react';

interface BulkEditFieldConfig {
  label: string;
  key: string;
  type: 'text' | 'number' | 'boolean' | 'select' | 'category' | 'unit';
  options?: string[];
}

const BULK_EDIT_FIELDS: BulkEditFieldConfig[] = [
  { label: 'Activity Type', key: 'activityType', type: 'text' },
  { label: 'Allow Alternative Item', key: 'allowAlternativeItem', type: 'boolean' },
  { label: 'Allow Negative Stock', key: 'allowNegativeStock', type: 'boolean' },
  { label: 'Allow Purchase', key: 'allowPurchase', type: 'boolean' },
  { label: 'Allow Sales', key: 'allowSales', type: 'boolean' },
  { label: 'Assigned To', key: 'assignedTo', type: 'select', options: ['Administrator', 'John Doe', 'System User', 'Julius Daffa'] },
  { label: 'Bin Location', key: 'location', type: 'text' },
  { label: 'Brand', key: 'brand', type: 'text' },
  { label: 'Company', key: 'company', type: 'select', options: ['PATEL STRAP INDUSTRIES LTD', 'TANSA', 'NEELKANTH'] },
  { label: 'Country of Origin', key: 'countryOfOrigin', type: 'text' },
  { label: 'Default Unit of Measure', key: 'unitId', type: 'unit' },
  { label: 'Description', key: 'description', type: 'text' },
  { label: 'Disabled', key: 'disabled', type: 'boolean' },
  { label: 'Excisable Item', key: 'excisableItem', type: 'boolean' },
  { label: 'Expense Account', key: 'expenseAccount', type: 'text' },
  { label: 'Has Variants', key: 'hasVariants', type: 'boolean' },
  { label: 'HSN Code', key: 'hsnCode', type: 'text' },
  { label: 'Income Account', key: 'incomeAccount', type: 'text' },
  { label: 'Include Item In Manufacturing', key: 'includeInManufacturing', type: 'boolean' },
  { label: 'Is Fixed Asset', key: 'isFixedAsset', type: 'boolean' },
  { label: 'Item Group', key: 'categoryId', type: 'category' },
  { label: 'Maintain Stock', key: 'maintainStock', type: 'boolean' },
  { label: 'Min Stock', key: 'min_stock', type: 'number' },
  { label: 'Standard Cost Price (₹)', key: 'cost_price', type: 'number' },
  { label: 'Standard Selling Rate (₹)', key: 'selling_price', type: 'number' },
  { label: 'Status', key: 'status', type: 'select', options: ['Active', 'Inactive'] },
  { label: 'Tags', key: 'tags', type: 'text' }
];

const formatRelativeTime = (dateInput?: string | Date): string => {
  if (!dateInput) return '1 d';
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return '1 d';

  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - d.getTime());
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffSec < 60) return `${Math.max(1, diffSec)} s`;
  if (diffMin < 60) return `${diffMin} m`;
  if (diffHour < 24) return `${diffHour} h`;
  if (diffDay < 30) return `${diffDay} d`;
  if (diffMonth < 12) return `${diffMonth} M`;
  return `${diffYear} y`;
};

const INITIAL_ERP_NEXT_ITEMS: Partial<Product>[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'name', placeholder: 'Item Name', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'group', placeholder: 'Item Group', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'partOf', placeholder: 'Part Of', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'company', placeholder: 'Company', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['ID', 'Item Name', 'Item Group', 'Status', 'Part Of', 'Bin Location', 'Company'];

const ProductMasterListBase: React.FC = () => {
  const navigate = useNavigate();
  const reduxToken = useSelector((state: any) => state.auth?.token);
  const token = reduxToken || localStorage.getItem('token') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const categoriesList = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.category?.id && p.category?.name) {
        map.set(p.category.id, p.category.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  const unitsList = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(p => {
      if (p.unit?.id && p.unit?.name) {
        map.set(String(p.unit.id), p.unit.name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [products]);

  // Global & Toolbar Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Last Updated On');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Bulk Edit Modal States
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [selectedBulkField, setSelectedBulkField] = useState('');
  const [bulkEditValue, setBulkEditValue] = useState('');
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Disable / Enable Toggle Dialog State
  const [toggleProductTarget, setToggleProductTarget] = useState<any | null>(null);
  const [isToggleLoading, setIsToggleLoading] = useState(false);

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    id: '',
    name: '',
    group: '',
    partOf: '',
    company: ''
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const invData = await fetchInventory().catch(() => []);
      setProducts(invData || []);
    } catch (err) {
      console.error('Failed to fetch items:', err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} item(s)?`)) {
      setProducts(prev => prev.filter(p => !selectedIds.includes(p.id!)));
      setSelectedIds([]);
      successToast('Deleted selected item(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one item to export');
      return;
    }
    const exportData = products.filter(p => selectedIds.includes(p.id!));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `item_master_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} item(s)`);
  };

  const handleConfirmToggleStatus = async () => {
    if (!toggleProductTarget || !toggleProductTarget.id) return;
    setIsToggleLoading(true);
    const nextDisabled = !toggleProductTarget.disabled;
    try {
      await updateProduct(toggleProductTarget.id, { disabled: nextDisabled });
      setProducts(prev => prev.map(p => String(p.id) === String(toggleProductTarget.id) ? { ...p, disabled: nextDisabled, updatedAt: new Date().toISOString() } : p));
      successToast(nextDisabled ? `Disabled "${toggleProductTarget.name}"` : `Enabled "${toggleProductTarget.name}"`);
      setToggleProductTarget(null);
    } catch (err: any) {
      errorToast(err.message || 'Failed to update item status');
    } finally {
      setIsToggleLoading(false);
    }
  };

  const handleApplyBulkEdit = async () => {
    if (!selectedBulkField || selectedIds.length === 0) return;
    setIsBulkUpdating(true);

    try {
      const fieldConfig = BULK_EDIT_FIELDS.find(f => f.key === selectedBulkField);
      let parsedValue: any = bulkEditValue;

      if (fieldConfig?.type === 'boolean') {
        parsedValue = bulkEditValue === 'true';
      } else if (fieldConfig?.type === 'number') {
        parsedValue = bulkEditValue === '' ? null : Number(bulkEditValue);
      }

      setProducts(prev => prev.map(p => {
        if (selectedIds.includes(p.id!)) {
          const updated = { ...p, [selectedBulkField]: parsedValue, updatedAt: new Date().toISOString() };
          if (selectedBulkField === 'categoryId') {
            const matchedCat = categoriesList.find(c => c.id === parsedValue);
            if (matchedCat) updated.category = matchedCat;
          }
          if (selectedBulkField === 'unitId') {
            const matchedUnit = unitsList.find(u => u.id === parsedValue);
            if (matchedUnit) updated.unit = matchedUnit;
          }
          return updated;
        }
        return p;
      }));

      successToast(`Updated ${selectedIds.length} item(s)`);
      setShowBulkEditModal(false);
      setSelectedBulkField('');
      setBulkEditValue('');
    } catch (err: any) {
      errorToast(err.message || 'Failed to apply bulk edit');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  // Filtered & Sorted Products
  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        (p.sku && p.sku.toLowerCase().includes(query)) ||
        (p.category?.name && p.category.name.toLowerCase().includes(query)) ||
        (p.partOf && p.partOf.toLowerCase().includes(query)) ||
        (p.company && p.company.toLowerCase().includes(query))
      );
    }

    if (quickFilters.id) {
      result = result.filter(p => (p.sku || p.id || '').toLowerCase().includes(quickFilters.id.toLowerCase()));
    }
    if (quickFilters.name) {
      result = result.filter(p => p.name.toLowerCase().includes(quickFilters.name.toLowerCase()));
    }
    if (quickFilters.group) {
      result = result.filter(p => p.category?.name && p.category.name.toLowerCase().includes(quickFilters.group.toLowerCase()));
    }
    if (quickFilters.partOf) {
      result = result.filter(p => p.partOf && p.partOf.toLowerCase().includes(quickFilters.partOf.toLowerCase()));
    }
    if (quickFilters.company) {
      result = result.filter(p => p.company && p.company.toLowerCase().includes(quickFilters.company.toLowerCase()));
    }

    if (assignedToFilter) {
      result = result.filter(p => p.assignedTo === assignedToFilter);
    }
    if (createdByFilter) {
      result = result.filter(p => (p as any).createdBy === createdByFilter);
    }
    if (tagFilter) {
      result = result.filter(p => p.tags && p.tags.includes(tagFilter));
    }

    if (headerFavorite) {
      result = result.filter(p => favorites[p.id!]);
    }

    filterRules.forEach(rule => {
      if (!rule.value.trim()) return;
      const val = rule.value.toLowerCase();
      result = result.filter(p => {
        let fieldVal = '';
        if (rule.field === 'ID') fieldVal = p.sku || p.id || '';
        else if (rule.field === 'Item Name') fieldVal = p.name || '';
        else if (rule.field === 'Item Group') fieldVal = p.category?.name || '';
        else if (rule.field === 'Status') fieldVal = p.status || (p.disabled ? 'Disabled' : 'Active');
        else if (rule.field === 'Part Of') fieldVal = p.partOf || '';
        else if (rule.field === 'Bin Location') fieldVal = p.location || '';
        else if (rule.field === 'Company') fieldVal = p.company || '';

        fieldVal = fieldVal.toLowerCase();
        if (rule.operator === 'Equals') return fieldVal === val;
        if (rule.operator === 'Not Equals') return fieldVal !== val;
        if (rule.operator === 'Like') return fieldVal.includes(val);
        return true;
      });
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Item Name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'ID') {
        comparison = (a.sku || a.id || '').localeCompare(b.sku || b.id || '');
      } else if (sortField === 'Item Group') {
        comparison = (a.category?.name || '').localeCompare(b.category?.name || '');
      } else if (sortField === 'Part Of') {
        comparison = (a.partOf || '').localeCompare(b.partOf || '');
      } else {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [products, globalSearch, quickFilters, assignedToFilter, createdByFilter, tagFilter, headerFavorite, filterRules, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.id ||
    quickFilters.name ||
    quickFilters.group ||
    quickFilters.partOf ||
    quickFilters.company ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter ||
    headerFavorite ||
    filterRules.length > 0
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ id: '', name: '', group: '', partOf: '', company: '' });
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<Product>[] = [
    {
      key: 'name',
      title: 'Item',
      width: '280px',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col py-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
              {row.name}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            {row.category?.name || 'TOOLS'} • {row.unit?.name || 'Pcs'}
          </span>
          {showTags && row.tags && (
            <div className="flex flex-wrap gap-1 mt-1">
              {row.tags.split(',').map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-600 px-1.5 py-0.2 rounded text-[10px] font-mono">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'category',
      title: 'Item Group',
      width: '160px',
      sortable: true,
      render: (_, row) => {
        const groupName = row.category?.name || 'TOOLS';
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, group: groupName }));
            }}
            className="uppercase text-gray-600 font-medium cursor-pointer hover:text-primary-600 hover:underline"
          >
            {groupName}
          </span>
        );
      }
    },
    {
      key: 'partOf',
      title: 'Part Of',
      width: '160px',
      sortable: true,
      render: (val) => {
        const partVal = val || 'CONSUMABLE';
        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, partOf: partVal }));
            }}
            className="uppercase text-gray-500 font-medium cursor-pointer hover:text-primary-600 hover:underline"
          >
            {partVal}
          </span>
        );
      }
    },
    {
      key: 'location',
      title: 'Bin Location',
      width: '130px',
      sortable: true,
      render: (val) => <span className="font-mono font-medium text-gray-700">{val || '-'}</span>
    },
    {
      key: 'sku',
      title: 'ID',
      width: '130px',
      sortable: true,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, id: val || row.id }));
          }}
          className="font-mono font-bold text-gray-800 cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || row.id}
        </span>
      )
    },
    {
      key: 'statusToggle',
      title: 'DISABLE',
      width: '140px',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setToggleProductTarget(row);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              row.disabled ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            title={row.disabled ? 'Click to Enable Item' : 'Click to Disable Item'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                row.disabled ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <StatusBadge
            status={row.disabled ? 'Disabled' : 'Enabled'}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setToggleProductTarget(row);
            }}
            title={row.disabled ? 'Click to Enable Item' : 'Click to Disable Item'}
          />
        </div>
      )
    },
    {
      key: 'meta',
      title: '',
      align: 'right',
      width: '130px',
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
        const isFav = favorites[row.id!];
        const timeAgo = formatRelativeTime(row.updatedAt);
        return (
          <div className="flex items-center justify-end gap-3 text-gray-500 text-xs select-none">
            <span className="text-[11px] font-medium text-gray-500 min-w-[28px] text-right">
              {timeAgo}
            </span>
            <div className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors" title="Comments">
              <MessageSquare className="w-3 h-3 text-gray-400" />
              <span>0</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(row.id!);
                if (!isFav) {
                  successToast(`Marked "${row.name}" as favorite`);
                } else {
                  successToast(`Removed "${row.name}" from favorites`);
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
    <>
      <ERPListPageLayout<Product>
        title="Item Master"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={handleBulkExport}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/products/new')}
        addNewLabel="Add Item"
        onImport={() => setShowImportModal(true)}
        importLabel="Bulk Add"

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
        onAddFilterRule={() => setFilterRules(prev => [...prev, { id: `rule-${Date.now()}`, field: 'ID', operator: 'Equals', value: '' }])}
        onRemoveFilterRule={(id) => setFilterRules(prev => prev.filter(r => r.id !== id))}
        onUpdateFilterRule={(id, key, val) => setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))}
        onClearFilterRules={() => setFilterRules([])}
        onApplyFilterRules={() => successToast('Filters applied')}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={clearAllFilters}

        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => { setSortField(field); setSortOrder(order); }}
        sortOptions={['Last Updated On', 'Item Name', 'ID', 'Item Group', 'Part Of']}

        data={filteredProducts}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredProducts.length ? [] : filteredProducts.map(p => p.id!))}
        onRowClick={(row) => navigate(`/products/edit?id=${row.id}`)}
        emptyMessage="No items found"

        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}

        bulkActions={
          selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-gray-50 border-b border-gray-200">
              <span className="font-semibold text-gray-900 text-xs">
                {selectedIds.length} items selected
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowBulkEditModal(true)}
                  className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-3.5 py-1 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                  <span>Edit</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="flex items-center gap-1.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white px-3.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
                  >
                    <span>Actions</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showActionsMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40 text-xs">
                      <button onClick={() => { setShowBulkEditModal(true); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer font-medium"><Edit3 className="w-3.5 h-3.5 text-gray-500" /> Edit (Bulk Edit)</button>
                      <button onClick={() => { handleBulkExport(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"><FileSpreadsheet className="w-3.5 h-3.5 text-gray-500" /> Export</button>
                      <button onClick={() => { successToast('Assigned to user'); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"><UserPlus className="w-3.5 h-3.5 text-gray-500" /> Assign To</button>
                      <button onClick={() => { successToast('Assignment cleared'); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"><UserX className="w-3.5 h-3.5 text-gray-500" /> Clear Assignment</button>
                      <button onClick={() => { window.print(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"><Printer className="w-3.5 h-3.5 text-gray-500" /> Print</button>
                      <hr className="my-1 border-gray-100" />
                      <button onClick={() => { handleBulkDelete(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }
      />

      {/* BULK IMPORT EXCEL MODAL */}
      <ERPBulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Bulk Import Items"
        entityName="Item"
        columns={ITEM_IMPORT_COLUMNS}
        sampleData={ITEM_IMPORT_SAMPLE_DATA}
        templateFileName="patel_strap_item_master_demo_template.xlsx"
        onImport={async (rows) => {
          const res = await bulkImportProducts(rows);
          return res;
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* BULK EDIT MODAL DIALOG */}
      {showBulkEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Bulk Edit</h2>
              <button
                onClick={() => { setShowBulkEditModal(false); setSelectedBulkField(''); setBulkEditValue(''); }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">
                  Field <span className="text-red-500">*</span>
                </label>
                <select
                  value={selectedBulkField}
                  onChange={(e) => {
                    setSelectedBulkField(e.target.value);
                    setBulkEditValue('');
                  }}
                  className="w-full bg-gray-50 border border-gray-200 hover:bg-white focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 outline-none cursor-pointer font-medium transition-all"
                >
                  <option value="">Select field...</option>
                  {BULK_EDIT_FIELDS.map(f => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {selectedBulkField && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1.5">
                    Value
                  </label>

                  {(() => {
                    const fieldConfig = BULK_EDIT_FIELDS.find(f => f.key === selectedBulkField);
                    if (!fieldConfig) return null;

                    if (fieldConfig.type === 'boolean') {
                      return (
                        <select
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 hover:bg-white focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 outline-none cursor-pointer font-medium transition-all"
                        >
                          <option value="">Select option...</option>
                          <option value="false">Enabled (False)</option>
                          <option value="true">Disabled (True)</option>
                        </select>
                      );
                    }

                    if (fieldConfig.type === 'category') {
                      return (
                        <select
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 hover:bg-white focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 outline-none cursor-pointer font-medium transition-all"
                        >
                          <option value="">Select Category / Item Group...</option>
                          {categoriesList.map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    if (fieldConfig.type === 'unit') {
                      return (
                        <select
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 hover:bg-white focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 outline-none cursor-pointer font-medium transition-all"
                        >
                          <option value="">Select Unit of Measure...</option>
                          {unitsList.map(u => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    if (fieldConfig.type === 'select' && fieldConfig.options) {
                      return (
                        <select
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 hover:bg-white focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 outline-none cursor-pointer font-medium transition-all"
                        >
                          <option value="">Select value...</option>
                          {fieldConfig.options.map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      );
                    }

                    if (fieldConfig.type === 'number') {
                      return (
                        <input
                          type="number"
                          step="any"
                          value={bulkEditValue}
                          onChange={(e) => setBulkEditValue(e.target.value)}
                          placeholder="Enter numeric value..."
                          className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 outline-none font-medium transition-all"
                        />
                      );
                    }

                    return (
                      <input
                        type="text"
                        value={bulkEditValue}
                        onChange={(e) => setBulkEditValue(e.target.value)}
                        placeholder="Enter value..."
                        className="w-full bg-gray-50 border border-gray-200 focus:bg-white focus:border-primary-500 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 outline-none font-medium transition-all"
                      />
                    );
                  })()}

                  <p className="mt-2 text-[11px] text-gray-500">
                    {!bulkEditValue.trim()
                      ? "You have not entered a value. The field will be set to empty."
                      : `Will update ${BULK_EDIT_FIELDS.find(f => f.key === selectedBulkField)?.label} to "${bulkEditValue}" for ${selectedIds.length} selected record(s).`}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-6 py-4 bg-gray-50/50 border-t border-gray-100">
              <button
                onClick={() => { setShowBulkEditModal(false); setSelectedBulkField(''); setBulkEditValue(''); }}
                className="text-xs font-semibold text-gray-600 hover:text-gray-800 px-4 py-2 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyBulkEdit}
                disabled={!selectedBulkField || isBulkUpdating}
                className="bg-black hover:bg-gray-800 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
              >
                {isBulkUpdating ? 'Updating...' : `Update ${selectedIds.length} records`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CONFIRM DISABLE / ENABLE DIALOG */}
      {toggleProductTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${toggleProductTarget.disabled ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {toggleProductTarget.disabled ? <UserPlus className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {toggleProductTarget.disabled ? 'Enable Item' : 'Disable Item'}
                </h3>
                <p className="text-xs text-gray-500">
                  Item: <span className="font-semibold text-gray-800">{toggleProductTarget.name}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to {toggleProductTarget.disabled ? 'enable' : 'disable'}{' '}
              <span className="font-bold text-gray-900">"{toggleProductTarget.name}"</span>?
              {!toggleProductTarget.disabled && ' Disabled items can be re-enabled at any time.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={() => setToggleProductTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                  toggleProductTarget.disabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {isToggleLoading ? 'Updating...' : toggleProductTarget.disabled ? 'Confirm Enable' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ProductMasterList = WithAuth(ProductMasterListBase);
export default ProductMasterList;
