import React, { useEffect, useState, useRef } from 'react';
import { 
  Receipt, 
  Plus, 
  Trash2, 
  Edit, 
  Search, 
  Calendar, 
  DollarSign, 
  TrendingUp, 
  X,
  FileSpreadsheet
} from 'lucide-react';
import { 
  Button, 
  IconButton, 
  Tooltip, 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Box 
} from '@mui/material';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { toast } from 'react-toastify';
import { 
  fetchExpenses, 
  fetchExpenseDescriptions, 
  createExpenseDescription, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  type Expense,
  type ExpenseDescriptionOption 
} from '../services/api';
import { useCurrency } from '../helper/currency';
import { DataTable } from './Table/DataTable';
import { ReusableAutocomplete, TextFieldComponent, SelectOutlinedField } from './input/index';

const ExpenseSchema = Yup.object().shape({
  date: Yup.string().required('Date is required'),
  description: Yup.string().required('Description is required'),
  amount: Yup.number().typeError('Amount must be a number').positive('Amount must be positive').required('Amount is required'),
  paymentType: Yup.string().required('Payment Type is required'),
  notes: Yup.string().nullable(),
});

export const ExpenseList: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [descriptions, setDescriptions] = useState<ExpenseDescriptionOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');

  // Modal State
  const [openModal, setOpenModal] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Delete Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const { format, symbol } = useCurrency();

  const loadData = async () => {
    setLoading(true);
    try {
      const [expenseData, descData] = await Promise.all([
        fetchExpenses(search),
        fetchExpenseDescriptions(),
      ]);
      setExpenses(expenseData);
      setDescriptions(descData);
    } catch (error) {
      console.error('Failed to load expense data:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setOpenModal(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setOpenModal(true);
  };

  const handleCloseModal = () => {
    setOpenModal(false);
    setEditingExpense(null);
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      if (editingExpense) {
        await updateExpense(editingExpense.id, {
          date: values.date,
          description: values.description,
          amount: Number(values.amount),
          paymentType: values.paymentType,
          notes: values.notes,
        });
        toast.success('Expense updated successfully!');
      } else {
        await createExpense({
          date: values.date,
          description: values.description,
          amount: Number(values.amount),
          paymentType: values.paymentType,
          notes: values.notes,
        });
        toast.success('Expense added successfully!');
      }
      handleCloseModal();
      loadData();
    } catch (error) {
      console.error('Failed to save expense:', error);
      toast.error('Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deleteId);
      toast.success('Expense deleted successfully!');
      setDeleteId(null);
      loadData();
    } catch (error) {
      console.error('Failed to delete expense:', error);
      toast.error('Failed to delete expense');
    } finally {
      setIsDeleting(false);
    }
  };

  // Selection handlers
  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = expenses.length > 0 && expenses.every(exp => selectedIds.has(exp.id));
  const isIndeterminate = !isAllSelected && expenses.some(exp => selectedIds.has(exp.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        expenses.forEach(exp => next.delete(exp.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        expenses.forEach(exp => next.add(exp.id));
        return next;
      });
    }
  };

  // Summary Metrics
  const totalAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayAmount = expenses
    .filter(exp => new Date(exp.date).toISOString().split('T')[0] === todayStr)
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Expense Tracker</h1>
          <p className="text-gray-500 mt-1">Manage and track company daily cash & operational expenses.</p>
        </div>
        <Button 
          variant="contained"
          color="primary"
          startIcon={<Plus className="w-4 h-4" />}
          onClick={handleOpenAddModal}
          sx={{ px: 3, py: 1.2, borderRadius: '12px', fontWeight: 600, textTransform: 'none' }}
        >
          Add Expense
        </Button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-xl text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Expenses</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{format(totalAmount)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today's Expenses</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{format(todayAmount)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-purple-50 rounded-xl text-purple-600">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Records</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{expenses.length}</h3>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Expense Records</h2>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text"
              placeholder="Search description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
            />
          </div>
        </div>

        <DataTable 
          data={expenses}
          paginate
          columns={[
            {
              header: '__checkbox__',
              id: 'select',
              className: 'w-10',
              renderHeader: () => (
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              ),
              cell: ({ row: expense }) => (
                <input
                  type="checkbox"
                  checked={selectedIds.has(expense.id)}
                  onChange={() => toggleSelect(expense.id)}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              ),
            },
            {
              header: 'Date',
              id: 'date',
              cell: ({ row: expense }) => (
                <div className="flex items-center gap-2 text-gray-700 font-medium whitespace-nowrap">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span>
                    {new Date(expense.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: '2-digit',
                      year: '2-digit',
                    })}
                  </span>
                </div>
              ),
            },
            {
              header: 'Description',
              id: 'description',
              cell: ({ row: expense }) => (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-200 whitespace-nowrap">
                  {expense.description}
                </span>
              ),
            },
            {
              header: 'Payment Type',
              id: 'paymentType',
              cell: ({ row: expense }) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${expense.paymentType === 'BANK' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                  {expense.paymentType || 'CASH'}
                </span>
              ),
            },
            {
              header: 'Amount',
              id: 'amount',
              cell: ({ row: expense }) => (
                <span className="font-bold text-gray-900 whitespace-nowrap">
                  {format(expense.amount)}
                </span>
              ),
            },
            {
              header: 'Notes / Remarks',
              id: 'notes',
              cell: ({ row: expense }) => (
                <span className="text-gray-500 text-sm italic">
                  {expense.notes || '—'}
                </span>
              ),
            },
            {
              header: 'Actions',
              id: 'actions',
              cell: ({ row: expense }) => (
                <div className="flex items-center gap-1">
                  <Tooltip title="Edit Expense">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenEditModal(expense)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main', bgcolor: 'primary.50' } }}
                    >
                      <Edit className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete Expense">
                    <IconButton 
                      size="small" 
                      onClick={() => setDeleteId(expense.id)}
                      sx={{ color: 'text.secondary', '&:hover': { color: 'error.main', bgcolor: 'error.50' } }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </div>
              ),
            },
          ]}
        />
      </div>

      {/* Add / Edit Expense Dialog */}
      <Dialog 
        open={openModal} 
        onClose={handleCloseModal}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: '24px', p: 1 } }
        }}
      >
        <DialogTitle className="flex justify-between items-center pb-2">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            <span className="font-bold text-xl text-gray-900">
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </span>
          </div>
          <IconButton onClick={handleCloseModal} size="small">
            <X className="w-5 h-5" />
          </IconButton>
        </DialogTitle>

        <Formik
          initialValues={{
            date: editingExpense 
              ? new Date(editingExpense.date).toISOString().split('T')[0] 
              : new Date().toISOString().split('T')[0],
            description: editingExpense ? editingExpense.description : '',
            amount: editingExpense ? editingExpense.amount : '',
            paymentType: editingExpense?.paymentType || 'CASH',
            notes: editingExpense?.notes || '',
          }}
          validationSchema={ExpenseSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-5">
              <DialogContent className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    name="date"
                    value={values.date}
                    onChange={(e) => setFieldValue('date', e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Description (Autocomplete)
                  </label>
                  <ReusableAutocomplete
                    keyName="description"
                    compareKey="description"
                    label=""
                    placeholder="Search or type description (e.g. BODA, FUEL, LUNCH)..."
                    options={descriptions}
                    getOptionLabel={(opt) => typeof opt === 'string' ? opt : opt?.description || opt?.name || ''}
                    creatable
                    onCreate={async (newDescName) => {
                      try {
                        const created = await createExpenseDescription(newDescName);
                        setDescriptions(prev => {
                          if (prev.some(d => d.description.toLowerCase() === created.description.toLowerCase())) {
                            return prev;
                          }
                          return [...prev, created];
                        });
                        return created;
                      } catch (err) {
                        console.error('Failed to create expense description:', err);
                        return { id: newDescName, description: newDescName, name: newDescName };
                      }
                    }}
                  />
                </div>

                <div>
                  <TextFieldComponent
                    name="amount"
                    label="Amount"
                    placeholder="e.g. 5000"
                    type="number"
                  />
                </div>

                <div>
                  <SelectOutlinedField
                    name="paymentType"
                    label="Payment Method"
                    options={[
                      { label: 'Cash', value: 'CASH' },
                      { label: 'Bank', value: 'BANK' },
                      { label: 'Credit (Unpaid)', value: 'CREDIT' },
                      { label: 'Partial (Cash + Bank)', value: 'PARTIAL' }
                    ]}
                  />
                </div>

                <div>
                  <TextFieldComponent
                    name="notes"
                    label="Notes / Remarks (Optional)"
                    placeholder="Additional details..."
                    multiline
                    rows={2}
                  />
                </div>
              </DialogContent>

              <DialogActions className="px-6 pb-4 pt-2 border-t border-gray-100 flex justify-end gap-3">
                <Button 
                  onClick={handleCloseModal} 
                  variant="outlined" 
                  color="inherit"
                  sx={{ borderRadius: '12px', textTransform: 'none', px: 3 }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={isSubmitting}
                  sx={{ borderRadius: '12px', textTransform: 'none', px: 4, fontWeight: 600 }}
                >
                  {isSubmitting ? 'Saving...' : editingExpense ? 'Update Expense' : 'Save Expense'}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog 
        open={Boolean(deleteId)} 
        onClose={() => setDeleteId(null)}
        slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}
      >
        <DialogTitle className="font-bold text-lg text-gray-900">
          Confirm Delete
        </DialogTitle>
        <DialogContent>
          <p className="text-gray-600 text-sm">
            Are you sure you want to delete this expense record? This action cannot be undone.
          </p>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
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
            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 600 }}
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
