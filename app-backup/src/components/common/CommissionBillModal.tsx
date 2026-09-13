import React, { useState, useMemo } from 'react';
import {
  FileText,
  Download,
  Printer,
  Calendar,
  Filter,
  X,
  CreditCard,
  User,
  Building2,
  Percent,
  CheckCircle2,
  DollarSign,
  Layers,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { RecoveryRecord, Account } from '../../types';
import { formatINR } from '../../utils/watermark';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface CommissionBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetAgentId?: string;
}

export const CommissionBillModal: React.FC<CommissionBillModalProps> = ({
  isOpen,
  onClose,
  targetAgentId,
}) => {
  const { recoveries, accounts, users, currentUser, commissionSettings } = useSRMS();

  // Find effective agent
  const effectiveAgent = useMemo(() => {
    if (targetAgentId) {
      return (
        users.find((u) => u.agentId === targetAgentId || u.id === targetAgentId) ||
        currentUser
      );
    }
    return currentUser;
  }, [targetAgentId, users, currentUser]);

  // Agent PAN card state (editable and persisted in localStorage)
  const [panCardNo, setPanCardNo] = useState<string>(() => {
    return (
      localStorage.getItem(`srms_pan_${effectiveAgent.agentId || effectiveAgent.id}`) ||
      'CCYPK5511Q'
    );
  });

  const [agentMobile, setAgentMobile] = useState<string>(() => {
    return effectiveAgent.mobile || '9657922770';
  });

  // Selected bill generation date (DD-MM-YYYY)
  const [billDate, setBillDate] = useState<string>(() => {
    return new Date().toISOString().slice(0, 10);
  });

  // Month & Year Filter state (all 12 months + current year)
  const currentYear = new Date().getFullYear();
  const currentMonthNum = String(new Date().getMonth() + 1).padStart(2, '0');
  const [selectedYear, setSelectedYear] = useState<string>(String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthNum);
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // Month definitions for all 12 months
  const allMonthsList = [
    { value: 'all', label: 'All Months (Full Year)' },
    { value: '01', label: 'January' },
    { value: '02', label: 'February' },
    { value: '03', label: 'March' },
    { value: '04', label: 'April' },
    { value: '05', label: 'May' },
    { value: '06', label: 'June' },
    { value: '07', label: 'July' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
  ];

  const availableYears = [String(currentYear), String(currentYear - 1), String(currentYear + 1)];

  // Filter recoveries for agent and date range
  const agentRecoveries = useMemo(() => {
    const isTarget = (r: RecoveryRecord) => {
      if (currentUser.role === 'admin' && !targetAgentId) return true;
      return (
        r.agentId === effectiveAgent.agentId ||
        r.agentId === effectiveAgent.id ||
        (r.agentName && r.agentName.toLowerCase() === effectiveAgent.name.toLowerCase())
      );
    };

    return recoveries.filter((r) => {
      if (!isTarget(r)) return false;

      const recDate = r.recoveryDate || '';

      // Match Year & Month
      if (selectedYear) {
        if (selectedMonth === 'all') {
          if (!recDate.startsWith(selectedYear)) return false;
        } else {
          const targetPrefix = `${selectedYear}-${selectedMonth}`;
          if (!recDate.startsWith(targetPrefix)) return false;
        }
      }

      if (dateFrom && recDate < dateFrom) return false;
      if (dateTo && recDate > dateTo) return false;

      return true;
    });
  }, [recoveries, effectiveAgent, currentUser, targetAgentId, selectedYear, selectedMonth, dateFrom, dateTo]);

  // Join each recovery with its account details
  const billRows = useMemo(() => {
    return agentRecoveries.map((r, index) => {
      const acc = accounts.find((a) => a.accountId === r.accountId);
      const commissionRate = r.commissionPercentage || commissionSettings.defaultRate || 10;
      const commissionAmt = r.commissionAmount || Math.round((r.amount * commissionRate) / 100);

      // Format recovery date to DD-MM-YYYY
      let formattedRecDate = r.recoveryDate;
      if (r.recoveryDate && r.recoveryDate.includes('-')) {
        const parts = r.recoveryDate.split('-');
        if (parts.length === 3 && parts[0].length === 4) {
          formattedRecDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }

      // Format NPA date
      const npaDate = acc?.npaDate || '-';
      // User request: Keep CIF column blank (no auto-filled value)
      const cif = '';
      const zoRefNo = (acc?.customFields && acc.customFields['ZO_REF_NO']) || '-';
      const iracPast = (acc?.customFields && acc.customFields['IRAC_PAST']) || '-';
      const presentIrac = acc?.riskClassification || (acc?.customFields && acc.customFields['PRESENT_IRAC']) || '-';

      return {
        srNo: index + 1,
        zoRefNo,
        cif,
        accountNo: acc?.loanNumber || r.accountId,
        borrowerName: r.customerName || acc?.customerName || 'Borrower',
        recoveryDate: formattedRecDate,
        recoveryAmount: r.amount,
        npaDate,
        iracPast,
        presentIrac,
        commissionRate,
        commissionAmount: commissionAmt,
        branch: acc?.branch || effectiveAgent.branch || 'Mill Corner',
      };
    });
  }, [agentRecoveries, accounts, commissionSettings, effectiveAgent]);

  const totalRecoveryAmount = useMemo(() => {
    return billRows.reduce((sum, r) => sum + r.recoveryAmount, 0);
  }, [billRows]);

  const totalCommissionAmount = useMemo(() => {
    return billRows.reduce((sum, r) => sum + r.commissionAmount, 0);
  }, [billRows]);

  if (!isOpen) return null;

  const handlePanChange = (val: string) => {
    const formatted = val.toUpperCase().trim();
    setPanCardNo(formatted);
    localStorage.setItem(`srms_pan_${effectiveAgent.agentId || effectiveAgent.id}`, formatted);
  };

  const handleDownloadLandscapePDF = () => {
    setIsGeneratingPDF(true);
    try {
      // Landscape A4 document
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      // Format Bill Date as DD-MM-YYYY
      let formattedBillDate = billDate;
      if (billDate.includes('-')) {
        const p = billDate.split('-');
        if (p.length === 3 && p[0].length === 4) {
          formattedBillDate = `${p[2]}-${p[1]}-${p[0]}`;
        }
      }

      // Header details matching reference image
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(`AGENCY NAME : ${effectiveAgent.name.toUpperCase()}`, 14, 15);
      doc.text(`Mo. ${agentMobile}`, 14, 21);

      doc.text(`Pan Card No. : ${panCardNo}`, 160, 15);
      doc.text(`DATE : ${formattedBillDate}`, 240, 15);

      // Build Table Data
      const tableData = billRows.map((r) => [
        String(r.srNo),
        r.zoRefNo,
        r.cif,
        r.accountNo,
        r.borrowerName,
        r.recoveryDate,
        r.recoveryAmount.toLocaleString('en-IN'),
        r.npaDate,
        r.iracPast,
        r.presentIrac,
        `${r.commissionRate}`,
        r.commissionAmount.toLocaleString('en-IN'),
      ]);

      // Add Footer Row in Table
      const branchName = effectiveAgent.branch || 'Mill Corner';

      autoTable(doc, {
        startY: 26,
        head: [
          [
            'Sr No.',
            'ZO Ref No',
            'CIF',
            'A/c No',
            'Borrower Name',
            'Date of Recovery',
            'Rec amt.',
            'NPA Date',
            'IRAC as on 31.03.2025',
            'Present IRAC',
            'Commission % as per circular',
            'Commission amt % as per circular',
          ],
        ],
        body: tableData,
        foot: [
          [
            { content: `Branch : ${branchName}`, colSpan: 6, styles: { halign: 'left', fontStyle: 'bold' } },
            { content: totalRecoveryAmount.toLocaleString('en-IN'), styles: { halign: 'right', fontStyle: 'bold' } },
            { content: '', colSpan: 3, styles: { halign: 'center' } },
            { content: 'TOTAL COMMISSION', styles: { halign: 'right', fontStyle: 'bold' } },
            { content: totalCommissionAmount.toLocaleString('en-IN'), styles: { halign: 'right', fontStyle: 'bold' } },
          ],
        ],
        theme: 'grid',
        headStyles: {
          fillColor: [240, 240, 240],
          textColor: [0, 0, 0],
          fontStyle: 'bold',
          fontSize: 8,
          lineColor: [100, 100, 100],
          lineWidth: 0.2,
          halign: 'center',
        },
        bodyStyles: {
          fontSize: 8,
          lineColor: [180, 180, 180],
          lineWidth: 0.15,
          textColor: [20, 20, 20],
        },
        footStyles: {
          fillColor: [245, 245, 245],
          textColor: [0, 0, 0],
          fontSize: 8.5,
          fontStyle: 'bold',
          lineColor: [100, 100, 100],
          lineWidth: 0.2,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center' }, // Sr No
          1: { cellWidth: 20, halign: 'center' }, // ZO Ref No
          2: { cellWidth: 20, halign: 'center' }, // CIF
          3: { cellWidth: 26, halign: 'left' },   // A/c No
          4: { cellWidth: 42, halign: 'left' },   // Borrower Name
          5: { cellWidth: 22, halign: 'center' }, // Date of Recovery
          6: { cellWidth: 22, halign: 'right' },  // Rec amt
          7: { cellWidth: 22, halign: 'center' }, // NPA Date
          8: { cellWidth: 22, halign: 'center' }, // IRAC past
          9: { cellWidth: 20, halign: 'center' }, // Present IRAC
          10: { cellWidth: 20, halign: 'center' }, // Comm %
          11: { cellWidth: 24, halign: 'right' },  // Comm amt
        },
        margin: { left: 10, right: 10 },
      });

      // Signature Blocks at Bottom
      const finalY = (doc as any).lastAutoTable.finalY || 160;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      // Signature block 1: DRA AGENCY
      doc.text('DRA AGENCY', 25, Math.min(195, finalY + 18));
      doc.text('( Seal & Signature )', 25, Math.min(202, finalY + 25));

      // Signature block 2: Branch Manager
      doc.text('Branch Manager', 225, Math.min(195, finalY + 18));
      doc.text('( Seal & Signature )', 225, Math.min(202, finalY + 25));

      // Save PDF file
      const filename = `Commission_Bill_${effectiveAgent.name.replace(/\s+/g, '_')}_${formattedBillDate}.pdf`;
      doc.save(filename);
    } catch (err: any) {
      alert(`Error generating PDF bill: ${err?.message || err}`);
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-6xl shadow-2xl text-slate-800 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Control Bar */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-amber-100 text-amber-800 rounded-xl">
              <FileText className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                Agent Recovery Commission Bill (Landscape Format)
              </h3>
              <p className="text-xs text-slate-500">
                Official circular commission invoice format for bank submission and approval
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadLandscapePDF}
              disabled={isGeneratingPDF || billRows.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isGeneratingPDF ? 'Generating PDF...' : 'Download Landscape PDF'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-slate-200 transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Bill</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter and Metadata Bar */}
        <div className="p-4 bg-slate-50/70 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs shrink-0">
          {/* Agent PAN Card Input */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Agent PAN Card No:</label>
            <input
              type="text"
              value={panCardNo}
              onChange={(e) => handlePanChange(e.target.value)}
              placeholder="e.g. CCYPK5511Q"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs text-slate-800 uppercase font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Agent Mobile Number */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Agent Mobile No:</label>
            <input
              type="text"
              value={agentMobile}
              onChange={(e) => setAgentMobile(e.target.value)}
              placeholder="e.g. 9657922770"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 font-mono text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Month Selector (All 12 months) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Month:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-medium"
            >
              {allMonthsList.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector (Current Year) */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Select Year:</label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer font-medium"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr} {yr === String(currentYear) ? '(Current Year)' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Bill Generation Date */}
          <div>
            <label className="block text-slate-700 font-semibold mb-1">Bill Date (Print Date):</label>
            <input
              type="date"
              value={billDate}
              onChange={(e) => setBillDate(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Live Document Preview (Matches Landscape Sheet) */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100">
          <div className="bg-white p-6 sm:p-8 rounded-xl shadow-md border border-slate-300 max-w-5xl mx-auto text-slate-900 font-sans">
            {/* Header matching exact photo layout */}
            <div className="border-b-2 border-slate-900 pb-4 mb-4">
              <div className="flex justify-between items-start text-xs font-bold font-mono">
                <div className="space-y-1">
                  <div className="text-sm">
                    AGENCY NAME :{' '}
                    <span className="text-blue-900 font-black">{effectiveAgent.name.toUpperCase()}</span>
                  </div>
                  <div>Mo. {agentMobile}</div>
                </div>

                <div className="text-right space-y-1">
                  <div>
                    Pan Card No. : <span className="font-black text-slate-900">{panCardNo}</span>
                  </div>
                  <div>
                    DATE :{' '}
                    <span className="font-bold">
                      {billDate.split('-').reverse().join('-')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Bill Table */}
            {billRows.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <FileText className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-semibold">No recovery entries found for the selected period.</p>
                <p className="text-xs">Log a recovery collection first to generate the commission bill.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-slate-800 text-[11px]">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-center border-b border-slate-800">
                      <th className="border border-slate-800 p-1.5">Sr No.</th>
                      <th className="border border-slate-800 p-1.5">ZO Ref No</th>
                      <th className="border border-slate-800 p-1.5">CIF</th>
                      <th className="border border-slate-800 p-1.5">A/c No</th>
                      <th className="border border-slate-800 p-1.5">Borrower Name</th>
                      <th className="border border-slate-800 p-1.5">Date of Recovery</th>
                      <th className="border border-slate-800 p-1.5">Rec amt.</th>
                      <th className="border border-slate-800 p-1.5">NPA Date</th>
                      <th className="border border-slate-800 p-1.5">IRAC as on 31.03.2025</th>
                      <th className="border border-slate-800 p-1.5">Present IRAC</th>
                      <th className="border border-slate-800 p-1.5">Commission % as per circular</th>
                      <th className="border border-slate-800 p-1.5">Commission amt % as per circular</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billRows.map((r) => (
                      <tr key={r.srNo} className="hover:bg-slate-50">
                        <td className="border border-slate-800 p-1.5 text-center font-mono">{r.srNo}</td>
                        <td className="border border-slate-800 p-1.5 text-center font-mono">{r.zoRefNo}</td>
                        <td className="border border-slate-800 p-1.5 text-center font-mono">{r.cif}</td>
                        <td className="border border-slate-800 p-1.5 font-mono font-bold text-slate-900">
                          {r.accountNo}
                        </td>
                        <td className="border border-slate-800 p-1.5 font-medium">{r.borrowerName}</td>
                        <td className="border border-slate-800 p-1.5 text-center font-mono">{r.recoveryDate}</td>
                        <td className="border border-slate-800 p-1.5 text-right font-mono font-bold text-emerald-700">
                          {r.recoveryAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="border border-slate-800 p-1.5 text-center font-mono">{r.npaDate}</td>
                        <td className="border border-slate-800 p-1.5 text-center">{r.iracPast}</td>
                        <td className="border border-slate-800 p-1.5 text-center">{r.presentIrac}</td>
                        <td className="border border-slate-800 p-1.5 text-center font-mono font-bold">
                          {r.commissionRate}
                        </td>
                        <td className="border border-slate-800 p-1.5 text-right font-mono font-black text-amber-700">
                          {r.commissionAmount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-xs">
                      <td colSpan={6} className="border border-slate-800 p-2 font-bold">
                        Branch : {effectiveAgent.branch || 'Mill Corner'}
                      </td>
                      <td className="border border-slate-800 p-2 text-right font-mono font-bold text-emerald-800">
                        {totalRecoveryAmount.toLocaleString('en-IN')}
                      </td>
                      <td colSpan={3} className="border border-slate-800 p-2 text-center"></td>
                      <td className="border border-slate-800 p-2 text-right uppercase font-bold">
                        TOTAL COMMISSION
                      </td>
                      <td className="border border-slate-800 p-2 text-right font-mono font-black text-amber-800 text-sm">
                        {totalCommissionAmount.toLocaleString('en-IN')}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* Bottom Signature Space */}
            <div className="mt-14 pt-4 border-t border-dashed border-slate-300 flex justify-between items-end text-xs font-bold font-mono">
              <div className="text-center space-y-8">
                <div>DRA AGENCY</div>
                <div className="text-slate-400 font-sans text-[10px]">( Authorized Seal &amp; Signature )</div>
              </div>

              <div className="text-center space-y-8">
                <div>Branch Manager</div>
                <div className="text-slate-400 font-sans text-[10px]">( Verification &amp; Pass Order )</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Showing {billRows.length} collection entries. Total Commission: <strong className="text-amber-700">{formatINR(totalCommissionAmount)}</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold cursor-pointer transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
