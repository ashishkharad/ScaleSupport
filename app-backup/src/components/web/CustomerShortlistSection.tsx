import React, { useState, useMemo } from 'react';
import {
  Filter,
  Search,
  Calendar,
  Building2,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  ArrowUpDown,
  Download,
  Users,
  Eye,
  PhoneCall,
  MapPin,
  Sparkles,
  Tag,
  CheckSquare,
  Square,
  RefreshCw,
} from 'lucide-react';
import { Account, User } from '../../types';
import { formatINR } from '../../utils/watermark';

interface CustomerShortlistSectionProps {
  accounts: Account[];
  users: User[];
  onSelectAccount: (account: Account) => void;
  onOpenFollowUp?: (account: Account) => void;
  onOpenPTP?: (account: Account) => void;
  onAllocateBulk?: (accountIds: string[], agentId: string, agentName: string) => void;
}

export const CustomerShortlistSection: React.FC<CustomerShortlistSectionProps> = ({
  accounts,
  users,
  onSelectAccount,
  onOpenFollowUp,
  onOpenPTP,
  onAllocateBulk,
}) => {
  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');
  const [selectedCity, setSelectedCity] = useState('ALL');
  const [selectedRisk, setSelectedRisk] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');
  const [npaDateFilter, setNpaDateFilter] = useState('');
  const [remarkSearch, setRemarkSearch] = useState('');
  const [sortBy, setSortBy] = useState<'amount-desc' | 'amount-asc' | 'npa-desc' | 'npa-asc' | 'name-asc'>('amount-desc');

  // Multi-select for bulk action
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedAgentForBulk, setSelectedAgentForBulk] = useState<string>('');

  // Extract unique filter dropdown values
  const uniqueBranches = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.branch).filter(Boolean))).sort();
  }, [accounts]);

  const uniqueCities = useMemo(() => {
    return Array.from(new Set(accounts.map((a) => a.city).filter((c): c is string => Boolean(c && c !== 'N/A')))).sort();
  }, [accounts]);

  // Group / aggregate accounts by customer CIF or Primary Loan to calculate total loans count
  const customerLoanCounts = useMemo(() => {
    const counts = new Map<string, number>();
    accounts.forEach((acc) => {
      const key = acc.customerCode || acc.mobile || acc.customerName;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }, [accounts]);

  // Filtered and sorted accounts
  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc) => {
      // 1. Text search across name, ID, loan number, phone, CIF
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesMain =
          (acc.customerName && acc.customerName.toLowerCase().includes(q)) ||
          (acc.accountId && acc.accountId.toLowerCase().includes(q)) ||
          (acc.loanNumber && acc.loanNumber.toLowerCase().includes(q)) ||
          (acc.mobile && acc.mobile.includes(q)) ||
          (acc.customerCode && acc.customerCode.toLowerCase().includes(q));
        if (!matchesMain) return false;
      }

      // 2. Branch Filter
      if (selectedBranch !== 'ALL' && acc.branch !== selectedBranch) {
        return false;
      }

      // 3. City Filter
      if (selectedCity !== 'ALL' && acc.city !== selectedCity) {
        return false;
      }

      // 4. Customer Risk Classification Wise
      if (selectedRisk !== 'ALL') {
        const risk = acc.riskClassification || 'Medium Risk';
        if (risk.toLowerCase() !== selectedRisk.toLowerCase()) return false;
      }

      // 5. Account Status Filter
      if (selectedStatus !== 'ALL' && acc.accountStatus !== selectedStatus) {
        return false;
      }

      // 6. Amount Wise Filter (Min / Max)
      const amt = acc.outstandingAmount || acc.overdueAmount || 0;
      if (minAmount && amt < Number(minAmount)) return false;
      if (maxAmount && amt > Number(maxAmount)) return false;

      // 7. NPA Date Wise Filter
      if (npaDateFilter.trim()) {
        const npa = (acc.npaDate || '').toLowerCase();
        if (!npa.includes(npaDateFilter.trim().toLowerCase())) return false;
      }

      // 8. Remark Wise Filter
      if (remarkSearch.trim()) {
        const rq = remarkSearch.toLowerCase();
        const matchesLatestRemark = acc.latestRemark && acc.latestRemark.toLowerCase().includes(rq);
        const matchesRemarks = acc.remarks && acc.remarks.toLowerCase().includes(rq);
        const matchesNotes = (acc.agentNotesHistory || []).some((n) => n.text.toLowerCase().includes(rq));
        if (!matchesLatestRemark && !matchesRemarks && !matchesNotes) return false;
      }

      return true;
    }).sort((a, b) => {
      const amtA = a.outstandingAmount || a.overdueAmount || 0;
      const amtB = b.outstandingAmount || b.overdueAmount || 0;
      if (sortBy === 'amount-desc') return amtB - amtA;
      if (sortBy === 'amount-asc') return amtA - amtB;
      if (sortBy === 'npa-desc') return (b.npaDate || '').localeCompare(a.npaDate || '');
      if (sortBy === 'npa-asc') return (a.npaDate || '').localeCompare(b.npaDate || '');
      if (sortBy === 'name-asc') return (a.customerName || '').localeCompare(b.customerName || '');
      return 0;
    });
  }, [
    accounts,
    searchTerm,
    selectedBranch,
    selectedCity,
    selectedRisk,
    selectedStatus,
    minAmount,
    maxAmount,
    npaDateFilter,
    remarkSearch,
    sortBy,
  ]);

  // Handle Multi-Select
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]));
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAccounts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAccounts.map((a) => a.accountId));
    }
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedBranch('ALL');
    setSelectedCity('ALL');
    setSelectedRisk('ALL');
    setSelectedStatus('ALL');
    setMinAmount('');
    setMaxAmount('');
    setNpaDateFilter('');
    setRemarkSearch('');
    setSortBy('amount-desc');
  };

  // Export Shortlisted to CSV
  const handleExportCSV = () => {
    if (filteredAccounts.length === 0) {
      alert('No customer records to export.');
      return;
    }
    const headers = [
      'Account ID',
      'Customer Name',
      'CIF / Code',
      'Mobile',
      'Branch',
      'City',
      'Area',
      'Coordinates',
      'NPA Date',
      'Risk Classification',
      'Outstanding Balance (INR)',
      'Total Loans Count',
      'Status',
      'Assigned Agent',
      'Latest Remark',
    ];
    const rows = filteredAccounts.map((a) => [
      `"${a.accountId}"`,
      `"${(a.customerName || '').replace(/"/g, '""')}"`,
      `"${a.customerCode || ''}"`,
      `"${a.mobile || ''}"`,
      `"${a.branch || ''}"`,
      `"${a.city || 'N/A'}"`,
      `"${a.area || 'N/A'}"`,
      `"${a.coordinates || 'N/A'}"`,
      `"${a.npaDate || 'N/A'}"`,
      `"${a.riskClassification || 'Medium Risk'}"`,
      a.outstandingAmount || 0,
      customerLoanCounts.get(a.customerCode || a.mobile || a.customerName) || 1,
      `"${a.accountStatus || 'Active'}"`,
      `"${a.assignedAgentName || 'N/A'}"`,
      `"${(a.latestRemark || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SRMS_Customer_Shortlist_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Total Summary of Filtered
  const totalShortlistBalance = filteredAccounts.reduce((sum, a) => sum + (a.outstandingAmount || a.overdueAmount || 0), 0);

  return (
    <div className="space-y-5">
      {/* Top Filter & Shortlist Controller */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Advanced Customer Shortlist Engine</h3>
              <p className="text-xs text-slate-500">
                Shortlist customers by NPA Date, Outstanding Balance, Branch, City, Agent Remark &amp; Risk Classification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Shortlist ({filteredAccounts.length})</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 text-xs">
          {/* 1. NPA Date Wise Filter */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-600" />
              <span>NPA Date Wise:</span>
            </label>
            <input
              type="text"
              placeholder="e.g. 2012, 2024, 31/03..."
              value={npaDateFilter}
              onChange={(e) => setNpaDateFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 2. Amount Wise (Min & Max) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Amount Wise (Min - Max ₹):
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <input
                type="number"
                placeholder="Min ₹"
                value={minAmount}
                onChange={(e) => setMinAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <input
                type="number"
                placeholder="Max ₹"
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 3. Branch Wise */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Branch Wise:</span>
            </label>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Branches ({uniqueBranches.length})</option>
              {uniqueBranches.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Customer Classification Wise */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-amber-600" />
              <span>Customer Classification:</span>
            </label>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Classifications</option>
              <option value="Low Risk">Low Risk</option>
              <option value="Medium Risk">Medium Risk</option>
              <option value="High Risk">High Risk</option>
              <option value="Critical NPA">Critical NPA</option>
            </select>
          </div>

          {/* 5. Remark Wise Search */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Remark Wise (Field &amp; Agent):
            </label>
            <input
              type="text"
              placeholder="Search in remarks & notes..."
              value={remarkSearch}
              onChange={(e) => setRemarkSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* 6. City Wise */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-600" />
              <span>City / Territory:</span>
            </label>
            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Cities ({uniqueCities.length})</option>
              {uniqueCities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* 7. Account Status */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Account Status:
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Active">Active</option>
              <option value="PTP">PTP (Promised)</option>
              <option value="Settled">Settled</option>
              <option value="Overdue">Overdue</option>
              <option value="Legal">Legal NPA</option>
            </select>
          </div>

          {/* 8. Sort Order */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Sort Results By:</span>
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
            >
              <option value="amount-desc">Balance: Highest First</option>
              <option value="amount-asc">Balance: Lowest First</option>
              <option value="npa-desc">NPA Date: Newest First</option>
              <option value="npa-asc">NPA Date: Oldest First</option>
              <option value="name-asc">Customer Name (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Summary stats pill */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-bold text-slate-800">
              Shortlisted: <strong className="text-blue-600 font-mono">{filteredAccounts.length}</strong> customers
            </span>
            <span className="text-slate-500">|</span>
            <span className="font-bold text-slate-800">
              Total Balance: <strong className="text-red-600 font-mono">{formatINR(totalShortlistBalance)}</strong>
            </span>
          </div>

          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
              <span className="text-blue-900 font-bold">{selectedIds.length} Selected</span>
              {onAllocateBulk && (
                <div className="flex items-center gap-1.5">
                  <select
                    value={selectedAgentForBulk}
                    onChange={(e) => setSelectedAgentForBulk(e.target.value)}
                    className="bg-white border border-blue-300 rounded-lg px-2 py-1 text-xs text-slate-800"
                  >
                    <option value="">Select Agent to Allocate...</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.agentId || 'Agent'})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      if (!selectedAgentForBulk) {
                        alert('Please select an agent.');
                        return;
                      }
                      const ag = users.find((u) => u.id === selectedAgentForBulk);
                      if (ag) {
                        onAllocateBulk(selectedIds, ag.id, ag.name);
                        setSelectedIds([]);
                      }
                    }}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs cursor-pointer"
                  >
                    Allocate Selected
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="p-3 w-10 text-center">
                  <button onClick={handleSelectAll} className="cursor-pointer text-slate-500 hover:text-blue-600">
                    {selectedIds.length > 0 && selectedIds.length === filteredAccounts.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="p-3">Customer Details</th>
                <th className="p-3">Loan &amp; Count</th>
                <th className="p-3">Branch &amp; Territory</th>
                <th className="p-3">NPA Date</th>
                <th className="p-3">Risk Classification</th>
                <th className="p-3">Outstanding Balance</th>
                <th className="p-3">Latest Remark</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-400">
                    <p className="font-semibold text-sm">No customers matched the shortlist criteria.</p>
                    <p className="text-xs mt-1">Try relaxing filters or resetting the search.</p>
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((acc) => {
                  const isSelected = selectedIds.includes(acc.accountId);
                  const loanCount = customerLoanCounts.get(acc.customerCode || acc.mobile || acc.customerName) || 1;

                  return (
                    <tr
                      key={acc.accountId}
                      className={`hover:bg-blue-50/40 transition ${isSelected ? 'bg-blue-50/60' : ''}`}
                    >
                      <td className="p-3 text-center">
                        <button
                          onClick={() => handleToggleSelect(acc.accountId)}
                          className="cursor-pointer text-slate-400 hover:text-blue-600"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Customer Name & CIF */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{acc.customerName}</div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500">
                          <span>CIF: <strong className="font-mono text-slate-700">{acc.customerCode || acc.accountId}</strong></span>
                          <span>Mob: <strong className="font-mono text-slate-700">{acc.mobile || 'N/A'}</strong></span>
                        </div>
                      </td>

                      {/* Loan Number & Loans Count */}
                      <td className="p-3">
                        <div className="font-mono font-bold text-blue-600">{acc.loanNumber}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold flex items-center gap-1 ${
                            loanCount > 1
                              ? 'bg-purple-100 text-purple-700 border border-purple-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <Layers className="w-2.5 h-2.5" />
                            {loanCount} {loanCount === 1 ? 'Loan' : 'Loans'}
                          </span>
                        </div>
                      </td>

                      {/* Branch & Territory */}
                      <td className="p-3">
                        <div className="font-medium text-slate-800">{acc.branch}</div>
                        <div className="text-[11px] text-slate-500">
                          {acc.city || 'N/A'} • {acc.area || 'N/A'}
                        </div>
                        {acc.coordinates && (
                          <div className="text-[10px] text-blue-600 font-mono">{acc.coordinates}</div>
                        )}
                      </td>

                      {/* NPA Date */}
                      <td className="p-3 font-mono font-semibold text-slate-800">
                        {acc.npaDate || 'N/A'}
                      </td>

                      {/* Risk Classification */}
                      <td className="p-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            acc.riskClassification === 'Critical NPA'
                              ? 'bg-rose-500/10 text-rose-700 border-rose-300'
                              : acc.riskClassification === 'High Risk'
                              ? 'bg-amber-500/10 text-amber-700 border-amber-300'
                              : acc.riskClassification === 'Low Risk'
                              ? 'bg-emerald-500/10 text-emerald-700 border-emerald-300'
                              : 'bg-blue-500/10 text-blue-700 border-blue-300'
                          }`}
                        >
                          {acc.riskClassification || 'Medium Risk'}
                        </span>
                      </td>

                      {/* Outstanding Balance */}
                      <td className="p-3">
                        <div className="font-mono font-black text-slate-900 text-sm">
                          {formatINR(acc.outstandingAmount || acc.overdueAmount || 0)}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Sanction: {formatINR(acc.sanctionAmount || 0)}
                        </div>
                      </td>

                      {/* Latest Remark */}
                      <td className="p-3 max-w-xs">
                        <p className="text-xs text-slate-700 italic truncate" title={acc.latestRemark || 'No remark'}>
                          {acc.latestRemark ? `"${acc.latestRemark}"` : '—'}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => onSelectAccount(acc)}
                            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shadow-xs"
                            title="Open Customer Consolidated 360° Profile"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                          {onOpenFollowUp && (
                            <button
                              onClick={() => onOpenFollowUp(acc)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition cursor-pointer"
                              title="Log Follow-up"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
