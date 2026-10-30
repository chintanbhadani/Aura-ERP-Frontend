import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { fetchClients } from '../../services/client.service';
import { fetchInquiries, getStoredInquiries, saveStoredInquiries } from '../../services/inquiry.service';
import { 
  Building2, 
  HelpCircle, 
  Plus, 
  Calendar, 
  FileText, 
  ArrowRight,
  TrendingUp,
  Tag,
  Edit
} from 'lucide-react';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';

export interface InquiryRecord {
  id: string;
  inquiryNumber: string;
  clientId?: string | number;
  clientName: string;
  requirements: string;
  sizeInTons: number;
  quotedPrice: number;
  status: 'Open' | 'Quoted' | 'Won' | 'Lost' | 'Under Review';
  assignedRep?: string;
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

const DEFAULT_INQUIRIES: InquiryRecord[] = [
  {
    id: 'inq-001',
    inquiryNumber: 'INQ-2024-001',
    clientName: 'Krishna Logistics & Cargo',
    requirements: 'PET Strap 19mm x 0.8mm Embossed Green',
    sizeInTons: 15.0,
    quotedPrice: 112,
    status: 'Open',
    assignedRep: 'Administrator',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    notes: 'Urgent delivery required for warehouse expansion'
  },
  {
    id: 'inq-002',
    inquiryNumber: 'INQ-2024-002',
    clientName: 'Apex Box Manufacturing',
    requirements: 'PP Box Strapping Roll 12mm White Plain',
    sizeInTons: 8.5,
    quotedPrice: 98,
    status: 'Quoted',
    assignedRep: 'Administrator',
    createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    notes: 'Quotation sent via email'
  },
  {
    id: 'inq-003',
    inquiryNumber: 'INQ-2024-003',
    clientName: 'Shreeji Polymers Ltd',
    requirements: 'Heavy Duty Composite Cord Strap 32mm',
    sizeInTons: 22.0,
    quotedPrice: 135,
    status: 'Under Review',
    assignedRep: 'Administrator',
    createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    notes: 'Samples dispatched for tensile testing'
  },
  {
    id: 'inq-004',
    inquiryNumber: 'INQ-2024-004',
    clientName: 'Mr Bhadani',
    requirements: 'PET Strap 15mm x 0.7mm Manual Grade',
    sizeInTons: 4.0,
    quotedPrice: 108,
    status: 'Won',
    assignedRep: 'Administrator',
    createdAt: new Date(Date.now() - 9 * 86400000).toISOString(),
    notes: 'Converted to Production Order'
  }
];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'inquiryNumber', placeholder: 'Inquiry #', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'clientName', placeholder: 'Client Name', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['Inquiry #', 'Client Name', 'Status', 'Requirements'];

function InquiriesBase() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<InquiryRecord[]>(() => {
    try {
      const saved = localStorage.getItem('erp_crm_inquiries');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_INQUIRIES;
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
    inquiryNumber: '',
    clientName: '',
    status: ''
  });
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  // New Inquiry Form State
  const [formData, setFormData] = useState({
    clientName: '',
    requirements: '',
    sizeInTons: '5',
    quotedPrice: '110',
    status: 'Open' as InquiryRecord['status'],
    notes: ''
  });

  useEffect(() => {
    loadClients();
    loadInquiriesData();
  }, []);

  const loadInquiriesData = async () => {
    try {
      const stored = getStoredInquiries();
      if (!stored || stored.length === 0) {
        saveStoredInquiries(DEFAULT_INQUIRIES as any);
      }
      const data = await fetchInquiries();
      if (Array.isArray(data) && data.length > 0) {
        setInquiries(data as any);
      }
    } catch (err) {
      console.error('Failed to load inquiries:', err);
    }
  };

  const loadClients = async () => {
    try {
      const data = await fetchClients();
      if (Array.isArray(data)) {
        setClientsList(data);
      }
    } catch (error) {
      console.error('Failed to load clients for inquiries', error);
    }
  };

  const saveInquiries = (updated: InquiryRecord[]) => {
    setInquiries(updated);
    try {
      localStorage.setItem('erp_crm_inquiries', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateInquiry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.requirements) {
      alert('Please select a client and enter product requirements.');
      return;
    }

    const nextId = `INQ-2024-${String(inquiries.length + 1).padStart(3, '0')}`;
    const newInquiry: InquiryRecord = {
      id: `inq-${Date.now()}`,
      inquiryNumber: nextId,
      clientName: formData.clientName,
      requirements: formData.requirements,
      sizeInTons: parseFloat(formData.sizeInTons) || 0,
      quotedPrice: parseFloat(formData.quotedPrice) || 0,
      status: formData.status,
      assignedRep: 'Administrator',
      createdAt: new Date().toISOString(),
      notes: formData.notes
    };

    saveInquiries([newInquiry, ...inquiries]);
    setShowModal(false);
    setFormData({
      clientName: '',
      requirements: '',
      sizeInTons: '5',
      quotedPrice: '110',
      status: 'Open',
      notes: ''
    });
  };

  const handleQuickFilterChange = (key: string, value: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({ inquiryNumber: '', clientName: '', status: '' });
    setFilterRules([]);
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
  };

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.inquiryNumber ||
    quickFilters.clientName ||
    quickFilters.status ||
    filterRules.length > 0 ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter
  );

  const filteredInquiries = useMemo(() => {
    return inquiries.filter(item => {
      if (quickFilters.inquiryNumber && !item.inquiryNumber.toLowerCase().includes(quickFilters.inquiryNumber.toLowerCase())) {
        return false;
      }
      if (quickFilters.clientName && !item.clientName.toLowerCase().includes(quickFilters.clientName.toLowerCase())) {
        return false;
      }
      if (quickFilters.status && !item.status.toLowerCase().includes(quickFilters.status.toLowerCase())) {
        return false;
      }
      if (assignedToFilter && item.assignedRep !== assignedToFilter) {
        return false;
      }

      if (filterRules.length > 0) {
        for (const rule of filterRules) {
          if (!rule.value) continue;
          let targetVal = '';
          if (rule.field === 'Inquiry #') targetVal = item.inquiryNumber;
          else if (rule.field === 'Client Name') targetVal = item.clientName;
          else if (rule.field === 'Status') targetVal = item.status;
          else if (rule.field === 'Requirements') targetVal = item.requirements;

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
          item.inquiryNumber.toLowerCase().includes(q) ||
          item.clientName.toLowerCase().includes(q) ||
          item.requirements.toLowerCase().includes(q) ||
          item.status.toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Inquiry #') {
        comparison = a.inquiryNumber.localeCompare(b.inquiryNumber);
      } else if (sortField === 'Client Name') {
        comparison = a.clientName.localeCompare(b.clientName);
      } else if (sortField === 'Quantity') {
        comparison = a.sizeInTons - b.sizeInTons;
      } else {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [inquiries, globalSearch, quickFilters, filterRules, assignedToFilter, sortField, sortOrder]);

  const handleExportCSV = () => {
    if (filteredInquiries.length === 0) return;
    const headers = ['Inquiry #', 'Client Name', 'Requirements', 'Quantity (Tons)', 'Quoted Rate (INR)', 'Status', 'Date'];
    const rows = filteredInquiries.map(item => [
      `"${item.inquiryNumber}"`,
      `"${item.clientName.replace(/"/g, '""')}"`,
      `"${item.requirements.replace(/"/g, '""')}"`,
      item.sizeInTons,
      item.quotedPrice,
      `"${item.status}"`,
      `"${new Date(item.createdAt).toLocaleDateString()}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Inquiries_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<InquiryRecord>[] = [
    {
      key: 'inquiryNumber',
      title: 'Inquiry ID',
      width: '140px',
      render: (_, row) => (
        <span 
          onClick={() => navigate(`/inquiries/${row.id || row.inquiryNumber}`)}
          className="font-bold text-xs text-primary-600 hover:text-primary-800 font-mono hover:underline cursor-pointer"
        >
          {row.inquiryNumber}
        </span>
      )
    },
    {
      key: 'clientName',
      title: 'Client Name',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
          <span 
            onClick={() => navigate(`/inquiries/${row.id || row.inquiryNumber}`)}
            className="font-semibold text-xs text-gray-900 hover:text-emerald-700 transition-colors cursor-pointer"
          >
            {row.clientName}
          </span>
        </div>
      )
    },
    {
      key: 'requirements',
      title: 'Requirements / Spec',
      render: (_, row) => (
        <div className="max-w-xs">
          <span className="text-xs text-gray-800 font-medium line-clamp-1">
            {row.requirements}
          </span>
          {row.notes && (
            <span className="text-[10px] text-gray-400 block line-clamp-1 mt-0.5">
              {row.notes}
            </span>
          )}
        </div>
      )
    },
    {
      key: 'sizeInTons',
      title: 'Quantity (Tons)',
      width: '130px',
      render: (val) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-gray-100 text-gray-800 border border-gray-200">
          {Number(val || 0).toFixed(2)} Tons
        </span>
      )
    },
    {
      key: 'quotedPrice',
      title: 'Target Rate',
      width: '120px',
      render: (val) => (
        <span className="text-xs font-semibold text-gray-900 font-mono">
          ₹{Number(val || 0).toLocaleString()}/kg
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      width: '130px',
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
      key: 'createdAt',
      title: 'Inquiry Date',
      width: '120px',
      render: (val) => (
        <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
          <span>{new Date(val).toLocaleDateString()}</span>
        </div>
      )
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      width: '180px',
      render: (_, row) => (
        <span className="text-xs text-gray-600 font-mono font-medium">
          {formatFullDateTime((row as any).updatedAt || row.createdAt)}
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
            onClick={() => navigate(`/inquiries/${row.id || row.inquiryNumber}`)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded-md transition-colors cursor-pointer"
            title="View or Edit Inquiry"
          >
            <Edit className="w-3 h-3 text-gray-500" />
            <span>Edit</span>
          </button>
          <button
            onClick={() => {
              const params = new URLSearchParams({
                customerName: row.clientName || '',
                inquiryId: row.inquiryNumber || row.id || '',
                tons: String(row.sizeInTons || ''),
                rate: String(row.quotedPrice || '')
              });
              navigate(`/quotations?${params.toString()}`);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded-md transition-colors cursor-pointer"
            title="Create Quotation from Inquiry"
          >
            Quote <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ERPListPageLayout<InquiryRecord>
        title="Customer Inquiries"
        data={filteredInquiries}
        columns={columns}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        favorites={favorites}
        onToggleFavorite={(id) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
        onRowClick={(row) => navigate(`/inquiries/${row.id || row.inquiryNumber}`)}
        onAddNew={() => navigate('/inquiries/new')}
        addNewLabel="New Inquiry"
        searchPlaceholder="Search inquiries by ID, client, product requirements..."
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
          loadInquiriesData();
          setTimeout(() => setLoading(false), 300);
        }}
        onExportAll={handleExportCSV}
        onPrint={() => window.print()}
        emptyMessage="No customer inquiries found. Click 'New Inquiry' to create one."
      />

      {/* New Inquiry Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-primary-600" />
                <h2 className="text-lg font-bold text-gray-900">New Client Inquiry</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>

            <form onSubmit={handleCreateInquiry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Client / Company Name *</label>
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
                        {c.companyName} {c.phone ? `(${c.phone})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    label=""
                    placeholder="Enter Client Name"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Requirements / Product Specification *</label>
                <textarea
                  rows={2}
                  value={formData.requirements}
                  onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
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
                  value={formData.sizeInTons}
                  onChange={(e) => setFormData({ ...formData, sizeInTons: e.target.value })}
                  required
                />
                <Input
                  label="Target Rate (₹/kg)"
                  type="number"
                  step="0.5"
                  value={formData.quotedPrice}
                  onChange={(e) => setFormData({ ...formData, quotedPrice: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full text-xs rounded-xl border border-gray-200 p-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="Open">Open</option>
                    <option value="Quoted">Quoted</option>
                    <option value="Under Review">Under Review</option>
                    <option value="Won">Won</option>
                    <option value="Lost">Lost</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Terms</label>
                  <input
                    type="text"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="e.g. Delivery in 10 days"
                    className="w-full text-xs rounded-xl border border-gray-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Save Inquiry</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export const Inquiries = WithAuth(InquiriesBase, ModuleName.INQUIRIES, Permission.LIST);
export default Inquiries;
