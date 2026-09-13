import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Calculator,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Info,
  Calendar,
  IndianRupee,
  Lock,
  Edit3,
  Send,
  UserCheck,
  Settings,
} from 'lucide-react';
import { Account } from '../../types';
import { useSRMS } from '../../context/SRMSContext';
import {
  evaluateOTSSlab,
  calculateActualConcession,
  OTS_VALID_TILL,
  formatDateDMY,
  parseDateSafe,
} from '../../utils/otsScheme';
import { OTSSettingsModal } from './OTSSettingsModal';

interface OTSSchemeModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account | null;
  onOpenWhatsAppOffer?: () => void;
}

export const OTSSchemeModal: React.FC<OTSSchemeModalProps> = ({
  isOpen,
  onClose,
  account,
  onOpenWhatsAppOffer,
}) => {
  const {
    currentUser,
    accounts,
    canUserEditOTS,
    applyOTS,
    modifyOTS,
    confirmOTS,
    cancelOTS,
  } = useSRMS();

  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // Find all linked accounts for this customer to merge total outstanding if multi-account
  const customerLinkedAccounts = useMemo(() => {
    if (!account) return [];
    return accounts.filter(
      (a) =>
        (account.mobile && a.mobile && a.mobile.replace(/\D/g, '') === account.mobile.replace(/\D/g, '')) ||
        (account.customerCode && a.customerCode && a.customerCode === account.customerCode) ||
        (account.customerName && a.customerName && a.customerName.trim().toLowerCase() === account.customerName.trim().toLowerCase())
    );
  }, [accounts, account]);

  const isMultiAccountCustomer = customerLinkedAccounts.length > 1;

  // Merged outstanding across all customer accounts
  const mergedCustomerOutstanding = useMemo(() => {
    return customerLinkedAccounts.reduce(
      (sum, a) => sum + Math.max(0, a.originalOutstandingAmount || a.outstandingAmount || 0),
      0
    );
  }, [customerLinkedAccounts]);

  const origOutstanding = useMemo(() => {
    if (isMultiAccountCustomer) {
      return mergedCustomerOutstanding;
    }
    return Math.max(0, account?.originalOutstandingAmount || account?.outstandingAmount || 0);
  }, [isMultiAccountCustomer, mergedCustomerOutstanding, account?.originalOutstandingAmount, account?.outstandingAmount]);

  // Effective earliest NPA date for multi-account
  const effectiveNpaDate = useMemo(() => {
    if (!account) return undefined;
    if (isMultiAccountCustomer) {
      return customerLinkedAccounts.reduce((earliest, a) => {
        if (!a.npaDate) return earliest;
        if (!earliest) return a.npaDate;
        return a.npaDate < earliest ? a.npaDate : earliest;
      }, account.npaDate);
    }
    return account.npaDate;
  }, [isMultiAccountCustomer, customerLinkedAccounts, account?.npaDate]);

  // Evaluated Slab based on NPA Date and Bank Name
  const slabEval = useMemo(() => {
    return evaluateOTSSlab(origOutstanding, effectiveNpaDate, account?.bankName);
  }, [origOutstanding, effectiveNpaDate, account?.bankName]);

  // Editable OTS Amount state
  const initialOTSVal = account?.finalOTSAmount || account?.userEnteredOTSAmount || slabEval.systemCalculatedOTSAmount || 0;
  const [editableAmount, setEditableAmount] = useState<number>(initialOTSVal);
  const [modRemarks, setModRemarks] = useState<string>('');
  const [cancelReason, setCancelReason] = useState<string>('');
  const [showConfirmModifyDialog, setShowConfirmModifyDialog] = useState<boolean>(false);
  const [showCancelDialog, setShowCancelDialog] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'scheme' | 'history'>('scheme');

  useEffect(() => {
    if (!account) return;
    const defaultVal = account.finalOTSAmount || account.userEnteredOTSAmount || slabEval.systemCalculatedOTSAmount || 0;
    setEditableAmount(defaultVal);
    setStatusMessage(null);
  }, [account?.accountId, account?.finalOTSAmount, account?.userEnteredOTSAmount, slabEval.systemCalculatedOTSAmount]);

  if (!isOpen || !account) return null;

  const isAuthorizedToEdit = canUserEditOTS(currentUser);

  // Live Concession calculation for editable amount
  const liveConcession = calculateActualConcession(origOutstanding, editableAmount);
  const liveDiscountPercent = origOutstanding > 0 ? ((liveConcession / origOutstanding) * 100).toFixed(1) : '0';

  // Handlers
  const handleCalculateOrApply = () => {
    if (!slabEval.slabDefined) {
      setStatusMessage({
        type: 'error',
        text: `OTS Slab Not Defined for NPA Date (${slabEval.npaDateFormatted || 'None'}). OTS cannot be calculated.`,
      });
      return;
    }
    const res = applyOTS(account.accountId);
    if (res.success) {
      setEditableAmount(slabEval.systemCalculatedOTSAmount);
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleInitiateModify = () => {
    if (!isAuthorizedToEdit) {
      setStatusMessage({
        type: 'error',
        text: 'Access Restricted: You are not authorized to modify OTS amounts. Only designated roles can modify OTS.',
      });
      return;
    }
    if (editableAmount <= 0) {
      setStatusMessage({ type: 'error', text: 'OTS amount must be greater than zero.' });
      return;
    }
    if (editableAmount > origOutstanding) {
      setStatusMessage({
        type: 'error',
        text: 'OTS Settlement amount cannot exceed the Total Original Outstanding Amount.',
      });
      return;
    }
    setShowConfirmModifyDialog(true);
  };

  const handleConfirmSaveModification = () => {
    const res = modifyOTS(account.accountId, editableAmount, modRemarks.trim() || undefined);
    setShowConfirmModifyDialog(false);
    setModRemarks('');
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleConfirmOTS = () => {
    const res = confirmOTS(account.accountId);
    if (res.success) {
      setStatusMessage({ type: 'success', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const handleCancelOTS = () => {
    const res = cancelOTS(account.accountId, cancelReason.trim() || undefined);
    setShowCancelDialog(false);
    setCancelReason('');
    if (res.success) {
      setEditableAmount(slabEval.systemCalculatedOTSAmount);
      setStatusMessage({ type: 'info', text: res.message });
    } else {
      setStatusMessage({ type: 'error', text: res.message });
    }
  };

  const npaParsed = parseDateSafe(account.npaDate);
  const npaDisplay = npaParsed ? formatDateDMY(npaParsed) : (account.npaDate || 'Not Available');

  const isOTSActive = Boolean(account.otsActive && (account.finalOTSAmount || account.systemCalculatedOTSAmount));
  const isOTSConfirmed = account.otsStatus === 'OTS Confirmed';
  const isOTSCancelled = account.otsStatus === 'OTS Cancelled';

  return (
    <div
      id="ots-scheme-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="ots-scheme-modal-card"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-indigo-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">One-Time Settlement (OTS) Scheme</h3>
                <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded-full">
                  Valid till {slabEval.validTill}
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                {account.customerName} • Loan A/C: {account.loanNumber || account.accountId} • {account.bankName || 'Partner Bank'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {currentUser.role === 'admin' && (
              <button
                type="button"
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 text-indigo-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer flex items-center gap-1 text-xs font-semibold px-2.5"
                title="Admin: Configure bank-wise OTS deadlines and calculation slabs"
              >
                <Settings className="w-4 h-4" />
                <span className="hidden sm:inline">Settings</span>
              </button>
            )}
            <button
              id="close-ots-modal-btn"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50 text-xs font-semibold">
          <div className="flex gap-2">
            <button
              id="ots-tab-scheme-btn"
              onClick={() => setActiveTab('scheme')}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'scheme'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calculator className="w-3.5 h-3.5" />
              <span>OTS Calculation &amp; Offer</span>
            </button>
            <button
              id="ots-tab-history-btn"
              onClick={() => setActiveTab('history')}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-indigo-600 text-indigo-600 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Audit History ({account.otsHistory?.length || 0})</span>
            </button>
          </div>

          {/* Status Badge */}
          <div className="py-2">
            {isOTSConfirmed ? (
              <span className="px-2.5 py-1 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                OTS Confirmed &amp; Locked
              </span>
            ) : isOTSCancelled ? (
              <span className="px-2.5 py-1 bg-rose-100 border border-rose-300 text-rose-800 rounded-full font-bold flex items-center gap-1">
                <XCircle className="w-3 h-3 text-rose-600" />
                OTS Cancelled
              </span>
            ) : isOTSActive ? (
              <span className="px-2.5 py-1 bg-amber-100 border border-amber-300 text-amber-800 rounded-full font-bold flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-600" />
                OTS Applied (Pending Confirmation)
              </span>
            ) : (
              <span className="px-2.5 py-1 bg-slate-200 text-slate-700 rounded-full font-medium">
                OTS Not Applied
              </span>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-5">
          {/* Status Notification */}
          {statusMessage && (
            <div
              id="ots-status-alert"
              className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {statusMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />}
              {statusMessage.type === 'info' && <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
              <div className="flex-1 font-medium">{statusMessage.text}</div>
            </div>
          )}

          {activeTab === 'scheme' ? (
            <>
              {/* Multi-Account Customer Merged Amount Notice */}
              {isMultiAccountCustomer && (
                <div id="ots-multi-account-notice" className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold text-amber-900 flex items-center gap-1.5">
                      <span>Customer Has Multiple Linked Accounts ({customerLinkedAccounts.length} Accounts Found)</span>
                      <span className="px-1.5 py-0.2 text-[10px] bg-amber-200 text-amber-900 rounded font-mono font-bold">MERGED OTS MANDATE</span>
                    </p>
                    <p className="text-amber-800 text-[11px] leading-relaxed">
                      As per recovery guidelines, when a customer holds multiple accounts, OTS is calculated strictly on the <strong>merged total balance of ₹{mergedCustomerOutstanding.toLocaleString('en-IN')}</strong> across all accounts: {customerLinkedAccounts.map((a) => `${a.accountId} (₹${Math.max(0, a.originalOutstandingAmount || a.outstandingAmount || 0).toLocaleString('en-IN')})`).join(', ')}.
                    </p>
                  </div>
                </div>
              )}

              {/* NPA Date & Slab Eligibility Box */}
              <div
                id="ots-slab-eval-card"
                className={`p-4 rounded-xl border ${
                  slabEval.slabDefined
                    ? 'bg-indigo-50/70 border-indigo-200'
                    : 'bg-amber-50/70 border-amber-200'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-indigo-700" />
                      <span className="text-xs font-bold text-slate-700">Account NPA Date:</span>
                      <span className="text-xs font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-900">
                        {npaDisplay}
                      </span>
                    </div>
                    <div className="mt-1">
                      <span className="text-xs font-semibold text-slate-600">Applicable Slab: </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded ${
                          slabEval.slabDefined
                            ? 'bg-indigo-100 text-indigo-900'
                            : 'bg-amber-100 text-amber-900'
                        }`}
                      >
                        {slabEval.slabName}
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">Scheme Validity</span>
                    <span className="text-xs font-bold text-emerald-700">Till 30-Sep-2026</span>
                  </div>
                </div>

                {!slabEval.slabDefined ? (
                  <div className="mt-3 p-2.5 bg-amber-100/70 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <strong>OTS Slab Not Defined:</strong> NPA date does not fall within the authorized OTS windows (≤ 31-03-2019, 01-04-2021 to 31-03-2023, 01-04-2023 to 31-03-2025). System will not auto-calculate OTS for undefined periods.
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-slate-600 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>
                      Customer Pays: <strong>{slabEval.customerPayPercentage}%</strong> • Bank Concession / Discount: <strong>{slabEval.discountPercentage}%</strong>
                    </span>
                  </div>
                )}
              </div>

              {/* Amount Cards Grid (Fulfills Requirements 1 & 2) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 1. Original Outstanding Amount (Inviolable) */}
                <div
                  id="ots-card-original-outstanding"
                  className="p-3.5 rounded-xl bg-slate-100 border border-slate-300 relative"
                >
                  <div className="flex items-center justify-between text-slate-600 mb-1">
                    <span className="text-xs font-bold">1. Original Outstanding</span>
                    <Lock className="w-3.5 h-3.5 text-slate-400" title="Inviolable - Never modified" />
                  </div>
                  <div className="text-lg font-extrabold text-slate-900 font-mono">
                    ₹{origOutstanding.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Permanent master figure. Never modified or overwritten.
                  </p>
                </div>

                {/* 2. System Calculated OTS Amount */}
                <div
                  id="ots-card-system-calculated"
                  className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200"
                >
                  <div className="flex items-center justify-between text-indigo-900 mb-1">
                    <span className="text-xs font-bold">2. System Calculated OTS</span>
                    <Calculator className="w-3.5 h-3.5 text-indigo-600" />
                  </div>
                  <div className="text-lg font-extrabold text-indigo-950 font-mono">
                    {slabEval.slabDefined
                      ? `₹${slabEval.systemCalculatedOTSAmount.toLocaleString('en-IN')}`
                      : 'N/A'}
                  </div>
                  <p className="text-[10px] text-indigo-700 mt-1">
                    {slabEval.slabDefined
                      ? `${slabEval.customerPayPercentage}% of total outstanding (${slabEval.discountPercentage}% off)`
                      : 'Slab not defined for this date'}
                  </p>
                </div>

                {/* 3. Editable Final OTS Settlement Amount */}
                <div
                  id="ots-card-final-amount"
                  className={`p-3.5 rounded-xl border ${
                    isOTSConfirmed
                      ? 'bg-emerald-50 border-emerald-200'
                      : 'bg-white border-blue-300 ring-2 ring-blue-100'
                  }`}
                >
                  <div className="flex items-center justify-between text-blue-900 mb-1">
                    <span className="text-xs font-bold">3. Final OTS Settlement</span>
                    {isAuthorizedToEdit ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded font-semibold flex items-center gap-0.5">
                        <Edit3 className="w-2.5 h-2.5" /> Editable
                      </span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded font-semibold flex items-center gap-0.5">
                        <Lock className="w-2.5 h-2.5" /> Locked
                      </span>
                    )}
                  </div>
                  <div className="text-lg font-extrabold text-blue-950 font-mono">
                    ₹{editableAmount.toLocaleString('en-IN')}
                  </div>
                  <p className="text-[10px] text-blue-700 mt-1">
                    Amount customer will pay for one-time full settlement.
                  </p>
                </div>
              </div>

              {/* Editable Section for Authorized Users */}
              <div
                id="ots-edit-section"
                className="p-4 rounded-xl border border-slate-200 bg-white space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Edit3 className="w-4 h-4 text-indigo-600" />
                    <h4 className="text-xs font-bold text-slate-800">
                      Settlement Amount Adjustment &amp; Concession
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    Editable by Users &amp; Agents
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      User Entered / Final OTS Amount (₹):
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-slate-400 font-bold">₹</span>
                      <input
                        id="editable-ots-amount-input"
                        type="number"
                        min="0"
                        max={origOutstanding}
                        disabled={!isAuthorizedToEdit}
                        value={editableAmount}
                        onChange={(e) => setEditableAmount(Number(e.target.value))}
                        className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed"
                        placeholder="Enter modified OTS amount"
                      />
                    </div>
                  </div>

                  {/* Live Concession Calculation */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
                    <div className="text-[11px] text-slate-500 font-medium flex justify-between">
                      <span>Formula:</span>
                      <span className="font-mono text-slate-600">Original − Final OTS</span>
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-bold text-slate-700">Actual Concession:</span>
                      <span className="text-sm font-extrabold text-emerald-700 font-mono">
                        ₹{liveConcession.toLocaleString('en-IN')}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between text-[11px]">
                      <span className="text-slate-500">Effective Discount:</span>
                      <span className="font-bold text-indigo-700 font-mono">
                        {liveDiscountPercent}%
                      </span>
                    </div>
                  </div>
                </div>

                {isAuthorizedToEdit && (
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-slate-500">
                      Modifying this amount requires confirmation before locking.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        id="reset-to-system-ots-btn"
                        type="button"
                        onClick={() => setEditableAmount(slabEval.systemCalculatedOTSAmount)}
                        className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition cursor-pointer"
                      >
                        Reset to System OTS (₹{slabEval.systemCalculatedOTSAmount.toLocaleString('en-IN')})
                      </button>
                      <button
                        id="save-modified-ots-btn"
                        type="button"
                        onClick={handleInitiateModify}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Save Modified OTS</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons Toolbar */}
              <div
                id="ots-actions-toolbar"
                className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Calculate / Apply OTS Button */}
                    <button
                      id="apply-system-ots-btn"
                      type="button"
                      disabled={!slabEval.slabDefined}
                      onClick={handleCalculateOrApply}
                      className="px-3.5 py-2 text-xs font-bold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>{isOTSActive ? 'Re-Calculate OTS' : 'Calculate & Apply OTS'}</span>
                    </button>

                    {/* Confirm OTS Button */}
                    {isOTSActive && !isOTSConfirmed && (
                      <button
                        id="confirm-ots-offer-btn"
                        type="button"
                        onClick={handleConfirmOTS}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm &amp; Lock OTS Offer</span>
                      </button>
                    )}

                    {/* WhatsApp OTS Offer Button (Requirement 4) */}
                    {onOpenWhatsAppOffer && (
                      <button
                        id="open-whatsapp-ots-offer-btn"
                        type="button"
                        onClick={() => {
                          if (isOTSActive && !isOTSConfirmed) {
                            handleConfirmOTS();
                          } else if (!isOTSActive && slabEval.slabDefined) {
                            handleCalculateOrApply();
                          }
                          onOpenWhatsAppOffer();
                        }}
                        className="px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer"
                        title="Send Marathi OTS offer via WhatsApp"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>📱 WhatsApp OTS Offer</span>
                      </button>
                    )}
                  </div>

                  {/* Cancel OTS Button (Requirement 3) */}
                  {isOTSActive && (
                    <button
                      id="cancel-ots-btn"
                      type="button"
                      onClick={() => setShowCancelDialog(true)}
                      className="px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Cancel OTS</span>
                    </button>
                  )}
                </div>

                {isOTSConfirmed && (
                  <p className="text-[11px] text-emerald-800 bg-emerald-50 p-2 rounded-lg border border-emerald-200 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>
                      OTS Offer of <strong>₹{editableAmount.toLocaleString('en-IN')}</strong> is finalized and locked. Customer can be notified using the WhatsApp OTS Offer button above.
                    </span>
                  </p>
                )}
              </div>
            </>
          ) : (
            /* Audit History Tab */
            <div id="ots-history-tab" className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold">OTS Actions &amp; Modifications Trail:</span>
                <span className="text-slate-400">All changes logged permanently</span>
              </div>

              {(!account.otsHistory || account.otsHistory.length === 0) ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  No OTS actions recorded yet. Calculate or apply OTS to begin the audit log.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {account.otsHistory.map((hist, idx) => (
                    <div key={hist.id || idx} className="p-3.5 bg-white hover:bg-slate-50 transition text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              hist.action === 'CONFIRMED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : hist.action === 'CANCELLED'
                                ? 'bg-rose-100 text-rose-800'
                                : hist.action === 'MODIFIED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-indigo-100 text-indigo-800'
                            }`}
                          >
                            {hist.action}
                          </span>
                          <span className="font-bold text-slate-800">{hist.userName}</span>
                          <span className="text-[10px] text-slate-400 capitalize">({hist.userRole.replace('_', ' ')})</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{hist.timestamp}</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-slate-600">
                        <div>
                          <span className="text-slate-400 block text-[9px] uppercase">Orig Outstanding</span>
                          ₹{hist.originalOutstandingAmount?.toLocaleString('en-IN')}
                        </div>
                        {hist.systemCalculatedOTSAmount !== undefined && (
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">System OTS</span>
                            ₹{hist.systemCalculatedOTSAmount?.toLocaleString('en-IN')}
                          </div>
                        )}
                        {hist.finalOTSAmount !== undefined && (
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Final OTS</span>
                            ₹{hist.finalOTSAmount?.toLocaleString('en-IN')}
                          </div>
                        )}
                        {hist.actualConcessionAmount !== undefined && (
                          <div>
                            <span className="text-slate-400 block text-[9px] uppercase">Concession</span>
                            ₹{hist.actualConcessionAmount?.toLocaleString('en-IN')}
                          </div>
                        )}
                      </div>

                      {hist.remarks && (
                        <p className="text-[11px] text-slate-500 italic pt-0.5">
                          "{hist.remarks}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <div className="text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>ScaleSupport Audit &amp; OTS Engine</span>
          </div>
          <button
            id="close-ots-modal-footer-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>

        {/* Confirmation Modal for Modifying OTS Amount */}
        {showConfirmModifyDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-amber-600">
                <AlertTriangle className="w-6 h-6" />
                <h4 className="font-bold text-slate-900">Confirm OTS Modification</h4>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p>
                  You are about to modify the OTS settlement amount for <strong>{account.customerName}</strong>.
                </p>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1 font-mono text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Original Outstanding:</span>
                    <span className="font-bold">₹{origOutstanding.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">System OTS:</span>
                    <span>₹{slabEval.systemCalculatedOTSAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-blue-700">
                    <span className="font-bold">Modified Final OTS:</span>
                    <span className="font-bold">₹{editableAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700">
                    <span className="font-bold">Actual Concession:</span>
                    <span className="font-bold">₹{liveConcession.toLocaleString('en-IN')} ({liveDiscountPercent}%)</span>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Approval / Modification Remarks (Optional):
                  </label>
                  <input
                    type="text"
                    value={modRemarks}
                    onChange={(e) => setModRemarks(e.target.value)}
                    placeholder="e.g. Approved special concession by Zonal Head"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModifyDialog(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSaveModification}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Confirm &amp; Save
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cancellation Modal (Requirement 3) */}
        {showCancelDialog && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md bg-white rounded-2xl p-5 shadow-2xl border border-rose-200 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <XCircle className="w-6 h-6" />
                <h4 className="font-bold text-slate-900">Cancel Active OTS Calculation</h4>
              </div>

              <div className="text-xs text-slate-600 space-y-2">
                <p>
                  Per OTS Scheme rules, cancelling this OTS will:
                </p>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  <li>Remove the active OTS calculation.</li>
                  <li><strong>Restore and display the full Original Outstanding Amount (₹{origOutstanding.toLocaleString('en-IN')})</strong>.</li>
                  <li>Preserve all historical OTS audit records.</li>
                  <li>Disable the WhatsApp OTS Offer until a new OTS is calculated/confirmed.</li>
                </ul>

                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reason for Cancellation:
                  </label>
                  <input
                    type="text"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="e.g. Customer rejected offer / Requested higher waiver"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelDialog(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 rounded-lg cursor-pointer"
                >
                  Keep OTS Active
                </button>
                <button
                  type="button"
                  onClick={handleCancelOTS}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Confirm Cancellation
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Admin OTS Settings Modal */}
        <OTSSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
        />
      </div>
    </div>
  );
};
