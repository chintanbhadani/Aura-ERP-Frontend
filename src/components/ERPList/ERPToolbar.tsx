import React, { useState, useRef, useEffect } from 'react';
import { Filter as FilterIcon, X, ArrowUpDown } from 'lucide-react';
import type { FilterRule } from './ERPFilterModal';

export interface QuickFilterField {
  key: string;
  placeholder: string;
  className?: string;
  type?: string;
  label?: string;
}

export interface ERPToolbarProps {
  quickFilters: Record<string, string>;
  onQuickFilterChange: (key: string, value: string) => void;
  quickFilterFields: QuickFilterField[];
  filterRules: FilterRule[];
  onOpenFilterModal: () => void;
  hasActiveFilters: boolean;
  onClearAllFilters: () => void;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  onSortChange?: (field: string, order: 'asc' | 'desc') => void;
  sortOptions?: string[];
}

export const ERPToolbar: React.FC<ERPToolbarProps> = ({
  quickFilters,
  onQuickFilterChange,
  quickFilterFields,
  filterRules,
  onOpenFilterModal,
  hasActiveFilters,
  onClearAllFilters,
  sortField = 'Last Updated',
  sortOrder = 'desc',
  onSortChange,
  sortOptions = ['Last Updated', 'ID', 'Name', 'Status']
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const sortMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sortMenuRef.current && !sortMenuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs relative z-30">
      <div className="flex flex-wrap items-center gap-2 flex-1">
        {quickFilterFields.map(field => {
          if (field.type === 'date') {
            return (
              <div
                key={field.key}
                className={field.className || "flex items-center gap-1.5 bg-gray-100 focus-within:bg-white border border-transparent focus-within:border-gray-300 rounded-md px-2.5 py-1 text-xs transition-all"}
              >
                {field.label && <span className="text-gray-400 font-medium whitespace-nowrap">{field.label}:</span>}
                <input
                  type="date"
                  value={quickFilters[field.key] || ''}
                  onChange={(e) => onQuickFilterChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  title={field.placeholder}
                  className="bg-transparent outline-none text-xs text-gray-700 cursor-pointer"
                />
              </div>
            );
          }

          return (
            <input
              key={field.key}
              type={field.type || "text"}
              value={quickFilters[field.key] || ''}
              onChange={(e) => onQuickFilterChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={field.className || "bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none min-w-[90px] w-auto max-w-[150px] transition-all"}
            />
          );
        })}

        <button
          onClick={onOpenFilterModal}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium border transition-all cursor-pointer ${
            filterRules.length > 0 
              ? 'bg-primary-50 text-primary-700 border-primary-300 shadow-xs font-semibold' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border-transparent'
          }`}
        >
          <FilterIcon className="w-3.5 h-3.5 text-primary-600" />
          <span>Filter {filterRules.length > 0 ? `(${filterRules.length})` : ''}</span>
        </button>

        {hasActiveFilters && (
          <button
            onClick={onClearAllFilters}
            className="flex items-center gap-1.5 px-3 py-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-all cursor-pointer shadow-xs"
            title="Clear all active filters"
          >
            <X className="w-3.5 h-3.5 text-red-600 stroke-[2.5]" />
            <span>Clear Filters</span>
          </button>
        )}
      </div>

      {onSortChange && (
        <div className="flex items-center gap-2">
          <div className="relative" ref={sortMenuRef}>
            <button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="flex items-center gap-1.5 px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md text-xs font-medium transition-colors cursor-pointer"
            >
              <ArrowUpDown className="w-3.5 h-3.5 text-gray-500" />
              <span>{sortField}</span>
            </button>
            {showSortMenu && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.18)] py-1 z-50 text-xs animate-in fade-in duration-150">
                {sortOptions.map(field => (
                  <button
                    key={field}
                    onClick={() => {
                      const nextOrder = sortField === field ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'desc';
                      onSortChange(field, nextOrder);
                      setShowSortMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 flex items-center justify-between font-medium ${sortField === field ? 'bg-gray-50 text-black font-bold' : 'text-gray-700'}`}
                  >
                    <span>{field}</span>
                    {sortField === field && (
                      <span className="text-[10px] text-gray-400 uppercase font-mono">{sortOrder}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
