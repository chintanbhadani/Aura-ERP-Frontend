// Unified client-side BOM storage service & persistence engine
// Ensures 100% synchronization across BOM List, BOM Form, and Production Orders

export interface BomRawMaterialItem {
  id: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  uom: string;
  unitCost: number;
  scrapPercentage?: number;
  totalCost: number;
}

export interface BomRecord {
  id: string;
  bomNumber: string;
  productionOrderNo?: string;
  orderItemSrNo?: number;
  customerName?: string;
  finishedGoodId?: string;
  finishedGoodSku?: string;
  finishedGoodName: string;
  batchQuantity: number;
  uom: string;
  items: BomRawMaterialItem[];
  totalCost: number;
  costPerUnit: number;
  remarks?: string;
  attachments?: { name: string; url: string }[];
  tags?: string[];
  status: 'Active' | 'Draft' | 'Archived' | string;
  createdAt: string;
  updatedAt: string;
}

export interface RawMaterialOption {
  itemCode: string;
  itemName: string;
  uom: string;
  unitCost: number;
}

export const INITIAL_BOMS: BomRecord[] = [];

export const PRESET_RAW_MATERIALS: RawMaterialOption[] = [];

const STORAGE_KEY = 'patel_erp_boms';
const MAP_KEY = 'patel_erp_po_bom_map';
const EVENT_NAME = 'patel_erp_boms_updated';

// Read all BOMs safely with automatic cleanup of legacy dummy records and sorted with latest updated first
export const getStoredBoms = (): BomRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hasChanges = false;

        // Clean out legacy sample dummy records if they exist in localStorage
        let cleaned = parsed.filter(b => 
          b.id !== 'BOM-001' && 
          b.id !== 'BOM-002' && 
          b.id !== 'BOM-003' &&
          !String(b.bomNumber || '').startsWith('BOM/PET/1206') &&
          !String(b.bomNumber || '').startsWith('BOM/PET/1508') &&
          !String(b.bomNumber || '').startsWith('BOM/PP/1205')
        );
        if (cleaned.length !== parsed.length) {
          hasChanges = true;
        }

        // Clean out leftover automated test dummy rows (e.g. UV Stabilizer, Slip additive with 0 unit cost)
        cleaned = cleaned.map(b => {
          if (b.items && Array.isArray(b.items)) {
            const filteredItems = b.items.filter((it: any) => {
              const isTestDummy = (
                it.itemName?.includes('UV Stabilizer') || 
                it.itemName?.includes('Slip & Anti-block') ||
                it.itemCode === 'RM-ADD-STB' ||
                it.itemCode === 'RM-ADD-SLP'
              ) && Number(it.unitCost || 0) === 0;
              return !isTestDummy;
            });

            if (filteredItems.length !== b.items.length) {
              hasChanges = true;
              const newTotal = filteredItems.reduce((sum: number, it: any) => sum + (it.totalCost || 0), 0);
              const newCostPerUnit = b.batchQuantity > 0 ? Number((newTotal / b.batchQuantity).toFixed(2)) : 0;
              return {
                ...b,
                items: filteredItems.length > 0 ? filteredItems : [
                  {
                    id: `rm-${b.orderItemSrNo || 1}-1`,
                    itemCode: '',
                    itemName: '',
                    quantity: 0,
                    uom: 'KG',
                    unitCost: 0,
                    scrapPercentage: 0,
                    totalCost: 0
                  }
                ],
                totalCost: Number(newTotal.toFixed(2)),
                costPerUnit: newCostPerUnit
              };
            }
          }
          return b;
        });

        if (hasChanges) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
        }

        // Return sorted with the last updated record first
        return cleaned.sort((a, b) => {
          const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime() || 0;
          const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime() || 0;
          if (timeA !== timeB) return timeB - timeA;
          return (b.id || '').localeCompare(a.id || '');
        });
      }
    }
  } catch (err) {
    console.error('Failed to read stored BOMs:', err);
  }

  return [];
};

// Save BOM list and broadcast events across components & windows
export const saveStoredBoms = (boms: BomRecord[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(boms));
    window.dispatchEvent(new Event('storage'));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: boms }));
  } catch (err) {
    console.error('Failed to save stored BOMs:', err);
  }
};

// Upsert a single BOM record safely, moving it to the top as the last updated value
export const saveOrUpdateBom = (bom: BomRecord): BomRecord => {
  const list = getStoredBoms();
  const existingIdx = list.findIndex(
    b => b.id === bom.id || (bom.bomNumber && b.bomNumber.toLowerCase() === bom.bomNumber.toLowerCase())
  );

  const now = new Date().toISOString();
  let updatedRecord: BomRecord;
  let updatedList: BomRecord[];

  if (existingIdx >= 0) {
    updatedRecord = { 
      ...list[existingIdx], 
      ...bom, 
      updatedAt: now 
    };
    const remaining = list.filter((_, idx) => idx !== existingIdx);
    updatedList = [updatedRecord, ...remaining];
  } else {
    updatedRecord = {
      ...bom,
      createdAt: bom.createdAt || now,
      updatedAt: now
    };
    updatedList = [updatedRecord, ...list];
  }

  saveStoredBoms(updatedList);

  // If associated with a PO line item, record in PO-BOM mapping
  if (bom.productionOrderNo) {
    try {
      const poBomMap = getPoBomMap();
      const key = `${bom.productionOrderNo}_${bom.orderItemSrNo || 1}`;
      poBomMap[key] = {
        bomId: bom.id,
        bomNumber: bom.bomNumber,
        finishedGoodName: bom.finishedGoodName,
        totalCost: bom.totalCost
      };
      setPoBomMap(poBomMap);
    } catch (e) {
      console.warn('Failed to update PO-BOM map:', e);
    }
  }

  return updatedRecord;
};

// Batch upsert multiple BOMs (e.g. for multi-item production orders)
export const saveMultipleBoms = (boms: BomRecord[]): void => {
  let list = getStoredBoms();
  const poBomMap = getPoBomMap();
  const now = new Date().toISOString();

  boms.forEach(bom => {
    const existingIdx = list.findIndex(
      b => b.id === bom.id || 
           (b.productionOrderNo === bom.productionOrderNo && b.orderItemSrNo === bom.orderItemSrNo) ||
           (bom.bomNumber && b.bomNumber.toLowerCase() === bom.bomNumber.toLowerCase())
    );

    const updated = {
      ...bom,
      createdAt: (existingIdx >= 0 ? list[existingIdx].createdAt : bom.createdAt) || now,
      updatedAt: now
    };

    if (existingIdx >= 0) {
      list.splice(existingIdx, 1);
      list.unshift(updated);
    } else {
      list.unshift(updated);
    }

    if (bom.productionOrderNo) {
      const key = `${bom.productionOrderNo}_${bom.orderItemSrNo || 1}`;
      poBomMap[key] = {
        bomId: bom.id,
        bomNumber: bom.bomNumber,
        finishedGoodName: bom.finishedGoodName,
        totalCost: bom.totalCost
      };
    }
  });

  saveStoredBoms(list);
  setPoBomMap(poBomMap);
};

// Delete a single BOM by ID
export const deleteStoredBom = (id: string): void => {
  const list = getStoredBoms().filter(b => b.id !== id && b.bomNumber !== id);
  saveStoredBoms(list);
};

// Delete multiple BOMs by IDs
export const deleteStoredBoms = (ids: string[]): void => {
  const set = new Set(ids);
  const list = getStoredBoms().filter(b => !set.has(b.id) && !set.has(b.bomNumber));
  saveStoredBoms(list);
};

// PO-to-BOM Map helpers
export const getPoBomMap = (): Record<string, { bomId: string; bomNumber: string; finishedGoodName?: string; totalCost?: number }> => {
  try {
    const raw = localStorage.getItem(MAP_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

export const setPoBomMap = (map: Record<string, any>): void => {
  try {
    localStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch (err) {
    console.error('Failed to save PO-BOM map:', err);
  }
};
