import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchRoles, 
  deleteRole, 
  type RoleRecord 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Heart, 
  MessageSquare, 
  ChevronDown, 
  FileSpreadsheet, 
  Printer, 
  Trash2, 
  Edit3, 
  X,
  ShieldCheck,
  Users
} from 'lucide-react';
import { formatFullDateTime } from '../../helper/helper';

const INITIAL_ROLES: RoleRecord[] = [
  { id: '1', name: 'Admin', code: 'ADMIN', description: 'Full access to all system modules, configurations, user management, and settings.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '2', name: 'Store Manager', code: 'STORE_MANAGER', description: 'Manages overall inventory, stock entries, GRN verification, and warehouse operations.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '3', name: 'Store Executive', code: 'STORE_EXEC', description: 'Handles day-to-day stock receipts, material movements, and inventory logs.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '4', name: 'Purchase Manager', code: 'PURCHASE_MANAGER', description: 'Oversees procurement operations, vendor relations, and approves purchase orders.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '5', name: 'Purchase Executive', code: 'PURCHASE_EXEC', description: 'Creates material requisitions, purchase orders, and supplier communication.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '6', name: 'Sales Manager', code: 'SALES_MANAGER', description: 'Manages sales targets, CRM leads, customer accounts, and sales approvals.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '7', name: 'Sales Executive', code: 'SALES_EXEC', description: 'Creates client inquiries, quotations, proforma invoices, and customer follow-ups.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '8', name: 'QC Manager', code: 'QC_MANAGER', description: 'Defines quality standards, approves incoming inspection reports, and manages QC workflows.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '9', name: 'QC Inspector', code: 'QC_INSPECTOR', description: 'Conducts physical inspections, quality tests, roll testing, and records QC logs.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() },
  { id: '10', name: 'Production Manager', code: 'PRODUCTION_MANAGER', description: 'Schedules manufacturing shifts, machine assignments, and monitors daily production outputs.', status: 'Active', userCount: 1, updatedAt: new Date().toISOString() }
];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'name', placeholder: 'Role Name', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'code', placeholder: 'Role Code', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'description', placeholder: 'Description', className: 'w-44 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['Role Name', 'Role Code', 'Description', 'Status'];

export interface RoleManagementListProps {
  initialOpenAddModal?: boolean;
}

const RoleManagementListBase: React.FC<RoleManagementListProps> = () => {
  const navigate = useNavigate();

  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);

  // Global & Toolbar Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Role Name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    name: '',
    code: '',
    description: '',
    status: ''
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchRoles();
      if (Array.isArray(data) && data.length > 0) {
        setRoles(data);
      } else {
        setRoles(INITIAL_ROLES);
      }
    } catch (err) {
      console.warn('Backend API unavailable, using sample roles:', err);
      setRoles(INITIAL_ROLES);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteRole = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this role?')) {
      try {
        await deleteRole(id);
      } catch (err) {
        console.warn('Backend delete role failed:', err);
      }
      setRoles(prev => prev.filter(r => r.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      successToast('Role deleted successfully');
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} role(s)?`)) {
      try {
        await Promise.all(selectedIds.map(id => deleteRole(id)));
      } catch (err) {
        console.warn('Bulk delete warning:', err);
      }
      setRoles(prev => prev.filter(r => !selectedIds.includes(r.id!)));
      setSelectedIds([]);
      successToast('Deleted selected role(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one role to export');
      return;
    }
    const exportData = roles.filter(r => selectedIds.includes(r.id!));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `role_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} role(s)`);
  };

  // Filtered & Sorted Roles
  const filteredRoles = useMemo(() => {
    let result = roles.filter(r => {
      if (headerFavorite && !favorites[r.id!]) return false;

      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const matchGlobal =
          (r.name && r.name.toLowerCase().includes(q)) ||
          (r.code && r.code.toLowerCase().includes(q)) ||
          (r.description && r.description.toLowerCase().includes(q));
        if (!matchGlobal) return false;
      }

      if (quickFilters.name && !r.name.toLowerCase().includes(quickFilters.name.toLowerCase())) return false;
      if (quickFilters.code && !r.code?.toLowerCase().includes(quickFilters.code.toLowerCase())) return false;
      if (quickFilters.description && !r.description?.toLowerCase().includes(quickFilters.description.toLowerCase())) return false;
      if (quickFilters.status && !r.status?.toLowerCase().includes(quickFilters.status.toLowerCase())) return false;

      for (const rule of filterRules) {
        if (!rule.value) continue;
        const val = String(rule.value).toLowerCase();
        if (rule.field === 'Role Name' && !r.name.toLowerCase().includes(val)) return false;
        if (rule.field === 'Role Code' && !r.code?.toLowerCase().includes(val)) return false;
        if (rule.field === 'Description' && !r.description?.toLowerCase().includes(val)) return false;
        if (rule.field === 'Status' && !r.status?.toLowerCase().includes(val)) return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortField === 'Role Name') {
        return sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      }
      if (sortField === 'Role Code') {
        return sortOrder === 'asc' ? (a.code || '').localeCompare(b.code || '') : (b.code || '').localeCompare(a.code || '');
      }
      const countA = a.userCount || 0;
      const countB = b.userCount || 0;
      return sortOrder === 'asc' ? countA - countB : countB - countA;
    });

    return result;
  }, [roles, globalSearch, quickFilters, headerFavorite, filterRules, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.name ||
    quickFilters.code ||
    quickFilters.description ||
    quickFilters.status ||
    headerFavorite ||
    filterRules.length > 0
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ name: '', code: '', description: '', status: '' });
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<RoleRecord>[] = [
    {
      key: 'name',
      title: 'ROLE NAME',
      width: '200px',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
            <ShieldCheck size={16} />
          </div>
          <span 
            onClick={(e) => {
              e.stopPropagation();
              if (val) setQuickFilters(prev => ({ ...prev, name: val }));
            }}
            className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors cursor-pointer hover:underline"
          >
            {val}
          </span>
        </div>
      )
    },
    {
      key: 'code',
      title: 'ROLE CODE',
      width: '180px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val && val !== '-') setQuickFilters(prev => ({ ...prev, code: val }));
          }}
          className="font-mono text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-2.5 py-1 rounded-md font-semibold cursor-pointer transition-colors"
        >
          {val || '-'}
        </span>
      )
    },
    {
      key: 'description',
      title: 'DESCRIPTION',
      width: '320px',
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val && val !== '-') setQuickFilters(prev => ({ ...prev, description: val }));
          }}
          className="text-gray-600 text-xs truncate max-w-[300px] block cursor-pointer hover:text-primary-600 hover:underline" 
          title={val}
        >
          {val || '-'}
        </span>
      )
    },
    {
      key: 'userCount',
      title: 'USERS ASSIGNED',
      width: '150px',
      sortable: true,
      render: (val) => (
        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full text-xs font-semibold border border-indigo-100">
          <Users size={12} />
          <span>{val || 1} User(s)</span>
        </span>
      )
    },
    {
      key: 'status',
      title: 'STATUS',
      width: '120px',
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val) setQuickFilters(prev => ({ ...prev, status: val }));
          }}
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${
            (val || 'Active') === 'Active' 
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200' 
              : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
          }`}
        >
          {val || 'Active'}
        </span>
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
    },
    {
      key: 'meta',
      title: '',
      align: 'right',
      width: '90px',
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
        return (
          <div className="flex items-center justify-end gap-2 text-gray-500 text-xs select-none">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (row.id) handleDeleteRole(row.id);
              }}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-red-600 transition-colors cursor-pointer"
              title="Delete Role"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                if (row.id) toggleFavorite(row.id);
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
      <ERPListPageLayout<RoleRecord>
        title="Role Management"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={handleBulkExport}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/roles/new')}
        addNewLabel="Add Role"

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
        onAddFilterRule={() => setFilterRules(prev => [...prev, { id: `rule-${Date.now()}`, field: 'Role Name', operator: 'Equals', value: '' }])}
        onRemoveFilterRule={(id) => setFilterRules(prev => prev.filter(r => r.id !== id))}
        onUpdateFilterRule={(id, key, val) => setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))}
        onClearFilterRules={() => setFilterRules([])}
        onApplyFilterRules={() => successToast('Filters applied')}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={clearAllFilters}

        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => { setSortField(field); setSortOrder(order); }}
        sortOptions={['Role Name', 'Role Code', 'Users Assigned']}

        data={filteredRoles}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredRoles.length ? [] : filteredRoles.map(r => r.id!))}
        onRowClick={(row) => navigate(`/roles/${row.id}`)}
        emptyMessage="No roles found"

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
                  onClick={() => {
                    const roleToEdit = roles.find(r => r.id === selectedIds[0]);
                    if (roleToEdit) navigate(`/roles/${roleToEdit.id}`);
                  }}
                  className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-3.5 py-1 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                  <span>Edit</span>
                </button>

                <div className="relative">
                  <button
                    onClick={() => setShowActionsMenu(!showActionsMenu)}
                    className="flex items-center gap-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                  >
                    <span>Actions</span>
                    <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                  </button>
                  {showActionsMenu && (
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                      <button
                        onClick={() => { setShowActionsMenu(false); handleBulkExport(); }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export JSON
                      </button>
                      <button
                        onClick={() => { setShowActionsMenu(false); handleBulkDelete(); }}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Delete Selected
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        }
      />
    </>
  );
};

export const RoleManagementList = WithAuth(RoleManagementListBase, ModuleName.ROLE_PERMISSIONS, Permission.LIST);
export default RoleManagementList;
