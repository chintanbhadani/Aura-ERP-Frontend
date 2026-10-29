import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  fetchProductionOrders, 
  type ProductionOrder 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  FileSpreadsheet 
} from 'lucide-react';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'customerName', placeholder: 'Customer Name', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'city', placeholder: 'City', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' }
];

const FILTER_RULE_FIELDS = ['Status', 'Customer Name', 'City', 'ID'];

const ProductionOrderListBase: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Global & Toolbar Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Last Updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    id: '',
    customerName: searchParams.get('customerName') || searchParams.get('customer') || '',
    status: searchParams.get('status') || '',
    city: ''
  });

  useEffect(() => {
    const custParam = searchParams.get('customerName') || searchParams.get('customer');
    if (custParam !== null && custParam !== undefined) {
      setQuickFilters(prev => ({ ...prev, customerName: custParam }));
    }
  }, [searchParams]);

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchProductionOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch production orders:', err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleQuickFilterChange = (key: string, value: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setQuickFilters({ id: '', customerName: '', status: '', city: '' });
    setFilterRules([]);
  };

  const hasActiveFilters =
    !!globalSearch ||
    !!assignedToFilter ||
    !!createdByFilter ||
    !!tagFilter ||
    filterRules.length > 0 ||
    Object.values(quickFilters).some(v => !!v);

  const filteredOrders = useMemo(() => {
    return orders.filter(po => {
      const displayId = po.orderNumber || po.id;

      // Global Search
      if (globalSearch) {
        const query = globalSearch.toLowerCase();
        const matchId = displayId.toLowerCase().includes(query) || po.id.toLowerCase().includes(query);
        const matchCustomer = (po.customerName || '').toLowerCase().includes(query);
        const matchCity = (po.city || '').toLowerCase().includes(query);
        const matchStatus = (po.status || '').toLowerCase().includes(query);
        const matchPiNo = (po.piNo || '').toLowerCase().includes(query);
        if (!matchId && !matchCustomer && !matchCity && !matchStatus && !matchPiNo) return false;
      }

      // Quick Filters
      if (quickFilters.id) {
        const qId = quickFilters.id.toLowerCase();
        const matchId = displayId.toLowerCase().includes(qId) || po.id.toLowerCase().includes(qId);
        if (!matchId) return false;
      }
      if (quickFilters.customerName) {
        const qCust = quickFilters.customerName.toLowerCase();
        const poCust = (po.customerName || '').toLowerCase();
        const clientIdParam = searchParams.get('clientId');
        const matchClientId = clientIdParam && po.clientId && String(po.clientId) === String(clientIdParam);
        const matchName = poCust.includes(qCust) || (poCust.length > 2 && qCust.includes(poCust));
        if (!matchClientId && !matchName) return false;
      }
      if (quickFilters.status && !(po.status || '').toLowerCase().includes(quickFilters.status.toLowerCase())) return false;
      if (quickFilters.city && !(po.city || '').toLowerCase().includes(quickFilters.city.toLowerCase())) return false;

      // Custom Filter Rules
      for (const rule of filterRules) {
        if (!rule.value) continue;
        let fieldValue = '';
        if (rule.field === 'ID') fieldValue = displayId;
        else if (rule.field === 'Customer Name') fieldValue = po.customerName || '';
        else if (rule.field === 'City') fieldValue = po.city || '';
        else if (rule.field === 'Status') fieldValue = po.status || '';

        const val = rule.value.toLowerCase();
        const fVal = fieldValue.toLowerCase();

        if (rule.operator === 'Equals' && fVal !== val) return false;
        if (rule.operator === 'Contains' && !fVal.includes(val)) return false;
        if (rule.operator === 'Not Equals' && fVal === val) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'ID') {
        const idA = a.orderNumber || a.id;
        const idB = b.orderNumber || b.id;
        comparison = idA.localeCompare(idB);
      } else if (sortField === 'Customer Name') {
        comparison = (a.customerName || '').localeCompare(b.customerName || '');
      } else {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [orders, globalSearch, quickFilters, filterRules, sortField, sortOrder]);

  const columns: ColumnDef<ProductionOrder>[] = [
    {
      key: 'id',
      title: 'Production Order ID',
      render: (_, row: ProductionOrder) => (
        <span 
          className="font-bold text-primary-600 hover:text-primary-800 hover:underline text-sm cursor-pointer"
        >
          {row.orderNumber || row.id}
        </span>
      ),
    },
    {
      key: 'orderSheetDate',
      title: 'Order Date',
      render: (_, row: ProductionOrder) => <span className="text-sm text-gray-700 font-normal">{row.orderSheetDate || '-'}</span>,
    },
    {
      key: 'customerName',
      title: 'Customer Name',
      render: (_, row: ProductionOrder) => (
        <span className="font-semibold text-sm text-gray-900">
          {row.customerName || '-'}
        </span>
      ),
    },
    {
      key: 'city',
      title: 'City / State',
      render: (_, row: ProductionOrder) => (
        <span className="text-sm text-gray-600">
          {[row.city, row.state].filter(Boolean).join(', ') || '-'}
        </span>
      ),
    },
    {
      key: 'customerType',
      title: 'Customer Type',
      render: (_, row: ProductionOrder) => <span className="text-sm text-gray-600">{row.customerType || '-'}</span>,
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row: ProductionOrder) => {
        const st = row.status || 'Draft';
        return (
          <StatusBadge
            status={st}
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, status: st }));
            }}
            title="Click to filter by status"
          />
        );
      },
    },
    {
      key: 'itemsCount',
      title: 'Line Items',
      render: (_, row: ProductionOrder) => <span className="text-sm text-gray-700 font-medium">{row.items?.length || 0} items</span>,
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '240px',
      render: (_, row: ProductionOrder) => {
        const rawDate = row.updatedAt || row.createdAt;
        return (
          <span className="text-xs text-gray-700 font-medium whitespace-nowrap">
            {formatFullDateTime(rawDate)}
          </span>
        );
      },
    },
  ];

  return (
    <ERPListPageLayout
      title="Production Orders"
      data={filteredOrders}
      columns={columns}
      loading={loading}
      selectable={false}
      onRowClick={(row) => navigate(`/production-orders/${row.id}`)}
      onAddNew={() => navigate('/production-orders/new')}
      addNewLabel="Create Production Order"
      searchPlaceholder="Search Production Orders..."
      globalSearch={globalSearch}
      setGlobalSearch={setGlobalSearch}
      quickFilterFields={QUICK_FILTER_FIELDS}
      quickFilters={quickFilters}
      onQuickFilterChange={handleQuickFilterChange}
      filterRuleFields={FILTER_RULE_FIELDS}
      filterRules={filterRules}
      setFilterRules={setFilterRules}
      hasActiveFilters={hasActiveFilters}
      onClearAllFilters={handleClearAllFilters}
      sortField={sortField}
      setSortField={setSortField}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
      viewType={viewType}
      setViewType={setViewType}
      assignedToFilter={assignedToFilter}
      setAssignedToFilter={setAssignedToFilter}
      createdByFilter={createdByFilter}
      setCreatedByFilter={setCreatedByFilter}
      tagFilter={tagFilter}
      setTagFilter={setTagFilter}
      showTags={showTags}
      setShowTags={setShowTags}
      onRefresh={loadData}
    />
  );
};

export const ProductionOrderList = WithAuth(ProductionOrderListBase, ModuleName.PRODUCTION_ORDERS, Permission.LIST);
export default ProductionOrderList;
