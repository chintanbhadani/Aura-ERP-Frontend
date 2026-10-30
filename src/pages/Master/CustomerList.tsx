import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, ERPBulkImportModal, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchCustomers, 
  updateCustomer,
  deleteCustomer, 
  bulkImportCustomers,
  type Customer 
} from '../../services/api';
import { CUSTOMER_IMPORT_COLUMNS, CUSTOMER_IMPORT_SAMPLE_DATA } from './customerImportConfig';
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

const INITIAL_ERP_NEXT_CUSTOMERS: Partial<Customer>[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'name', placeholder: 'Customer Name', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'group', placeholder: 'Customer Group', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'territory', placeholder: 'Territory', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['ID', 'Customer Name', 'Customer Group', 'Territory', 'Status'];

const CustomerListBase: React.FC = () => {
  const navigate = useNavigate();
  const reduxToken = useSelector((state: any) => state.auth?.token);
  const token = reduxToken || localStorage.getItem('token') || '';

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Disable / Enable Toggle Dialog State
  const [toggleCustomerTarget, setToggleCustomerTarget] = useState<any | null>(null);
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
    group: '',
    territory: ''
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchCustomers();
      setCustomers(data || []);
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
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
    if (!toggleCustomerTarget) return;
    setIsToggleLoading(true);
    const nextDisabled = !toggleCustomerTarget.disabled;
    try {
      await updateCustomer(toggleCustomerTarget.id, { disabled: nextDisabled });
      setCustomers(prev => prev.map(c => String(c.id) === String(toggleCustomerTarget.id) ? { ...c, disabled: nextDisabled, updatedAt: new Date().toISOString() } : c));
      successToast(nextDisabled ? `Disabled "${toggleCustomerTarget.customerName || toggleCustomerTarget.name}"` : `Enabled "${toggleCustomerTarget.customerName || toggleCustomerTarget.name}"`);
      setToggleCustomerTarget(null);
    } catch (err: any) {
      errorToast(err.message || 'Failed to update customer status');
    } finally {
      setIsToggleLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} customer(s)?`)) {
      setCustomers(prev => prev.filter(c => !selectedIds.includes(String(c.id))));
      setSelectedIds([]);
      successToast('Deleted selected customer(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one customer to export');
      return;
    }
    const exportData = customers.filter(c => selectedIds.includes(String(c.id)));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `customers_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} customer(s)`);
  };

  // Filtered & Sorted Customers
  const filteredCustomers = useMemo(() => {
    let result = [...customers];

    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter(c => 
        (c.customerName || c.name).toLowerCase().includes(query) ||
        String(c.id).toLowerCase().includes(query) ||
        (c.customerGroup && c.customerGroup.toLowerCase().includes(query)) ||
        (c.territory && c.territory.toLowerCase().includes(query))
      );
    }

    if (quickFilters.id) {
      result = result.filter(c => String(c.id).toLowerCase().includes(quickFilters.id.toLowerCase()));
    }
    if (quickFilters.name) {
      result = result.filter(c => (c.customerName || c.name).toLowerCase().includes(quickFilters.name.toLowerCase()));
    }
    if (quickFilters.group) {
      result = result.filter(c => c.customerGroup && c.customerGroup.toLowerCase().includes(quickFilters.group.toLowerCase()));
    }
    if (quickFilters.territory) {
      result = result.filter(c => c.territory && c.territory.toLowerCase().includes(quickFilters.territory.toLowerCase()));
    }

    if (assignedToFilter) {
      result = result.filter(c => c.assignedTo === assignedToFilter);
    }
    if (createdByFilter) {
      result = result.filter(c => (c as any).createdBy === createdByFilter);
    }
    if (tagFilter) {
      result = result.filter(c => c.tags && c.tags.includes(tagFilter));
    }

    if (headerFavorite) {
      result = result.filter(c => favorites[String(c.id)]);
    }

    filterRules.forEach(rule => {
      if (!rule.value.trim()) return;
      const val = rule.value.toLowerCase();
      result = result.filter(c => {
        let fieldVal = '';
        if (rule.field === 'ID') fieldVal = String(c.id || '');
        else if (rule.field === 'Customer Name') fieldVal = c.customerName || c.name || '';
        else if (rule.field === 'Customer Group') fieldVal = c.customerGroup || '';
        else if (rule.field === 'Territory') fieldVal = c.territory || '';
        else if (rule.field === 'Status') fieldVal = c.disabled ? 'Disabled' : 'Enabled';

        fieldVal = fieldVal.toLowerCase();
        if (rule.operator === 'Equals') return fieldVal === val;
        if (rule.operator === 'Not Equals') return fieldVal !== val;
        if (rule.operator === 'Like') return fieldVal.includes(val);
        return true;
      });
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Customer Name') {
        comparison = (a.customerName || a.name || '').localeCompare(b.customerName || b.name || '');
      } else if (sortField === 'ID') {
        comparison = (Number(a.id) || 0) - (Number(b.id) || 0);
      } else if (sortField === 'Customer Group') {
        comparison = (a.customerGroup || '').localeCompare(b.customerGroup || '');
      } else if (sortField === 'Territory') {
        comparison = (a.territory || '').localeCompare(b.territory || '');
      } else {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [customers, globalSearch, quickFilters, assignedToFilter, createdByFilter, tagFilter, headerFavorite, filterRules, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.id ||
    quickFilters.name ||
    quickFilters.group ||
    quickFilters.territory ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter ||
    headerFavorite ||
    filterRules.length > 0
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ id: '', name: '', group: '', territory: '' });
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<Customer>[] = [
    {
      key: 'name',
      title: 'Customer Name',
      width: '320px',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col py-0.5">
          <div className="flex items-center gap-2">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, name: row.customerName || row.name }));
              }}
              className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors cursor-pointer hover:underline"
            >
              {row.customerName || row.name}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, group: row.customerGroup || 'Commercial' }));
              }}
              className="cursor-pointer hover:text-primary-600 hover:underline"
            >
              {row.customerGroup || 'Commercial'}
            </span>
            {' • '}
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, territory: row.territory || 'India' }));
              }}
              className="cursor-pointer hover:text-primary-600 hover:underline"
            >
              {row.territory || 'India'}
            </span>
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
      key: 'customerGroup',
      title: 'Customer Group',
      width: '180px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, group: val || 'Commercial' }));
          }}
          className="uppercase text-gray-600 font-medium cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || 'Commercial'}
        </span>
      )
    },
    {
      key: 'territory',
      title: 'Territory',
      width: '150px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, territory: val || 'India' }));
          }}
          className="uppercase text-gray-500 font-medium cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || 'India'}
        </span>
      )
    },
    {
      key: 'id',
      title: 'ID',
      width: '140px',
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
              setToggleCustomerTarget(row);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              row.disabled ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            title={row.disabled ? 'Click to Enable Customer' : 'Click to Disable Customer'}
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
      <ERPListPageLayout<Customer>
        title="Customer"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={handleBulkExport}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/master/customers/new')}
        addNewLabel="Add Customer"
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
        sortOptions={['Last Updated On', 'Customer Name', 'ID', 'Customer Group', 'Territory']}

        data={filteredCustomers}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredCustomers.length ? [] : filteredCustomers.map(c => String(c.id)))}
        onRowClick={(row) => navigate(`/master/customers/${row.id}`)}
        emptyMessage="No customers found"

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
                  onClick={() => navigate(`/master/customers/${selectedIds[0]}`)}
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
        title="Bulk Import Customers"
        entityName="Customer"
        columns={CUSTOMER_IMPORT_COLUMNS}
        sampleData={CUSTOMER_IMPORT_SAMPLE_DATA}
        templateFileName="patel_strap_customers_demo_template.xlsx"
        onImport={async (rows) => {
          const res = await bulkImportCustomers(rows);
          return res;
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* CONFIRM DISABLE / ENABLE DIALOG */}
      {toggleCustomerTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${toggleCustomerTarget.disabled ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {toggleCustomerTarget.disabled ? <UserPlus className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {toggleCustomerTarget.disabled ? 'Enable Customer' : 'Disable Customer'}
                </h3>
                <p className="text-xs text-gray-500">
                  Customer: <span className="font-semibold text-gray-800">{toggleCustomerTarget.customerName || toggleCustomerTarget.name}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to {toggleCustomerTarget.disabled ? 'enable' : 'disable'}{' '}
              <span className="font-bold text-gray-900">"{toggleCustomerTarget.customerName || toggleCustomerTarget.name}"</span>?
              {!toggleCustomerTarget.disabled && ' Disabled customers can be re-enabled at any time.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={() => setToggleCustomerTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                  toggleCustomerTarget.disabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {isToggleLoading ? 'Updating...' : toggleCustomerTarget.disabled ? 'Confirm Enable' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const CustomerList = WithAuth(CustomerListBase, ModuleName.CLIENTS, Permission.LIST);
export default CustomerList;
