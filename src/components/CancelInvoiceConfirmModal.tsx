import React, { useState } from 'react';
import { Ban, AlertTriangle, X, Loader2 } from 'lucide-react';
import { cancelInvoice, bulkCancelInvoices } from '../services/api';
import { successToast, errorToast } from '../helper/toast';

export interface CancelInvoiceItem {
  id: string;
  invoiceNumber: string;
  type?: 'SALES' | 'PURCHASE' | string;
  status?: string;
}

export interface CancelInvoiceConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice?: CancelInvoiceItem | null;
  invoices?: CancelInvoiceItem[];
  onSuccess: () => void;
}

export const CancelInvoiceConfirmModal: React.FC<CancelInvoiceConfirmModalProps> = ({
  isOpen,
  onClose,
  invoice,
  invoices,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);

  // Normalize to list
  const activeInvoices: CancelInvoiceItem[] = invoices && invoices.length > 0 
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
      if (isMultiple) {
        const res = await bulkCancelInvoices(activeInvoices.map(i => i.id));
        successToast(res.message || `Successfully cancelled ${res.cancelledCount} invoice(s)`);
        if (res.errors && res.errors.length > 0) {
          errorToast(res.errors.join(' | '));
        }
      } else {
        const res = await cancelInvoice(firstInvoice.id);
        successToast(res.message || 'Invoice cancelled successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to cancel invoice(s):', err);
      errorToast(err.response?.data?.error || err.message || 'Failed to cancel invoice(s)');
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

        <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-3 shadow-2xs">
          <AlertTriangle className="w-6 h-6 text-rose-600" />
        </div>

        <h3 className="text-base font-bold text-gray-900 text-center">
          {isMultiple 
            ? `Cancel ${activeInvoices.length} ${isPurchase ? 'Purchase' : 'Sales'} Invoices`
            : `Cancel ${isPurchase ? 'Purchase' : 'Sales'} Invoice`}
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
            ? `Are you sure you want to cancel these ${activeInvoices.length} ${isPurchase ? 'Purchase' : 'Sales'} Invoices? Any stock added or deducted will be safely reverted in the stock ledger, financial entries will be reversed, and the invoices will be marked as Cancelled.`
            : isPurchase
              ? 'Are you sure you want to cancel this Purchase Invoice? This will safely revert the added inventory stock. This purchase invoice can only be cancelled if its items have not been used in any sales invoice.'
              : 'Are you sure you want to cancel this Sales Invoice? Any deducted stock will be safely returned to inventory, financial entries will be reversed, and the invoice will be marked as Cancelled.'}
        </p>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="w-1/2 py-2.5 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Keep Invoice
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="w-1/2 py-2.5 px-4 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Cancelling...</span>
              </>
            ) : (
              <>
                <Ban className="w-3.5 h-3.5" />
                <span>Yes, Cancel</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default CancelInvoiceConfirmModal;

