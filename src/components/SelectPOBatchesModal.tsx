import React, { useState, useEffect, useMemo } from 'react';
import { 
  X, 
  Layers, 
  Package, 
  TrendingUp, 
  Sparkles, 
  AlertCircle, 
  Check, 
  RefreshCw,
  Building2,
  Calendar
} from 'lucide-react';
import { fetchAvailableBatches, type AvailableBatch, type ProductBatchData } from '../services/api';
import { useCurrency } from '../helper/currency';
import { errorToast } from '../helper/toast';

export interface SelectedPOAllocation {
  purchaseItemId: string;
  poNumber: string;
  unitCost: number;
  allocatedQty: number;
  availableQty: number;
  supplierName: string;
  date: string;
}

export interface SelectPOBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  productSku?: string;
  initialTargetQty?: number;
  initialAllocations?: { purchaseItemId: string; quantity: number }[];
  onConfirmAllocation: (allocations: SelectedPOAllocation[], totalAllocatedQty: number, weightedCost: number) => void;
}

export const SelectPOBatchesModal: React.FC<SelectPOBatchesModalProps> = ({
  isOpen,
  onClose,
  productId,
  productName,
  productSku,
  initialTargetQty = 1,
  initialAllocations = [],
  onConfirmAllocation,
}) => {
  const { format, currency } = useCurrency();
  const [loading, setLoading] = useState(false);
  const [batchData, setBatchData] = useState<ProductBatchData | null>(null);
  const [targetQty, setTargetQty] = useState<number>(initialTargetQty || 1);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen && productId) {
      loadBatches();
      setTargetQty(initialTargetQty || 1);
      if (initialAllocations && initialAllocations.length > 0) {
        const initialMap: Record<string, number> = {};
        initialAllocations.forEach(a => {
          initialMap[a.purchaseItemId] = a.quantity;
        });
        setAllocations(initialMap);
      } else {
        setAllocations({});
      }
    } else {
      setBatchData(null);
      setAllocations({});
    }
  }, [isOpen, productId, initialTargetQty, JSON.stringify(initialAllocations)]);

  const loadBatches = async () => {
    try {
      setLoading(true);
      const data = await fetchAvailableBatches(productId);
      setBatchData(data);
    } catch (err: any) {
      console.error('Failed to load available PO batches', err);
      errorToast(err.response?.data?.error || 'Failed to load PO batches for item');
    } finally {
      setLoading(false);
    }
  };

  const batches = batchData?.batches || [];

  // Auto-Fill FIFO Helper
  const handleAutoFillFIFO = () => {
    let remainingToPick = Number(targetQty) || 0;
    const newAllocations: Record<string, number> = {};

    for (const b of batches) {
      if (remainingToPick <= 0) break;
      const pick = Math.min(b.availableQuantity, remainingToPick);
      if (pick > 0) {
        newAllocations[b.purchaseItemId] = pick;
        remainingToPick -= pick;
      }
    }

    setAllocations(newAllocations);
  };

  const handleClear = () => {
    setAllocations({});
  };

  const handleQtyChange = (purchaseItemId: string, maxQty: number, val: string) => {
    const num = parseFloat(val);
    if (isNaN(num) || num <= 0) {
      const copy = { ...allocations };
      delete copy[purchaseItemId];
      setAllocations(copy);
      return;
    }
    const clamped = Math.min(num, maxQty);
    setAllocations({
      ...allocations,
      [purchaseItemId]: clamped,
    });
  };

  // Calculations
  const totalAllocatedQty = useMemo(() => {
    return Object.values(allocations).reduce((sum, q) => sum + (Number(q) || 0), 0);
  }, [allocations]);

  const totalCost = useMemo(() => {
    return batches.reduce((sum, b) => {
      const q = allocations[b.purchaseItemId] || 0;
      return sum + (q * b.unitCost);
    }, 0);
  }, [batches, allocations]);

  const weightedUnitCost = totalAllocatedQty > 0 ? totalCost / totalAllocatedQty : 0;

  const handleConfirm = () => {
    if (totalAllocatedQty <= 0) {
      errorToast('Please allocate quantity from at least one PO batch.');
      return;
    }

    const selectedList: SelectedPOAllocation[] = [];
    batches.forEach((b) => {
      const qty = allocations[b.purchaseItemId] || 0;
      if (qty > 0) {
        selectedList.push({
          purchaseItemId: b.purchaseItemId,
          poNumber: b.poNumber,
          unitCost: b.unitCost,
          allocatedQty: qty,
          availableQty: b.availableQuantity,
          supplierName: b.supplierName,
          date: b.date,
        });
      }
    });

    onConfirmAllocation(selectedList, totalAllocatedQty, weightedUnitCost);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-gray-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">
                  Select Purchase Orders (PO Batches)
                </h3>
                {productSku && (
                  <span className="px-2 py-0.5 bg-gray-200/80 text-gray-700 rounded-md font-mono text-[11px] font-semibold">
                    {productSku}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Item: <span className="font-semibold text-gray-800">{productName}</span> • Total On Hand: <span className="font-bold text-emerald-700">{batchData?.totalStock ?? 0} Units</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-2 rounded-xl hover:bg-gray-200/50 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target and Controls Bar */}
        <div className="p-6 bg-white border-b border-gray-100 flex flex-wrap items-end justify-between gap-4">
          <div className="w-full sm:w-80">
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Total Desired Quantity *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                value={targetQty}
                onChange={(e) => setTargetQty(Math.max(1, parseInt(e.target.value) || 0))}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm font-bold text-gray-900 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAutoFillFIFO}
                className="shrink-0 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                title="Auto-fill starting from oldest POs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Auto FIFO
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClear}
              className="px-3.5 py-2 text-gray-500 hover:text-gray-800 text-xs font-semibold hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200"
            >
              Reset Pick
            </button>
            <button
              type="button"
              onClick={loadBatches}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer border border-gray-200"
              title="Refresh Batches"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Batches Table */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="py-16 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
              <p className="text-sm font-medium">Fetching PO batches and inventory lots...</p>
            </div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center text-gray-500 bg-gray-50 rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center p-6 space-y-2">
              <Package className="w-10 h-10 text-gray-300" />
              <p className="text-sm font-bold text-gray-700">No Available PO Batches Found</p>
              <p className="text-xs text-gray-400 max-w-md">
                There are no open purchase lots with positive stock for this product. Ensure purchase invoices have been recorded.
              </p>
            </div>
          ) : (
            <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    <th className="py-3 px-4">PO / Batch Number</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3">Supplier</th>
                    <th className="py-3 px-3 text-right">Purchase Cost</th>
                    <th className="py-3 px-3 text-center">Available Qty</th>
                    <th className="py-3 px-4 w-40 text-center bg-emerald-50/40 text-emerald-900 border-l border-emerald-100">
                      Pick Quantity *
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-xs">
                  {batches.map((batch) => {
                    const picked = allocations[batch.purchaseItemId] || 0;
                    const isSelected = picked > 0;

                    return (
                      <tr 
                        key={batch.purchaseItemId}
                        className={`transition-colors ${
                          isSelected ? 'bg-emerald-50/30' : 'hover:bg-gray-50/60'
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-gray-900">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-800 border border-gray-200">
                            {batch.poNumber}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-gray-500">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {batch.date ? new Date(batch.date).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-gray-600 font-medium">
                          <div className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-gray-400" />
                            <span className="truncate max-w-[140px]">{batch.supplierName}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-gray-900">
                          {format(batch.unitCost)}
                        </td>
                        <td className="py-3 px-3 text-center font-bold text-gray-700">
                          <span className="px-2 py-0.5 bg-gray-100 rounded-md">
                            {batch.availableQuantity}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 bg-emerald-50/20 border-l border-emerald-100">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min="0"
                              max={batch.availableQuantity}
                              value={picked > 0 ? picked : ''}
                              placeholder="0"
                              onChange={(e) => handleQtyChange(batch.purchaseItemId, batch.availableQuantity, e.target.value)}
                              className="w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-center font-bold text-sm text-gray-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleQtyChange(batch.purchaseItemId, batch.availableQuantity, String(batch.availableQuantity))}
                              className="text-[10px] font-extrabold text-emerald-700 hover:bg-emerald-100 px-1.5 py-1 rounded bg-emerald-50 border border-emerald-200 cursor-pointer"
                              title="Pick all available in this PO"
                            >
                              ALL
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Bottom Allocation Summary Bar */}
        <div className="p-6 bg-gray-50 border-t border-gray-200 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase">Allocated Qty</p>
              <p className={`text-base font-black ${totalAllocatedQty === targetQty ? 'text-emerald-700' : 'text-gray-900'}`}>
                {totalAllocatedQty} <span className="text-xs text-gray-400 font-normal">/ {targetQty} Units</span>
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase">Selected PO Batches</p>
              <p className="text-base font-black text-blue-900">
                {Object.keys(allocations).filter((k) => (allocations[k] || 0) > 0).length} PO Batch(es)
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase">Avg Purchase Cost</p>
              <p className="text-base font-black text-gray-900 font-mono">
                {format(weightedUnitCost)} <span className="text-xs text-gray-400 font-normal">/ unit</span>
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-1">
            <div className="text-xs text-gray-500">
              {totalAllocatedQty !== targetQty && (
                <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  Allocated {totalAllocatedQty} units (Target was {targetQty} units).
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={totalAllocatedQty <= 0}
                onClick={handleConfirm}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                Apply Allocation ({totalAllocatedQty} Units)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectPOBatchesModal;
