import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  Table,
  HardDrive,
  RefreshCw,
  X,
  Bell,
  MessageSquare,
  Sparkles,
  ExternalLink,
  Shield,
  Code2,
  Send,
  Unlink,
  ArrowDownToLine,
  ArrowUpFromLine,
  AlertTriangle,
  Zap,
  FileCode,
  Copy,
  Check,
  DatabaseBackup,
  Clock,
  Lock,
  Server,
  Layers,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { ScaleSupportLogo } from './ScaleSupportLogo';
import { googleSheetsService, DEFAULT_APPS_SCRIPT_URL } from '../../utils/googleSheetsService';
import { ENTERPRISE_APPS_SCRIPT_CODE } from '../../utils/gas/appsScriptSource';

export const SyncStatusModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const {
    currentUser,
    isSyncing,
    syncWithGoogleSheets,
    pullFromGoogleSheets,
    triggerRecoveryBackup,
    lastBackupTime,
    accounts,
    recoveries,
    photos,
    voiceNotes,
    autoSyncEnabled,
    setAutoSyncEnabled,
    lastAutoSyncTime,
    firestoreSpeedStats,
    sheetQueueStatus,
    isFirebasePrimaryActive,
    flushSheetSyncNow,
  } = useSRMS();
  const [appsScriptUrl, setAppsScriptUrl] = useState(googleSheetsService.getAppsScriptUrl());
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isPulling, setIsPulling] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [showScriptViewer, setShowScriptViewer] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const handleCopyScript = () => {
    navigator.clipboard.writeText(ENTERPRISE_APPS_SCRIPT_CODE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  useEffect(() => {
    setAppsScriptUrl(googleSheetsService.getAppsScriptUrl());
  }, [isOpen]);

  if (!isOpen) return null;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl border border-red-100">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Admin Privileges Required</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Google Sheets live synchronization, endpoints, and credentials can only be accessed and managed by System Administrators.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSaveUrl = () => {
    googleSheetsService.setAppsScriptUrl(appsScriptUrl);
    setTestStatus('Saved Web App endpoint!');
    setTimeout(() => setTestStatus(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestStatus('Testing Google Apps Script Web App...');
    try {
      const result = await googleSheetsService.testAppsScriptConnection(appsScriptUrl);
      if (result.success) {
        setTestStatus('Connected successfully! Google Apps Script is active and responding.');
        setSyncFeedback({ type: 'success', message: 'Google Apps Script endpoint is live and verified.' });
      } else {
        setTestStatus(result.message);
        setSyncFeedback({
          type: 'error',
          message: result.message,
        });
      }
    } catch (e: any) {
      setTestStatus(`Test failed: ${e?.message || 'Connection error'}`);
    } finally {
      setIsTesting(false);
      setTimeout(() => setTestStatus(null), 6000);
    }
  };

  const handlePushAll = async () => {
    setSyncFeedback({ type: 'info', message: 'Pushing all 19 sheets, remarks, and accounts to Google Sheets...' });
    const res = await syncWithGoogleSheets();
    if (res.success) {
      setSyncFeedback({ type: 'success', message: res.message || 'All 19 sheets updated in Google Sheets!' });
    } else {
      setSyncFeedback({ type: 'error', message: res.message || 'Push failed. Please check permissions.' });
    }
  };

  const handlePullAll = async () => {
    setIsPulling(true);
    setSyncFeedback({ type: 'info', message: 'Pulling latest records from Google Sheets into site...' });
    try {
      const res = await pullFromGoogleSheets();
      if (res.success) {
        setSyncFeedback({ type: 'success', message: res.message });
      } else {
        setSyncFeedback({ type: 'error', message: res.message });
      }
    } catch (e: any) {
      setSyncFeedback({ type: 'error', message: e?.message || 'Failed to pull data from Google Sheets' });
    } finally {
      setIsPulling(false);
    }
  };

  const handleTriggerBackupNow = async () => {
    setIsBackingUp(true);
    setSyncFeedback({ type: 'info', message: "Exporting collection snapshot and replacing 'Recovery_Backup' in Google Drive/Sheets..." });
    try {
      const res = await triggerRecoveryBackup();
      if (res.success) {
        setSyncFeedback({ type: 'success', message: res.message || "Recovery_Backup tab updated successfully!" });
      } else {
        setSyncFeedback({ type: 'error', message: res.message || "Backup export failed." });
      }
    } catch (err: any) {
      setSyncFeedback({ type: 'error', message: err?.message || 'Backup failed.' });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleDesync = () => {
    if (window.confirm('Are you sure you want to de-sync and remove all Google Sheet & Apps Script access? This will disconnect the app from Google Sheets.')) {
      googleSheetsService.desyncAndRemoveAccess();
      setAppsScriptUrl('');
      setSyncFeedback({ type: 'info', message: 'Google Sheet & Drive access removed. App is de-synced.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-xs font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">
                Google Sheets Two-Way Live Sync
              </h3>
              <p className="text-xs text-slate-500">Push changes to Sheets &amp; Pull updates into Site</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {syncFeedback && (
            <div
              className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                syncFeedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : syncFeedback.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-900'
                  : 'bg-blue-50 border-blue-200 text-blue-900'
              }`}
            >
              {syncFeedback.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-semibold">{syncFeedback.message}</span>
              </div>
            </div>
          )}

          {/* ⚡ 3-Tier Enterprise Architecture Status Panel */}
          <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 space-y-3 shadow-md">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
                  <Layers className="w-4 h-4" />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-slate-100">3-Tier Enterprise Storage Architecture</h4>
                  <p className="text-[10px] text-slate-400">High-speed Firestore primary • Continuous Sheet backup • 5 TB Drive media</p>
                </div>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Active</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 text-[11px]">
              {/* Tier 1 */}
              <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px]">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>Tier 1: Firestore</span>
                </div>
                <p className="text-[10px] text-slate-300 font-semibold">Primary Speed Route</p>
                <div className="text-[9px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-700/50">
                  <div className="flex justify-between">
                    <span>Latency:</span>
                    <span className="text-emerald-400 font-mono font-bold">~{firestoreSpeedStats.averageLatencyMs} ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Writes / Reads:</span>
                    <span className="text-slate-200 font-mono">{firestoreSpeedStats.writeCount} / {firestoreSpeedStats.readCount}</span>
                  </div>
                </div>
              </div>

              {/* Tier 2 */}
              <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-[10px]">
                  <Table className="w-3.5 h-3.5 shrink-0" />
                  <span>Tier 2: Sheets</span>
                </div>
                <p className="text-[10px] text-slate-300 font-semibold">Continuous Audit Queue</p>
                <div className="text-[9px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-700/50">
                  <div className="flex justify-between">
                    <span>Synced:</span>
                    <span className="text-emerald-400 font-mono font-bold">{sheetQueueStatus.syncedCount} items</span>
                  </div>
                  <div className="flex justify-between">
                    <span>In Queue:</span>
                    <span className={`font-mono font-bold ${sheetQueueStatus.pendingCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                      {sheetQueueStatus.pendingCount} pending
                    </span>
                  </div>
                </div>
              </div>

              {/* Tier 3 */}
              <div className="p-2.5 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1">
                <div className="flex items-center gap-1.5 text-blue-400 font-bold text-[10px]">
                  <HardDrive className="w-3.5 h-3.5 shrink-0" />
                  <span>Tier 3: Drive</span>
                </div>
                <p className="text-[10px] text-slate-300 font-semibold">5 TB Direct Binary</p>
                <div className="text-[9px] text-slate-400 space-y-0.5 pt-1 border-t border-slate-700/50">
                  <div className="flex justify-between">
                    <span>JPG, PDF, Audio:</span>
                    <span className="text-blue-300 font-mono font-bold">100% Drive</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Firebase Media:</span>
                    <span className="text-emerald-400 font-mono font-bold">0 Bytes</span>
                  </div>
                </div>
              </div>
            </div>

            {sheetQueueStatus.pendingCount > 0 && (
              <div className="pt-2 flex items-center justify-between text-[11px] bg-slate-800/50 px-3 py-2 rounded-lg border border-slate-700/50">
                <span className="text-slate-300 text-[10px]">
                  {sheetQueueStatus.isProcessing ? 'Replicating queue to Google Sheets in background...' : `${sheetQueueStatus.pendingCount} record(s) queued for Sheets replication.`}
                </span>
                <button
                  type="button"
                  onClick={() => flushSheetSyncNow()}
                  disabled={sheetQueueStatus.isProcessing}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded font-bold text-[10px] cursor-pointer transition flex items-center gap-1"
                >
                  <RefreshCw className={`w-3 h-3 ${sheetQueueStatus.isProcessing ? 'animate-spin' : ''}`} />
                  <span>Flush Queue</span>
                </button>
              </div>
            )}
          </div>

          {/* Apps Script Web App Section */}
          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-900 flex items-center gap-1.5">
                <Code2 className="w-4 h-4 text-indigo-700" />
                <span>Google Apps Script Web App Endpoint</span>
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                Live
              </span>
            </div>
            <p className="text-indigo-950/80 text-[11px]">
              Synchronizes real-time payment collections, PTPs, accounts, and follow-up remarks directly into your Google Sheet.
            </p>
            <div className="mt-2 space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-indigo-900">
                Web App Exec URL
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={appsScriptUrl}
                  onChange={(e) => setAppsScriptUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 px-2.5 py-1.5 bg-white border border-indigo-200 rounded-lg text-[11px] font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleSaveUrl}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] cursor-pointer transition"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-2.5 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-800 rounded-lg font-bold text-[11px] cursor-pointer transition flex items-center gap-1"
                >
                  {isTesting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  <span>Test URL</span>
                </button>
              </div>
              {testStatus && (
                <p className="text-[11px] font-medium text-indigo-900 mt-1 flex items-center gap-1">
                  <span>ℹ️ {testStatus}</span>
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-indigo-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowScriptViewer(!showScriptViewer)}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 flex items-center gap-1 cursor-pointer"
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>{showScriptViewer ? 'Hide Production Code.gs' : 'View Production Code.gs (Enterprise RBAC)'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyScript}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition shadow-xs"
              >
                {copiedScript ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                <span>{copiedScript ? 'Copied to Clipboard!' : 'Copy Code.gs'}</span>
              </button>
            </div>

            {showScriptViewer && (
              <div className="mt-2 bg-slate-900 text-slate-200 rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-[10px] leading-relaxed border border-slate-700">
                <div className="flex justify-between items-center pb-2 mb-2 border-b border-slate-800 text-slate-400">
                  <span>Code.gs • Multi-Role RBAC &amp; Google Sheets API Backend</span>
                  <span>440 lines</span>
                </div>
                <pre>{ENTERPRISE_APPS_SCRIPT_CODE}</pre>
              </div>
            )}
          </div>

          {/* Auto-Sync Real-Time Engine Card */}
          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="font-bold text-amber-950 text-xs">Real-Time Auto-Push &amp; Auto-Pull</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSyncEnabled}
                  onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>
            <p className="text-amber-900/80 text-[11px] leading-relaxed">
              When enabled, any new payment, PTP, visit, or follow-up is automatically pushed to your Google Sheet in real-time, and external sheet edits are pulled every 60 seconds.
            </p>
            {lastAutoSyncTime && (
              <div className="text-[10px] text-amber-800 font-medium flex items-center gap-1 pt-0.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Last auto-sync executed at: {lastAutoSyncTime}</span>
              </div>
            )}
          </div>

          {/* Two-Way Sync Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handlePushAll}
              disabled={isSyncing}
              className="p-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-sm transition cursor-pointer text-center"
            >
              <ArrowUpFromLine className={`w-5 h-5 ${isSyncing ? 'animate-bounce' : ''}`} />
              <span className="text-xs">Push Site &rarr; Google Sheet</span>
              <span className="text-[10px] opacity-80 font-normal">Upload 19 sheets &amp; remarks</span>
            </button>

            <button
              onClick={handlePullAll}
              disabled={isPulling || isSyncing}
              className="p-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl flex flex-col items-center justify-center gap-1.5 shadow-sm transition cursor-pointer text-center"
            >
              <ArrowDownToLine className={`w-5 h-5 ${isPulling ? 'animate-bounce' : ''}`} />
              <span className="text-xs">Pull Sheet &rarr; Site</span>
              <span className="text-[10px] opacity-80 font-normal">Import edits from Google Sheet</span>
            </button>
          </div>

          {/* Automated 12-Hour Rolling Recovery Backup Card */}
          <div className="p-4 bg-purple-50/80 border border-purple-200 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DatabaseBackup className="w-4 h-4 text-purple-700" />
                <span className="font-bold text-purple-950 text-xs">Automated 12-Hour 'Recovery_Backup' Routine</span>
              </div>
              <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded font-mono font-bold">
                12h Rolling Cycle
              </span>
            </div>
            <p className="text-purple-900/80 text-[11px] leading-relaxed">
              Periodically exports current collection records to a dedicated <strong>Recovery_Backup</strong> sheet tab and Drive JSON backup file, completely replacing previous backup data every 12 hours to prevent data loss during agent session transitions.
            </p>
            <div className="flex items-center justify-between pt-1 border-t border-purple-100/80 text-[11px]">
              <div className="flex items-center gap-1.5 text-purple-800 font-medium text-[10px]">
                <Clock className="w-3.5 h-3.5 text-purple-600" />
                <span>Last Backup: {lastBackupTime || 'Initial session scheduled'}</span>
              </div>
              <button
                type="button"
                onClick={handleTriggerBackupNow}
                disabled={isBackingUp || isSyncing}
                className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 transition shadow-xs cursor-pointer"
              >
                {isBackingUp ? <RefreshCw className="w-3 h-3 animate-spin" /> : <DatabaseBackup className="w-3 h-3" />}
                <span>{isBackingUp ? 'Exporting...' : 'Backup & Replace Now'}</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                <Table className="w-4 h-4 text-emerald-700" />
                <span>Google Sheets Data Layer (19 Master Tabs)</span>
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-bold">
                Synchronized
              </span>
            </div>
            <p className="text-emerald-950/80 text-[11px]">
              Structured tables: Accounts ({accounts.length}), Recoveries ({recoveries.length}), PTP commitments, Remarks, and Visits.
            </p>
          </div>

          <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-blue-800 flex items-center gap-1.5">
                <HardDrive className="w-4 h-4 text-blue-700" />
                <span>Google Drive Storage Layer (Files &amp; Media)</span>
              </span>
              <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-mono font-bold">
                Connected
              </span>
            </div>
            <p className="text-blue-950/80 text-[11px]">
              Stores {photos.length} watermarked photos, {voiceNotes.length} audio voice recordings, KYC PDFs.
            </p>
          </div>

          <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
            <button
              onClick={handleDesync}
              className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold rounded-xl flex items-center gap-1.5 transition border border-rose-200 cursor-pointer text-[11px]"
              title="Remove Google Sheets sync and disconnect connection"
            >
              <Unlink className="w-3.5 h-3.5" />
              <span>De-sync Access</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const NotificationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead } = useSRMS();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 text-xs font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl text-slate-800 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900">Notifications &amp; Alerts</h3>
              <p className="text-xs text-slate-500">PTP reminders, recoveries &amp; WhatsApp logs</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {notifications.length === 0 ? (
            <p className="text-center text-slate-400 py-8">No notifications at present.</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => markNotificationRead(n.id)}
                className={`p-3.5 rounded-xl border transition cursor-pointer space-y-1 ${
                  n.read
                    ? 'bg-slate-50 border-slate-200 text-slate-500'
                    : 'bg-blue-50/50 border-blue-200 text-slate-800'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-900">{n.title}</span>
                  <span className="text-[10px] font-mono text-slate-400">{n.date} {n.time}</span>
                </div>
                <p className="text-xs text-slate-600">{n.message}</p>
                {n.accountId && (
                  <span className="text-[10px] font-mono text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded font-semibold inline-block mt-1">
                    Account: {n.accountId}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
