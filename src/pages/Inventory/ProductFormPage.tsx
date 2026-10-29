import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import { triggerActivityRefresh } from '../../components/FormCommentsAndActivity';
import dataService from '../../axios/dataService';
import { 
  fetchInventoryById, 
  fetchCategories, 
  fetchSuppliers, 
  fetchUnits, 
  fetchPartOfs,
  fetchSubPartOfs,
  createPartOf,
  createSubPartOf,
  createCategory, 
  createSupplier, 
  createUnit, 
  createProduct, 
  updateProduct, 
  deleteProduct,
  uploadFile,
  type Product, 
  type Category, 
  type Supplier, 
  type Unit,
  type PartOf,
  type SubPartOf 
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { TextFieldComponent, SelectOutlinedField, ReusableAutocomplete } from '../../components/input/index';
import { ButtonComponent } from '../../components/button/ButtonComponent';
import { ItemPrintModal } from '../../components/ItemPrintModal';
import { FormCommentsAndActivity } from '../../components/FormCommentsAndActivity';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { useSelector } from 'react-redux';
import { formatDistanceToNow } from 'date-fns';
import { 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Plus, 
  Heart, 
  MessageSquare, 
  Share2, 
  Paperclip, 
  UserPlus, 
  Tag, 
  Copy, 
  ArrowLeft,
  Check,
  Package,
  Layers,
  FileText,
  ShieldCheck,
  Percent,
  Sliders,
  Sparkles,
  Info,
  DollarSign,
  TrendingUp,
  Settings,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Camera,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  ArrowUpDown,
  X,
  Search
} from 'lucide-react';
import { useCurrency } from '../../helper/currency';

const JUMP_FIELDS = [
  { label: 'Item Name', name: 'name', tab: 'details' },
  { label: 'Item Group', name: 'categoryId', tab: 'details' },
  { label: 'Part Of', name: 'partOf', tab: 'details' },
  { label: 'Sub Part Of', name: 'subPartOf', tab: 'details' },
  { label: 'Default Unit of Measure', name: 'unitId', tab: 'details' },
  { label: 'TANSAD No.', name: 'tansadNo', tab: 'details' },
  { label: 'Withholding Tax Rate on Purchase', name: 'withholdingTaxPurchase', tab: 'details' },
  { label: 'Withholding Tax Rate on Sales', name: 'withholdingTaxSales', tab: 'details' },
  { label: 'Bin Location', name: 'binLocation', tab: 'details' },
  { label: 'Activity Type', name: 'activityType', tab: 'details' },
  { label: 'Valuation Rate', name: 'valuationRate', tab: 'details' },
  { label: 'Over Delivery/Receipt Allowance (%)', name: 'overDeliveryAllowance', tab: 'details' },
  { label: 'Over Billing Allowance (%)', name: 'overBillingAllowance', tab: 'details' },
  /* Currently not required tabs:
  { label: 'Default Income Account', name: 'incomeAccount', tab: 'accounting' },
  { label: 'Default Expense Account', name: 'expenseAccount', tab: 'accounting' },
  { label: 'Default Supplier', name: 'supplierId', tab: 'purchasing' },
  { label: 'Standard Purchase Rate / Cost Price', name: 'costPrice', tab: 'purchasing' },
  { label: 'Standard Selling Price', name: 'sellingPrice', tab: 'purchasing' },
  { label: 'Reorder Level / Min Stock Alert', name: 'minStock', tab: 'purchasing' },
  { label: 'Lead Time (Days)', name: 'leadTimeDays', tab: 'purchasing' },
  { label: 'GST HSN / SAC Code', name: 'hsnCode', tab: 'tax' },
  { label: 'GST Rate (%)', name: 'taxRate', tab: 'tax' },
  */
  { label: 'Disabled', name: 'disabled', tab: 'details' },
  { label: 'Allow Alternative Item', name: 'allowAlternativeItem', tab: 'details' },
  { label: 'Maintain Stock', name: 'maintainStock', tab: 'details' },
  { label: 'Excisable Item', name: 'excisableItem', tab: 'details' },
  { label: 'Has Variants', name: 'hasVariants', tab: 'details' },
  { label: 'Include Item In Manufacturing', name: 'includeInManufacturing', tab: 'details' },
  { label: 'Is Fixed Asset', name: 'isFixedAsset', tab: 'details' }
];

export const isRollGroupSelected = (catVal: any, categoriesList: any[] = [], partOfVal?: any): boolean => {
  const checkValue = (val: any): boolean => {
    if (!val) return false;
    if (typeof val === 'object') {
      const name = val.name || val.label || val.title || '';
      if (name.trim().toLowerCase().includes('roll')) return true;
      if (val.id) {
        const found = categoriesList.find(c => String(c.id) === String(val.id));
        if (found && (found.name || '').toLowerCase().includes('roll')) return true;
      }
    }
    if (typeof val === 'string' || typeof val === 'number') {
      const strVal = String(val).trim().toLowerCase();
      if (strVal.includes('roll')) return true;
      const found = categoriesList.find(c => String(c.id) === String(val) || (c.name && c.name.toLowerCase() === strVal));
      if (found && (found.name || '').toLowerCase().includes('roll')) return true;
    }
    return false;
  };

  return checkValue(catVal) || checkValue(partOfVal);
};

const getItemValidationSchema = (categoriesList: any[] = []) => Yup.object().shape({
  name: Yup.string().trim().required('Item name is required'),
  sku: Yup.string().trim().nullable(),
  categoryId: Yup.string().nullable(),
  unitId: Yup.string().nullable(),
  rollLength: Yup.mixed().when(['categoryId', 'partOf'], {
    is: (catVal: any, partOfVal: any) => isRollGroupSelected(catVal, categoriesList, partOfVal),
    then: (schema) => schema.required('Length is required when Item Group is Roll'),
    otherwise: (schema) => schema.nullable().optional()
  }),
  rollWidth: Yup.mixed().when(['categoryId', 'partOf'], {
    is: (catVal: any, partOfVal: any) => isRollGroupSelected(catVal, categoriesList, partOfVal),
    then: (schema) => schema.required('Width is required when Item Group is Roll'),
    otherwise: (schema) => schema.nullable().optional()
  }),
  rollCoreLength: Yup.mixed().when(['categoryId', 'partOf'], {
    is: (catVal: any, partOfVal: any) => isRollGroupSelected(catVal, categoriesList, partOfVal),
    then: (schema) => schema.required('Core length is required when Item Group is Roll'),
    otherwise: (schema) => schema.nullable().optional()
  }),
  rollCoreDiameter: Yup.mixed().when(['categoryId', 'partOf'], {
    is: (catVal: any, partOfVal: any) => isRollGroupSelected(catVal, categoriesList, partOfVal),
    then: (schema) => schema.required('Core diameter is required when Item Group is Roll'),
    otherwise: (schema) => schema.nullable().optional()
  }),
  rollDiaSize: Yup.mixed().when(['categoryId', 'partOf'], {
    is: (catVal: any, partOfVal: any) => isRollGroupSelected(catVal, categoriesList, partOfVal),
    then: (schema) => schema.required('Die size is required when Item Group is Roll'),
    otherwise: (schema) => schema.nullable().optional()
  }),
  rollSurface: Yup.string().nullable().optional(),
  rollWeight: Yup.mixed().when(['categoryId', 'partOf'], {
    is: (catVal: any, partOfVal: any) => isRollGroupSelected(catVal, categoriesList, partOfVal),
    then: (schema) => schema.required('Weight is required when Item Group is Roll'),
    otherwise: (schema) => schema.nullable().optional()
  }),
  rollJoint: Yup.string().nullable().optional()
});

const categoryModalValidationSchema = Yup.object({ name: Yup.string().trim().required('Item Group name is required') });
const supplierValidationSchema = Yup.object({ name: Yup.string().trim().required('Supplier name is required'), contact: Yup.string().trim(), email: Yup.string().trim().email('Must be a valid email') });
const unitValidationSchema = Yup.object({ name: Yup.string().trim().required('Unit name is required') });

export const generateNextItemCode = (
  companyName: string = 'PATEL STRAP INDUSTRIES LTD',
  categoryName: string = 'TOOLS',
  existingItems: any[] = []
): string => {
  let compPrefix = 'PS';
  const compUpper = (companyName || '').toUpperCase();
  if (compUpper.includes('TANSA')) compPrefix = 'TAN';
  else if (compUpper.includes('NEELKANTH')) compPrefix = 'NG';
  else if (compUpper.includes('PATEL')) compPrefix = 'PS';

  const groupUpper = (categoryName || 'TOOLS').toUpperCase().trim();
  let groupCode = 'TL';
  if (groupUpper.includes('TOOL')) groupCode = 'TL';
  else if (groupUpper.includes('HARDWARE')) groupCode = 'HW';
  else if (groupUpper.includes('CONSUMABLE')) groupCode = 'CM';
  else if (groupUpper.includes('ELECTRICAL')) groupCode = 'EL';
  else if (groupUpper.includes('STEEL')) groupCode = 'ST';
  else if (groupUpper.includes('RAW')) groupCode = 'RM';
  else if (groupUpper.includes('MACHINE') || groupUpper.includes('SPARE')) groupCode = 'HL';
  else if (groupUpper.length >= 2) groupCode = groupUpper.substring(0, 2);

  const prefix = `${compPrefix}${groupCode}`;

  let maxSeq = 0;
  existingItems.forEach(item => {
    const code = String(item.sku || item.id || '').toUpperCase();
    if (code.startsWith(prefix)) {
      const numPart = code.substring(prefix.length);
      const num = parseInt(numPart, 10);
      if (!isNaN(num) && num > maxSeq) {
        maxSeq = num;
      }
    }
  });

  const nextSeq = maxSeq + 1;
  const padLength = nextSeq >= 1000 ? 4 : 3;
  return `${prefix}${String(nextSeq).padStart(padLength, '0')}`;
};

const ProductFormPageBase: React.FC = () => {
  const { user } = useSelector((state: any) => state.base);
  const [searchParams] = useSearchParams();
  const id = searchParams.get('id');
  const navigate = useNavigate();
  const location = useLocation();
  const isEditMode = Boolean(id);
  const { format } = useCurrency();

  const [initialData, setInitialData] = useState<any>(null);
  const [loading, setLoading] = useState(isEditMode);

  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [partOfs, setPartOfs] = useState<PartOf[]>([]);
  const [subPartOfs, setSubPartOfs] = useState<SubPartOf[]>([]);

  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'details' | 'dashboard' | 'accounting' | 'purchasing' | 'tax' | 'quality'>('details');

  // Sidebar interactive states
  const [assignedTo, setAssignedTo] = useState<string>('Julius Daffa');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [tags, setTags] = useState<string[]>(['TOOLS', 'WORKSHOP']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; file?: File; isNewFile?: boolean }[]>([]);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [following, setFollowing] = useState(false);

  // Upload States
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  // Modals for inline creation
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [pendingUnitName, setPendingUnitName] = useState('');
  const unitResolveRef = useRef<((unit: any) => void) | null>(null);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [pendingSupplierName, setPendingSupplierName] = useState('');
  const supplierResolveRef = useRef<((supplier: any) => void) | null>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [pendingCategoryName, setPendingCategoryName] = useState('');
  const categoryResolveRef = useRef<((cat: any) => void) | null>(null);

  const formikRef = useRef<any>(null);

  // Top Header Menu Dropdown States & Refs
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Jump to Field Modal State
  const [showJumpToFieldModal, setShowJumpToFieldModal] = useState(false);
  const [jumpSearchQuery, setJumpSearchQuery] = useState('');

  const viewMenuRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        e.preventDefault();
        setShowJumpToFieldModal(prev => !prev);
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        if (formikRef.current) {
          formikRef.current.validateForm().then((errs: any) => {
            if (errs && Object.keys(errs).length > 0) {
              Object.keys(errs).forEach(key => formikRef.current?.setFieldTouched(key, true, false));
              const firstErrKey = Object.keys(errs)[0];
              const firstErrMsg = errs[firstErrKey];
              errorToast(`Cannot save: ${firstErrMsg}`);
            } else {
              formikRef.current.submitForm();
            }
          });
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleJumpToField = (field: { label: string; name: string; tab: string }) => {
    setActiveTab(field.tab as any);
    setShowJumpToFieldModal(false);
    setJumpSearchQuery('');
    setTimeout(() => {
      const el = (document.getElementsByName(field.name)[0] || document.querySelector(`[name="${field.name}"]`)) as HTMLElement;
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.focus();
        el.classList.add('ring-4', 'ring-primary-500', 'transition-all');
        setTimeout(() => {
          el.classList.remove('ring-4', 'ring-primary-500');
        }, 2000);
      }
    }, 120);
  };

  const filteredJumpFields = JUMP_FIELDS.filter((f) =>
    f.label.toLowerCase().includes(jumpSearchQuery.trim().toLowerCase())
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (viewMenuRef.current && !viewMenuRef.current.contains(event.target as Node)) {
        setShowViewMenu(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopyClipboard = () => {
    if (formikRef.current?.values) {
      const v = formikRef.current.values;
      const textToCopy = `${v.sku} - ${v.name}`;
      navigator.clipboard.writeText(textToCopy);
      successToast(`Copied "${textToCopy}" to clipboard`);
    }
    setShowMoreMenu(false);
  };

  const handleRename = () => {
    if (formikRef.current?.values) {
      const newName = window.prompt("Enter new Item Name:", formikRef.current.values.name);
      if (newName && newName.trim() && newName !== formikRef.current.values.name) {
        formikRef.current.setFieldValue('name', newName.trim());
        successToast(`Item name updated to "${newName.trim()}"`);
      }
    }
    setShowMoreMenu(false);
  };

  const handleReload = () => {
    if (id) {
      setLoading(true);
      fetchInventoryById(id)
        .then(product => {
          setInitialData(product);
          setLoading(false);
          successToast("Item reloaded from server");
        })
        .catch(() => setLoading(false));
    } else {
      window.location.reload();
    }
    setShowMoreMenu(false);
  };

  const handleNavigateItem = async (direction: 'prev' | 'next') => {
    try {
      const { fetchInventory } = await import('../../services/api');
      const items = await fetchInventory();
      if (!items || items.length === 0) return;
      const currSku = formikRef.current?.values?.sku || initialData?.sku;
      const currIdx = items.findIndex((item: any) => item.id === id || item.sku === currSku);
      let targetIdx = 0;
      if (currIdx >= 0) {
        if (direction === 'prev') {
          targetIdx = currIdx > 0 ? currIdx - 1 : items.length - 1;
        } else {
          targetIdx = currIdx < items.length - 1 ? currIdx + 1 : 0;
        }
      }
      const targetItem = items[targetIdx];
      if (targetItem?.id) {
        navigate(`/products/edit?id=${targetItem.id}`);
      }
    } catch (err) {
      console.error('Failed to navigate item:', err);
    }
  };

  useEffect(() => {
    fetchCategories()
      .then(cats => {
        setCategories(cats && Array.isArray(cats) ? cats : []);
      })
      .catch(() => setCategories([]));

    fetchSuppliers()
      .then(sups => setSuppliers(sups && Array.isArray(sups) ? sups : []))
      .catch(console.error);

    fetchUnits()
      .then(uns => setUnits(uns && Array.isArray(uns) ? uns : []))
      .catch(() => setUnits([]));

    fetchPartOfs()
      .then(items => setPartOfs(items && Array.isArray(items) ? items : []))
      .catch(() => setPartOfs([]));

    fetchSubPartOfs()
      .then(items => setSubPartOfs(items && Array.isArray(items) ? items : []))
      .catch(() => setSubPartOfs([]));

    if (isEditMode && id) {
      setLoading(true);
      fetchInventoryById(id)
        .then(product => {
          setInitialData(product);
          if (product.category) {
            const cat = product.category;
            setCategories(prev => {
              const exists = prev.some(c => String(c.id) === String(cat.id) || c.name === cat.name);
              return exists ? prev : [...prev, cat];
            });
          }
          if (product.unit) {
            const un = product.unit;
            setUnits(prev => {
              const exists = prev.some(u => String(u.id) === String(un.id) || u.name === un.name);
              return exists ? prev : [...prev, un];
            });
          }
          if (product.supplier) {
            const sup = product.supplier;
            setSuppliers(prev => {
              const exists = prev.some(s => String(s.id) === String(sup.id) || s.name === sup.name);
              return exists ? prev : [...prev, sup];
            });
          }
          if (product.tags) {
            setTags(product.tags.split(',').map((t: string) => t.trim()).filter(Boolean));
          }
          if (product.assignedTo) {
            setAssignedTo(product.assignedTo);
          }
          if (product.attachments) {
            setAttachments(Array.isArray(product.attachments) ? product.attachments : []);
          }
          setLoading(false);
        })
        .catch((err) => {
          console.error('Failed to load item:', err);
          errorToast('Failed to load item details');
          setLoading(false);
        });
    } else if (location.state) {
      const s = location.state as any;
      setInitialData({
        sku: s.sku || generateNextItemCode(s.company || 'PATEL STRAP INDUSTRIES LTD', 'TOOLS'),
        name: s.name || '',
        categoryId: s.categoryId || '',
        supplierId: s.supplierId || '',
        unitId: s.unitId || '',
        company: s.company || 'PATEL STRAP INDUSTRIES LTD',
        partOf: s.partOf || 'RAW MATERIAL',
        subPartOf: s.subPartOf || 'WORKSHOP',
        tansadNo: s.tansadNo || '',
        withholdingTaxPurchase: s.withholdingTaxPurchase,
        withholdingTaxSales: s.withholdingTaxSales,
        location: s.binLocation || s.location || 'D-31',
        activityType: s.activityType || '',
        disabled: s.disabled ?? false,
        allowAlternativeItem: s.allowAlternativeItem ?? false,
        maintainStock: s.maintainStock ?? true,
        excisableItem: s.excisableItem ?? false,
        hasVariants: s.hasVariants ?? false,
        includeInManufacturing: s.includeInManufacturing ?? true,
        isFixedAsset: s.isFixedAsset ?? false,
        valuationRate: s.valuationRate,
        overDeliveryAllowance: s.overDeliveryAllowance,
        overBillingAllowance: s.overBillingAllowance,
        cost_price: s.costPrice ?? s.cost_price,
        selling_price: s.sellingPrice ?? s.selling_price,
        min_stock: s.minStock ?? s.min_stock,
        incomeAccount: s.incomeAccount || '',
        expenseAccount: s.expenseAccount || '',
        hsnCode: s.hsnCode || '',
        taxRate: s.taxRate,
        imageUrl: s.imageUrl || '',
        tags: s.tags ? (Array.isArray(s.tags) ? s.tags.join(',') : s.tags) : '',
        assignedTo: s.assignedTo || 'Julius Daffa'
      });
      if (s.tags) {
        const tagArr = Array.isArray(s.tags) ? s.tags : s.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
        setTags(tagArr);
      }
      if (s.assignedTo) {
        setAssignedTo(s.assignedTo);
      }
    }
  }, [id, isEditMode, location.state]);

  const handleDuplicate = () => {
    if (!formikRef.current) return;
    const values = formikRef.current.values;
    const duplicatedSku = generateNextItemCode(values.company || 'PATEL STRAP INDUSTRIES LTD', 'TOOLS');
    const duplicatedName = values.name ? (values.name.includes('(Copy)') ? values.name : `${values.name} (Copy)`) : 'Copy Item';

    const dupData = {
      ...values,
      sku: duplicatedSku,
      name: duplicatedName,
      tags: tags,
      assignedTo: assignedTo,
      location: values.binLocation,
      cost_price: values.costPrice,
      selling_price: values.sellingPrice,
      min_stock: values.minStock
    };

    if (location.pathname === '/products/new' && !id) {
      setInitialData(dupData);
      formikRef.current.setValues({
        ...values,
        sku: duplicatedSku,
        name: duplicatedName
      });
      successToast('Duplicated item form created');
    } else {
      navigate('/products/new', { state: dupData });
      successToast('Duplicated item form created');
    }
  };

  const handleDeleteItem = async () => {
    if (!id) return;
    if (window.confirm(`Are you sure you want to delete "${initialData?.name || 'this item'}"?`)) {
      try {
        await deleteProduct(id);
        successToast('Item deleted successfully');
        navigate('/master/skus');
      } catch (err: any) {
        errorToast(err?.response?.data?.error || 'Failed to delete item');
      }
    }
  };

  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim().toUpperCase())) {
      const updated = [...tags, newTagInput.trim().toUpperCase()];
      setTags(updated);
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

      // 1. Upload new Image file if selected
      let finalImageUrl = values.imageUrl || '';
      if (selectedImageFile) {
        try {
          const uploadedImg = await uploadFile(selectedImageFile);
          finalImageUrl = uploadedImg.url;
        } catch (err) {
          console.error('Failed to upload image file:', err);
          errorToast('Failed to upload image file');
          setSubmitting(false);
          return;
        }
      }

      // 2. Upload new Attachment files if any
      const newAttachmentItems = attachments.filter(a => a.isNewFile && a.file);
      const existingAttachmentItems = attachments.filter(a => !a.isNewFile).map(a => ({ name: a.name, url: a.url }));

      let uploadedAttachmentItems: Array<{ name: string; url: string }> = [];
      if (newAttachmentItems.length > 0) {
        try {
          const uploadPromises = newAttachmentItems.map(async (item) => {
            const res = await uploadFile(item.file!);
            return { name: res.filename || item.name, url: res.url };
          });
          uploadedAttachmentItems = await Promise.all(uploadPromises);
        } catch (err) {
          console.error('Failed to upload attachments:', err);
          errorToast('Failed to upload attachment files');
          setSubmitting(false);
          return;
        }
      }

      const finalAttachments = [...existingAttachmentItems, ...uploadedAttachmentItems];

      const partOfStr = typeof values.partOf === 'string' ? values.partOf : (values.partOf?.name || '');
      const subPartOfStr = typeof values.subPartOf === 'string' ? values.subPartOf : (values.subPartOf?.name || '');
      const isRoll = isRollGroupSelected(values.categoryId, categories, values.partOf) ||
        Boolean(values.rollLength || values.rollWidth || values.rollCoreLength || values.rollCoreDiameter || values.rollDiaSize || values.rollWeight);

      const payload = {
        sku: values.sku.trim(),
        name: values.name.trim(),
        cost_price: Number(values.costPrice || 0),
        selling_price: Number(values.sellingPrice || 0),
        min_stock: Number(values.minStock || 0),
        categoryId: values.categoryId || null,
        supplierId: values.supplierId || null,
        unitId: values.unitId || null,
        location: values.binLocation || '',
        status: values.disabled ? 'Inactive' : 'Active',
        quantity: initialData?.quantity || 0,

        company: values.company || '',
        partOf: partOfStr,
        subPartOf: subPartOfStr,
        tansadNo: values.tansadNo || '',
        withholdingTaxPurchase: Number(values.withholdingTaxPurchase || 0),
        withholdingTaxSales: Number(values.withholdingTaxSales || 0),
        activityType: values.activityType || '',
        disabled: Boolean(values.disabled),
        allowAlternativeItem: Boolean(values.allowAlternativeItem),
        maintainStock: Boolean(values.maintainStock),
        excisableItem: Boolean(values.excisableItem),
        hasVariants: Boolean(values.hasVariants),
        includeInManufacturing: Boolean(values.includeInManufacturing),
        isFixedAsset: Boolean(values.isFixedAsset),
        valuationRate: Number(values.valuationRate || 0),
        overDeliveryAllowance: Number(values.overDeliveryAllowance || 0),
        overBillingAllowance: Number(values.overBillingAllowance || 0),
        assignedTo,
        tags: tags.join(','),
        imageUrl: finalImageUrl,
        attachments: finalAttachments,
        incomeAccount: values.incomeAccount || '',
        expenseAccount: values.expenseAccount || '',
        hsnCode: values.hsnCode || '',
        taxRate: Number(values.taxRate || 18),

        rollLength: isRoll ? Number(values.rollLength || 0) : 0,
        rollWidth: isRoll ? Number(values.rollWidth || 0) : 0,
        rollCoreLength: isRoll ? Number(values.rollCoreLength || 0) : 0,
        rollCoreDiameter: isRoll ? Number(values.rollCoreDiameter || 0) : 0,
        rollDiaSize: isRoll ? Number(values.rollDiaSize || 0) : 0,
        rollSurface: isRoll ? (values.rollSurface || 'Roll Emboss') : null,
        rollWeight: isRoll ? Number(values.rollWeight || 0) : 0,
        rollJoint: isRoll ? (values.rollJoint || 'No Joint') : null,
      };

      if (isEditMode && id) {
        const fieldLabels: Record<string, string> = {
          name: 'Item Name',
          sku: 'SKU',
          costPrice: 'Cost Price',
          sellingPrice: 'Selling Price',
          minStock: 'Min Stock',
          binLocation: 'Location',
          incomeAccount: 'Income Account',
          expenseAccount: 'Expense Account',
          hsnCode: 'HSN Code',
          taxRate: 'GST Rate (%)',
          company: 'Company'
        };

        const changes: string[] = [];
        Object.keys(fieldLabels).forEach(key => {
          const oldVal = (initialData || {})[key];
          const newVal = values[key];
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

        const changedSummary = changes.length > 0 ? `Updated ${changes.join(', ')}` : 'Updated Item details';
        const res: any = await updateProduct(id, payload);
        const successMsg = res?.message || 'Item updated successfully';

        dataService.post('/activities', {
          entityType: 'Item',
          entityId: id,
          action: 'UPDATE',
          description: changedSummary,
          metadata: { userName: user?.name || user?.username || 'Admin' }
        }).then(() => triggerActivityRefresh('Item', id)).catch(() => {});

        successToast(successMsg);
      } else {
        const created: any = await createProduct(payload as any);
        const successMsg = created?.message || 'Item created successfully';
        if (created?.id || created?.sku) {
          const targetId = created?.id || created?.sku;
          dataService.post('/activities', {
            entityType: 'Item',
            entityId: targetId,
            action: 'CREATE',
            description: 'created item',
            metadata: { userName: user?.name || user?.username || 'Admin' }
          }).catch(() => {});
          triggerActivityRefresh('Item', targetId);
        }
        successToast(successMsg);
      }
      navigate('/master/skus');
    } catch (error: any) {
      console.error('Error saving item:', error);
      const status = error?.response?.status;
      const errorMsg = error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Failed to save item.';
      const displayMsg = status ? `[HTTP ${status}] ${errorMsg}` : errorMsg;
      errorToast(displayMsg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-16 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500 text-sm font-semibold">Loading Item Details...</p>
        </div>
      </DashboardLayout>
    );
  }

  // Get Initials for Logo Placeholder
  const getInitials = (nameStr: string) => {
    if (!nameStr) return 'IT';
    const parts = nameStr.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  };

  const ActivityHeatmapComponent = ({ initialData }: { initialData: any }) => {
    const [showActivity, setShowActivity] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    const { monthBlocks } = React.useMemo(() => {
      const today = new Date();
      const datesMap: Record<string, number> = {};

      const formatDateStr = (dateInput: Date | string) => {
        const d = new Date(dateInput);
        if (isNaN(d.getTime())) return '';
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
      };

      if (initialData?.createdAt) {
        const cDate = formatDateStr(initialData.createdAt);
        if (cDate) datesMap[cDate] = (datesMap[cDate] || 0) + 1;
      }
      if (initialData?.updatedAt) {
        const uDate = formatDateStr(initialData.updatedAt);
        if (uDate) datesMap[uDate] = (datesMap[uDate] || 0) + 1;
      }
      if (Array.isArray(initialData?.stockLedgers)) {
        initialData.stockLedgers.forEach((l: any) => {
          if (l.date || l.createdAt) {
            const lDate = formatDateStr(l.date || l.createdAt);
            if (lDate) datesMap[lDate] = (datesMap[lDate] || 0) + 1;
          }
        });
      }

      // Ensure today's date (17 Sep) has active count
      const todayStr = formatDateStr(today);
      if (todayStr) {
        datesMap[todayStr] = Math.max(datesMap[todayStr] || 0, 1);
      }

      const monthsShort = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
      const blocks: Array<{
        monthName: string;
        year: number;
        weeks: Array<Array<{ dateStr: string; dayOfWeek: number; count: number; isValid: boolean }>>;
      }> = [];

      const currentYear = today.getFullYear();
      const currentMonth = today.getMonth();

      // 12 Months: from 11 months ago to current month
      for (let mOffset = -11; mOffset <= 0; mOffset++) {
        const monthDate = new Date(currentYear, currentMonth + mOffset, 1);
        const mIdx = monthDate.getMonth();
        const yr = monthDate.getFullYear();
        const monthName = monthsShort[mIdx];

        const firstDayOfMonth = new Date(yr, mIdx, 1);
        const lastDayOfMonth = new Date(yr, mIdx + 1, 0);

        const startDayOfWeek = firstDayOfMonth.getDay();
        const daysInMonth = lastDayOfMonth.getDate();
        const dayCells: Array<{ dateStr: string; dayOfWeek: number; count: number; isValid: boolean }> = [];

        for (let pad = 0; pad < startDayOfWeek; pad++) {
          dayCells.push({ dateStr: '', dayOfWeek: pad, count: 0, isValid: false });
        }

        for (let d = 1; d <= daysInMonth; d++) {
          const dObj = new Date(yr, mIdx, d);
          const dateStr = formatDateStr(dObj);
          const dayOfWeek = dObj.getDay();
          const count = datesMap[dateStr] || 0;

          dayCells.push({ dateStr, dayOfWeek, count, isValid: true });
        }

        const monthWeeks: typeof dayCells[] = [];
        let currentWeek: typeof dayCells = [];

        dayCells.forEach((cell, i) => {
          currentWeek.push(cell);
          if (currentWeek.length === 7 || i === dayCells.length - 1) {
            while (currentWeek.length < 7) {
              currentWeek.push({ dateStr: '', dayOfWeek: currentWeek.length, count: 0, isValid: false });
            }
            monthWeeks.push(currentWeek);
            currentWeek = [];
          }
        });

        blocks.push({
          monthName,
          year: yr,
          weeks: monthWeeks
        });
      }

      return { monthBlocks: blocks };
    }, [initialData]);

    useEffect(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      }
    }, [showActivity]);

    return (
      <div className="border border-gray-200 rounded-3xl p-6 bg-white space-y-4 shadow-2xs">
        <div 
          onClick={() => setShowActivity(!showActivity)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
            Activity
          </h3>
          <button type="button" className="text-gray-400 hover:text-gray-600 transition-colors p-1">
            {showActivity ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </button>
        </div>

        {showActivity && (
          <div className="pt-2 space-y-4">
            <div ref={scrollRef} className="overflow-x-auto pt-9 pb-2 scroll-smooth">
              <div className="flex items-start gap-3 min-w-max select-none">
                {/* Day Labels Column aligned with rows 0..6 */}
                <div className="flex flex-col text-[10px] font-medium text-gray-400 w-7 pr-1 pt-[18px] gap-[3.5px]">
                  <span className="h-2.5 flex items-center leading-none"></span>
                  <span className="h-2.5 flex items-center leading-none">Mon</span>
                  <span className="h-2.5 flex items-center leading-none"></span>
                  <span className="h-2.5 flex items-center leading-none">Wed</span>
                  <span className="h-2.5 flex items-center leading-none"></span>
                  <span className="h-2.5 flex items-center leading-none">Fri</span>
                  <span className="h-2.5 flex items-center leading-none"></span>
                </div>

                {/* Month Blocks Container with Gap between each Month */}
                <div className="flex items-start gap-4">
                  {monthBlocks.map((block, bIdx) => (
                    <div key={bIdx} className="flex flex-col items-center gap-2">
                      <span className="text-[10px] font-bold text-gray-400 tracking-wider uppercase">
                        {block.monthName}
                      </span>

                      <div className="flex gap-[3.5px]">
                        {block.weeks.map((week, wIdx) => (
                          <div key={wIdx} className="flex flex-col gap-[3.5px]">
                            {week.map((day, dIdx) => {
                              if (!day.isValid) {
                                return <div key={dIdx} className="w-2.5 h-2.5 opacity-0 pointer-events-none" />;
                              }

                              let bgClass = 'bg-gray-100 hover:bg-gray-200';
                              if (day.count > 0) {
                                if (day.count >= 4) bgClass = 'bg-emerald-700 hover:bg-emerald-800';
                                else if (day.count >= 2) bgClass = 'bg-emerald-600 hover:bg-emerald-700';
                                else bgClass = 'bg-emerald-500 hover:bg-emerald-600';
                              }

                              const dayNum = parseInt(day.dateStr.split('-')[2] || '1', 10);
                              const tooltipText = `${day.count} ON ${dayNum} ${block.monthName} ${block.year}`;

                              return (
                                <div key={dIdx} className="relative group/dot">
                                  <div
                                    className={`w-2.5 h-2.5 rounded-[2px] transition-colors cursor-pointer ${bgClass}`}
                                  />
                                  {/* Floating Tooltip Popup */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/dot:flex flex-col items-center z-[100] pointer-events-none">
                                    <div className="bg-gray-900 text-white font-bold text-[11px] px-3 py-1.5 rounded-xl shadow-xl whitespace-nowrap tracking-wide select-none">
                                      {tooltipText}
                                    </div>
                                    <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1"></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 font-normal">
              This is based on stock movement. See Stock Ledger for details
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <Formik
      innerRef={formikRef}
      enableReinitialize
      initialValues={{
        sku: initialData?.sku || generateNextItemCode(initialData?.company || 'PATEL STRAP INDUSTRIES LTD', 'TOOLS'),
        name: initialData?.name || '',
        categoryId: initialData?.categoryId ?? initialData?.category?.id ?? '',
        supplierId: initialData?.supplierId ?? initialData?.supplier?.id ?? '',
        unitId: initialData?.unitId ?? initialData?.unit?.id ?? (units[0]?.id || ''),
        company: initialData?.company || 'PATEL STRAP INDUSTRIES LTD',
        partOf: initialData?.partOf || '',
        subPartOf: initialData?.subPartOf || '',
        tansadNo: initialData?.tansadNo || '',
        withholdingTaxPurchase: initialData?.withholdingTaxPurchase !== undefined ? String(initialData.withholdingTaxPurchase) : '0.000',
        withholdingTaxSales: initialData?.withholdingTaxSales !== undefined ? String(initialData.withholdingTaxSales) : '0.000',
        binLocation: initialData?.location || 'D-31',
        activityType: initialData?.activityType || '',
        disabled: initialData?.disabled ?? false,
        allowAlternativeItem: initialData?.allowAlternativeItem ?? false,
        maintainStock: initialData?.maintainStock ?? true,
        excisableItem: initialData?.excisableItem ?? false,
        hasVariants: initialData?.hasVariants ?? false,
        includeInManufacturing: initialData?.includeInManufacturing ?? true,
        isFixedAsset: initialData?.isFixedAsset ?? false,
        valuationRate: initialData?.valuationRate !== undefined ? String(initialData.valuationRate) : '0.00',
        overDeliveryAllowance: initialData?.overDeliveryAllowance !== undefined ? String(initialData.overDeliveryAllowance) : '0.000',
        overBillingAllowance: initialData?.overBillingAllowance !== undefined ? String(initialData.overBillingAllowance) : '0.000',
        costPrice: initialData?.cost_price !== undefined ? String(initialData.cost_price) : '0.00',
        sellingPrice: initialData?.selling_price !== undefined ? String(initialData.selling_price) : '0.00',
        minStock: initialData?.min_stock !== undefined ? String(initialData.min_stock) : '50',
        incomeAccount: initialData?.incomeAccount || 'Sales Account - PS',
        expenseAccount: initialData?.expenseAccount || 'Cost of Goods Sold - PS',
        hsnCode: initialData?.hsnCode || '39269099',
        taxRate: initialData?.taxRate !== undefined ? String(initialData.taxRate) : '18',
        imageUrl: initialData?.imageUrl || '',
        rollLength: initialData?.rollLength !== undefined && initialData?.rollLength !== 0 ? String(initialData.rollLength) : '',
        rollWidth: initialData?.rollWidth !== undefined && initialData?.rollWidth !== 0 ? String(initialData.rollWidth) : '',
        rollCoreLength: initialData?.rollCoreLength !== undefined && initialData?.rollCoreLength !== 0 ? String(initialData.rollCoreLength) : '',
        rollCoreDiameter: initialData?.rollCoreDiameter !== undefined && initialData?.rollCoreDiameter !== 0 ? String(initialData.rollCoreDiameter) : '',
        rollDiaSize: initialData?.rollDiaSize !== undefined && initialData?.rollDiaSize !== 0 ? String(initialData.rollDiaSize) : '',
        rollSurface: initialData?.rollSurface || 'Roll Emboss',
        rollWeight: initialData?.rollWeight !== undefined && initialData?.rollWeight !== 0 ? String(initialData.rollWeight) : '',
        rollJoint: initialData?.rollJoint || 'No Joint',
      }}
      validationSchema={getItemValidationSchema(categories)}
      onSubmit={handleSubmit}
    >
      {({ values, submitForm, isSubmitting, setFieldValue, dirty }) => (
        <ERPFormPageLayout
          recordCode={values.sku || initialData?.sku || initialData?.productCode || initialData?.itemCode || (isEditMode ? 'TAN000123' : undefined)}
          header={
            <ERPFormHeader
              title={values.name || 'Untitled Item'}
              onBack={() => navigate('/master/skus')}
              backTitle="Back to Items"
              statusBadge={{
                label: (isEditMode ? initialData?.disabled : values.disabled) ? 'Disabled' : 'Enabled',
                variant: (isEditMode ? initialData?.disabled : values.disabled) ? 'error' : 'success'
              }}
              dirty={dirty || !isEditMode}
              onDuplicate={handleDuplicate}
              onPrint={() => setShowPrintModal(true)}
              moreMenuItems={[
                {
                  label: 'Jump to field',
                  onClick: () => setShowJumpToFieldModal(true),
                  shortcut: '⌘+J'
                }
              ]}
              onSave={async () => {
                if (formikRef.current) {
                  const errs = await formikRef.current.validateForm();
                  if (errs && Object.keys(errs).length > 0) {
                    Object.keys(errs).forEach(key => formikRef.current?.setFieldTouched(key, true, false));
                    const firstErrKey = Object.keys(errs)[0];
                    const firstErrMsg = (errs as any)[firstErrKey];
                    errorToast(`Cannot save: ${firstErrMsg}`);
                    return;
                  }
                  formikRef.current.submitForm();
                }
              }}
              isSubmitting={isSubmitting}
            />
          }
        >
          <Form noValidate className="space-y-6 w-full">
            {/* MAIN LAYOUT (2-COLUMN CARDS ON DESKTOP, STACKED ON TABLET) */}
            <div className="flex flex-col xl:flex-row gap-6 items-start">
              
              {/* LEFT META SIDEBAR PANEL */}
              <div className="w-full xl:w-72 shrink-0 space-y-6 md:space-y-0 md:grid md:grid-cols-2 md:gap-6 xl:block xl:space-y-6">
                
                {/* Image Avatar Box Card */}
                <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm p-2">
                  <div className="relative group w-full h-56 rounded-xl overflow-hidden cursor-pointer border border-gray-100 bg-gray-50/80 flex items-center justify-center">
                    {values.imageUrl ? (
                      <img 
                        src={values.imageUrl} 
                        alt={values.name} 
                        className="w-full h-full object-contain p-1.5 rounded-xl" 
                      />
                    ) : (
                      <div className="w-full h-full rounded-xl bg-gray-100/70 flex items-center justify-center text-4xl font-semibold text-gray-400 select-none">
                        {getInitials(values.name)}
                      </div>
                    )}

                    {/* Hover Overlay with "Change ▾" Trigger */}
                    {!uploadingImage && (
                      <label className="absolute inset-0 bg-black/35 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center cursor-pointer rounded-xl backdrop-blur-[1px]">
                        <span className="bg-white/95 hover:bg-white text-gray-800 text-xs font-bold px-3.5 py-2 rounded-lg shadow-md flex items-center gap-1.5 transition-transform scale-95 group-hover:scale-100 select-none">
                          <Camera className="w-3.5 h-3.5 text-gray-600" />
                          Change
                          <ChevronDown className="w-3 h-3 text-gray-600" />
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            setSelectedImageFile(file);
                            const previewUrl = URL.createObjectURL(file);
                            setFieldValue('imageUrl', previewUrl);
                          }}
                        />
                      </label>
                    )}

                    {/* Quick Remove Button on Hover */}
                    {values.imageUrl && !uploadingImage && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSelectedImageFile(null);
                          setFieldValue('imageUrl', '');
                        }}
                        className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white p-1.5 rounded-full shadow-md transition-all opacity-0 group-hover:opacity-100 z-30 cursor-pointer"
                        title="Remove Image"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Meta Controls Card */}
                <div className="bg-white border border-gray-200 rounded-3xl p-6 space-y-4 text-xs shadow-sm">
                  {/* Attachments */}
                  <div className="flex items-center justify-between font-semibold">
                    <span className="text-gray-500 flex items-center gap-2">
                      <Paperclip className="w-4 h-4 text-gray-400" /> Attachments
                    </span>
                    <label className="text-primary-600 font-bold hover:underline cursor-pointer flex items-center gap-1">
                      <span>+ Upload</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const newAtt = {
                            name: file.name,
                            url: URL.createObjectURL(file),
                            file: file,
                            isNewFile: true
                          };
                          setAttachments(prev => [...prev, newAtt]);
                        }}
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
                              setAttachments(prev => prev.filter((_, i) => i !== idx));
                            }} 
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
                        <Tag className="w-4 h-4 text-gray-400" /> Tags
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
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1">
                          <TextFieldComponent
                            value={newTagInput}
                            onChange={(e: any) => setNewTagInput(e.target.value)}
                            onKeyDown={(e: any) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                            placeholder="TAG..."
                            size="small"
                          />
                        </div>
                        <ButtonComponent
                          variant="primary"
                          onClick={handleAddTag}
                        >
                          Add
                        </ButtonComponent>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {tags.map(t => (
                        <span key={t} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-gray-100 text-gray-800 text-[11px] font-black border border-gray-200">
                          {t}
                          <button type="button" onClick={() => handleRemoveTag(t)} className="hover:text-red-600 font-bold">×</button>
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
                        successToast('Item link copied');
                      }}
                      className="text-primary-600 font-bold hover:underline cursor-pointer"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>

              </div>

              {/* RIGHT FORM & TABS CARD */}
              <div className="flex-1 w-full bg-white border border-gray-200 rounded-2xl sm:rounded-3xl shadow-sm overflow-hidden flex flex-col">
                
                {/* Navigation Tabs Header */}
                <div className="border-b border-gray-200 bg-gray-50/50 px-3 sm:px-6 flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
                  {[
                    { id: 'details', label: 'Details' },
                    { id: 'dashboard', label: 'Dashboard' },
                    /* Currently not required
                    { id: 'accounting', label: 'Accounting' },
                    { id: 'purchasing', label: 'Purchasing' },
                    { id: 'tax', label: 'Tax' },
                    */
                    { id: 'quality', label: 'Quality' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`px-3.5 sm:px-5 py-3 sm:py-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-700 bg-white shadow-xs'
                          : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* TAB 1: DETAILS */}
                {activeTab === 'details' && (
                  <div className="p-3 sm:p-6 md:p-8 space-y-6 sm:space-y-8">
                    
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                      
                      {/* Left Column: Form Fields */}
                      <div className="flex flex-col gap-6">
                        <div className="space-y-1">
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Basic Information</h3>
                          <div className="h-0.5 bg-gray-100 w-full"></div>
                        </div>

                        <div className="w-full">
                          <TextFieldComponent 
                            name="name" 
                            label="Item Name *" 
                            placeholder="e.g. PLIER SET" 
                          />
                        </div>

                        <div className="w-full">
                          <ReusableAutocomplete
                            keyName="categoryId"
                            label="Item Group *"
                            placeholder="Select Item Group (e.g. ROLL)..."
                            options={categories}
                            getOptionLabel={(cat) => cat?.name || ''}
                            creatable
                            onCreate={(newCategoryName) => {
                              return new Promise((resolve) => {
                                setPendingCategoryName(newCategoryName);
                                categoryResolveRef.current = resolve;
                                setShowCategoryModal(true);
                              });
                            }}
                          />
                        </div>

                        <div className="w-full">
                          <ReusableAutocomplete
                            keyName="partOf"
                            label="Part Of"
                            placeholder="Select Part Of (e.g. RAW MATERIAL)..."
                            options={partOfs}
                            getOptionLabel={(p) => p?.name || ''}
                            compareKey="name"
                            creatable
                            onCreate={async (newPartOfName) => {
                              try {
                                const created = await createPartOf({ name: newPartOfName });
                                const newItem = { id: created.id, name: created.name };
                                setPartOfs(prev => [...prev, newItem]);
                                successToast(`Added Part Of "${created.name}"`);
                                return newItem;
                              } catch (err: any) {
                                errorToast(err?.response?.data?.error || 'Failed to create Part Of');
                              }
                            }}
                          />
                        </div>

                        <div className="w-full">
                          <ReusableAutocomplete
                            keyName="subPartOf"
                            label="Sub Part Of"
                            placeholder="Select Sub Part Of (e.g. WORKSHOP)..."
                            options={subPartOfs}
                            getOptionLabel={(sp) => sp?.name || ''}
                            compareKey="name"
                            creatable
                            onCreate={async (newSubPartOfName) => {
                              try {
                                const created = await createSubPartOf({ name: newSubPartOfName });
                                const newItem = { id: created.id, name: created.name };
                                setSubPartOfs(prev => [...prev, newItem]);
                                successToast(`Added Sub Part Of "${created.name}"`);
                                return newItem;
                              } catch (err: any) {
                                errorToast(err?.response?.data?.error || 'Failed to create Sub Part Of');
                              }
                            }}
                          />
                        </div>

                        {/* CONDITIONAL ROLL SPECIFICATIONS SECTION (Triggered when Item Group is Roll) */}
                        {isRollGroupSelected(values.categoryId, categories, values.partOf) && (
                          <div className="bg-gradient-to-br from-emerald-50/70 via-white to-emerald-50/30 border-2 border-emerald-300 rounded-2xl sm:rounded-3xl p-3 sm:p-5 space-y-4 shadow-xs transition-all animate-in fade-in zoom-in-95">
                            <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2.5">
                              <div className="flex items-center gap-2.5">
                                <div className="p-1.5 bg-emerald-100 rounded-xl text-emerald-700 shadow-2xs">
                                  <Layers className="w-4 h-4" />
                                </div>
                                <div>
                                  <h3 className="text-xs font-black uppercase tracking-wider text-emerald-900">Roll Specifications</h3>
                                  <p className="text-[11px] text-emerald-700 font-medium">Required details when Item Group is set to Roll</p>
                                </div>
                              </div>
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black tracking-wider uppercase rounded-full border border-emerald-300">
                                Roll Item
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <TextFieldComponent 
                                name="rollLength" 
                                label="Length *" 
                                type="number"
                                placeholder="e.g. 1000 (Meters)" 
                              />
                              <TextFieldComponent 
                                name="rollWidth" 
                                label="Width *" 
                                type="number"
                                placeholder="e.g. 15 (mm)" 
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <TextFieldComponent 
                                name="rollCoreLength" 
                                label="Core Length *" 
                                type="number"
                                placeholder="e.g. 150 (mm)" 
                              />
                              <TextFieldComponent 
                                name="rollCoreDiameter" 
                                label="Core Diameter *" 
                                type="number"
                                placeholder="e.g. 406 (mm)" 
                              />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              {/* Surface Type (Roll Emboss vs Roll Plain) */}
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-semibold text-gray-700">
                                  Surface *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  {['Roll Emboss', 'Roll Plain'].map((opt) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setFieldValue('rollSurface', opt)}
                                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                        (values.rollSurface || 'Roll Emboss') === opt
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-2 ring-emerald-300'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>

                              {/* Joint Status (Joint vs No Joint) */}
                              <div className="flex flex-col gap-1.5">
                                <label className="block text-xs font-semibold text-gray-700">
                                  Joint Status *
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                  {['Joint', 'No Joint'].map((opt) => (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => setFieldValue('rollJoint', opt)}
                                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                                        (values.rollJoint || 'No Joint') === opt
                                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs ring-2 ring-emerald-300'
                                          : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/50'
                                      }`}
                                    >
                                      {opt}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <TextFieldComponent 
                                name="rollWeight" 
                                label="Weight *" 
                                type="number"
                                placeholder="e.g. 10.5 (Kg)" 
                              />
                              <TextFieldComponent 
                                name="rollDiaSize" 
                                label="Die Size *" 
                                type="number"
                                placeholder="e.g. 450 (mm)" 
                              />
                            </div>
                          </div>
                        )}

                        <div className="w-full">
                          <ReusableAutocomplete
                            keyName="unitId"
                            label="Default Unit of Measure *"
                            placeholder="Select Unit (e.g. Kg, Pcs, Meter)..."
                            options={units}
                            getOptionLabel={(u) => u?.name || ''}
                            creatable
                            onCreate={(newUnitName) => {
                              return new Promise((resolve) => {
                                setPendingUnitName(newUnitName);
                                unitResolveRef.current = resolve;
                                setShowUnitModal(true);
                              });
                            }}
                          />
                        </div>

                        <div className="space-y-1 pt-2">
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Storage Specifications</h3>
                          <div className="h-0.5 bg-gray-100 w-full"></div>
                        </div>

                        <div className="w-full">
                          <TextFieldComponent 
                            name="binLocation" 
                            label="Bin Location" 
                            placeholder="e.g. D-31" 
                          />
                        </div>
                      </div>

                      {/* Right Column: Item Options & Feature Flags */}
                      <div className="flex flex-col gap-6">
                        <div className="space-y-1">
                          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Options & Status</h3>
                          <div className="h-0.5 bg-gray-100 w-full"></div>
                        </div>

                        {/* Checkboxes Card Group */}
                        <div className="bg-gray-50/70 border border-gray-200/80 rounded-3xl p-5 space-y-3.5 shadow-2xs">
                          <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer hover:text-primary-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={values.disabled} 
                              onChange={(e) => setFieldValue('disabled', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Disabled</span>
                          </label>

                          <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer hover:text-primary-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={values.allowAlternativeItem} 
                              onChange={(e) => setFieldValue('allowAlternativeItem', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Allow Alternative Item</span>
                          </label>

                          <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer hover:text-primary-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={values.maintainStock} 
                              onChange={(e) => setFieldValue('maintainStock', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Maintain Stock</span>
                          </label>

                          <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer hover:text-primary-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={values.excisableItem} 
                              onChange={(e) => setFieldValue('excisableItem', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Excisable Item</span>
                          </label>

                          <div className="space-y-1">
                            <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer hover:text-primary-700 transition-colors">
                              <input 
                                type="checkbox" 
                                checked={values.hasVariants} 
                                onChange={(e) => setFieldValue('hasVariants', e.target.checked)}
                                className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                              />
                              <span>Has Variants</span>
                            </label>
                            {values.hasVariants && (
                              <p className="text-[11px] text-gray-500 font-medium pl-7">
                                If this item has variants, then it cannot be selected in sales orders etc.
                              </p>
                            )}
                          </div>

                          <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer hover:text-primary-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={values.includeInManufacturing} 
                              onChange={(e) => setFieldValue('includeInManufacturing', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Include Item In Manufacturing</span>
                          </label>

                          <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer hover:text-primary-700 transition-colors">
                            <input 
                              type="checkbox" 
                              checked={values.isFixedAsset} 
                              onChange={(e) => setFieldValue('isFixedAsset', e.target.checked)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                            <span>Is Fixed Asset</span>
                          </label>
                        </div>
                      </div>

                    </div>
                  </div>
                )}

                {/* TAB 2: DASHBOARD */}
                {activeTab === 'dashboard' && (
                  <div className="p-3.5 sm:p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-5 bg-primary-50/60 border border-primary-100 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xs">
                        <span className="text-xs font-bold text-primary-700 uppercase tracking-wider">Current Stock Qty</span>
                        <div className="text-2xl lg:text-3xl font-black text-primary-950 mt-1 truncate">{initialData?.quantity || 0}</div>
                      </div>
                      <div className="p-5 bg-amber-50/60 border border-amber-100 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xs">
                        <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Min Stock Alert</span>
                        <div className="text-2xl lg:text-3xl font-black text-amber-950 mt-1 truncate">{values.minStock}</div>
                      </div>
                      <div className="p-5 bg-emerald-50/60 border border-emerald-100 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xs">
                        <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Valuation Rate</span>
                        <div className="text-lg sm:text-xl lg:text-2xl font-black text-emerald-950 mt-1 truncate" title={format(Number(initialData?.wacPrice || values.valuationRate || 0))}>
                          {format(Number(initialData?.wacPrice || values.valuationRate || 0))}
                        </div>
                      </div>
                      <div className="p-5 bg-blue-50/60 border border-blue-100 rounded-3xl overflow-hidden flex flex-col justify-between shadow-2xs">
                        <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Total Valuation Value</span>
                        <div className="text-lg sm:text-xl lg:text-2xl font-black text-blue-950 mt-1 truncate" title={format((initialData?.quantity || 0) * Number(initialData?.wacPrice || values.valuationRate || 0))}>
                          {format((initialData?.quantity || 0) * Number(initialData?.wacPrice || values.valuationRate || 0))}
                        </div>
                      </div>
                    </div>

                    {/* Activity Heatmap Grid */}
                    <ActivityHeatmapComponent initialData={initialData} />

                    <div className="border border-gray-200 rounded-3xl p-6 bg-white space-y-4 shadow-2xs">
                      <h3 className="text-base font-bold text-gray-900">Stock Movement Ledgers</h3>
                      <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                        <table className="w-full text-left text-xs text-gray-600">
                          <thead className="bg-gray-50 text-gray-700 font-bold border-b border-gray-200">
                            <tr>
                              <th className="p-3">Date</th>
                              <th className="p-3">Transaction Type</th>
                              <th className="p-3 text-right">Qty Change</th>
                              <th className="p-3 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 font-medium">
                            <tr>
                              <td className="p-3">Today</td>
                              <td className="p-3 font-bold text-emerald-600">INITIAL / STOCK LEDGER</td>
                              <td className="p-3 text-right font-bold text-gray-900">+{initialData?.quantity || 0}</td>
                              <td className="p-3 text-right font-bold text-gray-900">{initialData?.quantity || 0}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ACCOUNTING (Commented out as currently not required) */}
                {/*
                {activeTab === 'accounting' && (
                  <div className="p-6 sm:p-8 flex flex-col gap-6 max-w-2xl">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Default Accounts & Cost Center</h3>
                      <div className="h-0.5 bg-gray-100 w-full"></div>
                    </div>
                    <div className="w-full">
                      <TextFieldComponent name="incomeAccount" label="Default Income Account" placeholder="Sales Account - PS" />
                    </div>
                    <div className="w-full">
                      <TextFieldComponent name="expenseAccount" label="Default Expense Account" placeholder="Cost of Goods Sold - PS" />
                    </div>
                    <div className="w-full">
                      <TextFieldComponent name="assetAccount" label="Asset Account" placeholder="Stock In Hand - PS" />
                    </div>
                    <div className="w-full">
                      <TextFieldComponent name="costCenter" label="Default Cost Center" placeholder="Main Production Plant" />
                    </div>
                  </div>
                )}
                */}

                {/* TAB 4: PURCHASING (Commented out as currently not required) */}
                {/*
                {activeTab === 'purchasing' && (
                  <div className="p-6 sm:p-8 flex flex-col gap-6 max-w-2xl">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Supplier & Pricing Details</h3>
                      <div className="h-0.5 bg-gray-100 w-full"></div>
                    </div>
                    <div className="w-full">
                      <ReusableAutocomplete
                        keyName="supplierId"
                        label="Default Supplier"
                        placeholder="Select Supplier..."
                        options={suppliers}
                        getOptionLabel={(sup) => sup?.name || ''}
                        creatable
                        onCreate={(newSupplierName) => {
                          return new Promise((resolve) => {
                            setPendingSupplierName(newSupplierName);
                            supplierResolveRef.current = resolve;
                            setShowSupplierModal(true);
                          });
                        }}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="w-full">
                        <TextFieldComponent name="costPrice" label="Standard Purchase Rate / Cost Price (₹)" type="number" placeholder="0.00" />
                      </div>
                      <div className="w-full">
                        <TextFieldComponent name="sellingPrice" label="Standard Selling Price (₹)" type="number" placeholder="0.00" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="w-full">
                        <TextFieldComponent name="minStock" label="Reorder Level / Min Stock Alert" type="number" placeholder="50" />
                      </div>
                      <div className="w-full">
                        <TextFieldComponent name="leadTimeDays" label="Lead Time (Days)" type="number" placeholder="7" />
                      </div>
                    </div>
                  </div>
                )}
                */}

                {/* TAB 5: TAX (Commented out as currently not required) */}
                {/*
                {activeTab === 'tax' && (
                  <div className="p-6 sm:p-8 flex flex-col gap-6 max-w-2xl">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Tax Specifications</h3>
                      <div className="h-0.5 bg-gray-100 w-full"></div>
                    </div>
                    <div className="w-full">
                      <TextFieldComponent name="hsnCode" label="GST HSN / SAC Code" placeholder="e.g. 39269099" />
                    </div>
                    <div className="w-full">
                      <TextFieldComponent name="taxRate" label="GST Rate (%)" type="number" placeholder="18" />
                    </div>
                  </div>
                )}
                */}

                {/* TAB 6: QUALITY */}
                {activeTab === 'quality' && (
                  <div className="p-3.5 sm:p-6 md:p-8 flex flex-col gap-6 max-w-2xl">
                    <div className="space-y-1">
                      <h3 className="text-xs font-black uppercase tracking-wider text-gray-400">Quality Inspection Settings</h3>
                      <div className="h-0.5 bg-gray-100 w-full"></div>
                    </div>
                    <div className="bg-gray-50 border border-gray-200 rounded-3xl p-6 flex flex-col gap-4 shadow-2xs">
                      <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                        <span>Inspection Required Before Purchase Receipt</span>
                      </label>
                      <label className="flex items-center gap-3 text-xs font-bold text-gray-800 cursor-pointer">
                        <input type="checkbox" className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500" />
                        <span>Inspection Required Before Delivery</span>
                      </label>
                    </div>
                  </div>
                )}

              </div>
            </div>

            {/* COMMENTS & ACTIVITY TIMELINE COMPONENT */}
            {/* <FormCommentsAndActivity
              entityType="Item"
              entityId={id || initialData?.id || values.sku || ''}
              createdByName={initialData?.createdBy || initialData?.assignedTo || user?.name || user?.username || 'Admin'}
              createdAt={initialData?.createdAt ? formatDistanceToNow(new Date(initialData.createdAt), { addSuffix: true }) : 'recently'}
              lastEditedByName={initialData?.updatedBy || initialData?.assignedTo || user?.name || user?.username || 'Admin'}
              lastEditedAt={initialData?.updatedAt ? formatDistanceToNow(new Date(initialData.updatedAt), { addSuffix: true }) : 'recently'}
              currentUser={{ name: user?.name || user?.username || 'Admin' }}
            /> */}

            {/* MODALS FOR INLINE CREATION */}
            
            {/* Category Modal */}
            {showCategoryModal && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Item Group</h3>
                  <Formik
                    initialValues={{ name: pendingCategoryName }}
                    validationSchema={categoryModalValidationSchema}
                    onSubmit={async (val, { resetForm, setSubmitting }) => {
                      try {
                        setSubmitting(true);
                        const newCat = await createCategory({ name: val.name.trim() });
                        setCategories((prev) => [...prev, newCat]);
                        setFieldValue('categoryId', newCat.id);
                        if (categoryResolveRef.current) categoryResolveRef.current(newCat);
                        resetForm();
                        setShowCategoryModal(false);
                        successToast('Item Group created');
                      } catch (error) {
                        errorToast('Failed to create item group');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ submitForm: submitCategoryForm, isSubmitting: isCategorySubmitting }) => (
                      <Form className="space-y-5">
                        <TextFieldComponent name="name" label="Item Group Name" placeholder="e.g. ROLL, TOOLS" />
                        <div className="flex justify-end gap-3 pt-2">
                          <ButtonComponent
                            variant="outlined"
                            onClick={() => {
                              setShowCategoryModal(false);
                              if (categoryResolveRef.current) categoryResolveRef.current(null);
                            }}
                          >
                            Cancel
                          </ButtonComponent>
                          <ButtonComponent
                            variant="primary"
                            onClick={submitCategoryForm}
                            loading={isCategorySubmitting}
                          >
                            Create Item Group
                          </ButtonComponent>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            )}

            {/* Supplier Modal */}
            {showSupplierModal && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Supplier</h3>
                  <Formik
                    initialValues={{ name: pendingSupplierName, contact: '', email: '' }}
                    validationSchema={supplierValidationSchema}
                    onSubmit={async (val, { resetForm, setSubmitting }) => {
                      try {
                        setSubmitting(true);
                        let newSup: any;
                        try {
                          newSup = await createSupplier({ name: val.name.trim(), contact: val.contact?.trim(), email: val.email?.trim() });
                        } catch (err) {
                          newSup = { id: `SUP-${Date.now()}`, name: val.name.trim(), contact: val.contact?.trim(), email: val.email?.trim() };
                        }
                        setSuppliers((prev) => [...prev, newSup]);
                        setFieldValue('supplierId', newSup.id);
                        if (supplierResolveRef.current) supplierResolveRef.current(newSup);
                        resetForm();
                        setShowSupplierModal(false);
                        successToast('Supplier created');
                      } catch (error) {
                        errorToast('Failed to create supplier');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ submitForm: submitSupplierForm, isSubmitting: isSupplierSubmitting }) => (
                      <Form className="space-y-4">
                        <TextFieldComponent name="name" label="Supplier Name *" placeholder="Supplier Ltd" />
                        <TextFieldComponent name="contact" label="Contact" placeholder="Phone..." />
                        <TextFieldComponent name="email" label="Email" placeholder="supplier@email.com" />
                        <div className="flex justify-end gap-3 pt-2">
                          <ButtonComponent
                            variant="outlined"
                            onClick={() => {
                              setShowSupplierModal(false);
                              if (supplierResolveRef.current) supplierResolveRef.current(null);
                            }}
                          >
                            Cancel
                          </ButtonComponent>
                          <ButtonComponent
                            variant="primary"
                            onClick={submitSupplierForm}
                            loading={isSupplierSubmitting}
                          >
                            Create Supplier
                          </ButtonComponent>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            )}

            {/* Unit Modal */}
            {showUnitModal && (
              <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[100]">
                <div className="bg-white rounded-3xl p-7 w-full max-w-md shadow-xl relative">
                  <h3 className="text-lg font-bold text-gray-900 mb-5">Add New Unit of Measure</h3>
                  <Formik
                    initialValues={{ name: pendingUnitName || '' }}
                    enableReinitialize
                    validationSchema={unitValidationSchema}
                    onSubmit={async (val, { resetForm, setSubmitting }) => {
                      try {
                        setSubmitting(true);
                        const newUnit = await createUnit({ name: val.name.trim() });
                        setUnits((prev) => [...prev, newUnit]);
                        setFieldValue('unitId', newUnit.id);
                        if (unitResolveRef.current) {
                          unitResolveRef.current(newUnit);
                          unitResolveRef.current = null;
                        }
                        setPendingUnitName('');
                        resetForm();
                        setShowUnitModal(false);
                        successToast('Unit created');
                      } catch (error) {
                        errorToast('Failed to create unit');
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                  >
                    {({ submitForm: submitUnitForm, isSubmitting: isUnitSubmitting }) => (
                      <Form className="space-y-4">
                        <TextFieldComponent name="name" label="Unit Name (e.g. Pcs, Roll, Meter)" placeholder="e.g. Pcs" />
                        <div className="flex justify-end gap-3 pt-2">
                          <ButtonComponent
                            variant="outlined"
                            onClick={() => {
                              setShowUnitModal(false);
                              setPendingUnitName('');
                              if (unitResolveRef.current) {
                                unitResolveRef.current(null);
                                unitResolveRef.current = null;
                              }
                            }}
                          >
                            Cancel
                          </ButtonComponent>
                          <ButtonComponent
                            variant="primary"
                            onClick={submitUnitForm}
                            loading={isUnitSubmitting}
                          >
                            Create Unit
                          </ButtonComponent>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            )}
            {/* Jump to Field Modal */}
            {showJumpToFieldModal && (
              <div className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
                <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-4 border border-gray-100 relative animate-in zoom-in-95 duration-150">
                  
                  {/* Header */}
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

                  {/* Select Field Input Container */}
                  <div className="space-y-2">
                    <TextFieldComponent
                      autoFocus
                      label="Select Field *"
                      value={jumpSearchQuery}
                      onChange={(e: any) => setJumpSearchQuery(e.target.value)}
                      placeholder="Search field..."
                    />

                    {/* Options List */}
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-200 divide-y divide-gray-100 bg-white mt-2 shadow-2xs">
                      {filteredJumpFields.length > 0 ? (
                        filteredJumpFields.map((field, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleJumpToField(field)}
                            className="w-full text-left px-4 py-3 text-xs font-medium text-gray-800 hover:bg-gray-100 hover:text-gray-900 transition-colors flex items-center justify-between cursor-pointer"
                          >
                            <span className="font-semibold">{field.label}</span>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-0.5 rounded-full">
                              {field.tab}
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-gray-400 font-medium">
                          No matching fields found
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* Item Print & PDF Preview Modal */}
            <ItemPrintModal
              isOpen={showPrintModal}
              onClose={() => setShowPrintModal(false)}
              item={{ ...values, ...initialData }}
            />
          </Form>
        </ERPFormPageLayout>
      )}
    </Formik>
  );
};

export const ProductFormPage = WithAuth(ProductFormPageBase, ModuleName.INVENTORY_PRODUCTS, Permission.ADD);
export default ProductFormPage;
