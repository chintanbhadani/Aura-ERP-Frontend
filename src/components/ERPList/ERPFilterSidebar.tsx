import React, { useState } from 'react';
import { successToast } from '../../helper/toast';

export interface ERPFilterSidebarProps {
  assignedToFilter: string;
  onAssignedToChange: (val: string) => void;
  createdByFilter: string;
  onCreatedByChange: (val: string) => void;
  tagFilter: string;
  onTagChange: (val: string) => void;
  showTags: boolean;
  onShowTagsChange: (val: boolean) => void;
  assignedToOptions?: string[];
  createdByOptions?: string[];
  tagOptions?: string[];
  children?: React.ReactNode;
}

export const ERPFilterSidebar: React.FC<ERPFilterSidebarProps> = ({
  assignedToFilter,
  onAssignedToChange,
  createdByFilter,
  onCreatedByChange,
  tagFilter,
  onTagChange,
  showTags,
  onShowTagsChange,
  assignedToOptions = ['Administrator', 'John Doe', 'System User'],
  createdByOptions = ['Administrator', 'System User'],
  tagOptions = ['TOOLS', 'HARDWARE', 'CONSUMABLE', 'DRILLING'],
  children
}) => {
  const [savedFilterName, setSavedFilterName] = useState('');

  return (
    <div className="w-56 shrink-0 border-r border-gray-200 bg-gray-50/50 p-4 space-y-6 overflow-y-auto text-xs animate-in fade-in slide-in-from-left-2 duration-150">
      <div>
        <h3 className="font-semibold text-gray-500 mb-2.5 tracking-wider uppercase text-[11px]">Filter By</h3>
        <div className="space-y-2">
          <select
            value={assignedToFilter}
            onChange={(e) => onAssignedToChange(e.target.value)}
            className="w-full bg-gray-100 hover:bg-gray-200/70 border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-700 outline-none cursor-pointer"
          >
            <option value="">Assigned To</option>
            {assignedToOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <select
            value={createdByFilter}
            onChange={(e) => onCreatedByChange(e.target.value)}
            className="w-full bg-gray-100 hover:bg-gray-200/70 border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-700 outline-none cursor-pointer"
          >
            <option value="">Created By</option>
            {createdByOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-gray-500 mb-2.5 tracking-wider uppercase text-[11px]">Edit Filters</h3>
        <div className="space-y-2.5">
          <select
            value={tagFilter}
            onChange={(e) => onTagChange(e.target.value)}
            className="w-full bg-gray-100 hover:bg-gray-200/70 border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-700 outline-none cursor-pointer"
          >
            <option value="">Tags</option>
            {tagOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 text-gray-600 select-none cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={showTags}
              onChange={(e) => onShowTagsChange(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-gray-300 text-black focus:ring-black"
            />
            <span>Show Tags</span>
          </label>
        </div>
      </div>

      {children}

      <div>
        <h3 className="font-semibold text-gray-500 mb-2.5 tracking-wider uppercase text-[11px]">Save Filter</h3>
        <div className="space-y-2">
          <input
            type="text"
            value={savedFilterName}
            onChange={(e) => setSavedFilterName(e.target.value)}
            placeholder="Filter Name"
            className="w-full bg-gray-100 border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1.5 text-xs text-gray-700 outline-none"
          />
          {savedFilterName && (
            <button
              onClick={() => {
                successToast(`Saved filter "${savedFilterName}"`);
                setSavedFilterName('');
              }}
              className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white rounded-lg py-1.5 text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              Save
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
