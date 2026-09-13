import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db, ensureFirebaseAuth } from '../firebase';
import { sheetSyncQueue } from './sheetSyncQueue';
import {
  Account,
  RecoveryRecord,
  FollowUp,
  PTPRecord,
  FieldVisit,
  PhotoRecord,
  VoiceNoteRecord,
  DocumentRecord,
  User,
  CommissionRecord,
} from '../types';

export interface FirestoreSpeedStats {
  isPrimaryActive: boolean;
  connected: boolean;
  lastLatencyMs: number;
  totalOps: number;
  lastOperationAt: string | null;
}

// Clean undefined values before writing to Firestore
function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      if (val !== null && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        clean[key] = sanitizeForFirestore(val);
      } else {
        clean[key] = val;
      }
    }
  }
  return clean;
}

class FirebaseFirestoreService {
  private stats: FirestoreSpeedStats = {
    isPrimaryActive: true,
    connected: false,
    lastLatencyMs: 24,
    totalOps: 0,
    lastOperationAt: null,
  };

  private listeners: ((stats: FirestoreSpeedStats) => void)[] = [];

  constructor() {
    if (typeof window !== 'undefined') {
      ensureFirebaseAuth().then(() => {
        this.stats.connected = true;
        this.notify();
      });
    }
  }

  public subscribeStats(cb: (stats: FirestoreSpeedStats) => void): () => void {
    this.listeners.push(cb);
    cb(this.stats);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== cb);
    };
  }

  public getStats(): FirestoreSpeedStats {
    return { ...this.stats };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb(this.getStats());
      } catch (e) {
        console.error('Firestore stat listener error:', e);
      }
    });
  }

  private recordLatency(start: number) {
    const elapsed = Math.round(performance.now() - start);
    this.stats.lastLatencyMs = Math.max(1, elapsed);
    this.stats.totalOps++;
    this.stats.lastOperationAt = new Date().toLocaleTimeString();
    this.notify();
  }

  // ==========================================
  // REAL-TIME LISTENERS (Instant onSnapshot)
  // ==========================================

  public subscribeAccounts(callback: (accounts: Account[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'accounts');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: Account[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as Account);
        });
        this.stats.connected = true;
        this.notify();
        callback(items);
      },
      (error) => {
        console.warn('Firestore accounts listener fallback:', error.message);
      }
    );
  }

  public subscribeRecoveries(callback: (recoveries: RecoveryRecord[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'recoveries');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: RecoveryRecord[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as RecoveryRecord);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore recoveries listener fallback:', error.message);
      }
    );
  }

  public subscribePTPs(callback: (ptps: PTPRecord[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'ptps');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: PTPRecord[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as PTPRecord);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore ptps listener fallback:', error.message);
      }
    );
  }

  public subscribeFollowUps(callback: (followups: FollowUp[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'followups');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: FollowUp[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as FollowUp);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore followups listener fallback:', error.message);
      }
    );
  }

  public subscribeVisits(callback: (visits: FieldVisit[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'visits');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: FieldVisit[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as FieldVisit);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore visits listener fallback:', error.message);
      }
    );
  }

  public subscribePhotos(callback: (photos: PhotoRecord[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'photos');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: PhotoRecord[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as PhotoRecord);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore photos listener fallback:', error.message);
      }
    );
  }

  public subscribeVoiceNotes(callback: (voiceNotes: VoiceNoteRecord[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'voicenotes');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: VoiceNoteRecord[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as VoiceNoteRecord);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore voicenotes listener fallback:', error.message);
      }
    );
  }

  public subscribeDocuments(callback: (docs: DocumentRecord[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'documents');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: DocumentRecord[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as DocumentRecord);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore documents listener fallback:', error.message);
      }
    );
  }

  public subscribeUsers(callback: (users: User[]) => void): () => void {
    ensureFirebaseAuth();
    const colRef = collection(db, 'users');
    return onSnapshot(
      colRef,
      (snapshot) => {
        const items: User[] = [];
        snapshot.forEach((docSnap) => {
          items.push(docSnap.data() as User);
        });
        callback(items);
      },
      (error) => {
        console.warn('Firestore users listener fallback:', error.message);
      }
    );
  }

  // ==========================================
  // FAST MUTATIONS (< 50ms) + AUTO-SHEET QUEUE
  // ==========================================

  /**
   * Primary write for loan account with auto-replicate to Google Sheets
   */
  public async saveAccount(account: Account): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = account.id || account.accountId;
    const cleanData = sanitizeForFirestore({
      ...account,
      updatedAt: new Date().toISOString(),
    });

    await setDoc(doc(db, 'accounts', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate to secondary Google Sheet
    sheetSyncQueue.enqueue('ACCOUNT', cleanData);
  }

  /**
   * Fast Batch Save for bulk excel import
   */
  public async batchSaveAccounts(accounts: Account[]): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    // Firestore batch limit is 500 ops per batch
    const CHUNK_SIZE = 400;
    for (let i = 0; i < accounts.length; i += CHUNK_SIZE) {
      const chunk = accounts.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);

      chunk.forEach((acc) => {
        const docId = acc.id || acc.accountId;
        const ref = doc(db, 'accounts', docId);
        batch.set(
          ref,
          sanitizeForFirestore({
            ...acc,
            updatedAt: new Date().toISOString(),
          }),
          { merge: true }
        );
      });

      await batch.commit();
    }

    this.recordLatency(start);

    // Enqueue Google Sheets auto-sync
    accounts.forEach((acc) => sheetSyncQueue.enqueue('ACCOUNT', acc));
  }

  /**
   * Primary write for payment collection with auto-replicate to Google Sheets
   */
  public async saveRecovery(recovery: RecoveryRecord): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = recovery.id || recovery.recoveryId;
    const cleanData = sanitizeForFirestore({
      ...recovery,
      createdAt: (recovery as any).createdAt || (recovery as any).timestamp || new Date().toISOString(),
    });

    await setDoc(doc(db, 'recoveries', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate recovery to Google Sheet (Tab 4)
    sheetSyncQueue.enqueue('RECOVERY', cleanData);
  }

  /**
   * Primary write for Commission record
   */
  public async saveCommission(commission: CommissionRecord): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = commission.id;
    const cleanData = sanitizeForFirestore({
      ...commission,
      createdAt: (commission as any).createdAt || new Date().toISOString(),
    });

    await setDoc(doc(db, 'commissions', docId), cleanData, { merge: true });
    this.recordLatency(start);
  }

  /**
   * Primary write for Promise-to-Pay with auto-replicate to Google Sheets
   */
  public async savePTP(ptp: PTPRecord): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = ptp.id;
    const cleanData = sanitizeForFirestore({
      ...ptp,
      createdAt: ptp.createdAt || new Date().toISOString(),
    });

    await setDoc(doc(db, 'ptps', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate PTP to Google Sheet (Tab 5)
    sheetSyncQueue.enqueue('PTP', cleanData);
  }

  /**
   * Primary write for Follow-up remarks with auto-replicate to Google Sheets
   */
  public async saveFollowUp(followup: FollowUp): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = followup.id;
    const cleanData = sanitizeForFirestore(followup);

    await setDoc(doc(db, 'followups', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate follow-up to Google Sheet (Tab 7)
    sheetSyncQueue.enqueue('FOLLOWUP', cleanData);
  }

  /**
   * Primary write for Field Visit with auto-replicate to Google Sheets
   */
  public async saveVisit(visit: FieldVisit): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = visit.id || visit.visitId;
    const cleanData = sanitizeForFirestore(visit);

    await setDoc(doc(db, 'visits', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate visit to Google Sheet (Tab 6)
    sheetSyncQueue.enqueue('VISIT', cleanData);
  }

  /**
   * Direct-to-Drive: Save photo metadata in Firestore (Google Drive file pointer ID only)
   * ZERO binary files in Firebase Storage!
   */
  public async savePhotoMetadata(photo: PhotoRecord): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    // Do NOT store dataUrl in Firestore to keep documents ultra-lightweight (<1 KB)
    // and rely 100% on the Google Drive file ID (using the user's 5 TB of Drive storage)
    const { dataUrl, ...photoMetadataWithoutBlob } = photo;
    const docId = photo.id || photo.photoId;
    const cleanData = sanitizeForFirestore(photoMetadataWithoutBlob);

    await setDoc(doc(db, 'photos', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate photo audit entry to Google Sheet (Tab 13)
    sheetSyncQueue.enqueue('PHOTO', cleanData);
  }

  /**
   * Direct-to-Drive: Save voice note metadata in Firestore (Google Drive file pointer ID only)
   * ZERO binary files in Firebase Storage!
   */
  public async saveVoiceNoteMetadata(voiceNote: VoiceNoteRecord): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    // Exclude raw audio blob from Firestore; keep Drive File ID pointer
    const { audioBlobUrl, ...voiceMetadataWithoutBlob } = voiceNote;
    const docId = voiceNote.id || voiceNote.voiceNoteId;
    const cleanData = sanitizeForFirestore(voiceMetadataWithoutBlob);

    await setDoc(doc(db, 'voicenotes', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate voice note entry to Google Sheet (Tab 14)
    sheetSyncQueue.enqueue('VOICE_NOTE', cleanData);
  }

  /**
   * Direct-to-Drive: Save document metadata in Firestore (Google Drive file pointer ID only)
   * ZERO binary files in Firebase Storage!
   */
  public async saveDocumentMetadata(docRecord: DocumentRecord): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = docRecord.id || docRecord.documentId;
    const cleanData = sanitizeForFirestore(docRecord);

    await setDoc(doc(db, 'documents', docId), cleanData, { merge: true });
    this.recordLatency(start);

    // Auto-replicate document entry to Google Sheet (Tab 15)
    sheetSyncQueue.enqueue('DOCUMENT', cleanData);
  }

  /**
   * Primary write for User profile & permissions
   */
  public async saveUser(user: User): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const docId = user.id;
    const cleanData = sanitizeForFirestore(user);

    await setDoc(doc(db, 'users', docId), cleanData, { merge: true });
    this.recordLatency(start);
  }

  public async deleteAccount(accountId: string): Promise<void> {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'accounts', accountId));
  }

  public async deleteRecovery(recoveryDocId: string): Promise<void> {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'recoveries', recoveryDocId));
  }

  /**
   * Remark Management - Save remarks permanently in Firestore
   */
  public async saveRemark(remark: any): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const remarkId = remark.remarkId || `REM-${Date.now()}`;
    const cleanData = sanitizeForFirestore({
      ...remark,
      remarkId,
      createdAt: remark.createdAt || new Date().toISOString(),
    });

    await setDoc(doc(db, 'remarks', remarkId), cleanData, { merge: true });
    this.recordLatency(start);
  }

  public async getRemarksForAccount(accountId: string): Promise<any[]> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const q = query(
      collection(db, 'remarks'),
      where('accountId', '==', accountId)
    );
    const snap = await getDocs(q);
    this.recordLatency(start);

    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }

  public async getRemarksForAgent(agentId: string): Promise<any[]> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const q = query(
      collection(db, 'remarks'),
      where('agentId', '==', agentId)
    );
    const snap = await getDocs(q);
    this.recordLatency(start);

    return snap.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  }

  public async deleteRemark(remarkId: string): Promise<void> {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'remarks', remarkId));
  }

  /**
   * Account Assignment Management - Handle agent deletion and reassignment
   */
  public async assignAccountToAgent(
    accountId: string,
    agentId: string,
    agentName: string
  ): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const accountRef = doc(db, 'accounts', accountId);
    await updateDoc(accountRef, {
      assignedAgentId: agentId,
      assignedAgentName: agentName,
      isUnassigned: false,
      updatedAt: new Date().toISOString(),
    });

    this.recordLatency(start);
  }

  public async unassignAccountsForAgent(agentId: string): Promise<void> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const q = query(
      collection(db, 'accounts'),
      where('assignedAgentId', '==', agentId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);

    snap.docs.forEach(doc => {
      batch.update(doc.ref, {
        assignedAgentId: null,
        assignedAgentName: null,
        isUnassigned: true,
        updatedAt: new Date().toISOString(),
      });
    });

    await batch.commit();
    this.recordLatency(start);
  }

  public async getAllUnassignedAccounts(): Promise<Account[]> {
    const start = performance.now();
    await ensureFirebaseAuth();

    const q = query(
      collection(db, 'accounts'),
      where('isUnassigned', '==', true)
    );
    const snap = await getDocs(q);
    this.recordLatency(start);

    return snap.docs.map(doc => doc.data() as Account);
  }
}

export const firebaseFirestoreService = new FirebaseFirestoreService();
