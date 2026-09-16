import React, { useState, useRef, useEffect } from 'react';
import {
  Mic,
  Square,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  X,
  Volume2,
  FileAudio,
  Sparkles,
} from 'lucide-react';
import { useSRMS } from '../../context/SRMSContext';
import { Account } from '../../types';

interface VoiceNoteRecorderModalProps {
  account: Account;
  visitId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (voiceRecord: any) => void;
}

export const VoiceNoteRecorderModal: React.FC<VoiceNoteRecorderModalProps> = ({
  account,
  visitId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { currentUser, recordVoiceNote } = useSRMS();

  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [noteTitle, setNoteTitle] = useState<string>(
    `Field Visit Statement - ${account.customerName}`
  );
  const [transcription, setTranscription] = useState<string>(
    'Customer explained business revenue delay. Promised ₹15,000 payment by end of week.'
  );
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [savedRecord, setSavedRecord] = useState<any | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioChunksRef.current = [];
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const url = URL.createObjectURL(audioBlob);
          setAudioBlobUrl(url);
          stream.getTracks().forEach((track) => track.stop());
        };

        recorder.start();
        setIsRecording(true);
        setRecordingSeconds(0);
      } else {
        // Fallback simulate timer
        setIsRecording(true);
        setRecordingSeconds(0);
      }
    } catch {
      // Permission might be denied in some iframe sandboxes, enable simulation timer
      setIsRecording(true);
      setRecordingSeconds(0);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    } else if (!audioBlobUrl) {
      // Create empty mock audio blob
      setAudioBlobUrl('mock_audio_url');
    }
    setIsRecording(false);
  };

  const handleReset = () => {
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.pause();
        audioPlayerRef.current.currentTime = 0;
      } catch {}
    }
    if (isRecording) stopRecording();
    setIsRecording(false);
    setRecordingSeconds(0);
    setAudioBlobUrl(null);
    setIsPlaying(false);
    setIsSaved(false);
    setSavedRecord(null);
  };

  const togglePlayback = () => {
    if (audioPlayerRef.current) {
      if (isPlaying) {
        try {
          audioPlayerRef.current.pause();
        } catch {}
        setIsPlaying(false);
      } else {
        const playPromise = audioPlayerRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPlaying(true);
            })
            .catch((err) => {
              setIsPlaying(false);
              if (err?.name !== 'AbortError') {
                console.debug('Audio play request interrupted or prevented:', err);
              }
            });
        }
      }
    }
  };

  const handleSaveToDrive = () => {
    const duration = recordingSeconds > 0 ? recordingSeconds : 28;
    const record = recordVoiceNote({
      accountId: account.accountId,
      durationSeconds: duration,
      title: noteTitle.trim() || `Audio Note - ${account.accountId}`,
      transcription: transcription.trim(),
      audioBlobUrl: audioBlobUrl || undefined,
      visitId,
    });

    setSavedRecord(record);
    setIsSaved(true);
    if (onSuccess) onSuccess(record);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto font-sans">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-slate-800 flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-pink-600 rounded-xl text-white shadow-sm">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Record Audio Voice Note</span>
                <span className="text-xs bg-pink-50 text-pink-700 font-mono font-bold px-2 py-0.5 rounded border border-pink-200">
                  {account.accountId}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Direct audio storage in Google Drive &amp; Account Timeline link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-xs">
          {isSaved && savedRecord ? (
            /* Saved Success Screen */
            <div className="text-center space-y-4 py-3">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Voice Note Uploaded to Google Drive</h3>
                <p className="text-slate-500 text-xs mt-1">
                  Saved with Drive ID <span className="font-mono text-blue-700 font-semibold">{savedRecord.driveFileId}</span> and linked to Account Timeline &amp; Sheets.
                </p>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Title:</span>
                  <span className="font-semibold text-slate-900">{savedRecord.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration:</span>
                  <span className="font-mono text-emerald-700 font-bold">{savedRecord.durationSeconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Agent:</span>
                  <span className="text-slate-900 font-medium">{currentUser.name} ({currentUser.agentId || currentUser.username || currentUser.id})</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl border border-slate-200 cursor-pointer transition"
                >
                  Record Another
                </button>
                <button
                  onClick={onClose}
                  className="px-5 py-2 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl shadow-sm cursor-pointer transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Recording Interface */
            <div className="space-y-4">
              {/* Visual Recording Pod */}
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-3">
                {/* Pulsing Mic Circle */}
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center transition-all ${
                    isRecording
                      ? 'bg-red-100 border-2 border-red-500 animate-pulse text-red-600 shadow-lg shadow-red-500/10'
                      : audioBlobUrl
                      ? 'bg-pink-100 border-2 border-pink-500 text-pink-700'
                      : 'bg-white border border-slate-200 text-slate-400 shadow-2xs'
                  }`}
                >
                  <Mic className={`w-8 h-8 ${isRecording ? 'animate-bounce' : ''}`} />
                </div>

                {/* Timer Display */}
                <div className="text-center">
                  <div className="text-2xl font-mono font-black tracking-wider text-slate-900">
                    {Math.floor(recordingSeconds / 60)
                      .toString()
                      .padStart(2, '0')}
                    :
                    {(recordingSeconds % 60).toString().padStart(2, '0')}
                  </div>
                  <span className="text-[11px] text-slate-500 font-medium">
                    {isRecording
                      ? '🔴 Recording audio statement...'
                      : audioBlobUrl
                      ? '✅ Recording complete. Ready to upload.'
                      : 'Tap record button to start speaking'}
                  </span>
                </div>

                {/* Simulated Audio Waveform visualizer */}
                {isRecording && (
                  <div className="flex items-center gap-1 h-6">
                    {[16, 24, 12, 28, 20, 14, 26, 18, 10, 22, 16, 24].map((h, i) => (
                      <div
                        key={i}
                        className="w-1 bg-red-500 rounded-full animate-pulse"
                        style={{
                          height: `${Math.max(6, (h * (recordingSeconds % 4 + 1)) / 3)}px`,
                          animationDelay: `${i * 80}ms`,
                        }}
                      />
                    ))}
                  </div>
                )}

                {/* Action Controls */}
                <div className="flex items-center gap-3 pt-1">
                  {!isRecording && !audioBlobUrl && (
                    <button
                      type="button"
                      onClick={startRecording}
                      className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-sm text-sm transition cursor-pointer"
                    >
                      <Mic className="w-4 h-4" />
                      <span>Start Recording</span>
                    </button>
                  )}

                  {isRecording && (
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-6 py-2.5 bg-slate-900 hover:bg-black text-white font-bold rounded-xl flex items-center gap-2 shadow-sm text-sm transition cursor-pointer"
                    >
                      <Square className="w-4 h-4 fill-current" />
                      <span>Stop Recording</span>
                    </button>
                  )}

                  {audioBlobUrl && !isRecording && (
                    <>
                      <button
                        type="button"
                        onClick={togglePlayback}
                        className="px-4 py-2 bg-pink-50 hover:bg-pink-100 text-pink-700 font-semibold rounded-xl flex items-center gap-2 border border-pink-200 cursor-pointer transition"
                      >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        <span>{isPlaying ? 'Pause' : 'Play Audio'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleReset}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 cursor-pointer transition"
                        title="Discard & Re-record"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>

                {audioBlobUrl && audioBlobUrl !== 'mock_audio_url' && (
                  <audio
                    ref={audioPlayerRef}
                    src={audioBlobUrl}
                    onEnded={() => setIsPlaying(false)}
                    className="hidden"
                  />
                )}
              </div>

              {/* Title & Notes */}
              <div className="space-y-3">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Voice Note Title:
                  </label>
                  <input
                    type="text"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="e.g. Customer Commitment & Shop Status"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Summary Notes / Key Talking Points:
                  </label>
                  <textarea
                    rows={2}
                    value={transcription}
                    onChange={(e) => setTranscription(e.target.value)}
                    placeholder="Key highlights of discussion for supervisor and audit record..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload to Drive CTA */}
              <div className="pt-2">
                <button
                  type="button"
                  disabled={isRecording || (!audioBlobUrl && recordingSeconds === 0)}
                  onClick={handleSaveToDrive}
                  className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition ${
                    audioBlobUrl || recordingSeconds > 0
                      ? 'bg-pink-600 hover:bg-pink-700 text-white cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Upload Voice Note to Google Drive &amp; Timeline</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
