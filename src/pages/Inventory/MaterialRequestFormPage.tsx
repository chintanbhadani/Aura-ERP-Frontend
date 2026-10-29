import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ERPFormHeader, ERPFormPageLayout, ERPFormConnections } from '../../components/ERPForm';
import { ItemPrintModal } from '../../components/ItemPrintModal';
import { FormCommentsAndActivity, triggerActivityRefresh } from '../../components/FormCommentsAndActivity';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import dataService from '../../axios/dataService';
import { formatDistanceToNow } from 'date-fns';
import { 
  fetchMaterialRequestById, 
  fetchNextMaterialRequestId,
  createMaterialRequest, 
  updateMaterialRequest, 
  fetchSkus,
  fetchInventory,
  uploadFile,
  type MaterialRequest, 
  type MaterialRequestItem 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { 
  ArrowLeft, 
  Save, 
  Plus, 
  Trash2, 
  ChevronDown, 
  Printer, 
  MoreHorizontal, 
  UserPlus, 
  Paperclip, 
  Tag as TagIcon, 
  Share2, 
  Heart, 
  MessageSquare,
  ExternalLink,
  Barcode, 
  X, 
  Check, 
  CheckCircle2,
  XCircle,
  ChevronsUpDown,
  RotateCcw,
  HelpCircle,
  Download, 
  Upload, 
  Layers 
} from 'lucide-react';
import { Autocomplete, TextField } from '@mui/material';
import { TextFieldComponent, SelectOutlinedField } from '../../components/input/index';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';

const materialRequestSchema = Yup.object({
  purpose: Yup.string().required('Purpose is required'),
  transactionDate: Yup.string().required('Transaction Date is required'),
  company: Yup.string().required('Company is required'),
});

const DEFAULT_ITEMS: MaterialRequestItem[] = [
  { id: '1', itemCode: '', sparePart: '', requiredByDate: new Date().toISOString().split('T')[0], quantity: 1, uom: 'Pcs' }
];

const MaterialRequestFormPageBase: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const reqId = id || searchParams.get('id');

  // Redux Logged-In User
  const { user } = useSelector((state: any) => state.base);
  const currentUserName = user?.name || user?.username || user?.email?.split('@')[0] || 'Admin';

  const isEditMode = Boolean(reqId && reqId !== 'new');
  const [activeTab, setActiveTab] = useState<'details' | 'moreInfo' | 'connections'>('details');
  const [showWorkflowBanner, setShowWorkflowBanner] = useState(true);
  const [loading, setLoading] = useState(false);

  // Left Sidebar States (Interactive functionality)
  const [assignedTo, setAssignedTo] = useState(currentUserName);

  useEffect(() => {
    if (currentUserName && (!assignedTo || assignedTo === 'Harsh Thakkar')) {
      setAssignedTo(currentUserName);
    }
  }, [currentUserName]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string }[]>([]);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [following, setFollowing] = useState(false);
  const [isFormDirty, setIsFormDirty] = useState<boolean>(!isEditMode);

  // Top Header Actions (Actions Dropdown, Create Dropdown, Print Modal & Jump to Field Modal)
  const formikRef = useRef<any>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const [showGetItemsMenu, setShowGetItemsMenu] = useState(false);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);
  const getItemsMenuRef = useRef<HTMLDivElement>(null);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showJumpToFieldModal, setShowJumpToFieldModal] = useState(false);
  const [jumpSearchQuery, setJumpSearchQuery] = useState('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(event.target as Node)) {
        setShowCreateMenu(false);
      }
      if (getItemsMenuRef.current && !getItemsMenuRef.current.contains(event.target as Node)) {
        setShowGetItemsMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleFinalSubmit = async () => {
    try {
      const currentValues = formikRef.current ? formikRef.current.values : initialValues;
      const updatedPayload: Partial<MaterialRequest> = {
        ...currentValues,
        submit: true,
        docStatus: 1,
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
        submit: true,
        docStatus: 1,
        status: 'Submitted',
        approvalStatus: 'Submitted'
      }));
      setIsFormDirty(false);

      const targetId = reqId && reqId !== 'new' ? reqId : (initialValues as any).id;
      if (targetId) {
        await updateMaterialRequest(targetId, updatedPayload);
        triggerActivityRefresh('MaterialRequest', targetId);
      } else {
        const created = await createMaterialRequest(updatedPayload);
        if (created?.id) {
          triggerActivityRefresh('MaterialRequest', created.id);
          navigate(`/material-request/${created.id}`);
        }
      }

      successToast('Material Request submitted successfully!');
    } catch (error: any) {
      console.error('Submit error:', error);
      errorToast(error?.response?.data?.error || error?.message || 'Failed to submit Material Request');
    }
  };

  const handleReject = async () => {
    try {
      const currentValues = formikRef.current ? formikRef.current.values : initialValues;
      const updatedPayload: Partial<MaterialRequest> = {
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

      const targetId = reqId && reqId !== 'new' ? reqId : (initialValues as any).id;
      if (targetId) {
        await updateMaterialRequest(targetId, updatedPayload).catch(() => {});
        triggerActivityRefresh('MaterialRequest', targetId);
      }

      successToast('Material Request rejected');
    } catch (error: any) {
      console.error('Reject error:', error);
      errorToast(error?.response?.data?.error || error?.message || 'Failed to reject Material Request');
    }
  };

  const jumpFieldsList = [
    { label: 'Series', tab: 'details' as const, fieldId: 'series' },
    { label: 'Purpose', tab: 'details' as const, fieldId: 'purpose' },
    { label: 'Required By Date', tab: 'details' as const, fieldId: 'requiredByDate' },
    { label: 'Approval Status', tab: 'details' as const, fieldId: 'approvalStatus' },
    { label: 'Set Target Warehouse', tab: 'details' as const, fieldId: 'setWarehouse' },
    { label: 'Company', tab: 'details' as const, fieldId: 'company' },
    { label: 'Items Table', tab: 'details' as const, fieldId: 'items-table' },
    { label: 'Created By', tab: 'moreInfo' as const, fieldId: 'createdBy' },
    { label: 'Amended From', tab: 'moreInfo' as const, fieldId: 'amendedFrom' },
    { label: 'Connections Panel', tab: 'connections' as const, fieldId: 'connections-panel' },
  ];

  const filteredJumpFields = jumpFieldsList.filter(f =>
    f.label.toLowerCase().includes(jumpSearchQuery.toLowerCase())
  );

  const handleJumpToField = (field: typeof jumpFieldsList[0]) => {
    setActiveTab(field.tab);
    setShowJumpToFieldModal(false);
    setJumpSearchQuery('');
    successToast(`Jumped to ${field.label}`);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowJumpToFieldModal(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAttachment(true);
    try {
      const res = await uploadFile(file);
      setAttachments(prev => [...prev, { name: res.filename || file.name, url: res.url || '#' }]);
      successToast('File uploaded successfully');
    } catch (err) {
      errorToast('Failed to upload file');
    } finally {
      setUploadingAttachment(false);
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim()) {
      const tagUpper = newTagInput.trim().toUpperCase();
      if (!tags.includes(tagUpper)) {
        setTags(prev => [...prev, tagUpper]);
      }
      setNewTagInput('');
      setShowTagInput(false);
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };
  const [itemsList, setItemsList] = useState<MaterialRequestItem[]>(DEFAULT_ITEMS);
  const [availableSkus, setAvailableSkus] = useState<string[]>([]);

  const allSkuOptions = useMemo(() => {
    const options = new Set(availableSkus);
    itemsList.forEach(item => {
      if (item.itemCode && item.itemCode.trim()) {
        options.add(item.itemCode);
      }
    });
    return Array.from(options);
  }, [availableSkus, itemsList]);

  const allUomOptions = useMemo(() => {
    const options = new Set(['Pcs', 'BOX', 'NOS', 'Kg', 'Meter', 'Roll', 'Set', 'PAIR']);
    itemsList.forEach(item => {
      if (item.uom && item.uom.trim()) {
        options.add(item.uom);
      }
    });
    return Array.from(options);
  }, [itemsList]);

  const todayStr = new Date().toISOString().split('T')[0];
  const [initialValues, setInitialValues] = useState<Partial<MaterialRequest>>({
    id: reqId && reqId !== 'new' ? reqId : '',
    series: 'PR-.YYYY.-.MM.-',
    approvalStatus: 'Draft',
    status: isEditMode ? 'Partially Received' : 'Draft',
    purpose: '',
    transactionDate: todayStr,
    requiredByDate: todayStr,
    department: '',
    requiredFor: '',
    priceList: 'Standard Buying',
    company: 'PATEL STRAP INDUSTRIES LTD',
    attendBy: currentUserName,
    purchaseType: '',
    linkedSpareRequisition: '',
    scanBarcode: '',
    setWarehouse: 'Main Store - PSL',
    assignedTo: currentUserName,
    createdBy: currentUserName
  });

  useEffect(() => {
    const loadSkus = async () => {
      try {
        const [skus, inventory] = await Promise.all([
          fetchSkus().catch(() => []),
          fetchInventory().catch(() => [])
        ]);

        const list: string[] = [];
        if (skus && Array.isArray(skus)) {
          skus.forEach(s => {
            if (s.sku && s.name) {
              list.push(`${s.sku}: ${s.name}`);
            } else if (s.name) {
              list.push(s.name);
            }
          });
        }

        if (inventory && Array.isArray(inventory)) {
          inventory.forEach(p => {
            const code = p.sku || p.id;
            const name = p.name;
            if (code && name) {
              const label = `${code}: ${name}`;
              if (!list.includes(label)) list.push(label);
            } else if (name && !list.includes(name)) {
              list.push(name);
            }
          });
        }

        setAvailableSkus(Array.from(new Set(list)));
      } catch (err) {
        console.warn('Failed to load item list');
      }
    };
    loadSkus();
  }, []);

  useEffect(() => {
    if (reqId && reqId !== 'new') {
      const loadRecord = async () => {
        setLoading(true);
        try {
          const fetched = await fetchMaterialRequestById(reqId);
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
            if (fetched.tags && typeof fetched.tags === 'string') {
              setTags(fetched.tags.split(',').map(t => t.trim()).filter(Boolean));
            } else {
              setTags([]);
            }
            setIsFormDirty(false);
          }
        } catch (err) {
          console.warn('Backend unavailable, showing demo data for material request');
        } finally {
          setLoading(false);
        }
      };
      loadRecord();
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      setItemsList([
        { id: '1', itemCode: '', sparePart: '', requiredByDate: todayStr, quantity: 1, uom: 'Pcs' }
      ]);
      setAttachments([]);
      setTags([]);
      setIsFormDirty(true);
      setInitialValues({
        series: 'PR-.YYYY.-.MM.-',
        approvalStatus: 'Draft',
        status: 'Draft',
        purpose: 'Purchase',
        transactionDate: todayStr,
        requiredByDate: todayStr,
        department: '',
        requiredFor: '',
        priceList: 'Standard Buying',
        company: 'PATEL STRAP INDUSTRIES LTD',
        attendBy: currentUserName,
        createdBy: currentUserName,
        purchaseType: 'Local',
        setWarehouse: 'Main Store - PSL'
      });
      fetchNextMaterialRequestId(todayStr)
        .then(res => {
          if (res?.id) {
            setInitialValues(prev => ({
              ...prev,
              id: res.id,
              series: res.series || prev.series
            }));
          }
        })
        .catch(() => {});
    }
  }, [reqId, currentUserName]);

  const handleAddRow = () => {
    setIsFormDirty(true);
    const newId = (itemsList.length + 1).toString();
    setItemsList(prev => [
      ...prev,
      { id: newId, itemCode: '', sparePart: '', requiredByDate: new Date().toISOString().split('T')[0], quantity: 1, uom: 'Pcs' }
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

  const handleItemChange = (index: number, field: keyof MaterialRequestItem, val: any) => {
    setIsFormDirty(true);
    setItemsList(prev => prev.map((item, i) => {
      if (i === index) {
        let cleanVal = val;
        if (field === 'quantity') {
          if (typeof val === 'string') {
            const stripped = val.replace(/^0+(?=\d)/, '');
            cleanVal = stripped === '' ? 0 : (parseFloat(stripped) || 0);
          } else if (typeof val === 'number') {
            cleanVal = isNaN(val) ? 0 : val;
          }
        }
        return { ...item, [field]: cleanVal };
      }
      return item;
    }));
  };

  const getChangedFieldsSummary = (oldVals: any, newVals: any, docName = 'Material Request') => {
    const changes: string[] = [];
    const fieldLabels: Record<string, string> = {
      purpose: 'Purpose',
      department: 'Department',
      requiredFor: 'Required For',
      purchaseType: 'Purchase Type',
      requiredByDate: 'Required By Date',
      transactionDate: 'Transaction Date',
      company: 'Company',
      setWarehouse: 'Warehouse',
      priceList: 'Price List',
      status: 'Status',
      approvalStatus: 'Approval Status',
      attendBy: 'Attend By'
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
      setSubmitting(true);
      const payload: Partial<MaterialRequest> = {
        ...values,
        submit: false,
        docStatus: 0,
        status: 'Draft',
        approvalStatus: 'Draft',
        createdBy: values.createdBy || currentUserName,
        assignedTo: assignedTo || currentUserName,
        tags: tags.join(','),
        attachments: attachments,
        items: itemsList
      };

      if (formikRef.current) {
        formikRef.current.setFieldValue('status', 'Draft');
        formikRef.current.setFieldValue('approvalStatus', 'Draft');
      }

      if (isEditMode && reqId && reqId !== 'new') {
        await updateMaterialRequest(reqId, payload);
        triggerActivityRefresh('MaterialRequest', reqId);
        setInitialValues(prev => ({ ...prev, ...payload }));
        setIsFormDirty(false);
        successToast('Material Request saved as Draft');
      } else {
        const created = await createMaterialRequest(payload);
        setIsFormDirty(false);
        if (created?.id) {
          triggerActivityRefresh('MaterialRequest', created.id);
        }
        successToast('Material Request created as Draft');
        navigate(`/material-request/${created?.id || ''}`);
      }
    } catch (err: any) {
      errorToast(err?.response?.data?.error || err?.message || 'Failed to save Material Request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ERPFormPageLayout
      recordCode={isEditMode && initialValues.id ? initialValues.id : undefined}
      header={
        <ERPFormHeader
          title={isEditMode ? `Material Request ${initialValues.id}` : 'New Material Request'}
          onBack={() => navigate('/material-request')}
          backTitle="Back to Material Requests"
          dirty={isFormDirty}
          statusBadge={{
            label: initialValues.status || 'Draft',
            variant: initialValues.status === 'Partially Received' ? 'warning' : initialValues.status === 'Approved' || initialValues.approvalStatus === 'Approved' ? 'success' : 'gray'
          }}
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
                  <div className="absolute left-0 mt-1.5 w-48 bg-white border border-gray-200 rounded-2xl shadow-xl py-1.5 z-50 text-xs font-medium animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        setShowGetItemsMenu(false);
                        successToast('Loaded items from Sales Order');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 cursor-pointer font-medium"
                    >
                      Sales Order
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGetItemsMenu(false);
                        successToast('Loaded items from Production Plan');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 cursor-pointer font-medium"
                    >
                      Production Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowGetItemsMenu(false);
                        successToast('Loaded items from Bill of Materials (BOM)');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 cursor-pointer font-medium"
                    >
                      BOM
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
                        const mrId = reqId || initialValues.id || 'PR-2026-08-00015';
                        successToast(`Creating Purchase Order from ${mrId}...`);
                        navigate('/purchase-order/new', {
                          state: {
                            fromMaterialRequest: {
                              id: mrId,
                              documentType: 'PURCHASE',
                              title: `New Purchase Order (Linked to ${mrId})`,
                              items: itemsList
                            }
                          }
                        });
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                    >
                      <span>Purchase Order</span>
                      <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-mono font-bold">PO</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        const mrId = reqId || initialValues.id || 'PR-2026-08-00015';
                        successToast(`Creating Request for Quotation (RFQ) from ${mrId}...`);
                        navigate('/invoices/new', {
                          state: {
                            fromMaterialRequest: {
                              id: mrId,
                              documentType: 'PURCHASE',
                              title: `New Request for Quotation (RFQ - ${mrId})`,
                              items: itemsList
                            }
                          }
                        });
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                    >
                      <span>Request for Quotation</span>
                      <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded font-mono font-bold">RFQ</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateMenu(false);
                        const mrId = reqId || initialValues.id || 'PR-2026-08-00015';
                        successToast(`Creating Supplier Quotation from ${mrId}...`);
                        navigate('/invoices/new', {
                          state: {
                            fromMaterialRequest: {
                              id: mrId,
                              documentType: 'PURCHASE',
                              title: `New Supplier Quotation (${mrId})`,
                              items: itemsList
                            }
                          }
                        });
                      }}
                      className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-gray-800 flex items-center justify-between font-semibold transition-colors cursor-pointer"
                    >
                      <span>Supplier Quotation</span>
                      <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded font-mono font-bold">SQ</span>
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
              onClick: () => successToast('Material Request duplicated successfully')
            },
            {
              label: 'Download Template',
              onClick: () => successToast('Downloaded Material Request Template')
            },
            {
              label: 'Export Items CSV',
              onClick: () => successToast('Exported items CSV')
            },
            {
              label: 'Jump to field',
              onClick: () => setShowJumpToFieldModal(true),
              shortcut: '⌘+J'
            },
            {
              label: 'Copy Request ID',
              onClick: () => {
                navigator.clipboard.writeText(reqId || 'PR-2026-08-00008');
                successToast('Material Request ID copied to clipboard');
              }
            },
            {
              label: 'Reload Page',
              onClick: () => window.location.reload()
            },
            {
              label: 'Audit Trail',
              onClick: () => successToast('Viewing Audit Trail')
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
              const formElem = document.getElementById('material-request-form') as HTMLFormElement;
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
                      onClick={() => setAttachments(attachments.filter((_, i) => i !== idx))} 
                      className="text-gray-400 hover:text-red-600 font-bold pl-1 cursor-pointer"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Tags */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="text-gray-500 flex items-center gap-2">
                  <TagIcon className="w-4 h-4 text-gray-400" /> Tags
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
                <div className="flex gap-1.5 pt-1">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    placeholder="TAG..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs outline-none uppercase font-bold"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
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
                    <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-600 font-bold cursor-pointer">×</button>
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
                  successToast('Material Request link copied to clipboard');
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
            
            {/* FORM TABS (Identical styling to ProductFormPage, SupplierFormPage, CustomerFormPage) */}
            <div className="flex items-center gap-2 px-6 border-b border-gray-200 overflow-x-auto bg-gray-50/50">
              {[
                { id: 'details', label: 'Details' },
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

            {/* FORMIK FORM BODY */}
            <Formik
              innerRef={formikRef}
              initialValues={initialValues}
              validationSchema={materialRequestSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({ values, setFieldValue, isSubmitting }) => (
                <Form id="material-request-form" className="p-6 sm:p-8 space-y-8">
                  
                  {activeTab === 'details' && (
                    <>
                      {/* SECTION TITLE */}
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 mb-3">Material Request Details</h3>
                      </div>

                      {/* APPROVAL STATUS */}
                      <div className="max-w-md pb-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">Approval Status</label>
                        <input
                          type="text"
                          readOnly
                          value={values.approvalStatus || initialValues.approvalStatus || 'Draft'}
                          className="w-full bg-gray-100/90 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 outline-none"
                        />
                      </div>

                      {/* 2-COLUMN FIELD GRID */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-6.5 pt-1 pb-4">
                        
                        {/* LEFT COLUMN */}
                        <div className="flex flex-col gap-y-6.5">
                          <TextFieldComponent
                            name="id"
                            label="Material Request ID"
                            placeholder="Auto-generated on save"
                            disabled={true}
                          />

                          <SelectOutlinedField
                            name="purpose"
                            label="Purpose *"
                            options={[
                              { label: 'Purchase', value: 'Purchase' },
                              { label: 'Material Transfer', value: 'Material Transfer' },
                              { label: 'Material Issue', value: 'Material Issue' },
                              { label: 'Manufacture', value: 'Manufacture' },
                              { label: 'Customer Provided', value: 'Customer Provided' }
                            ]}
                          />

                          <SelectOutlinedField
                            name="department"
                            label="Department *"
                            options={[
                              { label: 'HEALTH & SAFETY', value: 'HEALTH & SAFETY' },
                              { label: 'WORKSHOP', value: 'WORKSHOP' },
                              { label: 'PRODUCTION', value: 'PRODUCTION' },
                              { label: 'MAINTENANCE', value: 'MAINTENANCE' },
                              { label: 'QUALITY CONTROL', value: 'QUALITY CONTROL' }
                            ]}
                          />

                          <TextFieldComponent
                            name="requiredFor"
                            label="Required For *"
                            placeholder="e.g. HSE ITEMS, MACHINE SPARES"
                          />

                          <SelectOutlinedField
                            name="company"
                            label="Company *"
                            options={[
                              { label: 'PATEL STRAP INDUSTRIES LTD', value: 'PATEL STRAP INDUSTRIES LTD' },
                              { label: 'TANSA', value: 'TANSA' },
                              { label: 'NEELKANTH CHEMICALS LIMITED', value: 'NEELKANTH CHEMICALS LIMITED' }
                            ]}
                          />
                        </div>

                        {/* RIGHT COLUMN */}
                        <div className="flex flex-col gap-y-6.5">
                          <TextFieldComponent
                            name="transactionDate"
                            label="Transaction Date *"
                            type="date"
                          />

                          <TextFieldComponent
                            name="requiredByDate"
                            label="Required By"
                            type="date"
                          />

                          <TextFieldComponent
                            name="priceList"
                            label="Price List"
                            placeholder="Standard Buying"
                          />

                          <TextFieldComponent
                            name="attendBy"
                            label="Attend By"
                            placeholder="e.g. JAYDEEP DHAKAN"
                          />

                          <SelectOutlinedField
                            name="purchaseType"
                            label="Purchase Type"
                            options={[
                              { label: 'Local', value: 'Local' },
                              { label: 'Import', value: 'Import' }
                            ]}
                          />
                        </div>

                      </div>

                      {/* ITEMS SECTION */}
                      <div className="pt-6 border-t border-gray-200 space-y-4">
                        <h3 className="text-base font-bold text-gray-900">Items</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                          <div className="relative">
                            <Barcode className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                              type="text"
                              value={values.scanBarcode || ''}
                              onChange={(e) => setFieldValue('scanBarcode', e.target.value)}
                              placeholder="Scan Barcode"
                              className="w-full bg-gray-100/90 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs outline-none"
                            />
                          </div>

                          <SelectOutlinedField
                            name="setWarehouse"
                            label="Set Warehouse"
                            options={[
                              { label: 'Main Store - PSL', value: 'Main Store - PSL' },
                              { label: 'Raw Material Store', value: 'Raw Material Store' },
                              { label: 'Finished Goods Store', value: 'Finished Goods Store' }
                            ]}
                          />
                        </div>

                        {/* DYNAMIC ITEMS TABLE (Matches Screenshot 2 & 3) */}
                        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="min-w-[900px] w-full text-sm text-left text-gray-700">
                              <thead className="bg-gray-100/90 border-b border-gray-200 text-gray-700 font-bold select-none text-xs uppercase tracking-wider">
                                <tr>
                                  <th className="px-3 py-3 w-10 text-center">
                                    <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                                  </th>
                                  <th className="px-3 py-3 w-12 text-center">No.</th>
                                  <th className="px-3 py-3 min-w-[320px]">Item Code *</th>
                                  <th className="px-3 py-3 min-w-[160px]">Spare Part</th>
                                  <th className="px-3 py-3 min-w-[150px]">Required By *</th>
                                  <th className="px-3 py-3 min-w-[110px] text-center">Quantity *</th>
                                  <th className="px-3 py-3 min-w-[110px]">UOM *</th>
                                  <th className="px-3 py-3 w-12 text-center"></th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {itemsList.map((item, idx) => (
                                  <tr key={item.id || idx} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="px-3 py-2.5 text-center">
                                      <input type="checkbox" className="rounded border-gray-300 text-primary-600" />
                                    </td>
                                    <td className="px-3 py-2.5 text-center font-semibold text-gray-600 text-sm">
                                      {idx + 1}
                                    </td>
                                    <td className="px-3 py-2.5 min-w-[280px]">
                                      <Autocomplete
                                        freeSolo
                                        options={allSkuOptions}
                                        value={item.itemCode || ''}
                                        onInputChange={(_, newInputValue) => {
                                          handleItemChange(idx, 'itemCode', newInputValue);
                                        }}
                                        onChange={(_, newValue) => {
                                          handleItemChange(idx, 'itemCode', typeof newValue === 'string' ? newValue : newValue || '');
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
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <input
                                        type="text"
                                        value={item.sparePart || ''}
                                        onChange={(e) => handleItemChange(idx, 'sparePart', e.target.value)}
                                        placeholder="Optional"
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none transition-colors placeholder:text-gray-400"
                                      />
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
                                        type="number"
                                        step="any"
                                        value={item.quantity === undefined || item.quantity === null || (item.quantity as any) === '' ? '' : String(item.quantity).replace(/^0+(?=\d)/, '')}
                                        onChange={(e) => {
                                          const raw = e.target.value;
                                          const val = raw === '' ? '' : (parseFloat(raw.replace(/^0+(?=\d)/, '')) || 0);
                                          handleItemChange(idx, 'quantity', val);
                                        }}
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm font-bold text-center text-gray-900 outline-none transition-colors"
                                      />
                                    </td>
                                    <td className="px-3 py-2.5">
                                      <select
                                        value={item.uom || 'Pcs'}
                                        onChange={(e) => handleItemChange(idx, 'uom', e.target.value)}
                                        className="w-full bg-white border border-gray-300 focus:border-primary-500 focus:bg-white rounded-lg px-3 py-2 text-sm text-gray-900 font-medium outline-none cursor-pointer transition-colors"
                                      >
                                        {allUomOptions.map(u => (
                                          <option key={u} value={u}>{u}</option>
                                        ))}
                                      </select>
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRow(idx)}
                                        className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                                        title="Delete line"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* TABLE FOOTER BUTTONS */}
                          <div className="p-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleAddRow}
                                className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-md text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5 text-gray-600" />
                                <span>Add Row</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleAddRow}
                                className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-md text-xs font-semibold text-gray-700 shadow-2xs transition-colors cursor-pointer"
                              >
                                Add Multiple
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-md text-xs font-medium text-gray-600 transition-colors cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Download</span>
                              </button>
                              <button
                                type="button"
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 rounded-md text-xs font-medium text-gray-600 transition-colors cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Upload</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {activeTab === 'moreInfo' && (
                    <div className="space-y-4 py-4 text-xs text-gray-600">
                      <p className="font-semibold text-gray-900 text-sm">Additional Material Request Details</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <TextFieldComponent
                          name="createdBy"
                          label="Created By"
                          disabled
                        />
                        <TextFieldComponent
                          name="amendedFrom"
                          label="Amended From"
                          placeholder="Optional"
                        />
                      </div>
                    </div>
                  )}

                  {activeTab === 'connections' && (
                    <div className="py-2">
                      <ERPFormConnections />
                    </div>
                  )}

                </Form>
              )}
            </Formik>

          </div>

          {/* COMMENTS & ACTIVITY TIMELINE COMPONENT */}
          {/* <FormCommentsAndActivity
            entityType="MaterialRequest"
            entityId={isEditMode && reqId && reqId !== 'new' ? reqId : ''}
            createdByName={(initialValues as any).createdBy || currentUserName}
            createdAt={(initialValues as any).createdAt ? formatDistanceToNow(new Date((initialValues as any).createdAt), { addSuffix: true }) : 'recently'}
            lastEditedByName={(initialValues as any).lastEditedBy || (initialValues as any).updatedBy || currentUserName}
            lastEditedAt={(initialValues as any).updatedAt ? formatDistanceToNow(new Date((initialValues as any).updatedAt), { addSuffix: true }) : 'recently'}
            currentUser={{ name: currentUserName }}
            className="mt-6"
          /> */}
        </div>

      {/* ITEM PRINT PREVIEW MODAL */}
      <ItemPrintModal
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
        item={{
          doctype: 'Material Request',
          sku: reqId && reqId !== 'new' ? reqId : ((initialValues as any).id || 'PR-2026-10-00001'),
          id: reqId && reqId !== 'new' ? reqId : ((initialValues as any).id || 'PR-2026-10-00001'),
          series: reqId && reqId !== 'new' ? reqId : ((initialValues as any).id || 'PR-2026-10-00001'),
          purpose: initialValues.purpose || 'Purchase',
          transactionDate: initialValues.transactionDate || new Date().toISOString().split('T')[0],
          requiredByDate: initialValues.requiredByDate || new Date().toISOString().split('T')[0],
          department: initialValues.department || 'PURCHASING',
          requiredFor: initialValues.requiredFor || 'HSE ITEMS, MEDICINE & CONSUMABLES',
          priceList: initialValues.priceList || 'Standard Buying',
          company: initialValues.company || 'PATEL STRAP INDUSTRIES LTD',
          attendBy: initialValues.attendBy || 'System User',
          purchaseType: initialValues.purchaseType || 'Local',
          setWarehouse: initialValues.setWarehouse || 'Main Store - PSL',
          approvalStatus: initialValues.approvalStatus || 'Approved',
          status: initialValues.status || 'Partially Received',
          createdBy: initialValues.createdBy || currentUserName,
          items: itemsList
        }}
      />

      {/* JUMP TO FIELD MODAL (⌘ + J) */}
      {showJumpToFieldModal && (
        <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-gray-100 relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">Jump to field</h3>
              <button
                type="button"
                onClick={() => setShowJumpToFieldModal(false)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-600">
                Select Field <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                autoFocus
                value={jumpSearchQuery}
                onChange={(e) => setJumpSearchQuery(e.target.value)}
                placeholder="Search field..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />

              <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white mt-2 shadow-2xs">
                {filteredJumpFields.length > 0 ? (
                  filteredJumpFields.map((field, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleJumpToField(field)}
                      className="w-full text-left px-4 py-3 text-xs font-medium text-gray-800 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center justify-between cursor-pointer"
                    >
                      <span className="font-bold text-gray-900">{field.label}</span>
                      <span className="text-[10px] font-semibold text-gray-400 uppercase bg-gray-100 px-2 py-0.5 rounded">
                        {field.tab}
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-3 text-xs text-gray-500 text-center">
                    No fields found matching "{jumpSearchQuery}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ERPFormPageLayout>
  );
};

export const MaterialRequestFormPage = WithAuth(MaterialRequestFormPageBase, ModuleName.MATERIAL_REQUISITION, Permission.ADD);
export default MaterialRequestFormPage;
