import React, { useState, useEffect } from 'react';
import { CheckCircle, X, ShieldAlert, Archive, CheckCircle2, FileCheck, Layers } from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account } from '../../types';
import { formatINR } from '../../utils/watermark';

interface CloseAccountModalProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CloseAccountModal: React.FC<CloseAccountModalProps> = ({
  account,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { closeAccount, deleteAccount, currentUser } = useSRMS();

  const isOTSDefault = Boolean(
    account?.otsActive ||
    account?.otsStatus === 'OTS Settled' ||
    ((account?.otsAgreedAmount ?? 0) > 0) ||
    account?.recoveryStatus?.includes('OTS')
  );

  const [closureType, setClosureType] = useState<'Closed as per OTS' | 'Regular Close' | 'Administrative Deletion'>(
    isOTSDefault ? 'Closed as per OTS' : 'Regular Close'
  );
  const [remarks, setRemarks] = useState(
    isOTSDefault
      ? 'OTS agreed settlement amount completed by customer. Account officially closed as per OTS sanction terms.'
      : 'Full loan dues cleared by customer. Account marked as regular closure.'
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (account) {
      const isOts = Boolean(
        account.otsActive ||
        account.otsStatus === 'OTS Settled' ||
        ((account.otsAgreedAmount ?? 0) > 0) ||
        account.recoveryStatus?.includes('OTS')
      );
      setClosureType(isOts ? 'Closed as per OTS' : 'Regular Close');
      setRemarks(
        isOts
          ? 'OTS agreed settlement amount completed by customer. Account officially closed as per OTS sanction terms.'
          : 'Full loan dues cleared by customer. Account marked as regular closure.'
      );
      setErrorMsg('');
    }
  }, [account?.accountId, account?.otsActive, account?.otsStatus, account?.otsAgreedAmount]);

  if (!isOpen || !account) return null;

  const handleMarkClosedOnly = async () => {
    if (!account) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await closeAccount(account.accountId, closureType, remarks);
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to close account.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAndArchive = async () => {
    if (!account) return;
    setIsProcessing(true);
    setErrorMsg('');
    try {
      const res = await deleteAccount(account.accountId, closureType, remarks);
      if (res.success) {
        onSuccess?.();
        onClose();
      } else {
        setErrorMsg(res.message);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to archive account.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans animate-in fade-in duration-150">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <FileCheck className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-sm text-white">Account Closure &amp; Archive</h3>
              <p className="text-xs text-slate-300">{account.customerName} • {account.loanNumber || account.accountId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Account Summary Banner */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Total Recovered</span>
              <span className="text-sm font-black text-emerald-700 font-mono">{formatINR(account.totalRecovered || 0)}</span>
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block">Current POS / Balance</span>
              <span className="text-sm font-black text-slate-800 font-mono">{formatINR(account.outstandingAmount || 0)}</span>
            </div>
            {account.otsAgreedAmount ? (
              <div>
                <span className="text-[11px] text-indigo-600 font-semibold block">Agreed OTS</span>
                <span className="text-sm font-black text-indigo-700 font-mono">{formatINR(account.otsAgreedAmount)}</span>
              </div>
            ) : null}
          </div>

          {account.isMultipleAccount && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg flex items-center gap-2 text-[11px] text-blue-900 font-semibold">
              <Layers className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Multi-account customer: OTS scheme applies as merged payment across all linked customer accounts.</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Closure Type Selection */}
          <div className="space-y-2">
            <label className="block text-slate-800 font-bold">Select Closure Type:</label>
            
            <div className="grid grid-cols-1 gap-2">
              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  closureType === 'Closed as per OTS'
                    ? 'bg-indigo-50/80 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="closureType"
                  value="Closed as per OTS"
                  checked={closureType === 'Closed as per OTS'}
                  onChange={() => {
                    setClosureType('Closed as per OTS');
                    setRemarks('OTS agreed settlement amount completed by customer. Account officially closed as per OTS sanction terms.');
                  }}
                  className="mt-0.5 text-indigo-600 focus:ring-indigo-500"
                />
                <div>
                  <span className="font-extrabold text-xs block text-indigo-900">Closed as per OTS</span>
                  <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                    Customer completed agreed One-Time Settlement payment. Account is officially closed with waiver discount recorded.
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                  closureType === 'Regular Close'
                    ? 'bg-emerald-50/80 border-emerald-500 text-emerald-950 ring-1 ring-emerald-500'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="closureType"
                  value="Regular Close"
                  checked={closureType === 'Regular Close'}
                  onChange={() => {
                    setClosureType('Regular Close');
                    setRemarks('Full loan dues cleared by customer without concession. Regular account closure recorded.');
                  }}
                  className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                />
                <div>
                  <span className="font-extrabold text-xs block text-emerald-900">Regular Close</span>
                  <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                    Customer cleared full overdue / outstanding dues without waiver concessions. Standard regular closure.
                  </span>
                </div>
              </label>

              {currentUser.role === 'admin' && (
                <label
                  className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer transition ${
                    closureType === 'Administrative Deletion'
                      ? 'bg-slate-100 border-slate-400 text-slate-900 ring-1 ring-slate-400'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="closureType"
                    value="Administrative Deletion"
                    checked={closureType === 'Administrative Deletion'}
                    onChange={() => {
                      setClosureType('Administrative Deletion');
                      setRemarks('Administrative removal from active workspace. Archived in backend.');
                    }}
                    className="mt-0.5 text-slate-600 focus:ring-slate-500"
                  />
                  <div>
                    <span className="font-extrabold text-xs block text-slate-900">Administrative Archive &amp; Removal (Admin)</span>
                    <span className="text-[11px] text-slate-600 leading-relaxed block mt-0.5">
                      Admin archive and delete from active view without formal settlement.
                    </span>
                  </div>
                </label>
              )}
            </div>
          </div>

          {/* Closure Remarks */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Closure Remarks &amp; Audit Notes:</label>
            <textarea
              rows={2}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              placeholder="Provide reason or reference document details for closing..."
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold cursor-pointer transition"
            >
              Cancel
            </button>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleMarkClosedOnly}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition"
                title="Mark status as closed, keeping account visible in portfolio"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Mark Status Closed</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteAndArchive}
                disabled={isProcessing}
                className="flex-1 sm:flex-initial px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50 transition"
                title="Archive and delete from active view as closed per OTS or regular close"
              >
                <Archive className="w-4 h-4" />
                <span>Delete &amp; Archive</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
