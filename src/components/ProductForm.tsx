import React, { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { Product, Category, Supplier, Unit } from '../services/api';
import { fetchCategories, fetchSuppliers, fetchUnits, createCategory, createSupplier, createUnit } from '../services/api';

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
  const [units, setUnits] = useState<Unit[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');
  const [newSupplierEmail, setNewSupplierEmail] = useState('');
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);

  const [showUnitModal, setShowUnitModal] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [isSubmittingUnit, setIsSubmittingUnit] = useState(false);

  useEffect(() => {
    fetchCategories().then(setCategories).catch(console.error);
    fetchSuppliers().then(setSuppliers).catch(console.error);
    fetchUnits().then(setUnits).catch(console.error);
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
      setSelectedUnitId(initialData.unitId || '');
    }
  }, [initialData]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    try {
      setIsSubmittingCategory(true);
      const newCat = await createCategory({ name: newCategoryName });
      setCategories([...categories, newCat]);
      setSelectedCategoryId(newCat.id);
      setShowCategoryModal(false);
      setNewCategoryName('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    try {
      setIsSubmittingSupplier(true);
      const newSup = await createSupplier({ 
        name: newSupplierName,
        contact: newSupplierContact,
        email: newSupplierEmail
      });
      setSuppliers([...suppliers, newSup]);
      setSelectedSupplierId(newSup.id);
      setShowSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierContact('');
      setNewSupplierEmail('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim()) return;
    try {
      setIsSubmittingUnit(true);
      const newUnit = await createUnit({ name: newUnitName });
      setUnits([...units, newUnit]);
      setSelectedUnitId(newUnit.id);
      setShowUnitModal(false);
      setNewUnitName('');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmittingUnit(false);
    }
  };

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
      unitId: selectedUnitId,
      location: initialData?.location || '',
      status: initialData?.status || 'Active'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-3xl p-8 w-full max-w-3xl shadow-xl relative my-8">
        <button 
          onClick={onCancel}
          className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          {initialData ? "Edit Material" : "Create New Material"}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2">
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Material Name</label>
              <input 
                required 
                type="text" 
                placeholder="e.g. Copper Wire 1mm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
            <div className="col-span-1">
              <label className="block text-[15px] font-medium text-gray-700 mb-2">SKU (Auto-Generated)</label>
              <input 
                required 
                type="text" 
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-[15px] font-medium text-gray-700">Category Type</label>
                <button type="button" onClick={() => setShowCategoryModal(true)} className="text-[#0f8b5a] hover:bg-green-50 p-1 rounded-md transition-colors cursor-pointer" title="Add new category">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <select 
                  required
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-700 py-2.5 px-3 text-sm appearance-none focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors cursor-pointer"
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
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-[15px] font-medium text-gray-700">Supplier</label>
                <button type="button" onClick={() => setShowSupplierModal(true)} className="text-[#0f8b5a] hover:bg-green-50 p-1 rounded-md transition-colors cursor-pointer" title="Add new supplier">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <select 
                  required
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-700 py-2.5 px-3 text-sm appearance-none focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors cursor-pointer"
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

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Quantity</label>
              <input 
                required 
                type="number" 
                placeholder="e.g. 500"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="block text-[15px] font-medium text-gray-700">Quantity unit</label>
                <button type="button" onClick={() => setShowUnitModal(true)} className="text-[#0f8b5a] hover:bg-green-50 p-1 rounded-md transition-colors cursor-pointer" title="Add new unit">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="relative">
                <select 
                  required
                  value={selectedUnitId}
                  onChange={(e) => setSelectedUnitId(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-700 py-2.5 px-3 text-sm appearance-none focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors cursor-pointer"
                >
                  <option value="" disabled>Select unit...</option>
                  {units.map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Min Stock Alert</label>
              <input 
                required 
                type="number" 
                placeholder="e.g. 50"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Price per unit ($)</label>
              <input 
                required 
                type="number" 
                step="0.01"
                placeholder="e.g. 12.50"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
            <div>
              <label className="block text-[15px] font-medium text-gray-700 mb-2">Total ($)</label>
              <input 
                readOnly 
                type="text" 
                value={(Number(quantity || 0) * Number(costPrice || 0)).toFixed(2)}
                className="block w-full rounded-2xl border-gray-200 border bg-gray-50 text-gray-500 py-2.5 px-3 text-sm focus:outline-none cursor-not-allowed" 
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
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors placeholder:text-gray-400" 
              />
            </div>
          </div>

          <div className="flex justify-end items-center gap-4 mt-10 pt-2">
            <button 
              type="button" 
              onClick={onCancel} 
              className="px-6 py-3 font-medium text-[#0f8b5a] hover:bg-green-50 rounded-full transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-8 py-3 bg-[#0f8b5a] text-white font-medium rounded-full hover:bg-[#0b6b45] transition-colors shadow-sm cursor-pointer"
            >
              Save Details
            </button>
          </div>
        </form>
      </div>

      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                <input required type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} className="block w-full rounded-xl border-gray-200 border py-2 px-3 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCategoryModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmittingCategory} className="px-4 py-2 bg-[#0f8b5a] text-white rounded-lg hover:bg-[#0b6b45] disabled:opacity-50 cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplierModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Supplier</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                <input required type="text" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} className="block w-full rounded-xl border-gray-200 border py-2 px-3 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                <input type="text" value={newSupplierContact} onChange={(e) => setNewSupplierContact(e.target.value)} className="block w-full rounded-xl border-gray-200 border py-2 px-3 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={newSupplierEmail} onChange={(e) => setNewSupplierEmail(e.target.value)} className="block w-full rounded-xl border-gray-200 border py-2 px-3 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmittingSupplier} className="px-4 py-2 bg-[#0f8b5a] text-white rounded-lg hover:bg-[#0b6b45] disabled:opacity-50 cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUnitModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl relative">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Unit</h3>
            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit Name</label>
                <input required type="text" placeholder="e.g. kg, pcs, boxes" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="block w-full rounded-xl border-gray-200 border py-2 px-3 focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowUnitModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" disabled={isSubmittingUnit} className="px-4 py-2 bg-[#0f8b5a] text-white rounded-lg hover:bg-[#0b6b45] disabled:opacity-50 cursor-pointer">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
