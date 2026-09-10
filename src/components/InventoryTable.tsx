import React, { useEffect, useState } from 'react';
import { fetchInventory, deleteProduct, bulkUploadInventory, type Product } from '../services/api';
import { Leaf, Package, Pencil, Trash2, X, Search, Filter } from 'lucide-react';
import { Button, IconButton, Tooltip } from '@mui/material';
import { successToast, errorToast } from '../helper/toast';
import { useCurrency } from '../helper/currency';
import { useNavigate } from 'react-router-dom';
import { DataTable } from './Table/DataTable';

export const InventoryTable: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const { format } = useCurrency();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'raw' | 'finished'>('raw');

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isAllSelected = products.length > 0 && products.every(p => p.id && selectedIds.has(p.id));
  const isIndeterminate = !isAllSelected && products.some(p => p.id && selectedIds.has(p.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        products.forEach(p => p.id && next.delete(p.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        products.forEach(p => p.id && next.add(p.id));
        return next;
      });
    }
  };

  // Bulk Upload state
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const [stockFilter, setStockFilter] = useState<'all' | 'low_stock' | 'healthy'>('all');

  const loadData = async () => {
    try {
      const data = await fetchInventory(search, stockFilter);
      setProducts(data);
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  useEffect(() => {
    loadData();
  }, [search, stockFilter]);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteProduct(id);
        successToast('Material deleted successfully');
        loadData();
      } catch (error: any) {
        console.error('Error deleting product', error);
        errorToast(error?.response?.data?.error || 'Failed to delete product');
      }
    }
  };

  const handleBulkUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) return;
    setIsUploading(true);
    try {
      const response = await bulkUploadInventory(bulkUploadFile);
      successToast(response.message || 'Upload successful');
      setIsBulkUploadModalOpen(false);
      setBulkUploadFile(null);
      loadData();
    } catch (error: any) {
      console.error('Bulk upload error', error);
      errorToast(error?.response?.data?.error || 'Failed to upload file');
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


  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory Management</h1>
        <p className="text-gray-500 mt-1">Track raw materials and finished goods.</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-2xl p-3 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by name or SKU..." 
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative flex-shrink-0">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer text-gray-700"
                value={stockFilter}
                onChange={(e) => setStockFilter(e.target.value as any)}
              >
                <option value="all">All Stock Status</option>
                <option value="low_stock">Low Stock</option>
                <option value="healthy">Healthy Stock</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>
          <div className="flex flex-row justify-end items-center gap-2 sm:gap-3 w-full sm:w-auto">
            <Button 
              variant="outlined"
              color="primary"
              onClick={() => setIsBulkUploadModalOpen(true)}
              sx={{ px: { xs: 1.5, sm: 3 }, py: 1, whiteSpace: 'nowrap', minWidth: 'auto', fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}
            >
              Bulk Upload
            </Button>
            <Button 
              variant="contained"
              color="primary"
              onClick={() => navigate('/inventory/new')}
              sx={{ px: { xs: 1.5, sm: 3 }, py: 1, whiteSpace: 'nowrap', minWidth: 'auto', fontSize: { xs: '0.8125rem', sm: '0.875rem' } }}
            >
              Add Stock
            </Button>
          </div>
        </div>

        <DataTable 
          data={products}
          paginate
          columns={[
            {
              header: '__checkbox__',
              renderHeader: () => (
                <input
                  type="checkbox"
                  checked={isAllSelected}
                  ref={el => { if (el) el.indeterminate = isIndeterminate; }}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              ),
              id: 'select',
              className: 'w-10',
              cell: ({ row }) => (
                <input
                  type="checkbox"
                  checked={!!(row.id && selectedIds.has(row.id))}
                  onChange={() => row.id && toggleSelect(row.id)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              )
            },
            {
              header: 'Material Name',
              id: 'name',
              cell: ({ row }) => (
                <div
                  className="whitespace-nowrap cursor-pointer group"
                  onClick={() => navigate(`/inventory/edit?id=${row.id}`)}
                >
                  <p className="font-bold text-gray-900 group-hover:text-primary group-hover:underline transition-colors">{row.name}</p>
                  <p className="text-xs text-gray-400">SKU: {row.sku}</p>
                </div>
              )
            },
            {
              header: 'Category',
              id: 'category',
              cell: ({ row }) => <span className="whitespace-nowrap text-gray-600 text-sm">{row.category?.name || '-'}</span>
            },
            {
              header: 'Supplier',
              id: 'supplier',
              cell: ({ row }) => <span className="whitespace-nowrap text-gray-600 text-sm">{row.supplier?.name || '-'}</span>
            },
            {
              header: 'Quantity',
              id: 'quantity',
              cell: ({ row }) => {
                const threshold = (row as any).min_stock ?? (row as any).reorderPoint ?? 0;
                return (
                  <div className="whitespace-nowrap text-gray-600">
                    <p className="font-medium text-gray-900">{row.quantity} {row.unit?.name || 'units'}</p>
                    <p className="text-xs text-gray-400">Min: {threshold} {row.unit?.name || 'units'}</p>
                  </div>
                );
              }
            },
            {
              header: 'WAC Valuation',
              id: 'wac',
              cell: ({ row }) => (
                <div className="whitespace-nowrap">
                  <p className="text-gray-600 text-sm">Price: {format(row.wacPrice || row.cost_price || 0)}</p>
                  <p className="font-medium text-primary text-sm">Total: {format(row.wacValue || (Number(row.quantity || 0) * Number(row.cost_price || 0)))}</p>
                </div>
              )
            },
            {
              header: 'FIFO Valuation',
              id: 'fifo',
              cell: ({ row }) => (
                <div className="whitespace-nowrap">
                  <p className="text-gray-600 text-sm">Price: {format(row.fifoPrice || row.cost_price || 0)}</p>
                  <p className="font-medium text-primary text-sm">Total: {format(row.fifoValue || (Number(row.quantity || 0) * Number(row.cost_price || 0)))}</p>
                </div>
              )
            },
            {
              header: 'Active Status',
              id: 'active_status',
              cell: ({ row }) => (
                <span className={`whitespace-nowrap px-3 py-1 font-medium text-xs rounded-full ${row.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                  {row.status || 'Active'}
                </span>
              )
            },
            {
              header: 'Stock Status',
              id: 'status',
              cell: ({ row }) => {
                const threshold = (row as any).min_stock ?? (row as any).reorderPoint ?? 0;
                const isLowStock = row.quantity <= threshold;
                return (
                  <span className={`whitespace-nowrap px-3 py-1 font-medium text-xs rounded-full ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-primary-50 text-primary-600'}`}>
                    {isLowStock ? 'Low Stock' : 'Healthy'}
                  </span>
                );
              }
            },
            {
              header: 'Actions',
              id: 'actions',
              className: 'text-right',
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-2 whitespace-nowrap">
                  <Tooltip title="Edit">
                    <IconButton size="small" color="primary" onClick={() => navigate(`/inventory/edit?id=${row.id}`)}>
                      <Pencil className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete">
                    <IconButton size="small" color="error" onClick={() => row.id && handleDelete(row.id)}>
                      <Trash2 className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </div>
              )
            }
          ]}
        />
      </div>

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
                <button onClick={handleDownloadSample} className="text-primary ml-1 hover:underline font-medium">Download sample template.</button>
              </p>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setBulkUploadFile(e.target.files ? e.target.files[0] : null)}
                className="block w-full text-sm text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-sm file:font-medium
                  file:bg-primary-bg file:text-primary
                  hover:file:opacity-90 cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-3 mt-8">
              <Button
                type="button"
                variant="text"
                color="inherit"
                onClick={() => setIsBulkUploadModalOpen(false)}
                sx={{ px: 2.5, py: 1, color: 'text.secondary', fontWeight: 600 }}
              >
                Cancel
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleBulkUpload}
                disabled={!bulkUploadFile || isUploading}
                sx={{ px: 3.5, py: 1, fontWeight: 600 }}
              >
                {isUploading ? 'Uploading...' : 'Upload'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
