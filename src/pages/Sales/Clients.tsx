import React, { useState, useEffect } from 'react';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Card, CardTitle } from '../../components/Card';
import { Button } from '../../components/Button';
import { Input } from '../../components/Input';
import { fetchClients, checkClientConflict, createClient } from '../../services/client.service';
import { checkOutlookStatus, getOutlookAuthUrl, syncOutlookContacts } from '../../services/outlook.service';
import { Plus, AlertTriangle, Building2, UserCircle, Briefcase, Loader2, Mail, CheckCircle2, RefreshCw } from 'lucide-react';

export default function Clients() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
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
      // Sync
      setIsSyncing(true);
      setSyncMessage(null);
      try {
        const res = await syncOutlookContacts();
        setSyncMessage(res.message);
        loadClients(); // Reload clients after sync
        setTimeout(() => setSyncMessage(null), 5000); // clear msg after 5s
      } catch (error: any) {
        console.error('Failed to sync outlook contacts', error);
        alert(error.response?.data?.error || 'Failed to sync contacts.');
      } finally {
        setIsSyncing(false);
      }
    } else {
      // Connect
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
    try {
      const data = await fetchClients();
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setConflictWarning(null); // clear warning on type
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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Client Management</h1>
            <p className="text-sm text-gray-500 mt-1">Track clients, inquiries, and resolve assignment conflicts.</p>
          </div>
          <Button onClick={() => setShowModal(true)} className="gap-2">
            <Plus className="w-4 h-4" /> New Client / Inquiry
          </Button>
        </div>

        {/* Outlook Integration */}
        <Card className="p-5 bg-blue-50 border-blue-100 flex items-start sm:items-center justify-between flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-4">
            <div className={`p-2.5 rounded-full ${isOutlookConnected ? 'bg-green-100 text-green-600' : 'bg-blue-100 text-blue-600'}`}>
              {isOutlookConnected ? <CheckCircle2 className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
            </div>
            <div>
              <h3 className={`font-semibold ${isOutlookConnected ? 'text-green-900' : 'text-blue-900'}`}>
                {isOutlookConnected ? 'Outlook Connected' : 'Outlook Integration Available'}
              </h3>
              <p className={`text-sm mt-0.5 ${isOutlookConnected ? 'text-green-700' : 'text-blue-700'}`}>
                {isOutlookConnected 
                  ? 'Your Microsoft account is linked. You can manually sync contacts or let the daily cron job run.' 
                  : 'Connect your Microsoft account to automatically sync client contacts directly into the ERP.'}
              </p>
              {syncMessage && (
                <p className="text-sm font-medium text-green-700 mt-2 bg-green-100 px-2 py-1 rounded w-fit">
                  {syncMessage}
                </p>
              )}
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleOutlookAction}
            disabled={isSyncing}
            className={`shrink-0 bg-white hover:bg-blue-100 ${isOutlookConnected ? 'border-green-200 text-green-700 hover:bg-green-100' : 'border-blue-200 text-blue-700 hover:bg-blue-100'}`}
          >
            {isSyncing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
            ) : isOutlookConnected ? (
              <><RefreshCw className="w-4 h-4 mr-2" /> Sync Contacts</>
            ) : (
              'Connect Outlook'
            )}
          </Button>
        </Card>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-600">
              <thead className="bg-gray-50 text-gray-700 text-xs uppercase font-semibold border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Client</th>
                  <th className="px-6 py-4">Contact Details</th>
                  <th className="px-6 py-4">GST Number</th>
                  <th className="px-6 py-4">Assigned Rep</th>
                  <th className="px-6 py-4">Inquiries</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-400">
                      Loading clients...
                    </td>
                  </tr>
                ) : clients.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      <Briefcase className="w-8 h-8 mx-auto text-gray-300 mb-3" />
                      <p className="font-medium">No clients found</p>
                      <p className="text-sm mt-1">Add a new client to start tracking inquiries.</p>
                    </td>
                  </tr>
                ) : (
                  clients.map(client => (
                    <tr key={client.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          {client.companyName}
                        </div>
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        <div className="text-xs">{client.email || '-'}</div>
                        <div className="text-xs text-gray-400">{client.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{client.gstNumber || '-'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium px-2 py-1 bg-green-50 text-green-700 rounded-md w-fit">
                          <UserCircle className="w-3.5 h-3.5" />
                          {client.assignedRep?.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">
                        {client.inquiries?.length || 0} Quotes
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>

      </div>

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

    </DashboardLayout>
  );
}
