import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  Trash2, 
  Plus, 
  Layers, 
  Package, 
  HelpCircle,
  Sparkles,
  Loader2
} from 'lucide-react';
import { formatCurrency } from '../helper/currency';
import { successToast, errorToast } from '../helper/toast';

export interface InvoiceUploadItem {
  id?: string;
  productId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  uom: string;
  matched: boolean;
  stock?: number;
  warning?: string;
}

export interface InvoiceItemsBulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoiceType?: 'SALES' | 'PURCHASE' | 'PURCHASE_ORDER' | string;
  availableProducts: any[];
  existingItemsCount?: number;
  onApplyItems: (items: any[], mode: 'replace' | 'append') => void;
}

/**
 * Downloads a sample Excel (.xlsx) file pre-filled with example items.
 */
export const downloadInvoiceItemTemplate = (
  availableProducts: any[] = [],
  invoiceType: string = 'SALES',
  fileName: string = 'Invoice_Items_Template.xlsx'
) => {
  try {
    const headers = [
      'Item Code / SKU',
      'Item Name',
      'Quantity',
      'Rate (USh)',
      'Unit (UOM)'
    ];

    let rows: any[][] = [];

    // Use up to 3 real products from availableProducts if provided
    if (availableProducts && availableProducts.length > 0) {
      const sampleSlice = availableProducts.slice(0, 3);
      rows = sampleSlice.map((p, idx) => {
        const rate = invoiceType === 'PURCHASE' 
          ? (p.cost_price || p.price || 5000) 
          : (p.selling_price || p.price || 8000);
        return [
          p.sku || `SKU-${idx + 101}`,
          p.name || 'Sample Product',
          (idx + 1) * 5,
          rate,
          p.uom || 'Pcs'
        ];
      });
    } else {
      // Fallback realistic examples
      rows = [
        ['MAT-002', 'Battery', 2, 8240, 'Nos'],
        ['PSTL001', 'UltraTech Cement', 10, 34000, 'Bag'],
        ['PSTL002', 'Plane Steel', 5, 205200, 'Kg']
      ];
    }

    const data = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Auto-fit column widths
    ws['!cols'] = [
      { wch: 18 }, // SKU
      { wch: 28 }, // Item Name
      { wch: 12 }, // Quantity
      { wch: 16 }, // Rate
      { wch: 14 }  // UOM
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Items Template');
    XLSX.writeFile(wb, fileName);
    successToast('Invoice items template downloaded');
  } catch (err: any) {
    console.error('Failed to download template:', err);
    errorToast('Failed to generate template file');
  }
};

export const InvoiceItemsBulkUploadModal: React.FC<InvoiceItemsBulkUploadModalProps> = ({
  isOpen,
  onClose,
  invoiceType = 'SALES',
  availableProducts = [],
  existingItemsCount = 0,
  onApplyItems
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsedItems, setParsedItems] = useState<InvoiceUploadItem[]>([]);
  const [importMode, setImportMode] = useState<'replace' | 'append'>(
    existingItemsCount > 1 ? 'append' : 'replace'
  );
  const [filterView, setFilterView] = useState<'ALL' | 'MATCHED' | 'WARNINGS'>('ALL');

  if (!isOpen) return null;

  const handleReset = () => {
    setFile(null);
    setParsedItems([]);
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const parseWorkbook = async (selectedFile: File) => {
    setIsProcessing(true);
    try {
      const buffer = await selectedFile.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        errorToast('No data rows found in the uploaded file');
        setIsProcessing(false);
        return;
      }

      // Helper to find column by fuzzy candidate names
      const findValue = (row: any, candidates: string[]) => {
        const keys = Object.keys(row);
        for (const c of candidates) {
          const match = keys.find(k => k.trim().toLowerCase() === c.toLowerCase() || k.trim().toLowerCase().includes(c.toLowerCase()));
          if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
            return row[match];
          }
        }
        return undefined;
      };

      const items: InvoiceUploadItem[] = [];

      rawRows.forEach((row, idx) => {
        const rawCode = findValue(row, ['item code / sku', 'item code', 'item_code', 'sku', 'code', 'product code', 'id']);
        const rawName = findValue(row, ['item name', 'item_name', 'item', 'name', 'product name', 'description', 'title']);
        const rawQty = findValue(row, ['quantity', 'qty', 'units', 'count', 'quantity *']);
        const rawRate = findValue(row, ['rate (ush)', 'rate (tzs)', 'rate', 'price', 'unit price', 'unit_price', 'sell price', 'cost price', 'amount']);
        const rawUom = findValue(row, ['unit (uom)', 'unit', 'uom', 'measure']);

        // Skip completely empty lines
        if (!rawCode && !rawName && !rawQty) return;

        const codeStr = rawCode ? String(rawCode).trim() : '';
        const nameStr = rawName ? String(rawName).trim() : '';
        const qtyNum = Math.max(0.001, parseFloat(String(rawQty).replace(/,/g, '')) || 1);
        const rateNum = Math.max(0, parseFloat(String(rawRate).replace(/,/g, '')) || 0);
        const uomStr = rawUom ? String(rawUom).trim() : '';

        // Match against available products
        let matchedProd: any = null;

        // 1. Match by SKU
        if (codeStr) {
          matchedProd = availableProducts.find(
            p => p.sku && p.sku.trim().toLowerCase() === codeStr.toLowerCase()
          );
        }

        // 2. Match by ID
        if (!matchedProd && codeStr) {
          matchedProd = availableProducts.find(
            p => p.id && String(p.id).trim().toLowerCase() === codeStr.toLowerCase()
          );
        }

        // 3. Match by exact Name
        if (!matchedProd && nameStr) {
          matchedProd = availableProducts.find(
            p => p.name && p.name.trim().toLowerCase() === nameStr.toLowerCase()
          );
        }

        // 4. Match by Name substring
        if (!matchedProd && nameStr) {
          matchedProd = availableProducts.find(
            p => p.name && p.name.trim().toLowerCase().includes(nameStr.toLowerCase())
          );
        }

        let warning = '';
        let resolvedRate = rateNum;

        if (matchedProd) {
          if (resolvedRate === 0) {
            resolvedRate = invoiceType === 'PURCHASE' || invoiceType === 'PURCHASE_ORDER'
              ? Number(matchedProd.cost_price || 0)
              : Number(matchedProd.selling_price || matchedProd.price || 0);
          }

          if (invoiceType === 'SALES' && (matchedProd.quantity ?? 0) < qtyNum) {
            warning = `Low stock: ${matchedProd.quantity ?? 0} available (${qtyNum} requested)`;
          }

          items.push({
            id: `item-${idx}-${Date.now()}`,
            productId: matchedProd.id,
            itemCode: matchedProd.sku || codeStr || matchedProd.id,
            itemName: matchedProd.name,
            quantity: qtyNum,
            unitPrice: resolvedRate,
            costPrice: matchedProd.cost_price || 0,
            uom: uomStr || matchedProd.uom || 'Pcs',
            matched: true,
            stock: matchedProd.quantity ?? 0,
            warning
          });
        } else {
          // Unmatched item
          const isSales = invoiceType === 'SALES';
          warning = isSales 
            ? 'Item not found in Master Data (unregistered item)'
            : 'Unregistered SKU (will be added as custom item)';

          items.push({
            id: `item-${idx}-${Date.now()}`,
            productId: '',
            itemCode: codeStr || '-',
            itemName: nameStr || codeStr || `Item #${idx + 1}`,
            quantity: qtyNum,
            unitPrice: resolvedRate,
            costPrice: 0,
            uom: uomStr || 'Pcs',
            matched: false,
            stock: 0,
            warning
          });
        }
      });

      if (items.length === 0) {
        errorToast('Could not extract any valid items from file');
        setIsProcessing(false);
        return;
      }

      setFile(selectedFile);
      setParsedItems(items);
      successToast(`Extracted ${items.length} item(s) from ${selectedFile.name}`);
    } catch (err: any) {
      console.error('Failed to parse file:', err);
      errorToast(err.message || 'Failed to read spreadsheet file');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      parseWorkbook(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      parseWorkbook(e.target.files[0]);
    }
  };

  const handleRemoveItem = (idToRemove?: string) => {
    setParsedItems(prev => prev.filter(i => i.id !== idToRemove));
  };

  const totalUnits = useMemo(() => {
    return parsedItems.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }, [parsedItems]);

  const totalAmount = useMemo(() => {
    return parsedItems.reduce((sum, item) => sum + ((Number(item.quantity) || 0) * (Number(item.unitPrice) || 0)), 0);
  }, [parsedItems]);

  const matchedCount = useMemo(() => {
    return parsedItems.filter(i => i.matched).length;
  }, [parsedItems]);

  const warningsCount = useMemo(() => {
    return parsedItems.filter(i => !i.matched || Boolean(i.warning)).length;
  }, [parsedItems]);

  const displayedItems = useMemo(() => {
    if (filterView === 'MATCHED') return parsedItems.filter(i => i.matched && !i.warning);
    if (filterView === 'WARNINGS') return parsedItems.filter(i => !i.matched || Boolean(i.warning));
    return parsedItems;
  }, [parsedItems, filterView]);

  const handleConfirmImport = () => {
    if (parsedItems.length === 0) {
      errorToast('No items to import');
      return;
    }

    // For Sales Invoice, verify if any items have no productId
    if (invoiceType === 'SALES') {
      const unmatchedSales = parsedItems.filter(i => !i.productId);
      if (unmatchedSales.length > 0) {
        const proceed = window.confirm(
          `${unmatchedSales.length} item(s) are not registered in Master Data. Sales Invoices require registered items for inventory tracking. Do you want to skip unmatched items and import the rest?`
        );
        if (!proceed) return;

        const validSalesItems = parsedItems.filter(i => Boolean(i.productId));
        if (validSalesItems.length === 0) {
          errorToast('No valid registered items to import');
          return;
        }
        onApplyItems(validSalesItems, importMode);
        handleClose();
        return;
      }
    }

    onApplyItems(parsedItems, importMode);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#059669]/10 text-[#059669]">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>Bulk Upload Line Items</span>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {invoiceType === 'PURCHASE' ? 'Purchase Invoice' : invoiceType === 'PURCHASE_ORDER' ? 'Purchase Order' : 'Sales Invoice'}
                </span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Upload an Excel (.xlsx / .xls) or CSV file to quickly add all items to this invoice.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => downloadInvoiceItemTemplate(availableProducts, invoiceType)}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold rounded-xl border border-gray-300 shadow-2xs transition-colors cursor-pointer"
              title="Download Sample Excel Template"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Sample Template</span>
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-2 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* UPLOAD DROP ZONE */}
          {!file ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                isDragging 
                  ? 'border-[#059669] bg-emerald-50/50 scale-[0.99]' 
                  : 'border-gray-300 hover:border-[#059669] hover:bg-gray-50/80 bg-gray-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-emerald-50 text-[#059669] flex items-center justify-center shadow-xs">
                {isProcessing ? (
                  <Loader2 className="w-7 h-7 animate-spin" />
                ) : (
                  <FileSpreadsheet className="w-7 h-7" />
                )}
              </div>

              <h3 className="text-sm font-bold text-gray-800">
                {isProcessing ? 'Reading spreadsheet data...' : 'Click or drag and drop your items file here'}
              </h3>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Supports Microsoft Excel (.xlsx, .xls) and CSV files. Columns for SKU, Name, Quantity, and Rate will be auto-matched.
              </p>

              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 shadow-2xs">
                  .xlsx
                </span>
                <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 shadow-2xs">
                  .xls
                </span>
                <span className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[11px] font-semibold text-gray-600 shadow-2xs">
                  .csv
                </span>
              </div>
            </div>
          ) : (
            /* FILE LOADED & STATS BANNER */
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{file.name}</h4>
                    <p className="text-[11px] text-emerald-800 mt-0.5">
                      {(file.size / 1024).toFixed(1)} KB &bull; {parsedItems.length} items parsed successfully
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-xl border border-gray-200 transition-colors cursor-pointer shadow-2xs"
                  >
                    Change File
                  </button>
                </div>
              </div>

              {/* STATS OVERVIEW CARDS */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Items</span>
                  <div className="text-lg font-black text-gray-900 mt-0.5">{parsedItems.length}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Units</span>
                  <div className="text-lg font-black text-gray-900 mt-0.5">{totalUnits.toLocaleString('en-US')}</div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Catalogue Matched</span>
                  <div className="text-lg font-black text-emerald-700 mt-0.5">
                    {matchedCount} <span className="text-xs text-gray-400 font-normal">/ {parsedItems.length}</span>
                  </div>
                </div>

                <div className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Estimated Total</span>
                  <div className="text-sm font-black text-emerald-800 font-mono mt-1 truncate" title={formatCurrency(totalAmount)}>
                    {formatCurrency(totalAmount)}
                  </div>
                </div>
              </div>

              {/* TABLE FILTER TABS & IMPORT MODE */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-1.5 bg-gray-100/80 p-1 rounded-xl text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setFilterView('ALL')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterView === 'ALL' ? 'bg-white text-gray-900 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    All ({parsedItems.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterView('MATCHED')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      filterView === 'MATCHED' ? 'bg-white text-emerald-800 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    Matched ({matchedCount})
                  </button>
                  {warningsCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setFilterView('WARNINGS')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        filterView === 'WARNINGS' ? 'bg-white text-amber-800 shadow-2xs font-bold' : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      Warnings ({warningsCount})
                    </button>
                  )}
                </div>

                {/* Import Mode Radio */}
                <div className="flex items-center gap-4 text-xs font-semibold text-gray-700">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="replace"
                      checked={importMode === 'replace'}
                      onChange={() => setImportMode('replace')}
                      className="text-[#059669] focus:ring-[#059669]"
                    />
                    <span>Replace Existing Rows</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="importMode"
                      value="append"
                      checked={importMode === 'append'}
                      onChange={() => setImportMode('append')}
                      className="text-[#059669] focus:ring-[#059669]"
                    />
                    <span>Append to Existing Rows</span>
                  </label>
                </div>
              </div>

              {/* PREVIEW TABLE */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50 sticky top-0 border-b border-gray-200 text-[11px] font-bold text-gray-600 uppercase tracking-wider z-10">
                      <tr>
                        <th className="py-2.5 px-3 text-center w-10">#</th>
                        <th className="py-2.5 px-3">Item Code / SKU</th>
                        <th className="py-2.5 px-3">Item Name</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3 text-right">Quantity</th>
                        <th className="py-2.5 px-3">Unit</th>
                        <th className="py-2.5 px-3 text-right">Rate</th>
                        <th className="py-2.5 px-3 text-right">Row Total</th>
                        <th className="py-2.5 px-2 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {displayedItems.map((item, idx) => {
                        const rowTotal = item.quantity * item.unitPrice;
                        return (
                          <tr key={item.id || idx} className="hover:bg-gray-50/60 transition-colors">
                            <td className="py-2 px-3 text-center text-gray-400 font-mono font-medium">
                              {idx + 1}
                            </td>
                            <td className="py-2 px-3 font-mono font-semibold text-gray-800">
                              {item.itemCode || '-'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="font-semibold text-gray-900">{item.itemName}</div>
                              {item.warning && (
                                <div className="text-[10px] text-amber-700 font-medium flex items-center gap-1 mt-0.5">
                                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                                  <span>{item.warning}</span>
                                </div>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              {item.matched ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  <span>Matched</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>Unregistered</span>
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-gray-900">
                              {item.quantity.toLocaleString('en-US')}
                            </td>
                            <td className="py-2 px-3 text-gray-600 font-medium">
                              {item.uom || 'Pcs'}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-medium text-gray-800">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-bold text-emerald-800">
                              {formatCurrency(rowTotal)}
                            </td>
                            <td className="py-2 px-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-gray-300 hover:text-red-600 p-1 rounded transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            {parsedItems.length > 0 && (
              <span>
                Ready to import <strong className="text-gray-900">{parsedItems.length}</strong> line items into {invoiceType === 'PURCHASE' ? 'Purchase Invoice' : invoiceType === 'PURCHASE_ORDER' ? 'Purchase Order' : 'Sales Invoice'}.
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={parsedItems.length === 0}
              className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm hover:shadow-md hover:shadow-emerald-700/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Import {parsedItems.length > 0 ? `${parsedItems.length} Items` : 'Items'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceItemsBulkUploadModal;

