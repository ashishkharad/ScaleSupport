import React, { useState } from 'react';
import {
  Building,
  MapPin,
  Users,
  ChevronRight,
  Plus,
  Shield,
  Layers,
  ArrowRight,
  TrendingUp,
  FolderTree,
  UserCheck,
  Percent,
  CheckCircle2,
  Edit,
  Building2,
  Network,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Bank, RecoveryDepartment, Branch, User } from '../../types';

export const HierarchyManagementSection: React.FC = () => {
  const {
    currentUser,
    banks,
    zones,
    recoveryDepartments,
    branches,
    users,
    addBank,
    updateBank,
    addRecoveryDepartment,
    updateRecoveryDepartment,
    addBranch,
    updateBranch,
  } = useSRMS();

  // Active view tab: 'tree' | 'banks' | 'departments' | 'branches'
  const [activeTab, setActiveTab] = useState<'tree' | 'banks' | 'departments' | 'branches'>('tree');

  // Selected Bank for drill-down in tree view
  const [selectedBankId, setSelectedBankId] = useState<string>(banks[0]?.id || '');

  // Bank Form State
  const [isAddBankOpen, setIsAddBankOpen] = useState(false);
  const [newBankName, setNewBankName] = useState('');
  const [newBankCode, setNewBankCode] = useState('');
  const [newBankRate, setNewBankRate] = useState(10);
  const [newBankDesc, setNewBankDesc] = useState('');

  // Department Form State
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptCode, setNewDeptCode] = useState('');
  const [newDeptBankName, setNewDeptBankName] = useState(banks[0]?.name || '');
  const [newDeptZoneName, setNewDeptZoneName] = useState(zones[0]?.name || '');
  const [newDeptHead, setNewDeptHead] = useState('');
  const [newDeptDesc, setNewDeptDesc] = useState('');

  // Branch Form State
  const [isAddBranchOpen, setIsAddBranchOpen] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchCode, setNewBranchCode] = useState('');
  const [newBranchBank, setNewBranchBank] = useState(banks[0]?.name || '');
  const [newBranchZone, setNewBranchZone] = useState(zones[0]?.name || '');
  const [newBranchDept, setNewBranchDept] = useState(recoveryDepartments[0]?.name || '');
  const [newBranchManager, setNewBranchManager] = useState('');
  const [newBranchTarget, setNewBranchTarget] = useState(1000000);

  const selectedBank = banks.find((b) => b.id === selectedBankId) || banks[0];
  const bankDepartments = recoveryDepartments.filter((d) => !d.bankName || d.bankName === selectedBank?.name);
  const bankBranches = branches.filter((br) => !br.bankName || br.bankName === selectedBank?.name);

  const handleCreateBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBankName.trim()) return;
    addBank({
      name: newBankName.trim(),
      code: newBankCode.trim().toUpperCase() || 'BNK',
      defaultCommissionRate: Number(newBankRate),
      description: newBankDesc.trim(),
      active: true,
    });
    setIsAddBankOpen(false);
    setNewBankName('');
    setNewBankCode('');
    setNewBankDesc('');
  };

  const handleCreateDept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeptName.trim()) return;
    addRecoveryDepartment({
      name: newDeptName.trim(),
      code: newDeptCode.trim().toUpperCase() || 'RD',
      bankName: newDeptBankName,
      zoneName: newDeptZoneName,
      headName: newDeptHead.trim() || 'Department Head',
      description: newDeptDesc.trim(),
      active: true,
    });
    setIsAddDeptOpen(false);
    setNewDeptName('');
    setNewDeptCode('');
    setNewDeptHead('');
    setNewDeptDesc('');
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    addBranch({
      name: newBranchName.trim(),
      code: newBranchCode.trim().toUpperCase() || 'BR',
      bankName: newBranchBank,
      zoneName: newBranchZone,
      departmentName: newBranchDept,
      managerName: newBranchManager.trim() || 'Branch Manager',
      targetAmount: Number(newBranchTarget),
      active: true,
    });
    setIsAddBranchOpen(false);
    setNewBranchName('');
    setNewBranchCode('');
    setNewBranchManager('');
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* Header & Hierarchy Flow Diagram */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200 font-bold">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Organizational Hierarchy &amp; Access Controls</span>
                <span className="px-2 py-0.5 bg-blue-50 text-blue-700 font-mono text-[10px] font-bold rounded-full border border-blue-200">
                  Strict RBAC Flow
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Bank → Zone → Recovery Department → Branch → User (Manager / Recovery Agent) → Customer (Accounts &amp; OTS)
              </p>
            </div>
          </div>

          {currentUser.role === 'admin' && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddDeptOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Department</span>
              </button>
              <button
                onClick={() => setIsAddBranchOpen(true)}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Branch</span>
              </button>
              <button
                onClick={() => setIsAddBankOpen(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              >
                <Building className="w-3.5 h-3.5" />
                <span>Add Bank</span>
              </button>
            </div>
          )}
        </div>

        {/* Hierarchy Chain Step Visualizer */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 shadow-2xs">
            <Building className="w-3.5 h-3.5 text-blue-600" />
            <span>1. Bank</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 shadow-2xs">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Zone</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-purple-600" />
            <span>3. Recovery Dept</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 shadow-2xs">
            <Layers className="w-3.5 h-3.5 text-amber-600" />
            <span>4. Branch</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-900 shadow-2xs">
            <Users className="w-3.5 h-3.5 text-indigo-600" />
            <span>5. User</span>
          </div>
          <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
          <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1.5 rounded-lg border border-emerald-200 text-emerald-800 font-bold shadow-2xs">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>6. Customer</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold w-fit">
        {[
          { id: 'tree', label: 'Hierarchical Tree Explorer', icon: FolderTree },
          { id: 'banks', label: 'Banks', count: banks.length, icon: Building },
          { id: 'departments', label: 'Recovery Departments', count: recoveryDepartments.length, icon: Building2 },
          { id: 'branches', label: 'Branches', count: branches.length, icon: Layers },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-2 rounded-lg transition cursor-pointer flex items-center gap-2 ${
                isActive
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-blue-100 text-blue-800 font-bold' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 1. HIERARCHICAL TREE VIEW */}
      {/* ======================================================== */}
      {activeTab === 'tree' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 text-xs">
          {/* Bank Selector Column */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-4 shadow-xs space-y-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              <span>Select Bank Hierarchy</span>
            </h3>
            <div className="space-y-2">
              {banks.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBankId(b.id)}
                  className={`w-full p-3 rounded-xl border text-left transition cursor-pointer flex items-center justify-between ${
                    selectedBankId === b.id
                      ? 'bg-blue-50/80 border-blue-500 ring-1 ring-blue-500'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{b.name}</div>
                    <span className="font-mono text-blue-600 text-[11px] font-semibold">{b.code}</span>
                  </div>
                  <div className="text-right">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold font-mono text-[11px]">
                      {b.defaultCommissionRate}% Default
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Hierarchy Breakdown Column */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">{selectedBank?.name} Structure</h3>
                <p className="text-slate-500 text-[11px]">Full drill-down of zones, departments, branches, managers, and agents</p>
              </div>
              <span className="px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-lg border border-blue-200 text-xs">
                Code: {selectedBank?.code}
              </span>
            </div>

            {/* Tree Branch Visualizer */}
            <div className="space-y-4 font-sans">
              {zones.map((z) => {
                const zoneDepts = bankDepartments.filter((d) => !d.zoneName || d.zoneName === z.name);
                const zoneBranches = bankBranches.filter((br) => !br.zoneName || br.zoneName === z.name);

                return (
                  <div key={z.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span className="font-bold text-slate-900 text-sm">{z.name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">({z.code})</span>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {zoneBranches.length} Branches • {zoneDepts.length} Recovery Depts
                      </span>
                    </div>

                    {/* Departments under Zone */}
                    {zoneDepts.length > 0 && (
                      <div className="pl-4 border-l-2 border-purple-300 space-y-2">
                        <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">
                          Recovery Departments:
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {zoneDepts.map((d) => (
                            <div key={d.id} className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                              <div className="font-bold text-slate-800">{d.name}</div>
                              <div className="text-[11px] text-slate-500 flex justify-between">
                                <span>Head: {d.headName || 'Assigned Head'}</span>
                                <span className="font-mono text-purple-700 font-semibold">{d.code}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Branches under Zone */}
                    <div className="pl-4 border-l-2 border-blue-300 space-y-2">
                      <span className="text-[10px] text-blue-700 font-bold uppercase tracking-wider block">
                        Branches &amp; Field Staff:
                      </span>
                      <div className="space-y-2">
                        {zoneBranches.map((br) => {
                          const branchAgents = users.filter(
                            (u) => u.role === 'agent' && u.branch === br.name
                          );
                          const branchManager = users.find(
                            (u) => u.role === 'branch_manager' && u.branch === br.name
                          );

                          return (
                            <div key={br.id} className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <span className="font-bold text-slate-900">{br.name}</span>
                                  <span className="text-slate-500 font-mono text-[10px] ml-2">({br.code})</span>
                                </div>
                                <span className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-medium">
                                  Manager: {branchManager?.name || br.managerName || 'Assigned Manager'}
                                </span>
                              </div>

                              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                <span className="text-[10px] text-slate-400 font-semibold">Active Agents:</span>
                                {branchAgents.length === 0 ? (
                                  <span className="text-slate-400 italic text-[11px]">No agents allocated</span>
                                ) : (
                                  branchAgents.map((ag) => (
                                    <span
                                      key={ag.id}
                                      className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-medium text-[10px] border border-blue-200"
                                    >
                                      {ag.name} ({ag.agentId || 'RA'})
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BANKS TABLE */}
      {/* ======================================================== */}
      {activeTab === 'banks' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Bank Name &amp; Code</th>
                <th className="p-3.5">Description</th>
                <th className="p-3.5 text-right">Default Commission Rate</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {banks.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900 text-sm">{b.name}</div>
                    <span className="font-mono text-blue-600 text-[11px] font-semibold">{b.code}</span>
                  </td>
                  <td className="p-3.5 text-slate-600">{b.description || 'Commercial Scheduled Bank'}</td>
                  <td className="p-3.5 text-right font-mono font-black text-sm text-emerald-600">
                    {b.defaultCommissionRate}%
                  </td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] border border-emerald-300">
                      {b.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. RECOVERY DEPARTMENTS TABLE */}
      {/* ======================================================== */}
      {activeTab === 'departments' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Department Name &amp; Code</th>
                <th className="p-3.5">Assigned Bank</th>
                <th className="p-3.5">Zone</th>
                <th className="p-3.5">Department Head</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recoveryDepartments.map((d) => (
                <tr key={d.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{d.name}</div>
                    <span className="font-mono text-purple-700 text-[10px] font-semibold">{d.code}</span>
                  </td>
                  <td className="p-3.5 font-semibold text-slate-800">{d.bankName}</td>
                  <td className="p-3.5 text-slate-600">{d.zoneName}</td>
                  <td className="p-3.5 text-slate-700 font-medium">{d.headName}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] border border-emerald-300">
                      {d.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. BRANCHES TABLE */}
      {/* ======================================================== */}
      {activeTab === 'branches' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs text-xs">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="p-3.5">Branch Name &amp; Code</th>
                <th className="p-3.5">Bank &amp; Department</th>
                <th className="p-3.5">Zone</th>
                <th className="p-3.5">Branch Manager</th>
                <th className="p-3.5 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {branches.map((br) => (
                <tr key={br.id} className="hover:bg-slate-50 transition">
                  <td className="p-3.5">
                    <div className="font-bold text-slate-900">{br.name}</div>
                    <span className="font-mono text-blue-600 text-[10px] font-semibold">{br.code}</span>
                  </td>
                  <td className="p-3.5 text-[11px]">
                    <span className="font-semibold text-slate-800 block">{br.bankName || 'State Bank of India'}</span>
                    <span className="text-slate-500">{br.departmentName || 'Recovery Cell'}</span>
                  </td>
                  <td className="p-3.5 text-slate-600">{br.zoneName}</td>
                  <td className="p-3.5 text-slate-700 font-medium">{br.managerName}</td>
                  <td className="p-3.5 text-center">
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] border border-emerald-300">
                      {br.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD BANK */}
      {/* ======================================================== */}
      {isAddBankOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl text-slate-800 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Add New Banking Institution</h3>
              <button onClick={() => setIsAddBankOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBank} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Bank Name *:</label>
                <input
                  type="text"
                  value={newBankName}
                  onChange={(e) => setNewBankName(e.target.value)}
                  placeholder="e.g. Bank of Baroda"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Code *:</label>
                  <input
                    type="text"
                    value={newBankCode}
                    onChange={(e) => setNewBankCode(e.target.value)}
                    placeholder="e.g. BOB"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Default Rate (%):</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={newBankRate}
                    onChange={(e) => setNewBankRate(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description:</label>
                <input
                  type="text"
                  value={newBankDesc}
                  onChange={(e) => setNewBankDesc(e.target.value)}
                  placeholder="e.g. Public Sector Scheduled Bank"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBankOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-white shadow-xs cursor-pointer"
                >
                  Save Bank
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD RECOVERY DEPARTMENT */}
      {/* ======================================================== */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl text-slate-800 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Add Recovery Department</h3>
              <button onClick={() => setIsAddDeptOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateDept} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Department Name *:</label>
                <input
                  type="text"
                  value={newDeptName}
                  onChange={(e) => setNewDeptName(e.target.value)}
                  placeholder="e.g. SAMB Stressed Asset Recovery Cell"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank *:</label>
                  <select
                    value={newDeptBankName}
                    onChange={(e) => setNewDeptBankName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Zone *:</label>
                  <select
                    value={newDeptZoneName}
                    onChange={(e) => setNewDeptZoneName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Dept Code:</label>
                  <input
                    type="text"
                    value={newDeptCode}
                    onChange={(e) => setNewDeptCode(e.target.value)}
                    placeholder="e.g. RD-PUN"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Department Head:</label>
                  <input
                    type="text"
                    value={newDeptHead}
                    onChange={(e) => setNewDeptHead(e.target.value)}
                    placeholder="e.g. Rajesh Shinde"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddDeptOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-white shadow-xs cursor-pointer"
                >
                  Save Department
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD BRANCH */}
      {/* ======================================================== */}
      {isAddBranchOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl text-slate-800 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900">Add Operating Branch</h3>
              <button onClick={() => setIsAddBranchOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="p-6 space-y-4">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Branch Name *:</label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="e.g. Pune Camp Retail Hub"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank *:</label>
                  <select
                    value={newBranchBank}
                    onChange={(e) => setNewBranchBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Zone *:</label>
                  <select
                    value={newBranchZone}
                    onChange={(e) => setNewBranchZone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {zones.map((z) => (
                      <option key={z.id} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch Code:</label>
                  <input
                    type="text"
                    value={newBranchCode}
                    onChange={(e) => setNewBranchCode(e.target.value)}
                    placeholder="e.g. BR-PUN-03"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 uppercase focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch Manager:</label>
                  <input
                    type="text"
                    value={newBranchManager}
                    onChange={(e) => setNewBranchManager(e.target.value)}
                    placeholder="e.g. Sunita Deshmukh"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBranchOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-white shadow-xs cursor-pointer"
                >
                  Save Branch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
