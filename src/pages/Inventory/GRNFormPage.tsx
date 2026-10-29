import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { TextFieldComponent, SelectOutlinedField } from '../../components/input/index';
import { ERPFormHeader, ERPFormPageLayout, ERPFormConnections } from '../../components/ERPForm';
import { FormCommentsAndActivity, triggerActivityRefresh } from '../../components/FormCommentsAndActivity';
import dataService from '../../axios/dataService';
import { 
  fetchGrnById, 
  createGrn, 
  updateGrn, 
  acceptGrn, 
  fetchPurchaseOrders, 
  fetchPurchaseOrderById, 
  fetchSuppliers, 
  fetchSkus, 
  getSupplierName,
  uploadFile,
  type GrnRecord, 
  type GrnItemRow,
  type GrnTaxRow 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Barcode, 
  Plus, 
  Trash2, 
  Download, 
  Upload, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  FileText, 
  Package, 
  Printer, 
  Edit3, 
  Building2,
  Calendar,
  Clock,
  RefreshCw,
  UserPlus,
  Paperclip,
  Share2,
  ExternalLink,
  ChevronsUpDown,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';

const validationSchema = Yup.object().shape({
  series: Yup.string().required('Series is required'),
  postingDate: Yup.string().required('Date is required'),
  supplier: Yup.string().required('Supplier is required'),
  company: Yup.string().required('Company is required'),
});

const GRNFormPageBase: React.FC = () => {
  const formikRef = useRef<any>(null);
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isEdit = Boolean(id && id !== 'new');

  const reduxUser = useSelector((state: any) => state.auth?.user || state.base?.user);
  const currentUserName = reduxUser?.name || reduxUser?.username || reduxUser?.email?.split('@')[0] || 'Administrator';

  // Menu toggles
  const [showGetItemsMenu, setShowGetItemsMenu] = useState(false);
  const [showToolsMenu, setShowToolsMenu] = useState(false);
  const getItemsMenuRef = useRef<HTMLDivElement>(null);
  const toolsMenuRef = useRef<HTMLDivElement>(null);

  // Accordion toggles
  const [showTaxesAccordion, setShowTaxesAccordion] = useState(true);

  // Modal pickers
  const [showPOPickerModal, setShowPOPickerModal] = useState(false);
  const [showInvoicePickerModal, setShowInvoicePickerModal] = useState(false);
  const [showSkuPickerModal, setShowSkuPickerModal] = useState(false);

  // Lists for pickers
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [skuList, setSkuList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form dirtiness & Sidebar state
  const [isFormDirty, setIsFormDirty] = useState<boolean>(!isEdit);
  const [assignedTo, setAssignedTo] = useState(currentUserName);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [tags, setTags] = useState<string[]>(['STOCK', 'RECEIPT']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  // Active form tab
  const [activeTab, setActiveTab] = useState<'details' | 'address' | 'terms' | 'more' | 'connections'>('details');

  // Form State
  const [grnId, setGrnId] = useState<string>(id && id !== 'new' ? id : '');
  const [status, setStatus] = useState<string>('Draft');
  const [itemsList, setItemsList] = useState<GrnItemRow[]>([
    {
      id: '1',
      itemCode: '',
      uom: 'Pcs',
      acceptedQuantity: 1,
      rate: 0,
      amount: 0
    }
  ]);

  const [taxesList, setTaxesList] = useState<GrnTaxRow[]>([]);

  const [initialValues, setInitialValues] = useState({
    grnId: id && id !== 'new' ? id : '',
    series: 'PS-GR-.YYYY.-.MM.-',
    postingDate: new Date().toISOString().split('T')[0],
    postingTime: new Date().toTimeString().split(' ')[0],
    editPostingDateTime: false,
    supplier: searchParams.get('supplier') || searchParams.get('supplierName') || '',
    supplierDeliveryNote: '',
    supplierInvoiceNumber: '',
    efdReceipt: '',
    company: 'PATEL STRAP INDUSTRIES LTD',
    applyPutawayRule: false,
    isReturn: false,
    defaultHod: 'Stock Manager',
    payment: 'Pending',
    acceptedWarehouse: 'Main Store - PSL',
    scanBarcode: '',
    purchaseOrderId: '',
    costCenter: 'Main - PS',
    project: '',
    currency: 'INR',
    priceList: 'Standard Buying',
    taxCategory: 'In State GST',
    shippingRule: '',
    incoterm: '',
    purchaseTaxesTemplate: '',
    totalTrips: 1
  });

  const paramPoId = searchParams.get('poId');

  const resolveSupplierName = (record: any): string => {
    if (!record) return '';
    const supplierObj = record.supplierObj || (typeof record.supplier === 'object' ? record.supplier : null);
    let rawName = (supplierObj && (supplierObj.name || supplierObj.supplierName || supplierObj.companyName)) ||
      (typeof record.supplier === 'string' ? record.supplier : '') ||
      record.supplierName || record.supplierId || '';

    if (!rawName) return '';

    if (suppliersList && suppliersList.length > 0) {
      const matched = suppliersList.find((s: any) =>
        String(s.name || '').toLowerCase() === String(rawName).toLowerCase() ||
        String(s.id || '').toLowerCase() === String(rawName).toLowerCase()
      );
      if (matched) return matched.name || String(matched.id);
    }

    return getSupplierName(record.supplier, record.supplierObj) || String(rawName);
  };

  useEffect(() => {
    if (paramPoId && !isEdit) {
      fetchPurchaseOrderById(paramPoId).then(po => {
        if (po) {
          const suppName = resolveSupplierName(po);
          setInitialValues(prev => ({
            ...prev,
            supplier: suppName || prev.supplier,
            company: po.company || prev.company,
            acceptedWarehouse: po.setWarehouse || prev.acceptedWarehouse,
            purchaseOrderId: po.id
          }));
          if (po.items && po.items.length > 0) {
            const convertedItems: GrnItemRow[] = po.items.map((it: any, idx: number) => {
              const remaining = Math.max(0, (it.quantity || 0) - (it.receivedQty || 0));
              const acceptedQty = remaining > 0 ? remaining : (it.quantity || 1);
              return {
                id: String(idx + 1),
                itemCode: it.itemCode,
                uom: it.uom || 'Pcs',
                acceptedQuantity: acceptedQty,
                rate: it.rate || 0,
                amount: acceptedQty * (it.rate || 0),
                wbNo: `WB-${100 + idx}`,
                wbSlipNo: `SLIP-${80 + idx}`,
                mine: 'Main Store'
              };
            });
            setItemsList(convertedItems);
            successToast(`Loaded remaining quantities from Purchase Order ${po.id}`);
          }
        }
      }).catch(() => {});
    }
  }, [paramPoId, isEdit]);

  // Load dropdown data & existing record
  useEffect(() => {
    loadReferenceData();
    if (isEdit && id) {
      loadGrnRecord(id);
    }
  }, [id]);

  const loadReferenceData = async () => {
    try {
      const [posData, suppsData, skusData] = await Promise.all([
        fetchPurchaseOrders().catch(() => []),
        fetchSuppliers().catch(() => []),
        fetchSkus().catch(() => [])
      ]);
      setPurchaseOrders(posData || []);
      setSuppliersList(suppsData || []);
      setSkuList(skusData || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadGrnRecord = async (recordId: string) => {
    try {
      setLoading(true);
      const data = await fetchGrnById(recordId);
      if (data) {
        setGrnId(data.id || recordId);
        setStatus(data.status || 'Draft');
        setInitialValues(prev => ({
          ...prev,
          grnId: data.id || recordId,
          series: data.series || prev.series,
          postingDate: data.postingDate || prev.postingDate,
          postingTime: data.postingTime || prev.postingTime,
          supplier: resolveSupplierName(data) || getSupplierName(data.supplier, data.supplierObj) || prev.supplier,
          supplierDeliveryNote: data.supplierDeliveryNote || prev.supplierDeliveryNote,
          supplierInvoiceNumber: data.supplierInvoiceNumber || prev.supplierInvoiceNumber,
          efdReceipt: data.efdReceipt || prev.efdReceipt,
          company: data.company || prev.company,
          applyPutawayRule: data.applyPutawayRule || false,
          isReturn: data.isReturn || false,
          defaultHod: data.defaultHod || prev.defaultHod,
          payment: data.payment || prev.payment,
          acceptedWarehouse: data.acceptedWarehouse || prev.acceptedWarehouse
        }));
        if (data.items && data.items.length > 0) {
          setItemsList(data.items);
        }
        if (data.taxes && data.taxes.length > 0) {
          setTaxesList(data.taxes);
        }
        setIsFormDirty(false);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (getItemsMenuRef.current && !getItemsMenuRef.current.contains(event.target as Node)) {
        setShowGetItemsMenu(false);
      }
      if (toolsMenuRef.current && !toolsMenuRef.current.contains(event.target as Node)) {
        setShowToolsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Item row operations
  const handleAddItemRow = () => {
    const newRow: GrnItemRow = {
      id: Date.now().toString(),
      itemCode: '',
      uom: 'Pcs',
      acceptedQuantity: 1,
      rate: 0,
      amount: 0,
      wbNo: '',
      wbSlipNo: '',
      mine: ''
    };
    setItemsList(prev => [...prev, newRow]);
    setIsFormDirty(true);
  };

  const handleUpdateItemRow = (index: number, field: keyof GrnItemRow, value: any) => {
    setItemsList(prev => {
      const copy = [...prev];
      const row = { ...copy[index], [field]: value };
      if (field === 'acceptedQuantity' || field === 'rate') {
        const qty = Number(field === 'acceptedQuantity' ? value : row.acceptedQuantity) || 0;
        const rate = Number(field === 'rate' ? value : row.rate) || 0;
        row.amount = qty * rate;
      }
      copy[index] = row;
      return copy;
    });
    setIsFormDirty(true);
  };

  const handleDeleteItemRow = (index: number) => {
    setItemsList(prev => prev.filter((_, i) => i !== index));
    setIsFormDirty(true);
  };

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const res = await uploadFile(file);
      setAttachments(prev => [...prev, { name: res.filename || file.name, url: res.url || '#' }]);
      setIsFormDirty(true);
      successToast('File uploaded successfully');
    } catch (err) {
      errorToast('Failed to upload file');
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Form Submit
  const handleFormSubmit = async (values: any, statusOverride?: string) => {
    try {
      setLoading(true);
      const payload: Partial<GrnRecord> = {
        ...values,
        id: grnId || undefined,
        status: statusOverride || status || 'Draft',
        items: itemsList,
        taxes: taxesList
      };

      let saved: GrnRecord;
      if (isEdit && grnId) {
        saved = await updateGrn(grnId, payload);
        triggerActivityRefresh('GRN', grnId);
        setIsFormDirty(false);
        setInitialValues(prev => ({ ...prev, ...values }));
        successToast(`GRN "${grnId}" updated successfully`);
      } else {
        saved = await createGrn(payload);
        const newRecordId = saved.grnNumber || saved.id || 'GRN-NEW';
        setIsFormDirty(false);
        triggerActivityRefresh('GRN', newRecordId);
        successToast(`Created GRN "${newRecordId}"`);
        navigate(`/grn/${newRecordId}`, { replace: true });
      }
    } catch (e: any) {
      errorToast(e?.message || 'Failed to save GRN');
    } finally {
      setLoading(false);
    }
  };

  // Submit GRN (Final Approval / Accept)
  const handleFinalSubmit = async (values: any) => {
    try {
      setLoading(true);
      const targetStatus = 'ACCEPTED';
      const payload: Partial<GrnRecord> = {
        ...values,
        id: grnId || undefined,
        status: targetStatus,
        items: itemsList,
        taxes: taxesList
      };

      let saved: GrnRecord;
      if (isEdit && grnId) {
        saved = await updateGrn(grnId, payload);
        setStatus('ACCEPTED');
        setIsFormDirty(false);
        triggerActivityRefresh('GRN', grnId);
        successToast(`GRN "${grnId}" submitted successfully`);
      } else {
        saved = await createGrn(payload);
        const newRecordId = saved.grnNumber || saved.id || 'GRN-NEW';
        setStatus('ACCEPTED');
        setIsFormDirty(false);
        triggerActivityRefresh('GRN', newRecordId);
        successToast(`GRN "${newRecordId}" created and submitted successfully`);
        navigate(`/grn/${newRecordId}`, { replace: true });
      }
    } catch (e: any) {
      errorToast(e?.message || 'Failed to submit GRN');
    } finally {
      setLoading(false);
    }
  };

  // Total Calculations
  const totalQty = itemsList.reduce((sum, i) => sum + (Number(i.acceptedQuantity) || 0), 0);
  const itemsSubTotal = itemsList.reduce((sum, i) => sum + (Number(i.amount) || (Number(i.acceptedQuantity || 0) * Number(i.rate || 0))), 0);
  const taxesTotal = taxesList.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
  const grandTotal = itemsSubTotal + taxesTotal;

  return (
    <Formik
      innerRef={formikRef}
      initialValues={initialValues}
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={(values) => handleFormSubmit(values)}
    >
      {({ values, handleChange, setFieldValue }) => (
        <ERPFormPageLayout
          recordCode={grnId || (isEdit ? id : undefined)}
          header={
            <ERPFormHeader
              title={grnId ? `GRN ${grnId}` : 'New GRN'}
              onBack={() => navigate('/grn')}
              backTitle="Back to GRNs"
              statusBadge={{
                label: status || 'Draft',
                variant: status === 'ACCEPTED' || status === 'Submitted' ? 'success' : 'draft'
              }}
              dirty={isFormDirty}
              customActions={
                <div className="flex items-center gap-2">
                  {/* Submit Button */}
                  {status !== 'ACCEPTED' && status !== 'Submitted' && (
                    <button
                      type="button"
                      onClick={() => handleFinalSubmit(values)}
                      disabled={loading}
                      className="px-4 h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Submit</span>
                    </button>
                  )}

                  {/* "Get Items From" Dropdown Menu */}
                  <div className="relative" ref={getItemsMenuRef}>
                    <button
                      type="button"
                      onClick={() => setShowGetItemsMenu(!showGetItemsMenu)}
                      className="px-3.5 h-9 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <span>Get Items From</span>
                      <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                    </button>

                    {showGetItemsMenu && (
                      <div className="absolute right-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setShowGetItemsMenu(false);
                            setShowPOPickerModal(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          <Package className="w-4 h-4 text-emerald-600" />
                          <span>Purchase Order</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowGetItemsMenu(false);
                            setShowInvoicePickerModal(true);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-2 cursor-pointer font-semibold"
                        >
                          <FileText className="w-4 h-4 text-emerald-600" />
                          <span>Purchase Invoice</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              }
              onPrint={() => window.print()}
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
                  formikRef.current.submitForm();
                } else {
                  handleFormSubmit(values);
                }
              }}
              isSubmitting={loading}
            />
          }
          sidebar={
            <div className="space-y-6">
              {/* Quick Meta Controls Card */}
              <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 text-xs shadow-sm">
                
                {/* Assigned To */}
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-gray-500 flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-gray-400" /> Assigned To
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowAssignModal(!showAssignModal)}
                    className="text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    {assignedTo ? assignedTo : '+ Add'}
                  </button>
                </div>
                {showAssignModal && (
                  <div className="p-2 bg-gray-50 border border-gray-200 rounded-xl space-y-1 animate-in fade-in">
                    {['Harsh Thakkar', 'Jaydeep Dhakan', 'Administrator', 'System User'].map((u) => (
                      <button
                        key={u}
                        type="button"
                        onClick={() => {
                          setAssignedTo(u);
                          setShowAssignModal(false);
                          setIsFormDirty(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-lg hover:bg-white text-gray-700 text-xs transition-colors font-medium cursor-pointer"
                      >
                        {u}
                      </button>
                    ))}
                  </div>
                )}

                {/* Attachments */}
                <div className="flex items-center justify-between font-semibold">
                  <span className="text-gray-500 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
                  </span>
                  <label className="text-emerald-600 font-bold hover:underline cursor-pointer">
                    {uploadingAttachment ? 'Uploading...' : '+ Upload'}
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                      disabled={uploadingAttachment}
                    />
                  </label>
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    {attachments.map((att, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-[11px] text-gray-700 font-medium">
                        <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-emerald-600 hover:underline flex items-center gap-1 max-w-[170px]">
                          <span className="truncate">{att.name}</span>
                          {att.url !== '#' && <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />}
                        </a>
                        <button 
                          type="button" 
                          onClick={() => {
                            setAttachments(attachments.filter((_, i) => i !== idx));
                            setIsFormDirty(true);
                          }} 
                          className="text-gray-400 hover:text-red-600 cursor-pointer font-bold px-1"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tags */}
                <div className="space-y-2 font-semibold">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 flex items-center gap-2">
                      <span className="text-gray-400 font-bold">#</span> Tags
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowTagInput(!showTagInput)}
                      className="text-emerald-600 font-bold hover:underline cursor-pointer"
                    >
                      + Add Tag
                    </button>
                  </div>

                  {showTagInput && (
                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="text"
                        value={newTagInput}
                        onChange={(e) => setNewTagInput(e.target.value)}
                        placeholder="Tag name..."
                        className="flex-1 px-2.5 py-1 text-xs border border-gray-200 rounded-lg outline-none focus:border-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newTagInput.trim() && !tags.includes(newTagInput.trim().toUpperCase())) {
                              setTags([...tags, newTagInput.trim().toUpperCase()]);
                              setNewTagInput('');
                              setShowTagInput(false);
                              setIsFormDirty(true);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newTagInput.trim() && !tags.includes(newTagInput.trim().toUpperCase())) {
                            setTags([...tags, newTagInput.trim().toUpperCase()]);
                            setNewTagInput('');
                            setShowTagInput(false);
                            setIsFormDirty(true);
                          }
                        }}
                        className="px-2 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 cursor-pointer"
                      >
                        Add
                      </button>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-md border border-emerald-100"
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => {
                            setTags(tags.filter((t) => t !== tag));
                            setIsFormDirty(true);
                          }}
                          className="hover:text-red-600 font-bold ml-0.5"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Share */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between font-semibold text-gray-500">
                  <span className="flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-gray-400" /> Share
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      successToast('Page URL copied to clipboard');
                    }}
                    className="text-emerald-600 font-bold hover:underline cursor-pointer"
                  >
                    Copy Link
                  </button>
                </div>
              </div>
            </div>
          }
        >
          <Form id="grn-form" className="space-y-6">

            {/* Main Form Card Container */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              {/* Form Navigation Tabs Header */}
              <div className="border-b border-gray-200 px-6 pt-3 flex items-center gap-8 text-xs font-bold text-gray-500 bg-white">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`pb-3 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'details' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-gray-800'
                  }`}
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('address')}
                  className={`pb-3 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'address' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-gray-800'
                  }`}
                >
                  Address & Contact
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('terms')}
                  className={`pb-3 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'terms' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-gray-800'
                  }`}
                >
                  Terms
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('more')}
                  className={`pb-3 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'more' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-gray-800'
                  }`}
                >
                  More Info
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('connections')}
                  className={`pb-3 border-b-2 transition-all cursor-pointer ${
                    activeTab === 'connections' ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-transparent hover:text-gray-800'
                  }`}
                >
                  Connections
                </button>
              </div>

              {/* Card Body Area */}
              <div className="p-6 space-y-6">
                {activeTab === 'details' && (
                  <>
                    {/* Details Fields Grid (2 Column Floating Outline Layout matching PO Form) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6.5 pt-1 pb-4">
                      
                      {/* GRN ID / Series */}
                      <TextFieldComponent
                        label="GRN ID"
                        name="grnId"
                        value={grnId || values.grnId || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        placeholder="PS-GR-2026-10-00001"
                        disabled={true}
                      />

                      {/* Date */}
                      <TextFieldComponent
                        label="Date *"
                        name="postingDate"
                        type="date"
                        value={values.postingDate || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        required
                      />

                      {/* Supplier */}
                      <SelectOutlinedField
                        label="Supplier *"
                        name="supplier"
                        value={values.supplier || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        options={suppliersList.map((s: any) => ({
                          value: s.name || s.id,
                          label: s.name || s.id
                        }))}
                        required
                      />

                      {/* Posting Time */}
                      <TextFieldComponent
                        label="Posting Time *"
                        name="postingTime"
                        type="time"
                        value={values.postingTime || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        required
                      />

                      {/* Supplier Delivery Note */}
                      <TextFieldComponent
                        label="Supplier Delivery Note"
                        name="supplierDeliveryNote"
                        value={values.supplierDeliveryNote || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        placeholder="DN-2026-991"
                      />

                      {/* Supplier Invoice Number */}
                      <TextFieldComponent
                        label="Supplier Invoice Number *"
                        name="supplierInvoiceNumber"
                        value={values.supplierInvoiceNumber || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        placeholder="INV-2026-102"
                        required
                      />

                      {/* EFD Receipt */}
                      <TextFieldComponent
                        label="EFD Receipt"
                        name="efdReceipt"
                        value={values.efdReceipt || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        placeholder="EFD-88210"
                      />

                      {/* Company */}
                      <TextFieldComponent
                        label="Company *"
                        name="company"
                        value={values.company || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        required
                      />

                      {/* Default HOD */}
                      <TextFieldComponent
                        label="Default HOD"
                        name="defaultHod"
                        value={values.defaultHod || ''}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        placeholder="Stock Manager"
                      />

                      {/* Payment */}
                      <SelectOutlinedField
                        label="Payment"
                        name="payment"
                        value={values.payment || 'Pending'}
                        onChange={(e: any) => {
                          handleChange(e);
                          setIsFormDirty(true);
                        }}
                        options={[
                          { value: 'Pending', label: 'Pending' },
                          { value: 'Paid', label: 'Paid' }
                        ]}
                      />

                      {/* Checkboxes */}
                      <div className="flex items-center gap-8 col-span-1 md:col-span-2 pt-2">
                        <label className="flex items-center gap-2.5 cursor-pointer text-xs font-semibold text-gray-700 select-none">
                          <input
                            type="checkbox"
                            name="isReturn"
                            checked={values.isReturn}
                            onChange={(e) => {
                              handleChange(e);
                              setIsFormDirty(true);
                            }}
                            className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                          />
                          <span>Is Return</span>
                        </label>
                      </div>
                    </div>

                    {/* Items Section */}
                    <div className="space-y-4 pt-2">
                      <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                        <Package className="w-4 h-4 text-emerald-600" />
                        <span>Items</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        
                        {/* Scan Barcode */}
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Scan Barcode</label>
                          <div className="relative">
                            <input
                              type="text"
                              name="scanBarcode"
                              value={values.scanBarcode}
                              onChange={(e) => {
                                handleChange(e);
                                setIsFormDirty(true);
                              }}
                              placeholder="Scan Barcode or item SKU"
                              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-3 pr-9 py-2 text-xs outline-none"
                            />
                            <Barcode className="w-4 h-4 text-gray-400 absolute right-3 top-2.5" />
                          </div>
                        </div>

                        {/* Accepted Warehouse */}
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Accepted Warehouse</label>
                          <select
                            name="acceptedWarehouse"
                            value={values.acceptedWarehouse}
                            onChange={(e) => {
                              handleChange(e);
                              setIsFormDirty(true);
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold outline-none cursor-pointer"
                          >
                            <option value="Main Store - PSL">Main Store - PSL</option>
                            <option value="Finished Goods Store">Finished Goods Store</option>
                            <option value="Raw Material Yard">Raw Material Yard</option>
                          </select>
                        </div>
                      </div>

                      {/* Items Table (Matches PO Form Design & Horizontal Scrolling) */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="min-w-[1350px] w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-100/90 border-b border-gray-200 text-gray-700 font-bold select-none text-xs uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-3 w-10 text-center">
                                  <input type="checkbox" className="rounded border-gray-300 text-emerald-600" />
                                </th>
                                <th className="px-3 py-3 w-12 text-center">No.</th>
                                <th className="px-3 py-3 min-w-[320px]">Item Code *</th>
                                <th className="px-3 py-3 min-w-[110px] text-center">UOM *</th>
                                <th className="px-3 py-3 min-w-[130px] text-center">Accepted Qty *</th>
                                <th className="px-3 py-3 min-w-[140px] text-right">Rate (₹)</th>
                                <th className="px-3 py-3 min-w-[140px] text-right">Amount (₹)</th>
                                <th className="px-3 py-3 min-w-[130px]">W/B No.</th>
                                <th className="px-3 py-3 min-w-[140px]">W/B Slip No.</th>
                                <th className="px-3 py-3 min-w-[130px]">Mine</th>
                                <th className="px-3 py-3 w-12 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {itemsList.map((item, idx) => {
                                const lineAmt = (item.amount || (item.acceptedQuantity * item.rate)) || 0;
                                return (
                                  <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-3 py-2.5 text-center">
                                      <input type="checkbox" className="rounded border-gray-300 text-emerald-600" />
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-bold text-gray-600 text-sm">{idx + 1}</td>
                                    
                                    {/* Item Code */}
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="text"
                                        value={item.itemCode}
                                        onChange={(e) => handleUpdateItemRow(idx, 'itemCode', e.target.value)}
                                        placeholder="e.g. NGMD008: AMOXYCLAVE TABLET"
                                        className="w-full bg-white border border-gray-300 focus:border-emerald-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-semibold outline-none transition-colors"
                                      />
                                    </td>

                                    {/* UOM */}
                                    <td className="px-3 py-2.5">
                                      <select
                                        value={item.uom || 'Pcs'}
                                        onChange={(e) => handleUpdateItemRow(idx, 'uom', e.target.value)}
                                        className="w-full bg-white border border-gray-300 focus:border-emerald-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none cursor-pointer transition-colors text-center"
                                      >
                                        {['Pcs', 'BOX', 'NOS', 'Kg', 'Meter', 'Roll', 'Set', 'PAIR'].map(u => (
                                          <option key={u} value={u}>{u}</option>
                                        ))}
                                      </select>
                                    </td>

                                    {/* Accepted Qty */}
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="number"
                                        step="any"
                                        value={item.acceptedQuantity === undefined || item.acceptedQuantity === null || (item.acceptedQuantity as any) === '' ? '' : String(item.acceptedQuantity).replace(/^0+(?=\d)/, '')}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const numVal = raw === '' ? 0 : parseFloat(raw.replace(/^0+(?=\d)/, '')) || 0;
                                          handleUpdateItemRow(idx, 'acceptedQuantity', isNaN(numVal) ? 0 : numVal);
                                        }}
                                        className="w-full bg-white border border-gray-300 focus:border-emerald-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-bold text-center outline-none transition-colors"
                                      />
                                    </td>

                                    {/* Rate */}
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="number"
                                        step="any"
                                        value={item.rate === undefined || item.rate === null || (item.rate as any) === '' ? '' : String(item.rate).replace(/^0+(?=\d)/, '')}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const numVal = raw === '' ? 0 : parseFloat(raw.replace(/^0+(?=\d)/, '')) || 0;
                                          handleUpdateItemRow(idx, 'rate', isNaN(numVal) ? 0 : numVal);
                                        }}
                                        className="w-full bg-white border border-gray-300 focus:border-emerald-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-bold text-right outline-none transition-colors"
                                      />
                                    </td>

                                    {/* Amount */}
                                    <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900 text-sm">
                                      ₹{lineAmt.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>

                                    {/* W/B No */}
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="text"
                                        value={item.wbNo || ''}
                                        onChange={(e) => handleUpdateItemRow(idx, 'wbNo', e.target.value)}
                                        placeholder="WB-102"
                                        className="w-full bg-white border border-gray-300 focus:border-emerald-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none transition-colors"
                                      />
                                    </td>

                                    {/* W/B Slip No */}
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="text"
                                        value={item.wbSlipNo || ''}
                                        onChange={(e) => handleUpdateItemRow(idx, 'wbSlipNo', e.target.value)}
                                        placeholder="SLIP-88"
                                        className="w-full bg-white border border-gray-300 focus:border-emerald-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none transition-colors"
                                      />
                                    </td>

                                    {/* Mine */}
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="text"
                                        value={item.mine || ''}
                                        onChange={(e) => handleUpdateItemRow(idx, 'mine', e.target.value)}
                                        placeholder="Sector 4"
                                        className="w-full bg-white border border-gray-300 focus:border-emerald-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none transition-colors"
                                      />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-3 py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteItemRow(idx)}
                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                        title="Delete row"
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

                        {/* Table Footer Buttons */}
                        <div className="p-4 bg-gray-50/80 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleAddItemRow}
                              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-xl font-bold shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-4 h-4 text-gray-600" />
                              <span>Add Row</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setShowSkuPickerModal(true)}
                              className="px-3.5 py-2 bg-white border border-gray-300 hover:bg-gray-100 text-gray-800 rounded-xl font-bold shadow-2xs transition-all cursor-pointer"
                            >
                              Add Multiple
                            </button>
                          </div>

                          <div className="flex items-center gap-3 text-gray-600 font-semibold">
                            <button
                              type="button"
                              onClick={() => successToast('Exported items CSV')}
                              className="hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                            >
                              <Download className="w-3.5 h-3.5 text-gray-500" />
                              <span>Download</span>
                            </button>
                            <span>|</span>
                            <button
                              type="button"
                              onClick={() => successToast('Uploaded items CSV')}
                              className="hover:text-emerald-700 cursor-pointer flex items-center gap-1"
                            >
                              <Upload className="w-3.5 h-3.5 text-gray-500" />
                              <span>Upload</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Totals & Taxes Section */}
                    <div className="border-t border-gray-200 pt-6 space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Total Quantity</label>
                          <input
                            type="text"
                            readOnly
                            value={totalQty.toLocaleString()}
                            className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-900"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Total Trips</label>
                          <input
                            type="number"
                            name="totalTrips"
                            value={values.totalTrips}
                            onChange={(e) => {
                              handleChange(e);
                              setIsFormDirty(true);
                            }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none"
                          />
                        </div>

                        <div>
                          <label className="block font-semibold text-gray-700 mb-1">Total (INR)</label>
                          <input
                            type="text"
                            readOnly
                            value={`₹${grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
                            className="w-full bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-black text-emerald-800"
                          />
                        </div>
                      </div>

                      {/* Taxes and Charges Accordion */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setShowTaxesAccordion(!showTaxesAccordion)}
                          className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-xs font-bold text-gray-800 transition-colors cursor-pointer"
                        >
                          <span>Taxes and Charges</span>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showTaxesAccordion ? 'rotate-180' : ''}`} />
                        </button>

                        {showTaxesAccordion && (
                          <div className="p-4 space-y-4 border-t border-gray-200 text-xs">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block font-semibold text-gray-700 mb-1">Tax Category</label>
                                <input
                                  type="text"
                                  name="taxCategory"
                                  value={values.taxCategory}
                                  onChange={(e) => {
                                    handleChange(e);
                                    setIsFormDirty(true);
                                  }}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block font-semibold text-gray-700 mb-1">Shipping Rule</label>
                                <input
                                  type="text"
                                  name="shippingRule"
                                  value={values.shippingRule}
                                  onChange={(e) => {
                                    handleChange(e);
                                    setIsFormDirty(true);
                                  }}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
                                />
                              </div>

                              <div>
                                <label className="block font-semibold text-gray-700 mb-1">Incoterm</label>
                                <input
                                  type="text"
                                  name="incoterm"
                                  value={values.incoterm}
                                  onChange={(e) => {
                                    handleChange(e);
                                    setIsFormDirty(true);
                                  }}
                                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none"
                                />
                              </div>
                            </div>

                            {/* Purchase Taxes Table */}
                            <div className="border border-gray-200 rounded-xl overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-gray-50 text-gray-600 font-bold uppercase text-[10px]">
                                  <tr>
                                    <th className="px-3 py-2.5 w-10 text-center">No.</th>
                                    <th className="px-3 py-2.5 text-left">Type *</th>
                                    <th className="px-3 py-2.5 text-left">Account Head *</th>
                                    <th className="px-3 py-2.5 w-24 text-right">Tax Rate (%)</th>
                                    <th className="px-3 py-2.5 w-28 text-right">Amount (₹)</th>
                                    <th className="px-3 py-2.5 w-32 text-right">Total (₹)</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                  {taxesList.map((tax, idx) => (
                                    <tr key={tax.id || idx}>
                                      <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                                      <td className="px-3 py-2 font-semibold text-gray-800">{tax.type}</td>
                                      <td className="px-3 py-2 font-bold text-gray-900">{tax.accountHead}</td>
                                      <td className="px-3 py-2 text-right font-mono text-gray-800">{tax.taxRate}%</td>
                                      <td className="px-3 py-2 text-right font-mono text-gray-900">₹{tax.amount.toLocaleString()}</td>
                                      <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">₹{tax.total.toLocaleString()}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                  </>
                )}

                {/* Other Tab Content */}
                {activeTab === 'address' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-bold text-gray-900 text-sm">Address & Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Supplier Address</label>
                        <textarea rows={3} defaultValue="108-149 GIDC Industrial Estate, Vatva, Ahmedabad, Gujarat - 380015" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none" />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Shipping Address</label>
                        <textarea rows={3} defaultValue="Patel Strap Industries Ltd, Plot No. 12, GIDC Phase III, Chhatral, Gujarat - 382729" className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'terms' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-bold text-gray-900 text-sm">Terms & Conditions</h3>
                    <textarea rows={5} defaultValue="1. Goods received subject to inspection. 2. Defective or non-conforming items will be returned at supplier expense. 3. Tax Invoice & E-Way bill mandatory." className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 outline-none" />
                  </div>
                )}

                {activeTab === 'more' && (
                  <div className="space-y-4 text-xs">
                    <h3 className="font-bold text-gray-900 text-sm">More Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Created By</label>
                        <input type="text" readOnly value={currentUserName} className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 font-bold" />
                      </div>
                      <div>
                        <label className="block font-semibold text-gray-700 mb-1">Status</label>
                        <input type="text" readOnly value={status} className="w-full bg-gray-100 border border-gray-200 rounded-xl px-3 py-2 font-bold" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'connections' && (
                  <div className="space-y-4 text-xs">
                    <ERPFormConnections
                      groups={[
                        {
                          title: 'Reference',
                          items: [
                            {
                              label: 'Purchase Order',
                              count: values.purchaseOrderId || initialValues.purchaseOrderId ? 1 : 0,
                              hasPlus: true,
                              onCreate: () => navigate('/purchase-order/new'),
                              onClick: () => {
                                const poNum = values.purchaseOrderId || initialValues.purchaseOrderId;
                                if (poNum) navigate(`/purchase-order/${poNum}`);
                                else successToast('No Purchase Order linked');
                              }
                            },
                            {
                              label: 'Purchase Invoice',
                              hasPlus: true,
                              onCreate: () => successToast('Create Purchase Invoice')
                            }
                          ]
                        },
                        {
                          title: 'Stock',
                          items: [
                            {
                              label: 'Stock Entry',
                              hasPlus: true,
                              onCreate: () => successToast('Create Stock Entry from GRN')
                            }
                          ]
                        }
                      ]}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Footer Activity Log */}
            {/* <FormCommentsAndActivity
              entityType="GRN"
              entityId={grnId || 'new'}
              createdByName={currentUserName}
              lastEditedByName={currentUserName}
              currentUser={{ name: currentUserName }}
            /> */}

            {/* Purchase Order Picker Modal */}
            {showPOPickerModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <Package className="w-4 h-4 text-emerald-600" />
                      <span>Select Purchase Order</span>
                    </h3>
                    <button type="button" onClick={() => setShowPOPickerModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {purchaseOrders.map(po => {
                      const suppName = resolveSupplierName(po);
                      return (
                        <div
                          key={po.id}
                          onClick={() => {
                            setShowPOPickerModal(false);
                            if (suppName) {
                              setFieldValue('supplier', suppName);
                            }
                            setFieldValue('company', po.company || values.company);
                            setFieldValue('acceptedWarehouse', po.setWarehouse || values.acceptedWarehouse);
                            if (po.items && po.items.length > 0) {
                              setItemsList(po.items.map((it: any, idx: number) => ({
                                id: String(idx + 1),
                                itemCode: it.itemCode,
                                uom: it.uom || 'Pcs',
                                acceptedQuantity: it.quantity || 1,
                                rate: it.rate || 0,
                                amount: it.amount || ((it.quantity || 1) * (it.rate || 0)),
                                wbNo: `WB-${100 + idx}`,
                                wbSlipNo: `SLIP-${80 + idx}`,
                                mine: 'Main Store'
                              })));
                            }
                            setIsFormDirty(true);
                            successToast(`Loaded items & details from ${po.id}`);
                          }}
                          className="p-3 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div>
                            <p className="font-bold text-xs text-gray-900">{po.id}</p>
                            <p className="text-[11px] text-gray-500">{suppName || 'No Supplier'} • {po.company}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-700">Select →</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Purchase Invoice Picker Modal */}
            {showInvoicePickerModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span>Select Purchase Invoice</span>
                    </h3>
                    <button type="button" onClick={() => setShowInvoicePickerModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {[
                      { id: 'INV-2026-09-00001', supplier: 'AURA INDUSTRIAL CONSUMABLES', total: 625000 },
                      { id: 'INV-2026-09-00002', supplier: 'VICTOR SUPPLIERS LTD', total: 4025400 }
                    ].map(inv => {
                      const suppName = resolveSupplierName(inv);
                      return (
                        <div
                          key={inv.id}
                          onClick={() => {
                            setShowInvoicePickerModal(false);
                            if (suppName) {
                              setFieldValue('supplier', suppName);
                            }
                            setFieldValue('supplierInvoiceNumber', inv.id);
                            setIsFormDirty(true);
                            successToast(`Loaded items from Invoice ${inv.id}`);
                          }}
                          className="p-3 bg-gray-50 hover:bg-emerald-50 border border-gray-200 hover:border-emerald-300 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div>
                            <p className="font-bold text-xs text-gray-900">{inv.id}</p>
                            <p className="text-[11px] text-gray-500">{suppName || inv.supplier}</p>
                          </div>
                          <span className="text-xs font-bold text-emerald-700">₹{inv.total.toLocaleString()}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* SKU Picker Modal */}
            {showSkuPickerModal && (
              <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h3 className="font-bold text-gray-900 text-sm">Select Items / SKUs</h3>
                    <button type="button" onClick={() => setShowSkuPickerModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer">✕</button>
                  </div>

                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {skuList.slice(0, 10).map(s => (
                      <div
                        key={s.id || s.sku}
                        onClick={() => {
                          setShowSkuPickerModal(false);
                          setItemsList(prev => [
                            ...prev,
                            {
                              id: Date.now().toString(),
                              itemCode: `${s.sku}: ${s.name}`,
                              uom: 'Pcs',
                              acceptedQuantity: 10,
                              rate: s.cost_price || 500,
                              amount: (s.cost_price || 500) * 10,
                              wbNo: 'WB-109',
                              wbSlipNo: 'SLIP-99',
                              mine: 'Yard'
                            }
                          ]);
                          setIsFormDirty(true);
                          successToast(`Added "${s.name}" to GRN items`);
                        }}
                        className="p-3 bg-gray-50 hover:bg-emerald-50 border border-gray-200 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                      >
                        <div>
                          <p className="font-bold text-xs text-gray-900">{s.sku}: {s.name}</p>
                          <p className="text-[11px] text-gray-500">Rate: ₹{s.cost_price || 500}</p>
                        </div>
                        <span className="text-xs font-bold text-emerald-700">+ Add</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </Form>
        </ERPFormPageLayout>
      )}
    </Formik>
  );
};

export const GRNFormPage = WithAuth(GRNFormPageBase, ModuleName.GRN, Permission.ADD);
export default GRNFormPage;
