import React, { useState } from 'react';
import { ChevronUp, ChevronDown, Plus } from 'lucide-react';
import { successToast } from '../../helper/toast';

export interface ConnectionItem {
  label: string;
  count?: number | string;
  countRight?: number | string;
  hasPlus?: boolean;
  onClick?: () => void;
  onCreate?: () => void;
}

export interface ConnectionGroup {
  title: string;
  items: ConnectionItem[];
}

interface ERPFormConnectionsProps {
  groups?: ConnectionGroup[];
  title?: string;
  defaultExpanded?: boolean;
  className?: string;
}

export const ERPFormConnections: React.FC<ERPFormConnectionsProps> = ({
  groups,
  title = "Connections",
  defaultExpanded = true,
  className = "",
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  // Default fallback connection groups matching ERPNext document connections
  const connectionGroups: ConnectionGroup[] = groups || [
    {
      title: 'Reference',
      items: [
        {
          label: 'Request for Quotation',
          hasPlus: true,
          onCreate: () => successToast('Create Request for Quotation'),
          onClick: () => successToast('View Request for Quotations')
        },
        {
          label: 'Supplier Quotation',
          hasPlus: true,
          onCreate: () => successToast('Create Supplier Quotation'),
          onClick: () => successToast('View Supplier Quotations')
        },
        {
          label: 'Purchase Order',
          hasPlus: true,
          onCreate: () => successToast('Create Purchase Order'),
          onClick: () => successToast('View Purchase Orders')
        },
      ]
    },
    {
      title: 'Stock',
      items: [
        {
          label: 'Stock Entry',
          onClick: () => successToast('View Stock Entries')
        },
        {
          label: 'GRN',
          onClick: () => successToast('View Goods Receipt Notes')
        },
      ]
    },
    {
      title: 'Accounting Dimensions',
      items: [
        {
          label: 'Project',
          onClick: () => successToast('View Projects')
        },
        {
          label: 'Cost Center',
          onClick: () => successToast('View Cost Centers')
        },
      ]
    }
  ];

  return (
    <div className={`border border-gray-200/80 rounded-2xl p-5 bg-white space-y-4 shadow-2xs ${className}`}>
      {/* Header with Title & Collapse Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none border-b border-gray-100 pb-3"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-700 tracking-wide">
            {title}
          </h3>
        </div>
        <button 
          type="button" 
          className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100 cursor-pointer"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Expanded Grid */}
      {isExpanded && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-1 pb-1">
          {connectionGroups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-3">
              <h4 className="text-xs font-medium text-gray-500">{group.title}</h4>
              <div className="flex flex-col gap-2.5 items-start">
                {group.items.map((item, iIdx) => (
                  <div key={iIdx} className="flex items-center gap-1.5 flex-wrap">
                    {/* Main Badge Button */}
                    <button
                      type="button"
                      onClick={item.onClick}
                      className="bg-gray-100/90 hover:bg-gray-200/80 text-gray-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1.5 shadow-2xs"
                    >
                      {item.count !== undefined && item.count !== null && item.count !== 0 && item.count !== '?' && (
                        <span className="bg-gray-200/80 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[16px] text-center">
                          {item.count}
                        </span>
                      )}
                      <span>{item.label}</span>
                      {item.countRight !== undefined && item.countRight !== null && item.countRight !== 0 && item.countRight !== '?' && (
                        <span className="bg-gray-200/80 text-gray-700 text-[10px] font-bold px-1.5 py-0.5 rounded min-w-[16px] text-center">
                          {item.countRight}
                        </span>
                      )}
                    </button>

                    {/* Optional (+) Action Button */}
                    {item.hasPlus && (
                      <button
                        type="button"
                        onClick={item.onCreate || item.onClick}
                        title={`Create ${item.label}`}
                        className="bg-gray-100/90 hover:bg-gray-200/80 text-gray-500 hover:text-gray-900 p-1.5 rounded-lg transition-colors cursor-pointer inline-flex items-center justify-center shadow-2xs"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
