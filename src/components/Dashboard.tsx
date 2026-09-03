import React, { useEffect, useState } from 'react';
import { fetchInventory, type Product } from '../services/api';
import { Activity, Leaf, Settings, ScanBarcode, LogOut, ChevronDown, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const data = await fetchInventory();
      setProducts(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8">Loading dashboard...</div>;

  const totalItems = products.reduce((sum, p) => sum + p.quantity, 0);
  const lowStockItems = products.filter(p => p.quantity <= p.min_stock);

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Shift Supervisor</p>
        </div>
        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-[#0f8b5a] text-white px-5 py-2.5 rounded-full font-medium hover:bg-[#0b6b45] transition-colors shadow-sm">
            <ScanBarcode className="w-5 h-5" />
            Scan Barcode
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
          <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-[#0f8b5a]">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-gray-900 font-bold text-lg">Active Jobs</h2>
          <p className="text-gray-500 text-sm mt-1">4 machines currently running</p>
        </div>
        
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
          <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-[#0f8b5a]">
            <Leaf className="w-6 h-6" />
          </div>
          <h2 className="text-gray-900 font-bold text-lg">BOM Inventory</h2>
          <p className="text-gray-500 text-sm mt-1">
            {lowStockItems.length > 0 ? `${lowStockItems.length} items low on stock` : 'Healthy levels of raw materials'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
          <div className="bg-green-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-[#0f8b5a]">
            <Settings className="w-6 h-6" />
          </div>
          <h2 className="text-gray-900 font-bold text-lg">QC Logs</h2>
          <p className="text-gray-500 text-sm mt-1">All parameters within limits</p>
        </div>
      </div>

      {/* Recent Production Section */}
      <div className="mb-6 flex justify-between items-end">
        <h2 className="text-2xl font-bold text-gray-900">Recent Production</h2>
        <a href="#" className="text-[#0f8b5a] font-medium hover:underline text-sm">View All</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mock Data for Rolls */}
        {[
          { id: '26A5C11', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
          { id: '26A5C12', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
          { id: '26A5C13', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
          { id: '26A5C14', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
        ].map(roll => (
          <div key={roll.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="bg-gray-100 w-20 h-20 rounded-xl flex items-center justify-center text-gray-400 text-sm font-medium">
              Image
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Roll #{roll.id}</h3>
              <p className="text-gray-500 text-sm mb-2">{roll.machine} • Net: {roll.weight}</p>
              <span className="inline-block px-3 py-1 bg-green-50 text-[#0f8b5a] font-medium text-xs rounded-full">
                {roll.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
