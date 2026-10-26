import React, { useState } from 'react';
import { Filter } from 'lucide-react';
import { Skeleton } from '@mui/material';

export interface ColumnDef {
  key: string;
  title: string;
  width?: string;
  render?: (val: any, row: any) => React.ReactNode;
  filterable?: boolean;
  filterType?: 'text' | 'select';
}

interface CompactTableProps {
  columns: ColumnDef[];
  data: any[];
  onFilterChange?: (filters: Record<string, string>) => void;
  renderActions?: (row: any) => React.ReactNode;
  /** Optional footer: map of column key → React node to render in the summary row */
  footer?: Record<string, React.ReactNode>;
  loading?: boolean;
  selectable?: boolean;
}

export function CompactTable({ columns, data, onFilterChange, renderActions, footer, loading, selectable = false }: CompactTableProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set());
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filter data based on active column filters
  const filteredData = data.filter((row) => {
    return Object.entries(filters).every(([key, value]) => {
      if (!value || !value.trim()) return true;
      const searchStr = value.toLowerCase().trim();
      
      if (key === 'entity' || key === 'partyName') {
        const partyName = row.type === 'SALES'
          ? (row.client?.companyName || row.client?.name || row.customer?.name || '')
          : (row.supplier?.name || row.supplier?.companyName || '');
        return partyName.toLowerCase().includes(searchStr);
      }
      
      const rawVal = row[key];
      if (rawVal === undefined || rawVal === null) return false;
      return String(rawVal).toLowerCase().includes(searchStr);
    });
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = filteredData.slice(startIndex, endIndex);

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCurrentPage(1);
    onFilterChange?.(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
    onFilterChange?.({});
  };

  const toggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedRows(new Set(filteredData.map(d => d.id)));
    } else {
      setSelectedRows(new Set());
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedRows);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedRows(newSet);
  };

  const hasFilterableColumns = columns.some(col => col.filterable);

  return (
    <div className="w-full flex flex-col overflow-hidden bg-white">
      {/* Inline Filters Bar */}
      {hasFilterableColumns && (
        <div className="flex items-center gap-2 p-3 bg-white border-b border-gray-100 overflow-x-auto">
          {columns.map(col => {
            if (!col.filterable) return null;
            return (
              <div key={col.key} className="shrink-0" style={{ width: col.width || '150px' }}>
                <input
                  type="text"
                  placeholder={col.title}
                  value={filters[col.key] || ''}
                  onChange={(e) => handleFilterChange(col.key, e.target.value)}
                  className="w-full bg-gray-50/50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary-500/20 focus:border-primary-500 transition-all outline-none placeholder:text-gray-400"
                />
              </div>
            );
          })}
          <div className="flex-1 min-w-4"></div>
          {/* Right side filter actions */}
          <div className="flex items-center gap-2 shrink-0 pr-2">
            <button 
               onClick={clearFilters}
               className="flex items-center gap-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-medium px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
               <Filter className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-gray-600">
          <thead className="bg-gray-50/50 text-gray-700 text-sm font-medium border-y border-gray-200">
            <tr>
              {selectable && (
                <th className="px-4 py-2.5 w-10 text-center">
                  <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    onChange={toggleSelectAll}
                    checked={filteredData.length > 0 && selectedRows.size === filteredData.length}
                  />
                </th>
              )}
              {columns.map(col => (
                <th key={col.key} className="px-4 py-2.5 whitespace-nowrap" style={{ width: col.width }}>
                  {col.title}
                </th>
              ))}
              {renderActions && (
                <th className="px-4 py-2.5 w-24 text-right font-normal text-gray-500">
                   ACTIONS
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`skeleton-${idx}`}>
                  {selectable && (
                    <td className="px-4 py-3 text-center">
                      <Skeleton variant="rectangular" width={16} height={16} sx={{ borderRadius: '4px', mx: 'auto' }} />
                    </td>
                  )}
                  {columns.map(col => (
                    <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                      <Skeleton variant="text" width={col.key === 'totalAmount' || col.key === 'invoiceNumber' ? '60%' : '80%'} height={22} />
                    </td>
                  ))}
                  {renderActions && (
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Skeleton variant="circular" width={20} height={20} sx={{ ml: 'auto' }} />
                    </td>
                  )}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0) + (renderActions ? 1 : 0)} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No records found.
                </td>
              </tr>
            ) : paginatedData.map((row, idx) => (
              <tr key={row.id || idx} className="hover:bg-gray-50/80 transition-colors group">
                {selectable && (
                  <td className="px-4 py-2.5 text-center">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 opacity-50 group-hover:opacity-100 transition-opacity cursor-pointer"
                      checked={selectedRows.has(row.id)}
                      onChange={() => toggleSelectRow(row.id)}
                    />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-2.5 whitespace-nowrap text-[13px] text-gray-800">
                    {col.render ? col.render(row[col.key], row) : row[col.key]}
                  </td>
                ))}
                {renderActions && (
                  <td className="px-4 py-2.5 text-right whitespace-nowrap flex items-center justify-end gap-3">
                    {renderActions(row)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>

          {/* Summary Footer Row */}
          {footer && (
            <tfoot>
              <tr className="bg-gray-50 border-t-2 border-gray-200">
                {/* checkbox column spacer */}
                {selectable && <td className="px-4 py-3 w-10" />}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 whitespace-nowrap text-[13px] font-semibold text-gray-900"
                  >
                    {footer[col.key] ?? null}
                  </td>
                ))}
                {/* actions column spacer */}
                {renderActions && <td className="px-4 py-3 w-24" />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      
      {/* Pagination Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>Rows per page:</span>
          <select 
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="bg-transparent border-none font-medium text-gray-700 focus:ring-0 cursor-pointer outline-none"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
        <div className="flex items-center gap-4">
          <span>
            {filteredData.length === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, filteredData.length)} of {filteredData.length}
          </span>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium text-gray-700"
            >
              Prev
            </button>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-colors font-medium text-gray-700"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
