import React, { useState, useEffect, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox
} from 'lucide-react';

export interface ColumnDef<T = any> {
  header?: string;
  title?: string;
  renderHeader?: (info?: { currentPageCount: number; totalCount: number }) => React.ReactNode;
  headerRender?: (info?: { currentPageCount: number; totalCount: number }) => React.ReactNode;
  accessorKey?: keyof T | string;
  key?: string;
  id?: string;
  cell?: (info: { row: T; getValue: () => any; index: number }) => React.ReactNode;
  render?: (val: any, row: T, index: number) => React.ReactNode;
  className?: string;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
}

export interface DataTableProps<T = any> {
  data: T[];
  columns: ColumnDef<T>[];
  className?: string;
  /** If true, built-in pagination controls are shown. Defaults to true. */
  paginate?: boolean;
  /** Default rows per page when paginate is true. Defaults to 10. */
  defaultPageSize?: number;
  rowsPerPageOptions?: number[];
  loading?: boolean;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  idField?: string;
  toolbar?: React.ReactNode;
  compact?: boolean;
}

export function DataTable<T extends Record<string, any>>({
  data = [],
  columns = [],
  className = '',
  paginate = true,
  defaultPageSize = 10,
  rowsPerPageOptions = [10, 20, 50, 100],
  loading = false,
  emptyText = 'No records found',
  onRowClick,
  selectable = false,
  selectedIds,
  onSelectionChange,
  idField = 'id',
  toolbar,
  compact = false
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(defaultPageSize);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);

  const activeSelectedIds = selectedIds !== undefined ? selectedIds : internalSelectedIds;

  // Reset to page 1 whenever data length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  // Handle Sort
  const handleSort = (colKey: string) => {
    if (sortCol === colKey) {
      if (sortDir === 'asc') setSortDir('desc');
      else {
        setSortCol(null);
        setSortDir('asc');
      }
    } else {
      setSortCol(colKey);
      setSortDir('asc');
    }
  };

  // Sorted Data
  const sortedData = useMemo(() => {
    if (!sortCol) return data;
    return [...data].sort((a, b) => {
      const aVal = a[sortCol];
      const bVal = b[sortCol];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const factor = sortDir === 'asc' ? 1 : -1;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return (aVal - bVal) * factor;
      }
      return String(aVal).localeCompare(String(bVal)) * factor;
    });
  }, [data, sortCol, sortDir]);

  // Pagination Calculations
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (validCurrentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);

  const displayData = paginate
    ? sortedData.slice(startIndex, endIndex)
    : sortedData;

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    let next: string[] = [];
    if (e.target.checked) {
      const pageIds = displayData.map((row, idx) => String(row[idField] || idx));
      next = Array.from(new Set([...activeSelectedIds, ...pageIds]));
    } else {
      const pageIdSet = new Set(displayData.map((row, idx) => String(row[idField] || idx)));
      next = activeSelectedIds.filter(id => !pageIdSet.has(id));
    }
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelectedIds(next);
  };

  const handleSelectRow = (rowId: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    let next: string[];
    if (activeSelectedIds.includes(rowId)) {
      next = activeSelectedIds.filter(id => id !== rowId);
    } else {
      next = [...activeSelectedIds, rowId];
    }
    if (onSelectionChange) onSelectionChange(next);
    else setInternalSelectedIds(next);
  };

  const isAllCurrentSelected =
    displayData.length > 0 &&
    displayData.every((row, idx) => activeSelectedIds.includes(String(row[idField] || idx)));

  const isSomeCurrentSelected =
    displayData.some((row, idx) => activeSelectedIds.includes(String(row[idField] || idx))) &&
    !isAllCurrentSelected;

  // Pagination helper: generates visible page buttons
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (validCurrentPage > 3) pages.push('...');
      const start = Math.max(2, validCurrentPage - 1);
      const end = Math.min(totalPages - 1, validCurrentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (validCurrentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, validCurrentPage]);

  return (
    <div className={`w-full flex flex-col bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden ${className}`}>
      
      {/* TOOLBAR SLOT */}
      {toolbar && (
        <div className="p-4 border-b border-gray-100 bg-white">
          {toolbar}
        </div>
      )}

      {/* TABLE ELEMENT */}
      <div className="w-full overflow-x-auto min-h-[220px]">
        <table className="w-full text-left border-collapse min-w-full">
          <thead>
            <tr className="border-b border-gray-200/80 bg-gray-50/75 text-[11px] font-bold text-gray-500 uppercase tracking-wider select-none">
              {selectable && (
                <th className="py-3 px-4 text-center w-10">
                  <input
                    type="checkbox"
                    checked={isAllCurrentSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isSomeCurrentSelected;
                    }}
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-600"
                  />
                </th>
              )}

              {columns.map((col, index) => {
                const colKey = String(col.id || col.key || (col.accessorKey as string) || index);
                const colTitle = col.header || col.title || '';
                const isSorted = sortCol === colKey;
                const canSort = col.sortable !== false && (Boolean(col.accessorKey) || Boolean(col.key) || Boolean(col.id));

                return (
                  <th
                    key={colKey}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => canSort && handleSort(colKey)}
                    className={`py-3.5 px-4 text-xs font-semibold text-gray-600 tracking-wide ${
                      col.align === 'right' 
                        ? 'text-right' 
                        : col.align === 'center' 
                        ? 'text-center' 
                        : 'text-left'
                    } ${canSort ? 'cursor-pointer hover:bg-gray-100/70 transition-colors' : ''} ${col.className || ''}`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${
                      col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                    }`}>
                      {col.renderHeader 
                        ? col.renderHeader({ currentPageCount: displayData.length, totalCount: totalItems }) 
                        : col.headerRender 
                        ? col.headerRender({ currentPageCount: displayData.length, totalCount: totalItems }) 
                        : colTitle}

                      {canSort && (
                        <span className="text-gray-400">
                          {isSorted ? (
                            sortDir === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-primary-600" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-primary-600" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-30 hover:opacity-100 transition-opacity" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-16 text-center text-gray-400">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2.5 text-primary-600" />
                  <span className="text-gray-500 font-medium text-sm">Loading records...</span>
                </td>
              </tr>
            ) : displayData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-16 text-center text-gray-400">
                  <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 mx-auto mb-3 border border-gray-100 shadow-xs">
                    <Inbox className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-semibold text-gray-800">{emptyText}</p>
                  <p className="text-xs text-gray-400 mt-1">Try adjusting your search or active filters</p>
                </td>
              </tr>
            ) : (
              displayData.map((row, rowIndex) => {
                const rowId = String(row[idField] || rowIndex);
                const isSelected = activeSelectedIds.includes(rowId);

                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`hover:bg-primary-50/30 transition-all ${
                      isSelected ? 'bg-primary-50/50 border-l-2 border-l-primary-600' : ''
                    } ${onRowClick ? 'cursor-pointer' : ''}`}
                  >
                    {selectable && (
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectRow(rowId, e)}
                          className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-600"
                        />
                      </td>
                    )}

                    {columns.map((col, colIndex) => {
                      const colKey = String(col.id || col.key || (col.accessorKey as string) || colIndex);
                      const rawVal = col.accessorKey 
                        ? row[col.accessorKey] 
                        : col.key 
                        ? row[col.key] 
                        : undefined;

                      return (
                        <td
                          key={colKey}
                          style={col.width ? { width: col.width } : undefined}
                          className={`${compact ? 'py-2.5 px-3' : 'py-3.5 px-4'} text-sm text-gray-700 ${
                            col.align === 'right' 
                              ? 'text-right' 
                              : col.align === 'center' 
                              ? 'text-center' 
                              : 'text-left'
                          } ${col.className || ''}`}
                        >
                          {col.cell
                            ? col.cell({ row, getValue: () => rawVal, index: rowIndex })
                            : col.render
                            ? col.render(rawVal, row, rowIndex)
                            : (rawVal ?? '-')}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER PAGINATION BAR */}
      {paginate && (
        <div className="px-5 py-3.5 border-t border-gray-200/80 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 select-none">
          
          {/* Left: Rows Per Page & Counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 font-medium">Rows per page:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-gray-200 hover:border-primary-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none cursor-pointer font-semibold transition-all shadow-2xs"
              >
                {rowsPerPageOptions.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            </div>

            <span className="text-gray-500 font-medium">
              {totalItems > 0 ? (
                <>
                  Showing <span className="font-bold text-gray-900">{startIndex + 1}</span> to{' '}
                  <span className="font-bold text-gray-900">{endIndex}</span> of{' '}
                  <span className="font-bold text-gray-900">{totalItems}</span> items
                </>
              ) : (
                '0 items'
              )}
            </span>
          </div>

          {/* Right: Chevrons & Page Number Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={validCurrentPage === 1 || loading}
              className="p-1.5 rounded-lg hover:bg-primary-100/70 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={validCurrentPage === 1 || loading}
              className="p-1.5 rounded-lg hover:bg-primary-100/70 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-1 mx-1">
              {pageNumbers.map((p, i) => {
                if (typeof p === 'string') {
                  return (
                    <span key={`ellipsis-${i}`} className="px-1.5 text-gray-400">
                      ...
                    </span>
                  );
                }
                const isActive = p === validCurrentPage;
                return (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-xs font-bold'
                        : 'hover:bg-primary-50 text-gray-700 hover:text-primary-700'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={validCurrentPage === totalPages || loading}
              className="p-1.5 rounded-lg hover:bg-primary-100/70 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={validCurrentPage === totalPages || loading}
              className="p-1.5 rounded-lg hover:bg-primary-100/70 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>

        </div>
      )}

    </div>
  );
}

export default DataTable;
