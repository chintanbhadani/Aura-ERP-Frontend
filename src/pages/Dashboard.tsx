import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { 
  fetchInventory, 
  fetchCategories, 
  fetchSuppliers, 
  fetchCustomers, 
  type Product,
  type Category,
  type Supplier,
  type Customer
} from '../services/api';
import { 
  LayoutDashboard, 
  Boxes, 
  Tags, 
  FolderTree, 
  Layers, 
  Truck, 
  Users, 
  Ruler, 
  Factory, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  RefreshCw, 
  ArrowUpRight, 
  CheckCircle2, 
  Clock, 
  ArrowRight,
  ShieldCheck,
  Search,
  ExternalLink,
  Coins,
  FileText
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useSelector((state: any) => state.base);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tableSearch, setTableSearch] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setRefreshing(true);
      const [prodData, catData, supData, custData] = await Promise.allSettled([
        fetchInventory(),
        fetchCategories(),
        fetchSuppliers(),
        fetchCustomers()
      ]);

      if (prodData.status === 'fulfilled') setProducts(prodData.value || []);
      if (catData.status === 'fulfilled') setCategories(catData.value || []);
      if (supData.status === 'fulfilled') setSuppliers(supData.value || []);
      if (custData.status === 'fulfilled') setCustomers(custData.value || []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Metric Computations
  const totalItemsCount = products.length;
  const totalStockQuantity = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const totalValuation = products.reduce((sum, p) => {
    const qty = Number(p.quantity) || 0;
    const price = Number((p as any).wacPrice || p.cost_price || 0);
    return sum + (qty * price);
  }, 0);
  const lowStockItems = products.filter(p => (Number(p.quantity) || 0) <= (Number(p.min_stock) || 0));
  const activeSuppliersCount = suppliers.length;
  const activeCustomersCount = customers.length;

  const filteredRecentProducts = products.filter(p => {
    if (!tableSearch) return true;
    const q = tableSearch.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.sku?.toLowerCase().includes(q) ||
      p.category?.name?.toLowerCase().includes(q)
    );
  }).slice(0, 8);

  const modules = [
    {
      title: 'Item Master',
      count: `${totalItemsCount} Items`,
      desc: 'All registered SKUs, specifications & live inventory balances',
      href: '/master/skus',
      icon: Tags,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
      iconBg: 'bg-emerald-600 text-white',
    },
    {
      title: 'Item Group',
      count: `${categories.length} Categories`,
      desc: 'Hierarchical product categorization and material groupings',
      href: '/master/categories',
      icon: FolderTree,
      color: 'bg-blue-50 text-blue-700 border-blue-100',
      iconBg: 'bg-blue-600 text-white',
    },
    {
      title: 'Part Of Master',
      count: 'Components',
      desc: 'Assembly classification, core parts and packaging groupings',
      href: '/master/part-of',
      icon: Layers,
      color: 'bg-purple-50 text-purple-700 border-purple-100',
      iconBg: 'bg-purple-600 text-white',
    },
    {
      title: 'Suppliers & Vendors',
      count: `${activeSuppliersCount} Suppliers`,
      desc: 'Procurement partners, contacts and purchase order history',
      href: '/master/suppliers',
      icon: Truck,
      color: 'bg-amber-50 text-amber-700 border-amber-100',
      iconBg: 'bg-amber-600 text-white',
    },
    {
      title: 'Customers & Clients',
      count: `${activeCustomersCount} Clients`,
      desc: 'Client directory, billing profiles and accounts receivable',
      href: '/master/customers',
      icon: Users,
      color: 'bg-teal-50 text-teal-700 border-teal-100',
      iconBg: 'bg-teal-600 text-white',
    },
    {
      title: 'Invoices & Sales',
      count: 'Sales Ledger',
      desc: 'GST tax invoices, payment tracking and revenue summaries',
      href: '/invoices',
      icon: FileText,
      color: 'bg-indigo-50 text-indigo-700 border-indigo-100',
      iconBg: 'bg-indigo-600 text-white',
    },
  ];

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Top Header Banner */}
        <div className="bg-white rounded-xl border border-gray-200/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#007A5A]">
              <LayoutDashboard className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Enterprise Dashboard</h1>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Live
                </span>
              </div>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Welcome back, <span className="font-semibold text-gray-800">{user?.name || user?.username || 'Administrator'}</span> • Patel Strap Industries Ltd
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={loadDashboardData}
              disabled={refreshing}
              title="Refresh Live Data"
              className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#007A5A]' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/invoices/new')}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              New Invoice
            </button>
            <button
              onClick={() => navigate('/master/skus')}
              className="px-3.5 py-1.5 bg-[#007A5A] hover:bg-[#00664b] text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Item
            </button>
          </div>
        </div>

        {/* Primary Metric KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {/* Total SKUs */}
          <div 
            onClick={() => navigate('/master/skus')}
            className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-[#007A5A]/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Total Items</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-[#007A5A] flex items-center justify-center">
                <Tags className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-[#007A5A] transition-colors">
              {loading ? '...' : totalItemsCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <span>Catalog SKUs</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>

          {/* Stock Units */}
          <div 
            onClick={() => navigate('/master/skus')}
            className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-[#007A5A]/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Total Stock</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Boxes className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
              {loading ? '...' : totalStockQuantity.toLocaleString('en-IN')}
            </div>
            <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
              <span>Units on hand</span>
            </div>
          </div>

          {/* Stock Valuation */}
          <div className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Valuation</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Coins className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900">
              {loading ? '...' : `₹${Math.round(totalValuation).toLocaleString('en-IN')}`}
            </div>
            <div className="text-[11px] text-emerald-600 font-medium mt-1">
              Current Asset Value
            </div>
          </div>

          {/* Low Stock Warning */}
          <div 
            onClick={() => navigate('/master/skus')}
            className={`bg-white p-4 rounded-xl border shadow-xs transition-all cursor-pointer group ${
              lowStockItems.length > 0 ? 'border-amber-200 hover:border-amber-400' : 'border-gray-200/80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Low Stock</span>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                lowStockItems.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'
              }`}>
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className={`text-xl font-bold ${lowStockItems.length > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
              {loading ? '...' : lowStockItems.length}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {lowStockItems.length > 0 ? 'Action required' : 'Optimal levels'}
            </div>
          </div>

          {/* Suppliers */}
          <div 
            onClick={() => navigate('/master/suppliers')}
            className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-[#007A5A]/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Suppliers</span>
              <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                <Truck className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
              {loading ? '...' : activeSuppliersCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Vendor directory
            </div>
          </div>

          {/* Customers */}
          <div 
            onClick={() => navigate('/master/customers')}
            className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-[#007A5A]/50 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-500">Clients</span>
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
                <Users className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 group-hover:text-teal-600 transition-colors">
              {loading ? '...' : activeCustomersCount}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              Active customers
            </div>
          </div>
        </div>

        {/* Low Stock Alert Banner (if needed) */}
        {lowStockItems.length > 0 && (
          <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-semibold text-amber-900">
                  {lowStockItems.length} item{lowStockItems.length > 1 ? 's are' : ' is'} at or below minimum threshold
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  Items: {lowStockItems.slice(0, 3).map(p => `${p.name} (${p.quantity || 0})`).join(', ')}
                  {lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more` : ''}
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/master/skus')}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-colors"
            >
              Reorder Items
            </button>
          </div>
        )}

        {/* Master Workspaces Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Master Workspaces</h2>
              <p className="text-xs text-gray-500">Direct shortcuts to enterprise data masters</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {modules.map((mod) => {
              const Icon = mod.icon;
              return (
                <div
                  key={mod.title}
                  onClick={() => navigate(mod.href)}
                  className="bg-white p-4 rounded-xl border border-gray-200/80 shadow-xs hover:border-[#007A5A] hover:shadow-sm transition-all cursor-pointer group flex items-start gap-3.5"
                >
                  <div className={`w-10 h-10 rounded-xl ${mod.iconBg} flex items-center justify-center shrink-0 shadow-xs`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h3 className="text-sm font-semibold text-gray-900 group-hover:text-[#007A5A] transition-colors truncate">
                        {mod.title}
                      </h3>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 shrink-0">
                        {mod.count}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {mod.desc}
                    </p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-[#007A5A] group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Items & Stock Table */}
        <div className="bg-white rounded-xl border border-gray-200/80 shadow-xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-gray-900">Inventory Items Overview</h3>
              <p className="text-xs text-gray-500 mt-0.5">Live stock status, categories and standard cost pricing</p>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter items..."
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 focus:bg-white border border-gray-200 focus:border-[#007A5A] rounded-lg text-xs outline-none w-44 sm:w-56 transition-all"
                />
              </div>
              <button
                onClick={() => navigate('/master/skus')}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-semibold text-[#007A5A] hover:bg-emerald-50/50 transition-colors cursor-pointer shrink-0"
              >
                View All Items
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/75 border-b border-gray-200/80 text-gray-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-2.5 px-4">Item Name</th>
                  <th className="py-2.5 px-4">SKU / ID</th>
                  <th className="py-2.5 px-4">Item Group</th>
                  <th className="py-2.5 px-4 text-right">Stock Quantity</th>
                  <th className="py-2.5 px-4 text-right">Standard Cost</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      Loading inventory records...
                    </td>
                  </tr>
                ) : filteredRecentProducts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400 text-xs">
                      No matching items found.
                    </td>
                  </tr>
                ) : (
                  filteredRecentProducts.map((p) => {
                    const qty = Number(p.quantity) || 0;
                    const minStock = Number(p.min_stock) || 0;
                    const isLow = qty <= minStock;
                    const isOut = qty === 0;

                    return (
                      <tr 
                        key={p.id}
                        onClick={() => navigate('/master/skus')}
                        className="hover:bg-gray-50/60 transition-colors cursor-pointer"
                      >
                        <td className="py-3 px-4 font-semibold text-gray-900">
                          <div className="flex items-center gap-2">
                            <span>{p.name}</span>
                            {p.unit?.name && (
                              <span className="text-[10px] text-gray-400 font-normal">
                                • {p.unit.name}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-gray-600 font-medium">
                          {p.sku}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-gray-100 text-gray-700 font-medium text-[11px]">
                            {p.category?.name || 'Uncategorized'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className={`font-semibold ${isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-gray-900'}`}>
                            {qty.toLocaleString('en-IN')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-gray-600 font-mono">
                          ₹{Number(p.cost_price || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isOut ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              Low Stock
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/master/skus');
                            }}
                            className="p-1 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded cursor-pointer transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
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
