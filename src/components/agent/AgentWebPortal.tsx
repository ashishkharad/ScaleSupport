import React, { useState, useMemo } from 'react';
import {
  LayoutDashboard,
  FolderLock,
  PhoneCall,
  Calendar,
  MapPin,
  DollarSign,
  Camera,
  Mic,
  BarChart3,
  Percent,
  MessageSquare,
  Sparkles,
  Search,
  Plus,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronRight,
  Eye,
  RefreshCw,
  Zap,
  HardDrive,
  Table,
  Layers,
  ArrowUpRight,
  Navigation,
  Printer,
  Shield,
  LogOut,
  X,
  FileSpreadsheet,
  Upload,
  Menu,
  Edit3,
  Trash2,
  FileText,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account, FollowUp, PTPRecord, RecoveryRecord, FieldVisit } from '../../types';
import { formatINR } from '../../utils/watermark';
import { ScaleSupportLogo } from '../common/ScaleSupportLogo';
import { exportAccountsToExactExcel } from '../../utils/excelAccountImporter';
import { AccountTimelineDrawer } from '../common/AccountTimelineDrawer';
import { CustomerConsolidatedDetailModal } from '../common/CustomerConsolidatedDetailModal';
import { WatermarkCameraModal } from '../common/WatermarkCameraModal';
import { VoiceNoteRecorderModal } from '../common/VoiceNoteRecorderModal';
import { DailyRecoveryReceiptModal } from '../common/DailyRecoveryReceiptModal';
import { GoogleDriveLinkModal } from '../common/GoogleDriveLinkModal';
import { PTPDigestModal } from '../common/PTPDigestModal';
import { CommissionBillModal } from '../common/CommissionBillModal';
import { CustomerSearchSelectModal, ServiceActionType } from '../common/CustomerSearchSelectModal';
import { StarRating } from '../common/StarRating';
import {
  LogFollowUpModal,
  CreatePTPModal,
  RecordRecoveryModal,
  EditRecoveryModal,
  FieldVisitModal,
  WhatsAppTriggerModal,
  AIRecoveryDrawer,
  AddAgentNoteModal,
} from '../common/ActionModals';

export const AgentWebPortal: React.FC = () => {
  const {
    currentUser,
    accounts,
    followups,
    ptps,
    recoveries,
    visits,
    photos,
    voiceNotes,
    commissionSettings,
    logout,
    getExpiredPTPPreview,
    deleteRecovery,
    updateCustomerStarRating,
  } = useSRMS();

  // Active section in Agent Web Portal
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Search & Filtering
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [portfolioScope, setPortfolioScope] = useState<'my' | 'all'>('my');
  const [accountViewMode, setAccountViewMode] = useState<'table' | 'cards'>('table');
  const [ptpFilterStatus, setPtpFilterStatus] = useState<string>('ALL');

  // Selected state for modals
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [selectedRecoveryForReceipt, setSelectedRecoveryForReceipt] = useState<RecoveryRecord | null>(null);

  // Modals state
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isWatermarkOpen, setIsWatermarkOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isPTPOpen, setIsPTPOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isSingleCustomerModalOpen, setIsSingleCustomerModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isPTPDigestOpen, setIsPTPDigestOpen] = useState(false);
  const [isCommissionBillOpen, setIsCommissionBillOpen] = useState(false);
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);
  const [selectedCommissionMonth, setSelectedCommissionMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [customerSearchAction, setCustomerSearchAction] = useState<ServiceActionType>('followup');
  const [selectedRecoveryForEdit, setSelectedRecoveryForEdit] = useState<RecoveryRecord | null>(null);
  const [isEditRecoveryOpen, setIsEditRecoveryOpen] = useState(false);

  const handleOpenSearchForAction = (action: ServiceActionType) => {
    setCustomerSearchAction(action);
    setIsCustomerSearchOpen(true);
  };

  const handleCustomerSelectedFromSearch = (acc: Account, action: ServiceActionType) => {
    setSelectedAccount(acc);
    setIsCustomerSearchOpen(false);
    if (action === 'followup') setIsFollowUpOpen(true);
    else if (action === 'ptp') setIsPTPOpen(true);
    else if (action === 'recovery') setIsRecoveryOpen(true);
    else if (action === 'visit') setIsVisitOpen(true);
    else if (action === 'photo') setIsWatermarkOpen(true);
    else if (action === 'voice') setIsVoiceOpen(true);
    else if (action === 'view') setIsSingleCustomerModalOpen(true);
  };

  // Filter agent specific accounts
  const agentAssignedAccounts = accounts.filter(
    (a) =>
      (currentUser.agentId && a.assignedAgentId === currentUser.agentId) ||
      a.assignedAgentId === currentUser.id ||
      (currentUser.name && a.assignedAgentName?.toLowerCase() === currentUser.name.toLowerCase())
  );

  const assignedAccountIds = useMemo(
    () => new Set(agentAssignedAccounts.map((a) => a.accountId)),
    [agentAssignedAccounts]
  );

  const baseAccountsList = portfolioScope === 'my' ? agentAssignedAccounts : accounts;

  // Filtered accounts list
  const filteredAccounts = baseAccountsList.filter((acc) => {
    const matchesSearch =
      acc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.mobile.includes(searchTerm) ||
      acc.address.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterStatus === 'ALL') return true;
    if (filterStatus === 'PRIME') return acc.isPrimeCustomer || (acc.customerStarRating ?? 0) >= 4;
    if (filterStatus === 'STAR_5') return (acc.customerStarRating ?? 0) === 5;
    if (filterStatus === 'STAR_4') return (acc.customerStarRating ?? 0) === 4;
    if (filterStatus === 'STAR_3') return (acc.customerStarRating ?? 0) === 3;
    if (filterStatus === 'STAR_2') return (acc.customerStarRating ?? 0) === 2;
    if (filterStatus === 'STAR_1') return (acc.customerStarRating ?? 0) === 1;
    if (filterStatus === 'STAR_0') return !acc.customerStarRating || acc.customerStarRating === 0;
    if (filterStatus === 'CLOSED_OTS') return acc.accountStatus === 'Closed as per OTS';
    if (filterStatus === 'REGULAR_CLOSE') return acc.accountStatus === 'Regular Close';
    if (filterStatus === 'PTP_PENDING') return acc.accountStatus === 'PTP Pending';
    if (filterStatus === 'BROKEN_PTP') return (acc.ptpCount ?? 0) >= 2;
    if (filterStatus === 'CRITICAL') return acc.customerCategory === 'Critical NPA';
    if (filterStatus === 'MULTI_ACC') return acc.isMultipleAccount;
    if (filterStatus === 'VISIT_PENDING') return acc.accountStatus === 'Field Visit Pending';
    if (filterStatus === 'RECOVERED') return acc.accountStatus === 'Recovered' || acc.accountStatus === 'Closed';
    return acc.accountStatus === filterStatus;
  });

  // Agent Recovery & Target Stats (includes recoveries credited directly, or entered by Admin/BM on assigned accounts)
  const agentRecoveries = recoveries.filter(
    (r) =>
      (currentUser.agentId && r.agentId === currentUser.agentId) ||
      r.agentId === currentUser.id ||
      (currentUser.name && r.agentName?.toLowerCase() === currentUser.name.toLowerCase()) ||
      assignedAccountIds.has(r.accountId)
  );
  const totalRecoveredAmount = agentRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const totalCommissionEarned = agentRecoveries.reduce((sum, r) => sum + r.commissionAmount, 0);
  const monthlyTarget = currentUser.monthlyTarget || 300000;
  const targetPct = Math.min(100, Math.round((totalRecoveredAmount / monthlyTarget) * 100));

  // Unique months available in agent recoveries for commission month selector
  const availableCommissionMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    agentRecoveries.forEach((r) => {
      if (r.recoveryDate && r.recoveryDate.length >= 7) {
        monthsSet.add(r.recoveryDate.slice(0, 7));
      }
    });
    // Ensure default current month is present
    monthsSet.add(currentMonthStr);
    return Array.from(monthsSet).sort().reverse();
  }, [agentRecoveries, currentMonthStr]);

  // Filtered recoveries for Commission Section based on selectedCommissionMonth
  const commissionFilteredRecoveries = useMemo(() => {
    if (selectedCommissionMonth === 'all') return agentRecoveries;
    return agentRecoveries.filter((r) => r.recoveryDate?.startsWith(selectedCommissionMonth));
  }, [agentRecoveries, selectedCommissionMonth]);

  const commissionMonthRecoveredAmount = useMemo(
    () => commissionFilteredRecoveries.reduce((sum, r) => sum + r.amount, 0),
    [commissionFilteredRecoveries]
  );
  const commissionMonthEarnedAmount = useMemo(
    () => commissionFilteredRecoveries.reduce((sum, r) => sum + r.commissionAmount, 0),
    [commissionFilteredRecoveries]
  );
  const commissionMonthTargetPct = Math.min(
    100,
    Math.round((commissionMonthRecoveredAmount / monthlyTarget) * 100)
  );

  // Account-wise aggregated commission data for the selected month
  const accountWiseCommissionSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        accountId: string;
        customerName: string;
        totalRecovered: number;
        totalCommission: number;
        receiptCount: number;
        isOTS: boolean;
        lastDate: string;
      }
    >();

    commissionFilteredRecoveries.forEach((r) => {
      const existing = map.get(r.accountId) || {
        accountId: r.accountId,
        customerName: r.customerName || accounts.find((a) => a.accountId === r.accountId)?.customerName || 'Customer',
        totalRecovered: 0,
        totalCommission: 0,
        receiptCount: 0,
        isOTS: Boolean(r.isOTS),
        lastDate: r.recoveryDate,
      };

      existing.totalRecovered += r.amount;
      existing.totalCommission += r.commissionAmount;
      existing.receiptCount += 1;
      if (r.isOTS) existing.isOTS = true;
      if (r.recoveryDate > existing.lastDate) existing.lastDate = r.recoveryDate;

      map.set(r.accountId, existing);
    });

    return Array.from(map.values());
  }, [commissionFilteredRecoveries, accounts]);

  const totalAssignedOverdue = agentAssignedAccounts.reduce((sum, a) => sum + a.overdueAmount, 0);
  const totalAssignedOutstanding = agentAssignedAccounts.reduce((sum, a) => sum + a.outstandingAmount, 0);

  // Agent PTPs & Followups (includes PTPs created directly or by Admin on assigned accounts)
  const agentPTPs = ptps.filter(
    (p) =>
      (currentUser.agentId && p.agentId === currentUser.agentId) ||
      p.agentId === currentUser.id ||
      (currentUser.name && p.agentName?.toLowerCase() === currentUser.name.toLowerCase()) ||
      assignedAccountIds.has(p.accountId)
  );
  const pendingPTPCount = agentPTPs.filter((p) => p.status === 'Pending').length;
  const achievedPTPCount = agentPTPs.filter((p) => p.status === 'Achieved').length;
  const brokenPTPCount = agentPTPs.filter((p) => p.status === 'Broken').length;

  const todayStr = '2026-08-23';
  const ptpPreview = getExpiredPTPPreview(todayStr);

  const todaysDuePTPs = agentPTPs.filter((p) => p.status === 'Pending' && p.ptpDate === todayStr);
  const todaysFollowups = agentAssignedAccounts.filter((a) => a.nextFollowUpDate === todayStr);

  const agentVisits = visits.filter((v) => (currentUser.agentId && v.agentId === currentUser.agentId) || v.agentId === currentUser.id);
  const agentPhotos = photos.filter((p) => (currentUser.agentId && p.agentId === currentUser.agentId) || p.agentId === currentUser.id);
  const agentVoiceNotes = voiceNotes.filter((v) => (currentUser.agentId && v.agentId === currentUser.agentId) || v.agentId === currentUser.id);

  const openAccountAction = (acc: Account, action: string) => {
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

  const openReceiptView = (rec: RecoveryRecord) => {
    setSelectedRecoveryForReceipt(rec);
    const linkedAcc = accounts.find((a) => a.accountId === rec.accountId);
    setSelectedAccount(linkedAcc || null);
    setIsReceiptModalOpen(true);
  };

  const handlePrintCallingSheet = () => {
    window.print();
  };

  const renderNavContent = () => (
    <>
      {/* Brand & Agent Identity Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="bg-white/95 p-2 rounded-xl shadow-2xs">
            <ScaleSupportLogo variant="full" size="md" />
          </div>
          {isMobileSidebarOpen && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-2.5 rounded-xl space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {currentUser.role === 'admin' ? 'Administrative Recovery Console' : 'Agent Recovery Console'}
            </span>
            <span className="text-[10px] bg-blue-600/30 text-blue-300 font-mono px-1.5 py-0.5 rounded border border-blue-500/30 font-bold">
              {currentUser.agentId || currentUser.username || currentUser.id}
            </span>
          </div>
          <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
          <p className="text-[11px] text-slate-400 truncate">{currentUser.branch || currentUser.zonalOffice || currentUser.zone || 'Administrative Office'}</p>
        </div>
      </div>

      {/* Sidebar Nav Items */}
      <nav className="flex-1 py-3 overflow-y-auto space-y-1">
        <div className="px-5 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Daily Operations
        </div>

        {[
          { id: 'dashboard', label: 'Agent Command Desk', icon: LayoutDashboard },
          { id: 'accounts', label: 'My Loan Portfolio', icon: FolderLock, count: agentAssignedAccounts.length },
          { id: 'followups', label: 'Calling Desk & Logs', icon: PhoneCall, count: todaysFollowups.length },
          { id: 'ptp', label: 'PTP Commitments', icon: Calendar, count: pendingPTPCount },
          { id: 'visits', label: 'Field Visits & Route', icon: MapPin, count: agentVisits.length },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors cursor-pointer text-left text-xs ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border-r-4 border-blue-500 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-blue-600/40 text-blue-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-5 mt-4 py-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Collections &amp; Media
        </div>

        {[
          { id: 'recovery', label: 'Collections & Receipts', icon: DollarSign, count: agentRecoveries.length },
          { id: 'commission', label: 'My Commission Ledger', icon: Percent },
          { id: 'photos', label: 'Geo-Tagged Photos', icon: Camera, count: agentPhotos.length },
          { id: 'voice', label: 'Voice Notes Library', icon: Mic, count: agentVoiceNotes.length },
          { id: 'ai', label: 'AI Recovery Copilot', icon: Sparkles },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setIsMobileSidebarOpen(false);
              }}
              className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors cursor-pointer text-left text-xs ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border-r-4 border-blue-500 font-bold'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white font-medium'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    isActive ? 'bg-blue-600/40 text-blue-200' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sidebar Footer User Info */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-300 text-xs shrink-0">
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
            <p className="text-[10px] text-slate-400 capitalize truncate">
              {currentUser.agentId || 'Field Agent'}
            </p>
          </div>
          <button
            onClick={logout}
            title="Log out of session"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800/80 rounded-lg transition cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100vh-53px)] w-full max-w-full bg-[#f8fafc] text-slate-800 font-sans overflow-hidden relative">
      {/* Mobile Sidebar Overlay Drawer */}
      {isMobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative w-72 max-w-[80vw] bg-[#0f172a] text-slate-300 flex flex-col h-full z-10 shadow-2xl border-r border-slate-800 animate-in slide-in-from-left duration-200">
            {renderNavContent()}
          </aside>
        </div>
      )}

      {/* Desktop Agent Left Sidebar */}
      <aside className="hidden lg:flex w-64 bg-[#0f172a] text-slate-300 flex-col shrink-0 border-r border-slate-800 h-full">
        {renderNavContent()}
      </aside>

      {/* Main Agent Workspace Area */}
      <main className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden bg-[#f8fafc]">
        {/* Agent Top Header Bar with Live Quick Actions */}
        <header className="min-h-14 sm:h-16 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between px-3 sm:px-6 py-2 shrink-0 shadow-2xs gap-2 w-full max-w-full">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h2 className="text-sm sm:text-base font-black text-slate-900 capitalize truncate">
                {activeSection === 'dashboard'
                  ? 'Agent Command Desk'
                  : activeSection.replace('-', ' ')}
              </h2>
              <span className="px-1.5 sm:px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] sm:text-[11px] font-bold rounded-md flex items-center gap-1 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="hidden xs:inline">Live Mode</span>
              </span>
            </div>
            <span className="hidden xl:inline-block text-xs text-slate-400 font-medium">
              Portfolio: {agentAssignedAccounts.length} Accounts ({formatINR(totalAssignedOverdue)} Overdue)
            </span>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-7 sm:pl-9 pr-3 sm:pr-4 py-1 sm:py-1.5 bg-slate-100 border border-slate-200 rounded-full text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 w-28 xs:w-36 sm:w-48 focus:outline-none"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
            </div>

            {/* Quick 1-Click Action Shortcuts */}
            <button
              onClick={() => {
                if (agentAssignedAccounts.length > 0) {
                  setSelectedAccount(agentAssignedAccounts[0]);
                  setIsRecoveryOpen(true);
                } else if (accounts.length > 0) {
                  setSelectedAccount(accounts[0]);
                  setIsRecoveryOpen(true);
                }
              }}
              className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 shadow-xs transition cursor-pointer"
              title="Record customer recovery payment"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>+ Recovery</span>
            </button>

            <button
              onClick={() => {
                if (agentAssignedAccounts.length > 0) {
                  setSelectedAccount(agentAssignedAccounts[0]);
                  setIsPTPOpen(true);
                } else if (accounts.length > 0) {
                  setSelectedAccount(accounts[0]);
                  setIsPTPOpen(true);
                }
              }}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
              title="Create Promise To Pay commitment"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>+ PTP</span>
            </button>

            <button
              onClick={() => {
                if (agentAssignedAccounts.length > 0) {
                  setSelectedAccount(agentAssignedAccounts[0]);
                  setIsWatermarkOpen(true);
                } else if (accounts.length > 0) {
                  setSelectedAccount(accounts[0]);
                  setIsWatermarkOpen(true);
                }
              }}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-full text-xs font-bold flex items-center gap-1.5 border border-sky-200 transition cursor-pointer"
              title="Open Geo-Tagged Watermark Camera"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Geo-Photo</span>
            </button>

            <button
              onClick={() => {
                if (agentAssignedAccounts.length > 0) {
                  setSelectedAccount(agentAssignedAccounts[0]);
                  setIsVoiceOpen(true);
                } else if (accounts.length > 0) {
                  setSelectedAccount(accounts[0]);
                  setIsVoiceOpen(true);
                }
              }}
              className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-full text-xs font-bold flex items-center gap-1.5 border border-pink-200 transition cursor-pointer"
              title="Record Voice Note"
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Note</span>
            </button>

            <button
              onClick={() => {
                if (agentAssignedAccounts.length > 0) {
                  setSelectedAccount(agentAssignedAccounts[0]);
                  setIsAIOpen(true);
                }
              }}
              className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1.5 border border-blue-200 transition cursor-pointer"
              title="AI Recovery Strategy Copilot"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>AI Copilot</span>
            </button>
          </div>
        </header>

        {/* Scrollable Agent Section Content */}
        <div className="p-3 sm:p-6 flex-1 overflow-y-auto flex flex-col gap-6 w-full max-w-full">

          {/* 1. AGENT COMMAND DESK / DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              
              {/* Agent Performance & Monthly Target Hero Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-[#0f172a] to-blue-950 text-white rounded-3xl p-6 shadow-md border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold rounded border border-emerald-500/30">
                        {currentUser.agentId || currentUser.username || currentUser.id}
                      </span>
                      <span className="text-xs text-slate-300 font-bold">
                        {currentUser.branch || currentUser.zonalOffice || currentUser.zone || 'Administrative Office'}
                      </span>
                    </div>
                    <h3 className="text-2xl font-black text-white">
                      Welcome back, {currentUser.name}
                    </h3>
                    <p className="text-xs text-slate-300 max-w-xl">
                      You have <span className="text-amber-300 font-bold">{todaysDuePTPs.length} PTP commitments</span> and <span className="text-blue-300 font-bold">{todaysFollowups.length} follow-up calls</span> scheduled for today.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={handlePrintCallingSheet}
                      className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition cursor-pointer"
                    >
                      <Printer className="w-4 h-4 text-blue-400" />
                      <span>Print Today's Calling Sheet</span>
                    </button>

                    <button
                      onClick={() => setIsPTPDigestOpen(true)}
                      className="px-4 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition shadow-md cursor-pointer"
                    >
                      <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                      <span>PTP Digest ({ptpPreview.expiredCount} Expired)</span>
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Commission Highlights */}
                <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-2 md:col-span-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-300 font-medium">Monthly Recovery Target Achievement</span>
                      <span className="font-mono text-emerald-400 font-black text-sm">{targetPct}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-emerald-500 to-blue-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${targetPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                      <span>Achieved: <b className="text-white">{formatINR(totalRecoveredAmount)}</b></span>
                      <span>Target: <b className="text-white">{formatINR(monthlyTarget)}</b></span>
                    </div>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[11px]">Accrued Commission (10%)</span>
                    <p className="text-xl font-black text-amber-400 font-mono">{formatINR(totalCommissionEarned)}</p>
                    <span className="text-[10px] text-emerald-400 font-semibold">100% Verified &amp; Approved</span>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-2xl border border-white/10 space-y-1">
                    <span className="text-slate-400 text-[11px]">Active Overdue Portfolio</span>
                    <p className="text-xl font-black text-rose-400 font-mono">{formatINR(totalAssignedOverdue)}</p>
                    <span className="text-[10px] text-slate-400">{agentAssignedAccounts.length} Loan Accounts</span>
                  </div>
                </div>
              </div>

              {/* Today's Priority Action Queue */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-blue-600" />
                      <span>Today's Priority Calling &amp; Action Desk</span>
                    </h4>
                    <p className="text-xs text-slate-500">
                      High-priority accounts requiring immediate call, PTP collection, or geo-tagged field visit
                    </p>
                  </div>
                  <span className="text-xs font-mono bg-blue-50 text-blue-700 px-3 py-1 rounded-lg border border-blue-200 font-bold">
                    {agentAssignedAccounts.slice(0, 5).length} Pending Actions
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 uppercase tracking-wider font-semibold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Account &amp; Borrower</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Overdue / Total</th>
                        <th className="p-3">Risk &amp; PTP History</th>
                        <th className="p-3">Last Note / Status</th>
                        <th className="p-3 text-right">Instant Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {agentAssignedAccounts.slice(0, 6).map((acc, idx) => (
                        <tr key={acc.id || acc.accountId || `dash-acc-${idx}`} className="hover:bg-slate-50 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{acc.customerName}</span>
                              {acc.isMultipleAccount && (
                                <button
                                  onClick={() => openAccountAction(acc, 'singleView')}
                                  className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full border border-purple-200"
                                >
                                  Multi ({acc.multipleAccountsCount || 2})
                                </button>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <StarRating
                                rating={acc.customerStarRating || 0}
                                onChange={(newRating) => updateCustomerStarRating(acc.accountId, newRating)}
                                size="sm"
                                showPrimeBadge
                              />
                            </div>
                            <div className="text-blue-600 font-mono text-[11px] font-bold mt-0.5">{acc.accountId}</div>
                            <div className="text-slate-500 text-[11px] font-mono">{acc.mobile}</div>
                            <div className="text-slate-400 text-[10px] truncate max-w-[200px]">{acc.address}</div>
                          </td>

                          <td className="p-3">
                            <span className="font-medium text-slate-800">{acc.loanType}</span>
                            <div className="text-[10px] text-slate-400">{acc.branch}</div>
                          </td>

                          <td className="p-3 font-mono">
                            <div className="text-rose-600 font-bold text-sm">{formatINR(acc.overdueAmount)}</div>
                            <div className="text-slate-400 text-[10px]">Total: {formatINR(acc.outstandingAmount)}</div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                (acc.ptpCount ?? 0) >= 3
                                  ? 'bg-rose-50 text-rose-700 border-rose-200'
                                  : (acc.ptpCount ?? 0) >= 1
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-50 text-slate-700 border-slate-200'
                              }`}
                            >
                              {acc.ptpCount ?? 0} PTPs Logged
                            </span>
                            <div className="text-[10px] text-slate-500 mt-1">{acc.customerCategory}</div>
                          </td>

                          <td className="p-3">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                acc.accountStatus === 'Recovered'
                                  ? 'bg-green-100 text-green-700'
                                  : acc.accountStatus === 'PTP Pending'
                                  ? 'bg-blue-100 text-blue-700'
                                  : acc.accountStatus === 'Field Visit Pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {acc.accountStatus}
                            </span>
                            {acc.agentNotesHistory && acc.agentNotesHistory.length > 0 && (
                              <p className="text-[10px] text-indigo-700 truncate max-w-[180px] mt-1 italic">
                                "{acc.agentNotesHistory[acc.agentNotesHistory.length - 1].note}"
                              </p>
                            )}
                          </td>

                          <td className="p-3 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => openAccountAction(acc, 'singleView')}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition cursor-pointer"
                              title="Consolidated Customer Dossier"
                            >
                              <Layers className="w-3 h-3 inline mr-1" />
                              View
                            </button>

                            <button
                              onClick={() => openAccountAction(acc, 'followup')}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition cursor-pointer"
                              title="Log Call / Follow-up"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openAccountAction(acc, 'ptp')}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition cursor-pointer"
                              title="Record PTP Commitment"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openAccountAction(acc, 'recovery')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                              title="Collect Payment & Generate Receipt"
                            >
                              + ₹
                            </button>

                            <button
                              onClick={() => openAccountAction(acc, 'visit')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition cursor-pointer"
                              title="Log Field Visit"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openAccountAction(acc, 'watermark')}
                              className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg border border-sky-200 transition cursor-pointer"
                              title="Geo Photo"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => openAccountAction(acc, 'ai')}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition cursor-pointer"
                              title="AI Strategy"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Two Column Grid: Recent Collections with Receipt Print & Today's PTP Countdown */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
                
                {/* Recent Collections by Agent with Instant Receipt Modal */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                      <span>My Recent Recovery Collections</span>
                    </h4>
                    <button
                      onClick={() => setActiveSection('recovery')}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      All ({agentRecoveries.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {agentRecoveries.slice(0, 3).map((rec, idx) => (
                      <div
                        key={rec.id || rec.recoveryId || rec.receiptNumber || `dash-rec-${idx}`}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 hover:bg-slate-100/80 transition"
                      >
                        <div>
                          <div className="font-bold text-slate-900">{rec.customerName}</div>
                          <span className="font-mono text-[11px] text-blue-600 font-semibold">{rec.accountId}</span>
                          <div className="text-[10px] text-slate-500">{rec.recoveryDate} • {rec.paymentMode.toUpperCase()}</div>
                        </div>

                        <div className="text-right space-y-1">
                          <div className="font-black text-emerald-600 font-mono text-sm">{formatINR(rec.amount)}</div>
                          <button
                            onClick={() => openReceiptView(rec)}
                            className="px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-700 rounded-lg border border-slate-200 text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer ml-auto"
                            title="View & Print Official Receipt"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Print Receipt</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Today's PTP Commitments Queue */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>Promises to Pay (PTP) Schedule</span>
                    </h4>
                    <button
                      onClick={() => setActiveSection('ptp')}
                      className="text-xs text-blue-600 font-bold hover:underline"
                    >
                      All PTPs ({agentPTPs.length}) →
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {agentPTPs.slice(0, 3).map((ptp, idx) => (
                      <div
                        key={ptp.id || `dash-ptp-${ptp.accountId}-${ptp.ptpDate}-${idx}`}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="font-bold text-slate-900">{ptp.customerName}</span>
                            <span className="block font-mono text-[11px] text-blue-600 font-semibold">{ptp.accountId}</span>
                          </div>
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-full border border-purple-200">
                            {ptp.status}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs font-mono bg-white p-2 rounded-lg border border-slate-200">
                          <span className="font-bold text-purple-700">{formatINR(ptp.amount)}</span>
                          <span className="text-slate-600 font-sans text-[11px]">Due: {ptp.ptpDate} ({ptp.ptpMode})</span>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1">
                          <span className="italic truncate max-w-[200px]">"{ptp.customerCommitment}"</span>
                          <button
                            onClick={() => {
                              const acc = accounts.find((a) => a.accountId === ptp.accountId);
                              if (acc) {
                                setSelectedAccount(acc);
                                setIsRecoveryOpen(true);
                              }
                            }}
                            className="text-emerald-600 font-bold hover:underline"
                          >
                            Collect Payment →
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* 2. MY ASSIGNED LOAN PORTFOLIO */}
          {activeSection === 'accounts' && (
            <div className="space-y-4 text-xs">
              
              {/* Filter and Scope Bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3">
                
                {/* Search & Scope */}
                <div className="flex items-center gap-3 flex-1 min-w-[300px]">
                  
                  {/* Search */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search my accounts by customer, account ID, mobile, area..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* Portfolio Scope Toggle */}
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                    <button
                      onClick={() => setPortfolioScope('my')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        portfolioScope === 'my'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      My Assigned ({agentAssignedAccounts.length})
                    </button>
                    <button
                      onClick={() => setPortfolioScope('all')}
                      className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        portfolioScope === 'all'
                          ? 'bg-blue-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      All Branch Accounts ({accounts.length})
                    </button>
                  </div>
                </div>

                {/* Status Selector & Actions */}
                <div className="flex items-center gap-2">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 text-slate-800 font-semibold border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">All Account Statuses</option>
                    <option value="PRIME">⭐ Prime Customers (4 - 5 Stars)</option>
                    <option value="STAR_5">⭐⭐⭐⭐⭐ 5 Stars Only</option>
                    <option value="STAR_4">⭐⭐⭐⭐ 4 Stars Only</option>
                    <option value="STAR_3">⭐⭐⭐ 3 Stars Only</option>
                    <option value="STAR_2">⭐⭐ 2 Stars Only</option>
                    <option value="STAR_1">⭐ 1 Star Only</option>
                    <option value="STAR_0">0 Stars / Unrated</option>
                    <option value="PTP_PENDING">PTP Pending</option>
                    <option value="BROKEN_PTP">Broken PTP (High Risk)</option>
                    <option value="CRITICAL">Critical NPA</option>
                    <option value="MULTI_ACC">Multi-Loan Borrowers</option>
                    <option value="VISIT_PENDING">Field Visit Pending</option>
                    <option value="CLOSED_OTS">Closed as per OTS</option>
                    <option value="REGULAR_CLOSE">Regular Close</option>
                    <option value="RECOVERED">Recovered / Closed</option>
                  </select>

                  <button
                    onClick={() => exportAccountsToExactExcel(filteredAccounts)}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                    title="Export list to Excel"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel</span>
                  </button>

                  <button
                    onClick={handlePrintCallingSheet}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    title="Print Calling Sheet"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Calling Sheet</span>
                  </button>
                </div>
              </div>

              {/* Master Portfolio Table */}
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Account ID</th>
                        <th className="p-3.5">Borrower Details</th>
                        <th className="p-3.5">Product &amp; Branch</th>
                        <th className="p-3.5">Overdue / Total</th>
                        <th className="p-3.5">PTP Count &amp; Status</th>
                        <th className="p-3.5">Assigned Agent</th>
                        <th className="p-3.5 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredAccounts.map((acc, idx) => (
                        <tr key={acc.id || acc.accountId || `port-acc-${idx}`} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 font-mono font-bold text-blue-600">
                            <div>{acc.accountId}</div>
                            {acc.isMultipleAccount && (
                              <button
                                onClick={() => openAccountAction(acc, 'singleView')}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300 transition cursor-pointer"
                                title="Click to view all linked loans for this borrower"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>Multi-Loan ({acc.multipleAccountsCount || 2})</span>
                              </button>
                            )}
                          </td>

                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{acc.customerName}</span>
                              <button
                                onClick={() => openAccountAction(acc, 'singleView')}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition cursor-pointer"
                              >
                                Single View
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <StarRating
                                rating={acc.customerStarRating || 0}
                                onChange={(newRating) => updateCustomerStarRating(acc.accountId, newRating)}
                                size="sm"
                                showPrimeBadge
                              />
                            </div>
                            <div className="text-slate-500 font-mono text-[11px] mt-0.5">{acc.mobile}</div>
                            <div className="text-slate-400 text-[10px] truncate max-w-[220px]">{acc.address}</div>
                            {acc.agentNotesHistory && acc.agentNotesHistory.length > 0 && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded max-w-[240px] truncate border border-indigo-100">
                                <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                <span className="font-medium truncate">Note: {acc.agentNotesHistory[acc.agentNotesHistory.length - 1].note}</span>
                              </div>
                            )}
                          </td>

                          <td className="p-3.5">
                            <span className="font-medium text-slate-800">{acc.loanType}</span>
                            <div className="text-[10px] text-slate-400">{acc.branch}</div>
                          </td>

                          <td className="p-3.5 font-mono">
                            <div className="text-rose-600 font-bold">{formatINR(acc.overdueAmount)}</div>
                            <div className="text-slate-400 text-[10px]">Total: {formatINR(acc.outstandingAmount)}</div>
                          </td>

                          <td className="p-3.5">
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
                            <span
                              className={`ml-1 text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                acc.accountStatus === 'Recovered'
                                  ? 'bg-green-100 text-green-700'
                                  : acc.accountStatus === 'PTP Pending'
                                  ? 'bg-blue-100 text-blue-700'
                                  : acc.accountStatus === 'Field Visit Pending'
                                  ? 'bg-yellow-100 text-yellow-700'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {acc.accountStatus}
                            </span>
                          </td>

                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{acc.assignedAgentName}</div>
                            <div className="text-[10px] font-mono text-blue-600">{acc.assignedAgentId}</div>
                          </td>

                          <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => openAccountAction(acc, 'singleView')}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition cursor-pointer"
                              title="Consolidated Customer View"
                            >
                              <Layers className="w-3.5 h-3.5 inline mr-0.5" />
                              View
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'note')}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition cursor-pointer"
                              title="Add Agent Note"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'followup')}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 transition cursor-pointer"
                              title="Log Call"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'ptp')}
                              className="p-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg border border-purple-200 transition cursor-pointer"
                              title="Create PTP"
                            >
                              <Calendar className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'recovery')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                              title="Record Recovery Collection"
                            >
                              + ₹
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'visit')}
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition cursor-pointer"
                              title="Log Visit"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'watermark')}
                              className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg border border-sky-200 transition cursor-pointer"
                              title="Watermark Camera"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'voice')}
                              className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg border border-pink-200 transition cursor-pointer"
                              title="Voice Note"
                            >
                              <Mic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountAction(acc, 'ai')}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition cursor-pointer"
                              title="AI Strategy Copilot"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. MY FOLLOW-UPS & CALLING DESK */}
          {activeSection === 'followups' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-amber-600" />
                    <span>My Follow-up Calls &amp; Customer Interaction Logs</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Logged call transcripts, next follow-up dates, and borrower payment promises
                  </p>
                </div>
                <button
                  onClick={() => handleOpenSearchForAction('followup')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Log New Follow-up Call</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {followups
                  .filter((f) => f.agentId === currentUser.agentId || f.agentId === currentUser.id || portfolioScope === 'all')
                  .map((f, idx) => (
                    <div key={f.id || `fup-${f.accountId}-${idx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">{f.customerName}</span>
                          <span className="block font-mono text-[11px] text-blue-600 font-semibold">{f.accountId}</span>
                        </div>
                        <span className="text-amber-800 bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200 font-bold text-[10px]">
                          {f.status}
                        </span>
                      </div>

                      <p className="text-slate-700 bg-white p-2.5 rounded-xl border border-slate-200 italic">
                        "{f.discussionDetails}"
                      </p>

                      <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-1">
                        <span>Agent: {f.agentName}</span>
                        <span className="font-bold text-slate-700">Next: {f.nextFollowUpDate} ({f.nextFollowUpTime || '11:00 AM'})</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* 4. MY PTP COMMITMENTS */}
          {activeSection === 'ptp' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-purple-600" />
                    <span>My Promise to Pay (PTP) Tracker</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Track borrower commitments, upcoming payment deadlines, and conversion to recovery
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPTPDigestOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Zap className="w-4 h-4 text-amber-200 fill-amber-200" />
                    <span>Run PTP Digest</span>
                  </button>

                  <button
                    onClick={() => handleOpenSearchForAction('ptp')}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ New PTP Commitment</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agentPTPs.map((p, idx) => {
                  const isExpired = p.status === 'Pending' && p.ptpDate < todayStr;
                  const isDueToday = p.status === 'Pending' && p.ptpDate === todayStr;

                  return (
                    <div
                      key={p.id || `ptp-card-${p.accountId}-${idx}`}
                      className={`p-4 rounded-2xl border space-y-3 shadow-2xs transition ${
                        isExpired
                          ? 'bg-red-50/70 border-red-200 ring-1 ring-red-300'
                          : isDueToday
                          ? 'bg-amber-50/70 border-amber-200'
                          : p.status === 'Achieved'
                          ? 'bg-emerald-50/50 border-emerald-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{p.customerName}</div>
                          <span className="text-blue-600 font-mono text-[11px] font-bold">{p.accountId}</span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                            p.status === 'Achieved'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : p.status === 'Broken'
                              ? 'bg-red-100 text-red-800 border-red-300'
                              : isExpired
                              ? 'bg-rose-100 text-rose-800 border-rose-300 animate-pulse'
                              : isDueToday
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-blue-100 text-blue-800 border-blue-300'
                          }`}
                        >
                          {isExpired ? 'Expired Overdue' : isDueToday ? 'Due Today' : p.status}
                        </span>
                      </div>

                      <div className="flex justify-between items-center font-mono bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                        <span className="text-purple-700 font-black text-sm">{formatINR(p.amount)}</span>
                        <div className="text-right">
                          <span className="font-bold text-slate-800 block text-xs">{p.ptpDate}</span>
                          <span className="text-[10px] text-slate-500 font-sans">{p.ptpMode}</span>
                        </div>
                      </div>

                      <p className="text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-100 line-clamp-2 text-xs">
                        "{p.customerCommitment}"
                      </p>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <button
                          onClick={() => {
                            const acc = accounts.find((a) => a.accountId === p.accountId);
                            if (acc) openAccountAction(acc, 'singleView');
                          }}
                          className="text-blue-600 hover:text-blue-800 font-bold"
                        >
                          View 360° →
                        </button>

                        <button
                          onClick={() => {
                            const acc = accounts.find((a) => a.accountId === p.accountId);
                            if (acc) openAccountAction(acc, 'recovery');
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-2xs"
                        >
                          Collect ₹
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 5. MY COLLECTIONS & OFFICIAL DIGITAL RECEIPTS */}
          {activeSection === 'recovery' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>My Collections &amp; Official Payment Receipts</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Realized payments, 10% commission tags, transaction references, edit/delete entries, and printable borrower receipts
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 text-emerald-800 font-bold">
                    Total: {formatINR(totalRecoveredAmount)} ({formatINR(totalCommissionEarned)} Commission)
                  </div>

                  <button
                    onClick={() => handleOpenSearchForAction('recovery')}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Collect Payment &amp; Issue Receipt</span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                    <tr>
                      <th className="p-3.5">Receipt Number</th>
                      <th className="p-3.5">Borrower Details</th>
                      <th className="p-3.5">Amount Collected</th>
                      <th className="p-3.5">Agent Commission (10%)</th>
                      <th className="p-3.5">Payment Mode</th>
                      <th className="p-3.5">Date &amp; Time</th>
                      <th className="p-3.5">Type / Scheme</th>
                      <th className="p-3.5 text-right">Actions &amp; Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {agentRecoveries.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                          No recovery collections recorded yet. Click "+ Collect Payment &amp; Issue Receipt" to record a payment.
                        </td>
                      </tr>
                    ) : (
                      agentRecoveries.map((r, idx) => (
                        <tr key={r.id || r.recoveryId || r.receiptNumber || `rec-table-${idx}`} className="hover:bg-slate-50 transition">
                          <td className="p-3.5 font-mono text-blue-600 font-black">{r.receiptNumber}</td>
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{r.customerName}</div>
                            <div className="text-[11px] font-mono text-slate-500">{r.accountId}</div>
                          </td>
                          <td className="p-3.5 font-mono font-black text-emerald-600 text-sm">
                            {formatINR(r.amount)}
                          </td>
                          <td className="p-3.5 font-mono font-bold text-amber-600">
                            {formatINR(r.commissionAmount)}
                          </td>
                          <td className="p-3.5">
                            <span className="font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200 text-[10px]">
                              {r.paymentMode}
                            </span>
                          </td>
                          <td className="p-3.5 text-slate-500">{r.recoveryDate}</td>
                          <td className="p-3.5">
                            {r.isOTS ? (
                              <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold rounded-md border border-purple-200 text-[10px]">
                                {r.otsStage === '10_percent_token' ? 'OTS 10% Token' : 'OTS Settled & Closed'}
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-md text-[10px]">
                                Regular Recovery
                              </span>
                            )}
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openReceiptView(r)}
                                className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-bold border border-blue-200 flex items-center gap-1 shadow-2xs transition cursor-pointer text-[11px]"
                                title="View official digital receipt and print"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Receipt</span>
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedRecoveryForEdit(r);
                                  setIsEditRecoveryOpen(true);
                                }}
                                className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition cursor-pointer"
                                title="Edit recovery entry"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={async () => {
                                  if (
                                    window.confirm(
                                      `Are you sure you want to delete recovery entry ${r.receiptNumber} of ₹${r.amount.toLocaleString(
                                        'en-IN'
                                      )}? This will adjust account balances.`
                                    )
                                  ) {
                                    await deleteRecovery(r.id || r.recoveryId);
                                  }
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition cursor-pointer"
                                title="Delete recovery entry"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. MY COMMISSION LEDGER & MONTHLY CALCULATOR */}
          {activeSection === 'commission' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-600" />
                    <span>Agent Commission &amp; Incentive Ledger</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Standard {commissionSettings.defaultRate}% payout calculated account-wise on every verified borrower recovery
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Month Selection Dropdown */}
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <Calendar className="w-4 h-4 text-slate-500 ml-1" />
                    <span className="text-xs font-semibold text-slate-600">Month:</span>
                    <select
                      value={selectedCommissionMonth}
                      onChange={(e) => setSelectedCommissionMonth(e.target.value)}
                      className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                    >
                      <option value="all">All Months (Overall)</option>
                      {availableCommissionMonths.map((m, idx) => (
                        <option key={m || `month-${idx}`} value={m}>
                          {m === '2026-08' ? 'August 2026 (Current)' : m}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Generate / Print PDF Bill Button */}
                  <button
                    onClick={() => setIsCommissionBillOpen(true)}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Download Commission Bill (PDF)</span>
                  </button>
                </div>
              </div>

              {/* Commission Breakdown Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block text-[11px] font-medium">Realized Collections</span>
                  <span className="text-xl font-black text-emerald-600 font-mono">
                    {formatINR(commissionMonthRecoveredAmount)}
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {commissionFilteredRecoveries.length} receipt(s) in {selectedCommissionMonth === 'all' ? 'all months' : selectedCommissionMonth}
                  </p>
                </div>

                <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-1">
                  <span className="text-amber-800 block text-[11px] font-medium">Total Commission Earned</span>
                  <span className="text-xl font-black text-amber-700 font-mono">
                    {formatINR(commissionMonthEarnedAmount)}
                  </span>
                  <p className="text-[10px] text-amber-600 font-semibold">
                    @ {commissionSettings.defaultRate}% standard recovery rate
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block text-[11px] font-medium">Monthly Target Run-Rate</span>
                  <span className="text-xl font-black text-blue-600 font-mono">{commissionMonthTargetPct}% Reached</span>
                  <p className="text-[10px] text-slate-400">Target: {formatINR(monthlyTarget)}</p>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                  <span className="text-slate-500 block text-[11px] font-medium">Accounts Recovered</span>
                  <span className="text-xl font-black text-purple-700 font-mono">
                    {accountWiseCommissionSummary.length} Accounts
                  </span>
                  <p className="text-[10px] text-slate-400">
                    {accountWiseCommissionSummary.filter((a) => a.isOTS).length} OTS settled account(s)
                  </p>
                </div>
              </div>

              {/* ACCOUNT-WISE COMMISSION CALCULATOR SUMMARY */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-600" />
                    <span>Account-Wise Commission Calculation ({selectedCommissionMonth === 'all' ? 'All Months' : selectedCommissionMonth})</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Calculated account-wise on recovered amount
                  </span>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-amber-50/70 text-amber-900 font-bold border-b border-amber-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="p-3">Account Number</th>
                        <th className="p-3">Borrower Name</th>
                        <th className="p-3">Total Amount Recovered</th>
                        <th className="p-3">Commission Rate</th>
                        <th className="p-3">Total Commission Earned</th>
                        <th className="p-3">Receipts Count</th>
                        <th className="p-3">Account Status</th>
                        <th className="p-3 text-right">360° View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {accountWiseCommissionSummary.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-6 text-center text-slate-400">
                            No account collections recorded for this month.
                          </td>
                        </tr>
                      ) : (
                        accountWiseCommissionSummary.map((accSum, idx) => {
                          const linkedAccount = accounts.find((a) => a.accountId === accSum.accountId);
                          return (
                            <tr key={accSum.accountId || `accsum-${idx}`} className="hover:bg-slate-50 transition">
                              <td className="p-3 font-mono font-bold text-blue-600">{accSum.accountId}</td>
                              <td className="p-3 font-bold text-slate-900">{accSum.customerName}</td>
                              <td className="p-3 font-mono font-black text-emerald-600 text-sm">
                                {formatINR(accSum.totalRecovered)}
                              </td>
                              <td className="p-3 font-mono font-semibold text-slate-600">
                                {commissionSettings.defaultRate}%
                              </td>
                              <td className="p-3 font-mono font-black text-amber-700 text-sm">
                                {formatINR(accSum.totalCommission)}
                              </td>
                              <td className="p-3 font-mono font-bold text-slate-700">
                                {accSum.receiptCount} receipt(s)
                              </td>
                              <td className="p-3">
                                {accSum.isOTS ? (
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 font-bold text-[10px] rounded-md border border-purple-200">
                                    OTS Settled – Closed
                                  </span>
                                ) : linkedAccount?.accountStatus === 'Closed' ? (
                                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md border border-emerald-200">
                                    Fully Closed
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-medium text-[10px] rounded-md">
                                    Active Recovery
                                  </span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {linkedAccount && (
                                  <button
                                    onClick={() => openAccountAction(linkedAccount, 'singleView')}
                                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[10px] transition cursor-pointer"
                                  >
                                    View 360°
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {accountWiseCommissionSummary.length > 0 && (
                      <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-slate-900">
                        <tr>
                          <td className="p-3" colSpan={2}>
                            Total ({accountWiseCommissionSummary.length} Accounts)
                          </td>
                          <td className="p-3 font-mono text-emerald-700 text-sm">
                            {formatINR(commissionMonthRecoveredAmount)}
                          </td>
                          <td className="p-3 font-mono text-slate-500">{commissionSettings.defaultRate}% avg</td>
                          <td className="p-3 font-mono text-amber-700 text-sm">
                            {formatINR(commissionMonthEarnedAmount)}
                          </td>
                          <td className="p-3 font-mono" colSpan={3}>
                            {commissionFilteredRecoveries.length} Total Receipts
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>

              {/* DETAILED TRANSACTION-WISE RECOVERY COMMISSION TABLE */}
              <div className="space-y-2 pt-2">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Itemized Collection Receipts &amp; Commission Entries</span>
                </h4>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Receipt No</th>
                        <th className="p-3">Account &amp; Borrower</th>
                        <th className="p-3">Collection Amount</th>
                        <th className="p-3">Rate</th>
                        <th className="p-3">Commission Earned</th>
                        <th className="p-3">Payment Mode</th>
                        <th className="p-3">Date</th>
                        <th className="p-3">Payout Status</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {commissionFilteredRecoveries.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-6 text-center text-slate-400">
                            No collection entries recorded for this month.
                          </td>
                        </tr>
                      ) : (
                        commissionFilteredRecoveries.map((r, idx) => (
                          <tr key={r.id || r.recoveryId || r.receiptNumber || `comm-rec-${idx}`} className="hover:bg-slate-50 transition">
                            <td className="p-3 font-mono font-bold text-blue-600">{r.receiptNumber}</td>
                            <td className="p-3 font-bold text-slate-900">
                              {r.customerName} <span className="font-mono text-slate-500 text-[10px]">({r.accountId})</span>
                            </td>
                            <td className="p-3 font-mono font-bold text-emerald-600">{formatINR(r.amount)}</td>
                            <td className="p-3 font-mono font-bold text-amber-600">{commissionSettings.defaultRate}%</td>
                            <td className="p-3 font-mono font-black text-amber-700">{formatINR(r.commissionAmount)}</td>
                            <td className="p-3">
                              <span className="font-bold uppercase bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px]">
                                {r.paymentMode}
                              </span>
                            </td>
                            <td className="p-3 text-slate-500 font-mono text-[11px]">{r.recoveryDate}</td>
                            <td className="p-3">
                              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md border border-emerald-200">
                                Approved
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openReceiptView(r)}
                                  className="p-1 text-blue-600 hover:text-blue-800 transition"
                                  title="Print Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedRecoveryForEdit(r);
                                    setIsEditRecoveryOpen(true);
                                  }}
                                  className="p-1 text-amber-600 hover:text-amber-800 transition"
                                  title="Edit entry"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={async () => {
                                    if (
                                      window.confirm(
                                        `Are you sure you want to delete recovery entry ${r.receiptNumber} of ₹${r.amount.toLocaleString(
                                          'en-IN'
                                        )}?`
                                      )
                                    ) {
                                      await deleteRecovery(r.id || r.recoveryId);
                                    }
                                  }}
                                  className="p-1 text-rose-600 hover:text-rose-800 transition"
                                  title="Delete entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
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

          {/* 7. MY FIELD VISITS & ROUTE PLANNER */}
          {activeSection === 'visits' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-emerald-600" />
                    <span>My Field Visits &amp; Address Directory</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    GPS-tagged location visits, borrower address verification, and field visit logs
                  </p>
                </div>
                <button
                  onClick={() => handleOpenSearchForAction('visit')}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Log Field Visit</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentVisits.map((v, idx) => (
                  <div key={v.id || `visit-${v.accountId}-${idx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-900 text-sm">{v.customerName}</span>
                        <span className="block font-mono text-[11px] text-blue-600 font-semibold">{v.accountId}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">{v.address}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200">
                        {v.visitStatus}
                      </span>
                    </div>

                    <div className="flex justify-between items-center font-mono text-emerald-700 bg-white p-2.5 rounded-xl border border-slate-200 text-[11px]">
                      <span>GPS: {typeof v.latitude === 'number' ? v.latitude.toFixed(6) : '0.000000'}° N, {typeof v.longitude === 'number' ? v.longitude.toFixed(6) : '0.000000'}° E</span>
                      <span className="text-slate-600">{v.date} ({v.startTime} - {v.endTime || 'Done'})</span>
                    </div>

                    <p className="text-slate-600 bg-white p-2.5 rounded-xl border border-slate-100">
                      "{v.visitRemarks}"
                    </p>

                    <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(v.address || `${v.latitude},${v.longitude}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] flex items-center gap-1 border border-slate-200"
                      >
                        <Navigation className="w-3 h-3 text-blue-600" />
                        <span>Open Directions</span>
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 8. GEO PHOTOS */}
          {activeSection === 'photos' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Camera className="w-4 h-4 text-sky-600" />
                    <span>My Watermarked Field Photographs</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Geo-tagged photos stamped with GPS, account ID, timestamp, and synced to Google Drive
                  </p>
                </div>
                <button
                  onClick={() => handleOpenSearchForAction('photo')}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>+ Take Geo Photo</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {agentPhotos.map((ph, idx) => (
                  <div key={ph.id || `photo-${ph.accountId}-${idx}`} className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs space-y-2">
                    <div className="relative bg-slate-900 aspect-[4/3] flex items-center justify-center overflow-hidden">
                      <img src={ph.dataUrl} alt="Geo Stamp" className="w-full h-full object-contain" />
                    </div>
                    <div className="p-3.5 space-y-2 text-xs">
                      <div className="flex justify-between font-bold">
                        <span className="text-blue-600 font-mono">{ph.accountId}</span>
                        <span className="text-slate-400 font-mono text-[10px]">{ph.date}</span>
                      </div>
                      <div className="p-2 bg-slate-50 rounded-xl font-mono text-[10px] text-emerald-700 border border-slate-100">
                        Lat: {typeof ph.latitude === 'number' ? ph.latitude.toFixed(6) : '0.000000'}° | Lon: {typeof ph.longitude === 'number' ? ph.longitude.toFixed(6) : '0.000000'}°
                      </div>
                      <p className="text-slate-600 italic">"{ph.agentRemark}"</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. VOICE NOTES */}
          {activeSection === 'voice' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Mic className="w-4 h-4 text-pink-600" />
                    <span>My Recorded Voice Notes &amp; Transcripts</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Audio recordings of borrower conversations with real-time transcription and Drive sync
                  </p>
                </div>
                <button
                  onClick={() => handleOpenSearchForAction('voice')}
                  className="px-4 py-2 bg-pink-600 hover:bg-pink-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-2xs transition cursor-pointer"
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>+ Record Voice Note</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {agentVoiceNotes.map((vn, idx) => (
                  <div key={vn.id || `voice-${vn.accountId}-${idx}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{vn.title}</span>
                      <span className="text-blue-600 font-mono text-[10px]">{vn.accountId}</span>
                    </div>
                    <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 italic">
                      "{vn.transcription}"
                    </p>
                    <div className="text-[10px] text-slate-400 font-mono text-right">
                      {vn.durationSeconds}s duration • {vn.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 10. AI RECOVERY COPILOT */}
          {activeSection === 'ai' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>AI Recovery Negotiation Copilot</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Multi-lingual negotiation talking points (Marathi, Hindi, English), borrower psychological assessment, and OTS calculators
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl space-y-2">
                  <h4 className="font-bold text-blue-900 text-sm">Borrower Objection Handler</h4>
                  <p className="text-slate-600">
                    How to respond to "Crop delay", "Business cash crunch", or "Interest dispute" professionally while securing a concrete PTP date.
                  </p>
                  <button
                    onClick={() => {
                      if (agentAssignedAccounts.length > 0) {
                        setSelectedAccount(agentAssignedAccounts[0]);
                        setIsAIOpen(true);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                  >
                    Open Copilot Drawer
                  </button>
                </div>

                <div className="p-4 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2">
                  <h4 className="font-bold text-purple-900 text-sm">OTS &amp; Restructuring Planner</h4>
                  <p className="text-slate-600">
                    Evaluate borrower capacity to offer structured token repayments while safeguarding the bank's principal recovery.
                  </p>
                  <button
                    onClick={() => {
                      if (agentAssignedAccounts.length > 0) {
                        setSelectedAccount(agentAssignedAccounts[0]);
                        setIsAIOpen(true);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold"
                  >
                    Launch Calculator
                  </button>
                </div>

                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                  <h4 className="font-bold text-emerald-900 text-sm">Marathi &amp; Hindi Scripts</h4>
                  <p className="text-slate-600">
                    Polite yet firm vernacular recovery scripts tailored for agricultural and retail borrowers in Maharashtra territories.
                  </p>
                  <button
                    onClick={() => {
                      if (agentAssignedAccounts.length > 0) {
                        setSelectedAccount(agentAssignedAccounts[0]);
                        setIsAIOpen(true);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
                  >
                    View Vernacular Prompts
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 11. GOOGLE SHEETS LIVE SYNC - ADMIN ONLY */}
          {activeSection === 'sheets' && currentUser.role === 'admin' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm text-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-600" />
                    <span>Google Sheets Real-time Data Sync (19 Master Tabs)</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Central spreadsheets integration managed by administrators.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-slate-900 text-slate-200 rounded-2xl font-mono space-y-2">
                <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-slate-800 pb-2">
                  <span>✓ Live Sheets Sync Status</span>
                  <span>19 Tabs Active</span>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* MODALS */}
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

      {selectedAccount && isSingleCustomerModalOpen && (
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

      {selectedAccount && isAddNoteModalOpen && (
        <AddAgentNoteModal
          account={selectedAccount}
          isOpen={isAddNoteModalOpen}
          onClose={() => setIsAddNoteModalOpen(false)}
        />
      )}

      {/* Daily Recovery Receipt Modal */}
      {selectedRecoveryForReceipt && (
        <DailyRecoveryReceiptModal
          recovery={selectedRecoveryForReceipt}
          account={selectedAccount}
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
        />
      )}

      {/* Google Drive Link Modal */}
      <GoogleDriveLinkModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
      />

      {/* PTP Digest Modal */}
      <PTPDigestModal
        isOpen={isPTPDigestOpen}
        onClose={() => setIsPTPDigestOpen(false)}
        onNavigateToAccountsWithFilter={(filter) => {
          setFilterStatus(filter);
          setActiveSection('accounts');
        }}
      />

      {/* Commission Bill Modal */}
      <CommissionBillModal
        isOpen={isCommissionBillOpen}
        onClose={() => setIsCommissionBillOpen(false)}
        targetAgentId={currentUser.agentId || currentUser.id}
      />

      {/* Customer Search & Select Modal for Quick Actions */}
      <CustomerSearchSelectModal
        isOpen={isCustomerSearchOpen}
        onClose={() => setIsCustomerSearchOpen(false)}
        actionType={customerSearchAction}
        onSelectCustomer={handleCustomerSelectedFromSearch}
      />

      {/* Edit Recovery Modal */}
      {selectedRecoveryForEdit && (
        <EditRecoveryModal
          recovery={selectedRecoveryForEdit}
          isOpen={isEditRecoveryOpen}
          onClose={() => {
            setIsEditRecoveryOpen(false);
            setSelectedRecoveryForEdit(null);
          }}
        />
      )}

    </div>
  );
};
