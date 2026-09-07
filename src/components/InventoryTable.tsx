import React, { useEffect, useState } from 'react';
import { fetchInventory, deleteProduct, createProduct, updateProduct, bulkUploadInventory, type Product } from '../services/api';
import { ProductForm } from './ProductForm';
import { Leaf, Package, Pencil, Trash2, ChevronLeft, ChevronRight, X } from 'lucide-react';

export const InventoryTable: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<'raw' | 'finished'>('raw');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  // Bulk Upload state
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

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

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) return;
    setIsUploading(true);
    try {
      const response = await bulkUploadInventory(bulkUploadFile);
      alert(response.message || 'Upload successful');
      setIsBulkUploadModalOpen(false);
      setBulkUploadFile(null);
      loadData();
    } catch (error) {
      console.error('Bulk upload error', error);
      alert('Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent = "data:text/csv;charset=utf-8,sku,name,quantity,cost_price,selling_price,min_stock,categoryName,supplierName,unitName\n" +
      "MAT-001,Example Material,100,10.50,15.00,20,Raw Materials,Example Supplier,kg\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "inventory_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <div className="flex justify-end items-center mb-6 gap-3">
          {/* <h2 className="text-xl font-bold text-gray-900">
            {activeTab === 'raw' ? 'Raw Material Stock' : 'Finished Goods Stock'}
          </h2> */}
          <button 
            onClick={() => setIsBulkUploadModalOpen(true)}
            className="border-2 border-gray-300 text-gray-700 px-5 py-2 rounded-full font-medium hover:bg-gray-50 transition-colors text-sm cursor-pointer"
          >
            Bulk Upload
          </button>
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

      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Bulk Upload Materials</h2>
              <button onClick={() => setIsBulkUploadModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Upload an Excel or CSV file to bulk import materials. 
                <button onClick={handleDownloadSample} className="text-[#0f8b5a] ml-1 hover:underline font-medium">Download sample template.</button>
              </p>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setBulkUploadFile(e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-medium
                  file:bg-green-50 file:text-[#0f8b5a]
                  hover:file:bg-green-100 cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <button
                type="button"
                onClick={() => setIsBulkUploadModalOpen(false)}
                className="px-5 py-2 border border-gray-300 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpload}
                disabled={!bulkUploadFile || isUploading}
                className="px-5 py-2 bg-[#0f8b5a] text-white text-sm font-medium rounded-full hover:bg-[#0c764c] disabled:opacity-50 transition-colors"
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
