import React, { useState } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { bulkSubmitInvoices } from '../services/api';
import { successToast, errorToast } from '../helper/toast';

export interface SubmitInvoiceItem {
  id: string;
  invoiceNumber: string;
  type?: 'SALES' | 'PURCHASE' | string;
  status?: string;
}

export interface SubmitInvoiceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: SubmitInvoiceItem | null;
  invoices?: SubmitInvoiceItem[];
  onSuccess: () => void;
}

export const SubmitInvoiceConfirmModal: React.FC<SubmitInvoiceConfirmModalProps> = ({
  isOpen,
  onClose,
  invoice,
  invoices,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  const activeInvoices: SubmitInvoiceItem[] = invoices && invoices.length > 0
    ? invoices
    : invoice
      ? [invoice]
      : [];

  if (!isOpen || activeInvoices.length === 0) return null;

  const isMultiple = activeInvoices.length > 1;
  const firstInvoice = activeInvoices[0];
  const isPurchase = firstInvoice?.type === 'PURCHASE';

  const handleConfirm = async () => {
    try {
      setLoading(true);
      const res = await bulkSubmitInvoices(activeInvoices.map(i => i.id));
      successToast(res.message || `Successfully submitted ${res.submittedCount} invoice(s)`);
      if (res.errors && res.errors.length > 0) {
        errorToast(res.errors.join(' | '));
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to submit invoice(s):', err);
      errorToast(err.response?.data?.error || err.message || 'Failed to submit invoice(s)');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-200 max-w-md w-full overflow-hidden text-gray-900 p-6 animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <Check className="w-6 h-6 text-emerald-600 stroke-[2.5]" />
        </div>

        <h3 className="text-base font-bold text-gray-900 text-center">
          {isMultiple 
            ? `Submit ${activeInvoices.length} ${isPurchase ? 'Purchase' : 'Sales'} Invoices`
            : `Submit ${isPurchase ? 'Purchase' : 'Sales'} Invoice`}
        </h3>

        <div className="mt-3 p-3 bg-gray-50 rounded-xl border border-gray-200 flex items-center justify-between text-xs font-medium">
          <span className="text-gray-500">
            {isMultiple ? 'Selected Invoices:' : 'Invoice Number:'}
          </span>
          <span className="font-mono font-bold text-gray-900 truncate max-w-[220px]" title={activeInvoices.map(i => i.invoiceNumber || i.id).join(', ')}>
            {isMultiple
              ? `${activeInvoices.length} Invoices (${activeInvoices.map(i => i.invoiceNumber || i.id).slice(0, 2).join(', ')}${activeInvoices.length > 2 ? '...' : ''})`
              : (firstInvoice.invoiceNumber || firstInvoice.id)}
          </span>
        </div>

        <p className="mt-3 text-xs text-gray-600 text-center leading-relaxed">
          {isMultiple
            ? `Are you sure you want to submit these ${activeInvoices.length} draft invoice(s)? This will update physical stock in the stock ledger, adjust inventory balances, and post corresponding financial entries.`
            : `Are you sure you want to submit this draft invoice? This will record the transaction in the stock ledger and update your inventory and financial accounts.`}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-1/2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Keep Draft
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-1/2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Yes, Submit</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default SubmitInvoiceConfirmModal;
