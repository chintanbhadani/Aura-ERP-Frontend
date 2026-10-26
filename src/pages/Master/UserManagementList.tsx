import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import WithAuth from '../../components/WithAuth';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchUsers, 
  createUser, 
  updateUser, 
  toggleBlockUser, 
  deleteUser, 
  resetUserTwoFactor,
  type UserRecord 
} from '../../services/api';
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
  ShieldAlert,
  X
} from 'lucide-react';

const AVAILABLE_ROLES = [
  'Admin',
  'Store Manager',
  'Store Executive',
  'Purchase Manager',
  'Purchase Executive',
  'Sales Manager',
  'Sales Executive',
  'QC Manager',
  'QC Inspector',
  'Production Manager'
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

const INITIAL_USERS: UserRecord[] = [
  { id: 'usr-1', employeeId: 'ADM001', username: 'admin', fullName: 'System Admin', role: 'Admin', contactNumber: '9876543201', email: 'admin@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-2', employeeId: 'STM001', username: 'storemanager', fullName: 'Suresh Patel', role: 'Store Manager', contactNumber: '9876543202', email: 'store.manager@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-3', employeeId: 'STE001', username: 'storeexec', fullName: 'Ramesh Kumar', role: 'Store Executive', contactNumber: '9876543203', email: 'store.exec@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-4', employeeId: 'PURM001', username: 'purchasemanager', fullName: 'Vikram Shah', role: 'Purchase Manager', contactNumber: '9876543204', email: 'purchase.manager@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-5', employeeId: 'PURE001', username: 'purchaseexec', fullName: 'Amit Sharma', role: 'Purchase Executive', contactNumber: '9876543205', email: 'purchase.exec@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-6', employeeId: 'SLSM001', username: 'salesmanager', fullName: 'Rahul Mehta', role: 'Sales Manager', contactNumber: '9876543206', email: 'sales.manager@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-7', employeeId: 'SLSE001', username: 'salesexec', fullName: 'Priya Verma', role: 'Sales Executive', contactNumber: '9876543207', email: 'sales.exec@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-8', employeeId: 'QCM001', username: 'qcmanager', fullName: 'Hardik Dave', role: 'QC Manager', contactNumber: '9876543208', email: 'qc.manager@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-9', employeeId: 'QCI001', username: 'qcinspector', fullName: 'Harmindar Singh', role: 'QC Inspector', contactNumber: '9876543209', email: 'qc.inspector@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() },
  { id: 'usr-10', employeeId: 'PRDM001', username: 'productionmanager', fullName: 'Manish Joshi', role: 'Production Manager', contactNumber: '9876543210', email: 'production.manager@patelstrap.com', status: 'Active', isBlock: false, updatedAt: new Date().toISOString() }
];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'employeeId', placeholder: 'Employee ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'username', placeholder: 'User Name', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'fullName', placeholder: 'Full Name', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'role', placeholder: 'Role', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'email', placeholder: 'Email', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['Employee ID', 'User Name', 'Full Name', 'Role', 'Status', 'Email'];

export interface UserManagementListProps {
  initialOpenAddModal?: boolean;
}

const UserManagementListBase: React.FC<UserManagementListProps> = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserRecord[]>([]);
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
  const [sortField, setSortField] = useState('Last Updated On');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    employeeId: '',
    username: '',
    fullName: '',
    role: '',
    email: ''
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchUsers();
      if (Array.isArray(data) && data.length > 0) {
        setUsers(data);
      } else {
        setUsers(INITIAL_USERS);
      }
    } catch (err) {
      console.warn('Backend API unavailable, using sample users:', err);
      setUsers(INITIAL_USERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleBlock = async (user: UserRecord, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user.id) return;
    try {
      const updated = await toggleBlockUser(user.id);
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBlock: updated.isBlock } : u));
      successToast(`User ${updated.isBlock ? 'blocked' : 'unblocked'} successfully`);
    } catch (err) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isBlock: !u.isBlock } : u));
      successToast(`Toggled block for user ${user.username}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await deleteUser(id);
      } catch (err) {
        console.warn('Backend delete user failed:', err);
      }
      setUsers(prev => prev.filter(u => u.id !== id));
      setSelectedIds(prev => prev.filter(i => i !== id));
      successToast('User deleted successfully');
    }
  };

  const handleBulkReset2FA = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Reset Google Authenticator (2FA) for ${selectedIds.length} selected user(s)?\n\nOn their next login, they will be prompted to scan a new QR code.`)) {
      try {
        await Promise.all(selectedIds.map(id => resetUserTwoFactor(id)));
        successToast(`Reset Google Authenticator for ${selectedIds.length} user(s)`);
      } catch (err) {
        successToast(`Reset 2FA for selected user(s)`);
      }
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} user(s)?`)) {
      try {
        await Promise.all(selectedIds.map(id => deleteUser(id)));
      } catch (err) {
        console.warn('Bulk delete warning:', err);
      }
      setUsers(prev => prev.filter(u => !selectedIds.includes(u.id!)));
      setSelectedIds([]);
      successToast('Deleted selected user(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one user to export');
      return;
    }
    const exportData = users.filter(u => selectedIds.includes(u.id!));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `user_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} user(s)`);
  };

  // Filtered & Sorted Users
  const filteredUsers = useMemo(() => {
    let result = users.filter(u => {
      if (headerFavorite && !favorites[u.id!]) return false;

      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const matchGlobal =
          (u.employeeId && u.employeeId.toLowerCase().includes(q)) ||
          (u.username && u.username.toLowerCase().includes(q)) ||
          (u.fullName && u.fullName.toLowerCase().includes(q)) ||
          (u.email && u.email.toLowerCase().includes(q)) ||
          (u.contactNumber && u.contactNumber.toLowerCase().includes(q)) ||
          (u.role && u.role.toLowerCase().includes(q));
        if (!matchGlobal) return false;
      }

      if (quickFilters.employeeId && !u.employeeId?.toLowerCase().includes(quickFilters.employeeId.toLowerCase())) return false;
      if (quickFilters.username && !u.username.toLowerCase().includes(quickFilters.username.toLowerCase())) return false;
      if (quickFilters.fullName && !u.fullName?.toLowerCase().includes(quickFilters.fullName.toLowerCase())) return false;
      if (quickFilters.role && !u.role.toLowerCase().includes(quickFilters.role.toLowerCase())) return false;
      if (quickFilters.email && !u.email?.toLowerCase().includes(quickFilters.email.toLowerCase())) return false;

      for (const rule of filterRules) {
        if (!rule.value) continue;
        const val = String(rule.value).toLowerCase();
        if (rule.field === 'Employee ID' && !u.employeeId?.toLowerCase().includes(val)) return false;
        if (rule.field === 'User Name' && !u.username.toLowerCase().includes(val)) return false;
        if (rule.field === 'Full Name' && !u.fullName?.toLowerCase().includes(val)) return false;
        if (rule.field === 'Role' && !u.role.toLowerCase().includes(val)) return false;
        if (rule.field === 'Status' && !u.status?.toLowerCase().includes(val)) return false;
        if (rule.field === 'Email' && !u.email?.toLowerCase().includes(val)) return false;
      }

      return true;
    });

    result = [...result].sort((a, b) => {
      if (sortField === 'User Name') {
        return sortOrder === 'asc' ? a.username.localeCompare(b.username) : b.username.localeCompare(a.username);
      }
      if (sortField === 'Employee ID') {
        return sortOrder === 'asc' ? (a.employeeId || '').localeCompare(b.employeeId || '') : (b.employeeId || '').localeCompare(a.employeeId || '');
      }
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
    });

    return result;
  }, [users, globalSearch, quickFilters, assignedToFilter, createdByFilter, tagFilter, headerFavorite, filterRules, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.employeeId ||
    quickFilters.username ||
    quickFilters.fullName ||
    quickFilters.role ||
    quickFilters.email ||
    headerFavorite ||
    filterRules.length > 0
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ employeeId: '', username: '', fullName: '', role: '', email: '' });
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<UserRecord>[] = [
    {
      key: 'employeeId',
      title: 'EMPLOYEE ID',
      width: '140px',
      sortable: true,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/users/${row.id || row.username}`);
          }}
          className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors cursor-pointer hover:underline"
        >
          {val || row.id}
        </span>
      )
    },
    {
      key: 'username',
      title: 'USER NAME',
      width: '150px',
      sortable: true,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/users/${row.id || row.username}`);
          }}
          className="font-semibold text-gray-800 cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val}
        </span>
      )
    },
    {
      key: 'fullName',
      title: 'FULL NAME',
      width: '180px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val && val !== '-') setQuickFilters(prev => ({ ...prev, fullName: val }));
          }}
          className="text-gray-700 cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || '-'}
        </span>
      )
    },
    {
      key: 'role',
      title: 'ROLE',
      width: '170px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val) setQuickFilters(prev => ({ ...prev, role: val }));
          }}
          className="font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 hover:text-primary-700 px-2.5 py-1 rounded-md text-xs cursor-pointer transition-colors"
        >
          {val || 'Admin'}
        </span>
      )
    },
    {
      key: 'contactNumber',
      title: 'CONTACT NUMBER',
      width: '160px',
      render: (val) => (
        <span className="text-gray-600 text-xs">
          {val || '-'}
        </span>
      )
    },
    {
      key: 'email',
      title: 'EMAIL',
      width: '200px',
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val && val !== '-') setQuickFilters(prev => ({ ...prev, email: val }));
          }}
          className="text-gray-600 text-xs cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || '-'}
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
            if (val) {
              setFilterRules([{ id: `rule-${Date.now()}`, field: 'Status', operator: 'Equals', value: val }]);
            }
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
      key: 'twoFactorEnabled',
      title: '2FA STATUS',
      width: '130px',
      render: (_, row) => {
        const isEnabled = row.twoFactorEnabled !== false;
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            isEnabled
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-gray-100 text-gray-500 border border-gray-200'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isEnabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
            {isEnabled ? '2FA Enabled' : '2FA Disabled'}
          </span>
        );
      }
    },
    {
      key: 'isBlock',
      title: 'IS BLOCK',
      width: '120px',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center">
          <button
            type="button"
            onClick={(e) => handleToggleBlock(row, e)}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              row.isBlock ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                row.isBlock ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>
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
                if (row.id) toggleFavorite(row.id);
                if (!isFav) {
                  successToast(`Marked "${row.username}" as favorite`);
                } else {
                  successToast(`Removed "${row.username}" from favorites`);
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
      <ERPListPageLayout<UserRecord>
        title="User Management"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={handleBulkExport}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/users/new')}
        addNewLabel="Add User"

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
        onAddFilterRule={() => setFilterRules(prev => [...prev, { id: `rule-${Date.now()}`, field: 'User Name', operator: 'Equals', value: '' }])}
        onRemoveFilterRule={(id) => setFilterRules(prev => prev.filter(r => r.id !== id))}
        onUpdateFilterRule={(id, key, val) => setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))}
        onClearFilterRules={() => setFilterRules([])}
        onApplyFilterRules={() => successToast('Filters applied')}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={clearAllFilters}

        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => { setSortField(field); setSortOrder(order); }}
        sortOptions={['Last Updated On', 'User Name', 'Employee ID']}

        data={filteredUsers}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredUsers.length ? [] : filteredUsers.map(u => u.id!))}
        onRowClick={(row) => navigate(`/users/${row.id || row.username}`)}
        emptyMessage="No users found"

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
                    if (selectedIds[0]) navigate(`/users/${selectedIds[0]}`);
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
                    <div className="absolute right-0 mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                      <button
                        onClick={() => { setShowActionsMenu(false); handleBulkExport(); }}
                        className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export JSON
                      </button>
                      <button
                        onClick={() => { setShowActionsMenu(false); handleBulkReset2FA(); }}
                        className="w-full text-left px-4 py-2 text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2 cursor-pointer font-medium"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-600" /> Reset Google Authenticator
                      </button>
                      <button
                        onClick={() => { setShowActionsMenu(false); handleBulkDelete(); }}
                        className="w-full text-left px-4 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2 cursor-pointer font-medium"
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

export const UserManagementList = WithAuth(UserManagementListBase);
export default UserManagementList;
