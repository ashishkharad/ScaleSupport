import React, { useState, useMemo } from 'react';
import {
  Search,
  X,
  User,
  Phone,
  Building2,
  ChevronRight,
  MapPin,
  Calendar,
  DollarSign,
  Camera,
  Mic,
  Plus,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account } from '../../types';
import { formatINR } from '../../utils/watermark';

export type ServiceActionType =
  | 'followup'
  | 'ptp'
  | 'visit'
  | 'recovery'
  | 'photo'
  | 'voice'
  | 'view'
  | 'commission';

interface CustomerSearchSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionType: ServiceActionType;
  title?: string;
  onSelectCustomer: (account: Account, actionType: ServiceActionType) => void;
}

export const CustomerSearchSelectModal: React.FC<CustomerSearchSelectModalProps> = ({
  isOpen,
  onClose,
  actionType,
  title,
  onSelectCustomer,
}) => {
  const { accounts, currentUser } = useSRMS();

  const [searchQuery, setSearchQuery] = useState('');
  const [accountNumberFilter, setAccountNumberFilter] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  // Base accounts: If Admin or management role, show all. If Agent, prioritize assigned accounts, but allow searching all if query entered
  const isAgent = currentUser.role === 'agent';

  const baseAccounts = useMemo(() => {
    if (!isAgent) {
      return accounts;
    }
    // If agent has active search query or filter, search across all branch accounts so no customer is hidden
    if (searchQuery.trim() || accountNumberFilter.trim()) {
      return accounts;
    }
    // Default list: Agent assigned accounts + unassigned accounts
    const assigned = accounts.filter(
      (a) =>
        (currentUser.agentId && a.assignedAgentId === currentUser.agentId) ||
        a.assignedAgentId === currentUser.id ||
        (currentUser.name && a.assignedAgentName?.toLowerCase() === currentUser.name.toLowerCase()) ||
        !a.assignedAgentId ||
        a.assignedAgentId === 'Unassigned' ||
        a.assignedAgentId === 'N/A'
    );
    return assigned.length > 0 ? assigned : accounts;
  }, [accounts, currentUser, isAgent, searchQuery, accountNumberFilter]);

  const branches = useMemo(() => {
    const list = Array.from(new Set(accounts.map((a) => a.branch).filter(Boolean)));
    return ['ALL', ...list];
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const accFilter = accountNumberFilter.toLowerCase().trim();

    return baseAccounts.filter((acc) => {
      const name = (acc.customerName || '').toLowerCase();
      const accId = (acc.accountId || '').toLowerCase();
      const loanNo = (acc.loanNumber || '').toLowerCase();
      const custCode = (acc.customerCode || '').toLowerCase();
      const mobileClean = (acc.mobile || '').replace(/\D/g, '');
      const city = (acc.city || '').toLowerCase();
      const area = (acc.area || '').toLowerCase();
      const address = (acc.address || '').toLowerCase();

      // Primary Search (Customer Name, Mobile, City, or Account No)
      let matchSearch = true;
      if (q) {
        const qCleanMobile = q.replace(/\D/g, '');
        const qWords = q.split(/\s+/).filter(Boolean);

        const nameContains = name.includes(q);
        const wordsMatchName = qWords.length > 0 && qWords.every((w) => name.includes(w));
        const accContains = accId.includes(q) || loanNo.includes(q) || custCode.includes(q);
        const mobileContains = qCleanMobile.length >= 3 && mobileClean.includes(qCleanMobile);
        const locationContains = city.includes(q) || area.includes(q) || address.includes(q);

        matchSearch = nameContains || wordsMatchName || accContains || mobileContains || locationContains;
      }

      // Secondary / Account Filter (Account No, Loan No, CIF, or Name)
      let matchAcc = true;
      if (accFilter) {
        const accWords = accFilter.split(/\s+/).filter(Boolean);
        const wordsMatchName = accWords.length > 0 && accWords.every((w) => name.includes(w));

        matchAcc =
          accId.includes(accFilter) ||
          loanNo.includes(accFilter) ||
          custCode.includes(accFilter) ||
          name.includes(accFilter) ||
          wordsMatchName;
      }

      const matchBranch = selectedBranch === 'ALL' || acc.branch === selectedBranch;

      return matchSearch && matchAcc && matchBranch;
    });
  }, [baseAccounts, searchQuery, accountNumberFilter, selectedBranch]);

  if (!isOpen) return null;

  const getActionDetails = () => {
    switch (actionType) {
      case 'followup':
        return {
          headerTitle: title || 'Select Customer to Record Call / Follow-up',
          icon: Phone,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          btnLabel: 'Log Call',
        };
      case 'ptp':
        return {
          headerTitle: title || 'Select Customer for New PTP Commitment',
          icon: Calendar,
          color: 'text-purple-600',
          bg: 'bg-purple-100',
          btnLabel: 'Add PTP',
        };
      case 'visit':
        return {
          headerTitle: title || 'Select Customer for Field Visit & GPS Route',
          icon: MapPin,
          color: 'text-red-600',
          bg: 'bg-red-100',
          btnLabel: 'Start Visit',
        };
      case 'recovery':
        return {
          headerTitle: title || 'Select Customer for Loan Recovery & Receipt',
          icon: DollarSign,
          color: 'text-emerald-600',
          bg: 'bg-emerald-100',
          btnLabel: 'Record Recovery',
        };
      case 'photo':
        return {
          headerTitle: title || 'Select Customer for Geo-Tagged Photo (GPS & Selfie)',
          icon: Camera,
          color: 'text-amber-600',
          bg: 'bg-amber-100',
          btnLabel: 'Capture Photo',
        };
      case 'voice':
        return {
          headerTitle: title || 'Select Customer for Audio Voice Note Recording',
          icon: Mic,
          color: 'text-indigo-600',
          bg: 'bg-indigo-100',
          btnLabel: 'Record Voice',
        };
      case 'commission':
        return {
          headerTitle: title || 'Select Customer for Commission Bill / Recovery Receipt',
          icon: DollarSign,
          color: 'text-amber-600',
          bg: 'bg-amber-100',
          btnLabel: 'Select Account',
        };
      default:
        return {
          headerTitle: title || 'Select Customer Account',
          icon: User,
          color: 'text-blue-600',
          bg: 'bg-blue-100',
          btnLabel: 'Select',
        };
    }
  };

  const actionInfo = getActionDetails();
  const Icon = actionInfo.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-800 flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className={`p-2.5 ${actionInfo.bg} ${actionInfo.color} rounded-xl`}>
              <Icon className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">{actionInfo.headerTitle}</h3>
              <p className="text-xs text-slate-500">
                Search borrower by Customer Name or Account Number ({filteredAccounts.length} available)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filters */}
        <div className="p-4 bg-slate-50/50 border-b border-slate-200 space-y-2.5 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            {/* Customer Name Search (Primary) */}
            <div className="sm:col-span-7 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by Customer Name, Account No, Mobile, City..."
                autoFocus
                className="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Optional Account Number Search */}
            <div className="sm:col-span-5 relative">
              <input
                type="text"
                value={accountNumberFilter}
                onChange={(e) => setAccountNumberFilter(e.target.value)}
                placeholder="A/c No / Loan No (Optional)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs font-mono"
              />
              {accountNumberFilter && (
                <button
                  onClick={() => setAccountNumberFilter('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Branch Filter if multiple */}
          {branches.length > 2 && (
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-1">
              <span className="text-slate-500 font-semibold shrink-0">Branch:</span>
              {branches.map((b) => (
                <button
                  key={b}
                  onClick={() => setSelectedBranch(b)}
                  className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer ${
                    selectedBranch === b
                      ? 'bg-blue-600 text-white font-bold'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {b}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customer Accounts List */}
        <div className="p-4 overflow-y-auto flex-1 divide-y divide-slate-100 space-y-2">
          {filteredAccounts.length === 0 ? (
            <div className="text-center py-10 space-y-2">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-slate-700">No matching customer accounts found</p>
              <p className="text-xs text-slate-400">
                Try searching with a different name or clear the search filters.
              </p>
            </div>
          ) : (
            filteredAccounts.map((acc) => (
              <div
                key={acc.accountId}
                onClick={() => {
                  onSelectCustomer(acc, actionType);
                  onClose();
                }}
                className="p-3.5 hover:bg-blue-50/60 rounded-xl border border-transparent hover:border-blue-200 transition cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs sm:text-sm group-hover:text-blue-700 truncate">
                      {acc.customerName}
                    </span>
                    {acc.isMultipleAccount && (
                      <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 border border-purple-200 rounded text-[9px] font-bold">
                        Multi-Account ({acc.multipleAccountsCount || 2})
                      </span>
                    )}
                    {acc.otsStatus && (
                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded text-[9px] font-bold">
                        {acc.otsStatus.includes('Closed') ? 'OTS Closed' : 'OTS Active'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 font-mono">
                    <span className="font-bold text-blue-600">{acc.accountId}</span>
                    <span>•</span>
                    <span className="font-sans text-slate-600">{acc.loanType}</span>
                    <span>•</span>
                    <span className="text-slate-600 font-sans">{acc.branch}</span>
                    {acc.mobile && (
                      <>
                        <span>•</span>
                        <span className="text-slate-700">{acc.mobile}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0 flex items-center gap-3">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-semibold">Overdue</span>
                    <span className="font-mono font-bold text-rose-600 text-xs sm:text-sm">
                      {formatINR(acc.overdueAmount)}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 bg-blue-600 group-hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                  >
                    <span>{actionInfo.btnLabel}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Click any borrower to proceed with action</span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-semibold transition cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
