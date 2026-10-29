import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, ERPBulkImportModal, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchUnits, 
  createUnit, 
  updateUnit, 
  deleteUnit, 
  bulkImportUnits,
  type Unit 
} from '../../services/api';
import { UNIT_IMPORT_COLUMNS, UNIT_IMPORT_SAMPLE_DATA } from './unitImportConfig';
import { successToast, errorToast } from '../../helper/toast';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { TextFieldComponent } from '../../components/input/index';
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
  X 
} from 'lucide-react';
import { formatFullDateTime } from '../../helper/helper';

const unitSchema = Yup.object({
  name: Yup.string().trim().required('Unit name is required')
});

const INITIAL_UNITS: any[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'name', placeholder: 'Unit Name', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['ID', 'Unit Name', 'Status'];

const UnitListBase: React.FC = () => {
  const navigate = useNavigate();
  const reduxToken = useSelector((state: any) => state.auth?.token);
  const token = reduxToken || localStorage.getItem('token') || '';

  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUnit, setEditingUnit] = useState<any | null>(null);

  // Disable / Enable Toggle Dialog State
  const [toggleUnitTarget, setToggleUnitTarget] = useState<any | null>(null);
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
    name: ''
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchUnits();
      setUnits(data || []);
    } catch (err) {
      console.error('Failed to fetch units:', err);
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleOpenAddModal = () => {
    setEditingUnit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (unit: any) => {
    setEditingUnit(unit);
    setIsModalOpen(true);
  };

  const handleSubmitUnit = async (values: { name: string; disabled?: boolean }, { setSubmitting }: any) => {
    try {
      if (editingUnit) {
        await updateUnit(editingUnit.id, values);
        setUnits(prev => prev.map(u => u.id === editingUnit.id ? { ...u, ...values, updatedAt: new Date().toISOString() } : u));
        successToast('Unit updated successfully');
      } else {
        const created = await createUnit(values);
        const newId = String(created?.id || units.length + 1);
        setUnits(prev => [{ id: newId, name: values.name, disabled: values.disabled, assignedTo: 'Administrator', tags: 'CUSTOM', updatedAt: new Date().toISOString() }, ...prev]);
        successToast('Unit created successfully');
      }
      setIsModalOpen(false);
      setEditingUnit(null);
    } catch (err: any) {
      errorToast(err.message || 'Failed to save unit');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!toggleUnitTarget) return;
    setIsToggleLoading(true);
    const nextDisabled = !toggleUnitTarget.disabled;
    try {
      await updateUnit(toggleUnitTarget.id, { disabled: nextDisabled });
      setUnits(prev => prev.map(u => String(u.id) === String(toggleUnitTarget.id) ? { ...u, disabled: nextDisabled, updatedAt: new Date().toISOString() } : u));
      successToast(nextDisabled ? `Disabled "${toggleUnitTarget.name}"` : `Enabled "${toggleUnitTarget.name}"`);
      setToggleUnitTarget(null);
    } catch (err: any) {
      errorToast(err.message || 'Failed to update unit status');
    } finally {
      setIsToggleLoading(false);
    }
  };

  const toggleFavorite = (id: string | number) => {
    const key = String(id);
    setFavorites(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} unit(s)?`)) {
      setUnits(prev => prev.filter(u => !selectedIds.includes(String(u.id))));
      setSelectedIds([]);
      successToast('Deleted selected unit(s)');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one unit to export');
      return;
    }
    const exportData = units.filter(u => selectedIds.includes(String(u.id)));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `units_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} unit(s)`);
  };

  // Filtered & Sorted Units
  const filteredUnits = useMemo(() => {
    let result = [...units];

    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter(u => 
        u.name.toLowerCase().includes(query) ||
        String(u.id).toLowerCase().includes(query)
      );
    }

    if (quickFilters.id) {
      result = result.filter(u => String(u.id).toLowerCase().includes(quickFilters.id.toLowerCase()));
    }
    if (quickFilters.name) {
      result = result.filter(u => u.name.toLowerCase().includes(quickFilters.name.toLowerCase()));
    }

    if (assignedToFilter) {
      result = result.filter(u => u.assignedTo === assignedToFilter);
    }
    if (createdByFilter) {
      result = result.filter(u => u.createdBy === createdByFilter);
    }
    if (tagFilter) {
      result = result.filter(u => u.tags && u.tags.includes(tagFilter));
    }

    if (headerFavorite) {
      result = result.filter(u => favorites[String(u.id)]);
    }

    filterRules.forEach(rule => {
      if (!rule.value.trim()) return;
      const val = rule.value.toLowerCase();
      result = result.filter(u => {
        let fieldVal = '';
        if (rule.field === 'ID') fieldVal = String(u.id || '');
        else if (rule.field === 'Unit Name') fieldVal = u.name || '';
        else if (rule.field === 'Status') fieldVal = u.disabled ? 'Disabled' : 'Enabled';

        fieldVal = fieldVal.toLowerCase();
        if (rule.operator === 'Equals') return fieldVal === val;
        if (rule.operator === 'Not Equals') return fieldVal !== val;
        if (rule.operator === 'Like') return fieldVal.includes(val);
        return true;
      });
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Unit Name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'ID') {
        comparison = (Number(a.id) || 0) - (Number(b.id) || 0);
      } else {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [units, globalSearch, quickFilters, assignedToFilter, createdByFilter, tagFilter, headerFavorite, filterRules, favorites, sortField, sortOrder]);

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

  const clearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ id: '', name: '' });
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setHeaderFavorite(false);
    setFilterRules([]);
    successToast('Filters cleared');
  };

  const columns: ColumnDef<any>[] = [
    {
      key: 'name',
      title: 'Unit Name',
      width: '320px',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col py-0.5">
          <div className="flex items-center gap-2">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                setQuickFilters(prev => ({ ...prev, name: row.name }));
              }}
              className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors cursor-pointer hover:underline"
            >
              {row.name}
            </span>
          </div>
          {showTags && row.tags && (
            <div className="flex flex-wrap gap-1 mt-1">
              {row.tags.split(',').map((tag: string) => (
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
      key: 'id',
      title: 'ID',
      width: '180px',
      sortable: true,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/master/units/${row.id || val}`);
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
              setToggleUnitTarget(row);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              row.disabled ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            title={row.disabled ? 'Click to Enable Unit' : 'Click to Disable Unit'}
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
      <ERPListPageLayout<any>
        title="Unit"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={handleBulkExport}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/master/units/new')}
        addNewLabel="Add Unit"
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
        sortOptions={['Last Updated On', 'Unit Name', 'ID']}

        data={filteredUnits}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredUnits.length ? [] : filteredUnits.map(u => String(u.id)))}
        onRowClick={(row) => navigate(`/master/units/${row.id}`)}
        emptyMessage="No units found"

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
                    const unitToEdit = units.find(u => u.id === selectedIds[0]);
                    if (unitToEdit) handleOpenEditModal(unitToEdit);
                  }}
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
        title="Bulk Import Units"
        entityName="Unit"
        columns={UNIT_IMPORT_COLUMNS}
        sampleData={UNIT_IMPORT_SAMPLE_DATA}
        templateFileName="patel_strap_units_demo_template.xlsx"
        onImport={async (rows) => {
          const res = await bulkImportUnits(rows);
          return res;
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* ADD / EDIT UNIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingUnit ? 'Edit Unit' : 'New Unit'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setEditingUnit(null); }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Formik
              initialValues={{ name: editingUnit ? editingUnit.name : '' }}
              validationSchema={unitSchema}
              onSubmit={handleSubmitUnit}
            >
              {({ isSubmitting }) => (
                <Form className="p-6 space-y-5">
                  <TextFieldComponent
                    label="Unit Name"
                    name="name"
                    placeholder="e.g. Kg, Pcs, Meter"
                    required
                  />

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); setEditingUnit(null); }}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-800 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary-600/20"
                    >
                      {isSubmitting ? 'Saving...' : editingUnit ? 'Update Unit' : 'Create Unit'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
      {/* CONFIRM DISABLE / ENABLE DIALOG */}
      {toggleUnitTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${toggleUnitTarget.disabled ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {toggleUnitTarget.disabled ? <UserPlus className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {toggleUnitTarget.disabled ? 'Enable Unit' : 'Disable Unit'}
                </h3>
                <p className="text-xs text-gray-500">
                  Unit: <span className="font-semibold text-gray-800">{toggleUnitTarget.name}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to {toggleUnitTarget.disabled ? 'enable' : 'disable'}{' '}
              <span className="font-bold text-gray-900">"{toggleUnitTarget.name}"</span>?
              {!toggleUnitTarget.disabled && ' Disabled units can be re-enabled at any time.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={() => setToggleUnitTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                  toggleUnitTarget.disabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {isToggleLoading ? 'Updating...' : toggleUnitTarget.disabled ? 'Confirm Enable' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const UnitList = WithAuth(UnitListBase, ModuleName.UNIT, Permission.LIST);
export default UnitList;
