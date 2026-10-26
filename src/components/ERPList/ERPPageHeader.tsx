import React, { useState, useRef, useEffect } from 'react';
import { 
  PanelLeftClose, 
  RefreshCw, 
  MoreHorizontal, 
  Plus,
  FileUp
} from 'lucide-react';
import { ButtonComponent } from '../button/ButtonComponent';

export interface ERPPageHeaderProps {
  title: string;
  showSidebar: boolean;
  onToggleSidebar: () => void;
  viewType?: string;
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
  extraActions?: React.ReactNode;
}

export const ERPPageHeader: React.FC<ERPPageHeaderProps> = ({
  title,
  showSidebar,
  onToggleSidebar,
  viewType = 'List View',
  onViewTypeChange,
  viewTypeOptions = ['List View', 'Report View', 'Dashboard View', 'Kanban View'],
  loading = false,
  onRefresh,
  onExportAll,
  onPrint,
  onAddNew,
  addNewLabel = 'Add Item',
  onImport,
  importLabel = 'Bulk Add',
  extraActions
}) => {
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const optionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (optionsMenuRef.current && !optionsMenuRef.current.contains(event.target as Node)) {
        setShowOptionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="px-3 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 border-b border-gray-200 bg-white relative z-20 overflow-visible">
      <div className="flex items-center gap-3">
        <button 
          onClick={onToggleSidebar}
          className="p-1.5 hover:bg-gray-100 rounded-md text-gray-600 transition-all cursor-pointer flex items-center gap-1"
          title={showSidebar ? "Hide Filter Sidebar (⌘ + K)" : "Show Filter Sidebar (⌘ + K)"}
        >
          <PanelLeftClose className={`w-5 h-5 transition-all duration-200 ${!showSidebar ? 'rotate-180 text-primary-600' : 'text-gray-600'}`} />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-2">

        {onRefresh && (
          <ButtonComponent
            variant="secondary"
            onClick={onRefresh}
            title="Refresh"
            sx={{ minWidth: 36, width: 36, p: 0 }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </ButtonComponent>
        )}

        <div className="relative" ref={optionsMenuRef}>
          <ButtonComponent
            variant="secondary"
            onClick={() => setShowOptionsMenu(!showOptionsMenu)}
            title="Menu Options"
            sx={{ minWidth: 36, width: 36, p: 0 }}
          >
            <MoreHorizontal className="w-3.5 h-3.5" />
          </ButtonComponent>
          {showOptionsMenu && (
            <div className="absolute right-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-xl shadow-[0_15px_40px_rgba(0,0,0,0.18)] py-1.5 z-50 text-xs animate-in fade-in duration-150">
              <button 
                onClick={() => { onToggleSidebar(); setShowOptionsMenu(false); }} 
                className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium flex items-center justify-between cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <PanelLeftClose className="w-3.5 h-3.5 text-gray-500" />
                  <span>Toggle Sidebar</span>
                </span>
                <kbd className="bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded text-[10px] font-mono border border-gray-200">⌘+K</kbd>
              </button>
              <hr className="my-1 border-gray-100" />
              {onExportAll && (
                <button onClick={() => { onExportAll(); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium cursor-pointer">Export All</button>
              )}
              {onPrint && (
                <button onClick={() => { onPrint(); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium cursor-pointer">Print</button>
              )}
              {onImport ? (
                <button 
                  onClick={() => { onImport(); setShowOptionsMenu(false); }} 
                  className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium flex items-center gap-2 cursor-pointer"
                >
                  <FileUp className="w-4 h-4 text-emerald-600" />
                  <span>{importLabel || 'Bulk Import Excel'}</span>
                </button>
              ) : onAddNew ? (
                <button onClick={() => { onAddNew(); setShowOptionsMenu(false); }} className="w-full text-left px-4 py-2 hover:bg-gray-100 text-gray-700 font-medium cursor-pointer">Import Data</button>
              ) : null}
            </div>
          )}
        </div>

        {extraActions}

        {onImport && (
          <ButtonComponent
            variant="soft"
            onClick={onImport}
            startIcon={<FileUp className="w-4 h-4" />}
            title="Bulk Add using Excel file"
          >
            {importLabel || 'Bulk Add'}
          </ButtonComponent>
        )}

        {onAddNew && (
          <ButtonComponent
            variant="primary"
            onClick={onAddNew}
            startIcon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
          >
            {addNewLabel}
          </ButtonComponent>
        )}
      </div>
    </div>
  );
};
