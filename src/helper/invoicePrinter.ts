import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Invoice } from '../types';
import { THEME_CONFIG } from '../theme/muiTheme';
import { successToast, errorToast } from './toast';
import { formatCurrency, getActiveCurrency } from './currency';
import type { CurrencySetting } from '../slices/settingsSlice';

// Helper to convert hex color to RGB tuple
const hexToRgb = (hex: string): [number, number, number] => {
  const clean = (hex || '#0f8b5a').replace('#', '');
  if (clean.length === 3) {
    return [
      parseInt(clean[0] + clean[0], 16),
      parseInt(clean[1] + clean[1], 16),
      parseInt(clean[2] + clean[2], 16),
    ];
  }
  return [
    parseInt(clean.substring(0, 2), 16) || 15,
    parseInt(clean.substring(2, 4), 16) || 139,
    parseInt(clean.substring(4, 6), 16) || 90,
  ];
};

// Auto cleanup any lingering html2canvas DOM artifacts
export const cleanupDomArtifacts = (): void => {
  if (typeof document === 'undefined') return;
  try {
    document.querySelectorAll('.html2canvas-container, [style*="-9999px"], [style*="-10000px"]').forEach(el => el.remove());
    if (document.documentElement.scrollLeft > 0) {
      document.documentElement.scrollLeft = 0;
    }
    if (document.body.scrollLeft > 0) {
      document.body.scrollLeft = 0;
    }
  } catch {
    // Ignore DOM cleanup errors
  }
};

// Run cleanup immediately on module load to recover any shifted layouts
cleanupDomArtifacts();

/**
 * Generate full HTML for printable invoice (used by printInvoice)
 */
export const generateInvoiceHtml = (invoice: Invoice, currency?: CurrencySetting): string => {
  const activeCurrency = currency || getActiveCurrency();
  const isSales = invoice.type === 'SALES';
  const entityTitle = isSales ? 'Customer' : 'Supplier';
  const entityName = isSales ? (invoice.customer?.name || 'Customer') : (invoice.supplier?.name || 'Supplier');
  const entityContact = isSales ? (invoice.customer?.contact || '-') : (invoice.supplier?.contact || '-');
  const entityEmail = isSales ? (invoice.customer?.email || '-') : (invoice.supplier?.email || '-');
  const formattedDate = new Date(invoice.date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const totalAmountFormatted = formatCurrency(invoice.totalAmount, activeCurrency);
  const themeColor = THEME_CONFIG.primary || '#0f8b5a';

  const itemsRows = (invoice.items || []).map((item, index) => {
    const productName = item.product?.name || item.productId || 'Item';
    const sku = item.product?.sku ? `<span style="color: #6b7280; font-size: 11px;">(SKU: ${item.product.sku})</span>` : '';
    const qty = Number(item.quantity || 0);
    const unitPrice = formatCurrency(item.unitPrice, activeCurrency);
    const lineTotal = formatCurrency(item.totalPrice || (qty * Number(item.unitPrice || 0)), activeCurrency);

    return `
      <tr style="border-bottom: 1px solid #f3f4f6;">
        <td style="padding: 10px 14px; color: #4b5563; font-size: 13px;">${index + 1}</td>
        <td style="padding: 10px 14px; color: #111827; font-weight: 500; font-size: 13px;">
          ${productName} ${sku}
        </td>
        <td style="padding: 10px 14px; text-align: center; color: #374151; font-size: 13px;">${qty}</td>
        <td style="padding: 10px 14px; text-align: right; color: #374151; font-size: 13px;">${unitPrice}</td>
        <td style="padding: 10px 14px; text-align: right; color: #111827; font-weight: 600; font-size: 13px;">${lineTotal}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Invoice - ${invoice.invoiceNumber}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 14mm;
        }
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          color: #1f2937;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          line-height: 1.4;
        }
        .invoice-card {
          max-width: 800px;
          margin: 0 auto;
          padding: 24px;
          background: #ffffff;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #f3f4f6;
          padding-bottom: 20px;
          margin-bottom: 24px;
        }
        .brand-logo {
          font-size: 24px;
          font-weight: 800;
          color: ${themeColor};
          letter-spacing: -0.5px;
        }
        .company-subtitle {
          font-size: 12px;
          color: #6b7280;
          margin-top: 3px;
        }
        .invoice-title-block {
          text-align: right;
        }
        .invoice-title {
          font-size: 22px;
          font-weight: 800;
          color: #111827;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .badge {
          display: inline-block;
          margin-top: 6px;
          padding: 3px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          background-color: ${isSales ? '#eff6ff' : '#f5f3ff'};
          color: ${isSales ? '#2563eb' : '#7c3aed'};
        }
        .meta-grid {
          display: flex;
          gap: 24px;
          margin-bottom: 24px;
        }
        .meta-box {
          flex: 1;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px 18px;
        }
        .meta-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: #9ca3af;
          letter-spacing: 0.5px;
          margin-bottom: 6px;
        }
        .meta-name {
          font-size: 15px;
          font-weight: 700;
          color: #111827;
          margin-bottom: 4px;
        }
        .meta-text {
          font-size: 12px;
          color: #4b5563;
          margin-bottom: 2px;
        }
        .invoice-info-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          margin-bottom: 4px;
        }
        .invoice-info-row span:first-child {
          color: #6b7280;
          font-weight: 500;
        }
        .invoice-info-row span:last-child {
          color: #111827;
          font-weight: 600;
        }
        .table-container {
          width: 100%;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 20px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background-color: #f9fafb;
          padding: 10px 14px;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #4b5563;
          border-bottom: 1px solid #e5e7eb;
        }
        .summary-block {
          display: flex;
          justify-content: flex-end;
          margin-bottom: 30px;
        }
        .summary-card {
          width: 260px;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 14px 18px;
        }
        .summary-total {
          display: flex;
          justify-content: space-between;
          font-size: 16px;
          font-weight: 800;
          color: ${themeColor};
        }
        .footer {
          border-top: 1px solid #f3f4f6;
          padding-top: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 11px;
          color: #9ca3af;
        }
      </style>
    </head>
    <body>
      <div class="invoice-card">
        <div class="header">
          <div>
            <div class="brand-logo">AURA ERP</div>
            <div class="company-subtitle">Enterprise Resource Planning & Production Management</div>
          </div>
          <div class="invoice-title-block">
            <div class="invoice-title">${isSales ? 'Sales Invoice' : 'Purchase Invoice'}</div>
            <div class="badge">${invoice.type}</div>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-box">
            <div class="meta-label">Invoice Details</div>
            <div class="invoice-info-row">
              <span>Invoice #:</span>
              <span>${invoice.invoiceNumber}</span>
            </div>
            <div class="invoice-info-row">
              <span>Date:</span>
              <span>${formattedDate}</span>
            </div>
            <div class="invoice-info-row">
              <span>Type:</span>
              <span>${invoice.type}</span>
            </div>
          </div>

          <div class="meta-box">
            <div class="meta-label">${entityTitle}</div>
            <div class="meta-name">${entityName}</div>
            <div class="meta-text">Phone: ${entityContact}</div>
            <div class="meta-text">Email: ${entityEmail}</div>
          </div>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th style="width: 40px; text-align: left;">#</th>
                <th style="text-align: left;">Product</th>
                <th style="width: 80px; text-align: center;">Qty</th>
                <th style="width: 110px; text-align: right;">Unit Price</th>
                <th style="width: 120px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <div class="summary-block">
          <div class="summary-card">
            <div class="summary-total">
              <span>Total Amount</span>
              <span>${totalAmountFormatted}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>Thank you for your business! | Aura ERP System Generated Invoice</p>
          <p>Page 1 of 1</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Print Invoice via clean invisible iframe (NO scroll offset / NO layout shift)
 */
export const printInvoice = (invoice: Invoice, currency?: CurrencySetting): void => {
  try {
    cleanupDomArtifacts();

    const htmlContent = generateInvoiceHtml(invoice, currency);
    const iframe = document.createElement('iframe');
    
    // Positioned safely without negative offset to avoid page scroll jumps
    iframe.style.position = 'fixed';
    iframe.style.top = '0';
    iframe.style.left = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    iframe.style.visibility = 'hidden';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!doc) {
      throw new Error('Failed to access print document context');
    }

    doc.open();
    doc.write(htmlContent);
    doc.close();

    iframe.contentWindow?.focus();
    setTimeout(() => {
      iframe.contentWindow?.print();
      // Clean up iframe after print dialog interaction
      setTimeout(() => {
        if (iframe.parentNode) {
          document.body.removeChild(iframe);
        }
      }, 2000);
    }, 400);
  } catch (error: any) {
    console.error('Failed to print invoice:', error);
    errorToast('Failed to print invoice');
  }
};

/**
 * Download Invoice as pure native vector PDF
 * Generates 100% in-memory with jsPDF & autoTable.
 * ZERO DOM manipulation, ZERO layout shift, ZERO UI changes to the page!
 */
export const downloadInvoicePdf = async (invoice: Invoice, currency?: CurrencySetting): Promise<void> => {
  try {
    // Immediately clean up any previous DOM artifacts
    cleanupDomArtifacts();

    const activeCurrency = currency || getActiveCurrency();
    const isSales = invoice.type === 'SALES';
    const primaryRgb = hexToRgb(THEME_CONFIG.primary || '#0f8b5a');
    const entityTitle = isSales ? 'CUSTOMER' : 'SUPPLIER';
    const entityName = isSales ? (invoice.customer?.name || 'Customer') : (invoice.supplier?.name || 'Supplier');
    const entityContact = isSales ? (invoice.customer?.contact || '-') : (invoice.supplier?.contact || '-');
    const entityEmail = isSales ? (invoice.customer?.email || '-') : (invoice.supplier?.email || '-');
    const formattedDate = new Date(invoice.date).toLocaleDateString();
    const totalAmount = formatCurrency(invoice.totalAmount, activeCurrency);

    // Initialize portrait A4 document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    doc.setFont('helvetica');

    // Header: Brand logo & subtitle
    doc.setFontSize(22);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.text('AURA ERP', 14, 22);

    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('Enterprise Resource Planning & Production Management', 14, 28);

    // Header: Invoice Title & Badge
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(isSales ? 'SALES INVOICE' : 'PURCHASE INVOICE', 196, 22, { align: 'right' });

    doc.setFontSize(10);
    if (isSales) {
      doc.setTextColor(37, 99, 235); // Blue
    } else {
      doc.setTextColor(124, 58, 237); // Purple
    }
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.type, 196, 28, { align: 'right' });

    // Divider Line
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.4);
    doc.line(14, 33, 196, 33);

    // Metadata Left Card (Invoice Details)
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(14, 38, 86, 32, 3, 3, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(14, 38, 86, 32, 3, 3, 'S');

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE DETAILS', 18, 44);

    doc.setFontSize(9.5);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.text('Invoice #:', 18, 51);
    doc.text('Date:', 18, 57);
    doc.text('Type:', 18, 63);

    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.invoiceNumber, 42, 51);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, 42, 57);
    doc.text(invoice.type, 42, 63);

    // Metadata Right Card (Entity Details)
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(110, 38, 86, 32, 3, 3, 'F');
    doc.roundedRect(110, 38, 86, 32, 3, 3, 'S');

    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.setFont('helvetica', 'bold');
    doc.text(entityTitle, 114, 44);

    doc.setFontSize(11);
    doc.setTextColor(17, 24, 39);
    doc.setFont('helvetica', 'bold');
    doc.text(entityName, 114, 52);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(107, 114, 128);
    doc.text(`Phone: ${entityContact}`, 114, 58);
    doc.text(`Email: ${entityEmail}`, 114, 63);

    // Build Table Rows
    const tableBody = (invoice.items || []).map((item, index) => {
      const prodName = item.product?.name || item.productId || 'Item';
      const sku = item.product?.sku ? ` (${item.product.sku})` : '';
      const qty = String(item.quantity || 0);
      const unitPrice = formatCurrency(item.unitPrice, activeCurrency);
      const lineTotal = formatCurrency(item.totalPrice, activeCurrency);
      return [String(index + 1), `${prodName}${sku}`, qty, unitPrice, lineTotal];
    });

    // AutoTable layout
    autoTable(doc, {
      startY: 76,
      head: [['#', 'Product', 'Qty', 'Unit Price', 'Total']],
      body: tableBody,
      theme: 'plain',
      headStyles: {
        fillColor: [249, 250, 251],
        textColor: [107, 114, 128],
        fontSize: 8.5,
        fontStyle: 'bold',
        cellPadding: 3.5,
      },
      bodyStyles: {
        textColor: [17, 24, 39],
        fontSize: 9.5,
        cellPadding: 3.5,
      },
      columnStyles: {
        0: { cellWidth: 12, halign: 'center' },
        1: { cellWidth: 'auto' },
        2: { cellWidth: 20, halign: 'center' },
        3: { cellWidth: 32, halign: 'right' },
        4: { cellWidth: 36, halign: 'right', fontStyle: 'bold' },
      },
      styles: {
        lineColor: [243, 244, 246],
        lineWidth: 0.2,
      },
    });

    // Final Y position after table
    const finalY = ((doc as any).lastAutoTable?.finalY || 120) + 8;

    // Summary Card
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(120, finalY, 76, 20, 3, 3, 'F');
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(120, finalY, 76, 20, 3, 3, 'S');

    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Amount:', 125, finalY + 12);

    doc.setFontSize(13);
    doc.setTextColor(primaryRgb[0], primaryRgb[1], primaryRgb[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(totalAmount, 191, finalY + 12, { align: 'right' });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text('Thank you for your business! | Aura ERP System Generated Invoice', 105, 280, { align: 'center' });

    // Trigger vector download
    doc.save(`${invoice.invoiceNumber}.pdf`);

    successToast(`Invoice ${invoice.invoiceNumber} downloaded as PDF`);
  } catch (error: any) {
    console.error('Failed to download invoice PDF:', error);
    errorToast('Failed to generate PDF');
  } finally {
    // Ensure viewport and DOM are completely clean
    cleanupDomArtifacts();
  }
};
