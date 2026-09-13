import React, { useState, useMemo } from 'react';
import {
  Percent,
  Plus,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  UserCheck,
  Shield,
  Layers,
  Sparkles,
  Calculator,
  Search,
  ArrowRight,
  TrendingUp,
  Download,
  Building,
  RotateCcw,
  History,
  Tag,
  ChevronRight,
  Check,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import {
  CommissionRule,
  UserCommissionAssignment,
  QDType,
  RecoveryStage,
  CommissionPriorityLevel,
  CommissionAuditLog,
} from '../../types';
import { formatINR } from '../../utils/watermark';

const ALL_QD_TYPES: (QDType | 'All QDs')[] = [
  'All QDs',
  'SMA-0 (0-30 DPD)',
  'SMA-1 (31-60 DPD)',
  'SMA-2 (61-90 DPD)',
  'Critical NPA (>90 DPD)',
  'OTS Schemes',
  'Special Recovery Drive',
];

const ALL_RECOVERY_STAGES: (RecoveryStage | 'All Stages')[] = [
  'All Stages',
  'Early Stage (0-30 DPD)',
  'Mid Stage (31-90 DPD)',
  'Late Stage / Hardcore NPA',
  'OTS Token (10%)',
  'OTS Full Settlement',
  'Partial Recovery',
  'Full Settlement / Closed',
];

export const CommissionManagementSection: React.FC = () => {
  const {
    currentUser,
    banks,
    zones,
    branches,
    recoveryDepartments,
    users,
    commissionRules,
    userCommissionAssignments,
    commissionAuditLogs,
    scopedRules,
    scopedAssignments,
    scopedCommissions,
    scopedRecoveries,
    addCommissionRule,
    updateCommissionRule,
    deactivateCommissionRule,
    addUserCommissionAssignment,
    updateUserCommissionAssignment,
    deactivateUserCommissionAssignment,
    calculateCommission,
    commissionSettings,
    updateCommissionRate,
  } = useSRMS();

  // Active subtab: 'rules' | 'assignments' | 'calculator' | 'ledger' | 'audit'
  const [activeTab, setActiveTab] = useState<'rules' | 'assignments' | 'calculator' | 'ledger' | 'audit'>('rules');

  // Filters
  const [filterBank, setFilterBank] = useState<string>('ALL');
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [filterQD, setFilterQD] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals / forms
  const [isAddRuleOpen, setIsAddRuleOpen] = useState<boolean>(false);
  const [ruleName, setRuleName] = useState<string>('');
  const [ruleBank, setRuleBank] = useState<string>('All Banks');
  const [ruleZone, setRuleZone] = useState<string>('All Zones');
  const [ruleDept, setRuleDept] = useState<string>('All Departments');
  const [ruleBranch, setRuleBranch] = useState<string>('All Branches');
  const [ruleQD, setRuleQD] = useState<QDType | 'All QDs'>('All QDs');
  const [ruleStage, setRuleStage] = useState<RecoveryStage | 'All Stages'>('All Stages');
  const [rulePercentage, setRulePercentage] = useState<number>(10);
  const [ruleEffectiveFrom, setRuleEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [ruleEffectiveTo, setRuleEffectiveTo] = useState<string>('');
  const [ruleDescription, setRuleDescription] = useState<string>('');
  const [ruleFormError, setRuleFormError] = useState<string | null>(null);

  // User Assignment Form
  const [isAddAssignmentOpen, setIsAddAssignmentOpen] = useState<boolean>(false);
  const [assignmentAgentId, setAssignmentAgentId] = useState<string>('');
  const [assignmentPercentage, setAssignmentPercentage] = useState<number>(12);
  const [assignmentBank, setAssignmentBank] = useState<string>('');
  const [assignmentZone, setAssignmentZone] = useState<string>('');
  const [assignmentBranch, setAssignmentBranch] = useState<string>('');
  const [assignmentEffectiveFrom, setAssignmentEffectiveFrom] = useState<string>(new Date().toISOString().slice(0, 10));
  const [assignmentEffectiveTo, setAssignmentEffectiveTo] = useState<string>('');
  const [assignmentRemarks, setAssignmentRemarks] = useState<string>('');
  const [assignmentFormError, setAssignmentFormError] = useState<string | null>(null);

  // Live Calculator Simulator State
  const [simAmount, setSimAmount] = useState<number>(50000);
  const [simAgentId, setSimAgentId] = useState<string>(users.find((u) => u.role === 'agent')?.agentId || users.find((u) => u.role === 'agent')?.id || users[0]?.id || '');
  const [simBank, setSimBank] = useState<string>('State Bank of India');
  const [simZone, setSimZone] = useState<string>('Maharashtra North Zone');
  const [simBranch, setSimBranch] = useState<string>('Pune Main SME Recovery');
  const [simQD, setSimQD] = useState<QDType>('Critical NPA (>90 DPD)');
  const [simStage, setSimStage] = useState<RecoveryStage>('Partial Recovery');

  // Filtered Rules
  const displayedRules = useMemo(() => {
    return scopedRules.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.code && r.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        r.bankName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesBank = filterBank === 'ALL' || r.bankName === filterBank || r.bankName === 'All Banks';
      const matchesZone = filterZone === 'ALL' || r.zoneName === filterZone || r.zoneName === 'All Zones';
      const matchesQD = filterQD === 'ALL' || r.qdType === filterQD || r.qdType === 'All QDs';
      const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
      return matchesSearch && matchesBank && matchesZone && matchesQD && matchesStatus;
    });
  }, [scopedRules, searchTerm, filterBank, filterZone, filterQD, filterStatus]);

  // Filtered Assignments
  const displayedAssignments = useMemo(() => {
    return scopedAssignments.filter((a) => {
      const matchesSearch =
        a.agentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.agentId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'ALL' || a.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [scopedAssignments, searchTerm, filterStatus]);

  // Simulation Calculation Result
  const simulationResult = useMemo(() => {
    const selectedAgent = users.find((u) => u.agentId === simAgentId || u.id === simAgentId);
    return calculateCommission({
      eligibleAmount: simAmount,
      recoveryDate: new Date().toISOString().slice(0, 10),
      agentId: simAgentId,
      bankName: simBank || selectedAgent?.bank,
      zoneName: simZone || selectedAgent?.zone,
      branchName: simBranch || selectedAgent?.branch,
      qdType: simQD,
      recoveryStage: simStage,
    });
  }, [simAmount, simAgentId, simBank, simZone, simBranch, simQD, simStage, calculateCommission, users]);

  // Summary Metrics
  const activeRulesCount = scopedRules.filter((r) => r.status === 'active').length;
  const activeAssignmentsCount = scopedAssignments.filter((a) => a.status === 'active').length;
  const totalCommissionEarned = scopedCommissions.reduce((sum, c) => sum + c.commissionAmount, 0);
  const totalRecoveryProcessed = scopedRecoveries.reduce((sum, r) => sum + r.amount, 0);

  // Form Handlers
  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    setRuleFormError(null);

    const res = addCommissionRule({
      name: ruleName,
      bankName: ruleBank,
      zoneName: ruleZone,
      departmentName: ruleDept,
      branchName: ruleBranch,
      qdType: ruleQD,
      recoveryStage: ruleStage,
      commissionPercentage: Number(rulePercentage),
      effectiveFrom: ruleEffectiveFrom,
      effectiveTo: ruleEffectiveTo || undefined,
      description: ruleDescription,
      status: 'active',
    });

    if (!res.success) {
      setRuleFormError(res.message);
      return;
    }

    setIsAddRuleOpen(false);
    setRuleName('');
    setRuleDescription('');
  };

  const handleCreateAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    setAssignmentFormError(null);

    const agent = users.find((u) => u.id === assignmentAgentId || u.agentId === assignmentAgentId);
    if (!agent) {
      setAssignmentFormError('Please select a valid recovery agent.');
      return;
    }

    const res = addUserCommissionAssignment({
      agentId: agent.agentId || agent.id,
      agentName: agent.name,
      percentageOverride: Number(assignmentPercentage),
      bankName: assignmentBank || agent.bank,
      zoneName: assignmentZone || agent.zone,
      branchName: assignmentBranch || agent.branch,
      effectiveFrom: assignmentEffectiveFrom,
      effectiveTo: assignmentEffectiveTo || undefined,
      remarks: assignmentRemarks,
      status: 'active',
    });

    if (!res.success) {
      setAssignmentFormError(res.message);
      return;
    }

    setIsAddAssignmentOpen(false);
    setAssignmentRemarks('');
  };

  // Export Commission Ledger to CSV
  const handleExportCommissionCSV = () => {
    const headers = [
      'Commission ID',
      'Agent Name',
      'Agent ID',
      'Recovery ID',
      'Account ID',
      'Recovery Amount (INR)',
      'Commission Rate (%)',
      'Commission Amount (INR)',
      'Date',
      'Status',
      'Priority Level',
      'Priority Description',
      'Bank',
      'Zone',
      'Branch',
      'QD Type',
      'Recovery Stage',
    ];

    const rows = scopedCommissions.map((c) => [
      c.id,
      `"${c.agentName}"`,
      c.agentId,
      c.recoveryId,
      c.accountId,
      c.recoveryAmount,
      `${c.commissionRate}%`,
      c.commissionAmount,
      c.date,
      c.status,
      c.priorityLevel || 'Default Rate',
      `"${c.priorityDescription || ''}"`,
      `"${c.bank || ''}"`,
      `"${c.zone || ''}"`,
      `"${c.branch || ''}"`,
      `"${c.qdType || ''}"`,
      `"${c.recoveryStage || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Commission_Ledger_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getPriorityBadge = (p?: CommissionPriorityLevel) => {
    switch (p) {
      case 1:
        return <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[10px] border border-purple-200">Priority 1: Agent Override</span>;
      case 2:
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded font-bold text-[10px] border border-blue-200">Priority 2: Bank+Zone+Branch+QD</span>;
      case 3:
        return <span className="px-2 py-0.5 bg-cyan-100 text-cyan-800 rounded font-bold text-[10px] border border-cyan-200">Priority 3: Bank+Zone+QD</span>;
      case 4:
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] border border-amber-200">Priority 4: Bank+Zone</span>;
      case 5:
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px] border border-emerald-200">Priority 5: Bank Default</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-bold text-[10px] border border-slate-200">System Default</span>;
    }
  };

  return (
    <div className="space-y-5 text-slate-800">
      {/* Top Header & Metrics Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 text-blue-600 flex items-center justify-center border border-blue-200 font-bold">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Commission Management Engine</span>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 font-mono text-[10px] font-bold rounded-full border border-emerald-200">
                  Priority 1-5 Engine
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                User-wise commission rates, hierarchical rule priorities (Bank → Zone → Branch → QD), and immutable transaction records
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCommissionCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Ledger (.csv)</span>
            </button>
            {currentUser.role === 'admin' && (
              <>
                <button
                  onClick={() => setIsAddAssignmentOpen(true)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Assign Agent Rate</span>
                </button>
                <button
                  onClick={() => setIsAddRuleOpen(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Hierarchy Rule</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* 4 Metric Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium">Active Hierarchy Rules</span>
            <div className="text-lg font-black text-slate-900 font-mono">{activeRulesCount}</div>
            <span className="text-[10px] text-blue-600 font-semibold">Priority Levels 2 to 5</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium">Agent Specific Overrides</span>
            <div className="text-lg font-black text-purple-700 font-mono">{activeAssignmentsCount}</div>
            <span className="text-[10px] text-purple-600 font-semibold">Priority 1 Overrides</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium">Total Recoveries Processed</span>
            <div className="text-lg font-black text-emerald-700 font-mono">{formatINR(totalRecoveryProcessed)}</div>
            <span className="text-[10px] text-slate-500">{scopedRecoveries.length} Transactions</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
            <span className="text-[11px] text-slate-500 font-medium">Commissions Calculated</span>
            <div className="text-lg font-black text-amber-700 font-mono">{formatINR(totalCommissionEarned)}</div>
            <span className="text-[10px] text-amber-600 font-semibold">Fully Reconciled</span>
          </div>
        </div>
      </div>

      {/* Navigation Pills */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'rules', label: 'Hierarchy Commission Rules', count: scopedRules.length, icon: Layers },
            { id: 'assignments', label: 'Agent Specific Assignments', count: scopedAssignments.length, icon: UserCheck },
            { id: 'calculator', label: 'Priority Calculator & Simulator', icon: Calculator },
            { id: 'ledger', label: 'Transaction Commission Ledger', count: scopedCommissions.length, icon: History },
            { id: 'audit', label: 'Audit Trail', count: commissionAuditLogs.length, icon: Shield },
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

        {/* Search input for rules & assignments */}
        {(activeTab === 'rules' || activeTab === 'assignments' || activeTab === 'ledger') && (
          <div className="relative min-w-[220px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search rule, bank, or agent..."
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 1. HIERARCHY COMMISSION RULES TAB */}
      {/* ======================================================== */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
              <Filter className="w-3.5 h-3.5" />
              <span>Filters:</span>
            </div>

            <select
              value={filterBank}
              onChange={(e) => setFilterBank(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Banks</option>
              {banks.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>

            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.name}>
                  {z.name}
                </option>
              ))}
            </select>

            <select
              value={filterQD}
              onChange={(e) => setFilterQD(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All QD Types</option>
              {ALL_QD_TYPES.map((qd) => (
                <option key={qd} value={qd}>
                  {qd}
                </option>
              ))}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>

            {(filterBank !== 'ALL' || filterZone !== 'ALL' || filterQD !== 'ALL' || filterStatus !== 'ALL' || searchTerm) && (
              <button
                onClick={() => {
                  setFilterBank('ALL');
                  setFilterZone('ALL');
                  setFilterQD('ALL');
                  setFilterStatus('ALL');
                  setSearchTerm('');
                }}
                className="text-blue-600 hover:text-blue-800 font-semibold ml-auto flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            )}
          </div>

          {/* Rules Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Priority &amp; Code</th>
                    <th className="p-3.5">Rule Name</th>
                    <th className="p-3.5">Hierarchy Scope (Bank / Zone / Branch)</th>
                    <th className="p-3.5">QD Type &amp; Stage</th>
                    <th className="p-3.5 text-right">Commission Rate</th>
                    <th className="p-3.5">Effective Dates</th>
                    <th className="p-3.5 text-center">Status</th>
                    {currentUser.role === 'admin' && <th className="p-3.5 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedRules.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No commission rules match your selected filters.
                      </td>
                    </tr>
                  ) : (
                    displayedRules.map((rule) => (
                      <tr key={rule.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5">
                          <div className="space-y-1">
                            {getPriorityBadge(rule.priorityLevel)}
                            <span className="block font-mono text-[10px] text-slate-500 font-semibold">{rule.code}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{rule.name}</div>
                          {rule.description && <p className="text-[11px] text-slate-500">{rule.description}</p>}
                        </td>
                        <td className="p-3.5 text-[11px] space-y-0.5">
                          <div className="font-semibold text-slate-800 flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            <span>{rule.bankName}</span>
                          </div>
                          <div className="text-slate-500">{rule.zoneName} • {rule.branchName}</div>
                          {rule.departmentName && rule.departmentName !== 'All Departments' && (
                            <span className="inline-block px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[9px]">
                              {rule.departmentName}
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-[11px]">
                          <span className="font-medium text-purple-700 block">{rule.qdType}</span>
                          <span className="text-slate-500 text-[10px]">{rule.recoveryStage}</span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-sm text-emerald-600">
                          {rule.commissionPercentage}%
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-600">
                          <div>From: {rule.effectiveFrom}</div>
                          {rule.effectiveTo ? <div className="text-slate-500">To: {rule.effectiveTo}</div> : <span className="text-emerald-600 text-[10px]">Ongoing</span>}
                        </td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              rule.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {rule.status}
                          </span>
                        </td>
                        {currentUser.role === 'admin' && (
                          <td className="p-3.5 text-right">
                            {rule.status === 'active' ? (
                              <button
                                onClick={() => deactivateCommissionRule(rule.id)}
                                className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold border border-red-200 transition cursor-pointer"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => updateCommissionRule(rule.id, { status: 'active' })}
                                className="px-2.5 py-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold border border-emerald-200 transition cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. AGENT SPECIFIC ASSIGNMENTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'assignments' && (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-xl flex items-center justify-between text-xs text-purple-900">
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <span className="font-bold block">Priority 1: Agent Specific Direct Override</span>
                <span className="text-purple-700">
                  When a Recovery Agent has an active override configured here, this percentage is applied directly before evaluating Bank, Zone, Branch, or QD rules.
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Agent Details</th>
                    <th className="p-3.5">Assigned Hierarchy Scope</th>
                    <th className="p-3.5 text-right">Commission Rate Override</th>
                    <th className="p-3.5">Effective Dates</th>
                    <th className="p-3.5">Remarks / Rationale</th>
                    <th className="p-3.5 text-center">Status</th>
                    {currentUser.role === 'admin' && <th className="p-3.5 text-right">Action</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {displayedAssignments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No agent-specific commission overrides found.
                      </td>
                    </tr>
                  ) : (
                    displayedAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{a.agentName}</div>
                          <span className="font-mono text-purple-700 text-[11px] font-semibold">{a.agentId}</span>
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-600">
                          <div>{a.bankName || 'All Banks'}</div>
                          <div className="text-slate-500">{a.zoneName || 'All Zones'} • {a.branchName || 'All Branches'}</div>
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-sm text-purple-700">
                          {a.percentageOverride}%
                        </td>
                        <td className="p-3.5 text-[11px] text-slate-600">
                          <div>From: {a.effectiveFrom}</div>
                          {a.effectiveTo ? <div>To: {a.effectiveTo}</div> : <span className="text-emerald-600 text-[10px]">Ongoing</span>}
                        </td>
                        <td className="p-3.5 text-slate-600 italic max-w-xs">{a.remarks || 'Standard assignment'}</td>
                        <td className="p-3.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              a.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600 border border-slate-300'
                            }`}
                          >
                            {a.status}
                          </span>
                        </td>
                        {currentUser.role === 'admin' && (
                          <td className="p-3.5 text-right">
                            {a.status === 'active' ? (
                              <button
                                onClick={() => deactivateUserCommissionAssignment(a.id)}
                                className="px-2.5 py-1 text-red-600 hover:bg-red-50 rounded-lg text-xs font-semibold border border-red-200 transition cursor-pointer"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() => updateUserCommissionAssignment(a.id, { status: 'active' })}
                                className="px-2.5 py-1 text-emerald-600 hover:bg-emerald-50 rounded-lg text-xs font-semibold border border-emerald-200 transition cursor-pointer"
                              >
                                Activate
                              </button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PRIORITY CALCULATOR & SIMULATOR TAB */}
      {/* ======================================================== */}
      {activeTab === 'calculator' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Inputs Column */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4 text-xs">
            <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-blue-600" />
              <h3 className="font-bold text-sm text-slate-900">Commission Rule Priority Simulator</h3>
            </div>
            <p className="text-slate-500">
              Test any recovery transaction against the 5-tier priority hierarchy engine in real-time.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Eligible Recovery Amount (₹):</label>
                <input
                  type="number"
                  value={simAmount}
                  onChange={(e) => setSimAmount(Math.max(0, Number(e.target.value)))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Recovery Agent (Credited):</label>
                <select
                  value={simAgentId}
                  onChange={(e) => setSimAgentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {users.filter((u) => u.role === 'agent').map((u) => (
                    <option key={u.id} value={u.agentId || u.id}>
                      {u.name} ({u.agentId || u.id}) - {u.branch || 'Branch'}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Name:</label>
                  <select
                    value={simBank}
                    onChange={(e) => setSimBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {banks.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Zone:</label>
                  <select
                    value={simZone}
                    onChange={(e) => setSimZone(e.target.value)}
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
                  <label className="block text-slate-700 font-semibold mb-1">Branch:</label>
                  <select
                    value={simBranch}
                    onChange={(e) => setSimBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {branches.map((br) => (
                      <option key={br.id} value={br.name}>{br.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">QD Classification:</label>
                  <select
                    value={simQD}
                    onChange={(e) => setSimQD(e.target.value as QDType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALL_QD_TYPES.filter((q) => q !== 'All QDs').map((qd) => (
                      <option key={qd} value={qd}>{qd}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Recovery Stage:</label>
                <select
                  value={simStage}
                  onChange={(e) => setSimStage(e.target.value as RecoveryStage)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ALL_RECOVERY_STAGES.filter((s) => s !== 'All Stages').map((st) => (
                    <option key={st} value={st}>{st}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Results Column */}
          <div className="lg:col-span-6 bg-slate-900 text-white rounded-2xl p-5 shadow-lg space-y-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-sm">Engine Resolution Output</span>
                </div>
                {getPriorityBadge(simulationResult.priorityLevel)}
              </div>

              {simulationResult.conflictDetected && (
                <div className="p-3 bg-red-900/60 border border-red-500 rounded-xl text-red-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>Duplicate commission rule detected. Please resolve the conflicting commission rules.</span>
                </div>
              )}

              {/* Amount and Rate Highlighting */}
              <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="text-slate-400 text-xs font-medium">Applied Commission Rate:</span>
                  <span className="font-mono text-3xl font-black text-emerald-400">
                    {simulationResult.appliedPercentage}%
                  </span>
                </div>
                <div className="flex justify-between items-baseline border-t border-slate-700/80 pt-2">
                  <span className="text-slate-400 text-xs font-medium">Calculated Commission Payout:</span>
                  <span className="font-mono text-2xl font-black text-amber-400">
                    {formatINR(simulationResult.commissionAmount)}
                  </span>
                </div>
              </div>

              {/* Priority Ladder Step-by-Step Visualization */}
              <div className="space-y-2">
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
                  Priority Evaluation Ladder:
                </span>
                <div className="space-y-1.5 text-xs font-mono">
                  {[
                    { level: 1, name: '1. User/Agent Specific Override', matched: simulationResult.priorityLevel === 1 },
                    { level: 2, name: '2. Bank + Zone + Branch + QD Type', matched: simulationResult.priorityLevel === 2 },
                    { level: 3, name: '3. Bank + Zone + QD Type', matched: simulationResult.priorityLevel === 3 },
                    { level: 4, name: '4. Bank + Zone Broad Rule', matched: simulationResult.priorityLevel === 4 },
                    { level: 5, name: '5. Bank Default Rate', matched: simulationResult.priorityLevel === 5 },
                  ].map((tier) => (
                    <div
                      key={tier.level}
                      className={`p-2.5 rounded-lg border flex items-center justify-between ${
                        tier.matched
                          ? 'bg-blue-600/30 border-blue-500 text-white font-bold'
                          : 'bg-slate-800/40 border-slate-800 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {tier.matched ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-600" />}
                        <span>{tier.name}</span>
                      </div>
                      {tier.matched && <span className="text-emerald-400 text-[11px]">MATCHED &amp; APPLIED</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Rationale description */}
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-xs space-y-1">
                <span className="text-slate-400 font-semibold block">Resolution Explanation:</span>
                <p className="text-slate-200 italic">{simulationResult.priorityDescription}</p>
                {simulationResult.appliedRuleName && (
                  <span className="text-blue-400 block text-[11px] font-mono">
                    Rule: {simulationResult.appliedRuleName} ({simulationResult.appliedRuleId})
                  </span>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Simulation uses live in-memory &amp; persisted rule sets.</span>
              <span className="text-emerald-400 font-bold">100% Deterministic</span>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. TRANSACTION COMMISSION LEDGER TAB */}
      {/* ======================================================== */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Finalized Recovery Commission Ledger</h3>
              <p className="text-slate-500">
                Immutable commission records credited upon each recovery receipt creation with full rule audit snapshot.
              </p>
            </div>
            <div className="font-mono text-right">
              <span className="text-slate-500 block text-[11px]">Total Reconciled Payout:</span>
              <span className="text-emerald-700 font-black text-base">{formatINR(totalCommissionEarned)}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="p-3.5">Date &amp; Receipt</th>
                    <th className="p-3.5">Credited Agent</th>
                    <th className="p-3.5">Account ID &amp; Bank</th>
                    <th className="p-3.5 text-right">Recovery Amount</th>
                    <th className="p-3.5 text-right">Commission Rate</th>
                    <th className="p-3.5 text-right">Commission Amount</th>
                    <th className="p-3.5">Rule Priority Applied</th>
                    <th className="p-3.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {scopedCommissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-500">
                        No recovery commission entries recorded yet.
                      </td>
                    </tr>
                  ) : (
                    scopedCommissions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition">
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{c.date}</div>
                          <span className="font-mono text-blue-600 text-[10px]">{c.recoveryId}</span>
                        </td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{c.agentName}</div>
                          <span className="font-mono text-slate-500 text-[10px]">{c.agentId}</span>
                        </td>
                        <td className="p-3.5 text-[11px]">
                          <span className="font-mono font-bold text-slate-800 block">{c.accountId}</span>
                          <span className="text-slate-500">{c.bank || 'Bank'} • {c.branch || 'Branch'}</span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                          {formatINR(c.recoveryAmount)}
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-purple-700">
                          {c.commissionRate}%
                        </td>
                        <td className="p-3.5 text-right font-mono font-black text-sm text-emerald-600">
                          {formatINR(c.commissionAmount)}
                        </td>
                        <td className="p-3.5">
                          {getPriorityBadge(c.priorityLevel)}
                          {c.appliedRuleName && (
                            <span className="block text-[10px] text-slate-500 mt-0.5">{c.appliedRuleName}</span>
                          )}
                        </td>
                        <td className="p-3.5 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px] border border-emerald-300">
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. AUDIT TRAIL TAB */}
      {/* ======================================================== */}
      {activeTab === 'audit' && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-xs text-xs">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Commission Rule &amp; Assignment Audit Trail</h3>
            </div>
            <span className="text-slate-500 font-mono text-[11px]">{commissionAuditLogs.length} total recorded logs</span>
          </div>

          <div className="space-y-3">
            {commissionAuditLogs.length === 0 ? (
              <p className="text-slate-500 text-center py-6">No audit log entries recorded yet.</p>
            ) : (
              commissionAuditLogs.map((log) => (
                <div key={log.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'CREATED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : log.action === 'ASSIGNED'
                            ? 'bg-purple-100 text-purple-800'
                            : log.action === 'DEACTIVATED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {log.action}
                      </span>
                      <span className="font-bold text-slate-900">{log.entityName}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-slate-700">{log.details}</p>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <span>Authorized by:</span>
                    <span className="font-semibold text-slate-700">{log.performedByName}</span>
                    <span>({log.performedByUserId})</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE HIERARCHY COMMISSION RULE */}
      {/* ======================================================== */}
      {isAddRuleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl text-slate-800 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-600" />
                <span>Create Hierarchical Commission Rule</span>
              </h3>
              <button onClick={() => setIsAddRuleOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {ruleFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{ruleFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Rule Name *:</label>
                <input
                  type="text"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  placeholder="e.g. SBI Critical NPA Special Recovery Incentive"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Bank Scope:</label>
                  <select
                    value={ruleBank}
                    onChange={(e) => setRuleBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All Banks">All Banks</option>
                    {banks.map((b) => (
                      <option key={b.id} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Zone Scope:</label>
                  <select
                    value={ruleZone}
                    onChange={(e) => setRuleZone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All Zones">All Zones</option>
                    {zones.map((z) => (
                      <option key={z.id} value={z.name}>{z.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Recovery Department:</label>
                  <select
                    value={ruleDept}
                    onChange={(e) => setRuleDept(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All Departments">All Departments</option>
                    {recoveryDepartments.map((d) => (
                      <option key={d.id} value={d.name}>{d.name} ({d.bankName})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Branch Scope:</label>
                  <select
                    value={ruleBranch}
                    onChange={(e) => setRuleBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All Branches">All Branches</option>
                    {branches.map((br) => (
                      <option key={br.id} value={br.name}>{br.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">QD Classification:</label>
                  <select
                    value={ruleQD}
                    onChange={(e) => setRuleQD(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALL_QD_TYPES.map((qd) => (
                      <option key={qd} value={qd}>{qd}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Recovery Stage:</label>
                  <select
                    value={ruleStage}
                    onChange={(e) => setRuleStage(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {ALL_RECOVERY_STAGES.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Commission Percentage (0 - 100%) *:</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={rulePercentage}
                    onChange={(e) => setRulePercentage(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Effective From Date *:</label>
                  <input
                    type="date"
                    value={ruleEffectiveFrom}
                    onChange={(e) => setRuleEffectiveFrom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Effective To Date (Optional):</label>
                <input
                  type="date"
                  value={ruleEffectiveTo}
                  onChange={(e) => setRuleEffectiveTo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Description / Policy Circular Reference:</label>
                <textarea
                  value={ruleDescription}
                  onChange={(e) => setRuleDescription(e.target.value)}
                  rows={2}
                  placeholder="e.g. As per Bank Recovery Circular No. RC-2026/04 for Q3 stressed asset recovery"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddRuleOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 font-bold rounded-xl text-white shadow-xs cursor-pointer"
                >
                  Create Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ASSIGN AGENT SPECIFIC RATE */}
      {/* ======================================================== */}
      {isAddAssignmentOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden text-xs">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-purple-600" />
                <span>Assign Agent Commission Rate Override (Priority 1)</span>
              </h3>
              <button onClick={() => setIsAddAssignmentOpen(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAssignment} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
              {assignmentFormError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{assignmentFormError}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Select Recovery Agent *:</label>
                <select
                  value={assignmentAgentId}
                  onChange={(e) => {
                    setAssignmentAgentId(e.target.value);
                    const selected = users.find((u) => u.id === e.target.value || u.agentId === e.target.value);
                    if (selected) {
                      setAssignmentBank(selected.bank || '');
                      setAssignmentZone(selected.zone || '');
                      setAssignmentBranch(selected.branch || '');
                    }
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                >
                  <option value="">-- Choose Agent --</option>
                  {users.filter((u) => u.role === 'agent').map((u) => (
                    <option key={u.id} value={u.agentId || u.id}>
                      {u.name} ({u.agentId || u.id}) - {u.branch || 'Branch'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Override Percentage (0 - 100%) *:</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={assignmentPercentage}
                  onChange={(e) => setAssignmentPercentage(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Effective From Date *:</label>
                  <input
                    type="date"
                    value={assignmentEffectiveFrom}
                    onChange={(e) => setAssignmentEffectiveFrom(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">Effective To Date (Optional):</label>
                  <input
                    type="date"
                    value={assignmentEffectiveTo}
                    onChange={(e) => setAssignmentEffectiveTo(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Assignment Remarks / Justification:</label>
                <textarea
                  value={assignmentRemarks}
                  onChange={(e) => setAssignmentRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Senior field agent special target performance override"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddAssignmentOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 font-bold rounded-xl text-white shadow-xs cursor-pointer"
                >
                  Save Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
