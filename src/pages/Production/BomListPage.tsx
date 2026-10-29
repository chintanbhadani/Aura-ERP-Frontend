import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  Eye, 
  Layers
} from 'lucide-react';
import { successToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';
import { 
  type BomRecord, 
  type BomRawMaterialItem, 
  type RawMaterialOption,
  getStoredBoms
} from './bomStorage';

// Re-export types for backward compatibility across components
export type { BomRecord, BomRawMaterialItem, RawMaterialOption };

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'bomNumber', placeholder: 'BOM Number', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'finishedGoodName', placeholder: 'Finished Good', className: 'w-44 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' }
];

const FILTER_RULE_FIELDS = ['Status', 'Finished Good', 'BOM Number'];

const BomListPageBase: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [boms, setBoms] = useState<BomRecord[]>(() => getStoredBoms());
  const [loading, setLoading] = useState(false);

  // Layout & Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Last Updated');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [quickFilters, setQuickFilters] = useState({
    bomNumber: '',
    finishedGoodName: '',
    status: ''
  });

  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [viewingBom, setViewingBom] = useState<BomRecord | null>(null);

  // Always refresh BOM list from storage on route navigation, custom event, or storage change
  const syncBoms = useCallback(() => {
    setLoading(true);
    const fresh = getStoredBoms();
    setBoms(fresh);
    setLoading(false);
  }, []);

  useEffect(() => {
    syncBoms();
    const handleUpdate = () => syncBoms();
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('patel_erp_boms_updated', handleUpdate);
    window.addEventListener('focus', handleUpdate);
    return () => {
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('patel_erp_boms_updated', handleUpdate);
      window.removeEventListener('focus', handleUpdate);
    };
  }, [location.key, syncBoms]);

  const handleQuickFilterChange = (key: string, value: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ bomNumber: '', finishedGoodName: '', status: '' });
    setFilterRules([]);
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
  };

  // Filtered & Sorted BOM Records
  const filteredBoms = useMemo(() => {
    return boms.filter(bom => {
      if (globalSearch) {
        const query = globalSearch.toLowerCase();
        const matchesGlobal = 
          (bom.bomNumber || '').toLowerCase().includes(query) ||
          (bom.finishedGoodName || '').toLowerCase().includes(query) ||
          (bom.finishedGoodSku || '').toLowerCase().includes(query);
        if (!matchesGlobal) return false;
      }

      if (quickFilters.bomNumber && !(bom.bomNumber || '').toLowerCase().includes(quickFilters.bomNumber.toLowerCase())) {
        return false;
      }
      if (quickFilters.finishedGoodName) {
        const query = quickFilters.finishedGoodName.toLowerCase();
        const fgNameMatches = (bom.finishedGoodName || '').toLowerCase().includes(query);
        const fgSkuMatches = (bom.finishedGoodSku || '').toLowerCase().includes(query);
        if (!fgNameMatches && !fgSkuMatches) return false;
      }
      if (quickFilters.status && !(bom.status || '').toLowerCase().includes(quickFilters.status.toLowerCase())) {
        return false;
      }

      if (filterRules.length > 0) {
        const matchesRules = filterRules.every(rule => {
          if (!rule.field || !rule.value) return true;
          const expected = rule.value.toLowerCase();

          if (rule.field === 'Finished Good') {
            const fgName = (bom.finishedGoodName || '').toLowerCase();
            const fgSku = (bom.finishedGoodSku || '').toLowerCase();

            if (rule.operator === 'equals') return fgName === expected || fgSku === expected;
            if (rule.operator === 'contains') return fgName.includes(expected) || fgSku.includes(expected);
            if (rule.operator === 'starts_with') return fgName.startsWith(expected) || fgSku.startsWith(expected);
            return true;
          }

          let val = '';
          if (rule.field === 'BOM Number') val = bom.bomNumber || '';
          if (rule.field === 'Status') val = bom.status || '';

          const target = val.toLowerCase();

          if (rule.operator === 'equals') return target === expected;
          if (rule.operator === 'contains') return target.includes(expected);
          if (rule.operator === 'starts_with') return target.startsWith(expected);
          return true;
        });
        if (!matchesRules) return false;
      }

      return true;
    }).sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      if (sortField === 'BOM Number') return (a.bomNumber || '').localeCompare(b.bomNumber || '') * modifier;
      if (sortField === 'Finished Good') return (a.finishedGoodName || '').localeCompare(b.finishedGoodName || '') * modifier;
      if (sortField === 'Total Cost') return ((a.totalCost || 0) - (b.totalCost || 0)) * modifier;

      // Default: Last Updated (most recently updated/created record first when sortOrder is 'desc')
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
      if (timeA !== timeB) {
        return (timeA - timeB) * modifier;
      }
      return (a.id || '').localeCompare(b.id || '') * modifier;
    });
  }, [boms, globalSearch, quickFilters, filterRules, sortField, sortOrder]);

  const hasActiveFilters = useMemo(() => {
    return Boolean(
      (globalSearch && globalSearch.trim()) ||
      (quickFilters.bomNumber && quickFilters.bomNumber.trim()) ||
      (quickFilters.finishedGoodName && quickFilters.finishedGoodName.trim()) ||
      (quickFilters.status && quickFilters.status.trim()) ||
      (assignedToFilter && assignedToFilter.trim()) ||
      (createdByFilter && createdByFilter.trim()) ||
      (tagFilter && tagFilter.trim()) ||
      filterRules.length > 0
    );
  }, [globalSearch, quickFilters, assignedToFilter, createdByFilter, tagFilter, filterRules]);

  // Reusable ERPListPageLayout Columns
  const columns: ColumnDef<BomRecord>[] = [
    {
      key: 'bomNumber',
      title: 'BOM NUMBER',
      render: (_, row: BomRecord) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/bom/${row.id}`);
          }}
          className="font-extrabold text-sm text-emerald-700 hover:underline cursor-pointer"
        >
          {row.bomNumber}
        </span>
      ),
    },
    {
      key: 'finishedGoodName',
      title: 'FINISHED GOOD / SKU',
      render: (_, row: BomRecord) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({
              ...prev,
              finishedGoodName: row.finishedGoodName
            }));
          }}
          className="cursor-pointer group/fg inline-block"
          title="Click to filter by this Finished Good"
        >
          <span className="font-bold text-sm text-gray-900 group-hover/fg:text-emerald-700 group-hover/fg:underline transition-colors">
            {row.finishedGoodName}
          </span>
          {row.finishedGoodSku && (
            <div className="text-[11px] text-gray-400 font-mono group-hover/fg:text-emerald-600">
              {row.finishedGoodSku}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'batchQuantity',
      title: 'BATCH SIZE',
      render: (_, row: BomRecord) => (
        <span className="text-sm font-semibold text-gray-800">
          {row.batchQuantity.toLocaleString()} {row.uom}
        </span>
      ),
    },
    {
      key: 'items',
      title: 'RAW MATERIALS',
      render: (_, row: BomRecord) => (
        <span className="px-2.5 py-0.5 bg-gray-100 text-gray-700 font-bold rounded-md text-xs border border-gray-200">
          {row.items.length} Materials
        </span>
      ),
    },
    {
      key: 'totalCost',
      title: 'TOTAL BATCH COST',
      render: (_, row: BomRecord) => (
        <span className="font-black text-sm text-gray-900">
          ₹{row.totalCost.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'costPerUnit',
      title: 'COST PER UNIT',
      render: (_, row: BomRecord) => (
        <span className="font-extrabold text-sm text-emerald-800">
          ₹{row.costPerUnit} / {row.uom}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'STATUS',
      render: (_, row: BomRecord) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, status: row.status }));
          }}
          className="cursor-pointer inline-block"
          title="Click to filter by status"
        >
          <StatusBadge status={row.status} />
        </div>
      ),
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '240px',
      render: (_, row: BomRecord) => {
        const rawDate = row.updatedAt || row.createdAt;
        return (
          <span className="text-xs font-mono font-medium text-gray-700">
            {formatFullDateTime(rawDate)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      title: '',
      width: '45px',
      render: (_, row: BomRecord) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setViewingBom(row);
            }}
            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
            title="View BOM Breakdown"
          >
            <Eye className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ERPListPageLayout<BomRecord>
        title="Bill of Materials (BOM)"
        data={filteredBoms}
        columns={columns}
        loading={loading}
        selectable={false}
        onRowClick={(row) => navigate(`/bom/${row.id}`)}
        onAddNew={() => navigate('/bom/new')}
        addNewLabel="Create BOM Recipe"
        searchPlaceholder="Search BOM Number, Finished Good..."
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
        sortOrder={sortOrder}
        onSortChange={(field, order) => {
          setSortField(field);
          setSortOrder(order);
        }}
        sortOptions={['Last Updated', 'BOM Number', 'Finished Good', 'Total Cost']}
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
        onRefresh={syncBoms}
      />
      {viewingBom && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-gray-900">{viewingBom.finishedGoodName}</h3>
                  <p className="text-xs text-emerald-700 font-bold">{viewingBom.bomNumber} • Batch Size: {viewingBom.batchQuantity} {viewingBom.uom}</p>
                </div>
              </div>
              <button onClick={() => setViewingBom(null)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <h4 className="font-bold text-gray-900">Raw Material Composition List:</h4>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 text-[10px] font-black text-gray-500 uppercase">
                    <tr>
                      <th className="px-3 py-2">Material Item</th>
                      <th className="px-3 py-2 text-right">Qty Required</th>
                      <th className="px-3 py-2 text-right">Unit Rate</th>
                      <th className="px-3 py-2 text-right">Total Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {viewingBom.items.map(it => (
                      <tr key={it.id}>
                        <td className="px-3 py-2 font-bold text-gray-900">{it.itemName} <span className="text-[10px] text-gray-400 font-mono">({it.itemCode})</span></td>
                        <td className="px-3 py-2 text-right font-extrabold text-gray-800">{it.quantity} {it.uom}</td>
                        <td className="px-3 py-2 text-right font-semibold text-gray-700">₹{it.unitCost}</td>
                        <td className="px-3 py-2 text-right font-black text-emerald-800">₹{it.totalCost.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-emerald-50 p-3 rounded-xl flex items-center justify-between text-xs font-bold text-emerald-950">
                <span>Total Recipe Batch Cost:</span>
                <span className="text-base font-black text-emerald-900">₹{viewingBom.totalCost.toLocaleString()} (₹{viewingBom.costPerUnit} / {viewingBom.uom})</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingBom(null)}
                className="px-5 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const BomListPage = WithAuth(BomListPageBase, ModuleName.BOM, Permission.LIST);
export default BomListPage;
