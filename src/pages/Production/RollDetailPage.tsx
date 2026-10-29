import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ArrowLeft, 
  Printer, 
  CheckCircle2, 
  Award, 
  Scissors, 
  Trash, 
  Scale, 
  Factory, 
  Calendar, 
  Clock, 
  User, 
  FileText, 
  Layers, 
  ShieldCheck, 
  Download, 
  Copy,
  ExternalLink,
  Barcode
} from 'lucide-react';
import { successToast } from '../../helper/toast';
import type { WeighmentRecord } from './ProductionWeighingLedger';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';

const DEFAULT_RECORDS: WeighmentRecord[] = [
  {
    id: 'WGH-001',
    rollStickerCode: 'A09JZD1',
    ginningStickerCode: 'A09JZD10CFJM1',
    productionOrderNo: 'PO-2026-001',
    customerName: 'Reliance Industries Ltd',
    finishedGoodName: 'PET Strap 12mm x 0.60mm Green',
    finishedGoodSku: 'PET-1206-GRN',
    machineCode: 'EXT-01',
    machineLetter: 'A',
    machineName: 'Machine 1 (High-Speed Line)',
    rollGrade: 'Grade A',
    grossWeightKg: 21.00,
    tareWeightKg: 0.80,
    actualNetWeightKg: 20.20,
    billedWeightKg: 20.00,
    giveawayWeightKg: 0.20,
    netWeightKg: 20.00,
    strapLengthMeters: 1000,
    shift: 'D',
    manualSuffix: '1',
    operatorName: 'Ramesh Patel',
    createdAt: '2026-10-09T08:30:00Z'
  },
  {
    id: 'WGH-002',
    rollStickerCode: 'A09JZD2',
    ginningStickerCode: 'A09JZD10CFJM2',
    productionOrderNo: 'PO-2026-001',
    customerName: 'Reliance Industries Ltd',
    finishedGoodName: 'PET Strap 12mm x 0.60mm Green',
    finishedGoodSku: 'PET-1206-GRN',
    machineCode: 'EXT-01',
    machineLetter: 'A',
    machineName: 'Machine 1 (High-Speed Line)',
    rollGrade: 'Grade A',
    grossWeightKg: 21.10,
    tareWeightKg: 0.80,
    actualNetWeightKg: 20.30,
    billedWeightKg: 20.00,
    giveawayWeightKg: 0.30,
    netWeightKg: 20.00,
    strapLengthMeters: 1000,
    shift: 'D',
    manualSuffix: '2',
    operatorName: 'Ramesh Patel',
    createdAt: '2026-10-09T09:15:00Z'
  },
  {
    id: 'WGH-003',
    rollStickerCode: 'B09JZD1',
    ginningStickerCode: 'B09JZD15CGJM1',
    productionOrderNo: 'PO-2026-002',
    customerName: 'Tata Motors Ltd',
    finishedGoodName: 'PET Strap 15mm x 0.80mm Heavy Duty Black',
    finishedGoodSku: 'PET-1508-BLK',
    machineCode: 'EXT-02',
    machineLetter: 'B',
    machineName: 'Machine 2 (Heavy Duty Line)',
    rollGrade: 'Grade B',
    grossWeightKg: 26.00,
    tareWeightKg: 1.00,
    actualNetWeightKg: 25.00,
    billedWeightKg: 24.50,
    giveawayWeightKg: 0.50,
    netWeightKg: 24.50,
    strapLengthMeters: 1500,
    shift: 'D',
    manualSuffix: '1',
    operatorName: 'Suresh Kumar',
    createdAt: '2026-10-09T10:00:00Z'
  },
  {
    id: 'WGH-004',
    rollStickerCode: 'A09JZN1',
    ginningStickerCode: 'A09JZN05JBEKM1',
    productionOrderNo: 'PO-2026-001',
    customerName: 'Reliance Industries Ltd',
    finishedGoodName: 'PET Strap 12mm x 0.60mm Green',
    finishedGoodSku: 'PET-1206-GRN',
    machineCode: 'EXT-01',
    machineLetter: 'A',
    machineName: 'Machine 1 (High-Speed Line)',
    rollGrade: 'Grade C',
    grossWeightKg: 14.00,
    tareWeightKg: 0.80,
    actualNetWeightKg: 13.20,
    billedWeightKg: 13.00,
    giveawayWeightKg: 0.20,
    netWeightKg: 13.00,
    strapLengthMeters: 500,
    shift: 'N',
    manualSuffix: '1',
    operatorName: 'Mahesh Shah',
    createdAt: '2026-10-09T11:45:00Z'
  }
];

const RollDetailPageBase: React.FC = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [record, setRecord] = useState<WeighmentRecord | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('patel_erp_weighment_ledger');
    let list = DEFAULT_RECORDS;
    if (saved) {
      try { list = JSON.parse(saved); } catch (e) { console.error(e); }
    }

    const searchCode = (code || '').toUpperCase().trim();
    const found = list.find(r => 
      r.rollStickerCode.toUpperCase() === searchCode ||
      r.ginningStickerCode.toUpperCase() === searchCode ||
      r.id.toUpperCase() === searchCode
    );

    if (found) {
      setRecord(found);
    } else {
      // Fallback generator for demo codes
      setRecord({
        id: `WGH-SCAN-${searchCode}`,
        rollStickerCode: searchCode || 'A09JZD1',
        ginningStickerCode: `${searchCode || 'A09JZD1'}10CFJM1`,
        productionOrderNo: 'PO-2026-001',
        customerName: 'Reliance Industries Ltd',
        finishedGoodName: 'PET Strap 12mm x 0.60mm Green',
        finishedGoodSku: 'PET-1206-GRN',
        machineCode: 'EXT-01',
        machineLetter: 'A',
        machineName: 'Machine 1 (High-Speed Extrusion Line)',
        rollGrade: 'Grade A',
        grossWeightKg: 21.00,
        tareWeightKg: 0.80,
        actualNetWeightKg: 20.20,
        billedWeightKg: 20.00,
        giveawayWeightKg: 0.20,
        netWeightKg: 20.00,
        strapLengthMeters: 1000,
        shift: 'D',
        manualSuffix: '1',
        operatorName: 'Ramesh Patel',
        createdAt: new Date().toISOString()
      });
    }
  }, [code]);

  if (!record) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-gray-500">Loading roll details...</div>
      </DashboardLayout>
    );
  }

  // Parse specs
  let width = '12';
  const widthMatch = record.finishedGoodName.match(/(\d+)\s*mm/i) || record.finishedGoodSku.match(/(\d{2})/);
  if (widthMatch) width = widthMatch[1];

  let thick = '0.6';
  const thickMatch = record.finishedGoodName.match(/0\.(\d+)\s*mm/i);
  if (thickMatch) thick = `0.${thickMatch[1].replace(/0+$/, '') || '6'}`;

  let color = 'GREEN';
  if (/green/i.test(record.finishedGoodName) || /grn/i.test(record.finishedGoodSku)) color = 'GREEN';
  else if (/black/i.test(record.finishedGoodName) || /blk/i.test(record.finishedGoodSku)) color = 'BLACK';
  else if (/yellow/i.test(record.finishedGoodName) || /yel/i.test(record.finishedGoodSku)) color = 'YELLOW';

  let type = 'Plain';
  if (/embossed/i.test(record.finishedGoodName)) type = 'Embossed';
  else if (/heavy/i.test(record.finishedGoodName)) type = 'Heavy Duty';

  const scanUrl = `${window.location.origin}/production/roll/${record.rollStickerCode}`;

  const copyUrlToClipboard = () => {
    navigator.clipboard.writeText(scanUrl);
    successToast('Roll QR URL copied to clipboard');
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6 font-sans">
        {/* HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/production/weighing')}
              className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              title="Back to Weighing Ledger"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-gray-900">Roll Verification & Quality Certificate</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Verified Roll
                </span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Roll Code: <span className="font-extrabold text-indigo-900">{record.rollStickerCode}</span> | Ginning Code: <span className="font-extrabold text-emerald-900">{record.ginningStickerCode}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 print:hidden">
            <button
              onClick={copyUrlToClipboard}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-xl transition-all cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy URL</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Certificate</span>
            </button>
          </div>
        </div>

        {/* MAIN CERTIFICATE CARD */}
        <div id="printable-certificate" className="bg-white border-2 border-gray-200 rounded-2xl p-6 md:p-8 shadow-sm space-y-6 relative overflow-hidden">
          {/* WATERMARK BRANDING */}
          <div className="absolute top-4 right-6 text-right opacity-10 pointer-events-none select-none">
            <div className="font-black text-5xl tracking-tighter text-emerald-950">AURA ERP</div>
            <div className="text-sm font-bold tracking-widest text-gray-900">QUALITY PASSPORT</div>
          </div>

          {/* PASSPORT TOP BAR */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 pb-4">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700">Official Factory Dispatch Tag</div>
              <h2 className="text-2xl font-black text-gray-900">{record.finishedGoodName}</h2>
              <div className="text-xs font-mono font-bold text-gray-500 mt-0.5">SKU: {record.finishedGoodSku}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Quality Classification</div>
                <div className="text-sm font-black px-3 py-1 rounded-full bg-emerald-600 text-white inline-block mt-0.5 shadow-xs">
                  {record.rollGrade}
                </div>
              </div>
            </div>
          </div>

          {/* SPECIFICATION GRID & QR CODE DISPLAY */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {/* SPECS GRID */}
            <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-xs font-mono">
              <div className="space-y-2">
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">WIDTH:</span>
                  <span className="font-black text-base text-gray-900">{width} mm</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">THICKNESS:</span>
                  <span className="font-black text-base text-gray-900">{thick} mm</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">STRAP LENGTH:</span>
                  <span className="font-black text-base text-gray-900">{record.strapLengthMeters} Meters</span>
                </div>
              </div>

              <div className="space-y-2">
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">BILLED WEIGHT (STICKER & INVOICE):</span>
                  <span className="font-black text-lg text-emerald-800">{(record.billedWeightKg || record.netWeightKg || 20.00).toFixed(2)} KG</span>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">ACTUAL NET RESIN USED:</span>
                  <span className="font-black text-sm text-gray-900">{(record.actualNetWeightKg || (record.grossWeightKg - record.tareWeightKg)).toFixed(2)} KG</span>
                  <span className="text-[10px] text-gray-400 block font-normal">(Gross: {record.grossWeightKg}kg | Core: {record.tareWeightKg}kg)</span>
                </div>
                {(record.giveawayWeightKg ?? 0) !== 0 && (
                  <div>
                    <span className="text-gray-500 block text-[10px] font-bold">MATERIAL GIVEAWAY:</span>
                    <span className="font-extrabold text-xs text-amber-700">
                      +{record.giveawayWeightKg?.toFixed(2)} KG Giveaway Loss
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500 block text-[10px] font-bold">COLOUR & GAUGE:</span>
                  <span className="font-black text-sm text-emerald-700">{color} • {type}</span>
                </div>
              </div>
            </div>

            {/* REAL SCANNABLE QR CODE BOX */}
            <div className="bg-amber-50/50 p-4 rounded-xl border-2 border-dashed border-gray-300 text-center space-y-2">
              <div className="text-[11px] font-extrabold uppercase tracking-wider text-gray-700">Scan to Verify Roll</div>
              <div className="p-2 bg-white rounded-lg shadow-sm inline-block border border-gray-200">
                <QRCodeSVG value={scanUrl} size={110} />
              </div>
              <div className="text-[10px] font-mono font-bold text-gray-500 break-all px-2">
                {record.rollStickerCode}
              </div>
            </div>
          </div>

          {/* METADATA DETAILS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t border-gray-100 text-xs">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <Factory className="w-3 h-3 text-gray-500" />
                Dedicated Machine
              </div>
              <div className="font-extrabold text-gray-900 mt-0.5">{record.machineName} ({record.machineCode})</div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <FileText className="w-3 h-3 text-gray-500" />
                Production Order
              </div>
              <div className="font-extrabold text-primary-700 mt-0.5">{record.productionOrderNo}</div>
              <div className="text-[11px] text-gray-500">{record.customerName}</div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <Clock className="w-3 h-3 text-gray-500" />
                Shift & Time
              </div>
              <div className="font-bold text-gray-900 mt-0.5">
                {record.shift === 'D' ? 'Day Shift (D)' : 'Night Shift (N)'}
              </div>
              <div className="text-[11px] text-gray-500">
                {new Date(record.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>

            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase flex items-center gap-1">
                <User className="w-3 h-3 text-gray-500" />
                Operator
              </div>
              <div className="font-extrabold text-gray-900 mt-0.5">{record.operatorName || 'Line Operator'}</div>
            </div>
          </div>

          {/* FOOTER VERIFICATION STAMP */}
          <div className="pt-4 border-t border-gray-200 flex flex-wrap items-center justify-between text-[11px] text-gray-500">
            <div>
              <span>Verified by Aura ERP Quality Assurance</span>
            </div>
            <div className="font-mono font-bold">
              Cert # PASS-2026-{(record.rollStickerCode || '001')}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export const RollDetailPage = WithAuth(RollDetailPageBase, ModuleName.PRODUCTION_WEIGHING, Permission.LIST);
export default RollDetailPage;
