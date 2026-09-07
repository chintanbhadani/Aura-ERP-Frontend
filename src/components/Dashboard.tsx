import React, { useEffect, useState } from 'react';
import { fetchInventory, type Product } from '../services/api';
import { Activity, Leaf, Settings, ScanBarcode } from 'lucide-react';
import { Button } from '@mui/material';

export const Dashboard: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

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

  const lowStockItems = products.filter(p => p.quantity <= (p.min_stock ?? 0));

  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, Shift Supervisor</p>
        </div>
        <div className="flex gap-4">
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<ScanBarcode className="w-5 h-5" />}
            sx={{ px: 3, py: 1.2, fontWeight: 600 }}
          >
            Scan Barcode
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
          <div className="bg-primary-bg w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <Activity className="w-6 h-6" />
          </div>
          <h2 className="text-gray-900 font-bold text-lg">Active Jobs</h2>
          <p className="text-gray-500 text-sm mt-1">4 machines currently running</p>
        </div>
        
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
          <div className="bg-primary-bg w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <Leaf className="w-6 h-6" />
          </div>
          <h2 className="text-gray-900 font-bold text-lg">BOM Inventory</h2>
          <p className="text-gray-500 text-sm mt-1">
            {lowStockItems.length > 0 ? `${lowStockItems.length} items low on stock` : 'Healthy levels of raw materials'}
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center min-h-[140px]">
          <div className="bg-primary-bg w-12 h-12 rounded-2xl flex items-center justify-center mb-4 text-primary">
            <Settings className="w-6 h-6" />
          </div>
          <h2 className="text-gray-900 font-bold text-lg">QC Logs</h2>
          <p className="text-gray-500 text-sm mt-1">All parameters within limits</p>
        </div>
      </div>

      {/* Recent Production Section */}
      <div className="mb-6 flex justify-between items-end">
        <h2 className="text-2xl font-bold text-gray-900">Recent Production</h2>
        <a href="#" className="text-primary font-semibold hover:underline text-sm">View All</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mock Data for Rolls */}
        {[
          { id: '26A5C11', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
          { id: '26A5C12', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
          { id: '26A5C13', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
          { id: '26A5C14', machine: 'Machine A', weight: '25.4kg', status: 'QC Passed' },
        ].map(roll => (
          <div key={roll.id} className="bg-white p-4 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-6">
            <div className="bg-gray-100 w-20 h-20 rounded-2xl flex items-center justify-center text-gray-400 text-sm font-medium">
              Image
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-lg">Roll #{roll.id}</h3>
              <p className="text-gray-500 text-sm mb-2">{roll.machine} • Net: {roll.weight}</p>
              <span className="inline-block px-3 py-1 bg-primary-bg text-primary font-semibold text-xs rounded-full">
                {roll.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Dashboard;
