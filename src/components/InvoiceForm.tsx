import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, ExternalLink } from 'lucide-react';
import { fetchInventory, fetchCustomers, fetchSuppliers, createInvoice, createCustomer, createSupplier } from '../services/api';
import type { Product, Customer, Supplier } from '../types';

export const InvoiceForm: React.FC = () => {
  const navigate = useNavigate();
  const [type, setType] = useState<'PURCHASE' | 'SALES'>('SALES');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  
  const [items, setItems] = useState<{ productId: string; quantity: number; unitPrice: number }[]>([
    { productId: '', quantity: 1, unitPrice: 0 }
  ]);

  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);

  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerContact, setNewCustomerContact] = useState('');
  
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierContact, setNewSupplierContact] = useState('');

  const loadData = async () => {
    try {
      const [prodRes, custRes, suppRes] = await Promise.all([
        fetchInventory(),
        fetchCustomers(),
        fetchSuppliers()
      ]);
      setProducts(prodRes);
      setCustomers(custRes);
      setSuppliers(suppRes);
    } catch (error) {
      console.error('Failed to fetch data', error);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createCustomer({ name: newCustomerName, contact: newCustomerContact });
      await loadData();
      setCustomerId(res.id);
      setIsCustomerModalOpen(false);
      setNewCustomerName('');
      setNewCustomerContact('');
    } catch (error) {
      console.error('Failed to create customer', error);
      alert('Failed to create customer');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await createSupplier({ name: newSupplierName, contact: newSupplierContact });
      await loadData();
      setSupplierId(res.id);
      setIsSupplierModalOpen(false);
      setNewSupplierName('');
      setNewSupplierContact('');
    } catch (error) {
      console.error('Failed to create supplier', error);
      alert('Failed to create supplier');
    }
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;

    if (field === 'productId') {
      const product = products.find(p => p.id === value);
      if (product) {
        newItems[index].unitPrice = type === 'SALES' ? product.selling_price : product.cost_price;
      }
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantity: 1, unitPrice: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validItems = items.filter(i => i.productId && i.quantity > 0);
      if (validItems.length === 0) {
        alert('Please add at least one valid item');
        return;
      }

      const payload = {
        type,
        date,
        customerId: type === 'SALES' ? customerId : undefined,
        supplierId: type === 'PURCHASE' ? supplierId : undefined,
        items: validItems
      };

      await createInvoice(payload);
      navigate('/invoices');
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create invoice');
      console.error(error);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Create Invoice</h1>
        <p className="text-gray-500 mt-1">Generate a new {type.toLowerCase()} invoice.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white shadow-sm border border-gray-100 rounded-2xl p-8 space-y-8">
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Invoice Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
            >
              <option value="SALES">Sales Invoice</option>
              <option value="PURCHASE">Purchase Invoice</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
              required
            />
          </div>

          {type === 'SALES' && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(true)}
                  className="text-[#0f8b5a] hover:text-[#0c744b] transition-colors"
                  title="Add new Customer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <select
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
                required
              >
                <option value="">Select Customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          )}

          {type === 'PURCHASE' && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Supplier</label>
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(true)}
                  className="text-[#0f8b5a] hover:text-[#0c744b] transition-colors"
                  title="Add new Supplier"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
                required
              >
                <option value="">Select Supplier...</option>
                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Invoice Items</h3>
          
          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={index} className="flex items-start gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Product / SKU</label>
                  <div className="flex items-center gap-2">
                    <select
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className="block w-full rounded-xl border-gray-200 border text-gray-900 py-2 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
                      required
                    >
                      <option value="">Select Product...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => navigate('/inventory')}
                      className="p-2 text-[#0f8b5a] bg-green-50 rounded-xl hover:bg-[#0f8b5a] hover:text-white transition-colors"
                      title="Add new SKU"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(index, 'quantity', Number(e.target.value))}
                    className="block w-full rounded-xl border-gray-200 border text-gray-900 py-2 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(index, 'unitPrice', Number(e.target.value))}
                    className="block w-full rounded-xl border-gray-200 border text-gray-900 py-2 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors"
                    required
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Total</label>
                  <div className="py-2 px-3 text-sm font-medium text-gray-900 bg-gray-50 rounded-xl border border-transparent">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                </div>
                <div className="pt-6">
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-between items-center border-t border-gray-100 pt-4">
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 text-[#0f8b5a] font-medium hover:text-[#0c744b] text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Another Line
            </button>
            <div className="text-xl font-bold text-gray-900">
              Total: ${calculateTotal().toFixed(2)}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 justify-end pt-4 border-t border-gray-100">
          <button 
            type="button"
            onClick={() => navigate('/invoices')}
            className="px-6 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="bg-[#0f8b5a] text-white px-8 py-3 rounded-xl font-medium hover:bg-[#0c744b] transition-colors shadow-lg shadow-[#0f8b5a]/30 cursor-pointer"
          >
            Create Invoice
          </button>
        </div>
      </form>

      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Customer</h2>
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
                <input 
                  type="text" 
                  required
                  value={newCustomerName}
                  onChange={(e) => setNewCustomerName(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                <input 
                  type="text" 
                  value={newCustomerContact}
                  onChange={(e) => setNewCustomerContact(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
                />
              </div>
              <div className="flex items-center gap-3 justify-end pt-4 mt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsCustomerModalOpen(false)} 
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[#0f8b5a] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#0c744b] transition-colors shadow-lg shadow-[#0f8b5a]/30 cursor-pointer text-sm"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isSupplierModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Add New Supplier</h2>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier Name</label>
                <input 
                  type="text" 
                  required
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                <input 
                  type="text" 
                  value={newSupplierContact}
                  onChange={(e) => setNewSupplierContact(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
                />
              </div>
              <div className="flex items-center gap-3 justify-end pt-4 mt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsSupplierModalOpen(false)} 
                  className="px-5 py-2.5 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition-colors cursor-pointer text-sm"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="bg-[#0f8b5a] text-white px-6 py-2.5 rounded-xl font-medium hover:bg-[#0c744b] transition-colors shadow-lg shadow-[#0f8b5a]/30 cursor-pointer text-sm"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
