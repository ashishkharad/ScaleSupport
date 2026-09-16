import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  onSnapshot,
  query,
  limit,
} from 'firebase/firestore';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { db, auth, googleProvider, handleFirestoreError, OperationType, testFirestoreConnection } from '../firebase';
import { Account, RecoveryRecord, FollowUp, PTPRecord, FieldVisit, User } from '../types';

export class FirestoreService {
  private static instance: FirestoreService;

  public static getInstance(): FirestoreService {
    if (!FirestoreService.instance) {
      FirestoreService.instance = new FirestoreService();
    }
    return FirestoreService.instance;
  }

  /**
   * Test connection to Firestore
   */
  public async testConnection(): Promise<boolean> {
    return testFirestoreConnection();
  }

  /**
   * Sign In with Google popup
   */
  public async signInWithGoogle(): Promise<FirebaseUser | null> {
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      return cred.user;
    } catch (error) {
      console.error('Google Sign-in failed:', error);
      return null;
    }
  }

  /**
   * Sign out from Firebase Auth
   */
  public async signOutUser(): Promise<void> {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Firebase Sign-out failed:', error);
    }
  }

  /**
   * Listen for Firebase Auth changes
   */
  public onAuthChange(callback: (user: FirebaseUser | null) => void) {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Save or update Account in Firestore
   */
  public async saveAccount(account: Partial<Account>): Promise<boolean> {
    const id = account.id || account.accountId;
    if (!id) return false;
    const path = `accounts/${id}`;
    try {
      const docRef = doc(db, 'accounts', id);
      await setDoc(docRef, { ...account, id, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Save Recovery Record in Firestore
   */
  public async saveRecovery(recovery: Partial<RecoveryRecord>): Promise<boolean> {
    const id = recovery.id || recovery.recoveryId || recovery.receiptNumber;
    if (!id) return false;
    const path = `recoveries/${id}`;
    try {
      const docRef = doc(db, 'recoveries', id);
      await setDoc(docRef, { ...recovery, id, createdAt: recovery.recoveryDate || new Date().toISOString() }, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Save FollowUp in Firestore
   */
  public async saveFollowUp(followup: Partial<FollowUp>): Promise<boolean> {
    const id = followup.id;
    if (!id) return false;
    const path = `followups/${id}`;
    try {
      const docRef = doc(db, 'followups', id);
      await setDoc(docRef, { ...followup, id }, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Save PTP in Firestore
   */
  public async savePTP(ptp: Partial<PTPRecord>): Promise<boolean> {
    const id = ptp.id;
    if (!id) return false;
    const path = `ptps/${id}`;
    try {
      const docRef = doc(db, 'ptps', id);
      await setDoc(docRef, { ...ptp, id }, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Save Visit in Firestore
   */
  public async saveVisit(visit: Partial<FieldVisit>): Promise<boolean> {
    const id = visit.id || visit.visitId;
    if (!id) return false;
    const path = `visits/${id}`;
    try {
      const docRef = doc(db, 'visits', id);
      await setDoc(docRef, { ...visit, id }, { merge: true });
      return true;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
      return false;
    }
  }

  /**
   * Fetch all accounts from Firestore
   */
  public async fetchAccounts(): Promise<Account[]> {
    const path = 'accounts';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as Account);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Fetch all recoveries from Firestore
   */
  public async fetchRecoveries(): Promise<RecoveryRecord[]> {
    const path = 'recoveries';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as RecoveryRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Fetch all followups from Firestore
   */
  public async fetchFollowups(): Promise<FollowUp[]> {
    const path = 'followups';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as FollowUp);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Fetch all PTP records from Firestore
   */
  public async fetchPTPs(): Promise<PTPRecord[]> {
    const path = 'ptps';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as PTPRecord);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Fetch all visits from Firestore
   */
  public async fetchVisits(): Promise<FieldVisit[]> {
    const path = 'visits';
    try {
      const snap = await getDocs(collection(db, path));
      return snap.docs.map((d) => d.data() as FieldVisit);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
      return [];
    }
  }

  /**
   * Save shared system setting (e.g. appsScriptUrl, spreadsheetId)
   */
  public async saveSetting(key: string, data: Record<string, any>): Promise<boolean> {
    try {
      const docRef = doc(db, 'settings', key);
      await setDoc(docRef, { ...data, updatedAt: new Date().toISOString() }, { merge: true });
      return true;
    } catch (error) {
      console.warn('Error saving setting to Firestore:', error);
      return false;
    }
  }

  /**
   * Fetch shared system setting
   */
  public async fetchSetting(key: string): Promise<Record<string, any> | null> {
    try {
      const docRef = doc(db, 'settings', key);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        return snap.data() as Record<string, any>;
      }
      return null;
    } catch (error) {
      console.warn('Error fetching setting from Firestore:', error);
      return null;
    }
  }
}

export const firestoreService = FirestoreService.getInstance();
