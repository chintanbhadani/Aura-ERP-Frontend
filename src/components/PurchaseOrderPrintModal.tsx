import React, { useState } from 'react';
import { X, Printer, Download, Building2, Check, ShieldCheck, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { successToast, errorToast } from '../helper/toast';
import { AuraLogo } from './AuraLogo';

export interface PurchaseOrderItem {
  id?: string;
  itemCode: string;
  description?: string;
  hsnSac?: string;
  requiredByDate?: string;
  itemGroup?: string;
  quantity: number;
  uom: string;
  rate: number;
  amount?: number;
}

export interface PurchaseOrderData {
  id: string;
  series?: string;
  company?: string;
  companyGstin?: string;
  supplier?: string;
  supplierGstin?: string;
  supplierAddress?: string;
  transactionDate?: string;
  requiredByDate?: string;
  paymentTerms?: string;
  purchaseType?: string;
  currency?: string;
  items?: PurchaseOrderItem[];
  setWarehouse?: string;
  tin?: string;
  vrn?: string;
  pfiNo?: string;
  createdBy?: string;
  user?: string;
}

interface PurchaseOrderPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: PurchaseOrderData;
}

// Convert numbers to Indian Rupees words format
export const numberToIndianWords = (num: number): string => {
  if (!num || isNaN(num) || num === 0) return 'Rupees Zero Only';

  const a = [
    '', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ',
    'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '
  ];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const inWords = (n: number): string => {
    let str = '';
    if (n > 19) {
      str += b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : ' ');
    } else {
      str += a[n];
    }
    return str;
  };

  let integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  let words = '';

  if (Math.floor(integerPart / 10000000) > 0) {
    words += inWords(Math.floor(integerPart / 10000000)) + 'Crore ';
    integerPart %= 10000000;
  }
  if (Math.floor(integerPart / 100000) > 0) {
    words += inWords(Math.floor(integerPart / 100000)) + 'Lakh ';
    integerPart %= 100000;
  }
  if (Math.floor(integerPart / 1000) > 0) {
    words += inWords(Math.floor(integerPart / 1000)) + 'Thousand ';
    integerPart %= 1000;
  }
  if (Math.floor(integerPart / 100) > 0) {
    words += inWords(Math.floor(integerPart / 100)) + 'Hundred ';
    integerPart %= 100;
  }
  if (integerPart > 0) {
    words += inWords(integerPart);
  }

  let result = 'Rupees ' + words.trim();
  if (decimalPart > 0) {
    result += ' and ' + inWords(decimalPart).trim() + ' Paise';
  }
  result += ' Only';

  return result;
};

export const PurchaseOrderPrintModal: React.FC<PurchaseOrderPrintModalProps> = ({
  isOpen,
  onClose,
  order
}) => {
  // Sidebar print configurations
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [taxMode, setTaxMode] = useState<'INTRASTATE' | 'INTERSTATE' | 'NONE'>('INTRASTATE');
  const [taxRate, setTaxRate] = useState<number>(18); // Default 18% GST (9% CGST + 9% SGST or 18% IGST)
  const [companyGstin, setCompanyGstin] = useState(order.companyGstin || '24AAACP1234A1Z5');
  const [supplierGstin, setSupplierGstin] = useState(order.supplierGstin || '24AABCA5678B1Z2');
  const [showAmountInWords, setShowAmountInWords] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [showTerms, setShowTerms] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  // Order Details
  const companyName = order.company || 'AURA INDUSTRIES LTD';
  const supplierName = order.supplier || 'AURA INDUSTRIAL CONSUMABLES';
  const poId = order.id || 'PO-2026-09-00002';
  const dateStr = order.transactionDate || '22-09-2026';
  const reqDateStr = order.requiredByDate || '28-09-2026';
  const paymentTerms = order.paymentTerms || 'Credit (30 Days)';
  const user = order.createdBy || order.user || 'Administrator';
  const items = order.items || [];

  // Financial calculations
  const subTotal = items.reduce((sum, i) => sum + (i.amount || ((i.quantity || 0) * (i.rate || 0))), 0);
  
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;
  let totalTax = 0;

  if (taxMode === 'INTRASTATE') {
    const halfRate = taxRate / 2;
    cgstAmount = (subTotal * halfRate) / 100;
    sgstAmount = (subTotal * halfRate) / 100;
    totalTax = cgstAmount + sgstAmount;
  } else if (taxMode === 'INTERSTATE') {
    igstAmount = (subTotal * taxRate) / 100;
    totalTax = igstAmount;
  }

  const grandTotal = subTotal + totalTax;
  const amountInWords = numberToIndianWords(grandTotal);

  // Default HSN code fallback if not provided
  const getHsnCode = (item: PurchaseOrderItem, idx: number) => {
    if (item.hsnSac) return item.hsnSac;
    const group = (item.itemGroup || '').toUpperCase();
    if (group.includes('TOOL')) return '8466';
    if (group.includes('CHEMICAL') || group.includes('HSE')) return '2901';
    if (group.includes('RAW') || group.includes('PACK')) return '3920';
    return `392${(idx % 9) + 1}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const element = document.getElementById('po-print-sheet');
      if (!element) {
        errorToast('Print document sheet not found');
        setIsGeneratingPdf(false);
        return;
      }

      const canvas = await html2canvas(element, {
        scale: 2.5,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.98);
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, Math.min(imgHeight, pdfHeight));
      pdf.save(`${poId}_Purchase_Order.pdf`);

      successToast(`Purchase Order PDF downloaded for ${poId}`);
      setIsGeneratingPdf(false);
    } catch (err) {
      console.error(err);
      errorToast('Failed to generate Purchase Order PDF');
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-gray-100 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Top Header Bar */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Purchase Order Print & PDF Generator</h2>
              <p className="text-xs text-gray-500">GST Invoice & Order Document for Indian Business Customers</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Print Document</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all ml-2 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content: Controls + Sheet View */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-100/70">
          
          {/* Controls Sidebar (Left Column) */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-5 print:hidden">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Document Settings</span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </h3>

            {/* Letterhead Toggle */}
            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-gray-700">Show Company Letterhead</span>
              <input
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            {/* GST Tax Mode */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">GST Tax Structure</label>
              <select
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value as any)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500 cursor-pointer"
              >
                <option value="INTRASTATE">Intrastate GST (CGST 9% + SGST 9%)</option>
                <option value="INTERSTATE">Interstate GST (IGST 18%)</option>
                <option value="NONE">Exempted / Zero Tax (0%)</option>
              </select>
            </div>

            {/* Tax Rate Percentage */}
            {taxMode !== 'NONE' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Total GST Rate (%)</label>
                <select
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value={18}>18% GST (Standard Industrial Rate)</option>
                  <option value={12}>12% GST</option>
                  <option value={5}>5% GST</option>
                  <option value={28}>28% GST</option>
                </select>
              </div>
            )}

            {/* GSTIN Inputs */}
            <div className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Company GSTIN (Buyer)</label>
                <input
                  type="text"
                  value={companyGstin}
                  onChange={(e) => setCompanyGstin(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-gray-800 outline-none focus:border-emerald-500"
                  placeholder="24AAACP1234A1Z5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Supplier GSTIN (Vendor)</label>
                <input
                  type="text"
                  value={supplierGstin}
                  onChange={(e) => setSupplierGstin(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-semibold text-gray-800 outline-none focus:border-emerald-500"
                  placeholder="24AABCA5678B1Z2"
                />
              </div>
            </div>

            {/* Option Checkboxes */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                <span>Print Amount in Words</span>
                <input
                  type="checkbox"
                  checked={showAmountInWords}
                  onChange={(e) => setShowAmountInWords(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                <span>Compact Item Table</span>
                <input
                  type="checkbox"
                  checked={compactMode}
                  onChange={(e) => setCompactMode(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                <span>Print Terms & Conditions</span>
                <input
                  type="checkbox"
                  checked={showTerms}
                  onChange={(e) => setShowTerms(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>

              <label className="flex items-center justify-between text-xs font-medium text-gray-700 cursor-pointer">
                <span>Print Stamp & Signatures</span>
                <input
                  type="checkbox"
                  checked={showSignatures}
                  onChange={(e) => setShowSignatures(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
              </label>
            </div>
          </div>

          {/* Document Preview Sheet (Right Column) */}
          <div className="lg:col-span-8 flex justify-center">
            <div 
              id="po-print-sheet" 
              className="bg-white border border-gray-300 shadow-xl rounded-xl p-8 w-full max-w-[800px] text-gray-800 text-xs font-sans print:shadow-none print:border-none print:p-0 print:m-0"
            >
              
              {/* Letterhead Header */}
              {showLetterhead && (
                <div className="border-b border-gray-200 pb-5 mb-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <AuraLogo variant="prism" size={44} showText={false} />
                      <div>
                        <h1 className="text-base font-black text-gray-900 tracking-tight">{companyName}</h1>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          Plot No. 12, GIDC Phase III, Chhatral Industrial Estate, Dist. Gandhinagar, Gujarat - 382729
                        </p>
                        <p className="text-[11px] text-gray-500 leading-tight">
                          Phone: +91 79 2324 5678 | Email: procurement@auraerp.com | Website: www.auraerp.com
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px]">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-gray-700">
                        <p><span className="font-bold">GSTIN:</span> {companyGstin}</p>
                        <p><span className="font-bold">PAN:</span> AAACP1234A</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Banner */}
              <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-lg flex items-center justify-between mb-6 shadow-sm">
                <span className="font-black tracking-wider text-sm">PURCHASE ORDER</span>
                <span className="font-mono font-bold text-xs bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-700/50">
                  {poId}
                </span>
              </div>

              {/* Vendor & Order Details Grid */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-1 text-[11px]">
                  <h4 className="font-black text-xs text-gray-900 uppercase border-b border-gray-200 pb-1 mb-1.5 text-emerald-800">
                    Supplier Details (Vendor)
                  </h4>
                  <p className="font-bold text-gray-900 text-xs">{supplierName}</p>
                  <p className="text-gray-600 font-mono"><span className="font-semibold text-gray-700">GSTIN:</span> {supplierGstin}</p>
                  <p className="text-gray-600">Address: 108-149 GIDC Estate, Vatva, Ahmedabad, Gujarat - 380015</p>
                  <p className="text-gray-600">State: Gujarat (Code: 24)</p>

                  <div className="pt-2 border-t border-gray-200/80 mt-2">
                    <p className="font-bold text-gray-800">Deliver To:</p>
                    <p className="text-gray-600">{companyName} - Main Store</p>
                  </div>
                </div>

                <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-1 text-[11px]">
                  <h4 className="font-black text-xs text-gray-900 uppercase border-b border-gray-200 pb-1 mb-1.5 text-emerald-800">
                    Order Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1">
                    <span className="font-semibold text-gray-500">Order Date:</span>
                    <span className="font-bold text-gray-800 text-right">{dateStr}</span>

                    <span className="font-semibold text-gray-500">Required By:</span>
                    <span className="font-bold text-gray-800 text-right">{reqDateStr}</span>

                    <span className="font-semibold text-gray-500">Payment Terms:</span>
                    <span className="font-bold text-gray-800 text-right">{paymentTerms}</span>

                    <span className="font-semibold text-gray-500">Purchase Type:</span>
                    <span className="font-bold text-gray-800 text-right">{taxMode === 'INTERSTATE' ? 'Interstate (IGST)' : 'Local (Intrastate)'}</span>

                    <span className="font-semibold text-gray-500">Prepared By:</span>
                    <span className="font-bold text-gray-800 text-right">{user}</span>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mb-6">
                <table className="w-full text-[11px]">
                  <thead className="bg-emerald-800 text-white font-bold uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="px-3 py-2 text-center w-8">Sr.</th>
                      <th className="px-3 py-2 text-left">Description of Goods</th>
                      <th className="px-3 py-2 text-center w-20">HSN/SAC</th>
                      <th className="px-3 py-2 text-right w-16">Qty</th>
                      <th className="px-3 py-2 text-center w-14">UOM</th>
                      <th className="px-3 py-2 text-right w-24">Rate (₹)</th>
                      <th className="px-3 py-2 text-right w-28">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, idx) => {
                      const hsn = getHsnCode(item, idx);
                      const qty = item.quantity || 0;
                      const rate = item.rate || 0;
                      const amt = item.amount || (qty * rate);
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">
                            {item.itemCode}
                            {item.description && <p className="font-normal text-[10px] text-gray-500">{item.description}</p>}
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-gray-600">{hsn}</td>
                          <td className="px-3 py-2 text-right font-semibold text-gray-800">{qty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.uom || 'Pcs'}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-800">₹{rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">₹{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Tax Summary & Breakdown */}
              <div className="grid grid-cols-12 gap-6 mb-6">
                
                {/* Left: Amount in Words */}
                <div className="col-span-7 flex flex-col justify-between">
                  {showAmountInWords && (
                    <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-[11px] mb-3">
                      <span className="font-black uppercase tracking-wider text-[10px] text-emerald-800 block mb-1">
                        Amount in Words (INR):
                      </span>
                      <p className="font-bold text-emerald-950 italic">{amountInWords}</p>
                    </div>
                  )}

                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-[10px] text-gray-500 space-y-1">
                    <p><span className="font-bold text-gray-700">Bank Name:</span> HDFC Bank Ltd - Commercial Branch</p>
                    <p><span className="font-bold text-gray-700">A/C No:</span> 50200012345678 | <span className="font-bold text-gray-700">IFSC:</span> HDFC0001234</p>
                  </div>
                </div>

                {/* Right: Calculations */}
                <div className="col-span-5 bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-2 text-[11px]">
                  <div className="flex justify-between text-gray-600">
                    <span>Sub Total (Taxable):</span>
                    <span className="font-mono font-semibold text-gray-900">₹{subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>

                  {taxMode === 'INTRASTATE' && (
                    <>
                      <div className="flex justify-between text-gray-600">
                        <span>CGST @ {(taxRate / 2)}%:</span>
                        <span className="font-mono font-semibold text-gray-900">₹{cgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between text-gray-600">
                        <span>SGST @ {(taxRate / 2)}%:</span>
                        <span className="font-mono font-semibold text-gray-900">₹{sgstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    </>
                  )}

                  {taxMode === 'INTERSTATE' && (
                    <div className="flex justify-between text-gray-600">
                      <span>IGST @ {taxRate}%:</span>
                      <span className="font-mono font-semibold text-gray-900">₹{igstAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t-2 border-gray-300 flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 p-1.5 rounded-lg">
                    <span>Grand Total:</span>
                    <span className="font-mono text-sm">₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Terms and Conditions */}
              {showTerms && (
                <div className="border-t border-gray-200 pt-4 mb-6 text-[10px] text-gray-600">
                  <h5 className="font-black text-gray-900 uppercase tracking-wider mb-1.5 text-xs">Terms and Conditions:</h5>
                  <ol className="list-decimal list-inside space-y-0.5 pl-1 leading-relaxed">
                    <li>Prices are inclusive of GST taxes as specified above.</li>
                    <li>Delivery immediately to Transporter / Plant Warehouse as agreed.</li>
                    <li>Tax Invoice & E-Way Bill must accompany all goods delivered.</li>
                    <li>Payment terms as agreed per commercial contract.</li>
                    <li>Goods must conform strictly to specified engineering standards & quality tolerances.</li>
                    <li>The Buyer reserves the right to reject/cancel orders for non-conforming items.</li>
                  </ol>
                </div>
              )}

              {/* Stamp & Signatures */}
              {showSignatures && (
                <div className="pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center text-[11px] mt-8">
                  <div>
                    <div className="h-10 flex items-end justify-center font-script text-emerald-800 font-bold text-sm italic">
                      {user}
                    </div>
                    <div className="border-t border-gray-300 pt-1 font-bold text-gray-700 uppercase text-[10px]">
                      Prepared By
                    </div>
                    <p className="text-[9px] text-gray-400">{user}</p>
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="w-12 h-12 rounded-full border-2 border-dashed border-emerald-700/60 flex items-center justify-center text-[9px] font-bold text-emerald-800 uppercase tracking-tighter text-center leading-none p-1">
                      Aura ERP Seal
                    </div>
                    <div className="border-t border-gray-300 pt-1 font-bold text-gray-700 uppercase text-[10px] w-full mt-1">
                      Official Stamp
                    </div>
                  </div>

                  <div>
                    <div className="h-10 flex items-end justify-center font-bold text-gray-800 text-xs">
                      Aura Industries
                    </div>
                    <div className="border-t border-gray-300 pt-1 font-bold text-gray-700 uppercase text-[10px]">
                      Authorized Signatory
                    </div>
                    <p className="text-[9px] text-gray-400">Aura Industries Ltd</p>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      {/* Print CSS Fixes for exact color rendering and page isolation */}
      <style>{`
        @media print {
          /* Force exact background colors and graphics in browser print */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          /* Hide backdrop and UI elements */
          body * {
            visibility: hidden !important;
          }
          #po-print-sheet, #po-print-sheet * {
            visibility: visible !important;
          }
          #po-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
};
