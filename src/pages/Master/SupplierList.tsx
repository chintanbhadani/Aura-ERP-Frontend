import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, ERPBulkImportModal, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchSuppliers, 
  updateSupplier,
  deleteSupplier, 
  bulkImportSuppliers,
  type Supplier 
} from '../../services/api';
import { SUPPLIER_IMPORT_COLUMNS, SUPPLIER_IMPORT_SAMPLE_DATA } from './supplierImportConfig';
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
  Edit3 
} from 'lucide-react';
import { formatFullDateTime } from '../../helper/helper';

const INITIAL_ERP_NEXT_SUPPLIERS: Partial<Supplier>[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'name', placeholder: 'Supplier Name', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'group', placeholder: 'Supplier Group', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['ID', 'Supplier Name', 'Supplier Group', 'Status'];

const SupplierListBase: React.FC = () => {
  const navigate = useNavigate();
  const reduxToken = useSelector((state: any) => state.auth?.token);
  const token = reduxToken || localStorage.getItem('token') || '';

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Disable / Enable Toggle Dialog State
  const [toggleSupplierTarget, setToggleSupplierTarget] = useState<any | null>(null);
  const [isToggleLoading, setIsToggleLoading] = useState(false);

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

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    id: '',
    name: '',
    group: ''
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchSuppliers();
      setSuppliers(data || []);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleFavorite = (id: string | number) => {
    const key = String(id);
    setFavorites(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleConfirmToggleStatus = async () => {
    if (!toggleSupplierTarget) return;
    setIsToggleLoading(true);
    const nextDisabled = !toggleSupplierTarget.disabled;
    try {
      await updateSupplier(toggleSupplierTarget.id, { disabled: nextDisabled });
      setSuppliers(prev => prev.map(s => String(s.id) === String(toggleSupplierTarget.id) ? { ...s, disabled: nextDisabled, updatedAt: new Date().toISOString() } : s));
      successToast(nextDisabled ? `Disabled "${toggleSupplierTarget.name}"` : `Enabled "${toggleSupplierTarget.name}"`);
      setToggleSupplierTarget(null);
    } catch (err: any) {
      errorToast(err.message || 'Failed to update supplier status');
    } finally {
      setIsToggleLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} supplier(s)?`)) {
      setSuppliers(prev => prev.filter(s => !selectedIds.includes(String(s.id))));
      setSelectedIds([]);
      successToast('Deleted selected supplier(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one supplier to export');
      return;
    }
    const exportData = suppliers.filter(s => selectedIds.includes(String(s.id)));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `suppliers_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} supplier(s)`);
  };

  // Filtered & Sorted Suppliers
  const filteredSuppliers = useMemo(() => {
    let result = [...suppliers];

    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter(s => 
        s.name.toLowerCase().includes(query) ||
        String(s.id).toLowerCase().includes(query) ||
        (s.supplierGroup && s.supplierGroup.toLowerCase().includes(query))
      );
    }

    if (quickFilters.id) {
      result = result.filter(s => String(s.id).toLowerCase().includes(quickFilters.id.toLowerCase()));
    }
    if (quickFilters.name) {
      result = result.filter(s => s.name.toLowerCase().includes(quickFilters.name.toLowerCase()));
    }
    if (quickFilters.group) {
      result = result.filter(s => s.supplierGroup && s.supplierGroup.toLowerCase().includes(quickFilters.group.toLowerCase()));
    }

    if (assignedToFilter) {
      result = result.filter(s => s.assignedTo === assignedToFilter);
    }
    if (createdByFilter) {
      result = result.filter(s => (s as any).createdBy === createdByFilter);
    }
    if (tagFilter) {
      result = result.filter(s => s.tags && s.tags.includes(tagFilter));
    }

    if (headerFavorite) {
      result = result.filter(s => favorites[String(s.id)]);
    }

    filterRules.forEach(rule => {
      if (!rule.value.trim()) return;
      const val = rule.value.toLowerCase();
      result = result.filter(s => {
        let fieldVal = '';
        if (rule.field === 'ID') fieldVal = String(s.id || '');
        else if (rule.field === 'Supplier Name') fieldVal = s.name || '';
        else if (rule.field === 'Supplier Group') fieldVal = s.supplierGroup || '';
        else if (rule.field === 'Status') fieldVal = s.disabled ? 'Disabled' : 'Enabled';

        fieldVal = fieldVal.toLowerCase();
        if (rule.operator === 'Equals') return fieldVal === val;
        if (rule.operator === 'Not Equals') return fieldVal !== val;
        if (rule.operator === 'Like') return fieldVal.includes(val);
        return true;
      });
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Supplier Name') {
        comparison = (a.name || '').localeCompare(b.name || '');
      } else if (sortField === 'ID') {
        comparison = (Number(a.id) || 0) - (Number(b.id) || 0);
      } else if (sortField === 'Supplier Group') {
        comparison = (a.supplierGroup || '').localeCompare(b.supplierGroup || '');
      } else {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [suppliers, globalSearch, quickFilters, assignedToFilter, createdByFilter, tagFilter, headerFavorite, filterRules, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.id ||
    quickFilters.name ||
    quickFilters.group ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter ||
    headerFavorite ||
    filterRules.length > 0
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ id: '', name: '', group: '' });
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<Supplier>[] = [
    {
      key: 'name',
      title: 'Supplier Name',
      width: '320px',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col py-0.5">
          <div className="flex items-center gap-2">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, name: row.name }));
              }}
              className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors cursor-pointer hover:underline"
            >
              {row.name}
            </span>
          </div>
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, group: row.supplierGroup || 'All Supplier Groups' }));
            }}
            className="text-[11px] text-gray-500 font-medium cursor-pointer hover:text-primary-600 hover:underline w-fit"
          >
            {row.supplierGroup || 'All Supplier Groups'}
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
      key: 'supplierGroup',
      title: 'Supplier Group',
      width: '200px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, group: val || 'All Supplier Groups' }));
          }}
          className="uppercase text-gray-600 font-medium cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || 'All Supplier Groups'}
        </span>
      )
    },
    {
      key: 'id',
      title: 'ID',
      width: '150px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, id: String(val) }));
          }}
          className="font-mono font-bold text-gray-800 cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val}
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
              setToggleSupplierTarget(row);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              row.disabled ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            title={row.disabled ? 'Click to Enable Supplier' : 'Click to Disable Supplier'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                row.disabled ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span className={`text-xs font-semibold ${row.disabled ? 'text-red-700' : 'text-emerald-700'}`}>
            {row.disabled ? 'Disabled' : 'Enabled'}
          </span>
        </div>
      )
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '240px',
      render: (_, row) => (
        <span className="text-xs text-gray-600 font-mono font-medium">
          {formatFullDateTime(row.updatedAt)}
        </span>
      )
    }
  ];

  return (
    <>
      <ERPListPageLayout<Supplier>
        title="Supplier"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={handleBulkExport}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/master/suppliers/new')}
        addNewLabel="Add Supplier"
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
        sortOptions={['Last Updated On', 'Supplier Name', 'ID', 'Supplier Group']}

        data={filteredSuppliers}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredSuppliers.length ? [] : filteredSuppliers.map(s => String(s.id)))}
        onRowClick={(row) => navigate(`/master/suppliers/${row.id}`)}
        emptyMessage="No suppliers found"

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
                  onClick={() => navigate(`/master/suppliers/${selectedIds[0]}`)}
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
        title="Bulk Import Suppliers"
        entityName="Supplier"
        columns={SUPPLIER_IMPORT_COLUMNS}
        sampleData={SUPPLIER_IMPORT_SAMPLE_DATA}
        templateFileName="patel_strap_suppliers_demo_template.xlsx"
        onImport={async (rows) => {
          const res = await bulkImportSuppliers(rows);
          return res;
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* CONFIRM DISABLE / ENABLE DIALOG */}
      {toggleSupplierTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${toggleSupplierTarget.disabled ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {toggleSupplierTarget.disabled ? <UserPlus className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {toggleSupplierTarget.disabled ? 'Enable Supplier' : 'Disable Supplier'}
                </h3>
                <p className="text-xs text-gray-500">
                  Supplier: <span className="font-semibold text-gray-800">{toggleSupplierTarget.name}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to {toggleSupplierTarget.disabled ? 'enable' : 'disable'}{' '}
              <span className="font-bold text-gray-900">"{toggleSupplierTarget.name}"</span>?
              {!toggleSupplierTarget.disabled && ' Disabled suppliers can be re-enabled at any time.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={() => setToggleSupplierTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                  toggleSupplierTarget.disabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {isToggleLoading ? 'Updating...' : toggleSupplierTarget.disabled ? 'Confirm Enable' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const SupplierList = WithAuth(SupplierListBase, ModuleName.SUPPLIERS, Permission.LIST);
export default SupplierList;
