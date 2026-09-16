import React, { useState, useMemo, useEffect } from 'react';
import {
  LayoutDashboard,
  Smartphone,
  Monitor,
  Users,
  FolderLock,
  PhoneCall,
  Calendar,
  MapPin,
  DollarSign,
  Camera,
  Mic,
  FileText,
  BarChart3,
  Percent,
  MessageSquare,
  Table,
  HardDrive,
  Settings,
  Search,
  Plus,
  Filter,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  TrendingUp,
  Clock,
  ChevronRight,
  Shield,
  Eye,
  RefreshCw,
  Trash2,
  Edit,
  Send,
  Sparkles,
  FileSpreadsheet,
  Upload,
  Layers,
  Zap,
  X,
  LogOut,
  Menu,
  Network,
  Building2,
  RotateCcw,
  Archive,
  Star,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account, User, UserRole, PaymentMode, FollowUp, PTPRecord, RecoveryRecord, FieldVisit } from '../../types';
import { formatINR } from '../../utils/watermark';
import { ScaleSupportLogo } from '../common/ScaleSupportLogo';
import { ExcelAllocationModal } from './ExcelAllocationModal';
import { downloadExactExcelTemplate, exportAccountsToExactExcel } from '../../utils/excelAccountImporter';
import { AccountTimelineDrawer } from '../common/AccountTimelineDrawer';
import { WatermarkCameraModal } from '../common/WatermarkCameraModal';
import { VoiceNoteRecorderModal } from '../common/VoiceNoteRecorderModal';
import { GoogleDriveLinkModal } from '../common/GoogleDriveLinkModal';
import { googleDriveService } from '../../utils/googleDriveService';
import { CustomerConsolidatedDetailModal } from '../common/CustomerConsolidatedDetailModal';
import { CustomerShortlistSection } from './CustomerShortlistSection';
import { PTPDigestModal } from '../common/PTPDigestModal';
import { AgentWebPortal } from '../agent/AgentWebPortal';
import { CommissionManagementSection } from './CommissionManagementSection';
import { HierarchyManagementSection } from './HierarchyManagementSection';
import { StarRating } from '../common/StarRating';
import { CloseAccountModal } from '../common/CloseAccountModal';
import {
  LogFollowUpModal,
  CreatePTPModal,
  RecordRecoveryModal,
  FieldVisitModal,
  UploadDocumentModal,
  WhatsAppTriggerModal,
  AIRecoveryDrawer,
  AddAgentNoteModal,
} from '../common/ActionModals';
import { OTSSettingsModal } from '../common/OTSSettingsModal';

export const WebPortal: React.FC = () => {
  const {
    currentUser,
    users,
    accounts,
    followups,
    ptps,
    recoveries,
    visits,
    photos,
    voiceNotes,
    documents,
    commissions,
    commissionSettings,
    updateCommissionRate,
    allocateAccount,
    allocateBulkAccounts,
    toggleUserActive,
    addUser,
    updateUser,
    changeUserPassword,
    deleteUser,
    deleteAccount,
    updateCustomerStarRating,
    closeAccount,
    reverseRecovery,
    deleteAllAccountsFromStorage,
    exportAllBackendData,
    logout,
    branches,
    zones,
    areas,
    notifications,
    getExpiredPTPPreview,
    banks,
    recoveryDepartments,
    scopedAccounts,
    scopedRecoveries,
    scopedPtps,
    scopedVisits,
    scopedCommissions,
    scopedUsers,
  } = useSRMS();

  // Dynamic unique branches & zones list strictly derived from uploaded accounts, system branches, and users
  const allUniqueBranches = Array.from(
    new Set([
      ...branches.map((b) => b.name),
      ...accounts.map((a) => a.branch).filter(Boolean),
      ...users.map((u) => u.branch).filter(Boolean),
    ])
  ).sort();

  const allUniqueZones = Array.from(
    new Set([
      ...zones.map((z) => z.name),
      ...accounts.map((a) => a.zone).filter(Boolean),
      ...users.map((u) => u.zone).filter(Boolean),
    ])
  ).sort();

  const allUniqueZonalOffices = Array.from(
    new Set([
      ...zones.map((z) => z.name),
      ...accounts.map((a) => a.zonalOffice || a.zone).filter(Boolean),
      ...users.map((u) => u.zonalOffice || u.zone).filter(Boolean),
    ])
  ).sort();

  const allUniqueRegionalOffices = Array.from(
    new Set([
      ...branches.map((b) => b.regionalOffice || b.regionName).filter(Boolean),
      ...accounts.map((a) => a.regionalOffice).filter(Boolean),
      ...users.map((u) => u.regionalOffice).filter(Boolean),
    ])
  ).sort();

  const allUniqueBanks = Array.from(
    new Set([
      ...banks.map((b) => b.name),
      ...accounts.map((a) => a.bankName || a.bank).filter(Boolean),
    ])
  ).sort();

  // Active Web Section
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Month Strings & Defaults
  const currentMonthStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  // Dashboard Hierarchy & Multi-dimension Filters
  const [dashUserFilter, setDashUserFilter] = useState<string>('ALL');
  const [dashBankFilter, setDashBankFilter] = useState<string>('ALL');
  const [dashZoneFilter, setDashZoneFilter] = useState<string>('ALL');
  const [dashRegionFilter, setDashRegionFilter] = useState<string>('ALL');
  const [dashBranchFilter, setDashBranchFilter] = useState<string>('ALL');
  const [dashMonthFilter, setDashMonthFilter] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Recovery Section Month Filter (default current month)
  const [recoveryMonthFilter, setRecoveryMonthFilter] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // OTS Settings Modal State (Admin only)
  const [isOTSSettingsOpen, setIsOTSSettingsOpen] = useState<boolean>(false);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterStarRating, setFilterStarRating] = useState<string>('ALL');
  const [ptpFilterStatus, setPtpFilterStatus] = useState<string>('ALL');
  const [selectedAgentForAllocation, setSelectedAgentForAllocation] = useState<string>('');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  // Modals state
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isWatermarkOpen, setIsWatermarkOpen] = useState(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState(false);
  const [isFollowUpOpen, setIsFollowUpOpen] = useState(false);
  const [isPTPOpen, setIsPTPOpen] = useState(false);
  const [isRecoveryOpen, setIsRecoveryOpen] = useState(false);
  const [isVisitOpen, setIsVisitOpen] = useState(false);
  const [isDocOpen, setIsDocOpen] = useState(false);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [isSingleCustomerModalOpen, setIsSingleCustomerModalOpen] = useState(false);
  const [isAddNoteModalOpen, setIsAddNoteModalOpen] = useState(false);
  const [isPTPDigestOpen, setIsPTPDigestOpen] = useState(false);

  // New User Form State (Name / Agency Name, Zonal Office, Regional Office, Bank, no branch, no target)
  const [isCreateUserOpen, setIsCreateUserOpen] = useState(false);
  const [newUserId, setNewUserId] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('1234');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [newUserName, setNewUserName] = useState(''); // Name / Agency Name
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserMobile, setNewUserMobile] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('agent');
  const [newUserBank, setNewUserBank] = useState('All Banks');
  const [newUserZonalOffice, setNewUserZonalOffice] = useState('');
  const [newUserRegionalOffice, setNewUserRegionalOffice] = useState('');

  // Recovery Reversal Modal State
  const [isReversalModalOpen, setIsReversalModalOpen] = useState(false);
  const [reversalTargetRecovery, setReversalTargetRecovery] = useState<RecoveryRecord | null>(null);
  const [reversalReasonInput, setReversalReasonInput] = useState('');
  const [isProcessingReversal, setIsProcessingReversal] = useState(false);

  // Edit User Modal State
  const [isEditUserOpen, setIsEditUserOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserMobile, setEditUserMobile] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('agent');
  const [editUserBank, setEditUserBank] = useState('All Banks');
  const [editUserAgentId, setEditUserAgentId] = useState('');
  const [editUserBranch, setEditUserBranch] = useState('');
  const [editUserZone, setEditUserZone] = useState('');
  const [editUserTarget, setEditUserTarget] = useState(300000);

  // Change Password Modal State
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<User | null>(null);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('1234');
  const [userAdminFeedback, setUserAdminFeedback] = useState<string | null>(null);
  const [createdUserCredentials, setCreatedUserCredentials] = useState<{
    name: string;
    userId: string;
    password: string;
  } | null>(null);

  // Delete User Confirmation Modal State
  const [isDeleteUserOpen, setIsDeleteUserOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Delete Customer Account Confirmation Modal State
  const [isDeleteAccountOpen, setIsDeleteAccountOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  // Close / Delete Account Modal State (Closed as per OTS / Regular Close / Deletion)
  const [isCloseAccountModalOpen, setIsCloseAccountModalOpen] = useState(false);
  const [accountToClose, setAccountToClose] = useState<Account | null>(null);

  const openCloseAccountModal = (acc: Account) => {
    setAccountToClose(acc);
    setIsCloseAccountModalOpen(true);
  };

  // Raw Sheets Explorer tab
  const [activeRawSheet, setActiveRawSheet] = useState<string>('Accounts');

  // Months list for dropdown filter
  const availableDashMonths = useMemo(() => {
    const set = new Set<string>();
    set.add(currentMonthStr);
    scopedRecoveries.forEach((r) => {
      if (r.recoveryDate && r.recoveryDate.length >= 7) {
        set.add(r.recoveryDate.slice(0, 7));
      }
    });
    return Array.from(set).sort().reverse();
  }, [scopedRecoveries, currentMonthStr]);

  // Summary Metrics (with multi-dimension filtering support for Admin Dashboard)
  const isDashFilterActive =
    dashUserFilter !== 'ALL' ||
    dashBankFilter !== 'ALL' ||
    dashZoneFilter !== 'ALL' ||
    dashRegionFilter !== 'ALL' ||
    dashBranchFilter !== 'ALL' ||
    dashMonthFilter !== currentMonthStr;

  const resetDashFilters = () => {
    setDashUserFilter('ALL');
    setDashBankFilter('ALL');
    setDashZoneFilter('ALL');
    setDashRegionFilter('ALL');
    setDashBranchFilter('ALL');
    setDashMonthFilter(currentMonthStr);
  };

  const filteredDashAccounts = scopedAccounts.filter((acc) => {
    if (dashUserFilter !== 'ALL') {
      const matchAgent =
        acc.assignedAgentId === dashUserFilter ||
        acc.assignedAgentName?.toLowerCase() === dashUserFilter.toLowerCase() ||
        acc.assignedUserId === dashUserFilter;
      if (!matchAgent) return false;
    }
    if (dashBankFilter !== 'ALL') {
      const matchBank =
        (acc.bankName && acc.bankName.toLowerCase() === dashBankFilter.toLowerCase()) ||
        (acc.bank && acc.bank.toLowerCase() === dashBankFilter.toLowerCase());
      if (!matchBank) return false;
    }
    if (dashZoneFilter !== 'ALL') {
      const matchZone =
        (acc.zone && acc.zone.toLowerCase() === dashZoneFilter.toLowerCase()) ||
        (acc.zonalOffice && acc.zonalOffice.toLowerCase() === dashZoneFilter.toLowerCase());
      if (!matchZone) return false;
    }
    if (dashRegionFilter !== 'ALL') {
      const matchRegion =
        acc.regionalOffice && acc.regionalOffice.toLowerCase() === dashRegionFilter.toLowerCase();
      if (!matchRegion) return false;
    }
    if (dashBranchFilter !== 'ALL') {
      const matchBranch =
        (acc.branch && acc.branch.toLowerCase() === dashBranchFilter.toLowerCase()) ||
        (acc.branchCode && acc.branchCode.toLowerCase() === dashBranchFilter.toLowerCase());
      if (!matchBranch) return false;
    }
    return true;
  });

  const filteredDashAccountIds = new Set(filteredDashAccounts.map((a) => a.accountId));

  const filteredDashRecoveries = scopedRecoveries.filter((r) => {
    if (r.isReversed) return false;
    if (dashMonthFilter !== 'ALL' && (!r.recoveryDate || !r.recoveryDate.startsWith(dashMonthFilter))) {
      return false;
    }
    if (!isDashFilterActive) return true;
    if (filteredDashAccountIds.has(r.accountId)) return true;
    if (dashUserFilter !== 'ALL' && (r.agentId === dashUserFilter || r.agentName === dashUserFilter)) return true;
    return false;
  });

  const filteredDashPtps = scopedPtps.filter((p) => {
    if (dashMonthFilter !== 'ALL' && (!p.ptpDate || !p.ptpDate.startsWith(dashMonthFilter))) {
      return false;
    }
    if (!isDashFilterActive) return true;
    if (filteredDashAccountIds.has(p.accountId)) return true;
    if (dashUserFilter !== 'ALL' && (p.agentId === dashUserFilter || p.agentName === dashUserFilter)) return true;
    return false;
  });

  const filteredDashVisits = scopedVisits.filter((v) => {
    if (dashMonthFilter !== 'ALL' && (!v.visitDate || !v.visitDate.startsWith(dashMonthFilter))) {
      return false;
    }
    if (!isDashFilterActive) return true;
    if (filteredDashAccountIds.has(v.accountId)) return true;
    if (dashUserFilter !== 'ALL' && (v.agentId === dashUserFilter || v.agentName === dashUserFilter)) return true;
    return false;
  });

  const filteredDashCommissions = scopedCommissions.filter((c) => {
    if (dashMonthFilter !== 'ALL' && (!c.date || !c.date.startsWith(dashMonthFilter))) {
      return false;
    }
    return true;
  });

  const totalRecoverySum = filteredDashRecoveries.reduce((sum, r) => sum + r.amount, 0);
  const totalCommissionSum = filteredDashCommissions.reduce((sum, r) => sum + r.commissionAmount, 0);
  const totalOverdueSum = filteredDashAccounts.reduce((sum, a) => sum + a.overdueAmount, 0);
  const totalOutstandingSum = filteredDashAccounts.reduce((sum, a) => sum + a.outstandingAmount, 0);
  const activeAgents = scopedUsers.filter((u) => {
    if (u.role !== 'agent' || !u.active) return false;
    if (dashUserFilter !== 'ALL') {
      return u.agentId === dashUserFilter || u.id === dashUserFilter || u.name === dashUserFilter;
    }
    if (dashZoneFilter !== 'ALL') {
      return (
        (u.zonalOffice && u.zonalOffice.toLowerCase() === dashZoneFilter.toLowerCase()) ||
        (u.zone && u.zone.toLowerCase() === dashZoneFilter.toLowerCase())
      );
    }
    if (dashRegionFilter !== 'ALL') {
      return u.regionalOffice && u.regionalOffice.toLowerCase() === dashRegionFilter.toLowerCase();
    }
    if (dashBranchFilter !== 'ALL') {
      return u.branch && u.branch.toLowerCase() === dashBranchFilter.toLowerCase();
    }
    return true;
  });
  const ptpPreview = getExpiredPTPPreview('2026-08-23');

  // Filtered Accounts
  const filteredAccounts = scopedAccounts.filter((acc) => {
    const matchesSearch =
      acc.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.accountId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      acc.mobile.includes(searchTerm) ||
      acc.assignedAgentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (acc.zone && acc.zone.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (acc.branch && acc.branch.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesZone = filterZone === 'ALL' || acc.zone === filterZone;
    const matchesBranch = filterBranch === 'ALL' || acc.branch === filterBranch;
    const matchesStatus = filterStatus === 'ALL' || acc.accountStatus === filterStatus;
    const matchesStarRating =
      filterStarRating === 'ALL' ||
      (filterStarRating === 'PRIME' && (acc.isPrimeCustomer || (acc.customerStarRating || 0) >= 4)) ||
      (filterStarRating === '0' && (!acc.customerStarRating || acc.customerStarRating === 0)) ||
      (acc.customerStarRating?.toString() === filterStarRating);

    return matchesSearch && matchesZone && matchesBranch && matchesStatus && matchesStarRating;
  });

  const handleSelectAll = () => {
    if (selectedAccountIds.length === filteredAccounts.length) {
      setSelectedAccountIds([]);
    } else {
      setSelectedAccountIds(filteredAccounts.map((a) => a.accountId));
    }
  };

  const handleToggleSelect = (id: string) => {
    if (selectedAccountIds.includes(id)) {
      setSelectedAccountIds(selectedAccountIds.filter((x) => x !== id));
    } else {
      setSelectedAccountIds([...selectedAccountIds, id]);
    }
  };

  const handleBulkAllocate = () => {
    if (selectedAccountIds.length === 0) {
      alert('Please select accounts to allocate.');
      return;
    }
    const agent = users.find((u) => (u.agentId && u.agentId === selectedAgentForAllocation) || u.id === selectedAgentForAllocation) || users[0];
    if (!agent) {
      alert('No user found to allocate accounts to.');
      return;
    }

    allocateBulkAccounts(selectedAccountIds, agent.id, agent.name, agent.agentId || 'RA-0045');
    setSelectedAccountIds([]);
    alert(`Successfully allocated ${selectedAccountIds.length} accounts to ${agent.name}!`);
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedAgentId = newUserId.trim() || (newUserRole === 'agent' ? `RA-${Math.floor(1000 + Math.random() * 9000)}` : undefined);
    const generatedPassword = newUserPassword.trim() || 'Agent@2026';
    addUser({
      name: newUserName,
      agencyName: newUserName,
      email: newUserEmail,
      mobile: newUserMobile,
      role: newUserRole,
      bank: newUserBank === 'All Banks' ? undefined : newUserBank,
      branch: '',
      area: '',
      zone: newUserZonalOffice || undefined,
      zonalOffice: newUserZonalOffice || undefined,
      regionalOffice: newUserRegionalOffice || undefined,
      agentId: assignedAgentId,
      password: generatedPassword,
    });
    // Show credentials modal so admin can copy & share with new user
    setCreatedUserCredentials({
      name: newUserName,
      userId: assignedAgentId || 'Admin/Manager',
      password: generatedPassword,
    });
    setIsCreateUserOpen(false);
    setNewUserId('');
    setNewUserPassword('');
    setNewUserPin('');
    setNewUserName('');
    setNewUserEmail('');
    setNewUserMobile('');
    setNewUserBank('All Banks');
  };

  const handleConfirmReversal = async () => {
    if (!reversalTargetRecovery) return;
    setIsProcessingReversal(true);
    try {
      await reverseRecovery(
        reversalTargetRecovery.id,
        reversalReasonInput.trim() || 'Reversed per administrator request'
      );
      setIsReversalModalOpen(false);
      setReversalTargetRecovery(null);
      setReversalReasonInput('');
      setUserAdminFeedback(`Recovery #${reversalTargetRecovery.receiptNumber} successfully reversed.`);
      setTimeout(() => setUserAdminFeedback(null), 5000);
    } catch (err) {
      alert(`Failed to reverse recovery: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsProcessingReversal(false);
    }
  };

  const openEditUserModal = (u: User) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserMobile(u.mobile || '');
    setEditUserRole(u.role);
    setEditUserBank(u.bank || 'All Banks');
    setEditUserAgentId(u.agentId || '');
    setEditUserBranch(u.branch || '');
    setEditUserZone(u.zone || '');
    setEditUserTarget(u.monthlyTarget || 300000);
    setIsEditUserOpen(true);
  };

  const handleEditUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    updateUser(editingUser.id, {
      name: editUserName,
      email: editUserEmail,
      mobile: editUserMobile,
      role: editUserRole,
      bank: editUserBank === 'All Banks' ? undefined : editUserBank,
      agentId: editUserAgentId.trim() || undefined,
      branch: editUserBranch,
      zone: editUserZone,
      monthlyTarget: editUserRole === 'agent' ? editUserTarget : undefined,
    });
    setIsEditUserOpen(false);
    setUserAdminFeedback(`User ${editUserName} updated successfully.`);
    setTimeout(() => setUserAdminFeedback(null), 5000);
  };

  const openChangePasswordModal = (u: User) => {
    setPasswordTargetUser(u);
    setNewPasswordInput('');
    setNewPinInput('');
    setIsChangePasswordOpen(true);
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordTargetUser) return;
    const pwd = newPasswordInput.trim();
    if (!pwd) {
      alert('Please enter a valid password.');
      return;
    }
    changeUserPassword(passwordTargetUser.id, pwd);
    setIsChangePasswordOpen(false);
    setUserAdminFeedback(`Password successfully updated for user "${passwordTargetUser.name}" (ID: ${passwordTargetUser.agentId || passwordTargetUser.id}). Previous sessions have been revoked.`);
    setTimeout(() => setUserAdminFeedback(null), 6000);
  };

  const openDeleteUserModal = (u: User) => {
    setUserToDelete(u);
    setIsDeleteUserOpen(true);
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeletingUser(true);
    try {
      const res = await deleteUser(userToDelete.id);
      setIsDeleteUserOpen(false);
      setUserAdminFeedback(res.message);
      setUserToDelete(null);
      setTimeout(() => setUserAdminFeedback(null), 7000);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete user.');
    } finally {
      setIsDeletingUser(false);
    }
  };

  const openDeleteAccountModal = (acc: Account) => {
    setAccountToDelete(acc);
    setIsDeleteAccountOpen(true);
  };

  const handleConfirmDeleteAccount = () => {
    if (!accountToDelete) return;
    setIsDeletingAccount(true);
    try {
      deleteAccount(accountToDelete.accountId);
      setIsDeleteAccountOpen(false);
      setUserAdminFeedback(`Customer account "${accountToDelete.customerName}" (${accountToDelete.accountId}) was deleted.`);
      setAccountToDelete(null);
      if (selectedAccount?.accountId === accountToDelete.accountId) {
        setIsSingleCustomerModalOpen(false);
        setSelectedAccount(null);
      }
      setTimeout(() => setUserAdminFeedback(null), 6000);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete customer account.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const [isDeleteAllAccountsModalOpen, setIsDeleteAllAccountsModalOpen] = useState(false);
  const [isDeletingAllAccounts, setIsDeletingAllAccounts] = useState(false);

  const handleConfirmDeleteAllAccounts = async () => {
    setIsDeletingAllAccounts(true);
    try {
      const res = await deleteAllAccountsFromStorage();
      setIsDeleteAllAccountsModalOpen(false);
      setUserAdminFeedback(res.message);
      setSelectedAccount(null);
      setIsSingleCustomerModalOpen(false);
      setTimeout(() => setUserAdminFeedback(null), 8000);
    } catch (err: any) {
      alert(err?.message || 'Failed to delete all account data from storage.');
    } finally {
      setIsDeletingAllAccounts(false);
    }
  };

  const openAccountModal = (acc: Account, type: string) => {
    setSelectedAccount(acc);
    if (type === 'timeline') setIsTimelineOpen(true);
    else if (type === 'singleView') setIsSingleCustomerModalOpen(true);
    else if (type === 'note') setIsAddNoteModalOpen(true);
    else if (type === 'watermark') setIsWatermarkOpen(true);
    else if (type === 'voice') setIsVoiceOpen(true);
    else if (type === 'followup') setIsFollowUpOpen(true);
    else if (type === 'ptp') setIsPTPOpen(true);
    else if (type === 'recovery') setIsRecoveryOpen(true);
    else if (type === 'visit') setIsVisitOpen(true);
    else if (type === 'doc') setIsDocOpen(true);
    else if (type === 'whatsapp') setIsWhatsAppOpen(true);
    else if (type === 'ai') setIsAIOpen(true);
  };

  // If current logged-in user is an Agent, render the AgentWebPortal directly for their web workspace
  if (currentUser.role === 'agent') {
    return <AgentWebPortal />;
  }

  // If Admin/Manager switched to view Agent Desk
  if (activeSection === 'agent-desk') {
    return (
      <div className="flex flex-col h-[calc(100vh-53px)] w-full">
        <div className="bg-slate-900 text-white px-6 py-2 flex items-center justify-between text-xs border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold border border-blue-500/30">
              Admin Preview
            </span>
            <span>You are viewing the <b>Agent Web Console</b> workspace.</span>
          </div>
          <button
            onClick={() => setActiveSection('dashboard')}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-semibold border border-slate-700 transition cursor-pointer"
          >
            ← Back to Management Portal
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <AgentWebPortal />
        </div>
      </div>
    );
  }

  const renderNavContent = () => (
    <>
      <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col gap-2">
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
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            {currentUser.role} Workspace
          </span>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
            Live Core
          </span>
        </div>
      </div>

      {/* Sidebar Nav Items */}
      <nav className="flex-1 py-3 overflow-y-auto">
        <div className="px-5 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Operations
        </div>

        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'shortlist', label: 'Shortlist Customers', icon: Filter, count: scopedAccounts.length },
          { id: 'accounts', label: 'Loan Accounts', icon: FolderLock, count: scopedAccounts.length },
          { id: 'allocation', label: 'Account Allocation', icon: Users },
          { id: 'followups', label: 'Follow-up Logs', icon: PhoneCall, count: followups.length },
          { id: 'ptp', label: 'PTP Commitments', icon: Calendar, count: scopedPtps.length },
          { id: 'visits', label: 'Field Visits', icon: MapPin, count: scopedVisits.length },
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
              className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors cursor-pointer text-left text-sm ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500 font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-5 mt-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Hierarchy &amp; Governance
        </div>

        {[
          { id: 'hierarchy', label: 'Hierarchy & Branches', icon: Network, count: branches.length },
          { id: 'commission', label: 'Commission Engine', icon: Percent },
          { id: 'users', label: 'Users & Agents (RBAC)', icon: Users, count: scopedUsers.length },
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
              className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors cursor-pointer text-left text-sm ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500 font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {item.count}
                </span>
              )}
            </button>
          );
        })}

        <div className="px-5 mt-4 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Financials &amp; Media
        </div>

        {[
          { id: 'recovery', label: 'Recovery Logs', icon: DollarSign, count: scopedRecoveries.length },
          { id: 'photos', label: 'Geo-Tagged Photos', icon: Camera, count: photos.length },
          { id: 'voice', label: 'Voice Notes Library', icon: Mic, count: voiceNotes.length },
          { id: 'drive', label: 'Google Drive Explorer', icon: HardDrive },
          { id: 'reports', label: 'Executive Reports', icon: BarChart3 },
          { id: 'sheets', label: 'Google Sheets (19 Tabs)', icon: Table },
          { id: 'settings', label: 'System Settings', icon: Settings },
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
              className={`w-full flex items-center justify-between px-5 py-2.5 transition-colors cursor-pointer text-left text-sm ${
                isActive
                  ? 'bg-blue-600/10 text-blue-400 border-r-4 border-blue-500 font-medium'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <div className="flex items-center space-x-3">
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </div>
              {item.count !== undefined && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${
                    isActive ? 'bg-blue-600/30 text-blue-300' : 'bg-slate-800 text-slate-400'
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
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center border border-slate-600 font-bold text-white text-xs shrink-0">
            {currentUser.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-white truncate">{currentUser.name}</p>
            <p className="text-[11px] text-slate-400 capitalize truncate">{currentUser.role} Account</p>
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

      {/* Desktop Sidebar Navigation */}
      <aside className="hidden lg:flex w-64 bg-[#0f172a] text-slate-300 flex-col shrink-0 border-r border-slate-800 h-full">
        {renderNavContent()}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 w-full max-w-full overflow-hidden bg-[#f8fafc]">
        {/* Top Header */}
        <header className="min-h-14 sm:h-16 bg-white border-b border-slate-200 flex flex-wrap items-center justify-between px-3 sm:px-6 py-2 shrink-0 gap-2 w-full max-w-full">
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-sm sm:text-base md:text-lg font-bold text-slate-800 capitalize truncate">
              {activeSection.replace('-', ' ')}
            </h2>
            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] sm:text-xs font-semibold rounded-md flex items-center gap-1 shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="hidden xs:inline">Live Status</span>
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-slate-100 border-none rounded-full text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-blue-500 w-32 xs:w-44 sm:w-60 focus:outline-none"
              />
              <span className="absolute left-2.5 top-2 opacity-40 text-xs sm:text-sm">🔍</span>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              {/* PTP Digest Notification & Batch Button */}
              <button
                onClick={() => setIsPTPDigestOpen(true)}
                className={`px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-xs transition cursor-pointer ${
                  ptpPreview.expiredCount > 0
                    ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                }`}
                title="Run PTP Digest & Batch Sync Expired Commitments to Google Sheets"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                <span className="hidden sm:inline">PTP Digest</span>
                {ptpPreview.expiredCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-600 text-white text-[9px] sm:text-[10px] font-black rounded-full ml-0.5 leading-none animate-pulse">
                    {ptpPreview.expiredCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => exportAllBackendData()}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-xs transition cursor-pointer border border-slate-700"
                title="Download complete backend database (Accounts, Recoveries, PTPs, Visits, Users, Logs, Remarks) into multi-sheet Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden lg:inline">Export Backend (.xlsx)</span>
                <span className="lg:hidden">Export</span>
              </button>

              {currentUser.role === 'admin' && (
                <button
                  onClick={() => setIsOTSSettingsOpen(true)}
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-xs transition cursor-pointer"
                  title="Admin OTS Settings: Edit Bank-wise Last Dates and Scheme Calculation Slabs"
                >
                  <Percent className="w-3.5 h-3.5 text-purple-200" />
                  <span className="hidden md:inline">OTS Settings</span>
                  <span className="md:hidden">OTS</span>
                </button>
              )}

              <button
                onClick={() => setIsExcelModalOpen(true)}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-[11px] sm:text-xs font-bold flex items-center gap-1 sm:gap-1.5 shadow-xs transition cursor-pointer"
                title="Upload Excel spreadsheet to allocate accounts to agents"
              >
                <Upload className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Upload Excel</span>
              </button>

              <button
                onClick={() => setIsAIOpen(true)}
                className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 border border-blue-200 transition shadow-xs cursor-pointer"
                title="AI Recovery Strategy"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">AI Strategy</span>
              </button>
            </div>
          </div>
        </header>

        {/* Scrollable Section Content */}
        <div className="p-3 sm:p-6 lg:p-8 flex-1 overflow-y-auto flex flex-col gap-6 w-full max-w-full">
          {/* 1. OVERVIEW DASHBOARD */}
          {activeSection === 'dashboard' && (
            <div className="space-y-6">
              {/* Hierarchy & Multi-Dimension Filter Bar for Admin */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Executive Portfolio Dimensions
                    </span>
                    {isDashFilterActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 animate-in fade-in">
                        Filtered View Active ({filteredDashAccounts.length} accounts)
                      </span>
                    )}
                  </div>
                  {isDashFilterActive && (
                    <button
                      onClick={resetDashFilters}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-700 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset All Filters</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
                  {/* Agent Wise */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Agent / User Wise</label>
                    <select
                      value={dashUserFilter}
                      onChange={(e) => setDashUserFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ALL">All Agents / Users ({scopedUsers.length})</option>
                      {scopedUsers.map((u) => (
                        <option key={`dash-u-${u.id}`} value={u.agentId || u.id}>
                          {u.name} {u.agentId ? `(${u.agentId})` : `(${u.role})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Bank Wise */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Wise</label>
                    <select
                      value={dashBankFilter}
                      onChange={(e) => setDashBankFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ALL">All Banks ({allUniqueBanks.length})</option>
                      {allUniqueBanks.map((b) => (
                        <option key={`dash-bank-${b}`} value={b}>
                          {b}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Zone Wise */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Zonal Office Wise</label>
                    <select
                      value={dashZoneFilter}
                      onChange={(e) => setDashZoneFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ALL">All Zonal Offices ({allUniqueZonalOffices.length})</option>
                      {allUniqueZonalOffices.map((z) => (
                        <option key={`dash-zone-${z}`} value={z}>
                          {z}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Region Wise */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Regional Office Wise</label>
                    <select
                      value={dashRegionFilter}
                      onChange={(e) => setDashRegionFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ALL">All Regions ({allUniqueRegionalOffices.length})</option>
                      {allUniqueRegionalOffices.map((r) => (
                        <option key={`dash-reg-${r}`} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Branch Wise */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Branch Wise</label>
                    <select
                      value={dashBranchFilter}
                      onChange={(e) => setDashBranchFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value="ALL">All Branches ({allUniqueBranches.length})</option>
                      {allUniqueBranches.map((br) => (
                        <option key={`dash-br-${br}`} value={br}>
                          {br}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Settlement Month Wise */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center justify-between">
                      <span>Settlement Month</span>
                      <span className="text-[10px] text-blue-600 font-bold">Default: Current</span>
                    </label>
                    <select
                      value={dashMonthFilter}
                      onChange={(e) => setDashMonthFilter(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                      <option value={currentMonthStr}>Current Month ({currentMonthStr})</option>
                      <option value="ALL">All Recorded Months</option>
                      {availableDashMonths
                        .filter((m) => m !== currentMonthStr)
                        .map((m) => (
                          <option key={`dash-m-${m}`} value={m}>
                            {m}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* 4 Professional KPI Metric Cards */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-500 text-sm font-medium">
                      {dashMonthFilter === 'ALL' ? 'Total Recovery (All Time)' : `Recovery (${dashMonthFilter})`}
                    </p>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {dashMonthFilter === currentMonthStr ? 'Current Month' : dashMonthFilter}
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">{formatINR(totalRecoverySum)}</h3>
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    {filteredDashRecoveries.length} verified recoveries logged
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-slate-500 text-sm font-medium">
                      {isDashFilterActive ? 'Filtered PTP' : 'Total PTP (Current)'}
                    </p>
                    <button
                      onClick={() => setIsPTPDigestOpen(true)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 flex items-center gap-1 transition cursor-pointer"
                      title="Run PTP Digest"
                    >
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" />
                      <span>Digest</span>
                    </button>
                  </div>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {filteredDashPtps.length} Commitments
                  </h3>
                  <div className="flex items-center justify-between mt-2 text-xs">
                    <span className="text-blue-600 font-medium">
                      {filteredDashPtps.filter((p) => p.status === 'Achieved').length} Achieved • {filteredDashPtps.filter((p) => p.status === 'Pending').length} Pending
                    </span>
                    {ptpPreview.expiredCount > 0 && (
                      <span className="text-red-600 font-bold bg-red-50 px-1.5 py-0.5 rounded text-[10px] border border-red-200 animate-pulse">
                        {ptpPreview.expiredCount} Expired
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium mb-1">
                    {isDashFilterActive ? 'Filtered Overdue' : 'Overdue Portfolio'}
                  </p>
                  <h3 className="text-2xl font-bold text-red-600">{formatINR(totalOverdueSum)}</h3>
                  <p className="text-xs text-red-500 mt-2 font-medium">
                    Across {filteredDashAccounts.length} loan accounts
                  </p>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <p className="text-slate-500 text-sm font-medium mb-1">Field Agents Active</p>
                  <h3 className="text-2xl font-bold text-slate-900">
                    {activeAgents.length} / {scopedUsers.filter((u) => u.role === 'agent').length}
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 font-medium">{filteredDashVisits.length} Geo-visits logged</p>
                </div>
              </section>

              {/* Grid: High-Value Allocations & Geo-Verification / Commission */}
              <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                {/* Left 8 cols: Recent Allocations & Agent Performance */}
                <div className="lg:col-span-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
                  <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                    <h4 className="font-bold text-slate-800">Recent High-Value Loan Accounts</h4>
                    <button
                      onClick={() => setActiveSection('accounts')}
                      className="text-sm text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                    >
                      View All ({accounts.length})
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 text-slate-500 text-xs uppercase sticky top-0 border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-3 font-semibold">Account ID</th>
                          <th className="px-6 py-3 font-semibold">Customer</th>
                          <th className="px-6 py-3 font-semibold">Overdue</th>
                          <th className="px-6 py-3 font-semibold">Agent</th>
                          <th className="px-6 py-3 font-semibold">Status</th>
                          <th className="px-6 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm divide-y divide-slate-100 text-slate-700">
                        {accounts.slice(0, 5).map((acc, idx) => (
                          <tr key={acc.id || acc.accountId || `acc-dash-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-mono text-xs font-semibold text-blue-600">
                              {acc.accountId}
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900">
                              {acc.customerName}
                              <span className="block text-xs text-slate-400 font-normal">{acc.loanType}</span>
                            </td>
                            <td className="px-6 py-4 text-red-600 font-semibold font-mono">
                              {formatINR(acc.overdueAmount)}
                            </td>
                            <td className="px-6 py-4 text-slate-700 text-xs">
                              {acc.assignedAgentName}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded-md text-xs font-medium ${
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
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => openAccountModal(acc, 'timeline')}
                                className="text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                              >
                                View Timeline →
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Agent Target Progress Bars */}
                  <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-3">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Field Agent Target Achievement ({new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })})
                    </h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {activeAgents.slice(0, 3).map((agent, idx) => {
                        const agentRecs = recoveries.filter(
                          (r) => r.agentId === agent.agentId || r.agentId === agent.id
                        );
                        const recovered = agentRecs.reduce((sum, r) => sum + r.amount, 0);
                        const target = agent.monthlyTarget || 300000;
                        const pct = Math.min(100, Math.round((recovered / target) * 100));

                        return (
                          <div key={agent.id || agent.agentId || `ag-target-${idx}`} className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-1.5">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-900">{agent.name}</span>
                              <span className="text-blue-600 font-semibold">{pct}%</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className="bg-blue-600 h-full rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[11px] text-slate-500">
                              <span>{formatINR(recovered)}</span>
                              <span>Target: {formatINR(target)}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Right 4 cols: Geo-Tagged Verification & Commission Payouts */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Geo-Tagged Verification Feed */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-bold text-slate-800">Geo-Tagged Verification</h4>
                      <button
                        onClick={() => setActiveSection('photos')}
                        className="text-xs text-blue-600 font-semibold hover:underline"
                      >
                        All Photos ({photos.length})
                      </button>
                    </div>

                    <div className="space-y-4 overflow-y-auto max-h-80">
                      {photos.slice(0, 2).map((ph, idx) => (
                        <div
                          key={ph.id || `photo-preview-${idx}`}
                          className={`flex gap-3 pl-3 ${
                            idx === 0 ? 'border-l-2 border-blue-500' : 'border-l-2 border-slate-200 opacity-80'
                          }`}
                        >
                          <div className="flex-1 space-y-1">
                            <p className="text-xs font-bold text-slate-900">
                              Visit Verified: {ph.accountId}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Agent: {ph.agentId} • {ph.time}
                            </p>
                            <div className="mt-2 w-full h-24 bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 relative overflow-hidden">
                              <img
                                src={ph.dataUrl}
                                alt="Geo Stamp"
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-2">
                                <span className="text-[9px] text-white font-mono font-medium">
                                  Lat: {typeof ph.latitude === 'number' ? ph.latitude.toFixed(4) : '0.0000'} | Lon: {typeof ph.longitude === 'number' ? ph.longitude.toFixed(4) : '0.0000'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Commission Payouts Card - Deep Blue Rich Accent */}
                  <div className="bg-blue-900 rounded-xl p-5 text-white flex flex-col justify-between relative overflow-hidden shadow-sm">
                    <div className="relative z-10">
                      <h4 className="font-bold text-sm mb-1 text-blue-100">Commission Payouts (10%)</h4>
                      <p className="text-2xl font-bold">{formatINR(totalCommissionSum)}</p>
                      <p className="text-xs text-blue-200 mt-1">
                        Projected for {new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })} cycle • {commissionSettings.defaultRate}% Base
                      </p>
                    </div>
                    <div className="mt-5 flex gap-2 relative z-10">
                      <button
                        onClick={() => setActiveSection('commission')}
                        className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-xs font-bold text-white transition shadow-sm"
                      >
                        Approve All
                      </button>
                      <button
                        onClick={() => setActiveSection('reports')}
                        className="flex-1 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-bold text-white transition"
                      >
                        Reports
                      </button>
                    </div>
                    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-blue-500/20 rounded-full pointer-events-none" />
                  </div>
                </div>
              </section>
            </div>
          )}

          {/* 2. CUSTOMER ACCOUNTS MASTER TABLE */}
          {activeSection === 'accounts' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3 flex-1 min-w-[280px]">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search by customer name, account ID, mobile, agent..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">All Account Statuses</option>
                    <option value="Allocated">Allocated</option>
                    <option value="PTP Pending">PTP Pending</option>
                    <option value="Field Visit Pending">Field Visit Pending</option>
                    <option value="Recovered">Recovered</option>
                    <option value="Legal Action">Legal Action</option>
                    <option value="Closed as per OTS">Closed as per OTS</option>
                    <option value="Regular Close">Regular Close</option>
                    <option value="Settled">Settled</option>
                  </select>

                  <select
                    value={filterStarRating}
                    onChange={(e) => setFilterStarRating(e.target.value)}
                    className="bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer font-medium"
                    title="Filter customers by Star Rating classification & track Prime customers"
                  >
                    <option value="ALL">⭐ All Customer Ratings</option>
                    <option value="PRIME">⭐ Prime Customers Only (4-5 Stars)</option>
                    <option value="5">⭐⭐⭐⭐⭐ 5 Stars Only</option>
                    <option value="4">⭐⭐⭐⭐ 4 Stars Only</option>
                    <option value="3">⭐⭐⭐ 3 Stars Only</option>
                    <option value="2">⭐⭐ 2 Stars Only</option>
                    <option value="1">⭐ 1 Star Only</option>
                    <option value="0">0 Stars / Unrated</option>
                  </select>

                  <select
                    value={filterZone}
                    onChange={(e) => setFilterZone(e.target.value)}
                    className="bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">All Zones ({allUniqueZones.length})</option>
                    {allUniqueZones.map((z, idx) => (
                      <option key={`zone-opt-${z || idx}`} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                    className="bg-slate-50 text-slate-700 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="ALL">All Branches ({allUniqueBranches.length})</option>
                    {allUniqueBranches.map((b, idx) => (
                      <option key={`branch-opt-${b || idx}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-slate-500 text-xs font-medium mr-2">
                    Showing <span className="text-slate-900 font-bold">{filteredAccounts.length}</span> of{' '}
                    {accounts.length} accounts
                  </span>

                  <button
                    onClick={() => exportAllBackendData()}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer border border-slate-700"
                    title="Export complete backend database (Accounts, Recoveries, PTPs, Visits, Users, Logs) to Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export All Backend (.xlsx)</span>
                  </button>

                  <button
                    onClick={() => setIsExcelModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                    title="Upload Excel or CSV to allocate accounts to agents"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Excel / Bulk Allocate</span>
                  </button>

                  <button
                    onClick={downloadExactExcelTemplate}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
                    title="Download Excel template matching bank format with AGENT_ID"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Template</span>
                  </button>

                  <button
                    onClick={() => setIsDeleteAllAccountsModalOpen(true)}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-2xs"
                    title="Permanently delete all accounts from storage (only accounts are cleared)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    <span>Delete All Account Storage</span>
                  </button>
                </div>
              </div>

              {/* Master Accounts Table */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase tracking-wider">
                      <tr>
                        <th className="p-3.5">Account ID</th>
                        <th className="p-3.5">Customer Details</th>
                        <th className="p-3.5">Product</th>
                        <th className="p-3.5">Overdue / Total</th>
                        <th className="p-3.5">PTP Count / Risk</th>
                        <th className="p-3.5">Assigned Agent</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredAccounts.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-10 text-center text-slate-500">
                            <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                              <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                                <Users className="w-6 h-6" />
                              </div>
                              <p className="font-semibold text-slate-800 text-sm">No Customer Accounts in Database</p>
                              <p className="text-xs text-slate-500 leading-relaxed">
                                All demo accounts have been permanently removed. Upload your Excel master recovery sheet or sync with Google Sheets to import active borrower accounts.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        filteredAccounts.map((acc, idx) => (
                        <tr key={acc.id || acc.accountId || `acc-master-${idx}`} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3.5 font-mono font-bold text-blue-600">
                            <div>{acc.accountId}</div>
                            {acc.isMultipleAccount && (
                              <button
                                onClick={() => openAccountModal(acc, 'singleView')}
                                className="mt-1 inline-flex items-center gap-1 text-[10px] font-extrabold bg-purple-100 hover:bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300 transition cursor-pointer"
                                title="Click to open Consolidated Single Customer View"
                              >
                                <Layers className="w-2.5 h-2.5" />
                                <span>Multi-Acc ({acc.multipleAccountsCount || 2})</span>
                              </button>
                            )}
                          </td>
                          <td className="p-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{acc.customerName}</span>
                              <button
                                onClick={() => openAccountModal(acc, 'singleView')}
                                className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-1.5 py-0.5 rounded border border-indigo-200 transition cursor-pointer"
                                title="Open Single Customer View with all linked loans & notes"
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
                            <div className="text-slate-500 text-[11px] font-mono mt-0.5">{acc.mobile}</div>
                            <div className="text-slate-400 text-[10px] truncate max-w-[220px]">{acc.address}</div>
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                              {acc.branch && (
                                <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-medium">
                                  {acc.branch}
                                </span>
                              )}
                              {acc.zone && (
                                <span className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-100 px-1.5 py-0.5 rounded font-semibold">
                                  {acc.zone}
                                </span>
                              )}
                            </div>
                            {acc.agentNotesHistory && acc.agentNotesHistory.length > 0 && (
                              <div className="mt-1 flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded max-w-[240px] truncate border border-indigo-100">
                                <MessageSquare className="w-2.5 h-2.5 shrink-0" />
                                <span className="font-medium truncate">Note: {acc.agentNotesHistory[acc.agentNotesHistory.length - 1].note}</span>
                              </div>
                            )}
                          </td>
                          <td className="p-3.5">
                            <span className="text-slate-700 font-medium">{acc.loanType}</span>
                            {acc.npaDate && (
                              <div className="text-[10px] text-slate-400 font-mono">NPA: {acc.npaDate}</div>
                            )}
                          </td>
                          <td className="p-3.5 font-mono">
                            <div className="text-red-600 font-bold">{formatINR(acc.overdueAmount)}</div>
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
                            <div className="text-[10px] text-slate-500 mt-0.5">{acc.customerCategory}</div>
                          </td>
                          <td className="p-3.5">
                            <div className="font-semibold text-slate-800">{acc.assignedAgentName}</div>
                            <div className="text-[10px] font-mono text-blue-600">{acc.assignedAgentId}</div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${
                                acc.accountStatus === 'Closed as per OTS'
                                  ? 'bg-purple-100 text-purple-800 border-purple-300 shadow-xs'
                                  : acc.accountStatus === 'Regular Close'
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300 shadow-xs'
                                  : acc.accountStatus === 'Recovered'
                                  ? 'bg-green-100 text-green-700 border-green-200'
                                  : acc.accountStatus === 'PTP Pending'
                                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                                  : acc.accountStatus === 'Field Visit Pending'
                                  ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                                  : 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {acc.accountStatus}
                            </span>
                          </td>
                          <td className="p-3.5 text-right space-x-1 whitespace-nowrap">
                            <button
                              onClick={() => openAccountModal(acc, 'singleView')}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 transition cursor-pointer"
                              title="Consolidated Customer View"
                            >
                              <Layers className="w-3.5 h-3.5 inline mr-0.5" />
                              View
                            </button>
                            <button
                              onClick={() => openAccountModal(acc, 'note')}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition cursor-pointer"
                              title="Add Agent Note"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountModal(acc, 'timeline')}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-200 transition cursor-pointer"
                              title="View Account Timeline"
                            >
                              Timeline
                            </button>
                            <button
                              onClick={() => openAccountModal(acc, 'watermark')}
                              className="p-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg border border-sky-200 transition cursor-pointer"
                              title="Geo-Tagged Watermark Camera"
                            >
                              <Camera className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountModal(acc, 'voice')}
                              className="p-1.5 bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg border border-pink-200 transition cursor-pointer"
                              title="Voice Note"
                            >
                              <Mic className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => openAccountModal(acc, 'recovery')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                              title="Collect Payment"
                            >
                              + ₹
                            </button>
                            <button
                              onClick={() => openAccountModal(acc, 'ai')}
                              className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 transition cursor-pointer"
                              title="AI Strategy"
                            >
                              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                            </button>
                            <button
                              onClick={() => openCloseAccountModal(acc)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition cursor-pointer"
                              title="Close Account (Closed as per OTS / Regular Close / Delete)"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </button>
                            {currentUser.role === 'admin' && (
                              <button
                                onClick={() => openDeleteAccountModal(acc)}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg border border-rose-200 transition cursor-pointer"
                                title="Permanent Delete Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </td>
                        </tr>
                      )))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. ACCOUNT ALLOCATION (SINGLE & BULK & EXCEL) */}
          {activeSection === 'allocation' && (
            <div className="space-y-6">
              {/* Excel Upload Hero Card with Standard Format columns */}
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="bg-white/95 px-2.5 py-1 rounded-lg">
                        <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
                      </div>
                      <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                        Excel Account Allocation Center
                      </span>
                    </div>
                    <h3 className="text-xl font-black text-white">
                      Import Bank Excel Allocation Sheets
                    </h3>
                    <p className="text-xs text-slate-300 max-w-2xl">
                      Upload accounts using your standard bank format (<code className="font-mono text-blue-200">BRANCH_COD, BRANCH_NAME, ACCT_NO, NAME, PROD_DESC, FACILITY, LIMIT_SANCTI, LOAN_B, NPA_DT, CONTACT NO., CUSTOMER, ADDRESS</code>) and distribute directly to field recovery agents.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={downloadExactExcelTemplate}
                      className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-700 text-blue-300 rounded-xl text-xs font-bold border border-slate-700 flex items-center gap-2 transition cursor-pointer shadow-sm"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Sample Excel Template</span>
                    </button>

                    <button
                      onClick={() => setIsExcelModalOpen(true)}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black flex items-center gap-2 transition shadow-md cursor-pointer"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Upload &amp; Allocate Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>

                {/* Column schema pills */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-semibold mr-1">Supported Format:</span>
                  {[
                    'BRANCH_COD',
                    'BRANCH_NAME',
                    'ACCT_NO',
                    'NAME',
                    'PROD_DESC',
                    'FACILITY',
                    'LIMIT_SANCTI',
                    'LOAN_B',
                    'NPA_DT',
                    'CONTACT NO.',
                    'CUSTOMER',
                    'ADDRESS',
                  ].map((col, idx) => (
                    <span
                      key={`tmpl-col-${col}-${idx}`}
                      className="px-2 py-0.5 bg-slate-800/90 text-blue-200 font-mono text-[10px] font-bold rounded border border-slate-700/80"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Bulk Allocation Action Box */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">
                      Bulk Account Allocation &amp; Reassignment
                    </h3>
                    <p className="text-xs text-slate-500">
                      Select multiple overdue accounts from the list below and assign directly to field recovery agents
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={selectedAgentForAllocation}
                      onChange={(e) => setSelectedAgentForAllocation(e.target.value)}
                      className="bg-slate-50 text-slate-800 text-xs border border-slate-200 rounded-xl px-3 py-2 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {activeAgents.length > 0 ? (
                        activeAgents.map((ag, idx) => (
                          <option key={`ag-alloc-opt-${ag.id || ag.agentId || idx}`} value={ag.agentId || ag.id}>
                            Assign to: {ag.name} ({ag.agentId || 'RA'})
                          </option>
                        ))
                      ) : (
                        users.map((u, idx) => (
                          <option key={`u-alloc-opt-${u.id || u.agentId || idx}`} value={u.agentId || u.id}>
                            Assign to: {u.name} ({u.agentId || u.role})
                          </option>
                        ))
                      )}
                    </select>

                    <button
                      onClick={handleBulkAllocate}
                      disabled={selectedAccountIds.length === 0}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        selectedAccountIds.length > 0
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm cursor-pointer'
                          : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Allocate Selected ({selectedAccountIds.length})</span>
                    </button>
                  </div>
                </div>

                {/* Table for bulk selection */}
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase">
                      <tr>
                        <th className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedAccountIds.length === filteredAccounts.length && filteredAccounts.length > 0}
                            onChange={handleSelectAll}
                            className="rounded cursor-pointer"
                          />
                        </th>
                        <th className="p-3">Account ID</th>
                        <th className="p-3">Customer Name</th>
                        <th className="p-3">Branch &amp; Code</th>
                        <th className="p-3">Product</th>
                        <th className="p-3">Overdue Amount</th>
                        <th className="p-3">PTP Count</th>
                        <th className="p-3">Currently Assigned To</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredAccounts.map((acc, idx) => (
                        <tr
                          key={acc.id || acc.accountId || `acc-bulk-row-${idx}`}
                          className={`hover:bg-slate-50 cursor-pointer transition ${
                            selectedAccountIds.includes(acc.accountId) ? 'bg-blue-50/60' : ''
                          }`}
                          onClick={() => handleToggleSelect(acc.accountId)}
                        >
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              checked={selectedAccountIds.includes(acc.accountId)}
                              onChange={() => handleToggleSelect(acc.accountId)}
                              className="rounded cursor-pointer"
                            />
                          </td>
                          <td className="p-3 font-mono font-bold text-blue-600">{acc.accountId}</td>
                          <td className="p-3 font-bold text-slate-900">{acc.customerName}</td>
                          <td className="p-3">
                            <span className="font-medium text-slate-800">{acc.branch}</span>
                            <span className="block text-[10px] font-mono text-slate-400">{acc.branchCode || 'BR-01'}</span>
                          </td>
                          <td className="p-3">{acc.loanType}</td>
                          <td className="p-3 font-mono font-bold text-red-600">{formatINR(acc.overdueAmount)}</td>
                          <td className="p-3 font-semibold text-blue-700">{acc.ptpCount ?? 0} PTPs</td>
                          <td className="p-3 text-slate-700">
                            {acc.assignedAgentName} ({acc.assignedAgentId})
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SHORTLIST CUSTOMERS ENGINE */}
          {activeSection === 'shortlist' && (
            <CustomerShortlistSection
              accounts={accounts}
              users={users}
              onSelectAccount={(acc) => {
                setSelectedAccount(acc);
                setIsSingleCustomerModalOpen(true);
              }}
              onOpenFollowUp={(acc) => {
                setSelectedAccount(acc);
                setIsFollowUpOpen(true);
              }}
              onOpenPTP={(acc) => {
                setSelectedAccount(acc);
                setIsPTPOpen(true);
              }}
              onAllocateBulk={(accIds, agentId, agentName) => {
                const ag = users.find((u) => u.id === agentId);
                allocateBulkAccounts(accIds, agentId, agentName, ag?.agentId || 'RA-0045');
                alert(`Successfully allocated ${accIds.length} accounts to ${agentName}!`);
              }}
            />
          )}

          {/* 4. GEO-TAGGED PHOTOS GALLERY */}
          {activeSection === 'photos' && (
            <div className="space-y-4">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Camera className="w-4 h-4 text-sky-600" />
                      <span>SRMS Geo-Tagged Watermarked Photographs</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Photographs stamped with official SRMS box, GPS coordinates, Agent ID, Account ID, and stored in Google Drive
                    </p>
                  </div>
                  <span className="text-xs font-mono text-sky-700 bg-sky-50 px-3 py-1 rounded-lg border border-sky-200 font-semibold">
                    {photos.length} Photos Synced to Drive
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {photos.map((ph, idx) => (
                    <div
                      key={ph.id || `photo-card-${idx}`}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm space-y-2 hover:shadow-md transition"
                    >
                      <div className="relative bg-slate-900 aspect-[4/3] flex items-center justify-center overflow-hidden">
                        <img
                          src={ph.dataUrl}
                          alt="Watermarked Geo-Photo"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <div className="p-4 space-y-2.5 text-xs">
                        <div className="flex items-center justify-between font-bold">
                          <span className="text-blue-600 font-mono">{ph.accountId}</span>
                          <span className="text-slate-400 font-mono text-[10px]">{ph.driveFileId}</span>
                        </div>
                        <div className="p-2.5 bg-slate-50 rounded-lg font-mono text-[11px] text-slate-700 border border-slate-100 space-y-1">
                          <div className="flex justify-between text-slate-600">
                            <span>Date &amp; Time:</span>
                            <span className="font-medium text-slate-900">{ph.date} {ph.time}</span>
                          </div>
                          <div className="flex justify-between text-emerald-700">
                            <span>GPS Coordinates:</span>
                            <span className="font-semibold">
                              {typeof ph.latitude === 'number' ? ph.latitude.toFixed(6) : '0.000000'}° N, {typeof ph.longitude === 'number' ? ph.longitude.toFixed(6) : '0.000000'}° E
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Agent:</span>
                            <span>{ph.agentId} ({ph.agentName})</span>
                          </div>
                        </div>
                        <p className="text-slate-600 text-xs italic bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                          "{ph.agentRemark}"
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 6. GOOGLE SHEETS MASTER VIEWER (19 TABS) */}
          {activeSection === 'sheets' && (
            <div className="space-y-4 text-xs">
              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        <Table className="w-4 h-4 text-emerald-600" />
                        <span>Google Sheets Data Layer • All 19 Structured Tables</span>
                      </h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        Live Sheets Sync
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      All account remarks, follow-up logs, PTPs, and visits are synchronized directly to your Google account spreadsheets.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {currentUser.role === 'admin' && (
                      <button
                        onClick={() => setIsDriveModalOpen(true)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        <span>Sync with Google Sheets</span>
                      </button>
                    )}
                    <button
                      onClick={() => alert(`Exporting ${activeRawSheet}.csv formatted for Google Sheets...`)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-semibold flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>

                {/* 19 Sheet Tabs selector */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
                  {[
                    'Accounts',
                    'Recovery_Backup',
                    'Recoveries',
                    'PTP',
                    'Followups',
                    'Visits',
                    'Users',
                    'Photos',
                    'VoiceNotes',
                    'Documents',
                    'Commission',
                    'AuditLogs',
                  ].map((tab) => (
                    <button
                      key={`sheet-tab-btn-${tab}`}
                      onClick={() => setActiveRawSheet(tab)}
                      className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition cursor-pointer ${
                        activeRawSheet === tab
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {tab === 'Recovery_Backup' ? '🛡️ Recovery_Backup' : `${tab} Tab`}
                    </button>
                  ))}
                </div>

                {/* Data Dump Preview for selected sheet */}
                <div className="bg-slate-900 text-slate-200 p-4 rounded-xl font-mono text-[11px] overflow-x-auto max-h-96 shadow-inner">
                  {activeRawSheet === 'Accounts' && (
                    <table className="w-full text-left">
                      <thead className="text-slate-400 border-b border-slate-800 pb-1">
                        <tr>
                          <th className="p-1.5">accountId</th>
                          <th className="p-1.5">customerName</th>
                          <th className="p-1.5">loanType</th>
                          <th className="p-1.5">overdueAmount</th>
                          <th className="p-1.5">ptpCount</th>
                          <th className="p-1.5">assignedAgentId</th>
                          <th className="p-1.5">accountStatus</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {accounts.map((a, idx) => (
                          <tr key={a.id || a.accountId || `raw-acc-${idx}`}>
                            <td className="p-1.5 text-blue-400">{a.accountId}</td>
                            <td className="p-1.5">{a.customerName}</td>
                            <td className="p-1.5">{a.loanType}</td>
                            <td className="p-1.5 text-rose-400">{a.overdueAmount}</td>
                            <td className="p-1.5 text-emerald-400">{a.ptpCount ?? 0}</td>
                            <td className="p-1.5 text-amber-300">{a.assignedAgentId}</td>
                            <td className="p-1.5">{a.accountStatus}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeRawSheet === 'Recovery_Backup' && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-xs font-sans">
                        <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                          <span>🛡️</span> Live Recovery_Backup Tab Records ({recoveries.length + accounts.length + ptps.length + followups.length} entries)
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          Automated 12-Hour Rolling Replacement Cycle | Synced to Drive & Sheet
                        </span>
                      </div>
                      <table className="w-full text-left">
                        <thead className="text-slate-400 border-b border-slate-800 pb-1">
                          <tr>
                            <th className="p-1.5">Record Type</th>
                            <th className="p-1.5">Account ID</th>
                            <th className="p-1.5">Customer Name</th>
                            <th className="p-1.5">Amount (₹)</th>
                            <th className="p-1.5">Reference / ID</th>
                            <th className="p-1.5">Agent</th>
                            <th className="p-1.5">Status / Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800 text-slate-300">
                          {recoveries.map((r, idx) => (
                            <tr key={`bkp-rec-${idx}`}>
                              <td className="p-1.5 text-emerald-400 font-bold">RECOVERY</td>
                              <td className="p-1.5 text-blue-400">{r.accountId}</td>
                              <td className="p-1.5">{r.customerName}</td>
                              <td className="p-1.5 text-emerald-300">₹{r.amount?.toLocaleString('en-IN')}</td>
                              <td className="p-1.5 text-slate-400">{r.receiptNumber || r.id}</td>
                              <td className="p-1.5 text-amber-300">{r.agentName}</td>
                              <td className="p-1.5 text-slate-300">{r.paymentMode} | {r.remarks || 'Collected'}</td>
                            </tr>
                          ))}
                          {ptps.map((p, idx) => (
                            <tr key={`bkp-ptp-${idx}`}>
                              <td className="p-1.5 text-amber-400 font-bold">PTP_PROMISE</td>
                              <td className="p-1.5 text-blue-400">{p.accountId}</td>
                              <td className="p-1.5">{p.customerName}</td>
                              <td className="p-1.5 text-amber-300">₹{p.amount?.toLocaleString('en-IN')}</td>
                              <td className="p-1.5 text-slate-400">{p.id}</td>
                              <td className="p-1.5 text-amber-300">{p.agentName}</td>
                              <td className="p-1.5 text-slate-300">Promise: {p.ptpDate} ({p.status})</td>
                            </tr>
                          ))}
                          {accounts.slice(0, 15).map((a, idx) => (
                            <tr key={`bkp-acc-${idx}`}>
                              <td className="p-1.5 text-cyan-400 font-bold">ACCOUNT_SNAPSHOT</td>
                              <td className="p-1.5 text-blue-400">{a.accountId}</td>
                              <td className="p-1.5">{a.customerName}</td>
                              <td className="p-1.5 text-rose-300">₹{a.outstandingAmount?.toLocaleString('en-IN')}</td>
                              <td className="p-1.5 text-slate-400">{a.loanNumber}</td>
                              <td className="p-1.5 text-amber-300">{a.assignedAgentName || 'Unassigned'}</td>
                              <td className="p-1.5 text-slate-300">{a.latestRemark || `${a.loanType} - ${a.accountStatus}`}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeRawSheet === 'Followups' && (
                    <table className="w-full text-left">
                      <thead className="text-slate-400 border-b border-slate-800 pb-1">
                        <tr>
                          <th className="p-1.5">id</th>
                          <th className="p-1.5">accountId</th>
                          <th className="p-1.5">agent</th>
                          <th className="p-1.5">status</th>
                          <th className="p-1.5">customerResponse</th>
                          <th className="p-1.5">agentRemarks</th>
                          <th className="p-1.5">nextDate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {followups.map((f, idx) => (
                          <tr key={f.id || `raw-fup-${idx}`}>
                            <td className="p-1.5 text-slate-500">{f.id}</td>
                            <td className="p-1.5 text-blue-400">{f.accountId}</td>
                            <td className="p-1.5 text-slate-300">{f.agentName}</td>
                            <td className="p-1.5 text-amber-300">{f.status}</td>
                            <td className="p-1.5 text-slate-200">{f.customerResponse}</td>
                            <td className="p-1.5 text-emerald-400">{f.agentRemarks}</td>
                            <td className="p-1.5 text-slate-400">{f.nextFollowUpDate || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeRawSheet === 'Recoveries' && (
                    <table className="w-full text-left">
                      <thead className="text-slate-400 border-b border-slate-800 pb-1">
                        <tr>
                          <th className="p-1.5">id</th>
                          <th className="p-1.5">accountId</th>
                          <th className="p-1.5">amount</th>
                          <th className="p-1.5">commission (10%)</th>
                          <th className="p-1.5">agentId</th>
                          <th className="p-1.5">receiptNumber</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {recoveries.map((r, idx) => (
                          <tr key={r.id || r.receiptNumber || `raw-rec-${idx}`}>
                            <td className="p-1.5 text-slate-500">{r.id}</td>
                            <td className="p-1.5 text-blue-400">{r.accountId}</td>
                            <td className="p-1.5 text-emerald-400">{r.amount}</td>
                            <td className="p-1.5 text-amber-400">{r.commissionAmount}</td>
                            <td className="p-1.5">{r.agentId}</td>
                            <td className="p-1.5 text-slate-400">{r.receiptNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeRawSheet === 'PTP' && (
                    <table className="w-full text-left">
                      <thead className="text-slate-400 border-b border-slate-800 pb-1">
                        <tr>
                          <th className="p-1.5">id</th>
                          <th className="p-1.5">accountId</th>
                          <th className="p-1.5">customerName</th>
                          <th className="p-1.5">amount</th>
                          <th className="p-1.5">ptpDate</th>
                          <th className="p-1.5">status</th>
                          <th className="p-1.5">remarks</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {ptps.map((p, idx) => (
                          <tr key={p.id || `raw-ptp-${idx}`}>
                            <td className="p-1.5 text-slate-500">{p.id}</td>
                            <td className="p-1.5 text-blue-400">{p.accountId}</td>
                            <td className="p-1.5">{p.customerName}</td>
                            <td className="p-1.5 text-emerald-400">₹{p.amount?.toLocaleString('en-IN')}</td>
                            <td className="p-1.5 text-amber-300">{p.ptpDate}</td>
                            <td className="p-1.5 text-cyan-300">{p.status}</td>
                            <td className="p-1.5 text-slate-300">{p.remarks || p.customerCommitment || 'None'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeRawSheet === 'Users' && (
                    <table className="w-full text-left">
                      <thead className="text-slate-400 border-b border-slate-800 pb-1">
                        <tr>
                          <th className="p-1.5">id</th>
                          <th className="p-1.5">name</th>
                          <th className="p-1.5">username</th>
                          <th className="p-1.5">role</th>
                          <th className="p-1.5">agentId</th>
                          <th className="p-1.5">branch</th>
                          <th className="p-1.5">status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {users.map((u, idx) => (
                          <tr key={u.id || `raw-usr-${idx}`}>
                            <td className="p-1.5 text-slate-500">{u.id}</td>
                            <td className="p-1.5 text-blue-400">{u.name}</td>
                            <td className="p-1.5 text-slate-300">{u.username}</td>
                            <td className="p-1.5 text-amber-300">{u.role}</td>
                            <td className="p-1.5 text-emerald-400">{u.agentId || 'N/A'}</td>
                            <td className="p-1.5 text-slate-400">{u.branch}</td>
                            <td className="p-1.5">{u.active ? 'ACTIVE' : 'INACTIVE'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}

                  {activeRawSheet !== 'Accounts' &&
                    activeRawSheet !== 'Recovery_Backup' &&
                    activeRawSheet !== 'Recoveries' &&
                    activeRawSheet !== 'Followups' &&
                    activeRawSheet !== 'PTP' &&
                    activeRawSheet !== 'Users' && (
                    <p className="text-slate-300 p-2">
                      Viewing synchronized rows for Google Sheet tab: <span className="text-emerald-400 font-bold">{activeRawSheet}</span>. Total 19 database schemas mounted.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 7. USERS & ROLES (RBAC) */}
          {activeSection === 'users' && (
            <div className="space-y-4">
              {userAdminFeedback && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{userAdminFeedback}</span>
                  </div>
                  <button onClick={() => setUserAdminFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-purple-600" />
                      <span>User Management &amp; Role-Based Access Control</span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Configure agent user IDs, secure passwords, branch assignments, zone credentials, and monthly recovery targets
                    </p>
                  </div>
                  <button
                    onClick={() => setIsCreateUserOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Create New User</span>
                  </button>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase">
                      <tr>
                        <th className="p-3.5">User</th>
                        <th className="p-3.5">Role</th>
                        <th className="p-3.5">User / Agent ID</th>
                        <th className="p-3.5">Assigned Bank</th>
                        <th className="p-3.5">Branch &amp; Zone</th>
                        <th className="p-3.5">Mobile</th>
                        <th className="p-3.5">Monthly Target</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5 text-right">Admin Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {users.map((u, idx) => (
                        <tr key={u.id || u.agentId || `user-row-${idx}`} className="hover:bg-slate-50 transition">
                          <td className="p-3.5">
                            <div className="font-bold text-slate-900">{u.name}</div>
                            <div className="text-slate-500 text-[11px]">{u.email}</div>
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                                u.role === 'admin'
                                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                                  : u.role === 'agent'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="p-3.5 font-mono font-bold text-blue-600">
                            <div>{u.agentId || u.id}</div>
                            <span className="text-[10px] text-slate-400 font-normal">PIN/Pass Configured</span>
                          </td>
                          <td className="p-3.5">
                            {u.bank ? (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-800 rounded font-semibold text-[11px] border border-blue-200">
                                {u.bank}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">All Banks</span>
                            )}
                          </td>
                          <td className="p-3.5 text-slate-700">
                            <div className="font-medium text-slate-900">{u.branch || '—'}</div>
                            <div className="text-[10px] text-slate-500">{u.zone || '—'}</div>
                          </td>
                          <td className="p-3.5 font-mono text-slate-700">{u.mobile}</td>
                          <td className="p-3.5 font-mono text-amber-700 font-bold">
                            {u.monthlyTarget ? formatINR(u.monthlyTarget) : '—'}
                          </td>
                          <td className="p-3.5">
                            <span
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${
                                u.active
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {u.active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => openEditUserModal(u)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold border border-slate-200 transition cursor-pointer flex items-center gap-1"
                                title="Edit user profile & details"
                              >
                                <Edit className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => openChangePasswordModal(u)}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[11px] font-semibold border border-amber-200 transition cursor-pointer flex items-center gap-1"
                                title="Change or reset user password & PIN"
                              >
                                <FolderLock className="w-3 h-3" />
                                <span>Password</span>
                              </button>
                              <button
                                onClick={() => toggleUserActive(u.id)}
                                className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                                  u.active
                                    ? 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200'
                                    : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {u.active ? 'Deactivate' : 'Activate'}
                              </button>
                              {currentUser.role === 'admin' && u.id !== currentUser.id && (
                                <button
                                  onClick={() => openDeleteUserModal(u)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-semibold border border-rose-200 transition cursor-pointer flex items-center gap-1"
                                  title="Delete User (Reassigns accounts to Management Queue & preserves all notes/recoveries)"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 8. FOLLOW-UPS */}
          {activeSection === 'followups' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900">All Follow-up Calls &amp; Customer Interactions</h3>
              <div className="space-y-3 text-xs">
                {followups.map((f, idx) => (
                  <div key={f.id || `fup-card-${idx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{f.customerName} ({f.accountId})</span>
                      <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-semibold">{f.status}</span>
                    </div>
                    <p className="text-slate-700">{f.discussionDetails}</p>
                    <div className="flex justify-between text-[11px] text-slate-500 font-mono pt-1">
                      <span>Logged by: {f.agentName} ({f.agentId})</span>
                      <span>Next: {f.nextFollowUpDate} at {f.nextFollowUpTime}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. PTP COMMITMENTS */}
          {activeSection === 'ptp' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-purple-600" />
                      <span>Promise to Pay (PTP) Master Directory</span>
                    </h3>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                      Tab 7 Google Sheet Sync
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Track all borrower repayment commitments, evaluate broken schedules, and execute batch synchronization
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsPTPDigestOpen(true)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-xs transition cursor-pointer ${
                      ptpPreview.expiredCount > 0
                        ? 'bg-gradient-to-r from-amber-600 to-red-600 hover:from-amber-700 hover:to-red-700 text-white shadow-amber-600/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                    }`}
                  >
                    <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                    <span>Run PTP Digest</span>
                    {ptpPreview.expiredCount > 0 && (
                      <span className="px-1.5 py-0.5 bg-white text-red-700 text-[10px] font-black rounded-full shadow-xs">
                        {ptpPreview.expiredCount} Expired
                      </span>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Filter Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {[
                  { id: 'ALL', label: 'All PTPs', count: ptps.length },
                  {
                    id: 'Pending',
                    label: 'Pending',
                    count: ptps.filter((p) => p.status === 'Pending').length,
                  },
                  {
                    id: 'Expired',
                    label: 'Expired Overdue',
                    count: ptpPreview.expiredCount,
                    highlight: ptpPreview.expiredCount > 0,
                  },
                  {
                    id: 'DueToday',
                    label: 'Due Today (23-Aug)',
                    count: ptpPreview.dueTodayCount,
                  },
                  {
                    id: 'Broken',
                    label: 'Broken',
                    count: ptps.filter((p) => p.status === 'Broken').length,
                  },
                  {
                    id: 'Achieved',
                    label: 'Achieved',
                    count: ptps.filter((p) => p.status === 'Achieved').length,
                  },
                ].map((tab) => (
                  <button
                    key={`ptp-tab-${tab.id}`}
                    onClick={() => setPtpFilterStatus(tab.id)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition cursor-pointer flex items-center gap-1.5 ${
                      ptpFilterStatus === tab.id
                        ? 'bg-slate-900 text-white shadow-xs'
                        : tab.highlight
                        ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                        ptpFilterStatus === tab.id
                          ? 'bg-white/20 text-white'
                          : tab.highlight
                          ? 'bg-red-200 text-red-800 font-bold'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* PTP Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                {ptps
                  .filter((p) => {
                    if (ptpFilterStatus === 'ALL') return true;
                    if (ptpFilterStatus === 'Expired') return p.status === 'Pending' && p.ptpDate < '2026-08-23';
                    if (ptpFilterStatus === 'DueToday') return p.status === 'Pending' && p.ptpDate === '2026-08-23';
                    return p.status === ptpFilterStatus;
                  })
                  .map((p, idx) => {
                    const isExpired = p.status === 'Pending' && p.ptpDate < '2026-08-23';
                    const isDueToday = p.status === 'Pending' && p.ptpDate === '2026-08-23';

                    return (
                      <div
                        key={p.id || `ptp-card-${idx}`}
                        className={`p-4 rounded-xl border space-y-3 transition shadow-xs hover:shadow-md ${
                          isExpired
                            ? 'bg-red-50/60 border-red-200 ring-1 ring-red-200'
                            : p.status === 'Broken'
                            ? 'bg-slate-50 border-slate-200 opacity-90'
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

                        <div className="flex justify-between items-center font-mono bg-slate-50/90 p-2.5 rounded-lg border border-slate-200 text-xs">
                          <span className="text-purple-700 font-bold text-sm">{formatINR(p.amount)}</span>
                          <div className="text-right">
                            <span className="font-bold text-slate-800 block">{p.ptpDate}</span>
                            <span className="text-[10px] text-slate-500 font-sans">{p.ptpMode}</span>
                          </div>
                        </div>

                        <p className="text-slate-600 text-xs italic bg-white p-2 rounded-md border border-slate-100 line-clamp-2">
                          "{p.customerCommitment}"
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Agent: {p.agentName}</span>
                          <button
                            onClick={() => {
                              const acc = accounts.find((a) => a.accountId === p.accountId);
                              if (acc) {
                                setSelectedAccount(acc);
                                setIsSingleCustomerModalOpen(true);
                              }
                            }}
                            className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                          >
                            View Account →
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* HIERARCHY & BRANCHES SECTION */}
          {activeSection === 'hierarchy' && <HierarchyManagementSection />}

          {/* COMMISSION MANAGEMENT SECTION */}
          {activeSection === 'commission' && <CommissionManagementSection />}

          {/* 10. RECOVERY RECEIPTS */}
          {activeSection === 'recovery' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-slate-900">All Collections &amp; Recovery Receipts</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                      {recoveryMonthFilter === currentMonthStr ? `Current Month (${currentMonthStr})` : recoveryMonthFilter === 'ALL' ? 'All Months' : recoveryMonthFilter}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">Immutable recovery transactions with hierarchical commission ledger verification</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                    <span className="text-[11px] font-bold text-slate-600 pl-2">Filter Month:</span>
                    <select
                      value={recoveryMonthFilter}
                      onChange={(e) => setRecoveryMonthFilter(e.target.value)}
                      className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      <option value={currentMonthStr}>Current Month ({currentMonthStr})</option>
                      <option value="ALL">All Recorded Months</option>
                      {availableDashMonths
                        .filter((m) => m !== currentMonthStr)
                        .map((m) => (
                          <option key={`rec-m-${m}`} value={m}>
                            {m}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    onClick={() => setActiveSection('commission')}
                    className="px-3.5 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Percent className="w-3.5 h-3.5" />
                    <span>Open Commission Rules &amp; Simulator</span>
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200 uppercase">
                    <tr>
                      <th className="p-3">Receipt No</th>
                      <th className="p-3">Account &amp; Customer</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Calculated Commission</th>
                      <th className="p-3">Rule / Priority</th>
                      <th className="p-3">Payment Mode</th>
                      <th className="p-3">Agent</th>
                      <th className="p-3">Date</th>
                      <th className="p-3 text-right">Status / Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {scopedRecoveries
                      .filter((r) => {
                        if (recoveryMonthFilter !== 'ALL' && (!r.recoveryDate || !r.recoveryDate.startsWith(recoveryMonthFilter))) {
                          return false;
                        }
                        return true;
                      })
                      .map((r, idx) => (
                      <tr key={r.id || r.receiptNumber || `rec-row-${idx}`} className={`hover:bg-slate-50 transition ${r.isReversed ? 'bg-slate-50/70 opacity-80' : ''}`}>
                        <td className="p-3 font-mono text-blue-600 font-bold">{r.receiptNumber}</td>
                        <td className="p-3 font-bold text-slate-900">
                          {r.customerName} ({r.accountId})
                          {r.isReversed && (
                            <span className="ml-2 text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              REVERSED
                            </span>
                          )}
                        </td>
                        <td className={`p-3 font-mono font-bold ${r.isReversed ? 'line-through text-slate-400' : 'text-emerald-600'}`}>
                          {formatINR(r.amount)}
                        </td>
                        <td className="p-3 font-mono font-bold text-amber-600">
                          {formatINR(r.commissionAmount)}
                          <span className="ml-1 text-[10px] text-slate-400 font-normal">({r.commissionRate || 10}%)</span>
                        </td>
                        <td className="p-3">
                          {r.appliedPriorityLevel ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              Priority {r.appliedPriorityLevel}
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Default Policy</span>
                          )}
                        </td>
                        <td className="p-3">{r.paymentMode}</td>
                        <td className="p-3">{r.agentName} ({r.agentId})</td>
                        <td className="p-3 text-slate-500">{r.recoveryDate}</td>
                        <td className="p-3 text-right">
                          {r.isReversed ? (
                            <div className="text-right">
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 inline-block">
                                Reversed
                              </span>
                              {r.reversalReason && (
                                <span className="text-[10px] text-slate-500 block truncate max-w-[150px] ml-auto mt-0.5" title={r.reversalReason}>
                                  {r.reversalReason}
                                </span>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setReversalTargetRecovery(r);
                                setReversalReasonInput('');
                                setIsReversalModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg border border-rose-200 flex items-center gap-1 cursor-pointer transition ml-auto"
                              title="Reverse this recovery entry and restore account balance"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reverse</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 11. FIELD VISITS */}
          {activeSection === 'visits' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900">Field Visits &amp; GPS Location Log</h3>
              <div className="space-y-3 text-xs">
                {scopedVisits.map((v, idx) => (
                  <div key={v.id || `visit-card-${idx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-slate-900">{v.customerName} ({v.accountId})</span>
                        <p className="text-slate-500 text-[11px]">{v.address}</p>
                      </div>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                        {v.visitStatus}
                      </span>
                    </div>
                    <div className="flex justify-between font-mono text-emerald-700 bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                      <span>GPS: {typeof v.latitude === 'number' ? v.latitude.toFixed(6) : '0.000000'}° N, {typeof v.longitude === 'number' ? v.longitude.toFixed(6) : '0.000000'}° E</span>
                      <span className="text-slate-600">{v.date} ({v.startTime} - {v.endTime || 'Done'})</span>
                    </div>
                    <p className="text-slate-600">{v.visitRemarks}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 12. VOICE NOTES */}
          {activeSection === 'voice' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 shadow-sm">
              <h3 className="font-bold text-sm text-slate-900">Google Drive Voice Notes Audio Library</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {voiceNotes.map((vn, idx) => (
                  <div key={vn.id || `vn-card-${idx}`} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-pink-600" />
                        <span className="font-bold text-slate-900">{vn.title}</span>
                      </div>
                      <span className="font-mono text-[10px] text-blue-600">{vn.driveFileId}</span>
                    </div>
                    <p className="text-slate-500 text-xs">Account: {vn.accountId} • Agent: {vn.agentName}</p>
                    <p className="text-slate-700 bg-white p-3 rounded-lg border border-slate-200 italic">
                      "{vn.transcription}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 13. GOOGLE DRIVE */}
          {activeSection === 'drive' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-blue-600" />
                    <span>Google Drive Storage Space &amp; File Hierarchy</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Direct integration for geotagged recovery photos, voice notes, and KYC documents
                  </p>
                </div>
                {currentUser.role === 'admin' ? (
                  <button
                    onClick={() => setIsDriveModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>
                      {googleDriveService.getAuthState().isConnected ? 'Manage Google Drive Link' : 'Link Google Drive Space'}
                    </span>
                  </button>
                ) : (
                  <div className="px-3.5 py-1.5 bg-slate-100 text-slate-600 rounded-xl font-medium text-xs flex items-center gap-2 border border-slate-200">
                    <Shield className="w-3.5 h-3.5 text-blue-600" />
                    <span>Admin Controlled Storage</span>
                  </div>
                )}
              </div>

              {/* Status Banner */}
              <div className={`p-4 rounded-xl border flex items-center justify-between ${
                googleDriveService.getAuthState().isConnected
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : 'bg-blue-50 border-blue-200 text-slate-900'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${googleDriveService.getAuthState().isConnected ? 'bg-emerald-600 text-white' : 'bg-blue-600 text-white'}`}>
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">
                      {googleDriveService.getAuthState().isConnected
                        ? `Google Drive Connected: ${googleDriveService.getAuthState().userEmail || 'Ashish.kharad2@gmail.com'}`
                        : 'Google Drive Ready to Link'}
                    </div>
                    <div className="text-[11px] text-slate-600">
                      Scope: <code className="font-mono text-[10px] text-blue-700">https://www.googleapis.com/auth/drive.file</code> (Safe least-privilege access)
                    </div>
                  </div>
                </div>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold ${
                  googleDriveService.getAuthState().isConnected
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {googleDriveService.getAuthState().isConnected ? 'ACTIVE' : 'READY TO AUTHORIZE'}
                </span>
              </div>

              {/* Live Drive Tree View */}
              <div className="p-4 bg-slate-900 text-slate-200 rounded-xl font-mono space-y-2 text-xs shadow-inner">
                <p className="text-blue-400 font-bold">📁 /ScaleSupport_Recovery_Storage/ (Root Google Drive Folder)</p>
                <div className="pl-6 space-y-2 border-l border-slate-800">
                  {accounts.slice(0, 4).map((acc, idx) => (
                    <div key={acc.id || acc.accountId || `drive-acc-${idx}`} className="space-y-1">
                      <p className="text-amber-300 font-semibold">📁 /Account_{acc.accountId}/ ({acc.customerName})</p>
                      <div className="pl-6 text-slate-400 border-l border-slate-800 space-y-0.5 text-[11px]">
                        <p className="text-emerald-400">📁 Photos/ ({photos.filter(p => p.accountId === acc.accountId).length} geotagged files)</p>
                        {photos.filter(p => p.accountId === acc.accountId).slice(0, 2).map((p, pIdx) => (
                          <div key={p.id || `drive-p-${pIdx}`} className="pl-4 text-slate-300">
                            📄 ScaleSupport_{acc.accountId}_{p.photoId}.jpg [GPS: {typeof p.latitude === 'number' ? p.latitude.toFixed(4) : '0.0000'}°N, {typeof p.longitude === 'number' ? p.longitude.toFixed(4) : '0.0000'}°E]
                          </div>
                        ))}
                        <p className="text-pink-400">📁 Voice_Notes/ ({voiceNotes.filter(v => v.accountId === acc.accountId).length} recordings)</p>
                        <p className="text-purple-400">📁 KYC_Docs/ ({documents.filter(d => d.accountId === acc.accountId).length} documents)</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* 14. EXECUTIVE REPORTS */}
          {activeSection === 'reports' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-600" />
                  <span>Executive Reports &amp; MIS Analytics</span>
                </h3>
                <button
                  onClick={() => exportAllBackendData()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer border border-slate-700"
                  title="Download all system database sheets into a multi-tab Excel file"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>Download Full Backend Data (.xlsx)</span>
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900">Complete Database Archive</h4>
                  <p className="text-slate-500">12 multi-sheet workbooks containing all live records, accounts, recoveries &amp; agent notes.</p>
                  <button
                    onClick={() => exportAllBackendData()}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Export Excel (.xlsx)</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900">Daily Recovery Report</h4>
                  <p className="text-slate-500">Total ₹{totalRecoverySum.toLocaleString('en-IN')} recovered across all field agents.</p>
                  <button
                    onClick={() => exportAllBackendData()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download MIS</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="font-bold text-slate-900">Agent Commission Ledger</h4>
                  <p className="text-slate-500">₹{totalCommissionSum.toLocaleString('en-IN')} commissions calculated for {commissionSettings.defaultRate}% base rate.</p>
                  <button
                    onClick={() => setActiveSection('commission')}
                    className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold text-xs transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View Ledger</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 15. SYSTEM SETTINGS */}
          {activeSection === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4 text-xs shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Settings className="w-4 h-4 text-blue-600" />
                  <span>System Configuration &amp; Storage Architecture</span>
                </h3>
                <button
                  onClick={() => exportAllBackendData()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer border border-slate-700"
                  title="Export full Excel backup file"
                >
                  <Download className="w-4 h-4 text-emerald-400" />
                  <span>Download Full Data Backup (.xlsx)</span>
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">Full Backend Data Export Permission</span>
                    <span className="text-slate-500 text-[11px]">Allows Admin to download all accounts, users, logs, follow-ups, PTPs, visits, and commission history in Excel</span>
                  </div>
                  <button
                    onClick={() => exportAllBackendData()}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Export All Data Now</span>
                  </button>
                </div>
                <div className="p-4 bg-rose-50/60 rounded-xl border border-rose-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-rose-950 block">Permanent Account Data Storage</span>
                    <span className="text-rose-700 text-[11px]">
                      Permanently wipe all account records from browser storage ({accounts.length} accounts currently stored). Only account data will be deleted; users, credentials, branches, and system settings will remain safe.
                    </span>
                  </div>
                  <button
                    onClick={() => setIsDeleteAllAccountsModalOpen(true)}
                    className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All Account Storage</span>
                  </button>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">Google Sheets Data Layer</span>
                    <span className="text-slate-500 text-[11px]">Simulates 19 master sheets database schema</span>
                  </div>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    ✓ Active &amp; Mounted
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">Google Drive Storage Adapter</span>
                    <span className="text-slate-500 text-[11px]">Stores geo-tagged watermarked photos, audio, documents</span>
                  </div>
                  <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
                    ✓ Active &amp; Mounted
                  </span>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <div>
                    <span className="font-bold text-slate-900 block">Future Database Migration Readiness</span>
                    <span className="text-slate-500 text-[11px]">Storage abstracted via backend API adapters</span>
                  </div>
                  <span className="text-blue-700 font-bold bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                    ✓ Ready
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODALS & DRAWERS */}
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

      {selectedAccount && isDocOpen && (
        <UploadDocumentModal
          account={selectedAccount}
          isOpen={isDocOpen}
          onClose={() => setIsDocOpen(false)}
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

      {/* Excel Allocation Modal */}
      <ExcelAllocationModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
      />

      {/* Google Drive Link Modal */}
      <GoogleDriveLinkModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
      />

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

      {/* PTP Digest & Batch Sync Modal */}
      <PTPDigestModal
        isOpen={isPTPDigestOpen}
        onClose={() => setIsPTPDigestOpen(false)}
        onNavigateToAccountsWithFilter={(filter) => {
          setFilterStatus(filter);
          setActiveSection('accounts');
        }}
      />

      {/* CREATE NEW USER MODAL */}
      {isCreateUserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Create New Portal &amp; App User</h3>
              </div>
              <button
                onClick={() => setIsCreateUserOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Name / Agency Name *</label>
                  <input
                    type="text"
                    required
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="e.g. Anand Deshmukh or Apex Recovery Services"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role *</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="agent">Recovery Agent (Field/Web)</option>
                    <option value="branch_manager">Branch Manager</option>
                    <option value="recovery_department">Recovery Department User</option>
                    <option value="admin">System Administrator</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="management">Executive Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">User ID / Agent ID (Login ID)</label>
                  <input
                    type="text"
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    placeholder={newUserRole === 'agent' ? 'e.g. RA-0048 (or leave blank to auto-generate)' : 'e.g. admin_pune'}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Login Password *</label>
                  <input
                    type="text"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Password (e.g. 1234)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="name@supportscale.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mobile Contact *</label>
                  <input
                    type="text"
                    required
                    value={newUserMobile}
                    onChange={(e) => setNewUserMobile(e.target.value)}
                    placeholder="+91 98000 00000"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Bank</label>
                  <select
                    value={newUserBank}
                    onChange={(e) => setNewUserBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="All Banks">All Banks (Multi-Bank Access)</option>
                    {allUniqueBanks.map((b, idx) => (
                      <option key={`new-user-bank-${b || idx}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Zonal Office *</label>
                  <select
                    value={newUserZonalOffice}
                    onChange={(e) => setNewUserZonalOffice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {allUniqueZonalOffices.map((z, idx) => (
                      <option key={`new-user-zone-${z || idx}`} value={z}>
                        {z}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Regional Office *</label>
                  <select
                    value={newUserRegionalOffice}
                    onChange={(e) => setNewUserRegionalOffice(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {allUniqueRegionalOffices.map((r, idx) => (
                      <option key={`new-user-ro-${r || idx}`} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateUserOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Create User</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {isEditUserOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-blue-400" />
                <h3 className="text-sm font-bold">Edit User Details: {editingUser.name}</h3>
              </div>
              <button
                onClick={() => setIsEditUserOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Role</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="agent">Recovery Agent</option>
                    <option value="branch_manager">Branch Manager</option>
                    <option value="recovery_department">Recovery Department User</option>
                    <option value="admin">System Administrator</option>
                    <option value="coordinator">Coordinator</option>
                    <option value="management">Executive Management</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">User ID / Agent ID</label>
                  <input
                    type="text"
                    value={editUserAgentId}
                    onChange={(e) => setEditUserAgentId(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mobile Contact</label>
                  <input
                    type="text"
                    value={editUserMobile}
                    onChange={(e) => setEditUserMobile(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Bank</label>
                  <select
                    value={editUserBank}
                    onChange={(e) => setEditUserBank(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    <option value="All Banks">All Banks (Multi-Bank Access)</option>
                    {allUniqueBanks.map((b, idx) => (
                      <option key={`edit-user-bank-${b || idx}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Assigned Branch</label>
                  <select
                    value={editUserBranch}
                    onChange={(e) => setEditUserBranch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {allUniqueBranches.map((b, idx) => (
                      <option key={`edit-user-br-${b || idx}`} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Administrative Zone</label>
                  <input
                    type="text"
                    value={editUserZone}
                    onChange={(e) => setEditUserZone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                {editUserRole === 'agent' && (
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Monthly Target (₹)</label>
                    <input
                      type="number"
                      value={editUserTarget}
                      onChange={(e) => setEditUserTarget(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditUserOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CHANGE / RESET USER PASSWORD MODAL */}
      {isChangePasswordOpen && passwordTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderLock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold">Admin Password &amp; PIN Reset</h3>
              </div>
              <button
                onClick={() => setIsChangePasswordOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleChangePasswordSubmit} className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                <p className="text-slate-600 font-medium">Resetting credentials for:</p>
                <p className="text-slate-900 font-bold text-sm">{passwordTargetUser.name}</p>
                <p className="text-slate-500 font-mono text-[11px]">
                  User ID: {passwordTargetUser.agentId || passwordTargetUser.id} | Role: {passwordTargetUser.role.toUpperCase()}
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">New Login Password *</label>
                  <input
                    type="text"
                    required
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    placeholder="Enter new password (e.g. agent2026 or 1234)"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">User can use this password to log in immediately across Web and Android.</p>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">4-Digit Quick PIN (Optional)</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={newPinInput}
                    onChange={(e) => setNewPinInput(e.target.value)}
                    placeholder="1234"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsChangePasswordOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {isDeleteUserOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Confirm Delete User</h3>
              </div>
              <button
                onClick={() => setIsDeleteUserOpen(false)}
                className="text-rose-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5">
                <p className="text-slate-600 font-medium">You are about to delete user:</p>
                <p className="text-slate-900 font-bold text-sm">{userToDelete.name}</p>
                <p className="text-slate-500 font-mono text-[11px]">
                  User ID: {userToDelete.agentId || userToDelete.id} | Role: {userToDelete.role.toUpperCase()}
                </p>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 space-y-1.5 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Automatic Customer Reassignment &amp; Record Preservation</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>
                    All customer accounts assigned to <strong>{userToDelete.name}</strong> will be automatically reassigned to the <strong>Management Queue</strong>.
                  </li>
                  <li>
                    All historical remarks, notes, PTP commitments, recovery payments, and field visit logs updated by this agent will remain <strong>100% preserved</strong> and intact.
                  </li>
                  <li>
                    Active login sessions for this user will be revoked immediately.
                  </li>
                </ul>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteUserOpen(false)}
                  disabled={isDeletingUser}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteUser}
                  disabled={isDeletingUser}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingUser ? 'Deleting...' : 'Confirm & Delete User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CUSTOMER ACCOUNT CONFIRMATION MODAL */}
      {isDeleteAccountOpen && accountToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Confirm Delete Customer Account</h3>
              </div>
              <button
                onClick={() => setIsDeleteAccountOpen(false)}
                className="text-rose-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5">
                <p className="text-slate-600 font-medium">You are about to delete customer account:</p>
                <p className="text-slate-900 font-bold text-sm">{accountToDelete.customerName}</p>
                <p className="text-slate-500 font-mono text-[11px]">
                  Account ID: {accountToDelete.accountId} | Loan No: {accountToDelete.loanNumber} | Overdue: {formatINR(accountToDelete.overdueAmount)}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Assigned Agent: {accountToDelete.assignedAgentName} ({accountToDelete.assignedAgentId})
                </p>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                <p>
                  This will remove the customer account record from the active database. If this customer has multiple linked loan accounts, only this specific account ({accountToDelete.accountId}) will be removed.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteAccountOpen(false)}
                  disabled={isDeletingAccount}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAccount}
                  disabled={isDeletingAccount}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingAccount ? 'Deleting...' : 'Delete Customer Account'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE ALL ACCOUNTS FROM STORAGE CONFIRMATION MODAL */}
      {isDeleteAllAccountsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-rose-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Delete All Permanent Account Data</h3>
              </div>
              <button
                onClick={() => setIsDeleteAllAccountsModalOpen(false)}
                className="text-rose-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5">
                <p className="text-rose-900 font-bold text-sm">Permanent Storage Wipe (Accounts Only)</p>
                <p className="text-slate-600 text-xs leading-relaxed">
                  You are about to permanently delete <b>all {accounts.length} customer accounts</b> from local and permanent storage.
                </p>
                <div className="p-2.5 bg-white/80 rounded-lg border border-rose-100 text-[11px] text-slate-700 space-y-1">
                  <p className="text-emerald-700 font-bold">✓ Safe: Users, login credentials, branches, and zones will NOT be deleted.</p>
                  <p className="text-rose-700 font-bold">✗ Wiped: All customer account records, balances, and loan details will be cleared to 0.</p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-600 text-[11px] leading-relaxed">
                <p>
                  After deletion, the account database will be completely clear (0 accounts). You can upload a new Excel file or pull fresh live data from your Google Sheet at any time.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsDeleteAllAccountsModalOpen(false)}
                  disabled={isDeletingAllAccounts}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteAllAccounts}
                  disabled={isDeletingAllAccounts}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeletingAllAccounts ? 'Deleting All Accounts...' : 'Confirm & Delete All Accounts'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REVERSAL CONFIRMATION MODAL */}
      {isReversalModalOpen && reversalTargetRecovery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200 animate-in fade-in">
            <div className="px-6 py-4 bg-rose-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-5 h-5 text-white" />
                <h3 className="text-sm font-bold">Reverse Recovery Entry</h3>
              </div>
              <button
                onClick={() => setIsReversalModalOpen(false)}
                className="text-rose-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5">
                <p className="text-slate-600 font-medium">Reversing receipt:</p>
                <p className="text-slate-900 font-bold text-sm font-mono">{reversalTargetRecovery.receiptNumber}</p>
                <p className="text-slate-700 font-semibold">
                  {reversalTargetRecovery.customerName} ({reversalTargetRecovery.accountId})
                </p>
                <p className="text-emerald-700 font-mono font-bold text-base">
                  Amount: {formatINR(reversalTargetRecovery.amount)}
                </p>
                <p className="text-slate-500 text-[11px]">
                  Payment Mode: {reversalTargetRecovery.paymentMode} | Date: {reversalTargetRecovery.recoveryDate}
                </p>
              </div>

              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] leading-relaxed">
                <p className="font-semibold text-amber-950 mb-1">Impact of Reversal:</p>
                <p>
                  Reversing will mark this receipt as reversed, restore ₹{reversalTargetRecovery.amount.toLocaleString('en-IN')} back to the customer's overdue/outstanding balance, cancel the commission earned, and record an audit log entry.
                </p>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Reason for Reversal *</label>
                <input
                  type="text"
                  required
                  value={reversalReasonInput}
                  onChange={(e) => setReversalReasonInput(e.target.value)}
                  placeholder="e.g. Cheque bounced / Customer paid wrong amount / Duplicate entry"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReversalModalOpen(false)}
                  disabled={isProcessingReversal}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReversal}
                  disabled={isProcessingReversal}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isProcessingReversal ? 'Reversing...' : 'Confirm Reversal'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLOSE / DELETE ACCOUNT MODAL */}
      {accountToClose && (
        <CloseAccountModal
          account={accountToClose}
          isOpen={isCloseAccountModalOpen}
          onClose={() => {
            setIsCloseAccountModalOpen(false);
            setAccountToClose(null);
          }}
          onSuccess={() => {
            setIsCloseAccountModalOpen(false);
            setAccountToClose(null);
            setUserAdminFeedback('Account closure / deletion successfully updated.');
            setTimeout(() => setUserAdminFeedback(null), 5000);
          }}
        />
      )}

      {/* CREATED USER CREDENTIALS MODAL */}
      {createdUserCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-emerald-200 animate-in fade-in">
            <div className="px-6 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5" />
                <h3 className="text-sm font-bold">✓ User Created Successfully</h3>
              </div>
              <button
                onClick={() => setCreatedUserCredentials(null)}
                className="text-emerald-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <p className="text-slate-600 font-semibold">User Name:</p>
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 font-bold bg-white rounded-lg px-3 py-2 flex-1 font-mono border border-emerald-200">
                    {createdUserCredentials.name}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdUserCredentials.name);
                      alert('Copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition text-[10px]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 space-y-2">
                <p className="text-slate-600 font-semibold">User ID / Agent ID:</p>
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 font-bold bg-white rounded-lg px-3 py-2 flex-1 font-mono border border-blue-200">
                    {createdUserCredentials.userId}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdUserCredentials.userId);
                      alert('Copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-bold transition text-[10px]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
                <p className="text-slate-600 font-semibold">Initial Password:</p>
                <div className="flex items-center gap-2">
                  <p className="text-slate-900 font-bold bg-white rounded-lg px-3 py-2 flex-1 font-mono border border-amber-200">
                    {createdUserCredentials.password}
                  </p>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdUserCredentials.password);
                      alert('Copied to clipboard!');
                    }}
                    className="px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold transition text-[10px]"
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700 text-[11px] leading-relaxed space-y-1">
                <p className="font-semibold text-slate-900">📋 Next Steps:</p>
                <ol className="list-decimal list-inside space-y-0.5 text-slate-600">
                  <li>Share these credentials with the new user securely</li>
                  <li>They must log in with the User ID and Password above</li>
                  <li>They should change their password on first login (if possible)</li>
                  <li>Do NOT share this screen via email — use a secure channel</li>
                </ol>
              </div>

              <button
                onClick={() => setCreatedUserCredentials(null)}
                className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OTS SETTINGS MODAL (Bank-wise Last Dates & Scheme Slabs - Admin Only) */}
      <OTSSettingsModal
        isOpen={isOTSSettingsOpen}
        onClose={() => setIsOTSSettingsOpen(false)}
      />
    </div>
  );
};
