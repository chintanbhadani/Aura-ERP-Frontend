import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  X,
  Check,
  Share2,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Pencil,
  FileSpreadsheet,
  Info,
  Boxes,
  History,
} from 'lucide-react';
import { IconButton } from '@mui/material';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { ListViewLayout } from '../../components/ListViewLayout';
import { CompactTable, type ColumnDef } from '../../components/CompactTable';
import { Button } from '../../components/Button';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import {
  fetchStockEntries,
  createStockEntry,
  updateStockEntry,
  deleteStockEntry,
  fetchInventory,
  deleteProduct,
  bulkUploadInventory,
  type Product,
} from '../../services/api';
import { successToast, errorToast } from '../../helper/toast';
import { ReusableAutocomplete } from '../../components/input/index';
import { useCurrency } from '../../helper/currency';

interface StockEntryItem {
  id: string;
  productId: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    location?: string;
  };
  date: string;
  type: string;
  quantityChange: number;
  runningBalance: number;
  invoiceId?: string | null;
  invoice?: {
    id: string;
    invoiceNumber: string;
    type: 'PURCHASE' | 'SALES';
    date: string;
    client?: { companyName: string };
    supplier?: { name: string };
  } | null;
  createdAt: string;
}

function StockEntryListBase() {
  const navigate = useNavigate();
  const { format } = useCurrency();

  // Navigation tab: 'inventory' (Inventory List) vs 'entries' (Stock Movement Log)
  const [activeTab, setActiveTab] = useState<'inventory' | 'entries'>('inventory');

  // Inventory Products State
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryLoading, setInventoryLoading] = useState(true);
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low_stock' | 'healthy' | 'out_of_stock'>('all');

  // Stock Movement Entries State
  const [stockEntries, setStockEntries] = useState<StockEntryItem[]>([]);
  const [entriesLoading, setEntriesLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);

  // Modal State for Add / Edit Stock Entry
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<StockEntryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state for Stock Entry
  const [selectedProductId, setSelectedProductId] = useState('');
  const [entryType, setEntryType] = useState<'STOCK_RECEIPT' | 'MATERIAL_ISSUE' | 'ADJUSTMENT'>('STOCK_RECEIPT');
  const [quantity, setQuantity] = useState<number | ''>('');
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');

  // Bulk Upload Modal State
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // URL search params & filter states
  const [searchParams, setSearchParams] = useSearchParams();
  const [localSearch, setLocalSearch] = useState(searchParams.get('search') || '');
  const [localType, setLocalType] = useState(searchParams.get('type') || 'ALL');

  useEffect(() => {
    setLocalSearch(searchParams.get('search') || '');
    setLocalType(searchParams.get('type') || 'ALL');
  }, [searchParams]);

  // Load Inventory Products List
  const loadInventory = async () => {
    setInventoryLoading(true);
    try {
      const search = searchParams.get('search') || '';
      const data = await fetchInventory(search, stockStatusFilter);
      setProducts(data);
    } catch (error) {
      console.error('Failed to load inventory products:', error);
      errorToast('Failed to load inventory products');
    } finally {
      setInventoryLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventory') {
      loadInventory();
    }
  }, [activeTab, searchParams, stockStatusFilter]);

  // Load Stock Entries Movement Log
  const loadStockEntries = async () => {
    setEntriesLoading(true);
    try {
      const queryParams: Record<string, string> = {};
      const search = searchParams.get('search');
      const type = searchParams.get('type');

      if (search) queryParams.search = search;
      if (type && type !== 'ALL') queryParams.type = type;

      const entriesData = await fetchStockEntries(queryParams);
      setStockEntries(entriesData);
    } catch (error) {
      console.error('Failed to load stock entries:', error);
      errorToast('Failed to load stock entries');
    } finally {
      setEntriesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'entries') {
      loadStockEntries();
    }
  }, [activeTab, searchParams]);

  // Debounce input changes for filters by 350ms
  useEffect(() => {
    const timer = setTimeout(() => {
      const newParams = new URLSearchParams(searchParams);

      if (localSearch.trim()) newParams.set('search', localSearch.trim());
      else newParams.delete('search');

      if (localType !== 'ALL') newParams.set('type', localType);
      else newParams.delete('type');

      if (newParams.toString() !== searchParams.toString()) {
        setSearchParams(newParams, { replace: true });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [localSearch, localType]);

  // Also fetch all products list once for dropdown selection in Add Stock modal
  useEffect(() => {
    fetchInventory().then((data) => setProducts(data)).catch(() => {});
  }, []);

  // Handle open Add Stock Modal
  const handleOpenCreateModal = (productId?: string) => {
    setEditingEntry(null);
    setSelectedProductId(productId || '');
    setEntryType('STOCK_RECEIPT');
    setQuantity('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsStockModalOpen(true);
  };

  // Handle open Edit Stock Modal
  const handleOpenEditModal = (entry: StockEntryItem) => {
    setEditingEntry(entry);
    setSelectedProductId(entry.productId);
    setEntryType(
      entry.type === 'SALES' || entry.type === 'MATERIAL_ISSUE'
        ? 'MATERIAL_ISSUE'
        : entry.type === 'PURCHASE' || entry.type === 'STOCK_RECEIPT'
        ? 'STOCK_RECEIPT'
        : 'ADJUSTMENT'
    );
    setQuantity(Math.abs(entry.quantityChange));
    setEntryDate(new Date(entry.date).toISOString().split('T')[0]);
    setNotes('');
    setIsStockModalOpen(true);
  };

  // Submit manual stock entry
  const handleSubmitStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      errorToast('Please select a Product / SKU');
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      errorToast('Please enter a valid positive quantity');
      return;
    }

    setSubmitting(true);
    try {
      const qtyNum = Number(quantity);
      const calculatedQtyChange = entryType === 'MATERIAL_ISSUE' ? -qtyNum : qtyNum;

      if (editingEntry) {
        await updateStockEntry(editingEntry.id, {
          quantityChange: calculatedQtyChange,
          type: entryType,
          date: entryDate,
        });
        successToast('Stock entry updated successfully');
      } else {
        await createStockEntry({
          productId: selectedProductId,
          type: entryType,
          quantityChange: calculatedQtyChange,
          date: entryDate,
          notes,
        });
        successToast('Stock entry added successfully');
      }

      setIsStockModalOpen(false);
      loadInventory();
      loadStockEntries();
    } catch (error: any) {
      console.error('Failed to save stock entry:', error);
      errorToast(error.message || 'Failed to save stock entry');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Stock Entry
  const handleDeleteEntry = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this stock entry? Product quantity will be reverted.')) {
      return;
    }
    try {
      await deleteStockEntry(id);
      successToast('Stock entry deleted');
      loadInventory();
      loadStockEntries();
    } catch (error: any) {
      console.error('Failed to delete stock entry:', error);
      errorToast(error.message || 'Failed to delete stock entry');
    }
  };

  // Delete Product
  const handleDeleteProduct = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      successToast('Product deleted successfully');
      loadInventory();
    } catch (error: any) {
      console.error('Error deleting product:', error);
      errorToast(error?.response?.data?.error || 'Failed to delete product');
    }
  };

  // Handle Bulk Upload Submit
  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) return;
    setIsUploading(true);
    try {
      const response = await bulkUploadInventory(bulkUploadFile);
      successToast(response.message || 'Bulk upload successful');
      setIsBulkUploadModalOpen(false);
      setBulkUploadFile(null);
      loadInventory();
    } catch (error: any) {
      console.error('Bulk upload error:', error);
      errorToast(error?.response?.data?.error || 'Failed to upload file');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownloadSample = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,sku,name,quantity,cost_price,selling_price,min_stock,categoryName,supplierName,unitName\n' +
      'MAT-001,Example Material,100,10.50,15.00,20,Raw Materials,Example Supplier,kg\n';
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'inventory_sample.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  // Columns for Inventory List (CompactTable)
  const inventoryColumns: ColumnDef[] = [
    {
      key: 'name',
      title: 'Material Name',
      filterable: true,
      render: (_, row: Product) => (
        <div
          className="cursor-pointer group"
          onClick={() => navigate(`/products/edit?id=${row.id}`)}
        >
          <div className="font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
            {row.name}
          </div>
          <div className="text-xs text-gray-400 font-mono">SKU: {row.sku}</div>
        </div>
      ),
    },
    {
      key: 'category',
      title: 'Category',
      filterable: true,
      render: (_, row: Product) => (
        <span className="text-gray-700 font-medium">{row.category?.name || '-'}</span>
      ),
    },
    {
      key: 'supplier',
      title: 'Supplier',
      filterable: true,
      render: (_, row: Product) => (
        <span className="text-gray-700 font-medium">{row.supplier?.name || '-'}</span>
      ),
    },
    {
      key: 'quantity',
      title: 'Quantity',
      filterable: true,
      render: (_, row: Product) => {
        const threshold = (row as any).min_stock ?? 0;
        return (
          <div>
            <div className="font-bold text-gray-900">
              {row.quantity} {row.unit?.name || 'units'}
            </div>
            <div className="text-xs text-gray-400">
              Min: {threshold} {row.unit?.name || 'units'}
            </div>
          </div>
        );
      },
    },
    {
      key: 'wacValuation',
      title: 'WAC Valuation',
      filterable: false,
      render: (_, row: Product) => (
        <div>
          <div className="text-gray-500 text-xs">
            Price: {format((row as any).wacPrice || row.cost_price || 0)}
          </div>
          <div className="font-bold text-emerald-700 text-xs">
            Total:{' '}
            {format(
              (row as any).wacValue || Number(row.quantity || 0) * Number(row.cost_price || 0)
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'fifoValuation',
      title: 'FIFO Valuation',
      filterable: false,
      render: (_, row: Product) => (
        <div>
          <div className="text-gray-500 text-xs">
            Price: {format((row as any).fifoPrice || row.cost_price || 0)}
          </div>
          <div className="font-bold text-emerald-700 text-xs">
            Total:{' '}
            {format(
              (row as any).fifoValue || Number(row.quantity || 0) * Number(row.cost_price || 0)
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Stock Status',
      filterable: true,
      render: (_, row: Product) => {
        const threshold = (row as any).min_stock ?? 0;
        const isOutOfStock = row.quantity <= 0;
        const isLowStock = !isOutOfStock && row.quantity <= threshold;

        let badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        let label = 'Healthy';

        if (isOutOfStock) {
          badgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
          label = 'Out of Stock';
        } else if (isLowStock) {
          badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
          label = 'Low Stock';
        }

        return (
          <span className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border ${badgeClass}`}>
            {label}
          </span>
        );
      },
    },
  ];

  // Columns for Stock Entries (CompactTable)
  const stockEntryColumns: ColumnDef[] = [
    {
      key: 'invoiceNumber',
      title: 'Reference / Invoice #',
      filterable: true,
      render: (_, row: StockEntryItem) => (
        <span className="font-semibold text-gray-900">
          {row.invoice?.invoiceNumber || `SE-${row.id.slice(0, 8).toUpperCase()}`}
        </span>
      ),
    },
    {
      key: 'type',
      title: 'Stock Entry Type',
      filterable: true,
      render: (val, row: StockEntryItem) => {
        let badgeStyle = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        let icon = <ArrowDownLeft className="w-3 h-3 inline mr-1" />;

        if (val === 'SALES' || val === 'MATERIAL_ISSUE') {
          badgeStyle = 'bg-blue-50 text-blue-700 border-blue-200';
          icon = <ArrowUpRight className="w-3 h-3 inline mr-1" />;
        } else if (val === 'ADJUSTMENT') {
          badgeStyle = 'bg-purple-50 text-purple-700 border-purple-200';
          icon = <RefreshCw className="w-3 h-3 inline mr-1" />;
        }

        return (
          <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold border ${badgeStyle} inline-flex items-center`}>
            {icon} {val}
          </span>
        );
      },
    },
    {
      key: 'product',
      title: 'Product & SKU',
      filterable: true,
      render: (_, row: StockEntryItem) => (
        <div>
          <div className="font-medium text-gray-900">{row.product?.name || '-'}</div>
          {row.product?.sku && (
            <div className="text-xs text-gray-500 font-mono">SKU: {row.product.sku}</div>
          )}
        </div>
      ),
    },
    {
      key: 'company',
      title: 'Party / Department',
      filterable: true,
      render: (_, row: StockEntryItem) => {
        const partyName =
          row.invoice?.type === 'SALES' ? row.invoice.client?.companyName : row.invoice?.supplier?.name;
        return <span className="text-gray-600 font-medium">{partyName || '-'}</span>;
      },
    },
    {
      key: 'actionType',
      title: 'Action (Credited/Debited)',
      filterable: true,
      render: (_, row: StockEntryItem) => {
        const isPositive = Number(row.quantityChange) >= 0;
        return (
          <span
            className={`px-2 py-0.5 rounded text-[11px] font-bold border inline-flex items-center gap-1 ${
              isPositive
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-rose-100 text-rose-800 border-rose-300'
            }`}
          >
            {isPositive ? '🟢 Credited (Add)' : '🔴 Debited (Subtract)'}
          </span>
        );
      },
    },
    {
      key: 'quantityChange',
      title: 'Quantity Change',
      filterable: true,
      render: (val: number) => {
        const isPositive = Number(val) >= 0;
        return (
          <span className={`font-bold font-mono ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isPositive ? `+${val}` : val}
          </span>
        );
      },
    },
    {
      key: 'runningBalance',
      title: 'Running Stock',
      filterable: true,
      render: (val: number) => (
        <span className="font-semibold text-gray-800 bg-gray-100 px-2 py-0.5 rounded text-xs">
          {val} units
        </span>
      ),
    },
    {
      key: 'date',
      title: 'Date',
      filterable: true,
      render: (val) => <span className="text-gray-600">{new Date(val).toLocaleDateString()}</span>,
    },
  ];

  const hasActiveFilters = Boolean(localSearch || localType !== 'ALL' || stockStatusFilter !== 'all');

  const filterControls = (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
            Search
          </label>
          <input
            type="text"
            placeholder={activeTab === 'inventory' ? 'Search by name or SKU...' : 'Search product, SKU, invoice #...'}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
          />
        </div>

        {activeTab === 'inventory' ? (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Stock Status
            </label>
            <select
              value={stockStatusFilter}
              onChange={(e) => setStockStatusFilter(e.target.value as any)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none cursor-pointer"
            >
              <option value="all">All Stock Status</option>
              <option value="healthy">Healthy Stock</option>
              <option value="low_stock">Low Stock</option>
              <option value="out_of_stock">Out of Stock</option>
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Transaction Type
            </label>
            <select
              value={localType}
              onChange={(e) => setLocalType(e.target.value)}
              className="w-full bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none cursor-pointer"
            >
              <option value="ALL">All Types</option>
              <option value="PURCHASE">Purchase Invoices (+Stock)</option>
              <option value="SALES">Sales Invoices (-Stock)</option>
              <option value="STOCK_RECEIPT">Stock Receipts (+Stock)</option>
              <option value="MATERIAL_ISSUE">Material Issues (-Stock)</option>
              <option value="ADJUSTMENT">Stock Adjustments</option>
            </select>
          </div>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex justify-between items-center pt-1 border-t border-gray-100 mt-2">
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-primary-600 bg-white border border-gray-200 px-2.5 py-1 rounded-md shadow-sm transition-colors cursor-pointer"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Share2 className="w-3.5 h-3.5" />}
            {copiedUrl ? 'Filtered URL Copied!' : 'Copy Filter URL'}
          </button>
          <button
            onClick={() => {
              setLocalSearch('');
              setLocalType('ALL');
              setStockStatusFilter('all');
              setSearchParams(new URLSearchParams(), { replace: true });
            }}
            className="text-xs font-medium text-red-600 hover:text-red-700 underline cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      )}
    </div>
  );

  return (
    <DashboardLayout>
      <div className="space-y-4">
        {/* Top Header Buttons Bar */}
        <div className="flex justify-between items-center px-4 pt-4">
          {/* Tab Switcher */}
          <div className="flex bg-gray-100 p-1 rounded-xl max-w-sm">
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'inventory'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <Boxes className="w-3.5 h-3.5" />
              Inventory List
            </button>
            <button
              onClick={() => setActiveTab('entries')}
              className={`flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeTab === 'entries'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Stock Movement Log
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsBulkUploadModalOpen(true)}
              className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-primary-600 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-gray-500" />
              Bulk Upload
            </button>
          </div>
        </div>

        {/* Standard ListViewLayout with CompactTable */}
        <ListViewLayout
          title={activeTab === 'inventory' ? 'Inventory Management' : 'Stock Movement Log'}
          icon={Package}
          description={
            activeTab === 'inventory'
              ? 'Track real-time product stock levels, categories, suppliers, and inventory valuations.'
              : 'Track purchase stock additions from GRNs, sales deductions, and manual stock entries.'
          }
          onAdd={() => handleOpenCreateModal()}
          searchPlaceholder={
            activeTab === 'inventory'
              ? 'Search by Product Name, SKU...'
              : 'Search by Product Name, SKU, Invoice #, Type...'
          }
          searchValue={localSearch}
          onSearchChange={setLocalSearch}
          filters={filterControls}
        >
          {activeTab === 'inventory' ? (
            <CompactTable
              columns={inventoryColumns}
              data={products}
              loading={inventoryLoading}
              renderActions={(row: Product) => (
                <div className="flex items-center justify-end gap-1.5 cursor-pointer">
                  <button
                    type="button"
                    title="Add / Adjust Stock"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenCreateModal(row.id);
                    }}
                    className="p-1 hover:bg-emerald-50 rounded text-emerald-600 transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Edit Product"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/products/edit?id=${row.id}`);
                    }}
                    className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-primary-600 transition-colors cursor-pointer"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    title="Delete Product"
                    onClick={(e) => {
                      e.stopPropagation();
                      row.id && handleDeleteProduct(row.id);
                    }}
                    className="p-1 hover:bg-rose-50 rounded text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            />
          ) : (
            <CompactTable
              columns={stockEntryColumns}
              data={stockEntries}
              loading={entriesLoading}
              renderActions={(row: StockEntryItem) => (
                <div className="flex items-center gap-1 cursor-pointer">
                  {!row.invoiceId && (
                    <>
                      <Edit2
                        className="w-4 h-4 text-gray-400 hover:text-primary-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(row);
                        }}
                      />
                      <Trash2
                        className="w-4 h-4 text-gray-400 hover:text-red-600 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteEntry(row.id);
                        }}
                      />
                    </>
                  )}
                </div>
              )}
            />
          )}
        </ListViewLayout>
      </div>

      {/* Add / Edit Stock Entry Modal */}
      {isStockModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  {editingEntry ? 'Edit Stock Entry' : 'Add New Stock Entry'}
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  Add manual stock receipts, material issues, or inventory adjustments.
                </p>
              </div>
              <IconButton
                size="small"
                onClick={() => setIsStockModalOpen(false)}
                sx={{ color: 'text.secondary' }}
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>

            {/* Note banner explaining GRN auto-stock addition */}
            <div className="bg-blue-50 border-b border-blue-100 px-6 py-3 flex items-start gap-2.5 text-xs text-blue-800">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Automated GRN Ingestion:</span> Purchase stock is automatically ingested into inventory when a <b>Goods Receipt Note (GRN)</b> is Accepted.
              </div>
            </div>

            <form onSubmit={handleSubmitStockEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Select Product / SKU *
                </label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none cursor-pointer"
                >
                  <option value="">-- Select Product / SKU --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku}) - {p.quantity} units in stock
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Stock Entry Type *
                </label>
                <select
                  value={entryType}
                  onChange={(e) => setEntryType(e.target.value as any)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none cursor-pointer"
                >
                  <option value="STOCK_RECEIPT">Stock Receipt (+ Stock)</option>
                  <option value="MATERIAL_ISSUE">Material Issue / Usage (- Stock)</option>
                  <option value="ADJUSTMENT">Stock Count Adjustment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Quantity *
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="Enter quantity"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : '')}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Entry Date *
                </label>
                <input
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Notes / Reason (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Enter notes or reason for adjustment..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  color="secondary"
                  onClick={() => setIsStockModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" variant="primary" color="primary" disabled={submitting}>
                  {submitting ? 'Saving...' : editingEntry ? 'Update Entry' : 'Add Stock Entry'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
            <div className="flex justify-between items-center mb-4 border-b border-gray-100 pb-3">
              <h2 className="text-xl font-bold text-gray-900">Bulk Upload Inventory</h2>
              <IconButton size="small" onClick={() => setIsBulkUploadModalOpen(false)}>
                <X className="w-5 h-5 text-gray-400" />
              </IconButton>
            </div>
            <div className="mb-4">
              <p className="text-xs text-gray-600 mb-4">
                Upload a CSV or Excel file to bulk import product stock entries.{' '}
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="text-primary-600 hover:underline font-semibold"
                >
                  Download sample CSV template.
                </button>
              </p>
              <input
                type="file"
                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                onChange={(e) => setBulkUploadFile(e.target.files ? e.target.files[0] : null)}
                className="block w-full text-xs text-gray-500
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-full file:border-0
                  file:text-xs file:font-semibold
                  file:bg-primary-50 file:text-primary-700
                  hover:file:bg-primary-100 cursor-pointer"
              />
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-3 border-t border-gray-100">
              <Button
                type="button"
                size="sm"
                variant="outline"
                color="secondary"
                onClick={() => setIsBulkUploadModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                color="primary"
                onClick={handleBulkUploadSubmit}
                disabled={!bulkUploadFile || isUploading}
              >
                {isUploading ? 'Uploading...' : 'Upload File'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export const StockEntryList = WithAuth(StockEntryListBase, ModuleName.STOCK_ENTRIES, Permission.LIST);
export default StockEntryList;
