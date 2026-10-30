import React, { useState } from 'react';
import { X, Printer, Download, Building2, Check, ShieldCheck, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { successToast, errorToast } from '../helper/toast';
import { numberToIndianWords } from './PurchaseOrderPrintModal';
import { AuraLogo } from './AuraLogo';
import { getSupplierName } from '../services/api';

export interface GrnPrintData {
  id: string;
  grnNumber?: string;
  series?: string;
  postingDate?: string;
  postingTime?: string;
  supplier?: string | any;
  supplierDeliveryNote?: string;
  supplierInvoiceNumber?: string;
  efdReceipt?: string;
  company?: string;
  acceptedWarehouse?: string;
  createdBy?: string;
  status?: string;
  items?: Array<{
    itemCode: string;
    uom: string;
    acceptedQuantity: number;
    rate: number;
    amount?: number;
    wbNo?: string;
    wbSlipNo?: string;
    mine?: string;
  }>;
}

interface GrnPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  grn: GrnPrintData;
}

export const GrnPrintModal: React.FC<GrnPrintModalProps> = ({
  isOpen,
  onClose,
  grn
}) => {
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [showSignatures, setShowSignatures] = useState(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  if (!isOpen) return null;

  const companyName = grn.company || 'AURA INDUSTRIES LTD';
  const supplierName = getSupplierName(grn.supplier) || 'AURA INDUSTRIAL CONSUMABLES';
  const grnNo = grn.grnNumber || grn.id || 'GRN-2026-09-00001';
  const dateStr = grn.postingDate || '24-09-2026';
  const timeStr = grn.postingTime || '10:32:06';
  const user = grn.createdBy || 'Administrator';
  const items = grn.items || [];

  const subTotal = items.reduce((sum, i) => sum + (i.amount || ((i.acceptedQuantity || 0) * (i.rate || 0))), 0);
  const cgst = subTotal * 0.09;
  const sgst = subTotal * 0.09;
  const grandTotal = subTotal + cgst + sgst;
  const amountInWords = numberToIndianWords(grandTotal);

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      const element = document.getElementById('grn-print-sheet');
      if (!element) {
        errorToast('GRN print sheet not found');
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
      pdf.save(`${grnNo}_Goods_Receipt_Note.pdf`);

      successToast(`GRN PDF downloaded for ${grnNo}`);
      setIsGeneratingPdf(false);
    } catch (err) {
      console.error(err);
      errorToast('Failed to generate GRN PDF');
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-gray-100 rounded-2xl shadow-2xl border border-gray-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* Header Bar */}
        <div className="bg-white px-6 py-4 border-b border-gray-200 flex items-center justify-between shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Goods Receipt Note (GRN) Print Preview</h2>
              <p className="text-xs text-gray-500">Official Material Acceptance Voucher</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4 text-gray-600" />
              <span>Print GRN</span>
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

        {/* Modal Main Grid */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-gray-100/70">
          
          {/* Controls Sidebar */}
          <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-gray-200/80 shadow-sm space-y-5 print:hidden">
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 pb-2 border-b border-gray-100 flex items-center justify-between">
              <span>Print Controls</span>
              <Building2 className="w-4 h-4 text-emerald-600" />
            </h3>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-gray-700">Show Company Letterhead</span>
              <input
                type="checkbox"
                checked={showLetterhead}
                onChange={(e) => setShowLetterhead(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors cursor-pointer">
              <span className="text-xs font-semibold text-gray-700">Show Signatures & Seal</span>
              <input
                type="checkbox"
                checked={showSignatures}
                onChange={(e) => setShowSignatures(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
            </label>
          </div>

          {/* Document Sheet */}
          <div className="lg:col-span-8 flex justify-center">
            <div 
              id="grn-print-sheet" 
              className="bg-white border border-gray-300 shadow-xl rounded-xl p-8 w-full max-w-[800px] text-gray-800 text-xs font-sans print:shadow-none print:border-none print:p-0 print:m-0"
            >
              
              {/* Header Letterhead */}
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
                          Phone: +91 79 2324 5678 | Email: store@auraerp.com
                        </p>
                      </div>
                    </div>

                    <div className="text-right text-[11px]">
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-2 font-mono text-gray-700">
                        <p><span className="font-bold">GSTIN:</span> 24AAACP1234A1Z5</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Document Banner */}
              <div className="bg-emerald-800 text-white px-4 py-2.5 rounded-lg flex items-center justify-between mb-6 shadow-sm">
                <span className="font-black tracking-wider text-sm">GOODS RECEIPT NOTE (GRN)</span>
                <span className="font-mono font-bold text-xs bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-700/50">
                  {grnNo}
                </span>
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-1 text-[11px]">
                  <h4 className="font-black text-xs text-gray-900 uppercase border-b border-gray-200 pb-1 mb-1.5 text-emerald-800">
                    Supplier & Delivery Info
                  </h4>
                  <p className="font-bold text-gray-900 text-xs">{supplierName}</p>
                  <p className="text-gray-600"><span className="font-semibold text-gray-700">Delivery Note:</span> {grn.supplierDeliveryNote || '-'}</p>
                  <p className="text-gray-600"><span className="font-semibold text-gray-700">Supplier Invoice #:</span> {grn.supplierInvoiceNumber || '-'}</p>
                  <p className="text-gray-600"><span className="font-semibold text-gray-700">EFD Receipt:</span> {grn.efdReceipt || '-'}</p>
                </div>

                <div className="bg-gray-50/80 border border-gray-200 rounded-xl p-3.5 space-y-1 text-[11px]">
                  <h4 className="font-black text-xs text-gray-900 uppercase border-b border-gray-200 pb-1 mb-1.5 text-emerald-800">
                    Receipt Metadata
                  </h4>
                  <div className="grid grid-cols-2 gap-y-1">
                    <span className="font-semibold text-gray-500">Posting Date:</span>
                    <span className="font-bold text-gray-800 text-right">{dateStr}</span>

                    <span className="font-semibold text-gray-500">Posting Time:</span>
                    <span className="font-bold text-gray-800 text-right">{timeStr}</span>

                    <span className="font-semibold text-gray-500">Accepted Warehouse:</span>
                    <span className="font-bold text-gray-800 text-right">{grn.acceptedWarehouse || 'Main Store - Aura'}</span>

                    <span className="font-semibold text-gray-500">Received By:</span>
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
                      <th className="px-3 py-2 text-center w-14">UOM</th>
                      <th className="px-3 py-2 text-right w-20">Accepted Qty</th>
                      <th className="px-3 py-2 text-right w-24">Rate (₹)</th>
                      <th className="px-3 py-2 text-right w-28">Amount (₹)</th>
                      <th className="px-3 py-2 text-center w-24">W/B Slip No</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {items.map((item, idx) => {
                      const qty = item.acceptedQuantity || 0;
                      const rate = item.rate || 0;
                      const amt = item.amount || (qty * rate);
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                          <td className="px-3 py-2 text-center font-bold text-gray-500">{idx + 1}</td>
                          <td className="px-3 py-2 font-bold text-gray-900">{item.itemCode}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{item.uom || 'Pcs'}</td>
                          <td className="px-3 py-2 text-right font-bold text-emerald-800">{qty.toLocaleString()}</td>
                          <td className="px-3 py-2 text-right font-mono text-gray-800">₹{rate.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold text-gray-900">₹{amt.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="px-3 py-2 text-center font-mono text-gray-600">{item.wbSlipNo || '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Totals & Signatures */}
              <div className="grid grid-cols-12 gap-6 mb-6">
                <div className="col-span-7 bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3 text-[11px]">
                  <span className="font-black uppercase tracking-wider text-[10px] text-emerald-800 block mb-1">
                    Amount in Words (INR):
                  </span>
                  <p className="font-bold text-emerald-950 italic">{amountInWords}</p>
                </div>

                <div className="col-span-5 bg-gray-50 border border-gray-200 rounded-xl p-3.5 space-y-1.5 text-[11px]">
                  <div className="flex justify-between text-gray-600">
                    <span>Taxable Amount:</span>
                    <span className="font-mono font-semibold">₹{subTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>CGST @ 9%:</span>
                    <span className="font-mono font-semibold">₹{cgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>SGST @ 9%:</span>
                    <span className="font-mono font-semibold">₹{sgst.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="pt-2 border-t border-gray-300 flex justify-between items-center text-xs font-black text-emerald-900 bg-emerald-100/50 p-1.5 rounded-lg">
                    <span>Grand Total:</span>
                    <span className="font-mono text-sm">₹{grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Signatures */}
              {showSignatures && (
                <div className="pt-6 border-t border-gray-200 grid grid-cols-3 gap-4 text-center text-[11px] mt-8">
                  <div>
                    <div className="h-10 flex items-end justify-center font-bold text-gray-800 text-xs">
                      {user}
                    </div>
                    <div className="border-t border-gray-300 pt-1 font-bold text-gray-700 uppercase text-[10px]">
                      Store In-Charge
                    </div>
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
                      Aura QC Unit
                    </div>
                    <div className="border-t border-gray-300 pt-1 font-bold text-gray-700 uppercase text-[10px]">
                      QC / Plant Manager
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>

      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          body * {
            visibility: hidden !important;
          }
          #grn-print-sheet, #grn-print-sheet * {
            visibility: visible !important;
          }
          #grn-print-sheet {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 16px !important;
            box-shadow: none !important;
            border: none !important;
            background: white !important;
          }
          @page {
            size: A4 portrait;
            margin: 0mm;
          }
        }
      `}</style>
    </div>
  );
};
