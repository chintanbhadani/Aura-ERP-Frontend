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
  Search, 
  RefreshCw, 
  Check, 
  Info,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { successToast, errorToast } from '../../helper/toast';

export interface BulkImportColumn {
  key: string;
  label: string;
  aliases?: string[];
  required?: boolean;
  type?: 'text' | 'number' | 'boolean' | 'date';
  defaultValue?: any;
  description?: string;
  exampleValue?: any;
}

export interface ERPBulkImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  entityName?: string;
  columns: BulkImportColumn[];
  sampleData?: Record<string, any>[];
  templateFileName?: string;
  onImport: (rows: any[], file?: File) => Promise<{ successCount: number; errors?: string[]; createdCount?: number; updatedCount?: number }>;
  onSuccess?: () => void;
  instructions?: string[];
}

/**
 * Generates an Excel workbook (.xlsx) containing all column headers and sample rows.
 */
export const generateDemoExcelWorkbook = (
  columns: BulkImportColumn[],
  sampleRows: Record<string, any>[] = [],
  sheetName: string = 'Import Template'
): XLSX.WorkBook => {
  const headers = columns.map(c => c.label);
  const data: any[][] = [headers];

  if (sampleRows && sampleRows.length > 0) {
    sampleRows.forEach(row => {
      const rowArr = columns.map(c => {
        let val = row[c.key] !== undefined ? row[c.key] : (row[c.label] !== undefined ? row[c.label] : c.exampleValue);
        if (val === undefined || val === null) val = '';
        return val;
      });
      data.push(rowArr);
    });
  } else {
    const rowArr = columns.map(c => (c.exampleValue !== undefined && c.exampleValue !== null ? c.exampleValue : ''));
    data.push(rowArr);
  }

  const ws = XLSX.utils.aoa_to_sheet(data);

  // Auto-fit column widths
  ws['!cols'] = columns.map((c, colIdx) => {
    let maxLen = c.label.length;
    data.forEach(r => {
      const strVal = String(r[colIdx] ?? '');
      if (strVal.length > maxLen) maxLen = strVal.length;
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
  });

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return wb;
};

/**
 * Downloads demo Excel template directly in user's browser.
 */
export const downloadDemoExcel = (
  columns: BulkImportColumn[],
  sampleRows: Record<string, any>[] = [],
  fileName: string = 'demo_import_template.xlsx'
) => {
  const wb = generateDemoExcelWorkbook(columns, sampleRows);
  XLSX.writeFile(wb, fileName);
};

export const ERPBulkImportModal: React.FC<ERPBulkImportModalProps> = ({
  isOpen,
  onClose,
  title = 'Bulk Import Records',
  entityName = 'Item',
  columns,
  sampleData = [],
  templateFileName,
  onImport,
  onSuccess,
  instructions
}) => {
  const [step, setStep] = useState<'upload' | 'preview' | 'result'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [mappedRows, setMappedRows] = useState<any[]>([]);
  const [previewSearch, setPreviewSearch] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [importResult, setImportResult] = useState<{
    successCount: number;
    errors?: string[];
    createdCount?: number;
    updatedCount?: number;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolvedTemplateFileName = templateFileName || `${entityName.toLowerCase().replace(/\s+/g, '_')}_bulk_import_demo.xlsx`;

  // Normalize column lookup map
  const columnLookup = useMemo(() => {
    const map = new Map<string, BulkImportColumn>();
    columns.forEach(col => {
      const cleanKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
      const cleanLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
      map.set(cleanKey, col);
      map.set(cleanLabel, col);
      if (col.aliases) {
        col.aliases.forEach(alias => {
          map.set(alias.toLowerCase().replace(/[^a-z0-9]/g, ''), col);
        });
      }
    });
    return map;
  }, [columns]);

  const handleDownloadDemo = () => {
    try {
      downloadDemoExcel(columns, sampleData, resolvedTemplateFileName);
      successToast(`Downloaded template "${resolvedTemplateFileName}"`);
    } catch (e) {
      errorToast('Failed to download demo template');
    }
  };

  const parseWorkbookFile = (selectedFile: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (!rows || rows.length === 0) {
          errorToast('The uploaded file contains no data rows.');
          return;
        }

        // Map and validate rows
        const mapped = rows.map((rawRow, idx) => {
          const item: Record<string, any> = { _rowIndex: idx + 2, _isValid: true, _errors: [] as string[] };

          // Iterate all columns
          columns.forEach(col => {
            let foundVal: any = undefined;

            // Direct property match
            if (rawRow[col.label] !== undefined) {
              foundVal = rawRow[col.label];
            } else if (rawRow[col.key] !== undefined) {
              foundVal = rawRow[col.key];
            } else {
              // Fuzzy / normalized match against all raw keys
              for (const rawKey of Object.keys(rawRow)) {
                const cleanRawKey = rawKey.toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanColLabel = col.label.toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanColKey = col.key.toLowerCase().replace(/[^a-z0-9]/g, '');
                if (cleanRawKey === cleanColLabel || cleanRawKey === cleanColKey) {
                  foundVal = rawRow[rawKey];
                  break;
                }
                if (col.aliases) {
                  const matchAlias = col.aliases.some(a => a.toLowerCase().replace(/[^a-z0-9]/g, '') === cleanRawKey);
                  if (matchAlias) {
                    foundVal = rawRow[rawKey];
                    break;
                  }
                }
              }
            }

            if (foundVal !== undefined && foundVal !== '') {
              item[col.key] = foundVal;
            } else if (col.defaultValue !== undefined) {
              item[col.key] = col.defaultValue;
            } else {
              item[col.key] = '';
            }

            // Required field validation
            if (col.required && (item[col.key] === undefined || item[col.key] === null || String(item[col.key]).trim() === '')) {
              item._isValid = false;
              item._errors.push(`Missing "${col.label}"`);
            }
          });

          return item;
        });

        setFile(selectedFile);
        setRawRows(rows);
        setMappedRows(mapped);
        setStep('preview');
        successToast(`Parsed ${rows.length} rows from ${selectedFile.name}`);
      } catch (err: any) {
        console.error('Failed to parse excel file', err);
        errorToast('Failed to parse file. Please upload a valid .xlsx or .csv file.');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      parseWorkbookFile(selected);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) {
      parseWorkbookFile(dropped);
    }
  };

  const handleReset = () => {
    setFile(null);
    setRawRows([]);
    setMappedRows([]);
    setImportResult(null);
    setStep('upload');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmitImport = async () => {
    if (!mappedRows || mappedRows.length === 0) return;

    setIsSubmitting(true);
    try {
      // Clean rows for backend (strip internal fields _rowIndex, _isValid, _errors)
      const cleaned = mappedRows.map(r => {
        const copy = { ...r };
        delete copy._rowIndex;
        delete copy._isValid;
        delete copy._errors;
        return copy;
      });

      const res = await onImport(cleaned, file || undefined);
      setImportResult(res);
      setStep('result');
      successToast(
        res.createdCount !== undefined || res.updatedCount !== undefined
          ? `Successfully imported ${res.successCount} ${entityName}s!`
          : `Processed ${res.successCount} items.`
      );
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Import failed', err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || err?.message || 'Failed to import items.';
      errorToast(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Preview filtering
  const filteredPreviewRows = useMemo(() => {
    if (!previewSearch.trim()) return mappedRows;
    const query = previewSearch.toLowerCase();
    return mappedRows.filter(r => {
      return Object.entries(r).some(([k, v]) => !k.startsWith('_') && String(v).toLowerCase().includes(query));
    });
  }, [mappedRows, previewSearch]);

  const validRowCount = useMemo(() => mappedRows.filter(r => r._isValid).length, [mappedRows]);
  const invalidRowCount = mappedRows.length - validRowCount;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col border border-gray-200 overflow-hidden animate-in zoom-in-95 duration-150">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-50/60 via-white to-gray-50/60 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight flex items-center gap-2">
                <span>{title}</span>
                <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-100/70 rounded-full">
                  Excel / CSV
                </span>
              </h2>
              <p className="text-xs text-gray-500">
                Easily add or update multiple {entityName.toLowerCase()}s using a spreadsheet.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Steps indicator */}
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-semibold mr-3">
              <span className={`px-2.5 py-1 rounded-full transition-colors ${step === 'upload' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                1. Upload
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <span className={`px-2.5 py-1 rounded-full transition-colors ${step === 'preview' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                2. Preview ({mappedRows.length})
              </span>
              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              <span className={`px-2.5 py-1 rounded-full transition-colors ${step === 'result' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                3. Done
              </span>
            </div>

            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* MODAL BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* STEP 1: UPLOAD & DEMO TEMPLATE DOWNLOAD */}
          {step === 'upload' && (
            <div className="space-y-6 max-w-3xl mx-auto py-2">
              
              {/* DOWNLOAD DEMO TEMPLATE CARD */}
              <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-teal-500/10 border border-emerald-200/80 rounded-2xl p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                      <span>Step 1: Download Demo Excel File</span>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      Download our ready-made template containing all <strong>{columns.length} supported fields</strong> and realistic demo records for {entityName.toLowerCase()}s.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadDemo}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Download Demo Excel</span>
                </button>
              </div>

              {/* FILE DROP ZONE */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-10 text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                  isDragging
                    ? 'border-emerald-500 bg-emerald-50/70 scale-[0.99]'
                    : 'border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30 bg-gray-50/50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  className="hidden"
                  onChange={handleFileInput}
                />

                <div className="w-16 h-16 rounded-3xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center mb-3.5 shadow-inner">
                  <UploadCloud className="w-8 h-8" />
                </div>

                <h4 className="text-base font-bold text-gray-900 mb-1">
                  Step 2: Upload your completed spreadsheet
                </h4>
                <p className="text-xs text-gray-500 max-w-md mb-4">
                  Drag & drop your populated Excel or CSV file here, or <span className="text-emerald-700 font-semibold underline underline-offset-2">browse computer</span>
                </p>

                <div className="flex items-center gap-2 text-[11px] font-medium text-gray-400">
                  <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-mono">.xlsx</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-mono">.xls</span>
                  <span className="px-2 py-0.5 rounded-md bg-white border border-gray-200 text-gray-600 font-mono">.csv</span>
                  <span>up to 20MB</span>
                </div>
              </div>

              {/* QUICK INSTRUCTIONS */}
              <div className="bg-gray-50 rounded-2xl p-4.5 border border-gray-200/70 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-800">
                  <Info className="w-4 h-4 text-emerald-600" />
                  <span>Helpful Tips for Smooth Import:</span>
                </div>
                <ul className="text-xs text-gray-600 space-y-1.5 list-disc pl-5">
                  {instructions && instructions.length > 0 ? (
                    instructions.map((inst, i) => (
                      <li key={i}>{inst}</li>
                    ))
                  ) : (
                    <>
                      <li>
                        <strong>{columns.find(c => c.required)?.label || 'Name'}</strong> is the mandatory field.
                      </li>
                      <li>Existing {entityName.toLowerCase()}s with matching names will be updated; new entries will be created.</li>
                      <li>You can import files in <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> formats.</li>
                    </>
                  )}
                </ul>
              </div>

            </div>
          )}

          {/* STEP 2: PREVIEW & VALIDATION TABLE */}
          {step === 'preview' && (
            <div className="space-y-4">
              
              {/* STATUS BAR & ACTION BAR */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 shadow-2xs">
                    File: <span className="text-gray-900 font-bold">{file?.name}</span>
                  </div>
                  <div className="px-3 py-1.5 bg-emerald-100/70 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{validRowCount} Ready to Import</span>
                  </div>
                  {invalidRowCount > 0 && (
                    <div className="px-3 py-1.5 bg-amber-100/70 text-amber-800 border border-amber-200 rounded-xl text-xs font-bold flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>{invalidRowCount} Incomplete Rows</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search preview..."
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      className="w-full bg-white border border-gray-300 rounded-xl pl-8 pr-3 py-1.5 text-xs text-gray-800 font-medium outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>

                  <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-gray-500" />
                    <span>Change File</span>
                  </button>
                </div>
              </div>

              {/* TABLE CONTAINER */}
              <div className="border border-gray-200 rounded-2xl overflow-hidden shadow-2xs bg-white">
                <div className="max-h-[50vh] overflow-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50/90 sticky top-0 z-10 border-b border-gray-200 shadow-2xs">
                      <tr>
                        <th className="py-2.5 px-3 font-bold text-gray-500 uppercase tracking-wider text-[10px] w-12 text-center bg-gray-100/80">#</th>
                        <th className="py-2.5 px-3 font-bold text-gray-500 uppercase tracking-wider text-[10px] w-24">Status</th>
                        {columns.map(col => (
                          <th key={col.key} className="py-2.5 px-3 font-bold text-gray-700 whitespace-nowrap">
                            <span>{col.label}</span>
                            {col.required && <span className="text-red-500 ml-0.5">*</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredPreviewRows.map((row, idx) => (
                        <tr key={idx} className={`hover:bg-gray-50/70 transition-colors ${!row._isValid ? 'bg-amber-50/40' : ''}`}>
                          <td className="py-2 px-3 text-center text-gray-400 font-mono text-[11px] bg-gray-50/40">
                            {row._rowIndex}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            {row._isValid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Check className="w-2.5 h-2.5" />
                                Valid
                              </span>
                            ) : (
                              <span 
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200"
                                title={row._errors.join(', ')}
                              >
                                <AlertTriangle className="w-2.5 h-2.5" />
                                Incomplete
                              </span>
                            )}
                          </td>
                          {columns.map(col => {
                            const val = row[col.key];
                            const isMissing = col.required && (val === undefined || val === null || String(val).trim() === '');
                            return (
                              <td 
                                key={col.key} 
                                className={`py-2 px-3 whitespace-nowrap max-w-[220px] truncate ${isMissing ? 'bg-red-50 text-red-600 font-semibold' : 'text-gray-800'}`}
                                title={String(val ?? '')}
                              >
                                {isMissing ? 'Missing' : String(val !== undefined && val !== null ? val : '')}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* STEP 3: RESULT SUMMARY */}
          {step === 'result' && importResult && (
            <div className="max-w-lg mx-auto py-8 text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-md shadow-emerald-600/10 animate-in zoom-in duration-300">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Import Completed</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Successfully imported <strong>{importResult.successCount}</strong> {entityName.toLowerCase()}(s).
                </p>
                {importResult.createdCount !== undefined && importResult.updatedCount !== undefined && (
                  <p className="text-xs text-gray-600 mt-0.5 font-medium">
                    ({importResult.createdCount} created, {importResult.updatedCount} updated)
                  </p>
                )}
              </div>

              {importResult.errors && importResult.errors.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-left space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Warnings / Unprocessed Rows ({importResult.errors.length})</span>
                  </div>
                  <ul className="text-[11px] text-amber-700 space-y-1 list-disc pl-4">
                    {importResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  Done & View {entityName} List
                </button>
              </div>
            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <div>
            {step === 'preview' && (
              <span className="text-xs text-gray-500">
                Ready to import: <strong>{validRowCount}</strong> of {mappedRows.length} rows
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 hover:bg-gray-100 text-gray-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
            >
              Cancel
            </button>

            {step === 'preview' && (
              <button
                type="button"
                onClick={handleSubmitImport}
                disabled={isSubmitting || validRowCount === 0}
                className={`flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md ${
                  isSubmitting || validRowCount === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25 active:scale-98'
                }`}
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <>
                    <span>Import {validRowCount} {entityName}{validRowCount !== 1 ? 's' : ''}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
