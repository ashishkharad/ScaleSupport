import { googleSheetsService } from '../utils/googleSheetsService';

export type SheetQueueItemType =
  | 'RECOVERY'
  | 'PTP'
  | 'FOLLOWUP'
  | 'VISIT'
  | 'PHOTO'
  | 'VOICE_NOTE'
  | 'DOCUMENT'
  | 'ACCOUNT'
  | 'FULL_BATCH';

export interface SheetQueueItem {
  id: string;
  type: SheetQueueItemType;
  payload: any;
  enqueuedAt: number;
  retryCount: number;
}

export interface SheetQueueStatus {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncedAt: string | null;
  lastError: string | null;
  totalSyncedCount: number;
  lastItemType: SheetQueueItemType | null;
}

class SheetSyncQueueManager {
  private queue: SheetQueueItem[] = [];
  private isProcessing = false;
  private debounceTimer: any = null;
  private listeners: ((status: SheetQueueStatus) => void)[] = [];
  private lastSyncedAt: string | null = null;
  private lastError: string | null = null;
  private totalSyncedCount = 0;
  private lastItemType: SheetQueueItemType | null = null;

  constructor() {
    // Attempt processing any leftover queue on window focus
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.triggerProcessing(500);
      });
    }
  }

  public subscribe(cb: (status: SheetQueueStatus) => void): () => void {
    this.listeners.push(cb);
    cb(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public getStatus(): SheetQueueStatus {
    return {
      isSyncing: this.isProcessing,
      pendingCount: this.queue.length,
      lastSyncedAt: this.lastSyncedAt,
      lastError: this.lastError,
      totalSyncedCount: this.totalSyncedCount,
      lastItemType: this.lastItemType,
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((cb) => {
      try {
        cb(status);
      } catch (e) {
        console.error('Sheet queue listener error:', e);
      }
    });
  }

  /**
   * Enqueue an update to automatically replicate Firestore data into Google Sheet
   */
  public enqueue(type: SheetQueueItemType, payload: any) {
    const item: SheetQueueItem = {
      id: `SQ-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type,
      payload,
      enqueuedAt: Date.now(),
      retryCount: 0,
    };

    this.queue.push(item);
    this.lastItemType = type;
    this.notify();

    // Trigger debounced flush (2.5 seconds to batch rapid user inputs)
    this.triggerProcessing(2500);
  }

  private triggerProcessing(delayMs = 2000) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(() => {
      this.processQueue();
    }, delayMs);
  }

  /**
   * Background process loop: writes queued items to Google Sheets non-blockingly
   */
  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.lastError = null;
    this.notify();

    try {
      while (this.queue.length > 0) {
        const item = this.queue[0];

        try {
          await this.syncItemToSheet(item);
          this.totalSyncedCount++;
          this.lastSyncedAt = new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });
          // Remove processed item
          this.queue.shift();
          this.notify();
        } catch (err: any) {
          console.warn(`[SheetSyncQueue] Error syncing ${item.type}:`, err);
          item.retryCount++;
          if (item.retryCount >= 3) {
            // Drop after 3 failures so queue isn't blocked
            this.queue.shift();
            this.lastError = err?.message || 'Sync retry limit reached';
          } else {
            // Backoff delay and break loop to retry later
            this.lastError = err?.message || 'Network delay';
            this.triggerProcessing(8000);
            break;
          }
        }
      }
    } finally {
      this.isProcessing = false;
      this.notify();
    }
  }

  private async syncItemToSheet(item: SheetQueueItem): Promise<boolean> {
    switch (item.type) {
      case 'RECOVERY':
        return await googleSheetsService.appendRecoveryRecord(item.payload);
      case 'FOLLOWUP':
        return await googleSheetsService.appendFollowupRemark(item.payload);
      case 'PTP':
        return await googleSheetsService.appendPTPRecord(item.payload);
      case 'VISIT': {
        const v = item.payload;
        if (googleSheetsService.getSpreadsheetId()) {
          const token = await googleSheetsService.getValidAccessToken();
          const rowValues = [
            v.visitId || v.id,
            v.accountId,
            v.customerName,
            v.agentId,
            v.agentName,
            v.date,
            v.startTime || '',
            v.endTime || '',
            typeof v.latitude === 'number' ? v.latitude.toFixed(6) : '',
            typeof v.longitude === 'number' ? v.longitude.toFixed(6) : '',
            v.visitStatus || 'Completed',
            v.visitRemarks || '',
            v.address || '',
          ];
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsService.getSpreadsheetId()}/values/'Visits'!A1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [rowValues] }),
            }
          ).catch(() => {});
        }
        return true;
      }
      case 'PHOTO': {
        const p = item.payload;
        if (googleSheetsService.getSpreadsheetId()) {
          const token = await googleSheetsService.getValidAccessToken();
          const rowValues = [
            p.photoId || p.id,
            p.accountId,
            p.agentId,
            p.agentName,
            p.date,
            p.time,
            typeof p.latitude === 'number' ? p.latitude.toFixed(6) : '',
            typeof p.longitude === 'number' ? p.longitude.toFixed(6) : '',
            p.driveFileId,
            p.driveFolder || '',
            p.agentRemark || '',
          ];
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsService.getSpreadsheetId()}/values/'Photos'!A1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [rowValues] }),
            }
          ).catch(() => {});
        }
        return true;
      }
      case 'VOICE_NOTE': {
        const vn = item.payload;
        if (googleSheetsService.getSpreadsheetId()) {
          const token = await googleSheetsService.getValidAccessToken();
          const rowValues = [
            vn.voiceNoteId || vn.id,
            vn.accountId,
            vn.agentId,
            vn.agentName,
            vn.date,
            vn.time,
            vn.durationSeconds,
            vn.title,
            vn.driveFileId,
            vn.webViewLink || '',
            vn.transcription || '',
          ];
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsService.getSpreadsheetId()}/values/'VoiceNotes'!A1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [rowValues] }),
            }
          ).catch(() => {});
        }
        return true;
      }
      case 'DOCUMENT': {
        const doc = item.payload;
        if (googleSheetsService.getSpreadsheetId()) {
          const token = await googleSheetsService.getValidAccessToken();
          const rowValues = [
            doc.documentId || doc.id,
            doc.accountId,
            doc.customerName,
            doc.documentType,
            doc.fileName,
            doc.fileSizeBytes,
            doc.uploadedBy,
            doc.dateTime,
            doc.driveFileId,
            doc.fileUrl || '',
          ];
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsService.getSpreadsheetId()}/values/'Documents'!A1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [rowValues] }),
            }
          ).catch(() => {});
        }
        return true;
      }
      case 'ACCOUNT': {
        const acc = item.payload;
        if (googleSheetsService.getSpreadsheetId()) {
          const token = await googleSheetsService.getValidAccessToken();
          const rowValues = [
            acc.accountId,
            acc.loanNumber || '',
            acc.customerName,
            acc.mobile || '',
            acc.bank || '',
            acc.branch || '',
            acc.zone || '',
            acc.outstandingAmount,
            acc.overdueAmount || 0,
            acc.accountStatus,
            acc.assignedAgentName || '',
            acc.totalRecovered || 0,
            acc.latestRemark || '',
          ];
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${googleSheetsService.getSpreadsheetId()}/values/'Accounts'!A1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ values: [rowValues] }),
            }
          ).catch(() => {});
        }
        return true;
      }
      default:
        return true;
    }
  }

  /**
   * Flush queue immediately
   */
  public async flushNow() {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    await this.processQueue();
  }
}

export const sheetSyncQueue = new SheetSyncQueueManager();
