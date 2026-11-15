import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { formatCurrency } from './currency';
import { formatFullDateTime } from './helper';
import { successToast, errorToast } from './toast';
import type { Product } from '../services/api';
import type { ColumnDef } from '../components/CustomTable';

const getCategoryName = (p: any): string => {
  if (!p) return '';
  if (p.category && typeof p.category === 'object') return p.category.name || '';
  if (typeof p.category === 'string') return p.category;
  return p.itemGroup || '';
};

const getPartOfName = (p: any): string => {
  if (!p) return '';
  if (p.partOf && typeof p.partOf === 'object') return p.partOf.name || '';
  if (typeof p.partOf === 'string') return p.partOf;
  return '';
};

const getSubPartOfName = (p: any): string => {
  if (!p) return '';
  if (p.subPartOf && typeof p.subPartOf === 'object') return p.subPartOf.name || '';
  if (typeof p.subPartOf === 'string') return p.subPartOf;
  return '';
};

const getUnitName = (p: any): string => {
  if (!p) return '';
  if (p.unit && typeof p.unit === 'object') return p.unit.name || '';
  if (typeof p.unit === 'string') return p.unit;
  return p.uom || 'Pcs';
};

const getBinLocation = (p: any): string => {
  if (!p) return '-';
  return p.binLocation || p.location || '-';
};

const getCostPrice = (p: any): number => {
  const val = p.cost_price ?? p.costPrice ?? 0;
  return isNaN(Number(val)) ? 0 : Number(val);
};

const getSellingPrice = (p: any): number => {
  const val = p.selling_price ?? p.sellingPrice ?? 0;
  return isNaN(Number(val)) ? 0 : Number(val);
};

const getQuantity = (p: any): number => {
  const val = p.quantity ?? p.stock ?? p.actualQuantity ?? 0;
  return isNaN(Number(val)) ? 0 : Number(val);
};

/**
 * Filter columns that are meant for visual actions/checkboxes rather than data export.
 */
export const isExportableColumn = (col: ColumnDef<any>): boolean => {
  if (!col || !col.title || !col.title.trim()) return false;
  const k = (col.key || '').toLowerCase();
  const t = (col.title || '').toLowerCase();
  if (k === 'actions' || k === 'action' || k === 'select' || k === 'checkbox' || k === 'statustoggle') return false;
  if (t === 'actions' || t === 'action' || t === 'select' || t === 'disable') return false;
  return true;
};

/**
 * Safely extract formatted cell value for any column definition and record row.
 */
export const extractCellValue = (col: ColumnDef<any>, row: any, _rowIndex?: number): any => {
  if (!row) return '';
  const key = col.key;
  let rawVal = row[key];

  // Common aliases and fallbacks
  if (rawVal === undefined) {
    if (key === 'itemCode') rawVal = row.sku || row.code || row.id;
    else if (key === 'itemName') rawVal = row.name || row.title;
    else if (key === 'itemGroup') rawVal = row.category?.name || row.category || row.group;
    else if (key === 'partOf') rawVal = row.partOf?.name || row.partOf;
    else if (key === 'subPartOf') rawVal = row.subPartOf?.name || row.subPartOf;
    else if (key === 'uom') rawVal = row.unit?.name || row.uom || row.stockUom;
    else if (key === 'warehouse') rawVal = row.warehouse?.name || row.warehouse || row.acceptedWarehouse;
    else if (key === 'actualQuantity' || key === 'quantity') rawVal = row.actualQuantity ?? row.quantity ?? row.stock;
    else if (key === 'status') rawVal = row.disabled !== undefined ? (row.disabled ? 'Disabled' : 'Enabled') : row.status;
  }

  // Handle object values with name, title, or code
  if (rawVal && typeof rawVal === 'object') {
    if (rawVal.name) return String(rawVal.name);
    if (rawVal.title) return String(rawVal.title);
    if (rawVal.code) return String(rawVal.code);
    return JSON.stringify(rawVal);
  }

  // Handle booleans
  if (typeof rawVal === 'boolean') {
    if (key === 'disabled') return rawVal ? 'Disabled' : 'Enabled';
    return rawVal ? 'Yes' : 'No';
  }

  // Format ISO timestamps
  if (typeof rawVal === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(rawVal)) {
    return formatFullDateTime(rawVal);
  }

  if (rawVal === null || rawVal === undefined || rawVal === '') {
    return '-';
  }

  return rawVal;
};

/**
 * Generic: Export any dataset to Microsoft Excel (.xlsx).
 */
export const exportDataToExcel = <T = any>(params: {
  title: string;
  data: T[];
  columns: ColumnDef<T>[];
  filename?: string;
}): void => {
  const { title, data, columns, filename } = params;
  if (!data || data.length === 0) {
    errorToast('No records available to export');
    return;
  }

  const exportCols = columns.filter(isExportableColumn);
  if (exportCols.length === 0) {
    errorToast('No exportable columns found');
    return;
  }

  try {
    const rows = data.map((row, index) => {
      const rowObj: Record<string, any> = {
        '#': index + 1
      };

      exportCols.forEach(col => {
        rowObj[col.title] = extractCellValue(col, row, index);
      });

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    // Auto column widths
    const colWidths = [{ wch: 6 }, ...exportCols.map(col => ({
      wch: Math.max(col.title.length + 4, 14)
    }))];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    const sheetName = (title || 'Report').slice(0, 31).replace(/[\\/?*:[\]]/g, '');
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    const dateStr = new Date().toISOString().split('T')[0];
    const cleanTitle = (title || 'Report').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const resolvedName = filename || `${cleanTitle}_export_${dateStr}.xlsx`;

    XLSX.writeFile(workbook, resolvedName);
    successToast(`Exported ${data.length} record(s) to Excel`);
  } catch (err: any) {
    console.error('Generic Excel Export Error:', err);
    errorToast(err.message || 'Failed to export records to Excel');
  }
};

/**
 * Generic: Export any dataset to CSV (.csv).
 */
export const exportDataToCsv = <T = any>(params: {
  title: string;
  data: T[];
  columns: ColumnDef<T>[];
  filename?: string;
}): void => {
  const { title, data, columns, filename } = params;
  if (!data || data.length === 0) {
    errorToast('No records available to export');
    return;
  }

  const exportCols = columns.filter(isExportableColumn);
  if (exportCols.length === 0) {
    errorToast('No exportable columns found');
    return;
  }

  try {
    const rows = data.map((row, index) => {
      const rowObj: Record<string, any> = {
        '#': index + 1
      };

      exportCols.forEach(col => {
        rowObj[col.title] = extractCellValue(col, row, index);
      });

      return rowObj;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');

    const dateStr = new Date().toISOString().split('T')[0];
    const cleanTitle = (title || 'Report').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const resolvedName = filename || `${cleanTitle}_export_${dateStr}.csv`;

    XLSX.writeFile(workbook, resolvedName, { bookType: 'csv' });
    successToast(`Exported ${data.length} record(s) to CSV`);
  } catch (err: any) {
    console.error('Generic CSV Export Error:', err);
    errorToast(err.message || 'Failed to export records to CSV');
  }
};

/**
 * Generic: Export any dataset to clean Landscape/Portrait PDF report (.pdf).
 */
export const exportDataToPdf = <T = any>(params: {
  title: string;
  data: T[];
  columns: ColumnDef<T>[];
  filename?: string;
  subtitle?: string;
}): void => {
  const { title, data, columns, filename, subtitle } = params;
  if (!data || data.length === 0) {
    errorToast('No records available to export');
    return;
  }

  const exportCols = columns.filter(isExportableColumn);
  if (exportCols.length === 0) {
    errorToast('No exportable columns found');
    return;
  }

  try {
    // Landscape if > 5 columns for proper spacing
    const isLandscape = exportCols.length > 5;
    const doc = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = isLandscape ? 297 : 210;
    const totalRecords = data.length;

    // Brand Emerald Header Bar (#0f8b5a)
    doc.setFillColor(15, 139, 90);
    doc.rect(0, 0, pageWidth, 6, 'F');

    // Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(`AURA ERP — ${title.toUpperCase()}`, 14, 16);

    // Metadata Subtitle
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const dateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const metaText = subtitle || `Generated on: ${dateFormatted} at ${timeFormatted}   |   Total Records: ${totalRecords}   |   Currency: USh (UGX)`;
    doc.text(metaText, 14, 22);

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 25, pageWidth - 14, 25);

    // Prepare table body
    const headRow = ['#', ...exportCols.map(c => c.title)];
    const tableBody = data.map((row, index) => {
      return [
        String(index + 1),
        ...exportCols.map(col => {
          const val = extractCellValue(col, row, index);
          if (typeof val === 'number') {
            const t = col.title.toLowerCase();
            if (t.includes('price') || t.includes('rate') || t.includes('amount') || t.includes('total') || t.includes('cost') || t.includes('ush')) {
              return formatCurrency(val, undefined, { forceDecimals: false });
            }
            return val.toLocaleString('en-US');
          }
          return String(val ?? '-');
        })
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [headRow],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 139, 90],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: exportCols.length > 8 ? 7 : 8,
        cellPadding: 2,
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: exportCols.length > 8 ? 6.5 : 7.5,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (pageData) => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        const currentPage = pageData.pageNumber;
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Aura ERP • ${title} • Confidential`, 14, isLandscape ? 204 : 291);
        doc.text(`Page ${currentPage} of ${totalPages}`, pageWidth - 14, isLandscape ? 204 : 291, { align: 'right' });
      }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const cleanTitle = (title || 'Report').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const resolvedName = filename || `${cleanTitle}_report_${dateStr}.pdf`;

    doc.save(resolvedName);
    successToast(`Exported ${data.length} record(s) to PDF`);
  } catch (err: any) {
    console.error('Generic PDF Export Error:', err);
    errorToast(err.message || 'Failed to export records to PDF');
  }
};

/**
 * Specialized: Export products array to Microsoft Excel (.xlsx) workbook.
 */
export const exportProductsToExcel = (products: Product[], filename?: string): void => {
  if (!products || products.length === 0) {
    errorToast('No items available to export');
    return;
  }

  try {
    const rows = products.map((p, index) => {
      const cost = getCostPrice(p);
      const selling = getSellingPrice(p);
      const qty = getQuantity(p);
      const minStock = Number(p.min_stock ?? (p as any).minStock ?? 0);

      return {
        'Sr No': index + 1,
        'Item Code / SKU': p.sku || p.id || '',
        'Item Name': p.name || '',
        'Item Group': getCategoryName(p) || 'CONSUMABLES',
        'Part Of': getPartOfName(p) || '-',
        'Sub Part Of': getSubPartOfName(p) || '-',
        'Default UOM': getUnitName(p),
        'Standard Cost Price (USh)': cost,
        'Standard Selling Rate (USh)': selling,
        'Stock Qty': qty,
        'Min Stock': minStock,
        'Bin Location': getBinLocation(p),
        'Company': p.company || 'AURA INDUSTRIES LTD',
        'Status': p.disabled ? 'Disabled' : 'Enabled',
        'Maintain Stock': p.maintainStock !== false ? 'Yes' : 'No',
        'Include In Manufacturing': p.includeInManufacturing !== false ? 'Yes' : 'No',
        'Updated At': p.updatedAt ? formatFullDateTime(p.updatedAt) : ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);

    worksheet['!cols'] = [
      { wch: 8 },   // Sr No
      { wch: 20 },  // SKU
      { wch: 34 },  // Item Name
      { wch: 20 },  // Item Group
      { wch: 20 },  // Part Of
      { wch: 20 },  // Sub Part Of
      { wch: 12 },  // UOM
      { wch: 24 },  // Cost Price
      { wch: 24 },  // Selling Rate
      { wch: 14 },  // Stock Qty
      { wch: 14 },  // Min Stock
      { wch: 16 },  // Bin Location
      { wch: 26 },  // Company
      { wch: 12 },  // Status
      { wch: 16 },  // Maintain Stock
      { wch: 26 },  // Include In Manufacturing
      { wch: 24 }   // Updated At
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Item Master');

    const dateStr = new Date().toISOString().split('T')[0];
    const resolvedName = filename || `Item_Master_Export_${dateStr}.xlsx`;
    XLSX.writeFile(workbook, resolvedName);
    successToast(`Exported ${products.length} item(s) to Excel`);
  } catch (err: any) {
    console.error('Excel Export Error:', err);
    errorToast(err.message || 'Failed to export items to Excel');
  }
};

/**
 * Specialized: Export products array to clean landscape PDF report (.pdf).
 */
export const exportProductsToPdf = (
  products: Product[],
  filename?: string,
  reportTitle?: string
): void => {
  if (!products || products.length === 0) {
    errorToast('No items available to export');
    return;
  }

  try {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const totalItems = products.length;
    const enabledCount = products.filter(p => !p.disabled).length;
    const disabledCount = totalItems - enabledCount;

    // Top Brand Stripe (Aura Emerald Green #0f8b5a)
    doc.setFillColor(15, 139, 90);
    doc.rect(0, 0, 297, 6, 'F');

    // Report Header Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(15, 23, 42);
    doc.text(reportTitle || 'AURA ERP — ITEM MASTER RECORD', 14, 16);

    // Subtitle with Metadata
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    const dateFormatted = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const timeFormatted = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    doc.text(
      `Generated on: ${dateFormatted} at ${timeFormatted}   |   Total Items: ${totalItems} (${enabledCount} Enabled, ${disabledCount} Disabled)   |   Currency: USh (UGX)`,
      14,
      22
    );

    // Separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 25, 283, 25);

    // Prepare table body rows
    const tableBody = products.map((p, index) => {
      const cost = getCostPrice(p);
      const selling = getSellingPrice(p);
      const qty = getQuantity(p);

      return [
        String(index + 1),
        p.sku || '-',
        p.name || '-',
        getCategoryName(p) || '-',
        getPartOfName(p) || '-',
        getSubPartOfName(p) || '-',
        getUnitName(p) || '-',
        cost > 0 ? formatCurrency(cost, undefined, { forceDecimals: false }) : '-',
        selling > 0 ? formatCurrency(selling, undefined, { forceDecimals: false }) : '-',
        qty.toLocaleString('en-US'),
        getBinLocation(p),
        p.disabled ? 'Disabled' : 'Enabled'
      ];
    });

    autoTable(doc, {
      startY: 28,
      head: [[
        '#',
        'Item Code / SKU',
        'Item Name',
        'Item Group',
        'Part Of',
        'Sub Part Of',
        'UOM',
        'Cost Price (USh)',
        'Selling Rate (USh)',
        'Qty',
        'Bin',
        'Status'
      ]],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [15, 139, 90],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        cellPadding: 2,
        valign: 'middle'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59],
        cellPadding: 1.8,
        valign: 'middle'
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { cellWidth: 8, halign: 'center' },
        1: { cellWidth: 26, fontStyle: 'bold' },
        2: { cellWidth: 50 },
        3: { cellWidth: 26 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 12, halign: 'center' },
        7: { cellWidth: 26, halign: 'right' },
        8: { cellWidth: 26, halign: 'right' },
        9: { cellWidth: 16, halign: 'right' },
        10: { cellWidth: 16, halign: 'center' },
        11: { cellWidth: 15, halign: 'center' }
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        const currentPage = data.pageNumber;
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text('Aura ERP • Confidential Item Master Records', 14, 204);
        doc.text(`Page ${currentPage} of ${totalPages}`, 283, 204, { align: 'right' });
      }
    });

    const dateStr = new Date().toISOString().split('T')[0];
    const resolvedName = filename || `Item_Master_Report_${dateStr}.pdf`;
    doc.save(resolvedName);
    successToast(`Exported ${products.length} item(s) to PDF`);
  } catch (err: any) {
    console.error('PDF generation error:', err);
    errorToast(err.message || 'Failed to export PDF');
  }
};
