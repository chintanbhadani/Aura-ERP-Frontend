import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { motion } from 'framer-motion';
import { AnimatedNumber } from '../../components/motion/AnimatedNumber';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { 
  Package, 
  Boxes, 
  ClipboardList, 
  ClipboardCheck, 
  Activity, 
  ArrowUpRight, 
  TrendingUp, 
  AlertTriangle, 
  Plus, 
  RefreshCw,
  Layers,
  FolderTree,
  Truck,
  Ruler,
  Tags,
  ShoppingCart,
  Database,
  BarChart3,
  Building2,
  FileSpreadsheet
} from 'lucide-react';
import { 
  fetchInventory, 
  fetchMaterialRequests, 
  fetchGrns, 
  fetchStockEntries, 
  fetchBinReport,
  type BinReportItem,
  type Product 
} from '../../services/api';

const getItemString = (val: any, fallback = '-'): string => {
  if (!val) return fallback;
  if (typeof val === 'string') return val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') return val.name || val.title || val.label || val.code || val.id || fallback;
  return fallback;
};

function StockDashboardPageBase() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [binItems, setBinItems] = useState<BinReportItem[]>([]);
  const [materialRequestsCount, setMaterialRequestsCount] = useState(0);
  const [grnsCount, setGrnsCount] = useState(0);
  const [stockEntriesCount, setStockEntriesCount] = useState(0);

  const loadData = async () => {
    setLoading(true);
    try {
      const [prodData, binData, mrData, grnData, seData] = await Promise.allSettled([
        fetchInventory(),
        fetchBinReport(),
        fetchMaterialRequests(),
        fetchGrns(),
        fetchStockEntries()
      ]);

      if (prodData.status === 'fulfilled') setProducts(prodData.value || []);
      if (binData.status === 'fulfilled') setBinItems(binData.value || []);
      if (mrData.status === 'fulfilled') setMaterialRequestsCount((mrData.value || []).length);
      if (grnData.status === 'fulfilled') setGrnsCount((grnData.value || []).length);
      if (seData.status === 'fulfilled') setStockEntriesCount((seData.value || []).length);
    } catch (err) {
      console.error('Error loading stock dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Compute key stock metrics
  const totalItemsCount = products.length;
  const totalQuantity = products.reduce((acc, p) => acc + (Number(p.quantity) || 0), 0);
  const totalStockValue = products.reduce((acc, p) => {
    const qty = Number(p.quantity) || 0;
    const rate = Number(p.cost_price) || Number(p.selling_price) || 0;
    return acc + (qty * rate);
  }, 0);
  const lowStockCount = products.filter(p => (Number(p.quantity) || 0) <= 5).length;

  // Group bin items by warehouse for the chart
  const warehouseBalances = binItems.reduce((acc, item) => {
    const wh = getItemString(item.warehouse, 'Main Store');
    acc[wh] = (acc[wh] || 0) + (Number(item.actualQuantity) || 0);
    return acc;
  }, {} as Record<string, number>);

  const warehouseEntries = Object.entries(warehouseBalances);
  const maxWhQty = Math.max(...Object.values(warehouseBalances), 100);

  return (
    <DashboardLayout>
      <div className="space-y-8 p-1 sm:p-2">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 opacity-10 pointer-events-none translate-x-12 -translate-y-6">
            <Boxes className="w-96 h-96 text-white" />
          </div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-700/60 border border-emerald-500/30 text-emerald-200 text-xs font-semibold tracking-wide uppercase mb-3">
                <Boxes className="w-3.5 h-3.5 text-emerald-300" />
                <span>Stock & Inventory Management</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Stock Workspace
              </h1>
              <p className="mt-1 text-sm text-emerald-100/90 max-w-xl">
                Monitor live inventory levels, stock balance per warehouse, material requests, and stock movement reports in real time.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={loadData}
                disabled={loading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition backdrop-blur-sm border border-white/10 shadow-sm disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <Link
                to="/material-request/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-gray-950 text-xs font-bold transition shadow-lg hover:shadow-emerald-500/20"
              >
                <Plus className="w-4 h-4" />
                <span>Material Request</span>
              </Link>
              {/* <Link
                to="/stock-entry"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-emerald-900 hover:bg-emerald-50 text-xs font-bold transition shadow-lg"
              >
                <Plus className="w-4 h-4" />
                <span>+ Stock Entry</span>
              </Link> */}
            </div>
          </div>

          {/* Metric Highlights Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-emerald-700/60">
            <div>
              <p className="text-xs font-medium text-emerald-200/80">Total Skus / Items</p>
              <div className="text-xl font-bold text-white mt-1">
                <AnimatedNumber value={totalItemsCount} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-200/80">Total Stock Qty</p>
              <div className="text-xl font-bold text-white mt-1">
                <AnimatedNumber value={totalQuantity} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-200/80">Total Stock Value</p>
              <div className="text-xl font-bold text-white mt-1">
                <AnimatedNumber value={totalStockValue} prefix="₹" decimals={0} />
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-emerald-200/80">Low Stock Alert</p>
              <div className="text-xl font-bold text-amber-300 mt-1 flex items-center gap-1.5">
                {lowStockCount > 0 && <AlertTriangle className="w-4 h-4 text-amber-400 inline" />}
                <AnimatedNumber value={lowStockCount} suffix=" Items" className="text-amber-300" />
              </div>
            </div>
          </div>
        </div>

         {/* Quick Access Cards Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Quick Access</h2>
            <span className="text-xs font-semibold text-gray-400">Direct Navigation & Badges</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {/* Item Card */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/master/skus"
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-800 transition">Item</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <AnimatedNumber value={totalItemsCount} suffix=" Available" />
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 group-hover:text-emerald-600">
                  <Package className="w-5 h-5 text-gray-600 group-hover:text-emerald-600" />
                  <ArrowUpRight className="w-4 h-4 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>

            {/* Material Request Card */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/material-request"
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-amber-50/50 hover:border-amber-200 transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-amber-800 transition">Material Request</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                    <AnimatedNumber value={materialRequestsCount} suffix=" Pending" />
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 group-hover:text-amber-600">
                  <ClipboardList className="w-5 h-5 text-gray-600 group-hover:text-amber-600" />
                  <ArrowUpRight className="w-4 h-4 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>

            {/* GRN Card */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/grn"
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-teal-50/50 hover:border-teal-200 transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-teal-800 transition">GRN</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-100 text-teal-800">
                    <AnimatedNumber value={grnsCount} suffix=" Received" />
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 group-hover:text-teal-600">
                  <ClipboardCheck className="w-5 h-5 text-gray-600 group-hover:text-teal-600" />
                  <ArrowUpRight className="w-4 h-4 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>

            {/* Stock Ledger Card */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/stock-ledger"
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-purple-50/50 hover:border-purple-200 transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-purple-800 transition">Stock Ledger</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                    Audit History
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 group-hover:text-purple-600">
                  <Activity className="w-5 h-5 text-gray-600 group-hover:text-purple-600" />
                  <ArrowUpRight className="w-4 h-4 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>

            {/* Stock Balance Card */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/bin-report"
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-indigo-50/50 hover:border-indigo-200 transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-indigo-800 transition">Stock Balance</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                    Bin Report
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 group-hover:text-indigo-600">
                  <FileSpreadsheet className="w-5 h-5 text-gray-600 group-hover:text-indigo-600" />
                  <ArrowUpRight className="w-4 h-4 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>

            {/* Purchase Order Card */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/purchase-order"
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-emerald-50/50 hover:border-emerald-200 transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-emerald-800 transition">Purchase Order</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    Buying
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 group-hover:text-emerald-600">
                  <ShoppingCart className="w-5 h-5 text-gray-600 group-hover:text-emerald-600" />
                  <ArrowUpRight className="w-4 h-4 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>

            {/* Item Categories Card */}
            <motion.div whileHover={{ y: -4, transition: { duration: 0.2 } }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/master/categories"
                className="group p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-rose-50/50 hover:border-rose-200 transition-all duration-200 flex flex-col justify-between h-full"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-gray-700 group-hover:text-rose-800 transition">Item Group</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                    Category
                  </span>
                </div>
                <div className="flex items-center justify-between text-gray-400 group-hover:text-rose-600">
                  <FolderTree className="w-5 h-5 text-gray-600 group-hover:text-rose-600" />
                  <ArrowUpRight className="w-4 h-4 transition transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </div>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Top Visual Section: Warehouse Stock Chart & Stock Valuation Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Warehouse Stock Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-600" />
                  <span>Warehouse Stock Balance</span>
                </h3>
                <p className="text-xs text-gray-500">Live breakdown of items across active storage locations</p>
              </div>
              <Link to="/bin-report" className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                View Bin Report <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {warehouseEntries.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-xs text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                No warehouse data available
              </div>
            ) : (
              <div className="space-y-4 pt-2">
                {warehouseEntries.map(([whName, qty], index) => {
                  const percentage = Math.min(Math.round((qty / maxWhQty) * 100), 100);
                  const colors = [
                    'bg-emerald-500 text-emerald-700',
                    'bg-teal-500 text-teal-700',
                    'bg-blue-500 text-blue-700',
                    'bg-indigo-500 text-indigo-700',
                    'bg-purple-500 text-purple-700'
                  ];
                  const barBg = colors[index % colors.length];

                  return (
                    <div key={whName} className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-gray-800">{whName}</span>
                        <div className="text-gray-900 font-extrabold">
                          <AnimatedNumber value={qty} suffix=" Pcs" />
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          className={`h-full rounded-full ${barBg.split(' ')[0]}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(percentage, 6)}%` }}
                          transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: index * 0.08 }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Metrics Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-600" />
                <span>Stock Movement Summary</span>
              </h3>
              <p className="text-xs text-gray-500">Key metrics for current stock cycle</p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold">
                    <ClipboardCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Goods Receipt (GRN)</p>
                    <p className="text-[11px] text-gray-500">Inward items received</p>
                  </div>
                </div>
                <div className="text-sm font-extrabold text-emerald-700">
                  <AnimatedNumber value={grnsCount} suffix=" Received" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                    <ClipboardList className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Material Request</p>
                    <p className="text-[11px] text-gray-500">Pending requisitions</p>
                  </div>
                </div>
                <div className="text-sm font-extrabold text-amber-700">
                  <AnimatedNumber value={materialRequestsCount} suffix=" Pending" />
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-900">Stock Entries</p>
                    <p className="text-[11px] text-gray-500">Transfers & adjustments</p>
                  </div>
                </div>
                <div className="text-sm font-extrabold text-blue-700">
                  <AnimatedNumber value={stockEntriesCount} suffix=" Recorded" />
                </div>
              </div>
            </div>

            <Link
              to="/stock-ledger"
              className="w-full py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-800 text-xs font-bold flex items-center justify-center gap-2 border border-gray-200 transition"
            >
              <Activity className="w-4 h-4 text-emerald-600" />
              <span>Explore Stock Ledger Audit</span>
            </Link>
          </div>
        </div>

       

        {/* Masters & Reports Section (Categorized Grid) */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-6">
          <div>
            <h2 className="text-lg font-extrabold text-gray-900 tracking-tight">Masters & Reports</h2>
            <p className="text-xs text-gray-500">Categorized directory of inventory masters, transactions, and stock reports</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Items Catalogue Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <Tags className="w-4 h-4 text-emerald-600" />
                <span>Items Catalogue</span>
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-gray-700">
                <li>
                  <Link to="/master/skus" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <span>Item Master</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600" />
                  </Link>
                </li>
                <li>
                  <Link to="/master/categories" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <span>Item Group (Categories)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600" />
                  </Link>
                </li>
                <li>
                  <Link to="/master/part-of" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <span>Part Of Master</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600" />
                  </Link>
                </li>
                <li>
                  <Link to="/master/sub-part-of" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <span>Sub Part Of Master</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600" />
                  </Link>
                </li>
                <li>
                  <Link to="/master/units" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-700 transition">
                    <span>Unit of Measure (UOM)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-600" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Stock Transactions Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <Boxes className="w-4 h-4 text-blue-600" />
                <span>Stock Transactions</span>
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-gray-700">
                <li>
                  <Link to="/material-request" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
                    <span>Material Request</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                </li>
                {/* <li>
                  <Link to="/stock-entry" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
                    <span>Stock Entry</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                </li> */}
                <li>
                  <Link to="/grn" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
                    <span>Goods Receipt (GRN)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                </li>
                <li>
                  <Link to="/purchase-order" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-blue-50 hover:text-blue-700 transition">
                    <span>Purchase Order</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Stock Reports Column */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <BarChart3 className="w-4 h-4 text-purple-600" />
                <span>Stock Reports</span>
              </h3>
              <ul className="space-y-2 text-xs font-semibold text-gray-700">
                <li>
                  <Link to="/stock-ledger" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition">
                    <span>Stock Ledger</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600" />
                  </Link>
                </li>
                <li>
                  <Link to="/bin-report" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition">
                    <span>Stock Balance (Bin Report)</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600" />
                  </Link>
                </li>
                <li>
                  <Link to="/bin-report?filter=low" className="group flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-purple-50 hover:text-purple-700 transition">
                    <span>Low Stock Exception Report</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-purple-600" />
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Live Inventory Preview Table */}
        <div className="bg-white rounded-3xl p-6 sm:p-7 border border-gray-100 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-extrabold text-gray-900">Current Stock Inventory Preview</h2>
              <p className="text-xs text-gray-500">Snapshot of active inventory items in system</p>
            </div>
            <Link
              to="/master/skus"
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 self-start sm:self-auto"
            >
              View Full Product Master List <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto border border-gray-100 rounded-2xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50/80 text-gray-500 uppercase tracking-wider font-bold border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Item SKU / Code</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Quantity</th>
                  <th className="py-3 px-4">Warehouse / Location</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-800">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No inventory items found.
                    </td>
                  </tr>
                ) : (
                  products.slice(0, 8).map((prod) => {
                    const qty = Number(prod.quantity) || 0;
                    const isLow = qty <= 5;
                    const skuStr = getItemString(prod.sku || (prod as any).itemCode || (prod as any).code);
                    const nameStr = getItemString(prod.name || (prod as any).itemName);
                    const catStr = getItemString(prod.category || (prod as any).itemGroup, 'General');
                    const uomStr = getItemString((prod as any).uom || prod.unit, 'Pcs');
                    const locationStr = getItemString(prod.location || (prod as any).warehouse, 'Main Store');

                    return (
                      <tr key={prod.id || skuStr} className="hover:bg-gray-50/60 transition">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700">{skuStr}</td>
                        <td className="py-3 px-4 font-bold text-gray-900">{nameStr}</td>
                        <td className="py-3 px-4 text-gray-600">{catStr}</td>
                        <td className="py-3 px-4 font-extrabold text-gray-900">{qty} {uomStr}</td>
                        <td className="py-3 px-4 text-gray-600">{locationStr}</td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              isLow ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {isLow ? 'Low Stock' : 'In Stock'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export const StockDashboardPage = WithAuth(StockDashboardPageBase, ModuleName.INVENTORY_PRODUCTS, Permission.LIST);
export default StockDashboardPage;
