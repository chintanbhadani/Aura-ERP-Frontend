import React, { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { Card, CardTitle, CardDescription } from '../components/Card';
import { Button } from '../components/Button';
import { cn } from '../components/Button';
import { Input } from '../components/Input';
import { PackageOpen, PackageCheck, X } from 'lucide-react';
import dataService from '../axios/dataService';
import { DataTable } from '../components/Table/DataTable';

export default function Inventory() {
  const [activeTab, setActiveTab] = useState<'raw' | 'production'>('raw');
  const [showAddStock, setShowAddStock] = useState(false);
  
  const [rawMaterials, setRawMaterials] = useState<any[]>([]);

  React.useEffect(() => {
    fetchRawMaterials();
  }, []);

  const fetchRawMaterials = async () => {
    try {
      const response = await dataService.get(`/inventory/raw`);
      setRawMaterials(response.data);
    } catch (error) {
      console.error('Failed to fetch raw materials', error);
    }
  };

  const [addStockForm, setAddStockForm] = useState({ name: '', quantity: '' });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStockForm.name || !addStockForm.quantity) return;

    setIsSubmitting(true);
    try {
      await dataService.post(`/inventory/raw`, {
        materialName: addStockForm.name,
        quantityKg: parseFloat(addStockForm.quantity)
      });
      
      // Refresh the list from the server
      await fetchRawMaterials();
      
      setAddStockForm({ name: '', quantity: '' });
      setShowAddStock(false);
    } catch (error) {
      console.error('Failed to add stock', error);
      alert('Failed to add stock. See console for details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const productionSummary = { totalRolls: 154, totalWeight: 3850 };
  const finishedRolls = [
    { id: '1', barcode: '6A011AXX', netWeight: 25.0, machine: 'A', status: 'QC_PASSED', updatedAt: '2026-09-01T11:00:00Z' },
    { id: '2', barcode: '6A011AYY', netWeight: 25.0, machine: 'A', status: 'QC_PASSED', updatedAt: '2026-09-01T11:15:00Z' },
    { id: '3', barcode: '6A011BZZ', netWeight: 24.8, machine: 'B', status: 'QC_PASSED', updatedAt: '2026-09-01T11:30:00Z' },
  ];

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-12 font-sans relative">
        <div className="max-w-5xl mx-auto space-y-8">
          
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
              <p className="text-gray-500 mt-1">Track raw materials and finished goods.</p>
            </div>
          </header>

          <div className="flex bg-gray-100 p-1 rounded-2xl w-full max-w-sm">
            <button
              onClick={() => setActiveTab('raw')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-xl transition-all",
                activeTab === 'raw' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <PackageOpen size={18} />
              Raw Materials
            </button>
            <button
              onClick={() => setActiveTab('production')}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-xl transition-all",
                activeTab === 'production' ? "bg-white text-primary-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              )}
            >
              <PackageCheck size={18} />
              Finished Goods
            </button>
          </div>

          <section className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
            {activeTab === 'raw' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <CardTitle>Raw Material Stock</CardTitle>
                  <Button variant="outline" size="sm" onClick={() => setShowAddStock(true)}>Add Stock</Button>
                </div>
                
                <DataTable
                  data={rawMaterials}
                  columns={[
                    {
                      header: 'Material Name',
                      id: 'materialName',
                      cell: ({ row }) => <span className="whitespace-nowrap font-medium text-gray-900">{row.materialName}</span>
                    },
                    {
                      header: 'Current Stock (kg)',
                      id: 'quantityKg',
                      cell: ({ row }) => <span className="whitespace-nowrap text-gray-600">{row.quantityKg.toLocaleString()} kg</span>
                    },
                    {
                      header: 'Status',
                      id: 'status',
                      cell: ({ row }) => {
                        const isLow = row.quantityKg < 500;
                        return (
                          <span className={`whitespace-nowrap px-2.5 py-1 text-xs font-medium rounded-full ${isLow ? 'bg-red-50 text-red-700' : 'bg-primary-50 text-primary-700'}`}>
                            {isLow ? 'Low Stock' : 'Healthy'}
                          </span>
                        );
                      }
                    },
                    {
                      header: 'Last Updated',
                      id: 'lastUpdated',
                      cell: ({ row }) => <span className="whitespace-nowrap text-sm text-gray-500">{new Date(row.lastUpdated).toLocaleString()}</span>
                    }
                  ]}
                />
              </div>
            )}

            {activeTab === 'production' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-primary-50 p-4 rounded-2xl border border-primary-100">
                    <p className="text-sm font-medium text-primary-800">Total Rolls Ready</p>
                    <p className="text-3xl font-bold text-primary-600 mt-1">{productionSummary.totalRolls}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                    <p className="text-sm font-medium text-blue-800">Total Net Weight</p>
                    <p className="text-3xl font-bold text-blue-600 mt-1">{productionSummary.totalWeight.toLocaleString()} kg</p>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <CardTitle>Finished Rolls (QC Passed)</CardTitle>
                  <Button variant="outline" size="sm">Export CSV</Button>
                </div>
                
                <DataTable
                  data={finishedRolls}
                  columns={[
                    {
                      header: 'Barcode',
                      id: 'barcode',
                      cell: ({ row }) => <span className="whitespace-nowrap font-medium text-gray-900">{row.barcode}</span>
                    },
                    {
                      header: 'Machine',
                      id: 'machine',
                      cell: ({ row }) => <span className="whitespace-nowrap text-gray-600">Machine {row.machine}</span>
                    },
                    {
                      header: 'Net Weight (kg)',
                      id: 'netWeight',
                      cell: ({ row }) => <span className="whitespace-nowrap text-gray-600">{row.netWeight}</span>
                    },
                    {
                      header: 'Time Completed',
                      id: 'updatedAt',
                      cell: ({ row }) => <span className="whitespace-nowrap text-sm text-gray-500">{new Date(row.updatedAt).toLocaleTimeString()}</span>
                    },
                    {
                      header: 'Actions',
                      id: 'actions',
                      className: 'text-right',
                      cell: ({ row }) => <button className="whitespace-nowrap text-primary-600 font-medium text-sm hover:text-primary-700">Ship</button>
                    }
                  ]}
                />
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Add Stock Modal */}
      {showAddStock && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 shadow-xl w-full max-w-md animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">Add Raw Material Stock</h3>
              <button onClick={() => setShowAddStock(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Material</label>
                <select 
                  className="w-full h-11 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  value={addStockForm.name}
                  onChange={(e) => setAddStockForm({...addStockForm, name: e.target.value})}
                  required
                >
                  <option value="" disabled>Select material...</option>
                  <option value="Recycled PET Flakes">Recycled PET Flakes</option>
                  <option value="Virgin Chips">Virgin Chips</option>
                  <option value="Color Masterbatch">Color Masterbatch</option>
                  <option value="Other">Other (New)</option>
                </select>
              </div>

              {addStockForm.name === 'Other' && (
                <Input 
                  label="New Material Name" 
                  required 
                  onChange={(e) => setAddStockForm({...addStockForm, name: e.target.value})}
                />
              )}

              <Input 
                label="Quantity to Add (kg)" 
                type="number" 
                min="0.1" 
                step="0.1" 
                placeholder="e.g. 500" 
                required 
                value={addStockForm.quantity}
                onChange={(e) => setAddStockForm({...addStockForm, quantity: e.target.value})}
              />

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" type="button" onClick={() => setShowAddStock(false)} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Adding...' : 'Add Stock'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
