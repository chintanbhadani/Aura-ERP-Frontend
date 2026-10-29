import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { TextFieldComponent, SelectOutlinedField } from '../../components/input/index';
import { ERPFormHeader, ERPFormPageLayout, ERPFormConnections } from '../../components/ERPForm';
import { PurchaseOrderPrintModal } from '../../components/PurchaseOrderPrintModal';
import { FormCommentsAndActivity, triggerActivityRefresh } from '../../components/FormCommentsAndActivity';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import dataService from '../../axios/dataService';
import { formatDistanceToNow } from 'date-fns';
import { 
  fetchPurchaseOrderById, 
  fetchNextPurchaseOrderId,
  createPurchaseOrder, 
  updatePurchaseOrder, 
  fetchMaterialRequests,
  fetchSuppliers,
  fetchSkus,
  fetchInventory,
  fetchGrns,
  uploadFile,
  type PurchaseOrder, 
  type PurchaseOrderItem,
  type MaterialRequest,
  type Supplier,
  type Product
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Barcode,
  ChevronDown, 
  ChevronUp,
  UserPlus, 
  Paperclip, 
  Share2, 
  Heart, 
  MessageSquare, 
  ExternalLink, 
  Plus, 
  Trash2,
  X,
  FileText,
  PackageCheck,
  Building2,
  CheckCircle2,
  XCircle,
  ChevronsUpDown
} from 'lucide-react';

const purchaseOrderSchema = Yup.object({
  supplier: Yup.string().required('Supplier is required'),
  company: Yup.string().required('Company is required'),
  transactionDate: Yup.string().required('Date is required')
});

const DEFAULT_ITEMS: PurchaseOrderItem[] = [
  { id: '1', itemCode: 'NGTL047: SHANK DRILL BIT', requiredByDate: new Date().toISOString().split('T')[0], itemGroup: 'TOOLS', quantity: 100, uom: 'Pcs', rate: 40254, receivedQty: 0, amount: 4025400 }
];

const PurchaseOrderFormPageBase: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const poId = id || searchParams.get('id');

  // Redux Logged-In User
  const { user } = useSelector((state: any) => state.base);
  const currentUserName = user?.name || user?.username || user?.email?.split('@')[0] || 'Admin';

  const isEditMode = Boolean(poId && poId !== 'new');
  const [activeTab, setActiveTab] = useState<'details' | 'address' | 'terms' | 'moreInfo' | 'connections'>('details');
  const [loading, setLoading] = useState(false);

  // Accordion toggle for Currency & Price List
  const [showCurrencyAccordion, setShowCurrencyAccordion] = useState(true);

  // Modals for "Get Items From" & "Create"
  const [showGetItemsMenu, setShowGetItemsMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showMRPickerModal, setShowMRPickerModal] = useState(false);
  const [showSQPickerModal, setShowSQPickerModal] = useState(false);
  const [showSkuPickerModal, setShowSkuPickerModal] = useState(false);
  const [availableMRs, setAvailableMRs] = useState<MaterialRequest[]>([]);

  const formikRef = useRef<any>(null);
  const getItemsMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  // Left Sidebar Interactive States
  const [assignedTo, setAssignedTo] = useState(currentUserName);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [tags, setTags] = useState<string[]>(['PURCHASE', 'BUYING']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(!isEditMode);

  const [itemsList, setItemsList] = useState<PurchaseOrderItem[]>([
    { id: '1', itemCode: '', requiredByDate: new Date().toISOString().split('T')[0], itemGroup: '', quantity: 1, uom: 'Pcs', rate: 0, receivedQty: 0, amount: 0 }
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliersList, setSuppliersList] = useState<Supplier[]>([]);
  const [availableSkus, setAvailableSkus] = useState<string[]>([]);

  const [initialValues, setInitialValues] = useState<Partial<PurchaseOrder>>({
    id: poId && poId !== 'new' ? poId : '',
    series: 'PO/CHE-OIIP/xxxx/26-27',
    status: 'Draft',
    approvalStatus: 'Draft',
    company: 'PATEL STRAP INDUSTRIES LTD',
    supplier: searchParams.get('supplier') || searchParams.get('supplierName') || '',
    transactionDate: new Date().toISOString().split('T')[0],
    requiredByDate: new Date().toISOString().split('T')[0],
    paymentTerms: '',
    purchaseType: '',
    gstin: '',
    tin: '',
    vrn: '',
    pfiNo: '',
    user: currentUserName,
    contact: '',
    email: '',
    setWarehouse: 'Main Store - PSL',
    currency: 'INR',
    priceList: 'Standard Buying',
    applyTaxWithholding: false,
    isSubcontracted: false,
    assignedTo: currentUserName,
    createdBy: currentUserName
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (getItemsMenuRef.current && !getItemsMenuRef.current.contains(event.target as Node)) {
        setShowGetItemsMenu(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check navigation state from Material Request
  useEffect(() => {
    const fromMR = location.state?.fromMaterialRequest;
    if (fromMR && fromMR.items) {
      const convertedItems: PurchaseOrderItem[] = fromMR.items.map((i: any, idx: number) => ({
        id: (idx + 1).toString(),
        itemCode: i.itemCode || '',
        requiredByDate: i.requiredByDate || new Date().toISOString().split('T')[0],
        itemGroup: i.department || 'GENERAL',
        quantity: i.quantity || 1,
        uom: i.uom || 'Pcs',
        rate: 0,
        receivedQty: 0,
        amount: 0
      }));
      setItemsList(convertedItems);
      successToast(`Loaded items from Material Request (${fromMR.id})`);
    }
  }, [location.state]);

  useEffect(() => {
    const loadSkusAndSuppliers = async () => {
      try {
        const [skus, supps, prods] = await Promise.all([
          fetchSkus().catch(() => []),
          fetchSuppliers().catch(() => []),
          fetchInventory().catch(() => [])
        ]);
        if (prods && prods.length > 0) {
          setProducts(prods);
        }
        if (skus && skus.length > 0) {
          const skuNames = skus.map(s => `${s.sku}: ${s.name}`);
          setAvailableSkus(prev => Array.from(new Set([...prev, ...skuNames])));
        }
        if (supps && supps.length > 0) {
          setSuppliersList(supps);
        }
      } catch (err) {
        // fallback
      }
    };
    loadSkusAndSuppliers();
  }, []);

  const [linkedGrnsCount, setLinkedGrnsCount] = useState<number>(0);

  useEffect(() => {
    if (poId && poId !== 'new') {
      const loadRecord = async () => {
        setLoading(true);
        try {
          const [fetched, grns] = await Promise.all([
            fetchPurchaseOrderById(poId).catch(() => null),
            fetchGrns({ purchaseOrderId: poId }).catch(() => [])
          ]);
          if (fetched) {
            setInitialValues(fetched);
            if (fetched.items && fetched.items.length > 0) {
              setItemsList(fetched.items);
            }
            if (fetched.attachments && Array.isArray(fetched.attachments)) {
              setAttachments(fetched.attachments);
            } else {
              setAttachments([]);
            }
            if (fetched.tags) {
              const tagList = typeof fetched.tags === 'string'
                ? fetched.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
                : (Array.isArray(fetched.tags) ? fetched.tags : []);
              if (tagList.length > 0) setTags(tagList);
            }
            setIsFormDirty(false);
          }
          if (Array.isArray(grns)) {
            setLinkedGrnsCount(grns.length);
          }
        } catch (err) {
          console.warn('Backend unavailable, showing demo data');
        } finally {
          setLoading(false);
        }
      };
      loadRecord();
    } else {
      // Auto generate next PO ID in PO/CHE-OIIP/xxxx/26-27 format
      fetchNextPurchaseOrderId()
        .then(res => {
          if (res?.id) {
            setInitialValues(prev => ({
              ...prev,
              id: res.id,
              series: res.series || 'PO/CHE-OIIP/xxxx/26-27'
            }));
          }
        })
        .catch(() => {});
    }
  }, [poId]);

  const productOptions = useMemo(() => {
    return products.map(p => {
      const isRoll = Boolean(
        (p.partOf && String(p.partOf).toLowerCase().includes('roll')) ||
        (p.category?.name && p.category.name.toLowerCase().includes('roll')) ||
        (p.name && p.name.toLowerCase().includes('roll'))
      );
      const parts = [
        p.sku ? `[${p.sku}]` : '',
        p.name,
        isRoll && p.rollLength ? `L:${p.rollLength}` : '',
        isRoll && p.rollWidth ? `W:${p.rollWidth}` : '',
        isRoll && p.rollCoreDiameter ? `Core:${p.rollCoreDiameter}` : '',
        isRoll && p.rollSurface ? `Surface:${p.rollSurface}` : '',
        isRoll && p.rollWeight ? `Wt:${p.rollWeight}kg` : ''
      ].filter(Boolean).join(' | ');
      return {
        label: parts,
        product: p
      };
    });
  }, [products]);

  const allSkuOptions = useMemo(() => {
    const list = productOptions.map(o => o.label);
    availableSkus.forEach(s => {
      if (!list.includes(s)) list.push(s);
    });
    itemsList.forEach(item => {
      if (item.itemCode && !list.includes(item.itemCode)) {
        list.push(item.itemCode);
      }
    });
    return list;
  }, [productOptions, availableSkus, itemsList]);

  const handleProductSelect = (index: number, selectedValue: string) => {
    setIsFormDirty(true);
    const matchedOpt = productOptions.find(o => o.label === selectedValue);
    const p = matchedOpt?.product || products.find(prod => prod.name === selectedValue || prod.sku === selectedValue);

    setItemsList(prev => prev.map((item, i) => {
      if (i === index) {
        if (!p) {
          return { ...item, itemCode: selectedValue };
        }

        const qty = item.quantity || 1;
        const rate = Number(p.cost_price) || Number(p.selling_price) || item.rate || 0;
        const categoryName = p.category?.name || p.itemGroup || item.itemGroup || 'GENERAL';
        const unitName = p.unit?.name || p.uom || item.uom || 'Pcs';

        return {
          ...item,
          itemCode: p.name || selectedValue,
          itemGroup: categoryName,
          uom: unitName,
          rate: rate,
          quantity: qty,
          amount: qty * rate,
          rollLength: p.rollLength || '',
          rollWidth: p.rollWidth || '',
          rollCoreLength: p.rollCoreLength || '',
          rollCoreDiameter: p.rollCoreDiameter || '',
          rollSurface: p.rollSurface || '',
          rollWeight: p.rollWeight || '',
          rollJoint: p.rollJoint || ''
        };
      }
      return item;
    }));
  };

  const handleAddRow = () => {
    setIsFormDirty(true);
    const newId = (itemsList.length + 1).toString();
    setItemsList(prev => [
      ...prev,
      { 
        id: newId, 
        itemCode: '', 
        requiredByDate: new Date().toISOString().split('T')[0], 
        itemGroup: 'GENERAL', 
        quantity: 1, 
        uom: 'Pcs', 
        rate: 0, 
        receivedQty: 0, 
        amount: 0 
      }
    ]);
  };

  const handleRemoveRow = (index: number) => {
    if (itemsList.length <= 1) {
      errorToast('At least one item line is required');
      return;
    }
    setIsFormDirty(true);
    setItemsList(prev => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof PurchaseOrderItem, val: any) => {
    setIsFormDirty(true);
    setItemsList(prev => prev.map((item, i) => {
      if (i === index) {
        const updated = { ...item, [field]: val };
        if (field === 'quantity' || field === 'rate') {
          const qty = field === 'quantity' ? Number(val) || 0 : item.quantity;
          const rate = field === 'rate' ? Number(val) || 0 : item.rate;
          updated.amount = qty * rate;
        }
        return updated;
      }
      return item;
    }));
  };

  const handleLoadFromMaterialRequest = async (mr: MaterialRequest) => {
    if (!mr.items || mr.items.length === 0) {
      errorToast('Selected Material Request has no items');
      return;
    }
    setIsFormDirty(true);
    const convertedItems: PurchaseOrderItem[] = mr.items.map((i, idx) => ({
      id: (idx + 1).toString(),
      itemCode: i.itemCode,
      requiredByDate: i.requiredByDate || new Date().toISOString().split('T')[0],
      itemGroup: mr.department || 'GENERAL',
      quantity: i.quantity,
      uom: i.uom,
      rate: 0,
      receivedQty: 0,
      amount: 0
    }));
    setItemsList(convertedItems);
    setShowMRPickerModal(false);
    successToast(`Loaded ${mr.items.length} item(s) from Material Request ${mr.id}`);
  };

  const openMRPicker = async () => {
    setShowGetItemsMenu(false);
    try {
      const mrs = await fetchMaterialRequests();
      setAvailableMRs(mrs || []);
    } catch (err) {
      setAvailableMRs([]);
    }
    setShowMRPickerModal(true);
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

  const handleFinalSubmit = async () => {
    try {
      setLoading(true);
      const currentValues = formikRef.current ? formikRef.current.values : initialValues;
      const updatedPayload: Partial<PurchaseOrder> = {
        ...currentValues,
        status: 'Submitted',
        approvalStatus: 'Submitted',
        createdBy: currentValues.createdBy || currentUserName,
        assignedTo: assignedTo || currentUserName,
        tags: tags.join(','),
        attachments: attachments,
        items: itemsList
      };

      if (formikRef.current) {
        formikRef.current.setFieldValue('status', 'Submitted');
        formikRef.current.setFieldValue('approvalStatus', 'Submitted');
      }

      setInitialValues(prev => ({
        ...prev,
        ...updatedPayload,
        status: 'Submitted',
        approvalStatus: 'Submitted'
      }));
      setIsFormDirty(false);

      const targetId = poId && poId !== 'new' ? poId : (initialValues as any).id;
      if (targetId) {
        await updatePurchaseOrder(targetId, updatedPayload);
      } else {
        const created = await createPurchaseOrder(updatedPayload);
        if (created?.id) {
          navigate(`/purchase-order/${created.id}`);
        }
      }

      successToast('Purchase Order submitted successfully!');
    } catch (error: any) {
      console.error('Submit error:', error);
      errorToast(error?.response?.data?.error || error?.message || 'Failed to submit Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setLoading(true);
      const currentValues = formikRef.current ? formikRef.current.values : initialValues;
      const updatedPayload: Partial<PurchaseOrder> = {
        ...currentValues,
        status: 'Rejected',
        approvalStatus: 'Rejected',
        createdBy: currentValues.createdBy || currentUserName,
        assignedTo: assignedTo || currentUserName,
        tags: tags.join(','),
        attachments: attachments,
        items: itemsList
      };

      if (formikRef.current) {
        formikRef.current.setFieldValue('status', 'Rejected');
        formikRef.current.setFieldValue('approvalStatus', 'Rejected');
      }

      setInitialValues(prev => ({
        ...prev,
        ...updatedPayload,
        status: 'Rejected',
        approvalStatus: 'Rejected'
      }));
      setIsFormDirty(false);

      const targetId = poId && poId !== 'new' ? poId : (initialValues as any).id;
      if (targetId) {
        await updatePurchaseOrder(targetId, updatedPayload);
      }

      successToast('Purchase Order rejected');
    } catch (error: any) {
      console.error('Reject error:', error);
      errorToast(error?.response?.data?.error || error?.message || 'Failed to reject Purchase Order');
    } finally {
      setLoading(false);
    }
  };

  const getChangedFieldsSummary = (oldVals: any, newVals: any, docName = 'Purchase Order') => {
    const changes: string[] = [];
    const fieldLabels: Record<string, string> = {
      supplier: 'Supplier',
      paymentTerms: 'Payment Terms',
      purchaseType: 'Purchase Type',
      gstin: 'GSTIN',
      tin: 'TIN',
      vrn: 'VRN',
      pfiNo: 'PFI No',
      requiredByDate: 'Required By Date',
      transactionDate: 'Transaction Date',
      company: 'Company',
      setWarehouse: 'Warehouse',
      currency: 'Currency',
      priceList: 'Price List',
      purpose: 'Purpose',
      department: 'Department',
      requiredFor: 'Required For',
      status: 'Status',
      approvalStatus: 'Approval Status',
      attendBy: 'Attend By',
      user: 'User',
      contact: 'Contact',
      email: 'Email'
    };

    Object.keys(fieldLabels).forEach(key => {
      const oldVal = oldVals[key];
      const newVal = newVals[key];
      if (newVal !== undefined && oldVal !== undefined) {
        const oldStr = String(oldVal ?? '').trim();
        const newStr = String(newVal ?? '').trim();
        if (oldStr !== newStr && (oldStr || newStr)) {
          const label = fieldLabels[key];
          const fromStr = oldStr ? `"${oldStr}"` : 'empty';
          const toStr = newStr ? `"${newStr}"` : 'empty';
          changes.push(`${label} (${fromStr} → ${toStr})`);
        }
      }
    });

    if (changes.length > 0) {
      return `Updated ${changes.join(', ')}`;
    }
    return `Updated ${docName} details`;
  };

  const handleSubmit = async (values: any, { setSubmitting }: any) => {
    try {
      if (!itemsList || itemsList.length === 0) {
        errorToast('Please add at least one item');
        setSubmitting(false);
        return;
      }

      for (let i = 0; i < itemsList.length; i++) {
        const item = itemsList[i];
        if (!item.itemCode || !item.itemCode.trim()) {
          errorToast(`Row ${i + 1}: Item Code is required`);
          setSubmitting(false);
          return;
        }
        if (!item.quantity || Number(item.quantity) <= 0) {
          errorToast(`Row ${i + 1}: Quantity is required and must be greater than 0`);
          setSubmitting(false);
          return;
        }
        if (item.rate === undefined || item.rate === null || Number(item.rate) <= 0) {
          errorToast(`Row ${i + 1}: Rate is required and must be greater than 0`);
          setSubmitting(false);
          return;
        }
      }

      setSubmitting(true);
      const payload: Partial<PurchaseOrder> = {
        ...values,
        createdBy: values.createdBy || currentUserName,
        assignedTo: assignedTo || currentUserName,
        tags: tags.join(','),
        attachments: attachments,
        items: itemsList
      };

      if (isEditMode && poId && poId !== 'new') {
        const changedSummary = getChangedFieldsSummary(initialValues, values, 'Purchase Order');
        await updatePurchaseOrder(poId, payload);
        
        if (changedSummary) {
          dataService.post('/activities', {
            entityType: 'PurchaseOrder',
            entityId: poId,
            action: 'UPDATE',
            description: changedSummary,
            metadata: { userName: currentUserName }
          }).then(() => triggerActivityRefresh('PurchaseOrder', poId)).catch(() => {});
        } else {
          triggerActivityRefresh('PurchaseOrder', poId);
        }

        setInitialValues(values);
        setIsFormDirty(false);
        successToast('Purchase Order updated successfully');
      } else {
        const created = await createPurchaseOrder(payload);
        setIsFormDirty(false);
        successToast('Purchase Order created successfully');
        if (created?.id || (created as any)?.poNumber) {
          const newCode = (created as any)?.poNumber || created?.id;
          triggerActivityRefresh('PurchaseOrder', newCode);
          navigate(`/purchase-order/${newCode}`);
        }
      }
    } catch (err: any) {
      errorToast(err?.response?.data?.error || err?.message || 'Failed to save Purchase Order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ERPFormPageLayout
      recordCode={initialValues.id || (poId && poId !== 'new' ? poId : undefined)}
      header={
        <ERPFormHeader
          title={isEditMode ? `Purchase Order ${initialValues.id}` : 'New Purchase Order'}
          onBack={() => navigate('/purchase-order')}
          backTitle="Back to Purchase Orders"
          statusBadge={{
            label: initialValues.status || 'Draft',
            variant: initialValues.status === 'Submitted' ? 'blue' : initialValues.status === 'Completed' ? 'success' : 'gray'
          }}
          dirty={isFormDirty}
          customActions={
            <div className="flex items-center gap-2">
              {/* Get Items From Dropdown */}
              <div className="relative" ref={getItemsMenuRef}>
                <button 
                  type="button"
                  onClick={() => setShowGetItemsMenu(prev => !prev)}
                  className="h-9 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Get Items From</span>
                  <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                </button>
                {showGetItemsMenu && (
                  <div className="absolute right-0 sm:left-0 mt-1.5 w-52 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={openMRPicker}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>Material Request</span>
                      <FileText className="w-3.5 h-3.5 text-primary-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGetItemsMenu(false);
                        successToast('Loaded items from Product Bundle');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>Product Bundle</span>
                      <PackageCheck className="w-3.5 h-3.5 text-purple-600" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGetItemsMenu(false);
                        setShowSQPickerModal(true);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 font-semibold flex items-center justify-between cursor-pointer"
                    >
                      <span>Supplier Quotation</span>
                      <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  </div>
                )}
              </div>

              {/* Create Dropdown */}
              <div className="relative" ref={createMenuRef}>
                <button 
                  type="button"
                  onClick={() => setShowCreateMenu(prev => !prev)}
                  className="h-9 px-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <span>Create</span>
                  <ChevronDown className="w-3.5 h-3.5 text-white/80" />
                </button>

                {showCreateMenu && (
                  <div className="absolute right-0 mt-1.5 w-56 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        const poCode = poId || initialValues.id || 'PO-2026-09-00001';
                        successToast(`Creating Goods Receipt (GRN) from ${poCode}...`);
                        navigate('/grn/new', {
                          state: {
                            fromPurchaseOrder: {
                              id: poCode,
                              supplier: initialValues.supplier,
                              items: itemsList
                            }
                          }
                        });
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                    >
                      <span>Goods Receipt (GRN)</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">GRN</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        const poCode = poId || initialValues.id || 'PO-2026-09-00001';
                        successToast(`Creating Purchase Invoice from ${poCode}...`);
                        navigate('/invoices/new', {
                          state: {
                            fromPurchaseOrder: {
                              id: poCode,
                              supplier: initialValues.supplier,
                              items: itemsList
                            }
                          }
                        });
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                    >
                      <span>Purchase Invoice</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">PI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        successToast('Payment Entry creation initiated');
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                    >
                      <span>Payment Entry</span>
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold">PE</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Actions Dropdown Button */}
              <div className="relative" ref={actionsMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowActionsMenu(prev => !prev)}
                  className="h-9 px-3.5 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <span>Actions</span>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-gray-500" />
                </button>

                {showActionsMenu && (
                  <div className="absolute right-0 mt-1.5 w-40 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                    {initialValues.status === 'Submitted' && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleReject();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        <span>Reject</span>
                      </button>
                    )}
                    {(initialValues.status === 'Draft' || !initialValues.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowActionsMenu(false);
                          handleFinalSubmit();
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-800 font-semibold flex items-center gap-2 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary-600" />
                        <span>Submit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          }
          onPrint={() => setShowPrintModal(true)}
          moreMenuItems={[
            {
              label: 'Duplicate',
              onClick: () => successToast('Purchase Order duplicated successfully')
            },
            {
              label: 'Download Template',
              onClick: () => successToast('Downloaded PO Template')
            },
            {
              label: 'Export Items CSV',
              onClick: () => successToast('Exported items CSV')
            },
            {
              label: 'Copy PO ID',
              onClick: () => {
                navigator.clipboard.writeText(poId || initialValues.id || 'PO-2026-09-00001');
                successToast('Purchase Order ID copied to clipboard');
              }
            }
          ]}
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
              const formElem = document.getElementById('purchase-order-form') as HTMLFormElement;
              if (formElem) formElem.requestSubmit();
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
                className="text-primary-600 font-bold hover:underline cursor-pointer"
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
              <label className="text-primary-600 font-bold hover:underline cursor-pointer">
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
                    <a href={att.url} target="_blank" rel="noopener noreferrer" className="truncate hover:text-primary-600 hover:underline flex items-center gap-1 max-w-[170px]">
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
                  className="text-primary-600 font-bold hover:underline cursor-pointer"
                >
                  + Add Tag
                </button>
              </div>
              {showTagInput && (
                <div className="flex items-center gap-1 pt-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTagInput) {
                          setTags(prev => [...prev, newTagInput.toUpperCase()]);
                          setIsFormDirty(true);
                        }
                        setNewTagInput('');
                        setShowTagInput(false);
                      }
                    }}
                    placeholder="TAG..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none uppercase font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => { 
                      if (newTagInput) {
                        setTags(prev => [...prev, newTagInput.toUpperCase()]);
                        setIsFormDirty(true);
                      }
                      setNewTagInput(''); 
                      setShowTagInput(false); 
                    }}
                    className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 text-[11px] font-black border border-gray-200">
                    {t}
                    <button type="button" onClick={() => { setTags(tags.filter(x => x !== t)); setIsFormDirty(true); }} className="hover:text-red-600 font-bold cursor-pointer">×</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Share Link */}
            <div className="flex items-center justify-between font-semibold pt-1">
              <span className="text-gray-500 flex items-center gap-2">
                <Share2 className="w-4 h-4 text-gray-400" /> Share
              </span>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  successToast('Purchase Order link copied to clipboard');
                }}
                className="text-primary-600 font-bold hover:underline cursor-pointer"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* MAIN TABS & FORM CONTAINER */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-2xs overflow-hidden">
          
          {/* TABS */}
          <div className="flex items-center gap-2 px-6 border-b border-gray-200 overflow-x-auto bg-gray-50/50">
            {[
              { id: 'details', label: 'Details' },
              { id: 'address', label: 'Address & Contact' },
              { id: 'terms', label: 'Terms' },
              { id: 'moreInfo', label: 'More Info' },
              { id: 'connections', label: 'Connections' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-4 text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700 bg-white shadow-xs'
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* FORMIK FORM */}
          <Formik
            innerRef={formikRef}
            initialValues={initialValues}
            validationSchema={purchaseOrderSchema}
            onSubmit={handleSubmit}
            enableReinitialize
          >
            {({ values, setFieldValue }) => (
              <Form id="purchase-order-form" className="p-6 sm:p-8 space-y-8">
                
                {activeTab === 'details' && (
                  <>
                    {/* DETAILS GRID (2-Column Floating Outline Layout matching Material Request screenshot) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6.5 pt-1 pb-4">
                      
                      {/* LEFT COLUMN */}
                      <div className="flex flex-col gap-y-6.5">
                        <TextFieldComponent
                          name="id"
                          label="Purchase Order ID"
                          placeholder="Auto-generated on save"
                          disabled={true}
                        />

                        <SelectOutlinedField
                          name="supplier"
                          label="Supplier *"
                          options={[
                            ...suppliersList.map(s => ({ label: s.name, value: s.name })),
                            { label: 'Taparia', value: 'Taparia' },
                            { label: 'Shiv Enterprises', value: 'Shiv Enterprises' },
                            { label: 'VICTOR SUPPLIERS LTD', value: 'VICTOR SUPPLIERS LTD' },
                            { label: 'AURA INDUSTRIAL CONSUMABLES', value: 'AURA INDUSTRIAL CONSUMABLES' }
                          ]}
                        />

                        <TextFieldComponent
                          name="paymentTerms"
                          label="Payment Terms"
                          placeholder="e.g. Credit, Cash, Net 30"
                        />

                        <TextFieldComponent
                          name="gstin"
                          label="GSTIN / GST"
                          placeholder="24AAACP1234A1Z5"
                        />

                        <SelectOutlinedField
                          name="company"
                          label="Company *"
                          options={[
                            { label: 'PATEL STRAP INDUSTRIES LTD', value: 'PATEL STRAP INDUSTRIES LTD' },
                            { label: 'NEELKANTH CHEMICALS LIMITED', value: 'NEELKANTH CHEMICALS LIMITED' }
                          ]}
                        />

                        <TextFieldComponent
                          name="user"
                          label="User"
                        />

                        <div className="pt-1 flex flex-col gap-2.5">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={Boolean(values.applyTaxWithholding)}
                              onChange={(e) => {
                                setFieldValue('applyTaxWithholding', e.target.checked);
                                setIsFormDirty(true);
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                            />
                            <span>Apply Tax Withholding Amount</span>
                          </label>

                          <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                            <input
                              type="checkbox"
                              checked={Boolean(values.isSubcontracted)}
                              onChange={(e) => {
                                setFieldValue('isSubcontracted', e.target.checked);
                                setIsFormDirty(true);
                              }}
                              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 w-4 h-4"
                            />
                            <span>Is Subcontracted</span>
                          </label>
                        </div>
                      </div>

                      {/* RIGHT COLUMN */}
                      <div className="flex flex-col gap-y-6.5">
                        <TextFieldComponent
                          name="transactionDate"
                          label="Date *"
                          type="date"
                        />

                        <TextFieldComponent
                          name="requiredByDate"
                          label="Required By"
                          type="date"
                        />

                        <SelectOutlinedField
                          name="purchaseType"
                          label="Purchase Type"
                          options={[
                            { label: 'Local', value: 'Local' },
                            { label: 'Import', value: 'Import' }
                          ]}
                        />

                        <TextFieldComponent
                          name="vrn"
                          label="VRN"
                          placeholder="40-018878-T"
                        />

                        <TextFieldComponent
                          name="pfiNo"
                          label="PFI NO."
                          placeholder="PFI NO."
                        />

                        <TextFieldComponent
                          name="contact"
                          label="Contact"
                          placeholder="+255..."
                        />

                        <TextFieldComponent
                          name="email"
                          label="Email"
                          placeholder="supplier@example.com"
                        />
                      </div>

                    </div>

                    {/* ACCORDION: CURRENCY AND PRICE LIST */}
                    <div className="border border-gray-200 rounded-2xl overflow-hidden bg-gray-50/60 transition-all">
                      <button
                        type="button"
                        onClick={() => setShowCurrencyAccordion(!showCurrencyAccordion)}
                        className="w-full px-5 py-3.5 flex items-center justify-between font-bold text-xs text-gray-800 bg-gray-100/70 hover:bg-gray-100 transition-colors cursor-pointer select-none"
                      >
                        <span className="flex items-center gap-2">
                          <span>Currency and Price List</span>
                        </span>
                        {showCurrencyAccordion ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                      </button>

                      {showCurrencyAccordion && (
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6.5 bg-white border-t border-gray-200 text-xs">
                          <SelectOutlinedField
                            name="currency"
                            label="Currency"
                            options={[
                              { label: 'INR (Indian Rupee - ₹)', value: 'INR' },
                              { label: 'USD (US Dollar - $)', value: 'USD' },
                              { label: 'EUR (Euro - €)', value: 'EUR' },
                              { label: 'GBP (British Pound - £)', value: 'GBP' },
                              { label: 'TZS (Tanzanian Shilling)', value: 'TZS' }
                            ]}
                          />

                          <SelectOutlinedField
                            name="priceList"
                            label="Price List"
                            options={[
                              { label: 'Standard Buying', value: 'Standard Buying' },
                              { label: 'Local Buying Rate', value: 'Local Buying Rate' }
                            ]}
                          />
                        </div>
                      )}
                    </div>

                    {/* ITEMS SECTION */}
                    <div className="pt-6 border-t border-gray-200 space-y-4">
                      <h3 className="text-base font-bold text-gray-900">Items</h3>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                        <div className="relative">
                          <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                          <input
                            type="text"
                            placeholder="Scan Barcode"
                            className="w-full bg-gray-100/90 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-gray-500 mb-1">Set Target Warehouse</label>
                          <select
                            value={values.setWarehouse || 'Main Store - PSL'}
                            onChange={(e) => setFieldValue('setWarehouse', e.target.value)}
                            className="w-full bg-gray-100/90 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 outline-none cursor-pointer"
                          >
                            <option value="Main Store - PSL">Main Store - PSL</option>
                            <option value="Raw Material Store">Raw Material Store</option>
                            <option value="Finished Goods Store">Finished Goods Store</option>
                          </select>
                        </div>
                      </div>

                      {/* DYNAMIC ITEMS TABLE (Matches Material Request Design & Functionality) */}
                      <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                        <div className="overflow-x-auto">
                          <table className="min-w-[1200px] w-full text-sm text-left text-gray-700">
                            <thead className="bg-gray-100/90 border-b border-gray-200 text-gray-700 font-bold select-none text-xs uppercase tracking-wider">
                              <tr>
                                <th className="px-3 py-3 w-10 text-center">
                                  <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                                </th>
                                <th className="px-3 py-3 w-12 text-center">No.</th>
                                <th className="px-3 py-3 min-w-[320px]">Item Code *</th>
                                <th className="px-3 py-3 min-w-[150px]">Required By</th>
                                <th className="px-3 py-3 min-w-[160px]">Item Group</th>
                                <th className="px-3 py-3 min-w-[110px] text-center">Quantity *</th>
                                <th className="px-3 py-3 min-w-[110px]">UOM *</th>
                                <th className="px-3 py-3 min-w-[140px] text-right">Rate ({values.currency || 'INR'}) *</th>
                                <th className="px-3 py-3 min-w-[110px] text-right">Received Qty</th>
                                <th className="px-3 py-3 min-w-[140px] text-right">Amount</th>
                                <th className="px-3 py-3 w-12 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {itemsList.map((item, idx) => {
                                const lineAmount = (item.amount !== undefined && item.amount !== null) 
                                  ? item.amount 
                                  : ((item.quantity || 0) * (item.rate || 0));
                                return (
                                  <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-3 py-2.5 text-center">
                                      <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-semibold text-gray-600 text-sm">
                                      {idx + 1}
                                    </td>
                                    <td className="px-3 py-2.5 min-w-[320px]">
                                      <Autocomplete
                                        freeSolo
                                        options={allSkuOptions}
                                        value={item.itemCode || ''}
                                        onInputChange={(_, newInputValue) => {
                                          handleItemChange(idx, 'itemCode', newInputValue);
                                        }}
                                        onChange={(_, newValue) => {
                                          const val = typeof newValue === 'string' ? newValue : (newValue as any)?.label || newValue || '';
                                          handleProductSelect(idx, val);
                                        }}
                                        renderInput={(params) => (
                                          <TextField
                                            {...params}
                                            placeholder="Select or Search Item Code..."
                                            size="small"
                                            sx={{
                                              '& .MuiOutlinedInput-root': {
                                                fontSize: '0.875rem',
                                                backgroundColor: '#ffffff',
                                                borderRadius: '0.5rem',
                                                padding: '3px 10px !important',
                                                '& fieldset': { borderColor: '#d1d5db' },
                                                '&:hover fieldset': { borderColor: '#16a34a' },
                                                '&.Mui-focused fieldset': { borderColor: '#16a34a', borderWidth: '1.5px' },
                                              },
                                              '& .MuiOutlinedInput-input': {
                                                padding: '3px 0 !important',
                                                fontSize: '0.875rem',
                                                fontWeight: 500,
                                                color: '#111827'
                                              }
                                            }}
                                          />
                                        )}
                                      />
                                      {(item.rollLength || item.rollWidth || item.rollCoreDiameter || item.rollSurface || item.rollWeight) && (
                                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-200/80 font-medium">
                                          {item.rollLength && <span>L: {item.rollLength}</span>}
                                          {item.rollWidth && <span>W: {item.rollWidth}</span>}
                                          {item.rollCoreDiameter && <span>Core: {item.rollCoreDiameter}</span>}
                                          {item.rollSurface && <span>Surface: {item.rollSurface}</span>}
                                          {item.rollWeight && <span>Wt: {item.rollWeight}kg</span>}
                                        </div>
                                      )}
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="date"
                                        value={item.requiredByDate || ''}
                                        onChange={(e) => handleItemChange(idx, 'requiredByDate', e.target.value)}
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none transition-colors"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="text"
                                        value={item.itemGroup || ''}
                                        onChange={(e) => handleItemChange(idx, 'itemGroup', e.target.value)}
                                        placeholder="Optional"
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none transition-colors uppercase placeholder:text-gray-400"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="number"
                                        step="any"
                                        value={item.quantity === undefined || item.quantity === null ? '' : String(item.quantity).replace(/^0+(?=\d)/, '')}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const numVal = raw === '' ? 0 : parseFloat(raw);
                                          handleItemChange(idx, 'quantity', isNaN(numVal) ? 0 : numVal);
                                        }}
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-bold text-center outline-none transition-colors"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <select
                                        value={item.uom || 'Pcs'}
                                        onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none cursor-pointer transition-colors"
                                      >
                                        {['Pcs', 'BOX', 'NOS', 'Kg', 'Meter', 'Roll', 'Set', 'PAIR'].map(u => (
                                          <option key={u} value={u}>{u}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="number"
                                        step="any"
                                        value={item.rate === undefined || item.rate === null ? '' : String(item.rate).replace(/^0+(?=\d)/, '')}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const numVal = raw === '' ? 0 : parseFloat(raw);
                                          handleItemChange(idx, 'rate', isNaN(numVal) ? 0 : numVal);
                                        }}
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-bold text-right outline-none transition-colors"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-medium text-gray-500 text-sm">
                                      {item.receivedQty || 0}
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-gray-900 text-sm">
                                      {lineAmount.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRow(idx)}
                                        className="p-1 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
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

                        {/* TABLE ACTION BUTTONS */}
                        <div className="p-4 bg-gray-50/80 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={handleAddRow}
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
                            <button type="button" onClick={() => successToast('CSV Template downloaded')} className="hover:text-primary-600 cursor-pointer">Download Template</button>
                            <span>|</span>
                            <button type="button" onClick={() => successToast('CSV Uploaded')} className="hover:text-primary-600 cursor-pointer">Upload CSV</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {activeTab === 'address' && (
                  <div className="space-y-4 text-xs text-gray-700">
                    <p className="font-bold text-sm text-gray-900">Address & Contact Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Supplier Address</label>
                        <textarea rows={3} defaultValue="P.O. Box 4021, Industrial Area, Dar es Salaam, Tanzania" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Shipping Address</label>
                        <textarea rows={3} defaultValue="Patel Strap Industries Ltd, Main Factory Gate, Plot 14" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'terms' && (
                  <div className="space-y-4 text-xs text-gray-700">
                    <p className="font-bold text-sm text-gray-900">Terms & Conditions</p>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Terms Template</label>
                      <select className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-xs outline-none cursor-pointer">
                        <option>Standard Buying Terms</option>
                        <option>Local Vendor Agreement</option>
                      </select>
                    </div>
                    <div>
                      <textarea rows={6} defaultValue={`1. Goods must be delivered within the stipulated Required By Date.\n2. Defective items will be returned at supplier expense.\n3. Payment strictly according to credit terms.`} className="w-full bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs outline-none font-mono" />
                    </div>
                  </div>
                )}

                {activeTab === 'moreInfo' && (
                  <div className="space-y-4 text-xs text-gray-700">
                    <p className="font-bold text-sm text-gray-900">More Information</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Created By</label>
                        <input type="text" readOnly value={values.createdBy || currentUserName} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                        <input type="text" readOnly value={values.status || 'Draft'} className="w-full bg-gray-100 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold" />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'connections' && (
                  <div className="py-2">
                    <ERPFormConnections
                      groups={[
                        {
                          title: 'Related',
                          items: [
                            {
                              label: 'GRN',
                              count: linkedGrnsCount || (poId === 'PO-2026-09-00008' ? 8 : 0),
                              countRight: linkedGrnsCount || (poId === 'PO-2026-09-00008' ? 8 : 0),
                              hasPlus: true,
                              onCreate: () => navigate(`/grn/new?poId=${poId}`),
                              onClick: () => navigate(`/grn?purchaseOrderId=${poId}`)
                            },
                            {
                              label: 'Purchase Invoice',
                              hasPlus: true,
                              onCreate: () => successToast('Create Purchase Invoice')
                            }
                          ]
                        },
                        {
                          title: 'Payment',
                          items: [
                            {
                              label: 'Payment Entry',
                              hasPlus: true,
                              onCreate: () => successToast('Create Payment Entry')
                            },
                            {
                              label: 'Journal Entry',
                              hasPlus: true,
                              onCreate: () => successToast('Create Journal Entry')
                            },
                            {
                              label: 'Payment Request'
                            }
                          ]
                        },
                        {
                          title: 'Reference',
                          items: [
                            { label: 'Supplier Quotation' },
                            { label: 'Project' }
                          ]
                        },
                        {
                          title: 'Manufacturing',
                          items: [
                            { label: 'Material Request' },
                            { label: 'Subcontracting Receipt' },
                            { label: 'Stock Entry' }
                          ]
                        }
                      ]}
                    />
                  </div>
                )}

              </Form>
            )}
          </Formik>
        </div>

        {/* COMMENTS & ACTIVITY TIMELINE COMPONENT */}
        {/* <FormCommentsAndActivity
          entityType="PurchaseOrder"
          entityId={isEditMode && poId && poId !== 'new' ? poId : ''}
          createdByName={(initialValues as any).createdBy || currentUserName}
          createdAt={(initialValues as any).createdAt ? formatDistanceToNow(new Date((initialValues as any).createdAt), { addSuffix: true }) : 'recently'}
          lastEditedByName={(initialValues as any).lastEditedBy || (initialValues as any).updatedBy || currentUserName}
          lastEditedAt={(initialValues as any).updatedAt ? formatDistanceToNow(new Date((initialValues as any).updatedAt), { addSuffix: true }) : 'recently'}
          currentUser={{ name: currentUserName }}
          className="mt-6"
        /> */}
      </div>

      {/* MODAL: GET ITEMS FROM MATERIAL REQUEST */}
      {showMRPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <h3 className="font-bold text-base text-gray-900">Get Items from Material Request</h3>
              </div>
              <button 
                onClick={() => setShowMRPickerModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-medium">Select an active Material Request to load its items into this Purchase Order:</p>

            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 border border-gray-200 rounded-2xl bg-gray-50/50">
              {availableMRs.length > 0 ? (
                availableMRs.map((mr) => (
                  <div
                    key={mr.id}
                    onClick={() => handleLoadFromMaterialRequest(mr)}
                    className="p-3.5 bg-white hover:bg-primary-50/60 transition-colors flex items-center justify-between cursor-pointer group"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-gray-900 group-hover:text-primary-700">{mr.id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold">{mr.status || 'Submitted'}</span>
                      </div>
                      <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                        Purpose: {mr.purpose} • Dept: {mr.department || '—'} • {mr.items?.length || 0} item(s)
                      </p>
                    </div>
                    <button type="button" className="px-3 py-1 bg-primary-600 text-white rounded-lg text-xs font-bold shadow-2xs group-hover:bg-primary-700 transition-colors">
                      Select
                    </button>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs text-gray-500 font-medium">No material requests found</div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowMRPickerModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GET ITEMS FROM SUPPLIER QUOTATION */}
      {showSQPickerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-base text-gray-900">Get Items from Supplier Quotation</h3>
              </div>
              <button 
                onClick={() => setShowSQPickerModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-500 font-medium">Select a Supplier Quotation to import items & rate quotes:</p>

            <div className="space-y-2">
              {[
                { id: 'SQ-2026-001', supplier: 'VICTOR SUPPLIERS LTD', itemsCount: 3, rateTotal: 4025400 },
                { id: 'SQ-2026-002', supplier: 'AURA INDUSTRIAL CONSUMABLES', itemsCount: 1, rateTotal: 625000 }
              ].map(sq => (
                <div
                  key={sq.id}
                  onClick={() => {
                    setShowSQPickerModal(false);
                    successToast(`Loaded items & quoted rates from ${sq.id}`);
                  }}
                  className="p-3 bg-gray-50 hover:bg-emerald-50/60 border border-gray-200 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <span className="font-bold text-xs text-gray-900">{sq.id}</span>
                    <p className="text-[11px] text-gray-500">{sq.supplier} • {sq.itemsCount} items</p>
                  </div>
                  <span className="font-bold text-xs text-emerald-700">₹{sq.rateTotal.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowSQPickerModal(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Multiple SKUs Picker Modal */}
      {showSkuPickerModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-bold text-gray-900 text-sm flex items-center gap-2">
                <Barcode className="w-4 h-4 text-primary-600" />
                <span>Select Items / SKUs to Add</span>
              </h3>
              <button type="button" onClick={() => setShowSkuPickerModal(false)} className="text-gray-400 hover:text-gray-600 cursor-pointer font-bold text-base">✕</button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {(availableSkus.length > 0 ? availableSkus : [
                'NGTL047: SHANK DRILL BIT',
                'NLMS011: OXYGEN CYLINDER 8.5',
                'NLMS033: LPG CYLINDER',
                'NGMD008: AMOXYCLAVE TABLET',
                'TOOL001: PNEUMATIC STRAPPING TOOL'
              ]).map((skuName, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    const newId = (itemsList.length + 1).toString();
                    setItemsList(prev => [
                      ...prev,
                      {
                        id: newId,
                        itemCode: skuName,
                        requiredByDate: new Date().toISOString().split('T')[0],
                        itemGroup: 'GENERAL',
                        quantity: 10,
                        uom: 'Pcs',
                        rate: 500,
                        receivedQty: 0,
                        amount: 5000
                      }
                    ]);
                    setIsFormDirty(true);
                    successToast(`Added "${skuName}" to items table`);
                  }}
                  className="p-3 bg-gray-50 hover:bg-emerald-50/80 border border-gray-200 hover:border-primary-300 rounded-xl flex items-center justify-between cursor-pointer transition-all"
                >
                  <div>
                    <p className="font-bold text-xs text-gray-900">{skuName}</p>
                    <p className="text-[11px] text-gray-500">Default Rate: ₹500 | Default Qty: 10</p>
                  </div>
                  <span className="text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-lg border border-primary-200">+ Add</span>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSkuPickerModal(false)}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order GST Print & PDF Modal */}
      {showPrintModal && (
        <PurchaseOrderPrintModal
          isOpen={showPrintModal}
          onClose={() => setShowPrintModal(false)}
          order={{
            id: poId || initialValues.id || 'PO-2026-09-00002',
            series: initialValues.series,
            company: initialValues.company,
            supplier: initialValues.supplier,
            transactionDate: initialValues.transactionDate,
            requiredByDate: initialValues.requiredByDate,
            paymentTerms: initialValues.paymentTerms,
            purchaseType: initialValues.purchaseType,
            currency: initialValues.currency || 'INR',
            setWarehouse: initialValues.setWarehouse,
            tin: initialValues.tin,
            vrn: initialValues.vrn,
            pfiNo: initialValues.pfiNo,
            createdBy: initialValues.createdBy || currentUserName,
            user: initialValues.user || currentUserName,
            items: itemsList
          }}
        />
      )}
    </ERPFormPageLayout>
  );
};

export const PurchaseOrderFormPage = WithAuth(PurchaseOrderFormPageBase, ModuleName.PURCHASE_ORDERS, Permission.ADD);
export default PurchaseOrderFormPage;
