import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import { FormCommentsAndActivity, triggerActivityRefresh } from '../../components/FormCommentsAndActivity';
import { useSelector } from 'react-redux';
import { 
  fetchExpenseById, 
  createExpense, 
  updateExpense, 
  deleteExpense,
  fetchExpenseDescriptions,
  createExpenseDescription,
  type Expense,
  type ExpenseDescriptionOption
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { useCurrency } from '../../helper/currency';
import { TextFieldComponent, ReusableAutocomplete } from '../../components/input/index';
import { 
  Receipt, 
  Trash2, 
  Tag, 
  Share2, 
  Calendar,
  Wallet,
  FileText
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

const expenseValidationSchema = Yup.object().shape({
  date: Yup.string().required('Date is required'),
  description: Yup.string().trim().required('Description is required'),
  amount: Yup.number()
    .typeError('Amount must be a number')
    .positive('Amount must be greater than zero')
    .required('Amount is required'),
  notes: Yup.string().nullable(),
});

const ExpenseFormPageBase: React.FC = () => {
  const { user } = useSelector((state: any) => state.base);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { format, symbol } = useCurrency();

  const isEditMode = Boolean(id && id !== 'new');

  const [loading, setLoading] = useState(isEditMode);
  const [descriptions, setDescriptions] = useState<ExpenseDescriptionOption[]>([]);
  const [tags, setTags] = useState<string[]>(['EXPENSE', 'FINANCE']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const formikRef = useRef<any>(null);

  const [initialValues, setInitialValues] = useState<{
    id?: string;
    date: string;
    description: string;
    amount: number | string;
    notes: string;
    createdAt?: string;
    updatedAt?: string;
  }>({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    notes: '',
  });

  useEffect(() => {
    loadDescriptions();
    if (isEditMode && id) {
      loadExpense(id);
    }
  }, [id, isEditMode]);

  const loadDescriptions = async () => {
    try {
      const data = await fetchExpenseDescriptions();
      setDescriptions(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load expense descriptions:', err);
    }
  };

  const loadExpense = async (expId: string) => {
    setLoading(true);
    try {
      const data = await fetchExpenseById(expId);
      if (data) {
        let dateStr = new Date().toISOString().split('T')[0];
        if (data.date) {
          try {
            dateStr = new Date(data.date).toISOString().split('T')[0];
          } catch {
            dateStr = String(data.date).slice(0, 10);
          }
        }

        setInitialValues({
          id: data.id,
          date: dateStr,
          description: data.description || '',
          amount: Number(data.amount || 0),
          notes: data.notes || '',
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      }
    } catch (err) {
      console.error('Failed to load expense details:', err);
      errorToast('Failed to load expense details');
    } finally {
      setLoading(false);
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim()) {
      const tagUpper = newTagInput.trim().toUpperCase();
      if (!tags.includes(tagUpper)) {
        setTags([...tags, tagUpper]);
      }
      setNewTagInput('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = async (values: any, { setSubmitting, resetForm }: any) => {
    try {
      setSubmitting(true);
      const payload = {
        date: values.date,
        description: values.description.trim(),
        amount: Number(values.amount),
        notes: values.notes ? values.notes.trim() : null,
      };

      if (isEditMode && id) {
        const updated = await updateExpense(id, payload);
        const newVals = {
          ...values,
          ...(updated || {}),
          date: values.date,
          amount: Number(updated?.amount ?? values.amount),
        };
        setInitialValues(newVals);
        resetForm({ values: newVals });
        triggerActivityRefresh('Expense', id);
        successToast('Expense updated successfully');
      } else {
        const created = await createExpense(payload);
        successToast('Expense created successfully');
        if (created?.id) {
          triggerActivityRefresh('Expense', created.id);
          navigate(`/expenses/${created.id}`);
        } else {
          navigate('/expenses');
        }
      }
    } catch (err: any) {
      console.error('Save expense error:', err);
      errorToast(err?.response?.data?.error || 'Failed to save expense');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!id || id === 'new') return;
    setIsDeleting(true);
    try {
      await deleteExpense(id);
      successToast('Expense deleted successfully');
      navigate('/expenses');
    } catch (err) {
      console.error('Failed to delete expense:', err);
      errorToast('Failed to delete expense');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const pageTitle = isEditMode
    ? initialValues.description 
      ? `${initialValues.description} (${format(Number(initialValues.amount || 0))})`
      : 'Edit Expense'
    : 'New Expense';

  return (
    <Formik
      innerRef={formikRef}
      enableReinitialize
      initialValues={initialValues}
      validationSchema={expenseValidationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, errors, touched, setFieldValue, isSubmitting, dirty }) => (
        <Form>
          <ERPFormPageLayout
            recordCode={isEditMode ? (initialValues.id || id) : 'New Expense'}
            header={
              <ERPFormHeader
                title={pageTitle}
                onBack={() => navigate('/expenses')}
                backTitle="Expenses"
                statusBadge={{
                  label: isEditMode ? 'Saved' : 'Not Saved',
                  variant: isEditMode ? 'success' : 'draft',
                }}
                onSave={async () => {
                  if (formikRef.current) {
                    const errs = await formikRef.current.validateForm();
                    if (errs && Object.keys(errs).length > 0) {
                      Object.keys(errs).forEach((key: string) => formikRef.current?.setFieldTouched(key, true, false));
                      const firstErrKey = Object.keys(errs)[0];
                      const firstErrMsg = (errs as any)[firstErrKey];
                      errorToast(typeof firstErrMsg === 'string' ? `Cannot save: ${firstErrMsg}` : 'Please fix the errors in the form');
                      return;
                    }
                    formikRef.current.handleSubmit();
                  }
                }}
                isSubmitting={isSubmitting}
                dirty={dirty}
                saveLabel="Save Expense"
                moreMenuItems={
                  isEditMode
                    ? [
                        {
                          label: 'Delete Expense',
                          onClick: () => setShowDeleteDialog(true),
                          danger: true,
                          icon: <Trash2 className="w-4 h-4 text-red-600" />,
                        },
                      ]
                    : []
                }
              />
            }
            sidebar={
              <div className="space-y-4">
                {/* Meta details card */}
                <div className="bg-white border border-gray-200/90 rounded-2xl p-4 space-y-3.5 shadow-2xs">
                  <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">
                    Expense Information
                  </h3>

                  {/* Assigned To */}
                  <div className="text-xs space-y-1 border-b border-gray-100 pb-2.5">
                    <span className="text-gray-400 font-medium">Logged By</span>
                    <p className="font-semibold text-gray-800">
                      {user?.name || user?.username || 'Administrator'}
                    </p>
                  </div>

                  {/* Currency Reference */}
                  <div className="text-xs space-y-1 border-b border-gray-100 pb-2.5">
                    <span className="text-gray-400 font-medium">Currency</span>
                    <p className="font-semibold text-gray-800">
                      {symbol} (Base Currency)
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="space-y-2 border-b border-gray-100 pb-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 font-medium flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-gray-400" />
                        Tags
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowTagInput(true)}
                        className="text-primary-700 font-semibold text-xs hover:underline cursor-pointer"
                      >
                        + Add Tag
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map((t, idx) => (
                        <span 
                          key={idx} 
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-gray-100 text-gray-700 border border-gray-200"
                        >
                          {t}
                          <button 
                            type="button" 
                            onClick={() => handleRemoveTag(t)} 
                            className="hover:text-red-500 cursor-pointer ml-0.5"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    {showTagInput && (
                      <div className="flex items-center gap-1 pt-1">
                        <input
                          type="text"
                          value={newTagInput}
                          onChange={(e) => setNewTagInput(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                          placeholder="Tag name..."
                          className="w-full text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-primary-500"
                        />
                        <button 
                          type="button" 
                          onClick={handleAddTag} 
                          className="px-2 py-1 bg-primary text-white rounded text-xs"
                        >
                          Add
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Share Link */}
                  <div className="flex items-center justify-between text-xs pt-0.5">
                    <span className="text-gray-500 font-medium flex items-center gap-1.5">
                      <Share2 className="w-3.5 h-3.5 text-gray-400" />
                      Share
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        successToast('Link copied to clipboard');
                      }}
                      className="text-primary-700 font-semibold text-xs hover:underline cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

                {/* Activity & Comments disabled per design rules
                {isEditMode && id && (
                  <FormCommentsAndActivity
                    entityType="Expense"
                    entityId={id}
                    createdByName={user?.name || user?.username || 'Admin'}
                    createdAt={initialValues.createdAt || 'recently'}
                    lastEditedByName={user?.name || user?.username || 'Admin'}
                    lastEditedAt={initialValues.updatedAt || initialValues.createdAt || 'recently'}
                    currentUser={user}
                  />
                )}
                */}
              </div>
            }
          >
            {/* MAIN DETAILS FORM CARD */}
            <div className="bg-white border border-gray-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center text-primary font-bold">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-gray-900 tracking-tight">
                      Expense Details
                    </h2>
                    <p className="text-xs text-gray-500">
                      Enter date, category description, and amount spent
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Fields Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Date */}
                <TextFieldComponent
                  name="date"
                  label="Date *"
                  type="date"
                />

                {/* Amount */}
                <TextFieldComponent
                  name="amount"
                  label={`Amount (${symbol}) *`}
                  type="number"
                  placeholder="0.00"
                />

                {/* Description (Autocomplete + Creatable) */}
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1.5">
                    Description <span className="text-red-500">*</span>
                  </label>
                  <ReusableAutocomplete
                    keyName="description"
                    compareKey="description"
                    label=""
                    placeholder="Search or type description (e.g. FUEL, TRANSPORT, LUNCH, BODA)..."
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

                {/* Notes / Remarks */}
                <div className="md:col-span-2">
                  <TextFieldComponent
                    name="notes"
                    label="Notes / Remarks (Optional)"
                    multiline
                    rows={3}
                    placeholder="Enter additional details, reference bill/voucher number, or payment remarks..."
                  />
                </div>
              </div>
            </div>
          </ERPFormPageLayout>

          {/* Delete Dialog */}
          <Dialog
            open={showDeleteDialog}
            onClose={() => setShowDeleteDialog(false)}
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
                onClick={() => setShowDeleteDialog(false)}
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
        </Form>
      )}
    </Formik>
  );
};

export const ExpenseFormPage = WithAuth(ExpenseFormPageBase, ModuleName.EXPENSES, Permission.ADD);
export default ExpenseFormPage;
