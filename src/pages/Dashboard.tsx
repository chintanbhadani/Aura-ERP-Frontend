import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  ScanLine, 
  Plus, 
  Layers, 
  TrendingUp, 
  Activity, 
  Package, 
  AlertTriangle, 
  Boxes, 
  CheckCircle2, 
  ArrowUpRight,
  Sparkles,
  Calendar,
  Filter,
  DollarSign
} from 'lucide-react';

import { DashboardLayout } from '../layouts/DashboardLayout';
import WithAuth from '../components/WithAuth';
import { ModuleName, Permission } from '../helper/constants';
import { PillTabs, type TabOption } from '../components/motion/PillTabs';
import { AnimatedNumber } from '../components/motion/AnimatedNumber';
import { StatSparkCard } from '../components/motion/StatSparkCard';
import { RadialGauge } from '../components/motion/RadialGauge';
import { TrendChart } from '../components/motion/TrendChart';

const NAV_TABS: TabOption[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'production', label: 'Production', count: 4 },
  { id: 'stock', label: 'Stock & Batches', count: 12 },
  { id: 'sales', label: 'Sales & Orders' },
];

const CATALOG_CATEGORIES = [
  { id: 'all', label: 'All', count: 12 },
  { id: 'strap', label: 'PET Strap Rolls', count: 6 },
  { id: 'flakes', label: 'PET Flakes', count: 3 },
  { id: 'masterbatch', label: 'Masterbatch & Additives', count: 3 },
];

const RECENT_ROLLS = [
  {
    id: 'R-7729',
    name: '12mm x 0.8mm Green Embossed PET Strap',
    batch: 'Batch #B-2026-94',
    machine: 'Extrusion Line 1',
    netWeight: '25.4 kg',
    status: 'QC Passed',
    statusType: 'success',
    color: '#059669',
    category: 'strap',
  },
  {
    id: 'R-7730',
    name: '15mm x 0.9mm High-Tension Strap',
    batch: 'Batch #B-2026-95',
    machine: 'Extrusion Line 2',
    netWeight: '26.1 kg',
    status: 'In Production',
    statusType: 'info',
    color: '#0284c7',
    category: 'strap',
  },
  {
    id: 'R-7731',
    name: 'Premium Washed Green PET Flakes',
    batch: 'Lot #FLK-0841',
    machine: 'Washing & Crushing Unit',
    netWeight: '850 kg',
    status: 'Running Low',
    statusType: 'warning',
    color: '#d97706',
    category: 'flakes',
  },
  {
    id: 'R-7732',
    name: 'Green Masterbatch (Grade A)',
    batch: 'Lot #MB-301',
    machine: 'Raw Store',
    netWeight: '120 kg',
    status: 'QC Passed',
    statusType: 'success',
    color: '#059669',
    category: 'masterbatch',
  },
];

const TAB_DATA: Record<string, {
  card1: { title: string; value: number; suffix?: string; prefix?: string; badge: { text: string; trend: 'up' | 'down' | 'neutral' | 'alert' }; subtitle: string; spark: number[]; icon: React.ElementType };
  card2: { title: string; value: number; suffix?: string; prefix?: string; badge: { text: string; trend: 'up' | 'down' | 'neutral' | 'alert' }; subtitle: string; spark: number[]; icon: React.ElementType };
  card3: { title: string; value: number; suffix?: string; prefix?: string; badge: { text: string; trend: 'up' | 'down' | 'neutral' | 'alert' }; subtitle: string; spark: number[]; icon: React.ElementType };
  gauge: { value: number; title: string; subtitle: string; current: string; target: string; stats: { label: string; value: string }[] };
}> = {
  overview: {
    card1: { title: 'Units on hand', value: 4345, suffix: ' kg', badge: { text: '+3.2%', trend: 'up' }, subtitle: '12 SKUs • 3 silos', spark: [12, 14, 18, 16, 21, 24, 28], icon: Package },
    card2: { title: 'Total stock value', value: 111827, prefix: '₹', badge: { text: 'Healthy', trend: 'up' }, subtitle: 'Valued at standard cost', spark: [24, 27, 26, 31, 35, 33, 40], icon: Activity },
    card3: { title: 'Low stock items', value: 3, badge: { text: 'Reorder', trend: 'alert' }, subtitle: '2 raw materials • 1 SKU', spark: [8, 7, 6, 5, 4, 3, 3], icon: AlertTriangle },
    gauge: { value: 69.8, title: 'Monthly Production Goal', subtitle: 'Strap rolls extruded vs dispatch target', current: '16,495 kg', target: '24,500 kg', stats: [{ label: 'Orders Dispatched', value: '48' }, { label: 'Active Lines', value: '3 / 4' }] }
  },
  production: {
    card1: { title: 'Active Output', value: 5820, suffix: ' kg', badge: { text: '+8.4%', trend: 'up' }, subtitle: 'Line 1 & 2 at full capacity', spark: [15, 20, 22, 25, 28, 32, 38], icon: Layers },
    card2: { title: 'Extrusion Efficiency', value: 92, suffix: '%', badge: { text: 'Optimal', trend: 'up' }, subtitle: 'Speed: 120 m/min', spark: [85, 87, 88, 90, 89, 91, 92], icon: Activity },
    card3: { title: 'Rejection Rate', value: 1.4, suffix: '%', badge: { text: '-0.3%', trend: 'up' }, subtitle: 'Well below 2.0% limit', spark: [2.8, 2.4, 2.1, 1.9, 1.7, 1.5, 1.4], icon: AlertTriangle },
    gauge: { value: 82.5, title: 'Line Utilization', subtitle: 'Machine running uptime today', current: '20,210 kg', target: '24,500 kg', stats: [{ label: 'Completed Rolls', value: '72' }, { label: 'Avg Cycle', value: '18 min' }] }
  },
  stock: {
    card1: { title: 'Raw Material (Flakes)', value: 8420, suffix: ' kg', badge: { text: 'Adequate', trend: 'neutral' }, subtitle: 'Silo A & B capacity', spark: [10, 11, 12, 11, 13, 14, 15], icon: Boxes },
    card2: { title: 'Finished Strap Stock', value: 2160, suffix: ' rolls', badge: { text: '+12.5%', trend: 'up' }, subtitle: 'Ready for dispatch bay', spark: [1400, 1600, 1750, 1900, 2050, 2160], icon: Package },
    card3: { title: 'Pending GRN / Inward', value: 4, suffix: ' batches', badge: { text: 'Incoming', trend: 'neutral' }, subtitle: 'Arrival by 5:00 PM', spark: [2, 3, 4, 3, 5, 4, 4], icon: AlertTriangle },
    gauge: { value: 76.4, title: 'Warehouse Capacity', subtitle: 'Silo and bin space consumed', current: '8,420 kg', target: '11,000 kg', stats: [{ label: 'Silo Occupancy', value: '78%' }, { label: 'Open Bins', value: '6 / 24' }] }
  },
  sales: {
    card1: { title: 'Dispatched Orders', value: 73, suffix: ' orders', badge: { text: '+37.7%', trend: 'up' }, subtitle: 'This billing cycle', spark: [30, 42, 50, 58, 65, 73], icon: Package },
    card2: { title: 'Monthly Revenue', value: 245600, prefix: '₹', badge: { text: '+18.2%', trend: 'up' }, subtitle: 'Billed and confirmed', spark: [120, 140, 180, 210, 230, 245], icon: DollarSign },
    card3: { title: 'Avg Order Value', value: 3490, prefix: '₹', badge: { text: '+6.1%', trend: 'up' }, subtitle: 'Per client transaction', spark: [2900, 3100, 3250, 3320, 3490], icon: TrendingUp },
    gauge: { value: 91.2, title: 'Quarterly Sales Target', subtitle: 'Total revenue vs quota', current: '₹2,45,600', target: '₹2,70,000', stats: [{ label: 'Clients Active', value: '34' }, { label: 'Avg Turnaround', value: '3 Days' }] }
  }
};

function DashboardBase() {
  const navigate = useNavigate();
  const { user } = useSelector((state: any) => state.base);
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const displayName = user?.name || user?.username || user?.firstName || 'Admin';
  const role = (user?.role || 'Shift Supervisor').replace('_', ' ');

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });

  const currentTabData = TAB_DATA[activeTab] || TAB_DATA.overview;

  const filteredRolls = selectedCategory === 'all' 
    ? RECENT_ROLLS 
    : RECENT_ROLLS.filter(r => r.category === selectedCategory);

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8 font-sans max-w-7xl mx-auto space-y-6">
        
        {/* Top Floating Pill Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <PillTabs
              tabs={NAV_TABS}
              activeId={activeTab}
              onChange={setActiveTab}
              layoutId="dashboard-main-nav"
              variant="dark"
              size="md"
            />
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs font-medium text-gray-500 bg-white border border-gray-200/70 px-3 py-1.5 rounded-full shadow-2xs flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              {currentDate}
            </span>
            <button
              onClick={() => navigate('/production-orders/new')}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold shadow-sm shadow-emerald-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              New Order
            </button>
          </div>
        </div>

        {/* Animated Main Content with Tab Transitions */}
        <div className="space-y-6">
          {/* Hero Welcome Card + Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Welcome Greeting Banner */}
            <div className="lg:col-span-5 p-6 bg-white rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                    Live Plant Status
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                  Welcome back, {displayName}!
                </h1>
                <p className="text-xs sm:text-sm text-gray-500 mt-2 leading-relaxed">
                  Here's what's moving on the shop floor today —{' '}
                  <strong className="text-gray-800 font-semibold">2 orders to ship</strong> and{' '}
                  <strong className="text-gray-800 font-semibold">2 batches waiting on QA</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 mt-6 pt-4 border-t border-gray-100">
                <button
                  onClick={() => navigate('/production-orders/new')}
                  className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white px-4 py-2 rounded-full text-xs font-bold shadow-md shadow-emerald-500/25 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  New Order
                </button>
                <button
                  onClick={() => navigate('/bom/new')}
                  className="inline-flex items-center gap-2 bg-gray-100 hover:bg-gray-200 active:scale-98 text-gray-800 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4 text-gray-500" />
                  Make a Batch
                </button>
                <button
                  onClick={() => navigate('/production/weighing')}
                  className="inline-flex items-center gap-2 bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3.5 py-2 rounded-full text-xs font-semibold shadow-2xs transition-all cursor-pointer"
                >
                  <ScanLine className="w-4 h-4 text-gray-500" />
                  Scan Roll
                </button>
              </div>
            </div>

            {/* Right: 3 Animated Stat Spark Cards with CountUp */}
            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <StatSparkCard
                title={currentTabData.card1.title}
                value={currentTabData.card1.value}
                suffix={currentTabData.card1.suffix}
                prefix={currentTabData.card1.prefix}
                badge={currentTabData.card1.badge}
                subtitle={currentTabData.card1.subtitle}
                sparklineData={currentTabData.card1.spark}
                icon={currentTabData.card1.icon}
              />

              <StatSparkCard
                title={currentTabData.card2.title}
                value={currentTabData.card2.value}
                prefix={currentTabData.card2.prefix}
                suffix={currentTabData.card2.suffix}
                decimals={0}
                badge={currentTabData.card2.badge}
                subtitle={currentTabData.card2.subtitle}
                sparklineData={currentTabData.card2.spark}
                icon={currentTabData.card2.icon}
              />

              <StatSparkCard
                title={currentTabData.card3.title}
                value={currentTabData.card3.value}
                suffix={currentTabData.card3.suffix}
                prefix={currentTabData.card3.prefix}
                badge={currentTabData.card3.badge}
                subtitle={currentTabData.card3.subtitle}
                sparklineData={currentTabData.card3.spark}
                icon={currentTabData.card3.icon}
              />
            </div>
          </div>

          {/* Row 2: Interactive SVG Chart (Left) + Radial Sales/Goal Gauge (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left: Trend Chart */}
            <div className="lg:col-span-8">
              <TrendChart
                title={activeTab === 'sales' ? 'Revenue & Order Trends' : 'Inventory & Production Statistics'}
                data={[
                  { label: 'May', inVal: 2800, outVal: 2100, totalVal: 84000 },
                  { label: 'Jun', inVal: 3400, outVal: 2700, totalVal: 92000 },
                  { label: 'Jul', inVal: 4200, outVal: 3500, totalVal: 98000 },
                  { label: 'Aug', inVal: 3900, outVal: 3800, totalVal: 104000 },
                  { label: 'Sep', inVal: 4700, outVal: 3900, totalVal: 108000 },
                  { label: 'Oct', inVal: 5230, outVal: 4345, totalVal: 111827 },
                ]}
              />
            </div>

            {/* Right: Radial Gauge */}
            <div className="lg:col-span-4 flex flex-col justify-between">
              <RadialGauge
                value={currentTabData.gauge.value}
                title={currentTabData.gauge.title}
                subtitle={currentTabData.gauge.subtitle}
                currentLabel={currentTabData.gauge.current}
                targetLabel={currentTabData.gauge.target}
                extraStats={currentTabData.gauge.stats}
              />
            </div>
          </div>

          {/* Row 3: Catalog & Batch Production Grid with Filter Pills */}
          <div className="p-6 bg-white rounded-3xl border border-gray-100 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  Finished Goods & Active Batches
                </h3>
                <p className="text-xs text-gray-400">
                  Real-time status across Extrusion Lines, Silos, and Dispatch Bay
                </p>
              </div>

              {/* Filter Pills */}
              <PillTabs
                tabs={CATALOG_CATEGORIES}
                activeId={selectedCategory}
                onChange={setSelectedCategory}
                layoutId="catalog-filter-pill"
                variant="subtle"
                size="sm"
              />
            </div>

            {/* Grid of Items */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {filteredRolls.map((roll, idx) => (
                <motion.div
                  key={roll.id}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.3 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  className="p-4 bg-gray-50/70 hover:bg-white rounded-2xl border border-gray-200/70 hover:border-emerald-200 hover:shadow-lg transition-all duration-300 flex flex-col justify-between group cursor-pointer"
                  onClick={() => navigate('/bom')}
                >
                  <div>
                    {/* Top Tag & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono font-bold text-gray-500 bg-white border border-gray-200/80 px-2 py-0.5 rounded-full">
                        {roll.id}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          roll.statusType === 'success'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : roll.statusType === 'warning'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-sky-50 text-sky-700 border border-sky-200'
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {roll.status}
                      </span>
                    </div>

                    {/* Item Title */}
                    <h4 className="text-xs font-bold text-gray-900 group-hover:text-emerald-700 transition-colors line-clamp-2">
                      {roll.name}
                    </h4>
                    <p className="text-[11px] text-gray-400 mt-1">{roll.batch}</p>
                  </div>

                  {/* Bottom Specs */}
                  <div className="pt-3 mt-3 border-t border-gray-200/60 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block">Unit / Weight</span>
                      <span className="font-bold text-gray-800">{roll.netWeight}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-gray-400 block">Location</span>
                      <span className="font-semibold text-gray-600 truncate max-w-[100px] block">
                        {roll.machine}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </DashboardLayout>
  );
}

export const Dashboard = WithAuth(DashboardBase, ModuleName.DASHBOARD, Permission.VIEW_DASHBOARD);
export default Dashboard;
