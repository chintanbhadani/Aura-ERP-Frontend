import React, { useEffect, useState } from 'react';
import { fetchDailyCashFlow } from '../services/api';
import { useCurrency } from '../helper/currency';
import { DataTable } from './Table/DataTable';
import { Calendar, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'react-toastify';
import { TrendingUp, ShoppingBag, Wallet } from 'lucide-react';

export const DailyCashPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7); // Default to last 7 days
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const { format } = useCurrency();

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await fetchDailyCashFlow(startDate, endDate);
      // Sort by date descending for better view
      const sortedData = response.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setData(sortedData);
    } catch (error) {
      console.error('Failed to load daily cash flow:', error);
      toast.error('Failed to load daily cash flow report');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [startDate, endDate]);

  const todayStr = new Date().toISOString().split('T')[0];
  const todayData = data.find(d => {
    const dStr = new Date(d.date).toISOString().split('T')[0];
    return dStr === todayStr;
  });

  const todaySales = todayData?.sales || 0;
  const todayPurchases = todayData?.purchases || 0;
  const todayClosing = todayData?.closingBalance || 0;
  const todayOpening = todayData?.openingBalance || 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Daily Cash Flow</h1>
          <p className="text-gray-500 mt-1">Track your daily balances, sales, purchases, and expenses.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">Start Date</label>
            <div className="relative">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-gray-700"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">End Date</label>
            <div className="relative">
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-auto px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all text-gray-700"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today Opening</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{format(todayOpening)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today Sales</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{format(todaySales)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 rounded-xl text-red-500">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today Purchases</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{format(todayPurchases)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-primary-50 rounded-xl text-primary">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Today Closing</p>
            <h3 className="text-2xl font-bold text-gray-900 mt-0.5">{format(todayClosing)}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm border border-gray-100 rounded-3xl p-6">
        <DataTable 
          data={data}
          paginate
          columns={[
            {
              header: 'Date',
              id: 'date',
              cell: ({ row }) => (
                <div className="flex items-center gap-2 text-gray-900 font-bold whitespace-nowrap">
                  <Calendar className="w-4 h-4 text-primary" />
                  <span>
                    {new Date(row.date).toLocaleDateString('en-GB', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              ),
            },
            {
              header: 'Opening Bal',
              id: 'openingBalance',
              cell: ({ row }) => <span className={`font-medium ${row.openingBalance === 0 ? 'text-gray-300' : 'text-gray-600'}`}>{format(row.openingBalance)}</span>,
            },
            {
              header: 'Total Sales',
              id: 'sales',
              cell: ({ row }) => <span className={`font-semibold ${row.sales === 0 ? 'text-gray-300' : 'text-emerald-600'}`}>{row.sales === 0 ? '-' : format(row.sales)}</span>,
            },
            {
              header: 'Cash Sales',
              id: 'cashSales',
              cell: ({ row }) => <span className={row.cashSales === 0 ? 'text-gray-300' : 'text-emerald-600'}>{row.cashSales === 0 ? '-' : format(row.cashSales)}</span>,
            },
            {
              header: 'Bank Sales',
              id: 'bankSales',
              cell: ({ row }) => <span className={row.bankSales === 0 ? 'text-gray-300' : 'text-emerald-600'}>{row.bankSales === 0 ? '-' : format(row.bankSales)}</span>,
            },
            {
              header: 'Purchases',
              id: 'purchases',
              cell: ({ row }) => <span className={`font-semibold ${row.purchases === 0 ? 'text-gray-300' : 'text-red-500'}`}>{row.purchases === 0 ? '-' : format(row.purchases)}</span>,
            },
            {
              header: 'Expenses',
              id: 'expenses',
              cell: ({ row }) => <span className={`font-medium ${row.expenses === 0 ? 'text-gray-300' : 'text-red-500'}`}>{row.expenses === 0 ? '-' : format(row.expenses)}</span>,
            },
            {
              header: 'Pay In',
              id: 'paymentsIn',
              cell: ({ row }) => (
                <div className={`flex items-center gap-1 font-medium ${row.paymentsIn === 0 ? 'text-gray-300' : 'text-emerald-600'}`}>
                  {row.paymentsIn > 0 && <ArrowUpRight className="w-3 h-3" />}
                  <span>{row.paymentsIn === 0 ? '-' : format(row.paymentsIn)}</span>
                </div>
              ),
            },
            {
              header: 'Pay Out',
              id: 'paymentsOut',
              cell: ({ row }) => (
                <div className={`flex items-center gap-1 font-medium ${row.paymentsOut === 0 ? 'text-gray-300' : 'text-red-500'}`}>
                  {row.paymentsOut > 0 && <ArrowDownRight className="w-3 h-3" />}
                  <span>{row.paymentsOut === 0 ? '-' : format(row.paymentsOut)}</span>
                </div>
              ),
            },
            {
              header: 'Closing Bal',
              id: 'closingBalance',
              cell: ({ row }) => (
                <span className={`font-bold px-3 py-1 rounded-lg ${row.closingBalance === 0 ? 'text-gray-400 bg-gray-50/50' : 'text-gray-900 bg-gray-50'}`}>
                  {format(row.closingBalance)}
                </span>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
};
