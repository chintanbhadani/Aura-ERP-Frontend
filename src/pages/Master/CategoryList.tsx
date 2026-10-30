import React, { useEffect, useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { ERPListPageLayout, ERPBulkImportModal, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchCategories, 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  bulkImportCategories,
  type Category 
} from '../../services/api';
import { CATEGORY_IMPORT_COLUMNS, CATEGORY_IMPORT_SAMPLE_DATA } from './categoryImportConfig';
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

const categorySchema = Yup.object({
  name: Yup.string().trim().required('Category name is required'),
  disabled: Yup.boolean()
});

const INITIAL_CATEGORIES: any[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'name', placeholder: 'Category Name', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['ID', 'Category Name', 'Status'];

const CategoryListBase: React.FC = () => {
  const navigate = useNavigate();
  const reduxToken = useSelector((state: any) => state.auth?.token);
  const token = reduxToken || localStorage.getItem('token') || '';

  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [headerFavorite, setHeaderFavorite] = useState(false);

  // Form Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);

  // Disable / Enable Toggle Dialog State
  const [toggleCategoryTarget, setToggleCategoryTarget] = useState<any | null>(null);
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
      const data = await fetchCategories();
      setCategories(data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: any) => {
    setEditingCategory(cat);
    setIsModalOpen(true);
  };

  const handleSubmitCategory = async (values: { name: string; disabled: boolean }, { setSubmitting }: any) => {
    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, values);
        setCategories(prev => prev.map(c => c.id === editingCategory.id ? { ...c, ...values, updatedAt: new Date().toISOString() } : c));
        successToast('Category updated successfully');
      } else {
        const created = await createCategory(values);
        const newId = String(created?.id || categories.length + 1);
        setCategories(prev => [{ id: newId, displayId: newId, name: values.name, disabled: values.disabled, assignedTo: 'Administrator', tags: 'CUSTOM', updatedAt: new Date().toISOString() }, ...prev]);
        successToast('Category created successfully');
      }
      setIsModalOpen(false);
      setEditingCategory(null);
    } catch (err: any) {
      errorToast(err.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmToggleStatus = async () => {
    if (!toggleCategoryTarget) return;
    setIsToggleLoading(true);
    const nextDisabled = !toggleCategoryTarget.disabled;
    try {
      await updateCategory(toggleCategoryTarget.id, { disabled: nextDisabled });
      setCategories(prev => prev.map(c => String(c.id) === String(toggleCategoryTarget.id) ? { ...c, disabled: nextDisabled, updatedAt: new Date().toISOString() } : c));
      successToast(nextDisabled ? `Disabled "${toggleCategoryTarget.name}"` : `Enabled "${toggleCategoryTarget.name}"`);
      setToggleCategoryTarget(null);
    } catch (err: any) {
      errorToast(err.message || 'Failed to update category status');
    } finally {
      setIsToggleLoading(false);
    }
  };

  const handleBulkDisable = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => updateCategory(id, { disabled: true })));
      setCategories(prev => prev.map(c => selectedIds.includes(String(c.id)) ? { ...c, disabled: true, updatedAt: new Date().toISOString() } : c));
      setSelectedIds([]);
      successToast('Disabled selected category/categories');
    } catch (err: any) {
      errorToast(err.message || 'Failed to disable categories');
    }
  };

  const handleBulkEnable = async () => {
    if (selectedIds.length === 0) return;
    try {
      await Promise.all(selectedIds.map(id => updateCategory(id, { disabled: false })));
      setCategories(prev => prev.map(c => selectedIds.includes(String(c.id)) ? { ...c, disabled: false, updatedAt: new Date().toISOString() } : c));
      setSelectedIds([]);
      successToast('Enabled selected category/categories');
    } catch (err: any) {
      errorToast(err.message || 'Failed to enable categories');
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} category/categories?`)) {
      setCategories(prev => prev.filter(c => !selectedIds.includes(c.id)));
      setSelectedIds([]);
      successToast('Deleted selected category/categories');
    }
  };

  const handleBulkExport = () => {
    if (selectedIds.length === 0) {
      errorToast('Please select at least one category to export');
      return;
    }
    const exportData = categories.filter(c => selectedIds.includes(c.id));
    const jsonStr = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(exportData, null, 2))}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonStr);
    downloadAnchor.setAttribute('download', `categories_export_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    successToast(`Exported ${exportData.length} category/categories`);
  };

  // Filtered & Sorted Categories
  const filteredCategories = useMemo(() => {
    let result = categories.map((cat, idx) => ({
      ...cat,
      displayId: cat.displayId || String(idx + 1)
    }));

    if (globalSearch.trim()) {
      const query = globalSearch.toLowerCase();
      result = result.filter(c => 
        c.name.toLowerCase().includes(query) ||
        (c.displayId && c.displayId.toLowerCase().includes(query)) ||
        (c.id && String(c.id).toLowerCase().includes(query))
      );
    }

    if (quickFilters.id) {
      const qId = quickFilters.id.toLowerCase();
      result = result.filter(c => 
        (c.displayId && c.displayId.toLowerCase().includes(qId)) ||
        (c.id && String(c.id).toLowerCase().includes(qId))
      );
    }
    if (quickFilters.name) {
      result = result.filter(c => c.name.toLowerCase().includes(quickFilters.name.toLowerCase()));
    }

    if (assignedToFilter) {
      result = result.filter(c => c.assignedTo === assignedToFilter);
    }
    if (createdByFilter) {
      result = result.filter(c => c.createdBy === createdByFilter);
    }
    if (tagFilter) {
      result = result.filter(c => c.tags && c.tags.includes(tagFilter));
    }

    if (headerFavorite) {
      result = result.filter(c => favorites[c.id]);
    }

    filterRules.forEach(rule => {
      if (!rule.value.trim()) return;
      const val = rule.value.toLowerCase();
      result = result.filter(c => {
        let fieldVal = '';
        if (rule.field === 'ID') fieldVal = c.displayId || String(c.id) || '';
        else if (rule.field === 'Category Name') fieldVal = c.name || '';
        else if (rule.field === 'Status') fieldVal = c.disabled ? 'Disabled' : 'Enabled';

        fieldVal = fieldVal.toLowerCase();
        if (rule.operator === 'Equals') return fieldVal === val;
        if (rule.operator === 'Not Equals') return fieldVal !== val;
        if (rule.operator === 'Like') return fieldVal.includes(val);
        return true;
      });
    });

    result.sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Category Name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortField === 'ID') {
        comparison = (a.displayId || String(a.id)).localeCompare(b.displayId || String(b.id));
      } else {
        const dateA = new Date(a.updatedAt || 0).getTime();
        const dateB = new Date(b.updatedAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [categories, globalSearch, quickFilters, assignedToFilter, createdByFilter, tagFilter, headerFavorite, filterRules, favorites, sortField, sortOrder]);

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
      title: 'Item Group Name',
      width: '320px',
      sortable: true,
      render: (_, row) => (
        <div className="flex flex-col py-0.5">
          <div className="flex items-center gap-2">
            <span 
              onClick={(e) => {
                e.stopPropagation();
                if (row.name) setQuickFilters(prev => ({ ...prev, name: row.name }));
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
      key: 'displayId',
      title: 'ID',
      width: '180px',
      sortable: true,
      render: (val, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/master/categories/${row.id}`);
          }}
          className="font-mono font-bold text-gray-800 cursor-pointer hover:text-primary-600 hover:underline"
        >
          {val || row.displayId || row.id}
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
              setToggleCategoryTarget(row);
            }}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
              row.disabled ? 'bg-red-500' : 'bg-emerald-500'
            }`}
            title={row.disabled ? 'Click to Enable Category' : 'Click to Disable Category'}
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
    }
  ];

  return (
    <>
      <ERPListPageLayout<any>
        title="Item Group"
        viewType={viewType}
        onViewTypeChange={setViewType}
        loading={loading}
        onRefresh={() => { loadData(); successToast('Data refreshed'); }}
        onExportAll={handleBulkExport}
        onPrint={() => window.print()}
        onAddNew={() => navigate('/master/categories/new')}
        addNewLabel="Add Item Group"
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
        sortOptions={['Last Updated On', 'Category Name', 'ID']}

        data={filteredCategories}
        columns={columns}
        selectedIds={selectedIds}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredCategories.length ? [] : filteredCategories.map(c => c.id))}
        onRowClick={(row) => navigate(`/master/categories/${row.id}`)}
        emptyMessage="No item groups found"

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
                    const catToEdit = categories.find(c => c.id === selectedIds[0]);
                    if (catToEdit) handleOpenEditModal(catToEdit);
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
                      <button onClick={() => { handleBulkDisable(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-amber-700 font-medium"><UserX className="w-3.5 h-3.5 text-amber-600" /> Disable</button>
                      <button onClick={() => { handleBulkEnable(); setShowActionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center gap-2 cursor-pointer text-emerald-700 font-medium"><UserPlus className="w-3.5 h-3.5 text-emerald-600" /> Enable</button>
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

      {/* BULK IMPORT CATEGORIES MODAL */}
      <ERPBulkImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        title="Bulk Import Item Groups"
        entityName="Item Group"
        columns={CATEGORY_IMPORT_COLUMNS}
        sampleData={CATEGORY_IMPORT_SAMPLE_DATA}
        templateFileName="patel_strap_item_groups_demo_template.xlsx"
        onImport={async (rows) => {
          const res = await bulkImportCategories(rows);
          return res;
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* ADD / EDIT CATEGORY MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editingCategory ? 'Edit Item Group' : 'New Item Group'}
              </h2>
              <button
                onClick={() => { setIsModalOpen(false); setEditingCategory(null); }}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <Formik
              initialValues={{ 
                name: editingCategory ? editingCategory.name : '',
                disabled: editingCategory ? Boolean(editingCategory.disabled) : false
              }}
              validationSchema={categorySchema}
              onSubmit={handleSubmitCategory}
            >
              {({ isSubmitting, values, handleChange }) => (
                <Form className="p-6 space-y-5">
                  <TextFieldComponent
                    label="Item Group Name"
                    name="name"
                    placeholder="e.g. TOOLS, HARDWARE, RAW MATERIAL"
                    required
                  />

                  <div className="flex items-center gap-2.5 pt-1">
                    <input
                      type="checkbox"
                      id="disabled"
                      name="disabled"
                      checked={values.disabled}
                      onChange={handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="disabled" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                      Disable Item Group
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={() => { setIsModalOpen(false); setEditingCategory(null); }}
                      className="text-xs font-semibold text-gray-600 hover:text-gray-800 px-4 py-2 rounded-xl transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-primary-600/20"
                    >
                      {isSubmitting ? 'Saving...' : editingCategory ? 'Update Category' : 'Create Category'}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      )}
      {/* CONFIRM DISABLE / ENABLE DIALOG */}
      {toggleCategoryTarget && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-[110] p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 mb-4">
              <div className={`p-3 rounded-2xl ${toggleCategoryTarget.disabled ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}>
                {toggleCategoryTarget.disabled ? <UserPlus className="w-6 h-6" /> : <UserX className="w-6 h-6" />}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  {toggleCategoryTarget.disabled ? 'Enable Category' : 'Disable Category'}
                </h3>
                <p className="text-xs text-gray-500">
                  Category: <span className="font-semibold text-gray-800">{toggleCategoryTarget.name}</span>
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-6 leading-relaxed">
              Are you sure you want to {toggleCategoryTarget.disabled ? 'enable' : 'disable'}{' '}
              <span className="font-bold text-gray-900">"{toggleCategoryTarget.name}"</span>?
              {!toggleCategoryTarget.disabled && ' Disabled categories can be re-enabled at any time.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={() => setToggleCategoryTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isToggleLoading}
                onClick={handleConfirmToggleStatus}
                className={`px-5 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                  toggleCategoryTarget.disabled
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                    : 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                }`}
              >
                {isToggleLoading ? 'Updating...' : toggleCategoryTarget.disabled ? 'Confirm Enable' : 'Confirm Disable'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const CategoryList = WithAuth(CategoryListBase, ModuleName.CATEGORY, Permission.LIST);
export default CategoryList;
