import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate, useParams, useLocation, useSearchParams } from 'react-router-dom';
import { Formik, Form, FieldArray } from 'formik';
import * as Yup from 'yup';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import { 
  fetchSkus, 
  fetchCustomers, 
  fetchSuppliers, 
  fetchCategories, 
  fetchUnits,
  createInvoice, 
  fetchInvoiceById,
  createCustomer, 
  createSupplier, 
  createCategory, 
  createSku, 
  createProduct,
  createUnit
} from '../../services/api';
import type { SkuMaster, Product, Customer, Supplier, Category, Unit } from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent, SelectOutlinedField, DatePickerComponent, ReusableAutocomplete } from '../../components/input/index';
import { 
  Plus, 
  Trash2, 
  ShoppingCart, 
  FileText, 
  CheckCircle2, 
  Printer, 
  Copy, 
  Share2, 
  Paperclip, 
  Tag, 
  Camera, 
  ChevronDown, 
  Download,
  Receipt,
  QrCode,
  DollarSign,
  CreditCard,
  Building2,
  Calendar,
  Check,
  X,
  ExternalLink,
  Layers,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useCurrency } from '../../helper/currency';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { printInvoice, downloadInvoicePdf } from '../../helper/invoicePrinter';
import { SelectPOBatchesModal, type SelectedPOAllocation } from '../../components/SelectPOBatchesModal';

const invoiceValidationSchema = Yup.object({
  type: Yup.string().required(),
  date: Yup.string().required('Date is required'),
  clientId: Yup.string().when('type', {
    is: 'SALES',
    then: (schema) => schema.required('Customer is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  supplierId: Yup.string().when('type', {
    is: 'PURCHASE',
    then: (schema) => schema.required('Supplier is required'),
    otherwise: (schema) => schema.notRequired(),
  }),
  paymentType: Yup.string().required('Payment method is required'),
  cashAmount: Yup.number().when('paymentType', {
    is: 'PARTIAL',
    then: (schema) => schema.min(0).required('Required for partial'),
    otherwise: (schema) => schema.notRequired(),
  }),
  bankAmount: Yup.number().when('paymentType', {
    is: 'PARTIAL',
    then: (schema) => schema.min(0).required('Required for partial'),
    otherwise: (schema) => schema.notRequired(),
  }),
  items: Yup.array().of(
    Yup.object({
      productId: Yup.string().required('Item is required'),
      quantity: Yup.number().typeError('Must be a number').min(0.01, 'Min 0.01').required('Quantity is required'),
      unitPrice: Yup.number().typeError('Must be a number').min(0, 'Min 0').required('Price is required'),
    })
  ).min(1, 'Please add at least one line item')
});

const customerModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Customer name is required'),
  contact: Yup.string().trim(),
  email: Yup.string().trim().email('Must be a valid email'),
});

const supplierModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Supplier name is required'),
  contact: Yup.string().trim(),
  email: Yup.string().trim().email('Must be a valid email'),
});

const productModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Item name is required'),
  sku: Yup.string().trim().required('Item / SKU code is required'),
  selling_price: Yup.number().min(0, 'Min 0'),
  cost_price: Yup.number().min(0, 'Min 0'),
});

export interface InvoiceFormPageProps {
  defaultType?: 'SALES' | 'PURCHASE';
}

const InvoiceFormPageBase: React.FC<InvoiceFormPageProps> = ({ defaultType }) => {
  const { id: paramId } = useParams();
  const [searchParams] = useSearchParams();
  const queryId = searchParams.get('id');
  const invoiceId = paramId || queryId;
  const isEditMode = Boolean(invoiceId);

  const navigate = useNavigate();
  const location = useLocation();
  const { format, currency } = useCurrency();

  // Determine initial type from URL or prop
  const urlType = searchParams.get('type') as 'SALES' | 'PURCHASE' | null;
  const initialInvoiceType: 'SALES' | 'PURCHASE' = defaultType || urlType || (location.pathname.includes('/purchase') ? 'PURCHASE' : 'SALES');

  const [activeTab, setActiveTab] = useState<'details' | 'payments' | 'terms'>('details');
  const [skus, setSkus] = useState<any[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [existingInvoice, setExistingInvoice] = useState<any>(null);

  // Quick modals for on-the-fly adding
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const [pendingCustomerName, setPendingCustomerName] = useState('');
  const [pendingSupplierName, setPendingSupplierName] = useState('');
  const [pendingProductName, setPendingProductName] = useState('');
  const [pendingItemIndex, setPendingItemIndex] = useState<number | null>(null);

  const [copiedLink, setCopiedLink] = useState(false);
  const [tags, setTags] = useState<string[]>(['DIRECT SALE', 'AURA ERP']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [receiptImage, setReceiptImage] = useState<string | null>(null);

  // PO Batch Selection State
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [activePOItemIndex, setActivePOItemIndex] = useState<number | null>(null);
  const [selectedPOProduct, setSelectedPOProduct] = useState<{
    id: string;
    name: string;
    sku?: string;
    sellingPrice: number;
    quantity: number;
    uom: string;
    initialAllocations?: { purchaseItemId: string; quantity: number }[];
  } | null>(null);

  const customerResolveRef = useRef<((val: Customer) => void) | null>(null);
  const supplierResolveRef = useRef<((val: Supplier) => void) | null>(null);
  const productResolveRef = useRef<((val: any) => void) | null>(null);
  const formikRef = useRef<any>(null);

  useEffect(() => {
    loadMasterData();
    if (invoiceId) {
      loadExistingInvoice(invoiceId);
    }
  }, [invoiceId]);

  const loadMasterData = async () => {
    try {
      const [skuList, custs, supps, cats, uList] = await Promise.all([
        fetchSkus().catch(() => []),
        fetchCustomers().catch(() => []),
        fetchSuppliers().catch(() => []),
        fetchCategories().catch(() => []),
        fetchUnits().catch(() => []),
      ]);
      setSkus(skuList || []);
      setCustomers(custs || []);
      setSuppliers(supps || []);
      setCategories(cats || []);
      setUnits(uList || []);
    } catch (err) {
      console.error('Failed to load master data for invoice form', err);
    }
  };

  const loadExistingInvoice = async (id: string) => {
    try {
      const inv = await fetchInvoiceById(id);
      if (inv) {
        setExistingInvoice(inv);
      }
    } catch (err) {
      console.error('Failed to load existing invoice', err);
    }
  };

  // Comprehensive list of items from SkuMaster API
  const itemMasterOptions = useMemo(() => {
    return skus.map((s: any) => ({
      id: s.id,
      name: s.name || s.sku || 'Item',
      sku: s.sku || '',
      uom: s.uom || s.unit?.name || 'Pcs',
      selling_price: Number(s.selling_price ?? s.price) || 0,
      cost_price: Number(s.cost_price) || 0,
      quantity: Number(s.quantity) || 0,
    }));
  }, [skus]);

  // Quick Customer Creation
  const handleSaveCustomer = async (values: any, resetForm: () => void) => {
    try {
      const newCust = await createCustomer({
        name: values.name.trim(),
        contact: values.contact?.trim() || '',
        email: values.email?.trim() || '',
      });
      setCustomers((prev) => [newCust, ...prev]);
      successToast(`Customer "${newCust.name}" created`);
      setIsCustomerModalOpen(false);
      resetForm();
      if (customerResolveRef.current) {
        customerResolveRef.current(newCust);
        customerResolveRef.current = null;
      }
    } catch (err: any) {
      errorToast(err.response?.data?.error || 'Failed to create customer');
    }
  };

  // Quick Supplier Creation
  const handleSaveSupplier = async (values: any, resetForm: () => void) => {
    try {
      const newSupp = await createSupplier({
        name: values.name.trim(),
        contact: values.contact?.trim() || '',
        email: values.email?.trim() || '',
      });
      setSuppliers((prev) => [newSupp, ...prev]);
      successToast(`Supplier "${newSupp.name}" created`);
      setIsSupplierModalOpen(false);
      resetForm();
      if (supplierResolveRef.current) {
        supplierResolveRef.current(newSupp);
        supplierResolveRef.current = null;
      }
    } catch (err: any) {
      errorToast(err.response?.data?.error || 'Failed to create supplier');
    }
  };

  // Quick Product Creation
  const handleSaveProduct = async (values: any, resetForm: () => void) => {
    try {
      const created = await createProduct({
        name: values.name.trim(),
        sku: values.sku.trim(),
        quantity: 0,
        selling_price: Number(values.selling_price) || 0,
        cost_price: Number(values.cost_price) || 0,
        categoryId: values.categoryId || undefined,
        unitId: values.unitId || undefined,
      });

      setSkus((prev: any) => [created, ...prev]);
      successToast(`Item "${created.name}" created in Item Master`);
      setIsProductModalOpen(false);
      resetForm();

      if (productResolveRef.current) {
        productResolveRef.current(created);
        productResolveRef.current = null;
      }
    } catch (err: any) {
      errorToast(err.response?.data?.error || 'Failed to create item');
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
    successToast('Invoice link copied to clipboard');
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim().toUpperCase())) {
      setTags([...tags, newTagInput.trim().toUpperCase()]);
      setNewTagInput('');
      setShowAddTag(false);
    }
  };

  const handleRemoveTag = (t: string) => {
    setTags(tags.filter(item => item !== t));
  };

  const initialValues = useMemo(() => {
    if (existingInvoice) {
      return {
        type: existingInvoice.type || initialInvoiceType,
        invoiceNumber: existingInvoice.invoiceNumber || '',
        date: existingInvoice.date ? new Date(existingInvoice.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: existingInvoice.dueDate ? new Date(existingInvoice.dueDate).toISOString().split('T')[0] : '',
        clientId: existingInvoice.customerId || existingInvoice.clientId || '',
        supplierId: existingInvoice.supplierId || '',
        paymentType: existingInvoice.paymentType || 'CASH',
        cashAmount: existingInvoice.cashAmount ?? '',
        bankAmount: existingInvoice.bankAmount ?? '',
        creditAmount: existingInvoice.creditAmount ?? '',
        notes: existingInvoice.notes || '',
        paymentTerms: existingInvoice.paymentTerms || 'Payment due on receipt',
        status: existingInvoice.status || 'PAID',
        markAsPaid: true,
        updateStock: true,
        sendEmail: false,
        allowNegativeStock: false,
        items: (existingInvoice.items && existingInvoice.items.length > 0)
          ? existingInvoice.items.map((i: any) => ({
              productId: i.productId || i.product?.id || '',
              quantity: Number(i.quantity) || 1,
              unitPrice: Number(i.unitPrice) || 0,
              costPrice: Number(i.costPrice) || 0,
              purchaseInvoiceNo: i.purchaseInvoiceNo || '',
              purchaseItemId: i.purchaseItemId || '',
              poAllocations: i.poAllocations || [],
              uom: i.product?.unit?.name || i.product?.uom || 'Pcs',
            }))
          : [{ productId: '', quantity: 1, unitPrice: 0, costPrice: 0, purchaseInvoiceNo: '', purchaseItemId: '', poAllocations: [], uom: 'Pcs' }]
      };
    }

    return {
      type: initialInvoiceType,
      invoiceNumber: '',
      date: new Date().toISOString().split('T')[0],
      dueDate: '',
      clientId: '',
      supplierId: '',
      paymentType: 'CASH',
      cashAmount: '',
      bankAmount: '',
      creditAmount: '',
      notes: '',
      paymentTerms: 'Payment due on receipt',
      status: 'DRAFT',
      markAsPaid: true,
      updateStock: true,
      sendEmail: false,
      allowNegativeStock: false,
      items: [{ productId: '', quantity: 1, unitPrice: 0, costPrice: 0, purchaseInvoiceNo: '', purchaseItemId: '', poAllocations: [], uom: 'Pcs' }],
    };
  }, [existingInvoice, initialInvoiceType]);

  const handleOpenPOModal = (index: number, currentItem: any) => {
    if (!currentItem.productId) {
      errorToast('Please select an item first before choosing PO batches');
      return;
    }
    const found = itemMasterOptions.find(o => o.id === currentItem.productId);
    setSelectedPOProduct({
      id: currentItem.productId,
      name: found?.name || 'Selected Item',
      sku: found?.sku || '',
      sellingPrice: Number(currentItem.unitPrice) || found?.selling_price || 0,
      quantity: Number(currentItem.quantity) || 1,
      uom: currentItem.uom || found?.uom || 'Pcs',
      initialAllocations: currentItem.poAllocations || [],
    });
    setActivePOItemIndex(index);
    setIsPOModalOpen(true);
  };

  const handleConfirmPOAllocation = (
    allocations: SelectedPOAllocation[],
    totalAllocatedQty: number,
    weightedCost: number
  ) => {
    if (activePOItemIndex === null || !selectedPOProduct || !formikRef.current) return;

    const poSummaryString = allocations
      .map((a) => `${a.poNumber} (${a.allocatedQty})`)
      .join(', ');

    const currentItems = [...formikRef.current.values.items];
    const existingRow = currentItems[activePOItemIndex] || {};

    currentItems[activePOItemIndex] = {
      ...existingRow,
      productId: selectedPOProduct.id,
      quantity: totalAllocatedQty, // Shows total allocated in Qty text input (e.g. 300)
      costPrice: weightedCost,
      purchaseInvoiceNo: poSummaryString,
      purchaseItemId: allocations.length === 1 ? allocations[0].purchaseItemId : undefined,
      poAllocations: allocations.map((a) => ({
        purchaseItemId: a.purchaseItemId,
        poNumber: a.poNumber,
        quantity: a.allocatedQty,
        unitCost: a.unitCost,
      })),
      uom: selectedPOProduct.uom || 'Pcs',
    };

    formikRef.current.setFieldValue('items', currentItems);

    successToast(
      `Allocated ${totalAllocatedQty} units from ${allocations.length} PO batch(es)!`
    );

    setIsPOModalOpen(false);
    setActivePOItemIndex(null);
    setSelectedPOProduct(null);
  };

  const handleSubmit = async (values: typeof initialValues, { setSubmitting }: any) => {
    try {
      const payload: any = {
        type: values.type,
        date: values.date,
        paymentType: values.paymentType,
        notes: values.notes,
        items: values.items.map((i: any) => ({
          productId: i.productId,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          costPrice: i.costPrice !== undefined && i.costPrice !== null ? Number(i.costPrice) : undefined,
          purchaseInvoiceNo: i.purchaseInvoiceNo || undefined,
          purchaseItemId: i.purchaseItemId || undefined,
          poAllocations: (i.poAllocations && i.poAllocations.length > 0) ? i.poAllocations : undefined,
        })),
      };

      if (values.type === 'SALES') {
        payload.customerId = values.clientId;
      } else {
        payload.supplierId = values.supplierId;
      }

      if (values.paymentType === 'PARTIAL') {
        payload.cashAmount = Number(values.cashAmount) || 0;
        payload.bankAmount = Number(values.bankAmount) || 0;
      }

      const created = await createInvoice(payload);
      successToast(`${values.type === 'SALES' ? 'Sales' : 'Purchase'} Invoice created successfully!`);
      navigate(values.type === 'SALES' ? '/invoices/sales' : '/invoices/purchase');
    } catch (err: any) {
      console.error('Invoice creation error:', err);
      const errorMsg =
        err.response?.data?.error ||
        err.response?.data?.message ||
        err.message ||
        'Failed to create invoice';
      errorToast(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      enableReinitialize
      validationSchema={invoiceValidationSchema}
      onSubmit={handleSubmit}
    >
      {({ values, submitForm, isSubmitting, setFieldValue, dirty }) => {
        const calculateTotal = () => {
          return values.items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
        };

        const grandTotalAmount = calculateTotal();
        const totalQty = values.items.reduce((sum: number, item: any) => sum + (Number(item.quantity) || 0), 0);
        const totalCostAmount = values.items.reduce((sum: number, item: any) => sum + ((Number(item.quantity) || 0) * (Number(item.costPrice) || 0)), 0);
        const totalProfitAmount = grandTotalAmount - totalCostAmount;
        const totalGrossMargin = grandTotalAmount > 0 ? (totalProfitAmount / grandTotalAmount) * 100 : 0;
        const backUrl = values.type === 'SALES' ? '/invoices/sales' : '/invoices/purchase';
        const pageTitle = values.invoiceNumber || (values.type === 'SALES' ? 'New Sales Invoice' : 'New Purchase Invoice');
        const recordCode = values.invoiceNumber || (values.type === 'SALES' ? 'INV-SALES-NEW' : 'INV-PURCHASE-NEW');

        return (
          <ERPFormPageLayout
            recordCode={recordCode}
            header={
              <ERPFormHeader
                title={pageTitle}
                onBack={() => navigate(backUrl)}
                backTitle={values.type === 'SALES' ? 'Back to Sales Invoices' : 'Back to Purchase Invoices'}
                statusBadge={{
                  label: values.status || (isEditMode ? 'Completed' : 'Draft'),
                  variant: values.status === 'PAID' ? 'success' : values.status === 'DRAFT' ? 'warning' : 'blue'
                }}
                dirty={dirty || !isEditMode}
                onDuplicate={() => {
                  setFieldValue('invoiceNumber', '');
                  successToast('Invoice duplicated as new draft');
                }}
                onPrint={() => {
                  if (existingInvoice) {
                    printInvoice(existingInvoice);
                  } else {
                    window.print();
                  }
                }}
                moreMenuItems={[
                  {
                    label: 'Download PDF',
                    onClick: () => {
                      if (existingInvoice) downloadInvoicePdf(existingInvoice);
                      else successToast('Save invoice first to export official PDF');
                    }
                  },
                  {
                    label: 'Copy Invoice Link',
                    onClick: handleCopyLink
                  }
                ]}
                onSave={async () => {
                  if (formikRef.current) {
                    const errs = await formikRef.current.validateForm();
                    if (errs && Object.keys(errs).length > 0) {
                      Object.keys(errs).forEach((key: string) => formikRef.current?.setFieldTouched(key, true, false));
                      const firstErrKey = Object.keys(errs)[0];
                      let firstErrMsg = (errs as any)[firstErrKey];
                      if (typeof firstErrMsg === 'object' && firstErrMsg !== null) {
                        firstErrMsg = Object.values(firstErrMsg).flat().join(', ');
                      }
                      errorToast(typeof firstErrMsg === 'string' ? `Cannot save: ${firstErrMsg}` : 'Please complete all required fields.');
                      return;
                    }
                    submitForm();
                  } else {
                    submitForm();
                  }
                }}
                isSubmitting={isSubmitting}
                saveLabel="Save & Issue"
              />
            }
          >
            <Form noValidate className="space-y-6 w-full">
              {/* MAIN 2-COLUMN LAYOUT ALIGNED WITH ITEM MASTER DETAIL PAGE */}
              <div className="flex flex-col xl:flex-row gap-6 items-start">

                {/* LEFT META SIDEBAR PANEL (~300px) */}
                <div className="w-full xl:w-72 shrink-0 space-y-6">

                  {/* Document Box / Receipt Card matching Item Master avatar */}
                  <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs p-3">
                    <div className="relative group w-full h-52 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex flex-col items-center justify-center p-4 text-center select-none">
                      {receiptImage ? (
                        <img 
                          src={receiptImage} 
                          alt="Receipt Preview" 
                          className="w-full h-full object-contain rounded-xl"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shadow-xs border border-emerald-100">
                            {values.type === 'SALES' ? <FileText className="w-7 h-7" /> : <ShoppingCart className="w-7 h-7" />}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-gray-900 tracking-tight">
                              {values.invoiceNumber || 'DRAFT INVOICE'}
                            </p>
                            <p className="text-lg font-black text-emerald-700 font-mono mt-0.5">
                              {format(grandTotalAmount)}
                            </p>
                            <p className="text-[11px] text-gray-400 mt-1">
                              {totalQty} {totalQty === 1 ? 'Unit' : 'Units'} • {values.paymentType}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Hover Overlay with Change Button */}
                      <label className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer rounded-xl backdrop-blur-[1px]">
                        <span className="bg-white/95 hover:bg-white text-gray-800 text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5 transition-transform scale-95 group-hover:scale-100">
                          <Camera className="w-3.5 h-3.5 text-gray-600" />
                          {receiptImage ? 'Change Receipt' : 'Attach Slip'}
                          <ChevronDown className="w-3 h-3 text-gray-600" />
                        </span>
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setReceiptImage(URL.createObjectURL(file));
                              successToast('Attached document preview');
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Quick remove button */}
                    {receiptImage && (
                      <button
                        type="button"
                        onClick={() => setReceiptImage(null)}
                        className="mt-2 w-full text-center text-xs text-red-600 hover:text-red-700 font-medium py-1 cursor-pointer"
                      >
                        Remove Attachment
                      </button>
                    )}
                  </div>

                  {/* Attachments & Tags Card */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5 space-y-4">
                    {/* Attachments line */}
                    <div className="flex items-center justify-between text-xs pb-3 border-b border-gray-100">
                      <div className="flex items-center gap-2 text-gray-600 font-semibold">
                        <Paperclip className="w-4 h-4 text-gray-400" />
                        <span>Attachments</span>
                      </div>
                      <label className="text-emerald-700 font-bold hover:underline cursor-pointer">
                        + Upload
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              successToast(`File "${e.target.files[0].name}" attached`);
                            }
                          }}
                        />
                      </label>
                    </div>

                    {/* Tags line */}
                    <div className="space-y-2 pb-3 border-b border-gray-100">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 text-gray-600 font-semibold">
                          <Tag className="w-4 h-4 text-gray-400" />
                          <span>Tags</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowAddTag(!showAddTag)}
                          className="text-emerald-700 font-bold hover:underline cursor-pointer"
                        >
                          + Add Tag
                        </button>
                      </div>

                      {showAddTag && (
                        <div className="flex items-center gap-1.5 mt-2">
                          <input
                            type="text"
                            placeholder="Tag name..."
                            value={newTagInput}
                            onChange={(e) => setNewTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            className="w-full text-xs px-2.5 py-1 bg-gray-50 border border-gray-200 rounded-md outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleAddTag}
                            className="px-2 py-1 bg-emerald-600 text-white rounded-md text-xs font-bold cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-gray-100 text-gray-700 text-[11px] font-bold"
                          >
                            {tag}
                            <button
                              type="button"
                              onClick={() => handleRemoveTag(tag)}
                              className="hover:text-red-500 cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Share line */}
                    <div className="flex items-center justify-between text-xs pt-1">
                      <div className="flex items-center gap-2 text-gray-600 font-semibold">
                        <Share2 className="w-4 h-4 text-gray-400" />
                        <span>Share</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="text-emerald-700 font-bold hover:underline cursor-pointer flex items-center gap-1"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
                        {copiedLink ? 'Copied' : 'Copy Link'}
                      </button>
                    </div>
                  </div>

                  {/* Audit Metadata Card */}
                  <div className="bg-white border border-gray-200 rounded-2xl shadow-xs p-5 space-y-2.5 text-xs text-gray-500">
                    <div className="flex justify-between">
                      <span>Created By:</span>
                      <span className="font-semibold text-gray-800">Administrator</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Status:</span>
                      <span className="font-semibold text-emerald-700">{values.status || 'Draft'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span className="font-semibold text-gray-800">Just now</span>
                    </div>
                  </div>

                </div>

                {/* RIGHT MAIN PANEL WITH TABS */}
                <div className="flex-1 w-full min-w-0 bg-white border border-gray-200 rounded-2xl shadow-xs overflow-hidden">
                  
                  {/* TAB NAVIGATION HEADER matching Item Master details page */}
                  <div className="flex items-center border-b border-gray-200 px-6 pt-4 gap-8">
                    <button
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'details'
                          ? 'border-emerald-600 text-emerald-800'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Details
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('payments')}
                      className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'payments'
                          ? 'border-emerald-600 text-emerald-800'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Payments & Banking
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('terms')}
                      className={`pb-3 text-sm font-bold tracking-tight transition-colors border-b-2 cursor-pointer ${
                        activeTab === 'terms'
                          ? 'border-emerald-600 text-emerald-800'
                          : 'border-transparent text-gray-500 hover:text-gray-800'
                      }`}
                    >
                      Terms & Notes
                    </button>
                  </div>

                  {/* TAB CONTENTS */}
                  <div className="p-6 md:p-8 space-y-8">
                    {activeTab === 'details' && (
                      <>
                        {/* SECTION: BASIC INFORMATION */}
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                            BASIC INFORMATION
                          </h4>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                            <SelectOutlinedField
                              name="type"
                              label="Invoice Type *"
                              options={[
                                { label: 'Sales Invoice', value: 'SALES' },
                                { label: 'Purchase Invoice', value: 'PURCHASE' }
                              ]}
                              onChange={(newVal) => {
                                setFieldValue('type', newVal);
                                values.items.forEach((item: any, idx: number) => {
                                  if (item.productId) {
                                    const it = itemMasterOptions.find(o => o.id === item.productId);
                                    if (it) {
                                      setFieldValue(`items.${idx}.unitPrice`, newVal === 'SALES' ? it.selling_price : it.cost_price);
                                    }
                                  }
                                });
                              }}
                            />

                            <TextFieldComponent
                              name="date"
                              label="Invoice Date *"
                              type="date"
                            />

                            {/* Customer Autocomplete (Sales) */}
                            {values.type === 'SALES' ? (
                              <ReusableAutocomplete
                                keyName="clientId"
                                label="Customer (Party Name) *"
                                placeholder="Search or add customer..."
                                options={customers}
                                getOptionLabel={(c: Customer) => c.name || (c as any).companyName || ''}
                                compareKey="id"
                                creatable
                                onCreate={(inputValue) => {
                                  setPendingCustomerName(inputValue);
                                  setIsCustomerModalOpen(true);
                                  return new Promise<Customer>((resolve) => {
                                    customerResolveRef.current = resolve;
                                  });
                                }}
                                onChange={(val: any) => {
                                  setFieldValue('clientId', val?.id || '');
                                }}
                              />
                            ) : (
                              /* Supplier Autocomplete (Purchase) */
                              <ReusableAutocomplete
                                keyName="supplierId"
                                label="Supplier (Party Name) *"
                                placeholder="Search or add supplier..."
                                options={suppliers}
                                getOptionLabel={(s: Supplier) => s.name || (s as any).companyName || ''}
                                compareKey="id"
                                creatable
                                onCreate={(inputValue) => {
                                  setPendingSupplierName(inputValue);
                                  setIsSupplierModalOpen(true);
                                  return new Promise<Supplier>((resolve) => {
                                    supplierResolveRef.current = resolve;
                                  });
                                }}
                                onChange={(val: any) => {
                                  setFieldValue('supplierId', val?.id || '');
                                }}
                              />
                            )}

                            <SelectOutlinedField
                              name="paymentType"
                              label="Payment Method *"
                              options={[
                                { label: 'Cash Settlement', value: 'CASH' },
                                { label: 'Credit (Unpaid)', value: 'CREDIT' },
                                { label: 'Bank Transfer / Cheque', value: 'BANK' },
                                { label: 'Partial Split', value: 'PARTIAL' },
                              ]}
                            />

                            <TextFieldComponent
                              name="dueDate"
                              label="Payment Due Date"
                              type="date"
                            />
                          </div>
                        </div>

                        {/* SECTION: LINE ITEMS (PRODUCTS & CHARGES) */}
                        <div className="space-y-4 pt-4 border-t border-gray-100">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                                LINE ITEMS (PRODUCTS & CHARGES)
                              </h4>
                              {values.type === 'SALES' && (
                                <p className="text-[11px] text-gray-500 mt-0.5">
                                  Select PO Batches per item for strict manual lot tracking and exact profit calculation.
                                </p>
                              )}
                            </div>
                            <span className="text-xs text-gray-400">
                              Auto-populates price and unit from Master Data
                            </span>
                          </div>

                          <FieldArray name="items">
                            {({ push, remove }) => (
                              <div className="space-y-4">
                                <div className="border border-gray-200 rounded-xl overflow-x-auto shadow-2xs">
                                  <table className="w-full min-w-[950px] text-left border-collapse">
                                    <thead>
                                      <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                                        <th className="py-2.5 px-3 w-12 min-w-[48px] text-center border-r border-gray-200 shrink-0">#</th>
                                        <th className="py-2.5 px-4 min-w-[260px] border-r border-gray-200">Item Name *</th>
                                        {values.type === 'SALES' && (
                                          <th className="py-2.5 px-3 min-w-[220px] border-r border-gray-200 text-left bg-blue-50/40 text-blue-900">
                                            Selected PO Batches *
                                          </th>
                                        )}
                                        <th className="py-2.5 px-3 w-24 min-w-[80px] border-r border-gray-200 text-center">Unit (UOM)</th>
                                        <th className="py-2.5 px-3 w-32 min-w-[110px] border-r border-gray-200">Quantity *</th>
                                        <th className="py-2.5 px-3 w-36 min-w-[140px] border-r border-gray-200">
                                          {values.type === 'SALES' ? 'Sell Price' : 'Price'} ({currency?.symbol || '$'}) *
                                        </th>
                                        <th className="py-2.5 px-4 w-32 min-w-[110px] text-right border-r border-gray-200">Row Total</th>
                                        <th className="py-2.5 px-3 w-14 min-w-[56px] text-center">Action</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 text-sm">
                                      {values.items.map((item: any, index: number) => {
                                        const qty = Number(item.quantity) || 0;
                                        const unitPrice = Number(item.unitPrice) || 0;
                                        const rowTotal = qty * unitPrice;

                                        return (
                                          <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-2.5 px-3 text-center text-xs font-mono text-gray-400 border-r border-gray-200 shrink-0">
                                              {index + 1}
                                            </td>

                                            <td className="py-2.5 px-4 min-w-[260px] border-r border-gray-200">
                                              <ReusableAutocomplete
                                                keyName={`items.${index}.productId`}
                                                placeholder={values.type === 'SALES' ? 'Select stock available item...' : 'Select or add item...'}
                                                options={
                                                  values.type === 'SALES'
                                                    ? itemMasterOptions.filter((o) => o.quantity > 0 || o.id === item.productId)
                                                    : itemMasterOptions
                                                }
                                                getOptionLabel={(option: any) => `${option.name}${option.sku ? ` [${option.sku}]` : ''}`}
                                                renderOption={(props, option: any) => {
                                                  const { key, ...optionProps } = props as any;
                                                  return (
                                                    <li
                                                      key={key || option.id}
                                                      {...optionProps}
                                                      className="flex items-center justify-between gap-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 hover:bg-blue-50/50 cursor-pointer"
                                                    >
                                                      <div className="flex flex-col min-w-0">
                                                        <span className="font-medium text-slate-800 truncate">{option.name}</span>
                                                        {option.sku && (
                                                          <span className="text-[11px] text-slate-400 font-mono">SKU: {option.sku}</span>
                                                        )}
                                                      </div>
                                                      <div className="shrink-0 flex items-center gap-1.5">
                                                        {values.type === 'SALES' ? (
                                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                            {option.quantity} in stock
                                                          </span>
                                                        ) : (
                                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                                            Stock: {option.quantity}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </li>
                                                  );
                                                }}
                                                compareKey="id"
                                                creatable={values.type === 'PURCHASE'}
                                                onCreate={(inputValue) => {
                                                  setPendingProductName(inputValue);
                                                  setPendingItemIndex(index);
                                                  setIsProductModalOpen(true);
                                                  return new Promise<any>((resolve) => {
                                                    productResolveRef.current = resolve;
                                                  });
                                                }}
                                                onChange={(selectedProduct: any) => {
                                                  if (selectedProduct) {
                                                    setFieldValue(`items.${index}.productId`, selectedProduct.id);
                                                    setFieldValue(`items.${index}.uom`, selectedProduct.uom || 'Pcs');
                                                    const priceToUse = values.type === 'SALES' ? selectedProduct.selling_price : selectedProduct.cost_price;
                                                    setFieldValue(`items.${index}.unitPrice`, priceToUse);
                                                    setFieldValue(`items.${index}.costPrice`, selectedProduct.cost_price || 0);
                                                    setFieldValue(`items.${index}.purchaseInvoiceNo`, '');
                                                    setFieldValue(`items.${index}.purchaseItemId`, '');
                                                    setFieldValue(`items.${index}.poAllocations`, []);
                                                  } else {
                                                    setFieldValue(`items.${index}.productId`, '');
                                                    setFieldValue(`items.${index}.unitPrice`, 0);
                                                    setFieldValue(`items.${index}.costPrice`, 0);
                                                    setFieldValue(`items.${index}.purchaseInvoiceNo`, '');
                                                    setFieldValue(`items.${index}.purchaseItemId`, '');
                                                    setFieldValue(`items.${index}.poAllocations`, []);
                                                  }
                                                }}
                                              />
                                              {values.type === 'SALES' && item.productId && (
                                                <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500 px-1">
                                                  <span>In Stock:</span>
                                                  <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                                    {itemMasterOptions.find((o) => o.id === item.productId)?.quantity ?? 0} {item.uom || 'Pcs'}
                                                  </span>
                                                </div>
                                              )}
                                            </td>

                                            {/* PO Batch Column (Sales Invoice Only) */}
                                            {values.type === 'SALES' && (
                                              <td className="py-2 px-3 border-r border-gray-200 min-w-[220px]">
                                                {item.purchaseInvoiceNo ? (
                                                  <div
                                                    onClick={() => handleOpenPOModal(index, item)}
                                                    className="group flex flex-col gap-1.5 p-2 bg-slate-50 hover:bg-blue-50/60 rounded-xl border border-slate-200/90 hover:border-blue-300 transition-all cursor-pointer select-none"
                                                    title="Click to view or edit PO allocations"
                                                  >
                                                    <div className="flex items-center justify-between gap-1 text-[11px]">
                                                      <span className="font-bold text-slate-700 group-hover:text-blue-900 flex items-center gap-1">
                                                        <Layers className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                        {item.poAllocations && item.poAllocations.length > 1
                                                          ? `${item.poAllocations.length} PO Batches Allocated`
                                                          : 'PO Batch Allocated'}
                                                      </span>
                                                      <span className="text-[10px] text-blue-600 font-bold group-hover:underline">
                                                        Change
                                                      </span>
                                                    </div>

                                                    <div className="flex flex-wrap gap-1">
                                                      {(item.poAllocations && item.poAllocations.length > 0
                                                        ? item.poAllocations
                                                        : [{ poNumber: item.purchaseInvoiceNo, quantity: item.quantity }]
                                                      ).map((alloc: any, aIdx: number) => (
                                                        <span
                                                          key={aIdx}
                                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-slate-200/80 text-slate-800 text-[11px] font-mono shadow-2xs group-hover:border-blue-200"
                                                        >
                                                          <span className="font-bold text-blue-950">{alloc.poNumber || 'PO'}</span>
                                                          <span className="text-[10px] font-extrabold px-1.5 py-0.2 bg-blue-100/80 text-blue-800 rounded">
                                                            {alloc.quantity} qty
                                                          </span>
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </div>
                                                ) : (
                                                  <button
                                                    type="button"
                                                    disabled={!item.productId}
                                                    onClick={() => handleOpenPOModal(index, item)}
                                                    className="w-full px-2.5 py-2 bg-blue-50/80 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed text-blue-800 rounded-xl text-xs font-bold border border-blue-200/80 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                                    title="Select PO batches for this item"
                                                  >
                                                    <Layers className="w-3.5 h-3.5 text-blue-600" />
                                                    Select PO Batches
                                                  </button>
                                                )}
                                              </td>
                                            )}

                                            <td className="py-2.5 px-3 w-24 min-w-[80px] border-r border-gray-200">
                                              <input
                                                type="text"
                                                readOnly
                                                value={item.uom || 'Pcs'}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 font-medium cursor-not-allowed text-center outline-none"
                                              />
                                            </td>

                                            <td className="py-2.5 px-3 w-32 min-w-[110px] border-r border-gray-200">
                                              <TextFieldComponent
                                                name={`items.${index}.quantity`}
                                                type="number"
                                                placeholder="1"
                                                onChange={(e: any) => {
                                                  setFieldValue(`items.${index}.quantity`, e.target.value);
                                                }}
                                              />
                                            </td>

                                            <td className="py-2.5 px-3 w-36 min-w-[140px] border-r border-gray-200">
                                              <TextFieldComponent
                                                name={`items.${index}.unitPrice`}
                                                type="number"
                                                placeholder="0.00"
                                                onChange={(e: any) => {
                                                  setFieldValue(`items.${index}.unitPrice`, e.target.value);
                                                }}
                                              />
                                            </td>

                                            <td className="py-2.5 px-4 w-32 min-w-[110px] text-right font-mono font-bold text-gray-900 border-r border-gray-200 text-xs">
                                              {format(rowTotal)}
                                            </td>

                                            <td className="py-2.5 px-3 w-14 min-w-[56px] text-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  if (values.items.length > 1) remove(index);
                                                  else errorToast('Invoice must contain at least 1 item');
                                                }}
                                                className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                                                title="Delete Row"
                                              >
                                                <Trash2 className="w-4 h-4" />
                                              </button>
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>

                                <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => push({ productId: '', quantity: 1, unitPrice: 0, costPrice: 0, purchaseInvoiceNo: '', purchaseItemId: '', uom: 'Pcs' })}
                                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                      Add Line Item
                                    </button>
                                  </div>

                                  <div className="text-xs text-gray-500">
                                    Total Lines: <span className="font-bold text-gray-800">{values.items.length}</span> | Total Units: <span className="font-bold text-gray-800">{totalQty}</span>
                                  </div>
                                </div>
                              </div>
                            )}
                          </FieldArray>
                        </div>

                        {/* SECTION: TOTALS & SUMMARY */}
                        <div className="pt-4 border-t border-gray-100 flex flex-col md:flex-row justify-between items-start gap-6">
                          <div className="w-full md:w-1/2 space-y-3">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                              REMARKS & NOTES
                            </h4>
                            <textarea
                              rows={3}
                              placeholder="Add private remarks, shipping instructions, or terms for this invoice..."
                              value={values.notes}
                              onChange={(e) => setFieldValue('notes', e.target.value)}
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 outline-none focus:border-emerald-500 focus:bg-white transition-all"
                            />
                          </div>

                          <div className="w-full md:w-80 bg-gray-50/80 border border-gray-200 rounded-2xl p-5 space-y-3 shadow-2xs">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Subtotal</span>
                              <span className="font-mono font-medium">{format(grandTotalAmount)}</span>
                            </div>



                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Tax / VAT (0%)</span>
                              <span className="font-mono font-medium">{format(0)}</span>
                            </div>
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Discount</span>
                              <span className="font-mono font-medium">{format(0)}</span>
                            </div>
                            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
                              <span className="text-sm font-extrabold text-gray-900">Grand Total</span>
                              <span className="text-xl font-black text-emerald-800 font-mono tracking-tight">
                                {format(grandTotalAmount)}
                              </span>
                            </div>
                          </div>
                        </div>

                      </>
                    )}

                    {/* PAYMENTS & BANKING TAB */}
                    {activeTab === 'payments' && (
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          PAYMENT DETAILS & SPLIT
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <TextFieldComponent
                            name="cashAmount"
                            label="Cash Settlement Amount"
                            placeholder={values.paymentType === 'CASH' ? String(grandTotalAmount) : '0.00'}
                          />
                          <TextFieldComponent
                            name="bankAmount"
                            label="Bank / Wire Transfer Amount"
                            placeholder={values.paymentType === 'BANK' ? String(grandTotalAmount) : '0.00'}
                          />
                        </div>

                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                          <div>
                            <p className="font-bold">Automated Ledger Posting</p>
                            <p className="text-emerald-700">All cash settlements directly balance with Daily Cash book and Bank ledger.</p>
                          </div>
                          <span className="font-mono font-bold text-sm">{format(grandTotalAmount)}</span>
                        </div>
                      </div>
                    )}

                    {/* TERMS & NOTES TAB */}
                    {activeTab === 'terms' && (
                      <div className="space-y-6">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                          TERMS & CONDITIONS
                        </h4>
                        <div>
                          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
                            Standard Terms
                          </label>
                          <textarea
                            rows={4}
                            value={values.paymentTerms}
                            onChange={(e) => setFieldValue('paymentTerms', e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-xs text-gray-800 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* QUICK MODAL: ADD CUSTOMER */}
              {isCustomerModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                      <h3 className="text-base font-bold text-gray-900">Add New Customer</h3>
                      <button onClick={() => setIsCustomerModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <Formik
                      initialValues={{ name: pendingCustomerName, contact: '', email: '' }}
                      validationSchema={customerModalValidationSchema}
                      onSubmit={(vals, { resetForm }) => handleSaveCustomer(vals, resetForm)}
                    >
                      {({ isSubmitting }) => (
                        <Form className="space-y-4">
                          <TextFieldComponent name="name" label="Customer Name *" placeholder="e.g. Katumba Hardware" />
                          <TextFieldComponent name="contact" label="Contact / Phone" placeholder="e.g. +256 700 123456" />
                          <TextFieldComponent name="email" label="Email Address" placeholder="e.g. buyer@example.com" />
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsCustomerModalOpen(false)}
                              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Save & Select
                            </button>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </div>
                </div>
              )}

              {/* QUICK MODAL: ADD SUPPLIER */}
              {isSupplierModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                      <h3 className="text-base font-bold text-gray-900">Add New Supplier</h3>
                      <button onClick={() => setIsSupplierModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <Formik
                      initialValues={{ name: pendingSupplierName, contact: '', email: '' }}
                      validationSchema={supplierModalValidationSchema}
                      onSubmit={(vals, { resetForm }) => handleSaveSupplier(vals, resetForm)}
                    >
                      {({ isSubmitting }) => (
                        <Form className="space-y-4">
                          <TextFieldComponent name="name" label="Supplier Name *" placeholder="e.g. Tororo Cement Ltd" />
                          <TextFieldComponent name="contact" label="Contact / Phone" placeholder="e.g. +256 750 987654" />
                          <TextFieldComponent name="email" label="Email Address" placeholder="e.g. sales@tororo.com" />
                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsSupplierModalOpen(false)}
                              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Save & Select
                            </button>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </div>
                </div>
              )}

              {/* QUICK MODAL: ADD ITEM MASTER */}
              {isProductModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
                  <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Quick Add Item Master</h3>
                        <p className="text-xs text-gray-500">Creates record directly into Item Master & SKUs database</p>
                      </div>
                      <button onClick={() => setIsProductModalOpen(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <Formik
                      initialValues={{
                        name: pendingProductName,
                        sku: pendingProductName ? pendingProductName.replace(/\s+/g, '-').toUpperCase().slice(0, 15) : '',
                        categoryId: '',
                        unitId: '',
                        selling_price: 0,
                        cost_price: 0,
                      }}
                      validationSchema={productModalValidationSchema}
                      onSubmit={(vals, { resetForm }) => handleSaveProduct(vals, resetForm)}
                    >
                      {({ isSubmitting }) => (
                        <Form className="space-y-4">
                          <TextFieldComponent name="name" label="Item Name *" placeholder="e.g. NAILS 3 INCH" />
                          <TextFieldComponent name="sku" label="Item / SKU Code *" placeholder="e.g. NLS-3IN" />

                          <div className="grid grid-cols-2 gap-3">
                            <SelectOutlinedField
                              name="categoryId"
                              label="Item Group"
                              options={categories.map(c => ({ label: c.name, value: c.id }))}
                            />
                            <SelectOutlinedField
                              name="unitId"
                              label="Unit of Measure (UOM)"
                              options={units.map(u => ({ label: u.name, value: u.id }))}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <TextFieldComponent name="selling_price" type="number" label="Standard Selling Rate" placeholder="0.00" />
                            <TextFieldComponent name="cost_price" type="number" label="Standard Purchase Rate" placeholder="0.00" />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <button
                              type="button"
                              onClick={() => setIsProductModalOpen(false)}
                              className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                            >
                              Create & Select
                            </button>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  </div>
                </div>
              )}

              {/* Select PO Batches Modal */}
              <SelectPOBatchesModal
                isOpen={isPOModalOpen}
                onClose={() => {
                  setIsPOModalOpen(false);
                  setActivePOItemIndex(null);
                  setSelectedPOProduct(null);
                }}
                productId={selectedPOProduct?.id || ''}
                productName={selectedPOProduct?.name || ''}
                productSku={selectedPOProduct?.sku}
                initialTargetQty={selectedPOProduct?.quantity || 1}
                initialAllocations={selectedPOProduct?.initialAllocations}
                onConfirmAllocation={handleConfirmPOAllocation}
              />

            </Form>
          </ERPFormPageLayout>
        );
      }}
    </Formik>
  );
};

export const InvoiceFormPage = WithAuth(InvoiceFormPageBase);
export default InvoiceFormPage;
