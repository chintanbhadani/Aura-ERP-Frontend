import React, { useState, useRef } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  X, 
  Printer, 
  FileText, 
  RefreshCw, 
  Maximize2, 
  Minimize2, 
  Check, 
  AlertCircle 
} from 'lucide-react';
import { successToast, errorToast } from '../helper/toast';

interface ItemPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: any;
}

export const ItemPrintModal: React.FC<ItemPrintModalProps> = ({ isOpen, onClose, item }) => {
  const [printFormat, setPrintFormat] = useState('Standard');
  const [language, setLanguage] = useState('en-GB');
  const [letterHead, setLetterHead] = useState('No Letterhead');
  const [isFullPage, setIsFullPage] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const printAreaRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !item) return null;

  // Detect if document is a Material Request
  const isMaterialRequest = item.doctype === 'Material Request' || item.category === 'Material Request' || Boolean(item.purpose);

  // Material Request fields
  const docId = item.sku || item.id || item.item_code || 'PR-2026-10-00001';
  const rawSeries = item.series || item.naming_series || '';
  const mrSeries = (rawSeries && !rawSeries.includes('.YYYY.') && !rawSeries.includes('.-')) ? rawSeries : docId;
  const mrPurpose = item.purpose || item.default_material_request_type || 'Purchase';
  const mrTransactionDate = item.transactionDate || item.transaction_date || '2026-08-13';
  const mrRequiredByDate = item.requiredByDate || item.required_by_date || '2026-08-13';
  const mrDepartment = item.department || 'PURCHASING';
  const mrRequiredFor = item.requiredFor || 'HSE ITEMS, MEDICINE & CONSUMABLES';
  const mrPriceList = item.priceList || 'Standard Buying';
  const mrCompany = item.company || 'AURA INDUSTRIES LTD';
  const mrAttendBy = item.attendBy || 'System User';
  const mrPurchaseType = item.purchaseType || 'Local';
  const mrSetWarehouse = item.setWarehouse || item.warehouse || 'Main Store - Aura';
  const mrApprovalStatus = item.approvalStatus || 'Approved';
  const mrStatus = item.status || 'Partially Received';
  const mrCreatedBy = item.createdBy || 'Admin';

  const mrItemsList: any[] = item.items && item.items.length > 0 ? item.items : [
    { id: '1', itemCode: 'NGMD008: AMOXYCLAVE TABLET', requiredByDate: mrRequiredByDate, quantity: 10, uom: 'BOX', warehouse: mrSetWarehouse },
    { id: '2', itemCode: 'NGMD023: AMPLICLOX TABLETS', requiredByDate: mrRequiredByDate, quantity: 10, uom: 'BOX', warehouse: mrSetWarehouse },
    { id: '3', itemCode: 'NGMD004: CETRIZINE TABLETS', requiredByDate: mrRequiredByDate, quantity: 10, uom: 'Pcs', warehouse: mrSetWarehouse },
    { id: '4', itemCode: 'NG000245: CHEST COFF TAB', requiredByDate: mrRequiredByDate, quantity: 10, uom: 'NOS', warehouse: mrSetWarehouse },
    { id: '5', itemCode: 'NG000250: CLIP BANDAGE SMALL', requiredByDate: mrRequiredByDate, quantity: 12, uom: 'NOS', warehouse: mrSetWarehouse },
    { id: '6', itemCode: 'NG000237: COTTON WOOL', requiredByDate: mrRequiredByDate, quantity: 5, uom: 'NOS', warehouse: mrSetWarehouse },
    { id: '7', itemCode: 'NG00844: Dawa Tatu', requiredByDate: mrRequiredByDate, quantity: 10, uom: 'BOX', warehouse: mrSetWarehouse },
    { id: '8', itemCode: 'NG000247: DICLOPAR TAB', requiredByDate: mrRequiredByDate, quantity: 10, uom: 'NOS', warehouse: mrSetWarehouse }
  ];

  // Extract Product fields with fallbacks matching ERPNext JSON payload
  const sku = item.sku || item.item_code || item.name || 'NGBN079';
  const itemName = item.name || item.item_name || 'NUT AND BOLT M5 X 25 MM';
  const itemGroup = item.category?.name || item.category || item.item_group || 'CONSUMABLE';
  const partOf = item.partOf || item.part_of_ || 'BOLT & NUT';
  const subPartOf = item.subPartOf || item.sub_part_of || 'BOLT & NUT';
  const stockUom = item.unit?.name || item.unitId || item.stock_uom || 'Pcs';
  const company = item.company || 'NEELKANTH CHEMICALS LIMITED';
  const namingSeries = item.naming_series || 'STO-ITEM-.YYYY.-';
  const withholdingTaxPurchase = item.withholdingTaxPurchase ?? item.withholding_tax_rate_on_purchase ?? 0;
  const withholdingTaxSales = item.withholdingTaxSales ?? item.withholding_tax_rate_on_sales ?? 0;
  const activityType = item.activityType || item.activity_type || 'Repairs & Maintenance';

  const maintainStock = item.maintainStock ?? item.is_stock_item ?? true;
  const includeInManufacturing = item.includeInManufacturing ?? item.include_item_in_manufacturing ?? true;
  const openingStock = item.quantity ?? item.opening_stock ?? 0;
  const valuationRate = item.valuationRate ?? item.valuation_rate ?? 0;
  const standardRate = item.sellingPrice ?? item.selling_price ?? item.standard_rate ?? 0;
  const overDeliveryAllowance = item.overDeliveryAllowance ?? item.over_delivery_receipt_allowance ?? 0;
  const overBillingAllowance = item.overBillingAllowance ?? item.over_billing_allowance ?? 0;

  const shelfLife = item.shelf_life_in_days ?? 0;
  const weightPerUnit = item.weight_per_unit ?? 0;
  const endOfLife = item.end_of_life || '2099-12-31';
  const materialRequestType = item.default_material_request_type || 'Purchase';

  const uomsList = item.uoms && item.uoms.length > 0 
    ? item.uoms 
    : [{ uom: stockUom, conversion_factor: 1 }];

  const maxSampleQty = item.sample_quantity ?? 0;
  const variantBasedOn = item.variant_based_on || 'Item Attribute';
  const monthsExp = item.no_of_months_exp ?? 0;
  const monthsRev = item.no_of_months ?? 0;
  const minOrderQty = item.min_order_qty ?? 0;
  const leadTimeDays = item.lead_time_days ?? 0;
  const safetyStock = item.minStock ?? item.safety_stock ?? 0;
  const lastPurchaseRate = item.costPrice ?? item.last_purchase_rate ?? 0;

  const allowPurchase = item.allowPurchase ?? item.is_purchase_item ?? true;
  const allowSales = item.allowSales ?? item.is_sales_item ?? true;
  const grantCommission = item.grant_commission ?? true;
  const countryOfOrigin = item.countryOfOrigin || item.country_of_origin || 'India';
  const maxDiscount = item.max_discount ?? 0;

  // Print Action Handler
  const handlePrint = () => {
    window.print();
  };

  // Export PDF Handler using jsPDF
  const handleDownloadPdf = () => {
    try {
      setIsGeneratingPdf(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      if (isMaterialRequest) {
        // Material Request PDF Output
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text('MATERIAL REQUEST', 195, 22, { align: 'right' });
        doc.setFontSize(13);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 116, 139);
        doc.text(String(docId), 195, 29, { align: 'right' });

        doc.setDrawColor(226, 232, 240);
        doc.line(15, 34, 195, 34);

        let currentY = 42;
        doc.setFontSize(9);

        const leftDetails = [
          ['Series:', String(mrSeries)],
          ['Purpose:', String(mrPurpose)],
          ['Required By Date:', String(mrRequiredByDate)],
          ['Department:', String(mrDepartment)],
          ['Required For:', String(mrRequiredFor)],
          ['Created By:', String(mrCreatedBy)]
        ];

        const rightDetails = [
          ['Company:', String(mrCompany)],
          ['Transaction Date:', String(mrTransactionDate)],
          ['Approval Status:', String(mrApprovalStatus)],
          ['Status:', String(mrStatus)],
          ['Target Warehouse:', String(mrSetWarehouse)],
          ['Price List:', String(mrPriceList)]
        ];

        leftDetails.forEach(([label, val]) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(label, 15, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(val, 60, currentY);
          currentY += 6;
        });

        let rightY = 42;
        rightDetails.forEach(([label, val]) => {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(label, 110, rightY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(val, 195, rightY, { align: 'right', maxWidth: 45 });
          rightY += 6;
        });

        currentY = Math.max(currentY, rightY) + 8;

        autoTable(doc, {
          startY: currentY,
          head: [['Sr', 'Item Code & Description', 'Required By', 'Quantity', 'UOM', 'Target Warehouse']],
          body: mrItemsList.map((it: any, idx: number) => [
            idx + 1,
            it.itemCode || it.name || '',
            it.requiredByDate || mrRequiredByDate,
            it.quantity || 1,
            it.uom || 'Pcs',
            it.warehouse || mrSetWarehouse
          ]),
          theme: 'plain',
          headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 9 },
          styles: { fontSize: 8.5, textColor: [30, 41, 59] },
          margin: { left: 15, right: 15 }
        });

        doc.save(`${docId}_Material_Request.pdf`);
        successToast('Material Request PDF downloaded successfully');
        setIsGeneratingPdf(false);
        return;
      }

      // Title & Header (Standard Product)
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 41, 59);
      doc.text('ITEM', 195, 22, { align: 'right' });
      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(String(sku), 195, 29, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.line(15, 34, 195, 34);

      let currentY = 42;

      // 2-Column Key Details
      doc.setFontSize(9);
      const leftDetails = [
        ['Series:', String(namingSeries)],
        ['Item Code:', String(sku)],
        ['Item Name:', String(itemName)],
        ['Item Group:', String(itemGroup)],
        ['Part Of :', String(partOf)],
        ['Sub Part Of:', String(subPartOf)],
        ['Default Unit of Measure:', String(stockUom)],
        ['Withholding Tax Rate on Purchase:', String(withholdingTaxPurchase)],
        ['Withholding Tax Rate on Sales:', String(withholdingTaxSales)],
        ['Activity Type:', String(activityType)]
      ];

      const rightDetails = [
        ['Company:', String(company)],
        ['Maintain Stock:', maintainStock ? 'YES' : 'NO'],
        ['Include Item In Manufacturing:', includeInManufacturing ? 'YES' : 'NO'],
        ['Opening Stock:', String(openingStock)],
        ['Valuation Rate:', `₹${Number(valuationRate).toFixed(2)}`],
        ['Standard Selling Rate:', `₹${Number(standardRate).toFixed(2)}`],
        ['Over Delivery/Receipt Allowance (%):', String(overDeliveryAllowance)],
        ['Over Billing Allowance (%):', String(overBillingAllowance)]
      ];

      // Draw Left Column
      leftDetails.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(label, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(val, 72, currentY);
        currentY += 6;
      });

      // Draw Right Column
      let rightY = 42;
      rightDetails.forEach(([label, val]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(label, 110, rightY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(val, 195, rightY, { align: 'right', maxWidth: 45 });
        rightY += 6;
      });

      currentY = Math.max(currentY, rightY) + 6;

      doc.setFont('helvetica', 'bold');
      doc.text(String(itemName), 15, currentY);
      currentY += 8;

      // Additional Attributes
      const midDetails = [
        ['Shelf Life In Days:', String(shelfLife), 'Weight Per Unit:', String(weightPerUnit)],
        ['End of Life:', String(endOfLife), '', ''],
        ['Default Material Request Type:', String(materialRequestType), '', '']
      ];

      midDetails.forEach(([l1, v1, l2, v2]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(l1, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(v1, 72, currentY);

        if (l2) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(l2, 110, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(v2, 195, currentY, { align: 'right', maxWidth: 45 });
        }
        currentY += 6;
      });

      currentY += 4;

      // UOM Conversion Table
      autoTable(doc, {
        startY: currentY,
        head: [['Sr', 'UOM', 'Conversion Factor']],
        body: uomsList.map((u: any, idx: number) => [
          idx + 1,
          u.uom || stockUom,
          u.conversion_factor || 1
        ]),
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold', fontSize: 9 },
        styles: { fontSize: 8.5, textColor: [30, 41, 59] },
        margin: { left: 15, right: 15 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;

      // Bottom Details
      const bottomDetails = [
        ['Max Sample Quantity:', String(maxSampleQty), 'Variant Based On:', String(variantBasedOn)],
        ['No of Months (Expense):', String(monthsExp), 'No of Months (Revenue):', String(monthsRev)],
        ['Minimum Order Qty:', String(minOrderQty), 'Lead Time in days:', String(leadTimeDays)],
        ['Safety Stock:', String(safetyStock), 'Last Purchase Rate:', String(lastPurchaseRate)],
        ['Allow Purchase:', allowPurchase ? 'YES' : 'NO', 'Grant Commission:', grantCommission ? 'YES' : 'NO'],
        ['Country of Origin:', String(countryOfOrigin), 'Max Discount (%):', String(maxDiscount)],
        ['Allow Sales:', allowSales ? 'YES' : 'NO', '', '']
      ];

      bottomDetails.forEach(([l1, v1, l2, v2]) => {
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(51, 65, 85);
        doc.text(l1, 15, currentY);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(v1, 72, currentY);

        if (l2) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(l2, 110, currentY);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(v2, 195, currentY, { align: 'right', maxWidth: 45 });
        }
        currentY += 6;
      });

      doc.save(`Item_${sku}.pdf`);
      successToast(`Downloaded Item_${sku}.pdf successfully`);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      errorToast('Failed to download PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 overflow-hidden animate-in fade-in duration-150">
      
      {/* Styles specifically for Print Output */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #item-print-document, #item-print-document * {
            visibility: visible !important;
          }
          #item-print-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 20px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
        }
      `}</style>

      <div className={`bg-white rounded-3xl shadow-2xl flex flex-col w-full transition-all duration-200 overflow-hidden ${
        isFullPage ? 'fixed inset-0 rounded-none z-[210]' : 'max-w-6xl h-[92vh] max-h-[92vh]'
      }`}>
        
        {/* TOP TOOLBAR HEADER */}
        <div className="bg-white border-b border-gray-200 px-6 py-3.5 flex items-center justify-between shrink-0 select-none z-10">
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              title="Close Print Preview"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-black text-gray-900 ml-1">{isMaterialRequest ? docId : sku}</h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-medium mr-2 hidden lg:inline">Try the new Print Designer</span>

            <button
              type="button"
              onClick={() => setIsFullPage(prev => !prev)}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:bg-white text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              {isFullPage ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{isFullPage ? 'Exit Full Page' : 'Full Page'}</span>
            </button>

            {/* PDF Option */}
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:bg-white text-gray-700 text-xs font-semibold px-3.5 py-2 rounded-xl transition-all cursor-pointer shadow-2xs disabled:opacity-50"
            >
              <FileText className="w-3.5 h-3.5 text-red-500" />
              <span>{isGeneratingPdf ? 'Generating...' : 'PDF'}</span>
            </button>

            {/* Refresh Option */}
            <button
              type="button"
              onClick={() => successToast('Print view refreshed')}
              className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 hover:bg-white text-gray-700 text-xs font-semibold px-3 py-2 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            {/* Print Button Option */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold px-4.5 py-2 rounded-xl transition-all cursor-pointer shadow-md hover:shadow-lg active:scale-95"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print</span>
            </button>
          </div>
        </div>

        {/* BODY AREA (LEFT SIDEBAR CONTROLS + RIGHT PRINT DOCUMENT SHEET) */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden bg-gray-100 min-h-0">
          
          {/* LEFT SIDEBAR FORMAT CONTROLS */}
          <div className="w-full md:w-64 bg-white border-r border-gray-200 p-5 space-y-5 shrink-0 overflow-y-auto select-none">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Print Format</label>
              <select
                value={printFormat}
                onChange={(e) => setPrintFormat(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="Standard">Standard</option>
                <option value="Detailed Sheet">Detailed Sheet</option>
                <option value="Compact Label">Compact Label</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="en-GB">en-GB</option>
                <option value="en-US">en-US</option>
                <option value="fr-FR">fr-FR</option>
                <option value="es-ES">es-ES</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500">Letter Head</label>
              <select
                value={letterHead}
                onChange={(e) => setLetterHead(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
              >
                <option value="No Letterhead">No Letterhead</option>
                <option value="Aura ERP Letterhead">Aura ERP Letterhead</option>
              </select>
            </div>

            {/* Note Alert Box matching ERPNext */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-1 text-amber-800 text-xs font-medium">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <AlertCircle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Notice</span>
              </div>
              <p className="leading-relaxed">
                Footer might not be visible as Repeat Header and Footer option is disabled
              </p>
            </div>
          </div>

          {/* RIGHT PRINT DOCUMENT CANVAS SHEET */}
          <div className="flex-1 p-4 md:p-8 overflow-y-auto bg-gray-100 flex flex-col items-center">
            
            <div 
              id="item-print-document"
              ref={printAreaRef}
              className="bg-white text-gray-900 shadow-xl border border-gray-200 rounded-2xl p-8 sm:p-12 w-full max-w-3xl my-4 font-sans text-xs leading-relaxed shrink-0 min-h-max"
            >
              {isMaterialRequest ? (
                <>
                  {/* Header Title & Subtitle */}
                  <div className="text-right border-b border-gray-200 pb-4 mb-6">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">MATERIAL REQUEST</h1>
                    <p className="text-sm font-semibold text-gray-500 font-mono tracking-wide">{docId}</p>
                  </div>

                  {/* 2-Column Key Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-6 text-xs">
                    {/* Left Column */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Series:</span>
                        <span className="text-gray-900 font-mono font-bold">{mrSeries}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Purpose:</span>
                        <span className="text-gray-900 font-bold">{mrPurpose}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Required By Date:</span>
                        <span className="text-gray-900 font-medium">{mrRequiredByDate}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Department:</span>
                        <span className="text-gray-800">{mrDepartment}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Required For:</span>
                        <span className="text-gray-800">{mrRequiredFor}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Created By:</span>
                        <span className="text-gray-800">{mrCreatedBy}</span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Company:</span>
                        <span className="text-gray-900 font-bold">{mrCompany}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Transaction Date:</span>
                        <span className="text-gray-900 font-medium">{mrTransactionDate}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Approval Status:</span>
                        <span className="text-emerald-700 font-bold">{mrApprovalStatus}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Status:</span>
                        <span className="text-amber-700 font-bold">{mrStatus}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Set Target Warehouse:</span>
                        <span className="text-gray-800">{mrSetWarehouse}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Price List:</span>
                        <span className="text-gray-800">{mrPriceList}</span>
                      </div>
                    </div>
                  </div>

                  {/* Section Banner */}
                  <div className="bg-gray-100/80 rounded-xl p-3 mb-4 text-center font-bold text-gray-800 text-xs tracking-wide uppercase border border-gray-200/60">
                    PURCHASE REQUEST FOR ITEMS ({mrItemsList.length})
                  </div>

                  {/* Items Table */}
                  <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold uppercase text-[10px] tracking-wider">
                          <th className="px-3 py-2.5 w-10 text-center">Sr</th>
                          <th className="px-3 py-2.5">Item Code & Description</th>
                          <th className="px-3 py-2.5">Required By</th>
                          <th className="px-3 py-2.5 text-right">Quantity</th>
                          <th className="px-3 py-2.5 text-center">UOM</th>
                          <th className="px-3 py-2.5">Target Warehouse</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {mrItemsList.map((it: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-3 py-2 text-center text-gray-400 font-mono font-medium">{idx + 1}</td>
                            <td className="px-3 py-2 font-semibold text-gray-900">{it.itemCode || it.name || ''}</td>
                            <td className="px-3 py-2 text-gray-600 font-medium">{it.requiredByDate || mrRequiredByDate}</td>
                            <td className="px-3 py-2 text-right font-bold text-gray-900">{it.quantity || 1}</td>
                            <td className="px-3 py-2 text-center text-gray-600 font-medium">{it.uom || 'Pcs'}</td>
                            <td className="px-3 py-2 text-gray-600">{it.warehouse || mrSetWarehouse}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Footer Stamp */}
                  <div className="pt-6 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400 mt-6">
                    <span>Generated by Aura ERP</span>
                    <span>Page 1 of 1</span>
                  </div>
                </>
              ) : (
                <>
                  {/* Header Title & Subtitle */}
                  <div className="text-right border-b border-gray-200 pb-4 mb-6">
                    <h1 className="text-2xl font-black tracking-tight text-gray-900 uppercase">ITEM</h1>
                    <p className="text-sm font-semibold text-gray-500 font-mono tracking-wide">{sku}</p>
                  </div>

                  {/* 2-Column Key Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-6">
                    
                    {/* Left Column */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Series:</span>
                        <span className="text-gray-900 font-mono font-medium">{namingSeries}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Item Code:</span>
                        <span className="text-gray-900 font-bold font-mono">{sku}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Item Name:</span>
                        <span className="text-gray-900 font-bold uppercase">{itemName}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Item Group:</span>
                        <span className="text-gray-800">{itemGroup}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Part Of :</span>
                        <span className="text-gray-800">{partOf}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Sub Part Of:</span>
                        <span className="text-gray-800">{subPartOf}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Default Unit of Measure:</span>
                        <span className="text-gray-800 font-medium">{stockUom}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Withholding Tax Rate on Purchase:</span>
                        <span className="text-gray-800">{withholdingTaxPurchase}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Withholding Tax Rate on Sales:</span>
                        <span className="text-gray-800">{withholdingTaxSales}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Activity Type:</span>
                        <span className="text-gray-800">{activityType}</span>
                      </div>
                    </div>

                    {/* Right Column */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between border-b border-gray-100 py-1 gap-2">
                        <span className="font-bold text-gray-700 shrink-0">Company:</span>
                        <span className="text-gray-900 font-medium text-right max-w-[220px] break-words">{company}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Maintain Stock:</span>
                        <span className="text-emerald-700 font-bold">{maintainStock ? '✓' : '✗'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Include Item In Manufacturing:</span>
                        <span className="text-emerald-700 font-bold">{includeInManufacturing ? '✓' : '✗'}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Opening Stock:</span>
                        <span className="text-gray-900 font-bold">{openingStock}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Valuation Rate:</span>
                        <span className="text-gray-900 font-medium">₹ {Number(valuationRate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Standard Selling Rate:</span>
                        <span className="text-gray-900 font-bold">₹ {Number(standardRate).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Over Delivery/Receipt Allowance (%):</span>
                        <span className="text-gray-800">{overDeliveryAllowance}</span>
                      </div>
                      <div className="flex justify-between border-b border-gray-100 py-1">
                        <span className="font-bold text-gray-700">Over Billing Allowance (%):</span>
                        <span className="text-gray-800">{overBillingAllowance}</span>
                      </div>
                    </div>

                  </div>

                  {/* Subtitle Banner */}
                  <div className="bg-gray-50 rounded-lg p-3 font-bold text-gray-900 mb-6 border border-gray-200 uppercase tracking-wide">
                    {itemName}
                  </div>

                  {/* Additional Attributes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-6">
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Shelf Life In Days:</span>
                      <span className="text-gray-800">{shelfLife}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Weight Per Unit:</span>
                      <span className="text-gray-800">{weightPerUnit}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">End of Life:</span>
                      <span className="text-gray-800">{endOfLife}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Default Material Request Type:</span>
                      <span className="text-gray-800 font-medium">{materialRequestType}</span>
                    </div>
                  </div>

                  {/* UOM Conversions Table */}
                  <div className="mb-6">
                    <table className="w-full border-collapse border border-gray-200 text-left text-xs">
                      <thead>
                        <tr className="bg-gray-100 text-gray-700 font-bold border-b border-gray-200">
                          <th className="py-2 px-3 border-r border-gray-200 w-12">Sr</th>
                          <th className="py-2 px-3 border-r border-gray-200">UOM</th>
                          <th className="py-2 px-3 text-right">Conversion Factor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {uomsList.map((u: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="py-2 px-3 border-r border-gray-200 font-medium text-gray-500">{idx + 1}</td>
                            <td className="py-2 px-3 border-r border-gray-200 font-bold text-gray-800">{u.uom || stockUom}</td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">{u.conversion_factor || 1}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Bottom Details Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 mb-8">
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Max Sample Quantity:</span>
                      <span className="text-gray-800">{maxSampleQty}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Variant Based On:</span>
                      <span className="text-gray-800">{variantBasedOn}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">No of Months (Expense):</span>
                      <span className="text-gray-800">{monthsExp}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">No of Months (Revenue):</span>
                      <span className="text-gray-800">{monthsRev}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Minimum Order Qty:</span>
                      <span className="text-gray-800">{minOrderQty}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Lead Time in days:</span>
                      <span className="text-gray-800">{leadTimeDays}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Safety Stock:</span>
                      <span className="text-gray-800">{safetyStock}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Last Purchase Rate:</span>
                      <span className="text-gray-800">{lastPurchaseRate}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Allow Purchase:</span>
                      <span className="text-emerald-700 font-bold">{allowPurchase ? '✓' : '✗'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Grant Commission:</span>
                      <span className="text-emerald-700 font-bold">{grantCommission ? '✓' : '✗'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Allow Sales:</span>
                      <span className="text-emerald-700 font-bold">{allowSales ? '✓' : '✗'}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Country of Origin:</span>
                      <span className="text-gray-800 font-medium">{countryOfOrigin}</span>
                    </div>
                    <div className="flex justify-between border-b border-gray-100 py-1">
                      <span className="font-bold text-gray-700">Max Discount (%):</span>
                      <span className="text-gray-800">{maxDiscount}</span>
                    </div>
                  </div>

                  {/* Footer Stamp */}
                  <div className="pt-6 border-t border-gray-200 flex items-center justify-between text-[11px] text-gray-400 mt-6">
                    <span>Generated by Aura ERP</span>
                    <span>Page 1 of 1</span>
                  </div>
                </>
              )}      </div>

          </div>

        </div>

      </div>
    </div>
  );
};

