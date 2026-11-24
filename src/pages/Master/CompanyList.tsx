import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, type QuickFilterField } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchCompanies, 
  updateCompany, 
  type Company 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Building2, 
  Star,
  MapPin,
  Phone,
  Mail,
  FileText
} from 'lucide-react';
import { StatusBadge } from '../../components/StatusBadge';
import { formatFullDateTime } from '../../helper/helper';

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'name', placeholder: 'Company Name', className: 'w-44 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'taxId', placeholder: 'Tax ID / TIN', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
];

const FILTER_RULE_FIELDS = ['Company Name', 'Tax ID', 'City', 'Country', 'Status'];

const CompanyListBase: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  const [globalSearch, setGlobalSearch] = useState('');
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Last Updated On');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [quickFilters, setQuickFilters] = useState({ name: '', taxId: '' });
  const [filterRules, setFilterRules] = useState<Array<{ id: string; field: string; operator: string; value: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchCompanies();
      setItems((data || []).map((i: any) => ({ ...i, disabled: i.status === 'Inactive' || Boolean(i.disabled) })));
    } catch (err: any) {
      console.error('Failed to load Companies:', err);
      errorToast('Failed to load Company Master');
    } finally {
      setLoading(false);
    }
  };

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ name: '', taxId: '' });
    setFilterRules([]);
    successToast('Filters reset');
  };

  const handleToggleStatus = async (item: Company) => {
    const nextDisabled = !item.disabled;
    const nextStatus = nextDisabled ? 'Inactive' : 'Active';
    try {
      await updateCompany(item.id, { status: nextStatus, disabled: nextDisabled });
      setItems(prev => prev.map(c => c.id === item.id ? { ...c, disabled: nextDisabled, status: nextStatus, updatedAt: new Date().toISOString() } : c));
      successToast(nextDisabled ? `Disabled "${item.name}"` : `Enabled "${item.name}"`);
    } catch (err: any) {
      console.error('Failed to toggle company status:', err);
      errorToast(err.response?.data?.error || 'Failed to update status');
    }
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) ||
        (item.code || '').toLowerCase().includes(q) ||
        (item.taxId || '').toLowerCase().includes(q) ||
        (item.city || '').toLowerCase().includes(q)
      );
    }

    if (quickFilters.name) {
      const q = quickFilters.name.toLowerCase();
      result = result.filter(item => item.name.toLowerCase().includes(q));
    }

    if (quickFilters.taxId) {
      const q = quickFilters.taxId.toLowerCase();
      result = result.filter(item => (item.taxId || '').toLowerCase().includes(q));
    }

    return result;
  }, [items, globalSearch, quickFilters]);

  const columns: ColumnDef<Company>[] = [
    {
      key: 'name',
      title: 'Company Name',
      width: '280px',
      sortable: true,
      render: (val, row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs shrink-0">
            {row.code || row.name.slice(0, 2).toUpperCase()}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setQuickFilters(prev => ({
                    ...prev,
                    name: prev.name === val ? '' : val
                  }));
                }}
                className="font-bold text-gray-900 hover:text-emerald-700 hover:underline transition-colors cursor-pointer"
                title="Click to filter by Company Name"
              >
                {val}
              </span>
              {row.isDefault && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 border border-amber-300 font-bold text-[10px]">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  Default
                </span>
              )}
            </div>
            {row.code && (
              <span className="text-[11px] text-gray-500 font-mono">
                Code: {row.code}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'taxId',
      title: 'Tax ID / TIN',
      width: '160px',
      sortable: true,
      render: (val) => val ? (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({
              ...prev,
              taxId: prev.taxId === val ? '' : val
            }));
          }}
          className="font-mono text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 border border-transparent px-2 py-0.5 rounded-md cursor-pointer transition-colors"
          title="Click to filter by Tax ID"
        >
          {val}
        </span>
      ) : (
        <span className="text-gray-400 text-xs">-</span>
      )
    },
    {
      key: 'address',
      title: 'Location / City',
      width: '200px',
      render: (_, row) => (
        <div className="flex flex-col text-xs text-gray-600">
          <span className="flex items-center gap-1 truncate font-medium">
            <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
            {row.city || '-'}{row.country ? `, ${row.country}` : ''}
          </span>
          {row.address && (
            <span className="text-[11px] text-gray-400 truncate pl-4">
              {row.address}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'contact',
      title: 'Contact',
      width: '200px',
      render: (_, row) => (
        <div className="flex flex-col text-xs text-gray-600 space-y-0.5">
          {row.phone && (
            <span className="flex items-center gap-1 truncate">
              <Phone className="w-3 h-3 text-gray-400 shrink-0" />
              {row.phone}
            </span>
          )}
          {row.email && (
            <span className="flex items-center gap-1 truncate text-gray-500">
              <Mail className="w-3 h-3 text-gray-400 shrink-0" />
              {row.email}
            </span>
          )}
          {!row.phone && !row.email && <span className="text-gray-400">-</span>}
        </div>
      )
    },
    {
      key: 'invoices',
      title: 'Linked Invoices',
      width: '130px',
      align: 'center',
      render: (_, row) => {
        const count = row._count?.invoices || 0;
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-800 font-mono text-xs font-bold">
            <FileText className="w-3 h-3 text-slate-500" />
            {count}
          </span>
        );
      }
    },
    {
      key: 'statusToggle',
      title: 'DISABLE',
      width: '150px',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleStatus(row);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              row.disabled ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            title={row.disabled ? 'Click to Enable Company' : 'Click to Disable Company'}
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
              handleToggleStatus(row);
            }}
            title={row.disabled ? 'Click to Enable Company' : 'Click to Disable Company'}
          />
        </div>
      )
    },
    {
      key: 'updatedAt',
      title: 'Last Updated',
      width: '180px',
      sortable: true,
      render: (_, row) => (
        <span className="text-xs text-gray-500 font-mono">
          {row.updatedAt ? formatFullDateTime(row.updatedAt) : '-'}
        </span>
      )
    }
  ];

  return (
    <ERPListPageLayout<Company>
      title="Company Master"
      viewType={viewType}
      onViewTypeChange={setViewType}
      loading={loading}
      onRefresh={() => { loadData(); successToast('Company records refreshed'); }}
      onFetchAllRecords={async () => items}
      onPrint={() => window.print()}
      onAddNew={() => navigate('/master/companies/new')}
      addNewLabel="Add Company"
      searchPlaceholder="Search Company by name, code, TIN..."
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      setGlobalSearch={setGlobalSearch}

      quickFilters={quickFilters}
      onQuickFilterChange={(key, val) => setQuickFilters(prev => ({ ...prev, [key]: val }))}
      quickFilterFields={QUICK_FILTER_FIELDS}
      filterRules={filterRules as any}
      filterRuleFields={FILTER_RULE_FIELDS}
      setFilterRules={setFilterRules as any}
      onClearAllFilters={clearAllFilters}

      sortField={sortField}
      setSortField={setSortField}
      sortOrder={sortOrder}
      setSortOrder={setSortOrder}
      sortOptions={['Last Updated On', 'Company Name', 'Code', 'Tax ID']}

      data={filteredItems}
      columns={columns}
      selectedIds={selectedIds}
      onSelectionChange={setSelectedIds}
      onRowClick={(row) => navigate(`/master/companies/${row.id}`)}
      emptyMessage="No companies found"
      onToggleFavorite={(id: string) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
      favorites={favorites}
    />
  );
};

export const CompanyList = WithAuth(CompanyListBase, ModuleName.MASTER_DATA, Permission.LIST);
export default CompanyList;
