import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchMaterialRequests, 
  deleteMaterialRequest, 
  type MaterialRequest 
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
  ClipboardList 
} from 'lucide-react';
import { formatFullDateTime } from '../../helper/helper';

const INITIAL_MATERIAL_REQUESTS: MaterialRequest[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'purpose', placeholder: 'Purpose', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'company', placeholder: 'Company', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['Status', 'Purpose', 'Department', 'ID', 'Liked By'];

const MaterialRequestListBase: React.FC = () => {
  const navigate = useNavigate();
  const reduxToken = useSelector((state: any) => state.auth?.token);
  const token = reduxToken || localStorage.getItem('token') || '';

  const [requests, setRequests] = useState<MaterialRequest[]>(INITIAL_MATERIAL_REQUESTS);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);

  // Global & Toolbar Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [purposeFilter, setPurposeFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Last Updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    id: '',
    purpose: '',
    status: '',
    company: ''
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchMaterialRequests();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch material requests:', err);
      setRequests([]);
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
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} request(s)?`)) {
      try {
        await Promise.all(selectedIds.map(id => deleteMaterialRequest(id)));
      } catch (err) {
        console.warn('Backend delete error:', err);
      }
      setRequests(prev => prev.filter(r => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      successToast('Deleted selected request(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one item to export');
      return;
    }
    const exportData = requests.filter(r => selectedIds.includes(r.id));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `material_requests_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} item(s)`);
  };

  // Filtered & Sorted Requests
  const filteredRequests = useMemo(() => {
    let result = [...requests];

    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter(r => 
        r.id.toLowerCase().includes(query) ||
        r.purpose.toLowerCase().includes(query) ||
        (r.department && r.department.toLowerCase().includes(query)) ||
        (r.status && r.status.toLowerCase().includes(query)) ||
        (r.company && r.company.toLowerCase().includes(query))
      );
    }

    if (quickFilters.id) {
      result = result.filter(r => r.id.toLowerCase().includes(quickFilters.id.toLowerCase()));
    }
    if (quickFilters.purpose) {
      result = result.filter(r => r.purpose.toLowerCase().includes(quickFilters.purpose.toLowerCase()));
    }
    if (quickFilters.status) {
      result = result.filter(r => r.status && r.status.toLowerCase().includes(quickFilters.status.toLowerCase()));
    }
    if (quickFilters.company) {
      result = result.filter(r => r.company && r.company.toLowerCase().includes(quickFilters.company.toLowerCase()));
    }

    if (assignedToFilter) {
      result = result.filter(r => r.assignedTo === assignedToFilter);
    }
    if (createdByFilter) {
      result = result.filter(r => r.createdBy === createdByFilter);
    }
    if (purposeFilter) {
      result = result.filter(r => r.purpose === purposeFilter);
    }
    if (tagFilter) {
      result = result.filter(r => r.tags && r.tags.includes(tagFilter));
    }

    if (headerFavorite) {
      result = result.filter(r => favorites[r.id]);
    }

    filterRules.forEach(rule => {
      if (!rule.value.trim()) return;
      const val = rule.value.toLowerCase();
      result = result.filter(r => {
        let fieldVal = '';
        if (rule.field === 'Status') fieldVal = r.status || '';
        else if (rule.field === 'Purpose') fieldVal = r.purpose || '';
        else if (rule.field === 'Department') fieldVal = r.department || '';
        else if (rule.field === 'ID') fieldVal = r.id || '';
        else if (rule.field === 'Liked By') return favorites[r.id];

        fieldVal = fieldVal.toLowerCase();
        if (rule.operator === 'Equals') return fieldVal === val;
        if (rule.operator === 'Not Equals') return fieldVal !== val;
        if (rule.operator === 'Like') return fieldVal.includes(val);
        return true;
      });
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'ID') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'Purpose') {
        comparison = a.purpose.localeCompare(b.purpose);
      } else if (sortField === 'Status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      } else if (sortField === 'Date') {
        comparison = (a.transactionDate || '').localeCompare(b.transactionDate || '');
      } else {
        const dateA = new Date(a.updatedAt || a.transactionDate || 0).getTime();
        const dateB = new Date(b.updatedAt || b.transactionDate || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [requests, globalSearch, quickFilters, assignedToFilter, createdByFilter, purposeFilter, tagFilter, headerFavorite, filterRules, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.id ||
    quickFilters.purpose ||
    quickFilters.status ||
    quickFilters.company ||
    assignedToFilter ||
    createdByFilter ||
    purposeFilter ||
    tagFilter ||
    headerFavorite ||
    filterRules.length > 0
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ id: '', purpose: '', status: '', company: '' });
    setAssignedToFilter('');
    setCreatedByFilter('');
    setPurposeFilter('');
    setTagFilter('');
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<MaterialRequest>[] = [
    {
      key: 'id',
      title: 'Title',
      width: '260px',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col py-0.5">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
              {row.id}
            </span>
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, status: row.status || '' }));
              }}
              className={`px-2 py-0.5 rounded-full text-[11px] font-semibold cursor-pointer ${
                row.status === 'Partially Received' 
                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                  : row.status === 'Received'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : row.status === 'Submitted'
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {row.status}
            </span>
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            {row.purpose} • {row.department}
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
      key: 'purpose',
      title: 'Purpose',
      width: '150px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, purpose: val }));
          }}
          className="uppercase text-gray-600 font-medium cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val}
        </span>
      )
    },
    {
      key: 'department',
      title: 'Department',
      width: '160px',
      sortable: true,
      render: (val) => <span className="text-gray-700 font-medium">{val || '—'}</span>
    },
    {
      key: 'company',
      title: 'Company',
      width: '200px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, company: val }));
          }}
          className="text-gray-700 font-medium cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val}
        </span>
      )
    },
    {
      key: 'requestedQty',
      title: 'Requested Qty',
      width: '140px',
      sortable: true,
      align: 'right',
      render: (_, row) => {
        const totalQty = row.items?.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0) || 0;
        const totalReceived = row.items?.reduce((sum, item) => sum + (Number((item as any).receivedQty) || 0), 0) || 0;
        return (
          <div className="flex flex-col items-end">
            <span className="font-bold text-gray-900 font-mono text-xs">
              {totalQty.toLocaleString()}
            </span>
            {totalReceived > 0 && (
              <span className={`text-[10px] font-mono font-semibold ${totalReceived >= totalQty ? 'text-emerald-600' : 'text-amber-600'}`}>
                Rec: {totalReceived.toLocaleString()}
              </span>
            )}
          </div>
        );
      }
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '240px',
      render: (_, row) => (
        <span className="text-xs text-gray-600 font-mono font-medium">
          {formatFullDateTime(row.updatedAt || row.transactionDate)}
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
        const isFav = favorites[row.id];
        return (
          <div className="flex items-center justify-end gap-3 text-gray-500 text-xs select-none">
            <div className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors" title="Comments">
              <MessageSquare className="w-3 h-3 text-gray-400" />
              <span>0</span>
            </div>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(row.id);
                if (!isFav) {
                  successToast(`Marked "${row.id}" as favorite`);
                } else {
                  successToast(`Removed "${row.id}" from favorites`);
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
    <ERPListPageLayout<MaterialRequest>
      title="Material Request"
      viewType={viewType}
      onViewTypeChange={setViewType}
      loading={loading}
      onRefresh={() => { loadData(); successToast('Data refreshed'); }}
      onExportAll={handleBulkExport}
      onPrint={() => window.print()}
      onAddNew={() => navigate('/material-request/new')}
      addNewLabel="Add Material Request"

      assignedToFilter={assignedToFilter}
      onAssignedToChange={setAssignedToFilter}
      createdByFilter={createdByFilter}
      onCreatedByChange={setCreatedByFilter}
      tagFilter={tagFilter}
      onTagChange={setTagFilter}
      showTags={showTags}
      onShowTagsChange={setShowTags}
      assignedToOptions={['Administrator', 'Nayan Vegad', 'Harsh Thakkar']}

      quickFilters={quickFilters}
      onQuickFilterChange={(key, val) => setQuickFilters(prev => ({ ...prev, [key]: val }))}
      quickFilterFields={QUICK_FILTER_FIELDS}
      filterRules={filterRules}
      filterRuleFields={FILTER_RULE_FIELDS}
      onAddFilterRule={() => setFilterRules(prev => [...prev, { id: `rule-${Date.now()}`, field: 'Status', operator: 'Equals', value: '' }])}
      onRemoveFilterRule={(id) => setFilterRules(prev => prev.filter(r => r.id !== id))}
      onUpdateFilterRule={(id, key, val) => setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))}
      onClearFilterRules={() => setFilterRules([])}
      onApplyFilterRules={() => successToast('Filters applied')}
      hasActiveFilters={hasActiveFilters}
      onClearAllFilters={clearAllFilters}

      sortField={sortField}
      sortOrder={sortOrder}
      onSortChange={(field, order) => { setSortField(field); setSortOrder(order); }}
      sortOptions={['Last Updated', 'ID', 'Purpose', 'Status', 'Date']}

      data={filteredRequests}
      columns={columns}
      selectedIds={selectedIds}
      onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
      onSelectAll={() => setSelectedIds(selectedIds.length === filteredRequests.length ? [] : filteredRequests.map(r => r.id))}
      onRowClick={(row) => navigate(`/material-request/${row.id}`)}
      emptyMessage="No material requests found"

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
                onClick={() => navigate(`/material-request/${selectedIds[0]}`)}
                className="flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 px-3.5 py-1 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-gray-600" />
                <span>Edit</span>
              </button>

              <div className="relative">
                <button
                  onClick={() => setShowActionsMenu(!showActionsMenu)}
                  className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-1 rounded-full text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  <span>Actions</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
                {showActionsMenu && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-xl py-1 z-40 text-xs">
                    <button onClick={() => { handleBulkExport(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer"><FileSpreadsheet className="w-3.5 h-3.5 text-gray-500" /> Export</button>
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
  );
};

export const MaterialRequestList = WithAuth(MaterialRequestListBase, ModuleName.MATERIAL_REQUISITION, Permission.LIST);
export default MaterialRequestList;
