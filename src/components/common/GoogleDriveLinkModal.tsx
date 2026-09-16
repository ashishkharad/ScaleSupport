import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  CheckCircle2,
  AlertCircle,
  FolderSync,
  ExternalLink,
  Shield,
  UploadCloud,
  X,
  RefreshCw,
  Sparkles,
  Lock,
  Camera,
  Layers,
  Table,
  FileSpreadsheet,
  ArrowUpRight,
  Key,
  HelpCircle,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react';
import { googleDriveService, GoogleDriveAuthState } from '../../utils/googleDriveService';
import { googleSheetsService, GoogleSheetsSyncStatus } from '../../utils/googleSheetsService';
import { useSRMS } from '../../context/SRMSContext';
import { ScaleSupportLogo } from './ScaleSupportLogo';
import { GooglePickerButton } from './GooglePickerButton';
import { PickedDriveFile } from '../../utils/googlePickerService';

export const GoogleDriveLinkModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { currentUser, photos, voiceNotes, accounts, followups, getGoogleSheetsData, syncWithGoogleSheets, pullFromGoogleSheets } = useSRMS();
  const [driveState, setDriveState] = useState<GoogleDriveAuthState>(googleDriveService.getAuthState());
  const [sheetsStatus, setSheetsStatus] = useState<GoogleSheetsSyncStatus>(googleSheetsService.getStatus());
  const [clientIdInput, setClientIdInput] = useState<string>(googleDriveService.getClientId());
  const [appsScriptUrlInput, setAppsScriptUrlInput] = useState<string>(googleSheetsService.getAppsScriptUrl());
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);
  const [isPullingSheets, setIsPullingSheets] = useState(false);
  const [isTestingAppsScript, setIsTestingAppsScript] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showClientIdHelp, setShowClientIdHelp] = useState(true);

  useEffect(() => {
    const unsubDrive = googleDriveService.subscribe((state) => {
      setDriveState(state);
    });
    const unsubSheets = googleSheetsService.subscribe((s) => {
      setSheetsStatus(s);
      setAppsScriptUrlInput(s.appsScriptUrl || googleSheetsService.getAppsScriptUrl());
    });
    return () => {
      unsubDrive();
      unsubSheets();
    };
  }, []);

  if (!isOpen) return null;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-xl border border-red-100">
          <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Admin Access Only</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Google Drive &amp; Sheets central storage configurations and live synchronization are restricted to System Administrators.
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

  const handleSaveClientId = () => {
    googleDriveService.setClientId(clientIdInput);
    setStatusMessage('OAuth Client ID saved successfully.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  const handleSaveAppsScriptUrl = () => {
    if (appsScriptUrlInput.trim()) {
      googleSheetsService.setAppsScriptUrl(appsScriptUrlInput.trim());
      setStatusMessage('Google Apps Script URL saved and synced to Cloud for all team members!');
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  const handleTestAppsScriptUrl = async () => {
    if (!appsScriptUrlInput.trim()) {
      setStatusMessage('Please enter a Google Apps Script Web App URL to test.');
      return;
    }
    setIsTestingAppsScript(true);
    setStatusMessage('Testing connection to Google Apps Script...');
    try {
      const result = await googleSheetsService.testAppsScriptConnection(appsScriptUrlInput.trim());
      setStatusMessage(result.message);
    } catch (e: any) {
      setStatusMessage(`Test failed: ${e?.message || 'Connection error'}`);
    } finally {
      setIsTestingAppsScript(false);
      setTimeout(() => setStatusMessage(null), 7000);
    }
  };

  const handleConnectDrive = async () => {
    if (clientIdInput.trim()) {
      googleDriveService.setClientId(clientIdInput.trim());
    }

    setIsAuthorizing(true);
    setStatusMessage(null);
    try {
      const success = await googleDriveService.connectGoogleDrive('Ashish.kharad2@gmail.com');
      if (success) {
        setStatusMessage('Successfully linked Google Drive storage & Google Sheets integration!');
        // Automatically perform first master sync
        handleSyncToGoogleSheets();
      } else {
        setStatusMessage('Google authorization was cancelled or closed.');
      }
    } catch (err: any) {
      setStatusMessage(`OAuth Error: ${err?.message || err}`);
    } finally {
      setIsAuthorizing(false);
    }
  };

  const handleSyncToGoogleSheets = async () => {
    setIsSyncingSheets(true);
    setStatusMessage('Pushing all 19 tabs, accounts, and remarks to Google Sheets...');
    try {
      const tabs = getGoogleSheetsData();
      const success = await googleSheetsService.syncAllSheets(tabs);
      if (success) {
        setStatusMessage('All 19 tabs and follow-up remarks successfully updated in Google Sheets!');
      } else {
        const err = googleSheetsService.getStatus().syncError || 'Failed to update';
        setStatusMessage(`Google Sheets sync notice: ${err}`);
      }
    } catch (err: any) {
      setStatusMessage(`Sync error: ${err?.message || err}`);
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handlePullFromGoogleSheets = async () => {
    setIsPullingSheets(true);
    setStatusMessage('Pulling updated accounts & remarks from Google Sheets into site...');
    try {
      const res = await pullFromGoogleSheets();
      if (res.success) {
        setStatusMessage(res.message);
      } else {
        setStatusMessage(`Pull error: ${res.message}`);
      }
    } catch (err: any) {
      setStatusMessage(`Pull error: ${err?.message || err}`);
    } finally {
      setIsPullingSheets(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect Google Drive & Sheets?')) {
      googleSheetsService.desyncAndRemoveAccess();
      googleDriveService.disconnectGoogleDrive();
      setStatusMessage('Google Sheets and Drive disconnected and de-synced.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 font-sans text-xs">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-800 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-white/95 p-2 rounded-xl shadow-xs">
              <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white">
                  Google Sheets &amp; Drive Cloud Sync
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Google Workspace
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Store remarks, followups, PTP commitments &amp; evidence under your personal Google account
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Connection Status Card */}
          <div
            className={`p-5 rounded-2xl border transition ${
              driveState.isConnected
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-gradient-to-br from-blue-50 to-indigo-50/50 border-blue-200 text-slate-900'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`p-3 rounded-2xl ${
                    driveState.isConnected
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  }`}
                >
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm">
                      {driveState.isConnected ? 'Google Account Connected & Active' : 'Google Sheets & Drive Integration'}
                    </span>
                    {driveState.isConnected && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    {driveState.isConnected
                      ? `Linked to: ${driveState.userEmail || 'Ashish.kharad2@gmail.com'}`
                      : 'Sync remarks, visits, PTPs, and photos to your Google Spreadsheet via Apps Script or OAuth.'}
                  </p>
                </div>
              </div>

              {driveState.isConnected ? (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300">
                  LIVE SYNC
                </span>
              ) : (
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-300">
                  READY
                </span>
              )}
            </div>

            {/* Sheets & Drive live links info */}
            {driveState.isConnected && (
              <div className="mt-4 pt-3 border-t border-emerald-200/80 space-y-2 font-mono text-[11px] text-emerald-900">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    <Table className="w-3.5 h-3.5 text-emerald-700" />
                    <span>📊 Google Sheets Master Database:</span>
                  </span>
                  {sheetsStatus.spreadsheetUrl ? (
                    <a
                      href={sheetsStatus.spreadsheetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold transition shadow-xs"
                    >
                      <span>Open in Google Sheets</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </a>
                  ) : (
                    <span className="bg-emerald-100 px-2 py-0.5 rounded text-[10px] font-semibold text-emerald-800">
                      ScaleSupport_Master_Recovery_Database
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-slate-600">
                  <span>📝 Live Remarks &amp; Follow-ups:</span>
                  <span className="font-bold text-slate-900">{followups.length} records in 'Followups' tab</span>
                </div>
                <div className="flex items-center justify-between text-slate-600">
                  <span>📸 Evidence &amp; Geotagged Photos:</span>
                  <span className="font-bold text-slate-900">{photos.length} files in Google Drive</span>
                </div>
                {sheetsStatus.lastSyncedAt && (
                  <div className="flex items-center justify-between text-slate-500 text-[10px]">
                    <span>⏱️ Last Full Database Sync:</span>
                    <span className="font-semibold text-emerald-700">{sheetsStatus.lastSyncedAt}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {statusMessage && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Option 1: 1-Click Apps Script Sync (Recommended - No OAuth Popup Needed) */}
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-600 text-white rounded-xl">
                  <FolderSync className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-emerald-950 flex items-center gap-1.5">
                    <span>1-Click Direct Sheet Sync (Google Apps Script)</span>
                    <span className="px-1.5 py-0.5 bg-emerald-200 text-emerald-800 text-[9px] font-extrabold rounded">ZERO AUTH / NO POPUPS</span>
                  </h4>
                  <p className="text-[11px] text-emerald-800">
                    Works 100% on Netlify without any Google login, popup authorization, or OAuth 401 error.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block">
                  Google Apps Script Web App Deployment URL:
                </label>
                <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Cloud Synced across all users
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={appsScriptUrlInput}
                  onChange={(e) => setAppsScriptUrlInput(e.target.value)}
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  className="flex-1 px-3 py-1.5 bg-white border border-emerald-300 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  onClick={handleSaveAppsScriptUrl}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold rounded-xl text-xs transition cursor-pointer shrink-0"
                >
                  Save URL
                </button>
                <button
                  type="button"
                  onClick={handleTestAppsScriptUrl}
                  disabled={isTestingAppsScript}
                  className="px-3 py-1.5 bg-white border border-emerald-400 hover:bg-emerald-100 text-emerald-900 font-semibold rounded-xl text-xs transition cursor-pointer shrink-0 flex items-center gap-1"
                >
                  {isTestingAppsScript ? 'Testing...' : 'Test'}
                </button>
              </div>

              {/* Multi-user / Other Email Deployment Advice */}
              <div className="p-3 bg-amber-50/95 border border-amber-300 rounded-xl text-[11px] text-amber-900 space-y-2 mt-2">
                <p className="font-bold flex items-center gap-1.5 text-amber-950">
                  <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>How to Fix "Could not connect" / "Blocked" for Other Users & Emails:</span>
                </p>
                <div className="space-y-1 text-[11px] text-amber-900 bg-white/70 p-2.5 rounded-lg border border-amber-200">
                  <p className="font-semibold text-amber-950">Follow these 4 steps in your Google Apps Script editor:</p>
                  <ol className="list-decimal list-inside space-y-1 pt-1 text-slate-800">
                    <li>
                      Click <strong>Deploy</strong> (top right) ➔ <strong>Manage deployments</strong>.
                    </li>
                    <li>
                      Click the <strong>Pencil (Edit)</strong> icon next to your active Web App deployment.
                    </li>
                    <li>
                      Under <strong>Version</strong>, select <span className="bg-amber-100 font-bold px-1 rounded text-amber-900">"New version"</span> (CRITICAL: If you don't choose "New version", Google keeps serving the old version!).
                    </li>
                    <li>
                      Verify:
                      <ul className="list-disc list-inside pl-3 pt-0.5 space-y-0.5">
                        <li><strong>Execute as:</strong> <code className="bg-emerald-100 text-emerald-900 px-1 rounded font-bold">Me (Ashish.kharad2@gmail.com)</code></li>
                        <li><strong>Who has access:</strong> <code className="bg-emerald-100 text-emerald-900 px-1 rounded font-bold">Anyone</code></li>
                      </ul>
                    </li>
                    <li>
                      Click <strong>Deploy</strong>, copy the Web App URL (ends with <code className="font-bold">/exec</code>), and click <strong>Save URL</strong> above.
                    </li>
                  </ol>
                </div>
                <p className="text-[10px] text-amber-800 italic">
                  💡 When deployed as "Execute as: Me" and "Access: Anyone", all team members and emails can pull and push without needing OAuth popups or permissions!
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-emerald-200/60">
              <span className="text-[11px] text-emerald-900 font-medium">
                Live Spreadsheet Actions:
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncToGoogleSheets}
                  disabled={isSyncingSheets}
                  className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs"
                  title="Push site data to Google Sheets"
                >
                  <ArrowUpFromLine className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-bounce' : ''}`} />
                  <span>{isSyncingSheets ? 'Pushing Data...' : 'Push to Google Sheets'}</span>
                </button>
                <button
                  onClick={handlePullFromGoogleSheets}
                  disabled={isPullingSheets}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition flex items-center gap-1.5 cursor-pointer text-xs"
                  title="Pull sheet data into site"
                >
                  <ArrowDownToLine className={`w-3.5 h-3.5 ${isPullingSheets ? 'animate-bounce' : ''}`} />
                  <span>{isPullingSheets ? 'Pulling Data...' : 'Pull from Google Sheets'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Option 2: Google OAuth 2.0 Client ID Setup (For Google Popup & Picker) */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-slate-800 text-white rounded-lg">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-slate-900">Option 2: Google OAuth 2.0 Web Client ID (Optional)</h4>
                  <p className="text-[11px] text-slate-500">For Google Drive direct popups and Google Picker dialogs</p>
                </div>
              </div>
              <button
                onClick={() => setShowClientIdHelp(!showClientIdHelp)}
                className="text-blue-600 hover:text-blue-700 text-[11px] flex items-center gap-1 cursor-pointer font-medium"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>{showClientIdHelp ? 'Hide Help' : 'OAuth Error Fix'}</span>
              </button>
            </div>

            {/* Error Troubleshooting Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 space-y-1 leading-relaxed">
              <p className="font-bold flex items-center gap-1.5 text-amber-950">
                <span>⚠️ Why do you see "The OAuth client was not found" on Netlify?</span>
              </p>
              <p>
                Google returns <strong>"The OAuth client was not found"</strong> because the placeholder client ID is not yet registered in Google Cloud Console under your project <code className="bg-white px-1 py-0.5 rounded text-slate-800 font-mono">scalesupport-52efd</code>.
              </p>
              <div className="pt-1">
                <strong>Easy Fix:</strong>
                <ul className="list-disc list-inside pl-1 space-y-0.5 text-amber-900/90 text-[10px]">
                  <li><strong>Fastest Solution:</strong> Use <strong>Option 1 (Apps Script)</strong> above. It requires <em>no OAuth client and no login</em>, and syncs seamlessly on Netlify.</li>
                  <li><strong>If you need Google Popup:</strong> Create a Web Client ID in Google Cloud Console &gt; <em>Credentials</em> &gt; <em>+ Create Credentials</em> &gt; <em>OAuth client ID (Web application)</em>. Set Authorized JavaScript origins to <code className="bg-white px-1 py-0.5 rounded font-mono text-blue-700">{window.location.origin}</code>, then paste the new Client ID below.</li>
                </ul>
              </div>
            </div>

            {/* Current Origin Display with 1-click Copy */}
            <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-[11px]">
              <span className="text-slate-600 font-medium truncate">
                Your Netlify Origin URL: <code className="text-slate-900 font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-slate-200">{window.location.origin}</code>
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(window.location.origin);
                  setStatusMessage('Copied current origin URL to clipboard!');
                  setTimeout(() => setStatusMessage(null), 3000);
                }}
                className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-[10px] font-semibold text-slate-700 transition cursor-pointer shrink-0"
              >
                Copy Origin
              </button>
            </div>

            {showClientIdHelp && (
              <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-slate-700 space-y-1.5 leading-relaxed">
                <p className="font-bold text-blue-950">Step-by-Step: Registering an OAuth Web Client ID:</p>
                <ol className="list-decimal list-inside space-y-1 pl-1 text-[11px]">
                  <li>Open <strong>Google Cloud Console</strong> (<a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noreferrer" className="text-blue-600 underline">console.cloud.google.com/apis/credentials</a>) and select project <code className="bg-white px-1 rounded text-blue-700 font-mono">scalesupport-52efd</code>.</li>
                  <li>Click <strong>+ CREATE CREDENTIALS</strong> &gt; <strong>OAuth client ID</strong>.</li>
                  <li>Select Application type: <strong>Web application</strong>. Name it <code className="bg-white px-1 rounded text-slate-800 font-mono">ScaleSupport Web</code>.</li>
                  <li>Under <em>Authorized JavaScript origins</em>, add your Netlify domain: <code className="bg-white px-1 rounded text-emerald-700 font-mono">{window.location.origin}</code></li>
                  <li>Click <strong>Create</strong>, copy the Client ID (looks like <code className="bg-white px-1 rounded text-slate-600 font-mono text-[10px]">399...apps.googleusercontent.com</code>), paste below, and click <strong>Save</strong>.</li>
                </ol>
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
                placeholder="Paste your Google OAuth Client ID here..."
                className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono text-[11px] text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleSaveClientId}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs transition cursor-pointer"
              >
                Save Client ID
              </button>
            </div>
          </div>

          {/* Google Picker Integration Box */}
          <div className="p-4 bg-indigo-50/60 border border-indigo-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-indigo-950">Google Picker Integration</h4>
                  <p className="text-[11px] text-indigo-700">Browse &amp; select Google Drive files directly inside SRMS</p>
                </div>
              </div>
              <GooglePickerButton
                onFilesSelected={(files: PickedDriveFile[]) => {
                  setStatusMessage(`Google Picker: Selected ${files.length} file(s) - "${files[0]?.name || ''}"`);
                }}
                viewMode="all"
                buttonText="Launch Google Picker"
                size="sm"
                variant="primary"
              />
            </div>
            <p className="text-[11px] text-indigo-800/80">
              Interactive Google Picker dialog enables recovery officers to seamlessly attach borrower KYC proofs, PAN cards, property photos, and payment slips directly from Google Drive.
            </p>
          </div>

          {/* Real-time Remark Sync Info */}
          <div className="space-y-2.5">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
              <FolderSync className="w-4 h-4 text-emerald-600" />
              <span>How Data &amp; Remarks Are Stored in Google Sheets</span>
            </h4>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-2xl font-mono text-[11px] space-y-1.5 shadow-inner">
              <div className="text-emerald-400 font-bold">📊 Google Spreadsheet: ScaleSupport_Master_Recovery_Database</div>
              <div className="pl-4 space-y-1 text-slate-300 border-l border-slate-800 ml-2">
                <div className="text-amber-300">📑 Sheet 'Followups' • Every Agent Call &amp; Customer Remark logged in real time</div>
                <div className="text-blue-300">📑 Sheet 'PTP' • Commitment amounts, promised dates &amp; recovery modes</div>
                <div className="text-emerald-300">📑 Sheet 'Accounts' • Balance, overdue amount, allocated agent &amp; PTP count</div>
                <div className="text-purple-300">📑 Sheet 'Visits' &amp; 'Photos' • GPS Lat/Lng stamps &amp; Google Drive file URLs</div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500">
            {driveState.isConnected ? 'Google Account Connected' : 'Use 1-Click Sync or Connect with OAuth Client ID'}
          </div>

          <div className="flex items-center gap-2">
            {driveState.isConnected ? (
              <>
                <button
                  onClick={handleDisconnect}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Disconnect
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Done
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 transition cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={handleConnectDrive}
                  disabled={isAuthorizing}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-md shadow-blue-600/20 transition cursor-pointer"
                >
                  {isAuthorizing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Authorizing...</span>
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4" />
                      <span>Authorize Google OAuth Popup</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

