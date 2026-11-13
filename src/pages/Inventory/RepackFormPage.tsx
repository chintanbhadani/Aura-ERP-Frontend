import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Boxes, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Scale, 
  Package, 
  Sparkles, 
  Calendar, 
  FileText, 
  Layers,
  DollarSign,
  Plus,
  X
} from 'lucide-react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ReusableAutocomplete, TextFieldComponent, SelectOutlinedField } from '../../components/input/index';
import { SelectPOBatchesModal, type SelectedPOAllocation } from '../../components/SelectPOBatchesModal';
import { 
  fetchInventory, 
  fetchCategories, 
  fetchUnits, 
  createProduct, 
  createRepack, 
  type Product,
  type Category,
  type Unit 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { useCurrency } from '../../helper/currency';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';

interface RepackFormValues {
  date: string;
  notes: string;
  sourceProductId: string;
  sourceProductName: string;
  sourceProductSku: string;
  sourceUom: string;
  sourceAvailableStock: number;
  sourceUnitCost: number;
  sourceQuantity: number | '';
  targetProductId: string;
  targetProductName: string;
  targetUom: string;
  targetQuantity: number | '';
  packagingCost: number | '';
}

const repackValidationSchema = Yup.object({
  date: Yup.string().required('Date is required'),
  sourceProductId: Yup.string().required('Source bulk item is required'),
  sourceQuantity: Yup.number()
    .typeError('Source quantity must be a number')
    .positive('Quantity must be greater than 0')
    .required('Quantity to consume is required'),
  targetProductId: Yup.string().required('Target retail pack item is required'),
  targetQuantity: Yup.number()
    .typeError('Target quantity must be a number')
    .positive('Quantity must be greater than 0')
    .required('Quantity of packs to produce is required'),
});

const productModalValidationSchema = Yup.object({
  name: Yup.string().trim().required('Item name is required'),
  sku: Yup.string().trim().required('Item / SKU code is required'),
  selling_price: Yup.number().min(0, 'Min 0'),
  cost_price: Yup.number().min(0, 'Min 0'),
});

function RepackFormPageBase() {
  const navigate = useNavigate();
  const { format } = useCurrency();

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // PO Modal State
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [poAllocations, setPoAllocations] = useState<SelectedPOAllocation[]>([]);

  // Quick Add Item Master Modal State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [pendingProductName, setPendingProductName] = useState('');
  const productResolveRef = useRef<((value: any) => void) | null>(null);
  const formikSetFieldValueRef = useRef<((field: string, value: any) => void) | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [invData, catData, unitData] = await Promise.all([
        fetchInventory(),
        fetchCategories(),
        fetchUnits(),
      ]);
      setProducts(invData || []);
      setCategories(catData || []);
      setUnits(unitData || []);
    } catch (err: any) {
      console.error('Failed to load initial data for repack:', err);
      errorToast('Failed to load product catalog');
    } finally {
      setLoading(false);
    }
  };

  const initialValues: RepackFormValues = {
    date: new Date().toISOString().split('T')[0],
    notes: '',
    sourceProductId: '',
    sourceProductName: '',
    sourceProductSku: '',
    sourceUom: 'Units',
    sourceAvailableStock: 0,
    sourceUnitCost: 0,
    sourceQuantity: '',
    targetProductId: '',
    targetProductName: '',
    targetUom: 'Packs',
    targetQuantity: '',
    packagingCost: '',
  };

  const handleSaveQuickProduct = async (values: any, resetForm: () => void) => {
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

      setProducts((prev) => [created, ...prev]);
      successToast(`Item "${created.name}" created in Item Master`);
      setIsProductModalOpen(false);
      resetForm();

      if (formikSetFieldValueRef.current) {
        formikSetFieldValueRef.current('targetProductId', created.id);
        formikSetFieldValueRef.current('targetProductName', created.name);
        const matchedUnit = units.find(u => String(u.id) === String(created.unitId));
        formikSetFieldValueRef.current('targetUom', matchedUnit?.name || 'Packs');
      }

      if (productResolveRef.current) {
        productResolveRef.current(created);
        productResolveRef.current = null;
      }
    } catch (err: any) {
      console.error('Failed to create quick product:', err);
      errorToast(err.response?.data?.error || err.message || 'Failed to create item');
    }
  };

  const handleSubmit = async (values: RepackFormValues) => {
    if (values.sourceProductId === values.targetProductId) {
      errorToast('Source item and Target item cannot be identical');
      return;
    }

    const srcQty = Number(values.sourceQuantity);
    const tgtQty = Number(values.targetQuantity);

    if (srcQty > values.sourceAvailableStock) {
      errorToast(`Cannot consume ${srcQty}. Only ${values.sourceAvailableStock} available in stock.`);
      return;
    }

    setSubmitting(true);
    try {
      await createRepack({
        sourceProductId: values.sourceProductId,
        sourceQuantity: srcQty,
        targetProductId: values.targetProductId,
        targetQuantity: tgtQty,
        packagingCost: Number(values.packagingCost || 0),
        purchaseItemId: poAllocations.length > 0 ? poAllocations[0].purchaseItemId : undefined,
        purchaseInvoiceNo: poAllocations.length > 0 ? poAllocations.map(a => a.poNumber).filter(Boolean).join(', ') : undefined,
        poAllocations: poAllocations.length > 0 ? poAllocations : undefined,
        date: values.date,
        notes: values.notes.trim() || undefined,
      });

      successToast(
        `Repacked ${srcQty} ${values.sourceUom} into ${tgtQty} ${values.targetUom} of ${values.targetProductName}!`
      );
      navigate('/repack');
    } catch (err: any) {
      console.error(err);
      errorToast(err.response?.data?.error || err.message || 'Failed to create repack conversion');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
        
        {/* Top Header & Breadcrumb */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
              <Link to="/repack" className="hover:text-emerald-700 transition flex items-center gap-1">
                <Boxes className="w-3.5 h-3.5 text-emerald-600" />
                <span>Repack</span>
              </Link>
              <span>/</span>
              <span className="text-gray-700">Create Repack / Stock Conversion</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2.5">
              <span>Create Repack & Stock Conversion</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Bulk ➔ Retail Pack
              </span>
            </h1>
            <p className="text-xs text-gray-500">
              Convert raw bulk material or PO lots (e.g. 5 KG Screws) into retail packages (e.g. 50 x 100g packs) ready for sale.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/repack"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition shadow-2xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Repacks</span>
            </Link>
          </div>
        </div>

        {/* FORMIK FORM WRAPPER */}
        <Formik
          initialValues={initialValues}
          validationSchema={repackValidationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldValue, errors, touched }) => {
            formikSetFieldValueRef.current = setFieldValue;

            const srcQtyNum = Number(values.sourceQuantity) || 0;
            const tgtQtyNum = Number(values.targetQuantity) || 0;
            const extraCostNum = Number(values.packagingCost) || 0;

            const isStockInsufficient = srcQtyNum > values.sourceAvailableStock;

            const totalBulkCost = (Number(values.sourceUnitCost) || 0) * srcQtyNum;
            const totalRepackValuation = totalBulkCost + extraCostNum;
            const calculatedCostPerPack = tgtQtyNum > 0 
              ? Math.round((totalRepackValuation / tgtQtyNum) * 100) / 100 
              : 0;

            return (
              <Form className="space-y-6">
                
                {/* Top Config Row: Repack Date & Notes */}
                <div className="bg-white p-5 rounded-3xl border border-gray-200/80 shadow-2xs grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>Repack Date *</span>
                    </label>
                    <input
                      type="date"
                      value={values.date}
                      onChange={(e) => setFieldValue('date', e.target.value)}
                      required
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-gray-500" />
                      <span>Remarks / Notes (Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Bulk 5 KG screw opened and repacked into 100g retail packets"
                      value={values.notes}
                      onChange={(e) => setFieldValue('notes', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 focus:bg-white focus:outline-none focus:border-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                {/* TWO COLUMN WORKSPACE: SOURCE (BULK) vs TARGET (PACK) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* LEFT COLUMN: SOURCE (BULK MATERIAL & PO BATCHES) */}
                  <div className="bg-white rounded-3xl border border-amber-200 shadow-2xs p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-amber-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-800">
                          <Scale className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-extrabold text-amber-950">1. Source (Bulk Consumed)</h2>
                          <p className="text-[11px] text-amber-700">Select stock-available item and allocate PO batches</p>
                        </div>
                      </div>

                      {values.sourceProductId && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                          In Stock: {values.sourceAvailableStock} {values.sourceUom}
                        </span>
                      )}
                    </div>

                    {/* ITEM NAME (ReusableAutocomplete) */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700">
                        Item Name (Bulk Raw Material) *
                      </label>
                      <ReusableAutocomplete
                        keyName="sourceProductId"
                        placeholder="Select stock available item..."
                        options={products.filter((p) => p.quantity > 0 || p.id === values.sourceProductId)}
                        getOptionLabel={(option: any) => `${option.name}${option.sku ? ` [${option.sku}]` : ''}`}
                        renderOption={(props, option: any) => {
                          const { key, ...optionProps } = props as any;
                          return (
                            <li
                              key={key || option.id}
                              {...optionProps}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 hover:bg-emerald-50/50 cursor-pointer"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-slate-800 truncate">{option.name}</span>
                                {option.sku && (
                                  <span className="text-[11px] text-slate-400 font-mono">SKU: {option.sku}</span>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {option.quantity} in stock
                                </span>
                              </div>
                            </li>
                          );
                        }}
                        compareKey="id"
                        onChange={(selectedProduct: any) => {
                          if (selectedProduct) {
                            setFieldValue('sourceProductId', selectedProduct.id);
                            setFieldValue('sourceProductName', selectedProduct.name);
                            setFieldValue('sourceProductSku', selectedProduct.sku || '');
                            setFieldValue('sourceUom', selectedProduct.unit?.name || 'Units');
                            setFieldValue('sourceAvailableStock', Number(selectedProduct.quantity || 0));
                            setFieldValue('sourceUnitCost', Number(selectedProduct.cost_price || 0));
                            setPoAllocations([]);
                          } else {
                            setFieldValue('sourceProductId', '');
                            setFieldValue('sourceProductName', '');
                            setFieldValue('sourceProductSku', '');
                            setFieldValue('sourceUom', 'Units');
                            setFieldValue('sourceAvailableStock', 0);
                            setFieldValue('sourceUnitCost', 0);
                            setFieldValue('sourceQuantity', '');
                            setPoAllocations([]);
                          }
                        }}
                      />
                      {errors.sourceProductId && touched.sourceProductId && (
                        <p className="text-[11px] text-red-500 font-medium">{errors.sourceProductId}</p>
                      )}
                    </div>

                    {/* SELECT PO BATCHES BUTTON / ALLOCATION CARD */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700 flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5 text-blue-600" />
                          <span>Selected PO Batches *</span>
                        </label>
                        {poAllocations.length > 0 && (
                          <span className="text-[11px] text-gray-500">
                            Unit Cost: <strong className="text-blue-900">{format(Number(values.sourceUnitCost || 0))}</strong>
                          </span>
                        )}
                      </div>

                      {poAllocations.length > 0 ? (
                        <div
                          onClick={() => setIsPOModalOpen(true)}
                          className="group flex flex-col gap-2 p-3 bg-blue-50/70 hover:bg-blue-100/60 rounded-2xl border border-blue-200/90 hover:border-blue-300 transition-all cursor-pointer select-none"
                          title="Click to view or edit PO allocations"
                        >
                          <div className="flex items-center justify-between gap-1 text-xs">
                            <span className="font-bold text-blue-900 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                              {poAllocations.length > 1
                                ? `${poAllocations.length} PO Batches Allocated`
                                : 'PO Batch Allocated'}
                            </span>
                            <span className="text-xs text-blue-600 font-bold group-hover:underline">
                              Change Batches
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {poAllocations.map((alloc, aIdx) => (
                              <span
                                key={aIdx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-blue-200 text-xs font-mono shadow-2xs group-hover:border-blue-300"
                              >
                                <span className="font-bold text-blue-950">{alloc.poNumber || 'PO'}</span>
                                <span className="text-[11px] font-extrabold px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">
                                  {alloc.allocatedQty} qty
                                </span>
                                <span className="text-[11px] text-gray-500">
                                  @ {format(alloc.unitCost)}
                                </span>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={!values.sourceProductId}
                          onClick={() => setIsPOModalOpen(true)}
                          className="w-full px-4 py-3 bg-blue-50/80 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed text-blue-800 rounded-2xl text-xs font-bold border border-blue-200/80 flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs"
                          title="Select PO batches for this item"
                        >
                          <Layers className="w-4 h-4 text-blue-600" />
                          <span>Select Available Item PO Batches</span>
                        </button>
                      )}
                    </div>

                    {/* QUANTITY TO CONSUME INPUT */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-gray-700">
                          Quantity to Consume (Bulk) *
                        </label>
                        {values.sourceAvailableStock > 0 && (
                          <button
                            type="button"
                            onClick={() => setFieldValue('sourceQuantity', values.sourceAvailableStock)}
                            className="text-[11px] font-bold text-amber-700 hover:text-amber-900 underline cursor-pointer"
                          >
                            Use All ({values.sourceAvailableStock} {values.sourceUom})
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          placeholder="e.g. 5"
                          value={values.sourceQuantity}
                          onChange={(e) => setFieldValue('sourceQuantity', e.target.value === '' ? '' : Number(e.target.value))}
                          required
                          className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs font-bold text-gray-900 focus:outline-none transition-colors ${
                            isStockInsufficient 
                              ? 'border-red-500 bg-red-50/50 text-red-600 focus:border-red-600' 
                              : 'border-gray-300 focus:border-amber-500'
                          }`}
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {values.sourceUom}
                        </span>
                      </div>
                      {isStockInsufficient && (
                        <p className="text-[11px] font-bold text-red-600 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          Exceeds available stock ({values.sourceAvailableStock} available).
                        </p>
                      )}
                    </div>

                  </div>

                  {/* RIGHT COLUMN: TARGET (RETAIL PACKS TO PRODUCE) */}
                  <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xs p-6 space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-100">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h2 className="text-sm font-extrabold text-emerald-950">2. Target (Packs Produced)</h2>
                          <p className="text-[11px] text-emerald-700">Select or create retail packed product to sell</p>
                        </div>
                      </div>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Ready for Sale
                      </span>
                    </div>

                    {/* TARGET PRODUCT (ReusableAutocomplete with + Add New Item) */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-gray-700">
                          Select Retail Pack Item *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingProductName('');
                            setIsProductModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-emerald-600" />
                          <span>+ Add New Item</span>
                        </button>
                      </div>

                      <ReusableAutocomplete
                        keyName="targetProductId"
                        placeholder="Select or type to create retail pack item..."
                        options={products.filter((p) => p.id !== values.sourceProductId)}
                        getOptionLabel={(option: any) => `${option.name}${option.sku ? ` [${option.sku}]` : ''}`}
                        renderOption={(props, option: any) => {
                          const { key, ...optionProps } = props as any;

                          if (option?.isNew) {
                            return (
                              <li
                                key={key || '__new__'}
                                {...optionProps}
                                className="flex items-center gap-2 px-3 py-2.5 text-xs text-emerald-700 font-bold bg-emerald-50 hover:bg-emerald-100 cursor-pointer border-t border-emerald-200"
                              >
                                <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>+ Add "{option.inputValue || option.name}" as new item</span>
                              </li>
                            );
                          }

                          return (
                            <li
                              key={key || option.id}
                              {...optionProps}
                              className="flex items-center justify-between gap-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 hover:bg-emerald-50/50 cursor-pointer"
                            >
                              <div className="flex flex-col min-w-0">
                                <span className="font-medium text-slate-800 truncate">{option.name}</span>
                                {option.sku && (
                                  <span className="text-[11px] text-slate-400 font-mono">SKU: {option.sku}</span>
                                )}
                              </div>
                              <div className="shrink-0 flex items-center gap-1.5">
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600">
                                  Current: {option.quantity} {option.unit?.name || 'Packs'}
                                </span>
                              </div>
                            </li>
                          );
                        }}
                        compareKey="id"
                        creatable
                        onCreate={(inputValue) => {
                          setPendingProductName(inputValue);
                          setIsProductModalOpen(true);
                          return new Promise<any>((resolve) => {
                            productResolveRef.current = resolve;
                          });
                        }}
                        onChange={(selectedProduct: any) => {
                          if (selectedProduct) {
                            setFieldValue('targetProductId', selectedProduct.id);
                            setFieldValue('targetProductName', selectedProduct.name);
                            setFieldValue('targetUom', selectedProduct.unit?.name || 'Packs');
                          } else {
                            setFieldValue('targetProductId', '');
                            setFieldValue('targetProductName', '');
                            setFieldValue('targetUom', 'Packs');
                          }
                        }}
                      />
                      <p className="text-[11px] text-gray-400">
                        Type a new pack name or click <strong className="text-emerald-700">+ Add New Item</strong> to create it on the fly.
                      </p>
                    </div>

                    {/* QUANTITY TO PRODUCE */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700">
                        Quantity of Packs to Produce *
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0.01"
                          placeholder="e.g. 50"
                          value={values.targetQuantity}
                          onChange={(e) => setFieldValue('targetQuantity', e.target.value === '' ? '' : Number(e.target.value))}
                          required
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                        />
                        <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400">
                          {values.targetUom}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-500">
                        Example: 5 KG bulk screw repacked into 100g bags = <strong>50 packs</strong>.
                      </p>
                    </div>

                    {/* PACKAGING & LABOR COST */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-gray-700 flex items-center gap-1.5">
                        <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                        <span>Packaging & Labor Cost (Optional)</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="any"
                          min="0"
                          placeholder="e.g. 2500"
                          value={values.packagingCost}
                          onChange={(e) => setFieldValue('packagingCost', e.target.value === '' ? '' : Number(e.target.value))}
                          className="w-full px-3.5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <p className="text-[11px] text-gray-400">
                        Includes cost of pouches, stickers, sealing, and labor. Added directly to pack unit cost.
                      </p>
                    </div>

                  </div>
                </div>

                {/* REAL-TIME COST & CONVERSION SUMMARY CARD */}
                <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-xl bg-white/10 text-emerald-300 backdrop-blur-sm">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-extrabold tracking-tight">Conversion & Cost Breakdown</h3>
                        <p className="text-xs text-emerald-200/80">Real-time valuation based on consumed bulk and packaging</p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-300/80">Calculated Cost Per Pack</span>
                      <div className="text-2xl sm:text-3xl font-black text-emerald-300">
                        {format(calculatedCostPerPack)}
                      </div>
                    </div>
                  </div>

                  {/* Visual Conversion Bar */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-1">
                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[11px] text-emerald-200/70 font-medium">Bulk Material Value</span>
                      <div className="text-base font-bold text-white mt-1">
                        {format(totalBulkCost)}
                      </div>
                      <span className="text-[10px] text-emerald-300/60 block mt-0.5">
                        {srcQtyNum} {values.sourceUom} × {format(Number(values.sourceUnitCost || 0))}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[11px] text-emerald-200/70 font-medium">Packaging Cost</span>
                      <div className="text-base font-bold text-white mt-1">
                        {format(extraCostNum)}
                      </div>
                      <span className="text-[10px] text-emerald-300/60 block mt-0.5">
                        Extra pouches / labor
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10">
                      <span className="text-[11px] text-emerald-200/70 font-medium">Total Batch Valuation</span>
                      <div className="text-base font-bold text-emerald-300 mt-1">
                        {format(totalRepackValuation)}
                      </div>
                      <span className="text-[10px] text-emerald-300/60 block mt-0.5">
                        Total production value
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-white/5 border border-white/20">
                      <span className="text-[11px] text-emerald-200/70 font-medium">Output Quantity</span>
                      <div className="text-base font-extrabold text-white mt-1">
                        {tgtQtyNum} {values.targetUom}
                      </div>
                      <span className="text-[10px] text-emerald-300/80 block mt-0.5 font-semibold">
                        Ready to add to stock
                      </span>
                    </div>
                  </div>

                  {/* Explanatory note */}
                  <div className="flex items-center gap-2 text-xs text-emerald-100/80 bg-white/5 p-3 rounded-xl border border-white/10">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      Upon clicking <strong>Convert & Produce Stock</strong>, bulk inventory will be deducted from 
                      <strong> {values.sourceProductName || 'Source'}</strong>, and <strong>+{tgtQtyNum} packs</strong> will be immediately 
                      added to <strong>{values.targetProductName || 'Target Pack'}</strong> with cost price updated to 
                      <strong> {format(calculatedCostPerPack)}</strong>.
                    </span>
                  </div>
                </div>

                {/* FORM ACTION BUTTONS */}
                <div className="flex items-center justify-end gap-3 pt-2">
                  <Link
                    to="/repack"
                    className="px-5 py-2.5 rounded-xl border border-gray-300 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 transition shadow-2xs"
                  >
                    Cancel
                  </Link>
                  <button
                    type="submit"
                    disabled={submitting || isStockInsufficient || !values.sourceProductId || !values.targetProductId || srcQtyNum <= 0 || tgtQtyNum <= 0}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                  >
                    {submitting ? (
                      <span>Processing Conversion...</span>
                    ) : (
                      <>
                        <Boxes className="w-4 h-4" />
                        <span>Convert & Produce Stock</span>
                      </>
                    )}
                  </button>
                </div>

                {/* SELECT PO BATCHES MODAL (Same modal as Sales Invoice) */}
                {values.sourceProductId && (
                  <SelectPOBatchesModal
                    isOpen={isPOModalOpen}
                    onClose={() => setIsPOModalOpen(false)}
                    productId={values.sourceProductId}
                    productName={values.sourceProductName}
                    productSku={values.sourceProductSku}
                    initialTargetQty={Number(values.sourceQuantity) || 1}
                    initialAllocations={poAllocations.map(a => ({
                      purchaseItemId: a.purchaseItemId,
                      quantity: a.allocatedQty,
                    }))}
                    onConfirmAllocation={(allocs, totalQty, weightedCost) => {
                      setPoAllocations(allocs);
                      if (totalQty > 0) {
                        setFieldValue('sourceQuantity', totalQty);
                      }
                      if (weightedCost > 0) {
                        setFieldValue('sourceUnitCost', weightedCost);
                      }
                      setIsPOModalOpen(false);
                    }}
                  />
                )}

                {/* QUICK ADD ITEM MASTER MODAL */}
                {isProductModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                    <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
                      <div className="flex justify-between items-center mb-5 pb-3 border-b border-gray-100">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-bold text-gray-900">Quick Add Item Master</h3>
                            <p className="text-xs text-gray-500">Create new retail pack product directly into Item Master</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsProductModalOpen(false)}
                          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      <Formik
                        initialValues={{
                          name: pendingProductName,
                          sku: pendingProductName ? pendingProductName.replace(/\s+/g, '-').toUpperCase().slice(0, 15) : '',
                          categoryId: '',
                          unitId: units.find(u => u.name.toLowerCase().includes('pack'))?.id || (units[0]?.id ?? ''),
                          selling_price: 0,
                          cost_price: 0,
                        }}
                        validationSchema={productModalValidationSchema}
                        onSubmit={(vals, { resetForm }) => handleSaveQuickProduct(vals, resetForm)}
                      >
                        {({ handleSubmit: handleModalSubmit, isSubmitting: isModalSubmitting }) => (
                          <div className="flex flex-col gap-4 pt-1">
                            <TextFieldComponent name="name" label="Item Name *" placeholder="e.g. Screw 100g Pack" />
                            <TextFieldComponent name="sku" label="Item / SKU Code *" placeholder="e.g. SCR-100G" />

                            <div className="grid grid-cols-2 gap-3">
                              <SelectOutlinedField
                                name="categoryId"
                                label="Item Group / Category"
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
                              <TextFieldComponent name="cost_price" type="number" label="Initial Cost Price" placeholder="0.00" />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 mt-2">
                              <button
                                type="button"
                                onClick={() => setIsProductModalOpen(false)}
                                className="px-5 py-2.5 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                disabled={isModalSubmitting}
                                onClick={() => handleModalSubmit()}
                                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow cursor-pointer flex items-center gap-1.5"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Create & Select</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </Formik>
                    </div>
                  </div>
                )}

              </Form>
            );
          }}
        </Formik>

      </div>
    </DashboardLayout>
  );
}

export const RepackFormPage = WithAuth(RepackFormPageBase, ModuleName.TAX_INVOICES, Permission.ADD);
export default RepackFormPage;
