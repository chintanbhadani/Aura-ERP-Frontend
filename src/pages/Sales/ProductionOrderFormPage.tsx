import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Formik, Form, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { ERPFormLayout } from '../../components/ERPForm';
import { FormCard } from '../../components/FormCard';
import { Input } from '../../components/Input';
import { Select } from '../../components/Select';
import { TextFieldComponent, SelectOutlinedField, ReusableAutocomplete } from '../../components/input/index';
import { ButtonComponent } from '../../components/button/index';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Paper from '@mui/material/Paper';
import { 
  fetchProductionOrderById, 
  createProductionOrder, 
  updateProductionOrder, 
  fetchNextProductionOrderId,
  fetchClients,
  fetchInventory,
  fetchUnits,
  type ProductionOrder,
  type ProductionOrderItem,
  type Product,
  type Unit
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { Plus, Trash2, ShieldCheck, Truck, Package, Layers, FileText, CheckCircle } from 'lucide-react';
import { getStoredBoms, getPoBomMap, setPoBomMap } from '../Production/bomStorage';

const productionOrderValidationSchema = Yup.object().shape({
  customerName: Yup.string().trim().required('Customer Name is required'),
  orderSheetDate: Yup.string().required('Order Sheet Date is required'),
  items: Yup.array().min(1, 'At least one item is required')
});

const EMPTY_ITEM: ProductionOrderItem = {
  srNo: 1,
  strapSizeLength: '',
  color: '',
  coreSize: '',
  surface: '',
  noOfArticles: 0,
  netWtOfArticles: 0,
  mtrsPerArticles: 0,
  totalWt: 0,
  qty: 0,
  unit: 'Roll',
  unitOfMeasurement: 'NOS',
  ratePerUnit: 0,
  wComm: '',
  breakingLoad: '',
  palletQty: '',
  gstPercent: 18,
  freightTerms: 'PAID',
  totalAmount: 0
};

const FormattedAmountInput: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (val: number) => void;
  placeholder?: string;
  name?: string;
}> = ({ label, value, onChange, placeholder, name }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputText, setInputText] = useState('');

  const displayVal = isFocused
    ? (inputText !== '' ? inputText : (value !== undefined && value !== null && value > 0 ? String(value) : ''))
    : (value !== undefined && value !== null && value > 0 ? value.toLocaleString('en-IN') : '');

  return (
    <div>
      <TextFieldComponent
        label={label}
        name={name || label.toLowerCase().replace(/[^a-z0-9]/g, '_')}
        type="text"
        autoComplete="off"
        inputProps={{ autoComplete: 'off', autoCorrect: 'off', spellCheck: 'false' }}
        value={displayVal}
        onFocus={() => {
          setIsFocused(true);
          setInputText(value !== undefined && value !== null && value > 0 ? String(value) : '');
        }}
        onBlur={() => {
          setIsFocused(false);
          const clean = inputText.replace(/[^0-9.]/g, '');
          const parsed = parseFloat(clean);
          const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
          onChange(finalVal);
        }}
        onChange={(e: any) => {
          let raw = e.target.value.replace(/[^0-9.]/g, '');
          if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
            raw = raw.replace(/^0+/, '');
          }
          setInputText(raw);
          const parsed = parseFloat(raw);
          const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
          onChange(finalVal);
        }}
        placeholder={placeholder || 'e.g. 1,50,000'}
      />
    </div>
  );
};

const FormattedDaysInput: React.FC<{
  label: string;
  value: number | undefined;
  onChange: (val: number) => void;
  placeholder?: string;
  name?: string;
}> = ({ label, value, onChange, placeholder, name }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputText, setInputText] = useState('');

  const displayVal = isFocused
    ? (inputText !== '' ? inputText : (value !== undefined && value !== null && value > 0 ? String(value) : ''))
    : (value !== undefined && value !== null && value > 0 ? String(value) : '');

  return (
    <div>
      <TextFieldComponent
        label={label}
        name={name || label.toLowerCase().replace(/[^a-z0-9]/g, '_')}
        type="text"
        autoComplete="off"
        inputProps={{ autoComplete: 'off', autoCorrect: 'off', spellCheck: 'false' }}
        value={displayVal}
        onFocus={() => {
          setIsFocused(true);
          setInputText(value !== undefined && value !== null && value > 0 ? String(value) : '');
        }}
        onBlur={() => {
          setIsFocused(false);
          const clean = inputText.replace(/[^0-9]/g, '');
          const parsed = parseInt(clean, 10);
          const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
          onChange(finalVal);
        }}
        onChange={(e: any) => {
          let raw = e.target.value.replace(/[^0-9]/g, '');
          if (raw.length > 1 && raw.startsWith('0')) {
            raw = raw.replace(/^0+/, '');
          }
          setInputText(raw);
          const parsed = parseInt(raw, 10);
          const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
          onChange(finalVal);
        }}
        placeholder={placeholder || '0'}
      />
    </div>
  );
};

const RateInput: React.FC<{
  label?: string;
  value: number | undefined;
  onChange: (val: number) => void;
  className?: string;
}> = ({ label = 'Rate / Unit', value, onChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputText, setInputText] = useState('');

  const displayVal = isFocused
    ? inputText
    : (value !== undefined && value !== null && value > 0 ? value.toLocaleString('en-IN') : '');

  return (
    <TextFieldComponent
      label={label}
      type="text"
      value={displayVal}
      onFocus={() => {
        setIsFocused(true);
        setInputText(value !== undefined && value !== null && value > 0 ? String(value) : '');
      }}
      onBlur={() => {
        setIsFocused(false);
        const clean = inputText.replace(/[^0-9.]/g, '');
        const parsed = parseFloat(clean);
        const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        onChange(finalVal);
      }}
      onChange={(e: any) => {
        let raw = e.target.value.replace(/[^0-9.]/g, '');
        if (raw.length > 1 && raw.startsWith('0') && raw[1] !== '.') {
          raw = raw.replace(/^0+/, '');
        }
        setInputText(raw);
        const parsed = parseFloat(raw);
        const finalVal = isNaN(parsed) || parsed < 0 ? 0 : parsed;
        onChange(finalVal);
      }}
      placeholder="0"
    />
  );
};

const ProductionOrderFormPageBase: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id && id !== 'new');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const formikRef = useRef<FormikProps<any>>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [productsList, setProductsList] = useState<Product[]>([]);
  const [availableBoms, setAvailableBoms] = useState<any[]>([]);
  const [masterUnits, setMasterUnits] = useState<Unit[]>([]);

  const [formData, setFormData] = useState<Partial<ProductionOrder>>({
    id: '',
    orderSheetDate: new Date().toISOString().split('T')[0],
    customerCategory: 'NEW',
    state: '',
    city: '',
    customerType: 'USER',
    creditDays: '30 DAYS',
    dispatchPeriod: '',
    piNo: '',
    customerName: '',
    buyerBillingAddress: '',
    consigneeDeliveryAddress: '',
    email: '',
    contactNo: '',
    contactPerson: '',
    deliveryTerms: 'Door delivery',
    purchaseOrderNo: '',
    poDate: '',
    customerGstin: '',
    packingDetails: '',
    stackingDetails: '',
    remarksSpecialInstructions: '',
    status: 'Draft',
    ndAmount: 0,
    odAmount: 0,
    odDays: 0,
    paymentStatus: '',
    marketingApproval: '',
    productionApproval: '',
    logisticApproval: '',
    accountApproval: '',
    mdApproval: '',
    authorisedSign: '',
    transporterName: '',
    transportGstin: '',
    lrNo: '',
    lrDate: '',
    vehicleNo: '',
    driverName: '',
    mobileNo: '',
    dispatchDate: '',
    insurance: 'NO',
    waybillPartB: 'YES',
    items: [{ ...EMPTY_ITEM, srNo: 1 }]
  });

  useEffect(() => {
    loadClients();
    loadProducts();
    loadAvailableBoms();
    loadUnits();
    if (isEdit && id) {
      loadOrderData(id);
    } else {
      loadNextId();
    }
  }, [id, isEdit]);

  const loadAvailableBoms = () => {
    try {
      const list = getStoredBoms();
      setAvailableBoms(list);

      // Auto-bind mapped BOMs if line item does not have one yet
      const poBomMap = getPoBomMap();
      const currentPoId = formData.orderNumber || formData.id;
      if (currentPoId && formData.items && formData.items.length > 0) {
        let changed = false;
        const updatedItems = formData.items.map((item: ProductionOrderItem, idx: number) => {
          const key = `${currentPoId}_${item.srNo || idx + 1}`;
          const mapped = poBomMap[key];
          if (mapped && !item.bomNumber && !item.bomId) {
            changed = true;
            return {
              ...item,
              bomNumber: mapped.bomNumber,
              bomId: mapped.bomId || mapped.bomNumber
            };
          }
          return item;
        });
        if (changed) {
          setFormData(prev => ({ ...prev, items: updatedItems }));
        }
      }
    } catch (e) {
      console.error('Failed to load BOMs:', e);
    }
  };

  // Real-time synchronization when user creates or modifies a BOM in another tab or route
  useEffect(() => {
    const handleSync = () => loadAvailableBoms();
    window.addEventListener('storage', handleSync);
    window.addEventListener('patel_erp_boms_updated', handleSync);
    window.addEventListener('focus', handleSync);
    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('patel_erp_boms_updated', handleSync);
      window.removeEventListener('focus', handleSync);
    };
  }, [formData.orderNumber, formData.id, formData.items]);

  const loadProducts = async () => {
    try {
      const items = await fetchInventory();
      if (items && Array.isArray(items)) {
        setProductsList(items);
      }
    } catch (err) {
      console.error('Failed to load inventory products:', err);
    }
  };

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (err) {
      console.error('Failed to load clients:', err);
    }
  };

  const loadUnits = async () => {
    try {
      const data = await fetchUnits();
      if (data && Array.isArray(data)) {
        setMasterUnits(data.filter(u => !u.disabled));
      }
    } catch (err) {
      console.error('Failed to load master units:', err);
    }
  };

  const loadNextId = async () => {
    try {
      const res = await fetchNextProductionOrderId();
      const idVal = res?.nextId || (res as any)?.id;
      if (idVal) {
        setFormData(prev => ({ ...prev, id: idVal, orderNumber: idVal }));
      }
    } catch (err) {
      console.error('Failed to fetch next ID:', err);
    }
  };

  const loadOrderData = async (orderId: string) => {
    setLoading(true);
    try {
      const data = await fetchProductionOrderById(orderId);
      const poNum = data.orderNumber || data.id;
      const poBomMap = JSON.parse(localStorage.getItem('patel_erp_po_bom_map') || '{}');

      const formattedItems = (data.items || []).map((it: any, idx: number) => {
        const sr = it.srNo || idx + 1;
        const key = `${poNum}_${sr}`;
        const mappedBom = poBomMap[key];

        const initialQty = (it.qty !== undefined && it.qty !== null && Number(it.qty) > 0)
          ? Number(it.qty)
          : (Number(it.noOfArticles) || Number(it.quantity) || 0);

        return {
          ...it,
          strapSizeLength: it.strapSizeLength || it.sizeLength || '',
          color: it.color || it.colour || 'Green',
          netWtOfArticles: it.netWtOfArticles ?? it.netWtArticles ?? 0,
          qty: initialQty,
          noOfArticles: initialQty,
          palletQty: it.palletQty || it.palletQuantity || '',
          bomNumber: it.bomNumber || mappedBom?.bomNumber || '',
          bomId: it.bomId || mappedBom?.bomId || mappedBom?.bomNumber || ''
        };
      });

      setFormData({
        ...data,
        orderNumber: data.orderNumber || data.id,
        buyerBillingAddress: data.buyerBillingAddress || (data as any).billingAddress || '',
        consigneeDeliveryAddress: data.consigneeDeliveryAddress || (data as any).consigneeAddress || '',
        remarks: data.remarks || data.remarksSpecialInstructions || '',
        remarksSpecialInstructions: data.remarks || data.remarksSpecialInstructions || '',
        marketingApproval: data.marketingApproval || (data as any).marketing || '',
        marketing: data.marketingApproval || (data as any).marketing || '',
        productionApproval: data.productionApproval || (data as any).production || '',
        production: data.productionApproval || (data as any).production || '',
        logisticApproval: data.logisticApproval || (data as any).logistic || '',
        logistic: data.logisticApproval || (data as any).logistic || '',
        accountApproval: data.accountApproval || (data as any).account || '',
        account: data.accountApproval || (data as any).account || '',
        mdApproval: data.mdApproval || (data as any).managingDirector || '',
        managingDirector: data.mdApproval || (data as any).managingDirector || '',
        lrDate: data.lrDate ? String(data.lrDate).split('T')[0] : '',
        poDate: data.poDate ? String(data.poDate).split('T')[0] : '',
        dispatchDate: data.dispatchDate ? String(data.dispatchDate).split('T')[0] : '',
        orderSheetDate: data.orderSheetDate ? String(data.orderSheetDate).split('T')[0] : '',
        items: formattedItems.length > 0 ? formattedItems : [{ ...EMPTY_ITEM, srNo: 1 }]
      });
    } catch (err) {
      console.error('Failed to load production order:', err);
      errorToast('Failed to load production order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (clientName: string) => {
    if (!clientName) return;
    const cleanSearch = clientName.trim().toLowerCase();

    const selected = clients.find(c => {
      const name = (c.companyName || c.clientName || c.name || '').trim();
      const cityState = [c.city, c.state].filter(Boolean).join(', ');
      const fullLabel = cityState ? `${name} (${cityState})` : name;
      
      const nLower = name.toLowerCase();
      const flLower = fullLabel.toLowerCase();

      return (
        nLower === cleanSearch ||
        flLower === cleanSearch ||
        cleanSearch.startsWith(nLower) ||
        (nLower.length > 2 && cleanSearch.includes(nLower))
      );
    });

    if (selected) {
      const cName = selected.companyName || selected.clientName || selected.name || clientName;

      // Extract and format addresses from selected client
      let addressesList: any[] = [];
      if (Array.isArray(selected.addresses)) {
        addressesList = selected.addresses;
      } else if (typeof selected.addresses === 'string') {
        try {
          addressesList = JSON.parse(selected.addresses);
        } catch {
          addressesList = [];
        }
      }

      // Check for structured shipping / delivery / consignee address in addresses array
      const shippingObj = addressesList.find((a: any) => {
        const t = String(a.type || '').toLowerCase();
        return t.includes('ship') || t.includes('delivery') || t.includes('consignee') || t.includes('dispatch') || t.includes('warehouse') || t.includes('plant');
      });

      // Check for structured billing / registered address in addresses array
      const billingObj = addressesList.find((a: any) => {
        const t = String(a.type || '').toLowerCase();
        return t.includes('bill') || t.includes('registered') || t.includes('office') || t.includes('head');
      });

      // Format address helper
      const formatAddr = (item: any, fallbackCity?: string, fallbackState?: string, fallbackPin?: string, fallbackCountry?: string) => {
        if (!item && !fallbackCity && !fallbackState && !fallbackPin) return '';
        let street = '';
        let city = fallbackCity || '';
        let state = fallbackState || '';
        let pin = fallbackPin || '';
        let country = fallbackCountry || '';

        if (typeof item === 'object' && item !== null) {
          street = item.address || item.street || item.streetAddress || item.line1 || '';
          city = item.city || city;
          state = item.state || state;
          pin = item.pinCode || item.postalCode || item.zipCode || pin;
          country = item.country || country;
        } else if (typeof item === 'string') {
          street = item;
        }

        const parts: string[] = [];
        if (street && street.trim()) parts.push(street.trim());
        if (city && city.trim() && !street.toLowerCase().includes(city.trim().toLowerCase())) {
          parts.push(city.trim());
        }
        if (state && state.trim() && !street.toLowerCase().includes(state.trim().toLowerCase())) {
          if (pin && String(pin).trim() && !street.includes(String(pin).trim())) {
            parts.push(`${state.trim()} - ${String(pin).trim()}`);
          } else {
            parts.push(state.trim());
          }
        } else if (pin && String(pin).trim() && !street.includes(String(pin).trim())) {
          parts.push(String(pin).trim());
        }

        return parts.filter(Boolean).join(', ');
      };

      let billingAddr = '';
      let deliveryAddr = '';

      if (billingObj) {
        billingAddr = formatAddr(billingObj);
      }
      if (shippingObj) {
        deliveryAddr = formatAddr(shippingObj);
      }

      // Check flat address fields
      const flatAddr = formatAddr(
        selected.address || selected.streetAddress || selected.billingAddress || selected.shippingAddress,
        selected.city,
        selected.state,
        selected.postalCode || selected.pinCode,
        selected.country
      );

      if (!billingAddr) {
        billingAddr = flatAddr || (addressesList[0] ? formatAddr(addressesList[0]) : '');
      }

      if (!deliveryAddr) {
        deliveryAddr = billingAddr || flatAddr;
      }

      if (!billingAddr && deliveryAddr) {
        billingAddr = deliveryAddr;
      }

      setFormData(prev => ({
        ...prev,
        customerName: cName,
        clientId: selected.id ? Number(selected.id) : prev.clientId,
        buyerBillingAddress: billingAddr || prev.buyerBillingAddress,
        consigneeDeliveryAddress: deliveryAddr || prev.consigneeDeliveryAddress,
        email: selected.email || prev.email,
        contactNo: selected.phone || selected.mobile || selected.contact || prev.contactNo,
        contactPerson: selected.contactPersonName || selected.contactPerson || prev.contactPerson,
        customerGstin: selected.gstNumber || selected.gstin || selected.taxId || prev.customerGstin,
        city: selected.city || billingObj?.city || shippingObj?.city || prev.city,
        state: selected.state || billingObj?.state || shippingObj?.state || prev.state,
        creditDays: selected.paymentTerms ? `${selected.paymentTerms}` : prev.creditDays,
        customerType: selected.customerType || prev.customerType
      }));
    } else {
      setFormData(prev => ({ ...prev, customerName: clientName }));
    }
  };

  useEffect(() => {
    if (!isEdit && clients.length > 0) {
      const custParam = searchParams.get('customerName') || searchParams.get('customer');
      const clientParamId = searchParams.get('customerId') || searchParams.get('clientId');
      if (clientParamId) {
        const found = clients.find(c => String(c.id) === String(clientParamId));
        if (found) {
          handleSelectClient(found.companyName || found.clientName || found.name || '');
          return;
        }
      }
      if (custParam) {
        handleSelectClient(custParam);
      }
    }
  }, [clients, isEdit, searchParams]);

  const clientOptions = React.useMemo(() => {
    return clients.map(c => {
      const name = c.companyName || c.clientName || c.name || '';
      const cityState = [c.city, c.state].filter(Boolean).join(', ');
      return cityState ? `${name} (${cityState})` : name;
    }).filter(Boolean);
  }, [clients]);

  const unitOptions = React.useMemo(() => {
    const defaultUnits = ['Roll', 'NOS', 'Kg', 'Meter'];
    const fromMaster = masterUnits.map(u => u.name).filter(Boolean);
    return Array.from(new Set([...defaultUnits, ...fromMaster]));
  }, [masterUnits]);

  const isFinishedProduct = (p: Product): boolean => {
    if (!p) return false;

    const partOf = String(p.partOf || '').trim().toLowerCase();
    const catName = String(p.category?.name || '').trim().toLowerCase();
    const subPartOf = String((p as any).subPartOf || '').trim().toLowerCase();
    const tags = String(p.tags || '').trim().toLowerCase();
    const name = String(p.name || '').trim().toLowerCase();
    const sku = String(p.sku || '').trim().toLowerCase();

    // 1. Definite negative filters (Exclude raw materials, masterbatches, additives, packaging, consumables)
    if (
      partOf.includes('raw') ||
      subPartOf.includes('raw') ||
      catName.includes('raw') ||
      tags.includes('raw') ||
      name.includes('additive') ||
      name.includes('masterbatch') ||
      name.includes('wrapping film') ||
      name.includes('stretch film') ||
      name.includes('screw') ||
      name.includes('adhesive') ||
      name.includes('packing material') ||
      name.includes('packaging material') ||
      name.includes('ink') ||
      name.includes('flakes') ||
      name.includes('granules') ||
      name.includes('resin') ||
      sku.startsWith('psma') ||
      sku.startsWith('psan') ||
      sku.startsWith('pswr') ||
      sku.startsWith('pstl')
    ) {
      return false;
    }

    // 2. Definite positive matches (Finished goods, strap rolls)
    if (
      partOf.includes('finish') ||
      partOf.includes('fg') ||
      catName.includes('finish') ||
      catName.includes('fg') ||
      tags.includes('finish') ||
      partOf.includes('roll') ||
      catName.includes('roll') ||
      name.includes('roll') ||
      name.includes('strap') ||
      sku.startsWith('psro') ||
      Boolean(p.rollLength && p.rollLength > 0) ||
      Boolean(p.rollWidth && p.rollWidth > 0) ||
      Boolean(p.rollWeight && p.rollWeight > 0)
    ) {
      return true;
    }

    return false;
  };

  const productOptions = React.useMemo(() => {
    const finishedProducts = productsList.filter(isFinishedProduct);
    const listToUse = finishedProducts.length > 0 
      ? finishedProducts 
      : productsList.filter(p => !String(p.partOf || '').toLowerCase().includes('raw'));

    return listToUse.map(p => {
      const details = [];
      if (p.sku) details.push(`[${p.sku}]`);
      if (p.name) details.push(p.name);

      const isRoll = Boolean(
        (p.partOf && String(p.partOf).toLowerCase().includes('roll')) ||
        (p.category?.name && p.category.name.toLowerCase().includes('roll')) ||
        (p.name && p.name.toLowerCase().includes('roll'))
      );

      if (isRoll) {
        if (p.rollWidth || p.rollLength) details.push(`L:${p.rollLength || 0}m, W:${p.rollWidth || 0}mm`);
        if (p.rollCoreDiameter || p.rollCoreLength) details.push(`Core:${p.rollCoreDiameter || 406}x${p.rollCoreLength || 150}`);
        if (p.rollDiaSize) details.push(`Dia:${p.rollDiaSize}`);
        if (p.rollSurface) details.push(`Surface:${p.rollSurface}`);
        if (p.rollWeight) details.push(`Wt:${p.rollWeight}kg`);
      }

      return details.join(' | ');
    });
  }, [productsList]);

  const handleProductSelect = (index: number, selectedValue: any) => {
    const valStr = typeof selectedValue === 'string' ? selectedValue : (selectedValue?.label || '');
    if (!valStr) return;

    const p = productsList.find(pr => {
      const isRoll = Boolean(
        (pr.partOf && String(pr.partOf).toLowerCase().includes('roll')) ||
        (pr.category?.name && pr.category.name.toLowerCase().includes('roll')) ||
        (pr.name && pr.name.toLowerCase().includes('roll'))
      );

      const fullLabel = [
        pr.sku ? `[${pr.sku}]` : '',
        pr.name,
        isRoll && (pr.rollWidth || pr.rollLength) ? `L:${pr.rollLength || 0}m, W:${pr.rollWidth || 0}mm` : '',
        isRoll && (pr.rollCoreDiameter || pr.rollCoreLength) ? `Core:${pr.rollCoreDiameter || 406}x${pr.rollCoreLength || 150}` : '',
        isRoll && pr.rollDiaSize ? `Dia:${pr.rollDiaSize}` : '',
        isRoll && pr.rollSurface ? `Surface:${pr.rollSurface}` : '',
        isRoll && pr.rollWeight ? `Wt:${pr.rollWeight}kg` : ''
      ].filter(Boolean).join(' | ');

      return (
        fullLabel === valStr ||
        pr.name === valStr ||
        pr.sku === valStr ||
        (pr.sku && valStr.includes(`[${pr.sku}]`)) ||
        (pr.name && valStr.includes(pr.name))
      );
    });

    setFormData(prev => {
      const items = [...(prev.items || [])];
      const item = { ...items[index] };

      item.strapSizeLength = valStr;
      (item as any).sizeLength = valStr;

      if (p) {
        const isRoll = Boolean(
          (p.partOf && String(p.partOf).toLowerCase().includes('roll')) ||
          (p.category?.name && p.category.name.toLowerCase().includes('roll')) ||
          (p.name && p.name.toLowerCase().includes('roll'))
        );

        // 1. Detect Colour from product name, tags, or fallback to Green for strap rolls
        const knownColors = ['Green', 'Yellow', 'Blue', 'Black', 'Clear', 'White'];
        const pText = `${p.name || ''} ${p.tags || ''} ${p.sku || ''} ${valStr}`.toLowerCase();
        const foundColor = knownColors.find(c => pText.includes(c.toLowerCase()));
        item.color = foundColor || (isRoll ? 'Green' : (item.color || ''));

        // 2. Core Size & Surface
        const core = isRoll && (p.rollCoreDiameter || p.rollCoreLength)
          ? `${p.rollCoreDiameter || 406} x ${p.rollCoreLength || 150}`
          : (isRoll ? (item.coreSize || '406 x 150') : '');
        const surface = isRoll && p.rollSurface
          ? (p.rollSurface === 'Roll Emboss' ? 'Embossed' : (p.rollSurface === 'Roll Plain' ? 'Smooth' : p.rollSurface))
          : (isRoll ? (item.surface || 'Smooth') : '');
        item.coreSize = core;
        item.surface = surface;

        // 3. Net Wt & Mtrs per Roll
        const netWt = isRoll ? (p.rollWeight || item.netWtOfArticles || 0) : (item.netWtOfArticles || 0);
        const mtrs = isRoll ? (p.rollLength || item.mtrsPerArticles || 0) : (item.mtrsPerArticles || 0);
        if (netWt) item.netWtOfArticles = Number(netWt);
        if (mtrs) item.mtrsPerArticles = Number(mtrs);

        // 4. Breaking Load
        const width = p.rollWidth || 0;
        if (width >= 19) item.breakingLoad = '850 Kg';
        else if (width >= 15) item.breakingLoad = '634 Kg';
        else if (width >= 12) item.breakingLoad = '450 Kg';
        else if (width >= 9) item.breakingLoad = '300 Kg';
        else if (isRoll && !item.breakingLoad) item.breakingLoad = '634 Kg';

        // 5. Unit
        const unitName = p.unit?.name || (isRoll ? 'Roll' : (item.unit || 'NOS'));
        item.unit = unitName;

        // 6. Rate & GST
        const rate = p.selling_price || p.cost_price || item.ratePerUnit || 0;
        if (rate) item.ratePerUnit = Number(rate);
        const gst = p.taxRate || item.gstPercent || 18;
        item.gstPercent = Number(gst);

        // 7. Pallet Quantity
        if (isRoll && !item.palletQty) {
          item.palletQty = '24 Rolls - 5 Pallets';
        }

        // 8. Auto-match BOM / Recipe if available
        const matchedBom = availableBoms.find(b => {
          const fg = (b.finishedGoodName || '').toLowerCase();
          const sku = (p.sku || '').toLowerCase();
          const name = (p.name || '').toLowerCase();
          return (
            (sku && fg.includes(sku)) ||
            (name && fg.includes(name)) ||
            (fg && pText.includes(fg))
          );
        }) || availableBoms.find(b => isRoll && (b.finishedGoodName || '').toLowerCase().includes('roll')) || availableBoms[0];

        if (matchedBom && !item.bomNumber && !item.bomId) {
          item.bomNumber = matchedBom.bomNumber || matchedBom.id;
          item.bomId = matchedBom.id || matchedBom.bomNumber;
        }

        // 9. Calculations
        const itemQty = item.qty || item.noOfArticles || 10;
        item.qty = itemQty;
        item.noOfArticles = itemQty;
        item.totalWt = (item.netWtOfArticles || 0) * itemQty;
        const baseAmt = itemQty * (item.ratePerUnit || 0);
        item.totalAmount = baseAmt + (baseAmt * (item.gstPercent / 100));
      }

      items[index] = item;
      return { ...prev, items };
    });
  };

  const handleItemChange = (index: number, field: keyof ProductionOrderItem, value: any) => {
    setFormData(prev => {
      const updatedItems = [...(prev.items || [])];
      const currentItem = { ...updatedItems[index], [field]: value };
      if (field === 'strapSizeLength') {
        (currentItem as any).sizeLength = value;
      }
      if (field === 'qty') {
        currentItem.noOfArticles = Number(value) || 0;
      }

      // Auto-calculate Total Weight if Qty * Net Wt of Articles
      if (field === 'qty' || field === 'netWtOfArticles' || field === 'ratePerUnit' || field === 'gstPercent') {
        const qty = Number(currentItem.qty) || 0;
        const netWt = Number(currentItem.netWtOfArticles) || 0;
        const rate = Number(currentItem.ratePerUnit) || 0;
        const gst = Number(currentItem.gstPercent) || 0;

        if (field === 'qty' || field === 'netWtOfArticles') {
          if (netWt > 0 && qty > 0) {
            currentItem.totalWt = Number((qty * netWt).toFixed(2));
          }
        }

        const baseTotal = qty * rate;
        const totalWithGst = baseTotal + (baseTotal * gst / 100);
        currentItem.totalAmount = Number(totalWithGst.toFixed(2));
      }

      updatedItems[index] = currentItem;
      return { ...prev, items: updatedItems };
    });
  };

  const addItemRow = () => {
    setFormData(prev => ({
      ...prev,
      items: [
        ...(prev.items || []),
        { ...EMPTY_ITEM, srNo: (prev.items?.length || 0) + 1 }
      ]
    }));
  };

  const removeItemRow = (index: number) => {
    setFormData(prev => {
      const updated = (prev.items || []).filter((_, i) => i !== index).map((item, idx) => ({
        ...item,
        srNo: idx + 1
      }));
      return { ...prev, items: updated };
    });
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!formData.customerName) {
      errorToast('Customer Name is required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...formData,
        billingAddress: formData.buyerBillingAddress,
        consigneeAddress: formData.consigneeDeliveryAddress
      };
      if (isEdit && id) {
        await updateProductionOrder(id, payload);
        successToast('Production Order saved successfully!');
      } else {
        await createProductionOrder(payload);
        successToast('Production Order saved successfully!');
      }
      navigate('/production-orders');
    } catch (err: any) {
      console.error('Failed to save Production Order:', err);
      errorToast(err.response?.data?.message || 'Failed to save Production Order');
    } finally {
      setSaving(false);
    }
  };

  const handleFinalSubmit = async (statusToSet: string = 'Submitted') => {
    if (!formData.customerName) {
      errorToast('Customer Name is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = { 
        ...formData, 
        billingAddress: formData.buyerBillingAddress,
        consigneeAddress: formData.consigneeDeliveryAddress,
        status: statusToSet 
      };
      if (isEdit && id) {
        await updateProductionOrder(id, payload);
        successToast('Production Order submitted successfully!');
      } else {
        await createProductionOrder(payload);
        successToast('Production Order submitted successfully!');
      }
      navigate('/production-orders');
    } catch (err: any) {
      console.error('Failed to submit Production Order:', err);
      errorToast(err.response?.data?.message || 'Failed to submit Production Order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFormikSubmit = async (values: Partial<ProductionOrder>, statusOverride?: string) => {
    const statusToSet = statusOverride || values.status || 'Draft';
    if (!values.customerName || !values.customerName.trim()) {
      if (formikRef.current) {
        formikRef.current.setFieldTouched('customerName', true, true);
        formikRef.current.setFieldError('customerName', 'Customer Name is required');
      }
      errorToast('Customer Name is required');
      return;
    }

    if (statusOverride === 'Submitted') {
      setSubmitting(true);
    } else {
      setSaving(true);
    }

    try {
      const payload = {
        ...formData,
        ...values,
        billingAddress: values.buyerBillingAddress || formData.buyerBillingAddress,
        consigneeAddress: values.consigneeDeliveryAddress || formData.consigneeDeliveryAddress,
        status: statusToSet
      };
      if (isEdit && id) {
        await updateProductionOrder(id, payload);
        successToast(`Production Order ${statusOverride === 'Submitted' ? 'submitted' : 'saved'} successfully!`);
      } else {
        await createProductionOrder(payload);
        successToast(`Production Order ${statusOverride === 'Submitted' ? 'submitted' : 'saved'} successfully!`);
      }
      navigate('/production-orders');
    } catch (err: any) {
      console.error('Failed to save Production Order:', err);
      errorToast(err.response?.data?.message || 'Failed to save Production Order');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const triggerSaveAction = async (statusOverride?: string) => {
    if (formikRef.current) {
      formikRef.current.setFieldTouched('customerName', true, true);
      const errors = await formikRef.current.validateForm();
      if (errors && Object.keys(errors).length > 0) {
        Object.keys(errors).forEach(key => {
          formikRef.current?.setFieldTouched(key, true, false);
        });
        const firstErrMsg = (errors as any).customerName || Object.values(errors)[0];
        errorToast(typeof firstErrMsg === 'string' ? firstErrMsg : 'Please fix the errors in the form');
        return;
      }
      await handleFormikSubmit(formikRef.current.values, statusOverride || formikRef.current.values.status || 'Draft');
    } else {
      statusOverride === 'Submitted' ? handleFinalSubmit('Submitted') : handleSubmit();
    }
  };

  const calculateGrandTotal = () => {
    const sum = (formData.items || []).reduce((acc, item) => acc + (item.totalAmount || 0), 0);
    return sum.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ERPFormLayout
      title={isEdit ? `Production Order: ${formData.orderNumber || formData.id}` : 'New Production Order'}
      status={formData.status || 'Draft'}
      onSave={() => triggerSaveAction(formikRef.current?.values?.status || 'Draft')}
      onSubmit={() => triggerSaveAction('Submitted')}
      onCancel={() => navigate('/production-orders')}
      saving={saving}
      submitting={submitting}
    >
      <Formik
        innerRef={formikRef}
        initialValues={formData}
        validationSchema={productionOrderValidationSchema}
        onSubmit={(values) => handleFormikSubmit(values)}
        enableReinitialize
      >
        {({ values, errors, touched, setFieldValue, setFieldTouched }) => (
          <Form autoComplete="off" className="space-y-6">

        {/* SECTION 1: Order & Customer Header Information */}
        <FormCard title="1. Order & Customer Info" icon={<FileText className="w-4 h-4 text-primary-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <TextFieldComponent
                name="orderNumber"
                label="Production Order ID"
                value={formData.orderNumber || formData.id || ''}
                onChange={e => setFormData({ ...formData, orderNumber: e.target.value, id: e.target.value })}
                placeholder="e.g. PO/CHE-OIIP/0001/26-27"
              />
            </div>

            <div>
              <TextFieldComponent
                name="orderSheetDate"
                type="date"
                label="Order Sheet Date"
                value={formData.orderSheetDate || ''}
                onChange={e => setFormData({ ...formData, orderSheetDate: e.target.value })}
              />
            </div>

            <div>
              <SelectOutlinedField
                name="customerCategory"
                label="Customer Category"
                value={formData.customerCategory || 'NEW'}
                onChange={(val: any) => setFormData(prev => ({ ...prev, customerCategory: typeof val === 'object' && val?.target ? val.target.value : val }))}
                options={[
                  { label: 'NEW Customer', value: 'NEW' },
                  { label: 'OLD Customer', value: 'OLD' }
                ]}
              />
            </div>

            <div>
              <SelectOutlinedField
                name="customerType"
                label="Customer Type"
                value={formData.customerType || 'USER'}
                onChange={(val: any) => setFormData(prev => ({ ...prev, customerType: typeof val === 'object' && val?.target ? val.target.value : val }))}
                options={[
                  { label: 'USER', value: 'USER' },
                  { label: 'Distributor', value: 'Distributor' },
                  { label: 'Dealer', value: 'Dealer' },
                  { label: 'Exports', value: 'Exports' }
                ]}
              />
            </div>

            <div>
              <TextFieldComponent
                name="state"
                label="State"
                value={formData.state || ''}
                onChange={e => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Tamil Nadu / Gujarat"
              />
            </div>

            <div>
              <TextFieldComponent
                name="city"
                label="City"
                value={formData.city || ''}
                onChange={e => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Kanchipuram / Ahmedabad"
              />
            </div>

            <div>
              <TextFieldComponent
                name="creditDays"
                label="Credit Days"
                value={formData.creditDays || ''}
                onChange={e => setFormData({ ...formData, creditDays: e.target.value })}
                placeholder="e.g. 30 DAYS / 15 DAYS"
              />
            </div>

            <div>
              <TextFieldComponent
                name="piNo"
                label="PI No."
                value={formData.piNo || ''}
                onChange={e => setFormData({ ...formData, piNo: e.target.value })}
                placeholder="e.g. PSPL/04/0811/2026-27"
              />
            </div>

            <div className="md:col-span-2">
              <Autocomplete
                key={formData.id ? `cust_${formData.id}` : 'cust_new'}
                freeSolo
                options={clientOptions}
                getOptionLabel={(option) => typeof option === 'string' ? option : (option as any)?.label || ''}
                value={values.customerName || formData.customerName || ''}
                onBlur={() => {
                  setFieldTouched('customerName', true, true);
                }}
                onInputChange={(_, newInputValue, reason) => {
                  if (reason === 'input') {
                    setFormData(prev => ({ ...prev, customerName: newInputValue }));
                    setFieldValue('customerName', newInputValue);
                    const clean = newInputValue.trim().toLowerCase();
                    const directMatch = clients.find(c => {
                      const name = (c.companyName || c.clientName || c.name || '').trim().toLowerCase();
                      const cityState = [c.city, c.state].filter(Boolean).join(', ').toLowerCase();
                      const fullLabel = cityState ? `${name} (${cityState})` : name;
                      return name === clean || fullLabel === clean;
                    });
                    if (directMatch) {
                      handleSelectClient(directMatch.companyName || directMatch.clientName || directMatch.name || newInputValue);
                    }
                  } else if (reason === 'clear') {
                    setFormData(prev => ({ 
                      ...prev, 
                      customerName: '',
                      buyerBillingAddress: '',
                      consigneeDeliveryAddress: ''
                    }));
                    setFieldValue('customerName', '');
                    setFieldTouched('customerName', true, true);
                  }
                }}
                onChange={(_, newValue) => {
                  const val = typeof newValue === 'string' ? newValue : (newValue ? String(newValue) : '');
                  setFieldValue('customerName', val);
                  setFieldTouched('customerName', true, true);
                  if (val) {
                    handleSelectClient(val);
                  }
                }}
                renderInput={(params) => {
                  const isCustomerTouched = Boolean(
                    touched.customerName || (formikRef.current && formikRef.current.submitCount > 0)
                  );
                  const hasCustomerError = Boolean(
                    isCustomerTouched && (errors.customerName || !values.customerName || !values.customerName.trim())
                  );
                  const customerErrorText = hasCustomerError ? String(errors.customerName || 'Customer Name is required') : '';

                  return (
                    <TextField
                      {...params}
                      label="Customer Name (Buyer) *"
                      placeholder="Search or Select Customer Name..."
                      size="small"
                      error={hasCustomerError}
                      helperText={customerErrorText}
                      slotProps={params.slotProps}
                      sx={{
                        '& .MuiInputLabel-root': {
                          color: '#4b5563',
                          fontWeight: 500,
                          fontSize: '0.875rem',
                          '&.Mui-focused': {
                            color: hasCustomerError ? '#ef4444' : '#059669'
                          },
                          '&.Mui-error': {
                            color: '#ef4444 !important'
                          }
                        },
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '10px',
                          backgroundColor: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          '& fieldset': {
                            borderColor: hasCustomerError ? '#ef4444 !important' : '#e5e7eb'
                          },
                          '&:hover fieldset': {
                            borderColor: hasCustomerError ? '#dc2626 !important' : '#cbd5e1'
                          },
                          '&.Mui-focused fieldset': {
                            borderColor: hasCustomerError ? '#ef4444 !important' : '#059669'
                          },
                          '&.Mui-error fieldset': {
                            borderColor: '#ef4444 !important'
                          },
                          '&.Mui-error:hover fieldset': {
                            borderColor: '#dc2626 !important'
                          },
                          '&.Mui-error.Mui-focused fieldset': {
                            borderColor: '#ef4444 !important'
                          }
                        },
                        '& .MuiOutlinedInput-input': {
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          color: '#111827'
                        },
                        '& .MuiFormHelperText-root': {
                          marginLeft: '4px',
                          marginRight: '4px',
                          marginTop: '4px',
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          '&.Mui-error': {
                            color: '#ef4444 !important'
                          }
                        }
                      }}
                    />
                  );
                }}
              />
            </div>

            <div>
              <TextFieldComponent
                name="contactPerson"
                label="Contact Person"
                value={formData.contactPerson || ''}
                onChange={e => setFormData({ ...formData, contactPerson: e.target.value })}
                placeholder="Contact Person Name"
              />
            </div>

            <div>
              <TextFieldComponent
                name="contactNo"
                label="Contact No."
                value={formData.contactNo || ''}
                onChange={e => setFormData({ ...formData, contactNo: e.target.value })}
                placeholder="Mobile / Phone"
              />
            </div>

            <div className="md:col-span-2">
              <TextFieldComponent
                name="email"
                type="email"
                label="Email ID"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                placeholder="purchase@example.com"
              />
            </div>

            <div>
              <TextFieldComponent
                name="purchaseOrderNo"
                label="Customer PO No."
                value={formData.purchaseOrderNo || ''}
                onChange={e => setFormData({ ...formData, purchaseOrderNo: e.target.value })}
                placeholder="PO Number"
              />
            </div>

            <div>
              <TextFieldComponent
                name="poDate"
                type="date"
                label="PO Date"
                value={formData.poDate || ''}
                onChange={e => setFormData({ ...formData, poDate: e.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <TextFieldComponent
                name="buyerBillingAddress"
                multiline
                rows={2}
                label="Buyer Billing Address"
                value={formData.buyerBillingAddress || ''}
                onChange={e => setFormData({ ...formData, buyerBillingAddress: e.target.value })}
                placeholder="Full Billing Address"
              />
            </div>

            <div className="md:col-span-2">
              <TextFieldComponent
                name="consigneeDeliveryAddress"
                multiline
                rows={2}
                label="Consignee Delivery Address"
                value={formData.consigneeDeliveryAddress || ''}
                onChange={e => setFormData({ ...formData, consigneeDeliveryAddress: e.target.value })}
                placeholder="Full Consignee / Delivery Address"
              />
            </div>

            <div>
              <TextFieldComponent
                name="customerGstin"
                label="Customer GSTIN"
                value={formData.customerGstin || ''}
                onChange={e => setFormData({ ...formData, customerGstin: e.target.value })}
                placeholder="33AACCO1146Q1ZB"
              />
            </div>

            <div>
              <TextFieldComponent
                name="deliveryTerms"
                label="Delivery Terms"
                value={formData.deliveryTerms || ''}
                onChange={e => setFormData({ ...formData, deliveryTerms: e.target.value })}
                placeholder="Door delivery / FOB ANY INDIAN PORT"
              />
            </div>

            <div>
              <TextFieldComponent
                name="dispatchPeriod"
                label="Dispatch Period / Month"
                value={formData.dispatchPeriod || ''}
                onChange={e => setFormData({ ...formData, dispatchPeriod: e.target.value })}
                placeholder="e.g. October Month / 15 Days"
              />
            </div>

            <div>
              <SelectOutlinedField
                name="status"
                label="Status"
                value={formData.status || 'Draft'}
                onChange={(val: any) => setFormData(prev => ({ ...prev, status: typeof val === 'object' && val?.target ? val.target.value : val }))}
                options={[
                  { label: 'Draft', value: 'Draft' },
                  { label: 'Submitted', value: 'Submitted' },
                  { label: 'Approved', value: 'Approved' },
                  { label: 'In Production', value: 'In Production' },
                  { label: 'Dispatched', value: 'Dispatched' },
                  { label: 'Completed', value: 'Completed' }
                ]}
              />
            </div>
          </div>
        </FormCard>

        {/* SECTION 2: Production Specifications & Line Items (Option 1: 2-Tier Item Cards) */}
        <FormCard title="2. Production Specifications & Line Items" icon={<Package className="w-4 h-4 text-primary-600" />}>
          <div className="space-y-4">
            {(formData.items || []).map((item, index) => (
              <div 
                key={index} 
                className="bg-white border border-gray-200/90 hover:border-gray-300 rounded-2xl p-4 sm:p-5 shadow-2xs transition-all space-y-3.5 relative"
              >
                {/* CARD HEADER: ITEM INDEX & QUICK ACTIONS */}
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-800 font-extrabold text-xs flex items-center justify-center border border-emerald-200">
                      #{index + 1}
                    </span>
                    <span className="text-xs font-bold text-gray-800 tracking-tight">
                      Item #{index + 1}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* Item Total Badge */}
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 text-xs font-bold shadow-2xs">
                      <span className="text-[11px] text-emerald-600 font-medium">Item Total:</span>
                      <span>₹{(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {(formData.items?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItemRow(index)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* TIER 1: TECHNICAL & PRODUCTION SPECIFICATIONS */}
                <div>
                  <div className="grid grid-cols-12 gap-3">
                    {/* Item / Strap Spec Search (6 cols) */}
                    <div className="col-span-12 md:col-span-6">
                      <Autocomplete
                        key={item.id ? `strap_${item.id}` : `strap_new_${index}`}
                        freeSolo
                        options={productOptions}
                        getOptionLabel={(option) => typeof option === 'string' ? option : (option as any)?.label || ''}
                        value={item.strapSizeLength || (item as any).sizeLength || ''}
                        onInputChange={(_, newInputValue) => {
                          handleItemChange(index, 'strapSizeLength', newInputValue);
                          const exactMatch = productOptions.find(opt => opt.toLowerCase() === newInputValue.trim().toLowerCase());
                          if (exactMatch) {
                            handleProductSelect(index, exactMatch);
                          }
                        }}
                        onChange={(_, newValue) => {
                          const val = typeof newValue === 'string' ? newValue : (newValue as any)?.label || '';
                          handleItemChange(index, 'strapSizeLength', val);
                          if (val) {
                            handleProductSelect(index, val);
                          }
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Item / Strap Spec (Search)"
                            placeholder="Search SKU, Name..."
                            size="small"
                            slotProps={params.slotProps}
                            sx={{
                              '& .MuiInputLabel-root': {
                                color: '#4b5563',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                '&.Mui-focused': {
                                  color: '#059669'
                                }
                              },
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '10px',
                                backgroundColor: '#ffffff',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#cbd5e1' },
                                '&.Mui-focused fieldset': { borderColor: '#059669' },
                              },
                              '& .MuiOutlinedInput-input': {
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#111827'
                              }
                            }}
                          />
                        )}
                      />
                    </div>

                    {/* BOM / Recipe Search Autocomplete (6 cols) */}
                    <div className="col-span-12 md:col-span-6 flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        {(() => {
                          const currentBomVal = item.bomNumber || item.bomId || '';
                          interface BomOption {
                            label: string;
                            value: string;
                            bomNumber?: string;
                            finishedGoodName?: string;
                          }
                          const bomOptions: BomOption[] = availableBoms.map(b => ({
                            label: `${b.bomNumber} - ${b.finishedGoodName} (₹${b.totalCost || 0})`,
                            value: b.bomNumber || b.id || '',
                            bomNumber: b.bomNumber,
                            finishedGoodName: b.finishedGoodName
                          }));
                          const selectedOption: BomOption | null = bomOptions.find(opt => opt.value === currentBomVal) 
                            || (currentBomVal ? { label: currentBomVal, value: currentBomVal } : null);

                          const handleCreateNewBom = () => {
                            const poId = formData.orderNumber || formData.id || 'NEW-ORDER';
                            const params = new URLSearchParams({
                              poNo: poId,
                              itemSrNo: String(item.srNo || index + 1),
                              productName: item.strapSizeLength || '',
                              color: item.color || '',
                              customer: formData.customerName || '',
                              qty: String(item.noOfArticles || item.qty || 1000),
                              unit: item.unit || 'Rolls',
                              coreSize: item.coreSize || '',
                              surface: item.surface || '',
                              returnUrl: window.location.pathname + window.location.search
                            });
                            navigate(`/bom/new?${params.toString()}`);
                          };

                          return (
                            <Autocomplete
                              key={item.id ? `bom_${item.id}` : `bom_new_${index}`}
                              options={bomOptions}
                              value={selectedOption}
                              getOptionLabel={(option) => typeof option === 'string' ? option : option?.label || ''}
                              isOptionEqualToValue={(option, val) => (option?.value || option) === (val?.value || val)}
                              onChange={(_, newValue: any) => {
                                const selectedVal = newValue?.value || (typeof newValue === 'string' ? newValue : '');
                                handleItemChange(index, 'bomNumber', selectedVal);
                                handleItemChange(index, 'bomId', selectedVal);
                                
                                try {
                                  const poKey = `${formData.orderNumber || formData.id || ''}_${item.srNo || index + 1}`;
                                  const poBomMap = getPoBomMap();
                                  if (selectedVal) {
                                    poBomMap[poKey] = { bomNumber: selectedVal, bomId: selectedVal };
                                  } else {
                                    delete poBomMap[poKey];
                                  }
                                  setPoBomMap(poBomMap);
                                } catch (err) {
                                  console.error(err);
                                }
                              }}
                              slots={{
                                paper: ({ children, ...paperProps }: any) => (
                                  <Paper
                                    {...paperProps}
                                    sx={{
                                      overflow: 'hidden',
                                      borderRadius: '12px',
                                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.06)',
                                      border: '1px solid #e5e7eb'
                                    }}
                                  >
                                    {children}
                                    <div
                                      onMouseDown={(e) => {
                                        e.preventDefault();
                                      }}
                                      onClick={handleCreateNewBom}
                                      className="p-2.5 bg-emerald-50 hover:bg-emerald-100 border-t border-emerald-200 cursor-pointer flex items-center gap-2 text-xs font-bold text-emerald-800 transition-colors select-none"
                                    >
                                      <Plus className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                                      <span>Create New BOM Recipe...</span>
                                    </div>
                                  </Paper>
                                )
                              }}
                              renderOption={(props, option) => {
                                const { key, ...restProps } = props as any;
                                return (
                                  <li
                                    key={key || option.value}
                                    {...restProps}
                                    className="px-3 py-2 text-xs border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
                                  >
                                    <div>
                                      <div className="font-semibold text-gray-800">{option.label}</div>
                                      {option.bomNumber && (
                                        <div className="text-[11px] text-gray-400">Code: {option.bomNumber}</div>
                                      )}
                                    </div>
                                  </li>
                                );
                              }}
                              renderInput={(params) => (
                                <TextField
                                  {...params}
                                  label="BOM / Recipe (Search)"
                                  placeholder="Search Recipe / BOM..."
                                  size="small"
                                  slotProps={params.slotProps}
                                  sx={{
                                    '& .MuiInputLabel-root': {
                                      color: '#4b5563',
                                      fontWeight: 500,
                                      fontSize: '0.875rem',
                                      '&.Mui-focused': {
                                        color: '#059669'
                                      }
                                    },
                                    '& .MuiOutlinedInput-root': {
                                      borderRadius: '10px',
                                      backgroundColor: '#ffffff',
                                      fontSize: '0.875rem',
                                      fontWeight: 500,
                                      '& fieldset': { borderColor: '#e5e7eb' },
                                      '&:hover fieldset': { borderColor: '#cbd5e1' },
                                      '&.Mui-focused fieldset': { borderColor: '#059669' },
                                    },
                                    '& .MuiOutlinedInput-input': {
                                      fontSize: '0.875rem',
                                      fontWeight: 500,
                                      color: '#111827'
                                    }
                                  }}
                                />
                              )}
                            />
                          );
                        })()}
                      </div>

                      {(item.bomNumber || item.bomId) && (
                        <ButtonComponent
                          type="button"
                          variant="soft"
                          color="secondary"
                          onClick={() => navigate(`/bom/${item.bomNumber || item.bomId}`)}
                          className="p-0 h-[40px] w-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                          title="Open & Edit BOM Recipe"
                        >
                          <Layers className="w-4 h-4 text-emerald-700" />
                        </ButtonComponent>
                      )}
                    </div>

                    {/* Colour (3 cols) */}
                    <div className="col-span-6 sm:col-span-3">
                      <SelectOutlinedField
                        label="Colour"
                        value={item.color || ''}
                        onChange={(val: any) => handleItemChange(index, 'color', typeof val === 'object' && val?.target ? val.target.value : val)}
                        options={[
                          { label: 'Select Color', value: '' },
                          { label: 'Green', value: 'Green' },
                          { label: 'Yellow', value: 'Yellow' },
                          { label: 'Blue', value: 'Blue' },
                          { label: 'Black', value: 'Black' },
                          { label: 'Clear', value: 'Clear' },
                          { label: 'White', value: 'White' }
                        ]}
                      />
                    </div>

                    {/* Surface (3 cols) */}
                    <div className="col-span-6 sm:col-span-3">
                      <SelectOutlinedField
                        label="Surface"
                        value={item.surface || ''}
                        onChange={(val: any) => handleItemChange(index, 'surface', typeof val === 'object' && val?.target ? val.target.value : val)}
                        options={[
                          { label: 'Surface', value: '' },
                          { label: 'Smooth', value: 'Smooth' },
                          { label: 'Embossed', value: 'Embossed' },
                          { label: 'Emb', value: 'Emb' }
                        ]}
                      />
                    </div>

                    {/* Core Size (2 cols) */}
                    <div className="col-span-4 sm:col-span-2">
                      <TextFieldComponent
                        label="Core Size"
                        value={item.coreSize || ''}
                        onChange={(e: any) => handleItemChange(index, 'coreSize', e.target.value)}
                        placeholder="406x150"
                      />
                    </div>

                    {/* Mtrs/Roll (2 cols) */}
                    <div className="col-span-4 sm:col-span-2">
                      <TextFieldComponent
                        type="number"
                        label="Mtrs/Roll"
                        value={item.mtrsPerArticles || ''}
                        onChange={(e: any) => handleItemChange(index, 'mtrsPerArticles', Number(e.target.value))}
                        placeholder="Mtrs"
                      />
                    </div>

                    {/* Breaking Load (2 cols) */}
                    <div className="col-span-4 sm:col-span-2">
                      <TextFieldComponent
                        label="Breaking"
                        value={item.breakingLoad || ''}
                        onChange={(e: any) => handleItemChange(index, 'breakingLoad', e.target.value)}
                        placeholder="634 Kg"
                      />
                    </div>
                  </div>
                </div>

                {/* TIER 2: COMMERCIALS, QUANTITIES & PRICING */}
                <div className="bg-slate-50/80 border border-slate-200/80 rounded-xl p-3.5">
                  <div className="grid grid-cols-12 gap-3">
                    {/* Unit (Autocomplete from Master Units) - 3 cols */}
                    <div className="col-span-6 sm:col-span-3">
                      <Autocomplete
                        key={item.id ? `unit_${item.id}` : `unit_new_${index}`}
                        freeSolo
                        options={unitOptions}
                        getOptionLabel={(option) => typeof option === 'string' ? option : (option as any)?.label || ''}
                        value={item.unit || ''}
                        onInputChange={(_, newInputValue) => {
                          handleItemChange(index, 'unit', newInputValue);
                        }}
                        onChange={(_, newValue) => {
                          handleItemChange(index, 'unit', newValue || '');
                        }}
                        renderInput={(params) => (
                          <TextField
                            {...params}
                            label="Unit"
                            placeholder="Unit"
                            size="small"
                            slotProps={params.slotProps}
                            sx={{
                              '& .MuiInputLabel-root': {
                                color: '#4b5563',
                                fontWeight: 500,
                                fontSize: '0.875rem',
                                '&.Mui-focused': {
                                  color: '#059669'
                                }
                              },
                              '& .MuiOutlinedInput-root': {
                                borderRadius: '10px',
                                backgroundColor: '#ffffff',
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                '& fieldset': { borderColor: '#e5e7eb' },
                                '&:hover fieldset': { borderColor: '#cbd5e1' },
                                '&.Mui-focused fieldset': { borderColor: '#059669' },
                              },
                              '& .MuiOutlinedInput-input': {
                                fontSize: '0.875rem',
                                fontWeight: 500,
                                color: '#111827'
                              }
                            }}
                          />
                        )}
                      />
                    </div>

                    {/* Qty - 2 cols */}
                    <div className="col-span-6 sm:col-span-2">
                      <TextFieldComponent
                        type="number"
                        label="Qty"
                        value={item.qty || ''}
                        onChange={(e: any) => handleItemChange(index, 'qty', Number(e.target.value))}
                        placeholder="0"
                      />
                    </div>

                    {/* Pallet Qty - 3 cols */}
                    <div className="col-span-12 sm:col-span-3">
                      <TextFieldComponent
                        label="Pallet Qty"
                        value={item.palletQty || ''}
                        onChange={(e: any) => handleItemChange(index, 'palletQty', e.target.value)}
                        placeholder="24 Rolls - 5 Pallets"
                      />
                    </div>

                    {/* Net Wt. (Kg) - 2 cols */}
                    <div className="col-span-6 sm:col-span-2">
                      <TextFieldComponent
                        type="number"
                        label="Net Wt (Kg)"
                        value={item.netWtOfArticles || ''}
                        onChange={(e: any) => handleItemChange(index, 'netWtOfArticles', Number(e.target.value))}
                      />
                    </div>

                    {/* Total Wt - 2 cols */}
                    <div className="col-span-6 sm:col-span-2">
                      <TextFieldComponent
                        type="number"
                        label="Total Wt"
                        value={item.totalWt || ''}
                        onChange={(e: any) => handleItemChange(index, 'totalWt', Number(e.target.value))}
                      />
                    </div>

                    {/* Rate / Unit - 3 cols */}
                    <div className="col-span-6 sm:col-span-3">
                      <RateInput
                        label="Rate / Unit"
                        value={item.ratePerUnit}
                        onChange={val => handleItemChange(index, 'ratePerUnit', val)}
                      />
                    </div>

                    {/* GST % - 2 cols */}
                    <div className="col-span-6 sm:col-span-2">
                      <TextFieldComponent
                        type="number"
                        label="GST %"
                        value={item.gstPercent !== undefined ? item.gstPercent : 18}
                        onChange={(e: any) => handleItemChange(index, 'gstPercent', Number(e.target.value))}
                      />
                    </div>

                    {/* Freight - 3 cols */}
                    <div className="col-span-12 sm:col-span-3">
                      <SelectOutlinedField
                        label="Freight"
                        value={item.freightTerms || 'PAID'}
                        onChange={(val: any) => handleItemChange(index, 'freightTerms', typeof val === 'object' && val?.target ? val.target.value : val)}
                        options={[
                          { label: 'PAID', value: 'PAID' },
                          { label: 'TO PAY', value: 'TO PAY' },
                          { label: 'EXW', value: 'EXW' }
                        ]}
                      />
                    </div>

                    {/* Total Amt (incl. GST) - 4 cols */}
                    <div className="col-span-12 sm:col-span-4">
                      <TextFieldComponent
                        label="Total Amt (incl. GST)"
                        value={`₹${(item.totalAmount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        disabled
                        sx={{
                          '& .MuiOutlinedInput-input.Mui-disabled': {
                            WebkitTextFillColor: '#047857',
                            fontWeight: 700,
                            textAlign: 'right'
                          },
                          '& .MuiOutlinedInput-root.Mui-disabled': {
                            backgroundColor: '#ecfdf5',
                            '& fieldset': { borderColor: '#a7f3d0' }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            ))}
          </div>

          {/* ADD BUTTON & GRAND TOTAL */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mt-5 pt-3 border-t border-gray-100">
            <ButtonComponent
              type="button"
              variant="soft"
              onClick={addItemRow}
              startIcon={<Plus className="w-4 h-4" strokeWidth={2.5} />}
            >
              Add Line Item
            </ButtonComponent>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              <span className="text-xs text-gray-500 font-semibold">Grand Total Amount (incl. GST):</span>
              <span className="text-base font-extrabold text-emerald-700 bg-emerald-50/90 px-4 py-1.5 rounded-xl border border-emerald-200 shadow-2xs">
                ₹{calculateGrandTotal()}
              </span>
            </div>
          </div>
        </FormCard>

        {/* SECTION 3: Packing, Stacking & Instructions */}
        <FormCard title="3. Packing, Stacking & Instructions" icon={<Layers className="w-4 h-4 text-primary-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <TextFieldComponent
                multiline
                rows={3}
                label="Packing Details (Wrapping, Sticker, Tape, Box, etc.)"
                value={formData.packingDetails || ''}
                onChange={(e: any) => setFormData({ ...formData, packingDetails: e.target.value })}
                placeholder="e.g. OSBC - Strapping Tape - 19 mm, Red Color arrow at end of Roll..."
              />
            </div>

            <div>
              <TextFieldComponent
                multiline
                rows={3}
                label="Stacking Details (Rolls per Pallet, Total Pallets, etc.)"
                value={formData.stackingDetails || ''}
                onChange={(e: any) => setFormData({ ...formData, stackingDetails: e.target.value })}
                placeholder="e.g. Total 20 Pallets, Each Pallet 24 Rolls..."
              />
            </div>

            <div className="md:col-span-2">
              <TextFieldComponent
                multiline
                rows={3}
                label="Remarks / Special Instructions"
                value={formData.remarksSpecialInstructions || formData.remarks || ''}
                onChange={(e: any) => setFormData({ ...formData, remarksSpecialInstructions: e.target.value, remarks: e.target.value })}
                placeholder="e.g. INVOICE DESCRIPTION: As Per Proforma Invoice. Quality Must be produced with 100% PET FLAKES..."
              />
            </div>
          </div>
        </FormCard>

        {/* SECTION 4: Approvals & Financial Status */}
        <FormCard title="4. Approvals & Financial Status" icon={<ShieldCheck className="w-4 h-4 text-primary-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <FormattedAmountInput
              label="N.D Amount (Net Delivery)"
              name="ndAmount"
              value={formData.ndAmount}
              onChange={val => setFormData({ ...formData, ndAmount: val })}
              placeholder="e.g. 1,50,000"
            />

            <FormattedAmountInput
              label="O.D Amount (Overdue)"
              name="odAmount"
              value={formData.odAmount}
              onChange={val => setFormData({ ...formData, odAmount: val })}
              placeholder="e.g. 25,000"
            />

            <FormattedDaysInput
              label="O.D Days"
              name="odDays"
              value={formData.odDays}
              onChange={val => setFormData({ ...formData, odDays: val })}
              placeholder="0"
            />

            <div>
              <TextFieldComponent
                label="Payment Status"
                value={formData.paymentStatus || ''}
                onChange={(e: any) => setFormData({ ...formData, paymentStatus: e.target.value })}
                placeholder="e.g. Pending / Cleared / 30 Days Credit"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Marketing Sign / Name"
                value={formData.marketingApproval || (formData as any).marketing || ''}
                onChange={(e: any) => setFormData({ ...formData, marketingApproval: e.target.value, marketing: e.target.value } as any)}
                placeholder="e.g. Approved by Sales Head"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Production Approval"
                value={formData.productionApproval || (formData as any).production || ''}
                onChange={(e: any) => setFormData({ ...formData, productionApproval: e.target.value, production: e.target.value } as any)}
                placeholder="e.g. Approved by Production Manager"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Logistic Approval"
                value={formData.logisticApproval || (formData as any).logistic || ''}
                onChange={(e: any) => setFormData({ ...formData, logisticApproval: e.target.value, logistic: e.target.value } as any)}
                placeholder="e.g. Approved by Logistics HOD"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Account Approval"
                value={formData.accountApproval || (formData as any).account || ''}
                onChange={(e: any) => setFormData({ ...formData, accountApproval: e.target.value, account: e.target.value } as any)}
                placeholder="e.g. Approved by Finance Head"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Managing Director"
                value={formData.mdApproval || (formData as any).managingDirector || ''}
                onChange={(e: any) => setFormData({ ...formData, mdApproval: e.target.value, managingDirector: e.target.value } as any)}
                placeholder="e.g. Approved by Managing Director"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Authorised Sign"
                value={formData.authorisedSign || ''}
                onChange={(e: any) => setFormData({ ...formData, authorisedSign: e.target.value })}
                placeholder="e.g. Authorised Signatory Name"
              />
            </div>
          </div>
        </FormCard>

        {/* SECTION 5: Dispatch Details */}
        <FormCard title="5. Dispatch & Logistics Details" icon={<Truck className="w-4 h-4 text-primary-600" />}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <TextFieldComponent
                label="Name of Transporter"
                value={formData.transporterName || ''}
                onChange={(e: any) => setFormData({ ...formData, transporterName: e.target.value })}
                placeholder="e.g. V-Trans Logistics / TCI Freight"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Transport GSTIN"
                value={formData.transportGstin || ''}
                onChange={(e: any) => setFormData({ ...formData, transportGstin: e.target.value })}
                placeholder="e.g. 24AAAAA0000A1Z5"
              />
            </div>

            <div>
              <TextFieldComponent
                label="L.R. No."
                value={formData.lrNo || ''}
                onChange={(e: any) => setFormData({ ...formData, lrNo: e.target.value })}
                placeholder="e.g. LR-1029384"
              />
            </div>

            <div>
              <TextFieldComponent
                type="date"
                label="L.R. Date"
                value={formData.lrDate || ''}
                onChange={(e: any) => setFormData({ ...formData, lrDate: e.target.value })}
              />
            </div>

            <div>
              <TextFieldComponent
                label="Vehicle No."
                value={formData.vehicleNo || ''}
                onChange={(e: any) => setFormData({ ...formData, vehicleNo: e.target.value })}
                placeholder="e.g. GJ-04-XX-1234"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Driver Name"
                value={formData.driverName || ''}
                onChange={(e: any) => setFormData({ ...formData, driverName: e.target.value })}
                placeholder="e.g. Driver Full Name"
              />
            </div>

            <div>
              <TextFieldComponent
                label="Mobile No."
                value={formData.mobileNo || ''}
                onChange={(e: any) => setFormData({ ...formData, mobileNo: e.target.value })}
                placeholder="e.g. +91 9876543210"
              />
            </div>

            <div>
              <TextFieldComponent
                type="date"
                label="Dispatch Date"
                value={formData.dispatchDate || ''}
                onChange={(e: any) => setFormData({ ...formData, dispatchDate: e.target.value })}
              />
            </div>

            <div>
              <SelectOutlinedField
                label="Insurance"
                value={formData.insurance || 'NO'}
                onChange={(val: any) => setFormData(prev => ({ ...prev, insurance: typeof val === 'object' && val?.target ? val.target.value : val }))}
                options={[
                  { label: 'YES', value: 'YES' },
                  { label: 'NO', value: 'NO' }
                ]}
              />
            </div>

            <div>
              <SelectOutlinedField
                label="Waybill Part-B"
                value={formData.waybillPartB || 'YES'}
                onChange={(val: any) => setFormData(prev => ({ ...prev, waybillPartB: typeof val === 'object' && val?.target ? val.target.value : val }))}
                options={[
                  { label: 'YES', value: 'YES' },
                  { label: 'NO', value: 'NO' }
                ]}
              />
            </div>
          </div>
        </FormCard>
          </Form>
        )}
      </Formik>
    </ERPFormLayout>
  );
};

export const ProductionOrderFormPage = WithAuth(ProductionOrderFormPageBase, ModuleName.PRODUCTION_ORDERS, Permission.ADD);
export default ProductionOrderFormPage;
