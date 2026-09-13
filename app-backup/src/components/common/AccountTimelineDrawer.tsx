import React, { useState } from 'react';
import {
  Clock,
  MapPin,
  Camera,
  Mic,
  FileText,
  PhoneCall,
  Calendar,
  CheckCircle2,
  DollarSign,
  UserCheck,
  AlertTriangle,
  X,
  ExternalLink,
  ChevronRight,
  Filter,
  Eye,
  Layers,
  MessageSquare,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account, TimelineEvent, TimelineActivityType } from '../../types';
import { formatINR } from '../../utils/watermark';
import { AddAgentNoteModal } from './ActionModals';
import { CustomerConsolidatedDetailModal } from './CustomerConsolidatedDetailModal';

interface AccountTimelineDrawerProps {
  account: Account;
  isOpen: boolean;
  onClose: () => void;
  onOpenWatermarkCamera?: () => void;
  onOpenVoiceRecorder?: () => void;
  onOpenFollowUp?: () => void;
  onOpenPTP?: () => void;
  onOpenRecovery?: () => void;
}

export const AccountTimelineDrawer: React.FC<AccountTimelineDrawerProps> = ({
  account,
  isOpen,
  onClose,
  onOpenWatermarkCamera,
  onOpenVoiceRecorder,
  onOpenFollowUp,
  onOpenPTP,
  onOpenRecovery,
}) => {
  const { getAccountTimeline, accounts } = useSRMS();
  const [filterType, setFilterType] = useState<string>('ALL');
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const [showAddNoteModal, setShowAddNoteModal] = useState(false);
  const [showSingleCustomerModal, setShowSingleCustomerModal] = useState(false);

  if (!isOpen) return null;

  const allEvents = getAccountTimeline(account.accountId);

  const filteredEvents = allEvents.filter((ev) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'MEDIA') return ev.activityType === 'PHOTO' || ev.activityType === 'VOICE_NOTE' || ev.activityType === 'DOCUMENT';
    if (filterType === 'VISITS') return ev.activityType === 'VISIT' || ev.activityType === 'PHOTO';
    if (filterType === 'COLLECTIONS') return ev.activityType === 'RECOVERY' || ev.activityType === 'PTP';
    if (filterType === 'CALLS') return ev.activityType === 'CALL' || ev.activityType === 'FOLLOWUP';
    if (filterType === 'NOTES') return ev.activityType === ('NOTE' as any);
    return true;
  });

  const getActivityIcon = (type: TimelineActivityType) => {
    switch (type) {
      case 'ALLOCATION':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      case 'CALL':
      case 'FOLLOWUP':
        return <PhoneCall className="w-4 h-4 text-amber-600" />;
      case 'PTP':
        return <Calendar className="w-4 h-4 text-purple-600" />;
      case 'VISIT':
        return <MapPin className="w-4 h-4 text-emerald-600" />;
      case 'PHOTO':
        return <Camera className="w-4 h-4 text-sky-600" />;
      case 'VOICE_NOTE':
        return <Mic className="w-4 h-4 text-pink-600" />;
      case 'DOCUMENT':
        return <FileText className="w-4 h-4 text-indigo-600" />;
      case 'RECOVERY':
        return <DollarSign className="w-4 h-4 text-emerald-600" />;
      case 'NOTE' as any:
        return <MessageSquare className="w-4 h-4 text-indigo-600" />;
      default:
        return <Clock className="w-4 h-4 text-slate-500" />;
    }
  };

  const getActivityBadgeColor = (type: TimelineActivityType) => {
    switch (type) {
      case 'ALLOCATION':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'CALL':
      case 'FOLLOWUP':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PTP':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'VISIT':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'PHOTO':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'VOICE_NOTE':
        return 'bg-pink-50 text-pink-700 border-pink-200';
      case 'DOCUMENT':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'RECOVERY':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'NOTE' as any:
        return 'bg-indigo-50 text-indigo-800 border-indigo-200 font-semibold';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/60 backdrop-blur-xs font-sans">
      <div className="w-full max-w-2xl bg-white border-l border-slate-200 h-full flex flex-col shadow-2xl text-slate-800">
        {/* Header */}
        <div className="p-5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-sm">
                <Clock className="w-4 h-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Account Audit Timeline
              </h2>
              <span className="text-xs font-mono font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                {account.accountId}
              </span>
              {account.isMultipleAccount && (
                <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-300 flex items-center gap-1">
                  <Layers className="w-3 h-3" />
                  Multi-Account ({account.multipleAccountsCount || 2})
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {account.customerName} • {account.loanType} • Overdue: <span className="text-red-600 font-bold font-mono">{formatINR(account.overdueAmount)}</span> • <span className="font-semibold text-blue-700">PTPs: {account.ptpCount ?? 0}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Multi-Account Consolidated Launcher Strip */}
        <div className="px-5 py-2.5 bg-indigo-50/70 border-b border-indigo-100 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-700 shrink-0" />
            <span className="text-indigo-900 font-medium">
              View customer consolidated portfolio, all linked accounts &amp; notes in a single view
            </span>
          </div>
          <button
            onClick={() => setShowSingleCustomerModal(true)}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-[11px] flex items-center gap-1 shrink-0 transition cursor-pointer shadow-xs"
          >
            <span>Single View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Quick Action Toolbar */}
        <div className="px-5 py-3 bg-white border-b border-slate-200 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddNoteModal(true)}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-200 flex items-center gap-1 font-semibold whitespace-nowrap transition cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-700" />
              <span>+ Agent Note</span>
            </button>
            <button
              onClick={onOpenFollowUp}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg border border-amber-200 flex items-center gap-1 font-semibold whitespace-nowrap transition cursor-pointer"
            >
              <PhoneCall className="w-3.5 h-3.5 text-amber-700" />
              <span>+ Follow-up</span>
            </button>
            <button
              onClick={onOpenWatermarkCamera}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg border border-sky-200 flex items-center gap-1 font-semibold whitespace-nowrap transition cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-sky-700" />
              <span>+ Geo-Photo</span>
            </button>
            <button
              onClick={onOpenVoiceRecorder}
              className="px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-800 rounded-lg border border-pink-200 flex items-center gap-1 font-semibold whitespace-nowrap transition cursor-pointer"
            >
              <Mic className="w-3.5 h-3.5 text-pink-700" />
              <span>+ Voice Note</span>
            </button>
            <button
              onClick={onOpenPTP}
              className="px-3 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 rounded-lg border border-purple-200 flex items-center gap-1 font-semibold whitespace-nowrap transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-700" />
              <span>+ PTP</span>
            </button>
            <button
              onClick={onOpenRecovery}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg flex items-center gap-1 font-bold whitespace-nowrap shadow-sm transition cursor-pointer"
            >
              <DollarSign className="w-3.5 h-3.5" />
              <span>+ Recovery</span>
            </button>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="px-5 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center gap-2 text-[11px] overflow-x-auto">
          <span className="text-slate-500 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>
          {[
            { id: 'ALL', label: `All (${allEvents.length})` },
            { id: 'NOTES', label: 'Agent Notes' },
            { id: 'VISITS', label: 'Visits & Photos' },
            { id: 'COLLECTIONS', label: 'PTP & Recovery' },
            { id: 'CALLS', label: 'Calls & Follow-ups' },
            { id: 'MEDIA', label: 'Drive Media Files' },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1 rounded-full font-medium transition cursor-pointer ${
                filterType === f.id
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Chronological Event Feed */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4 bg-[#f8fafc]">
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No timeline events found for this filter.
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:top-2 before:bottom-2 before:left-[11px] before:w-0.5 before:bg-slate-200">
              {filteredEvents.map((ev) => (
                <div key={ev.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className="absolute -left-[30px] top-1 w-6 h-6 rounded-full bg-white border-2 border-slate-300 flex items-center justify-center shadow-xs group-hover:border-blue-500 transition">
                    {getActivityIcon(ev.activityType)}
                  </div>

                  {/* Event Card */}
                  <div className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 text-xs shadow-xs transition space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-900 text-sm">{ev.title}</h4>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getActivityBadgeColor(
                              ev.activityType
                            )}`}
                          >
                            {ev.statusBadge || ev.activityType}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Logged by <span className="text-slate-800 font-medium">{ev.userOrAgentName} ({ev.userOrAgentId})</span>
                        </p>
                      </div>

                      <div className="text-right text-[11px] font-mono text-slate-400 shrink-0">
                        <div>{ev.date}</div>
                        <div className="text-slate-400">{ev.time}</div>
                      </div>
                    </div>

                    {/* Description Text */}
                    <div className="text-slate-700 text-xs whitespace-pre-line leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                      {ev.description}
                    </div>

                    {/* Special Media Embeds */}
                    {ev.mediaType === 'photo' && ev.mediaUrl && (
                      <div className="pt-1">
                        <div
                          onClick={() => setSelectedPhotoPreview(ev.mediaUrl!)}
                          className="relative rounded-lg overflow-hidden border border-slate-200 bg-slate-900 cursor-pointer group/img max-h-48 flex items-center justify-center"
                        >
                          <img
                            src={ev.mediaUrl}
                            alt="Watermarked Geo-Photo"
                            className="w-full h-auto object-cover group-hover/img:scale-102 transition duration-200"
                          />
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center gap-1 text-white text-xs font-semibold transition">
                            <Eye className="w-4 h-4" />
                            <span>Click to enlarge watermarked photo</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono mt-1">
                          <span>Drive File ID: {ev.mediaRefId}</span>
                          <span className="text-emerald-600 font-bold">✓ Geo-tag Stamped</span>
                        </div>
                      </div>
                    )}

                    {ev.mediaType === 'audio' && (
                      <div className="pt-1 bg-pink-50/50 p-2.5 rounded-lg border border-pink-200 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-pink-600" />
                          <span className="text-pink-900 font-mono text-[11px]">Audio Recording in Google Drive</span>
                        </div>
                        {ev.mediaUrl && ev.mediaUrl !== 'mock_audio_url' ? (
                          <audio controls preload="none" src={ev.mediaUrl} className="h-7 w-48" />
                        ) : (
                          <span className="font-mono text-pink-700 text-[10px] bg-pink-100 px-2 py-0.5 rounded border border-pink-200">
                            {ev.mediaRefId}
                          </span>
                        )}
                      </div>
                    )}

                    {ev.location && typeof ev.location.latitude === 'number' && typeof ev.location.longitude === 'number' && (
                      <div className="flex items-center gap-1.5 text-[11px] text-emerald-700 font-mono bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                        <span>GPS Coordinates: {ev.location.latitude.toFixed(6)}° N, {ev.location.longitude.toFixed(6)}° E</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Lightbox for photo inspection */}
        {selectedPhotoPreview && (
          <div
            className="fixed inset-0 z-60 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedPhotoPreview(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xl p-2">
              <button
                onClick={() => setSelectedPhotoPreview(null)}
                className="absolute top-4 right-4 p-2 bg-black/70 text-white rounded-full hover:bg-black z-10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={selectedPhotoPreview}
                alt="Enlarged Watermarked Photo"
                className="w-full h-auto max-h-[85vh] object-contain rounded-xl"
              />
            </div>
          </div>
        )}

        {/* Sub-modals */}
        <AddAgentNoteModal
          account={account}
          isOpen={showAddNoteModal}
          onClose={() => setShowAddNoteModal(false)}
        />
        <CustomerConsolidatedDetailModal
          account={account}
          isOpen={showSingleCustomerModal}
          onClose={() => setShowSingleCustomerModal(false)}
        />
      </div>
    </div>
  );
};

