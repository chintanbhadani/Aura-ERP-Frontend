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
  FileText, 
  Plus, 
  Calendar, 
  ArrowRight,
  Printer,
  CheckCircle2,
  DollarSign
} from 'lucide-react';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';

export interface QuotationRecord {
  id: string;
  quoteNumber: string;
  clientName: string;
  itemDetails: string;
  quantityTons: number;
  ratePerKg: number;
  totalAmount: number;
  validUntil: string;
  status: 'Draft' | 'Sent' | 'Approved' | 'Expired' | 'Rejected';
  paymentTerms?: string;
  createdAt: string;
  updatedAt?: string;
}

const DEFAULT_QUOTATIONS: QuotationRecord[] = [
  {
    id: 'qt-001',
    quoteNumber: 'QT-2024-001',
    clientName: 'Krishna Logistics & Cargo',
    itemDetails: 'PET Strap 19mm x 0.8mm Green Embossed (High Tensile)',
    quantityTons: 15.0,
    ratePerKg: 112,
    totalAmount: 1680000,
    validUntil: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    status: 'Approved',
    paymentTerms: '30% Advance, 70% Against PI / Delivery',
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString()
  },
  {
    id: 'qt-002',
    quoteNumber: 'QT-2024-002',
    clientName: 'Apex Box Manufacturing',
    itemDetails: 'PP Box Strapping Roll 12mm White Plain',
    quantityTons: 8.5,
    ratePerKg: 98,
    totalAmount: 833000,
    validUntil: new Date(Date.now() + 10 * 86400000).toISOString().slice(0, 10),
    status: 'Sent',
    paymentTerms: '50% Advance with Order',
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString()
  },
  {
    id: 'qt-003',
    quoteNumber: 'QT-2024-003',
    clientName: 'Shreeji Polymers Ltd',
    itemDetails: 'Composite Cord Strap 32mm Heavy Duty',
    quantityTons: 22.0,
    ratePerKg: 135,
    totalAmount: 2970000,
    validUntil: new Date(Date.now() + 20 * 86400000).toISOString().slice(0, 10),
    status: 'Draft',
    paymentTerms: '100% Against Proforma Invoice',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString()
  }
];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'quoteNumber', placeholder: 'Quote #', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'clientName', placeholder: 'Client Name', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['Quote #', 'Client Name', 'Status', 'Total Amount'];

function QuotationsBase() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [quotations, setQuotations] = useState<QuotationRecord[]>(() => {
    try {
      const saved = localStorage.getItem('erp_crm_quotations');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_QUOTATIONS;
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
    quoteNumber: '',
    clientName: searchParams.get('customerName') || searchParams.get('clientName') || searchParams.get('customer') || '',
    status: ''
  });
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    clientName: searchParams.get('customerName') || searchParams.get('clientName') || '',
    itemDetails: 'PET Strap 19mm x 0.8mm Embossed Green',
    quantityTons: '10',
    ratePerKg: '110',
    validDays: '15',
    paymentTerms: '30% Advance, 70% against delivery',
    status: 'Draft' as QuotationRecord['status']
  });

  useEffect(() => {
    loadClients();
    if (searchParams.get('create') === 'true') {
      setShowModal(true);
    }
    const cName = searchParams.get('customerName') || searchParams.get('clientName') || searchParams.get('customer');
    if (cName) {
      setQuickFilters(prev => ({ ...prev, clientName: cName }));
      setFormData(prev => ({ ...prev, clientName: cName }));
    }
  }, [searchParams]);

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      if (Array.isArray(data)) {
        setClientsList(data);
      }
    } catch (error) {
      console.error('Failed to load clients for quotations', error);
    }
  };

  const saveQuotations = (updated: QuotationRecord[]) => {
    setQuotations(updated);
    try {
      localStorage.setItem('erp_crm_quotations', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const calculatedTotal = useMemo(() => {
    const qtyTons = parseFloat(formData.quantityTons) || 0;
    const rateKg = parseFloat(formData.ratePerKg) || 0;
    return qtyTons * 1000 * rateKg;
  }, [formData.quantityTons, formData.ratePerKg]);

  const handleCreateQuotation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.itemDetails) {
      alert('Please fill all required fields');
      return;
    }

    const nextNumber = `QT-2024-${String(quotations.length + 1).padStart(3, '0')}`;
    const validUntilDate = new Date(Date.now() + (parseInt(formData.validDays) || 15) * 86400000).toISOString().slice(0, 10);

    const newQuote: QuotationRecord = {
      id: `qt-${Date.now()}`,
      quoteNumber: nextNumber,
      clientName: formData.clientName,
      itemDetails: formData.itemDetails,
      quantityTons: parseFloat(formData.quantityTons) || 0,
      ratePerKg: parseFloat(formData.ratePerKg) || 0,
      totalAmount: calculatedTotal,
      validUntil: validUntilDate,
      status: formData.status,
      paymentTerms: formData.paymentTerms,
      createdAt: new Date().toISOString()
    };

    saveQuotations([newQuote, ...quotations]);
    setShowModal(false);
  };

  const handleQuickFilterChange = (key: string, value: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ quoteNumber: '', clientName: '', status: '' });
    setFilterRules([]);
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
  };

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.quoteNumber ||
    quickFilters.clientName ||
    quickFilters.status ||
    filterRules.length > 0 ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter
  );

  const filteredQuotations = useMemo(() => {
    return quotations.filter(item => {
      if (quickFilters.quoteNumber && !item.quoteNumber.toLowerCase().includes(quickFilters.quoteNumber.toLowerCase())) {
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
          if (rule.field === 'Quote #') targetVal = item.quoteNumber;
          else if (rule.field === 'Client Name') targetVal = item.clientName;
          else if (rule.field === 'Status') targetVal = item.status;
          else if (rule.field === 'Total Amount') targetVal = String(item.totalAmount);

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
          item.quoteNumber.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.itemDetails.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Quote #') {
        comparison = a.quoteNumber.localeCompare(b.quoteNumber);
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
  }, [quotations, globalSearch, quickFilters, filterRules, sortField, sortOrder]);

  const handleExportCSV = () => {
    if (filteredQuotations.length === 0) return;
    const headers = ['Quote #', 'Client Name', 'Items / Spec', 'Quantity (Tons)', 'Rate (INR/kg)', 'Total Amount (INR)', 'Valid Until', 'Status'];
    const rows = filteredQuotations.map(item => [
      `"${item.quoteNumber}"`,
      `"${item.clientName.replace(/"/g, '""')}"`,
      `"${item.itemDetails.replace(/"/g, '""')}"`,
      item.quantityTons,
      item.ratePerKg,
      item.totalAmount,
      `"${item.validUntil}"`,
      `"${item.status}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Quotations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<QuotationRecord>[] = [
    {
      key: 'quoteNumber',
      title: 'Quote No.',
      width: '140px',
      render: (_, row) => (
        <span className="font-bold text-xs text-primary-600 hover:text-primary-800 font-mono hover:underline cursor-pointer">
          {row.quoteNumber}
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
      key: 'itemDetails',
      title: 'Item / Grade',
      render: (_, row) => (
        <div className="max-w-xs">
          <span className="text-xs text-gray-800 font-medium line-clamp-1">
            {row.itemDetails}
          </span>
          <span className="text-[10px] text-gray-400 block">
            {row.quantityTons} Tons @ ₹{row.ratePerKg}/kg
          </span>
        </div>
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
      key: 'validUntil',
      title: 'Valid Until',
      width: '120px',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-600 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{val || '-'}</span>
        </div>
      )
    },
    {
      key: 'status',
      title: 'Status',
      width: '120px',
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
      key: 'actions',
      title: '',
      align: 'right',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/proforma?clientName=${encodeURIComponent(row.clientName)}&quoteRef=${encodeURIComponent(row.quoteNumber)}&amount=${row.totalAmount}`)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors"
            title="Convert to Proforma Invoice"
          >
            Create PI <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ERPListPageLayout<QuotationRecord>
        title="Quotations & Pricing"
        data={filteredQuotations}
        columns={columns}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        favorites={favorites}
        onToggleFavorite={(id) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
        onRowClick={(row) => navigate(`/proforma?clientName=${encodeURIComponent(row.clientName)}&quoteRef=${encodeURIComponent(row.quoteNumber)}&amount=${row.totalAmount}`)}
        onAddNew={() => setShowModal(true)}
        addNewLabel="Create Quotation"
        searchPlaceholder="Search quotations by quote #, client, items..."
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
        emptyMessage="No quotations generated yet. Click 'Create Quotation' to start."
      />

      {/* Create Quotation Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900">Create Quotation</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateQuotation} className="p-6 space-y-4">
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Item Specification *</label>
                <textarea
                  rows={2}
                  value={formData.itemDetails}
                  onChange={(e) => setFormData({ ...formData, itemDetails: e.target.value })}
                  placeholder="e.g. PET Strap 19mm x 0.8mm Green Embossed 20kg rolls"
                  required
                  className="w-full text-xs rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Quantity (Tons)"
                  type="number"
                  step="0.1"
                  value={formData.quantityTons}
                  onChange={(e) => setFormData({ ...formData, quantityTons: e.target.value })}
                  required
                />
                <Input
                  label="Rate (₹/kg)"
                  type="number"
                  step="0.5"
                  value={formData.ratePerKg}
                  onChange={(e) => setFormData({ ...formData, ratePerKg: e.target.value })}
                  required
                />
              </div>

              {/* Calculated Total Bar */}
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                <span className="text-xs font-medium text-emerald-800">Total Quotation Value:</span>
                <span className="text-base font-bold font-mono text-emerald-900">
                  ₹{calculatedTotal.toLocaleString('en-IN')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Validity (Days)"
                  type="number"
                  value={formData.validDays}
                  onChange={(e) => setFormData({ ...formData, validDays: e.target.value })}
                  required
                />
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-gray-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Sent">Sent</option>
                    <option value="Approved">Approved</option>
                    <option value="Expired">Expired</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <Input
                label="Payment Terms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                placeholder="e.g. 30% Advance, 70% against PI"
              />

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Create Quotation</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export const Quotations = WithAuth(QuotationsBase, ModuleName.QUOTATIONS, Permission.LIST);
export default Quotations;
