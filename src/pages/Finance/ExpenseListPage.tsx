import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { 
  fetchExpenses, 
  deleteExpense, 
  type Expense 
} from '../../services/api';
import { useCurrency } from '../../helper/currency';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Trash2, 
  Calendar,
  Wallet,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button 
} from '@mui/material';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'description', placeholder: 'Description', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'startDate', placeholder: 'Start Date', label: 'Start Date', type: 'date' },
  { key: 'endDate', placeholder: 'To Date', label: 'To Date', type: 'date' },
  { key: 'notes', placeholder: 'Notes / Remarks', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
];

const FILTER_RULE_FIELDS = ['Description', 'Date', 'Notes', 'Amount'];

const ExpenseListPageBase: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { format, symbol } = useCurrency();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);

  // Global & Toolbar Filter States
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Quick Filters
  const [quickFilters, setQuickFilters] = useState({
    description: searchParams.get('description') || '',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    notes: '',
  });

  // Filter Rules
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  // Delete State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await fetchExpenses(globalSearch, quickFilters.startDate, quickFilters.endDate);
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch expenses:', err);
      errorToast('Failed to load expenses');
      setExpenses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [globalSearch, quickFilters.startDate, quickFilters.endDate]);

  const handleQuickFilterChange = (key: string, value: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
    setQuickFilters({ description: '', startDate: '', endDate: '', notes: '' });
    setFilterRules([]);
  };

  const hasActiveFilters =
    !!globalSearch ||
    !!assignedToFilter ||
    !!createdByFilter ||
    !!tagFilter ||
    filterRules.length > 0 ||
    Object.values(quickFilters).some(v => !!v);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      // Quick Filters
      if (quickFilters.description) {
        const qDesc = quickFilters.description.toLowerCase();
        if (!(exp.description || '').toLowerCase().includes(qDesc)) return false;
      }
      if (quickFilters.startDate) {
        const expDate = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
        if (expDate && expDate < quickFilters.startDate) return false;
      }
      if (quickFilters.endDate) {
        const expDate = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
        if (expDate && expDate > quickFilters.endDate) return false;
      }
      if (quickFilters.notes) {
        const qNotes = quickFilters.notes.toLowerCase();
        if (!(exp.notes || '').toLowerCase().includes(qNotes)) return false;
      }

      // Filter Rules
      for (const rule of filterRules) {
        if (!rule.value) continue;
        let fieldValue = '';
        if (rule.field === 'Description') fieldValue = exp.description || '';
        else if (rule.field === 'Date') fieldValue = exp.date ? new Date(exp.date).toISOString().split('T')[0] : '';
        else if (rule.field === 'Notes') fieldValue = exp.notes || '';
        else if (rule.field === 'Amount') fieldValue = String(exp.amount || '');

        const val = rule.value.toLowerCase();
        const fVal = fieldValue.toLowerCase();

        if (rule.operator === 'Equals' && fVal !== val) return false;
        if ((rule.operator === 'Contains' || rule.operator === 'Like') && !fVal.includes(val)) return false;
        if (rule.operator === 'Not Equals' && fVal === val) return false;
      }

      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === 'Date') {
        comp = new Date(a.date).getTime() - new Date(b.date).getTime();
      } else if (sortField === 'Amount') {
        comp = Number(a.amount) - Number(b.amount);
      } else if (sortField === 'Description') {
        comp = (a.description || '').localeCompare(b.description || '');
      } else if (sortField === 'Last Updated') {
        comp = new Date(a.updatedAt || a.date).getTime() - new Date(b.updatedAt || b.date).getTime();
      }
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [expenses, quickFilters, filterRules, sortField, sortOrder]);

  // Summary Metrics
  const totalAmount = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredExpenses]);

  const todayAmount = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return filteredExpenses
      .filter(exp => {
        try {
          return new Date(exp.date).toISOString().split('T')[0] === todayStr;
        } catch {
          return false;
        }
      })
      .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  }, [filteredExpenses]);

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deleteId);
      successToast('Expense deleted successfully');
      setDeleteId(null);
      loadData();
    } catch (err) {
      console.error('Failed to delete expense:', err);
      errorToast('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  const columns: ColumnDef<Expense>[] = [
    {
      key: 'date',
      title: 'DATE',
      width: '140px',
      render: (_, row: Expense) => {
        let displayDate = '—';
        try {
          displayDate = new Date(row.date).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
        } catch {
          displayDate = String(row.date);
        }
        return (
          <div className="flex items-center gap-2 font-semibold text-primary-600 hover:text-primary-800 hover:underline cursor-pointer">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <span>{displayDate}</span>
          </div>
        );
      },
    },
    {
      key: 'description',
      title: 'DESCRIPTION',
      render: (_, row: Expense) => (
        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200">
          {row.description}
        </span>
      ),
    },
    {
      key: 'amount',
      title: 'AMOUNT',
      align: 'right',
      width: '160px',
      render: (_, row: Expense) => (
        <span className="font-bold text-gray-900">
          {format(row.amount)}
        </span>
      ),
    },
    {
      key: 'notes',
      title: 'NOTES / REMARKS',
      render: (_, row: Expense) => (
        <span className="text-gray-600 text-sm italic">
          {row.notes || '—'}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '240px',
      render: (_, row: Expense) => (
        <span className="text-xs font-mono font-medium text-gray-700">
          {formatFullDateTime(row.updatedAt || row.createdAt || row.date)}
        </span>
      ),
    },
    {
      key: 'actions',
      title: '',
      width: '50px',
      render: (_, row: Expense) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <button 
            onClick={() => setDeleteId(row.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ERPListPageLayout
        title="Expenses"
        data={filteredExpenses}
        columns={columns}
        loading={loading}
        selectable={false}
        onRowClick={(row: Expense) => navigate(`/expenses/${row.id}`)}
        onAddNew={() => navigate('/expenses/new')}
        addNewLabel="Add Expense"
        searchPlaceholder="Search Expenses..."
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        quickFilterFields={QUICK_FILTER_FIELDS}
        quickFilters={quickFilters}
        onQuickFilterChange={handleQuickFilterChange}
        filterRuleFields={FILTER_RULE_FIELDS}
        filterRules={filterRules}
        setFilterRules={setFilterRules}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={handleClearAllFilters}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        sortOptions={['Date', 'Amount', 'Description', 'Last Updated']}
        viewType={viewType}
        setViewType={setViewType}
        assignedToFilter={assignedToFilter}
        setAssignedToFilter={setAssignedToFilter}
        createdByFilter={createdByFilter}
        setCreatedByFilter={setCreatedByFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        showTags={showTags}
        setShowTags={setShowTags}
        onRefresh={loadData}
        topContent={
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-1">
            <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
              <div className="w-11 h-11 bg-primary-50 text-primary border border-primary-100/60 rounded-xl flex items-center justify-center font-bold text-xl shrink-0">
                {symbol}
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Expenses</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 tracking-tight truncate">{format(totalAmount)}</h3>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
              <div className="w-11 h-11 bg-emerald-50 text-emerald-600 border border-emerald-100/60 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Today's Expenses</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 tracking-tight truncate">{format(todayAmount)}</h3>
              </div>
            </div>

            <div className="bg-white p-4.5 rounded-2xl border border-gray-200/80 shadow-2xs flex items-center gap-4 transition-all hover:shadow-xs">
              <div className="w-11 h-11 bg-purple-50 text-purple-600 border border-purple-100/60 rounded-xl flex items-center justify-center shrink-0">
                <Receipt className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Total Records</p>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mt-0.5 tracking-tight truncate">{filteredExpenses.length}</h3>
              </div>
            </div>
          </div>
        }
      />

      {/* Delete Confirmation Modal */}
      <Dialog
        open={Boolean(deleteId)}
        onClose={() => setDeleteId(null)}
        slotProps={{
          paper: {
            sx: { borderRadius: '16px', p: 1, maxWidth: '420px', width: '100%' }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 700, fontSize: '1.15rem' }}>
          Delete Expense
        </DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600">
            Are you sure you want to delete this expense record? This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions sx={{ pb: 2, px: 3 }}>
          <Button
            onClick={() => setDeleteId(null)}
            variant="outlined"
            color="inherit"
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={isDeleting}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export const ExpenseListPage = WithAuth(ExpenseListPageBase, ModuleName.EXPENSES, Permission.LIST);
export default ExpenseListPage;
