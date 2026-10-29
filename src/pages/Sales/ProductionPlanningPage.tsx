import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '../../components/motion/AnimatedNumber';
import { fetchProductionOrders, updateProductionOrder, type ProductionOrder } from '../../services/api';
import { getStoredBoms } from '../Production/bomStorage';
import { StandaloneAutocomplete } from '../../components/input/index';
import { successToast, errorToast } from '../../helper/toast';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { 
  Factory, 
  Clock, 
  ArrowUp, 
  ArrowDown, 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Layers, 
  Sliders, 
  Calendar, 
  RefreshCw, 
  Plus, 
  BarChart3, 
  ListOrdered, 
  Settings, 
  Filter, 
  Search, 
  X, 
  Package, 
  CheckCircle,
  Play,
  RotateCcw,
  CheckCheck,
  ChevronDown,
  Check
} from 'lucide-react';

export interface MachineConfig {
  id: string;
  name: string;
  code: string;
  outputKgPerMin: number; // capacity in kg per minute
  status: 'Running' | 'Idle' | 'Maintenance' | 'Setup';
  maxCapacityTonsPerMonth: number;
}

export type ItemProductionStatus = 'Queued' | 'In Production' | 'Completed' | 'On Hold';
export type StatusFilterOption = 'ALL' | 'In Production' | 'Queued' | 'Completed' | 'On Hold';

export interface PlannedOrderItem {
  id: string;
  orderId: string;
  orderNumber: string;
  orderItemSrNo?: number;
  totalItemsInOrder?: number;
  customerName: string;
  itemDescription: string;
  color?: string;
  coreSize?: string;
  surface?: string;
  bomNumber?: string;
  totalWeightKg: number; // Total Wt in KG
  qty: number;
  qtyUnit: string;
  completionPercentage: number; // 0 to 100%
  machineId: string;
  priority: 'Urgent' | 'High' | 'Normal' | 'Low';
  sequenceOrder: number;
  status: ItemProductionStatus;
  plannedStartDate?: string;
}

// Option item for the rich Autocomplete filter
export interface AutocompleteOrderOption {
  id: string;
  type: 'ORDER' | 'ITEM';
  orderNumber: string;
  orderId?: string;
  customerName: string;
  itemSrNo?: number;
  itemCount: number;
  itemDescription?: string;
  color?: string;
  coreSize?: string;
  surface?: string;
  bomNumber?: string;
  totalWeightKg: number;
  orderStatus: ItemProductionStatus;
  itemStatus?: ItemProductionStatus;
  displayTitle: string;
  subDetails: string;
  allSearchText: string;
}

const DEFAULT_MACHINES: MachineConfig[] = [
  { id: 'M-01', name: 'Machine 1 (High Speed)', code: 'EXT-01', outputKgPerMin: 5.0, status: 'Running', maxCapacityTonsPerMonth: 30 },
  { id: 'M-02', name: 'Machine 2 (Heavy Duty)', code: 'EXT-02', outputKgPerMin: 3.5, status: 'Running', maxCapacityTonsPerMonth: 22 },
  { id: 'M-03', name: 'Machine 3 (Medium Strap)', code: 'EXT-03', outputKgPerMin: 2.2, status: 'Running', maxCapacityTonsPerMonth: 15 },
  { id: 'M-04', name: 'Machine 4 (Light & Custom)', code: 'EXT-04', outputKgPerMin: 1.5, status: 'Idle', maxCapacityTonsPerMonth: 10 }
];

// Helper to identify and purge obsolete dummy mock cards
const isLegacyDummyPlan = (item: any): boolean => {
  return (
    item.id === 'plan-1' ||
    item.id === 'plan-2' ||
    item.id === 'plan-3' ||
    item.id === 'plan-4' ||
    item.customerName === 'BHADANI ENTERPRISE' ||
    item.customerName === 'RELIANCE LOGISTICS' ||
    item.customerName === 'AMAZON FULFILLMENT'
  );
};

// Styling helper for strap color badges
const getColorBadgeProps = (colorName?: string) => {
  const c = colorName?.toLowerCase().trim() || '';
  if (c.includes('green')) {
    return { bg: 'bg-emerald-50 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' };
  }
  if (c.includes('yellow')) {
    return { bg: 'bg-amber-50 text-amber-800 border-amber-300', dot: 'bg-amber-500' };
  }
  if (c.includes('black')) {
    return { bg: 'bg-gray-800 text-gray-100 border-gray-700', dot: 'bg-white' };
  }
  if (c.includes('blue')) {
    return { bg: 'bg-blue-50 text-blue-800 border-blue-300', dot: 'bg-blue-500' };
  }
  if (c.includes('red')) {
    return { bg: 'bg-red-50 text-red-800 border-red-300', dot: 'bg-red-500' };
  }
  return { bg: 'bg-gray-100 text-gray-700 border-gray-200', dot: 'bg-gray-400' };
};

// Rich status options with high-contrast, readable font styling
const STATUS_OPTIONS: {
  value: ItemProductionStatus;
  label: string;
  shortLabel: string;
  icon: string;
  badgeClass: string;
}[] = [
  {
    value: 'Queued',
    label: 'Queued',
    shortLabel: 'Queued',
    icon: '⏳',
    badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200/80'
  },
  {
    value: 'In Production',
    label: 'In Production',
    shortLabel: 'In Prod',
    icon: '⚙️',
    badgeClass: 'bg-blue-100 text-blue-900 border-blue-300 hover:bg-blue-200/80'
  },
  {
    value: 'Completed',
    label: 'Completed',
    shortLabel: 'Done',
    icon: '✅',
    badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300 hover:bg-emerald-200/80'
  },
  {
    value: 'On Hold',
    label: 'On Hold',
    shortLabel: 'On Hold',
    icon: '⏸️',
    badgeClass: 'bg-red-100 text-red-900 border-red-300 hover:bg-red-200/80'
  }
];

interface CustomStatusDropdownProps {
  id: string;
  value: ItemProductionStatus;
  onChange: (newStatus: ItemProductionStatus) => void;
  isOpen: boolean;
  onToggle: () => void;
  align?: 'left' | 'right';
  title?: string;
}

const CustomStatusDropdown: React.FC<CustomStatusDropdownProps> = ({
  id,
  value,
  onChange,
  isOpen,
  onToggle,
  align = 'left',
  title
}) => {
  const current = STATUS_OPTIONS.find(o => o.value === value) || STATUS_OPTIONS[0];

  return (
    <div className="relative" data-status-dropdown>
      <button
        type="button"
        draggable={false}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        title={title}
        className={`w-full flex items-center justify-between gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-bold transition-all shadow-2xs hover:shadow-xs cursor-pointer ${current.badgeClass}`}
      >
        <span className="flex items-center gap-1.5 truncate">
          <span className="text-xs shrink-0">{current.icon}</span>
          <span className="truncate">{current.shortLabel}</span>
        </span>
        <ChevronDown 
          className={`w-3.5 h-3.5 shrink-0 opacity-70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div 
          draggable={false}
          onMouseDown={(e) => e.stopPropagation()}
          className={`absolute ${align === 'right' ? 'right-0' : 'left-0'} top-full mt-1.5 w-44 bg-white rounded-xl shadow-xl border border-gray-200/90 py-1.5 px-1.5 z-50 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-100`}
        >
          <div className="space-y-0.5">
            {STATUS_OPTIONS.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange(opt.value);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg text-xs font-bold transition-all text-left cursor-pointer ${
                    isSelected
                      ? `${opt.badgeClass} ring-1 ring-black/5`
                      : 'text-gray-700 hover:bg-gray-100/90'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0">{opt.icon}</span>
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-current shrink-0 stroke-[2.5]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

const ProductionPlanningPageBase: React.FC = () => {
  const navigate = useNavigate();

  // Machine States
  const [machines, setMachines] = useState<MachineConfig[]>(() => {
    const saved = localStorage.getItem('patel_strap_machines');
    return saved ? JSON.parse(saved) : DEFAULT_MACHINES;
  });

  // Database production orders
  const [dbOrders, setDbOrders] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(false);

  // Planned Schedule Items (Per Item Manufacturing)
  const [plannedItems, setPlannedItems] = useState<PlannedOrderItem[]>(() => {
    const saved = localStorage.getItem('patel_strap_planned_schedule');
    if (saved) {
      try {
        const parsed: PlannedOrderItem[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const cleaned = parsed.filter(i => !isLegacyDummyPlan(i));
          if (cleaned.length > 0) return cleaned;
        }
      } catch (e) {
        console.error('Failed to parse planned schedule from localStorage:', e);
      }
    }
    return [];
  });

  // Top Filter States (Reusable Autocomplete & Status Filter)
  const [selectedOption, setSelectedOption] = useState<AutocompleteOrderOption | null>(null);
  const [selectedOrderFilter, setSelectedOrderFilter] = useState<string>('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<StatusFilterOption>('ALL');
  const [statusFilterScope, setStatusFilterScope] = useState<'ITEM' | 'ORDER'>('ITEM');
  const [hideCompleted, setHideCompleted] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'board' | 'gantt'>('board');
  const [showAddModal, setShowAddModal] = useState(false);
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-status-dropdown]')) {
        setOpenDropdownId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdownId(null);
      }
    };
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openDropdownId]);

  // Form states for manual order addition
  const [newOrderForm, setNewOrderForm] = useState({
    orderNumber: '',
    customerName: '',
    itemDescription: '',
    weightInTonnesOrKg: '1600',
    unitType: 'KG',
    qty: '100',
    qtyUnit: 'Rolls',
    color: 'Green',
    machineId: 'M-01', // Machine 1 by default
    priority: 'Normal' as 'Urgent' | 'High' | 'Normal' | 'Low'
  });

  // Save machines & planned schedule to localStorage
  useEffect(() => {
    localStorage.setItem('patel_strap_machines', JSON.stringify(machines));
  }, [machines]);

  useEffect(() => {
    localStorage.setItem('patel_strap_planned_schedule', JSON.stringify(plannedItems));
  }, [plannedItems]);

  // Compute overall status of an order based on all its line items
  const getOrderOverallStatus = (orderNumber: string) => {
    const orderItems = plannedItems.filter(i => i.orderNumber === orderNumber || i.orderId === orderNumber);
    if (orderItems.length === 0) {
      return { 
        status: 'Queued' as ItemProductionStatus, 
        label: 'Queued', 
        bg: 'bg-amber-50 border-amber-200', 
        text: 'text-amber-800' 
      };
    }

    const completedItems = orderItems.filter(i => i.status === 'Completed' || (i.completionPercentage || 0) >= 100);
    const inProdItems = orderItems.filter(i => i.status === 'In Production' || ((i.completionPercentage || 0) > 0 && (i.completionPercentage || 0) < 100));
    const onHoldItems = orderItems.filter(i => i.status === 'On Hold');

    // 1. All items completed
    if (completedItems.length === orderItems.length && orderItems.length > 0) {
      return { 
        status: 'Completed' as ItemProductionStatus, 
        label: `Completed (${completedItems.length}/${orderItems.length})`, 
        bg: 'bg-emerald-50 border-emerald-300', 
        text: 'text-emerald-800' 
      };
    }

    // 2. Either some item is In Production OR some item is already completed (order in progress)
    if (inProdItems.length > 0 || completedItems.length > 0) {
      return { 
        status: 'In Production' as ItemProductionStatus, 
        label: completedItems.length > 0 
          ? `In Production (${completedItems.length}/${orderItems.length} Done)` 
          : 'In Production', 
        bg: 'bg-blue-50 border-blue-300', 
        text: 'text-blue-800' 
      };
    }

    // 3. On Hold
    if (onHoldItems.length > 0) {
      return { 
        status: 'On Hold' as ItemProductionStatus, 
        label: 'On Hold', 
        bg: 'bg-red-50 border-red-200', 
        text: 'text-red-800' 
      };
    }

    // 4. Queued
    return { 
      status: 'Queued' as ItemProductionStatus, 
      label: 'Queued', 
      bg: 'bg-amber-50 border-amber-200', 
      text: 'text-amber-800' 
    };
  };

  // Set Status for Entire Order (Updates all items of this order & syncs DB)
  const handleUpdateOrderStatus = async (orderNumber: string, newStatus: ItemProductionStatus) => {
    setPlannedItems(prev => prev.map(item => {
      if (item.orderNumber === orderNumber || item.orderId === orderNumber) {
        let newPercent = item.completionPercentage;
        if (newStatus === 'Completed') newPercent = 100;
        else if (newStatus === 'Queued') newPercent = 0;
        else if (newStatus === 'In Production') {
          if (newPercent === 0) newPercent = 10;
          if (newPercent >= 100) newPercent = 50;
        }
        return {
          ...item,
          status: newStatus,
          completionPercentage: newPercent
        };
      }
      return item;
    }));

    const matchingOrder = dbOrders.find(o => o.orderNumber === orderNumber || o.id === orderNumber);
    if (matchingOrder?.id) {
      try {
        await updateProductionOrder(matchingOrder.id, { status: newStatus });
        setDbOrders(prev => prev.map(o => o.id === matchingOrder.id ? { ...o, status: newStatus } : o));
      } catch (err) {
        console.error('Failed to sync updated order status to backend:', err);
      }
    }

    if (newStatus === 'Completed') {
      successToast(`Order ${orderNumber} marked Completed (all items finished & removed from In Production)`);
    } else {
      successToast(`Order ${orderNumber} status set to ${newStatus}`);
    }
  };

  // Load API Orders and Synchronize per Item Manufacturing to Machine 1 by default
  const loadProductionOrders = async () => {
    setLoading(true);
    try {
      const data = await fetchProductionOrders();
      const orders = Array.isArray(data) ? data : [];
      setDbOrders(orders);

      const boms = getStoredBoms();

      setPlannedItems(prev => {
        const existingRealItems = prev.filter(i => !isLegacyDummyPlan(i));
        const updatedList: PlannedOrderItem[] = [...existingRealItems];

        let m1SequenceCount = updatedList.filter(i => i.machineId === 'M-01').length;

        orders.forEach(order => {
          const orderNum = order.orderNumber || order.id;
          const items = order.items && order.items.length > 0 ? order.items : [];
          const totalItemsCount = items.length > 0 ? items.length : 1;

          if (items.length > 0) {
            items.forEach((item, idx) => {
              const itemSrNo = item.srNo || idx + 1;
              const itemId = `${order.id}-item-${itemSrNo}`;

              const existingIdx = updatedList.findIndex(p => 
                p.id === itemId || 
                (p.orderNumber === orderNum && p.orderItemSrNo === itemSrNo)
              );

              const matchingBom = boms.find(b => 
                (b.productionOrderNo === orderNum || b.productionOrderNo === order.id) &&
                (b.orderItemSrNo === itemSrNo)
              );

              let weightKg = item.totalWt || 0;
              if (!weightKg && matchingBom) {
                const rmWeight = matchingBom.items?.reduce((acc, r) => acc + (Number(r.quantity) || 0), 0) || 0;
                weightKg = rmWeight > 0 ? rmWeight : (matchingBom.batchQuantity || 0) * (item.netWtArticles || 16);
              }
              if (!weightKg) {
                const itemQty = item.qty || (item as any).quantity || item.noOfArticles || matchingBom?.batchQuantity || 0;
                const netWt = item.netWtArticles || (item as any).netWtOfArticles || 16;
                weightKg = itemQty > 0 ? itemQty * netWt : 1600;
              }

              const qty = item.qty || (item as any).quantity || item.noOfArticles || matchingBom?.batchQuantity || 100;
              const qtyUnit = item.unit || matchingBom?.uom || 'Pcs';
              const description = item.strapSizeLength || (item as any).sizeLength || (item as any).description || matchingBom?.finishedGoodName || 'PET / PP Strap Line Item';
              const color = item.color || (item as any).colour || 'Green';
              const core = item.coreSize || '';
              const surface = item.surface || '';
              const bomNum = matchingBom?.bomNumber || item.bomNumber || '';

              if (existingIdx >= 0) {
                const existing = updatedList[existingIdx];
                updatedList[existingIdx] = {
                  ...existing,
                  customerName: order.customerName || (order as any).client?.companyName || existing.customerName,
                  itemDescription: description || existing.itemDescription,
                  color: color || existing.color,
                  coreSize: core || existing.coreSize,
                  surface: surface || existing.surface,
                  bomNumber: bomNum || existing.bomNumber,
                  totalWeightKg: existing.totalWeightKg || weightKg,
                  qty: existing.qty || qty,
                  qtyUnit: existing.qtyUnit || qtyUnit,
                  totalItemsInOrder: totalItemsCount
                };
              } else {
                m1SequenceCount += 1;
                updatedList.push({
                  id: itemId,
                  orderId: order.id,
                  orderNumber: orderNum,
                  orderItemSrNo: itemSrNo,
                  totalItemsInOrder: totalItemsCount,
                  customerName: order.customerName || (order as any).client?.companyName || 'Client',
                  itemDescription: description,
                  color,
                  coreSize: core,
                  surface,
                  bomNumber: bomNum,
                  totalWeightKg: weightKg,
                  qty,
                  qtyUnit,
                  completionPercentage: 0,
                  machineId: 'M-01',
                  priority: 'Normal',
                  sequenceOrder: m1SequenceCount,
                  status: 'Queued'
                });
              }
            });
          } else {
            const itemId = `${order.id}-item-1`;
            const existingIdx = updatedList.findIndex(p => p.id === itemId || p.orderNumber === orderNum);
            if (existingIdx === -1) {
              m1SequenceCount += 1;
              updatedList.push({
                id: itemId,
                orderId: order.id,
                orderNumber: orderNum,
                orderItemSrNo: 1,
                totalItemsInOrder: 1,
                customerName: order.customerName || (order as any).client?.companyName || 'Client',
                itemDescription: 'Standard Strap Batch',
                color: 'Green',
                totalWeightKg: 1600,
                qty: 100,
                qtyUnit: 'Rolls',
                completionPercentage: 0,
                machineId: 'M-01',
                priority: 'Normal',
                sequenceOrder: m1SequenceCount,
                status: 'Queued'
              });
            }
          }
        });

        localStorage.setItem('patel_strap_planned_schedule', JSON.stringify(updatedList));
        return updatedList;
      });
    } catch (err) {
      console.error('Failed to load production orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductionOrders();
  }, []);

  // Format Helper: Hours & Mins from total minutes
  const formatMinutesToHoursStr = (totalMins: number): string => {
    if (isNaN(totalMins) || totalMins <= 0) return '0 mins';
    const hrs = Math.floor(totalMins / 60);
    const mins = Math.round(totalMins % 60);
    if (hrs === 0) return `${mins} mins`;
    if (mins === 0) return `${hrs} hrs`;
    return `${hrs} hrs ${mins} mins`;
  };

  // Update Machine Speed / Rate in KG/hr
  const handleUpdateMachineSpeedKgHr = (machineId: string, kgPerHour: number) => {
    if (kgPerHour <= 0) return;
    const kgPerMin = parseFloat((kgPerHour / 60).toFixed(2));
    setMachines(prev => prev.map(m => m.id === machineId ? { ...m, outputKgPerMin: kgPerMin } : m));
    successToast(`Updated capacity for machine to ${kgPerHour} kg/hr (${kgPerMin} kg/min)`);
  };

  // Move Sequence UP or DOWN within same machine column
  const handleMoveSequence = (machineId: string, itemId: string, direction: 'UP' | 'DOWN') => {
    const machineItems = plannedItems
      .filter(item => item.machineId === machineId)
      .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    const currentIdx = machineItems.findIndex(i => i.id === itemId);
    if (currentIdx === -1) return;

    const targetIndex = direction === 'UP' ? currentIdx - 1 : currentIdx + 1;
    if (targetIndex < 0 || targetIndex >= machineItems.length) return;

    const item1 = machineItems[currentIdx];
    const item2 = machineItems[targetIndex];

    const tempSeq = item1.sequenceOrder;
    item1.sequenceOrder = item2.sequenceOrder;
    item2.sequenceOrder = tempSeq;

    setPlannedItems(prev => prev.map(item => {
      if (item.id === item1.id) return { ...item, sequenceOrder: item1.sequenceOrder };
      if (item.id === item2.id) return { ...item, sequenceOrder: item2.sequenceOrder };
      return item;
    }));

    successToast(`Re-ordered queue sequence`);
  };

  // Move Card to Left or Right Machine Column
  const handleMoveColumn = (itemId: string, direction: 'LEFT' | 'RIGHT') => {
    const currentItem = plannedItems.find(i => i.id === itemId);
    if (!currentItem) return;

    const currentMachineIdx = machines.findIndex(m => m.id === currentItem.machineId);
    const targetIdx = direction === 'LEFT' ? currentMachineIdx - 1 : currentMachineIdx + 1;

    if (targetIdx < 0 || targetIdx >= machines.length) return;

    const targetMachine = machines[targetIdx];
    const existingInTarget = plannedItems.filter(i => i.machineId === targetMachine.id);

    setPlannedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          machineId: targetMachine.id,
          sequenceOrder: existingInTarget.length + 1
        };
      }
      return item;
    }));

    successToast(`Moved ${currentItem.orderNumber} Item #${currentItem.orderItemSrNo || 1} to ${targetMachine.code}`);
  };

  // Toggle Urgency Status
  const handleTogglePriority = (itemId: string, currentPriority: string) => {
    const priorities: Array<'Urgent' | 'High' | 'Normal' | 'Low'> = ['Urgent', 'High', 'Normal', 'Low'];
    const nextIdx = (priorities.indexOf(currentPriority as any) + 1) % priorities.length;
    const nextPriority = priorities[nextIdx];

    setPlannedItems(prev => prev.map(item => item.id === itemId ? { ...item, priority: nextPriority } : item));
    successToast(`Priority set to ${nextPriority}`);
  };

  // Explicit Update Item Status
  const handleUpdateItemStatus = async (itemId: string, newStatus: ItemProductionStatus) => {
    let targetOrderNumber = '';
    let allOrderItemsCompleted = false;

    setPlannedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          targetOrderNumber = item.orderNumber;
          let newPercent = item.completionPercentage;
          if (newStatus === 'Completed') {
            newPercent = 100;
          } else if (newStatus === 'Queued') {
            newPercent = 0;
          } else if (newStatus === 'In Production') {
            if (newPercent === 0) newPercent = 10;
            if (newPercent >= 100) newPercent = 50;
          }

          return {
            ...item,
            status: newStatus,
            completionPercentage: newPercent
          };
        }
        return item;
      });

      if (targetOrderNumber) {
        const orderItems = updated.filter(i => i.orderNumber === targetOrderNumber || i.orderId === targetOrderNumber);
        allOrderItemsCompleted = orderItems.length > 0 && orderItems.every(i => i.status === 'Completed' || (i.completionPercentage || 0) >= 100);
      }

      return updated;
    });

    if (targetOrderNumber) {
      const matchingOrder = dbOrders.find(o => o.orderNumber === targetOrderNumber || o.id === targetOrderNumber);
      if (matchingOrder?.id) {
        try {
          const dbNextStatus = allOrderItemsCompleted ? 'Completed' : (newStatus === 'Completed' ? 'In Production' : newStatus);
          await updateProductionOrder(matchingOrder.id, { status: dbNextStatus });
          setDbOrders(prev => prev.map(o => o.id === matchingOrder.id ? { ...o, status: dbNextStatus } : o));
        } catch (e) {
          console.error('Failed to sync DB order status:', e);
        }
      }
    }

    if (newStatus === 'Completed') {
      if (allOrderItemsCompleted) {
        successToast(`All items completed! Order ${targetOrderNumber} marked Completed.`);
      } else {
        successToast(`Production item marked 100% Completed (removed from In Production)`);
      }
    } else {
      successToast(`Item status updated to ${newStatus}`);
    }
  };

  // Update Completion Percentage (Auto-syncs status: 100% -> Completed, >0% -> In Production, 0% -> Queued)
  const handleUpdateCompletion = (itemId: string, percent: number) => {
    const validPercent = Math.max(0, Math.min(100, percent));
    setPlannedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const nextStatus: ItemProductionStatus = 
          validPercent >= 100 ? 'Completed' : validPercent > 0 ? 'In Production' : 'Queued';
        return { ...item, completionPercentage: validPercent, status: nextStatus };
      }
      return item;
    }));
  };

  // HTML5 Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDropOnMachine = (e: React.DragEvent, targetMachineId: string) => {
    e.preventDefault();
    if (!draggedItemId) return;

    const draggedItem = plannedItems.find(i => i.id === draggedItemId);
    if (!draggedItem) return;

    if (draggedItem.machineId !== targetMachineId) {
      const existingInTarget = plannedItems.filter(i => i.machineId === targetMachineId);
      setPlannedItems(prev => prev.map(item => {
        if (item.id === draggedItemId) {
          return {
            ...item,
            machineId: targetMachineId,
            sequenceOrder: existingInTarget.length + 1
          };
        }
        return item;
      }));
      const machine = machines.find(m => m.id === targetMachineId);
      successToast(`Moved ${draggedItem.orderNumber} Item #${draggedItem.orderItemSrNo || 1} to ${machine?.name || targetMachineId}`);
    }

    setDraggedItemId(null);
  };

  // Add Order to Plan Manually (Defaults to Machine 1)
  const handleAddOrderToPlan = () => {
    if (!newOrderForm.orderNumber.trim()) {
      errorToast('Please enter an Order Number');
      return;
    }

    const inputWeight = parseFloat(newOrderForm.weightInTonnesOrKg);
    if (isNaN(inputWeight) || inputWeight <= 0) {
      errorToast('Please enter a valid order weight');
      return;
    }

    const weightInKg = newOrderForm.unitType === 'TON' ? inputWeight * 1000 : inputWeight;
    const existingInMachine = plannedItems.filter(i => i.machineId === newOrderForm.machineId);

    const newItem: PlannedOrderItem = {
      id: `manual-plan-${Date.now()}`,
      orderId: `PO-${Date.now()}`,
      orderNumber: newOrderForm.orderNumber.trim(),
      orderItemSrNo: 1,
      totalItemsInOrder: 1,
      customerName: newOrderForm.customerName.trim() || 'CUSTOM CLIENT',
      itemDescription: newOrderForm.itemDescription.trim() || `${inputWeight} ${newOrderForm.unitType} Strap Order`,
      color: newOrderForm.color || 'Green',
      totalWeightKg: weightInKg,
      qty: parseInt(newOrderForm.qty, 10) || 100,
      qtyUnit: newOrderForm.qtyUnit || 'Rolls',
      completionPercentage: 0,
      machineId: newOrderForm.machineId || 'M-01',
      priority: newOrderForm.priority,
      sequenceOrder: existingInMachine.length + 1,
      status: 'Queued'
    };

    setPlannedItems(prev => [...prev, newItem]);
    setShowAddModal(false);
    setNewOrderForm({
      orderNumber: '',
      customerName: '',
      itemDescription: '',
      weightInTonnesOrKg: '1600',
      unitType: 'KG',
      qty: '100',
      qtyUnit: 'Rolls',
      color: 'Green',
      machineId: 'M-01',
      priority: 'Normal'
    });
    successToast(`Scheduled order ${newItem.orderNumber} on Machine 1`);
  };

  // Dynamic Autocomplete Options directly generated from DB Orders and Line Items
  const autocompleteOptions = useMemo<AutocompleteOrderOption[]>(() => {
    const options: AutocompleteOrderOption[] = [];
    const knownOrderNumbers = new Set<string>();

    dbOrders.forEach(order => {
      const orderNum = order.orderNumber || order.id;
      knownOrderNumbers.add(orderNum);

      const items = order.items && order.items.length > 0 ? order.items : [];
      const itemCount = items.length > 0 ? items.length : 1;
      const customer = order.customerName || (order as any).client?.companyName || 'Client';

      const orderOverall = getOrderOverallStatus(orderNum);

      const itemDescSummary = items.map((it, idx) => {
        const desc = it.strapSizeLength || (it as any).sizeLength || (it as any).description || 'Strap Item';
        const col = it.color || (it as any).colour || '';
        return `#${it.srNo || idx + 1}: ${desc}${col ? ` (${col})` : ''}`;
      }).join(' • ');

      const totalWeight = items.reduce((sum, it) => sum + (it.totalWt || 0), 0) || 1600;

      const searchTokens = [
        orderNum,
        customer,
        orderOverall.status,
        order.city || '',
        order.state || '',
        ...items.map(it => `${it.strapSizeLength || ''} ${it.sizeLength || ''} ${it.color || ''} ${it.colour || ''} ${it.coreSize || ''} ${it.surface || ''} ${it.bomNumber || ''}`)
      ].join(' ').toLowerCase();

      options.push({
        id: `order-${orderNum}`,
        type: 'ORDER',
        orderNumber: orderNum,
        orderId: order.id,
        customerName: customer,
        itemCount,
        totalWeightKg: totalWeight,
        orderStatus: orderOverall.status,
        displayTitle: `${orderNum} — ${customer} (${itemCount} ${itemCount === 1 ? 'item' : 'items'} • Order: ${orderOverall.status})`,
        subDetails: `Order Status: ${orderOverall.status} • ${itemDescSummary || 'All order line items'}`,
        allSearchText: searchTokens
      });

      if (items.length > 1) {
        items.forEach((it, idx) => {
          const srNo = it.srNo || idx + 1;
          const desc = it.strapSizeLength || (it as any).sizeLength || (it as any).description || `Item #${srNo}`;
          const col = it.color || (it as any).colour || '';
          const core = it.coreSize || '';
          const surface = it.surface || '';
          const bom = it.bomNumber || '';
          const wt = it.totalWt || ((it.qty || 100) * (it.netWtArticles || 16)) || 1600;

          // Find current planned item to reflect live item status
          const plannedItem = plannedItems.find(p => p.orderNumber === orderNum && p.orderItemSrNo === srNo);
          const currentItemStatus: ItemProductionStatus = plannedItem?.status || 'Queued';

          options.push({
            id: `item-${orderNum}-${srNo}`,
            type: 'ITEM',
            orderNumber: orderNum,
            orderId: order.id,
            customerName: customer,
            itemSrNo: srNo,
            itemCount: 1,
            itemDescription: desc,
            color: col,
            coreSize: core,
            surface,
            bomNumber: bom,
            totalWeightKg: wt,
            orderStatus: orderOverall.status,
            itemStatus: currentItemStatus,
            displayTitle: `${orderNum} Item #${srNo}: ${desc} [${currentItemStatus}]`,
            subDetails: `Item Status: ${currentItemStatus} • ${customer} • ${col ? `${col} • ` : ''}${wt} KG`,
            allSearchText: `${orderNum} ${customer} item ${srNo} ${desc} ${col} ${core} ${surface} ${bom} ${currentItemStatus} ${orderOverall.status}`.toLowerCase()
          });
        });
      }
    });

    const plannedByOrder = new Map<string, PlannedOrderItem[]>();
    plannedItems.forEach(item => {
      const list = plannedByOrder.get(item.orderNumber) || [];
      list.push(item);
      plannedByOrder.set(item.orderNumber, list);
    });

    plannedByOrder.forEach((items, orderNum) => {
      if (!knownOrderNumbers.has(orderNum)) {
        const first = items[0];
        const customer = first.customerName;
        const totalWeight = items.reduce((sum, it) => sum + it.totalWeightKg, 0);
        const orderOverall = getOrderOverallStatus(orderNum);

        options.push({
          id: `order-${orderNum}`,
          type: 'ORDER',
          orderNumber: orderNum,
          orderId: first.orderId,
          customerName: customer,
          itemCount: items.length,
          totalWeightKg: totalWeight,
          orderStatus: orderOverall.status,
          displayTitle: `${orderNum} — ${customer} (${items.length} items • ${orderOverall.status})`,
          subDetails: `Order Status: ${orderOverall.status} • ` + items.map(it => `#${it.orderItemSrNo || 1}: ${it.itemDescription}`).join(' • '),
          allSearchText: `${orderNum} ${customer} ${orderOverall.status} ${items.map(it => it.itemDescription).join(' ')}`.toLowerCase()
        });
      }
    });

    return options;
  }, [dbOrders, plannedItems]);

  // Distinct Orders for Quick Select Pills
  const distinctOrderOptions = useMemo(() => {
    const map = new Map<string, { orderNumber: string; customerName: string; itemCount: number }>();

    plannedItems.forEach(item => {
      const key = item.orderNumber || item.orderId;
      if (!map.has(key)) {
        map.set(key, {
          orderNumber: item.orderNumber,
          customerName: item.customerName,
          itemCount: 0
        });
      }
      map.get(key)!.itemCount += 1;
    });

    dbOrders.forEach(o => {
      const key = o.orderNumber || o.id;
      if (!map.has(key)) {
        map.set(key, {
          orderNumber: key,
          customerName: o.customerName || 'Client',
          itemCount: o.items?.length || 1
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.orderNumber.localeCompare(b.orderNumber));
  }, [plannedItems, dbOrders]);

  // Compute status counts for the filter tabs
  const statusCounts = useMemo(() => {
    const baseItems = plannedItems.filter(item => {
      if (selectedOption) {
        if (selectedOption.type === 'ORDER') {
          return item.orderNumber === selectedOption.orderNumber || item.orderId === selectedOption.orderNumber;
        } else if (selectedOption.type === 'ITEM') {
          return (item.orderNumber === selectedOption.orderNumber || item.orderId === selectedOption.orderNumber) && item.orderItemSrNo === selectedOption.itemSrNo;
        }
      } else if (selectedOrderFilter) {
        return item.orderNumber === selectedOrderFilter || item.orderId === selectedOrderFilter;
      }
      return true;
    });

    if (statusFilterScope === 'ORDER') {
      return {
        all: baseItems.length,
        inProduction: baseItems.filter(i => getOrderOverallStatus(i.orderNumber).status === 'In Production').length,
        queued: baseItems.filter(i => getOrderOverallStatus(i.orderNumber).status === 'Queued').length,
        completed: baseItems.filter(i => getOrderOverallStatus(i.orderNumber).status === 'Completed').length,
        onHold: baseItems.filter(i => getOrderOverallStatus(i.orderNumber).status === 'On Hold').length,
      };
    }

    return {
      all: baseItems.length,
      inProduction: baseItems.filter(i => i.status === 'In Production' && (i.completionPercentage || 0) < 100).length,
      queued: baseItems.filter(i => (i.status === 'Queued' || !i.status) && (i.completionPercentage || 0) === 0).length,
      completed: baseItems.filter(i => i.status === 'Completed' || (i.completionPercentage || 0) >= 100).length,
      onHold: baseItems.filter(i => i.status === 'On Hold').length,
    };
  }, [plannedItems, selectedOption, selectedOrderFilter, statusFilterScope]);

  // Filter Planned Items based on Autocomplete Selection, Status Filter, Scope & Live Search
  const filteredPlannedItems = useMemo(() => {
    return plannedItems.filter(item => {
      // 1. Filter by Autocomplete Selection
      if (selectedOption) {
        if (selectedOption.type === 'ORDER') {
          if (item.orderNumber !== selectedOption.orderNumber && item.orderId !== selectedOption.orderNumber) {
            return false;
          }
        } else if (selectedOption.type === 'ITEM') {
          if (
            (item.orderNumber !== selectedOption.orderNumber && item.orderId !== selectedOption.orderNumber) ||
            item.orderItemSrNo !== selectedOption.itemSrNo
          ) {
            return false;
          }
        }
      } else if (selectedOrderFilter) {
        if (item.orderNumber !== selectedOrderFilter && item.orderId !== selectedOrderFilter) {
          return false;
        }
      }

      // 2. Hide Completed toggle (if enabled, hide any 100% / Completed items)
      if (hideCompleted && (item.status === 'Completed' || (item.completionPercentage || 0) >= 100)) {
        return false;
      }

      // 3. Filter by Status (per Item OR per Order):
      // "If production item is completed then remove from inproduction"
      if (selectedStatusFilter !== 'ALL') {
        if (statusFilterScope === 'ORDER') {
          const orderSt = getOrderOverallStatus(item.orderNumber).status;
          if (selectedStatusFilter === 'In Production') {
            if (orderSt !== 'In Production') return false;
          } else if (selectedStatusFilter === 'Completed') {
            if (orderSt !== 'Completed') return false;
          } else if (selectedStatusFilter === 'Queued') {
            if (orderSt !== 'Queued') return false;
          } else if (selectedStatusFilter === 'On Hold') {
            if (orderSt !== 'On Hold') return false;
          }
        } else {
          // ITEM STATUS FILTER
          if (selectedStatusFilter === 'In Production') {
            if (item.status !== 'In Production' || (item.completionPercentage || 0) >= 100) {
              return false;
            }
          } else if (selectedStatusFilter === 'Completed') {
            if (item.status !== 'Completed' && (item.completionPercentage || 0) < 100) {
              return false;
            }
          } else if (selectedStatusFilter === 'Queued') {
            if (item.status !== 'Queued' || (item.completionPercentage || 0) > 0) {
              return false;
            }
          } else if (selectedStatusFilter === 'On Hold') {
            if (item.status !== 'On Hold') {
              return false;
            }
          }
        }
      }

      // 4. Filter by Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesOrderNum = item.orderNumber?.toLowerCase().includes(q);
        const matchesCust = item.customerName?.toLowerCase().includes(q);
        const matchesDesc = item.itemDescription?.toLowerCase().includes(q);
        const matchesColor = item.color?.toLowerCase().includes(q);
        const matchesBom = item.bomNumber?.toLowerCase().includes(q);
        const matchesStatus = item.status?.toLowerCase().includes(q);
        if (!matchesOrderNum && !matchesCust && !matchesDesc && !matchesColor && !matchesBom && !matchesStatus) {
          return false;
        }
      }

      return true;
    });
  }, [plannedItems, selectedOption, selectedOrderFilter, selectedStatusFilter, statusFilterScope, hideCompleted, searchQuery]);

  // Calculate Machine Schedules with Time Stamps based on Filtered Items
  const machineSchedules = useMemo(() => {
    const now = new Date();

    return machines.map(m => {
      const itemsForMachine = filteredPlannedItems
        .filter(i => i.machineId === m.id)
        .sort((a, b) => a.sequenceOrder - b.sequenceOrder);

      let currentTimeCursor = new Date(now.getTime());
      let totalMachineKg = 0;
      let totalMachineMins = 0;

      const itemsWithSchedule = itemsForMachine.map(item => {
        totalMachineKg += item.totalWeightKg;

        const remainingKg = item.totalWeightKg * (1 - (item.completionPercentage || 0) / 100);
        const minsNeeded = remainingKg / (m.outputKgPerMin || 1.0);
        totalMachineMins += minsNeeded;

        const startTime = new Date(currentTimeCursor.getTime());
        const endTime = new Date(currentTimeCursor.getTime() + minsNeeded * 60 * 1000);
        currentTimeCursor = endTime;

        return {
          ...item,
          minsNeeded,
          hoursNeeded: minsNeeded / 60,
          startTimeStr: startTime.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
          endTimeStr: endTime.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
        };
      });

      return {
        machine: m,
        items: itemsWithSchedule,
        totalKg: totalMachineKg,
        totalTons: totalMachineKg / 1000,
        totalMins: totalMachineMins,
        totalHoursStr: formatMinutesToHoursStr(totalMachineMins)
      };
    });
  }, [machines, filteredPlannedItems]);

  // Overall KPIs (Reflects Filtered Selection)
  const overallTons = useMemo(() => {
    return filteredPlannedItems.reduce((acc, curr) => acc + curr.totalWeightKg, 0) / 1000;
  }, [filteredPlannedItems]);

  const urgentCount = useMemo(() => {
    return filteredPlannedItems.filter(i => i.priority === 'Urgent' || i.priority === 'High').length;
  }, [filteredPlannedItems]);

  return (
    <DashboardLayout>
      <div className="flex flex-col min-h-screen bg-gray-50/70 p-4 sm:p-6 space-y-4 text-gray-800 font-sans">
        
        {/* HEADER BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-gray-200/80 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl shadow-inner">
              <Factory className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Production Kanban & Machine Planning</h1>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Item-level manufacturing schedules with live Order & Production status tracking and machine line balancing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/master/machines')}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              <Settings className="w-4 h-4" />
              <span>Machine Master</span>
            </button>

            <button
              onClick={loadProductionOrders}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all cursor-pointer"
              title="Refresh Orders from Database"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-600' : ''}`} />
            </button>

            <button
              onClick={() => {
                setNewOrderForm(prev => ({ ...prev, machineId: 'M-01' }));
                setShowAddModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Plan New Order</span>
            </button>
          </div>
        </div>

        {/* TOP FILTER TOOLBAR WITH REUSABLE AUTOCOMPLETE */}
        <div className="bg-white border border-gray-200/90 rounded-2xl p-3.5 sm:p-4 shadow-2xs space-y-3">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Left: Reusable Autocomplete Search & Filter directly from DB */}
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
              
              <div className="flex items-center gap-2 flex-1 min-w-[320px] max-w-2xl">
                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700 shrink-0">
                  <Filter className="w-4 h-4 text-emerald-600" />
                  <span className="hidden sm:inline">Search & Filter:</span>
                </div>

                {/* Standalone Reusable Autocomplete */}
                <div className="flex-1 min-w-0">
                  <StandaloneAutocomplete<AutocompleteOrderOption>
                    value={selectedOption}
                    onChange={(val) => {
                      setSelectedOption(val);
                      if (val) {
                        setSelectedOrderFilter(val.orderNumber);
                      } else {
                        setSelectedOrderFilter('');
                      }
                    }}
                    options={autocompleteOptions}
                    getOptionLabel={(opt) => opt.displayTitle}
                    renderOptionLabel={(opt) => {
                      const isItem = opt.type === 'ITEM';
                      return (
                        <div className="flex flex-col py-1.5 px-1 w-full gap-1 border-b border-gray-100 last:border-b-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`font-mono text-xs font-black px-2 py-0.5 rounded shrink-0 ${
                                isItem 
                                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                {opt.orderNumber}
                              </span>
                              {isItem ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black px-1.5 py-0.2 rounded shrink-0">
                                  Item #{opt.itemSrNo}
                                </span>
                              ) : (
                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                  opt.orderStatus === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : opt.orderStatus === 'In Production'
                                    ? 'bg-blue-100 text-blue-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  Order: {opt.orderStatus}
                                </span>
                              )}
                              <span className="font-bold text-xs text-gray-900 truncate">
                                {opt.customerName}
                              </span>
                            </div>

                            <span className="text-[11px] font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full shrink-0">
                              {isItem ? `${opt.totalWeightKg.toLocaleString()} KG` : `${opt.itemCount} items • ${(opt.totalWeightKg / 1000).toFixed(1)}T`}
                            </span>
                          </div>

                          <div className="text-[11px] text-gray-600 truncate flex items-center gap-1.5 pl-0.5">
                            <Package className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            <span className="truncate">{opt.subDetails}</span>
                          </div>
                        </div>
                      );
                    }}
                    placeholder="Search customer name, item detail, SKU, color or PO number..."
                    size="small"
                    startIcon={<Search className="w-4 h-4 text-emerald-600" />}
                    sx={{
                      width: '100%',
                      '& .MuiOutlinedInput-root': {
                        backgroundColor: '#f9fafb',
                        borderRadius: '0.75rem',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        '&:hover': {
                          backgroundColor: '#ffffff'
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Clear Filter Button */}
              {(selectedOption || selectedOrderFilter || selectedStatusFilter !== 'ALL' || searchQuery) && (
                <button
                  onClick={() => {
                    setSelectedOption(null);
                    setSelectedOrderFilter('');
                    setSelectedStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all cursor-pointer shrink-0"
                  title="Clear all filters"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Clear All Filters</span>
                </button>
              )}
            </div>

            {/* Right: Active Filter Badge */}
            <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
              {selectedOption ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>
                    {selectedOption.type === 'ITEM' ? (
                      <>Item #{selectedOption.itemSrNo} in <strong className="font-extrabold">{selectedOption.orderNumber}</strong> ({selectedOption.customerName})</>
                    ) : (
                      <>Order: <strong className="font-extrabold">{selectedOption.orderNumber}</strong> ({selectedOption.customerName})</>
                    )}
                  </span>
                  <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black">
                    {filteredPlannedItems.length} {filteredPlannedItems.length === 1 ? 'item' : 'items'}
                  </span>
                  <button
                    onClick={() => {
                      setSelectedOption(null);
                      setSelectedOrderFilter('');
                    }}
                    className="text-emerald-700 hover:text-emerald-900 font-bold ml-1 cursor-pointer"
                    title="Reset order filter"
                  >
                    ✕
                  </button>
                </div>
              ) : selectedOrderFilter ? (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Order: <strong className="font-extrabold">{selectedOrderFilter}</strong></span>
                  <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black">
                    {filteredPlannedItems.length} {filteredPlannedItems.length === 1 ? 'item' : 'items'}
                  </span>
                  <button
                    onClick={() => setSelectedOrderFilter('')}
                    className="text-emerald-700 hover:text-emerald-900 font-bold ml-1 cursor-pointer"
                    title="Reset order filter"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <span className="text-xs text-gray-500 font-medium">
                  Showing <strong>{filteredPlannedItems.length}</strong> items across <strong>{machines.length}</strong> machines
                </span>
              )}
            </div>

          </div>

          {/* Quick Select Order Pills */}
          {distinctOrderOptions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 text-xs no-scrollbar border-t border-gray-100">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">Quick Select:</span>
              <button
                onClick={() => {
                  setSelectedOption(null);
                  setSelectedOrderFilter('');
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  !selectedOption && !selectedOrderFilter ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                All Orders
              </button>
              {distinctOrderOptions.map(opt => {
                const isSelected = (selectedOption?.orderNumber === opt.orderNumber) || (selectedOrderFilter === opt.orderNumber);
                const orderSt = getOrderOverallStatus(opt.orderNumber);

                return (
                  <button
                    key={opt.orderNumber}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedOption(null);
                        setSelectedOrderFilter('');
                      } else {
                        const found = autocompleteOptions.find(o => o.type === 'ORDER' && o.orderNumber === opt.orderNumber);
                        setSelectedOption(found || null);
                        setSelectedOrderFilter(opt.orderNumber);
                      }
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      isSelected 
                        ? 'bg-emerald-700 text-white ring-2 ring-emerald-500/30' 
                        : 'bg-white hover:bg-gray-100 text-gray-700 border border-gray-200'
                    }`}
                  >
                    <span>{opt.orderNumber}</span>
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      orderSt.status === 'Completed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : orderSt.status === 'In Production'
                        ? 'bg-blue-100 text-blue-800'
                        : isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {opt.itemCount} {opt.itemCount === 1 ? 'item' : 'items'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* STATUS FILTER BAR (ITEM STATUS VS ORDER STATUS) */}
          <div className="pt-2.5 border-t border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Left: Scope Switcher & Status Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              
              {/* Status Filter Scope: Item vs Order */}
              <div className="flex items-center bg-gray-100 p-0.5 rounded-xl border border-gray-200/80 shrink-0 shadow-inner">
                <button
                  onClick={() => setStatusFilterScope('ITEM')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilterScope === 'ITEM' 
                      ? 'bg-white text-emerald-800 shadow-2xs' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Filter by individual production line item status"
                >
                  Production Item Status
                </button>
                <button
                  onClick={() => setStatusFilterScope('ORDER')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    statusFilterScope === 'ORDER' 
                      ? 'bg-white text-blue-800 shadow-2xs' 
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                  title="Filter by overall order status"
                >
                  Order Overall Status
                </button>
              </div>

              <span className="text-gray-300 hidden sm:inline">|</span>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
                <button
                  onClick={() => setSelectedStatusFilter('ALL')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedStatusFilter === 'ALL'
                      ? 'bg-gray-900 text-white shadow-2xs'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  All ({statusCounts.all})
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('In Production')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedStatusFilter === 'In Production'
                      ? 'bg-blue-600 text-white shadow-2xs ring-2 ring-blue-300'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                  }`}
                  title={statusFilterScope === 'ITEM' ? "Items currently running on machines (excludes completed items)" : "Orders with production in progress"}
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                  <span>In Production</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    selectedStatusFilter === 'In Production' ? 'bg-white/20 text-white' : 'bg-blue-200/70 text-blue-900'
                  }`}>
                    {statusCounts.inProduction}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('Queued')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedStatusFilter === 'Queued'
                      ? 'bg-amber-600 text-white shadow-2xs ring-2 ring-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                  title="Waiting in sequence (0% progress)"
                >
                  <span>⏳ Queued</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    selectedStatusFilter === 'Queued' ? 'bg-white/20 text-white' : 'bg-amber-200/70 text-amber-900'
                  }`}>
                    {statusCounts.queued}
                  </span>
                </button>

                <button
                  onClick={() => setSelectedStatusFilter('Completed')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                    selectedStatusFilter === 'Completed'
                      ? 'bg-emerald-600 text-white shadow-2xs ring-2 ring-emerald-300'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                  title="Reached 100% completion"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Completed</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                    selectedStatusFilter === 'Completed' ? 'bg-white/20 text-white' : 'bg-emerald-200/70 text-emerald-900'
                  }`}>
                    {statusCounts.completed}
                  </span>
                </button>

                {statusCounts.onHold > 0 && (
                  <button
                    onClick={() => setSelectedStatusFilter('On Hold')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                      selectedStatusFilter === 'On Hold'
                        ? 'bg-red-600 text-white shadow-2xs'
                        : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                    }`}
                  >
                    <span>⏸️ On Hold ({statusCounts.onHold})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right: Hide Completed Checkbox & Filter Summary */}
            <div className="flex items-center gap-3 text-xs self-start lg:self-auto shrink-0">
              <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer select-none bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded-xl border border-gray-200">
                <input
                  type="checkbox"
                  checked={hideCompleted}
                  onChange={(e) => setHideCompleted(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                />
                <span>Hide Completed</span>
              </label>

              {selectedStatusFilter !== 'ALL' && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 font-semibold border border-gray-200">
                  <span>{statusFilterScope === 'ORDER' ? 'Order' : 'Item'}: <strong className="font-extrabold text-gray-900">{selectedStatusFilter}</strong></span>
                  <button
                    onClick={() => setSelectedStatusFilter('ALL')}
                    className="text-gray-400 hover:text-gray-700 font-bold ml-1 cursor-pointer"
                    title="Show all"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* COMPACT KPI BAR (REFLECTS FILTERED ITEMS) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white border border-gray-200/80 px-4 py-3 rounded-xl shadow-2xs flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {selectedOption || selectedOrderFilter || selectedStatusFilter !== 'ALL' ? 'Filtered Volume' : 'Total Volume'}
              </span>
              <div className="text-lg font-extrabold text-gray-900 flex items-baseline gap-1">
                <AnimatedNumber value={overallTons} decimals={2} /> <span className="text-xs font-medium text-gray-500">Tonnes</span>
              </div>
            </div>
            <Layers className="w-5 h-5 text-emerald-600" />
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white border border-gray-200/80 px-4 py-3 rounded-xl shadow-2xs flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Max Queue Time</span>
              <div className="text-lg font-extrabold text-gray-900">
                {formatMinutesToHoursStr(machineSchedules.reduce((acc, m) => Math.max(acc, m.totalMins), 0))}
              </div>
            </div>
            <Clock className="w-5 h-5 text-purple-500" />
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white border border-gray-200/80 px-4 py-3 rounded-xl shadow-2xs flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">In Production / Completed</span>
              <div className="text-base font-extrabold text-blue-700 flex items-center gap-1">
                <AnimatedNumber value={statusCounts.inProduction} /> <span>Running</span> • <span className="text-emerald-700 flex items-center gap-1"><AnimatedNumber value={statusCounts.completed} className="text-emerald-700" /> Done</span>
              </div>
            </div>
            <Zap className="w-5 h-5 text-blue-500" />
          </motion.div>

          <motion.div
            whileHover={{ y: -3, transition: { duration: 0.2 } }}
            className="bg-white border border-gray-200/80 px-4 py-3 rounded-xl shadow-2xs flex items-center justify-between"
          >
            <div>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Active Lines</span>
              <div className="text-lg font-extrabold text-emerald-700 flex items-center gap-1">
                <AnimatedNumber value={machines.filter(m => m.status === 'Running').length} className="text-emerald-700" />
                <span>/ {machines.length} Running</span>
              </div>
            </div>
            <Factory className="w-5 h-5 text-emerald-500" />
          </motion.div>
        </div>

        {/* VIEW TYPE TABS */}
        <div className="flex items-center justify-between border-b border-gray-200/80 pb-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('board')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'board' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <ListOrdered className="w-4 h-4" />
              <span>Kanban Board</span>
            </button>
            <button
              onClick={() => setActiveTab('gantt')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'gantt' ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Timeline View</span>
            </button>
          </div>

          <span className="text-xs text-gray-500 font-medium hidden sm:inline">
            💡 When an item reaches 100% completion, it is marked Completed and removed from In Production.
          </span>
        </div>

        {/* JIRA KANBAN BOARD VIEW (4 COLUMNS FOR 4 MACHINES) */}
        {activeTab === 'board' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2.5 items-start">
            {machineSchedules.map((sch, machineIdx) => {
              const kgPerHour = Math.round(sch.machine.outputKgPerMin * 60);

              return (
                <motion.div
                  key={sch.machine.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: machineIdx * 0.05, duration: 0.3 }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDropOnMachine(e, sch.machine.id)}
                  className="bg-gray-100/90 border border-gray-200/90 rounded-2xl p-2 flex flex-col min-h-[550px] shadow-2xs transition-all"
                >
                  {/* MACHINE COLUMN HEADER */}
                  <div className="bg-gradient-to-b from-emerald-50/70 via-emerald-50/20 to-white rounded-xl border-2 border-emerald-500/25 shadow-xs mb-2.5 overflow-hidden transition-all hover:border-emerald-500/40">
                    <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 text-white px-3 py-2 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="p-1 bg-white/15 rounded-md shrink-0 backdrop-blur-xs">
                          <Factory className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${sch.machine.status === 'Running' ? 'bg-emerald-200 animate-pulse' : 'bg-amber-300'}`} />
                          <h3 className="font-extrabold text-sm text-white tracking-wide truncate" title={sch.machine.name}>
                            {sch.machine.name}
                          </h3>
                        </div>
                      </div>
                      <span className="text-xs font-extrabold px-2.5 py-0.5 bg-white/20 text-white rounded-full border border-white/30 shrink-0 backdrop-blur-xs">
                        {sch.items.length} {sch.items.length === 1 ? 'Item' : 'Items'}
                      </span>
                    </div>

                    <div className="p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-1 p-1.5 bg-white rounded-lg border border-emerald-200/90 shadow-2xs">
                        <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                          <Sliders className="w-3.5 h-3.5 text-emerald-600" />
                          Per-Hour Limit:
                        </span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="10"
                            min="10"
                            value={kgPerHour}
                            onChange={(e) => {
                              const newHr = parseFloat(e.target.value);
                              if (newHr > 0) {
                                handleUpdateMachineSpeedKgHr(sch.machine.id, newHr);
                              }
                            }}
                            className="w-16 text-right text-sm font-black text-emerald-900 border border-emerald-300 rounded px-1.5 py-0.5 outline-none bg-emerald-50/60 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 transition-all"
                          />
                          <span className="text-xs font-black text-emerald-700">KG/hr</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs font-medium bg-emerald-100/40 border border-emerald-200/50 rounded-lg px-2.5 py-1.5 text-gray-700">
                        <span>Total: <strong className="text-emerald-900 font-extrabold"><AnimatedNumber value={sch.totalTons} decimals={2} /> Ton</strong></span>
                        <span>Run Time: <strong className="text-gray-900 font-extrabold">{sch.totalHoursStr}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* CARDS CONTAINER */}
                  <div className="flex-1 space-y-2.5">
                    {sch.items.length === 0 ? (
                      <div className="py-12 border-2 border-dashed border-gray-200 rounded-xl text-center text-xs text-gray-400 font-medium px-4">
                        {selectedStatusFilter !== 'ALL'
                          ? `No ${selectedStatusFilter} items on ${sch.machine.code}`
                          : selectedOption 
                          ? `No items for ${selectedOption.displayTitle} on ${sch.machine.code}`
                          : selectedOrderFilter
                          ? `No items for ${selectedOrderFilter} on ${sch.machine.code}`
                          : 'Drag order item card here or click + below'}
                      </div>
                    ) : (
                      sch.items.map((item, idx) => {
                        const weightTons = (item.totalWeightKg / 1000).toFixed(2);
                        const colorProps = getColorBadgeProps(item.color);
                        const orderOverall = getOrderOverallStatus(item.orderNumber);

                        return (
                          <motion.div
                            key={item.id}
                            whileHover={{ y: -2, transition: { duration: 0.15 } }}
                            draggable={true}
                            onDragStart={(e: any) => handleDragStart(e, item.id)}
                            className={`bg-white rounded-xl border p-3 shadow-2xs hover:shadow-md transition-all space-y-2.5 cursor-grab active:cursor-grabbing ${
                              draggedItemId === item.id 
                                ? 'opacity-40 border-dashed border-emerald-500' 
                                : item.status === 'Completed'
                                ? 'border-emerald-300 bg-emerald-50/20'
                                : 'border-gray-200 hover:border-emerald-300'
                            }`}
                          >
                            {/* CARD TOP: ORDER NO, ITEM BADGE & PRIORITY */}
                            <div className="flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span 
                                  className="font-black font-mono text-xs text-emerald-700 hover:underline cursor-pointer truncate"
                                  onClick={() => navigate('/production-orders')}
                                  title="View Production Orders"
                                >
                                  {item.orderNumber}
                                </span>
                                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-black uppercase shrink-0">
                                  #{item.orderItemSrNo || 1} {item.totalItemsInOrder ? `of ${item.totalItemsInOrder}` : ''}
                                </span>
                              </div>

                              <button
                                onClick={() => handleTogglePriority(item.id, item.priority)}
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                                  item.priority === 'Urgent'
                                    ? 'bg-red-100 text-red-700 border-red-300'
                                    : item.priority === 'High'
                                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                                    : 'bg-gray-100 text-gray-600 border-gray-200'
                                }`}
                                title="Click to toggle priority"
                              >
                                ⚡ {item.priority}
                              </button>
                            </div>

                            {/* CUSTOMER NAME */}
                            <h4 className="font-bold text-xs sm:text-sm text-gray-900 leading-tight truncate" title={item.customerName}>
                              {item.customerName}
                            </h4>

                            {/* DUAL STATUS CONTROLS (ORDER STATUS & ITEM STATUS) */}
                            <div className="bg-slate-50/90 p-2 rounded-xl border border-slate-200/80">
                              <div className="grid grid-cols-2 gap-2">
                                {/* Overall Order Status Dropdown */}
                                <div>
                                  <div className="flex items-center justify-between mb-1 px-0.5">
                                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Order</span>
                                    <span className="text-[9px] font-semibold text-gray-400">All Items</span>
                                  </div>
                                  <CustomStatusDropdown
                                    id={`order-${item.orderNumber}`}
                                    value={orderOverall.status}
                                    isOpen={openDropdownId === `order-${item.id}`}
                                    onToggle={() => setOpenDropdownId(openDropdownId === `order-${item.id}` ? null : `order-${item.id}`)}
                                    onChange={(newStatus) => {
                                      handleUpdateOrderStatus(item.orderNumber, newStatus);
                                      setOpenDropdownId(null);
                                    }}
                                    align="left"
                                    title={`Order Overall Status: ${orderOverall.label}. Changing will set status for all items in this order`}
                                  />
                                </div>

                                {/* Production Item Status Dropdown */}
                                <div>
                                  <div className="flex items-center justify-between mb-1 px-0.5">
                                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Item</span>
                                    <span className="text-[9px] font-semibold text-emerald-800 bg-emerald-100/90 px-1 py-0.2 rounded">
                                      #{item.orderItemSrNo || 1}
                                    </span>
                                  </div>
                                  <CustomStatusDropdown
                                    id={`item-${item.id}`}
                                    value={item.status || 'Queued'}
                                    isOpen={openDropdownId === `item-${item.id}`}
                                    onToggle={() => setOpenDropdownId(openDropdownId === `item-${item.id}` ? null : `item-${item.id}`)}
                                    onChange={(newStatus) => {
                                      handleUpdateItemStatus(item.id, newStatus);
                                      setOpenDropdownId(null);
                                    }}
                                    align="right"
                                    title="Production Item Status. Marking Completed removes item from In Production"
                                  />
                                </div>
                              </div>
                            </div>

                            {/* MANUFACTURED ITEM DESCRIPTION */}
                            <div className="bg-gray-50/80 p-2 rounded-lg border border-gray-100 space-y-1.5">
                              <p className="text-xs font-bold text-gray-800 leading-snug break-words">
                                {item.itemDescription}
                              </p>

                              {/* ITEM ATTRIBUTES: COLOR, CORE, SURFACE, BOM */}
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {item.color && (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${colorProps.bg}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${colorProps.dot}`} />
                                    {item.color}
                                  </span>
                                )}
                                {item.coreSize && (
                                  <span className="text-[10px] font-semibold text-gray-600 bg-gray-200/70 px-1.5 py-0.5 rounded">
                                    Core: {item.coreSize}
                                  </span>
                                )}
                                {item.surface && (
                                  <span className="text-[10px] font-semibold text-gray-600 bg-gray-200/70 px-1.5 py-0.5 rounded">
                                    {item.surface}
                                  </span>
                                )}
                                {item.bomNumber && (
                                  <span 
                                    onClick={() => navigate(`/bom/${item.bomNumber}`)}
                                    className="text-[10px] font-extrabold text-teal-800 bg-teal-100 border border-teal-300 px-1.5 py-0.5 rounded cursor-pointer hover:underline inline-flex items-center gap-1"
                                    title="View BOM Recipe"
                                  >
                                    Recipe: {item.bomNumber}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* QTY AND WEIGHT IN KG & TON */}
                            <div className="bg-emerald-50/40 p-2 rounded-lg border border-emerald-100 text-xs flex items-center justify-between">
                              <span className="font-bold text-gray-700">{item.qty?.toLocaleString()} {item.qtyUnit || 'Rolls'}</span>
                              <div className="font-extrabold text-gray-900 text-right">
                                {item.totalWeightKg.toLocaleString()} <span className="text-[10px] text-gray-500 font-semibold">KG</span>
                                <span className="text-[11px] text-emerald-700 font-bold ml-1">({weightTons} Ton)</span>
                              </div>
                            </div>

                            {/* ORDER COMPLETION PROGRESS LINE & ONE-CLICK STATUS ACTIONS */}
                            <div className="space-y-1.5 bg-gray-50/80 p-2 rounded-xl border border-gray-100">
                              <div className="flex items-center justify-between text-xs font-bold">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-gray-600 font-semibold">Item Production:</span>
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-[10px] font-black shadow-2xs border transition-all ${
                                      (item.completionPercentage || 0) >= 100
                                        ? 'bg-emerald-600 text-white border-emerald-600'
                                        : (item.completionPercentage || 0) > 0
                                        ? 'bg-blue-100 text-blue-900 border-blue-300'
                                        : 'bg-gray-100 text-gray-600 border-gray-200'
                                    }`}
                                  >
                                    {(item.completionPercentage || 0) >= 100 
                                      ? '✅ Completed (100%)' 
                                      : `${item.completionPercentage || 0}% Progress`}
                                  </span>
                                </div>

                                {/* Quick Action Button */}
                                {item.status === 'In Production' ? (
                                  <button
                                    onClick={() => handleUpdateItemStatus(item.id, 'Completed')}
                                    className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                                    title="Mark 100% complete (removes from In Production)"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Done</span>
                                  </button>
                                ) : item.status === 'Completed' ? (
                                  <button
                                    onClick={() => handleUpdateItemStatus(item.id, 'In Production')}
                                    className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-[10px] font-semibold border border-gray-200 transition-all cursor-pointer flex items-center gap-1"
                                    title="Reopen item into In Production"
                                  >
                                    <RotateCcw className="w-2.5 h-2.5" />
                                    <span>Reopen</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleUpdateItemStatus(item.id, 'In Production')}
                                    className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] font-bold shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                                    title="Start production"
                                  >
                                    <Play className="w-2.5 h-2.5 fill-current" />
                                    <span>Start</span>
                                  </button>
                                )}
                              </div>

                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="5"
                                value={item.completionPercentage || 0}
                                onChange={(e) => handleUpdateCompletion(item.id, parseInt(e.target.value, 10))}
                                className={`w-full h-1.5 cursor-pointer rounded-lg ${
                                  (item.completionPercentage || 0) >= 100 ? 'accent-emerald-600' : 'accent-blue-600'
                                }`}
                                title="Slide to update item completion percentage (100% removes from In Production)"
                              />
                            </div>

                            {/* MACHINE ESTIMATED TIME FOR THIS PARTICULAR MACHINE */}
                            <div className="flex items-center justify-between text-xs bg-emerald-50/70 px-2.5 py-1.5 rounded-lg border border-emerald-200/70">
                              <span className="font-bold text-emerald-950">Machine Run Time:</span>
                              <span className="font-black text-emerald-800">⏱️ {formatMinutesToHoursStr(item.minsNeeded)}</span>
                            </div>

                            {/* PRODUCTION START & COMPLETION TIME */}
                            <div className="space-y-0.5 text-[11px] text-gray-500 pt-1 border-t border-gray-100">
                              <div className="flex items-center justify-between">
                                <span>Start:</span>
                                <strong className="text-gray-800 font-semibold">{item.startTimeStr}</strong>
                              </div>
                              <div className="flex items-center justify-between">
                                <span>Completion:</span>
                                <strong className="text-emerald-700 font-extrabold">{item.endTimeStr}</strong>
                              </div>
                            </div>

                            {/* CARD CONTROLS: MOVE LEFT/RIGHT MACHINE & UP/DOWN QUEUE */}
                            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs">
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMoveColumn(item.id, 'LEFT')}
                                  disabled={machineIdx === 0}
                                  className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded disabled:opacity-20 cursor-pointer"
                                  title="Move to Previous Machine Column"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] text-gray-400 font-mono">Move</span>
                                <button
                                  onClick={() => handleMoveColumn(item.id, 'RIGHT')}
                                  disabled={machineIdx === machines.length - 1}
                                  className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded disabled:opacity-20 cursor-pointer"
                                  title="Move to Next Machine Column"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleMoveSequence(sch.machine.id, item.id, 'UP')}
                                  disabled={idx === 0}
                                  className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded disabled:opacity-20 cursor-pointer"
                                  title="Move Up in Queue"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[10px] font-bold text-gray-600">#{idx + 1}</span>
                                <button
                                  onClick={() => handleMoveSequence(sch.machine.id, item.id, 'DOWN')}
                                  disabled={idx === sch.items.length - 1}
                                  className="p-1 text-gray-500 hover:text-black hover:bg-gray-100 rounded disabled:opacity-20 cursor-pointer"
                                  title="Move Down in Queue"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>

                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {/* BOTTOM ADD BUTTON FOR MACHINE COLUMN */}
                  <button
                    onClick={() => {
                      setNewOrderForm(prev => ({ ...prev, machineId: sch.machine.id }));
                      setShowAddModal(true);
                    }}
                    className="mt-2 w-full py-1.5 bg-white hover:bg-emerald-50 border border-dashed border-gray-300 hover:border-emerald-300 rounded-xl text-xs font-bold text-gray-600 hover:text-emerald-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Order Item to {sch.machine.code}</span>
                  </button>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* TIMELINE / GANTT VIEW */}
        {activeTab === 'gantt' && (
          <div className="bg-white border border-gray-200/90 rounded-2xl shadow-xs p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Machine Production Gantt Timeline</h3>
                <p className="text-xs text-gray-500">
                  Visual production timeline per line for manufactured items{selectedStatusFilter !== 'ALL' ? ` [Status: ${selectedStatusFilter}]` : ''}{selectedOption ? ` (Filtered: ${selectedOption.displayTitle})` : selectedOrderFilter ? ` (Filtered: ${selectedOrderFilter})` : ''}.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {machineSchedules.map(sch => (
                <div key={sch.machine.id} className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-gray-900">{sch.machine.name} ({(sch.machine.outputKgPerMin * 60).toFixed(0)} kg/hr)</span>
                    <span className="text-emerald-700">{sch.totalTons.toFixed(2)} Tonnes • {sch.totalHoursStr}</span>
                  </div>

                  {/* TIMELINE BAR */}
                  <div className="w-full bg-gray-100 h-10 rounded-xl flex overflow-hidden border border-gray-200/80 relative">
                    {sch.items.length === 0 ? (
                      <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                        No orders scheduled for this line
                      </div>
                    ) : (
                      sch.items.map((item, idx) => {
                        const percent = sch.totalMins > 0 ? (item.minsNeeded / sch.totalMins) * 100 : 100;
                        const bgColors = ['bg-emerald-500', 'bg-blue-500', 'bg-purple-500', 'bg-amber-500', 'bg-teal-500'];
                        const colorClass = bgColors[idx % bgColors.length];

                        return (
                          <div
                            key={item.id}
                            style={{ width: `${Math.max(percent, 5)}%` }}
                            className={`${colorClass} h-full text-white text-[11px] font-bold px-2 flex items-center justify-between border-r border-white/30 truncate transition-all hover:brightness-110 cursor-pointer`}
                            title={`${item.orderNumber} Item #${item.orderItemSrNo || 1} - ${item.customerName} (${item.totalWeightKg} KG) - Status: ${item.status} (${item.completionPercentage}%) - Est: ${formatMinutesToHoursStr(item.minsNeeded)}`}
                          >
                            <span className="truncate">
                              {item.orderNumber} #{item.orderItemSrNo || 1} ({item.totalWeightKg >= 1000 ? `${(item.totalWeightKg/1000).toFixed(1)}T` : `${item.totalWeightKg}kg`}) [{item.status}]
                            </span>
                            <span className="text-[10px] opacity-90">{formatMinutesToHoursStr(item.minsNeeded)}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PLAN NEW ORDER MODAL */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 animate-in zoom-in-95 duration-200 space-y-4">
              
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                    <Plus className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-gray-900">Plan New Production Order Item</h3>
                    <p className="text-xs text-gray-500">Assign item manufacturing line (defaults to Machine 1).</p>
                  </div>
                </div>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold cursor-pointer">✕</button>
              </div>

              {/* Existing API Production Orders Selector */}
              {dbOrders.length > 0 && (
                <div className="space-y-1 bg-emerald-50/50 border border-emerald-200 p-3 rounded-xl">
                  <label className="text-xs font-bold text-emerald-900">Select Existing Submitted Order (Optional):</label>
                  <select
                    onChange={(e) => {
                      const selected = dbOrders.find(o => o.id === e.target.value);
                      if (selected) {
                        const firstItem = selected.items?.[0];
                        const totalKg = firstItem?.totalWt || 1600;
                        const qtyVal = firstItem?.qty || (firstItem as any)?.quantity || 100;
                        setNewOrderForm(prev => ({
                          ...prev,
                          orderNumber: selected.orderNumber || selected.id,
                          customerName: selected.customerName || '',
                          itemDescription: firstItem?.strapSizeLength || (firstItem as any)?.sizeLength || 'PET / PP Strap Production',
                          weightInTonnesOrKg: String(totalKg),
                          unitType: 'KG',
                          qty: String(qtyVal),
                          qtyUnit: firstItem?.unit || 'Pcs',
                          color: firstItem?.color || (firstItem as any)?.colour || 'Green',
                          machineId: 'M-01'
                        }));
                      }
                    }}
                    className="w-full bg-white border border-gray-300 rounded-lg p-2 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="">-- Choose Existing Order --</option>
                    {dbOrders.map(o => (
                      <option key={o.id} value={o.id}>
                        {o.orderNumber || o.id} - {o.customerName || 'No Name'} ({o.items?.length || 0} items)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-gray-700">Production Order ID / No. *</label>
                  <input
                    type="text"
                    value={newOrderForm.orderNumber}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, orderNumber: e.target.value }))}
                    placeholder="e.g. PO/CHE-OIIP/0007/26-27"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-medium outline-none focus:bg-white focus:border-emerald-600 mt-1"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700">Customer Name</label>
                  <input
                    type="text"
                    value={newOrderForm.customerName}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, customerName: e.target.value }))}
                    placeholder="e.g. VIRAT KOHLI or Mr Bhadani"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-medium outline-none focus:bg-white focus:border-emerald-600 mt-1"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700">Item Description / SKU Specifications</label>
                  <input
                    type="text"
                    value={newOrderForm.itemDescription}
                    onChange={(e) => setNewOrderForm(prev => ({ ...prev, itemDescription: e.target.value }))}
                    placeholder="e.g. [PSRO001] | 15 X 0.5 Roll | L:15m, W:0.8mm"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-medium outline-none focus:bg-white focus:border-emerald-600 mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700">Order Quantity</label>
                    <input
                      type="number"
                      value={newOrderForm.qty}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, qty: e.target.value }))}
                      placeholder="e.g. 100"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-600 mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Quantity Unit</label>
                    <input
                      type="text"
                      value={newOrderForm.qtyUnit}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, qtyUnit: e.target.value }))}
                      placeholder="e.g. Rolls, Pcs"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-medium outline-none focus:bg-white focus:border-emerald-600 mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700">Order Weight Value *</label>
                    <input
                      type="number"
                      step="any"
                      value={newOrderForm.weightInTonnesOrKg}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, weightInTonnesOrKg: e.target.value }))}
                      placeholder="e.g. 20 or 1600"
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-600 mt-1"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Weight Unit</label>
                    <select
                      value={newOrderForm.unitType}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, unitType: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-600 mt-1 cursor-pointer"
                    >
                      <option value="KG">KG (Kilograms)</option>
                      <option value="TON">TON (Tonnes / 1,000 KG)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-gray-700">Assign Machine Line (Defaults to Machine 1)</label>
                    <select
                      value={newOrderForm.machineId}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, machineId: e.target.value }))}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-600 mt-1 cursor-pointer"
                    >
                      {machines.map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-gray-700">Urgency Level</label>
                    <select
                      value={newOrderForm.priority}
                      onChange={(e) => setNewOrderForm(prev => ({ ...prev, priority: e.target.value as any }))}
                      className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold outline-none focus:bg-white focus:border-emerald-600 mt-1 cursor-pointer"
                    >
                      <option value="Urgent">⚡ Urgent (Top Priority)</option>
                      <option value="High">High Priority</option>
                      <option value="Normal">Normal Priority</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddOrderToPlan}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Schedule Order Item
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
};

export const ProductionPlanningPage = WithAuth(ProductionPlanningPageBase, ModuleName.PRODUCTION_PLANNING, Permission.LIST);
export default ProductionPlanningPage;
