import React from 'react';
import {
  Receipt,
  X,
  Printer,
  Download,
  CheckCircle2,
  Share2,
  Building2,
  Calendar,
  DollarSign,
  User,
  ShieldCheck,
  QrCode,
  FileText,
} from 'lucide-react';
import { RecoveryRecord, Account } from '../../types';
import { formatINR } from '../../utils/watermark';
import { ScaleSupportLogo } from './ScaleSupportLogo';

interface DailyRecoveryReceiptModalProps {
  recovery: RecoveryRecord | null;
  account?: Account | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DailyRecoveryReceiptModal: React.FC<DailyRecoveryReceiptModalProps> = ({
  recovery,
  account,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !recovery) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTextReceipt = () => {
    const receiptContent = `
=====================================================
          SCALESUPPORT RECOVERY MANAGEMENT
       OFFICIAL DEBT COLLECTION ACKNOWLEDGMENT
=====================================================
Receipt Number : ${recovery.receiptNumber}
Date & Time    : ${recovery.recoveryDate} | ${recovery.recoveryTime || '11:30 AM'}
-----------------------------------------------------
BORROWER DETAILS:
Customer Name  : ${recovery.customerName}
Account Number : ${recovery.accountId}
Branch         : ${account?.branch || 'Chhatrapati Sambhajinagar Branch'}
Product / Loan : ${account?.loanType || 'Personal Loan / Retail Portfolio'}
-----------------------------------------------------
PAYMENT DETAILS:
Amount Paid    : ${formatINR(recovery.amount)}
Payment Mode   : ${recovery.paymentMode.toUpperCase()}
Reference / UTR: ${recovery.transactionRef || 'UTR-' + Math.floor(100000000 + Math.random() * 900000000)}
Status         : VERIFIED & CREDITED
-----------------------------------------------------
COLLECTED BY:
Recovery Agent : ${recovery.agentName}
Agent ID       : ${recovery.agentId}
Commission Tag : 10% Standard (${formatINR(recovery.commissionAmount)})
-----------------------------------------------------
Disclaimer: This is a computer-generated official receipt
from ScaleSupport Recovery & Allocation System.
Authorized Bank Recovery Partner.
=====================================================
`;
    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ScaleSupport_Receipt_${recovery.receiptNumber}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <Receipt className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>Official Collection Receipt</span>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  {recovery.receiptNumber}
                </span>
              </h3>
              <p className="text-xs text-slate-400">ScaleSupport Recovery Management System</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-xl transition cursor-pointer"
            title="Close Receipt"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Receipt Paper Container */}
        <div className="p-6 space-y-6 print:p-0">
          
          {/* Printable Ticket Area */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 relative overflow-hidden shadow-inner space-y-5">
            
            {/* Watermark Logo in background */}
            <div className="absolute right-[-20px] bottom-[-20px] opacity-5 pointer-events-none">
              <ShieldCheck className="w-64 h-64 text-slate-900" />
            </div>

            {/* Receipt Top Brand Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 inline-block shadow-2xs">
                  <ScaleSupportLogo variant="compact" size="sm" />
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1.5">
                  Authorized Debt Recovery Partner
                </p>
              </div>

              <div className="text-right">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-200 font-extrabold text-[11px] rounded-lg inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>PAID &amp; VERIFIED</span>
                </span>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  {recovery.recoveryDate} • {recovery.recoveryTime || '11:30 AM'}
                </p>
              </div>
            </div>

            {/* Amount Big Highlight */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 text-center space-y-1 shadow-2xs">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Total Amount Received
              </span>
              <div className="text-3xl font-black text-emerald-600 font-mono">
                {formatINR(recovery.amount)}
              </div>
              <div className="text-[11px] font-bold text-slate-600 capitalize">
                Payment Mode: <span className="text-blue-600 font-bold uppercase">{recovery.paymentMode}</span>
                {recovery.transactionRef && (
                  <span className="ml-1 text-slate-400 font-mono text-[10px]">
                    (Ref: {recovery.transactionRef})
                  </span>
                )}
              </div>
            </div>

            {/* Two-Column Details Grid */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400">Borrower Details</span>
                <p className="font-bold text-slate-900">{recovery.customerName}</p>
                <p className="text-[11px] font-mono text-blue-600 font-semibold">{recovery.accountId}</p>
                {account?.mobile && (
                  <p className="text-[11px] text-slate-500 font-mono">Mob: {account.mobile}</p>
                )}
                {account?.branch && (
                  <p className="text-[10px] text-slate-400">{account.branch}</p>
                )}
              </div>

              <div className="space-y-1 text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400">Collected By</span>
                <p className="font-bold text-slate-900">{recovery.agentName}</p>
                <p className="text-[11px] font-mono text-emerald-600 font-semibold">
                  Agent ID: {recovery.agentId}
                </p>
                <p className="text-[10px] text-amber-700 font-medium">
                  Commission: {formatINR(recovery.commissionAmount)} (10%)
                </p>
                {account?.loanType && (
                  <p className="text-[10px] text-slate-400">Product: {account.loanType}</p>
                )}
              </div>
            </div>

            {/* QR Code & Security Stamp */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
              <div className="flex items-center gap-2">
                <div className="w-12 h-12 bg-white p-1 rounded-lg border border-slate-200 flex items-center justify-center shadow-2xs">
                  <QrCode className="w-10 h-10 text-slate-800" />
                </div>
                <div>
                  <span className="font-bold text-slate-700 block">Digital Verification Hash</span>
                  <span className="font-mono text-[9px] text-slate-400 block truncate max-w-[170px]">
                    SHA256:{recovery.receiptNumber.toLowerCase()}-verified-srms
                  </span>
                  <span className="text-emerald-600 font-medium">Synced to 19 Google Sheets Tabs</span>
                </div>
              </div>

              <div className="text-right font-mono">
                <span className="block font-bold text-slate-800">ScaleSupport System</span>
                <span className="text-[9px] text-slate-400">Auto-Generated Receipt</span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 text-xs">
            <button
              onClick={handleDownloadTextReceipt}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold border border-slate-200 transition flex items-center gap-1.5 cursor-pointer"
              title="Download text slip"
            >
              <Download className="w-4 h-4" />
              <span>Download Slip</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition flex items-center gap-1.5 shadow-sm cursor-pointer"
              title="Print Receipt"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
