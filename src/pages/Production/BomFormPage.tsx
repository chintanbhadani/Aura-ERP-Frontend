import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Formik, Form, type FormikProps } from 'formik';
import * as Yup from 'yup';
import { ERPFormHeader, ERPFormPageLayout } from '../../components/ERPForm';
import { FormCard } from '../../components/FormCard';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';

const bomValidationSchema = Yup.object().shape({
  finishedGoodName: Yup.string().trim().required('Finished Good Name is required'),
  batchQuantity: Yup.number().typeError('Batch quantity must be a number').min(0.01, 'Batch quantity must be greater than 0').required('Batch quantity is required'),
  uom: Yup.string().required('UOM is required')
});
import { 
  Layers, 
  Plus, 
  Trash2, 
  Package, 
  Sliders,
  Paperclip, 
  Tag, 
  Share2, 
  Calculator,
  FileSpreadsheet,
  ExternalLink,
  CheckCircle2,
  CheckCircle,
  Box,
  Hash,
  Scale
} from 'lucide-react';
import { fetchInventory, fetchProductionOrders, fetchPurchaseOrders, type Product } from '../../services/api';
import { TextFieldComponent, SelectOutlinedField, StandaloneAutocomplete } from '../../components/input/index';
import { successToast, errorToast } from '../../helper/toast';
import Tooltip from '@mui/material/Tooltip';
import { 
  type BomRecord, 
  type BomRawMaterialItem, 
  type RawMaterialOption,
  getStoredBoms, 
  saveStoredBoms, 
  saveOrUpdateBom, 
  saveMultipleBoms, 
  getPoBomMap, 
  setPoBomMap, 
  PRESET_RAW_MATERIALS 
} from './bomStorage';

export interface OrderLineItemOption {
  srNo: number;
  strapSizeLength: string;
  color?: string;
  coreSize?: string;
  surface?: string;
  noOfArticles?: number;
  netWtOfArticles?: number;
  mtrsPerArticles?: number;
  qty?: number;
  unit?: string;
  totalWt?: number;
  bomId?: string;
  bomNumber?: string;
}

export interface ProductionOrderOption {
  id: string; 
  customerName: string;
  finishedGoodName: string;
  finishedGoodSku: string;
  quantity: number;
  uom: string;
  orderItems?: OrderLineItemOption[];
  items?: BomRawMaterialItem[];
}

const BomFormPageBase: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();

  const isEdit = Boolean(id && id !== 'new');

  const [products, setProducts] = useState<Product[]>([]);
  const [activeTab, setActiveTab] = useState<'details' | 'composition' | 'costing' | 'notes'>('details');
  const [dirty, setDirty] = useState(false);
  const [tags, setTags] = useState<string[]>(['MANUFACTURING', 'PET-STRAP']);
  const [newTagInput, setNewTagInput] = useState('');
  const [showAddTag, setShowAddTag] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; url: string; file?: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const formikRef = useRef<FormikProps<any>>(null);

  const [productionOrders, setProductionOrders] = useState<ProductionOrderOption[]>([]);
  const [customRawMaterials, setCustomRawMaterials] = useState<RawMaterialOption[]>([]);

  // Form State - CLEAN INITIAL STATE WITH NO DUMMY VALUES
  const [formData, setFormData] = useState<{
    id: string;
    bomNumber: string;
    productionOrderNo?: string;
    orderItemSrNo?: number;
    customerName?: string;
    finishedGoodName: string;
    finishedGoodSku: string;
    batchQuantity: number;
    uom: string;
    status: 'Active' | 'Draft' | 'Archived';
    remarks: string;
    items: BomRawMaterialItem[];
  }>({
    id: `BOM-${Date.now().toString().slice(-4)}`,
    bomNumber: '',
    productionOrderNo: '',
    orderItemSrNo: undefined,
    customerName: '',
    finishedGoodName: '',
    finishedGoodSku: '',
    batchQuantity: 1000,
    uom: 'KG',
    status: 'Active',
    remarks: '',
    items: [
      {
        id: '1',
        itemCode: '',
        itemName: '',
        quantity: 0,
        uom: 'KG',
        unitCost: 0,
        scrapPercentage: 0,
        totalCost: 0
      }
    ]
  });

  // State holding individual recipes for each Order Item (starts empty, user selects raw materials)
  const [orderItemRecipes, setOrderItemRecipes] = useState<Record<number, BomRawMaterialItem[]>>({
    1: [
      {
        id: '1',
        itemCode: '',
        itemName: '',
        quantity: 0,
        uom: 'KG',
        unitCost: 0,
        scrapPercentage: 0,
        totalCost: 0
      }
    ]
  });

  // Helper to initialize recipes for all items in an order without dummy default values
  const initOrderRecipes = (po: ProductionOrderOption): Record<number, BomRawMaterialItem[]> => {
    const existingList = getStoredBoms();
    const map: Record<number, BomRawMaterialItem[]> = {};

    if (po.orderItems && po.orderItems.length > 0) {
      po.orderItems.forEach(item => {
        const match = existingList.find(b => b.productionOrderNo === po.id && b.orderItemSrNo === item.srNo);
        if (match && match.items && match.items.length > 0) {
          map[item.srNo] = match.items.map(it => ({ ...it }));
        } else {
          // Clean empty row ready for user selection
          map[item.srNo] = [
            {
              id: `rm-${item.srNo}-1`,
              itemCode: '',
              itemName: '',
              quantity: 0,
              uom: 'KG',
              unitCost: 0,
              scrapPercentage: 0,
              totalCost: 0
            }
          ];
        }
      });
    } else {
      map[1] = [
        {
          id: '1',
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        }
      ];
    }
    return map;
  };

  // Load Inventory Products & Production Orders
  useEffect(() => {
    loadProducts();
    loadProductionOrders();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await fetchInventory();
      if (Array.isArray(data)) {
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to load inventory products:', err);
    }
  };

  const loadProductionOrders = async () => {
    try {
      const [prodRes, poRes] = await Promise.allSettled([
        fetchProductionOrders(),
        fetchPurchaseOrders()
      ]);

      const mapped: ProductionOrderOption[] = [];

      // 1. Process Production Orders from API
      if (prodRes.status === 'fulfilled' && Array.isArray(prodRes.value)) {
        prodRes.value.forEach(po => {
          const rawItems = Array.isArray(po.items) && po.items.length > 0 ? po.items : [];
          const orderItems: OrderLineItemOption[] = rawItems.map((it: any, idx: number) => ({
            srNo: it.srNo || idx + 1,
            strapSizeLength: it.strapSizeLength || it.sizeLength || 'PET Strap Standard',
            color: it.color || it.colour || 'Green',
            coreSize: it.coreSize || '',
            surface: it.surface || '',
            noOfArticles: it.noOfArticles ? Number(it.noOfArticles) : 0,
            netWtOfArticles: it.netWtOfArticles ? Number(it.netWtOfArticles) : (it.netWtArticles ? Number(it.netWtArticles) : 0),
            mtrsPerArticles: it.mtrsPerArticles ? Number(it.mtrsPerArticles) : 0,
            qty: it.qty ? Number(it.qty) : (it.quantity ? Number(it.quantity) : 1000),
            unit: it.unit || 'Roll',
            totalWt: it.totalWt ? Number(it.totalWt) : ((Number(it.noOfArticles || 0) * Number(it.netWtOfArticles || 0)) || 1000),
            bomId: it.bomId || it.bomNumber || ''
          }));

          const primaryItem = orderItems[0];
          mapped.push({
            id: po.orderNumber || po.purchaseOrderNo || po.id,
            customerName: po.customerName || 'Unknown Customer',
            finishedGoodName: primaryItem?.strapSizeLength ? `PET Strap ${primaryItem.strapSizeLength} ${primaryItem.color || ''}`.trim() : 'PET Strap Standard',
            finishedGoodSku: primaryItem?.strapSizeLength ? `PET-${primaryItem.strapSizeLength.replace(/[^a-zA-Z0-9]/g, '')}` : 'PET-STD',
            quantity: primaryItem?.noOfArticles || primaryItem?.qty || 1000,
            uom: primaryItem?.unit || 'Rolls',
            orderItems: orderItems
          });
        });
      }

      // 2. Process Purchase Orders from API
      if (poRes.status === 'fulfilled' && Array.isArray(poRes.value)) {
        poRes.value.forEach((po: any) => {
          const poId = po.id || po.poNo || po.orderNumber || po.purchaseOrderNo;
          if (poId && !mapped.some(m => m.id === poId)) {
            mapped.push({
              id: poId,
              customerName: po.supplierName || po.supplier?.name || po.customerName || 'Purchase Order',
              finishedGoodName: po.items?.[0]?.itemName || po.items?.[0]?.productName || 'PET Strap Standard',
              finishedGoodSku: po.items?.[0]?.itemCode || 'PET-STD',
              quantity: po.items?.[0]?.qty || po.items?.[0]?.acceptedQty || 1000,
              uom: po.items?.[0]?.uom || po.items?.[0]?.unit || 'KG',
              items: po.items?.map((it: any, idx: number) => ({
                id: String(idx + 1),
                itemCode: it.itemCode || `RM-${idx + 1}`,
                itemName: it.itemName || it.name || 'Raw Material',
                quantity: Number(it.qty || it.acceptedQty || 100),
                uom: it.uom || 'KG',
                unitCost: Number(it.rate || it.unitCost || 50),
                scrapPercentage: 0,
                totalCost: Number((Number(it.qty || 100) * Number(it.rate || 50)).toFixed(2))
              }))
            });
          }
        });
      }

      const allOrders = mapped;
      setProductionOrders(allOrders);

      // Handle URL query parameters (e.g. /bom/new?poNo=PO-123&itemSrNo=2 or draft POs)
      const urlPoNo = searchParams.get('poNo');
      const urlItemSrNo = searchParams.get('itemSrNo');
      const urlProductName = searchParams.get('productName') || '';
      const urlColor = searchParams.get('color') || '';
      const urlCustomer = searchParams.get('customer') || '';
      const urlQty = Number(searchParams.get('qty')) || 1000;
      const urlUnit = searchParams.get('unit') || 'Rolls';
      const urlCoreSize = searchParams.get('coreSize') || '';
      const urlSurface = searchParams.get('surface') || '';

      if (urlPoNo) {
        let foundPo = allOrders.find(p => p.id === urlPoNo);
        if (!foundPo) {
          // If PO is not in database yet (e.g. drafting new order), synthesize it so user can create BOM immediately
          const syntheticItem: OrderLineItemOption = {
            srNo: Number(urlItemSrNo) || 1,
            strapSizeLength: urlProductName || 'PET Strap Standard',
            color: urlColor || 'Green',
            coreSize: urlCoreSize || '150 x 406',
            surface: urlSurface || 'Embossed',
            qty: urlQty,
            noOfArticles: urlQty,
            unit: urlUnit
          };
          foundPo = {
            id: urlPoNo,
            customerName: urlCustomer || 'Draft Production Order Customer',
            finishedGoodName: urlProductName ? `${urlProductName} ${urlColor ? `- ${urlColor}` : ''}` : 'PET Strap Standard',
            finishedGoodSku: `PET-${(urlProductName || 'STD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`,
            quantity: urlQty,
            uom: urlUnit,
            orderItems: [syntheticItem]
          };
          allOrders.unshift(foundPo);
          setProductionOrders([...allOrders]);
        }

        const recipes = initOrderRecipes(foundPo);
        setOrderItemRecipes(recipes);
        if (urlItemSrNo && foundPo.orderItems && foundPo.orderItems.length > 0) {
          const foundItem = foundPo.orderItems.find(it => it.srNo === Number(urlItemSrNo)) || foundPo.orderItems[0];
          handleSelectOrderItem(foundPo, foundItem, recipes);
        } else {
          handleSelectProductionOrder(foundPo);
        }
      }
    } catch (e) {
      console.error('Failed to load production orders:', e);
      setProductionOrders([]);
    }
  };

  // Select a specific line item from the Production Order
  const handleSelectOrderItem = (
    po: ProductionOrderOption, 
    item: OrderLineItemOption, 
    preloadedRecipes?: Record<number, BomRawMaterialItem[]>
  ) => {
    const currentRecipes = preloadedRecipes || orderItemRecipes;
    let defaultRecipe = currentRecipes[item.srNo];
    
    if (!defaultRecipe || defaultRecipe.length === 0) {
      defaultRecipe = [
        {
          id: `rm-${item.srNo}-1`,
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        }
      ];
      setOrderItemRecipes(prev => ({ ...prev, [item.srNo]: defaultRecipe }));
    }

    const list = getStoredBoms();
    const match = list.find(b => b.productionOrderNo === po.id && b.orderItemSrNo === item.srNo);
    const existingBomNum = match ? match.bomNumber : '';

    const cleanSpec = item.strapSizeLength.replace(/^\[.*?\]\s*\|\s*/, '');
    const cleanSku = item.strapSizeLength.match(/\[(.*?)\]/)?.[1] || 'PSR001';
    const batchQty = item.noOfArticles || item.qty || 1000;

    setFormData(prev => ({
      ...prev,
      productionOrderNo: po.id,
      orderItemSrNo: item.srNo,
      customerName: po.customerName,
      finishedGoodName: `PET Strap ${cleanSpec} - ${item.color || 'Green'} (${item.coreSize || '150x406'})`,
      finishedGoodSku: `${cleanSku}-${(item.color || 'STD').toUpperCase().slice(0, 3)}`,
      batchQuantity: batchQty,
      uom: item.unit === 'Roll' || item.unit === 'NOS' ? 'Rolls' : (item.unit || 'KG'),
      bomNumber: existingBomNum || prev.bomNumber || `BOM/PET/${String(item.srNo).padStart(2, '0')}-${Date.now().toString().slice(-3)}`,
      items: defaultRecipe
    }));
    setDirty(true);
    successToast(
      existingBomNum 
        ? `Loaded existing BOM ${existingBomNum} for Item #${item.srNo} (${item.color})` 
        : `BOM initialized for Order Item #${item.srNo} (${item.color})`
    );
  };

  // Handle PO Selection and Auto-fill BOM fields
  const handleSelectProductionOrder = (po: ProductionOrderOption) => {
    const recipes = initOrderRecipes(po);
    setOrderItemRecipes(recipes);

    if (po.orderItems && po.orderItems.length > 0) {
      handleSelectOrderItem(po, po.orderItems[0], recipes);
    } else {
      setFormData(prev => ({
        ...prev,
        productionOrderNo: po.id,
        orderItemSrNo: 1,
        customerName: po.customerName,
        finishedGoodName: po.finishedGoodName,
        finishedGoodSku: po.finishedGoodSku,
        batchQuantity: po.quantity || 1000,
        uom: po.uom || 'KG',
        items: recipes[1] || prev.items
      }));
      setDirty(true);
      successToast(`BOM auto-filled from Production Order ${po.id}`);
    }
  };

  const handleClearPoSelection = () => {
    setFormData(prev => ({
      ...prev,
      productionOrderNo: '',
      orderItemSrNo: undefined,
      customerName: ''
    }));
    setOrderItemRecipes({
      1: [
        {
          id: '1',
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        }
      ]
    });
    setDirty(true);
  };

  // Load existing BOM if editing
  useEffect(() => {
    if (isEdit && id) {
      const list = getStoredBoms();
      const found = list.find(b => b.id === id || b.bomNumber === id);
      if (found) {
        setFormData({
          id: found.id,
          bomNumber: found.bomNumber,
          productionOrderNo: found.productionOrderNo || '',
          orderItemSrNo: found.orderItemSrNo || 1,
          customerName: found.customerName || '',
          finishedGoodName: found.finishedGoodName,
          finishedGoodSku: found.finishedGoodSku || '',
          batchQuantity: found.batchQuantity,
          uom: found.uom,
          status: found.status as any,
          remarks: found.remarks || '',
          items: found.items.map(it => ({ ...it }))
        });

        // Initialize recipes for ALL items belonging to this production order
        const poId = found.productionOrderNo;
        let currentPO = poId 
          ? productionOrders.find(p => p.id === poId)
          : null;

        // If not found in fetched production orders, reconstruct from saved BOMs for this order
        if (!currentPO && poId) {
          const siblingBoms = list.filter(b => b.productionOrderNo === poId);
          if (siblingBoms.length > 0) {
            currentPO = {
              id: poId,
              customerName: found.customerName || siblingBoms[0]?.customerName || 'Customer',
              finishedGoodName: found.finishedGoodName,
              finishedGoodSku: found.finishedGoodSku || '',
              quantity: found.batchQuantity,
              uom: found.uom,
              orderItems: siblingBoms.map(b => ({
                srNo: b.orderItemSrNo || 1,
                strapSizeLength: b.finishedGoodName,
                color: b.finishedGoodName.includes('Yellow') ? 'Yellow' : (b.finishedGoodName.includes('Green') ? 'Green' : 'Standard'),
                coreSize: '150 x 406',
                surface: 'Embossed',
                qty: b.batchQuantity,
                noOfArticles: b.batchQuantity,
                unit: b.uom
              }))
            };
            setProductionOrders(prev => prev.some(p => p.id === poId) ? prev : [currentPO!, ...prev]);
          }
        }

        const allItemRecipes: Record<number, BomRawMaterialItem[]> = {};

        const filterDummyItems = (items?: BomRawMaterialItem[]): BomRawMaterialItem[] => {
          if (!items || !Array.isArray(items)) return [];
          const res = items.filter(it => !(
            (it.itemName?.includes('UV Stabilizer') || it.itemName?.includes('Slip & Anti-block') || it.itemCode === 'RM-ADD-STB' || it.itemCode === 'RM-ADD-SLP') &&
            Number(it.unitCost || 0) === 0
          ));
          return res.length > 0 ? res.map(it => ({ ...it })) : [];
        };

        if (currentPO && currentPO.orderItems && currentPO.orderItems.length > 0) {
          currentPO.orderItems.forEach(item => {
            if (item.srNo === (found.orderItemSrNo || 1)) {
              const cleanedFound = filterDummyItems(found.items);
              allItemRecipes[item.srNo] = cleanedFound.length > 0 ? cleanedFound : [
                {
                  id: `rm-${item.srNo}-1`,
                  itemCode: '',
                  itemName: '',
                  quantity: 0,
                  uom: 'KG',
                  unitCost: 0,
                  scrapPercentage: 0,
                  totalCost: 0
                }
              ];
            } else {
              // Check if a BOM exists in storage for this sibling line item
              const siblingBom = list.find(b => b.productionOrderNo === poId && b.orderItemSrNo === item.srNo);
              const cleanedSibling = siblingBom ? filterDummyItems(siblingBom.items) : [];
              if (cleanedSibling.length > 0) {
                allItemRecipes[item.srNo] = cleanedSibling;
              } else {
                allItemRecipes[item.srNo] = [
                  {
                    id: `rm-${item.srNo}-1`,
                    itemCode: '',
                    itemName: '',
                    quantity: 0,
                    uom: 'KG',
                    unitCost: 0,
                    scrapPercentage: 0,
                    totalCost: 0
                  }
                ];
              }
            }
          });
        } else {
          const cleanedFound = filterDummyItems(found.items);
          allItemRecipes[found.orderItemSrNo || 1] = cleanedFound.length > 0 ? cleanedFound : [
            {
              id: `rm-${found.orderItemSrNo || 1}-1`,
              itemCode: '',
              itemName: '',
              quantity: 0,
              uom: 'KG',
              unitCost: 0,
              scrapPercentage: 0,
              totalCost: 0
            }
          ];
        }

        setOrderItemRecipes(allItemRecipes);

        if (found.attachments && Array.isArray(found.attachments)) {
          setAttachments(found.attachments.map(a => ({ name: a.name, url: a.url })));
        }
        if (found.tags && Array.isArray(found.tags)) {
          setTags(found.tags);
        }
      }
    }
  }, [id, isEdit, productionOrders]);

  // Combine preset raw materials + fetched products + custom added materials for autocomplete catalog
  const availableRawMaterials = useMemo(() => {
    const list = [...PRESET_RAW_MATERIALS, ...customRawMaterials];
    products.forEach(p => {
      if (!list.some(item => item.itemCode === p.sku || item.itemName === p.name)) {
        list.push({
          itemCode: p.sku || `ITEM-${p.id}`,
          itemName: p.name,
          uom: p.unit?.name || 'KG',
          unitCost: p.cost_price || 50
        });
      }
    });
    return list;
  }, [products, customRawMaterials]);

  // Memoized finished product options for autocomplete in Basic Information
  const availableFinishedProducts = useMemo(() => {
    const list: { id: string; name: string; sku: string; uom: string }[] = [];
    products.forEach(p => {
      if (p.name && !list.some(item => item.name === p.name)) {
        list.push({
          id: String(p.id),
          name: p.name,
          sku: p.sku || '',
          uom: p.unit?.name || 'Rolls'
        });
      }
    });
    productionOrders.forEach(po => {
      if (po.finishedGoodName && !list.some(item => item.name === po.finishedGoodName)) {
        list.push({
          id: String(po.id),
          name: po.finishedGoodName,
          sku: po.finishedGoodSku || '',
          uom: po.uom || 'Rolls'
        });
      }
    });
    return list;
  }, [products, productionOrders]);

  // Live Costing Calculations
  const liveTotalCost = useMemo(() => {
    return Object.values(orderItemRecipes).reduce((sum, list) => {
      return sum + list.reduce((s, it) => s + (it.totalCost || 0), 0);
    }, 0);
  }, [orderItemRecipes]);

  const liveCostPerUnit = useMemo(() => {
    const currentPO = productionOrders.find(p => p.id === formData.productionOrderNo);
    let totalQty = formData.batchQuantity;
    if (currentPO?.orderItems && currentPO.orderItems.length > 0) {
      totalQty = currentPO.orderItems.reduce((sum, it) => sum + (it.noOfArticles || it.qty || 0), 0);
    }
    return totalQty > 0 ? liveTotalCost / totalQty : 0;
  }, [liveTotalCost, orderItemRecipes, productionOrders, formData.productionOrderNo, formData.batchQuantity]);

  const totalRawMaterialsCount = useMemo(() => {
    return Object.values(orderItemRecipes).reduce((acc, curr) => acc + curr.length, 0);
  }, [orderItemRecipes]);

  // Add Item Row for specific Order Item (default: 1)
  const handleAddRawMaterialRow = (srNo: number = 1) => {
    const newItem: BomRawMaterialItem = {
      id: `rm-${srNo}-${Date.now()}`,
      itemCode: '',
      itemName: '',
      quantity: 0,
      uom: 'KG',
      unitCost: 0,
      scrapPercentage: 0,
      totalCost: 0
    };
    setOrderItemRecipes(prev => {
      const existing = (prev[srNo] && prev[srNo].length > 0) ? prev[srNo] : [];
      return {
        ...prev,
        [srNo]: [...existing, newItem]
      };
    });
    setDirty(true);
  };

  // Remove Item Row for specific Order Item (maintains at least 1 row)
  const handleRemoveRawMaterialRow = (srNo: number, index: number) => {
    setOrderItemRecipes(prev => {
      const filtered = (prev[srNo] || []).filter((_, i) => i !== index);
      const list = filtered.length > 0 ? filtered : [
        {
          id: `rm-${srNo}-1`,
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        }
      ];
      return {
        ...prev,
        [srNo]: list
      };
    });
    setDirty(true);
  };

  // Update Item Row Field for specific Order Item
  const handleUpdateItemRow = (srNo: number, index: number, key: keyof BomRawMaterialItem, val: any) => {
    setOrderItemRecipes(prev => {
      const list = (prev[srNo] && prev[srNo].length > 0) ? [...prev[srNo]] : [
        {
          id: `rm-${srNo}-1`,
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        }
      ];
      if (!list[index]) {
        list[index] = {
          id: `rm-${srNo}-${index + 1}`,
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        };
      }
      const item = { ...list[index], [key]: val };
      const qty = Number(item.quantity) || 0;
      const cost = Number(item.unitCost) || 0;
      const scrap = Number(item.scrapPercentage) || 0;
      item.totalCost = Number((qty * cost * (1 + scrap / 100)).toFixed(2));
      list[index] = item;
      return { ...prev, [srNo]: list };
    });
    setDirty(true);
  };

  // Select Autocomplete Option for specific Order Item
  const handleSelectRawMaterial = (srNo: number, index: number, mat: RawMaterialOption) => {
    setOrderItemRecipes(prev => {
      const list = (prev[srNo] && prev[srNo].length > 0) ? [...prev[srNo]] : [
        {
          id: `rm-${srNo}-1`,
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        }
      ];
      if (!list[index]) {
        list[index] = {
          id: `rm-${srNo}-${index + 1}`,
          itemCode: '',
          itemName: '',
          quantity: 0,
          uom: 'KG',
          unitCost: 0,
          scrapPercentage: 0,
          totalCost: 0
        };
      }
      const existingQty = Number(list[index]?.quantity) || 0;
      const qty = existingQty;
      const scrap = Number(list[index]?.scrapPercentage) || 0;
      const totalCost = Number((qty * (mat.unitCost || 0) * (1 + scrap / 100)).toFixed(2));

      list[index] = {
        ...list[index],
        itemCode: mat.itemCode,
        itemName: mat.itemName,
        uom: mat.uom || 'KG',
        unitCost: mat.unitCost || 0,
        quantity: qty,
        totalCost: totalCost
      };
      return { ...prev, [srNo]: list };
    });
    setDirty(true);
  };

  // Create new raw material on the fly if not found in catalog
  const handleCreateRawMaterial = async (srNo: number, index: number, name: string): Promise<RawMaterialOption> => {
    const cleanName = name.trim();
    const skuCode = `RM-${cleanName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toUpperCase() || 'MAT'}-${Date.now().toString().slice(-3)}`;
    const newMat: RawMaterialOption = {
      itemCode: skuCode,
      itemName: cleanName,
      uom: 'KG',
      unitCost: 0
    };
    setCustomRawMaterials(prev => [newMat, ...prev]);
    handleSelectRawMaterial(srNo, index, newMat);
    successToast(`Added new raw material "${cleanName}" (${skuCode})`);
    return newMat;
  };

  // Save BOM (supports saving distinct recipes for all order items in PO, or standalone BOM)
  const handleSave = (formValues?: any) => {
    const activeValues = formValues ? { ...formData, ...formValues } : formData;
    const now = new Date().toISOString();
    const resolvedFgName = (activeValues.finishedGoodName || '').trim() || 
      (activeValues.bomNumber ? `BOM - ${activeValues.bomNumber.trim()}` : '') ||
      (activeValues.productionOrderNo ? `PO ${activeValues.productionOrderNo} Formulation` : 'PET Strap Standard Formulation');

    const currentPO = productionOrders.find(p => p.id === activeValues.productionOrderNo);
    const hasOrderItems = Boolean(currentPO && currentPO.orderItems && currentPO.orderItems.length > 0);

    const existingList = getStoredBoms();

    if (hasOrderItems && currentPO?.orderItems) {
      // Save or update BOM for each individual order item in this PO
      const bomsToSave: BomRecord[] = currentPO.orderItems.map(item => {
        const itemRecipe = orderItemRecipes[item.srNo] || [
          {
            id: `rm-${item.srNo}-1`,
            itemCode: '',
            itemName: '',
            quantity: 0,
            uom: 'KG',
            unitCost: 0,
            scrapPercentage: 0,
            totalCost: 0
          }
        ];
        const itemTotalCost = itemRecipe.reduce((sum, it) => sum + (it.totalCost || 0), 0);
        const batchQty = item.noOfArticles || item.qty || 1000;
        const itemCostPerUnit = batchQty > 0 ? itemTotalCost / batchQty : 0;
        const cleanSpec = item.strapSizeLength.replace(/^\[.*?\]\s*\|\s*/, '');
        const cleanSku = item.strapSizeLength.match(/\[(.*?)\]/)?.[1] || 'PSR001';

        const existingItemBom = existingList.find(b => b.productionOrderNo === currentPO.id && b.orderItemSrNo === item.srNo);
        const itemBomId = existingItemBom?.id || (activeValues.orderItemSrNo === item.srNo ? activeValues.id : `BOM-${Date.now()}-${item.srNo}`);
        const itemBomNumber = existingItemBom?.bomNumber || (activeValues.orderItemSrNo === item.srNo && activeValues.bomNumber.trim() ? activeValues.bomNumber.trim() : `BOM/PET/${String(item.srNo).padStart(2, '0')}-${Date.now().toString().slice(-3)}`);
        const itemFinishedGoodName = `PET Strap ${cleanSpec} - ${item.color || 'Standard'} (${item.coreSize || '150x406'})`;

        return {
          id: itemBomId,
          bomNumber: itemBomNumber,
          productionOrderNo: currentPO.id,
          orderItemSrNo: item.srNo,
          customerName: currentPO.customerName,
          finishedGoodName: itemFinishedGoodName,
          finishedGoodSku: `${cleanSku}-${(item.color || 'STD').toUpperCase().slice(0, 3)}`,
          batchQuantity: batchQty,
          uom: item.unit === 'Roll' || item.unit === 'NOS' ? 'Rolls' : (item.unit || 'KG'),
          status: activeValues.status,
          remarks: activeValues.remarks,
          items: itemRecipe,
          attachments: attachments.map(a => ({ name: a.name, url: a.url })),
          tags: tags,
          totalCost: Number(itemTotalCost.toFixed(2)),
          costPerUnit: Number(itemCostPerUnit.toFixed(2)),
          createdAt: existingItemBom?.createdAt || now,
          updatedAt: now
        };
      });

      saveMultipleBoms(bomsToSave);
      successToast(`Saved BOM recipes for all ${currentPO.orderItems.length} order items in ${currentPO.id}`);
    } else {
      // Standalone single BOM
      const rawRecipe = orderItemRecipes[1] || activeValues.items || [];
      const cleanRecipe = rawRecipe.filter(it => (it.itemName && it.itemName.trim() !== '') || (it.itemCode && it.itemCode.trim() !== '') || (it.quantity && it.quantity > 0));
      const singleRecipe = cleanRecipe;

      const singleTotalCost = singleRecipe.reduce((sum, it) => sum + (it.totalCost || 0), 0);
      const singleCostPerUnit = activeValues.batchQuantity > 0 ? singleTotalCost / activeValues.batchQuantity : 0;
      const finalBomNumber = activeValues.bomNumber.trim() || `BOM/PET/${Math.floor(100 + Math.random() * 900)}`;

      const bomRecord: BomRecord = {
        id: activeValues.id,
        bomNumber: finalBomNumber,
        productionOrderNo: activeValues.productionOrderNo,
        orderItemSrNo: activeValues.orderItemSrNo || 1,
        customerName: activeValues.customerName,
        finishedGoodName: resolvedFgName,
        finishedGoodSku: activeValues.finishedGoodSku || `PET-${resolvedFgName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8).toUpperCase()}`,
        batchQuantity: activeValues.batchQuantity,
        uom: activeValues.uom,
        status: activeValues.status,
        remarks: activeValues.remarks,
        items: singleRecipe,
        attachments: attachments.map(a => ({ name: a.name, url: a.url })),
        tags: tags,
        totalCost: Number(singleTotalCost.toFixed(2)),
        costPerUnit: Number(singleCostPerUnit.toFixed(2)),
        createdAt: isEdit ? (existingList.find(b => b.id === activeValues.id)?.createdAt || now) : now,
        updatedAt: now
      };

      saveOrUpdateBom(bomRecord);
      successToast(isEdit ? 'Bill of Material (BOM) updated successfully' : 'New Bill of Material (BOM) created successfully');
    }

    setDirty(false);

    const returnUrl = searchParams.get('returnUrl');
    if (returnUrl) {
      navigate(returnUrl);
    } else {
      navigate('/bom');
    }
  };

  // Duplicate BOM
  const handleDuplicate = () => {
    const copyNum = `${formData.bomNumber}-COPY`;
    setFormData(prev => ({
      ...prev,
      id: `BOM-${Date.now().toString().slice(-4)}`,
      bomNumber: copyNum
    }));
    successToast('BOM duplicated into new draft recipe');
    setDirty(true);
  };

  // Add Tag
  const handleAddTag = () => {
    if (newTagInput.trim() && !tags.includes(newTagInput.trim().toUpperCase())) {
      setTags(prev => [...prev, newTagInput.trim().toUpperCase()]);
      setNewTagInput('');
      setShowAddTag(false);
    }
  };

  // Remove Tag
  const handleRemoveTag = (tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  };

  return (
    <ERPFormPageLayout
      breadcrumb={
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <span className="hover:text-emerald-700 cursor-pointer" onClick={() => navigate('/stock')}>Stock</span>
          <span>/</span>
          <span className="hover:text-emerald-700 cursor-pointer" onClick={() => navigate('/bom')}>Bill of Materials</span>
          <span>/</span>
          <span className="text-gray-900 font-bold">{isEdit ? (formData.bomNumber || 'BOM Details') : 'New BOM'}</span>
        </div>
      }
      recordCode={isEdit ? formData.bomNumber : undefined}
      header={
        <ERPFormHeader
          title={
            isEdit
              ? (formData.finishedGoodName ? `${formData.bomNumber} - ${formData.finishedGoodName}` : formData.bomNumber || 'BOM Details')
              : (formData.finishedGoodName ? `New BOM - ${formData.finishedGoodName}` : 'New Bill of Materials')
          }
          onBack={() => navigate('/bom')}
          backTitle="Back to BOM List"
          dirty={dirty}
          saveLabel={isEdit ? 'Save BOM' : 'Create BOM'}
          onSave={async () => {
            if (formikRef.current) {
              formikRef.current.setFieldTouched('finishedGoodName', true, true);
              const errors = await formikRef.current.validateForm();
              if (errors && Object.keys(errors).length > 0) {
                Object.keys(errors).forEach(key => formikRef.current?.setFieldTouched(key, true, false));
                const firstErr = (errors as any).finishedGoodName || Object.values(errors)[0];
                errorToast(typeof firstErr === 'string' ? firstErr : 'Please fix the errors in the form');
                return;
              }
              formikRef.current.submitForm();
            } else {
              handleSave();
            }
          }}
          onDuplicate={handleDuplicate}
          statusBadge={{
            label: formData.status,
            variant: formData.status === 'Active' ? 'success' : formData.status === 'Draft' ? 'warning' : 'gray'
          }}
        />
      }
      sidebar={
        <div className="space-y-5">
          {/* ICON / PREVIEW CARD */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-2xs text-center space-y-3">
            <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white flex items-center justify-center font-black text-2xl shadow-md border-4 border-white">
              BM
            </div>
            <div>
              <Tooltip title={formData.finishedGoodName || 'Untitled BOM Product'} arrow placement="top">
                <h4 className="font-extrabold text-sm text-gray-900 truncate cursor-default">
                  {formData.finishedGoodName || 'Untitled BOM Product'}
                </h4>
              </Tooltip>
              <p className="text-xs text-emerald-700 font-bold mt-0.5">{formData.bomNumber || (isEdit ? '' : 'Auto-generated on save')}</p>
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
              <span>Batch Size:</span>
              <span className="font-extrabold text-gray-900">{formData.batchQuantity} {formData.uom}</span>
            </div>
            {formData.productionOrderNo && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Linked PO:</span>
                <span className="font-black text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">{formData.productionOrderNo}</span>
              </div>
            )}
          </div>

          {/* ATTACHMENTS & TAGS CARD */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-4 shadow-2xs space-y-4 text-xs">
            {/* Attachments */}
            <div>
              <div className="flex items-center justify-between font-bold text-gray-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <Paperclip className="w-3.5 h-3.5 text-gray-500" />
                  Attachments {attachments.length > 0 && `(${attachments.length})`}
                </span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer"
                >
                  + Upload
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    const newItems = Array.from(files).map(f => ({
                      name: f.name,
                      url: URL.createObjectURL(f),
                      file: f
                    }));
                    setAttachments(prev => [...prev, ...newItems]);
                    setDirty(true);
                    e.target.value = '';
                  }}
                />
              </div>
              {attachments.length === 0 ? (
                <p className="text-[11px] text-gray-400">No technical spec documents attached.</p>
              ) : (
                <div className="space-y-1.5 mt-2">
                  {attachments.map((att, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 border border-gray-200 px-2.5 py-1.5 rounded-xl text-[11px] text-gray-700 font-medium">
                      <a
                        href={att.url || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="truncate hover:text-emerald-700 hover:underline flex items-center gap-1.5 max-w-[170px]"
                        title={att.name}
                      >
                        <Paperclip className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate">{att.name}</span>
                        {att.url && att.url !== '#' && <ExternalLink className="w-3 h-3 text-gray-400 shrink-0" />}
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setAttachments(prev => prev.filter((_, i) => i !== index));
                          setDirty(true);
                        }}
                        className="text-gray-400 hover:text-red-600 font-bold pl-1 cursor-pointer"
                        title="Remove attachment"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tags */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between font-bold text-gray-700 mb-2">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-gray-500" />
                  Tags
                </span>
                <button 
                  type="button" 
                  onClick={() => setShowAddTag(!showAddTag)}
                  className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer"
                >
                  + Add Tag
                </button>
              </div>

              {showAddTag && (
                <div className="flex gap-1 mb-2">
                  <input
                    type="text"
                    placeholder="Enter tag..."
                    value={newTagInput}
                    onChange={e => setNewTagInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                    className="w-full bg-gray-50 border border-gray-300 rounded px-2 py-0.5 text-xs outline-none"
                  />
                  <button type="button" onClick={handleAddTag} className="px-2 py-0.5 bg-emerald-600 text-white rounded font-bold text-[10px]">Add</button>
                </div>
              )}

              <div className="flex flex-wrap gap-1.5">
                {tags.map(t => (
                  <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-700 font-bold rounded text-[10px] border border-gray-200">
                    {t}
                    <button type="button" onClick={() => handleRemoveTag(t)} className="text-gray-400 hover:text-red-600">✕</button>
                  </span>
                ))}
              </div>
            </div>

            {/* Share Link */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
              <span className="flex items-center gap-1.5 font-bold text-gray-700">
                <Share2 className="w-3.5 h-3.5 text-gray-500" />
                Share
              </span>
              <button 
                type="button" 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  successToast('BOM page link copied to clipboard');
                }}
                className="text-emerald-700 hover:underline font-bold text-[11px] cursor-pointer"
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      }
    >
      {/* MAIN FORM CONTENT CARD WITH TABS */}
      <Formik
        innerRef={formikRef}
        initialValues={formData}
        validationSchema={bomValidationSchema}
        onSubmit={(values) => handleSave(values)}
        enableReinitialize
      >
        {({ values, errors, touched, setFieldValue, setFieldTouched }) => (
          <Form id="bom-form" autoComplete="off">
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-2xs overflow-hidden">
        
        {/* FORM NAVIGATION TABS */}
        <div className="flex items-center gap-2 px-6 pt-4 border-b border-gray-200 overflow-x-auto bg-gray-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('details')}
            className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'details'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Details
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('composition')}
            className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'composition'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Raw Material Composition ({totalRawMaterialsCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('costing')}
            className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'costing'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Costing & Economics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2.5 text-xs font-black border-b-2 transition-all cursor-pointer ${
              activeTab === 'notes'
                ? 'border-emerald-600 text-emerald-700 bg-white rounded-t-xl'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            Notes & Remarks
          </button>
        </div>

        {/* TAB 1: DETAILS */}
        {activeTab === 'details' && (
          <div className="p-6 space-y-6">
            <FormCard title="Basic Information" icon={<Layers className="w-4 h-4 text-emerald-600" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* PRODUCTION ORDER AUTOCOMPLETE SELECTOR */}
                <div className="md:col-span-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] text-gray-500 font-medium">
                      Select Production Order to automatically load recipe & order items
                    </span>
                    <span className="text-[10px] text-emerald-800 font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Auto-populates BOM as per PO
                    </span>
                  </div>

                  <StandaloneAutocomplete<ProductionOrderOption>
                    label="Select Production Order (PO / SO) *"
                    startIcon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}
                    value={productionOrders.find(p => p.id === formData.productionOrderNo) || null}
                    onChange={(po: ProductionOrderOption | null) => {
                      if (po) {
                        handleSelectProductionOrder(po);
                      } else {
                        handleClearPoSelection();
                      }
                    }}
                    options={productionOrders}
                    getOptionLabel={(po: ProductionOrderOption) => `${po.id} - ${po.customerName} (${po.finishedGoodName})`}
                    renderOptionLabel={(po: ProductionOrderOption) => (
                      <div className="flex items-center justify-between w-full py-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-emerald-800 font-mono">{po.id}</span>
                          <span className="text-gray-400">•</span>
                          <span className="font-bold text-gray-900">{po.customerName}</span>
                          <span className="text-[11px] text-gray-500">
                            ({po.orderItems && po.orderItems.length > 1 ? `${po.orderItems.length} order items` : po.finishedGoodName})
                          </span>
                        </div>
                        <div className="text-right text-[11px] font-black text-emerald-800 ml-3">
                          {po.quantity} {po.uom}
                        </div>
                      </div>
                    )}
                    placeholder="Search & select Production Order by PO Number or Customer..."
                    size="small"
                  />
                </div>

                {/* MULTI-ITEM ORDER SELECTOR: WHEN PO HAS LINE ITEMS */}
                {(() => {
                  const currentPO = productionOrders.find(p => p.id === formData.productionOrderNo);
                  if (!currentPO || !currentPO.orderItems || currentPO.orderItems.length === 0) return null;

                  return (
                    <div className="md:col-span-2 bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-200 rounded-2xl p-4 space-y-3 shadow-2xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                            <Box className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-sm text-emerald-950">
                              Production Order Line Items ({currentPO.orderItems.length} items in {currentPO.id})
                            </h4>
                            <p className="text-[11px] text-emerald-800 font-medium">
                              Each order item has its own separate raw material composition table below:
                            </p>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-800 bg-white px-2.5 py-0.5 rounded-full border border-emerald-300 shadow-2xs">
                          {currentPO.orderItems.length} Separate Recipe Tables Configured
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {currentPO.orderItems.map((item) => {
                          const isSelected = formData.orderItemSrNo === item.srNo;
                          const savedBoms = getStoredBoms();
                          const existingBom = savedBoms.find(
                            b => b.productionOrderNo === currentPO.id && b.orderItemSrNo === item.srNo
                          );
                          const recipeItems = orderItemRecipes[item.srNo] || [];
                          const itemTotal = recipeItems.reduce((s, it) => s + (it.totalCost || 0), 0);

                          return (
                            <div
                              key={item.srNo}
                              onClick={() => {
                                handleSelectOrderItem(currentPO, item);
                                if (activeTab !== 'details' && activeTab !== 'composition') {
                                  setActiveTab('composition');
                                }
                                setTimeout(() => {
                                  const tableEl = document.getElementById(`order-item-table-${item.srNo}`);
                                  if (tableEl) {
                                    tableEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                  }
                                }, 100);
                              }}
                              className={`p-3.5 rounded-xl border transition-all cursor-pointer relative ${
                                isSelected
                                  ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                                  : 'bg-white/80 border-gray-200 hover:border-emerald-300 hover:bg-white shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-start gap-2.5">
                                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center font-black text-xs shrink-0 mt-0.5 ${
                                    isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-gray-100 text-gray-700'
                                  }`}>
                                    {item.srNo}
                                  </span>
                                  <div>
                                    <div className="font-extrabold text-xs text-gray-900 leading-snug">
                                      {item.strapSizeLength}
                                    </div>
                                    <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black border ${
                                        item.color?.toLowerCase() === 'yellow' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                                        item.color?.toLowerCase() === 'green' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' :
                                        item.color?.toLowerCase() === 'black' ? 'bg-slate-800 text-white border-slate-900' :
                                        'bg-gray-100 text-gray-800 border-gray-300'
                                      }`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                        {item.color || 'Standard'}
                                      </span>
                                      {item.coreSize && (
                                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-medium">
                                          Core: {item.coreSize}
                                        </span>
                                      )}
                                      {item.surface && (
                                        <span className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 font-medium">
                                          {item.surface}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="text-right shrink-0">
                                  <div className="font-black text-xs text-emerald-900">
                                    {(item.noOfArticles || item.qty || 0).toLocaleString()} {item.unit || 'Rolls'}
                                  </div>
                                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5">
                                    ₹{itemTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                  </div>
                                </div>
                              </div>

                              <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between text-[11px]">
                                {existingBom ? (
                                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Recipe: <strong>{existingBom.bomNumber}</strong></span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 font-semibold text-[11px]">
                                    • {recipeItems.length} Materials configured
                                  </span>
                                )}

                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 hover:underline">
                                  Scroll to Table ↓
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                <TextFieldComponent
                  label="BOM Number / Code (Auto-generated if left empty)"
                  placeholder="e.g. BOM/PET/001 (Auto-generated on save)"
                  startIcon={<Hash className="w-3.5 h-3.5 text-emerald-600" />}
                  value={formData.bomNumber}
                  onChange={(e: any) => {
                    setFormData({ ...formData, bomNumber: e.target.value });
                    setDirty(true);
                  }}
                />

                <div>
                  <StandaloneAutocomplete<{ id: string; name: string; sku: string; uom: string }>
                    label="Finished Product Name *"
                    placeholder="Search or type finished product name..."
                    startIcon={<Package className="w-3.5 h-3.5 text-emerald-600" />}
                    creatable={true}
                    error={Boolean((touched.finishedGoodName || (formikRef.current && formikRef.current.submitCount > 0)) && (errors.finishedGoodName || !values.finishedGoodName))}
                    helperText={(touched.finishedGoodName || (formikRef.current && formikRef.current.submitCount > 0)) && (errors.finishedGoodName || !values.finishedGoodName) ? String(errors.finishedGoodName || 'Finished Product Name is required') : ''}
                    onBlur={() => setFieldTouched('finishedGoodName', true, true)}
                    value={
                      availableFinishedProducts.find(p => p.name === (values.finishedGoodName || formData.finishedGoodName)) ||
                      ((values.finishedGoodName || formData.finishedGoodName) ? { id: 'custom', name: values.finishedGoodName || formData.finishedGoodName, sku: values.finishedGoodSku || formData.finishedGoodSku, uom: values.uom || formData.uom } : null)
                    }
                    onChange={(val) => {
                      if (val) {
                        setFormData(prev => ({
                          ...prev,
                          finishedGoodName: val.name,
                          finishedGoodSku: val.sku || prev.finishedGoodSku
                        }));
                        setFieldValue('finishedGoodName', val.name);
                        setFieldTouched('finishedGoodName', true, true);
                        if (val.sku) setFieldValue('finishedGoodSku', val.sku);
                      } else {
                        setFormData(prev => ({ ...prev, finishedGoodName: '', finishedGoodSku: '' }));
                        setFieldValue('finishedGoodName', '');
                        setFieldTouched('finishedGoodName', true, true);
                        setFieldValue('finishedGoodSku', '');
                      }
                      setDirty(true);
                    }}
                    onCreate={(newName) => {
                      setFormData(prev => ({ ...prev, finishedGoodName: newName }));
                      setFieldValue('finishedGoodName', newName);
                      setFieldTouched('finishedGoodName', true, true);
                      setDirty(true);
                    }}
                    options={availableFinishedProducts}
                    getOptionLabel={(opt) => opt.name}
                    renderOptionLabel={(opt) => (
                      <div className="flex items-center justify-between w-full py-0.5">
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-gray-900">{opt.name}</span>
                          {opt.sku && (
                            <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200">
                              {opt.sku}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  />
                </div>

                <TextFieldComponent
                  name="finishedGoodSku"
                  label="Finished Good SKU Code (Optional)"
                  placeholder="e.g. PET-1206-GRN"
                  startIcon={<Tag className="w-3.5 h-3.5 text-emerald-600" />}
                  value={values.finishedGoodSku ?? formData.finishedGoodSku}
                  onChange={(e: any) => {
                    setFormData({ ...formData, finishedGoodSku: e.target.value });
                    setFieldValue('finishedGoodSku', e.target.value);
                    setDirty(true);
                  }}
                />

                <SelectOutlinedField
                  name="status"
                  label="BOM Recipe Status"
                  startIcon={<CheckCircle className="w-3.5 h-3.5 text-emerald-600" />}
                  value={values.status ?? formData.status}
                  onChange={(val: any) => {
                    const statusVal = (typeof val === 'object' && val?.target ? val.target.value : val) as any;
                    setFormData({ ...formData, status: statusVal });
                    setFieldValue('status', statusVal);
                    setDirty(true);
                  }}
                  options={[
                    { label: 'Active', value: 'Active' },
                    { label: 'Draft', value: 'Draft' },
                    { label: 'Archived', value: 'Archived' }
                  ]}
                />
              </div>
            </FormCard>

            <FormCard title="Production Batch Specifications" icon={<Sliders className="w-4 h-4 text-emerald-600" />}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-1">
                <TextFieldComponent
                  name="batchQuantity"
                  label="Standard Output Batch Quantity *"
                  type="number"
                  required
                  startIcon={<Layers className="w-3.5 h-3.5 text-emerald-600" />}
                  value={values.batchQuantity ?? formData.batchQuantity}
                  error={Boolean(touched.batchQuantity && errors.batchQuantity)}
                  helperText={touched.batchQuantity && errors.batchQuantity ? String(errors.batchQuantity) : ''}
                  onChange={(e: any) => {
                    const parsed = parseFloat(e.target.value) || 0;
                    setFormData({ ...formData, batchQuantity: parsed });
                    setFieldValue('batchQuantity', parsed);
                    setDirty(true);
                  }}
                  inputProps={{ min: 1 }}
                />

                <SelectOutlinedField
                  name="uom"
                  label="Unit of Measurement (UOM) *"
                  startIcon={<Scale className="w-3.5 h-3.5 text-emerald-600" />}
                  value={values.uom ?? formData.uom}
                  onChange={(val: any) => {
                    const uomVal = typeof val === 'object' && val?.target ? val.target.value : val;
                    setFormData({ ...formData, uom: uomVal });
                    setFieldValue('uom', uomVal);
                    setDirty(true);
                  }}
                  options={[
                    { label: 'KG (Kilograms)', value: 'KG' },
                    { label: 'Rolls', value: 'Rolls' },
                    { label: 'Ton (Tonnes)', value: 'Ton' },
                    { label: 'Pcs (Pieces)', value: 'Pcs' }
                  ]}
                />
              </div>
            </FormCard>
          </div>
        )}

        {/* TAB 2: RAW MATERIAL COMPOSITION (SEPARATE TABLES FOR EACH ORDER ITEM) */}
        {(activeTab === 'composition' || activeTab === 'details') && (
          <div className="p-6 space-y-6 pt-2">
            {(() => {
              const currentPO = productionOrders.find(p => p.id === formData.productionOrderNo);
              const hasOrderItems = Boolean(currentPO && currentPO.orderItems && currentPO.orderItems.length > 0);

              if (hasOrderItems && currentPO?.orderItems) {
                return (
                  <div className="space-y-6">
                    {/* SECTION HEADER */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-200">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-gradient-to-br from-emerald-600 to-teal-700 text-white rounded-xl shadow-xs">
                          <Package className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-black text-base text-gray-950 flex items-center gap-2">
                            Raw Material Composition Tables
                            <span className="text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full border border-emerald-300">
                              Separate Table per Order Item
                            </span>
                          </h3>
                          <p className="text-xs text-gray-500 font-medium">
                            Linked to Order <strong className="text-emerald-800 font-bold">{currentPO.id}</strong> ({currentPO.customerName}) • {currentPO.orderItems.length} Products
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-extrabold text-gray-700 bg-gray-100 px-3 py-1 rounded-xl border border-gray-200">
                          Total Recipes: <strong className="text-emerald-800">{currentPO.orderItems.length}</strong>
                        </span>
                      </div>
                    </div>

                    {/* SEPARATE TABLE CARD FOR EACH ORDER ITEM */}
                    {currentPO.orderItems.map((item) => {
                      const itemRecipe = (orderItemRecipes[item.srNo] && orderItemRecipes[item.srNo].length > 0)
                        ? orderItemRecipes[item.srNo]
                        : [
                            {
                              id: `rm-${item.srNo}-1`,
                              itemCode: '',
                              itemName: '',
                              quantity: 0,
                              uom: 'KG',
                              unitCost: 0,
                              scrapPercentage: 0,
                              totalCost: 0
                            }
                          ];
                      const itemTotalCost = itemRecipe.reduce((sum, it) => sum + (it.totalCost || 0), 0);
                      const batchQty = item.noOfArticles || item.qty || 1;
                      const costPerRoll = batchQty > 0 ? itemTotalCost / batchQty : 0;
                      const totalKg = itemRecipe
                        .filter(it => (it.uom || '').toUpperCase() === 'KG')
                        .reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
                      
                      const colorLower = (item.color || 'green').toLowerCase();
                      const isYellow = colorLower === 'yellow';
                      const isGreen = colorLower === 'green';
                      const isBlack = colorLower === 'black';

                      return (
                        <div 
                          key={item.srNo} 
                          id={`order-item-table-${item.srNo}`}
                          className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs ${
                            isYellow 
                              ? 'border-amber-300/90 bg-white ring-1 ring-amber-400/20' 
                              : isGreen 
                              ? 'border-emerald-300/90 bg-white ring-1 ring-emerald-400/20'
                              : isBlack
                              ? 'border-gray-400/80 bg-white ring-1 ring-gray-400/20'
                              : 'border-emerald-200 bg-white'
                          }`}
                        >
                          {/* CARD TOP HEADER BANNER */}
                          <div className={`p-4 border-b rounded-t-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                            isYellow 
                              ? 'bg-gradient-to-r from-amber-100/70 via-yellow-50/80 to-white border-amber-200' 
                              : isGreen 
                              ? 'bg-gradient-to-r from-emerald-100/70 via-teal-50/80 to-white border-emerald-200'
                              : isBlack
                              ? 'bg-gradient-to-r from-gray-200/70 via-gray-100 to-white border-gray-300'
                              : 'bg-gradient-to-r from-emerald-50 to-white border-emerald-200'
                          }`}>
                            <div className="flex items-start gap-3">
                              <div className={`w-10 h-10 rounded-xl font-black text-sm flex items-center justify-center text-white shrink-0 shadow-sm mt-0.5 ${
                                isYellow ? 'bg-amber-500 shadow-amber-500/30' : isGreen ? 'bg-emerald-600 shadow-emerald-600/30' : isBlack ? 'bg-gray-800' : 'bg-emerald-600'
                              }`}>
                                #{item.srNo}
                              </div>
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="font-black text-sm text-gray-950">
                                    Item #{item.srNo}: {item.strapSizeLength.replace(/^\[.*?\]\s*\|\s*/, '')}
                                  </h4>
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-black border shadow-2xs ${
                                    isYellow ? 'bg-amber-100 text-amber-950 border-amber-400' :
                                    isGreen ? 'bg-emerald-100 text-emerald-950 border-emerald-400' :
                                    isBlack ? 'bg-gray-900 text-white border-gray-950' :
                                    'bg-gray-100 text-gray-800 border-gray-300'
                                  }`}>
                                    <span className={`w-2 h-2 rounded-full ${isYellow ? 'bg-amber-500' : isGreen ? 'bg-emerald-500' : isBlack ? 'bg-white' : 'bg-current'}`}></span>
                                    {item.color || 'Standard'} Strap
                                  </span>
                                  <span className="text-[11px] font-mono font-bold text-gray-600 bg-white/90 px-2 py-0.5 rounded-md border border-gray-200">
                                    {item.strapSizeLength.match(/\[(.*?)\]/)?.[0] || '[PSR001]'}
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-gray-600">
                                  <span className="bg-white px-2 py-0.5 rounded-md border border-gray-200 font-semibold shadow-2xs">
                                    Batch Target: <strong className="text-gray-900 font-black">{batchQty.toLocaleString()} {item.unit || 'Rolls'}</strong>
                                  </span>
                                  {item.netWtOfArticles && (
                                    <span className="bg-white px-2 py-0.5 rounded-md border border-gray-200 font-semibold shadow-2xs">
                                      Net Wt: <strong className="text-gray-900 font-black">{item.netWtOfArticles} KG/Roll</strong>
                                    </span>
                                  )}
                                  {item.coreSize && (
                                    <span className="bg-white px-2 py-0.5 rounded-md border border-gray-200 font-semibold shadow-2xs">
                                      Core: <strong className="text-gray-900 font-black">{item.coreSize}</strong>
                                    </span>
                                  )}
                                  {item.surface && (
                                    <span className="bg-white px-2 py-0.5 rounded-md border border-gray-200 font-semibold shadow-2xs">
                                      Surface: <strong className="text-gray-900 font-black">{item.surface}</strong>
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Action button */}
                            <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                              <button
                                type="button"
                                onClick={() => handleAddRawMaterialRow(item.srNo)}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer"
                              >
                                <Plus className="w-4 h-4" />
                                <span>Add Raw Material to Item #{item.srNo}</span>
                              </button>
                            </div>
                          </div>

                          {/* THE RECIPE TABLE */}
                          <div className="overflow-x-auto custom-scrollbar">
                            <table className="w-full min-w-[960px] text-left border-collapse text-xs">
                              <thead>
                                <tr className="bg-gray-100/90 text-[10px] font-black text-gray-600 uppercase tracking-wider border-b border-gray-200">
                                  <th className="px-3 py-2.5 w-12 text-center whitespace-nowrap">#</th>
                                  <th className="px-3 py-2.5 min-w-[320px] whitespace-nowrap">Raw Material Item (Search & Select Autocomplete)</th>
                                  <th className="px-3 py-2.5 w-28 text-right whitespace-nowrap">Qty Required</th>
                                  <th className="px-3 py-2.5 w-20 whitespace-nowrap">UOM</th>
                                  <th className="px-3 py-2.5 w-28 text-right whitespace-nowrap">Unit Rate (₹)</th>
                                  <th className="px-3 py-2.5 w-20 text-right whitespace-nowrap">Scrap %</th>
                                  <th className="px-3 py-2.5 w-32 text-right whitespace-nowrap">Total Cost (₹)</th>
                                  <th className="px-3 py-2.5 w-12 text-center whitespace-nowrap">Action</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {itemRecipe.map((mat, idx) => (
                                  <tr key={mat.id || idx} className="hover:bg-emerald-50/30 transition-colors">
                                    <td className="px-3 py-2.5 text-center font-bold text-gray-400">{idx + 1}</td>
                                    
                                    {/* AUTOCOMPLETE DROPDOWN */}
                                    <td className="px-3 py-2.5 min-w-[320px]">
                                      <StandaloneAutocomplete<RawMaterialOption>
                                        value={
                                          availableRawMaterials.find(m => m.itemName === mat.itemName || (mat.itemCode && m.itemCode === mat.itemCode)) ||
                                          (mat.itemName ? { itemCode: mat.itemCode || '', itemName: mat.itemName, uom: mat.uom || 'KG', unitCost: mat.unitCost || 0 } : null)
                                        }
                                        onChange={(selectedMat: RawMaterialOption | null) => {
                                          if (selectedMat) {
                                            handleSelectRawMaterial(item.srNo, idx, selectedMat);
                                          } else {
                                            handleUpdateItemRow(item.srNo, idx, 'itemName', '');
                                            handleUpdateItemRow(item.srNo, idx, 'itemCode', '');
                                            handleUpdateItemRow(item.srNo, idx, 'unitCost', 0);
                                            handleUpdateItemRow(item.srNo, idx, 'quantity', 0);
                                            handleUpdateItemRow(item.srNo, idx, 'totalCost', 0);
                                          }
                                        }}
                                        options={availableRawMaterials}
                                        creatable={true}
                                        onCreate={(newName) => handleCreateRawMaterial(item.srNo, idx, newName)}
                                        startIcon={<Package className="w-3.5 h-3.5 text-emerald-600" />}
                                        getOptionLabel={(option: RawMaterialOption) => option.itemName ? `${option.itemName}${option.itemCode ? ` (${option.itemCode})` : ''}` : ''}
                                        renderOptionLabel={(option: RawMaterialOption) => (
                                          <div className="flex items-center justify-between w-full py-0.5 gap-2.5">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                                                <Package className="w-3.5 h-3.5 stroke-[2.2]" />
                                              </div>
                                              <div className="min-w-0">
                                                <div className="font-extrabold text-xs text-gray-900 truncate">{option.itemName}</div>
                                                <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 font-mono text-[10px] font-bold rounded mt-0.5">
                                                  {option.itemCode}
                                                </span>
                                              </div>
                                            </div>
                                            <div className="text-right ml-2 shrink-0">
                                              <span className="text-xs font-black text-emerald-800">
                                                ₹{option.unitCost} / {option.uom}
                                              </span>
                                            </div>
                                          </div>
                                        )}
                                        placeholder="Type to search or add raw material..."
                                        size="small"
                                      />
                                    </td>

                                    <td className="px-2 py-2 w-28">
                                      <TextFieldComponent
                                        type="number"
                                        size="small"
                                        value={mat.quantity ?? ''}
                                        placeholder="0"
                                        onChange={(e: any) => handleUpdateItemRow(item.srNo, idx, 'quantity', e.target.value)}
                                        inputProps={{ min: 0, step: 'any', style: { textAlign: 'right', fontWeight: 800, padding: '6px 8px', fontSize: '0.75rem' } }}
                                        sx={{
                                          minWidth: 80,
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            backgroundColor: '#ffffff'
                                          }
                                        }}
                                      />
                                    </td>

                                    <td className="px-2 py-2 w-28">
                                      <SelectOutlinedField
                                        size="small"
                                        value={(mat.uom || 'KG').toUpperCase()}
                                        onChange={(val: any) => {
                                          const nextVal = typeof val === 'object' && val?.target ? val.target.value : val;
                                          handleUpdateItemRow(item.srNo, idx, 'uom', nextVal);
                                        }}
                                        options={[
                                          { label: 'KG', value: 'KG' },
                                          { label: 'Rolls', value: 'Rolls' },
                                          { label: 'Ton', value: 'Ton' },
                                          { label: 'Pcs', value: 'Pcs' },
                                          { label: 'Meter', value: 'Meter' },
                                          { label: 'Grams', value: 'Grams' }
                                        ]}
                                        sx={{
                                          minWidth: 85,
                                          width: '100%',
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            backgroundColor: '#ffffff'
                                          },
                                          '& .MuiSelect-select': {
                                            py: '6px !important',
                                            px: '8px !important',
                                            fontSize: '0.75rem',
                                            fontWeight: 700,
                                            minWidth: 'unset !important'
                                          }
                                        }}
                                      />
                                    </td>

                                    <td className="px-2 py-2 w-32">
                                      <TextFieldComponent
                                        type="number"
                                        size="small"
                                        value={mat.unitCost ?? ''}
                                        placeholder="0.00"
                                        onChange={(e: any) => handleUpdateItemRow(item.srNo, idx, 'unitCost', e.target.value)}
                                        inputProps={{ min: 0, step: 'any', style: { textAlign: 'right', fontWeight: 800, color: '#065f46', padding: '6px 8px', fontSize: '0.75rem' } }}
                                        sx={{
                                          minWidth: 90,
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            backgroundColor: '#ffffff'
                                          }
                                        }}
                                      />
                                    </td>

                                    <td className="px-2 py-2 w-24">
                                      <TextFieldComponent
                                        type="number"
                                        size="small"
                                        value={mat.scrapPercentage ?? ''}
                                        placeholder="0"
                                        onChange={(e: any) => handleUpdateItemRow(item.srNo, idx, 'scrapPercentage', e.target.value)}
                                        inputProps={{ min: 0, max: 100, style: { textAlign: 'right', fontWeight: 700, padding: '6px 8px', fontSize: '0.75rem' } }}
                                        sx={{
                                          minWidth: 65,
                                          '& .MuiOutlinedInput-root': {
                                            borderRadius: '10px',
                                            fontSize: '0.75rem',
                                            backgroundColor: '#ffffff'
                                          }
                                        }}
                                      />
                                    </td>

                                    <td className="px-3 py-2.5 text-right font-black text-gray-900 whitespace-nowrap">
                                      ₹{mat.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>

                                    <td className="px-3 py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleRemoveRawMaterialRow(item.srNo, idx)}
                                        disabled={itemRecipe.length === 1}
                                        className="p-1.5 text-gray-400 hover:text-red-600 disabled:opacity-20 cursor-pointer rounded-lg hover:bg-red-50 transition-colors"
                                        title="Delete Material"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* PER-ITEM ATTRACTIVE FOOTER / SUMMARY BAR */}
                          <div className={`px-5 py-3 border-t rounded-b-2xl flex flex-wrap items-center justify-between gap-3 text-xs ${
                            isYellow ? 'bg-amber-50/60 border-amber-200' : isGreen ? 'bg-emerald-50/60 border-emerald-200' : 'bg-gray-50 border-gray-200'
                          }`}>
                            <div className="flex items-center gap-4 text-gray-700 font-semibold">
                              <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                                <Package className="w-3.5 h-3.5 text-emerald-600" />
                                <strong>{itemRecipe.length}</strong> Raw Materials
                              </span>
                              <span className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                                ⚖️ Batch Composition Weight: <strong className="text-gray-950 font-black">{totalKg.toLocaleString()} KG</strong>
                              </span>
                            </div>

                            <div className="flex items-center gap-6">
                              <div className="text-right bg-white px-3 py-1 rounded-lg border border-gray-200 shadow-2xs">
                                <span className="text-[10px] uppercase font-bold text-gray-500 block">Cost / Roll</span>
                                <span className="font-black text-xs text-gray-900">
                                  ₹{costPerRoll.toFixed(2)}
                                </span>
                              </div>
                              <div className="text-right pl-3 border-l border-gray-200">
                                <span className="text-[10px] uppercase font-extrabold text-emerald-800 block">Item #{item.srNo} Subtotal</span>
                                <span className="font-black text-base text-emerald-950">
                                  ₹{itemTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {/* GRAND COMBINED ORDER BOM ECONOMICS SUMMARY CARD */}
                    <div className="bg-gradient-to-br from-emerald-900 via-teal-900 to-emerald-950 rounded-2xl p-6 text-white shadow-xl space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-emerald-700/60 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30 shadow-xs">
                            <Calculator className="w-5 h-5" />
                          </div>
                          <div>
                            <h4 className="font-black text-sm text-white">
                              Combined Order BOM Economics Summary
                            </h4>
                            <p className="text-xs text-emerald-200/80 font-medium">
                              Order <strong className="text-white font-bold">{currentPO.id}</strong> • {currentPO.customerName}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-emerald-800/80 text-emerald-200 text-xs font-extrabold rounded-full border border-emerald-600/50 shadow-xs">
                          {currentPO.orderItems.length} Order Items Combined
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-bold uppercase text-emerald-200 block">Total Order Output</span>
                          <div className="text-xl font-black text-white mt-1">
                            {currentPO.orderItems.reduce((sum, it) => sum + (it.noOfArticles || it.qty || 0), 0).toLocaleString()} Rolls
                          </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-bold uppercase text-emerald-200 block">Total Target Weight</span>
                          <div className="text-xl font-black text-white mt-1">
                            {currentPO.orderItems.reduce((sum, it) => sum + (it.totalWt || (it.noOfArticles || 0) * (it.netWtOfArticles || 16)), 0).toLocaleString()} KG
                          </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-bold uppercase text-emerald-200 block">Weighted Avg Cost / Roll</span>
                          <div className="text-xl font-black text-emerald-300 mt-1">
                            ₹{liveCostPerUnit.toFixed(2)}
                          </div>
                        </div>

                        <div className="bg-white/10 backdrop-blur-xs rounded-xl p-3.5 border border-white/10">
                          <span className="text-[10px] font-bold uppercase text-emerald-200 block">Grand Total Raw Material Cost</span>
                          <div className="text-2xl font-black text-white mt-1">
                            ₹{liveTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      {/* PER-ITEM BREAKDOWN PILLS */}
                      <div className="pt-2 border-t border-emerald-800/60 flex flex-wrap items-center gap-3 text-xs">
                        <span className="text-emerald-300 font-bold text-[11px]">Item Breakdown:</span>
                        {currentPO.orderItems.map((item) => {
                          const itemCost = (orderItemRecipes[item.srNo] || []).reduce((sum, it) => sum + (it.totalCost || 0), 0);
                          const percent = liveTotalCost > 0 ? ((itemCost / liveTotalCost) * 100).toFixed(1) : '0';
                          return (
                            <div key={item.srNo} className="bg-emerald-950/70 px-3 py-1.5 rounded-xl border border-emerald-700/60 flex items-center gap-2 shadow-2xs">
                              <span className="font-extrabold text-white">Item #{item.srNo} ({item.color}):</span>
                              <span className="font-bold text-emerald-300">₹{itemCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                              <span className="text-[10px] text-emerald-400 font-bold bg-emerald-900/60 px-1.5 py-0.5 rounded">({percent}%)</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              // FALLBACK FOR STANDALONE BOM (NO PO / SINGLE ITEM)
              const standaloneRecipe = orderItemRecipes[1] || formData.items;
              return (
                <FormCard 
                  title="Raw Material Composition & Recipe Table" 
                  icon={<Package className="w-4 h-4 text-emerald-600" />}
                  action={
                    <button
                      type="button"
                      onClick={() => handleAddRawMaterialRow(1)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-xs hover:bg-emerald-700 transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Raw Material</span>
                    </button>
                  }
                >
                  <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white shadow-2xs text-xs">
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full min-w-[960px] text-left border-collapse">
                        <thead>
                          <tr className="bg-gray-100/80 text-[10px] font-black text-gray-600 uppercase tracking-wider border-b border-gray-200">
                            <th className="px-3 py-2.5 w-12 text-center whitespace-nowrap">#</th>
                            <th className="px-3 py-2.5 min-w-[320px] whitespace-nowrap">Raw Material Item (Search & Select Autocomplete)</th>
                            <th className="px-3 py-2.5 w-24 text-right whitespace-nowrap">Qty Required</th>
                            <th className="px-3 py-2.5 w-24 whitespace-nowrap">UOM</th>
                            <th className="px-3 py-2.5 w-28 text-right whitespace-nowrap">Unit Rate (₹)</th>
                            <th className="px-3 py-2.5 w-24 text-right whitespace-nowrap">Scrap %</th>
                            <th className="px-3 py-2.5 w-32 text-right whitespace-nowrap">Total Cost (₹)</th>
                            <th className="px-3 py-2.5 w-12 text-center whitespace-nowrap">Action</th>
                          </tr>
                        </thead>
                      <tbody className="divide-y divide-gray-100">
                        {standaloneRecipe.map((item, idx) => (
                          <tr key={item.id} className="hover:bg-gray-50/50 relative">
                            <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                            
                            <td className="px-3 py-2 min-w-[320px]">
                              <StandaloneAutocomplete<RawMaterialOption>
                                value={
                                  availableRawMaterials.find(m => m.itemName === item.itemName || (item.itemCode && m.itemCode === item.itemCode)) ||
                                  (item.itemName ? { itemCode: item.itemCode || '', itemName: item.itemName, uom: item.uom || 'KG', unitCost: item.unitCost || 0 } : null)
                                }
                                onChange={(selectedMat: RawMaterialOption | null) => {
                                  if (selectedMat) {
                                    handleSelectRawMaterial(1, idx, selectedMat);
                                  } else {
                                    handleUpdateItemRow(1, idx, 'itemName', '');
                                    handleUpdateItemRow(1, idx, 'itemCode', '');
                                    handleUpdateItemRow(1, idx, 'unitCost', 0);
                                    handleUpdateItemRow(1, idx, 'quantity', 0);
                                    handleUpdateItemRow(1, idx, 'totalCost', 0);
                                  }
                                }}
                                options={availableRawMaterials}
                                creatable={true}
                                onCreate={(newName) => handleCreateRawMaterial(1, idx, newName)}
                                startIcon={<Package className="w-3.5 h-3.5 text-emerald-600" />}
                                getOptionLabel={(mat: RawMaterialOption) => mat.itemName ? `${mat.itemName}${mat.itemCode ? ` (${mat.itemCode})` : ''}` : ''}
                                renderOptionLabel={(mat: RawMaterialOption) => (
                                  <div className="flex items-center justify-between w-full py-0.5 gap-2.5">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                                        <Package className="w-3.5 h-3.5 stroke-[2.2]" />
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-extrabold text-xs text-gray-900 truncate">{mat.itemName}</div>
                                        <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 font-mono text-[10px] font-bold rounded mt-0.5">
                                          {mat.itemCode}
                                        </span>
                                      </div>
                                    </div>
                                    <div className="text-right ml-2 shrink-0">
                                      <span className="text-xs font-black text-emerald-800">
                                        ₹{mat.unitCost} / {mat.uom}
                                      </span>
                                    </div>
                                  </div>
                                )}
                                placeholder="Type to search or add raw material..."
                                size="small"
                              />
                            </td>

                            <td className="px-2 py-2 w-28">
                              <TextFieldComponent
                                type="number"
                                size="small"
                                value={item.quantity ?? ''}
                                placeholder="0"
                                onChange={(e: any) => handleUpdateItemRow(1, idx, 'quantity', e.target.value)}
                                inputProps={{ min: 0, step: 'any', style: { textAlign: 'right', fontWeight: 800, padding: '6px 8px', fontSize: '0.75rem' } }}
                                sx={{
                                  minWidth: 80,
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    backgroundColor: '#ffffff'
                                  }
                                }}
                              />
                            </td>

                            <td className="px-2 py-2 w-28">
                              <SelectOutlinedField
                                size="small"
                                value={(item.uom || 'KG').toUpperCase()}
                                onChange={(val: any) => {
                                  const nextVal = typeof val === 'object' && val?.target ? val.target.value : val;
                                  handleUpdateItemRow(1, idx, 'uom', nextVal);
                                }}
                                options={[
                                  { label: 'KG', value: 'KG' },
                                  { label: 'Rolls', value: 'Rolls' },
                                  { label: 'Ton', value: 'Ton' },
                                  { label: 'Pcs', value: 'Pcs' },
                                  { label: 'Meter', value: 'Meter' },
                                  { label: 'Grams', value: 'Grams' }
                                ]}
                                sx={{
                                  minWidth: 85,
                                  width: '100%',
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    backgroundColor: '#ffffff'
                                  },
                                  '& .MuiSelect-select': {
                                    py: '6px !important',
                                    px: '8px !important',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    minWidth: 'unset !important'
                                  }
                                }}
                              />
                            </td>

                            <td className="px-2 py-2 w-32">
                              <TextFieldComponent
                                type="number"
                                size="small"
                                value={item.unitCost ?? ''}
                                placeholder="0.00"
                                onChange={(e: any) => handleUpdateItemRow(1, idx, 'unitCost', e.target.value)}
                                inputProps={{ min: 0, step: 'any', style: { textAlign: 'right', fontWeight: 800, color: '#065f46', padding: '6px 8px', fontSize: '0.75rem' } }}
                                sx={{
                                  minWidth: 90,
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    backgroundColor: '#ffffff'
                                  }
                                }}
                              />
                            </td>

                            <td className="px-2 py-2 w-24">
                              <TextFieldComponent
                                type="number"
                                size="small"
                                value={item.scrapPercentage ?? ''}
                                placeholder="0"
                                onChange={(e: any) => handleUpdateItemRow(1, idx, 'scrapPercentage', e.target.value)}
                                inputProps={{ min: 0, max: 100, style: { textAlign: 'right', fontWeight: 700, padding: '6px 8px', fontSize: '0.75rem' } }}
                                sx={{
                                  minWidth: 65,
                                  '& .MuiOutlinedInput-root': {
                                    borderRadius: '10px',
                                    fontSize: '0.75rem',
                                    backgroundColor: '#ffffff'
                                  }
                                }}
                              />
                            </td>


                            <td className="px-3 py-2 text-right font-black text-gray-900 whitespace-nowrap">
                              ₹{item.totalCost.toLocaleString()}
                            </td>

                            <td className="px-3 py-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveRawMaterialRow(1, idx)}
                                disabled={standaloneRecipe.length === 1}
                                className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-20 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                </FormCard>
              );
            })()}
          </div>
        )}

        {/* TAB 3: COSTING & ECONOMICS */}
        {(activeTab === 'costing' || activeTab === 'details') && (
          <div className="p-6 space-y-6 pt-2">
            <FormCard title="Production Cost Breakdown & Economics" icon={<Calculator className="w-4 h-4 text-emerald-600" />}>
              <div className="bg-emerald-50/80 border border-emerald-200/80 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                <div>
                  <span className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider">Total Raw Material Composition Cost</span>
                  <div className="text-xs text-emerald-700 font-medium mt-0.5">Batch Size: {formData.batchQuantity} {formData.uom}</div>
                </div>

                <div className="flex items-center gap-8 text-right">
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Cost Per {formData.uom}</span>
                    <div className="text-lg font-black text-emerald-900">₹{liveCostPerUnit.toFixed(2)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase">Total Batch Cost</span>
                    <div className="text-2xl font-black text-emerald-950">₹{liveTotalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>
                </div>
              </div>
            </FormCard>
          </div>
        )}

        {/* TAB 4: NOTES & REMARKS */}
        {(activeTab === 'notes' || activeTab === 'details') && (
          <div className="p-6 space-y-6 pt-2">
            <FormCard title="Process Instructions & Remarks" icon={<FileSpreadsheet className="w-4 h-4 text-emerald-600" />}>
              <div className="pt-1">
                <TextFieldComponent
                  label="Process Line Instructions / Remarks"
                  multiline
                  rows={4}
                  placeholder="Enter process line specifications, temperature profiles, or extrusion notes..."
                  value={formData.remarks}
                  onChange={(e: any) => {
                    setFormData({ ...formData, remarks: e.target.value });
                    setDirty(true);
                  }}
                />
              </div>
            </FormCard>
          </div>
        )}

        {/* BOTTOM SAVE BAR */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/bom')}
            className="px-4 py-2 border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-white transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => formikRef.current ? formikRef.current.submitForm() : handleSave()}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {isEdit ? 'Save BOM Recipe' : 'Create & Save BOM'}
          </button>
        </div>
      </div>
          </Form>
        )}
      </Formik>
    </ERPFormPageLayout>
  );
};

export const BomFormPage = WithAuth(BomFormPageBase, ModuleName.BOM, Permission.ADD);
export default BomFormPage;
