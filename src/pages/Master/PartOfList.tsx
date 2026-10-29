import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, ERPBulkImportModal, type QuickFilterField } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchPartOfs, 
  updatePartOf, 
  deletePartOf, 
  bulkImportPartOfs,
  type PartOf 
} from '../../services/api';
import { PART_OF_IMPORT_COLUMNS, PART_OF_IMPORT_SAMPLE_DATA } from './partOfImportConfig';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Heart, 
  MessageSquare, 
  Trash2, 
  Edit3 
} from 'lucide-react';

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'name', placeholder: 'Name', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['ID', 'Name', 'Status'];

const PartOfListBase: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PartOf[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Last Updated On');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  const [quickFilters, setQuickFilters] = useState({ id: '', name: '' });
  const [filterRules, setFilterRules] = useState<Array<{ id: string; field: string; operator: string; value: string }>>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchPartOfs();
      setItems(data || []);
    } catch (err) {
      console.error('Failed to load Part Of entries:', err);
      errorToast('Failed to load Part Of master');
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = (id: string | number) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const clearAllFilters = () => {
    setGlobalSearch('');
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setQuickFilters({ id: '', name: '' });
    setFilterRules([]);
    setHeaderFavorite(false);
    successToast('Filters reset');
  };

  const filteredItems = useMemo(() => {
    let result = [...items];

    if (globalSearch.trim()) {
      const q = globalSearch.toLowerCase().trim();
      result = result.filter(item => 
        item.name.toLowerCase().includes(q) ||
        String(item.id).toLowerCase().includes(q)
      );
    }

    if (quickFilters.id) {
      const qId = quickFilters.id.toLowerCase();
      result = result.filter(item => String(item.id).toLowerCase().includes(qId));
    }
    if (quickFilters.name) {
      result = result.filter(item => item.name.toLowerCase().includes(quickFilters.name.toLowerCase()));
    }

    if (headerFavorite) {
      result = result.filter(item => favorites[item.id]);
    }

    filterRules.forEach(rule => {
      if (!rule.value.trim()) return;
      const val = rule.value.toLowerCase();
      result = result.filter(item => {
        let fieldVal = '';
        if (rule.field === 'ID') fieldVal = String(item.id);
        else if (rule.field === 'Name') fieldVal = item.name || '';
        else if (rule.field === 'Status') fieldVal = item.disabled ? 'Disabled' : 'Enabled';

        fieldVal = fieldVal.toLowerCase();
        if (rule.operator === 'Equals') return fieldVal === val;
        if (rule.operator === 'Not Equals') return fieldVal !== val;
        if (rule.operator === 'Like') return fieldVal.includes(val);
        return true;
      });
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'ID') {
        comparison = String(a.id).localeCompare(String(b.id));
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [items, globalSearch, quickFilters, headerFavorite, filterRules, favorites, sortField, sortOrder]);

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.id ||
    quickFilters.name ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter ||
    headerFavorite ||
    filterRules.length > 0
  );

  const columns: ColumnDef<PartOf>[] = [
    {
      key: 'name',
      title: 'NAME',
      width: '260px',
      sortable: true,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/master/part-of/${row.id}`);
          }}
          className="font-bold text-gray-900 cursor-pointer hover:text-emerald-600 hover:underline"
        >
          {val || row.name}
        </span>
      )
    },
    {
      key: 'id',
      title: 'ID',
      width: '140px',
      sortable: true,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/master/part-of/${row.id}`);
          }}
          className="font-mono font-bold text-gray-800 cursor-pointer hover:text-emerald-600 hover:underline"
        >
          {`PARTOF-${val}`}
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
            onClick={async (e) => {
              e.stopPropagation();
              try {
                await updatePartOf(String(row.id), { disabled: !row.disabled });
                setItems(prev => prev.map(i => i.id === row.id ? { ...i, disabled: !i.disabled } : i));
                successToast(`Part Of ${!row.disabled ? 'disabled' : 'enabled'}`);
              } catch (err) {
                errorToast('Failed to update status');
              }
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              row.disabled ? 'bg-red-500' : 'bg-emerald-500'
            }`}
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
      key: 'meta',
      title: '',
      align: 'right',
      width: '130px',
      render: (_, row) => {
        const isFav = favorites[row.id];
        return (
          <div className="flex items-center justify-end gap-3 text-gray-500 text-xs select-none">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite(row.id);
              }} 
              className="focus:outline-none p-1 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
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
      <ERPListPageLayout<PartOf>
        title="Part Of"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={() => successToast('Exporting Part Of data...')}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/master/part-of/new')}
        addNewLabel="Add Part Of"
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
        sortOptions={['Last Updated On', 'Name', 'ID']}

        data={filteredItems}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredItems.length ? [] : filteredItems.map(c => String(c.id)))}
        onRowClick={(row) => navigate(`/master/part-of/${row.id}`)}
        emptyMessage="No Part Of records found"

        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}
      />

      {/* BULK IMPORT PART OF MODAL */}
      <ERPBulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Bulk Import Part Of"
        entityName="Part Of"
        columns={PART_OF_IMPORT_COLUMNS}
        sampleData={PART_OF_IMPORT_SAMPLE_DATA}
        templateFileName="patel_strap_part_of_demo_template.xlsx"
        onImport={async (rows) => {
          const res = await bulkImportPartOfs(rows);
          return res;
        }}
        onSuccess={() => {
          loadData();
        }}
      />
    </>
  );
};

export const PartOfList = WithAuth(PartOfListBase, ModuleName.PART_OF, Permission.LIST);
export default PartOfList;
