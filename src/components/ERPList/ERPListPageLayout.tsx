import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { CustomTable, type ColumnDef } from '../CustomTable';
import { ERPPageHeader, type ERPPageHeaderProps } from './ERPPageHeader';
import { ERPFilterSidebar, type ERPFilterSidebarProps } from './ERPFilterSidebar';
import { ERPToolbar, type QuickFilterField } from './ERPToolbar';
import { ERPFilterModal, type FilterRule } from './ERPFilterModal';

export interface ERPListPageLayoutProps<T extends Record<string, any> = any> {
  title: string;
  searchPlaceholder?: string;
  // View type
  viewType?: string;
  setViewType?: (type: string) => void;
  onViewTypeChange?: (type: string) => void;
  viewTypeOptions?: string[];
  loading?: boolean;
  onRefresh?: () => void;
  onExportAll?: () => void;
  onPrint?: () => void;
  onAddNew?: () => void;
  addNewLabel?: string;
  onImport?: () => void;
  importLabel?: string;
  extraHeaderActions?: React.ReactNode;

  // Sidebar Filter Props
  assignedToFilter?: string;
  setAssignedToFilter?: (val: string) => void;
  onAssignedToChange?: (val: string) => void;
  createdByFilter?: string;
  setCreatedByFilter?: (val: string) => void;
  onCreatedByChange?: (val: string) => void;
  tagFilter?: string;
  setTagFilter?: (val: string) => void;
  onTagChange?: (val: string) => void;
  showTags?: boolean;
  setShowTags?: (val: boolean) => void;
  onShowTagsChange?: (val: boolean) => void;
  assignedToOptions?: string[];
  createdByOptions?: string[];
  tagOptions?: string[];
  customSidebarItems?: React.ReactNode;
  actionsMenu?: React.ReactNode;

  // Toolbar & Filtering Props
  quickFilters?: Record<string, string>;
  onQuickFilterChange?: (key: string, value: string) => void;
  quickFilterFields?: QuickFilterField[];
  filterRules?: FilterRule[];
  filterRuleFields?: string[];
  setFilterRules?: React.Dispatch<React.SetStateAction<FilterRule[]>> | ((rules: FilterRule[]) => void);
  onAddFilterRule?: () => void;
  onRemoveFilterRule?: (id: string) => void;
  onUpdateFilterRule?: (id: string, key: keyof FilterRule, val: string) => void;
  onClearFilterRules?: () => void;
  onApplyFilterRules?: () => void;
  hasActiveFilters?: boolean;
  onClearAllFilters?: () => void;

  // Sorting
  sortField?: string;
  setSortField?: (field: string) => void;
  sortOrder?: 'asc' | 'desc';
  setSortOrder?: (order: 'asc' | 'desc') => void;
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  sortOptions?: string[];

  // Table Props
  data: T[];
  columns: ColumnDef<T>[];
  selectedIds?: string[];
  setSelectedIds?: (selectedIds: string[]) => void;
  onSelectRow?: (id: string) => void;
  onSelectAll?: () => void;
  onSelectionChange?: (selectedIds: string[]) => void;
  bulkActions?: React.ReactNode;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  emptyMessage?: string;

  // Global Search
  globalSearch?: string;
  onGlobalSearchChange?: (val: string) => void;
  setGlobalSearch?: (val: string) => void;

  // Favorites & Children
  topContent?: React.ReactNode;
  children?: React.ReactNode;
  onToggleFavorite?: (id: string) => void;
  favorites?: Record<string, boolean>;
}

export function ERPListPageLayout<T extends Record<string, any> = any>({
  title,
  viewType,
  setViewType,
  onViewTypeChange,
  viewTypeOptions,
  loading = false,
  onRefresh,
  onExportAll,
  onPrint,
  onAddNew,
  addNewLabel,
  onImport,
  importLabel,
  extraHeaderActions,

  assignedToFilter = '',
  onAssignedToChange = () => {},
  createdByFilter = '',
  onCreatedByChange = () => {},
  tagFilter = '',
  onTagChange = () => {},
  showTags = false,
  onShowTagsChange = () => {},
  assignedToOptions = [],
  createdByOptions = [],
  tagOptions = [],
  customSidebarItems,

  quickFilters = {},
  onQuickFilterChange = () => {},
  quickFilterFields = [],
  filterRules = [],
  filterRuleFields = [],
  onAddFilterRule = () => {},
  onRemoveFilterRule = () => {},
  onUpdateFilterRule = () => {},
  onClearFilterRules = () => {},
  onApplyFilterRules = () => {},
  hasActiveFilters = false,
  onClearAllFilters = () => {},

  sortField,
  sortOrder,
  onSortChange,
  sortOptions,

  data,
  columns,
  selectedIds = [],
  setSelectedIds,
  onSelectRow,
  onSelectAll,
  onSelectionChange,
  bulkActions,
  onRowClick,
  selectable = false,
  emptyMessage = 'No records found',

  globalSearch = '',
  onGlobalSearchChange,
  setGlobalSearch,
  topContent,
  children
}: ERPListPageLayoutProps<T>) {
  const [showSidebar, setShowSidebar] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);

  // ⌘+K shortcut to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowSidebar(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSelectionChange = (ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    }
  };

  const computedHasActiveFilters = hasActiveFilters !== undefined
    ? hasActiveFilters
    : Boolean(
        (globalSearch && globalSearch.trim()) ||
        (quickFilters && Object.values(quickFilters).some(val => Boolean(val && String(val).trim()))) ||
        (filterRules && filterRules.length > 0) ||
        (assignedToFilter && assignedToFilter.trim()) ||
        (createdByFilter && createdByFilter.trim()) ||
        (tagFilter && tagFilter.trim())
      );

  return (
    <DashboardLayout searchValue={globalSearch} onSearchChange={onGlobalSearchChange}>
      <div className="flex flex-col h-full bg-white text-gray-800 font-sans">
        {/* HEADER BAR */}
        <ERPPageHeader
          title={title}
          showSidebar={showSidebar}
          onToggleSidebar={() => setShowSidebar(prev => !prev)}
          viewType={viewType}
          onViewTypeChange={onViewTypeChange}
          viewTypeOptions={viewTypeOptions}
          loading={loading}
          onRefresh={onRefresh}
          onExportAll={onExportAll}
          onPrint={onPrint}
          onAddNew={onAddNew}
          addNewLabel={addNewLabel}
          onImport={onImport}
          importLabel={importLabel}
          extraActions={extraHeaderActions}
        />

        {/* MAIN BODY (SIDEBAR + CONTENT) */}
        <div className="flex flex-1 overflow-visible relative z-10">
          {/* SIDEBAR */}
          {showSidebar && (
            <ERPFilterSidebar
              assignedToFilter={assignedToFilter}
              onAssignedToChange={onAssignedToChange}
              createdByFilter={createdByFilter}
              onCreatedByChange={onCreatedByChange}
              tagFilter={tagFilter}
              onTagChange={onTagChange}
              showTags={showTags}
              onShowTagsChange={onShowTagsChange}
              assignedToOptions={assignedToOptions}
              createdByOptions={createdByOptions}
              tagOptions={tagOptions}
            >
              {customSidebarItems}
            </ERPFilterSidebar>
          )}

          {/* MAIN CONTENT AREA */}
          <div className="flex-1 flex flex-col min-w-0 bg-white p-4 space-y-4 overflow-y-auto">
            {topContent}
            <CustomTable<T>
              data={data}
              columns={columns}
              loading={loading}
              selectable={selectable}
              selectedIds={selectedIds}
              onSelectionChange={handleSelectionChange}
              onRowClick={onRowClick}
              emptyText={emptyMessage}
              toolbar={
                selectable && selectedIds.length > 0 ? (
                  bulkActions
                ) : (
                  <ERPToolbar
                    quickFilters={quickFilters}
                    onQuickFilterChange={onQuickFilterChange}
                    quickFilterFields={quickFilterFields}
                    filterRules={filterRules}
                    onOpenFilterModal={() => setShowFilterModal(true)}
                    hasActiveFilters={computedHasActiveFilters}
                    onClearAllFilters={onClearAllFilters}
                    sortField={sortField}
                    sortOrder={sortOrder}
                    onSortChange={onSortChange}
                    sortOptions={sortOptions}
                  />
                )
              }
            />
            {children}
          </div>
        </div>

        {/* ADVANCED FILTER BUILDER MODAL */}
        <ERPFilterModal
          isOpen={showFilterModal}
          onClose={() => setShowFilterModal(false)}
          filterRules={filterRules}
          fieldOptions={filterRuleFields}
          onAddRule={onAddFilterRule}
          onRemoveRule={onRemoveFilterRule}
          onUpdateRule={onUpdateFilterRule}
          onClearRules={onClearFilterRules}
          onApplyRules={() => {
            onApplyFilterRules();
            setShowFilterModal(false);
          }}
        />
      </div>
    </DashboardLayout>
  );
}
