import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, 
  Wallet, 
  Users, 
  Truck, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Sparkles, 
  CheckSquare, 
  Square, 
  FileText, 
  ExternalLink,
  Receipt,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../../helper/currency';
import { successToast, errorToast } from '../../helper/toast';
import { 
  fetchCustomers, 
  fetchSuppliers, 
  fetchCustomerLedger, 
  fetchSupplierLedger, 
  recordCustomerPayment, 
  recordSupplierPayment,
  type PaymentAllocationItem
} from '../../services/api';

export interface OpenInvoiceItem {
  id: string;
  invoiceId: string;
  refNo: string;
  date: string;
  totalAmount: number;
  dueAmount: number;
  allocatedAmount: number;
  selected: boolean;
}

export interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartyType?: 'CUSTOMER' | 'SUPPLIER';
  initialPartyId?: string;
  initialPartyName?: string;
  onSuccess?: () => void;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  initialPartyType = 'CUSTOMER',
  initialPartyId = '',
  initialPartyName = '',
  onSuccess
}) => {
  // Party selection state
  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>(initialPartyType);
  const [selectedPartyId, setSelectedPartyId] = useState<string>(initialPartyId);
  const [partySearch, setPartySearch] = useState<string>('');
  const [isPartyDropdownOpen, setIsPartyDropdownOpen] = useState(false);
  const partyDropdownRef = useRef<HTMLDivElement>(null);

  // Available parties list
  const [customers, setCustomers] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loadingParties, setLoadingParties] = useState<boolean>(false);

  // Ledger and open invoices state for selected party
  const [loadingLedger, setLoadingLedger] = useState<boolean>(false);
  const [partySummary, setPartySummary] = useState<any>(null);
  const [openInvoices, setOpenInvoices] = useState<OpenInvoiceItem[]>([]);

  // Form Fields
  const [amount, setAmount] = useState<string>('');
  const [paymentType, setPaymentType] = useState<string>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (partyDropdownRef.current && !partyDropdownRef.current.contains(e.target as Node)) {
        setIsPartyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Sync initial props whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setPartyType(initialPartyType || 'CUSTOMER');
      setSelectedPartyId(initialPartyId || '');
      setAmount('');
      setPaymentType('CASH');
      setPaymentDate(new Date().toISOString().split('T')[0]);
      setDescription('');
      setOpenInvoices([]);
      setPartySummary(null);
      loadPartiesList();

      if (initialPartyId) {
        loadPartyInvoices(initialPartyId, initialPartyType || 'CUSTOMER');
      }
    }
  }, [isOpen, initialPartyId, initialPartyType]);

  const loadPartiesList = async () => {
    setLoadingParties(true);
    try {
      const [custList, suppList] = await Promise.all([
        fetchCustomers().catch(() => []),
        fetchSuppliers().catch(() => [])
      ]);
      setCustomers(Array.isArray(custList) ? custList : []);
      setSuppliers(Array.isArray(suppList) ? suppList : []);
    } catch (err) {
      console.warn('Failed to load parties:', err);
    } finally {
      setLoadingParties(false);
    }
  };

  const loadPartyInvoices = async (partyId: string, type: 'CUSTOMER' | 'SUPPLIER') => {
    if (!partyId) {
      setOpenInvoices([]);
      setPartySummary(null);
      return;
    }

    setLoadingLedger(true);
    try {
      const res = type === 'CUSTOMER' 
        ? await fetchCustomerLedger(partyId) 
        : await fetchSupplierLedger(partyId);

      setPartySummary(res?.summary || null);

      // Extract pending open invoices
      const txs = res?.transactions || [];
      const invoices: OpenInvoiceItem[] = [];

      txs.forEach((tx: any) => {
        if (tx.type === 'INVOICE') {
          const due = tx.details?.dueAmount !== undefined 
            ? Number(tx.details.dueAmount) 
            : Number(tx.debit || tx.credit || 0);

          if (due > 0.001) {
            invoices.push({
              id: tx.id || tx.invoiceId,
              invoiceId: tx.invoiceId || String(tx.id || '').replace(/^inv-/, ''),
              refNo: tx.refNo || 'Invoice',
              date: tx.date,
              totalAmount: Number(tx.details?.totalAmount || tx.debit || tx.credit || 0),
              dueAmount: due,
              allocatedAmount: due, // Auto-allocate full due by default
              selected: true // Auto-select by default
            });
          }
        }
      });

      // Sort by date ascending (FIFO: oldest unpaid invoices first)
      invoices.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const totalDue = invoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

      // Auto-select all open invoices and pre-fill payment amount
      setOpenInvoices(invoices);
      if (totalDue > 0) {
        setAmount(String(totalDue));
      }
    } catch (err) {
      console.error('Failed to load party open invoices:', err);
      setOpenInvoices([]);
    } finally {
      setLoadingLedger(false);
    }
  };

  const currentPartiesList = useMemo(() => {
    return partyType === 'CUSTOMER' ? customers : suppliers;
  }, [partyType, customers, suppliers]);

  const selectedParty = useMemo(() => {
    if (!selectedPartyId) return null;
    return currentPartiesList.find((p: any) => p.id === selectedPartyId);
  }, [selectedPartyId, currentPartiesList]);

  const filteredParties = useMemo(() => {
    if (!partySearch.trim()) return currentPartiesList;
    const q = partySearch.toLowerCase();
    return currentPartiesList.filter((p: any) => 
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.companyName && p.companyName.toLowerCase().includes(q)) ||
      (p.contact && p.contact.toLowerCase().includes(q)) ||
      (p.email && p.email.toLowerCase().includes(q))
    );
  }, [currentPartiesList, partySearch]);

  const handleSelectParty = (party: any) => {
    setSelectedPartyId(party.id);
    setIsPartyDropdownOpen(false);
    setPartySearch('');
    loadPartyInvoices(party.id, partyType);
  };

  const handleSwitchPartyType = (newType: 'CUSTOMER' | 'SUPPLIER') => {
    setPartyType(newType);
    setSelectedPartyId('');
    setOpenInvoices([]);
    setPartySummary(null);
    setAmount('');
  };

  // Auto-Allocate (FIFO) across open invoices
  const performAutoAllocation = (targetTotalAmount: number, invoicesList: OpenInvoiceItem[]) => {
    let remaining = targetTotalAmount;
    return invoicesList.map(inv => {
      if (remaining <= 0) {
        return { ...inv, selected: false, allocatedAmount: 0 };
      }
      const canAllocate = Math.min(remaining, inv.dueAmount);
      remaining -= canAllocate;
      return {
        ...inv,
        selected: canAllocate > 0,
        allocatedAmount: canAllocate
      };
    });
  };

  const handleAmountChange = (valStr: string) => {
    setAmount(valStr);
    const num = parseFloat(valStr) || 0;
    if (num > 0 && openInvoices.length > 0) {
      setOpenInvoices(prev => performAutoAllocation(num, prev));
    } else if (num === 0) {
      setOpenInvoices(prev => prev.map(inv => ({ ...inv, selected: false, allocatedAmount: 0 })));
    }
  };

  const handleTriggerAutoAllocate = () => {
    const num = parseFloat(amount) || 0;
    if (num <= 0) {
      errorToast('Please enter a valid Payment Amount first to auto-allocate');
      return;
    }
    setOpenInvoices(prev => performAutoAllocation(num, prev));
    successToast('Payment auto-allocated across oldest open invoices (FIFO)');
  };

  const handleToggleSelectInvoice = (index: number) => {
    setOpenInvoices(prev => {
      const updated = prev.map((inv, i) => {
        if (i !== index) return inv;
        const willSelect = !inv.selected;
        return {
          ...inv,
          selected: willSelect,
          allocatedAmount: willSelect ? inv.dueAmount : 0
        };
      });

      // Recalculate total amount from all selected invoices
      const sumAllocated = updated.reduce((s, i) => s + (i.selected ? Number(i.allocatedAmount || 0) : 0), 0);
      setAmount(sumAllocated > 0 ? String(sumAllocated) : '');
      return updated;
    });
  };

  const handleInvoiceAllocatedAmountChange = (index: number, valStr: string) => {
    const numVal = parseFloat(valStr) || 0;
    setOpenInvoices(prev => {
      const updated = prev.map((inv, i) => {
        if (i !== index) return inv;
        const allocated = Math.min(Math.max(0, numVal), inv.dueAmount);
        return {
          ...inv,
          allocatedAmount: allocated,
          selected: allocated > 0
        };
      });

      const sumAllocated = updated.reduce((s, i) => s + (i.selected ? Number(i.allocatedAmount || 0) : 0), 0);
      setAmount(sumAllocated > 0 ? String(sumAllocated) : '');
      return updated;
    });
  };

  const handleSelectAllInvoices = () => {
    const allSelected = openInvoices.length > 0 && openInvoices.every(i => i.selected);
    const newSelected = !allSelected;

    setOpenInvoices(prev => prev.map(i => ({
      ...i,
      selected: newSelected,
      allocatedAmount: newSelected ? i.dueAmount : 0
    })));

    if (newSelected) {
      const totalDue = openInvoices.reduce((s, i) => s + i.dueAmount, 0);
      setAmount(String(totalDue));
    } else {
      setAmount('');
    }
  };

  const totalAllocatedAmount = useMemo(() => {
    return openInvoices.reduce((sum, inv) => sum + (inv.selected ? Number(inv.allocatedAmount || 0) : 0), 0);
  }, [openInvoices]);

  const numEnteredAmount = parseFloat(amount) || 0;
  const unallocatedExcess = Math.max(0, numEnteredAmount - totalAllocatedAmount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPartyId) {
      errorToast('Please select a party first');
      return;
    }
    if (numEnteredAmount <= 0) {
      errorToast('Please enter a valid payment amount');
      return;
    }

    setSubmitting(true);
    try {
      // Build allocation items for checked invoices
      const selectedAllocations: PaymentAllocationItem[] = openInvoices
        .filter(inv => inv.selected && inv.allocatedAmount > 0)
        .map(inv => ({
          invoiceId: inv.invoiceId,
          amount: inv.allocatedAmount,
          refNo: inv.refNo,
          description: description ? `${description} (${inv.refNo})` : undefined
        }));

      const payload = {
        amount: numEnteredAmount,
        paymentType,
        date: paymentDate,
        description: description.trim() || undefined,
        direction: partyType === 'CUSTOMER' ? ('IN' as const) : ('OUT' as const),
        allocations: selectedAllocations.length > 0 ? selectedAllocations : undefined,
        invoiceId: selectedAllocations.length === 1 ? selectedAllocations[0].invoiceId : undefined
      };

      if (partyType === 'CUSTOMER') {
        await recordCustomerPayment(selectedPartyId, payload);
        successToast(`Customer receipt of ${formatCurrency(numEnteredAmount)} recorded successfully!`);
      } else {
        await recordSupplierPayment(selectedPartyId, payload);
        successToast(`Supplier payment of ${formatCurrency(numEnteredAmount)} recorded successfully!`);
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      console.error('Failed to record payment:', err);
      errorToast(err?.response?.data?.error || err.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#059669]/10 text-[#059669]">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight">
                {partyType === 'CUSTOMER' ? 'Record Customer Receipt' : 'Record Supplier Payment'}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {selectedParty 
                  ? `${selectedParty.name || selectedParty.companyName}` 
                  : 'Select a party to record settlements, multi-invoice allocations, and advance receipts.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* 1. PARTY TYPE TOGGLE (CUSTOMER vs SUPPLIER) */}
          <div className="flex items-center gap-2 p-1 bg-gray-100/80 rounded-2xl">
            <button
              type="button"
              onClick={() => handleSwitchPartyType('CUSTOMER')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                partyType === 'CUSTOMER'
                  ? 'bg-white text-emerald-900 shadow-2xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Customer Receipt (Cash In)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchPartyType('SUPPLIER')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                partyType === 'SUPPLIER'
                  ? 'bg-white text-indigo-900 shadow-2xs font-extrabold'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Truck className="w-4 h-4 text-indigo-600" />
              <span>Supplier Payment (Cash Out)</span>
            </button>
          </div>

          {/* 2. PARTY SELECTOR AUTOCOMPLETE */}
          <div className="space-y-1.5 relative" ref={partyDropdownRef}>
            <label className="block text-xs font-bold text-gray-700">
              Select {partyType === 'CUSTOMER' ? 'Customer' : 'Supplier'} *
            </label>

            <div className="relative">
              <input
                type="text"
                placeholder={loadingParties ? 'Loading parties...' : `Search and select ${partyType.toLowerCase()}...`}
                value={selectedParty ? (selectedParty.name || selectedParty.companyName) : partySearch}
                onChange={(e) => {
                  setPartySearch(e.target.value);
                  setSelectedPartyId('');
                  setIsPartyDropdownOpen(true);
                }}
                onFocus={() => setIsPartyDropdownOpen(true)}
                className="w-full pl-9 pr-8 py-2.5 bg-white border border-gray-300 focus:border-[#059669] rounded-xl text-xs font-semibold text-gray-800 outline-none shadow-2xs transition-all"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {selectedPartyId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPartyId('');
                    setPartySearch('');
                    setOpenInvoices([]);
                    setPartySummary(null);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Dropdown Options */}
            {isPartyDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 max-h-56 overflow-y-auto divide-y divide-gray-100">
                {filteredParties.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 font-medium">
                    No {partyType.toLowerCase()}s found matching "{partySearch}"
                  </div>
                ) : (
                  filteredParties.map((p: any) => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectParty(p)}
                      className="p-3 hover:bg-emerald-50/50 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <div>
                        <div className="text-xs font-bold text-gray-900">{p.name || p.companyName}</div>
                        {p.contact && (
                          <div className="text-[11px] text-gray-400 mt-0.5 font-medium">{p.contact}</div>
                        )}
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-bold">
                        Select
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Party Summary Pill if selected */}
            {selectedParty && partySummary && (
              <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in duration-100">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-gray-700">Account Position:</span>
                  {partySummary.outstandingBalance > 0.001 ? (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-amber-100 text-amber-900 border border-amber-300">
                      Pending Due: {formatCurrency(partySummary.outstandingBalance)}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full font-bold text-[11px] bg-emerald-100 text-emerald-900 border border-emerald-300">
                      Settled / Advance on File
                    </span>
                  )}
                </div>

                {partySummary.outstandingBalance > 0.001 && (
                  <button
                    type="button"
                    onClick={() => handleAmountChange(String(partySummary.outstandingBalance))}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-900 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>Pay Full Balance</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 3. PAYMENT AMOUNT */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-gray-700">
                Payment Amount *
              </label>
              {openInvoices.length > 0 && numEnteredAmount > 0 && (
                <button
                  type="button"
                  onClick={handleTriggerAutoAllocate}
                  className="text-[11px] font-bold text-[#059669] hover:underline flex items-center gap-1 cursor-pointer"
                  title="Auto allocate amount sequentially across oldest unpaid invoices"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Auto-Allocate (FIFO)</span>
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="number"
                step="any"
                min="0.01"
                placeholder="e.g. 500000"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-[#059669] rounded-xl text-sm font-bold text-gray-900 focus:outline-none font-mono shadow-2xs transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                UGX / USh
              </span>
            </div>
          </div>

          {/* 4. PAYMENT MODE & DATE */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Payment Method *
              </label>
              <select
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-gray-300 focus:border-[#059669] rounded-xl text-xs font-bold text-gray-800 focus:outline-none shadow-2xs cursor-pointer"
              >
                <option value="CASH">Cash Settlement</option>
                <option value="BANK">Bank Transfer / Cheque</option>
                <option value="MOBILE_MONEY">Airtel / MTN Mobile Money</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Payment Date *
              </label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-white border border-gray-300 focus:border-[#059669] rounded-xl text-xs font-bold text-gray-800 focus:outline-none shadow-2xs cursor-pointer"
              />
            </div>
          </div>

          {/* 5. MULTI-SELECT & AUTO-SELECT OPEN INVOICES ALLOCATION */}
          {selectedPartyId && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Allocate to Open Invoices ({openInvoices.length} Pending)</span>
                  </h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Multi-select invoices or click Auto-Allocate to distribute payment across open bills.
                  </p>
                </div>

                {openInvoices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAllInvoices}
                      className="px-2.5 py-1 text-[11px] font-bold text-gray-600 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
                    >
                      {openInvoices.every(i => i.selected) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                )}
              </div>

              {loadingLedger ? (
                <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-200">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">Checking pending invoices...</p>
                </div>
              ) : openInvoices.length === 0 ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div>
                    <span className="font-bold">No open unpaid invoices found.</span>
                    <p className="text-emerald-700 text-[11px] mt-0.5">
                      The entire amount of {formatCurrency(numEnteredAmount || 0)} will be recorded as general Advance on Account.
                    </p>
                  </div>
                </div>
              ) : (
                /* OPEN INVOICES TABLE */
                <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider z-10">
                        <tr>
                          <th className="py-2.5 px-3 text-center w-10">Select</th>
                          <th className="py-2.5 px-3">Invoice #</th>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3 text-right">Invoice Total</th>
                          <th className="py-2.5 px-3 text-right">Outstanding Due</th>
                          <th className="py-2.5 px-3 text-right w-36">Allocated (USh)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {openInvoices.map((inv, idx) => (
                          <tr 
                            key={inv.id || idx}
                            className={`transition-colors cursor-pointer select-none ${
                              inv.selected ? 'bg-emerald-50/60 hover:bg-emerald-50/90' : 'hover:bg-gray-50/80'
                            }`}
                            onClick={() => handleToggleSelectInvoice(idx)}
                          >
                            <td 
                              className="py-2.5 px-3 text-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleSelectInvoice(idx);
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={Boolean(inv.selected)}
                                onChange={() => handleToggleSelectInvoice(idx)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-4 h-4 text-[#059669] rounded border-gray-300 focus:ring-[#059669] cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-gray-900">
                              {inv.refNo}
                            </td>
                            <td className="py-2.5 px-3 text-gray-500 font-mono text-[11px]">
                              {inv.date ? new Date(inv.date).toLocaleDateString('en-GB') : '-'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-gray-600 font-medium">
                              {formatCurrency(inv.totalAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-800">
                              {formatCurrency(inv.dueAmount)}
                            </td>
                            <td 
                              className="py-2 px-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="number"
                                step="any"
                                min="0"
                                max={inv.dueAmount}
                                value={inv.allocatedAmount !== undefined && inv.allocatedAmount !== null ? inv.allocatedAmount : ''}
                                placeholder="0"
                                onChange={(e) => handleInvoiceAllocatedAmountChange(idx, e.target.value)}
                                className="w-28 px-2.5 py-1 text-right bg-white border border-gray-300 rounded-lg text-xs font-mono font-bold text-gray-900 focus:outline-none focus:border-[#059669]"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Allocation Status Footer */}
                  <div className="p-3 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-600">
                        Allocated to Invoices: <strong className="text-gray-900">{formatCurrency(totalAllocatedAmount)}</strong>
                      </span>
                      {unallocatedExcess > 0.001 && (
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 text-[11px] font-bold border border-emerald-300">
                          + {formatCurrency(unallocatedExcess)} as Advance
                        </span>
                      )}
                    </div>

                    <div className="font-mono font-extrabold text-gray-900">
                      Total Payment: {formatCurrency(numEnteredAmount)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 6. DESCRIPTION / REFERENCE / CHEQUE # */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-700">
              Notes / Reference / Cheque #
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Cheque #58421 cleared, Cash received at counter, MTN Mobile Money Ref: 84930..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-gray-300 focus:border-[#059669] rounded-xl text-xs text-gray-800 outline-none resize-none font-medium shadow-2xs"
            />
          </div>

          {/* MODAL FOOTER */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !selectedPartyId || numEnteredAmount <= 0}
              className="px-6 py-2.5 bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Recording...' : partyType === 'CUSTOMER' ? 'Record Customer Receipt' : 'Record Supplier Payment'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
