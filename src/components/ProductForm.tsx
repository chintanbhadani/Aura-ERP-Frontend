import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Product, Category, Supplier } from '../services/api';
import { fetchCategories, fetchSuppliers } from '../services/api';

interface ProductFormProps {
  initialData?: Product | null;
  products?: Product[];
  onSubmit: (data: Product) => void;
  onCancel: () => void;
}

export const ProductForm: React.FC<ProductFormProps> = ({ initialData, products = [], onSubmit, onCancel }) => {
  const [sku, setSku] = useState<string>(`MAT-${Math.floor(Math.random() * 10000)}`);
  const [name, setName] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [minStock, setMinStock] = useState<string>('50');
  
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchSuppliers().then(setSuppliers).catch(console.error);
  }, []);

  useEffect(() => {
    if (initialData) {
      setSku(initialData.sku || '');
      setName(initialData.name || '');
      setQuantity(initialData.quantity !== undefined ? String(initialData.quantity) : '');
      setCostPrice(initialData.cost_price !== undefined ? String(initialData.cost_price) : '');
      setSellingPrice(initialData.selling_price !== undefined ? String(initialData.selling_price) : '');
      setMinStock(initialData.min_stock !== undefined ? String(initialData.min_stock) : '');
      setSelectedCategoryId(initialData.categoryId || '');
      setSelectedSupplierId(initialData.supplierId || '');
    }
  }, [initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    onSubmit({
      id: initialData?.id,
      sku: sku,
      name: name,
      quantity: Number(quantity),
      cost_price: Number(costPrice),
      selling_price: Number(sellingPrice),
      min_stock: Number(minStock),
      categoryId: selectedCategoryId,
      supplierId: selectedSupplierId,
      location: initialData?.location || '',
      status: initialData?.status || 'Active'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-xl relative my-8">
        <button 
          onClick={onCancel}
          className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {initialData ? "Edit Material" : "Create New Material"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Material Name</label>
              <input 
                required 
                type="text" 
                placeholder="e.g. Copper Wire 1mm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-3.5 px-4 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">SKU (Auto-Generated)</label>
              <input 
                required 
                type="text" 
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-3.5 px-4 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Category Type</label>
              <div className="relative">
                <select 
                  required
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-700 py-3.5 px-4 appearance-none focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
                >
                  <option value="" disabled>Select category...</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Supplier</label>
              <div className="relative">
                <select 
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-700 py-3.5 px-4 appearance-none focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
                >
                  <option value="" disabled>Select supplier...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Initial Quantity (kg/units)</label>
              <input 
                required 
                type="number" 
                placeholder="e.g. 500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-3.5 px-4 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Min Stock Alert</label>
              <input 
                required 
                type="number" 
                placeholder="e.g. 50"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-3.5 px-4 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Cost Price ($)</label>
              <input 
                required 
                type="number" 
                step="0.01"
                placeholder="e.g. 12.50"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-3.5 px-4 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Selling Price ($)</label>
              <input 
                required 
                type="number" 
                step="0.01"
                placeholder="e.g. 25.00"
                value={sellingPrice}
                onChange={(e) => setSellingPrice(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-3.5 px-4 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 mt-10 pt-2">
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-6 py-3 font-medium text-[#0f8b5a] hover:bg-green-50 rounded-full transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 bg-[#0f8b5a] text-white font-medium rounded-full hover:bg-[#0b6b45] transition-colors shadow-sm"
            >
              Save Details
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
