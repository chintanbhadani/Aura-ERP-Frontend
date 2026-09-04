import React, { useEffect, useState } from 'react';
import { fetchInventory, deleteProduct, createProduct, updateProduct, type Product } from '../services/api';
import { ProductForm } from './ProductForm';
import { Leaf, Package, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';

export const InventoryTable: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'raw' | 'finished'>('raw');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const loadData = async () => {
    try {
      const data = await fetchInventory(search);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  // Reset to first page when products change (e.g. searching or deleting)
  useEffect(() => {
    setCurrentPage(1);
  }, [products.length, search]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteProduct(id);
        loadData();
      } catch (error) {
        console.error('Error deleting product', error);
      }
    }
  };

  const handleFormSubmit = async (data: Product) => {
    try {
      if (editingProduct && editingProduct.id) {
        await updateProduct(editingProduct.id, data);
      } else {
        await createProduct(data);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      loadData();
    } catch (error) {
      console.error('Error saving product', error);
      alert('Failed to save product. Check if SKU is unique.');
    }
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  // Pagination Logic
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const currentProducts = products.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-500 mt-1">Track raw materials and finished goods.</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-6">
        <div className="flex justify-end items-center mb-6">
          {/* <h2 className="text-xl font-bold text-gray-900">
            {activeTab === 'raw' ? 'Raw Material Stock' : 'Finished Goods Stock'}
          </h2> */}
          <button 
            onClick={() => { setEditingProduct(null); setIsModalOpen(true); }}
            className="border-2 border-[#0f8b5a] text-[#0f8b5a] px-5 py-2 rounded-full font-medium hover:bg-[#0f8b5a] hover:text-white transition-colors text-sm cursor-pointer"
          >
            Add Stock
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Material Name</th>
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Category</th>
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Supplier</th>
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Quantity</th>
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Price / Unit</th>
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Total Value</th>
                <th className="px-2 py-4 text-left text-sm font-semibold text-gray-500">Status</th>
                <th className="px-2 py-4 text-right text-sm font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {currentProducts.map((product) => {
                const threshold = (product as any).min_stock ?? (product as any).reorderPoint ?? 0;
                const isLowStock = product.quantity <= threshold;
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50/50">
                    <td className="px-2 py-5 whitespace-nowrap">
                      <p className="font-bold text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-gray-600 text-sm">
                      {product.category?.name || '-'}
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-gray-600 text-sm">
                      {product.supplier?.name || '-'}
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-gray-600">
                      <p className="font-medium text-gray-900">{product.quantity} {product.unit?.name || 'units'}</p>
                      <p className="text-xs text-gray-400">Min: {threshold} {product.unit?.name || 'units'}</p>
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-gray-600 text-sm">
                      <p>${Number(product.cost_price || 0).toFixed(2)}</p>
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-gray-600 text-sm">
                      <p className="font-medium text-[#0f8b5a]">${(Number(product.quantity || 0) * Number(product.cost_price || 0)).toFixed(2)}</p>
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap">
                      {isLowStock ? (
                        <span className="px-3 py-1 bg-red-50 text-red-600 font-medium text-xs rounded-full">
                          Low Stock
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-green-50 text-[#0f8b5a] font-medium text-xs rounded-full">
                          Healthy
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-5 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button 
                          onClick={() => openEditModal(product)} 
                          className="p-2 text-gray-400 hover:text-[#0f8b5a] hover:bg-green-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => product.id && handleDelete(product.id)} 
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {products.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    No items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-6 mt-4">
          <span className="text-sm text-gray-500">
            Showing {products.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to {Math.min(currentPage * itemsPerPage, products.length)} of {products.length} entries
          </span>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>Rows per page:</span>
              <select 
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-lg p-1 text-sm bg-white focus:outline-none focus:border-[#0f8b5a] text-gray-700 cursor-pointer"
              >
                {/* <option value={5}>5</option> */}
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button 
                onClick={handlePrevPage}
                disabled={currentPage === 1 || totalPages === 0}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-1">
                {totalPages > 0 ? Array.from({ length: totalPages }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentPage(index + 1)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      currentPage === index + 1 
                        ? 'bg-[#0f8b5a] text-white' 
                        : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    {index + 1}
                  </button>
                )) : (
                  <button className="w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors bg-[#0f8b5a] text-white cursor-pointer">
                    1
                  </button>
                )}
              </div>
              <button 
                onClick={handleNextPage}
                disabled={currentPage === totalPages || totalPages === 0}
                className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <ProductForm 
          initialData={editingProduct} 
          products={products}
          onSubmit={handleFormSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
};
