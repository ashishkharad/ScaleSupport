import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Copy,
  Check,
  ExternalLink,
  ShieldAlert,
  User,
  Phone,
  Building,
  FileText,
  AlertCircle,
  Clock,
  History,
  Info,
} from 'lucide-react';
import { Account } from '../../types';
import { useSRMS } from '../../context/SRMSContext';
import {
  generateWhatsAppOTSTemplate,
  sanitizeWhatsAppPhone,
  createWhatsAppDeepLink,
  evaluateOTSSlab,
} from '../../utils/otsScheme';

interface WhatsAppOTSOfferModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: Account;
  relatedAccounts?: Account[];
}

export const WhatsAppOTSOfferModal: React.FC<WhatsAppOTSOfferModalProps> = ({
  isOpen,
  onClose,
  account,
  relatedAccounts,
}) => {
  const { currentUser, logWhatsAppOffer, whatsAppLogs, accounts: allAccounts } = useSRMS();

  // Find all linked accounts for this customer
  const linkedAccounts = useMemo(() => {
    if (relatedAccounts && relatedAccounts.length > 0) return relatedAccounts;
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

  const isMultiAccount = linkedAccounts.length > 1;

  const totalOutstanding = useMemo(() => {
    if (isMultiAccount) {
      return linkedAccounts.reduce(
        (sum, a) => sum + Math.max(0, a.originalOutstandingAmount || a.outstandingAmount || 0),
        0
      );
    }
    return Math.max(0, account.originalOutstandingAmount || account.outstandingAmount || 0);
  }, [isMultiAccount, linkedAccounts, account.originalOutstandingAmount, account.outstandingAmount]);

  const finalOTSAmount = useMemo(() => {
    if (isMultiAccount) {
      const sumOfOTS = linkedAccounts.reduce((sum, a) => {
        const ots =
          a.finalOTSAmount && a.finalOTSAmount > 0
            ? a.finalOTSAmount
            : a.userEnteredOTSAmount && a.userEnteredOTSAmount > 0
            ? a.userEnteredOTSAmount
            : a.systemCalculatedOTSAmount && a.systemCalculatedOTSAmount > 0
            ? a.systemCalculatedOTSAmount
            : 0;
        return sum + ots;
      }, 0);
      if (sumOfOTS > 0) return sumOfOTS;
      const evalResult = evaluateOTSSlab(totalOutstanding, account.npaDate, account.bankName);
      if (evalResult.slabDefined && evalResult.systemCalculatedOTSAmount > 0) {
        return evalResult.systemCalculatedOTSAmount;
      }
      return Math.round(totalOutstanding * 0.5);
    }

    if (account.finalOTSAmount && account.finalOTSAmount > 0) {
      return account.finalOTSAmount;
    }
    if (account.userEnteredOTSAmount && account.userEnteredOTSAmount > 0) {
      return account.userEnteredOTSAmount;
    }
    if (account.systemCalculatedOTSAmount && account.systemCalculatedOTSAmount > 0) {
      return account.systemCalculatedOTSAmount;
    }
    const evalResult = evaluateOTSSlab(totalOutstanding, account.npaDate, account.bankName);
    if (evalResult.slabDefined && evalResult.systemCalculatedOTSAmount > 0) {
      return evalResult.systemCalculatedOTSAmount;
    }
    return Math.round(totalOutstanding * 0.5);
  }, [
    isMultiAccount,
    linkedAccounts,
    account.finalOTSAmount,
    account.userEnteredOTSAmount,
    account.systemCalculatedOTSAmount,
    account.npaDate,
    account.bankName,
    totalOutstanding,
  ]);

  // Generate the initial exact template text
  const initialText = useMemo(() => {
    const evalResult = evaluateOTSSlab(totalOutstanding, account.npaDate, account.bankName);
    return generateWhatsAppOTSTemplate({
      customerName: account.customerName || 'ग्राहक',
      bankName: account.bankName || 'बँक',
      accountNumber: account.loanNumber || account.accountId || 'N/A',
      totalOutstanding,
      finalOTSAmount,
      userName: currentUser.name || 'Recovery Vendor',
      userMobile: currentUser.mobile || '',
      validTill: account.otsValidTill || evalResult.validTill,
      accounts: isMultiAccount
        ? linkedAccounts.map((a) => ({
            accountNumber: a.loanNumber || a.accountId,
            bankName: a.bankName || account.bankName,
            totalOutstanding: Math.max(0, a.originalOutstandingAmount || a.outstandingAmount || 0),
            finalOTSAmount: a.finalOTSAmount || a.userEnteredOTSAmount,
            facility: a.facility || a.loanType,
          }))
        : undefined,
    });
  }, [
    account.customerName,
    account.bankName,
    account.loanNumber,
    account.accountId,
    account.npaDate,
    account.otsValidTill,
    totalOutstanding,
    finalOTSAmount,
    currentUser.name,
    currentUser.mobile,
    isMultiAccount,
    linkedAccounts,
  ]);

  const [messageText, setMessageText] = useState<string>(initialText);
  const [recipientMobile, setRecipientMobile] = useState<string>(account.mobile || '');
  const [copied, setCopied] = useState<boolean>(false);
  const [dispatchedSuccess, setDispatchedSuccess] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'compose' | 'history'>('compose');

  useEffect(() => {
    setMessageText(initialText);
    setRecipientMobile(account.mobile || '');
    setCopied(false);
    setDispatchedSuccess(false);
  }, [initialText, account.mobile]);

  if (!isOpen) return null;

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(messageText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleOpenWhatsApp = () => {
    const cleanPhone = sanitizeWhatsAppPhone(recipientMobile);
    const deepLink = createWhatsAppDeepLink(cleanPhone, messageText);

    // Fulfill Requirement 5: Log Date/Time, Customer, Account, User, Mobile Number, Message Type, Message Preview
    logWhatsAppOffer({
      customerName: account.customerName,
      accountId: account.accountId,
      loanNumber: account.loanNumber,
      bankName: account.bankName,
      customerMobile: recipientMobile || account.mobile || 'Unknown',
      userId: currentUser.agentId || currentUser.id,
      userName: currentUser.name,
      userMobile: currentUser.mobile || 'Not Set',
      totalOutstanding,
      finalOTSAmount,
      messageType: 'WhatsApp OTS Offer',
      messagePreview: messageText,
    });

    setDispatchedSuccess(true);

    // Open in new window/tab
    try {
      const win = window.open(deepLink, '_blank', 'noopener,noreferrer');
      if (!win) {
        window.location.href = deepLink;
      }
    } catch {
      window.location.href = deepLink;
    }
  };

  // Filter logs for this account
  const accountLogs = whatsAppLogs.filter(
    (l) => l.accountId === account.accountId || l.customerMobile === account.mobile
  );

  return (
    <div
      id="whatsapp-ots-offer-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs overflow-y-auto"
    >
      <div
        id="whatsapp-ots-offer-modal-card"
        className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-auto"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 via-teal-900 to-emerald-950 px-6 py-4 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-300">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-white">WhatsApp OTS Offer Dispatch</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-400/20 border border-emerald-300/30 text-emerald-200 rounded-full">
                  Official Marathi Template
                </span>
              </div>
              <p className="text-xs text-emerald-200 mt-0.5">
                {account.customerName} • {account.loanNumber || account.accountId} • {account.bankName || 'Bank'}
              </p>
            </div>
          </div>
          <button
            id="close-whatsapp-modal-btn"
            onClick={onClose}
            className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 bg-slate-50 text-xs font-semibold">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('compose')}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'compose'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>Compose &amp; Preview</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-3 px-4 border-b-2 transition flex items-center gap-2 cursor-pointer ${
                activeTab === 'history'
                  ? 'border-emerald-600 text-emerald-700 font-bold'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Dispatched History ({accountLogs.length})</span>
            </button>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            Sender: <strong>{currentUser.name}</strong>
          </span>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[72vh] overflow-y-auto space-y-4">
          {dispatchedSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
              <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <strong>WhatsApp Opened &amp; Logged:</strong> Pre-filled message link was opened. The action has been recorded in the permanent audit trail as <em>"Dispatched via WhatsApp Link"</em>.
              </div>
            </div>
          )}

          {activeTab === 'compose' ? (
            <>
              {/* Dynamic Data Verification Bar */}
              {isMultiAccount && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold flex items-center gap-1.5">
                      <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-[10px] font-bold">
                        MULTI-ACCOUNT
                      </span>
                      {linkedAccounts.length} Accounts Linked for {account.customerName}
                    </span>
                    <span className="text-[11px] text-blue-700 font-medium">
                      All accounts included in WhatsApp template
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {linkedAccounts.map((la, idx) => (
                      <div
                        key={la.accountId || idx}
                        className="p-2 bg-white/80 rounded-lg border border-blue-100 flex items-center justify-between text-[11px]"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-800">
                            {la.loanNumber || la.accountId}
                          </span>
                          {la.facility && (
                            <span className="text-slate-500 ml-1">({la.facility})</span>
                          )}
                        </div>
                        <div className="font-mono text-right">
                          <span className="text-slate-600">
                            ₹{Number(la.originalOutstandingAmount || la.outstandingAmount || 0).toLocaleString('en-IN')}
                          </span>
                          {la.finalOTSAmount && (
                            <span className="text-emerald-700 font-bold ml-1.5">
                              OTS: ₹{Number(la.finalOTSAmount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">Customer</span>
                  <strong className="text-slate-800 truncate block">{account.customerName}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    {isMultiAccount ? 'Bank & Accounts' : 'Bank & Account'}
                  </span>
                  <strong className="text-slate-800 truncate block">
                    {account.bankName || 'Bank'} • {isMultiAccount ? `${linkedAccounts.length} Linked Accounts` : (account.loanNumber || account.accountId)}
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    {isMultiAccount ? 'Total Combined Outstanding' : 'Total Outstanding'}
                  </span>
                  <strong className="text-slate-900 font-mono">₹{totalOutstanding.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase font-medium">
                    {isMultiAccount ? 'Total Consolidated OTS' : 'Final OTS Offer'}
                  </span>
                  <strong className="text-emerald-700 font-mono">₹{finalOTSAmount.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Sender Identity (Strictly from Logged-in User Profile - No Impersonation) */}
              <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-700 shrink-0" />
                  <div>
                    <span className="text-slate-600">Sender Identity (Logged-in User): </span>
                    <strong className="text-slate-900">{currentUser.name}</strong>
                    <span className="text-slate-500 ml-1.5">📞 {currentUser.mobile || 'No mobile saved in profile'}</span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded">
                  Impersonation Locked
                </span>
              </div>

              {/* Recipient Mobile */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recipient WhatsApp Mobile Number:
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    id="recipient-whatsapp-mobile-input"
                    type="tel"
                    value={recipientMobile}
                    onChange={(e) => setRecipientMobile(e.target.value)}
                    placeholder="Enter 10-digit customer mobile number"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Editable Message Preview (Fulfills Requirement 5) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Editable WhatsApp Message Preview (Marathi Template):</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyText}
                    className="text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    id="whatsapp-message-preview-textarea"
                    rows={12}
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    className="w-full p-3.5 bg-slate-50 border border-slate-300 rounded-xl text-xs leading-relaxed text-slate-900 font-sans focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-inner"
                    placeholder="Message preview..."
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400 shrink-0" />
                  <span>
                    You may refine or review the text before dispatching. Clicking below opens WhatsApp with this pre-filled message.
                  </span>
                </p>
              </div>

              {/* API Notice / Status Clarification (Fulfills Requirement 5) */}
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <strong>Delivery Status Notice:</strong> Clicking "Open in WhatsApp" dispatches the pre-filled template link directly to the WhatsApp client. The system logs this dispatch in the audit trail without falsely claiming "Delivered" or "Read" until official webhook integration is enabled.
                </div>
              </div>
            </>
          ) : (
            /* History of WhatsApp Dispatches */
            <div className="space-y-3">
              <div className="text-xs font-semibold text-slate-700">
                Logged WhatsApp Offers for this Account:
              </div>

              {accountLogs.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs">
                  No WhatsApp offers dispatched for this customer yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {accountLogs.map((log) => (
                    <div key={log.id} className="p-3.5 bg-white hover:bg-slate-50 transition text-xs space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                            {log.status}
                          </span>
                          <span className="font-bold text-slate-800">To: {log.customerMobile}</span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
                      </div>

                      <div className="text-[11px] text-slate-600 flex flex-wrap gap-4 font-mono">
                        <span>Sender: <strong>{log.userName}</strong> ({log.userMobile})</span>
                        <span>OTS: <strong>₹{log.finalOTSAmount.toLocaleString('en-IN')}</strong></span>
                      </div>

                      <div className="p-2 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-700 whitespace-pre-line font-sans">
                        {log.messagePreview}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-slate-700 hover:text-slate-900 bg-white border border-slate-300 font-semibold rounded-xl hover:bg-slate-50 transition cursor-pointer"
          >
            Close
          </button>

          {activeTab === 'compose' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3.5 py-2 text-slate-700 bg-white border border-slate-300 font-semibold rounded-xl hover:bg-slate-50 transition flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Message'}</span>
              </button>

              <button
                id="send-whatsapp-deep-link-btn"
                type="button"
                onClick={handleOpenWhatsApp}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>Open in WhatsApp</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
