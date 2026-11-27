import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import WithAuth from '../../components/WithAuth';
import { ModuleName, Permission } from '../../helper/constants';
import { 
  ArrowLeft, 
  Users, 
  Truck, 
  Phone, 
  Mail, 
  Building2, 
  ExternalLink, 
  Plus, 
  Search, 
  Printer, 
  Download, 
  Scale, 
  Receipt, 
  ChevronDown,
  CheckCircle2,
  Clock,
  RefreshCw,
  Wallet,
  ArrowRight
} from 'lucide-react';
import { 
  fetchCustomerById, 
  fetchSupplierById, 
  fetchCustomers, 
  fetchSuppliers,
  type Customer,
  type Supplier
} from '../../services/api';
import { PartyLedgerTab } from '../../components/PartyLedger/PartyLedgerTab';
import { RecordPaymentModal } from '../../components/PartyLedger/RecordPaymentModal';
import { errorToast } from '../../helper/toast';

const PartyLedgerDetailPageBase: React.FC = () => {
  const { partyId } = useParams<{ partyId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const typeParam = (searchParams.get('type') || 'CUSTOMER').toUpperCase() as 'CUSTOMER' | 'SUPPLIER';

  const [partyType, setPartyType] = useState<'CUSTOMER' | 'SUPPLIER'>(typeParam);
  const [partyData, setPartyData] = useState<any>(null);
  const [loadingParty, setLoadingParty] = useState<boolean>(true);
  const [ledgerKey, setLedgerKey] = useState<number>(0);

  // Quick Party Switcher state
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<Supplier[]>([]);
  const [isSwitcherOpen, setIsSwitcherOpen] = useState(false);
  const [switcherSearch, setSwitcherSearch] = useState('');
  const switcherRef = useRef<HTMLDivElement>(null);

  // Payment modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Load party profile data
  useEffect(() => {
    let isMounted = true;
    const loadParty = async () => {
      if (!partyId) return;
      setLoadingParty(true);
      try {
        let profile: any = null;
        let detectedType: 'CUSTOMER' | 'SUPPLIER' = typeParam;

        if (typeParam === 'CUSTOMER') {
          profile = await fetchCustomerById(partyId);
          if (!profile) {
            // fallback try supplier
            profile = await fetchSupplierById(partyId);
            if (profile) detectedType = 'SUPPLIER';
          }
        } else {
          profile = await fetchSupplierById(partyId);
          if (!profile) {
            // fallback try customer
            profile = await fetchCustomerById(partyId);
            if (profile) detectedType = 'CUSTOMER';
          }
        }

        if (isMounted) {
          setPartyData(profile);
          setPartyType(detectedType);
          if (detectedType !== typeParam) {
            setSearchParams({ type: detectedType.toLowerCase() }, { replace: true });
          }
        }
      } catch (err) {
        console.error('Failed to load party profile:', err);
      } finally {
        if (isMounted) setLoadingParty(false);
      }
    };

    loadParty();
    return () => { isMounted = false; };
  }, [partyId, typeParam]);

  // Load all parties for quick switcher
  useEffect(() => {
    fetchCustomers().then(c => setAllCustomers(Array.isArray(c) ? c : [])).catch(() => {});
    fetchSuppliers().then(s => setAllSuppliers(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  // Close switcher on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setIsSwitcherOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const partyName = partyData?.name || partyData?.customerName || partyData?.companyName || 'Party';
  const isCustomer = partyType === 'CUSTOMER';

  const initials = useMemo(() => {
    if (!partyName) return 'PL';
    const parts = partyName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return partyName.slice(0, 2).toUpperCase();
  }, [partyName]);

  // Filtered list for party switcher
  const filteredSwitcherParties = useMemo(() => {
    const q = switcherSearch.toLowerCase().trim();
    const custList = allCustomers.map(c => ({
      id: String(c.id),
      name: c.name || (c as any).companyName || 'Unnamed Customer',
      type: 'CUSTOMER' as const,
      contact: c.contact,
      company: (c as any).companyName || (c as any).company?.name
    }));
    const suppList = allSuppliers.map(s => ({
      id: String(s.id),
      name: s.name || (s as any).companyName || 'Unnamed Supplier',
      type: 'SUPPLIER' as const,
      contact: s.contact,
      company: (s as any).companyName || (s as any).company?.name
    }));
    const combined = [...custList, ...suppList];
    if (!q) return combined.slice(0, 15);
    return combined.filter(p => 
      p.name.toLowerCase().includes(q) ||
      (p.contact && p.contact.toLowerCase().includes(q)) ||
      (p.company && p.company.toLowerCase().includes(q))
    ).slice(0, 20);
  }, [allCustomers, allSuppliers, switcherSearch]);

  const handleSelectParty = (p: { id: string; type: 'CUSTOMER' | 'SUPPLIER' }) => {
    setIsSwitcherOpen(false);
    setSwitcherSearch('');
    navigate(`/finance/party-ledger/${p.id}?type=${p.type.toLowerCase()}`);
  };

  const handlePaymentSuccess = () => {
    setLedgerKey(prev => prev + 1);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 md:p-8 space-y-6 max-w-7xl mx-auto">
        
        {/* TOP NAVIGATION & ACTION BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/finance/party-ledger')}
              className="p-2 bg-white hover:bg-gray-100 border border-gray-200 rounded-xl text-gray-600 transition-colors cursor-pointer shadow-2xs flex items-center gap-1.5 text-xs font-bold"
              title="Return to Master Statement"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Statement</span>
            </button>

            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                  Party Ledger
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isCustomer 
                    ? 'bg-blue-50 text-blue-700 border-blue-200' 
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}>
                  {isCustomer ? 'Customer Statement' : 'Supplier Statement'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Complete financial statement, chronological journal, debit/credit entries, and settlements.
              </p>
            </div>
          </div>

          {/* Quick Party Switcher Dropdown */}
          <div className="flex items-center gap-2.5">
            <div className="relative" ref={switcherRef}>
              <button
                type="button"
                onClick={() => setIsSwitcherOpen(!isSwitcherOpen)}
                className="px-3.5 py-2 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 flex items-center gap-2 shadow-2xs cursor-pointer transition-all"
              >
                <Users className="w-4 h-4 text-gray-400" />
                <span className="max-w-[140px] truncate">{partyName}</span>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
              </button>

              {isSwitcherOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-2xl shadow-xl z-50 overflow-hidden text-xs">
                  <div className="p-2.5 border-b border-gray-100 bg-gray-50/70">
                    <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white border border-gray-200 rounded-xl">
                      <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                      <input
                        type="text"
                        value={switcherSearch}
                        onChange={(e) => setSwitcherSearch(e.target.value)}
                        placeholder="Switch to customer or supplier..."
                        className="w-full text-xs outline-none font-medium text-gray-800 placeholder-gray-400"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto divide-y divide-gray-50 p-1">
                    {filteredSwitcherParties.length === 0 ? (
                      <div className="p-4 text-center text-gray-400 text-xs">
                        No party matches "{switcherSearch}"
                      </div>
                    ) : (
                      filteredSwitcherParties.map((p) => {
                        const isCurrent = p.id === partyId;
                        return (
                          <button
                            key={`${p.type}-${p.id}`}
                            type="button"
                            onClick={() => handleSelectParty(p)}
                            className={`w-full text-left p-2.5 rounded-xl hover:bg-gray-50 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                              isCurrent ? 'bg-primary-50/60 font-bold' : ''
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-800 truncate">{p.name}</div>
                              {p.contact && <div className="text-[11px] text-gray-400">{p.contact}</div>}
                            </div>
                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                              p.type === 'CUSTOMER'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}>
                              {p.type === 'CUSTOMER' ? 'Client' : 'Supplier'}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(true)}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isCustomer ? 'Receive Payment' : 'Make Payment'}</span>
            </button>
          </div>
        </div>

        {/* PARTY IDENTITY HERO CARD */}
        <div className="bg-white border border-gray-200 rounded-3xl p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              {/* Avatar circle */}
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-800 text-white flex items-center justify-center font-black text-xl shadow-md shrink-0">
                {initials}
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-gray-900">
                    {partyName}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    isCustomer 
                      ? 'bg-blue-50 text-blue-700 border-blue-200' 
                      : 'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {isCustomer ? 'Customer' : 'Supplier'}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                    Active
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-gray-500">
                  {partyData?.contact && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-gray-400" />
                      {partyData.contact}
                    </span>
                  )}
                  {partyData?.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      {partyData.email}
                    </span>
                  )}
                  {(partyData?.companyName || partyData?.company?.name) && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5 text-gray-400" />
                      {partyData.companyName || partyData.company?.name}
                    </span>
                  )}
                  {partyData?.taxId && (
                    <span className="font-mono text-gray-400">
                      TIN: {partyData.taxId}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Action Link to Master Record */}
            <div className="flex items-center gap-2 shrink-0">
              <Link
                to={isCustomer ? `/master/customers/${partyId}` : `/master/suppliers/${partyId}`}
                className="px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <span>Edit {isCustomer ? 'Customer' : 'Supplier'} Profile</span>
                <ExternalLink className="w-3.5 h-3.5 text-gray-400" />
              </Link>
            </div>
          </div>
        </div>

        {/* EMBEDDED LEDGER ENGINE */}
        <div className="bg-white border border-gray-200 rounded-3xl shadow-2xs overflow-hidden">
          {partyId && (
            <PartyLedgerTab
              key={`${partyId}-${partyType}-${ledgerKey}`}
              partyId={partyId}
              partyType={partyType}
              partyName={partyName}
            />
          )}
        </div>

      </div>

      {/* RECORD PAYMENT MODAL */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        initialPartyType={partyType}
        initialPartyId={partyId}
        initialPartyName={partyName}
        onSuccess={handlePaymentSuccess}
      />
    </DashboardLayout>
  );
};

export const PartyLedgerDetailPage = WithAuth(PartyLedgerDetailPageBase, ModuleName.EXPENSES, Permission.LIST);
export default PartyLedgerDetailPage;
