import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { fetchClients, checkClientConflict, createClient } from '../../services/client.service';
import { checkOutlookStatus, getOutlookAuthUrl, syncOutlookContacts } from '../../services/outlook.service';
import { 
  Building2, 
  UserCircle, 
  Loader2, 
  Mail, 
  Phone,
  RefreshCw, 
  ExternalLink,
  AlertTriangle,
  FileText
} from 'lucide-react';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { formatFullDateTime } from '../../helper/helper';

export interface ClientRecord {
  id: string | number;
  companyName: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  customerGroup?: string;
  assignedRep?: {
    id?: string;
    username?: string;
    role?: string;
  };
  inquiries?: any[];
  createdAt?: string;
  updatedAt?: string;
}

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'companyName', placeholder: 'Company Name', className: 'w-40 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'phone', placeholder: 'Phone', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'gstNumber', placeholder: 'GST Number', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' },
  { key: 'assignedRep', placeholder: 'Assigned Rep', className: 'w-32 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-xs outline-none' }
];

const FILTER_RULE_FIELDS = ['Company Name', 'Email', 'Phone', 'GST Number', 'Assigned Rep'];

function ClientsBase() {
  const navigate = useNavigate();
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  // Toolbar & filter states
  const [globalSearch, setGlobalSearch] = useState('');
  const [assignedToFilter, setAssignedToFilter] = useState('');
  const [createdByFilter, setCreatedByFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [showTags, setShowTags] = useState(false);
  const [viewType, setViewType] = useState('List View');
  const [sortField, setSortField] = useState('Company Name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const [quickFilters, setQuickFilters] = useState<Record<string, string>>({
    companyName: '',
    phone: '',
    gstNumber: '',
    assignedRep: ''
  });
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    email: '',
    phone: '',
    gstNumber: ''
  });
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkingConflict, setCheckingConflict] = useState(false);
  
  // Outlook State
  const [isOutlookConnected, setIsOutlookConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  useEffect(() => {
    loadClients();
    checkOutlook();
  }, []);

  const checkOutlook = async () => {
    try {
      const res = await checkOutlookStatus();
      setIsOutlookConnected(res.connected);
    } catch (error) {
      console.error('Failed to check outlook status', error);
    }
  };

  const handleOutlookAction = async () => {
    if (isOutlookConnected) {
      setIsSyncing(true);
      setSyncMessage(null);
      try {
        const res = await syncOutlookContacts();
        setSyncMessage(res.message);
        loadClients();
        setTimeout(() => setSyncMessage(null), 5000);
      } catch (error: any) {
        console.error('Failed to sync outlook contacts', error);
        alert(error.response?.data?.error || 'Failed to sync contacts.');
      } finally {
        setIsSyncing(false);
      }
    } else {
      try {
        const res = await getOutlookAuthUrl();
        window.location.href = res.url;
      } catch (error) {
        console.error('Failed to get auth URL', error);
        alert('Failed to initiate Outlook connection.');
      }
    }
  };

  const loadClients = async () => {
    setLoading(true);
    try {
      const data = await fetchClients();
      setClients(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load clients', error);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setConflictWarning(null);
  };

  const handleCheckConflict = async () => {
    if (!formData.email && !formData.phone && !formData.gstNumber) return;
    
    setCheckingConflict(true);
    try {
      const result = await checkClientConflict(formData);
      if (result.conflict) {
        setConflictWarning(result.message);
      } else {
        setConflictWarning(null);
      }
    } catch (error) {
      console.error('Conflict check failed', error);
    } finally {
      setCheckingConflict(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createClient(formData);
      setShowModal(false);
      setFormData({ companyName: '', email: '', phone: '', gstNumber: '' });
      loadClients();
    } catch (error: any) {
      alert(error.response?.data?.error || 'Failed to create client');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickFilterChange = (key: string, value: string) => {
    setQuickFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearAllFilters = () => {
    setGlobalSearch('');
    setQuickFilters({
      companyName: '',
      phone: '',
      gstNumber: '',
      assignedRep: ''
    });
    setFilterRules([]);
    setAssignedToFilter('');
    setCreatedByFilter('');
    setTagFilter('');
  };

  const hasActiveFilters = Boolean(
    globalSearch ||
    quickFilters.companyName ||
    quickFilters.phone ||
    quickFilters.gstNumber ||
    quickFilters.assignedRep ||
    filterRules.length > 0 ||
    assignedToFilter ||
    createdByFilter ||
    tagFilter
  );

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      if (quickFilters.companyName && !(c.companyName || '').toLowerCase().includes(quickFilters.companyName.toLowerCase())) {
        return false;
      }
      if (quickFilters.phone && !(c.phone || '').toLowerCase().includes(quickFilters.phone.toLowerCase())) {
        return false;
      }
      if (quickFilters.gstNumber && !(c.gstNumber || '').toLowerCase().includes(quickFilters.gstNumber.toLowerCase())) {
        return false;
      }
      if (quickFilters.assignedRep && !(c.assignedRep?.username || '').toLowerCase().includes(quickFilters.assignedRep.toLowerCase())) {
        return false;
      }
      if (assignedToFilter && c.assignedRep?.username !== assignedToFilter) {
        return false;
      }

      if (filterRules.length > 0) {
        for (const rule of filterRules) {
          if (!rule.value) continue;
          let targetVal = '';
          if (rule.field === 'Company Name') targetVal = c.companyName || '';
          else if (rule.field === 'Email') targetVal = c.email || '';
          else if (rule.field === 'Phone') targetVal = c.phone || '';
          else if (rule.field === 'GST Number') targetVal = c.gstNumber || '';
          else if (rule.field === 'Assigned Rep') targetVal = c.assignedRep?.username || '';

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
          (c.companyName || '').toLowerCase().includes(q) ||
          (c.email || '').toLowerCase().includes(q) ||
          (c.phone || '').toLowerCase().includes(q) ||
          (c.gstNumber || '').toLowerCase().includes(q) ||
          (c.assignedRep?.username || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      return true;
    }).sort((a, b) => {
      let comparison = 0;
      if (sortField === 'Company Name') {
        comparison = (a.companyName || '').localeCompare(b.companyName || '');
      } else if (sortField === 'GST Number') {
        comparison = (a.gstNumber || '').localeCompare(b.gstNumber || '');
      } else if (sortField === 'Assigned Rep') {
        comparison = (a.assignedRep?.username || '').localeCompare(b.assignedRep?.username || '');
      } else {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [clients, globalSearch, quickFilters, filterRules, assignedToFilter, sortField, sortOrder]);

  const handleExportCSV = () => {
    if (filteredClients.length === 0) return;
    const headers = ['ID', 'Company Name', 'Email', 'Phone', 'GST Number', 'Assigned Rep', 'Quotes Count'];
    const rows = filteredClients.map(c => [
      c.id,
      `"${(c.companyName || '').replace(/"/g, '""')}"`,
      `"${(c.email || '').replace(/"/g, '""')}"`,
      `"${(c.phone || '').replace(/"/g, '""')}"`,
      `"${(c.gstNumber || '').replace(/"/g, '""')}"`,
      `"${(c.assignedRep?.username || '').replace(/"/g, '""')}"`,
      c.inquiries?.length || 0
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Clients_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns: ColumnDef<ClientRecord>[] = [
    {
      key: 'companyName',
      title: 'Client / Company',
      render: (_, row) => (
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100 shrink-0">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-gray-900 block text-xs hover:text-emerald-700 transition-colors">
              {row.companyName}
            </span>
            {row.customerGroup && (
              <span className="text-[10px] text-gray-400 font-medium">
                {row.customerGroup}
              </span>
            )}
          </div>
        </div>
      )
    },
    {
      key: 'email',
      title: 'Email Address',
      render: (_, row) => (
        row.email ? (
          <a 
            href={`mailto:${row.email}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-emerald-700 transition-colors"
          >
            <Mail className="w-3.5 h-3.5 text-gray-400" />
            <span className="truncate max-w-[200px]">{row.email}</span>
          </a>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      )
    },
    {
      key: 'phone',
      title: 'Phone Number',
      render: (_, row) => (
        row.phone ? (
          <a 
            href={`tel:${row.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 text-xs text-gray-700 hover:text-emerald-700 transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-gray-400" />
            <span>{row.phone}</span>
          </a>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      )
    },
    {
      key: 'gstNumber',
      title: 'GST Number',
      render: (_, row) => (
        row.gstNumber ? (
          <span className="font-mono text-[11px] font-semibold bg-gray-100 text-gray-800 px-2 py-0.5 rounded border border-gray-200">
            {row.gstNumber}
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )
      )
    },
    {
      key: 'assignedRep',
      title: 'Assigned Rep',
      render: (_, row) => (
        <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/60 rounded-md w-fit">
          <UserCircle className="w-3.5 h-3.5 text-emerald-600" />
          <span>{row.assignedRep?.username || 'Unassigned'}</span>
        </div>
      )
    },
    {
      key: 'inquiries',
      title: 'Inquiries',
      render: (_, row) => {
        const count = row.inquiries?.length || 0;
        return (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
            count > 0 ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'bg-gray-100 text-gray-500'
          }`}>
            <FileText className="w-3 h-3" />
            {count} {count === 1 ? 'Quote' : 'Quotes'}
          </span>
        );
      }
    },
    {
      key: 'updatedAt',
      title: 'Updated At',
      render: (_, row) => (
        <span className="text-xs text-gray-600 font-mono font-medium">
          {formatFullDateTime((row as any).updatedAt || (row as any).createdAt)}
        </span>
      )
    },
    {
      key: 'actions',
      title: '',
      render: (_, row) => (
        <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => navigate(`/master/customers/${row.id}`)}
            className="p-1.5 text-gray-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
            title="View Customer Profile"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  const uniqueReps = useMemo(() => {
    const set = new Set<string>();
    clients.forEach(c => {
      if (c.assignedRep?.username) set.add(c.assignedRep.username);
    });
    return Array.from(set);
  }, [clients]);

  const extraHeaderActions = (
    <div className="flex items-center gap-2">
      {syncMessage && (
        <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg animate-in fade-in">
          {syncMessage}
        </span>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={handleOutlookAction}
        disabled={isSyncing}
        className={`text-xs gap-1.5 h-8 font-medium ${
          isOutlookConnected 
            ? 'border-emerald-200 text-emerald-700 hover:bg-emerald-50' 
            : 'border-blue-200 text-blue-700 hover:bg-blue-50'
        }`}
      >
        {isSyncing ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Syncing...</>
        ) : isOutlookConnected ? (
          <><RefreshCw className="w-3.5 h-3.5 text-emerald-600" /> Sync Outlook</>
        ) : (
          <><Mail className="w-3.5 h-3.5 text-blue-600" /> Connect Outlook</>
        )}
      </Button>
    </div>
  );

  return (
    <>
      <ERPListPageLayout<ClientRecord>
        title="Client Management"
        data={filteredClients}
        columns={columns}
        loading={loading}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        favorites={favorites}
        onToggleFavorite={(id) => setFavorites(prev => ({ ...prev, [id]: !prev[id] }))}
        onRowClick={(row) => navigate(`/master/customers/${row.id}`)}
        onAddNew={() => setShowModal(true)}
        addNewLabel="New Client / Inquiry"
        searchPlaceholder="Search clients by name, email, phone, GST..."
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
        assignedToOptions={uniqueReps}
        createdByFilter={createdByFilter}
        setCreatedByFilter={setCreatedByFilter}
        tagFilter={tagFilter}
        setTagFilter={setTagFilter}
        showTags={showTags}
        setShowTags={setShowTags}
        onRefresh={loadClients}
        onExportAll={handleExportCSV}
        onPrint={() => window.print()}
        extraHeaderActions={extraHeaderActions}
        emptyMessage="No clients found. Click 'New Client / Inquiry' to create one."
      />

      {/* New Client Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-lg font-bold text-gray-900">New Client Inquiry</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <Input 
                label="Company Name" 
                name="companyName" 
                value={formData.companyName}
                onChange={handleInputChange}
                required 
              />
              
              <Input 
                label="Email Address" 
                name="email" 
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                onBlur={handleCheckConflict}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <Input 
                  label="Phone Number" 
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  onBlur={handleCheckConflict}
                />
                <Input 
                  label="GST Number" 
                  name="gstNumber"
                  value={formData.gstNumber}
                  onChange={handleInputChange}
                  onBlur={handleCheckConflict}
                />
              </div>

              {checkingConflict && (
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Checking conflicts...
                </div>
              )}

              {conflictWarning && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl font-medium flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    {conflictWarning}
                    <p className="text-xs font-normal mt-1 opacity-80">You can still proceed, but please verify with the rep to avoid quoting conflicts.</p>
                  </div>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" disabled={isSubmitting || checkingConflict}>
                  {isSubmitting ? 'Saving...' : 'Save & Continue'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export const Clients = WithAuth(ClientsBase, ModuleName.CLIENTS, Permission.LIST);
export default Clients;
