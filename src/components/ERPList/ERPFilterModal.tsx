import React from 'react';
import { Filter as FilterIcon, X, Plus } from 'lucide-react';

export interface FilterRule {
  id: string;
  field: string;
  operator: string;
  value: string;
}

export interface ERPFilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filterRules: FilterRule[];
  fieldOptions: string[];
  operatorOptions?: string[];
  onAddRule: () => void;
  onRemoveRule: (id: string) => void;
  onUpdateRule: (id: string, key: keyof FilterRule, val: string) => void;
  onClearRules: () => void;
  onApplyRules: () => void;
}

export const ERPFilterModal: React.FC<ERPFilterModalProps> = ({
  isOpen,
  onClose,
  filterRules,
  fieldOptions,
  operatorOptions = ['Equals', 'Not Equals', 'Like'],
  onAddRule,
  onRemoveRule,
  onUpdateRule,
  onClearRules,
  onApplyRules
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl p-6 shadow-2xl w-full max-w-xl border border-gray-100 space-y-4 animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FilterIcon className="w-5 h-5 text-primary-600" />
            <span>Filter Rules</span>
          </h3>
          <button 
            onClick={onClose} 
            className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {filterRules.map((rule, idx) => (
            <div key={rule.id} className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <span className="text-xs font-semibold text-gray-400 w-5 text-center">{idx + 1}.</span>
              
              <select
                value={rule.field}
                onChange={(e) => onUpdateRule(rule.id, 'field', e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-medium outline-none cursor-pointer"
              >
                {fieldOptions.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>

              <select
                value={rule.operator}
                onChange={(e) => onUpdateRule(rule.id, 'operator', e.target.value)}
                className="bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 font-medium outline-none cursor-pointer"
              >
                {operatorOptions.map(op => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>

              <input
                type="text"
                value={rule.value}
                onChange={(e) => onUpdateRule(rule.id, 'value', e.target.value)}
                placeholder="Value"
                className="flex-1 bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-800 outline-none"
              />

              <button
                onClick={() => onRemoveRule(rule.id)}
                className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Remove condition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button
            onClick={onAddRule}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Condition
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClearRules}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Clear All
            </button>
            <button
              onClick={onApplyRules}
              className="px-5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 rounded-xl shadow-md shadow-primary-600/20 transition-all cursor-pointer"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
