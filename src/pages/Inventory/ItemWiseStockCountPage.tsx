import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Skeleton } from '@mui/material';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { 
  ERPListPageLayout, 
  type QuickFilterField, 
  type FilterRule 
} from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { 
  ClipboardCheck, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Upload, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingDown, 
  TrendingUp, 
  Scale, 
  Boxes, 
  RefreshCw, 
  Loader2, 
  Sparkles, 
  History, 
  FileSpreadsheet, 
  Check, 
  X,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '../../helper/currency';
import { successToast, errorToast } from '../../helper/toast';
import { 
  fetchStockCountSession, 
  saveStockCountDraft, 
  autoPopulateStockCount, 
  reconcileStockCount, 
  fetchStockCountHistory,
  fetchStockCountSessionById,
  type StockCountSession, 
  type StockCountItem 
} from '../../services/api';
import * as xlsx from 'xlsx';

// Helper: Calculate Monday of given date
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const mon = new Date(date.setDate(diff));
  mon.setHours(0, 0, 0, 0);
  return mon;
}

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'id', placeholder: 'ID', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'name', placeholder: 'Item Name', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'group', placeholder: 'Item Group', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'location', placeholder: 'Bin Location', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-24 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-2.5 py-1 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['ID', 'Item Name', 'Item Group', 'Bin Location', 'Status', 'System Stock', 'Variance'];

export const ItemWiseStockCountPageBase: React.FC = () => {
  const navigate = useNavigate();

  // Active Date & Period
  const [selectedMonday, setSelectedMonday] = useState<Date>(() => getMonday(new Date()));
  const [periodType, setPeriodType] = useState<'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ADHOC'>('WEEKLY');

  // Session Data State
  const [session, setSession] = useState<StockCountSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reconciling, setReconciling] = useState(false);
  const [dirty, setDirty] = useState(false);

  // Local Editable Items State
  const [localItems, setLocalItems] = useState<StockCountItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [viewType, setViewType] = useState('List View');

  // Quick Filters State
  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({
    id: '',
    name: '',
    group: '',
    location: '',
    status: ''
  });
  const [globalSearch, setGlobalSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'DISCREPANCIES' | 'SHORTAGE' | 'SURPLUS' | 'MATCHED' | 'PENDING'>('ALL');

  // Rules Filter State
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [sortField, setSortField] = useState('Item Code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modals
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isConfirmReconcileOpen, setIsConfirmReconcileOpen] = useState(false);
  const [reconcileNotes, setReconcileNotes] = useState('');

  // Bulk Upload File Ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Session for Selected Monday
  const loadSession = async (targetDate: Date) => {
    setLoading(true);
    try {
      const dateStr = targetDate.toISOString().split('T')[0];
      const data = await fetchStockCountSession({ date: dateStr, periodType });
      setSession(data);
      setLocalItems(data.items || []);
      setDirty(false);
      setSelectedIds([]);
    } catch (err: any) {
      console.error('Failed to load stock count session:', err);
      errorToast(err?.response?.data?.error || 'Failed to load stock count session');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession(selectedMonday);
  }, [selectedMonday, periodType]);

  // Navigate Weeks (Mondays)
  const handlePrevMonday = () => {
    const prev = new Date(selectedMonday);
    prev.setDate(prev.getDate() - 7);
    setSelectedMonday(prev);
  };

  const handleNextMonday = () => {
    const next = new Date(selectedMonday);
    next.setDate(next.getDate() + 7);
    setSelectedMonday(next);
  };

  const handleCurrentMonday = () => {
    setSelectedMonday(getMonday(new Date()));
  };

  // Change Counted Quantity for an item
  const handleCountChange = (itemId: string, valStr: string) => {
    if (session?.status === 'Reconciled') return;

    setLocalItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;

      if (valStr === '' || valStr === undefined) {
        return {
          ...item,
          countedQty: null,
          varianceQty: 0,
          varianceValue: 0,
          status: 'Pending'
        };
      }

      const numVal = parseInt(valStr, 10);
      const safeVal = isNaN(numVal) ? 0 : Math.max(0, numVal);
      const systemQty = Number(item.systemQty || 0);
      const costPrice = Number(item.costPrice || 0);
      const varianceQty = safeVal - systemQty;
      const varianceValue = varianceQty * costPrice;

      let status: 'Matched' | 'Shortage' | 'Surplus' | 'Pending' = 'Matched';
      if (varianceQty < 0) status = 'Shortage';
      else if (varianceQty > 0) status = 'Surplus';

      return {
        ...item,
        countedQty: safeVal,
        varianceQty,
        varianceValue,
        status
      };
    }));

    setDirty(true);
  };

  // Quick Match Item: Sets counted = system stock in 1 click
  const handleQuickMatch = (itemId: string) => {
    if (session?.status === 'Reconciled') return;

    setLocalItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return {
        ...item,
        countedQty: item.systemQty,
        varianceQty: 0,
        varianceValue: 0,
        status: 'Matched'
      };
    }));
    setDirty(true);
  };

  // Update item discrepancy reason
  const handleReasonChange = (itemId: string, reason: string) => {
    if (session?.status === 'Reconciled') return;
    setLocalItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return { ...item, reason };
    }));
    setDirty(true);
  };

  // Auto Populate: Pre-fill counted = system stock for all items
  const handleAutoPopulate = async (mode: 'ALL' | 'ONLY_EMPTY') => {
    if (!session?.id || session.status === 'Reconciled') return;
    setSaving(true);
    try {
      const updated = await autoPopulateStockCount(session.id, mode);
      setSession(updated);
      setLocalItems(updated.items || []);
      setDirty(false);
      successToast(mode === 'ALL' 
        ? 'All items auto-filled with system stock quantities!' 
        : 'Remaining empty items auto-filled with system stock!');
    } catch (err: any) {
      errorToast('Failed to auto-populate stock quantities');
    } finally {
      setSaving(false);
    }
  };

  // Save Draft
  const handleSaveDraft = async () => {
    if (!session?.id) return;
    setSaving(true);
    try {
      const payload = {
        sessionId: session.id,
        items: localItems.map(i => ({
          id: i.id,
          productId: i.productId,
          countedQty: i.countedQty,
          reason: i.reason
        }))
      };
      const updated = await saveStockCountDraft(payload);
      setSession(updated);
      setLocalItems(updated.items || []);
      setDirty(false);
      successToast('Stock count draft saved successfully!');
    } catch (err: any) {
      errorToast(err?.response?.data?.error || 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  // Reconcile Stock
  const handleReconcileSubmit = async () => {
    if (!session?.id) return;
    setReconciling(true);
    try {
      await saveStockCountDraft({
        sessionId: session.id,
        items: localItems.map(i => ({
          id: i.id,
          productId: i.productId,
          countedQty: i.countedQty,
          reason: i.reason
        }))
      });

      const res = await reconcileStockCount({
        sessionId: session.id,
        notes: reconcileNotes.trim() || undefined
      });

      setIsConfirmReconcileOpen(false);
      setReconcileNotes('');
      setSession(res.session);
      setLocalItems(res.session.items || []);
      setDirty(false);
      successToast(res.message || 'Stock successfully reconciled!');
    } catch (err: any) {
      console.error('Reconcile error:', err);
      errorToast(err?.response?.data?.error || 'Failed to reconcile stock count');
    } finally {
      setReconciling(false);
    }
  };

  // Open History Modal
  const handleOpenHistory = async () => {
    setIsHistoryModalOpen(true);
    setLoadingHistory(true);
    try {
      const list = await fetchStockCountHistory();
      setHistoryList(list || []);
    } catch (err) {
      errorToast('Failed to load stock count history');
    } finally {
      setLoadingHistory(false);
    }
  };

  // Load a historical session
  const handleSelectHistorySession = async (historyId: string) => {
    setLoading(true);
    setIsHistoryModalOpen(false);
    try {
      const histSession = await fetchStockCountSessionById(historyId);
      setSession(histSession);
      setLocalItems(histSession.items || []);
      setSelectedMonday(new Date(histSession.countDate));
      setDirty(false);
      successToast(`Loaded ${histSession.title}`);
    } catch (err) {
      errorToast('Failed to load session');
    } finally {
      setLoading(false);
    }
  };

  // Bulk Excel Upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = xlsx.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = xlsx.utils.sheet_to_json(ws);

        if (!rows || rows.length === 0) {
          errorToast('Excel sheet is empty');
          return;
        }

        let matchCount = 0;
        setLocalItems(prev => {
          const updated = [...prev];
          rows.forEach(row => {
            const code = String(row['Item Code'] || row['Item Code / SKU'] || row['SKU'] || row['sku'] || row['ID'] || row['Item'] || '').trim().toLowerCase();
            const countedRaw = row['Physical Count'] ?? row['Counted'] ?? row['Physical Stock'] ?? row['Counted Qty'];
            const notes = row['Discrepancy Reason'] || row['Notes'] || row['Remarks'] || '';

            if (code && countedRaw !== undefined && countedRaw !== '') {
              const targetIdx = updated.findIndex(i => i.itemCode.toLowerCase() === code || i.itemName.toLowerCase() === code);
              if (targetIdx !== -1) {
                const target = updated[targetIdx];
                const countedNum = Math.max(0, parseInt(String(countedRaw), 10) || 0);
                const varianceQty = countedNum - target.systemQty;
                const varianceValue = varianceQty * target.costPrice;

                let status: 'Matched' | 'Shortage' | 'Surplus' | 'Pending' = 'Matched';
                if (varianceQty < 0) status = 'Shortage';
                else if (varianceQty > 0) status = 'Surplus';

                updated[targetIdx] = {
                  ...target,
                  countedQty: countedNum,
                  varianceQty,
                  varianceValue,
                  status,
                  reason: notes || target.reason
                };
                matchCount++;
              }
            }
          });
          return updated;
        });

        setDirty(true);
        successToast(`Successfully imported physical counts for ${matchCount} items!`);
      } catch (err: any) {
        console.error('Failed to parse excel:', err);
        errorToast('Failed to parse Excel file. Please ensure columns include Item Code and Physical Count.');
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Download Count Sheet Template
  const handleDownloadCountTemplate = () => {
    if (!localItems.length) return;

    const data = localItems.map((item, idx) => ({
      'No': idx + 1,
      'Item Code / SKU': item.itemCode,
      'Item Name': item.itemName,
      'Item Group': item.itemGroup || '',
      'Location / Warehouse': item.location || '',
      'UOM': item.uom || 'Nos',
      'System Stock': item.systemQty,
      'Physical Count': item.countedQty !== null ? item.countedQty : '',
      'Discrepancy Reason': item.reason || ''
    }));

    const ws = xlsx.utils.json_to_sheet(data);
    const wb = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(wb, ws, 'Stock Count Sheet');
    xlsx.writeFile(wb, `Stock_Count_Sheet_${selectedMonday.toISOString().split('T')[0]}.xlsx`);
    successToast('Stock Count physical sheet downloaded!');
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const total = localItems.length;
    const isItemCounted = (i: StockCountItem) => i.countedQty !== null && i.countedQty !== undefined && String(i.countedQty).trim() !== '';

    const counted = localItems.filter(isItemCounted);
    const matched = localItems.filter(i => isItemCounted(i) && i.status === 'Matched');
    const shortages = localItems.filter(i => isItemCounted(i) && i.status === 'Shortage');
    const surpluses = localItems.filter(i => isItemCounted(i) && i.status === 'Surplus');
    const pending = localItems.filter(i => !isItemCounted(i) || i.status === 'Pending');

    const netVarianceQty = localItems.reduce((sum, i) => {
      if (!isItemCounted(i)) return sum;
      const v = Number(i.varianceQty);
      return sum + (isNaN(v) ? 0 : v);
    }, 0);

    const netVarianceVal = localItems.reduce((sum, i) => {
      if (!isItemCounted(i)) return sum;
      const explicitVal = Number(i.varianceValue);
      const computedVal = Number(i.varianceQty || 0) * Number(i.costPrice || 0);
      const val = !isNaN(explicitVal) ? explicitVal : (!isNaN(computedVal) ? computedVal : 0);
      return sum + val;
    }, 0);

    return {
      total,
      countedCount: counted.length,
      matchedCount: matched.length,
      shortageCount: shortages.length,
      surplusCount: surpluses.length,
      discrepantCount: shortages.length + surpluses.length,
      pendingCount: pending.length,
      netVarianceQty,
      netVarianceVal,
      percentCounted: total > 0 ? Math.round((counted.length / total) * 100) : 0
    };
  }, [localItems]);

  // Filtered Rows for CustomTable
  const filteredRows = useMemo(() => {
    let result = localItems.filter(item => {
      // 1. Quick Filters
      if (quickFilters.id && !item.itemCode.toLowerCase().includes(quickFilters.id.toLowerCase())) return false;
      if (quickFilters.name && !item.itemName.toLowerCase().includes(quickFilters.name.toLowerCase())) return false;
      if (quickFilters.group && !(item.itemGroup || '').toLowerCase().includes(quickFilters.group.toLowerCase())) return false;
      if (quickFilters.location && !(item.location || '').toLowerCase().includes(quickFilters.location.toLowerCase())) return false;
      if (quickFilters.status && !item.status.toLowerCase().includes(quickFilters.status.toLowerCase())) return false;

      // 2. Global Search
      if (globalSearch.trim()) {
        const q = globalSearch.toLowerCase();
        const codeMatch = item.itemCode.toLowerCase().includes(q);
        const nameMatch = item.itemName.toLowerCase().includes(q);
        const groupMatch = (item.itemGroup || '').toLowerCase().includes(q);
        const locMatch = (item.location || '').toLowerCase().includes(q);
        if (!codeMatch && !nameMatch && !groupMatch && !locMatch) return false;
      }

      // 3. Tab filter
      if (activeTab === 'DISCREPANCIES' && item.status !== 'Shortage' && item.status !== 'Surplus') return false;
      if (activeTab === 'SHORTAGE' && item.status !== 'Shortage') return false;
      if (activeTab === 'SURPLUS' && item.status !== 'Surplus') return false;
      if (activeTab === 'MATCHED' && item.status !== 'Matched') return false;
      if (activeTab === 'PENDING' && item.status !== 'Pending') return false;

      // 4. Advanced Filter Rules
      if (filterRules && filterRules.length > 0) {
        for (const rule of filterRules) {
          if (!rule.value?.trim()) continue;
          const rVal = rule.value.toLowerCase();
          let itemVal = '';
          if (rule.field === 'ID') itemVal = item.itemCode.toLowerCase();
          else if (rule.field === 'Item Name') itemVal = item.itemName.toLowerCase();
          else if (rule.field === 'Item Group') itemVal = (item.itemGroup || '').toLowerCase();
          else if (rule.field === 'Bin Location') itemVal = (item.location || '').toLowerCase();
          else if (rule.field === 'Status') itemVal = item.status.toLowerCase();
          else if (rule.field === 'System Stock') itemVal = String(item.systemQty);
          else if (rule.field === 'Variance') itemVal = String(item.varianceQty);

          if (rule.operator === 'Equals' && itemVal !== rVal) return false;
          if (rule.operator === 'Not Equals' && itemVal === rVal) return false;
          if (rule.operator === 'Contains' && !itemVal.includes(rVal)) return false;
          if (rule.operator === 'Starts With' && !itemVal.startsWith(rVal)) return false;
          if (rule.operator === 'Ends With' && !itemVal.endsWith(rVal)) return false;
        }
      }

      return true;
    });

    if (sortField) {
      result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';
        if (sortField === 'Item Code' || sortField === 'ID') {
          valA = a.itemCode;
          valB = b.itemCode;
        } else if (sortField === 'Item Name' || sortField === 'Item') {
          valA = a.itemName;
          valB = b.itemName;
        } else if (sortField === 'Item Group') {
          valA = a.itemGroup || '';
          valB = b.itemGroup || '';
        } else if (sortField === 'Bin Location') {
          valA = a.location || '';
          valB = b.location || '';
        } else if (sortField === 'System Stock') {
          valA = a.systemQty;
          valB = b.systemQty;
        } else if (sortField === 'Variance') {
          valA = a.varianceQty;
          valB = b.varianceQty;
        } else if (sortField === 'Status') {
          valA = a.status;
          valB = b.status;
        }

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        return sortOrder === 'asc' 
          ? String(valA).localeCompare(String(valB)) 
          : String(valB).localeCompare(String(valA));
      });
    }

    return result;
  }, [localItems, quickFilters, globalSearch, activeTab, filterRules, sortField, sortOrder]);

  const isReconciled = session?.status === 'Reconciled';

  // Table Columns (Aligned with Item Master layout & CustomTable)
  const columns: ColumnDef<StockCountItem>[] = useMemo(() => [
    {
      key: 'itemName',
      title: 'ITEM',
      sortable: true,
      render: (_, row) => (
        <div className="py-0.5">
          <div className="font-bold text-gray-900 text-xs tracking-tight">
            {row.itemName}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5 font-medium">
            {row.itemGroup || 'General'} · {row.uom || 'Nos'}
          </div>
        </div>
      )
    },
    {
      key: 'itemGroup',
      title: 'ITEM GROUP',
      width: '140px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val) setQuickFilters(prev => ({ ...prev, group: String(val) }));
          }}
          className="uppercase text-gray-700 font-bold text-xs tracking-wider cursor-pointer hover:text-emerald-700 hover:underline"
        >
          {val || '-'}
        </span>
      )
    },
    {
      key: 'location',
      title: 'BIN LOCATION',
      width: '120px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val) setQuickFilters(prev => ({ ...prev, location: String(val) }));
          }}
          className="font-mono text-xs text-gray-700 font-semibold cursor-pointer hover:text-emerald-700 hover:underline"
        >
          {val || '-'}
        </span>
      )
    },
    {
      key: 'itemCode',
      title: 'ID',
      width: '130px',
      sortable: true,
      render: (val) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            if (val) setQuickFilters(prev => ({ ...prev, id: String(val) }));
          }}
          className="font-mono font-bold text-gray-800 text-xs cursor-pointer hover:text-emerald-700 hover:underline"
        >
          {val}
        </span>
      )
    },
    {
      key: 'systemQty',
      title: 'SYSTEM STOCK',
      width: '120px',
      align: 'right',
      sortable: true,
      render: (val) => (
        <span className="font-mono font-extrabold text-gray-900 text-xs">
          {val}
        </span>
      )
    },
    {
      key: 'countedQty',
      title: 'PHYSICAL COUNT',
      width: '170px',
      align: 'center',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()} className="flex items-center justify-center gap-1.5 py-0.5">
          <input
            type="number"
            min="0"
            step="1"
            disabled={isReconciled}
            value={row.countedQty !== null && row.countedQty !== undefined ? row.countedQty : ''}
            placeholder="Count..."
            onChange={(e) => handleCountChange(row.id, e.target.value)}
            className={`w-24 px-2 py-1 text-center font-mono font-bold rounded-lg text-xs border outline-none shadow-2xs transition-all ${
              row.status === 'Shortage' 
                ? 'border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-500' 
                : row.status === 'Surplus' 
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-900 focus:border-emerald-500'
                  : row.status === 'Matched' 
                    ? 'border-gray-200 bg-gray-50 text-gray-900 focus:border-emerald-500'
                    : 'border-amber-300 bg-amber-50/50 text-amber-900 focus:border-amber-500'
            } ${isReconciled ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
          />
          {!isReconciled && (
            <button
              type="button"
              onClick={() => handleQuickMatch(row.id)}
              title="Set counted equal to system stock"
              className="p-1 rounded-md hover:bg-emerald-100 text-emerald-700 transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )
    },
    {
      key: 'varianceQty',
      title: 'VARIANCE',
      width: '110px',
      align: 'right',
      sortable: true,
      render: (_, row) => {
        if (row.status === 'Pending') return <span className="text-gray-300 font-mono text-xs">-</span>;
        if (row.status === 'Matched') {
          return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-600 font-mono">0</span>;
        }
        if (row.status === 'Shortage') {
          return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 font-mono">{row.varianceQty}</span>;
        }
        return <span className="inline-block px-2 py-0.5 rounded text-[11px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">+{row.varianceQty}</span>;
      }
    },
    {
      key: 'status',
      title: 'STATUS',
      width: '120px',
      align: 'center',
      sortable: true,
      render: (_, row) => (
        <StatusBadge
          status={row.status || 'Pending'}
          size="sm"
        />
      )
    },
    {
      key: 'varianceValue',
      title: 'VARIANCE VALUE',
      width: '130px',
      align: 'right',
      sortable: true,
      render: (val, row) => {
        if (row.status === 'Pending' || row.status === 'Matched') {
          return <span className="text-gray-300 font-mono text-xs">-</span>;
        }
        return (
          <span className={`font-mono text-xs font-bold ${row.status === 'Shortage' ? 'text-rose-700' : 'text-emerald-700'}`}>
            {formatCurrency(val)}
          </span>
        );
      }
    },
    {
      key: 'reason',
      title: 'REASON / REMARKS',
      width: '200px',
      render: (_, row) => (
        <div onClick={(e) => e.stopPropagation()} className="py-0.5">
          <input
            type="text"
            disabled={isReconciled}
            placeholder={row.status === 'Matched' ? 'Verified' : 'e.g. Damaged, Shrinkage...'}
            value={row.reason || ''}
            onChange={(e) => handleReasonChange(row.id, e.target.value)}
            className="w-full px-2 py-1 text-xs bg-white border border-gray-200 focus:border-emerald-500 rounded-md outline-none font-medium text-gray-800 disabled:bg-gray-50 disabled:text-gray-400"
          />
        </div>
      )
    }
  ], [isReconciled]);

  // Bulk actions on selected items
  const handleBulkMatchSelected = () => {
    if (!selectedIds.length || isReconciled) return;
    setLocalItems(prev => prev.map(item => {
      if (!selectedIds.includes(item.id)) return item;
      return {
        ...item,
        countedQty: item.systemQty,
        varianceQty: 0,
        varianceValue: 0,
        status: 'Matched'
      };
    }));
    setDirty(true);
    successToast(`Marked ${selectedIds.length} item(s) as matched!`);
  };

  const handleBulkClearSelected = () => {
    if (!selectedIds.length || isReconciled) return;
    setLocalItems(prev => prev.map(item => {
      if (!selectedIds.includes(item.id)) return item;
      return {
        ...item,
        countedQty: null,
        varianceQty: 0,
        varianceValue: 0,
        status: 'Pending',
        reason: undefined
      };
    }));
    setDirty(true);
    successToast(`Cleared counts for ${selectedIds.length} item(s)`);
  };

  return (
    <>
      <ERPListPageLayout<StockCountItem>
        title="Item Wise Stock Count"
        viewType={viewType}
        onViewTypeChange={setViewType}
        viewTypeOptions={['List View', 'Report View', 'Summary View']}
        loading={loading}
        onRefresh={() => loadSession(selectedMonday)}
        onFetchAllRecords={async () => localItems}
        onPrint={() => window.print()}

        // Quick Filters bar (identical to Item Master)
        quickFilters={quickFilters}
        onQuickFilterChange={(key, val) => setQuickFilters(prev => ({ ...prev, [key]: val }))}
        quickFilterFields={QUICK_FILTER_FIELDS}
        filterRules={filterRules}
        filterRuleFields={FILTER_RULE_FIELDS}
        onAddFilterRule={() => setFilterRules(prev => [...prev, { id: `rule-${Date.now()}`, field: 'ID', operator: 'Equals', value: '' }])}
        onRemoveFilterRule={(id) => setFilterRules(prev => prev.filter(r => r.id !== id))}
        onUpdateFilterRule={(id, key, val) => setFilterRules(prev => prev.map(r => r.id === id ? { ...r, [key]: val } : r))}
        onClearFilterRules={() => setFilterRules([])}
        onApplyFilterRules={() => successToast('Filters applied')}
        onClearAllFilters={() => {
          setQuickFilters({ id: '', name: '', group: '', location: '', status: '' });
          setGlobalSearch('');
          setActiveTab('ALL');
        }}

        sortField={sortField}
        sortOrder={sortOrder}
        onSortChange={(field, order) => { setSortField(field); setSortOrder(order); }}
        sortOptions={['Item Code', 'Item Name', 'Item Group', 'System Stock', 'Variance', 'Status']}

        data={filteredRows}
        columns={columns}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={(ids) => setSelectedIds(ids)}
        onSelectRow={(id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id])}
        onSelectAll={() => setSelectedIds(selectedIds.length === filteredRows.length ? [] : filteredRows.map(p => p.id))}
        emptyMessage="No items match your count filter"

        globalSearch={globalSearch}
        onGlobalSearchChange={setGlobalSearch}

        customExportHandler={async (format, records) => {
          if (format === 'excel') {
            const dataToExport = records.map((item, idx) => ({
              'Sr No': idx + 1,
              'Item Code / SKU': item.itemCode,
              'Item Name': item.itemName,
              'Item Group': item.itemGroup || '-',
              'Bin Location': item.location || '-',
              'UOM': item.uom || 'Nos',
              'System Stock': item.systemQty,
              'Physical Count': item.countedQty !== null && item.countedQty !== undefined ? item.countedQty : '-',
              'Variance': item.varianceQty,
              'Variance Value': item.varianceValue,
              'Status': item.status,
              'Discrepancy Reason': item.reason || '-'
            }));
            const ws = xlsx.utils.json_to_sheet(dataToExport);
            const wb = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(wb, ws, 'Stock Count');
            xlsx.writeFile(wb, `Stock_Count_${selectedMonday.toISOString().split('T')[0]}.xlsx`);
            successToast('Excel exported successfully');
          } else if (format === 'csv') {
            const dataToExport = records.map((item, idx) => ({
              'Sr No': idx + 1,
              'Item Code': item.itemCode,
              'Item Name': item.itemName,
              'Item Group': item.itemGroup || '-',
              'Bin Location': item.location || '-',
              'UOM': item.uom || 'Nos',
              'System Stock': item.systemQty,
              'Physical Count': item.countedQty !== null && item.countedQty !== undefined ? item.countedQty : '',
              'Variance': item.varianceQty,
              'Variance Value': item.varianceValue,
              'Status': item.status,
              'Discrepancy Reason': item.reason || ''
            }));
            const ws = xlsx.utils.json_to_sheet(dataToExport);
            const csv = xlsx.utils.sheet_to_csv(ws);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `Stock_Count_${selectedMonday.toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            successToast('CSV exported successfully');
          }
        }}

        // Extra Action Buttons in Top Header
        extraHeaderActions={
          <div className="flex items-center gap-2">
            {/* View History */}
            <button
              type="button"
              onClick={handleOpenHistory}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="View past weekly stock count sessions"
            >
              <History className="w-3.5 h-3.5 text-gray-500" />
              <span>History</span>
            </button>

            {/* Template / Excel Upload */}
            <input 
              type="file" 
              ref={fileInputRef} 
              accept=".xlsx,.xls,.csv" 
              onChange={handleExcelUpload} 
              className="hidden" 
            />
            
            <button
              type="button"
              onClick={handleDownloadCountTemplate}
              className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              title="Download Excel sheet template for physical floor count"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Count Sheet</span>
            </button>

            {!isReconciled && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Upload filled physical count Excel sheet"
              >
                <Upload className="w-3.5 h-3.5 text-blue-600" />
                <span>Import Excel</span>
              </button>
            )}

            {/* Save Draft */}
            {!isReconciled && (
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-3.5 py-1.5 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                <span>Save Draft</span>
              </button>
            )}

            {/* Submit & Reconcile Button */}
            {!isReconciled && (
              <button
                type="button"
                onClick={() => setIsConfirmReconcileOpen(true)}
                disabled={saving || reconciling || stats.countedCount === 0}
                className="px-3.5 py-1.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow-md cursor-pointer disabled:opacity-50"
                title="Reconcile physical count and update inventory ledger"
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Reconcile Stock</span>
              </button>
            )}
          </div>
        }

        // Bulk Actions Bar
        bulkActions={
          selectedIds.length > 0 && (
            <div className="flex items-center justify-between p-2.5 bg-gray-50 border-b border-gray-200 text-xs">
              <span className="font-bold text-gray-900">
                {selectedIds.length} item(s) selected
              </span>
              <div className="flex items-center gap-2">
                {!isReconciled && (
                  <>
                    <button
                      type="button"
                      onClick={handleBulkMatchSelected}
                      className="px-3 py-1 bg-white border border-emerald-300 hover:bg-emerald-50 text-emerald-800 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Mark as Matched</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleBulkClearSelected}
                      className="px-3 py-1 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5 text-gray-500" />
                      <span>Clear Counts</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        }

        // Top Content: Schedule, KPIs, and Quick Filter Tabs
        topContent={
          <div className="space-y-4">
            {/* 1. Schedule & Time Period Bar (Weekly every Monday) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="p-2 rounded-xl bg-primary-50 text-primary-700">
                  <Calendar className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                    COUNT SCHEDULE & TIME PERIOD
                  </div>
                  <div className="text-sm font-extrabold text-gray-900 mt-0.5 flex items-center gap-2">
                    <span>
                      {loading ? (
                        <Skeleton variant="text" width={220} height={20} animation="wave" sx={{ display: 'inline-block' }} />
                      ) : (
                        session?.title || `Weekly Count - Monday, ${selectedMonday.toLocaleDateString('en-GB')}`
                      )}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                      isReconciled 
                        ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                        : dirty 
                          ? 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
                          : 'bg-blue-100 text-blue-900 border-blue-200'
                    }`}>
                      {isReconciled ? 'Reconciled' : dirty ? 'Unsaved Changes' : session?.status || 'Draft'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Monday Navigation Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1 p-0.5 bg-gray-100 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setPeriodType('WEEKLY')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      periodType === 'WEEKLY' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Weekly (Every Monday)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPeriodType('MONTHLY')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      periodType === 'MONTHLY' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Monthly
                  </button>
                </div>

                <div className="flex items-center gap-1 border border-gray-200 rounded-xl p-0.5 bg-white shadow-2xs">
                  <button
                    type="button"
                    onClick={handlePrevMonday}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                    title="Previous Monday"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleCurrentMonday}
                    className="px-2.5 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer font-mono"
                  >
                    This Monday ({selectedMonday.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })})
                  </button>

                  <button
                    type="button"
                    onClick={handleNextMonday}
                    className="p-1 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors cursor-pointer"
                    title="Next Monday"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* 2. KPI Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  <span>Total Items</span>
                  <Boxes className="w-3.5 h-3.5 text-gray-400" />
                </div>
                <div className="text-xl font-black text-gray-900 mt-1 font-mono">
                  {loading ? <Skeleton variant="text" width={40} height={28} animation="wave" /> : stats.total}
                </div>
                <p className="text-[10px] text-gray-400 mt-0.5">Active Master SKUs</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between text-gray-500 text-[11px] font-bold uppercase tracking-wider">
                  <span>Counted</span>
                  <span className="text-[11px] font-mono font-bold text-emerald-600">
                    {loading ? <Skeleton variant="text" width={28} height={16} animation="wave" /> : `${stats.percentCounted}%`}
                  </span>
                </div>
                <div className="text-xl font-black text-gray-900 mt-1 font-mono">
                  {loading ? (
                    <Skeleton variant="text" width={60} height={28} animation="wave" />
                  ) : (
                    <>
                      {stats.countedCount} <span className="text-xs font-normal text-gray-400">/ {stats.total}</span>
                    </>
                  )}
                </div>
                <div className="w-full bg-gray-100 rounded-full h-1 mt-1.5 overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${stats.percentCounted}%` }}
                  />
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between text-emerald-700 text-[11px] font-bold uppercase tracking-wider">
                  <span>Matched</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-xl font-black text-emerald-700 mt-1 font-mono">
                  {loading ? <Skeleton variant="text" width={40} height={28} animation="wave" /> : stats.matchedCount}
                </div>
                <p className="text-[10px] text-emerald-600/80 mt-0.5">0 Physical Variance</p>
              </div>

              <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs">
                <div className="flex items-center justify-between text-amber-700 text-[11px] font-bold uppercase tracking-wider">
                  <span>Discrepancies</span>
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-xl font-black text-amber-700 mt-1 font-mono">
                  {loading ? <Skeleton variant="text" width={40} height={28} animation="wave" /> : stats.discrepantCount}
                </div>
                <p className="text-[10px] text-amber-600/80 mt-0.5">
                  {stats.shortageCount} Short · {stats.surplusCount} Surplus
                </p>
              </div>

              <div className={`p-3.5 rounded-2xl border shadow-2xs col-span-2 sm:col-span-1 ${
                stats.netVarianceVal < 0 
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950' 
                  : stats.netVarianceVal > 0 
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : 'bg-white border-gray-200 text-gray-900'
              }`}>
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider">
                  <span>Net Variance Value</span>
                  {stats.netVarianceVal < 0 ? <TrendingDown className="w-3.5 h-3.5 text-rose-600" /> : <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <div className="text-lg font-black mt-1 font-mono">
                  {loading ? <Skeleton variant="text" width={90} height={28} animation="wave" /> : formatCurrency(stats.netVarianceVal)}
                </div>
                <p className="text-[10px] opacity-80 mt-0.5 font-mono">
                  {stats.netVarianceQty >= 0 ? `+${stats.netVarianceQty}` : stats.netVarianceQty} Units Net Diff
                </p>
              </div>
            </div>

            {/* 3. Quick Tabs & Auto-Fill Action */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl overflow-x-auto text-xs font-bold">
                {[
                  { id: 'ALL', label: `All Items (${stats.total})` },
                  { id: 'DISCREPANCIES', label: `Discrepant (${stats.discrepantCount})` },
                  { id: 'SHORTAGE', label: `Shortage (${stats.shortageCount})` },
                  { id: 'SURPLUS', label: `Surplus (${stats.surplusCount})` },
                  { id: 'MATCHED', label: `Matched (${stats.matchedCount})` },
                  { id: 'PENDING', label: `Uncounted (${stats.pendingCount})` },
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-3 py-1 rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                      activeTab === tab.id 
                        ? 'bg-white text-gray-900 shadow-2xs font-extrabold' 
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {!isReconciled && (
                <button
                  type="button"
                  onClick={() => handleAutoPopulate('ONLY_EMPTY')}
                  disabled={saving || stats.pendingCount === 0}
                  className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Fill uncounted items with system stock so you only enter differences"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Fill Remaining from System</span>
                </button>
              )}
            </div>
          </div>
        }
      />

      {/* RECONCILE CONFIRMATION MODAL */}
      {isConfirmReconcileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-lg p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                <Scale className="w-6 h-6 text-[#059669]" />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Reconcile Stock & Update Ledger
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {session?.title}
                </p>
              </div>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2 text-xs text-amber-900">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Important Inventory Audit Confirmation</span>
              </div>
              <p>
                Reconciling will create <strong>{stats.discrepantCount} Stock Adjustment entry(ies)</strong> in the Stock Ledger so that book inventory permanently matches the physical count.
              </p>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono border-t border-amber-200/60">
                <div>Shortages: <strong>{stats.shortageCount} items</strong></div>
                <div>Surpluses: <strong>{stats.surplusCount} items</strong></div>
                <div>Net Units: <strong>{stats.netVarianceQty}</strong></div>
                <div>Net Value: <strong>{formatCurrency(stats.netVarianceVal)}</strong></div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700">
                Audit Notes / Approver Remarks
              </label>
              <textarea
                rows={2}
                value={reconcileNotes}
                onChange={(e) => setReconcileNotes(e.target.value)}
                placeholder="e.g. Physical inventory count verified by Store Manager. Discrepancies accounted for."
                className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs text-gray-800 outline-none focus:border-emerald-500 shadow-2xs font-medium resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmReconcileOpen(false)}
                disabled={reconciling}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-900 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReconcileSubmit}
                disabled={reconciling}
                className="px-5 py-2.5 bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shadow-sm hover:shadow cursor-pointer disabled:opacity-50"
              >
                {reconciling && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{reconciling ? 'Reconciling...' : 'Confirm & Reconcile'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORY MODAL / DIALOG */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-primary-100 text-primary-700">
                  <History className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Weekly Stock Count Sessions
                  </h3>
                  <p className="text-xs text-gray-500">
                    Audit history of periodic stock counts and reconciled sessions.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {loadingHistory ? (
                <div className="space-y-3 p-1">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-gray-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <Skeleton variant="text" width="45%" height={20} animation="wave" />
                        <Skeleton variant="rounded" width={70} height={18} sx={{ borderRadius: '9999px' }} animation="wave" />
                      </div>
                      <Skeleton variant="text" width="65%" height={16} animation="wave" />
                    </div>
                  ))}
                </div>
              ) : historyList.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">
                  No previous stock count sessions found.
                </div>
              ) : (
                historyList.map(h => (
                  <div
                    key={h.id}
                    onClick={() => handleSelectHistorySession(h.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                      session?.id === h.id 
                        ? 'bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-400' 
                        : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-gray-50/80 shadow-2xs'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-gray-900">{h.sessionNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          h.status === 'Reconciled' 
                            ? 'bg-emerald-100 text-emerald-900 border-emerald-300' 
                            : 'bg-gray-100 text-gray-700 border-gray-300'
                        }`}>
                          {h.status}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-800 mt-1">{h.title}</h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Date: {new Date(h.countDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </p>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-mono font-bold text-gray-900">
                        {h.totalItems} Items
                      </div>
                      <div className="text-[11px] font-mono text-gray-500 mt-0.5">
                        {h.discrepantItems > 0 ? (
                          <span className="text-rose-700 font-bold">{h.discrepantItems} Discrepancies</span>
                        ) : (
                          <span className="text-emerald-700 font-bold">All Matched</span>
                        )}
                      </div>
                      <div className="text-[10px] font-bold text-emerald-700 flex items-center justify-end gap-1 mt-1">
                        <span>Open Count</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ItemWiseStockCountPage = WithAuth(
  ItemWiseStockCountPageBase,
  ModuleName.INVENTORY_PRODUCTS,
  Permission.LIST
);

export default ItemWiseStockCountPage;
