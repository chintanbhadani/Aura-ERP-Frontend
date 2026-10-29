import React, { useState } from 'react';
import { Search, Filter as FilterIcon, Plus } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { Card } from './Card';

interface ListViewLayoutProps {
  title: string;
  description?: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  onAdd?: () => void;
  addLabel?: string;
  onRefresh?: () => void;
  filters?: React.ReactNode;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
}

export function ListViewLayout({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  onAdd, 
  addLabel,
  onRefresh, 
  filters,
  searchPlaceholder = "Search...",
  searchValue,
  onSearchChange
}: ListViewLayoutProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [internalSearch, setInternalSearch] = useState('');

  const currentSearch = searchValue !== undefined ? searchValue : internalSearch;

  const handleSearchChange = (val: string) => {
    if (onSearchChange) {
      onSearchChange(val);
    } else {
      setInternalSearch(val);
    }
  };

  return (
    <div className="p-3 lg:p-4 space-y-4 w-full flex flex-col h-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-start gap-3">
          {Icon && (
            <div className="p-2 bg-primary-50 rounded-lg text-primary-600 mt-1">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-primary-600 hidden" />}
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
                {title}
              </h1>
            </div>
            {description && (
              <p className="text-sm text-gray-500 mt-1">{description}</p>
            )}
          </div>
        </div>
        
        {onAdd && (
          <Button onClick={onAdd} size="sm" className="gap-2 shrink-0">
            <Plus className="w-4 h-4" /> {addLabel || `New ${title.replace(/s$/, '')}`}
          </Button>
        )}
      </div>

      {/* Main Unified Card */}
      <Card className="overflow-hidden border border-gray-100 shadow-sm flex flex-col flex-1 p-4 gap-4">
        {/* Toolbar Section */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input 
              type="text" 
              placeholder={searchPlaceholder}
              value={currentSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 bg-gray-50/50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button 
              variant="outline" 
              size="sm"
              className={`gap-1.5 px-3 h-8 ${showFilters ? 'bg-primary-50 border-primary-200 text-primary-700' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <FilterIcon className="w-3.5 h-3.5" /> Filter
            </Button>
          </div>
        </div>

        {/* Collapsible Advanced Filters */}
        {showFilters && (
          <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-xl animate-in slide-in-from-top-2 fade-in duration-200">
             {filters ? (
               filters
             ) : (
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                 <Input label="Assigned To" placeholder="Select user..." className="bg-white h-9 text-sm rounded-lg" />
                 <Input label="Created By" placeholder="Select user..." className="bg-white h-9 text-sm rounded-lg" />
                 <Input label="Tags" placeholder="Search tags..." className="bg-white h-9 text-sm rounded-lg" />
                 <Input label="Saved Filter" placeholder="Select filter..." className="bg-white h-9 text-sm rounded-lg" />
               </div>
             )}
          </div>
        )}

        {/* Table Content */}
        <div className="w-full bg-white flex-shrink min-h-0 overflow-auto border border-gray-200 rounded-xl shadow-sm">
          {React.Children.map(children, child => {
            if (React.isValidElement(child)) {
              return React.cloneElement(child as React.ReactElement<any>, { showFilters });
            }
            return child;
          })}
        </div>
      </Card>
    </div>
  );
}
