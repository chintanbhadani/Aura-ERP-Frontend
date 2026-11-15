import React, { useState, useEffect } from 'react';
import { X, Download, Loader2, FileSpreadsheet, FileText, FileCode } from 'lucide-react';
import type { ColumnDef } from '../CustomTable';
import { 
  exportDataToExcel, 
  exportDataToCsv, 
  exportDataToPdf 
} from '../../helper/exportHelper';
import { successToast, errorToast } from '../../helper/toast';

export type ExportFileFormat = 'excel' | 'pdf' | 'csv';

export interface ERPExportModalProps<T = any> {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  columns: ColumnDef<T>[];
  data: T[];
  filteredData?: T[];
  selectedIds?: string[];
  idField?: string;
  onFetchAllRecords?: () => Promise<T[]>;
  customExportHandler?: (format: ExportFileFormat, records: T[], inBackground?: boolean) => Promise<void> | void;
  fileNamePrefix?: string;
}

export const ERPExportModal = <T extends Record<string, any> = any>({
  isOpen,
  onClose,
  title,
  columns,
  data,
  filteredData,
  selectedIds = [],
  idField = 'id',
  onFetchAllRecords,
  customExportHandler,
  fileNamePrefix
}: ERPExportModalProps<T>) => {
  const [fileFormat, setFileFormat] = useState<ExportFileFormat>('excel');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportStatusText, setExportStatusText] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      setIsExporting(false);
      setExportStatusText('');
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isExporting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isExporting, onClose]);

  if (!isOpen) return null;

  const handleDownload = async () => {
    try {
      setIsExporting(true);
      let targetRecords: T[] = [];

      // By default: Fetch all records from the server API if fetcher is provided
      if (onFetchAllRecords) {
        setExportStatusText('Fetching all latest records from server API...');
        try {
          const fetched = await onFetchAllRecords();
          if (Array.isArray(fetched) && fetched.length > 0) {
            targetRecords = fetched;
          } else {
            targetRecords = data;
          }
        } catch (err: any) {
          console.warn('API fetch failed, falling back to local table records:', err);
          targetRecords = data;
        }
      } else {
        targetRecords = data;
      }

      if (!targetRecords || targetRecords.length === 0) {
        errorToast('No records available to export');
        setIsExporting(false);
        return;
      }

      setExportStatusText(`Generating ${fileFormat.toUpperCase()} file (${targetRecords.length} records)...`);

      // Small tick to allow UI to render spinner
      await new Promise(resolve => setTimeout(resolve, 80));

      if (customExportHandler) {
        await customExportHandler(fileFormat, targetRecords, false);
      } else {
        executeExport(fileFormat, targetRecords);
      }

      onClose();
      successToast(`Exported all ${targetRecords.length} record(s) to ${fileFormat.toUpperCase()}`);
    } catch (err: any) {
      console.error('Export Error:', err);
      errorToast(err.message || 'Failed to complete export');
    } finally {
      setIsExporting(false);
      setExportStatusText('');
    }
  };

  const executeExport = (format: ExportFileFormat, records: T[]) => {
    const cleanPrefix = (fileNamePrefix || title || 'report').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'excel') {
      exportDataToExcel<T>({
        title,
        data: records,
        columns,
        filename: `${cleanPrefix}_${dateStr}.xlsx`
      });
    } else if (format === 'pdf') {
      exportDataToPdf<T>({
        title,
        data: records,
        columns,
        filename: `${cleanPrefix}_report_${dateStr}.pdf`
      });
    } else {
      exportDataToCsv<T>({
        title,
        data: records,
        columns,
        filename: `${cleanPrefix}_${dateStr}.csv`
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px] animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-md w-full overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900 tracking-tight">
            Export Report: {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="p-6 space-y-4">
          {/* File Format Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">
              File Format <span className="text-red-500 font-bold">*</span>
            </label>
            <div className="relative">
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value as ExportFileFormat)}
                disabled={isExporting}
                className="w-full h-10 px-3.5 pr-8 text-xs bg-white border border-gray-200 rounded-lg text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#059669] focus:border-transparent transition-all shadow-2xs cursor-pointer"
              >
                <option value="excel">Excel (.xlsx)</option>
                <option value="pdf">PDF (.pdf)</option>
                <option value="csv">CSV (.csv)</option>
              </select>
            </div>
            <p className="text-[11px] text-gray-500 mt-1.5 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#059669] shrink-0"></span>
              <span>Bypasses page limits to fetch and export all records directly via server API.</span>
            </p>
          </div>

          {/* Exporting Progress Indicator */}
          {isExporting && (
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2.5 text-xs text-emerald-800 animate-in fade-in duration-100">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 shrink-0" />
              <span>{exportStatusText || 'Fetching all records and preparing export...'}</span>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-gray-50/80 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {/* Aura ERP Theme Button */}
          <button
            type="button"
            onClick={handleDownload}
            disabled={isExporting}
            className="flex items-center gap-2 bg-[#059669] hover:bg-[#047857] active:bg-[#065f46] text-white px-5 py-2.5 rounded-lg text-xs font-semibold shadow-sm hover:shadow-md hover:shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Downloading...</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
