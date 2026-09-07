import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Eye, X, Printer, Download } from 'lucide-react';
import { Button, IconButton, Tooltip } from '@mui/material';
import { fetchInvoices } from '../services/api';
import type { Invoice } from '../types';
import { printInvoice, downloadInvoicePdf } from '../helper/invoicePrinter';

export const InvoiceList: React.FC = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadInvoices();
  }, []);

  const loadInvoices = async () => {
    try {
      const data = await fetchInvoices();
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
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Invoice List</h2>
          </div>
          <Button 
            variant="contained"
            color="primary"
            startIcon={<Plus className="w-4 h-4" />}
            onClick={() => navigate('/invoices/new')}
            sx={{ px: 3, py: 1, fontWeight: 600 }}
          >
            Create Invoice
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-500">Invoice #</th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-500">Type</th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-500">Date</th>
                <th className="px-3 py-4 text-left text-sm font-semibold text-gray-500">Entity</th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-500">Total Amount</th>
                <th className="px-3 py-4 text-right text-sm font-semibold text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-4 whitespace-nowrap text-gray-900 font-medium">{invoice.invoiceNumber}</td>
                  <td className="px-3 py-4 whitespace-nowrap">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                      invoice.type === 'SALES' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                    }`}>
                      {invoice.type}
                    </span>
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-gray-600 text-sm">
                    {invoice.type === 'SALES' ? invoice.customer?.name : invoice.supplier?.name}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right text-gray-900 font-medium">
                    ${Number(invoice.totalAmount).toFixed(2)}
                  </td>
                  <td className="px-3 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => setSelectedInvoice(invoice)} 
                        >
                          <Eye className="w-4 h-4" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Print Invoice">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => printInvoice(invoice)} 
                        >
                          <Printer className="w-4 h-4" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download PDF">
                        <IconButton 
                          size="small"
                          color="primary"
                          onClick={() => downloadInvoicePdf(invoice)} 
                        >
                          <Download className="w-4 h-4" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
                  <p className="text-sm font-bold text-gray-900">${Number(selectedInvoice.totalAmount).toFixed(2)}</p>
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
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">${Number(item.unitPrice).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${Number(item.totalPrice).toFixed(2)}</td>
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
                onClick={() => selectedInvoice && printInvoice(selectedInvoice)}
                sx={{ px: 2.5, py: 1 }}
              >
                Print
              </Button>
              <Button 
                variant="contained"
                color="primary"
                startIcon={<Download className="w-4 h-4" />}
                onClick={() => selectedInvoice && downloadInvoicePdf(selectedInvoice)}
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
