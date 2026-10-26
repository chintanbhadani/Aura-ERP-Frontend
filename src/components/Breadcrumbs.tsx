import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronRight, Copy, Check } from 'lucide-react';
import { successToast } from '../helper/toast';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  isCode?: boolean;
}

export interface BreadcrumbsProps {
  module?: string;
  moduleHref?: string;
  entity?: string;
  entityHref?: string;
  code?: string;
  items?: BreadcrumbItem[];
}

const MODULE_HREF_MAP: Record<string, string> = {
  Stock: '/master/skus',
  Buying: '/purchase-order',
  Selling: '/invoices',
  CRM: '/clients',
  Finance: '/expenses',
  User: '/profile',
  Home: '/',
};

const ENTITY_HREF_MAP: Record<string, string> = {
  Item: '/master/skus',
  'Edit Item': '/master/skus',
  'New Item': '/master/skus',
  'Item Group': '/master/categories',
  Supplier: '/master/suppliers',
  'Edit Supplier': '/master/suppliers',
  'New Supplier': '/master/suppliers',
  Customer: '/master/customers',
  'Edit Customer': '/master/customers',
  'New Customer': '/master/customers',
  'Unit of Measure': '/master/units',
  'Purchase Order': '/purchase-order',
  'New Purchase Order': '/purchase-order',
  'Goods Receipt (GRN)': '/grn',
  'Stock Entry': '/stock-entry',
  'Material Request': '/material-request',
  'New Material Request': '/material-request',
  Invoices: '/invoices',
  Clients: '/clients',
  Inquiries: '/inquiries',
  Quotations: '/quotations',
  'Proforma Invoices': '/proforma',
  Expenses: '/expenses',
  'My Profile': '/profile',
};

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  module,
  moduleHref,
  entity,
  entityHref,
  code,
  items,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [copied, setCopied] = useState(false);

  const handleCopyCode = (textToCopy: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    successToast(`Copied "${textToCopy}" to clipboard`);
    setTimeout(() => setCopied(false), 2000);
  };

  if (items && items.length > 0) {
    return (
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />}
            {item.isCode && String(item.label || '').toLowerCase() !== 'new' ? (
              <button
                type="button"
                onClick={(e) => handleCopyCode(String(item.label), e)}
                className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-200/80 font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] tracking-tight shadow-2xs transition-all cursor-pointer group hover:shadow-xs hover:border-slate-300 active:scale-95"
                title="Click to copy ID"
              >
                <span className="text-[10px] text-primary-600 font-sans font-black">#</span>
                <span>{String(item.label)}</span>
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600 shrink-0 animate-in zoom-in-50" />
                ) : (
                  <Copy className="w-3 h-3 text-gray-400 group-hover:text-gray-700 shrink-0 transition-colors" />
                )}
              </button>
            ) : item.isCode ? null : item.href ? (
              <span
                onClick={() => navigate(item.href!)}
                className="text-gray-500 hover:text-primary-600 hover:underline cursor-pointer transition-colors"
              >
                {item.label}
              </span>
            ) : (
              <span className="font-semibold text-gray-800">{item.label}</span>
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const activeModule = module || 'Stock';
  const activeEntity = entity || 'Item';
  const targetModuleHref = moduleHref || MODULE_HREF_MAP[activeModule] || '/master/skus';
  const targetEntityHref = entityHref || ENTITY_HREF_MAP[activeEntity] || '/master/skus';

  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
      {/* Module Level */}
      <span
        onClick={() => navigate(targetModuleHref)}
        className="text-gray-500 hover:text-primary-600 hover:underline cursor-pointer transition-colors font-medium"
      >
        {activeModule}
      </span>

      <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />

      {/* Entity Level */}
      {code ? (
        <span
          onClick={() => navigate(targetEntityHref)}
          className="text-gray-500 hover:text-primary-600 hover:underline cursor-pointer transition-colors font-medium"
        >
          {activeEntity}
        </span>
      ) : (
        <span className="font-semibold text-gray-800">{activeEntity}</span>
      )}

      {/* Record Code Level */}
      {code && String(code || '').toLowerCase() !== 'new' && (
        <>
          <ChevronRight className="w-3 h-3 text-gray-300 shrink-0" />
          <button
            type="button"
            onClick={(e) => handleCopyCode(String(code), e)}
            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/90 text-slate-800 border border-slate-200/80 font-mono font-bold px-2.5 py-0.5 rounded-full text-[11px] tracking-tight shadow-2xs transition-all cursor-pointer group hover:shadow-xs hover:border-slate-300 active:scale-95"
            title="Click to copy ID"
          >
            <span className="text-[10px] text-primary-600 font-sans font-black">#</span>
            <span>{code}</span>
            {copied ? (
              <Check className="w-3 h-3 text-emerald-600 shrink-0 animate-in zoom-in-50" />
            ) : (
              <Copy className="w-3 h-3 text-gray-400 group-hover:text-gray-700 shrink-0 transition-colors" />
            )}
          </button>
        </>
      )}
    </div>
  );
};

export default Breadcrumbs;
