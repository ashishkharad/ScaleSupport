import React, { useState, useMemo } from 'react';
import {
  Smartphone,
  Home,
  FolderLock,
  PhoneCall,
  Calendar,
  MapPin,
  DollarSign,
  Camera,
  Mic,
  Bell,
  User as UserIcon,
  Search,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Percent,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Filter,
  Navigation,
  FileText,
  Sparkles,
  Eye,
  MessageSquare,
  FileCheck,
  Layers,
  LogOut,
  Monitor,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account } from '../../types';
import { formatINR } from '../../utils/watermark';
import { ScaleSupportLogo } from '../common/ScaleSupportLogo';
import { WatermarkCameraModal } from '../common/WatermarkCameraModal';
import { VoiceNoteRecorderModal } from '../common/VoiceNoteRecorderModal';
import { AccountTimelineDrawer } from '../common/AccountTimelineDrawer';
import { CustomerConsolidatedDetailModal } from '../common/CustomerConsolidatedDetailModal';
import {
  LogFollowUpModal,
  CreatePTPModal,
  RecordRecoveryModal,
  FieldVisitModal,
  WhatsAppTriggerModal,
  AIRecoveryDrawer,
  AddAgentNoteModal,
} from '../common/ActionModals';

export const AgentAndroidApp: React.FC = () => {
  const {
    currentUser,
    accounts,
    followups,
    ptps,
    recoveries,
    visits,
    photos,
    voiceNotes,
    notifications,
    commissions,
    commissionSettings,
    activeVisit,
    logout,
    setDeviceMode,
  } = useSRMS();

  // Navigation tab in Android bottom bar
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'accounts' | 'followups' | 'ptp' | 'visits' | 'recovery' | 'photos' | 'profile'
  >('dashboard');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Selected Account for Modals
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);

  // Active Modals
  const [isWatermarkOpen, setIsWatermarkOpen] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isTimelineOpen, setIsTimelineOpen] = useState<boolean>(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState<boolean>(false);
  const [isPTPOpen, setIsPTPOpen] = useState<boolean>(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState<boolean>(false);
  const [isVisitOpen, setIsVisitOpen] = useState<boolean>(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [isAIOpen, setIsAIOpen] = useState<boolean>(false);
  const [isSingleCustomerModalOpen, setIsSingleCustomerModalOpen] = useState<boolean>(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState<boolean>(false);

  // Agent accounts
  const agentAccounts = accounts.filter(
    (a) =>
      (currentUser.agentId && a.assignedAgentId === currentUser.agentId) ||
      a.assignedAgentId === currentUser.id ||
      (currentUser.name && a.assignedAgentName?.toLowerCase() === currentUser.name.toLowerCase())
  );

  // Agent metrics
  const agentAssignedAccountIds = useMemo(
    () => new Set(agentAccounts.map((a) => a.accountId)),
    [agentAccounts]
  );
  const totalAssigned = agentAccounts.length;
  const totalOutstanding = agentAccounts.reduce((sum, a) => sum + a.outstandingAmount, 0);
  const totalOverdue = agentAccounts.reduce((sum, a) => sum + a.overdueAmount, 0);
  const todaysFollowups = agentAccounts.filter((a) => a.nextFollowUpDate === new Date().toISOString().slice(0, 10));
  const ptpDueList = ptps.filter(
    (p) =>
      (currentUser.agentId && p.agentId === currentUser.agentId) ||
      p.agentId === currentUser.id ||
      (currentUser.name && p.agentName?.toLowerCase() === currentUser.name.toLowerCase()) ||
      agentAssignedAccountIds.has(p.accountId)
  );
  const ptpPending = ptpDueList.filter((p) => p.status === 'Pending').length;
  const ptpBroken = ptpDueList.filter((p) => p.status === 'Broken').length;

  const agentRecoveries = recoveries.filter(
    (r) =>
      (currentUser.agentId && r.agentId === currentUser.agentId) ||
      r.agentId === currentUser.id ||
      (currentUser.name && r.agentName?.toLowerCase() === currentUser.name.toLowerCase()) ||
      agentAssignedAccountIds.has(r.accountId)
  );
  const totalRecoveryMonthly = agentRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const totalCommissionEarned = agentRecoveries.reduce((sum, r) => sum + r.commissionAmount, 0);

  const monthlyTarget = currentUser.monthlyTarget || 300000;
  const achievementPct = Math.min(100, Math.round((totalRecoveryMonthly / monthlyTarget) * 100));

  // Filtered Accounts
  const filteredAccounts = agentAccounts.filter((acc) => {
    const matchesSearch =
      acc.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.accountId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      acc.mobile.includes(searchQuery) ||
      acc.address.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'PTP_PENDING') return acc.accountStatus === 'PTP Pending';
    if (statusFilter === 'HIGH_PTP') return (acc.ptpCount ?? 0) >= 2;
    if (statusFilter === 'CRITICAL') return acc.customerCategory === 'Critical NPA';
    if (statusFilter === 'RECOVERED') return acc.accountStatus === 'Recovered' || acc.accountStatus === 'Closed';
    return true;
  });

  const openActionForAccount = (acc: Account, action: string) => {
    setSelectedAccount(acc);
    if (action === 'timeline') setIsTimelineOpen(true);
    else if (action === 'singleView') setIsSingleCustomerModalOpen(true);
    else if (action === 'note') setIsAddNoteModalOpen(true);
    else if (action === 'watermark') setIsWatermarkOpen(true);
    else if (action === 'voice') setIsVoiceOpen(true);
    else if (action === 'followup') setIsFollowUpOpen(true);
    else if (action === 'ptp') setIsPTPOpen(true);
    else if (action === 'recovery') setIsRecoveryOpen(true);
    else if (action === 'visit') setIsVisitOpen(true);
    else if (action === 'whatsapp') setIsWhatsAppOpen(true);
    else if (action === 'ai') setIsAIOpen(true);
  };

  return (
    <div className="min-h-[calc(100vh-53px)] w-full max-w-full bg-slate-950 flex justify-center items-center p-0 sm:p-4 font-sans overflow-x-hidden">
      {/* Android Device Shell Container */}
      <div className="w-full max-w-full sm:max-w-md md:max-w-lg bg-slate-900 border-0 sm:border-8 sm:border-slate-800 rounded-none sm:rounded-[36px] min-h-[calc(100vh-53px)] sm:min-h-[860px] sm:max-h-[920px] shadow-2xl flex flex-col overflow-hidden relative">
        
        {/* Android Top Status Bar */}
        <div className="bg-slate-950 px-6 py-2 flex items-center justify-between text-slate-400 text-xs font-mono select-none z-30">
          <span>04:35 PM</span>
          {/* Speaker / Notch Pill on tablet/desktop */}
          <div className="hidden sm:block w-20 h-3.5 bg-slate-800 rounded-full mx-auto" />
          <div className="flex items-center space-x-2 text-[11px]">
            <span>5G</span>
            <span>📶</span>
            <span>98% 🔋</span>
          </div>
        </div>

        {/* ScaleSupport Agent Mobile Header */}
        <div className="bg-slate-900 text-white px-4 py-3 border-b border-slate-800 shadow-xs z-20">
          <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800/80">
            <div className="bg-white/95 px-2 py-0.5 rounded-lg">
              <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Field Sync Active</span>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-xl bg-blue-600 border border-blue-500 flex items-center justify-center font-black text-xs text-white shadow-xs">
                RA
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold text-slate-100">{currentUser.name}</h2>
                  <span className="text-[10px] font-mono bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold border border-blue-500/30">
                    {currentUser.agentId || currentUser.username || currentUser.id}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{currentUser.branch}</p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {activeVisit && (
                <button
                  onClick={() => {
                    const target = accounts.find((a) => a.accountId === activeVisit.accountId);
                    if (target) openActionForAccount(target, 'visit');
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 animate-pulse shadow-xs cursor-pointer"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Visit Active</span>
                </button>
              )}
              <button
                onClick={() => setActiveTab('profile')}
                className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs transition cursor-pointer"
                title="Profile"
              >
                <UserIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Main Scrollable Viewport */}
        <div className="flex-1 overflow-y-auto bg-[#f8fafc] pb-20 text-slate-800">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="p-4 space-y-4 text-xs">
              {/* Recovery Target vs Achievement Progress Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-slate-500 font-medium block">August Recovery Progress</span>
                    <h3 className="text-xl font-black text-slate-900">{formatINR(totalRecoveryMonthly)}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Target: {formatINR(monthlyTarget)}</span>
                    <span className="text-xs font-bold text-emerald-600">{achievementPct}% Achieved</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${achievementPct}%` }}
                  />
                </div>

                {/* 10% Commission Earned Badge */}
                <div className="pt-1 flex items-center justify-between bg-amber-50 px-3 py-2.5 rounded-xl border border-amber-200">
                  <div className="flex items-center gap-1.5 text-amber-800 font-semibold">
                    <Percent className="w-3.5 h-3.5 text-amber-600" />
                    <span>10% Agent Commission Earned:</span>
                  </div>
                  <span className="font-mono text-sm font-black text-amber-700">
                    {formatINR(totalCommissionEarned)}
                  </span>
                </div>
              </div>

              {/* Quick Action Tiles (Start Visit, Take Geo-Photo, Record Voice Note, Log Collection) */}
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => {
                    if (agentAccounts.length > 0) openActionForAccount(agentAccounts[0], 'watermark');
                  }}
                  className="bg-white hover:bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                    <Camera className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">Geo-Photo</span>
                </button>

                <button
                  onClick={() => {
                    if (agentAccounts.length > 0) openActionForAccount(agentAccounts[0], 'voice');
                  }}
                  className="bg-white hover:bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <div className="p-2 bg-pink-50 text-pink-600 rounded-xl border border-pink-100">
                    <Mic className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">Voice Note</span>
                </button>

                <button
                  onClick={() => {
                    if (agentAccounts.length > 0) openActionForAccount(agentAccounts[0], 'visit');
                  }}
                  className="bg-white hover:bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">Start Visit</span>
                </button>

                <button
                  onClick={() => {
                    if (agentAccounts.length > 0) openActionForAccount(agentAccounts[0], 'recovery');
                  }}
                  className="bg-white hover:bg-slate-50 p-2.5 rounded-2xl border border-slate-200 flex flex-col items-center justify-center text-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <div className="p-2 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
                    <DollarSign className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700">Collect ₹</span>
                </button>
              </div>

              {/* 6 Key Operational KPI Metric Tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-medium">Assigned Accounts</span>
                  <span className="text-base font-black text-slate-900">{totalAssigned}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-medium">Total Overdue Pool</span>
                  <span className="text-base font-black text-rose-600">{formatINR(totalOverdue)}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-medium">Today's Follow-ups</span>
                  <span className="text-base font-black text-amber-600">{todaysFollowups.length || 2} Due</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-medium">PTP Commitments</span>
                  <span className="text-base font-black text-purple-600">{ptpPending} Pending</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-medium">Field Visits Done</span>
                  <span className="text-base font-black text-emerald-600">{visits.length}</span>
                </div>
                <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-slate-500 text-[10px] block font-medium">Drive Photos Stored</span>
                  <span className="text-base font-black text-blue-600">{photos.length}</span>
                </div>
              </div>

              {/* Urgent Action Customer Cards */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>Priority Recovery Queue (PTP Follow-ups)</span>
                  </h4>
                  <button
                    onClick={() => setActiveTab('accounts')}
                    className="text-[11px] text-blue-600 hover:text-blue-700 font-semibold flex items-center cursor-pointer"
                  >
                    <span>View All ({agentAccounts.length})</span>
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-2.5">
                  {agentAccounts.slice(0, 3).map((acc) => (
                    <div
                      key={acc.id}
                      className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{acc.customerName}</span>
                            <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                              {acc.accountId}
                            </span>
                            <button
                              onClick={() => openActionForAccount(acc, 'singleView')}
                              className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition cursor-pointer"
                              title="Open Customer Consolidated Single View"
                            >
                              Single View
                            </button>
                          </div>
                          {acc.isMultipleAccount && (
                            <div className="mt-1">
                              <button
                                onClick={() => openActionForAccount(acc, 'singleView')}
                                className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>Multi-Account ({acc.multipleAccountsCount || 2} Loans Match)</span>
                              </button>
                            </div>
                          )}
                          <p className="text-[11px] text-slate-500 mt-0.5">{acc.address}</p>
                          {acc.agentNotesHistory && acc.agentNotesHistory.length > 0 && (
                            <div className="mt-1 text-[10px] text-indigo-800 bg-indigo-50/70 p-1.5 rounded-lg border border-indigo-100 flex items-start gap-1">
                              <MessageSquare className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                              <span className="truncate">Note: {acc.agentNotesHistory[acc.agentNotesHistory.length - 1].note}</span>
                            </div>
                          )}
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            (acc.ptpCount ?? 0) >= 3
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : (acc.ptpCount ?? 0) >= 1
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-50 text-slate-700 border-slate-200'
                          }`}
                        >
                          {acc.ptpCount ?? 0} PTPs
                        </span>
                      </div>

                      <div className="grid grid-cols-2 bg-slate-50 p-2.5 rounded-xl text-[11px] font-mono border border-slate-200">
                        <div>
                          <span className="text-slate-500 block text-[10px]">Overdue Amount</span>
                          <span className="text-rose-600 font-bold">{formatINR(acc.overdueAmount)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block text-[10px]">Next Action</span>
                          <span className="text-amber-700 font-semibold">{acc.nextFollowUpDate || 'Today'}</span>
                        </div>
                      </div>

                      {/* Quick 1-tap action buttons */}
                      <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
                        <button
                          onClick={() => openActionForAccount(acc, 'singleView')}
                          className="px-2 py-1.5 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 rounded-lg border border-indigo-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                        >
                          <Layers className="w-3 h-3 text-indigo-700" />
                          <span>Single View</span>
                        </button>

                        <button
                          onClick={() => openActionForAccount(acc, 'note')}
                          className="px-2 py-1.5 bg-indigo-50 text-indigo-800 hover:bg-indigo-100 rounded-lg border border-indigo-200 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition whitespace-nowrap"
                        >
                          <MessageSquare className="w-3 h-3 text-indigo-700" />
                          <span>+ Note</span>
                        </button>

                        <a
                          href={`tel:${acc.mobile}`}
                          onClick={() => openActionForAccount(acc, 'followup')}
                          className="px-2.5 py-1.5 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-lg border border-amber-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition"
                        >
                          <PhoneCall className="w-3 h-3" />
                          <span>Call</span>
                        </a>

                        <button
                          onClick={() => openActionForAccount(acc, 'watermark')}
                          className="px-2.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg border border-blue-200 font-semibold text-[11px] flex items-center gap-1 cursor-pointer transition"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Geo-Photo</span>
                        </button>

                        <button
                          onClick={() => openActionForAccount(acc, 'recovery')}
                          className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-2xs cursor-pointer transition"
                        >
                          <DollarSign className="w-3 h-3" />
                          <span>Collect ₹</span>
                        </button>

                        <button
                          onClick={() => openActionForAccount(acc, 'timeline')}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-medium flex items-center gap-1 ml-auto border border-slate-200 cursor-pointer transition"
                        >
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>Timeline</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MY ACCOUNTS */}
          {activeTab === 'accounts' && (
            <div className="p-4 space-y-3.5 text-xs">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Search customer, account ID, mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
                />
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                {[
                  { id: 'ALL', label: `All (${agentAccounts.length})` },
                  { id: 'PTP_PENDING', label: 'PTP Due' },
                  { id: 'HIGH_PTP', label: '2+ PTPs' },
                  { id: 'CRITICAL', label: 'Critical NPA' },
                  { id: 'RECOVERED', label: 'Recovered' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setStatusFilter(f.id)}
                    className={`px-3 py-1 rounded-full font-medium whitespace-nowrap transition cursor-pointer ${
                      statusFilter === f.id
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Accounts Card List */}
              <div className="space-y-3">
                {filteredAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-bold text-sm text-slate-900">{acc.customerName}</h4>
                          <span className="text-[10px] font-mono text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200 font-bold">
                            {acc.accountId}
                          </span>
                          <button
                            onClick={() => openActionForAccount(acc, 'singleView')}
                            className="text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition cursor-pointer"
                            title="Single View with all linked loans & notes"
                          >
                            Single View
                          </button>
                        </div>
                        {acc.isMultipleAccount && (
                          <div className="mt-1">
                            <button
                              onClick={() => openActionForAccount(acc, 'singleView')}
                              className="inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300 transition"
                            >
                              <Layers className="w-2.5 h-2.5" />
                              <span>Multi-Account ({acc.multipleAccountsCount || 2} Loans Match)</span>
                            </button>
                          </div>
                        )}
                        <p className="text-[11px] text-slate-500 mt-0.5">{acc.address}</p>
                        {acc.agentNotesHistory && acc.agentNotesHistory.length > 0 && (
                          <div className="mt-1.5 text-[10px] text-indigo-800 bg-indigo-50/80 p-1.5 rounded-lg border border-indigo-100 flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 text-indigo-600 shrink-0 mt-0.5" />
                            <span className="truncate">Note: {acc.agentNotesHistory[acc.agentNotesHistory.length - 1].note}</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          acc.accountStatus === 'Recovered'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : (acc.ptpCount ?? 0) >= 3
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}
                      >
                        {acc.accountStatus} • {acc.ptpCount ?? 0} PTPs
                      </span>
                    </div>

                    {/* Loan Overview Numbers */}
                    <div className="grid grid-cols-3 bg-slate-50 p-2.5 rounded-xl text-[11px] font-mono border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Product</span>
                        <span className="text-slate-800 font-semibold">{acc.loanType}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Overdue EMI</span>
                        <span className="text-rose-600 font-bold">{formatINR(acc.overdueAmount)}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Outstanding</span>
                        <span className="text-slate-800 font-semibold">{formatINR(acc.outstandingAmount)}</span>
                      </div>
                    </div>

                    {/* Action Bar (Single View, Note, Call, Visit, Photo, Voice, PTP, Recovery, Timeline, AI Pitch) */}
                    <div className="grid grid-cols-4 gap-1.5 pt-1">
                      <button
                        onClick={() => openActionForAccount(acc, 'singleView')}
                        className="py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl border border-indigo-200 flex items-center justify-center gap-1 font-bold text-[11px] transition cursor-pointer"
                      >
                        <Layers className="w-3 h-3 text-indigo-700" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => openActionForAccount(acc, 'note')}
                        className="py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-xl border border-indigo-200 flex items-center justify-center gap-1 font-bold text-[11px] transition cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3 text-indigo-700" />
                        <span>+ Note</span>
                      </button>

                      <a
                        href={`tel:${acc.mobile}`}
                        onClick={() => openActionForAccount(acc, 'followup')}
                        className="py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl border border-amber-200 flex items-center justify-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <PhoneCall className="w-3 h-3" />
                        <span>Call</span>
                      </a>

                      <button
                        onClick={() => openActionForAccount(acc, 'visit')}
                        className="py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-200 flex items-center justify-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>Visit</span>
                      </button>

                      <button
                        onClick={() => openActionForAccount(acc, 'watermark')}
                        className="py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 flex items-center justify-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Photo</span>
                      </button>

                      <button
                        onClick={() => openActionForAccount(acc, 'voice')}
                        className="py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-xl border border-pink-200 flex items-center justify-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <Mic className="w-3 h-3" />
                        <span>Voice</span>
                      </button>

                      <button
                        onClick={() => openActionForAccount(acc, 'ptp')}
                        className="py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl border border-purple-200 flex items-center justify-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>PTP</span>
                      </button>

                      <button
                        onClick={() => openActionForAccount(acc, 'recovery')}
                        className="py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center gap-1 font-bold text-[11px] shadow-2xs transition cursor-pointer"
                      >
                        <DollarSign className="w-3 h-3" />
                        <span>Collect</span>
                      </button>

                      <button
                        onClick={() => openActionForAccount(acc, 'whatsapp')}
                        className="py-1.5 bg-slate-100 hover:bg-slate-200 text-emerald-700 rounded-xl border border-slate-200 flex items-center justify-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <MessageSquare className="w-3 h-3" />
                        <span>WA</span>
                      </button>

                      <button
                        onClick={() => openActionForAccount(acc, 'ai')}
                        className="py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 flex items-center justify-center gap-1 font-semibold text-[11px] transition cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        <span>AI Pitch</span>
                      </button>
                    </div>

                    {/* Timeline button full width footer */}
                    <button
                      onClick={() => openActionForAccount(acc, 'timeline')}
                      className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 text-xs font-semibold transition cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-blue-600" />
                      <span>View Chronological Account Timeline (All Activities)</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: TODAY'S FOLLOWUPS */}
          {activeTab === 'followups' && (
            <div className="p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <PhoneCall className="w-4 h-4 text-amber-600" />
                  <span>Today's Call Follow-up Queue</span>
                </h3>
                <span className="text-xs font-mono text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 font-bold">
                  {followups.length} Logged
                </span>
              </div>

              <div className="space-y-2.5">
                {agentAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{acc.customerName}</h4>
                        <p className="text-[11px] text-slate-500">{acc.mobile} • Overdue: {formatINR(acc.overdueAmount)}</p>
                      </div>
                      <span className="text-[10px] font-mono text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded font-bold">
                        {acc.nextFollowUpTime || '11:00 AM'}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      Last Status: <span className="font-semibold text-slate-900">{acc.lastFollowUpStatus || 'Pending Call'}</span>
                      {acc.notes && <p className="text-slate-500 mt-0.5">{acc.notes}</p>}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <a
                        href={`tel:${acc.mobile}`}
                        onClick={() => openActionForAccount(acc, 'followup')}
                        className="flex-1 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 text-xs shadow-2xs transition cursor-pointer"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>Dial Customer &amp; Log Result</span>
                      </a>
                      <button
                        onClick={() => openActionForAccount(acc, 'whatsapp')}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-emerald-700 rounded-xl font-semibold text-xs border border-slate-200 transition cursor-pointer"
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: PTP */}
          {activeTab === 'ptp' && (
            <div className="p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span>Promise To Pay (PTP) Tracker</span>
                </h3>
              </div>

              <div className="space-y-3">
                {ptps.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{p.customerName}</h4>
                        <span className="font-mono text-[10px] text-blue-700 font-bold">{p.accountId}</span>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          p.status === 'Achieved'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : p.status === 'Broken'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-purple-50 text-purple-700 border-purple-200'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl font-mono border border-slate-200">
                      <div>
                        <span className="text-slate-500 block text-[10px]">PTP Amount</span>
                        <span className="text-purple-700 font-black text-sm">{formatINR(p.amount)}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[10px]">Committed Due Date</span>
                        <span className="text-amber-700 font-bold">{p.ptpDate} ({p.ptpMode})</span>
                      </div>
                    </div>

                    <p className="text-slate-600 text-xs italic">"{p.customerCommitment}"</p>

                    {p.status === 'Pending' && (
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          onClick={() => {
                            const acc = accounts.find((a) => a.accountId === p.accountId);
                            if (acc) openActionForAccount(acc, 'recovery');
                          }}
                          className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Collect Payment</span>
                        </button>
                        <button
                          onClick={() => {
                            const acc = accounts.find((a) => a.accountId === p.accountId);
                            if (acc) openActionForAccount(acc, 'whatsapp');
                          }}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-emerald-700 rounded-xl text-xs font-semibold border border-slate-200 transition cursor-pointer"
                        >
                          Remind WA
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: VISITS */}
          {activeTab === 'visits' && (
            <div className="p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span>Field Visits &amp; GPS Tracking</span>
                </h3>
              </div>

              {activeVisit && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-800 text-sm flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
                      Active Visit in Progress
                    </span>
                    <span className="font-mono text-xs text-emerald-900 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded font-bold">
                      {activeVisit.startTime}
                    </span>
                  </div>
                  <p className="text-slate-900 text-xs font-semibold">{activeVisit.customerName} ({activeVisit.accountId})</p>
                  <p className="text-slate-600 text-[11px]">{activeVisit.address}</p>
                  <p className="font-mono text-[11px] text-emerald-700 font-bold">
                    Live GPS: {typeof activeVisit.latitude === 'number' ? activeVisit.latitude.toFixed(6) : '0.000000'}° N, {typeof activeVisit.longitude === 'number' ? activeVisit.longitude.toFixed(6) : '0.000000'}° E (±{activeVisit.accuracyMeters || 5}m)
                  </p>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => {
                        const acc = accounts.find((a) => a.accountId === activeVisit.accountId);
                        if (acc) openActionForAccount(acc, 'watermark');
                      }}
                      className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1 shadow-2xs transition cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>📸 Snap Geo-Photo</span>
                    </button>
                    <button
                      onClick={() => {
                        const acc = accounts.find((a) => a.accountId === activeVisit.accountId);
                        if (acc) openActionForAccount(acc, 'visit');
                      }}
                      className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold border border-slate-300 text-xs transition cursor-pointer"
                    >
                      Complete Visit
                    </button>
                  </div>
                </div>
              )}

              {/* Completed Field Visits List */}
              <div className="space-y-2.5">
                {visits.map((v) => (
                  <div
                    key={v.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{v.customerName}</h4>
                        <span className="font-mono text-[10px] text-blue-700 font-bold">{v.accountId}</span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {v.visitStatus}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl font-mono text-[11px] text-slate-700 space-y-1 border border-slate-200">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Date/Time:</span>
                        <span>{v.date} ({v.startTime} - {v.endTime || 'End'})</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 font-bold">
                        <span className="text-slate-500 font-normal">GPS:</span>
                        <span>{typeof v.latitude === 'number' ? v.latitude.toFixed(6) : '0.000000'}° N, {typeof v.longitude === 'number' ? v.longitude.toFixed(6) : '0.000000'}° E</span>
                      </div>
                    </div>

                    <p className="text-slate-600 text-xs">{v.visitRemarks}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: RECOVERY & COMMISSION */}
          {activeTab === 'recovery' && (
            <div className="p-4 space-y-3.5 text-xs">
              {/* Commission Hero Box */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Recovery Agent 10% Commission Ledger
                  </span>
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded font-mono font-bold">
                    {commissionSettings.defaultRate}% Base Rate
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <div>
                    <span className="text-2xl font-black text-amber-600">{formatINR(totalCommissionEarned)}</span>
                    <span className="text-[10px] text-slate-500 block">Total Commission Earned This Month</span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-slate-900">{formatINR(totalRecoveryMonthly)}</span>
                    <span className="text-[10px] text-slate-500 block">Total Collection Recovered</span>
                  </div>
                </div>
              </div>

              {/* Collections & Receipts Feed */}
              <div className="space-y-2.5">
                <h4 className="font-bold text-slate-900 text-xs">Recent Receipts &amp; Collections</h4>
                {agentRecoveries.map((r) => (
                  <div
                    key={r.id}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2 shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">{r.customerName}</h4>
                        <span className="font-mono text-[10px] text-blue-700 font-bold">{r.receiptNumber}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-black text-sm text-emerald-600">{formatINR(r.amount)}</span>
                        <span className="block text-[10px] text-amber-700 font-bold font-mono">
                          + {formatINR(r.commissionAmount)} (10%)
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-between font-mono text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                      <span>Date: {r.recoveryDate}</span>
                      <span>Mode: {r.paymentMode}</span>
                      <span>Ref: {r.referenceNumber.slice(0, 14)}...</span>
                    </div>

                    <p className="text-slate-600 text-[11px]">{r.remarks}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 7: PHOTOS & AUDIO */}
          {activeTab === 'photos' && (
            <div className="p-4 space-y-3.5 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-blue-600" />
                  <span>Geo-Tagged Watermark Gallery &amp; Drive Files</span>
                </h3>
              </div>

              <div className="space-y-3">
                {photos.map((ph) => (
                  <div
                    key={ph.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs hover:shadow-xs transition"
                  >
                    <div className="relative bg-slate-900 max-h-56 flex items-center justify-center">
                      <img
                        src={ph.dataUrl}
                        alt="Watermarked photo"
                        className="w-full h-auto max-h-56 object-contain"
                      />
                    </div>
                    <div className="p-3.5 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-slate-900">{ph.accountId}</span>
                        <span className="font-mono text-blue-700 text-[10px]">{ph.driveFileId}</span>
                      </div>
                      <div className="flex justify-between font-mono text-[11px] text-emerald-700 font-bold">
                        <span>{ph.date} | {ph.time}</span>
                        <span>{typeof ph.latitude === 'number' ? ph.latitude.toFixed(6) : '0.000000'}° N, {typeof ph.longitude === 'number' ? ph.longitude.toFixed(6) : '0.000000'}° E</span>
                      </div>
                      <p className="text-slate-600 text-xs italic">"{ph.agentRemark}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 8: PROFILE */}
          {activeTab === 'profile' && (
            <div className="p-4 space-y-4 text-xs">
              {/* Profile Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 text-center space-y-3 shadow-2xs">
                <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white font-black text-xl flex items-center justify-center mx-auto shadow-sm">
                  {currentUser.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">{currentUser.name}</h3>
                  <p className="text-xs text-blue-700 font-mono font-bold">{currentUser.agentId || currentUser.username || currentUser.id} • {currentUser.role === 'admin' ? 'Administrator' : 'Field Recovery Agent'}</p>
                  <p className="text-[11px] text-slate-500">{currentUser.branch} ({currentUser.area})</p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 text-left bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-[11px]">
                  <div>
                    <span className="text-slate-500 block">Mobile</span>
                    <span className="font-mono text-slate-900 font-bold">{currentUser.mobile}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Joining Date</span>
                    <span className="font-mono text-slate-900">{currentUser.joiningDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Commission Rate</span>
                    <span className="font-mono text-emerald-700 font-bold">{commissionSettings.defaultRate}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Monthly Target</span>
                    <span className="font-mono text-amber-700 font-bold">{formatINR(monthlyTarget)}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2">
                  <button
                    onClick={() => setDeviceMode('web')}
                    className="w-full py-2.5 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-blue-200 transition cursor-pointer"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>Switch to Full Web Portal</span>
                  </button>

                  <button
                    onClick={logout}
                    className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl flex items-center justify-center gap-2 border border-red-200 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out / Logout</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Android Bottom Navigation Bar */}
        <div className="bg-white border-t border-slate-200 px-2 py-2 flex items-center justify-around text-[10px] font-medium z-30 shadow-xs">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === 'dashboard' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Home</span>
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === 'accounts' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FolderLock className="w-5 h-5" />
            <span>Accounts</span>
          </button>

          <button
            onClick={() => setActiveTab('followups')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === 'followups' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PhoneCall className="w-5 h-5" />
            <span>Calls</span>
          </button>

          <button
            onClick={() => setActiveTab('ptp')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === 'ptp' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>PTP</span>
          </button>

          <button
            onClick={() => setActiveTab('visits')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === 'visits' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Visits</span>
          </button>

          <button
            onClick={() => setActiveTab('recovery')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === 'recovery' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <DollarSign className="w-5 h-5" />
            <span>Earn 10%</span>
          </button>

          <button
            onClick={() => setActiveTab('photos')}
            className={`flex flex-col items-center gap-1 transition cursor-pointer ${
              activeTab === 'photos' ? 'text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Camera className="w-5 h-5" />
            <span>Photos</span>
          </button>
        </div>
      </div>

      {/* Floating Action Modals on Android view */}
      {selectedAccount && isWatermarkOpen && (
        <WatermarkCameraModal
          account={selectedAccount}
          isOpen={isWatermarkOpen}
          onClose={() => setIsWatermarkOpen(false)}
        />
      )}

      {selectedAccount && isVoiceOpen && (
        <VoiceNoteRecorderModal
          account={selectedAccount}
          isOpen={isVoiceOpen}
          onClose={() => setIsVoiceOpen(false)}
        />
      )}

      {selectedAccount && isTimelineOpen && (
        <AccountTimelineDrawer
          account={selectedAccount}
          isOpen={isTimelineOpen}
          onClose={() => setIsTimelineOpen(false)}
          onOpenWatermarkCamera={() => setIsWatermarkOpen(true)}
          onOpenVoiceRecorder={() => setIsVoiceOpen(true)}
          onOpenFollowUp={() => setIsFollowUpOpen(true)}
          onOpenPTP={() => setIsPTPOpen(true)}
          onOpenRecovery={() => setIsRecoveryOpen(true)}
        />
      )}

      {selectedAccount && isFollowUpOpen && (
        <LogFollowUpModal
          account={selectedAccount}
          isOpen={isFollowUpOpen}
          onClose={() => setIsFollowUpOpen(false)}
        />
      )}

      {selectedAccount && isPTPOpen && (
        <CreatePTPModal
          account={selectedAccount}
          isOpen={isPTPOpen}
          onClose={() => setIsPTPOpen(false)}
        />
      )}

      {selectedAccount && isRecoveryOpen && (
        <RecordRecoveryModal
          account={selectedAccount}
          isOpen={isRecoveryOpen}
          onClose={() => setIsRecoveryOpen(false)}
        />
      )}

      {selectedAccount && isVisitOpen && (
        <FieldVisitModal
          account={selectedAccount}
          isOpen={isVisitOpen}
          onClose={() => setIsVisitOpen(false)}
          onOpenWatermarkCamera={() => setIsWatermarkOpen(true)}
        />
      )}

      {selectedAccount && isWhatsAppOpen && (
        <WhatsAppTriggerModal
          account={selectedAccount}
          isOpen={isWhatsAppOpen}
          onClose={() => setIsWhatsAppOpen(false)}
        />
      )}

      {selectedAccount && isAIOpen && (
        <AIRecoveryDrawer
          account={selectedAccount}
          isOpen={isAIOpen}
          onClose={() => setIsAIOpen(false)}
        />
      )}

      {/* Customer Consolidated Single View Modal */}
      {selectedAccount && (
        <CustomerConsolidatedDetailModal
          account={selectedAccount}
          isOpen={isSingleCustomerModalOpen}
          onClose={() => setIsSingleCustomerModalOpen(false)}
          onOpenNoteModal={() => {
            setIsSingleCustomerModalOpen(false);
            setIsAddNoteModalOpen(true);
          }}
          onOpenRecoveryModal={() => {
            setIsSingleCustomerModalOpen(false);
            setIsRecoveryOpen(true);
          }}
          onOpenPTPModal={() => {
            setIsSingleCustomerModalOpen(false);
            setIsPTPOpen(true);
          }}
        />
      )}

      {/* Add Agent Note Modal */}
      {selectedAccount && (
        <AddAgentNoteModal
          account={selectedAccount}
          isOpen={isAddNoteModalOpen}
          onClose={() => setIsAddNoteModalOpen(false)}
        />
      )}
    </div>
  );
};
