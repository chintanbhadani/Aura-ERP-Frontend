import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Boxes, 
  Plus, 
  RefreshCw, 
  Search, 
  ArrowRight, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Package, 
  Calendar, 
  FileText, 
  TrendingUp,
  X,
  Scale
} from 'lucide-react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { 
  fetchRepacks, 
  deleteRepack, 
  type RepackEntryData 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { useCurrency } from '../../helper/currency';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';

function RepackListPageBase() {
  const [repacks, setRepacks] = useState<RepackEntryData[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const { format } = useCurrency();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const repacksData = await fetchRepacks();
      setRepacks(repacksData || []);
    } catch (err: any) {
      console.error(err);
      errorToast('Failed to load repack data');
    } finally {
      setLoading(false);
    }
  };

  // Filtered repacks
  const filteredRepacks = useMemo(() => {
    if (!search.trim()) return repacks;
    const q = search.toLowerCase();
    return repacks.filter(r => 
      (r.repackNumber || '').toLowerCase().includes(q) ||
      (r.purchaseInvoiceNo || '').toLowerCase().includes(q) ||
      (r.sourceProduct?.name || '').toLowerCase().includes(q) ||
      (r.sourceProduct?.sku || '').toLowerCase().includes(q) ||
      (r.targetProduct?.name || '').toLowerCase().includes(q) ||
      (r.targetProduct?.sku || '').toLowerCase().includes(q) ||
      (r.notes || '').toLowerCase().includes(q)
    );
  }, [repacks, search]);

  // KPI calculations
  const totalRepacksCount = repacks.length;
  const totalProducedUnits = repacks.reduce((sum, r) => sum + Number(r.targetQuantity || 0), 0);
  const totalConsumedBulk = repacks.reduce((sum, r) => sum + Number(r.sourceQuantity || 0), 0);

  const handleDelete = async (id: string) => {
    try {
      await deleteRepack(id);
      successToast('Repack entry reverted successfully. Stock balances restored.');
      setDeleteConfirmId(null);
      loadData();
    } catch (err: any) {
      console.error(err);
      errorToast(err.response?.data?.error || err.message || 'Failed to revert repack entry');
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top Banner & Header */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-6 sm:p-8 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/30 text-emerald-200 text-xs font-semibold tracking-wide uppercase mb-3">
                <Boxes className="w-3.5 h-3.5 text-emerald-300" />
                <span>Inventory & Assembly</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Repack & Stock Conversion
              </h1>
              <p className="mt-1 text-sm text-emerald-100/90 max-w-xl">
                Convert bulk raw materials or Purchase Order lots into retail packs ready for sale. Live tracking of bulk consumption and pack cost pricing.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition backdrop-blur-sm border border-white/10 shadow-sm disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>

              <Link
                to="/repack/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs font-bold transition shadow-lg hover:shadow-emerald-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Repack</span>
              </Link>
            </div>
          </div>

          {/* Metric Highlights Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-emerald-700/60">
            <div>
              <p className="text-xs font-medium text-emerald-200/80">Total Repack Conversions</p>
              <div className="text-xl font-bold text-white mt-1">
                {totalRepacksCount} Operations
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-200/80">Bulk Consumed</p>
              <div className="text-xl font-bold text-white mt-1">
                {totalConsumedBulk.toLocaleString()} Units Consumed
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-200/80">Retail Packs Produced</p>
              <div className="text-xl font-bold text-emerald-300 mt-1">
                {totalProducedUnits.toLocaleString()} Packs Ready for Sale
              </div>
            </div>
          </div>
        </div>

        {/* Action & Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by SKU, item name, PO #, repack #..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="text-xs font-semibold text-gray-500">
            Showing <span className="font-bold text-gray-900">{filteredRepacks.length}</span> entry(s)
          </div>
        </div>

        {/* Repack Entries Table */}
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                <tr>
                  <th className="py-3.5 px-4">Repack ID</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4">Source (Bulk Consumed)</th>
                  <th className="py-3.5 px-4 text-center"></th>
                  <th className="py-3.5 px-4">Target (Packs Produced)</th>
                  <th className="py-3.5 px-4">Unit Cost</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {filteredRepacks.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      <Boxes className="w-10 h-10 mx-auto text-gray-300 mb-2" />
                      <p className="font-bold text-gray-600">No repack records found</p>
                      <p className="text-xs text-gray-400 mt-1">
                        Click "Create Repack" above to convert bulk raw material or PO lots into retail packs.
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRepacks.map((r) => {
                    const src = r.sourceProduct;
                    const tgt = r.targetProduct;
                    const srcUnit = src?.unit?.name || 'Units';
                    const tgtUnit = tgt?.unit?.name || 'Packs';

                    return (
                      <tr key={r.id} className="hover:bg-gray-50/70 transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">
                          {r.repackNumber}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 font-medium">
                          {r.date ? new Date(r.date).toLocaleDateString() : '-'}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{src?.name || 'Unknown Bulk Item'}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{src?.sku}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 font-bold text-[10px]">
                              - {Number(r.sourceQuantity)} {srcUnit}
                            </span>
                            {r.purchaseInvoiceNo && (
                              <span className="px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px]">
                                PO: {r.purchaseInvoiceNo}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center text-gray-400">
                          <ArrowRight className="w-4 h-4 mx-auto text-emerald-600" />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-gray-900">{tgt?.name || 'Unknown Packed Item'}</div>
                          <div className="text-[11px] text-gray-400 font-mono">{tgt?.sku}</div>
                          <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold text-[10px]">
                            + {Number(r.targetQuantity)} {tgtUnit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-900">
                          {format(Number(r.calculatedCost || 0))}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Completed
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => setDeleteConfirmId(r.id!)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Revert Repack"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* DELETE / REVERT CONFIRMATION MODAL */}
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full space-y-4 shadow-xl border border-gray-100">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-bold text-gray-900 text-sm">Revert Repack Operation?</h3>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                Reverting will restore the consumed raw bulk material back to inventory and deduct the produced packed stock.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmId(null)}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="px-3 py-1.5 rounded-xl bg-red-600 text-white text-xs font-semibold hover:bg-red-700 cursor-pointer shadow-sm"
                >
                  Confirm Revert
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

export const RepackListPage = WithAuth(RepackListPageBase, ModuleName.TAX_INVOICES, Permission.LIST);
export default RepackListPage;
