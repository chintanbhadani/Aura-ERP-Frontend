import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  fetchPurchaseOrders, 
  deletePurchaseOrder, 
  type PurchaseOrder 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Heart, 
  MessageSquare, 
  ChevronDown, 
  FileSpreadsheet, 
  Printer, 
  Trash2, 
  Edit3 
} from 'lucide-react';
import { PurchaseOrderPrintModal } from '../../components/PurchaseOrderPrintModal';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';

const INITIAL_POS: PurchaseOrder[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'supplier', placeholder: 'Supplier', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'company', placeholder: 'Company', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['Status', 'Supplier', 'Company', 'ID', 'Liked By'];

const PurchaseOrderListBase: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reduxToken = useSelector((state: any) => state.auth?.token);
  const token = reduxToken || localStorage.getItem('token') || '';

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState<PurchaseOrder | null>(null);

  // Global & Toolbar Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Last Updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    id: '',
    supplier: searchParams.get('supplier') || searchParams.get('supplierName') || '',
    status: '',
    company: ''
  });

  useEffect(() => {
    const supp = searchParams.get('supplier') || searchParams.get('supplierName');
    if (supp !== null && supp !== undefined) {
      setQuickFilters(prev => ({ ...prev, supplier: supp }));
    }
  }, [searchParams]);

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchPurchaseOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch purchase orders:', err);
      setOrders([]);
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
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} order(s)?`)) {
      try {
        await Promise.all(selectedIds.map(id => deletePurchaseOrder(id)));
      } catch (err) {
        console.warn('Backend delete error:', err);
      }
      setOrders(prev => prev.filter(r => !selectedIds.includes(r.id)));
      setSelectedIds([]);
      successToast('Deleted selected purchase order(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one order to export');
      return;
    }
    const exportData = orders.filter(r => selectedIds.includes(r.id));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `purchase_orders_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} order(s)`);
  };

  // Filtered & Sorted Orders
  const filteredOrders = useMemo(() => {
    let result = [...orders];

    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter(r => 
        r.id.toLowerCase().includes(query) ||
        (r.supplier && r.supplier.toLowerCase().includes(query)) ||
        (r.status && r.status.toLowerCase().includes(query)) ||
        (r.company && r.company.toLowerCase().includes(query))
      );
    }

    if (quickFilters.id) {
      result = result.filter(r => r.id.toLowerCase().includes(quickFilters.id.toLowerCase()));
    }
    if (quickFilters.supplier) {
      result = result.filter(r => r.supplier && r.supplier.toLowerCase().includes(quickFilters.supplier.toLowerCase()));
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

    if (headerFavorite) {
      result = result.filter(r => favorites[r.id]);
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'ID') {
        comparison = a.id.localeCompare(b.id);
      } else if (sortField === 'Supplier') {
        comparison = (a.supplier || '').localeCompare(b.supplier || '');
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
  }, [orders, globalSearch, quickFilters, assignedToFilter, createdByFilter, headerFavorite, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.id ||
    quickFilters.supplier ||
    quickFilters.status ||
    quickFilters.company ||
    assignedToFilter ||
    createdByFilter ||
    headerFavorite ||
    filterRules.length > 0
  );

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ id: '', supplier: '', status: '', company: '' });
    setAssignedToFilter('');
    setCreatedByFilter('');
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<PurchaseOrder>[] = [
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
            <StatusBadge
              status={row.status || 'Draft'}
              size="xs"
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, status: row.status || '' }));
              }}
              title="Click to filter by status"
            />
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            Supplier: {row.supplier || '—'}
          </span>
        </div>
      )
    },
    {
      key: 'supplier',
      title: 'Supplier',
      width: '200px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, supplier: val }));
          }}
          className="uppercase text-gray-700 font-bold cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || '—'}
        </span>
      )
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
      key: 'totalAmount',
      title: 'Total Amount',
      width: '150px',
      render: (_, row) => {
        const total = row.items?.reduce((sum, item) => sum + (item.amount || ((item.quantity || 0) * (item.rate || 0))), 0) || 0;
        return (
          <span className="font-bold text-gray-900">
            {row.currency || 'INR'} {total.toLocaleString()}
          </span>
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
      width: '110px',
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
                setSelectedOrderForPrint(row);
              }}
              className="focus:outline-none p-1 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-full transition-colors cursor-pointer"
              title="Print / Export GST PDF Invoice"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
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
    <>
      <ERPListPageLayout<PurchaseOrder>
      title="Purchase Order"
      viewType={viewType}
      onViewTypeChange={setViewType}
      loading={loading}
      onRefresh={() => { loadData(); successToast('Data refreshed'); }}
      onExportAll={handleBulkExport}
      onPrint={() => window.print()}
      onAddNew={() => navigate('/purchase-order/new')}
      addNewLabel="Add Purchase Order"

      assignedToFilter={assignedToFilter}
      onAssignedToChange={setAssignedToFilter}
      createdByFilter={createdByFilter}
      onCreatedByChange={setCreatedByFilter}
      tagFilter={tagFilter}
      onTagChange={setTagFilter}
      showTags={showTags}
      onShowTagsChange={setShowTags}
      assignedToOptions={['Administrator', 'Harsh Thakkar', 'System User']}

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
      sortOptions={['Last Updated', 'ID', 'Supplier', 'Status', 'Date']}

      data={filteredOrders}
      columns={columns}
      selectedIds={selectedIds}
      onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
      onSelectAll={() => setSelectedIds(selectedIds.length === filteredOrders.length ? [] : filteredOrders.map(r => r.id))}
      onRowClick={(row) => navigate(`/purchase-order/${row.id}`)}
      emptyMessage="No purchase orders found"

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
                onClick={() => navigate(`/purchase-order/${selectedIds[0]}`)}
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

      {/* Purchase Order GST Print & PDF Modal */}
      {selectedOrderForPrint && (
        <PurchaseOrderPrintModal
          isOpen={Boolean(selectedOrderForPrint)}
          onClose={() => setSelectedOrderForPrint(null)}
          order={selectedOrderForPrint}
        />
      )}
    </>
  );
};

export const PurchaseOrderList = WithAuth(PurchaseOrderListBase, ModuleName.PURCHASE_ORDERS, Permission.LIST);
export default PurchaseOrderList;
