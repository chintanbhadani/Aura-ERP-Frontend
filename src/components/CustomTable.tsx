import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight, 
  RefreshCw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';

export interface ColumnDef<T = any> {
  key: string;
  title: string;
  headerRender?: (info: { currentPageCount: number; totalCount: number }) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  render?: (val: any, row: T, index: number) => React.ReactNode;
}

export interface CustomTableProps<T = any> {
  columns: ColumnDef<T>[];
  data: T[];
  loading?: boolean;
  selectable?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (selectedIds: string[]) => void;
  idField?: string;
  rowsPerPageOptions?: number[];
  defaultRowsPerPage?: number;
  emptyText?: string;
  onRowClick?: (row: T) => void;
  headerRightMeta?: React.ReactNode;
  toolbar?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

export function CustomTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  selectable = false,
  selectedIds,
  onSelectionChange,
  idField = 'id',
  rowsPerPageOptions = [10, 20, 50, 100],
  defaultRowsPerPage = 20,
  emptyText = 'No records found',
  onRowClick,
  headerRightMeta,
  toolbar,
  className = '',
  compact = false
}: CustomTableProps<T>) {

  // Internal selection state if uncontrolled
  const [internalSelectedIds, setInternalSelectedIds] = useState<string[]>([]);
  const activeSelectedIds = selectedIds !== undefined ? selectedIds : internalSelectedIds;

  const updateSelection = (ids: string[]) => {
    if (onSelectionChange) {
      onSelectionChange(ids);
    } else {
      setInternalSelectedIds(ids);
    }
  };

  // Internal Sorting State
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Column Resizing State
  const [colWidths, setColWidths] = useState<Record<string, number>>({});
  const resizingRef = useRef<{ key: string; startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = (key: string, e: React.MouseEvent<HTMLDivElement>, currentWidthStr?: string) => {
    e.stopPropagation();
    e.preventDefault();

    const thEl = (e.currentTarget.parentElement as HTMLElement);
    let initialPx = colWidths[key];
    if (!initialPx) {
      if (currentWidthStr && currentWidthStr.endsWith('px')) {
        initialPx = parseInt(currentWidthStr, 10);
      } else if (thEl) {
        initialPx = thEl.getBoundingClientRect().width;
      } else {
        initialPx = 150;
      }
    }

    resizingRef.current = {
      key,
      startX: e.clientX,
      startWidth: initialPx
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const deltaX = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(60, Math.round(resizingRef.current.startWidth + deltaX));

      setColWidths(prev => ({
        ...prev,
        [resizingRef.current!.key]: newWidth
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultRowsPerPage);

  // Reset to Page 1 if data set length changes
  useEffect(() => {
    setCurrentPage(1);
  }, [data.length]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else {
        setSortKey(null);
        setSortDirection('asc');
      }
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const valA = a[sortKey] ?? '';
      const valB = b[sortKey] ?? '';
      if (typeof valA === 'number' && typeof valB === 'number') {
        return sortDirection === 'asc' ? valA - valB : valB - valA;
      }
      const cmp = String(valA).localeCompare(String(valB));
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDirection]);

  // Paginated Slice Calculations
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const currentPageData = useMemo(() => {
    return sortedData.slice(startIndex, endIndex);
  }, [sortedData, startIndex, endIndex]);

  // Selection Handlers
  const isAllCurrentSelected = currentPageData.length > 0 && 
    currentPageData.every(row => activeSelectedIds.includes(String(row[idField])));

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const currentIds = currentPageData.map(r => String(r[idField]));
      const combined = Array.from(new Set([...activeSelectedIds, ...currentIds]));
      updateSelection(combined);
    } else {
      const currentIdsSet = new Set(currentPageData.map(r => String(r[idField])));
      const remaining = activeSelectedIds.filter(id => !currentIdsSet.has(id));
      updateSelection(remaining);
    }
  };

  const handleSelectRow = (id: string, e: React.MouseEvent | React.ChangeEvent) => {
    e.stopPropagation();
    if (activeSelectedIds.includes(id)) {
      updateSelection(activeSelectedIds.filter(i => i !== id));
    } else {
      updateSelection([...activeSelectedIds, id]);
    }
  };

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
    <div className={`w-full flex flex-col bg-white border border-gray-200/80 rounded-2xl shadow-sm relative overflow-visible ${className}`}>
      
      {/* Top Toolbar Slot */}
      {toolbar && (
        <div className="border-b border-gray-200/80 bg-white relative z-20 rounded-t-2xl overflow-visible">
          {toolbar}
        </div>
      )}

      {/* Main Table Scroll Container */}
      <div className="flex-1 overflow-x-auto relative z-10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-200/80 bg-gray-50/70 text-gray-600 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 select-none">
              {selectable && (
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllCurrentSelected}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 cursor-pointer accent-primary-600"
                  />
                </th>
              )}

              {columns.map((col) => {
                const isSorted = sortKey === col.key;
                const colW = colWidths[col.key] ? `${colWidths[col.key]}px` : col.width;
                return (
                  <th
                    key={col.key}
                    style={colW ? { width: colW, minWidth: colW, maxWidth: colW } : undefined}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`py-3 px-4 relative group ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                      col.sortable ? 'cursor-pointer hover:bg-gray-100/80 transition-colors' : ''
                    }`}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}`}>
                      {col.headerRender ? col.headerRender({ currentPageCount: currentPageData.length, totalCount: totalItems }) : <span>{col.title}</span>}
                      {col.sortable && (
                        <span className="text-gray-400">
                          {isSorted ? (
                            sortDirection === 'asc' ? <ArrowUp className="w-3.5 h-3.5 text-primary-600 font-bold" /> : <ArrowDown className="w-3.5 h-3.5 text-primary-600 font-bold" />
                          ) : (
                            <ArrowUpDown className="w-3 h-3 text-gray-400 hover:text-primary-600 transition-colors" />
                          )}
                        </span>
                      )}
                    </div>

                    {/* Resizable Column Handle Divider */}
                    <div
                      onMouseDown={(e) => handleResizeMouseDown(col.key, e, col.width)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 bottom-0 w-3.5 cursor-col-resize flex items-center justify-center z-20 group-hover:bg-gray-200/50 hover:bg-primary-500/20 transition-all"
                      title="Drag to resize column width"
                    >
                      <div className="w-0.5 h-4 bg-gray-300 group-hover:bg-gray-400 hover:bg-primary-600 rounded-full transition-colors" />
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100 text-sm">
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-gray-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-primary-500" />
                  <span className="text-gray-500 font-medium">Loading records...</span>
                </td>
              </tr>
            ) : currentPageData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-12 text-center text-gray-400">
                  {emptyText}
                </td>
              </tr>
            ) : (
              currentPageData.map((row, idx) => {
                const rowId = String(row[idField] || idx);
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

                    {columns.map((col) => {
                      const val = row[col.key];
                      const colW = colWidths[col.key] ? `${colWidths[col.key]}px` : col.width;
                      return (
                        <td
                          key={col.key}
                          style={colW ? { width: colW, minWidth: colW, maxWidth: colW } : undefined}
                          className={`py-3 px-4 overflow-hidden truncate ${
                            col.align === 'right' 
                              ? 'text-right' 
                              : col.align === 'center' 
                              ? 'text-center' 
                              : 'text-left'
                          }`}
                        >
                          {col.render ? col.render(val, row, idx) : (val ?? '-')}
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
      <div className="px-5 py-3.5 border-t border-gray-200/80 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-600 select-none rounded-b-2xl">
        
        {/* Left Stats & Rows Per Page Selector */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-500 font-medium">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-gray-200 hover:border-primary-400 focus:border-primary-600 focus:ring-2 focus:ring-primary-500/20 rounded-lg px-2.5 py-1 text-xs text-gray-700 outline-none cursor-pointer font-semibold transition-all"
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

        {/* Right Navigation Page Controls */}
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            onClick={() => setCurrentPage(1)}
            disabled={validCurrentPage === 1 || loading}
            className="p-1.5 rounded-lg hover:bg-primary-100/70 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
            title="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          {/* Previous Page */}
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={validCurrentPage === 1 || loading}
            className="p-1.5 rounded-lg hover:bg-primary-100/70 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Page Numbers */}
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
                  className={`min-w-[30px] h-7 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
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

          {/* Next Page */}
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={validCurrentPage === totalPages || loading}
            className="p-1.5 rounded-lg hover:bg-primary-100/70 hover:text-primary-700 disabled:opacity-30 disabled:hover:bg-transparent text-gray-600 transition-all cursor-pointer"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Last Page */}
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

    </div>
  );
}
