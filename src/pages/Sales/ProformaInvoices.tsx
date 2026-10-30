import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { fetchClients } from '../../services/client.service';
import { 
  Building2, 
  Receipt, 
  Plus, 
  Calendar, 
  ArrowRight,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';

export interface ProformaRecord {
  id: string;
  piNumber: string;
  clientName: string;
  orderRef?: string;
  totalAmount: number;
  advanceReceived: number;
  advancePercentage: number;
  balanceDue: number;
  status: 'Issued' | 'Advance Paid' | 'Payment Pending' | 'Converted to Tax Invoice' | 'Draft';
  bankAccount?: string;
  piDate: string;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_PROFORMAS: ProformaRecord[] = [
  {
    id: 'pi-001',
    piNumber: 'PI-2024-001',
    clientName: 'Krishna Logistics & Cargo',
    orderRef: 'QT-2024-001',
    totalAmount: 1680000,
    advanceReceived: 504000,
    advancePercentage: 30,
    balanceDue: 1176000,
    status: 'Advance Paid',
    bankAccount: 'HDFC Bank - 50200012345678',
    piDate: new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'pi-002',
    piNumber: 'PI-2024-002',
    clientName: 'Apex Box Manufacturing',
    orderRef: 'QT-2024-002',
    totalAmount: 833000,
    advanceReceived: 0,
    advancePercentage: 50,
    balanceDue: 833000,
    status: 'Payment Pending',
    bankAccount: 'HDFC Bank - 50200012345678',
    piDate: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString()
  },
  {
    id: 'pi-003',
    piNumber: 'PI-2024-003',
    clientName: 'Shreeji Polymers Ltd',
    orderRef: 'QT-2024-003',
    totalAmount: 2970000,
    advanceReceived: 2970000,
    advancePercentage: 100,
    balanceDue: 0,
    status: 'Converted to Tax Invoice',
    bankAccount: 'ICICI Bank - 002105009876',
    piDate: new Date(Date.now() - 8 * 86400000).toISOString().slice(0, 10),
    createdAt: new Date(Date.now() - 8 * 86400000).toISOString()
  }
];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'piNumber', placeholder: 'PI #', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'clientName', placeholder: 'Client Name', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['PI #', 'Client Name', 'Status', 'Total Amount', 'Advance Paid'];

function ProformaInvoicesBase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [proformas, setProformas] = useState<ProformaRecord[]>(() => {
    try {
      const saved = localStorage.getItem('erp_crm_proformas');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_PROFORMAS;
  });

  const [clientsList, setClientsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Toolbar state
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({
    piNumber: '',
    clientName: searchParams.get('clientName') || searchParams.get('customerName') || '',
    status: ''
  });
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    clientName: searchParams.get('clientName') || searchParams.get('customerName') || '',
    orderRef: searchParams.get('quoteRef') || '',
    totalAmount: searchParams.get('amount') || '500000',
    advancePercentage: '30',
    advanceReceived: '150000',
    bankAccount: 'HDFC Bank - Current A/C',
    status: 'Issued' as ProformaRecord['status']
  });

  useEffect(() => {
    loadClients();
    const cName = searchParams.get('clientName') || searchParams.get('customerName');
    const quoteRef = searchParams.get('quoteRef');
    const amt = searchParams.get('amount');
    if (cName || quoteRef) {
      setShowModal(true);
      if (cName) setFormData(prev => ({ ...prev, clientName: cName }));
      if (quoteRef) setFormData(prev => ({ ...prev, orderRef: quoteRef }));
      if (amt) {
        const total = parseFloat(amt) || 0;
        const adv = total * 0.3;
        setFormData(prev => ({ ...prev, totalAmount: String(total), advanceReceived: String(adv) }));
      }
    }
  }, [searchParams]);

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      if (Array.isArray(data)) {
        setClientsList(data);
      }
    } catch (error) {
      console.error('Failed to load clients for proforma invoices', error);
    }
  };

  const saveProformas = (updated: ProformaRecord[]) => {
    setProformas(updated);
    try {
      localStorage.setItem('erp_crm_proformas', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateProforma = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName) {
      alert('Please enter or select a client name');
      return;
    }

    const nextNumber = `PI-2024-${String(proformas.length + 1).padStart(3, '0')}`;
    const total = parseFloat(formData.totalAmount) || 0;
    const adv = parseFloat(formData.advanceReceived) || 0;
    const advPct = total > 0 ? Math.round((adv / total) * 100) : 0;
    const balance = Math.max(0, total - adv);

    const newPI: ProformaRecord = {
      id: `pi-${Date.now()}`,
      piNumber: nextNumber,
      clientName: formData.clientName,
      orderRef: formData.orderRef || undefined,
      totalAmount: total,
      advanceReceived: adv,
      advancePercentage: advPct,
      balanceDue: balance,
      status: formData.status,
      bankAccount: formData.bankAccount,
      piDate: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString()
    };

    saveProformas([newPI, ...proformas]);
    setShowModal(false);
  };

  const handleQuickFilterChange = (key: string, value: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ piNumber: '', clientName: '', status: '' });
    setFilterRules([]);
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
  };

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.piNumber ||
    quickFilters.clientName ||
    quickFilters.status ||
    filterRules.length > 0 ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter
  );

  const filteredProformas = useMemo(() => {
    return proformas.filter(item => {
      if (quickFilters.piNumber && !item.piNumber.toLowerCase().includes(quickFilters.piNumber.toLowerCase())) {
        return false;
      }
      if (quickFilters.clientName && !item.clientName.toLowerCase().includes(quickFilters.clientName.toLowerCase())) {
        return false;
      }
      if (quickFilters.status && !item.status.toLowerCase().includes(quickFilters.status.toLowerCase())) {
        return false;
      }

      if (filterRules.length > 0) {
        for (const rule of filterRules) {
          if (!rule.value) continue;
          let targetVal = '';
          if (rule.field === 'PI #') targetVal = item.piNumber;
          else if (rule.field === 'Client Name') targetVal = item.clientName;
          else if (rule.field === 'Status') targetVal = item.status;
          else if (rule.field === 'Total Amount') targetVal = String(item.totalAmount);
          else if (rule.field === 'Advance Paid') targetVal = String(item.advanceReceived);

          const valLower = targetVal.toLowerCase();
          const ruleLower = rule.value.toLowerCase();
          if (rule.operator === 'Equals' && valLower !== ruleLower) return false;
          if (rule.operator === 'Contains' && !valLower.includes(ruleLower)) return false;
          if (rule.operator === 'Starts With' && !valLower.startsWith(ruleLower)) return false;
        }
      }

      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        const match =
          item.piNumber.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          (item.orderRef || '').toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'PI #') {
        comparison = a.piNumber.localeCompare(b.piNumber);
      } else if (sortField === 'Client Name') {
        comparison = a.clientName.localeCompare(b.clientName);
      } else if (sortField === 'Total Amount') {
        comparison = a.totalAmount - b.totalAmount;
      } else {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [proformas, globalSearch, quickFilters, filterRules, sortField, sortOrder]);

  const handleExportCSV = () => {
    if (filteredProformas.length === 0) return;
    const headers = ['PI #', 'Client Name', 'Order / Quote Ref', 'Total Amount (INR)', 'Advance Recd (INR)', 'Balance Due (INR)', 'Status', 'PI Date'];
    const rows = filteredProformas.map(item => [
      `"${item.piNumber}"`,
      `"${item.clientName.replace(/"/g, '""')}"`,
      `"${(item.orderRef || '').replace(/"/g, '""')}"`,
      item.totalAmount,
      item.advanceReceived,
      item.balanceDue,
      `"${item.status}"`,
      `"${item.piDate}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Proforma_Invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<ProformaRecord>[] = [
    {
      key: 'piNumber',
      title: 'PI Number',
      width: '140px',
      render: (_, row) => (
        <span className="font-bold text-xs text-primary-600 hover:text-primary-800 font-mono hover:underline cursor-pointer">
          {row.piNumber}
        </span>
      )
    },
    {
      key: 'clientName',
      title: 'Client Name',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="font-semibold text-xs text-gray-900 hover:text-emerald-700 transition-colors">
            {row.clientName}
          </span>
        </div>
      )
    },
    {
      key: 'orderRef',
      title: 'Quote / Order Ref',
      width: '150px',
      render: (val) => (
        val ? (
          <span className="text-xs font-mono text-gray-600 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded">
            {val}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      )
    },
    {
      key: 'totalAmount',
      title: 'Total Amount',
      width: '140px',
      render: (val) => (
        <span className="font-mono text-xs font-bold text-gray-900">
          ₹{Number(val || 0).toLocaleString('en-IN')}
        </span>
      )
    },
    {
      key: 'advanceReceived',
      title: 'Advance Recd',
      width: '150px',
      render: (_, row) => {
        const pct = row.totalAmount > 0 ? Math.round((row.advanceReceived / row.totalAmount) * 100) : 0;
        return (
          <div>
            <span className="font-mono text-xs font-semibold text-emerald-800">
              ₹{Number(row.advanceReceived || 0).toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] text-gray-400 font-medium ml-1">
              ({pct}%)
            </span>
          </div>
        );
      }
    },
    {
      key: 'balanceDue',
      title: 'Balance Due',
      width: '140px',
      render: (val) => {
        const bal = Number(val || 0);
        return (
          <span className={`font-mono text-xs font-semibold ${bal > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            ₹{bal.toLocaleString('en-IN')}
          </span>
        );
      }
    },
    {
      key: 'status',
      title: 'Status',
      width: '160px',
      render: (_, row) => (
        <StatusBadge 
          status={row.status} 
          size="sm" 
          onClick={(e) => {
            e.stopPropagation();
            setQuickFilters(prev => ({ ...prev, status: row.status }));
          }}
        />
      )
    },
    {
      key: 'piDate',
      title: 'PI Date',
      width: '110px',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{val || '-'}</span>
        </div>
      )
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '180px',
      render: (_, row) => (
        <span className="text-xs text-gray-600 font-mono font-medium">
          {formatFullDateTime((row as any).updatedAt || (row as any).createdAt || row.piDate)}
        </span>
      )
    },
    {
      key: 'actions',
      title: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/production-orders/new?customerName=${encodeURIComponent(row.clientName)}`)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
            title="Create Production Order"
          >
            Prod Order <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ERPListPageLayout<ProformaRecord>
        title="Proforma Invoices"
        data={filteredProformas}
        columns={columns}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        favorites={favorites}
        onToggleFavorite={(id) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
        onRowClick={(row) => navigate(`/production-orders/new?customerName=${encodeURIComponent(row.clientName)}`)}
        onAddNew={() => setShowModal(true)}
        addNewLabel="Generate Proforma"
        searchPlaceholder="Search proforma by PI #, client, quote ref..."
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        quickFilterFields={QUICK_FILTER_FIELDS}
        quickFilters={quickFilters}
        onQuickFilterChange={handleQuickFilterChange}
        filterRuleFields={FILTER_RULE_FIELDS}
        filterRules={filterRules}
        setFilterRules={setFilterRules}
        hasActiveFilters={hasActiveFilters}
        onClearAllFilters={handleClearAllFilters}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        viewType={viewType}
        setViewType={setViewType}
        assignedToFilter={assignedToFilter}
        setAssignedToFilter={setAssignedToFilter}
        createdByFilter={createdByFilter}
        setCreatedByFilter={setCreatedByFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        showTags={showTags}
        setShowTags={setShowTags}
        onRefresh={() => {
          setLoading(true);
          loadClients();
          setTimeout(() => setLoading(false), 300);
        }}
        onExportAll={handleExportCSV}
        onPrint={() => window.print()}
        emptyMessage="No proforma invoices generated yet. Click 'Generate Proforma' to create one."
      />

      {/* Generate Proforma Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900">Generate Proforma Invoice</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateProforma} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Customer / Client Name *</label>
                {clientsList.length > 0 ? (
                  <select
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                    className="w-full text-xs rounded-xl border border-gray-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">-- Select Client --</option>
                    {clientsList.map((c) => (
                      <option key={c.id} value={c.companyName}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    label=""
                    placeholder="Enter Customer Name"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quote / Order Reference"
                  value={formData.orderRef}
                  onChange={(e) => setFormData({ ...formData, orderRef: e.target.value })}
                  placeholder="e.g. QT-2024-001"
                />
                <Input
                  label="Total PI Amount (₹)"
                  type="number"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Advance Received (₹)"
                  type="number"
                  value={formData.advanceReceived}
                  onChange={(e) => setFormData({ ...formData, advanceReceived: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-gray-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Issued">Issued</option>
                    <option value="Advance Paid">Advance Paid</option>
                    <option value="Payment Pending">Payment Pending</option>
                    <option value="Converted to Tax Invoice">Converted to Tax Invoice</option>
                    <option value="Draft">Draft</option>
                  </select>
                </div>
              </div>

              <Input
                label="Bank Account Details"
                value={formData.bankAccount}
                onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                placeholder="e.g. HDFC Bank - Current A/C 50200012345678"
              />

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Generate Proforma</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export const ProformaInvoices = WithAuth(ProformaInvoicesBase, ModuleName.PROFORMA_INVOICES, Permission.LIST);
export default ProformaInvoices;
