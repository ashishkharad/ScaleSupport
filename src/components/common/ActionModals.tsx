import React, { useState, useEffect, useMemo } from 'react';
import {
  PhoneCall,
  Calendar,
  DollarSign,
  MapPin,
  FileText,
  MessageSquare,
  Sparkles,
  CheckCircle2,
  X,
  Send,
  AlertCircle,
  Percent,
  Receipt,
  Upload,
  HardDrive,
  RefreshCw,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account, FollowUpCallStatus, PaymentMode, VisitStatus, DocumentType } from '../../types';
import { formatINR } from '../../utils/watermark';
import { GooglePickerButton } from './GooglePickerButton';
import { PickedDriveFile } from '../../utils/googlePickerService';

// -------------------------------------------------------------
// 1. Log Follow-up Modal
// -------------------------------------------------------------
export const LogFollowUpModal: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}> = ({ account, isOpen, onClose }) => {
  const { logFollowUp } = useSRMS();
  const [status, setStatus] = useState<FollowUpCallStatus>('Promised payment');
  const [customerResponse, setCustomerResponse] = useState<string>('Customer promised to pay overdue amount within 3 days.');
  const [discussionDetails, setDiscussionDetails] = useState<string>('Discussed pending installments, shared UPI payment details and reminded about credit bureau reporting.');
  const [agentRemarks, setAgentRemarks] = useState<string>('Follow-up scheduled to verify clearance.');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>(
    new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  );
  const [nextFollowUpTime, setNextFollowUpTime] = useState<string>('11:00 AM');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    logFollowUp({
      accountId: account.accountId,
      status,
      customerResponse,
      discussionDetails,
      agentRemarks,
      nextFollowUpDate,
      nextFollowUpTime,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-100 text-amber-800 rounded-xl">
              <PhoneCall className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Record Customer Follow-up</h3>
              <p className="text-xs text-slate-500">{account.customerName} ({account.accountId})</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Follow-up Call / Contact Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as FollowUpCallStatus)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="Contacted">Contacted - Discussed</option>
              <option value="Promised payment">Promised Payment (PTP)</option>
              <option value="Paid">Paid on Call</option>
              <option value="Switched off">Switched Off / Unreachable</option>
              <option value="Unavailable">Customer Unavailable / Busy</option>
              <option value="Wrong number">Wrong Number / Invalid</option>
              <option value="Refused">Refused to Pay (Dispute)</option>
              <option value="Dispute">Loan Calculation Dispute</option>
              <option value="Not contacted">Not Contacted (No Answer)</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Customer Response / Commitment:</label>
            <textarea
              rows={2}
              value={customerResponse}
              onChange={(e) => setCustomerResponse(e.target.value)}
              placeholder="What did the customer state?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Discussion &amp; Call Summary:</label>
            <textarea
              rows={2}
              value={discussionDetails}
              onChange={(e) => setDiscussionDetails(e.target.value)}
              placeholder="Detail discussion, terms offered, reminder given..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Agent Internal Remarks:</label>
            <input
              type="text"
              value={agentRemarks}
              onChange={(e) => setAgentRemarks(e.target.value)}
              placeholder="Agent notes, next plan of action"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Next Follow-up Date:</label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Preferred Time:</label>
              <input
                type="text"
                value={nextFollowUpTime}
                onChange={(e) => setNextFollowUpTime(e.target.value)}
                placeholder="e.g. 11:00 AM"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-medium cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
            >
              Save Follow-up &amp; Log to Timeline
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 2. Create PTP Modal (Promise To Pay)
// -------------------------------------------------------------
export const CreatePTPModal: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}> = ({ account, isOpen, onClose }) => {
  const { createPTP } = useSRMS();
  const [amount, setAmount] = useState<number>(account.overdueAmount || 15000);
  const [ptpDate, setPtpDate] = useState<string>(
    new Date(Date.now() + 5 * 86400000).toISOString().slice(0, 10)
  );
  const [ptpMode, setPtpMode] = useState<PaymentMode>('UPI');
  const [remarks, setRemarks] = useState<string>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createPTP({
      accountId: account.accountId,
      amount,
      ptpDate,
      ptpMode,
      customerCommitment: `Promised ₹${amount.toLocaleString('en-IN')} on ${ptpDate} via ${ptpMode}.`,
      remarks: remarks.trim() || 'Committed payment recorded with borrower.',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-purple-100 text-purple-800 rounded-xl">
              <Calendar className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Record Promise to Pay (PTP)</h3>
              <p className="text-xs text-slate-500">{account.customerName} • Overdue: {formatINR(account.overdueAmount)}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Promised Amount (₹):</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-purple-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                required
                min={1}
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Promised Date:</label>
              <input
                type="date"
                value={ptpDate}
                onChange={(e) => setPtpDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Expected Payment Mode:</label>
            <select
              value={ptpMode}
              onChange={(e) => setPtpMode(e.target.value as PaymentMode)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 cursor-pointer"
            >
              <option value="UPI">Online UPI (PhonePe / GPay / Paytm)</option>
              <option value="Cash">Cash Handover to Agent</option>
              <option value="Bank Transfer">Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="Cheque">Cheque Deposit</option>
              <option value="POS Card">POS Card Swipe</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Remarks (Optional):</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Borrower confirmed salary credit date"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-medium cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
            >
              Create PTP &amp; Set Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3. Record Recovery & 10% Commission Modal (with OTS Scheme Support)
// -------------------------------------------------------------
export const RecordRecoveryModal: React.FC<{
  account: Account | null;
  relatedAccounts?: Account[];
  isOpen: boolean;
  onClose: () => void;
}> = ({ account, relatedAccounts, isOpen, onClose }) => {
  const { recordRecovery, commissionSettings, users, currentUser, accounts: allAccounts } = useSRMS();

  // Find all linked accounts for this customer
  const linkedAccounts = useMemo(() => {
    if (relatedAccounts && relatedAccounts.length > 0) return relatedAccounts;
    if (!account) return [];
    if (!allAccounts || allAccounts.length === 0) return [account];
    const matches = allAccounts.filter(
      (a) =>
        a.accountId === account.accountId ||
        (account.customerCode &&
          a.customerCode &&
          a.customerCode.trim().toUpperCase() === account.customerCode.trim().toUpperCase()) ||
        (account.mobile &&
          a.mobile &&
          a.mobile.replace(/\D/g, '') === account.mobile.replace(/\D/g, '') &&
          a.mobile.replace(/\D/g, '').length >= 10)
    );
    return matches.length > 0 ? matches : [account];
  }, [relatedAccounts, allAccounts, account]);

  const [selectedAccountId, setSelectedAccountId] = useState<string>(account?.accountId || '');

  useEffect(() => {
    if (account) {
      setSelectedAccountId(account.accountId);
    }
  }, [account?.accountId, isOpen]);

  const activeTargetAccount = useMemo(() => {
    return linkedAccounts.find((a) => a.accountId === selectedAccountId) || account;
  }, [linkedAccounts, selectedAccountId, account]);

  const targetModifiedOTS = useMemo(() => {
    if (!activeTargetAccount) return 0;
    return (
      activeTargetAccount.finalOTSAmount ||
      activeTargetAccount.userEnteredOTSAmount ||
      (activeTargetAccount.otsActive ? activeTargetAccount.otsAgreedAmount : 0) ||
      0
    );
  }, [activeTargetAccount]);

  const hasOTS = Boolean(
    targetModifiedOTS > 0 ||
      activeTargetAccount?.otsActive ||
      activeTargetAccount?.otsStatus === 'OTS Applied' ||
      activeTargetAccount?.otsStatus === '10% OTS Paid - Sanction Pending'
  );

  const [amount, setAmount] = useState<number>(() => {
    if (targetModifiedOTS > 0) return targetModifiedOTS;
    return activeTargetAccount?.overdueAmount || 20000;
  });
  const [recoveryDate, setRecoveryDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>(
    `UPI/${Date.now().toString().slice(-8)}/HDFC`
  );
  const [isOTS, setIsOTS] = useState<boolean>(hasOTS);
  const [otsStage, setOtsStage] = useState<'10_percent_token' | 'full_settlement'>('full_settlement');
  const [otsAgreedAmount, setOtsAgreedAmount] = useState<number>(
    targetModifiedOTS ||
      activeTargetAccount?.otsAgreedAmount ||
      Math.round((activeTargetAccount?.outstandingAmount || activeTargetAccount?.sanctionAmount || 50000) * 0.6)
  );

  // Recovery Option: keep ONLY field agents (role === 'agent')
  const agentUsers = users.filter((u) => u.role === 'agent' && u.isActive !== false);

  const [selectedAgentId, setSelectedAgentId] = useState<string>(() => {
    const assigned = agentUsers.find(
      (u) => u.id === activeTargetAccount?.assignedAgentId || u.agentId === activeTargetAccount?.assignedAgentId
    );
    if (assigned) return assigned.id;
    if (currentUser.role === 'agent') return currentUser.id;
    return agentUsers[0]?.id || '';
  });

  const isAdmin = currentUser.role === 'admin';

  const [remarks, setRemarks] = useState<string>(() => {
    const base = 'Collected in full. Customer issued official electronic SRMS receipt acknowledgment.';
    return isAdmin ? `${base} [Admin Recovery: ${currentUser.name}]` : base;
  });

  // When active target account changes (e.g. user chooses another account in multi-account customer)
  useEffect(() => {
    if (activeTargetAccount) {
      const otsVal =
        activeTargetAccount.finalOTSAmount ||
        activeTargetAccount.userEnteredOTSAmount ||
        (activeTargetAccount.otsActive ? activeTargetAccount.otsAgreedAmount : 0) ||
        0;

      const otsActiveFlag = Boolean(
        otsVal > 0 ||
          activeTargetAccount.otsActive ||
          activeTargetAccount.otsStatus === 'OTS Applied'
      );

      setIsOTS(otsActiveFlag);
      if (otsVal > 0) {
        setOtsAgreedAmount(otsVal);
        setAmount(otsVal);
      } else {
        setAmount(activeTargetAccount.overdueAmount || activeTargetAccount.outstandingAmount || 20000);
        setOtsAgreedAmount(
          Math.round((activeTargetAccount.outstandingAmount || activeTargetAccount.sanctionAmount || 50000) * 0.6)
        );
      }

      const assigned = agentUsers.find(
        (u) => u.id === activeTargetAccount.assignedAgentId || u.agentId === activeTargetAccount.assignedAgentId
      );
      if (assigned) setSelectedAgentId(assigned.id);
    }
  }, [
    activeTargetAccount?.accountId,
    activeTargetAccount?.finalOTSAmount,
    activeTargetAccount?.userEnteredOTSAmount,
    activeTargetAccount?.otsActive,
    activeTargetAccount?.overdueAmount,
  ]);

  useEffect(() => {
    if (isOTS) {
      if (otsStage === '10_percent_token') {
        const tokenVal = Math.round(otsAgreedAmount * 0.1);
        setAmount(tokenVal);
        const text = `10% OTS upfront token payment (₹${tokenVal.toLocaleString('en-IN')}) for agreed OTS ₹${otsAgreedAmount.toLocaleString('en-IN')}. Sanction process initiated.`;
        setRemarks(isAdmin ? `${text} [Admin Recovery: ${currentUser.name}]` : text);
      } else {
        const remaining = Math.max(0, otsAgreedAmount - (activeTargetAccount?.ots10PercentPaidAmount || 0));
        setAmount(remaining);
        const text = `Full & final OTS settlement balance payment. Account settled and closed under OTS scheme.`;
        setRemarks(isAdmin ? `${text} [Admin Recovery: ${currentUser.name}]` : text);
      }
    }
  }, [
    isOTS,
    otsStage,
    otsAgreedAmount,
    activeTargetAccount?.ots10PercentPaidAmount,
    isAdmin,
    currentUser.name,
  ]);

  if (!isOpen || !account || !activeTargetAccount) return null;

  const commissionRate = commissionSettings.defaultRate; // 10%
  const commissionEarned = Math.round((amount * commissionRate) / 100);
  const selectedAgent = agentUsers.find((u) => u.id === selectedAgentId);
  const isAmountBelowOTS = isOTS && otsStage === 'full_settlement' && amount < otsAgreedAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let finalRemarks = remarks.trim();
    if (isAdmin && !finalRemarks.includes('[Admin Recovery:')) {
      finalRemarks = `${finalRemarks} [Admin Recovery: ${currentUser.name}]`.trim();
    }

    recordRecovery({
      accountId: activeTargetAccount.accountId,
      amount,
      recoveryDate,
      paymentMode,
      referenceNumber,
      remarks: finalRemarks,
      isOTS,
      otsStage: isOTS ? otsStage : undefined,
      otsAgreedAmount: isOTS ? otsAgreedAmount : undefined,
      agentId: selectedAgent?.id,
      agentName: selectedAgent?.name,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Log Loan Recovery Collection</h3>
              <p className="text-xs text-slate-500">
                {activeTargetAccount.customerName} • {activeTargetAccount.loanNumber || activeTargetAccount.accountId}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Multi-Account Selector */}
          {linkedAccounts.length > 1 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1.5">
              <label className="block text-blue-950 font-bold text-xs flex items-center justify-between">
                <span>Select Target Account for Recovery *</span>
                <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded font-bold">
                  {linkedAccounts.length} ACCOUNTS LINKED
                </span>
              </label>
              <select
                value={selectedAccountId}
                onChange={(e) => {
                  setSelectedAccountId(e.target.value);
                }}
                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {linkedAccounts.map((la) => (
                  <option key={la.accountId} value={la.accountId}>
                    {la.loanNumber || la.accountId} ({la.facility || la.bankName || 'Loan'}) — Bal: ₹{Number(la.originalOutstandingAmount || la.outstandingAmount || 0).toLocaleString('en-IN')} {la.finalOTSAmount ? `| Modified OTS: ₹${Number(la.finalOTSAmount).toLocaleString('en-IN')}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-blue-700">
                Collection and OTS balance deductions will apply specifically to this selected account.
              </p>
            </div>
          )}
          {/* Admin Entry Callout with bracket remarks notice */}
          {isAdmin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 flex items-start gap-2.5 text-xs">
              <span className="text-base">🛡️</span>
              <div>
                <span className="font-bold block">Admin Entry Mode</span>
                <span className="text-[11px] text-amber-800 leading-relaxed block">
                  Recovery entered by Administrator ({currentUser.name}). Bracket remarks <strong>[Admin Recovery: {currentUser.name}]</strong> will be recorded for audit trail.
                </span>
              </div>
            </div>
          )}

          {/* Field Agent Selector: ONLY Agents shown as requested */}
          <div>
            <label className="block text-slate-700 font-bold mb-1">
              Collecting Agent (Field Agents Only) *
            </label>
            <select
              value={selectedAgentId}
              onChange={(e) => setSelectedAgentId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            >
              {agentUsers.length === 0 ? (
                <option value="">No agents registered</option>
              ) : (
                agentUsers.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} ({agent.agentId || agent.id}) • {agent.branch || 'Main Branch'}
                  </option>
                ))
              )}
            </select>
            <p className="text-[10px] text-slate-500 mt-1">
              Filtered to keep only field recovery agents for commission crediting.
            </p>
          </div>

          {/* OTS Scheme Toggle Box */}
          <div className="p-3.5 bg-gradient-to-r from-indigo-50/80 to-blue-50/80 border border-indigo-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer font-bold text-indigo-900 text-xs">
                <input
                  type="checkbox"
                  checked={isOTS}
                  onChange={(e) => setIsOTS(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <span>One-Time Settlement (OTS Scheme)</span>
              </label>
              {isOTS && (
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 font-bold text-[10px] rounded-full uppercase tracking-wider">
                  OTS Enabled
                </span>
              )}
            </div>

            {/* Multi-Account Customer notice */}
            {account.isMultipleAccount && isOTS && (
              <div className="p-2 bg-blue-100/70 border border-blue-300/80 rounded-lg text-[11px] text-blue-950 font-semibold">
                🔗 <strong>Multi-Account Merged Settlement:</strong> OTS applies to all linked customer accounts merged payment.
              </div>
            )}

            {isOTS && (
              <div className="space-y-3 pt-2 border-t border-indigo-100 text-xs">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-indigo-900 font-semibold mb-1">Agreed Total OTS (₹):</label>
                    <input
                      type="number"
                      value={otsAgreedAmount}
                      onChange={(e) => setOtsAgreedAmount(Number(e.target.value))}
                      className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 font-mono font-bold text-indigo-900"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="block text-indigo-900 font-semibold mb-1">OTS Payment Stage:</label>
                    <select
                      value={otsStage}
                      onChange={(e) => setOtsStage(e.target.value as any)}
                      className="w-full bg-white border border-indigo-200 rounded-lg px-2.5 py-1.5 text-xs text-indigo-900 font-semibold"
                    >
                      <option value="10_percent_token">1. Upfront 10% Token (Sanction Pending)</option>
                      <option value="full_settlement">2. Final Settlement Payment</option>
                    </select>
                  </div>
                </div>

                {isAmountBelowOTS && (
                  <div className="p-2.5 bg-amber-50 border border-amber-300 rounded-lg text-[11px] text-amber-900 leading-relaxed font-medium">
                    ⚠️ <strong>Partial Offer Note:</strong> The payment amount (₹{amount.toLocaleString('en-IN')}) is below the agreed OTS offer (₹{otsAgreedAmount.toLocaleString('en-IN')}). Account status will <strong>NOT</strong> be marked as closed till user closes it or clears balance.
                  </div>
                )}

                <p className="text-[11px] text-indigo-700 leading-relaxed">
                  {otsStage === '10_percent_token'
                    ? '💡 Customer deposits 10% token upfront. Once bank sanctions the OTS proposal, customer clears remaining balance to close account.'
                    : '🎉 When full agreed OTS is satisfied, account will be marked "Closed as per OTS". Authorized users can also close/delete the account.'}
                </p>
              </div>
            )}
          </div>

          {/* Recovery Date and Amount Input */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payment Collection Date:</label>
              <input
                type="date"
                value={recoveryDate}
                onChange={(e) => setRecoveryDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Collection Amount (₹):</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-black text-emerald-600 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
                min="1"
              />
            </div>
          </div>

          {/* 10% Commission Calculation Live Callout */}
          <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Percent className="w-5 h-5 text-amber-600" />
              <div>
                <span className="text-emerald-900 font-bold text-xs block">
                  Agent Incentive ({commissionRate}% Rate):
                </span>
                <span className="text-[11px] text-emerald-700">
                  {formatINR(amount)} × {commissionRate}% =
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-base font-black text-amber-700 font-mono">
                {formatINR(commissionEarned)}
              </span>
              <span className="block text-[10px] text-emerald-800 font-semibold">
                Credited to {selectedAgent ? selectedAgent.name : 'Agent'}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payment Mode:</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="UPI">UPI / QR Code</option>
                <option value="Cash">Cash Handover</option>
                <option value="Bank Transfer">Bank Transfer / IMPS</option>
                <option value="Cheque">Cheque</option>
                <option value="POS Card">POS Card Swipe</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Transaction Ref / Cheque No:</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="e.g. UPI/7192834/HDFC"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">
              Collection Remarks &amp; Receipt Note {isAdmin && <span className="text-amber-600 font-bold">[Admin Recovery in bracket]</span>}:
            </label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-medium cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
            >
              <Receipt className="w-4 h-4" />
              <span>Record Recovery &amp; Issue Receipt</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 3B. Edit / Delete Recovery Modal
// -------------------------------------------------------------
export const EditRecoveryModal: React.FC<{
  recovery: any;
  isOpen: boolean;
  onClose: () => void;
}> = ({ recovery, isOpen, onClose }) => {
  const { editRecovery, deleteRecovery, currentUser } = useSRMS();
  const [amount, setAmount] = useState<number>(recovery?.amount || 0);
  const [recoveryDate, setRecoveryDate] = useState<string>(recovery?.recoveryDate || new Date().toISOString().slice(0, 10));
  const [paymentMode, setPaymentMode] = useState<PaymentMode>(recovery?.paymentMode || 'UPI');
  const [referenceNumber, setReferenceNumber] = useState<string>(recovery?.referenceNumber || '');
  const [remarks, setRemarks] = useState<string>(recovery?.remarks || '');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  useEffect(() => {
    if (recovery) {
      setAmount(recovery.amount);
      setRecoveryDate(recovery.recoveryDate || new Date().toISOString().slice(0, 10));
      setPaymentMode(recovery.paymentMode || 'UPI');
      setReferenceNumber(recovery.referenceNumber || '');
      setRemarks(recovery.remarks || '');
      setIsConfirmingDelete(false);
    }
  }, [recovery]);

  if (!isOpen || !recovery) return null;

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    await editRecovery(recovery.id || recovery.recoveryId, {
      amount,
      recoveryDate,
      paymentMode,
      referenceNumber,
      remarks,
    });
    onClose();
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    await deleteRecovery(recovery.id || recovery.recoveryId);
    setIsDeleting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-100 text-blue-800 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Edit / Delete Recovery Entry</h3>
              <p className="text-xs text-slate-500">{recovery.receiptNumber} • {recovery.customerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="p-6 space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Collection Date:</label>
              <input
                type="date"
                value={recoveryDate}
                onChange={(e) => setRecoveryDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Amount (₹):</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-emerald-700 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Payment Mode:</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as PaymentMode)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="UPI">UPI</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Cheque">Cheque</option>
                <option value="POS Card">POS Card</option>
              </select>
            </div>
            <div>
              <label className="block text-slate-700 font-semibold mb-1">Reference No:</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Remarks:</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {isConfirmingDelete ? (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                <span className="text-red-700 font-bold text-[11px]">Delete this ₹{recovery.amount?.toLocaleString('en-IN')} entry?</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-2.5 py-1 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg cursor-pointer transition text-[11px]"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsConfirmingDelete(false)}
                  disabled={isDeleting}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold rounded-lg cursor-pointer transition text-[11px]"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsConfirmingDelete(true)}
                disabled={isDeleting}
                className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl border border-red-200 cursor-pointer transition flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Delete Entry</span>
              </button>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-medium cursor-pointer transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 4. Start / Complete Field Visit Modal
// -------------------------------------------------------------
export const FieldVisitModal: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
  onOpenWatermarkCamera?: () => void;
}> = ({ account, isOpen, onClose, onOpenWatermarkCamera }) => {
  const { activeVisit, startFieldVisit, completeFieldVisit } = useSRMS();
  const [status, setStatus] = useState<VisitStatus>('Customer Met');
  const [remarks, setRemarks] = useState<string>(
    'Met customer personally at residence. Verified address and obtained payment commitment.'
  );
  const [interaction, setInteraction] = useState<string>(
    'Customer explained business revenue dip. Cooperative.'
  );
  const [isStarting, setIsStarting] = useState(false);

  if (!isOpen) return null;

  const isCurrentActive = activeVisit && activeVisit.accountId === account.accountId;

  const handleStart = async () => {
    setIsStarting(true);
    await startFieldVisit(account.accountId);
    setIsStarting(false);
  };

  const handleComplete = () => {
    if (activeVisit) {
      completeFieldVisit(activeVisit.id, status, remarks, interaction);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <MapPin className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                {isCurrentActive ? 'Active Field Visit in Progress' : 'Start On-Ground Field Visit'}
              </h3>
              <p className="text-xs text-slate-500">{account.customerName} • {account.address}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {!isCurrentActive ? (
            <div className="space-y-4 text-center py-2">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-1.5">
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-500">Target Address:</span>
                  <span className="text-slate-800 font-semibold">{account.address}</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span className="text-slate-500">Target GPS:</span>
                  <span className="text-emerald-700 font-bold">{account.latitude}° N, {account.longitude}° E</span>
                </div>
              </div>

              <p className="text-slate-600 text-xs">
                Starting the field visit will capture your live GPS coordinates, initialize visit audit timer, and allow one-click geo-tagged photo watermark capture.
              </p>

              <button
                type="button"
                disabled={isStarting}
                onClick={handleStart}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm cursor-pointer transition"
              >
                <MapPin className="w-4 h-4" />
                <span>{isStarting ? 'Capturing GPS & Starting...' : 'Start Field Visit Now'}</span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-emerald-800 font-bold text-xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    Visit Started at {activeVisit.startTime}
                  </span>
                  <span className="font-mono text-[11px] text-emerald-700 font-semibold">
                    GPS: {typeof activeVisit.latitude === 'number' ? activeVisit.latitude.toFixed(6) : '0.000000'}° N, {typeof activeVisit.longitude === 'number' ? activeVisit.longitude.toFixed(6) : '0.000000'}° E
                  </span>
                </div>
                {onOpenWatermarkCamera && (
                  <button
                    type="button"
                    onClick={onOpenWatermarkCamera}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1 shadow-sm cursor-pointer transition"
                  >
                    <span>📸 Take Geo-Photo</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Field Visit Outcome / Status:</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as VisitStatus)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="Customer Met">Customer Met Personally</option>
                  <option value="Door Locked">Door Locked (Neighbour Inquiry)</option>
                  <option value="Address Shifted">Address Shifted / Untraceable</option>
                  <option value="Payment Collected">Payment Collected on Spot</option>
                  <option value="PTP Obtained">PTP Commitment Obtained</option>
                  <option value="Neighbour Inquired">Neighbour Inquired</option>
                  <option value="Refused">Customer Refused Payment</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Customer Interaction Details:</label>
                <textarea
                  rows={2}
                  value={interaction}
                  onChange={(e) => setInteraction(e.target.value)}
                  placeholder="Notes on customer attitude, asset inspection, co-borrower statement..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Final Visit Remarks for Audit:</label>
                <textarea
                  rows={2}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Summary remarks stamped to Google Sheets..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-medium cursor-pointer transition"
                >
                  Keep Active in Background
                </button>
                <button
                  type="button"
                  onClick={handleComplete}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
                >
                  Complete &amp; Submit Field Visit
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 5. Upload Document Modal (with Google Drive Picker Integration)
// -------------------------------------------------------------
export const UploadDocumentModal: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}> = ({ account, isOpen, onClose }) => {
  const { uploadDocument, attachGoogleDriveDocument } = useSRMS();
  const [docType, setDocType] = useState<DocumentType>('PAN / Aadhaar KYC');
  const [fileName, setFileName] = useState<string>(`KYC_Proof_${account.accountId}.pdf`);
  const [fileSize, setFileSize] = useState<number>(340000);
  const [pickedFile, setPickedFile] = useState<PickedDriveFile | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setFileName(file.name);
      setFileSize(file.size);
      setPickedFile(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUploading(true);
    try {
      if (pickedFile) {
        attachGoogleDriveDocument(account.accountId, pickedFile, docType);
      } else {
        await uploadDocument({
          accountId: account.accountId,
          documentType: docType,
          fileName,
          fileSizeBytes: selectedFile ? selectedFile.size : fileSize,
          file: selectedFile || undefined,
        });
      }
      onClose();
    } catch (err) {
      console.error('Document upload error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const handlePickedFromDrive = (files: PickedDriveFile[]) => {
    if (files && files.length > 0) {
      const f = files[0];
      setPickedFile(f);
      setSelectedFile(null);
      setFileName(f.name);
      if (f.sizeBytes) setFileSize(f.sizeBytes);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Attach Document / Evidence</h3>
              <p className="text-xs text-slate-500">{account.customerName} ({account.accountId})</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isUploading} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* 3-Tier Architecture Clarification Banner */}
          <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between gap-3 text-emerald-900">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <p className="font-bold text-xs">Direct to Google Drive (5 TB Store)</p>
                <p className="text-[10px] text-emerald-700">Zero bytes stored in Firebase • Real-time metadata routed via Firestore</p>
              </div>
            </div>
            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded border border-emerald-300">
              5 TB Available
            </span>
          </div>

          {/* Quick Picker Banner */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-indigo-600 shrink-0" />
              <div>
                <p className="font-bold text-indigo-950">Google Drive Picker</p>
                <p className="text-[11px] text-indigo-700">Select borrower KYC or notices directly from Drive</p>
              </div>
            </div>
            <GooglePickerButton
              onFilesSelected={handlePickedFromDrive}
              viewMode="all"
              buttonText="Open Picker"
              size="sm"
              variant="primary"
            />
          </div>

          {pickedFile && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="font-bold text-[11px] truncate max-w-xs">{pickedFile.name}</p>
                  <p className="text-[10px] text-emerald-700">Drive ID: {pickedFile.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickedFile(null)}
                className="text-xs text-emerald-700 hover:text-emerald-900 underline cursor-pointer"
              >
                Clear
              </button>
            </div>
          )}

          <div>
            <label className="block text-slate-700 font-semibold mb-1">Document Category:</label>
            <select
              value={docType}
              onChange={(e) => {
                const type = e.target.value as DocumentType;
                setDocType(type);
                if (!pickedFile && !selectedFile) {
                  setFileName(`${type.replace(/[^a-zA-Z0-9]/g, '_')}_${account.accountId}.pdf`);
                }
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="PAN / Aadhaar KYC">PAN / Aadhaar KYC Proof</option>
              <option value="Salary / Income Proof">Salary / Income Proof / Bank Statement</option>
              <option value="Recovery Payment Receipt">Recovery Payment Receipt Slip</option>
              <option value="Visit Panchnama Proof">Visit Panchnama / Witness Proof</option>
              <option value="Legal Demand Notice">Legal Demand Notice / SARFAESI</option>
              <option value="Asset / Vehicle Photo">Asset / Vehicle Photo Proof</option>
              <option value="Dispute Settlement Form">Dispute Settlement Form</option>
            </select>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">File Name:</label>
            <input
              type="text"
              value={fileName}
              onChange={(e) => setFileName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
              required
            />
          </div>

          {!pickedFile && (
            <div className="relative p-4 border-2 border-dashed border-slate-300 rounded-xl text-center bg-slate-50 space-y-2 hover:border-indigo-400 transition">
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
              />
              <Upload className="w-5 h-5 text-slate-400 mx-auto" />
              {selectedFile ? (
                <div>
                  <p className="text-emerald-700 font-bold text-xs truncate max-w-xs mx-auto">{selectedFile.name}</p>
                  <p className="text-[10px] text-slate-500">{(selectedFile.size / 1024).toFixed(1)} KB • Ready for Direct Drive Storage</p>
                </div>
              ) : (
                <div>
                  <p className="text-slate-700 font-medium text-xs">Select or Drag PDF / JPEG / PNG file</p>
                  <p className="text-[10px] text-slate-400">Directly uploads to Google Drive folder /SRMS/Accounts/{account.accountId}/Documents</p>
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-medium cursor-pointer transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold rounded-xl shadow-sm cursor-pointer transition flex items-center gap-1.5"
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Uploading to Drive...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{pickedFile ? 'Attach Drive Pointer' : 'Upload to Google Drive'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 6. WhatsApp Notification Trigger Modal
// -------------------------------------------------------------
export const WhatsAppTriggerModal: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}> = ({ account, isOpen, onClose }) => {
  const [recipient, setRecipient] = useState<'customer' | 'coordinator' | 'agent'>('customer');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (recipient === 'customer') {
      setMessage(
        `Dear ${account.customerName},\n\nThis is regarding your Loan Account ${account.accountId}. Overdue amount of ₹${account.overdueAmount.toLocaleString('en-IN')} is pending. Please pay immediately via UPI/Branch or meet Recovery Agent ${account.assignedAgentName} to avoid legal escalation.\n\nSRMS Recovery Desk`
      );
    } else if (recipient === 'coordinator') {
      setMessage(
        `[SRMS UPDATE] Account ${account.accountId} (${account.customerName}): Overdue ₹${account.overdueAmount.toLocaleString('en-IN')}, PTPs Taken: ${account.ptpCount ?? 0}. Agent ${account.assignedAgentName} has logged follow-up.`
      );
    } else {
      setMessage(
        `[SRMS AGENT ALERT] Priority field visit requested for Account ${account.accountId} (${account.customerName}) at ${account.address}. Overdue: ₹${account.overdueAmount.toLocaleString('en-IN')}.`
      );
    }
  }, [recipient, account]);

  if (!isOpen) return null;

  const targetMobile = recipient === 'customer' ? account.mobile : '+919822011223';
  const cleanMobile = targetMobile.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${cleanMobile}?text=${encodeURIComponent(message)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        <div className="px-6 py-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-600 rounded-xl text-white shadow-sm">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-emerald-950">WhatsApp Notification Center</h3>
              <p className="text-xs text-emerald-700">Direct instant alert via WhatsApp API / Web</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Target Recipient:</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'customer', label: `Customer (${account.customerName.slice(0, 10)})` },
                { id: 'coordinator', label: 'Coordinator Alert' },
                { id: 'agent', label: 'Agent Reminder' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRecipient(r.id as any)}
                  className={`py-2 px-2 rounded-xl font-semibold text-center border transition cursor-pointer ${
                    recipient === r.id
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-semibold mb-1">WhatsApp Message Body:</label>
            <textarea
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 font-mono leading-relaxed focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-[11px]">
            <span className="text-slate-500">Destination Mobile:</span>
            <span className="font-mono font-bold text-emerald-700">{targetMobile}</span>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-medium cursor-pointer transition"
            >
              Close
            </button>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClose}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-sm flex items-center gap-1.5 cursor-pointer transition"
            >
              <Send className="w-4 h-4" />
              <span>Open in WhatsApp</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 7. AI Recovery Pitch & Risk Analyzer Drawer
// -------------------------------------------------------------
export const AIRecoveryDrawer: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}> = ({ account, isOpen, onClose }) => {
  const { analyzeAccountAI } = useSRMS();
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState<any | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadAIAnalysis();
    }
  }, [isOpen, account.accountId]);

  const loadAIAnalysis = async () => {
    setLoading(true);
    const data = await analyzeAccountAI(account.accountId);
    setAiData(data);
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl text-slate-800">
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-600 rounded-xl text-white shadow-sm">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                AI Recovery Intelligence &amp; Strategy
              </h2>
              <p className="text-xs text-blue-600 font-mono font-medium">
                {account.customerName} ({account.accountId})
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs bg-[#f8fafc]">
          {loading ? (
            <div className="text-center py-16 space-y-3">
              <Sparkles className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-slate-800 font-semibold text-sm">Analyzing repayment history &amp; PTP commitments...</p>
              <p className="text-slate-500 text-xs">Formulating on-ground settlement strategy</p>
            </div>
          ) : aiData ? (
            <div className="space-y-4">
              {/* Risk Level Badge */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500 text-[11px] block font-medium">Default Risk Assessment</span>
                  <span className="text-lg font-black text-red-600">{aiData.riskLevel} Risk</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-amber-600">{aiData.riskScore}/100</span>
                  <span className="text-[10px] text-slate-500 block">Risk Score</span>
                </div>
              </div>

              {/* Recommended Action */}
              <div className="p-4 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
                <span className="text-blue-800 font-bold uppercase tracking-wider text-[11px] block">
                  🎯 Recommended Field Agent Action
                </span>
                <p className="text-slate-700 text-xs leading-relaxed font-medium">
                  {aiData.recommendedAction}
                </p>
              </div>

              {/* Settlement Strategy */}
              <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1.5">
                <span className="text-purple-800 font-bold uppercase tracking-wider text-[11px] block">
                  💡 Settlement &amp; Installment Strategy
                </span>
                <p className="text-slate-700 text-xs leading-relaxed font-medium">
                  {aiData.settlementStrategy}
                </p>
              </div>

              {/* Field Visit Tip */}
              <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                <span className="text-amber-800 font-bold uppercase tracking-wider text-[11px] block">
                  📍 In-Person Negotiation Talk-Track
                </span>
                <p className="text-slate-700 text-xs leading-relaxed font-medium">
                  {aiData.fieldVisitTip}
                </p>
              </div>

              {/* WhatsApp Script */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2">
                <span className="text-emerald-700 font-bold uppercase tracking-wider text-[11px] block">
                  💬 Tailored Payment Script
                </span>
                <p className="text-slate-700 font-mono text-xs p-3 bg-slate-50 rounded-lg border border-slate-200 whitespace-pre-line leading-relaxed">
                  {aiData.whatsappScript}
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------
// 7. Add Agent Note Modal
// -------------------------------------------------------------
export const AddAgentNoteModal: React.FC<{
  account: Account;
  isOpen: boolean;
  onClose: () => void;
}> = ({ account, isOpen, onClose }) => {
  const { addAgentNote, currentUser } = useSRMS();
  const [noteCategory, setNoteCategory] = useState<string>('General');
  const [noteText, setNoteText] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;

    setIsSubmitting(true);
    addAgentNote(account.accountId, noteText.trim(), noteCategory);
    setIsSubmitting(false);
    setNoteText('');
    onClose();
  };

  const quickNotes = [
    'Customer promised repayment by next week.',
    'Met customer at business premise. Shop operational.',
    'Customer requested loan restructuring / interest waiver.',
    'Customer unreachable on phone, neighbor confirmed residence.',
    'Customer disputed interest calculation. Escalated to branch manager.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="px-6 py-4 bg-[#0f172a] text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-xl">
              <MessageSquare className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-white">Add Agent Note &amp; Remark</h3>
              <p className="text-xs text-slate-300">
                {account.customerName} • {account.loanNumber}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Category */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Note Category / Tag:</label>
            <select
              value={noteCategory}
              onChange={(e) => setNoteCategory(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              <option value="General">General Note</option>
              <option value="PTP Commitment">PTP / Payment Commitment</option>
              <option value="Field Visit">Field Visit Observation</option>
              <option value="Follow Up">Follow-up Call Remark</option>
              <option value="Customer Dispute">Borrower Dispute / Calculation</option>
              <option value="Legal / Notice">Legal Notice &amp; Arbitration</option>
              <option value="Payment Collection">Payment Receipt Note</option>
              <option value="Skipped / Untraceable">Customer Untraceable / Skipped</option>
            </select>
          </div>

          {/* Quick Pre-fill Chips */}
          <div>
            <label className="block text-slate-500 font-medium mb-1.5 text-[11px]">Quick Pre-fill Templates:</label>
            <div className="flex flex-wrap gap-1.5">
              {quickNotes.map((qn, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setNoteText(qn)}
                  className="text-[10px] bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-200 transition text-left cursor-pointer"
                >
                  + {qn}
                </button>
              ))}
            </div>
          </div>

          {/* Note input */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Agent Detailed Note &amp; Ground Intel:</label>
            <textarea
              rows={4}
              required
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter exact customer statement, current whereabouts, asset conditions, promises made, or recovery instructions..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-slate-400"
            />
          </div>

          {/* Agent info banner */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-600 flex items-center justify-between text-[11px]">
            <span>
              Author: <strong>{currentUser.name}</strong> ({currentUser.agentId || currentUser.role})
            </span>
            <span>Date: {new Date().toLocaleDateString('en-IN')}</span>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!noteText.trim() || isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-sm flex items-center gap-1.5 transition cursor-pointer disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>Save Agent Note</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
