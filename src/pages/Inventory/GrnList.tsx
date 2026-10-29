import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchGrns, 
  acceptGrn, 
  deleteGrn, 
  getSupplierName,
  type GrnRecord 
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
  CheckCircle2, 
  Eye, 
  Package 
} from 'lucide-react';
import { GrnPrintModal } from '../../components/GrnPrintModal';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';

const INITIAL_GRNS: GrnRecord[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'grnNumber', placeholder: 'GRN Number' },
  { key: 'supplier', placeholder: 'Supplier Name' },
  { key: 'status', placeholder: 'Status' },
  { key: 'supplierInvoiceNumber', placeholder: 'Invoice No.' },
  { key: 'company', placeholder: 'Company' }
];

const FILTER_RULE_FIELDS = [
  'GRN Number',
  'Supplier',
  'Status',
  'Invoice Number',
  'Warehouse',
  'Posting Date'
];

function GrnListBase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [grns, setGrns] = useState<GrnRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [selectedGrnForPrint, setSelectedGrnForPrint] = useState<GrnRecord | null>(null);

  // Global & Toolbar Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Posting Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    grnNumber: '',
    supplier: searchParams.get('supplier') || searchParams.get('supplierName') || '',
    status: '',
    supplierInvoiceNumber: '',
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

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchGrns();
      setGrns(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setGrns([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) {
      errorToast('Select GRNs to delete');
      return;
    }
    if (!window.confirm(`Delete ${selectedIds.length} selected GRNs?`)) return;

    try {
      await Promise.all(selectedIds.map(id => deleteGrn(id)));
      setGrns(prev => prev.filter(g => !selectedIds.includes(g.id)));
      setSelectedIds([]);
      successToast('Selected GRNs deleted');
    } catch (err) {
      errorToast('Failed to delete GRNs');
    }
  };

  const handleAcceptRecord = async (grn: GrnRecord) => {
    try {
      await acceptGrn(grn.id);
      setGrns(prev => prev.map(g => g.id === grn.id ? { ...g, status: 'ACCEPTED' } : g));
      successToast(`GRN "${grn.grnNumber || grn.id}" accepted and stock added to inventory!`);
    } catch (e) {
      errorToast('Failed to accept GRN');
    }
  };

  const clearAllFilters = () => {
    setGlobalSearch('');
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setQuickFilters({
      grnNumber: '',
      supplier: '',
      status: '',
      supplierInvoiceNumber: '',
      company: ''
    });
    setFilterRules([]);
  };

  const hasActiveFilters = Boolean(
    globalSearch ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter ||
    Object.values(quickFilters).some(Boolean) ||
    filterRules.length > 0
  );

  const filteredData = grns.filter(item => {
    const suppName = getSupplierName(item.supplier);
    if (globalSearch) {
      const q = globalSearch.toLowerCase();
      const matchSearch =
        (item.grnNumber || '').toLowerCase().includes(q) ||
        suppName.toLowerCase().includes(q) ||
        (item.supplierInvoiceNumber || '').toLowerCase().includes(q) ||
        (item.company || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    if (quickFilters.grnNumber && !(item.grnNumber || '').toLowerCase().includes(quickFilters.grnNumber.toLowerCase())) return false;
    if (quickFilters.supplier && !suppName.toLowerCase().includes(quickFilters.supplier.toLowerCase())) return false;
    if (quickFilters.status && item.status !== quickFilters.status) return false;
    if (quickFilters.supplierInvoiceNumber && !(item.supplierInvoiceNumber || '').toLowerCase().includes(quickFilters.supplierInvoiceNumber.toLowerCase())) return false;
    if (quickFilters.company && !(item.company || '').toLowerCase().includes(quickFilters.company.toLowerCase())) return false;

    return true;
  });

  const columns: ColumnDef<GrnRecord>[] = [
    {
      key: 'grnNumber',
      title: 'GRN Number',
      width: '180px',
      render: (_, row) => (
        <div>
          <span 
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/grn/${row.id}`);
            }}
            className="font-bold text-emerald-800 hover:text-emerald-900 hover:underline cursor-pointer"
          >
            {row.grnNumber || row.id}
          </span>
          <p className="text-[11px] text-gray-500">{row.series}</p>
        </div>
      )
    },
    {
      key: 'supplier',
      title: 'Supplier',
      width: '220px',
      render: (_, row) => {
        const sName = getSupplierName(row.supplier) || 'AURA INDUSTRIAL';
        return (
          <div>
            <span className="font-bold text-gray-900">{sName}</span>
            <p className="text-[11px] text-gray-500">Inv #: {row.supplierInvoiceNumber || '-'}</p>
          </div>
        );
      }
    },
    {
      key: 'postingDate',
      title: 'Posting Date & Time',
      width: '160px',
      render: (_, row) => (
        <span className="text-gray-700 font-medium">
          {row.postingDate} {row.postingTime ? `• ${row.postingTime}` : ''}
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      width: '130px',
      render: (_, row) => {
        const st = row.status || 'Draft';
        let style = 'bg-amber-50 text-amber-800 border-amber-200';
        if (st === 'ACCEPTED') style = 'bg-emerald-50 text-emerald-800 border-emerald-200';
        else if (st === 'REJECTED') style = 'bg-rose-50 text-rose-800 border-rose-200';

        return (
          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border inline-block ${style}`}>
            {st}
          </span>
        );
      }
    },
    {
      key: 'acceptedWarehouse',
      title: 'Warehouse',
      width: '160px',
      render: (_, row) => (
        <span className="text-gray-700 font-semibold">{row.acceptedWarehouse || 'Main Store - Aura'}</span>
      )
    },
    {
      key: 'acceptedQty',
      title: 'Accepted Qty',
      width: '130px',
      render: (_, row) => {
        const qty = row.totalQuantity ?? row.items?.reduce((sum, item) => sum + (Number(item.acceptedQuantity || (item as any).orderedQuantity || (item as any).quantity) || 0), 0) ?? 0;
        return (
          <span className="font-bold text-gray-900">
            {qty}
          </span>
        );
      }
    },
    {
      key: 'totalAmount',
      title: 'Total Amount',
      width: '150px',
      render: (_, row) => {
        const total = row.totalAmount || row.items?.reduce((sum, item) => sum + (item.amount || ((item.acceptedQuantity || 0) * (item.rate || 0))), 0) || 0;
        return (
          <span className="font-bold text-gray-900">
            ₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
        );
      }
    },
    {
      key: 'actions',
      title: 'Actions',
      width: '130px',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-2 text-gray-500 text-xs">
          {row.status !== 'ACCEPTED' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAcceptRecord(row);
              }}
              className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
              title="Accept Stock into Inventory"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Accept</span>
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedGrnForPrint(row);
            }}
            className="p-1 hover:bg-emerald-50 text-gray-400 hover:text-emerald-600 rounded-full transition-colors cursor-pointer"
            title="Print / Export GRN PDF"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/grn/${row.id}`);
            }}
            className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-700 rounded-full transition-colors cursor-pointer"
            title="Edit GRN"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ERPListPageLayout<GrnRecord>
        title="Goods Receipt Note (GRN)"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={() => successToast('Exported GRNs')}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/grn/new')}
        addNewLabel="Add GRN"

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
        sortOptions={['Posting Date', 'GRN Number', 'Supplier', 'Status']}

        data={filteredData}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredData.length ? [] : filteredData.map(r => r.id))}
        onRowClick={(row) => navigate(`/grn/${row.id}`)}
        emptyMessage="No Goods Receipt Notes found"

        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}

        bulkActions={
          selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-3 py-1 rounded-full">
                {selectedIds.length} Selected
              </span>

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
                    <button onClick={() => { handleBulkDelete(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2 font-medium cursor-pointer"><Trash2 className="w-3.5 h-3.5 text-red-600" /> Delete</button>
                  </div>
                )}
              </div>
            </div>
          )
        }
      />

      {/* GRN Print & PDF Modal */}
      {selectedGrnForPrint && (
        <GrnPrintModal
          isOpen={Boolean(selectedGrnForPrint)}
          onClose={() => setSelectedGrnForPrint(null)}
          grn={selectedGrnForPrint}
        />
      )}
    </>
  );
}

export const GrnList = WithAuth(GrnListBase, ModuleName.GRN, Permission.LIST);
export default GrnList;
