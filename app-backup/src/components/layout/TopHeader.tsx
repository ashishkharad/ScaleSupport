import React from 'react';
import {
  Smartphone,
  Monitor,
  Bell,
  RefreshCw,
  UserCheck,
  Shield,
  Percent,
  CheckCircle2,
  ExternalLink,
  LogOut,
  Zap,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { ScaleSupportLogo } from '../common/ScaleSupportLogo';

export const TopHeader: React.FC<{
  onOpenSyncModal?: () => void;
  onOpenNotifications?: () => void;
  onOpenDriveModal?: () => void;
}> = ({ onOpenSyncModal, onOpenNotifications, onOpenDriveModal }) => {
  const {
    currentUser,
    logout,
    deviceMode,
    setDeviceMode,
    notifications,
    commissionSettings,
    autoSyncEnabled,
    isSyncing,
    lastAutoSyncTime,
    sheetQueueStatus,
    firestoreSpeedStats,
  } = useSRMS();

  const unreadCount = notifications.filter((n) => !n.read).length;

  const roleColors: Record<string, string> = {
    admin: 'bg-purple-100 text-purple-700 border-purple-200',
    coordinator: 'bg-blue-100 text-blue-700 border-blue-200',
    agent: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    management: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <header className="bg-[#0f172a] text-slate-200 border-b border-slate-800 sticky top-0 z-40 px-2.5 sm:px-5 py-2 sm:py-2.5 flex items-center justify-between shadow-sm w-full max-w-full overflow-hidden">
      {/* Brand & System Title with ScaleSupport Logo */}
      <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
        <div className="bg-white/95 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg sm:rounded-xl shadow-2xs border border-white/20">
          <ScaleSupportLogo variant="compact" size="sm" showTagline={false} />
        </div>
        <div className="hidden md:block">
          <div className="flex items-center gap-2">
            <h1 className="text-sm font-black text-white tracking-tight leading-tight flex items-center gap-1.5">
              <span>Recovery &amp; Allocation</span>
            </h1>
            <span className="text-[10px] uppercase tracking-wider font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-1.5 py-0.5 rounded">v2.4</span>
          </div>
          <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            {currentUser?.role === 'admin' ? (
              <span>Google Sheets &amp; Drive Sync</span>
            ) : (
              <span>Field Operations &amp; Allocation System</span>
            )}
            <span className="text-slate-600">•</span>
            <span>{commissionSettings.defaultRate}% Commission</span>
          </p>
        </div>
      </div>

      {/* Center Platform/Device Switcher */}
      <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-slate-800 shrink-0 mx-1 sm:mx-2">
        <button
          id="btn-switch-android"
          onClick={() => setDeviceMode('android')}
          className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
            deviceMode === 'android'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
          title="Switch to Android Mobile App view"
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">📱 Android App</span>
          <span className="sm:hidden">App</span>
        </button>

        <button
          id="btn-switch-web"
          onClick={() => setDeviceMode('web')}
          className={`flex items-center space-x-1 sm:space-x-1.5 px-2 sm:px-3.5 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer ${
            deviceMode === 'web'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
          }`}
          title="Switch to Web Portal view"
        >
          <Monitor className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">💻 Web Portal</span>
          <span className="sm:hidden">Web</span>
        </button>
      </div>

      {/* Right User & Controls */}
      <div className="flex items-center space-x-1.5 sm:space-x-3 shrink-0">
        {/* Google Drive Direct Storage Link - ADMIN ONLY */}
        {currentUser?.role === 'admin' && (
          <button
            id="btn-link-gdrive"
            onClick={onOpenDriveModal}
            className="hidden lg:flex items-center space-x-1.5 px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-xl text-xs text-blue-300 hover:text-white transition shadow-sm cursor-pointer"
            title="Connect or manage central Google Drive storage (Admin Only)"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold">Drive</span>
          </button>
        )}

        {/* 3-Tier Enterprise Storage Architecture Status - ADMIN ONLY */}
        {currentUser?.role === 'admin' && (
          <button
            id="btn-sync-storage"
            onClick={onOpenSyncModal}
            className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs text-slate-200 transition shadow-sm cursor-pointer"
            title={`3-Tier Architecture Active: Firestore (~${firestoreSpeedStats?.averageLatencyMs || 35}ms route) • Google Sheets Queue (${sheetQueueStatus?.pendingCount || 0} queued) • 5 TB Drive Media`}
          >
            {isSyncing || sheetQueueStatus?.isProcessing ? (
              <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />
            ) : (
              <div className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            )}
            <span className="font-medium">
              {sheetQueueStatus?.pendingCount > 0
                ? `${sheetQueueStatus.pendingCount} Queued`
                : '3-Tier Sync'}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
              ~{firestoreSpeedStats?.averageLatencyMs || 35}ms
            </span>
          </button>
        )}

        {/* Commission Rate Badge */}
        <div className="hidden 2xl:flex items-center space-x-1.5 px-2.5 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 font-semibold">
          <Percent className="w-3.5 h-3.5 text-amber-400" />
          <span>{commissionSettings.defaultRate}%</span>
        </div>

        {/* Notification Bell */}
        <button
          id="btn-notifications"
          onClick={onOpenNotifications}
          className="relative p-1.5 sm:p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg sm:rounded-xl transition shrink-0"
          title="System & WhatsApp Notifications"
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-red-500 text-white text-[9px] sm:text-[10px] font-bold rounded-full flex items-center justify-center animate-bounce">
              {unreadCount}
            </span>
          )}
        </button>

        {/* Authenticated User Profile Badge & Logout */}
        <div className="flex items-center space-x-1.5 sm:space-x-2.5 pl-1.5 sm:pl-3 border-l border-slate-800 shrink-0">
          <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-800 rounded-lg sm:rounded-xl px-2 sm:px-2.5 py-1 sm:py-1.5">
            <div className="w-6 h-6 rounded-md bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold text-[11px] flex items-center justify-center">
              {currentUser.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-xs font-bold text-white flex items-center gap-1.5 leading-tight">
                <span className="truncate max-w-[90px] sm:max-w-[120px] md:max-w-[160px]">{currentUser.name}</span>
                {currentUser.agentId && (
                  <span className="text-[10px] font-mono bg-blue-600/30 text-blue-300 border border-blue-500/30 px-1.5 py-0.2 rounded font-semibold hidden xs:inline">
                    {currentUser.agentId}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <span
                  className={`text-[9px] font-semibold uppercase px-1.5 py-0.2 rounded inline-block border ${
                    roleColors[currentUser.role] || 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {currentUser.role}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline truncate max-w-[100px]">
                  • {currentUser.branch || 'Branch'}
                </span>
              </div>
            </div>
          </div>

          {/* Logout Button */}
          <button
            id="btn-logout"
            onClick={logout}
            className="flex items-center gap-1 px-2 sm:px-3 py-1.5 bg-red-600/15 hover:bg-red-600/30 border border-red-500/40 text-red-300 hover:text-red-100 rounded-lg sm:rounded-xl text-xs font-semibold transition cursor-pointer shrink-0"
            title="Sign out of current account session"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  );
};
