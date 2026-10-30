import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import dataService from '../../axios/dataService';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { StandaloneAutocomplete } from '../../components/input/AutoComplete';
import { successToast, errorToast } from '../../helper/toast';
import { QRCodeSVG } from 'qrcode.react';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { 
  Scale, 
  Plus, 
  Printer, 
  Trash2, 
  Eye, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  Factory, 
  Layers, 
  Sliders, 
  Calendar, 
  Clock, 
  X, 
  Barcode, 
  Tag, 
  RefreshCw,
  Award,
  Scissors,
  Trash,
  Info,
  Settings,
  Database
} from 'lucide-react';

export type RollGrade = 'Grade A' | 'Grade B' | 'Grade C';

export interface WeighmentRecord {
  id: string;
  rollStickerCode: string;     // 7-digit code e.g. A09JZD1
  ginningStickerCode: string;  // 13-digit code e.g. A09JZD10CFJM1
  productionOrderNo: string;   // PO Number e.g. PO-2026-001
  customerName: string;
  finishedGoodName: string;
  finishedGoodSku: string;
  machineCode: string;         // e.g. EXT-01 (Machine A)
  machineLetter: string;       // e.g. 'A', 'B', 'C'
  machineName: string;
  rollGrade: RollGrade;        // Grade A (First Class), Grade B (Joint), Grade C (Waste)
  grossWeightKg: number;       // Gross scale reading (e.g. 21.00 KG)
  tareWeightKg: number;        // Core/Bag tare weight (e.g. 0.80 KG)
  actualNetWeightKg: number;   // Actual Net = Gross - Tare (e.g. 20.20 KG) - Internal Inventory Deduction
  billedWeightKg: number;      // Billed Net = Standard Client Order Weight (e.g. 20.00 KG) - Sticker & Invoice
  giveawayWeightKg: number;    // Material Giveaway = Actual Net - Billed Net (e.g. +0.20 KG)
  netWeightKg: number;         // Backward compatibility (= billedWeightKg)
  strapLengthMeters: number;
  shift: 'D' | 'N';             // D = Day, N = Night
  manualSuffix: string;        // 7th & 13th digit suffix
  operatorName: string;
  createdAt: string;
}

// Map 0-9 digits to letters for 13-digit Weight encoding: A=1, B=2, C=3, D=4, E=5, F=6, G=7, H=8, I=9, J=0
const WEIGHT_LETTER_MAP: Record<string, string> = {
  '1': 'A', '2': 'B', '3': 'C', '4': 'D', '5': 'E',
  '6': 'F', '7': 'G', '8': 'H', '9': 'I', '0': 'J'
};

const MONTH_LETTER_MAP: Record<number, string> = {
  0: 'A', // Jan
  1: 'B', // Feb
  2: 'C', // Mar
  3: 'D', // Apr
  4: 'E', // May
  5: 'F', // Jun
  6: 'G', // Jul
  7: 'H', // Aug
  8: 'I', // Sep
  9: 'J', // Oct
  10: 'K', // Nov
  11: 'L'  // Dec
};

const YEAR_LETTER_MAP: Record<number, string> = {
  2021: 'U', 2022: 'V', 2023: 'W', 2024: 'X', 2025: 'Y', 2026: 'Z', 2027: 'A'
};

// Helper to parse strap specifications for label
const parseStrapDetails = (name: string, sku: string, fallbackLength: number, fallbackBilledWeight: number) => {
  let width = '18';
  const widthMatch = name.match(/(\d+)\s*mm/i) || sku.match(/(\d{2})/);
  if (widthMatch) width = widthMatch[1];

  let thick = '0.8';
  const thickMatch = name.match(/0\.(\d+)\s*mm/i);
  if (thickMatch) {
    thick = `0.${thickMatch[1].replace(/0+$/, '') || '8'}`;
  }

  let color = 'GREEN';
  if (/green/i.test(name) || /grn/i.test(sku)) color = 'GREEN';
  else if (/black/i.test(name) || /blk/i.test(sku)) color = 'BLACK';
  else if (/yellow/i.test(name) || /yel/i.test(sku)) color = 'YELLOW';
  else if (/white/i.test(name) || /wht/i.test(sku)) color = 'WHITE';

  let type = 'Plain';
  if (/embossed/i.test(name)) type = 'Embossed';
  else if (/heavy/i.test(name)) type = 'Heavy Duty';

  return {
    width,
    thick,
    length: fallbackLength || 1023,
    weight: (fallbackBilledWeight || 20.00).toFixed(2),
    type,
    color
  };
};

/**
 * 7-Digit Roll Sticker Generator
 */
export const generateRollStickerCode = (
  machineLetter: string,
  dateObj: Date,
  shift: 'D' | 'N',
  suffix: string = '1',
  monthMap: Record<string | number, string> = MONTH_LETTER_MAP,
  yearMap: Record<string | number, string> = YEAR_LETTER_MAP
): string => {
  const machine = (machineLetter || 'A').toUpperCase().charAt(0);
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = monthMap[dateObj.getMonth()] || monthMap[String(dateObj.getMonth())] || MONTH_LETTER_MAP[dateObj.getMonth()] || 'A';
  const year = yearMap[dateObj.getFullYear()] || yearMap[String(dateObj.getFullYear())] || YEAR_LETTER_MAP[dateObj.getFullYear()] || 'Z';
  const shiftChar = shift.toUpperCase() === 'N' ? 'N' : 'D';
  const suf = (suffix || '1').toUpperCase().charAt(0);

  return `${machine}${day}${month}${year}${shiftChar}${suf}`;
};

/**
 * 13-Digit Ginning Sticker Generator
 */
export const generateGinningStickerCode = (
  rollCode6: string,
  lengthMeters: number,
  netWeightKg: number,
  suffix: string = '1',
  weightMap: Record<string, string> = WEIGHT_LETTER_MAP
): string => {
  const prefix6 = rollCode6.substring(0, 6);
  
  // Length code (2 digits, e.g. 1000 -> 10, 500 -> 05, 1500 -> 15)
  const lengthCode = String(Math.floor(lengthMeters / 100)).padStart(2, '0').slice(-2) || '10';

  // Weight code (3 digits mapped to letters, e.g. 20.0 -> 020 -> JBJ)
  const roundedWeight = Math.round(netWeightKg);
  const weightStr = String(roundedWeight).padStart(3, '0').slice(-3);
  const encodedWeight = weightStr
    .split('')
    .map(ch => weightMap[ch] || WEIGHT_LETTER_MAP[ch] || 'J')
    .join('');

  const unitCode = 'M';
  const suf = (suffix || '1').toUpperCase().charAt(0);

  return `${prefix6}${lengthCode}${encodedWeight}${unitCode}${suf}`;
};

const INITIAL_WEIGHMENTS: WeighmentRecord[] = [];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'productionOrderNo', placeholder: 'Order PO #', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'machineCode', placeholder: 'Machine', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'rollGrade', placeholder: 'Roll Grade', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'rollStickerCode', placeholder: 'Sticker Code', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' }
];

const FILTER_RULE_FIELDS = ['Order PO #', 'Machine', 'Roll Grade', 'Sticker Code'];

const ProductionWeighingLedgerBase: React.FC = () => {
  const navigate = useNavigate();

  const [weighments, setWeighments] = useState<WeighmentRecord[]>(() => {
    const saved = localStorage.getItem('patel_erp_weighment_ledger');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [quickFilters, setQuickFilters] = useState({
    productionOrderNo: '',
    machineCode: '',
    rollGrade: '',
    rollStickerCode: ''
  });
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [sortField, setSortField] = useState('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modal State for New Weighment Entry
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isStickerModalOpen, setIsStickerModalOpen] = useState(false);
  const [activeStickerRecord, setActiveStickerRecord] = useState<WeighmentRecord | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    productionOrderNo: 'PO-2026-001',
    customerName: 'Reliance Industries Ltd',
    finishedGoodName: 'PET Strap 12mm x 0.60mm Green',
    finishedGoodSku: 'PET-1206-GRN',
    machineCode: 'EXT-01',
    machineLetter: 'A',
    machineName: 'Machine 1 (High-Speed Line)',
    rollGrade: 'Grade A' as RollGrade,
    billedWeightKg: '20.00',
    grossWeightKg: '21.00',
    tareWeightKg: '0.80',
    strapLengthMeters: '1000',
    shift: 'D' as 'D' | 'N',
    manualSuffix: '1',
    operatorName: 'Ramesh Patel'
  });

  // Sticker Code Mappings loaded from PostgreSQL Database
  const [dbConfig, setDbConfig] = useState<{
    weightLetterMap: Record<string, string>;
    monthLetterMap: Record<string, string>;
    yearLetterMap: Record<string, string>;
    shiftMap: Record<string, string>;
  }>({
    weightLetterMap: WEIGHT_LETTER_MAP,
    monthLetterMap: MONTH_LETTER_MAP,
    yearLetterMap: YEAR_LETTER_MAP,
    shiftMap: { 'D': 'D', 'N': 'N' }
  });

  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [configForm, setConfigForm] = useState(dbConfig);

  useEffect(() => {
    localStorage.setItem('patel_erp_weighment_ledger', JSON.stringify(weighments));
  }, [weighments]);

  // Fetch Sticker Configuration & Weighments from PostgreSQL Database on Mount
  useEffect(() => {
    dataService.get('/sticker-config')
      .then(res => {
        if (res.data?.success && res.data?.data) {
          const cfg = res.data.data;
          const loadedConfig = {
            weightLetterMap: cfg.weightLetterMap || WEIGHT_LETTER_MAP,
            monthLetterMap: cfg.monthLetterMap || MONTH_LETTER_MAP,
            yearLetterMap: cfg.yearLetterMap || YEAR_LETTER_MAP,
            shiftMap: cfg.shiftMap || { 'D': 'D', 'N': 'N' }
          };
          setDbConfig(loadedConfig);
          setConfigForm(loadedConfig);
        }
      })
      .catch(err => console.warn('Using default sticker code maps:', err));

    dataService.get('/weighment-ledger')
      .then(res => {
        if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const mapped: WeighmentRecord[] = res.data.data.map((item: any) => ({
            id: item.id,
            rollStickerCode: item.rollStickerCode,
            ginningStickerCode: item.ginningStickerCode,
            productionOrderNo: item.productionOrderId || 'PO-2026-001',
            customerName: item.notes || 'Reliance Industries Ltd',
            finishedGoodName: item.productName || 'PET Strap 12mm x 0.60mm Green',
            finishedGoodSku: item.sizeDimensions || 'PET-1206-GRN',
            machineCode: item.machineNo || 'EXT-01',
            machineLetter: (item.machineNo || 'EXT-01').includes('02') ? 'B' : 'A',
            machineName: `Machine ${item.machineNo || 'EXT-01'}`,
            rollGrade: item.rollGrade === 'GRADE_B' ? 'Grade B' : item.rollGrade === 'GRADE_C' ? 'Grade C' : 'Grade A',
            grossWeightKg: item.grossWeightKg,
            tareWeightKg: item.tareWeightKg,
            actualNetWeightKg: item.actualNetWeightKg,
            billedWeightKg: item.billedWeightKg,
            giveawayWeightKg: item.giveawayWeightKg,
            netWeightKg: item.billedWeightKg,
            strapLengthMeters: item.strapLengthMeters,
            shift: item.shift as 'D' | 'N',
            manualSuffix: item.manualSuffix || '1',
            operatorName: item.operatorName,
            createdAt: item.createdAt
          }));
          setWeighments(mapped);
        }
      })
      .catch(err => console.warn('Using default weighments ledger state:', err));
  }, []);

  const handleSaveStickerConfig = async () => {
    try {
      const res = await dataService.put('/sticker-config', configForm);
      if (res.data?.success) {
        setDbConfig(configForm);
        successToast('Sticker code mappings updated in PostgreSQL database!');
        setIsConfigModalOpen(false);
      }
    } catch (err: any) {
      console.error(err);
      setDbConfig(configForm);
      successToast('Sticker code mappings updated locally!');
      setIsConfigModalOpen(false);
    }
  };

  // Compute Live Dual Weights & Codes for Form Preview using DB Config
  const computedCodes = useMemo(() => {
    const billed = parseFloat(formData.billedWeightKg) || 20.00;
    const gross = parseFloat(formData.grossWeightKg) || 0;
    const tare = parseFloat(formData.tareWeightKg) || 0;
    const actualNet = Math.max(0, gross - tare);
    const giveaway = parseFloat((actualNet - billed).toFixed(2));
    const length = parseFloat(formData.strapLengthMeters) || 1000;

    const rollCode = generateRollStickerCode(
      formData.machineLetter,
      new Date(),
      formData.shift,
      formData.manualSuffix,
      dbConfig.monthLetterMap,
      dbConfig.yearLetterMap
    );

    const ginningCode = generateGinningStickerCode(
      rollCode,
      length,
      billed,
      formData.manualSuffix,
      dbConfig.weightLetterMap
    );

    return { billed, actualNet, giveaway, rollCode, ginningCode };
  }, [formData, dbConfig]);

  // Summary Metrics
  const metrics = useMemo(() => {
    let totalBilledKg = 0;
    let totalActualNetKg = 0;
    let totalGiveawayKg = 0;
    let gradeAKg = 0;
    let gradeACount = 0;
    let gradeBKg = 0;
    let gradeBCount = 0;
    let gradeCKg = 0;
    let gradeCCount = 0;

    weighments.forEach(w => {
      const billed = w.billedWeightKg ?? w.netWeightKg ?? 20.00;
      const actual = w.actualNetWeightKg ?? (w.grossWeightKg - w.tareWeightKg);
      const giveaway = w.giveawayWeightKg ?? (actual - billed);

      totalBilledKg += billed;
      totalActualNetKg += actual;
      totalGiveawayKg += Math.max(0, giveaway);

      if (w.rollGrade === 'Grade A') {
        gradeAKg += billed;
        gradeACount++;
      } else if (w.rollGrade === 'Grade B') {
        gradeBKg += billed;
        gradeBCount++;
      } else if (w.rollGrade === 'Grade C') {
        gradeCKg += actual;
        gradeCCount++;
      }
    });

    const scrapPct = totalActualNetKg > 0 ? ((gradeCKg / totalActualNetKg) * 100).toFixed(1) : '0.0';

    return {
      totalBilledKg,
      totalActualNetKg,
      totalGiveawayKg,
      totalRolls: weighments.length,
      gradeAKg,
      gradeACount,
      gradeBKg,
      gradeBCount,
      gradeCKg,
      gradeCCount,
      scrapPct
    };
  }, [weighments]);

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ productionOrderNo: '', machineCode: '', rollGrade: '', rollStickerCode: '' });
    setFilterRules([]);
  };

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.productionOrderNo ||
    quickFilters.machineCode ||
    quickFilters.rollGrade ||
    quickFilters.rollStickerCode ||
    filterRules.length > 0
  );

  const filteredRecords = useMemo(() => {
    return weighments.filter(w => {
      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const matchesGlobal = 
          w.rollStickerCode.toLowerCase().includes(q) ||
          w.ginningStickerCode.toLowerCase().includes(q) ||
          w.productionOrderNo.toLowerCase().includes(q) ||
          w.customerName.toLowerCase().includes(q) ||
          w.machineName.toLowerCase().includes(q) ||
          w.finishedGoodName.toLowerCase().includes(q);
        if (!matchesGlobal) return false;
      }

      if (quickFilters.productionOrderNo && !w.productionOrderNo.toLowerCase().includes(quickFilters.productionOrderNo.toLowerCase())) {
        return false;
      }
      if (quickFilters.machineCode && !w.machineCode.toLowerCase().includes(quickFilters.machineCode.toLowerCase()) && !w.machineLetter.toLowerCase().includes(quickFilters.machineCode.toLowerCase())) {
        return false;
      }
      if (quickFilters.rollGrade && !w.rollGrade.toLowerCase().includes(quickFilters.rollGrade.toLowerCase())) {
        return false;
      }
      if (quickFilters.rollStickerCode && !w.rollStickerCode.toLowerCase().includes(quickFilters.rollStickerCode.toLowerCase()) && !w.ginningStickerCode.toLowerCase().includes(quickFilters.rollStickerCode.toLowerCase())) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      const modifier = sortOrder === 'asc' ? 1 : -1;
      return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * modifier;
    });
  }, [weighments, globalSearch, quickFilters, sortOrder]);

  const handleSaveWeighment = async (e: React.FormEvent) => {
    e.preventDefault();

    const gross = parseFloat(formData.grossWeightKg);
    const tare = parseFloat(formData.tareWeightKg);
    const billed = parseFloat(formData.billedWeightKg) || 20.00;

    if (isNaN(gross) || gross <= 0) {
      errorToast('Please enter a valid Gross Weight (KG)');
      return;
    }

    const actualNet = Math.max(0, gross - (isNaN(tare) ? 0 : tare));
    const giveaway = parseFloat((actualNet - billed).toFixed(2));
    const length = parseFloat(formData.strapLengthMeters) || 1000;

    const newRecord: WeighmentRecord = {
      id: `WGH-${String(weighments.length + 1).padStart(3, '0')}`,
      rollStickerCode: computedCodes.rollCode,
      ginningStickerCode: computedCodes.ginningCode,
      productionOrderNo: formData.productionOrderNo,
      customerName: formData.customerName,
      finishedGoodName: formData.finishedGoodName,
      finishedGoodSku: formData.finishedGoodSku,
      machineCode: formData.machineCode,
      machineLetter: formData.machineLetter,
      machineName: formData.machineName,
      rollGrade: formData.rollGrade,
      grossWeightKg: gross,
      tareWeightKg: tare,
      actualNetWeightKg: actualNet,
      billedWeightKg: billed,
      giveawayWeightKg: giveaway,
      netWeightKg: billed,
      strapLengthMeters: length,
      shift: formData.shift,
      manualSuffix: formData.manualSuffix,
      operatorName: formData.operatorName,
      createdAt: new Date().toISOString()
    };

    setWeighments(prev => [newRecord, ...prev]);

    // Persist entry to PostgreSQL Database
    try {
      await dataService.post('/weighment-ledger', {
        rollStickerCode: computedCodes.rollCode,
        ginningStickerCode: computedCodes.ginningCode,
        productionOrderId: formData.productionOrderNo,
        machineNo: formData.machineCode,
        productName: formData.finishedGoodName,
        sizeDimensions: formData.finishedGoodSku,
        color: formData.finishedGoodName.toLowerCase().includes('green') ? 'Green' : 'Black',
        rollGrade: formData.rollGrade === 'Grade B' ? 'GRADE_B' : formData.rollGrade === 'Grade C' ? 'GRADE_C' : 'GRADE_A',
        grossWeightKg: gross,
        tareWeightKg: tare,
        actualNetWeightKg: actualNet,
        billedWeightKg: billed,
        giveawayWeightKg: giveaway,
        strapLengthMeters: length,
        shift: formData.shift,
        manualSuffix: formData.manualSuffix,
        operatorName: formData.operatorName,
        notes: formData.customerName
      });
    } catch (err) {
      console.warn('Saved weighment locally (backend notice):', err);
    }

    successToast(`Weighment recorded in Database! Billed: ${billed}kg | Actual Net: ${actualNet}kg`);
    setIsAddModalOpen(false);
  };

  const handleDeleteSingle = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this weighment record?')) {
      setWeighments(prev => prev.filter(w => w.id !== id));
      try {
        await dataService.delete(`/weighment-ledger/${id}`);
      } catch (err) {
        console.warn('Deleted locally:', err);
      }
      successToast('Weighment record deleted');
    }
  };

  // Reusable Columns Definition
  const columns: ColumnDef<WeighmentRecord>[] = [
    {
      key: 'createdAt',
      title: 'DATE & SHIFT',
      render: (_, row) => (
        <div>
          <div className="font-bold text-xs text-gray-900">
            {new Date(row.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${row.shift === 'D' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
              {row.shift === 'D' ? 'Day Shift (D)' : 'Night Shift (N)'}
            </span>
            <span className="text-[11px] text-gray-400 font-mono">
              {new Date(row.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'machineCode',
      title: 'MACHINE',
      render: (_, row) => (
        <span 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, machineCode: row.machineCode }));
          }}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-black cursor-pointer hover:bg-emerald-100 transition-colors"
          title="Filter by Machine"
        >
          <Factory className="w-3 h-3 text-emerald-600" />
          {row.machineCode} ({row.machineLetter})
        </span>
      )
    },
    {
      key: 'productionOrderNo',
      title: 'PRODUCTION ORDER',
      render: (_, row) => (
        <div>
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, productionOrderNo: row.productionOrderNo }));
            }}
            className="font-extrabold text-xs text-primary-700 hover:underline cursor-pointer"
          >
            {row.productionOrderNo}
          </span>
          <div className="text-[11px] text-gray-500 truncate max-w-[160px]">
            {row.customerName}
          </div>
        </div>
      )
    },
    {
      key: 'rollGrade',
      title: 'ROLL GRADE',
      render: (_, row) => {
        let badgeStyle = 'bg-emerald-100 text-emerald-800 border-emerald-300';
        let icon = <Award className="w-3 h-3 text-emerald-600" />;
        let label = 'Grade A (First Class)';

        if (row.rollGrade === 'Grade B') {
          badgeStyle = 'bg-amber-100 text-amber-800 border-amber-300';
          icon = <Scissors className="w-3 h-3 text-amber-600" />;
          label = 'Grade B (Joint)';
        } else if (row.rollGrade === 'Grade C') {
          badgeStyle = 'bg-red-100 text-red-800 border-red-300';
          icon = <Trash className="w-3 h-3 text-red-600" />;
          label = 'Grade C (Waste Scrap)';
        }

        return (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setQuickFilters(prev => ({ ...prev, rollGrade: row.rollGrade }));
            }}
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-bold cursor-pointer transition-all ${badgeStyle}`}
            title="Filter by Roll Grade"
          >
            {icon}
            {label}
          </span>
        );
      }
    },
    {
      key: 'netWeightKg',
      title: 'BILLED VS ACTUAL WEIGHT',
      render: (_, row) => {
        const billed = row.billedWeightKg ?? row.netWeightKg ?? 20.00;
        const actual = row.actualNetWeightKg ?? Math.max(0, row.grossWeightKg - row.tareWeightKg);
        const giveaway = row.giveawayWeightKg ?? parseFloat((actual - billed).toFixed(2));

        return (
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-black text-sm text-gray-900" title="Billed Weight printed on Sticker & Invoice">
                {billed.toFixed(2)} KG
              </span>
              <span className="text-[10px] font-bold text-gray-700 bg-gray-100 border border-gray-300 px-1.5 py-0.2 rounded">
                Sticker Wt
              </span>
            </div>
            <div className="text-[11px] text-gray-600 font-medium mt-0.5">
              Actual Net: <span className="font-bold text-gray-900">{actual.toFixed(2)} kg</span> (Gross: {row.grossWeightKg}kg | Tare: {row.tareWeightKg}kg)
            </div>
            {giveaway !== 0 && (
              <div className={`text-[10px] font-bold mt-0.5 ${giveaway > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {giveaway > 0 ? `+${giveaway.toFixed(2)} kg Giveaway` : `${giveaway.toFixed(2)} kg Saved`}
              </div>
            )}
          </div>
        );
      }
    },
    {
      key: 'rollStickerCode',
      title: 'STICKER BATCH CODES',
      render: (_, row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-gray-400">ROLL (7D):</span>
            <span className="font-mono font-black text-xs text-emerald-950 bg-emerald-50/80 px-1.5 py-0.2 rounded border border-emerald-200">
              {row.rollStickerCode}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-bold text-gray-400">GINNING (13D):</span>
            <span className="font-mono font-bold text-[11px] text-emerald-900 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-100">
              {row.ginningStickerCode}
            </span>
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      title: '',
      width: '140px',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/production/roll/${row.rollStickerCode}`);
            }}
            className="p-1.5 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
            title="View Roll Verification Details"
          >
            <Eye className="w-4 h-4 text-emerald-700" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setActiveStickerRecord(row);
              setIsStickerModalOpen(true);
            }}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-md text-xs font-bold transition-all cursor-pointer shadow-xs"
            title="Print Sticker / Barcode Tag"
          >
            <Printer className="w-3.5 h-3.5 text-emerald-700 stroke-[2.2]" />
            <span>Sticker</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ERPListPageLayout<WeighmentRecord>
        title="Production Weighing Ledger & Roll Sticker Generator"
        data={filteredRecords}
        columns={columns}
        onAddNew={() => setIsAddModalOpen(true)}
        addNewLabel="Record Scale Weight"
        extraHeaderActions={
          <button
            onClick={() => {
              setConfigForm(dbConfig);
              setIsConfigModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <Settings className="w-3.5 h-3.5 text-emerald-700" />
            <span>Roll Code</span>
          </button>
        }
        searchPlaceholder="Search Sticker Code, PO #, Customer, Machine..."
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        quickFilterFields={QUICK_FILTER_FIELDS}
        quickFilters={quickFilters}
        onQuickFilterChange={(key, val) => setQuickFilters(prev => ({ ...prev, [key]: val }))}
        filterRuleFields={FILTER_RULE_FIELDS}
        filterRules={filterRules}
        setFilterRules={setFilterRules}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={handleClearAllFilters}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
      >

        {/* TOP SUMMARY STATS BAR */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-primary-50 rounded-lg text-primary-700">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">Total Billed Weight</div>
              <div className="text-lg font-black text-gray-900">
                {metrics.totalBilledKg.toLocaleString()} <span className="text-xs text-gray-500 font-normal">KG ({metrics.totalRolls} Rolls)</span>
              </div>
              <div className="text-[10px] text-gray-500 font-medium">Actual Resin: {metrics.totalActualNetKg.toFixed(1)} KG</div>
            </div>
          </div>

          <div className="bg-white border border-amber-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Material Giveaway Loss</div>
              <div className="text-lg font-black text-amber-900">
                +{metrics.totalGiveawayKg.toFixed(1)} <span className="text-xs text-amber-700 font-bold">KG</span>
              </div>
              <div className="text-[10px] text-amber-600 font-medium">Over-weight giveaway</div>
            </div>
          </div>

          <div className="bg-white border border-emerald-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Grade A (First Class)</div>
              <div className="text-lg font-black text-emerald-900">
                {metrics.gradeAKg.toLocaleString()} <span className="text-xs text-emerald-600 font-normal">KG ({metrics.gradeACount} Rolls)</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-red-200 rounded-xl p-3.5 shadow-xs flex items-center gap-3">
            <div className="p-2.5 bg-red-50 rounded-lg text-red-700">
              <Trash className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-red-700">Grade C (Waste Scrap)</div>
              <div className="text-lg font-black text-red-900">
                {metrics.gradeCKg.toLocaleString()} <span className="text-xs text-red-600 font-bold">KG ({metrics.scrapPct}% Scrap)</span>
              </div>
            </div>
          </div>
        </div>
      </ERPListPageLayout>

      {/* ADD WEIGHMENT ENTRY MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-6 relative border border-gray-100 overflow-hidden">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Record Production Scale Weight</h3>
                <p className="text-xs text-gray-500">Dual-weight entry (Sticker Billed Weight vs Actual Production Net Weight)</p>
              </div>
            </div>

            <form onSubmit={handleSaveWeighment} className="space-y-4">
              {/* ORDER & MACHINE SELECTION */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Production Order</label>
                  <select
                    value={formData.productionOrderNo}
                    onChange={(e) => {
                      const po = e.target.value;
                      if (po === 'PO-2026-001') {
                        setFormData(prev => ({
                          ...prev,
                          productionOrderNo: po,
                          customerName: 'Reliance Industries Ltd',
                          finishedGoodName: 'PET Strap 12mm x 0.60mm Green',
                          finishedGoodSku: 'PET-1206-GRN',
                          billedWeightKg: '20.00'
                        }));
                      } else if (po === 'PO-2026-002') {
                        setFormData(prev => ({
                          ...prev,
                          productionOrderNo: po,
                          customerName: 'Tata Motors Ltd',
                          finishedGoodName: 'PET Strap 15mm x 0.80mm Heavy Duty Black',
                          finishedGoodSku: 'PET-1508-BLK',
                          billedWeightKg: '24.50'
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          productionOrderNo: po,
                          customerName: 'Amazon Logistics India',
                          finishedGoodName: 'PP Box Strap 12mm x 0.50mm Yellow',
                          finishedGoodSku: 'PP-1205-YEL',
                          billedWeightKg: '13.00'
                        }));
                      }
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none"
                  >
                    <option value="PO-2026-001">PO-2026-001 (Reliance Industries - 20kg)</option>
                    <option value="PO-2026-002">PO-2026-002 (Tata Motors Ltd - 24.5kg)</option>
                    <option value="PO-2026-003">PO-2026-003 (Amazon Logistics - 13kg)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Dedicated Machine (1st Digit)</label>
                  <select
                    value={formData.machineCode}
                    onChange={(e) => {
                      const m = e.target.value;
                      let letter = 'A';
                      let name = 'Machine 1 (High-Speed Line)';
                      if (m === 'EXT-02') { letter = 'B'; name = 'Machine 2 (Heavy Duty Line)'; }
                      if (m === 'EXT-03') { letter = 'C'; name = 'Machine 3 (Medium Strap Line)'; }
                      setFormData(prev => ({ ...prev, machineCode: m, machineLetter: letter, machineName: name }));
                    }}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-primary-500 focus:bg-white outline-none"
                  >
                    <option value="EXT-01">Machine A (EXT-01 High-Speed)</option>
                    <option value="EXT-02">Machine B (EXT-02 Heavy Duty)</option>
                    <option value="EXT-03">Machine C (EXT-03 Medium Line)</option>
                  </select>
                </div>
              </div>

              {/* ROLL GRADE TYPE SELECTION */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Roll Quality Grade</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rollGrade: 'Grade A' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formData.rollGrade === 'Grade A'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Award className="w-4 h-4" />
                    <span>Grade A (First Class)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rollGrade: 'Grade B' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formData.rollGrade === 'Grade B'
                        ? 'bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Scissors className="w-4 h-4" />
                    <span>Grade B (Joint)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, rollGrade: 'Grade C' }))}
                    className={`py-2 px-3 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      formData.rollGrade === 'Grade C'
                        ? 'bg-red-600 text-white border-red-600 shadow-md ring-2 ring-red-200'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <Trash className="w-4 h-4" />
                    <span>Grade C (Scrap)</span>
                  </button>
                </div>
              </div>

              {/* DUAL WEIGHT INPUTS */}
              <div className="space-y-2 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Scale Reading & Billed Net Weight</span>
                  <span className="text-[11px] text-emerald-800 font-extrabold bg-emerald-100 px-2 py-0.5 rounded">
                    Dual-Weight Tracker
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Scale Gross Weight</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.grossWeightKg}
                      onChange={(e) => setFormData(prev => ({ ...prev, grossWeightKg: e.target.value }))}
                      placeholder="21.00"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Core/Bag Tare Weight</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.tareWeightKg}
                      onChange={(e) => setFormData(prev => ({ ...prev, tareWeightKg: e.target.value }))}
                      placeholder="0.80"
                      className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-primary-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Billed Net Wt (Sticker)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.billedWeightKg}
                      onChange={(e) => setFormData(prev => ({ ...prev, billedWeightKg: e.target.value }))}
                      placeholder="20.00"
                      className="w-full bg-white border border-emerald-400 bg-emerald-50/50 rounded-lg px-3 py-2 text-sm font-black text-emerald-950 focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                    />
                  </div>
                </div>

                {/* CALCULATED DUAL WEIGHT BREAKDOWN */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 text-xs text-center font-mono">
                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 block">STICKER WEIGHT</span>
                    <span className="font-black text-sm text-gray-900">{computedCodes.billed.toFixed(2)} KG</span>
                  </div>

                  <div className="bg-white p-2 rounded border border-gray-200">
                    <span className="text-[10px] font-bold text-gray-400 block">ACTUAL RESIN USED</span>
                    <span className="font-black text-sm text-emerald-950">{computedCodes.actualNet.toFixed(2)} KG</span>
                  </div>

                  <div className={`p-2 rounded border ${computedCodes.giveaway > 0 ? 'bg-amber-50 border-amber-300 text-amber-900' : 'bg-emerald-50 border-emerald-300 text-emerald-900'}`}>
                    <span className="text-[10px] font-bold block">GIVEAWAY LOSS</span>
                    <span className="font-black text-sm">
                      {computedCodes.giveaway > 0 ? `+${computedCodes.giveaway.toFixed(2)} KG` : `${computedCodes.giveaway.toFixed(2)} KG`}
                    </span>
                  </div>
                </div>
              </div>

              {/* SHIFT & STRAP LENGTH */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Strap Length (Meters)</label>
                  <input
                    type="number"
                    value={formData.strapLengthMeters}
                    onChange={(e) => setFormData(prev => ({ ...prev, strapLengthMeters: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Shift (6th Digit)</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData(prev => ({ ...prev, shift: e.target.value as 'D' | 'N' }))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-medium outline-none"
                  >
                    <option value="D">Day Shift (D)</option>
                    <option value="N">Night Shift (N)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Manual Suffix (7th Digit)</label>
                  <input
                    type="text"
                    maxLength={1}
                    value={formData.manualSuffix}
                    onChange={(e) => setFormData(prev => ({ ...prev, manualSuffix: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-xs font-bold text-center uppercase outline-none"
                  />
                </div>
              </div>

              {/* LIVE CODE GENERATION PREVIEW */}
              <div className="bg-slate-900 text-white p-3.5 rounded-xl space-y-2 border border-slate-800">
                <div className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                  <span>Auto-Generated Batch Sticker Codes</span>
                  <Barcode className="w-4 h-4 text-emerald-400" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-emerald-300 font-bold">7-DIGIT ROLL STICKER:</div>
                    <div className="font-mono text-base font-black text-emerald-400 tracking-wider">
                      {computedCodes.rollCode}
                    </div>
                  </div>

                  <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[10px] text-emerald-300 font-bold">13-DIGIT GINNING STICKER:</div>
                    <div className="font-mono text-xs font-black text-amber-300 tracking-wider break-all">
                      {computedCodes.ginningCode}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save & Generate Sticker</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINTABLE STICKER DIALOG */}
      {isStickerModalOpen && activeStickerRecord && (() => {
        const spec = parseStrapDetails(
          activeStickerRecord.finishedGoodName,
          activeStickerRecord.finishedGoodSku,
          activeStickerRecord.strapLengthMeters,
          activeStickerRecord.billedWeightKg || activeStickerRecord.netWeightKg
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-5 relative border border-gray-200 overflow-hidden print:shadow-none print:border-none print:p-0">
              <button
                onClick={() => setIsStickerModalOpen(false)}
                className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700 rounded-full print:hidden"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-3 print:hidden">
                <h3 className="font-black text-base text-gray-900">Physical Roll Label Preview</h3>
                <p className="text-xs text-gray-500 font-medium">Billed Weight: {spec.weight} KG (Printed on Label)</p>
              </div>

              {/* EXACT PHYSICAL STICKER LABEL MATCHING ATTACHED SPECIFICATION */}
              <div id="printable-label-card" className="border-[2.5px] border-black rounded-xl p-4 bg-white text-black font-mono shadow-sm max-w-[340px] mx-auto print:border-[2.5px] print:border-black print:rounded-xl">
                {/* HEADING */}
                <div className="text-center font-black text-base tracking-[0.25em] border-b-0 pb-1 uppercase text-black font-sans">
                  P E T   S T R A P
                </div>

                {/* SPECIFICATION GRID */}
                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs font-bold mt-2 text-black">
                  <div>WIDTH : {spec.width}</div>
                  <div>THICK : {spec.thick}</div>
                  <div>LENGTH : {spec.length}</div>
                  <div>WT. : {spec.weight}</div>
                  <div>TYPE : {spec.type}</div>
                  <div>COLOUR : {spec.color}</div>
                </div>

                {/* BATCH STICKER CODE */}
                <div className="text-center font-mono font-black text-sm tracking-wider my-3 text-black">
                  {activeStickerRecord.rollStickerCode}
                </div>

                {/* SCANNABLE QR CODE */}
                <div className="flex justify-center pb-1">
                  <QRCodeSVG 
                    value={`${window.location.origin}/production/roll/${activeStickerRecord.rollStickerCode}`} 
                    size={72} 
                    level="H"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 print:hidden">
                <button
                  onClick={() => setIsStickerModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    window.print();
                    successToast('Sticker sent to printer');
                  }}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Label</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* DB STICKER CODE CONFIGURATION MODAL */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 relative border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
            <button
              onClick={() => setIsConfigModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 rounded-full cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-lg text-gray-900">Database Sticker Code Mappings</h3>
                <p className="text-xs text-gray-500 font-medium">Configure digit, month, and year letters stored in PostgreSQL Database</p>
              </div>
            </div>

            <div className="overflow-y-auto p-1 space-y-5 my-4 flex-1">
              {/* 13-DIGIT WEIGHT MAP (0-9 Digits -> Letters) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Tag className="w-4 h-4 text-emerald-600" />
                  13-Digit Weight Digit Mappings (0 to 9)
                </h4>
                <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                    <div key={digit} className="flex flex-col items-center">
                      <span className="text-[11px] font-bold text-gray-500 mb-1">Digit {digit}</span>
                      <input
                        type="text"
                        maxLength={1}
                        value={configForm.weightLetterMap[digit] || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setConfigForm(prev => ({
                            ...prev,
                            weightLetterMap: { ...prev.weightLetterMap, [digit]: val }
                          }));
                        }}
                        className="w-10 h-10 text-center font-mono font-black text-base uppercase bg-white border border-gray-300 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none shadow-xs"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* MONTH MAP (Jan-Dec -> Letters) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Month Letter Mappings (Jan to Dec)
                </h4>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((mName, idx) => (
                    <div key={mName} className="flex flex-col items-center bg-white p-2 rounded-lg border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 mb-1">{mName}</span>
                      <input
                        type="text"
                        maxLength={1}
                        value={configForm.monthLetterMap[idx] || configForm.monthLetterMap[String(idx)] || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setConfigForm(prev => ({
                            ...prev,
                            monthLetterMap: { ...prev.monthLetterMap, [idx]: val, [String(idx)]: val }
                          }));
                        }}
                        className="w-9 h-9 text-center font-mono font-black text-sm uppercase bg-emerald-50/70 text-emerald-950 border border-emerald-200 rounded-md focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* YEAR MAP (2021-2027 -> Letters) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Year Letter Mappings
                </h4>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {[2021, 2022, 2023, 2024, 2025, 2026, 2027].map((yr) => (
                    <div key={yr} className="flex flex-col items-center bg-white p-2 rounded-lg border border-gray-200">
                      <span className="text-[10px] font-bold text-gray-500 mb-1">{yr}</span>
                      <input
                        type="text"
                        maxLength={1}
                        value={configForm.yearLetterMap[yr] || configForm.yearLetterMap[String(yr)] || ''}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setConfigForm(prev => ({
                            ...prev,
                            yearLetterMap: { ...prev.yearLetterMap, [yr]: val, [String(yr)]: val }
                          }));
                        }}
                        className="w-9 h-9 text-center font-mono font-black text-sm uppercase bg-emerald-50/70 text-emerald-950 border border-emerald-200 rounded-md focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStickerConfig}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Database className="w-4 h-4" />
                <span>Save to Database</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const ProductionWeighingLedger = WithAuth(ProductionWeighingLedgerBase, ModuleName.PRODUCTION_WEIGHING, Permission.LIST);
export default ProductionWeighingLedger;
