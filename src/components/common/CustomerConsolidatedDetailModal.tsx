import React, { useState } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Building2,
  CreditCard,
  Calendar,
  AlertTriangle,
  FileText,
  DollarSign,
  Layers,
  MessageSquare,
  Plus,
  Send,
  ExternalLink,
  Sparkles,
  PhoneCall,
  CheckCircle2,
  Clock,
  Navigation,
  Share2,
  ShieldCheck,
  ChevronRight,
  Receipt,
  Eye,
  FileSpreadsheet,
  Download,
  Camera,
  Mic,
  HardDrive,
  Search,
  Trash2,
  Calculator,
  Archive,
  Star,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account, LinkedAccountSummary } from '../../types';
import { formatINR } from '../../utils/watermark';
import {
  LogFollowUpModal,
  CreatePTPModal,
  RecordRecoveryModal,
  UploadDocumentModal,
  AIRecoveryDrawer,
  AddAgentNoteModal,
} from './ActionModals';
import { OTSSchemeModal } from './OTSSchemeModal';
import { WhatsAppOTSOfferModal } from './WhatsAppOTSOfferModal';
import { StarRating } from './StarRating';
import { CloseAccountModal } from './CloseAccountModal';

interface CustomerConsolidatedDetailModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectLinkedAccount?: (accountId: string) => void;
  onOpenNoteModal?: () => void;
  onOpenRecoveryModal?: () => void;
  onOpenPTPModal?: () => void;
}

export const CustomerConsolidatedDetailModal: React.FC<CustomerConsolidatedDetailModalProps> = ({
  account,
  isOpen,
  onClose,
  onSelectLinkedAccount,
  onOpenNoteModal,
  onOpenRecoveryModal,
  onOpenPTPModal,
}) => {
  const {
    accounts,
    updateAccount,
    updateCustomerStarRating,
    closeAccount,
    deleteAccount,
    markAccountForDeletion,
    addAgentNote,
    currentUser,
    startFieldVisit,
    documents,
    photos,
    voiceNotes,
    recoveries,
    branches,
    areas,
    zones,
  } = useSRMS();

  const [showCloseAccountModal, setShowCloseAccountModal] = useState(false);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState(false);
  const [isMarkingForDeletion, setIsMarkingForDeletion] = useState(false);

  const handleDeleteThisCustomer = () => {
    if (!account) return;
    const confirmMsg = `Are you sure you want to permanently delete customer "${account.customerName}" (Account ID: ${account.accountId})?\n\nThis action cannot be undone and can be performed by Admin only.`;
    if (window.confirm(confirmMsg)) {
      setIsDeletingCustomer(true);
      try {
        deleteAccount(account.accountId);
        onClose();
      } catch (err: any) {
        alert(err?.message || 'Failed to delete customer.');
        setIsDeletingCustomer(false);
      }
    }
  };

  const handleMarkCustomerForDeletion = () => {
    if (!account) return;
    const confirmMsg = `Mark customer "${account.customerName}" (${account.accountId}) for permanent deletion?\n\nThis will send a deletion request to Admin for final review and removal.`;
    if (window.confirm(confirmMsg)) {
      setIsMarkingForDeletion(true);
      markAccountForDeletion(account.accountId);
      setIsMarkingForDeletion(false);
      setSaveSuccessMsg('Customer marked for permanent deletion. Admin notified.');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    }
  };

  // Local state for interactive note entry
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState('General');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'uploaded_data' | 'accounts' | 'documents' | 'notes' | 'actions'
  >('overview');
  const [uploadedFieldFilter, setUploadedFieldFilter] = useState('');

  // Editing Customer Location & Details
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: account?.customerName || '',
    mobile: account?.mobile || '',
    alternateMobile: account?.alternateMobile || '',
    city: account?.city || 'N/A',
    area: account?.area || 'N/A',
    zone: account?.zone || 'N/A',
    coordinates: account?.coordinates || '',
    branch: account?.branch || 'Main Branch',
    address: account?.address || '',
    npaDate: account?.npaDate || '',
    riskClassification: account?.riskClassification || 'Medium Risk',
    latestRemark: account?.latestRemark || '',
  });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Sub-action modals
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [showPTP, setShowPTP] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [showDocUpload, setShowDocUpload] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showOTSScheme, setShowOTSScheme] = useState(false);
  const [showWhatsAppOTSOffer, setShowWhatsAppOTSOffer] = useState(false);

  // Sync edit form on account change
  React.useEffect(() => {
    if (account) {
      setEditForm({
        customerName: account.customerName || '',
        mobile: account.mobile || '',
        alternateMobile: account.alternateMobile || '',
        city: account.city || 'N/A',
        area: account.area || 'N/A',
        zone: account.zone || 'N/A',
        coordinates: account.coordinates || '',
        branch: account.branch || 'Main Branch',
        address: account.address || '',
        npaDate: account.npaDate || '',
        riskClassification: account.riskClassification || 'Medium Risk',
        latestRemark: account.latestRemark || '',
      });
      setIsEditingDetails(false);
      setSaveSuccessMsg('');
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const handleSaveDetails = (e: React.FormEvent) => {
    e.preventDefault();
    updateAccount(account.accountId, {
      customerName: editForm.customerName,
      mobile: editForm.mobile,
      alternateMobile: editForm.alternateMobile,
      city: editForm.city,
      area: editForm.area,
      zone: editForm.zone,
      coordinates: editForm.coordinates,
      branch: editForm.branch,
      address: editForm.address,
      npaDate: editForm.npaDate,
      riskClassification: editForm.riskClassification,
      latestRemark: editForm.latestRemark,
    });
    setIsEditingDetails(false);
    setSaveSuccessMsg('Customer details updated successfully!');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  // Find all genuine linked accounts for this customer
  const relatedAccounts: Account[] = [];
  const linkedIds = new Set<string>();

  // 1. Add current account
  relatedAccounts.push(account);
  linkedIds.add(account.accountId);

  // 2. Add accounts by explicit linkedAccountIds
  if (account.linkedAccountIds && account.linkedAccountIds.length > 0) {
    account.linkedAccountIds.forEach((id) => {
      if (!linkedIds.has(id)) {
        const found = accounts.find((a) => a.accountId === id || a.id === id);
        if (found) {
          relatedAccounts.push(found);
          linkedIds.add(found.accountId);
        }
      }
    });
  }

  // 3. Match accounts belonging to the exact same customer CIF / Customer Code or exact Phone & Name match
  accounts.forEach((a) => {
    if (!linkedIds.has(a.accountId)) {
      const sameCif =
        account.customerCode &&
        a.customerCode &&
        account.customerCode.trim().toUpperCase() === a.customerCode.trim().toUpperCase();

      const sameNameAndPhone =
        account.customerName &&
        a.customerName &&
        account.customerName.trim().toLowerCase() === a.customerName.trim().toLowerCase() &&
        account.mobile &&
        a.mobile &&
        account.mobile.replace(/\D/g, '') === a.mobile.replace(/\D/g, '') &&
        account.mobile.replace(/\D/g, '').length >= 10;

      if (sameCif || sameNameAndPhone) {
        relatedAccounts.push(a);
        linkedIds.add(a.accountId);
      }
    }
  });

  const isMultiple = relatedAccounts.length > 1 || account.isMultipleAccount;
  const totalOutstanding = relatedAccounts.reduce((sum, a) => sum + (a.outstandingAmount || 0), 0);
  const totalSanction = relatedAccounts.reduce((sum, a) => sum + (a.sanctionAmount || 0), 0);
  const totalEMI = relatedAccounts.reduce((sum, a) => sum + (a.emi || 0), 0);
  const totalRecovered = relatedAccounts.reduce((sum, a) => sum + (a.totalRecovered || 0), 0);

  // Attached media/documents for all related accounts
  const accountDocs = documents.filter(
    (d) => d.accountId === account.accountId || relatedAccounts.some((r) => r.accountId === d.accountId)
  );
  const accountPhotos = photos.filter(
    (p) => p.accountId === account.accountId || relatedAccounts.some((r) => r.accountId === p.accountId)
  );
  const accountVoices = voiceNotes.filter(
    (v) => v.accountId === account.accountId || relatedAccounts.some((r) => r.accountId === v.accountId)
  );

  // Combine notes from all related accounts
  const allNotes = relatedAccounts.flatMap((a) =>
    (a.agentNotesHistory || []).map((n) => ({
      ...n,
      accountLoanNumber: a.loanNumber,
      accountFacility: a.facility || a.loanType,
    }))
  );
  // Sort descending by date
  allNotes.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  const handleAddInlineNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;

    addAgentNote(account.accountId, newNoteText.trim(), newNoteCategory);
    setNewNoteText('');
  };

  const handleInitiateVisit = () => {
    startFieldVisit(account.accountId);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans animate-in fade-in duration-200">
        <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl text-slate-800 overflow-hidden">
          
          {/* Top Bar / Header - Clean & Organized */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-600 to-blue-700 text-white flex items-start justify-between border-b border-blue-800 shadow-sm">
            <div className="flex items-start gap-4 flex-1">
              {/* Avatar */}
              <div className="w-14 h-14 rounded-xl bg-white/20 border border-white/30 flex items-center justify-center text-white font-black text-xl shrink-0">
                {account.customerName ? account.customerName.charAt(0).toUpperCase() : 'C'}
              </div>
              
              {/* Main Info */}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-white mb-2 truncate">
                  {account.customerName}
                </h2>
                
                {/* Status Badges - Horizontal Row */}
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  {/* Account Status */}
                  <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                    account.accountStatus === 'Active' ? 'bg-emerald-500/20 text-emerald-100 border-emerald-300/50' :
                    account.accountStatus === 'PTP' ? 'bg-amber-500/20 text-amber-100 border-amber-300/50' :
                    account.accountStatus === 'Settled' ? 'bg-blue-500/20 text-blue-100 border-blue-300/50' :
                    'bg-red-500/20 text-red-100 border-red-300/50'
                  }`}>
                    {account.accountStatus}
                  </span>
                  
                  {/* Multi-Account Badge */}
                  {relatedAccounts.length > 1 && (
                    <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-500/20 text-purple-100 border border-purple-300/50">
                      <Layers className="w-3.5 h-3.5" />
                      {relatedAccounts.length} Accounts
                    </span>
                  )}
                  
                  {/* Risk Classification */}
                  {account.riskClassification && (
                    <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-100 border border-amber-300/50">
                      ⚠️ {account.riskClassification}
                    </span>
                  )}
                </div>

                {/* Key Identifiers - Horizontal List */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-blue-100">
                  <div>
                    <span className="opacity-75">CIF</span><br/>
                    <strong className="text-white font-mono text-sm">{account.customerCode || account.accountId}</strong>
                  </div>
                  <div>
                    <span className="opacity-75">Loan</span><br/>
                    <strong className="text-white font-mono text-sm">{account.loanNumber}</strong>
                  </div>
                  <div>
                    <span className="opacity-75">Branch</span><br/>
                    <strong className="text-white text-sm">{account.branch}</strong>
                  </div>
                  {account.coordinates && (
                    <div>
                      <span className="opacity-75">Coordinates</span><br/>
                      <strong className="text-blue-200 font-mono text-xs">{account.coordinates}</strong>
                    </div>
                  )}
                </div>

                {/* Star Rating - Separate Row */}
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-xs text-blue-100 font-semibold">Customer Rating:</span>
                  <StarRating
                    rating={account.customerStarRating || 0}
                    onChange={(newRating) => updateCustomerStarRating(account.accountId, newRating)}
                    size="sm"
                    showLabel
                    showPrimeBadge
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {account.markedForDeletion && (
                <span className="px-2.5 py-1 bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-lg text-xs font-bold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Marked for Deletion</span>
                </span>
              )}

              {/* Close or Delete Account Button */}
              <button
                type="button"
                onClick={() => setShowCloseAccountModal(true)}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
                title="Close Account as per OTS or Regular Close, or Delete & Archive"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Close / Delete Account</span>
              </button>

              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 p-4 bg-slate-50 border-b border-slate-200">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-0.5">
                <span>{isMultiple ? 'Total Outstanding' : 'Loan Balance'}</span>
                <DollarSign className="w-3.5 h-3.5 text-red-500" />
              </div>
              <p className="text-base sm:text-lg font-black text-slate-900 font-mono">
                {formatINR(totalOutstanding)}
              </p>
              {isMultiple ? (
                <span className="text-[10px] text-purple-600 font-medium">Across {relatedAccounts.length} loan accounts</span>
              ) : (
                <span className="text-[10px] text-slate-500">1 Loan Account</span>
              )}
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-0.5">
                <span>Total Loan Accounts</span>
                <Layers className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <p className="text-base sm:text-lg font-black text-blue-600 font-mono">
                {relatedAccounts.length} {relatedAccounts.length === 1 ? 'Loan' : 'Loans'}
              </p>
              <span className="text-[10px] text-slate-600 font-medium">NPA Date: {account.npaDate || 'N/A'}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-0.5">
                <span>Total Limit / Sanction</span>
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-base sm:text-lg font-black text-slate-800 font-mono">
                {formatINR(totalSanction)}
              </p>
              <span className="text-[10px] text-emerald-600 font-medium">Recovered: {formatINR(totalRecovered)}</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium mb-0.5">
                <span>Assigned Agent</span>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-xs sm:text-sm font-bold text-slate-800 truncate">
                {account.assignedAgentName || 'N/A'}
              </p>
              <span className="text-[10px] text-slate-500 font-mono">{account.assignedAgentId || 'N/A'}</span>
            </div>
          </div>

          {/* Save Success Banner */}
          {saveSuccessMsg && (
            <div className="mx-4 mt-3 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                {saveSuccessMsg}
              </span>
              <button onClick={() => setSaveSuccessMsg('')} className="text-emerald-700 hover:text-emerald-900">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* OTS Scheme Status Banner */}
          <div
            id="customer-ots-status-banner"
            className="mx-4 mt-3 p-3.5 bg-gradient-to-r from-indigo-50 via-slate-50 to-blue-50 border border-indigo-200 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Calculator className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-950">One-Time Settlement (OTS) Scheme</span>
                  {account.otsStatus === 'OTS Confirmed' ? (
                    <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full font-bold text-[10px]">
                      OTS Confirmed &amp; Locked
                    </span>
                  ) : account.otsStatus === 'OTS Cancelled' ? (
                    <span className="px-2 py-0.5 bg-rose-100 border border-rose-300 text-rose-800 rounded-full font-bold text-[10px]">
                      OTS Cancelled
                    </span>
                  ) : account.otsActive ? (
                    <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-full font-bold text-[10px]">
                      OTS Applied
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded-full font-semibold text-[10px]">
                      Valid till 30-Sep-2026
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-600 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono">
                  <span>Orig Outstanding: <strong>₹{(account.originalOutstandingAmount || totalOutstanding).toLocaleString('en-IN')}</strong></span>
                  {account.finalOTSAmount ? (
                    <>
                      <span className="text-blue-700">Final Settlement: <strong>₹{account.finalOTSAmount.toLocaleString('en-IN')}</strong></span>
                      <span className="text-emerald-700">Actual Concession: <strong>₹{(account.actualConcessionAmount || 0).toLocaleString('en-IN')}</strong></span>
                    </>
                  ) : (
                    <span className="text-slate-500 font-sans">NPA Date: {account.npaDate || 'None'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="header-open-ots-modal-btn"
                type="button"
                onClick={() => setShowOTSScheme(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>{account.otsActive ? 'View / Modify OTS' : 'Calculate OTS'}</span>
              </button>

              <button
                id="header-open-whatsapp-modal-btn"
                type="button"
                onClick={() => {
                  setShowWhatsAppOTSOffer(true);
                }}
                className="px-3 py-1.5 font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                title="Send WhatsApp OTS Offer"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>📱 WhatsApp OTS Offer</span>
              </button>

              <button
                type="button"
                onClick={() => setShowCloseAccountModal(true)}
                className="px-3 py-1.5 font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer bg-slate-800 hover:bg-slate-900 text-white"
                title="Close Account as per OTS or Regular Close"
              >
                <Archive className="w-3.5 h-3.5 text-rose-400" />
                <span>Close / Delete Account</span>
              </button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 px-4 bg-white text-xs font-semibold overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Customer Details</span>
            </button>

            <button
              onClick={() => setActiveTab('uploaded_data')}
              className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'uploaded_data'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
              <span>Uploaded Master Record</span>
            </button>

            <button
              onClick={() => setActiveTab('accounts')}
              className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'accounts'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>All Accounts ({relatedAccounts.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('documents')}
              className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'documents'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileText className="w-4 h-4 text-purple-600" />
              <span>Documents &amp; Media ({accountDocs.length + accountPhotos.length + accountVoices.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'notes'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Agent Notes ({allNotes.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('actions')}
              className={`py-2.5 px-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer ${
                activeTab === 'actions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Recovery Actions</span>
            </button>
          </div>

          {/* Scrollable Content Area */}
          <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
            
            {/* TAB 1: CUSTOMER DETAILS OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                
                {/* Location & Territory Header with Edit Toggle */}
                <div className="flex items-center justify-between bg-blue-50/70 p-3 rounded-xl border border-blue-200">
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-blue-700" />
                      Assigned Location &amp; Risk Profile
                    </span>
                    <p className="text-[11px] text-blue-700">
                      City: <strong>{account.city || 'N/A'}</strong> | Area: <strong>{account.area || 'N/A'}</strong> | Zone: <strong>{account.zone || 'N/A'}</strong> | Branch: <strong>{account.branch}</strong>
                    </p>
                    <p className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3">
                      <span>
                        Coordinates: <strong className="text-blue-900 font-mono">{account.coordinates || (typeof account.latitude === 'number' && typeof account.longitude === 'number' ? `${account.latitude.toFixed(4)}, ${account.longitude.toFixed(4)}` : 'N/A')}</strong>
                      </span>
                      {account.coordinates && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(account.coordinates)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                        >
                          <Navigation className="w-3 h-3" />
                          <span>View on Maps</span>
                        </a>
                      )}
                      <span>Risk Category: <strong className="text-amber-700 font-semibold">{account.riskClassification || 'Medium Risk'}</strong></span>
                      {account.latestRemark && (
                        <span>Remark: <strong className="text-slate-800 italic font-medium">"{account.latestRemark}"</strong></span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => setIsEditingDetails(!isEditingDetails)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {isEditingDetails ? 'Cancel Edit' : 'Edit Details & Risk Profile'}
                  </button>
                </div>

                {/* Inline Location & Details Editor Form */}
                {isEditingDetails && (
                  <form onSubmit={handleSaveDetails} className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-3 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h4 className="text-xs font-bold text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-blue-400" />
                        Update Coordinates, City, Area, Risk &amp; Remark
                      </h4>
                      <span className="text-[10px] text-slate-400">Updates live across all views</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                          City:
                        </label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          placeholder="e.g. Chhatrapati Sambhajinagar, Pune"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                          Area:
                        </label>
                        <input
                          type="text"
                          value={editForm.area}
                          onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                          placeholder="e.g. Samarth Nagar, Mill Corner, CIDCO"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                          GPS Coordinates:
                        </label>
                        <input
                          type="text"
                          value={editForm.coordinates}
                          onChange={(e) => setEditForm({ ...editForm, coordinates: e.target.value })}
                          placeholder="e.g. 19.8762, 75.3433"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                          Branch Name:
                        </label>
                        <input
                          type="text"
                          value={editForm.branch}
                          onChange={(e) => setEditForm({ ...editForm, branch: e.target.value })}
                          placeholder="e.g. Main Branch, Mill Corner Branch"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                          Customer Risk Classification:
                        </label>
                        <select
                          value={editForm.riskClassification}
                          onChange={(e) => setEditForm({ ...editForm, riskClassification: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        >
                          <option value="Low Risk">Low Risk</option>
                          <option value="Medium Risk">Medium Risk</option>
                          <option value="High Risk">High Risk</option>
                          <option value="Critical NPA">Critical NPA</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                          NPA Date {currentUser.role !== 'admin' && <span className="text-amber-400 text-[10px]">(Locked for Agents)</span>}:
                        </label>
                        <input
                          type="text"
                          value={editForm.npaDate}
                          disabled={currentUser.role !== 'admin'}
                          onChange={(e) => setEditForm({ ...editForm, npaDate: e.target.value })}
                          placeholder="e.g. 31/03/2024"
                          className={`w-full border rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                            currentUser.role !== 'admin'
                              ? 'bg-slate-800 text-slate-400 border-slate-700 cursor-not-allowed'
                              : 'bg-slate-950 text-white border-slate-700'
                          }`}
                          title={currentUser.role !== 'admin' ? 'NPA Date can only be modified by Bank/Admin' : 'Admin editable NPA Date'}
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[11px] text-slate-300 font-semibold">
                            Agent Remark (15 words limit):
                          </label>
                          <span className={`text-[10px] ${
                            editForm.latestRemark.trim().split(/\s+/).filter(Boolean).length > 15
                              ? 'text-rose-400 font-bold'
                              : 'text-slate-400'
                          }`}>
                            {editForm.latestRemark.trim().split(/\s+/).filter(Boolean).length} / 15 words
                          </span>
                        </div>
                        <input
                          type="text"
                          value={editForm.latestRemark}
                          onChange={(e) => {
                            const val = e.target.value;
                            const words = val.trim().split(/\s+/).filter(Boolean);
                            if (words.length <= 15 || val.length < editForm.latestRemark.length) {
                              setEditForm({ ...editForm, latestRemark: val });
                            }
                          }}
                          placeholder="Enter concise agent field remark (max 15 words)"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] text-slate-300 font-semibold mb-1">
                          Registered Full Address:
                        </label>
                        <textarea
                          rows={2}
                          value={editForm.address}
                          onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => setIsEditingDetails(false)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Save Location &amp; Details</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Contact & Address Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Contact Information */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Phone className="w-4 h-4 text-blue-600" />
                      Contact &amp; Communication Channels
                    </h4>
                    
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Primary Mobile</span>
                          <span className="font-bold text-slate-900 font-mono">{account.mobile}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`tel:${account.mobile}`}
                            className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition"
                            title="Call customer"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                          <a
                            href={`https://wa.me/${account.mobile.replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(account.customerName)},%20this%20is%20regarding%20your%20NPA%20loan%20account%20${account.loanNumber}.%20Please%20contact%20us%20to%20clear%20the%20pending%20overdue%20amount.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg transition"
                            title="Send WhatsApp notice"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </a>
                        </div>
                      </div>

                      {account.alternateMobile && (
                        <div className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-slate-200">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Alternate / Guarantor Mobile</span>
                            <span className="font-bold text-slate-900 font-mono">{account.alternateMobile}</span>
                          </div>
                          <a
                            href={`tel:${account.alternateMobile}`}
                            className="p-1.5 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                          >
                            <PhoneCall className="w-4 h-4" />
                          </a>
                        </div>
                      )}

                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] text-slate-700 font-bold flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                            <span>Customer Classification (0 - 5 Stars)</span>
                          </span>
                          {account.isPrimeCustomer && (
                            <span className="px-2 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-black text-[10px] rounded-full shadow-xs uppercase tracking-wider">
                              ⭐ Prime Customer
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500">
                          Click stars to classify customer. 4 &amp; 5 stars classify customer as Prime for daily priority tracking. Agents can update rating anytime.
                        </p>
                        <div className="pt-1">
                          <StarRating
                            rating={account.customerStarRating || 0}
                            onChange={(newRating) => updateCustomerStarRating(account.accountId, newRating)}
                            size="md"
                            showLabel
                            showPrimeBadge
                          />
                        </div>
                      </div>

                      <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                        <span className="text-[10px] text-slate-500 block">Customer Risk Classification</span>
                        <span className="font-bold text-slate-800">{account.customerCategory || 'NPA Priority'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Address & Geo-location */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-red-600" />
                      Registered Address &amp; Territory
                    </h4>

                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Full Residential / Office Address:</span>
                        <p className="text-slate-800 font-medium leading-relaxed mt-0.5">
                          {account.address}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 text-[11px]">
                        <div>
                          <span className="text-slate-500 block">City:</span>
                          <span className="font-semibold text-slate-800">{account.city || 'Pune'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Area:</span>
                          <span className="font-semibold text-slate-800">{account.area || 'Pune Metro'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Zone:</span>
                          <span className="font-semibold text-slate-800">{account.zone || 'West Zone'}</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                        <div className="text-[11px]">
                          <span className="text-slate-500 block">Coordinates:</span>
                          <span className="font-mono text-slate-700">
                            {typeof account.latitude === 'number' && typeof account.longitude === 'number'
                              ? `${account.latitude.toFixed(4)}° N, ${account.longitude.toFixed(4)}° E`
                              : (account.coordinates || 'N/A')}
                          </span>
                        </div>
                        {typeof account.latitude === 'number' && typeof account.longitude === 'number' ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${account.latitude},${account.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs transition"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Open in Maps</span>
                          </a>
                        ) : account.coordinates ? (
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(account.coordinates)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold text-xs transition"
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>Open in Maps</span>
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Multi-Account Snapshot Table */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Consolidated Account Breakdown ({relatedAccounts.length} Loans)
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Total Outstanding: <strong className="text-slate-900 font-mono">{formatINR(totalOutstanding)}</strong>
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="py-2.5 px-3">Loan / Acc No.</th>
                          <th className="py-2.5 px-3">Facility / Product</th>
                          <th className="py-2.5 px-3 text-right">Sanction Amount</th>
                          <th className="py-2.5 px-3 text-right">Loan Balance</th>
                          <th className="py-2.5 px-3 text-center">NPA Date</th>
                          <th className="py-2.5 px-3 text-right">Overdue Amount</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 font-sans">
                        {relatedAccounts.map((acc, idx) => (
                          <tr
                            key={acc.accountId}
                            className={`hover:bg-blue-50/50 transition ${
                              acc.accountId === account.accountId ? 'bg-blue-50/30 font-medium' : ''
                            }`}
                          >
                            <td className="py-2.5 px-3">
                              <div className="font-mono font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{acc.loanNumber}</span>
                                {acc.accountId === account.accountId && (
                                  <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded font-bold">
                                    Current
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500">{acc.accountId}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-800">{acc.facility || acc.loanType}</span>
                              <span className="text-[10px] text-slate-500 block">{acc.branch}</span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono text-slate-700">
                              {formatINR(acc.sanctionAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-red-600">
                              {formatINR(acc.outstandingAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 font-mono text-[11px] border border-amber-200">
                                {acc.npaDate || '31/03/2024'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-600">
                              {formatINR(acc.overdueAmount)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                acc.accountStatus === 'Recovered' ? 'bg-emerald-100 text-emerald-800' :
                                acc.accountStatus === 'PTP Pending' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {acc.accountStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Latest Agent Note Banner */}
                {allNotes.length > 0 && (
                  <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-900 flex items-center gap-1.5">
                        <MessageSquare className="w-4 h-4 text-amber-700" />
                        Latest Agent Note ({allNotes[0].date})
                      </span>
                      <span className="text-[11px] text-amber-700 font-medium">
                        By {allNotes[0].agentName}
                      </span>
                    </div>
                    <p className="text-xs text-slate-800 leading-relaxed font-medium">
                      "{allNotes[0].note}"
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* TAB: UPLOADED MASTER RECORD & BANK EXCEL COLUMNS */}
            {activeTab === 'uploaded_data' && (
              <div className="space-y-4">
                {/* Header with Search and Stats */}
                <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-xs">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        Uploaded Bank Master Record
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono">
                          100% Data Preserved
                        </span>
                      </h4>
                      <p className="text-xs text-slate-400">
                        Complete raw &amp; structured parameters imported from Bank / NBFC Excel file.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:w-64">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search uploaded fields..."
                        value={uploadedFieldFilter}
                        onChange={(e) => setUploadedFieldFilter(e.target.value)}
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-800 border border-slate-700 text-white rounded-lg text-xs placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const payload = {
                          ...account,
                          customFields: account.customFields || {},
                        };
                        navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
                        alert('Uploaded customer record copied to clipboard as JSON!');
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </button>
                  </div>
                </div>

                {/* 14 Standard Master Columns Grid */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-blue-600" />
                      Standard Bank Master Fields (14 Core Columns)
                    </h5>
                    <span className="text-[11px] text-slate-500 font-mono">
                      CIF: {account.customerCode || account.accountId}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 text-xs">
                    {[
                      { key: 'BRANCH_COD', label: 'Branch Code', val: account.branchCode || 'BR-01' },
                      { key: 'BRANCH_NAME', label: 'Branch Name', val: account.branch || 'Pune Central' },
                      { key: 'ACCT_NO', label: 'Account / Loan No.', val: account.loanNumber, highlight: true },
                      { key: 'NAME', label: 'Customer Full Name', val: account.customerName, highlight: true },
                      { key: 'PROD_DESC', label: 'Product Description', val: account.loanType },
                      { key: 'FACILITY', label: 'Facility Type', val: account.facility || account.loanType },
                      { key: 'LIMIT_SANCTI', label: 'Sanction Limit', val: formatINR(account.sanctionAmount), mono: true },
                      { key: 'LOAN_B', label: 'Loan Outstanding Balance', val: formatINR(account.outstandingAmount), mono: true, color: 'text-red-600 font-bold' },
                      { key: 'NPA_DT', label: 'NPA Date', val: account.npaDate || '31/03/2024', mono: true, color: 'text-amber-700 font-bold' },
                      { key: 'CONTACT NO.', label: 'Primary Contact Mobile', val: account.mobile, mono: true },
                      { key: 'CUSTOMER_BALANCE', label: 'Customer Balance (Total Overdue)', val: formatINR(account.customerBalance || account.overdueAmount || account.outstandingAmount), mono: true, color: 'text-amber-600 font-bold' },
                      { key: 'CITY', label: 'Customer City', val: account.city || 'Pune' },
                      { key: 'AREA', label: 'Territory Area', val: account.area || 'Pune Metro' },
                      { key: 'ZONE', label: 'Administrative Zone', val: account.zone || 'West Zone' },
                      { key: 'ADDRESS', label: 'Registered Address', val: account.address },
                      { key: 'AGENT_ID', label: 'Allocated Agent ID', val: account.assignedAgentId || 'Unassigned', mono: true },
                      { key: 'AGENT_NAME', label: 'Allocated Agent Name', val: account.assignedAgentName || 'Unallocated' },
                      { key: 'STATUS', label: 'Account Recovery Status', val: account.accountStatus },
                      { key: 'RISK_CATEGORY', label: 'Risk Category', val: account.customerCategory || 'NPA Standard' },
                    ]
                      .filter(
                        (item) =>
                          !uploadedFieldFilter ||
                          item.key.toLowerCase().includes(uploadedFieldFilter.toLowerCase()) ||
                          item.label.toLowerCase().includes(uploadedFieldFilter.toLowerCase()) ||
                          String(item.val).toLowerCase().includes(uploadedFieldFilter.toLowerCase())
                      )
                      .map((item) => (
                        <div key={item.key} className="p-3 bg-white space-y-1">
                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>{item.key}</span>
                            <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">{item.label}</span>
                          </div>
                          <p className={`text-xs ${item.color || 'text-slate-900'} ${item.mono ? 'font-mono' : ''} ${item.highlight ? 'font-bold' : 'font-medium'} break-words`}>
                            {item.val || '—'}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Additional / Custom Fields from Excel */}
                {account.customFields && Object.keys(account.customFields).length > 0 && (
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                    <div className="px-4 py-3 bg-indigo-50 border-b border-indigo-100 flex items-center justify-between">
                      <h5 className="text-xs font-bold text-indigo-900 uppercase tracking-wider flex items-center gap-2">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        Custom &amp; Extended Spreadsheet Columns ({Object.keys(account.customFields).length} Columns)
                      </h5>
                      <span className="text-[11px] text-indigo-700 font-medium">Auto-mapped from Uploaded File</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 text-xs">
                      {Object.entries(account.customFields)
                        .filter(
                          ([k, v]) =>
                            !uploadedFieldFilter ||
                            k.toLowerCase().includes(uploadedFieldFilter.toLowerCase()) ||
                            String(v).toLowerCase().includes(uploadedFieldFilter.toLowerCase())
                        )
                        .map(([key, value]) => (
                          <div key={key} className="p-3 bg-white space-y-1">
                            <span className="text-[10px] font-mono text-indigo-600 font-bold block">{key}</span>
                            <p className="text-xs text-slate-800 font-medium break-words font-mono">
                              {typeof value === 'object' ? JSON.stringify(value) : String(value || '—')}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Multi-Account Association Intelligence */}
                {isMultiple && (
                  <div className="bg-purple-50 p-4 rounded-xl border border-purple-200 space-y-3">
                    <h5 className="text-xs font-bold text-purple-900 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-600" />
                      Consolidated Multi-Account Cross-Reference
                    </h5>
                    <p className="text-xs text-purple-800 leading-relaxed">
                      Our system grouped <strong>{relatedAccounts.length} loans</strong> for this customer because they share identical 
                      outstanding balance (₹{account.outstandingAmount.toLocaleString('en-IN')}), NPA Date ({account.npaDate || 'Recorded'}), and borrower identity ({account.customerName}).
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {relatedAccounts.map((r, i) => (
                        <div key={r.accountId} className="p-2.5 bg-white rounded-lg border border-purple-200 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] text-purple-600 font-bold block">Loan #{i + 1}</span>
                            <span className="font-mono font-bold text-slate-800">{r.loanNumber}</span>
                            <span className="text-[11px] text-slate-500 block">{r.facility || r.loanType}</span>
                          </div>
                          <div className="text-right">
                            <span className="font-mono font-bold text-red-600 block">{formatINR(r.outstandingAmount)}</span>
                            <span className="text-[10px] text-slate-500">{r.branch}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB: DOCUMENTS & MEDIA (KYC, Geotagged Photos, Voice Notes, Google Drive) */}
            {activeTab === 'documents' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <FileText className="w-4 h-4 text-purple-600" />
                    Customer Documents &amp; Field Media
                  </h4>
                  <button
                    onClick={() => setShowDocUpload(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Attach Document</span>
                  </button>
                </div>

                {/* Uploaded Documents List */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span>KYC &amp; Legal Notices ({accountDocs.length})</span>
                    <span className="text-[10px] text-slate-500">Synced to Google Drive / Server</span>
                  </div>

                  {accountDocs.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No KYC documents uploaded yet. Click "Attach Document" to add Aadhaar, PAN, or Demand Notices.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {accountDocs.map((doc, idx) => (
                        <div key={doc.id || `doc-${idx}`} className="p-3 flex items-center justify-between hover:bg-slate-50 transition">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <h6 className="font-bold text-slate-900">{doc.name}</h6>
                              <p className="text-[11px] text-slate-500">
                                {doc.category} • Uploaded {doc.uploadedAt} by {doc.uploadedBy}
                              </p>
                            </div>
                          </div>
                          <a
                            href={doc.fileUrl || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg flex items-center gap-1 text-[11px] transition"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>View</span>
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Geotagged Field Photos */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-blue-600" />
                      Geotagged Watermarked Photos ({accountPhotos.length})
                    </span>
                    <span className="text-[10px] text-slate-500">GPS Timestamp &amp; Agent Tagged</span>
                  </div>

                  {accountPhotos.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No field visit photos captured yet for this borrower. Photos taken during mobile app visits appear here.
                    </div>
                  ) : (
                    <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {accountPhotos.map((photo, idx) => (
                        <div key={photo.id || `photo-${idx}`} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <img
                            src={photo.url}
                            alt="Field visit evidence"
                            className="w-full h-32 object-cover rounded-lg border border-slate-200"
                            referrerPolicy="no-referrer"
                          />
                          <div className="text-[11px] text-slate-600 space-y-0.5">
                            <div className="flex items-center justify-between font-bold text-slate-800">
                              <span>{photo.caption || 'Field Visit Photo'}</span>
                              <span className="font-mono text-[10px] text-slate-500">{photo.timestamp}</span>
                            </div>
                            <div className="text-[10px] text-slate-500 flex items-center gap-1 font-mono">
                              <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                              <span>
                                {photo.location && typeof photo.location.latitude === 'number' && typeof photo.location.longitude === 'number'
                                  ? `${photo.location.latitude.toFixed(4)}, ${photo.location.longitude.toFixed(4)}`
                                  : 'GPS Verified'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Voice Notes */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Mic className="w-3.5 h-3.5 text-red-600" />
                      Audio &amp; Voice Interaction Recordings ({accountVoices.length})
                    </span>
                    <span className="text-[10px] text-slate-500">Call &amp; Visit Audio</span>
                  </div>

                  {accountVoices.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No voice recordings logged yet. Field agents can record audio notes on the Android app.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 text-xs">
                      {accountVoices.map((voice, idx) => (
                        <div key={voice.id || `voice-${idx}`} className="p-3 flex items-center justify-between">
                          <div>
                            <h6 className="font-bold text-slate-800">{voice.title || 'Voice Note'}</h6>
                            <p className="text-[11px] text-slate-500">
                              Recorded at {voice.timestamp} • Duration: {voice.duration || '0:45'}s
                            </p>
                          </div>
                          {voice.audioUrl && voice.audioUrl !== 'mock_audio_url' ? (
                            <audio controls preload="none" className="h-8 max-w-[200px]" src={voice.audioUrl}>
                              Your browser does not support audio playback.
                            </audio>
                          ) : (
                            <span className="text-[10px] font-mono text-pink-700 bg-pink-50 px-2.5 py-1 rounded border border-pink-200">
                              Google Drive Audio Linked
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: ALL ACCOUNTS FULL DETAIL CARDS */}
            {activeTab === 'accounts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    {relatedAccounts.length} Linked Accounts for {account.customerName}
                  </h4>
                  <span className="text-xs text-slate-500">
                    Grouped by Balance + NPA Date Matching
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {relatedAccounts.map((acc, index) => (
                    <div
                      key={acc.accountId || `acc-card-${index}`}
                      className={`p-4 rounded-xl border transition shadow-xs ${
                        acc.accountId === account.accountId
                          ? 'bg-blue-50/40 border-blue-300 ring-1 ring-blue-300'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-slate-800 text-white font-bold text-[10px] flex items-center justify-center">
                              {index + 1}
                            </span>
                            <h5 className="font-bold text-sm text-slate-900 font-mono">
                              {acc.loanNumber}
                            </h5>
                          </div>
                          <span className="text-xs text-slate-500 font-medium block ml-7">
                            {acc.facility || acc.loanType} • {acc.branch}
                          </span>
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          acc.accountStatus === 'Recovered' ? 'bg-emerald-100 text-emerald-800' :
                          acc.accountStatus === 'PTP Pending' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {acc.accountStatus}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200/80 mb-3">
                        <div>
                          <span className="text-[10px] text-slate-500 block">Outstanding Balance</span>
                          <span className="font-bold text-red-600 font-mono text-sm">
                            {formatINR(acc.outstandingAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Overdue Amount</span>
                          <span className="font-bold text-amber-600 font-mono text-sm">
                            {formatINR(acc.overdueAmount)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">NPA Date</span>
                          <span className="font-semibold text-slate-800 font-mono text-xs">
                            {acc.npaDate || '31/03/2024'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">Monthly EMI</span>
                          <span className="font-semibold text-slate-800 font-mono text-xs">
                            {formatINR(acc.emi)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-[11px] text-slate-500">
                          Sanction Limit: <strong className="text-slate-800">{formatINR(acc.sanctionAmount)}</strong>
                        </span>
                        {onSelectLinkedAccount && acc.accountId !== account.accountId && (
                          <button
                            onClick={() => onSelectLinkedAccount(acc.accountId)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                          >
                            <span>Inspect This Loan</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: AGENT NOTES HISTORY & INLINE COMPOSER */}
            {activeTab === 'notes' && (
              <div className="space-y-4">
                {/* Add Note Composer Box */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4 text-blue-600" />
                    Record Agent Note for Customer ({account.customerName})
                  </h4>

                  <form onSubmit={handleAddInlineNote} className="space-y-3 text-xs">
                    <div className="flex flex-wrap gap-2">
                      {['General', 'PTP Commitment', 'Field Visit', 'Customer Dispute', 'Payment Promise', 'Skipped'].map((cat) => (
                        <button
                          key={`note-cat-${cat}`}
                          type="button"
                          onClick={() => setNewNoteCategory(cat)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer ${
                            newNoteCategory === cat
                              ? 'bg-blue-600 text-white font-bold'
                              : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>

                    <textarea
                      rows={3}
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      placeholder="Add specific note, ground remarks, dispute details, customer commitments, or visit findings..."
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
                    />

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Author: <strong>{currentUser.name}</strong> ({currentUser.agentId || currentUser.role})
                      </span>
                      <button
                        type="submit"
                        disabled={!newNoteText.trim()}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Save Agent Note</span>
                      </button>
                    </div>
                  </form>
                </div>

                {/* Chronological Notes Feed */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Agent Notes History ({allNotes.length})
                    </h4>
                  </div>

                  {allNotes.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-500 text-xs font-medium">No agent notes recorded yet.</p>
                      <p className="text-slate-400 text-[11px] mt-0.5">Use the box above to write the first note for this customer.</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {allNotes.map((note, idx) => (
                        <div
                          key={note.id || `note-${idx}`}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">{note.agentName}</span>
                              <span className="text-[10px] font-mono text-slate-500">({note.agentId})</span>
                              <span className="px-2 py-0.2 rounded-md bg-blue-50 text-blue-700 font-semibold text-[10px] border border-blue-200">
                                {note.category || 'General'}
                              </span>
                              {note.accountLoanNumber && (
                                <span className="text-[10px] text-slate-400 font-mono">
                                  • Loan: {note.accountLoanNumber}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {note.date} {note.time}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 font-medium leading-relaxed whitespace-pre-wrap pl-1 border-l-2 border-blue-500">
                            {note.note}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: RECOVERY ACTIONS */}
            {activeTab === 'actions' && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Field &amp; Office Recovery Actions for {account.customerName}
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <button
                    onClick={() => setShowFollowUp(true)}
                    className="p-4 bg-amber-50/60 hover:bg-amber-100/80 border border-amber-200 rounded-xl text-left transition flex items-start gap-3 cursor-pointer"
                  >
                    <div className="p-2.5 bg-amber-500 text-white rounded-lg shrink-0">
                      <PhoneCall className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Record Follow-up Call</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">Log discussion status, customer commitment &amp; next follow-up date.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowPTP(true)}
                    className="p-4 bg-purple-50/60 hover:bg-purple-100/80 border border-purple-200 rounded-xl text-left transition flex items-start gap-3 cursor-pointer"
                  >
                    <div className="p-2.5 bg-purple-600 text-white rounded-lg shrink-0">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Create PTP Commitment</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">Set promised payment date, amount, mode &amp; settlement terms.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowRecovery(true)}
                    className="p-4 bg-emerald-50/60 hover:bg-emerald-100/80 border border-emerald-200 rounded-xl text-left transition flex items-start gap-3 cursor-pointer"
                  >
                    <div className="p-2.5 bg-emerald-600 text-white rounded-lg shrink-0">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Record Payment Recovery</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">Issue e-Receipt, credit 10% agent commission, and sync to Drive.</p>
                    </div>
                  </button>

                  <button
                    onClick={handleInitiateVisit}
                    className="p-4 bg-blue-50/60 hover:bg-blue-100/80 border border-blue-200 rounded-xl text-left transition flex items-start gap-3 cursor-pointer"
                  >
                    <div className="p-2.5 bg-blue-600 text-white rounded-lg shrink-0">
                      <Navigation className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Start Geo-Tagged Field Visit</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">Launch live GPS route, capture watermarked photo &amp; voice notes.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowAddNoteModal(true)}
                    className="p-4 bg-indigo-50/60 hover:bg-indigo-100/80 border border-indigo-200 rounded-xl text-left transition flex items-start gap-3 cursor-pointer"
                  >
                    <div className="p-2.5 bg-indigo-600 text-white rounded-lg shrink-0">
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Add Detailed Agent Note</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">Tag customer behavior, property status, or skip tracing intelligence.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowDocUpload(true)}
                    className="p-4 bg-teal-50/60 hover:bg-teal-100/80 border border-teal-200 rounded-xl text-left transition flex items-start gap-3 cursor-pointer"
                  >
                    <div className="p-2.5 bg-teal-600 text-white rounded-lg shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">Attach Document (Google Picker)</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">Pick borrower KYC, notices, or receipts directly from Google Drive.</p>
                    </div>
                  </button>

                  <button
                    onClick={() => setShowAI(true)}
                    className="p-4 bg-rose-50/60 hover:bg-rose-100/80 border border-rose-200 rounded-xl text-left transition flex items-start gap-3 cursor-pointer"
                  >
                    <div className="p-2.5 bg-rose-600 text-white rounded-lg shrink-0">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">AI Risk &amp; Recovery Strategy</h5>
                      <p className="text-[11px] text-slate-600 mt-0.5">Get Gemini ML default prediction, negotiation tips &amp; WhatsApp script.</p>
                    </div>
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* Bottom Action Footer */}
          <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <a
                href={`tel:${account.mobile}`}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>Call Borrower</span>
              </a>
              <a
                href={`https://wa.me/${account.mobile.replace(/[^0-9]/g, '')}?text=Dear%20${encodeURIComponent(account.customerName)},%20this%20is%20regarding%20your%20loan%20account%20${account.loanNumber}.%20Total%20outstanding%20balance:%20Rs.${totalOutstanding.toLocaleString('en-IN')}.`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-xs transition"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp Notice</span>
              </a>
              <button
                onClick={() => setShowAddNoteModal(true)}
                className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Note</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="footer-open-ots-btn"
                onClick={() => setShowOTSScheme(true)}
                className="px-3.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-950 font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-indigo-700" />
                <span>OTS Scheme</span>
              </button>
              <button
                id="footer-open-whatsapp-ots-btn"
                onClick={() => {
                  setShowWhatsAppOTSOffer(true);
                }}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Send official Marathi OTS offer on WhatsApp"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>📱 WhatsApp OTS</span>
              </button>
              <button
                onClick={() => setShowPTP(true)}
                className="px-3.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold rounded-xl transition cursor-pointer"
              >
                Create PTP
              </button>
              <button
                onClick={() => setShowRecovery(true)}
                className="px-3.5 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold rounded-xl transition cursor-pointer"
              >
                Collect Pay
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-xl transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Sub-modals */}
      <OTSSchemeModal
        account={account}
        isOpen={showOTSScheme}
        onClose={() => setShowOTSScheme(false)}
        onOpenWhatsAppOffer={() => {
          setShowOTSScheme(false);
          setShowWhatsAppOTSOffer(true);
        }}
      />
      <WhatsAppOTSOfferModal
        account={account}
        relatedAccounts={relatedAccounts}
        isOpen={showWhatsAppOTSOffer}
        onClose={() => setShowWhatsAppOTSOffer(false)}
      />
      <LogFollowUpModal
        account={account}
        isOpen={showFollowUp}
        onClose={() => setShowFollowUp(false)}
      />
      <CreatePTPModal
        account={account}
        isOpen={showPTP}
        onClose={() => setShowPTP(false)}
      />
      <RecordRecoveryModal
        account={account}
        relatedAccounts={relatedAccounts}
        isOpen={showRecovery}
        onClose={() => setShowRecovery(false)}
      />
      <UploadDocumentModal
        account={account}
        isOpen={showDocUpload}
        onClose={() => setShowDocUpload(false)}
      />
      <AIRecoveryDrawer
        account={account}
        isOpen={showAI}
        onClose={() => setShowAI(false)}
      />
      <AddAgentNoteModal
        account={account}
        isOpen={showAddNoteModal}
        onClose={() => setShowAddNoteModal(false)}
      />
      <CloseAccountModal
        account={account}
        isOpen={showCloseAccountModal}
        onClose={() => setShowCloseAccountModal(false)}
        onSuccess={() => {
          setShowCloseAccountModal(false);
          onClose();
        }}
      />
    </>
  );
};
