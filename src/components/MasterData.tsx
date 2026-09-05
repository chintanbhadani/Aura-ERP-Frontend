import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, Plus, Database } from 'lucide-react';
import { 
  fetchCategories, createCategory, updateCategory, deleteCategory,
  fetchSuppliers, createSupplier, updateSupplier, deleteSupplier,
  fetchUnits, createUnit, updateUnit, deleteUnit,
  fetchCustomers, createCustomer, updateCustomer, deleteCustomer
} from '../services/api';
import type { Category, Supplier, Unit, Customer } from '../types';

type MasterDataType = 'categories' | 'suppliers' | 'units' | 'customers';

export const MasterData: React.FC = () => {
  const { type } = useParams<{ type: MasterDataType }>();
  const navigate = useNavigate();

  const [data, setData] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [email, setEmail] = useState('');

  const isValidType = type === 'categories' || type === 'suppliers' || type === 'units' || type === 'customers';

  useEffect(() => {
    if (!isValidType) {
      navigate('/');
    } else {
      loadData();
    }
  }, [type]);

  const loadData = async () => {
    try {
      if (type === 'categories') {
        const res = await fetchCategories();
        setData(res);
      } else if (type === 'suppliers') {
        const res = await fetchSuppliers();
        setData(res);
      } else if (type === 'units') {
        const res = await fetchUnits();
        setData(res);
      } else if (type === 'customers') {
        const res = await fetchCustomers();
        setData(res);
      }
    } catch (error) {
      console.error('Failed to load data', error);
    }
  };

  const getTitle = () => {
    switch(type) {
      case 'categories': return 'Category Master';
      case 'suppliers': return 'Supplier Master';
      case 'units': return 'Unit Master';
      case 'customers': return 'Customer Master';
      default: return 'Master Data';
    }
  };

  const openModal = (item: any = null) => {
    setEditingItem(item);
    setName(item ? item.name : '');
    if (type === 'suppliers' || type === 'customers') {
      setContact(item?.contact || '');
      setEmail(item?.email || '');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setName('');
    setContact('');
    setEmail('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (type === 'categories') {
        if (editingItem) await updateCategory(editingItem.id, { name });
        else await createCategory({ name });
      } else if (type === 'suppliers') {
        if (editingItem) await updateSupplier(editingItem.id, { name, contact, email });
        else await createSupplier({ name, contact, email });
      } else if (type === 'units') {
        if (editingItem) await updateUnit(editingItem.id, { name });
        else await createUnit({ name });
      } else if (type === 'customers') {
        if (editingItem) await updateCustomer(editingItem.id, { name, contact, email });
        else await createCustomer({ name, contact, email });
      }
      closeModal();
      loadData();
    } catch (error) {
      console.error('Error saving data', error);
      alert('Failed to save data. Please check inputs.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      if (type === 'categories') await deleteCategory(id);
      else if (type === 'suppliers') await deleteSupplier(id);
      else if (type === 'units') await deleteUnit(id);
      else if (type === 'customers') await deleteCustomer(id);
      loadData();
    } catch (error) {
      console.error('Error deleting data', error);
      alert('Failed to delete. It might be in use.');
    }
  };

  if (!isValidType) return null;

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{getTitle()}</h1>
        <p className="text-gray-500 mt-1">Manage {type} data for the system.</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-[#0f8b5a]" />
            <h2 className="text-xl font-bold text-gray-900 capitalize">{type} List</h2>
          </div>
          <button 
            onClick={() => openModal()}
            className="flex items-center gap-2 border-2 border-[#0f8b5a] text-[#0f8b5a] px-5 py-2 rounded-full font-medium hover:bg-[#0f8b5a] hover:text-white transition-colors text-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500 w-1/3">Name</th>
                {(type === 'suppliers' || type === 'customers') && (
                  <>
                    <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Contact</th>
                    <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Email</th>
                  </>
                )}
                <th className="px-2 py-4 text-right text-sm font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50/50">
                  <td className="px-2 py-5 whitespace-nowrap text-gray-900 font-medium">{item.name}</td>
                  {(type === 'suppliers' || type === 'customers') && (
                    <>
                      <td className="px-2 py-5 whitespace-nowrap text-gray-600 text-sm">{item.contact || '-'}</td>
                      <td className="px-2 py-5 whitespace-nowrap text-gray-600 text-sm">{item.email || '-'}</td>
                    </>
                  )}
                  <td className="px-2 py-5 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button 
                        onClick={() => openModal(item)} 
                        className="p-2 text-gray-400 hover:text-[#0f8b5a] hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(item.id)} 
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={(type === 'suppliers' || type === 'customers') ? 4 : 2} className="py-12 text-center text-gray-500">
                    No records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingItem ? 'Edit' : 'Add New'} {type === 'categories' ? 'Category' : type === 'suppliers' ? 'Supplier' : type === 'customers' ? 'Customer' : 'Unit'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Name</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
                />
              </div>

              {(type === 'suppliers' || type === 'customers') && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Contact Number</label>
                    <input 
                      type="text" 
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full rounded-2xl border-gray-200 border text-gray-900 py-2.5 px-3 text-sm focus:ring-[#0f8b5a] focus:border-[#0f8b5a] outline-none transition-colors" 
                    />
                  </div>
                </>
              )}

              <div className="flex items-center gap-3 justify-end pt-4 mt-6 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={closeModal} 
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
