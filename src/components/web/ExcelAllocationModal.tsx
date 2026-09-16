import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  Users,
  X,
  RefreshCw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
  HelpCircle,
  FileCheck,
  Briefcase,
  Layers,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import {
  parseExcelOrCsvFile,
  downloadExactExcelTemplate,
  exportAccountsToExactExcel,
  mapExcelRowToAccount,
  ParsedExcelRow,
  ExcelImportResult,
  REQUIRED_EXCEL_COLUMNS,
  isMatchingAccountNumber,
} from '../../utils/excelAccountImporter';
import { ScaleSupportLogo } from '../common/ScaleSupportLogo';
import { formatINR } from '../../utils/watermark';
import { User } from '../../types';
import { GooglePickerButton } from '../common/GooglePickerButton';
import { googlePickerService, PickedDriveFile } from '../../utils/googlePickerService';
import { HardDrive, ArrowRightLeft } from 'lucide-react';

interface ExcelAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ExcelAllocationModal: React.FC<ExcelAllocationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { users, currentUser, bulkAddAccounts, accounts } = useSRMS();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dragActive, setDragActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ExcelImportResult | null>(null);

  // Editable row-level agent assignments (rowNumber -> agentId)
  const [rowAgentOverrides, setRowAgentOverrides] = useState<Record<number, string>>({});

  // Allocation assignment strategy
  const [allocationMode, setAllocationMode] = useState<'as_in_file' | 'single_agent' | 'round_robin'>('as_in_file');
  const [selectedSingleAgentId, setSelectedSingleAgentId] = useState<string>('');
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);

  const agents = users.filter((u) => u.role === 'agent');
  const availableAssignees: User[] = agents.length > 0
    ? agents
    : users.length > 0
    ? users
    : [
        {
          id: currentUser?.id || 'admin',
          username: currentUser?.username || 'admin',
          name: currentUser?.name || 'Administrator',
          email: currentUser?.email || 'admin@system.local',
          role: 'agent',
          branch: currentUser?.branch || '',
          area: currentUser?.area || '',
          zone: currentUser?.zone || '',
          mobile: currentUser?.mobile || '',
          joiningDate: currentUser?.joiningDate || '2026-01-01',
          agentId: currentUser?.agentId || 'RA-ADMIN',
          active: true,
        },
      ];

  const defaultAssignee: User =
    availableAssignees[0] || {
      id: currentUser?.id || 'admin',
      username: currentUser?.username || 'admin',
      name: currentUser?.name || 'Administrator',
      email: currentUser?.email || 'admin@system.local',
      role: 'agent',
      branch: currentUser?.branch || '',
      area: currentUser?.area || '',
      zone: currentUser?.zone || '',
      mobile: currentUser?.mobile || '',
      joiningDate: currentUser?.joiningDate || '2026-01-01',
      agentId: currentUser?.agentId || 'RA-ADMIN',
      active: true,
    };

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setIsProcessing(true);
    setImportSuccessCount(null);
    setRowAgentOverrides({});

    try {
      const result = await parseExcelOrCsvFile(file);
      setImportResult(result);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to parse Excel file. Please ensure valid .xlsx, .xls or .csv format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handlePickedDriveSpreadsheet = async (files: PickedDriveFile[]) => {
    if (!files || files.length === 0) return;
    setErrorMsg(null);
    setIsProcessing(true);
    try {
      const picked = files[0];
      const downloadedFile = await googlePickerService.downloadPickedFile(picked);
      await handleFile(downloadedFile);
    } catch (err: any) {
      setErrorMsg(`Failed to import spreadsheet from Google Drive: ${err?.message || err}`);
      setIsProcessing(false);
    }
  };

  // Helper to determine the assigned agent for a row based on current mode and overrides
  const getRowAssignedAgent = (row: ParsedExcelRow, rowIndex: number): User => {
    // Check manual per-row override first
    if (rowAgentOverrides[row.rowNumber]) {
      const overrideId = rowAgentOverrides[row.rowNumber];
      const matched = availableAssignees.find(
        (a) => (a.agentId && a.agentId === overrideId) || a.id === overrideId
      );
      if (matched) return matched;
    }

    if (allocationMode === 'single_agent') {
      const target = availableAssignees.find(
        (a) => (a.agentId && a.agentId === selectedSingleAgentId) || a.id === selectedSingleAgentId
      );
      return target || defaultAssignee;
    }

    if (allocationMode === 'round_robin' && availableAssignees.length > 0) {
      return availableAssignees[rowIndex % availableAssignees.length] || defaultAssignee;
    }

    // Default 'as_in_file': look up AGENT_ID or name from row
    if (row.assignedAgentId || row.assignedAgentName) {
      const matched = availableAssignees.find(
        (a) =>
          (row.assignedAgentId && a.agentId?.toLowerCase() === row.assignedAgentId.toLowerCase()) ||
          (row.assignedAgentId && a.id.toLowerCase() === row.assignedAgentId.toLowerCase()) ||
          (row.assignedAgentName && a.name.toLowerCase().includes(row.assignedAgentName.toLowerCase()))
      );
      if (matched) return matched;

      // If specified in file, synthesize agent representation
      if (row.assignedAgentName || row.assignedAgentId) {
        return {
          id: row.assignedAgentId || `AG-${Math.floor(1000 + Math.random() * 9000)}`,
          username: (row.assignedAgentName || 'agent').toLowerCase().replace(/[^a-z0-9]/g, ''),
          name: row.assignedAgentName || 'Assigned Agent',
          agentId: row.assignedAgentId || 'RA-FILE',
          email: `${(row.assignedAgentName || 'agent').toLowerCase().replace(/[^a-z0-9]/g, '')}@system.local`,
          role: 'agent',
          branch: row.branchName || '',
          area: row.area || '',
          zone: row.zone || '',
          mobile: '',
          joiningDate: new Date().toISOString().slice(0, 10),
          active: true,
        };
      }
    }

    return defaultAssignee;
  };

  // Helper to find existing account in database for reallocation detection
  const getExistingAccount = (accountNo: string) => {
    return accounts.find(
      (a) =>
        isMatchingAccountNumber(a.accountId, accountNo) ||
        isMatchingAccountNumber(a.loanNumber, accountNo) ||
        isMatchingAccountNumber(a.id, accountNo)
    );
  };

  // Compute live reallocation vs new allocation statistics
  const allocationStats = React.useMemo(() => {
    if (!importResult) return { total: 0, newCount: 0, reallocatedCount: 0, reconfirmedCount: 0 };
    let newCount = 0;
    let reallocatedCount = 0;
    let reconfirmedCount = 0;

    importResult.rows.forEach((row, idx) => {
      if (!row.isValid) return;
      const existing = getExistingAccount(row.accountNo);
      const assigned = getRowAssignedAgent(row, idx);
      const assignedId = assigned.agentId || assigned.id;

      if (!existing) {
        newCount++;
      } else if (existing.assignedAgentId !== assignedId) {
        reallocatedCount++;
      } else {
        reconfirmedCount++;
      }
    });

    return {
      total: importResult.validRows,
      newCount,
      reallocatedCount,
      reconfirmedCount,
    };
  }, [importResult, accounts, allocationMode, selectedSingleAgentId, rowAgentOverrides]);

  // Compute live workload distribution summary
  const getAgentWorkloadSummary = () => {
    if (!importResult) return [];
    const counts: Record<string, { agent: User; count: number }> = {};

    importResult.rows.forEach((row, idx) => {
      if (!row.isValid) return;
      const assigned = getRowAssignedAgent(row, idx);
      const key = assigned.agentId || assigned.id;
      if (!counts[key]) {
        counts[key] = { agent: assigned, count: 0 };
      }
      counts[key].count += 1;
    });

    return Object.values(counts);
  };

  const handleCommitImport = () => {
    if (!importResult || importResult.validRows === 0) return;

    const validRows = importResult.rows.filter((r) => r.isValid);

    const accountsToInsert = validRows.map((row, idx) => {
      const agent = getRowAssignedAgent(row, idx);
      const agentId = agent.agentId || agent.id;
      const agentName = agent.name;

      return mapExcelRowToAccount(row, agentId, agentName, currentUser.name);
    });

    bulkAddAccounts(accountsToInsert);
    setImportSuccessCount(accountsToInsert.length);

    setTimeout(() => {
      onClose();
      setImportResult(null);
      setImportSuccessCount(null);
      setRowAgentOverrides({});
    }, 1800);
  };

  const workloadSummary = getAgentWorkloadSummary();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in duration-200">
        {/* Header with ScaleSupport Branding */}
        <div className="bg-[#0f172a] text-white p-5 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="bg-white/95 px-2.5 py-1.5 rounded-2xl shadow-xs border border-white/20">
              <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white">
                  Bulk Account Allocation &amp; Excel Importer
                </h2>
                <span className="text-[10px] uppercase font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Admin / Coordinator Core
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Upload bank loan allocation spreadsheets &amp; bulk distribute directly to Recovery Agents
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={downloadExactExcelTemplate}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-300 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Download template pre-configured with AGENT_ID and bank columns"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Excel Template</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50">
          {/* Format Specification Banner */}
          <div className="bg-white rounded-2xl p-4 border border-blue-100 shadow-2xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-900">
                  Expected Excel &amp; CSV Columns Format:
                </span>
              </div>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md border border-blue-200">
                14 Bank &amp; Agent Allocation Columns
              </span>
            </div>

            {/* Horizontal Column Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {REQUIRED_EXCEL_COLUMNS.map((col) => {
                const isAgentCol = col === 'AGENT_ID' || col === 'AGENT_NAME';
                return (
                  <span
                    key={col}
                    className={`font-mono text-[11px] font-bold px-2.5 py-1 rounded-md border shadow-2xs flex items-center gap-1 ${
                      isAgentCol
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-400/30'
                        : 'bg-slate-100 text-slate-800 border-slate-200'
                    }`}
                  >
                    {isAgentCol && <UserCheck className="w-3 h-3 text-emerald-600" />}
                    <span>{col}</span>
                  </span>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-500">
              💡 Tip: Include <code className="font-mono text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200">AGENT_ID</code> (e.g. <code className="text-slate-800 font-semibold">RA-0045</code>, <code className="text-slate-800 font-semibold">RA-0089</code>) in your sheet for instant automated allocation per row!
            </p>
          </div>

          {/* Upload Drop Area & Google Drive Picker Option */}
          {!importResult && (
            <div className="space-y-3">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  dragActive
                    ? 'border-blue-500 bg-blue-50/80 scale-[0.99]'
                    : 'border-slate-300 bg-white hover:bg-slate-50/80 hover:border-blue-400'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleInputChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3 shadow-2xs">
                  {isProcessing ? (
                    <RefreshCw className="w-8 h-8 animate-spin" />
                  ) : (
                    <Upload className="w-8 h-8" />
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mb-1">
                  {isProcessing ? 'Reading & Parsing Excel Data...' : 'Click to Browse or Drag & Drop Excel File'}
                </h3>
                <p className="text-xs text-slate-500 max-w-md">
                  Supports Microsoft Excel spreadsheets (<code className="font-mono text-blue-600">.xlsx</code>,{' '}
                  <code className="font-mono text-blue-600">.xls</code>) and CSV files.
                </p>

                <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
                  <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                    Auto-detects <code className="font-mono text-slate-800 font-semibold">BRANCH_COD</code>,{' '}
                    <code className="font-mono text-slate-800 font-semibold">ACCT_NO</code>,{' '}
                    <code className="font-mono text-slate-800 font-semibold">NAME</code>,{' '}
                    <code className="font-mono text-emerald-700 font-semibold">AGENT_ID</code>
                  </span>
                </div>
              </div>

              {/* Google Drive Picker Banner */}
              <div className="p-4 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/80 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs">
                    <HardDrive className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">Import Directly via Google Picker</h4>
                    <p className="text-[11px] text-slate-600">
                      Select Google Sheets or Excel spreadsheets directly stored on your Google Drive.
                    </p>
                  </div>
                </div>

                <GooglePickerButton
                  onFilesSelected={handlePickedDriveSpreadsheet}
                  viewMode="spreadsheets"
                  buttonText="Select from Google Drive (Picker)"
                  title="Pick NPA Master Spreadsheet from Google Drive"
                  variant="primary"
                  size="md"
                />
              </div>
            </div>
          )}

          {/* Error display */}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold">Excel Parsing Error</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Success commit banner */}
          {importSuccessCount !== null && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-6 h-6 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-sm">
                  Successfully Imported &amp; Allocated {importSuccessCount} Accounts!
                </p>
                <p className="text-emerald-700 text-[11px]">
                  All records synchronized with Google Sheets &amp; Google Drive, immediately active on field agent mobile devices.
                </p>
              </div>
            </div>
          )}

          {/* Parsed Result Preview */}
          {importResult && (
            <div className="space-y-4">
              {/* Summary Metrics Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-4">
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Uploaded File</span>
                    <p className="text-xs font-bold text-slate-900 font-mono truncate max-w-[200px]">
                      {importResult.fileName}
                    </p>
                  </div>
                  <div className="h-7 w-px bg-slate-200" />
                  <div>
                    <span className="text-[11px] text-slate-400 font-medium">Total Accounts</span>
                    <p className="text-xs font-bold text-slate-900">{importResult.totalRows}</p>
                  </div>
                  <div className="h-7 w-px bg-slate-200" />
                  <div>
                    <span className="text-[11px] text-emerald-600 font-medium">Ready to Process</span>
                    <p className="text-xs font-bold text-emerald-700">{importResult.validRows}</p>
                  </div>
                  <div className="h-7 w-px bg-slate-200" />
                  <div className="bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-700 font-bold uppercase tracking-wider block">
                      🆕 New Accounts
                    </span>
                    <p className="text-xs font-bold text-emerald-900">
                      {allocationStats.newCount} Accounts
                    </p>
                  </div>
                  {allocationStats.reallocatedCount > 0 && (
                    <>
                      <div className="h-7 w-px bg-slate-200" />
                      <div className="bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-300">
                        <span className="text-[10px] text-amber-800 font-bold uppercase tracking-wider block flex items-center gap-1">
                          <ArrowRightLeft className="w-3 h-3 text-amber-600" />
                          <span>🔄 Reallocations</span>
                        </span>
                        <p className="text-xs font-bold text-amber-900">
                          {allocationStats.reallocatedCount} (Old Agent Deallocated ➔ New Agent Allocated)
                        </p>
                      </div>
                    </>
                  )}
                  {importResult.multipleAccountsCount > 0 && (
                    <>
                      <div className="h-7 w-px bg-slate-200" />
                      <div className="bg-purple-50 px-2.5 py-1 rounded-xl border border-purple-200">
                        <span className="text-[10px] text-purple-700 font-bold uppercase tracking-wider block">
                          Multi-Account Customers
                        </span>
                        <p className="text-xs font-black text-purple-900 flex items-center gap-1.5">
                          <span>{importResult.multipleCustomersCount} Customers</span>
                          <span className="text-[11px] font-medium text-purple-600">({importResult.multipleAccountsCount} loans linked)</span>
                        </p>
                      </div>
                    </>
                  )}
                  {importResult.invalidRows > 0 && (
                    <>
                      <div className="h-7 w-px bg-slate-200" />
                      <div>
                        <span className="text-[11px] text-amber-600 font-medium">Warnings/Invalid</span>
                        <p className="text-xs font-bold text-amber-700">{importResult.invalidRows}</p>
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={() => {
                    setImportResult(null);
                    setRowAgentOverrides({});
                  }}
                  className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
                >
                  Upload Different File
                </button>
              </div>

              {/* Allocation Strategy Picker */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    <span>Agent Allocation Strategy</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Coordinator: <strong className="text-slate-800">{currentUser.name}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                      allocationMode === 'as_in_file'
                        ? 'bg-emerald-50/70 border-emerald-400 shadow-2xs ring-1 ring-emerald-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allocationMode"
                      checked={allocationMode === 'as_in_file'}
                      onChange={() => setAllocationMode('as_in_file')}
                      className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                        <span>Use AGENT_ID in File</span>
                        <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          Recommended
                        </span>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Allocates each account to the agent specified in the spreadsheet's <code className="font-mono text-[10px] text-slate-700">AGENT_ID</code> column
                      </span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                      allocationMode === 'single_agent'
                        ? 'bg-blue-50/70 border-blue-400 shadow-2xs ring-1 ring-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allocationMode"
                      checked={allocationMode === 'single_agent'}
                      onChange={() => setAllocationMode('single_agent')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Allocate Entire Batch to One Agent</span>
                      <span className="text-[11px] text-slate-500">Assign all imported accounts to a single selected agent</span>
                    </div>
                  </label>

                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition ${
                      allocationMode === 'round_robin'
                        ? 'bg-blue-50/70 border-blue-400 shadow-2xs ring-1 ring-blue-300'
                        : 'bg-slate-50 border-slate-200 hover:bg-slate-100/70'
                    }`}
                  >
                    <input
                      type="radio"
                      name="allocationMode"
                      checked={allocationMode === 'round_robin'}
                      onChange={() => setAllocationMode('round_robin')}
                      className="mt-0.5 text-blue-600 focus:ring-blue-500"
                    />
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Round-Robin Equal Load</span>
                      <span className="text-[11px] text-slate-500">Distribute accounts evenly across all {availableAssignees.length} field recovery agents</span>
                    </div>
                  </label>
                </div>

                {allocationMode === 'single_agent' && (
                  <div className="pt-2 flex items-center gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                    <span className="text-xs font-bold text-slate-700">Select Target Agent for Batch:</span>
                    <select
                      value={selectedSingleAgentId || defaultAssignee.agentId || defaultAssignee.id}
                      onChange={(e) => setSelectedSingleAgentId(e.target.value)}
                      className="bg-white text-slate-800 text-xs border border-slate-300 rounded-xl px-3 py-2 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                    >
                      {availableAssignees.map((ag) => (
                        <option key={ag.id} value={ag.agentId || ag.id}>
                          {ag.name} ({ag.agentId || 'RA'}){ag.branch ? ` • ${ag.branch}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Workload Distribution Summary Badges */}
                <div className="pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-slate-600 block mb-2">
                    Batch Allocation Workload Preview:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {workloadSummary.map(({ agent, count }) => (
                      <div
                        key={agent.id}
                        className="bg-slate-100 border border-slate-200 text-slate-800 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="font-bold">{agent.name}</span>
                        <span className="font-mono text-[10px] text-slate-500">({agent.agentId || 'RA'})</span>
                        <span className="bg-white font-bold px-2 py-0.5 rounded-lg border border-slate-200 text-blue-700">
                          {count} {count === 1 ? 'account' : 'accounts'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Data Preview Table with Row-Level Agent Selection */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">
                      Accounts Allocation Preview ({importResult.rows.length} rows)
                    </span>
                    <span className="text-[11px] text-slate-500">
                      • You can also change the assigned agent per individual row below
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200">
                    Validated for Auto-Sync
                  </span>
                </div>

                <div className="overflow-x-auto max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/90 text-slate-600 uppercase text-[10px] font-bold sticky top-0 border-b border-slate-200 tracking-wider">
                      <tr>
                        <th className="p-2.5">Row</th>
                        <th className="p-2.5 bg-emerald-50/80 text-emerald-900 border-r border-emerald-200">
                          Allocated Agent (AGENT_ID)
                        </th>
                        <th className="p-2.5 bg-slate-50 border-r border-slate-200">
                          Allocation Status / Reallocation
                        </th>
                        <th className="p-2.5">Zone</th>
                        <th className="p-2.5">Area</th>
                        <th className="p-2.5">Branch Code</th>
                        <th className="p-2.5">Branch Name</th>
                        <th className="p-2.5">Account No (ACCT_NO)</th>
                        <th className="p-2.5">Customer Name</th>
                        <th className="p-2.5">Product</th>
                        <th className="p-2.5">Facility</th>
                        <th className="p-2.5">Sanction Limit (₹)</th>
                        <th className="p-2.5">Loan Balance (₹)</th>
                        <th className="p-2.5">NPA Date</th>
                        <th className="p-2.5">Contact No</th>
                        <th className="p-2.5">Customer ID</th>
                        <th className="p-2.5">Address</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {importResult.rows.map((row, idx) => {
                        const assignedAgent = getRowAssignedAgent(row, idx);
                        const assignedAgentId = assignedAgent.agentId || assignedAgent.id;
                        const existingAcc = getExistingAccount(row.accountNo);
                        const isReallocated = existingAcc && existingAcc.assignedAgentId !== assignedAgentId;
                        const isReconfirmed = existingAcc && existingAcc.assignedAgentId === assignedAgentId;

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`hover:bg-slate-50 transition-colors ${
                              isReallocated ? 'bg-amber-50/20' : ''
                            }`}
                          >
                            <td className="p-2.5 text-slate-400 font-mono text-[10px]">{row.rowNumber}</td>
                            
                            {/* Interactive Agent Allocation Column */}
                            <td className="p-2.5 bg-emerald-50/30 border-r border-emerald-100">
                              <select
                                value={assignedAgent.agentId || assignedAgent.id}
                                onChange={(e) => {
                                  setRowAgentOverrides((prev) => ({
                                    ...prev,
                                    [row.rowNumber]: e.target.value,
                                  }));
                                }}
                                className="bg-white text-slate-900 text-xs border border-emerald-300 rounded-lg px-2 py-1 font-semibold focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer shadow-2xs"
                              >
                                {availableAssignees.map((ag) => (
                                  <option key={ag.id} value={ag.agentId || ag.id}>
                                    {ag.name} ({ag.agentId || 'RA'})
                                  </option>
                                ))}
                                {!availableAssignees.some(
                                  (ag) => (ag.agentId && ag.agentId === assignedAgentId) || ag.id === assignedAgentId
                                ) && (
                                  <option value={assignedAgentId}>
                                    {assignedAgent.name} ({assignedAgentId})
                                  </option>
                                )}
                              </select>
                            </td>

                            {/* Reallocation Status Badge */}
                            <td className="p-2.5 border-r border-slate-200">
                              {isReallocated ? (
                                <div className="flex flex-col gap-0.5">
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-md w-fit shadow-2xs"
                                    title={`Will deallocate previous agent ${existingAcc.assignedAgentName} (${existingAcc.assignedAgentId}) and allocate to new agent ${assignedAgent.name}`}
                                  >
                                    <ArrowRightLeft className="w-3 h-3 text-amber-700 shrink-0" />
                                    <span>Reallocated</span>
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-medium">
                                    <span className="line-through text-slate-400">{existingAcc.assignedAgentName}</span>{' '}
                                    ➔ <strong className="text-emerald-700 font-bold">{assignedAgent.name}</strong>
                                  </span>
                                </div>
                              ) : isReconfirmed ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-800 border border-blue-200 rounded-md w-fit">
                                  <span>✓ Retained</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md w-fit">
                                  <span>🆕 New Account</span>
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-slate-600 truncate max-w-[130px] font-medium" title={row.zone || ''}>
                              {row.zone ? (
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-md text-[11px] font-semibold">
                                  {row.zone}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Auto-mapped</span>
                              )}
                            </td>
                            <td className="p-2.5 text-slate-600 truncate max-w-[130px]" title={row.area || ''}>
                              {row.area ? (
                                <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px]">
                                  {row.area}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">—</span>
                              )}
                            </td>
                            <td className="p-2.5 font-mono text-[11px] font-semibold">{row.branchCode}</td>
                            <td className="p-2.5 truncate max-w-[140px] font-medium">{row.branchName}</td>
                            <td className="p-2.5 font-mono font-bold text-blue-600">{row.accountNo}</td>
                            <td className="p-2.5">
                              <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                                <span>{row.customerName}</span>
                                {row.isMultipleAccount && (
                                  <span
                                    className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 bg-purple-100 text-purple-800 rounded-md border border-purple-200"
                                    title={row.multipleAccountReason || `${row.multipleAccountsCount} accounts detected`}
                                  >
                                    <span>🔗 Multi ({row.multipleAccountsCount})</span>
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5">{row.productDesc}</td>
                            <td className="p-2.5 text-slate-500">{row.facility}</td>
                            <td className="p-2.5 font-mono font-medium">{formatINR(row.limitSanctioned)}</td>
                            <td className="p-2.5 font-mono font-bold text-red-600">{formatINR(row.loanBalance)}</td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-600">{row.npaDate}</td>
                            <td className="p-2.5 font-mono text-[11px]">{row.contactNo}</td>
                            <td className="p-2.5 font-mono text-[11px] text-slate-500">{row.customerId}</td>
                            <td className="p-2.5 truncate max-w-[160px] text-slate-500" title={row.address}>
                              {row.address}
                            </td>
                            <td className="p-2.5 text-center">
                              {row.isValid ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Ready
                                </span>
                              ) : (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-red-100 text-red-800 rounded-full"
                                  title={row.validationErrors.join(', ')}
                                >
                                  <AlertCircle className="w-3 h-3 text-red-600" />
                                  Error
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="bg-white p-4 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
            <span>• Direct Google Sheets &amp; Google Drive Synchronization</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Cancel
            </button>

            {importResult && (
              <button
                onClick={handleCommitImport}
                disabled={importResult.validRows === 0 || isProcessing}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {allocationStats.reallocatedCount > 0
                    ? `Import & Allocate (${allocationStats.total} Accounts: ${allocationStats.newCount} New, ${allocationStats.reallocatedCount} Reallocated)`
                    : `Import & Allocate ${importResult.validRows} Accounts`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
