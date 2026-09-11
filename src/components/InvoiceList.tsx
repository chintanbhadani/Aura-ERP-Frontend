import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Eye, X, Printer, Download, Search, Filter } from 'lucide-react';
import { Button, IconButton, Tooltip } from '@mui/material';
import { fetchInvoices } from '../services/api';
import type { Invoice } from '../types';
import { printInvoice, downloadInvoicePdf } from '../helper/invoicePrinter';
import { useCurrency } from '../helper/currency';
import { DataTable } from './Table/DataTable';

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'SALES' | 'PURCHASE'>('ALL');
  const navigate = useNavigate();
  const { format, currency } = useCurrency();

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

  const isAllSelected = invoices.length > 0 && invoices.every(inv => selectedIds.has(inv.id));
  const isIndeterminate = !isAllSelected && invoices.some(inv => selectedIds.has(inv.id));

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        invoices.forEach(inv => next.delete(inv.id));
        return next;
      });
    } else {
      setSelectedIds(prev => {
        const next = new Set(prev);
        invoices.forEach(inv => next.add(inv.id));
        return next;
      });
    }
  };

  useEffect(() => {
    loadInvoices();
  }, [search, typeFilter]);

  const loadInvoices = async () => {
    try {
      const data = await fetchInvoices(search, typeFilter);
      setInvoices(data);
    } catch (error) {
      console.error('Failed to load invoices', error);
    }
  };

  return (
    <div className="w-full">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
        <p className="text-gray-500 mt-1">Manage purchase and sales invoices.</p>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              <h2 className="text-xl font-bold text-gray-900">Invoice List</h2>
            </div>
            <div className="flex flex-row gap-3 w-full sm:w-auto justify-end">
              <Button 
                variant="contained"
                color="primary"
                startIcon={<Plus className="w-4 h-4" />}
                onClick={() => navigate('/invoices/new')}
                sx={{ px: 3, py: 1, fontWeight: 600, whiteSpace: 'nowrap', borderRadius: '9999px' }}
              >
                Create Invoice
              </Button>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by Invoice #..." 
                className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-full sm:w-64"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="relative flex-shrink-0 w-full sm:w-auto">
              <Filter className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                className="pl-9 pr-8 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer text-gray-700 w-full sm:w-auto"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="ALL">All Types</option>
                <option value="SALES">Sales</option>
                <option value="PURCHASE">Purchase</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            {(search || typeFilter !== 'ALL') && (
              <button
                type="button"
                onClick={() => { setSearch(''); setTypeFilter('ALL'); }}
                className="text-sm text-gray-500 hover:text-red-500 font-medium px-2 transition-colors whitespace-nowrap"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        <DataTable 
          data={invoices}
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
                  checked={selectedIds.has(row.id)}
                  onChange={() => toggleSelect(row.id)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 accent-primary cursor-pointer"
                />
              )
            },
            {
              header: 'Invoice #',
              id: 'invoiceNumber',
              cell: ({ row }) => <span className="whitespace-nowrap text-gray-900 font-medium">{row.invoiceNumber}</span>
            },
            {
              header: 'Type',
              id: 'type',
              cell: ({ row }) => (
                <span className={`whitespace-nowrap px-2.5 py-1 rounded-full text-xs font-semibold ${row.type === 'SALES' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'}`}>
                  {row.type}
                </span>
              )
            },
            {
              header: 'Date',
              id: 'date',
              cell: ({ row }) => <span className="whitespace-nowrap text-gray-600 text-sm">{new Date(row.date).toLocaleDateString()}</span>
            },
            {
              header: 'Entity',
              id: 'entity',
              cell: ({ row }) => <span className="whitespace-nowrap text-gray-600 text-sm">{row.type === 'SALES' ? row.customer?.name : row.supplier?.name}</span>
            },
            {
              header: 'Total Amount',
              id: 'totalAmount',
              className: 'text-right',
              cell: ({ row }) => <span className="whitespace-nowrap text-gray-900 font-medium">{format(row.totalAmount)}</span>
            },
            {
              header: 'Actions',
              id: 'actions',
              className: 'text-right',
              cell: ({ row }) => (
                <div className="flex items-center justify-end gap-1 whitespace-nowrap">
                  <Tooltip title="View Details">
                    <IconButton size="small" color="primary" onClick={() => setSelectedInvoice(row)}>
                      <Eye className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Print Invoice">
                    <IconButton size="small" color="primary" onClick={() => printInvoice(row, currency)}>
                      <Printer className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Download PDF">
                    <IconButton size="small" color="primary" onClick={() => downloadInvoicePdf(row, currency)}>
                      <Download className="w-4 h-4" />
                    </IconButton>
                  </Tooltip>
                </div>
              )
            }
          ]}
        />
      </div>

      {selectedInvoice && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Invoice Details</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedInvoice.invoiceNumber}</p>
              </div>
              <IconButton 
                size="small"
                onClick={() => setSelectedInvoice(null)}
                sx={{ color: 'text.secondary' }}
              >
                <X className="w-5 h-5" />
              </IconButton>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Type</p>
                  <p className="text-sm font-medium text-gray-900">{selectedInvoice.type}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Date</p>
                  <p className="text-sm font-medium text-gray-900">{new Date(selectedInvoice.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    {selectedInvoice.type === 'SALES' ? 'Customer' : 'Supplier'}
                  </p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedInvoice.type === 'SALES' ? selectedInvoice.customer?.name : selectedInvoice.supplier?.name}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Amount</p>
                  <p className="text-sm font-bold text-gray-900">{format(selectedInvoice.totalAmount)}</p>
                </div>
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-3">Line Items</h3>
              <div className="border border-gray-100 rounded-2xl overflow-hidden">
                <table className="min-w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Product</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Price</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {selectedInvoice.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-900">{item.product?.name || item.productId}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{item.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">{format(item.unitPrice)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">{format(item.totalPrice)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end items-center gap-3">
              <Button 
                variant="outlined"
                color="primary"
                startIcon={<Printer className="w-4 h-4" />}
                onClick={() => selectedInvoice && printInvoice(selectedInvoice, currency)}
                sx={{ px: 2.5, py: 1 }}
              >
                Print
              </Button>
              <Button 
                variant="contained"
                color="primary"
                startIcon={<Download className="w-4 h-4" />}
                onClick={() => selectedInvoice && downloadInvoicePdf(selectedInvoice, currency)}
                sx={{ px: 3, py: 1 }}
              >
                Download PDF
              </Button>
              <Button 
                variant="text"
                color="inherit"
                onClick={() => setSelectedInvoice(null)}
                sx={{ px: 2.5, py: 1, color: 'text.secondary' }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default InvoiceList;
