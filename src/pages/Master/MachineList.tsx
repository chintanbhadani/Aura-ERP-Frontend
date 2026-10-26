import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ERPListPageLayout, type QuickFilterField, type FilterRule } from '../../components/ERPList';
import { type ColumnDef } from '../../components/CustomTable';
import { StatusBadge } from '../../components/StatusBadge';
import { successToast, errorToast } from '../../helper/toast';
import { 
  Factory, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Sliders,
  Settings,
  ArrowRight
} from 'lucide-react';

export interface MachineRecord {
  id: string;
  code: string;
  name: string;
  outputKgPerHour: number; // Limit in KG per Hour
  status: 'Running' | 'Idle' | 'Maintenance' | 'Disabled';
  maxCapacityTonsPerMonth?: number;
  remarks?: string;
  updatedAt?: string;
}

const DEFAULT_MACHINES: MachineRecord[] = [
  { id: 'M-01', code: 'EXT-01', name: 'Machine 1 (High-Speed Extrusion Line)', outputKgPerHour: 300, status: 'Running', maxCapacityTonsPerMonth: 30, remarks: 'Primary PET Extrusion Line', updatedAt: new Date().toISOString() },
  { id: 'M-02', code: 'EXT-02', name: 'Machine 2 (Heavy Duty Strap Line)', outputKgPerHour: 210, status: 'Running', maxCapacityTonsPerMonth: 22, remarks: 'Heavy Duty Strap Manufacturing', updatedAt: new Date().toISOString() },
  { id: 'M-03', code: 'EXT-03', name: 'Machine 3 (Medium Strap Line)', outputKgPerHour: 132, status: 'Running', maxCapacityTonsPerMonth: 15, remarks: 'Medium Strap Line', updatedAt: new Date().toISOString() },
  { id: 'M-04', code: 'EXT-04', name: 'Machine 4 (Custom & Light Strap Line)', outputKgPerHour: 90, status: 'Idle', maxCapacityTonsPerMonth: 10, remarks: 'Light gauge strap production', updatedAt: new Date().toISOString() }
];

const QUICK_FILTER_FIELDS: QuickFilterField[] = [
  { key: 'code', placeholder: 'Machine Code', className: 'w-36 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'name', placeholder: 'Machine Name', className: 'w-48 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' },
  { key: 'status', placeholder: 'Status', className: 'w-28 bg-gray-100 focus:bg-white border border-transparent focus:border-gray-300 rounded-md px-3 py-1.5 text-sm outline-none' }
];

const FILTER_RULE_FIELDS = ['Machine Code', 'Machine Name', 'Status'];

export const MachineList: React.FC = () => {
  const navigate = useNavigate();

  const [machines, setMachines] = useState<MachineRecord[]>(() => {
    const saved = localStorage.getItem('patel_strap_machines');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map((m: any) => ({
        id: m.id,
        code: m.code || m.id,
        name: m.name,
        outputKgPerHour: m.outputKgPerHour || (m.outputKgPerMin ? Math.round(m.outputKgPerMin * 60) : 300),
        status: m.status || 'Running',
        maxCapacityTonsPerMonth: m.maxCapacityTonsPerMonth || 20,
        remarks: m.remarks || '',
        updatedAt: m.updatedAt || new Date().toISOString()
      }));
    }
    return DEFAULT_MACHINES;
  });

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [globalSearch, setGlobalSearch] = useState('');
  const [quickFilters, setQuickFilters] = useState({ code: '', name: '', status: '' });
  const [filterRules, setFilterRules] = useState<FilterRule[]>([]);
  const [sortField, setSortField] = useState('Machine Code');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Modal State for Add/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMachine, setEditingMachine] = useState<MachineRecord | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    outputKgPerHour: '300',
    status: 'Running' as 'Running' | 'Idle' | 'Maintenance' | 'Disabled',
    maxCapacityTonsPerMonth: '20',
    remarks: ''
  });

  // Save to Local Storage & Sync with Production Planning
  useEffect(() => {
    // Save format compatible with planning page (outputKgPerMin = outputKgPerHour / 60)
    const syncData = machines.map(m => ({
      ...m,
      outputKgPerMin: parseFloat((m.outputKgPerHour / 60).toFixed(2))
    }));
    localStorage.setItem('patel_strap_machines', JSON.stringify(syncData));
  }, [machines]);

  const handleOpenAddModal = () => {
    setEditingMachine(null);
    setFormData({
      code: `EXT-0${machines.length + 1}`,
      name: `Machine ${machines.length + 1} (Extrusion Line)`,
      outputKgPerHour: '250',
      status: 'Running',
      maxCapacityTonsPerMonth: '20',
      remarks: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (machine: MachineRecord) => {
    setEditingMachine(machine);
    setFormData({
      code: machine.code,
      name: machine.name,
      outputKgPerHour: String(machine.outputKgPerHour),
      status: machine.status,
      maxCapacityTonsPerMonth: String(machine.maxCapacityTonsPerMonth || 20),
      remarks: machine.remarks || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteMachine = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete ${name}?`)) {
      setMachines(prev => prev.filter(m => m.id !== id));
      successToast(`Deleted ${name}`);
    }
  };

  const handleSaveMachine = () => {
    if (!formData.name.trim() || !formData.code.trim()) {
      errorToast('Please enter machine code and name');
      return;
    }

    const kgPerHour = parseFloat(formData.outputKgPerHour);
    if (isNaN(kgPerHour) || kgPerHour <= 0) {
      errorToast('Please enter a valid Per-Hour Limit (KG/Hour)');
      return;
    }

    if (editingMachine) {
      // Edit Existing
      setMachines(prev => prev.map(m => m.id === editingMachine.id ? {
        ...m,
        code: formData.code.trim(),
        name: formData.name.trim(),
        outputKgPerHour: kgPerHour,
        status: formData.status,
        maxCapacityTonsPerMonth: parseFloat(formData.maxCapacityTonsPerMonth) || 20,
        remarks: formData.remarks.trim(),
        updatedAt: new Date().toISOString()
      } : m));
      successToast(`Updated ${formData.name}`);
    } else {
      // Add New
      const newMachine: MachineRecord = {
        id: `M-0${machines.length + 1}`,
        code: formData.code.trim(),
        name: formData.name.trim(),
        outputKgPerHour: kgPerHour,
        status: formData.status,
        maxCapacityTonsPerMonth: parseFloat(formData.maxCapacityTonsPerMonth) || 20,
        remarks: formData.remarks.trim(),
        updatedAt: new Date().toISOString()
      };
      setMachines(prev => [...prev, newMachine]);
      successToast(`Added ${newMachine.name}`);
    }

    setIsModalOpen(false);
  };

  // Filtered Machines
  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      if (globalSearch) {
        const q = globalSearch.toLowerCase();
        if (!m.code.toLowerCase().includes(q) && !m.name.toLowerCase().includes(q) && !m.status.toLowerCase().includes(q)) return false;
      }
      if (quickFilters.code && !m.code.toLowerCase().includes(quickFilters.code.toLowerCase())) return false;
      if (quickFilters.name && !m.name.toLowerCase().includes(quickFilters.name.toLowerCase())) return false;
      if (quickFilters.status && !m.status.toLowerCase().includes(quickFilters.status.toLowerCase())) return false;
      return true;
    }).sort((a, b) => {
      let comp = 0;
      if (sortField === 'Machine Code') comp = a.code.localeCompare(b.code);
      else if (sortField === 'Machine Name') comp = a.name.localeCompare(b.name);
      else comp = a.outputKgPerHour - b.outputKgPerHour;
      return sortOrder === 'asc' ? comp : -comp;
    });
  }, [machines, globalSearch, quickFilters, sortField, sortOrder]);

  const columns: ColumnDef<MachineRecord>[] = [
    {
      key: 'code',
      title: 'Machine Code',
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <Factory className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-sm text-gray-900">{row.code}</span>
        </div>
      )
    },
    {
      key: 'name',
      title: 'Machine Name',
      render: (_, row) => <span className="font-semibold text-sm text-gray-800">{row.name}</span>
    },
    {
      key: 'outputKgPerHour',
      title: 'Per-Hour Limit (Capacity)',
      render: (_, row) => (
        <div className="flex flex-col">
          <div className="font-bold text-sm text-emerald-700">
            {row.outputKgPerHour.toLocaleString()} <span className="text-xs font-normal text-gray-500">KG / Hour</span>
          </div>
          <span className="text-[11px] text-gray-400 font-mono">
            ({(row.outputKgPerHour / 60).toFixed(1)} KG / Min)
          </span>
        </div>
      )
    },
    {
      key: 'maxCapacityTonsPerMonth',
      title: 'Monthly Tonnes Limit',
      render: (_, row) => (
        <span className="text-sm font-semibold text-gray-700">
          {row.maxCapacityTonsPerMonth || 20} Tonnes / Month
        </span>
      )
    },
    {
      key: 'status',
      title: 'Status',
      render: (_, row) => (
        <StatusBadge
          status={row.status === 'Running' ? 'Active' : row.status === 'Idle' ? 'Draft' : 'Disabled'}
          size="sm"
        />
      )
    },
    {
      key: 'actions',
      title: 'Actions',
      render: (_, row) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors"
            title="Edit Machine Capacity"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleDeleteMachine(row.id, row.name)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="Delete Machine"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ERPListPageLayout<MachineRecord>
        title="Machine Master (Capacity & Per-Hour Limits)"
        data={filteredMachines}
        columns={columns}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        onAddNew={handleOpenAddModal}
        addNewLabel="Add Machine"
        searchPlaceholder="Search Machine Master..."
        globalSearch={globalSearch}
        setGlobalSearch={setGlobalSearch}
        quickFilterFields={QUICK_FILTER_FIELDS}
        quickFilters={quickFilters}
        onQuickFilterChange={(key, val) => setQuickFilters(prev => ({ ...prev, [key]: val }))}
        filterRuleFields={FILTER_RULE_FIELDS}
        filterRules={filterRules}
        setFilterRules={setFilterRules}
        onClearAllFilters={() => { setGlobalSearch(''); setQuickFilters({ code: '', name: '', status: '' }); setFilterRules([]); }}
        sortField={sortField}
        setSortField={setSortField}
        sortOrder={sortOrder}
        setSortOrder={setSortOrder}
        assignedToFilter=""
        onAssignedToChange={() => {}}
        createdByFilter=""
        onCreatedByChange={() => {}}
        tagFilter=""
        onTagChange={() => {}}
        showTags={false}
        onShowTagsChange={() => {}}
        extraHeaderActions={
          <button
            onClick={() => navigate('/production-planning')}
            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            <Sliders className="w-4 h-4" />
            <span>Go to Production Planning</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        }
      />

      {/* ADD / EDIT MACHINE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden p-6 animate-in zoom-in-95 duration-200 space-y-4">
            
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Factory className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    {editingMachine ? 'Edit Machine Capacity & Limit' : 'Add New Production Machine'}
                  </h3>
                  <p className="text-xs text-gray-500">Configure machine per-hour output limit and operating status.</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700">Machine Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="e.g. EXT-01"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-600 mt-1"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700">Machine Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Machine 1 (High-Speed Extrusion Line)"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-600 mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-gray-700">Per-Hour Limit (KG / Hour) *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={formData.outputKgPerHour}
                    onChange={(e) => setFormData(prev => ({ ...prev, outputKgPerHour: e.target.value }))}
                    placeholder="e.g. 300"
                    className="w-full bg-emerald-50/50 border border-emerald-300 rounded-xl p-2.5 font-bold text-emerald-900 outline-none focus:bg-white focus:border-emerald-600 mt-1 text-sm"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block font-mono">
                    = {((parseFloat(formData.outputKgPerHour) || 0) / 60).toFixed(1)} KG / Minute
                  </span>
                </div>

                <div>
                  <label className="font-bold text-gray-700">Monthly Target (Tonnes)</label>
                  <input
                    type="number"
                    step="1"
                    value={formData.maxCapacityTonsPerMonth}
                    onChange={(e) => setFormData(prev => ({ ...prev, maxCapacityTonsPerMonth: e.target.value }))}
                    placeholder="e.g. 30"
                    className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-600 mt-1"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700">Machine Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as any }))}
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-bold text-gray-900 outline-none focus:bg-white focus:border-emerald-600 mt-1 cursor-pointer"
                >
                  <option value="Running">Running / Active</option>
                  <option value="Idle">Idle</option>
                  <option value="Maintenance">Under Maintenance</option>
                  <option value="Disabled">Disabled</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700">Remarks / Specification Notes</label>
                <textarea
                  value={formData.remarks}
                  onChange={(e) => setFormData(prev => ({ ...prev, remarks: e.target.value }))}
                  rows={2}
                  placeholder="e.g. High-speed PET strap extrusion line with dual winder"
                  className="w-full bg-gray-50 border border-gray-300 rounded-xl p-2.5 font-medium text-gray-900 outline-none focus:bg-white focus:border-emerald-600 mt-1"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveMachine}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs"
              >
                {editingMachine ? 'Save Changes' : 'Create Machine'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
