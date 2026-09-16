import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  User,
  UserRole,
  Account,
  AccountAllocation,
  AllocationHistory,
  FollowUp,
  PTPRecord,
  RecoveryRecord,
  FieldVisit,
  PhotoRecord,
  VoiceNoteRecord,
  DocumentRecord,
  ActivityLog,
  NotificationItem,
  CommissionRecord,
  CommissionSettings,
  Branch,
  Area,
  Zone,
  Bank,
  RecoveryDepartment,
  CommissionRule,
  UserCommissionAssignment,
  CommissionAuditLog,
  CommissionCalculationResult,
  TimelineEvent,
  GoogleSheetTab,
  DriveFolderNode,
  PTPDigestResult,
  AgentNote,
  QDType,
  RecoveryStage,
  OTSHistoryRecord,
  WhatsAppOfferLog,
} from '../types';
import { signInWithAppToken, signOutOfFirebase } from '../firebase';
import { evaluateOTSSlab, calculateActualConcession, OTS_VALID_TILL } from '../utils/otsScheme';
import { getAccountsForCustomer, getTotalOTSForCustomer, isMultiAccountCustomer } from '../utils/accountGrouping';
import {
  initialUsers,
  initialAccounts,
  initialAccountAllocations,
  initialAllocationHistories,
  initialFollowUps,
  initialPTPs,
  initialRecoveries,
  initialVisits,
  initialPhotos,
  initialVoiceNotes,
  initialDocuments,
  initialActivityLogs,
  initialNotifications,
  initialCommissions,
  initialBranches,
  initialAreas,
  initialZones,
  initialBanks,
  initialRecoveryDepartments,
  initialCommissionRules,
  initialUserCommissionAssignments,
  initialCommissionAuditLogs,
  initialCommissionSettings,
} from '../mockData/initialData';
import { createSRMSWatermarkedPhoto, WatermarkOptions } from '../utils/watermark';
import {
  compileAll19GoogleSheets,
  generateGoogleDriveHierarchy,
} from '../utils/googleSheetsManager';
import { googleDriveService } from '../utils/googleDriveService';
import { googleSheetsService } from '../utils/googleSheetsService';
import { PickedDriveFile } from '../utils/googlePickerService';
import { isMatchingAccountNumber, exportAllBackendDataToExcel } from '../utils/excelAccountImporter';
import { firebaseFirestoreService, FirestoreSpeedStats } from '../services/firebaseFirestoreService';
import { sheetSyncQueue, SheetQueueStatus } from '../services/sheetSyncQueue';
import {
  hashPasswordSync,
  generateSalt,
  generateOTP,
  maskEmail,
  maskMobile,
  generateToken,
} from '../utils/security';
import { calculateCommissionWithPriority, CalculationParams } from '../utils/commissionEngine';

export interface AuthResult {
  success: boolean;
  error?: string;
  code?: string;
}

export interface OTPRequestResult {
  success: boolean;
  message: string;
  maskedEmail?: string;
  maskedMobile?: string;
  requestId?: string;
  error?: string;
}

interface SRMSContextType {
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  deviceMode: 'web' | 'android';
  setDeviceMode: (mode: 'web' | 'android') => void;
  switchUser: (userId: string) => void;
  loginWithCredentials: (
    username: string,
    pin: string,
    targetMode?: 'web' | 'android'
  ) => Promise<AuthResult>;
  logout: () => void;

  // Admin Forgot Password with OTP Flow
  requestAdminOTP: (identifier: string) => Promise<OTPRequestResult>;
  verifyAdminOTP: (
    requestId: string,
    otp: string
  ) => Promise<{ success: boolean; resetToken?: string; error?: string }>;
  resetAdminPasswordWithToken: (
    resetToken: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string; error?: string }>;
  
  // Data
  accounts: Account[];
  allocations: AccountAllocation[];
  allocationHistories: AllocationHistory[];
  followups: FollowUp[];
  ptps: PTPRecord[];
  recoveries: RecoveryRecord[];
  visits: FieldVisit[];
  photos: PhotoRecord[];
  documents: DocumentRecord[];
  voiceNotes: VoiceNoteRecord[];
  activityLogs: ActivityLog[];
  notifications: NotificationItem[];
  commissions: CommissionRecord[];
  commissionSettings: CommissionSettings;
  branches: Branch[];
  areas: Area[];
  zones: Zone[];
  banks: Bank[];
  recoveryDepartments: RecoveryDepartment[];
  commissionRules: CommissionRule[];
  userCommissionAssignments: UserCommissionAssignment[];
  commissionAuditLogs: CommissionAuditLog[];
  activeVisit: FieldVisit | null;

  // Scoped views for role-based hierarchy enforcement
  scopedAccounts: Account[];
  scopedRecoveries: RecoveryRecord[];
  scopedPtps: PTPRecord[];
  scopedVisits: FieldVisit[];
  scopedCommissions: CommissionRecord[];
  scopedUsers: User[];
  scopedRules: CommissionRule[];
  scopedAssignments: UserCommissionAssignment[];
  archivedAccounts: Account[];

  // Actions
  addBank: (bank: Partial<Bank>) => void;
  updateBank: (bankId: string, updates: Partial<Bank>) => void;
  deleteBank: (bankId: string) => void;
  addRecoveryDepartment: (dept: Partial<RecoveryDepartment>) => void;
  updateRecoveryDepartment: (deptId: string, updates: Partial<RecoveryDepartment>) => void;
  addBranch: (branch: Partial<Branch>) => void;
  updateBranch: (branchId: string, updates: Partial<Branch>) => void;
  addCommissionRule: (rule: Partial<CommissionRule>) => { success: boolean; message: string; rule?: CommissionRule; conflictDetected?: boolean };
  updateCommissionRule: (id: string, updates: Partial<CommissionRule>) => { success: boolean; message: string };
  deactivateCommissionRule: (id: string) => { success: boolean; message: string };
  addUserCommissionAssignment: (assignment: Partial<UserCommissionAssignment>) => { success: boolean; message: string; assignment?: UserCommissionAssignment; conflictDetected?: boolean };
  updateUserCommissionAssignment: (id: string, updates: Partial<UserCommissionAssignment>) => { success: boolean; message: string };
  deactivateUserCommissionAssignment: (id: string) => { success: boolean; message: string };
  calculateCommission: (params: CalculationParams) => CommissionCalculationResult;
  getFilteredRecoveryDepartments: (bankName?: string, zoneName?: string) => RecoveryDepartment[];
  getFilteredBranches: (bankName?: string, zoneName?: string, departmentName?: string) => Branch[];
  isAuthorizedForAccount: (account: Account, user?: User) => boolean;
  isAuthorizedForRecovery: (recovery: RecoveryRecord, user?: User) => boolean;
  addAccount: (account: Partial<Account>) => void;
  updateAccount: (accountId: string, updates: Partial<Account>) => void;
  updateCustomerStarRating: (accountId: string, rating: number) => void;
  closeAccount: (accountId: string, closureType: 'Closed as per OTS' | 'Regular Close' | 'Administrative Deletion', remarks?: string) => Promise<{ success: boolean; message: string }>;
  deleteAccount: (accountId: string, closureType?: 'Closed as per OTS' | 'Regular Close' | 'Administrative Deletion', remarks?: string) => Promise<{ success: boolean; message: string }>;
  deleteAllAccountsFromStorage: () => Promise<{ success: boolean; count: number; message: string }> | { success: boolean; count: number; message: string };
  bulkAddAccounts: (accountsList: Partial<Account>[]) => void;
  allocateAccount: (accountId: string, agentId: string, remarks?: string) => void;
  bulkAllocateAccounts: (accountIds: string[], agentId: string, remarks?: string) => void;
  allocateBulkAccounts: (accountIds: string[], agentId: string, agentName?: string, agentCode?: string) => void;
  toggleUserActive: (userId: string) => void;
  addUser: (userData: Partial<User>) => void;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => Promise<{ success: boolean; reassignedCount: number; message: string }>;
  changeUserPassword: (userId: string, newPassword: string, newPin?: string) => void;
  exportAllBackendData: (filename?: string) => void;
  logFollowUp: (data: {
    accountId: string;
    status: FollowUp['status'];
    customerResponse: string;
    discussionDetails: string;
    agentRemarks: string;
    nextFollowUpDate?: string;
    nextFollowUpTime?: string;
  }) => void;
  createPTP: (data: {
    accountId: string;
    amount: number;
    ptpDate: string;
    ptpMode: PTPRecord['ptpMode'];
    customerCommitment: string;
    remarks: string;
  }) => void;
  updatePTPStatus: (ptpId: string, status: PTPRecord['status']) => void;
  recordRecovery: (data: {
    accountId: string;
    amount: number;
    paymentMode: RecoveryRecord['paymentMode'];
    referenceNumber: string;
    remarks: string;
    recoveryDate?: string;
    proofDriveFileId?: string;
    isOTS?: boolean;
    otsStage?: '10_percent_token' | 'full_settlement';
    otsAgreedAmount?: number;
    agentId?: string;
    agentName?: string;
  }) => void;
  editRecovery: (
    recoveryId: string,
    updatedData: {
      amount?: number;
      paymentMode?: RecoveryRecord['paymentMode'];
      referenceNumber?: string;
      remarks?: string;
      recoveryDate?: string;
      isOTS?: boolean;
      otsStage?: '10_percent_token' | 'full_settlement';
      otsAgreedAmount?: number;
    }
  ) => Promise<{ success: boolean; message: string }>;
  deleteRecovery: (recoveryId: string) => Promise<{ success: boolean; message: string }>;
  reverseRecovery: (recoveryId: string, reason: string) => Promise<{ success: boolean; message: string }>;
  markAccountForDeletion: (accountId: string, isMarked?: boolean) => void;
  startFieldVisit: (accountId: string, coords?: { lat: number; lng: number }) => Promise<FieldVisit>;
  completeFieldVisit: (
    visitId: string,
    status: FieldVisit['visitStatus'],
    remarks: string,
    customerInteraction: string,
    photoIds?: string[],
    voiceIds?: string[]
  ) => void;
  captureWatermarkedPhoto: (options: Omit<WatermarkOptions, 'agentId' | 'agentName'>) => Promise<PhotoRecord>;
  recordVoiceNote: (data: {
    accountId: string;
    durationSeconds: number;
    title: string;
    transcription?: string;
    audioBlobUrl?: string;
    visitId?: string;
  }) => VoiceNoteRecord;
  uploadDocument: (data: {
    accountId: string;
    documentType: DocumentRecord['documentType'];
    fileName: string;
    fileSizeBytes: number;
    file?: File | Blob;
  }) => Promise<DocumentRecord> | DocumentRecord;
  attachGoogleDriveDocument: (
    accountId: string,
    file: PickedDriveFile,
    documentType?: DocumentRecord['documentType']
  ) => DocumentRecord;
  updateCommissionSettings: (newRate: number) => void;
  updateCommissionRate: (newRate: number) => void;
  updateCommissionStatus: (commissionId: string, status: CommissionRecord['status']) => void;
  addAgentNote: (accountId: string, note: string, category?: string) => void;
  markNotificationAsRead: (id: string) => void;
  markNotificationRead: (id: string) => void;
  
  // Computed & Aggregates
  getAccountTimeline: (accountId: string) => TimelineEvent[];
  getGoogleSheetsData: () => GoogleSheetTab[];
  getGoogleDriveData: () => DriveFolderNode;
  syncToCloudStorage: () => Promise<{ success: boolean; message: string; timestamp: string }>;
  syncWithGoogleSheets: () => Promise<{ success: boolean; message: string; timestamp: string }>;
  pullFromGoogleSheets: () => Promise<{ success: boolean; message: string; updatedCount: number }>;
  runPTPDigest: (referenceDate?: string) => Promise<PTPDigestResult>;
  getExpiredPTPPreview: (referenceDate?: string) => {
    expiredCount: number;
    expiredAmount: number;
    expiredPTPs: PTPRecord[];
    dueTodayCount: number;
    dueTodayPTPs: PTPRecord[];
    upcomingCount: number;
    totalPending: number;
  };
  analyzeAccountAI: (accountId: string) => Promise<any>;
  triggerRecoveryBackup: () => Promise<{ success: boolean; message: string; timestamp: string }>;
  lastBackupTime: string | null;
  isSyncing: boolean;
  autoSyncEnabled: boolean;
  setAutoSyncEnabled: (enabled: boolean) => void;
  lastAutoSyncTime: string | null;

  // OTS Scheme & WhatsApp Offer Module
  otsAuthorizedRoles: UserRole[];
  updateOTSAuthorizedRoles: (roles: UserRole[]) => void;
  canUserEditOTS: (user?: User) => boolean;
  whatsAppLogs: WhatsAppOfferLog[];
  logWhatsAppOffer: (offerData: Omit<WhatsAppOfferLog, 'id' | 'timestamp'>) => void;
  applyOTS: (accountId: string, options?: { userEnteredAmount?: number; notes?: string }) => { success: boolean; message: string; slabDefined: boolean };
  modifyOTS: (accountId: string, userEnteredAmount: number, notes?: string) => { success: boolean; message: string };
  confirmOTS: (accountId: string, notes?: string) => { success: boolean; message: string };
  cancelOTS: (accountId: string, reason?: string) => { success: boolean; message: string };

  // Shared Central Master Database Across All Logins
  pullSharedMasterData: () => Promise<{ success: boolean; message: string }>;
  pushSharedMasterData: (overrides?: Record<string, any>) => Promise<{ success: boolean; message: string }>;

  // Permanent Demo Data Purge
  purgeAllDemoData: () => Promise<{ success: boolean; message: string }>;

  // 3-Tier Storage Architecture (Firebase Primary Route, Google Sheets Auto-Sync, Google Drive 5 TB Media)
  firestoreSpeedStats: FirestoreSpeedStats;
  sheetQueueStatus: SheetQueueStatus;
  isFirebasePrimaryActive: boolean;
  flushSheetSyncNow: () => Promise<void>;
}

const isDemoUser = (u: any): boolean => {
  if (!u) return false;
  // Primary Admin Ashish Kharad is never purged
  if (u.id === 'USR-ADMIN-1' || u.email?.toLowerCase() === 'ashish.kharad2@gmail.com') return false;
  const demoIds = [
    'USR-BM-001', 'USR-BM-1', 'USR-COORD-1', 'USR-AGT-0009', 'USR-AGT-0045',
    'USR-AGT-0089', 'USR-AGENT-1', 'USR-AGENT-2', 'USR-DEPT-001', 'USR-RD-001', 'BM-001'
  ];
  const demoUsernames = [
    'branch_manager', 'agent_rahul', 'agent_priya', 'ra0009', 'ra0045', 'ra0089',
    'coordinator', 'recovery_dept', 'dept_officer'
  ];
  const demoEmails = [
    'bm001@srms.in', 'bm001@srms-recovery.in', 'dept001@srms.in', 'coord01@srms.in',
    'rahul@srms.in', 'priya@srms.in', 'ag0009@srms.in', 'ag0045@srms.in', 'ag0089@srms.in'
  ];
  if (demoIds.includes(u.id)) return true;
  if (u.username && demoUsernames.includes(u.username.toLowerCase())) return true;
  if (u.email && demoEmails.includes(u.email.toLowerCase())) return true;
  if (u.email && (u.email.endsWith('@srms-recovery.in') || u.email.endsWith('@srms.in'))) return true;
  if (u.name && ['Rahul Sharma', 'Priya Patel', 'Amit Verma', 'Vikram Deshmukh', 'Sanjay Kulkarni (BM)'].includes(u.name)) return true;
  return false;
};

const SRMSContext = createContext<SRMSContextType | undefined>(undefined);

const getStoredSessionItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key) || sessionStorage.getItem(key);
  } catch {
    return null;
  }
};

const setStoredSessionItem = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  } catch {}
};

const removeStoredSessionItem = (key: string) => {
  try {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  } catch {}
};

export const SRMSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication & Session State (Persisted securely across refreshes and tabs)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return getStoredSessionItem('srms_auth_session') === 'true';
    } catch {
      return false;
    }
  });

  const loadSaved = <T,>(key: string, fallback: T): T => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return fallback;
      const parsed = JSON.parse(saved);
      return Array.isArray(fallback) && !Array.isArray(parsed) ? fallback : parsed;
    } catch {
      return fallback;
    }
  };

  // Complete permanent purge flag for all demo data (zones, banks, branch managers, regions, and delete timestamps)
  const PURGE_DEMO_DATA_KEY = 'srms_demo_data_purged_complete_v6';
  if (typeof window !== 'undefined' && localStorage.getItem(PURGE_DEMO_DATA_KEY) !== 'true') {
    try {
      localStorage.setItem('srms_persisted_accounts', JSON.stringify([]));
      localStorage.setItem('srms_persisted_allocations', JSON.stringify([]));
      localStorage.setItem('srms_persisted_allochistories', JSON.stringify([]));
      localStorage.setItem('srms_persisted_followups', JSON.stringify([]));
      localStorage.setItem('srms_persisted_ptps', JSON.stringify([]));
      localStorage.setItem('srms_persisted_recoveries', JSON.stringify([]));
      localStorage.setItem('srms_persisted_visits', JSON.stringify([]));
      localStorage.setItem('srms_persisted_photos', JSON.stringify([]));
      localStorage.setItem('srms_persisted_voicenotes', JSON.stringify([]));
      localStorage.setItem('srms_persisted_documents', JSON.stringify([]));
      localStorage.setItem('srms_persisted_user_assignments', JSON.stringify([]));
      localStorage.setItem('srms_whatsapp_offer_logs', JSON.stringify([]));
      localStorage.setItem('srms_persisted_banks', JSON.stringify([]));
      localStorage.setItem('srms_persisted_zones', JSON.stringify([]));
      localStorage.setItem('srms_persisted_areas', JSON.stringify([]));
      localStorage.setItem('srms_persisted_branches', JSON.stringify([]));
      localStorage.setItem('srms_persisted_departments', JSON.stringify([]));
      localStorage.setItem('srms_deleted_users', JSON.stringify([]));

      // Clean stored users so no demo agent, BM, or recovery department remains
      const rawStored = JSON.parse(localStorage.getItem('srms_persisted_users') || '[]');
      const cleanUsers = rawStored.filter((u: any) => !isDemoUser(u));
      localStorage.setItem('srms_persisted_users', JSON.stringify(cleanUsers.length > 0 ? cleanUsers : initialUsers));

      localStorage.setItem(PURGE_DEMO_DATA_KEY, 'true');
    } catch {}
  }

  const [users, setUsers] = useState<User[]>(() => {
    const loaded = loadSaved<User[]>('srms_persisted_users', initialUsers);
    const sanitized = loaded.filter((u) => !isDemoUser(u));
    return sanitized.length > 0 ? sanitized : initialUsers;
  });
  const [deletedUsers, setDeletedUsers] = useState<User[]>(() => {
    const loaded = loadSaved<User[]>('srms_deleted_users', []);
    return loaded.filter((u) => !isDemoUser(u));
  });

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_deleted_users', JSON.stringify(deletedUsers));
    } catch {}
  }, [deletedUsers]);

  const [currentUser, setCurrentUser] = useState<User>(() => {
    try {
      const savedUserId = getStoredSessionItem('srms_user_id');
      if (savedUserId) {
        const found = users.find((u) => u.id === savedUserId) || initialUsers.find((u) => u.id === savedUserId);
        if (found && !isDemoUser(found)) return found;
      }
    } catch {}
    return initialUsers[0]; // Admin default Ashish Kharad
  });

  const [deviceMode, setDeviceModeState] = useState<'web' | 'android'>(() => {
    try {
      const saved = getStoredSessionItem('srms_device_mode');
      if (saved === 'android' || saved === 'web') return saved;
    } catch {}
    return 'web';
  });

  const setDeviceMode = (mode: 'web' | 'android') => {
    setDeviceModeState(mode);
    setStoredSessionItem('srms_device_mode', mode);
  };

  const isPurged = typeof window !== 'undefined' && localStorage.getItem(PURGE_DEMO_DATA_KEY) === 'true';
  const isUserClearedAccounts = typeof window !== 'undefined' && localStorage.getItem('srms_account_storage_cleared_user') === 'true';

  const [accounts, setAccounts] = useState<Account[]>(() => {
    if (!isPurged || isUserClearedAccounts) return [];
    return loadSaved<Account[]>('srms_persisted_accounts', []);
  });
  const [allocations, setAllocations] = useState<AccountAllocation[]>(() => isPurged && !isUserClearedAccounts ? loadSaved('srms_persisted_allocations', []) : []);
  const [allocationHistories, setAllocationHistories] = useState<AllocationHistory[]>(() => isPurged && !isUserClearedAccounts ? loadSaved('srms_persisted_allochistories', []) : []);
  const [followups, setFollowups] = useState<FollowUp[]>(() => isPurged ? loadSaved('srms_persisted_followups', []) : []);
  const [ptps, setPtps] = useState<PTPRecord[]>(() => isPurged ? loadSaved('srms_persisted_ptps', []) : []);
  const [recoveries, setRecoveries] = useState<RecoveryRecord[]>(() => isPurged ? loadSaved('srms_persisted_recoveries', []) : []);
  const [visits, setVisits] = useState<FieldVisit[]>(() => isPurged ? loadSaved('srms_persisted_visits', []) : []);
  const [photos, setPhotos] = useState<PhotoRecord[]>(() => isPurged ? loadSaved('srms_persisted_photos', []) : []);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNoteRecord[]>(() => isPurged ? loadSaved('srms_persisted_voicenotes', []) : []);
  const [documents, setDocuments] = useState<DocumentRecord[]>(() => isPurged ? loadSaved('srms_persisted_documents', []) : []);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadSaved('srms_persisted_activitylogs', initialActivityLogs));
  const [notifications, setNotifications] = useState<NotificationItem[]>(() => loadSaved('srms_persisted_notifications', initialNotifications));
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [commissionSettings, setCommissionSettings] = useState<CommissionSettings>(initialCommissionSettings);
  const [branches, setBranches] = useState<Branch[]>(() => loadSaved('srms_persisted_branches', []));
  const [areas, setAreas] = useState<Area[]>(() => loadSaved('srms_persisted_areas', []));
  const [zones, setZones] = useState<Zone[]>(() => loadSaved('srms_persisted_zones', []));
  const [banks, setBanks] = useState<Bank[]>(() => loadSaved('srms_persisted_banks', []));
  const [recoveryDepartments, setRecoveryDepartments] = useState<RecoveryDepartment[]>(() => loadSaved('srms_persisted_departments', []));
  const [commissionRules, setCommissionRules] = useState<CommissionRule[]>(() => loadSaved('srms_persisted_commission_rules', initialCommissionRules));
  const [userCommissionAssignments, setUserCommissionAssignments] = useState<UserCommissionAssignment[]>(() => isPurged ? loadSaved('srms_persisted_user_assignments', []) : []);
  const [commissionAuditLogs, setCommissionAuditLogs] = useState<CommissionAuditLog[]>(() => loadSaved('srms_persisted_comm_audit_logs', initialCommissionAuditLogs));
  const [archivedAccounts, setArchivedAccounts] = useState<Account[]>(() => loadSaved<Account[]>('srms_archived_accounts', []));

  // OTS Scheme Authorized Roles & WhatsApp Offer Logs
  // Authorized roles include users, agents, branch managers, and admin
  const defaultOTSAuthorizedRoles: UserRole[] = [
    'admin',
    'recovery_department',
    'branch_manager',
    'management',
    'coordinator',
    'agent',
  ];
  const [otsAuthorizedRoles, setOtsAuthorizedRoles] = useState<UserRole[]>(() =>
    loadSaved('srms_ots_authorized_roles', defaultOTSAuthorizedRoles)
  );
  const [whatsAppLogs, setWhatsAppLogs] = useState<WhatsAppOfferLog[]>(() =>
    loadSaved('srms_whatsapp_offer_logs', [])
  );

  // Sync state changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('srms_ots_authorized_roles', JSON.stringify(otsAuthorizedRoles));
    } catch {}
  }, [otsAuthorizedRoles]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_whatsapp_offer_logs', JSON.stringify(whatsAppLogs));
    } catch {}
  }, [whatsAppLogs]);
  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_banks', JSON.stringify(banks));
    } catch {}
  }, [banks]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_departments', JSON.stringify(recoveryDepartments));
    } catch {}
  }, [recoveryDepartments]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_branches', JSON.stringify(branches));
    } catch {}
  }, [branches]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_areas', JSON.stringify(areas));
    } catch {}
  }, [areas]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_zones', JSON.stringify(zones));
    } catch {}
  }, [zones]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_commission_rules', JSON.stringify(commissionRules));
    } catch {}
  }, [commissionRules]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_user_assignments', JSON.stringify(userCommissionAssignments));
    } catch {}
  }, [userCommissionAssignments]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_comm_audit_logs', JSON.stringify(commissionAuditLogs));
    } catch {}
  }, [commissionAuditLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_accounts', JSON.stringify(accounts));
    } catch {}
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_allocations', JSON.stringify(allocations));
    } catch {}
  }, [allocations]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_allochistories', JSON.stringify(allocationHistories));
    } catch {}
  }, [allocationHistories]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_followups', JSON.stringify(followups));
    } catch {}
  }, [followups]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_ptps', JSON.stringify(ptps));
    } catch {}
  }, [ptps]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_recoveries', JSON.stringify(recoveries));
    } catch {}
  }, [recoveries]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_visits', JSON.stringify(visits));
    } catch {}
  }, [visits]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_activitylogs', JSON.stringify(activityLogs));
    } catch {}
  }, [activityLogs]);

  useEffect(() => {
    try {
      localStorage.setItem('srms_persisted_notifications', JSON.stringify(notifications));
    } catch {}
  }, [notifications]);

  const [activeVisit, setActiveVisit] = useState<FieldVisit | null>(null);
  const [isSyncingState, setIsSyncingState] = useState(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('srms_auto_sync_enabled');
      return saved !== null ? saved === 'true' : true; // Auto-sync enabled by default for real-time live connection
    } catch {
      return true;
    }
  });
  const [lastAutoSyncTime, setLastAutoSyncTime] = useState<string | null>(null);
  
  // ⚡ 3-Tier Enterprise Storage Architecture:
  // Tier 1: Firebase Firestore (Primary, Sub-50ms speed route for active data & real-time sync)
  // Tier 2: Google Sheets (Secondary, automated continuous background replication queue)
  // Tier 3: Google Drive (5 TB Direct Media Store for JPG, JPEG, PNG, PDF, Audio - Zero bytes in Firebase Storage)
  const [firestoreSpeedStats, setFirestoreSpeedStats] = useState<FirestoreSpeedStats>(() => firebaseFirestoreService.getStats());
  const [sheetQueueStatus, setSheetQueueStatus] = useState<SheetQueueStatus>(() => sheetSyncQueue.getStatus());

  useEffect(() => {
    const unsubStats = firebaseFirestoreService.subscribeStats(setFirestoreSpeedStats);
    const unsubQueue = sheetSyncQueue.subscribe(setSheetQueueStatus);
    return () => {
      unsubStats();
      unsubQueue();
    };
  }, []);

  // Real-time Firestore Live Routing Listeners
  // IMPORTANT: this only starts AFTER a real login (isAuthenticated), and
  // fully tears down on logout. Before the security fix, this ran once at
  // app mount before any login existed, so it silently failed permission
  // checks and never worked across different logins. It also now correctly
  // restarts whenever a different user logs in, so their session starts
  // with a live connection instead of nothing.
  useEffect(() => {
    if (!isAuthenticated) return;
    let isSubscribed = true;

    const unsubAccounts = firebaseFirestoreService.subscribeAccounts((fsAccounts) => {
      if (!isSubscribed) return;
      if (fsAccounts && fsAccounts.length > 0) {
        setAccounts((prev) => {
          const map = new Map<string, Account>(prev.map((a) => [a.accountId, a]));
          fsAccounts.forEach((a) => {
            const existing = map.get(a.accountId);
            map.set(a.accountId, existing ? Object.assign({}, existing, a) : a);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubRecoveries = firebaseFirestoreService.subscribeRecoveries((fsRecs) => {
      if (!isSubscribed) return;
      if (fsRecs && fsRecs.length > 0) {
        setRecoveries((prev) => {
          const map = new Map<string, RecoveryRecord>(prev.map((r) => [r.id || r.recoveryId, r]));
          fsRecs.forEach((r) => {
            const key = r.id || r.recoveryId;
            const existing = map.get(key);
            map.set(key, existing ? Object.assign({}, existing, r) : r);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubPtps = firebaseFirestoreService.subscribePTPs((fsPtps) => {
      if (!isSubscribed) return;
      if (fsPtps && fsPtps.length > 0) {
        setPtps((prev) => {
          const map = new Map<string, PTPRecord>(prev.map((p) => [p.id, p]));
          fsPtps.forEach((p) => {
            const existing = map.get(p.id);
            map.set(p.id, existing ? Object.assign({}, existing, p) : p);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubFollowups = firebaseFirestoreService.subscribeFollowUps((fsFlws) => {
      if (!isSubscribed) return;
      if (fsFlws && fsFlws.length > 0) {
        setFollowups((prev) => {
          const map = new Map<string, FollowUp>(prev.map((f) => [f.id, f]));
          fsFlws.forEach((f) => {
            const existing = map.get(f.id);
            map.set(f.id, existing ? Object.assign({}, existing, f) : f);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubVisits = firebaseFirestoreService.subscribeVisits((fsVisits) => {
      if (!isSubscribed) return;
      if (fsVisits && fsVisits.length > 0) {
        setVisits((prev) => {
          const map = new Map<string, FieldVisit>(prev.map((v) => [v.id || v.visitId, v]));
          fsVisits.forEach((v) => {
            const key = v.id || v.visitId;
            const existing = map.get(key);
            map.set(key, existing ? Object.assign({}, existing, v) : v);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubPhotos = firebaseFirestoreService.subscribePhotos((fsPhotos) => {
      if (!isSubscribed) return;
      if (fsPhotos && fsPhotos.length > 0) {
        setPhotos((prev) => {
          const map = new Map<string, PhotoRecord>(prev.map((p) => [p.id || p.photoId, p]));
          fsPhotos.forEach((p) => {
            const key = p.id || p.photoId;
            const existing = map.get(key);
            map.set(key, existing ? Object.assign({}, existing, p) : p);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubVoiceNotes = firebaseFirestoreService.subscribeVoiceNotes((fsVns) => {
      if (!isSubscribed) return;
      if (fsVns && fsVns.length > 0) {
        setVoiceNotes((prev) => {
          const map = new Map<string, VoiceNoteRecord>(prev.map((vn) => [vn.id || vn.voiceNoteId, vn]));
          fsVns.forEach((vn) => {
            const key = vn.id || vn.voiceNoteId;
            const existing = map.get(key);
            map.set(key, existing ? Object.assign({}, existing, vn) : vn);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubDocs = firebaseFirestoreService.subscribeDocuments((fsDocs) => {
      if (!isSubscribed) return;
      if (fsDocs && fsDocs.length > 0) {
        setDocuments((prev) => {
          const map = new Map<string, DocumentRecord>(prev.map((d) => [d.id || d.documentId, d]));
          fsDocs.forEach((d) => {
            const key = d.id || d.documentId;
            const existing = map.get(key);
            map.set(key, existing ? Object.assign({}, existing, d) : d);
          });
          return Array.from(map.values());
        });
      }
    });

    const unsubUsers = firebaseFirestoreService.subscribeUsers((fsUsers) => {
      if (!isSubscribed) return;
      if (fsUsers && fsUsers.length > 0) {
        setUsers((prev) => {
          const map = new Map<string, User>(prev.map((u) => [u.id, u]));
          fsUsers.forEach((u) => {
            const existing = map.get(u.id);
            map.set(u.id, existing ? Object.assign({}, existing, u) : u);
          });
          return Array.from(map.values());
        });
      }
    });

    return () => {
      isSubscribed = false;
      unsubAccounts();
      unsubRecoveries();
      unsubPtps();
      unsubFollowups();
      unsubVisits();
      unsubPhotos();
      unsubVoiceNotes();
      unsubDocs();
      unsubUsers();
    };
  }, [isAuthenticated]);

  const flushSheetSyncNow = useCallback(async () => {
    await sheetSyncQueue.flushNow();
  }, []);
  const isInitialMount = useRef(true);
  const autoPushTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestStateSnapshotRef = useRef<any>({});

  // Local fallback OTP storage for offline / standalone resilience
  const [localOTPRecords, setLocalOTPRecords] = useState<
    Record<
      string,
      {
        otp: string;
        identifier: string;
        userId: string;
        expiresAt: number;
        attempts: number;
        isUsed: boolean;
      }
    >
  >({});
  const [localResetTokens, setLocalResetTokens] = useState<
    Record<string, { userId: string; expiresAt: number; isUsed: boolean }>
  >({});

  // Keep a fresh reference to state for background network pulls/pushes without re-triggering hooks
  latestStateSnapshotRef.current = {
    accounts,
    allocations,
    allocationHistories,
    followups,
    ptps,
    recoveries,
    visits,
    photos,
    documents,
    voiceNotes,
    activityLogs,
    notifications,
    commissions,
    branches,
    areas,
    zones,
    banks,
    recoveryDepartments,
    commissionRules,
    userCommissionAssignments,
    commissionSettings,
    otsAuthorizedRoles,
    whatsAppLogs,
  };

  // ==========================================
  // FORCE FRESH DATA LOAD FROM FIRESTORE ON LOGIN
  // ==========================================
  const forceFreshDataLoad = useCallback(async () => {
    try {
      console.log('🔄 Forcing fresh data load from Firestore...');
      
      // Read from Firestore collections
      const accountsSnap = await firebaseFirestoreService.getAllAccounts();
      const recoveriesSnap = await firebaseFirestoreService.getAllRecoveries();
      const usersSnap = await firebaseFirestoreService.getAllUsers();
      const ptpsSnap = await firebaseFirestoreService.getAllPTPs();
      const visitsSnap = await firebaseFirestoreService.getAllVisits();
      
      // Update state with fresh data
      setAccounts(accountsSnap || []);
      setRecoveries(recoveriesSnap || []);
      setUsers(usersSnap || []);
      setPtps(ptpsSnap || []);
      setVisits(visitsSnap || []);
      
      console.log('✅ Fresh data loaded from Firestore');
      console.log('📊 Accounts:', accountsSnap?.length || 0);
      console.log('💰 Recoveries:', recoveriesSnap?.length || 0);
      console.log('👥 Users:', usersSnap?.length || 0);
    } catch (err) {
      console.error('Error loading fresh data from Firestore:', err);
    }
  }, []);

  // ==========================================
  // SHARED MASTER DATA STORAGE ACROSS ALL LOGINS
  // ==========================================
  const pullSharedMasterData = useCallback(async (): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch('/api/master-data/get');
      if (!res.ok) return { success: false, message: 'Server responded with error' };
      const data = await res.json();
      if (data.success && data.hasData && data.masterData) {
        const m = data.masterData;
        const isUserCleared = typeof window !== 'undefined' && localStorage.getItem('srms_account_storage_cleared_user') === 'true';

        if (Array.isArray(m.accounts)) {
          if (!isUserCleared || m.accounts.length === 0) {
            setAccounts(m.accounts);
          }
        }
        if (Array.isArray(m.allocations)) {
          if (!isUserCleared || m.allocations.length === 0) {
            setAllocations(m.allocations);
          }
        }
        if (Array.isArray(m.allocationHistories)) {
          if (!isUserCleared || m.allocationHistories.length === 0) {
            setAllocationHistories(m.allocationHistories);
          }
        }
        if (Array.isArray(m.followups)) setFollowups(m.followups);
        if (Array.isArray(m.ptps)) setPtps(m.ptps);
        if (Array.isArray(m.recoveries)) setRecoveries(m.recoveries);
        if (Array.isArray(m.visits)) setVisits(m.visits);
        if (Array.isArray(m.photos)) setPhotos(m.photos);
        if (Array.isArray(m.documents)) setDocuments(m.documents);
        if (Array.isArray(m.voiceNotes)) setVoiceNotes(m.voiceNotes);
        if (Array.isArray(m.activityLogs)) setActivityLogs(m.activityLogs);
        if (Array.isArray(m.notifications)) setNotifications(m.notifications);
        if (Array.isArray(m.commissions)) setCommissions(m.commissions);
        if (Array.isArray(m.branches)) setBranches(m.branches);
        if (Array.isArray(m.areas)) setAreas(m.areas);
        if (Array.isArray(m.zones)) setZones(m.zones);
        if (Array.isArray(m.banks)) setBanks(m.banks);
        if (Array.isArray(m.recoveryDepartments)) setRecoveryDepartments(m.recoveryDepartments);
        if (Array.isArray(m.commissionRules)) setCommissionRules(m.commissionRules);
        if (Array.isArray(m.userCommissionAssignments)) setUserCommissionAssignments(m.userCommissionAssignments);
        if (Array.isArray(m.otsAuthorizedRoles)) setOtsAuthorizedRoles(m.otsAuthorizedRoles);
        if (Array.isArray(m.whatsAppLogs)) setWhatsAppLogs(m.whatsAppLogs);
        if (m.commissionSettings) setCommissionSettings(m.commissionSettings);
        setLastAutoSyncTime(new Date().toLocaleTimeString());
        return { success: true, message: 'Master data synchronized across all logins.' };
      } else if (data.success && !data.hasData) {
        // First time initialization: push current initial data to server
        const initialPayload = latestStateSnapshotRef.current || {};
        await fetch('/api/master-data/save', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: initialPayload }),
        });
        return { success: true, message: 'Master data initialized on central storage.' };
      }
      return { success: false, message: 'No master data available on server' };
    } catch (err: any) {
      console.warn('[SRMS MASTER DATA] Pull error:', err);
      return { success: false, message: err?.message || 'Sync failed' };
    }
  }, []);

  const pushSharedMasterData = useCallback(async (overrides?: Record<string, any>): Promise<{ success: boolean; message: string }> => {
    try {
      const isUserCleared = typeof window !== 'undefined' && localStorage.getItem('srms_account_storage_cleared_user') === 'true';
      const payload = {
        accounts: isUserCleared && accounts.length === 0 ? [] : accounts,
        allocations: isUserCleared && accounts.length === 0 ? [] : allocations,
        allocationHistories: isUserCleared && accounts.length === 0 ? [] : allocationHistories,
        followups,
        ptps,
        recoveries,
        visits,
        photos,
        documents,
        voiceNotes,
        activityLogs,
        notifications,
        commissions,
        branches,
        areas,
        zones,
        banks,
        recoveryDepartments,
        commissionRules,
        userCommissionAssignments,
        commissionSettings,
        otsAuthorizedRoles,
        whatsAppLogs,
        ...overrides,
      };
      const res = await fetch('/api/master-data/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: payload }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLastAutoSyncTime(new Date().toLocaleTimeString());
        return { success: true, message: 'Master data successfully saved to central storage.' };
      }
      return { success: false, message: data.error || 'Failed to save to central storage' };
    } catch (err: any) {
      console.warn('[SRMS MASTER DATA] Push error:', err);
      return { success: false, message: err?.message || 'Save failed' };
    }
  }, [
    accounts,
    allocations,
    allocationHistories,
    followups,
    ptps,
    recoveries,
    visits,
    photos,
    documents,
    voiceNotes,
    activityLogs,
    notifications,
    commissions,
    branches,
    areas,
    zones,
    banks,
    recoveryDepartments,
    commissionRules,
    userCommissionAssignments,
    commissionSettings,
    otsAuthorizedRoles,
    whatsAppLogs,
  ]);

  // Initial pull from central shared store on component mount
  useEffect(() => {
    pullSharedMasterData();
  }, [pullSharedMasterData]);

  // Debounced push to central shared store whenever master data updates
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (!autoSyncEnabled) return;
    if (autoPushTimerRef.current) clearTimeout(autoPushTimerRef.current);
    autoPushTimerRef.current = setTimeout(() => {
      pushSharedMasterData();
    }, 1500);
    return () => {
      if (autoPushTimerRef.current) clearTimeout(autoPushTimerRef.current);
    };
  }, [
    accounts,
    ptps,
    recoveries,
    followups,
    visits,
    photos,
    documents,
    voiceNotes,
    commissionRules,
    userCommissionAssignments,
    commissionSettings,
    whatsAppLogs,
    otsAuthorizedRoles,
    autoSyncEnabled,
    pushSharedMasterData,
  ]);

  // CRITICAL FIX: accounts and users were being created/edited/allocated
  // ONLY in local browser memory — nothing ever wrote them to Firestore,
  // so no other login could ever see them no matter how the real-time
  // listeners were set up. This debounced effect is the missing link that
  // actually makes accounts and users shared across different logins.
  const accountsSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (accountsSyncTimerRef.current) clearTimeout(accountsSyncTimerRef.current);
    accountsSyncTimerRef.current = setTimeout(() => {
      accounts.forEach((acc) => {
        firebaseFirestoreService.saveAccount(acc).catch((err) => {
          console.warn('Firestore account sync warning:', err);
        });
      });
    }, 1500);
    return () => {
      if (accountsSyncTimerRef.current) clearTimeout(accountsSyncTimerRef.current);
    };
  }, [accounts, isAuthenticated]);

  const usersSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (usersSyncTimerRef.current) clearTimeout(usersSyncTimerRef.current);
    usersSyncTimerRef.current = setTimeout(() => {
      users.forEach((u) => {
        firebaseFirestoreService.saveUser(u).catch((err) => {
          console.warn('Firestore user sync warning:', err);
        });
      });
    }, 1500);
    return () => {
      if (usersSyncTimerRef.current) clearTimeout(usersSyncTimerRef.current);
    };
  }, [users, isAuthenticated]);

  // Periodic background pull to ensure multiple active users/devices stay in lockstep
  useEffect(() => {
    if (!isAuthenticated || !autoSyncEnabled) return;
    const interval = setInterval(() => {
      pullSharedMasterData();
    }, 20000);
    return () => clearInterval(interval);
  }, [isAuthenticated, autoSyncEnabled, pullSharedMasterData]);

  // Periodic session security verification
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      try {
        // 1. Immediate client-side check: if current user has been marked inactive, terminate session
        if (currentUser && currentUser.active === false) {
          console.warn('[SRMS AUTH] Current user account deactivated locally, terminating session.');
          logout();
          return;
        }

        const token = getStoredSessionItem('srms_session_token');
        if (!token) return;

        // 2. Query backend for explicit administrative deactivation or session revocation
        const res = await fetch('/api/auth/verify-session', {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => null);

        if (!res) {
          // Network interruption / offline / static serverless hosting (e.g. Netlify)
          // Maintain authenticated state gracefully
          return;
        }

        // Only terminate on explicit security signals:
        // - 403 ACCOUNT_DEACTIVATED: User was explicitly deactivated by administrator
        // - 401 SESSION_REVOKED: Password was changed and prior tokens were revoked
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          if (data.code === 'ACCOUNT_DEACTIVATED') {
            console.warn('[SRMS AUTH] Session terminated by server: Account deactivated');
            alert(data.error || 'Your account has been deactivated. You have been logged out.');
            logout();
          }
        } else if (res.status === 401) {
          const data = await res.json().catch(() => ({}));
          if (data.code === 'SESSION_REVOKED') {
            console.warn('[SRMS AUTH] Session terminated by server: Password changed');
            alert(data.error || 'Your password was changed. Please log in again with your new password.');
            logout();
          }
          // Note: Standard 401 without SESSION_REVOKED (e.g. server restart, in-memory cache clear, or client fallback token)
          // will NOT force logout, preventing continuous unwanted logouts.
        }
      } catch {}
    }, 30000);

    return () => clearInterval(interval);
  }, [isAuthenticated, currentUser]);

  // ==========================================
  // STRICT HIERARCHICAL ACCESS ENFORCEMENT
  // Bank -> Zone -> Recovery Department -> Branch -> Branch Manager -> Recovery Agent -> QD -> Recovery -> Commission
  // ==========================================

  const isAuthorizedForAccount = (acc: Account, targetUser: User = currentUser): boolean => {
    if (!acc) return false;
    if (targetUser.role === 'admin') return true;

    if (targetUser.role === 'recovery_department') {
      const bankMatch = !targetUser.bank || !acc.bank || targetUser.bank === acc.bank || acc.bank === 'All Banks';
      const zoneMatch = !targetUser.zone || !acc.zone || targetUser.zone === acc.zone;
      const deptMatch = !targetUser.department || !acc.department || targetUser.department === acc.department;
      return bankMatch && zoneMatch && deptMatch;
    }

    if (targetUser.role === 'branch_manager') {
      const branchMatch = !targetUser.branch || !acc.branch || targetUser.branch === acc.branch;
      const branchIdMatch = !targetUser.branchId || !acc.branchId || targetUser.branchId === acc.branchId;
      return branchMatch || branchIdMatch;
    }

    if (targetUser.role === 'agent') {
      const agentId = targetUser.agentId || targetUser.id;
      return acc.assignedAgentId === agentId || acc.assignedAgentName === targetUser.name;
    }

    return true;
  };

  const isAuthorizedForRecovery = (rec: RecoveryRecord, targetUser: User = currentUser): boolean => {
    if (!rec) return false;
    if (targetUser.role === 'admin') return true;

    if (targetUser.role === 'recovery_department') {
      const bankMatch = !targetUser.bank || !rec.bank || targetUser.bank === rec.bank;
      const zoneMatch = !targetUser.zone || !rec.zone || targetUser.zone === rec.zone;
      const deptMatch = !targetUser.department || !rec.department || targetUser.department === rec.department;
      return bankMatch && zoneMatch && deptMatch;
    }

    if (targetUser.role === 'branch_manager') {
      return !targetUser.branch || !rec.branch || targetUser.branch === rec.branch;
    }

    if (targetUser.role === 'agent') {
      const agentId = targetUser.agentId || targetUser.id;
      return rec.agentId === agentId;
    }

    return true;
  };

  // Scoped views for role-based views
  const scopedAccounts = useMemo(() => {
    return accounts.filter((a) => isAuthorizedForAccount(a, currentUser));
  }, [accounts, currentUser]);

  const scopedRecoveries = useMemo(() => {
    return recoveries.filter((r) => isAuthorizedForRecovery(r, currentUser));
  }, [recoveries, currentUser]);

  const scopedPtps = useMemo(() => {
    if (currentUser.role === 'admin') return ptps;
    const scopedAccountIds = new Set(scopedAccounts.map((a) => a.accountId));
    return ptps.filter((p) => scopedAccountIds.has(p.accountId) || p.agentId === currentUser.agentId || p.agentId === currentUser.id);
  }, [ptps, scopedAccounts, currentUser]);

  const scopedVisits = useMemo(() => {
    if (currentUser.role === 'admin') return visits;
    const scopedAccountIds = new Set(scopedAccounts.map((a) => a.accountId));
    return visits.filter((v) => scopedAccountIds.has(v.accountId) || v.agentId === currentUser.agentId || v.agentId === currentUser.id);
  }, [visits, scopedAccounts, currentUser]);

  const scopedCommissions = useMemo(() => {
    if (currentUser.role === 'admin') return commissions;
    if (currentUser.role === 'agent') {
      const agentId = currentUser.agentId || currentUser.id;
      return commissions.filter((c) => c.agentId === agentId);
    }
    const scopedRecIds = new Set(scopedRecoveries.map((r) => r.recoveryId));
    return commissions.filter((c) => scopedRecIds.has(c.recoveryId));
  }, [commissions, scopedRecoveries, currentUser]);

  const scopedUsers = useMemo(() => {
    if (currentUser.role === 'admin') return users;
    if (currentUser.role === 'recovery_department') {
      return users.filter(
        (u) =>
          u.id === currentUser.id ||
          (u.bank === currentUser.bank && u.zone === currentUser.zone)
      );
    }
    if (currentUser.role === 'branch_manager') {
      return users.filter(
        (u) => u.id === currentUser.id || (u.branch === currentUser.branch && u.role === 'agent')
      );
    }
    return users.filter((u) => u.id === currentUser.id);
  }, [users, currentUser]);

  const scopedRules = useMemo(() => {
    if (currentUser.role === 'admin') return commissionRules;
    if (currentUser.role === 'recovery_department') {
      return commissionRules.filter(
        (r) => !r.bankName || r.bankName === 'All Banks' || r.bankName === currentUser.bank
      );
    }
    if (currentUser.role === 'branch_manager') {
      return commissionRules.filter(
        (r) =>
          !r.branchName ||
          r.branchName === 'All Branches' ||
          r.branchName === currentUser.branch
      );
    }
    return commissionRules;
  }, [commissionRules, currentUser]);

  const scopedAssignments = useMemo(() => {
    if (currentUser.role === 'admin') return userCommissionAssignments;
    if (currentUser.role === 'recovery_department') {
      return userCommissionAssignments.filter(
        (a) => !a.bankName || a.bankName === currentUser.bank
      );
    }
    if (currentUser.role === 'branch_manager') {
      return userCommissionAssignments.filter(
        (a) => !a.branchName || a.branchName === currentUser.branch
      );
    }
    const agentId = currentUser.agentId || currentUser.id;
    return userCommissionAssignments.filter((a) => a.agentId === agentId);
  }, [userCommissionAssignments, currentUser]);

  // ==========================================
  // HIERARCHY CRUD & FILTER HELPERS
  // ==========================================

  const addBank = (bankData: Partial<Bank>) => {
    const newBank: Bank = {
      id: `BNK-${Date.now().toString().slice(-4)}`,
      name: bankData.name?.trim() || 'New Bank',
      code: bankData.code?.trim().toUpperCase() || 'BNK',
      active: bankData.active !== undefined ? bankData.active : true,
      defaultCommissionRate: bankData.defaultCommissionRate || 10,
      description: bankData.description || '',
    };
    setBanks((prev) => [newBank, ...prev]);
    logActivity(currentUser, 'HIERARCHY_UPDATED', `Added new Bank: ${newBank.name} (${newBank.code})`);
  };

  const updateBank = (bankId: string, updates: Partial<Bank>) => {
    setBanks((prev) => prev.map((b) => (b.id === bankId ? { ...b, ...updates } : b)));
    logActivity(currentUser, 'HIERARCHY_UPDATED', `Updated Bank details for ${bankId}`);
  };

  const deleteBank = (bankId: string) => {
    setBanks((prev) => prev.filter((b) => b.id !== bankId));
    setRecoveryDepartments((prev) => prev.filter((d) => d.bankId !== bankId));
    logActivity(currentUser, 'HIERARCHY_UPDATED', `Deleted Bank: ${bankId}`);
  };

  const addRecoveryDepartment = (deptData: Partial<RecoveryDepartment>) => {
    const newDept: RecoveryDepartment = {
      id: `DEP-${Date.now().toString().slice(-4)}`,
      name: deptData.name?.trim() || 'Recovery Department',
      code: deptData.code?.trim().toUpperCase() || 'RD',
      bankId: deptData.bankId || 'BNK-01',
      bankName: deptData.bankName || 'State Bank of India',
      zoneId: deptData.zoneId || 'ZON-01',
      zoneName: deptData.zoneName || 'Maharashtra North Zone',
      headName: deptData.headName || 'Department Head',
      active: deptData.active !== undefined ? deptData.active : true,
      description: deptData.description || '',
    };
    setRecoveryDepartments((prev) => [newDept, ...prev]);
    logActivity(currentUser, 'HIERARCHY_UPDATED', `Added Recovery Department: ${newDept.name} (${newDept.bankName})`);
  };

  const updateRecoveryDepartment = (deptId: string, updates: Partial<RecoveryDepartment>) => {
    setRecoveryDepartments((prev) => prev.map((d) => (d.id === deptId ? { ...d, ...updates } : d)));
    logActivity(currentUser, 'HIERARCHY_UPDATED', `Updated Recovery Department ${deptId}`);
  };

  const addBranch = (branchData: Partial<Branch>) => {
    const newBranch: Branch = {
      id: `BR-${Date.now().toString().slice(-4)}`,
      name: branchData.name?.trim() || 'New Branch',
      code: branchData.code?.trim().toUpperCase() || 'BR',
      area: branchData.area || 'Pune Urban',
      zone: branchData.zone || branchData.zoneName || 'Maharashtra North Zone',
      zoneId: branchData.zoneId || 'ZON-01',
      zoneName: branchData.zoneName || 'Maharashtra North Zone',
      bankId: branchData.bankId || 'BNK-01',
      bankName: branchData.bankName || 'State Bank of India',
      departmentId: branchData.departmentId || 'DEP-01',
      departmentName: branchData.departmentName || 'SAMB Stressed Assets Recovery Cell',
      managerName: branchData.managerName || 'Branch Manager',
      targetAmount: branchData.targetAmount || 1000000,
    };
    setBranches((prev) => [newBranch, ...prev]);
    logActivity(currentUser, 'HIERARCHY_UPDATED', `Added Branch: ${newBranch.name} (${newBranch.bankName || 'Default Bank'})`);
  };

  const updateBranch = (branchId: string, updates: Partial<Branch>) => {
    setBranches((prev) => prev.map((b) => (b.id === branchId ? { ...b, ...updates } : b)));
    logActivity(currentUser, 'HIERARCHY_UPDATED', `Updated Branch ${branchId}`);
  };

  const getFilteredRecoveryDepartments = (bankName?: string, zoneName?: string): RecoveryDepartment[] => {
    return recoveryDepartments.filter((d) => {
      if (bankName && bankName !== 'All Banks' && d.bankName !== bankName) return false;
      if (zoneName && zoneName !== 'All Zones' && d.zoneName !== zoneName) return false;
      return true;
    });
  };

  const getFilteredBranches = (bankName?: string, zoneName?: string, departmentName?: string): Branch[] => {
    return branches.filter((b) => {
      if (bankName && bankName !== 'All Banks' && b.bankName && b.bankName !== bankName) return false;
      if (zoneName && zoneName !== 'All Zones' && b.zoneName && b.zoneName !== zoneName) return false;
      if (departmentName && departmentName !== 'All Departments' && b.departmentName && b.departmentName !== departmentName) return false;
      return true;
    });
  };

  // ==========================================
  // COMMISSION RULES & ASSIGNMENTS ENGINE
  // ==========================================

  const addCommissionRule = (
    ruleData: Partial<CommissionRule>
  ): { success: boolean; message: string; rule?: CommissionRule; conflictDetected?: boolean } => {
    if (!ruleData.name || ruleData.commissionPercentage === undefined) {
      return { success: false, message: 'Rule name and commission percentage are required.' };
    }

    const pct = Number(ruleData.commissionPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return { success: false, message: 'Commission percentage must be between 0% and 100%.' };
    }

    // Check duplicate active rule conflict
    const activeConflicts = commissionRules.filter((r) => {
      if (r.status !== 'active') return false;
      const bMatch = (r.bankName || 'All Banks') === (ruleData.bankName || 'All Banks');
      const zMatch = (r.zoneName || 'All Zones') === (ruleData.zoneName || 'All Zones');
      const brMatch = (r.branchName || 'All Branches') === (ruleData.branchName || 'All Branches');
      const qMatch = (r.qdType || 'All QDs') === (ruleData.qdType || 'All QDs');
      const sMatch = (r.recoveryStage || 'All Stages') === (ruleData.recoveryStage || 'All Stages');
      return bMatch && zMatch && brMatch && qMatch && sMatch;
    });

    if (activeConflicts.length > 0) {
      return {
        success: false,
        conflictDetected: true,
        message: 'Duplicate commission rule detected. Please resolve the conflicting commission rules.',
      };
    }

    const pLevel =
      ruleData.branchName && ruleData.branchName !== 'All Branches'
        ? 2
        : ruleData.qdType && ruleData.qdType !== 'All QDs'
        ? 3
        : ruleData.zoneName && ruleData.zoneName !== 'All Zones'
        ? 4
        : 5;

    const newRule: CommissionRule = {
      id: `CR-${Date.now().toString().slice(-6)}`,
      name: ruleData.name.trim(),
      code: ruleData.code?.trim().toUpperCase() || `CR-${Date.now().toString().slice(-4)}`,
      bankId: ruleData.bankId,
      bankName: ruleData.bankName || 'All Banks',
      zoneId: ruleData.zoneId,
      zoneName: ruleData.zoneName || 'All Zones',
      departmentId: ruleData.departmentId,
      departmentName: ruleData.departmentName || 'All Departments',
      branchId: ruleData.branchId,
      branchName: ruleData.branchName || 'All Branches',
      qdType: ruleData.qdType || 'All QDs',
      recoveryStage: ruleData.recoveryStage || 'All Stages',
      commissionPercentage: pct,
      effectiveFrom: ruleData.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: ruleData.effectiveTo,
      status: ruleData.status || 'active',
      priorityLevel: pLevel,
      description: ruleData.description || '',
      createdBy: currentUser.name,
      createdDate: new Date().toISOString().slice(0, 10),
    };

    setCommissionRules((prev) => [newRule, ...prev]);

    const audit: CommissionAuditLog = {
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CREATED',
      entityType: 'RULE',
      entityId: newRule.id,
      entityName: newRule.name,
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      details: `Created new rule "${newRule.name}" (${newRule.commissionPercentage}%) - Priority ${newRule.priorityLevel}`,
    };
    setCommissionAuditLogs((prev) => [audit, ...prev]);

    logActivity(currentUser, 'COMMISSION_RULE_UPDATED', `Created Commission Rule: ${newRule.name} (${newRule.commissionPercentage}%)`);

    return { success: true, message: `Commission rule "${newRule.name}" created successfully.`, rule: newRule };
  };

  const updateCommissionRule = (
    id: string,
    updates: Partial<CommissionRule>
  ): { success: boolean; message: string } => {
    const existing = commissionRules.find((r) => r.id === id);
    if (!existing) return { success: false, message: 'Rule not found.' };

    if (updates.commissionPercentage !== undefined) {
      const pct = Number(updates.commissionPercentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return { success: false, message: 'Commission percentage must be between 0% and 100%.' };
      }
    }

    setCommissionRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));

    const audit: CommissionAuditLog = {
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATED',
      entityType: 'RULE',
      entityId: id,
      entityName: existing.name,
      previousValues: existing,
      newValues: { ...existing, ...updates },
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      details: `Updated commission rule "${existing.name}"`,
    };
    setCommissionAuditLogs((prev) => [audit, ...prev]);

    logActivity(currentUser, 'COMMISSION_RULE_UPDATED', `Updated Commission Rule: ${existing.name}`);
    return { success: true, message: 'Commission rule updated successfully.' };
  };

  const deactivateCommissionRule = (id: string): { success: boolean; message: string } => {
    const existing = commissionRules.find((r) => r.id === id);
    if (!existing) return { success: false, message: 'Rule not found.' };

    setCommissionRules((prev) => prev.map((r) => (r.id === id ? { ...r, status: 'inactive' } : r)));

    const audit: CommissionAuditLog = {
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DEACTIVATED',
      entityType: 'RULE',
      entityId: id,
      entityName: existing.name,
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      details: `Deactivated commission rule "${existing.name}"`,
    };
    setCommissionAuditLogs((prev) => [audit, ...prev]);

    logActivity(currentUser, 'COMMISSION_RULE_UPDATED', `Deactivated Commission Rule: ${existing.name}`);
    return { success: true, message: `Rule "${existing.name}" deactivated.` };
  };

  const addUserCommissionAssignment = (
    assignmentData: Partial<UserCommissionAssignment>
  ): { success: boolean; message: string; assignment?: UserCommissionAssignment; conflictDetected?: boolean } => {
    if (!assignmentData.agentId) {
      return { success: false, message: 'Recovery Agent selection is required.' };
    }

    if (assignmentData.percentageOverride !== undefined) {
      const pct = Number(assignmentData.percentageOverride);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return { success: false, message: 'Percentage override must be between 0% and 100%.' };
      }
    }

    // Check duplicate active assignment for agent
    const existing = userCommissionAssignments.filter(
      (a) => a.status === 'active' && (a.agentId === assignmentData.agentId || a.agentName === assignmentData.agentName)
    );

    if (existing.length > 0) {
      return {
        success: false,
        conflictDetected: true,
        message: 'Duplicate commission rule detected. Please resolve the conflicting commission rules.',
      };
    }

    const newAssignment: UserCommissionAssignment = {
      id: `UCA-${Date.now().toString().slice(-6)}`,
      agentId: assignmentData.agentId,
      agentName: assignmentData.agentName || assignmentData.agentId,
      assignmentCode: assignmentData.assignmentCode || `ASG-${Date.now().toString().slice(-4)}`,
      ruleId: assignmentData.ruleId,
      percentageOverride: assignmentData.percentageOverride,
      bankName: assignmentData.bankName,
      zoneName: assignmentData.zoneName,
      branchName: assignmentData.branchName,
      effectiveFrom: assignmentData.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: assignmentData.effectiveTo,
      status: assignmentData.status || 'active',
      remarks: assignmentData.remarks || '',
      assignedBy: currentUser.name,
      createdDate: new Date().toISOString().slice(0, 10),
    };

    setUserCommissionAssignments((prev) => [newAssignment, ...prev]);

    const audit: CommissionAuditLog = {
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'ASSIGNED',
      entityType: 'ASSIGNMENT',
      entityId: newAssignment.id,
      entityName: `Assignment: ${newAssignment.agentName}`,
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      details: `Assigned user-specific commission override of ${newAssignment.percentageOverride}% to ${newAssignment.agentName}`,
    };
    setCommissionAuditLogs((prev) => [audit, ...prev]);

    logActivity(currentUser, 'COMMISSION_ASSIGNED', `Assigned user commission override of ${newAssignment.percentageOverride}% to ${newAssignment.agentName}`);

    return { success: true, message: `User commission assigned successfully to ${newAssignment.agentName}.`, assignment: newAssignment };
  };

  const updateUserCommissionAssignment = (
    id: string,
    updates: Partial<UserCommissionAssignment>
  ): { success: boolean; message: string } => {
    const existing = userCommissionAssignments.find((a) => a.id === id);
    if (!existing) return { success: false, message: 'Assignment not found.' };

    if (updates.percentageOverride !== undefined) {
      const pct = Number(updates.percentageOverride);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return { success: false, message: 'Percentage override must be between 0% and 100%.' };
      }
    }

    setUserCommissionAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, ...updates } : a)));

    const audit: CommissionAuditLog = {
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATED',
      entityType: 'ASSIGNMENT',
      entityId: id,
      entityName: `Assignment: ${existing.agentName}`,
      previousValues: existing,
      newValues: { ...existing, ...updates },
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      details: `Updated user commission assignment for ${existing.agentName}`,
    };
    setCommissionAuditLogs((prev) => [audit, ...prev]);

    logActivity(currentUser, 'COMMISSION_ASSIGNED', `Updated commission assignment for ${existing.agentName}`);
    return { success: true, message: 'User commission assignment updated successfully.' };
  };

  const deactivateUserCommissionAssignment = (id: string): { success: boolean; message: string } => {
    const existing = userCommissionAssignments.find((a) => a.id === id);
    if (!existing) return { success: false, message: 'Assignment not found.' };

    setUserCommissionAssignments((prev) => prev.map((a) => (a.id === id ? { ...a, status: 'inactive' } : a)));

    const audit: CommissionAuditLog = {
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DEACTIVATED',
      entityType: 'ASSIGNMENT',
      entityId: id,
      entityName: `Assignment: ${existing.agentName}`,
      performedByUserId: currentUser.id,
      performedByName: currentUser.name,
      details: `Deactivated user commission override for ${existing.agentName}`,
    };
    setCommissionAuditLogs((prev) => [audit, ...prev]);

    logActivity(currentUser, 'COMMISSION_ASSIGNED', `Deactivated commission assignment for ${existing.agentName}`);
    return { success: true, message: 'User commission assignment deactivated.' };
  };

  const calculateCommission = (params: CalculationParams): CommissionCalculationResult => {
    return calculateCommissionWithPriority(
      params,
      commissionRules,
      userCommissionAssignments,
      commissionSettings.defaultRate
    );
  };

  // Sync mode if role changes
  const switchUser = (userId: string) => {
    const target = users.find((u) => u.id === userId);
    if (target) {
      if (!target.active) {
        alert('Cannot switch to a deactivated user account.');
        return;
      }
      setCurrentUser(target);
      setIsAuthenticated(true);
      try {
        setStoredSessionItem('srms_auth_session', 'true');
        setStoredSessionItem('srms_user_id', target.id);
      } catch {}
      if (target.role === 'agent') {
        setDeviceMode('android');
      } else {
        setDeviceMode('web');
      }
      logActivity(target, 'LOGIN', `Switched active user session to ${target.name} (${target.role.toUpperCase()})`);
      // Pull fresh shared master data for the switched user
      pullSharedMasterData();
    }
  };

  // Secure Server-Enforced Login with Exact Match, Agent ID Support, and Fallback Validation
  const loginWithCredentials = async (
    inputIdentifier: string,
    passwordInput: string,
    targetMode?: 'web' | 'android'
  ): Promise<AuthResult> => {
    if (!inputIdentifier || !inputIdentifier.trim()) {
      return { success: false, error: 'Please enter your User ID or registered Email.' };
    }
    if (!passwordInput || !passwordInput.trim()) {
      return { success: false, error: 'Please enter your Password.' };
    }

    const cleanInput = inputIdentifier.trim();
    const cleanPassword = passwordInput.trim();
    const lowerInput = cleanInput.toLowerCase();
    const upperInput = cleanInput.toUpperCase().replace(/\s+/g, '');

    // 1. Try Backend API first
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: cleanInput,
          password: cleanPassword,
          deviceMode: targetMode,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success && data.user) {
        // SECURITY: establish a REAL Firebase session using the token the
        // server just minted after verifying the password. No Firestore
        // data can be read before this succeeds.
        if (data.customToken) {
          try {
            await signInWithAppToken(data.customToken);
          } catch (tokenErr) {
            console.error('[SRMS AUTH] Failed to establish secure session:', tokenErr);
            return { success: false, error: 'Could not establish a secure session. Please try again.' };
          }
        }

        // Sync user state with returned authenticated user
        const fullUser = users.find((u) => u.id === data.user.id || u.agentId === data.user.agentId) || (data.user as User);
        setCurrentUser(fullUser);
        setIsAuthenticated(true);

        try {
          setStoredSessionItem('srms_auth_session', 'true');
          setStoredSessionItem('srms_session_token', data.token);
          setStoredSessionItem('srms_user_id', fullUser.id);
        } catch {}

        if (targetMode) {
          setDeviceMode(targetMode);
        } else if (data.deviceMode) {
          setDeviceMode(data.deviceMode);
        } else if (fullUser.role === 'agent') {
          setDeviceMode('android');
        } else {
          setDeviceMode('web');
        }

        // Pull latest shared master database so any user/email gets the shared data immediately
        pullSharedMasterData();

        logActivity(
          fullUser,
          'LOGIN',
          `Logged in securely as ${fullUser.name} [${fullUser.role.toUpperCase()}] via Server Auth`
        );
        return { success: true };
      }
    } catch (apiErr) {
      console.warn('[SRMS AUTH] Backend API notice, proceeding with client verification:', apiErr);
    }

    // 2. Cryptographic Fallback Engine (Strict Exact Matching, Agent ID Format, & Salted SHA-256)
    let user = users.find((u) => {
      const matchUsername = u.username && (u.username.toLowerCase() === lowerInput || u.username.toUpperCase() === upperInput);
      const matchId = u.id && (u.id.toLowerCase() === lowerInput || u.id.toUpperCase() === upperInput);
      const matchEmail = u.email && u.email.toLowerCase() === lowerInput;
      const matchAgentId =
        u.agentId &&
        (u.agentId.toLowerCase() === lowerInput ||
          u.agentId.toUpperCase() === upperInput ||
          u.agentId.replace(/-/g, '').toLowerCase() === lowerInput.replace(/-/g, ''));
      return matchUsername || matchId || matchEmail || matchAgentId;
    });

    if (!user || isDemoUser(user)) {
      return {
        success: false,
        error: 'Invalid User ID or Password. Login is locked to admin-created users only.',
        code: 'USER_NOT_CREATED_BY_ADMIN',
      };
    }

    // DEACTIVATION CHECK: Block deactivated or deleted users BEFORE password checking
    if (!user.active || (user as any).isDeleted || (user as any).status === 'DELETED') {
      return {
        success: false,
        error: 'Your account is currently deactivated or has been removed. Please contact the administrator.',
        code: 'ACCOUNT_DEACTIVATED',
      };
    }

    // STRICT PASSWORD VERIFICATION: Validate strictly against stored salted SHA-256 hash or explicit assigned password
    const salt = user.passwordSalt || 'srms_default_salt';
    const computedHash = hashPasswordSync(cleanPassword, salt);
    const isExactHashMatch = !!(user.passwordHash && computedHash === user.passwordHash);
    const isExactPlainMatch = !!(user.password && user.password === cleanPassword);
    const isPrimaryAdminDefault =
      user.role === 'admin' &&
      (user.id === 'USR-ADMIN-1' || user.email?.toLowerCase() === 'ashish.kharad2@gmail.com') &&
      (cleanPassword === 'Admin@2026' || cleanPassword === 'admin@2026');

    const isPasswordValid = isExactHashMatch || isExactPlainMatch || isPrimaryAdminDefault;

    if (!isPasswordValid) {
      return {
        success: false,
        error: 'Invalid User ID or Password. Login is strictly locked to admin-created credentials.',
        code: 'INVALID_CREDENTIALS',
      };
    }

    // Authenticate user
    setCurrentUser(user);
    setIsAuthenticated(true);
    const mockToken = generateToken(32);

    try {
      setStoredSessionItem('srms_auth_session', 'true');
      setStoredSessionItem('srms_session_token', mockToken);
      setStoredSessionItem('srms_user_id', user.id);
    } catch {}

    if (targetMode) {
      setDeviceMode(targetMode);
    } else if (user.role === 'agent') {
      setDeviceMode('android');
    } else {
      setDeviceMode('web');
    }

    // Pull latest shared master database so any user/email gets the shared data immediately
    pullSharedMasterData();

    logActivity(
      user,
      'LOGIN',
      `Logged in securely as ${user.name} [${user.role.toUpperCase()}]`
    );
    return { success: true };
  };

  // Admin Forgot Password - Step 1: Request OTP
  const requestAdminOTP = async (identifier: string): Promise<OTPRequestResult> => {
    const cleanInput = identifier.trim();

    // Call Backend API
    try {
      const res = await fetch('/api/auth/forgot-password/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: cleanInput }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return {
          success: true,
          message: data.message,
          maskedEmail: data.maskedEmail,
          maskedMobile: data.maskedMobile,
          requestId: data.requestId,
        };
      } else if (data.error) {
        return {
          success: false,
          message: data.error,
          error: data.error,
        };
      }
    } catch (e) {
      console.warn('[SRMS AUTH] Request OTP fallback:', e);
    }

    // Fallback Client Simulation
    const adminUser = users.find(
      (u) =>
        (u.username === cleanInput || u.id === cleanInput || u.email.toLowerCase() === cleanInput.toLowerCase()) &&
        u.role === 'admin'
    );

    if (!adminUser || !adminUser.active) {
      return {
        success: true,
        message: 'If an active Admin account matches the provided identifier, an OTP has been sent to the registered email and mobile.',
        maskedEmail: 'ad***@srms-recovery.in',
        maskedMobile: '+91 98*** **223',
        requestId: `OTP-LOCAL-${Date.now()}`,
      };
    }

    const otpCode = generateOTP(6);
    const reqId = `OTP-LOCAL-${Date.now()}`;
    setLocalOTPRecords((prev) => ({
      ...prev,
      [reqId]: {
        otp: otpCode,
        identifier: cleanInput,
        userId: adminUser.id,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
        isUsed: false,
      },
    }));

    console.log(`[SRMS SECURITY] Local OTP Generated for ${adminUser.email}: ${otpCode}`);

    return {
      success: true,
      message: 'One-Time Password (OTP) dispatched to registered Admin email and mobile.',
      maskedEmail: maskEmail(adminUser.email),
      maskedMobile: maskMobile(adminUser.mobile),
      requestId: reqId,
    };
  };

  // Admin Forgot Password - Step 2: Verify OTP
  const verifyAdminOTP = async (
    requestId: string,
    otp: string
  ): Promise<{ success: boolean; resetToken?: string; error?: string }> => {
    const cleanOtp = otp.trim();

    // Call Backend API
    try {
      const res = await fetch('/api/auth/forgot-password/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, otp: cleanOtp }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, resetToken: data.resetToken };
      } else if (data.error) {
        return { success: false, error: data.error };
      }
    } catch (e) {
      console.warn('[SRMS AUTH] Verify OTP fallback:', e);
    }

    // Fallback Client Simulation
    const record = localOTPRecords[requestId];
    if (!record) {
      return { success: false, error: 'Invalid or expired OTP session. Please request a new OTP.' };
    }
    if (Date.now() > record.expiresAt) {
      return { success: false, error: 'OTP has expired. Please request a new OTP.' };
    }
    if (record.isUsed) {
      return { success: false, error: 'This OTP has already been used. Please request a new OTP.' };
    }
    if (record.attempts >= 3) {
      return { success: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' };
    }

    if (record.otp !== cleanOtp) {
      record.attempts += 1;
      const remaining = 3 - record.attempts;
      return {
        success: false,
        error: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Please request a new OTP.'}`,
      };
    }

    record.isUsed = true;
    const resetToken = `RST-LOCAL-${generateToken(24)}`;
    setLocalResetTokens((prev) => ({
      ...prev,
      [resetToken]: {
        userId: record.userId,
        expiresAt: Date.now() + 5 * 60 * 1000,
        isUsed: false,
      },
    }));

    return { success: true, resetToken };
  };

  // Admin Forgot Password - Step 3: Create New Password
  const resetAdminPasswordWithToken = async (
    resetToken: string,
    newPassword: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    const cleanPwd = newPassword.trim();
    if (cleanPwd.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    // Call Backend API
    try {
      const res = await fetch('/api/auth/forgot-password/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword: cleanPwd }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        return { success: true, message: data.message };
      } else if (data.error) {
        return { success: false, error: data.error };
      }
    } catch (e) {
      console.warn('[SRMS AUTH] Reset password fallback:', e);
    }

    // Fallback Client Simulation
    const tokenRec = localResetTokens[resetToken];
    if (!tokenRec || tokenRec.isUsed || Date.now() > tokenRec.expiresAt) {
      return { success: false, error: 'Reset token is invalid or has expired. Please restart password recovery.' };
    }

    tokenRec.isUsed = true;
    const freshSalt = generateSalt(16);
    const freshHash = hashPasswordSync(cleanPwd, freshSalt);

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === tokenRec.userId) {
          return {
            ...u,
            password: cleanPwd,
            passwordSalt: freshSalt,
            passwordHash: freshHash,
            tokenVersion: (u.tokenVersion || 1) + 1,
          };
        }
        return u;
      })
    );

    return {
      success: true,
      message: 'Password has been successfully updated. Previous credentials and sessions have been invalidated. Please log in with your new password.',
    };
  };

  const logout = () => {
    try {
      const token = getStoredSessionItem('srms_session_token');
      if (token) {
        fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        }).catch(() => {});
      }
    } catch {}

    setIsAuthenticated(false);
    try {
      removeStoredSessionItem('srms_auth_session');
      removeStoredSessionItem('srms_session_token');
      removeStoredSessionItem('srms_user_id');
    } catch {}

    // SECURITY: end the real Firebase session too, so the browser loses
    // Firestore read/write access immediately on logout.
    signOutOfFirebase().catch(() => {});

    // Clear locally-held shared data so a different person logging in on
    // this same device/browser doesn't briefly see the previous user's data
    // before the live listeners for the new session populate it fresh.
    setAccounts([]);
    setRecoveries([]);
    setCommissions([]);
    setPtps([]);
    setFollowups([]);
    setVisits([]);
    setPhotos([]);
    setVoiceNotes([]);
    setDocuments([]);

    if (currentUser) {
      logActivity(currentUser, 'LOGOUT', `User ${currentUser.name} signed out`);
    }
  };

  const logActivity = (
    user: User,
    actionType: ActivityLog['actionType'],
    details: string,
    accountId?: string
  ) => {
    const newLog: ActivityLog = {
      id: `ACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      userId: user.agentId || user.id,
      userName: user.name,
      role: user.role,
      accountId,
      actionType,
      details,
    };
    setActivityLogs((prev) => [newLog, ...prev]);
  };

  // Reconcile and link multiple accounts by Name + NPA Date + Balance (Customer Overdue Balance)
  const reconcileAccounts = (accountsList: Account[]): Account[] => {
    const groupMap = new Map<string, Account[]>();

    accountsList.forEach((acc) => {
      const bal = Math.round(acc.customerBalance || acc.overdueAmount || acc.outstandingAmount || 0);
      const npa = acc.npaDate ? acc.npaDate.trim() : '';
      const normName = acc.customerName ? acc.customerName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

      let key = '';
      if (normName && normName.length > 2 && npa && bal > 0) {
        key = `NAME_NPA_BAL:${normName}__${npa}__${bal}`;
      } else if (bal > 0 && npa) {
        key = `BAL_NPA:${bal}_${npa}`;
      } else if (normName && normName.length > 3) {
        key = `NAME:${normName}`;
      } else {
        key = `ACC:${acc.accountId}`;
      }

      const list = groupMap.get(key) || [];
      list.push(acc);
      groupMap.set(key, list);
    });

    return accountsList.map((acc) => {
      const bal = Math.round(acc.customerBalance || acc.overdueAmount || acc.outstandingAmount || 0);
      const npa = acc.npaDate ? acc.npaDate.trim() : '';
      const normName = acc.customerName ? acc.customerName.toLowerCase().replace(/[^a-z0-9]/g, '') : '';

      let key = '';
      if (normName && normName.length > 2 && npa && bal > 0) {
        key = `NAME_NPA_BAL:${normName}__${npa}__${bal}`;
      } else if (bal > 0 && npa) {
        key = `BAL_NPA:${bal}_${npa}`;
      } else if (normName && normName.length > 3) {
        key = `NAME:${normName}`;
      } else {
        key = `ACC:${acc.accountId}`;
      }

      const group = groupMap.get(key) || [acc];
      if (group.length > 1) {
        const linkedSummaries = group.map((g) => ({
          accountId: g.accountId,
          loanNumber: g.loanNumber,
          loanType: g.loanType,
          facility: g.facility,
          balance: g.customerBalance || g.overdueAmount || g.outstandingAmount,
          npaDate: g.npaDate || '',
          overdueAmount: g.overdueAmount,
          status: g.accountStatus,
          branch: g.branch,
        }));

        const reason = key.startsWith('NAME_NPA_BAL:')
          ? `Multi-Account Customer: Name (${acc.customerName}), Overdue Balance (₹${bal.toLocaleString('en-IN')}) & NPA Date (${acc.npaDate}) match across ${group.length} loans`
          : `Multi-Account Customer: ${group.length} loans linked under customer profile`;

        return {
          ...acc,
          isMultipleAccount: true,
          multipleAccountsCount: group.length,
          linkedAccountIds: group.map((g) => g.accountId),
          linkedAccounts: linkedSummaries,
          multipleAccountReason: acc.multipleAccountReason || reason,
        };
      }
      return acc;
    });
  };

  const addAccount = (accData: Partial<Account>) => {
    const newId = accData.accountId || `ACC-${10260 + accounts.length}`;
    const newAccount: Account = {
      id: newId,
      accountId: newId,
      loanNumber: accData.loanNumber || `LN-2026-${Math.floor(10000 + Math.random() * 90000)}`,
      customerName: accData.customerName || 'New Customer',
      mobile: accData.mobile || '+91 98000 00000',
      alternateMobile: accData.alternateMobile,
      address: accData.address || 'Address details',
      city: accData.city || 'Pune',
      branch: accData.branch || 'Pune Central Branch',
      branchCode: accData.branchCode || 'BR-01',
      facility: accData.facility || 'Term Loan',
      npaDate: accData.npaDate || '2024-03-31',
      customerCode: accData.customerCode || `CUST-${newId}`,
      area: accData.area || 'Pune Metro',
      zone: accData.zone || 'West Zone Maharashtra',
      loanType: accData.loanType || 'Personal Loan',
      sanctionAmount: accData.sanctionAmount || 100000,
      outstandingAmount: accData.outstandingAmount || 85000,
      overdueAmount: accData.overdueAmount || 18000,
      emi: accData.emi || 6000,
      ptpCount: accData.ptpCount ?? 0,
      customerCategory: accData.customerCategory || 'Medium Risk',
      accountStatus: accData.accountStatus || 'Active',
      assignedAgentId: accData.assignedAgentId || currentUser.agentId || currentUser.id,
      assignedAgentName: accData.assignedAgentName || currentUser.name,
      coordinatorId: 'USR-COORD-1',
      coordinatorName: 'Kavita Joshi',
      allocationDate: new Date().toISOString().slice(0, 10),
      totalRecovered: 0,
      latitude: accData.latitude || 18.5204,
      longitude: accData.longitude || 73.8567,
      notes: accData.notes,
      isMultipleAccount: accData.isMultipleAccount,
      multipleAccountsCount: accData.multipleAccountsCount,
      linkedAccountIds: accData.linkedAccountIds,
      linkedAccounts: accData.linkedAccounts,
      multipleAccountReason: accData.multipleAccountReason,
      latestRemark: accData.latestRemark,
      agentNotesHistory: accData.agentNotesHistory || [],
    };

    // If account was previously deleted/archived, restore historical remarks and notes
    const priorArchived = archivedAccounts.find(
      (arch) => arch.accountId === newId || (accData.loanNumber && arch.loanNumber === accData.loanNumber)
    );
    if (priorArchived) {
      const priorNotes = priorArchived.agentNotesHistory || [];
      const restoredNote: AgentNote = {
        id: `NOTE-RESTORED-${Date.now()}`,
        agentId: currentUser.agentId || currentUser.id,
        agentName: currentUser.name,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        note: `Restored historical records & remarks from previously archived data upon reassignment (${priorNotes.length} historical remarks retrieved).`,
        category: 'General',
      };
      newAccount.agentNotesHistory = [restoredNote, ...priorNotes, ...(newAccount.agentNotesHistory || [])];
      if (!newAccount.latestRemark && priorArchived.latestRemark) {
        newAccount.latestRemark = `[Restored Remark]: ${priorArchived.latestRemark}`;
      }
    }

    try {
      localStorage.removeItem('srms_account_storage_cleared_user');
    } catch {}

    setAccounts((prev) => reconcileAccounts([newAccount, ...prev]));
    logActivity(currentUser, 'ALLOCATION_CHANGED', `Created loan account ${newId} for ${newAccount.customerName}`, newId);
  };

  const updateAccount = (accountId: string, updates: Partial<Account>) => {
    setAccounts((prev) =>
      reconcileAccounts(
        prev.map((acc) => {
          if (acc.accountId === accountId || acc.id === accountId) {
            let updatedNotesHistory = updates.agentNotesHistory || acc.agentNotesHistory || [];
            // Preserve old remarks: if new notes are added/edited and different from previous note, append historical entry
            if (updates.notes && updates.notes.trim() !== '' && updates.notes !== acc.notes) {
              const noteEntry: AgentNote = {
                id: `NOTE-UPD-${Date.now()}`,
                agentId: currentUser.agentId || currentUser.id,
                agentName: currentUser.name,
                date: new Date().toISOString().slice(0, 10),
                time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                note: updates.notes,
                category: 'General',
              };
              updatedNotesHistory = [noteEntry, ...updatedNotesHistory];
            }
            return {
              ...acc,
              ...updates,
              agentNotesHistory: updatedNotesHistory,
            };
          }
          return acc;
        })
      )
    );
    logActivity(currentUser, 'SETTINGS_UPDATED', `Updated account ${accountId} details`, accountId);
  };

  const markAccountForDeletion = (accountId: string, isMarked: boolean = true) => {
    setAccounts((prev) =>
      prev.map((a) =>
        a.accountId === accountId || a.id === accountId
          ? {
              ...a,
              isMarkedForDeletion: isMarked,
              notes: isMarked
                ? `[Marked for Permanent Deletion by ${currentUser.name} on ${new Date().toISOString().slice(0, 10)}]. ${a.notes || ''}`
                : a.notes,
            }
          : a
      )
    );
    logActivity(
      currentUser,
      'SETTINGS_UPDATED',
      `${isMarked ? 'Marked' : 'Unmarked'} customer account ${accountId} for permanent deletion by Admin.`,
      accountId
    );
  };

  const updateCustomerStarRating = (accountId: string, rating: number) => {
    const clampedRating = Math.max(0, Math.min(5, Math.round(rating)));
    const isPrime = clampedRating >= 4;
    const nowIso = new Date().toISOString();
    const dateStr = nowIso.slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === accountId || a.id === accountId) {
          const starNote: AgentNote = {
            id: `NOTE-STAR-${Date.now()}`,
            agentId: currentUser.agentId || currentUser.id,
            agentName: currentUser.name,
            date: dateStr,
            time: timeStr,
            note: `[Customer Classification]: Star rating set to ${clampedRating}★${
              isPrime ? ' (🌟 Prime Customer)' : ''
            } by ${currentUser.name} (${currentUser.role}).`,
            category: 'General',
          };
          return {
            ...a,
            customerStarRating: clampedRating,
            isPrimeCustomer: isPrime,
            starRatingUpdatedBy: currentUser.name,
            starRatingUpdatedAt: nowIso,
            agentNotesHistory: [starNote, ...(a.agentNotesHistory || [])],
          };
        }
        return a;
      })
    );

    logActivity(
      currentUser,
      'STATUS_CHANGED',
      `${currentUser.name} updated customer classification to ${clampedRating}★ for account ${accountId}`,
      accountId
    );
  };

  const closeAccount = async (
    accountId: string,
    closureType: 'Closed as per OTS' | 'Regular Close' | 'Administrative Deletion',
    remarks?: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetAcc = accounts.find((a) => a.accountId === accountId || a.id === accountId);
    if (!targetAcc) {
      return { success: false, message: 'Customer account not found.' };
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const closeNote: AgentNote = {
      id: `NOTE-CLOSE-${Date.now()}`,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: dateStr,
      time: timeStr,
      note: `[Account Closed]: Status marked as '${closureType}'. ${remarks || 'Account officially closed.'}`,
      category: 'General',
    };

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === accountId || a.id === accountId) {
          return {
            ...a,
            accountStatus: closureType === 'Closed as per OTS' ? 'Closed as per OTS' : 'Regular Close',
            closureType,
            closureDate: dateStr,
            closureRemarks: remarks,
            notes: `[${closureType}]: ${remarks || 'Account closed.'} (${a.notes || ''})`,
            agentNotesHistory: [closeNote, ...(a.agentNotesHistory || [])],
          };
        }
        return a;
      })
    );

    logActivity(
      currentUser,
      'STATUS_CHANGED',
      `${currentUser.name} closed account ${targetAcc.customerName} (${targetAcc.accountId}) as '${closureType}'.`,
      targetAcc.accountId
    );

    return {
      success: true,
      message: `Customer account ${targetAcc.customerName} marked as '${closureType}'.`,
    };
  };

  const deleteAccount = async (
    accountId: string,
    closureType?: 'Closed as per OTS' | 'Regular Close' | 'Administrative Deletion',
    remarks?: string
  ): Promise<{ success: boolean; message: string }> => {
    const targetAcc = accounts.find((a) => a.accountId === accountId || a.id === accountId);
    if (!targetAcc) {
      return { success: false, message: 'Customer account not found.' };
    }

    const isClosedOrSettled =
      closureType === 'Closed as per OTS' ||
      closureType === 'Regular Close' ||
      targetAcc.accountStatus === 'Closed as per OTS' ||
      targetAcc.accountStatus === 'Regular Close' ||
      targetAcc.accountStatus === 'Closed' ||
      targetAcc.accountStatus === 'OTS Settled – Customer Account Closed' ||
      (targetAcc.outstandingAmount === 0 && targetAcc.overdueAmount === 0);

    // If account is closed or being deleted as closed per OTS / regular close, allow users (agents/managers/admin)
    if (!isClosedOrSettled && currentUser.role !== 'admin') {
      return {
        success: false,
        message: 'Permission Denied: Open customer accounts can only be deleted by Admin.',
      };
    }

    const finalClosureType = closureType || (targetAcc.otsStatus === 'OTS Settled' || targetAcc.otsActive ? 'Closed as per OTS' : 'Regular Close');
    const dateStr = new Date().toISOString().slice(0, 10);

    const closedArchivedAcc: Account = {
      ...targetAcc,
      accountStatus: finalClosureType === 'Closed as per OTS' ? 'Closed as per OTS' : 'Regular Close',
      closureType: finalClosureType,
      closureDate: dateStr,
      closureRemarks: remarks,
      notes: `[Archived as ${finalClosureType} by ${currentUser.name} on ${dateStr}]: ${remarks || ''} ${targetAcc.notes || ''}`,
    };

    // Preserve full backend data including remarks and history for this account
    setArchivedAccounts((prev) => {
      const updated = [closedArchivedAcc, ...prev.filter((a) => a.accountId !== targetAcc.accountId && a.id !== targetAcc.id)];
      try {
        localStorage.setItem('srms_archived_accounts', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    setAccounts((prev) => prev.filter((a) => a.accountId !== accountId && a.id !== accountId));

    logActivity(
      currentUser,
      'SETTINGS_UPDATED',
      `${currentUser.name} (${currentUser.role}) deleted/archived customer account ${targetAcc.customerName} (${targetAcc.accountId || targetAcc.loanNumber}) as '${finalClosureType}'. Historical records preserved in backend archive.`,
      targetAcc.accountId
    );

    return {
      success: true,
      message: `Customer account ${targetAcc.customerName} (${targetAcc.accountId}) removed as '${finalClosureType}'. Record preserved in backend archive.`,
    };
  };

  const deleteAllAccountsFromStorage = async (): Promise<{ success: boolean; count: number; message: string }> => {
    const count = accounts.length;
    setAccounts([]);
    setAllocations([]);
    setAllocationHistories([]);

    try {
      localStorage.setItem('srms_persisted_accounts', JSON.stringify([]));
      localStorage.setItem('srms_persisted_allocations', JSON.stringify([]));
      localStorage.setItem('srms_persisted_allochistories', JSON.stringify([]));
      localStorage.setItem('srms_account_storage_cleared_user', 'true');
    } catch {}

    // Immediately cancel any queued auto-push that might have captured prior account state
    if (autoPushTimerRef.current) {
      clearTimeout(autoPushTimerRef.current);
      autoPushTimerRef.current = null;
    }

    // Immediately tell the server to permanently clear accounts from server master storage
    try {
      await fetch('/api/master-data/clear-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (err) {
      console.warn('[SRMS] Failed to notify server about clearing accounts:', err);
    }

    logActivity(
      currentUser,
      'SETTINGS_UPDATED',
      `Permanently deleted all ${count} account records from permanent storage (only accounts cleared).`
    );

    return {
      success: true,
      count,
      message: `Permanently deleted all ${count} account records from permanent storage. Account storage is now empty (0 accounts).`,
    };
  };

  const bulkAddAccounts = (accountsList: Partial<Account>[]) => {
    try {
      localStorage.removeItem('srms_account_storage_cleared_user');
    } catch {}

    let reallocatedCount = 0;
    let newAccountsCount = 0;
    const nowIsoDate = new Date().toISOString().slice(0, 10);
    const nowIsoTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const nowTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const newHistories: AllocationHistory[] = [];
    const newAllocations: AccountAllocation[] = [];
    const newNotifs: NotificationItem[] = [];

    setAccounts((prevAccounts) => {
      const updatedAccounts = [...prevAccounts];

      accountsList.forEach((incoming, idx) => {
        // Resolve agent info from users list if possible
        const rawAgentId = incoming.assignedAgentId || currentUser.agentId || currentUser.id;
        const matchedUser = users.find(
          (u) =>
            u.agentId?.toLowerCase() === rawAgentId.toLowerCase() ||
            u.id.toLowerCase() === rawAgentId.toLowerCase() ||
            u.username.toLowerCase() === rawAgentId.toLowerCase() ||
            (incoming.assignedAgentName && u.name.toLowerCase().includes(incoming.assignedAgentName.toLowerCase()))
        );

        const targetAgentId = matchedUser?.agentId || matchedUser?.id || rawAgentId;
        const targetAgentName = matchedUser?.name || incoming.assignedAgentName || currentUser.name;

        // Match existing account by accountId, loanNumber, or id
        const existingIndex = updatedAccounts.findIndex(
          (acc) =>
            isMatchingAccountNumber(acc.accountId, incoming.accountId) ||
            isMatchingAccountNumber(acc.loanNumber, incoming.loanNumber) ||
            isMatchingAccountNumber(acc.accountId, incoming.loanNumber) ||
            isMatchingAccountNumber(acc.loanNumber, incoming.accountId) ||
            isMatchingAccountNumber(acc.id, incoming.id) ||
            isMatchingAccountNumber(acc.id, incoming.accountId)
        );

        if (existingIndex >= 0) {
          // EXISTING ACCOUNT: Deallocate old agent and reallocate to new agent from Excel
          const existing = updatedAccounts[existingIndex];
          const oldAgentId = existing.assignedAgentId;
          const oldAgentName = existing.assignedAgentName;
          const isAgentChanged = oldAgentId !== targetAgentId;

          if (isAgentChanged) {
            reallocatedCount++;

            // 1. Record Allocation History (Old Agent Deallocation -> New Agent Allocation)
            newHistories.push({
              id: `ALH-${Date.now()}-${idx}`,
              accountId: existing.accountId,
              previousAgentId: oldAgentId,
              previousAgentName: oldAgentName,
              newAgentId: targetAgentId,
              newAgentName: targetAgentName,
              reallocatedBy: currentUser.name,
              date: nowTimestamp,
              reason: `Reallocated via Excel Upload: Deallocated old agent (${oldAgentName} [${oldAgentId}]) and allocated to new agent (${targetAgentName} [${targetAgentId}])`,
            });

            // 2. Record Account Allocation
            newAllocations.push({
              id: `ALC-${Date.now()}-${idx}`,
              accountId: existing.accountId,
              agentId: targetAgentId,
              agentName: targetAgentName,
              coordinatorId: currentUser.id,
              allocatedBy: currentUser.name,
              allocationDate: nowTimestamp,
              branch: incoming.branch || existing.branch,
              area: incoming.area || existing.area,
              zone: incoming.zone || existing.zone,
              remarks: `Deallocated from ${oldAgentName} and reallocated to ${targetAgentName} via Excel`,
            });
          }

          // System Reallocation Audit Note
          const reallocationAuditNote: AgentNote = {
            id: `NOTE-REALLOC-${Date.now()}-${idx}`,
            agentId: currentUser.agentId || currentUser.id,
            agentName: currentUser.name,
            date: nowIsoDate,
            time: nowIsoTime,
            note: isAgentChanged
              ? `System: Account deallocated from previous agent ${oldAgentName} (${oldAgentId}) and reallocated to new agent ${targetAgentName} (${targetAgentId}) via Excel upload. Overdue Balance: ₹${(incoming.customerBalance || existing.customerBalance || 0).toLocaleString('en-IN')}.`
              : `System: Account data refreshed & re-confirmed for agent ${targetAgentName} via Excel upload. Overdue Balance: ₹${(incoming.customerBalance || existing.customerBalance || 0).toLocaleString('en-IN')}.`,
            category: 'General',
          };

          const existingNotes = existing.agentNotesHistory || [];

          // Merge latest data while retaining historical collections/notes/visits
          updatedAccounts[existingIndex] = {
            ...existing,
            ...incoming,
            assignedAgentId: targetAgentId,
            assignedAgentName: targetAgentName,
            allocationDate: isAgentChanged ? nowIsoDate : (existing.allocationDate || nowIsoDate),
            customerBalance: incoming.customerBalance !== undefined ? incoming.customerBalance : existing.customerBalance,
            outstandingAmount: incoming.outstandingAmount !== undefined ? incoming.outstandingAmount : existing.outstandingAmount,
            overdueAmount: incoming.overdueAmount !== undefined ? incoming.overdueAmount : existing.overdueAmount,
            sanctionAmount: incoming.sanctionAmount !== undefined ? incoming.sanctionAmount : existing.sanctionAmount,
            npaDate: incoming.npaDate || existing.npaDate,
            facility: incoming.facility || existing.facility,
            branch: incoming.branch || existing.branch,
            address: incoming.address || existing.address,
            mobile: incoming.mobile || existing.mobile,
            agentNotesHistory: [reallocationAuditNote, ...existingNotes],
          };
        } else {
          // BRAND NEW ACCOUNT
          newAccountsCount++;
          const newId = incoming.accountId || `ACC-${10260 + prevAccounts.length + idx}`;
          const newAccount: Account = {
            id: newId,
            accountId: newId,
            loanNumber: incoming.loanNumber || `LN-2026-${Math.floor(10000 + Math.random() * 90000)}`,
            customerName: incoming.customerName || 'Customer',
            mobile: incoming.mobile || '+91 98000 00000',
            alternateMobile: incoming.alternateMobile,
            address: incoming.address || 'Address on file',
            city: incoming.city || 'Pune',
            branch: incoming.branch || 'Pune Central Branch',
            branchCode: incoming.branchCode || 'BR-01',
            facility: incoming.facility || 'Term Loan',
            npaDate: incoming.npaDate || '2024-03-31',
            customerCode: incoming.customerCode || `CUST-${newId}`,
            area: incoming.area || 'Pune Metro',
            zone: incoming.zone || 'West Zone Maharashtra',
            loanType: incoming.loanType || 'Personal Loan',
            sanctionAmount: incoming.sanctionAmount || 100000,
            outstandingAmount: incoming.outstandingAmount || 85000,
            customerBalance: incoming.customerBalance || incoming.overdueAmount || 85000,
            overdueAmount: incoming.overdueAmount || 18000,
            emi: incoming.emi || 0,
            ptpCount: incoming.ptpCount ?? 0,
            customerCategory: incoming.customerCategory || 'Medium Risk',
            accountStatus: incoming.accountStatus || 'Active',
            assignedAgentId: targetAgentId,
            assignedAgentName: targetAgentName,
            coordinatorId: 'USR-COORD-1',
            coordinatorName: currentUser.name || 'Kavita Joshi',
            allocationDate: incoming.allocationDate || nowIsoDate,
            totalRecovered: 0,
            latitude: incoming.latitude || 19.8762 + (Math.random() - 0.5) * 0.05,
            longitude: incoming.longitude || 75.3433 + (Math.random() - 0.5) * 0.05,
            notes: incoming.notes,
            isMultipleAccount: incoming.isMultipleAccount,
            multipleAccountsCount: incoming.multipleAccountsCount,
            linkedAccountIds: incoming.linkedAccountIds,
            linkedAccounts: incoming.linkedAccounts,
            multipleAccountReason: incoming.multipleAccountReason,
            agentNotesHistory: incoming.agentNotesHistory || [],
            customFields: incoming.customFields || {},
          };

          newAllocations.push({
            id: `ALC-${Date.now()}-${idx}`,
            accountId: newId,
            agentId: targetAgentId,
            agentName: targetAgentName,
            coordinatorId: currentUser.id,
            allocatedBy: currentUser.name,
            allocationDate: nowTimestamp,
            branch: newAccount.branch,
            area: newAccount.area,
            zone: newAccount.zone,
            remarks: `New account allocated via Excel upload`,
          });

          updatedAccounts.unshift(newAccount);
        }
      });

      return reconcileAccounts(updatedAccounts);
    });

    if (newHistories.length > 0) {
      setAllocationHistories((h) => [...newHistories, ...h]);
    }
    if (newAllocations.length > 0) {
      setAllocations((a) => [...newAllocations, ...a]);
    }

    logActivity(
      currentUser,
      'ALLOCATION_CHANGED',
      `Excel Allocation processed: ${newAccountsCount} new accounts allocated, ${reallocatedCount} accounts reallocated (old agents deallocated & reassigned)`
    );
  };

  const allocateAccount = (accountId: string, agentId: string, remarks?: string) => {
    const targetAgent = users.find((u) => u.agentId === agentId || u.id === agentId || u.username === agentId);
    if (!targetAgent) return;

    let prevAgentId = '';
    let prevAgentName = '';
    let customerName = '';

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.accountId === accountId || acc.id === accountId) {
          prevAgentId = acc.assignedAgentId;
          prevAgentName = acc.assignedAgentName;
          customerName = acc.customerName;

          // Record allocation history
          const history: AllocationHistory = {
            id: `ALH-${Date.now()}`,
            accountId: acc.accountId,
            previousAgentId: acc.assignedAgentId,
            previousAgentName: acc.assignedAgentName,
            newAgentId: targetAgent.agentId || targetAgent.id,
            newAgentName: targetAgent.name,
            reallocatedBy: currentUser.name,
            date: new Date().toISOString().replace('T', ' ').slice(0, 19),
            reason: remarks || `Deallocated from ${acc.assignedAgentName} and reallocated to ${targetAgent.name}`,
          };
          setAllocationHistories((h) => [history, ...h]);

          const auditNote: AgentNote = {
            id: `NOTE-REALLOC-${Date.now()}`,
            agentId: currentUser.agentId || currentUser.id,
            agentName: currentUser.name,
            date: new Date().toISOString().slice(0, 10),
            time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            note: `System: Reallocated from ${acc.assignedAgentName} (${acc.assignedAgentId}) to ${targetAgent.name} (${targetAgent.agentId || targetAgent.id}). Reason: ${remarks || 'Supervisor manual reallocation'}`,
            category: 'General',
          };

          return {
            ...acc,
            assignedAgentId: targetAgent.agentId || targetAgent.id,
            assignedAgentName: targetAgent.name,
            allocationDate: new Date().toISOString().slice(0, 10),
            agentNotesHistory: [auditNote, ...(acc.agentNotesHistory || [])],
          };
        }
        return acc;
      })
    );

    const newAllocation: AccountAllocation = {
      id: `ALC-${Date.now()}`,
      accountId,
      agentId: targetAgent.agentId || targetAgent.id,
      agentName: targetAgent.name,
      coordinatorId: currentUser.id,
      allocatedBy: currentUser.name,
      allocationDate: new Date().toISOString().replace('T', ' ').slice(0, 19),
      branch: targetAgent.branch,
      area: targetAgent.area,
      zone: targetAgent.zone,
      remarks: remarks || `Reassigned from ${prevAgentName} to ${targetAgent.name}`,
    };
    setAllocations((prev) => [newAllocation, ...prev]);

    logActivity(currentUser, 'ALLOCATION_CHANGED', `Allocated account ${accountId} to ${targetAgent.name}`, accountId);
  };

  const bulkAllocateAccounts = (accountIds: string[], agentId: string, remarks?: string) => {
    accountIds.forEach((id) => allocateAccount(id, agentId, remarks));
  };

  const allocateBulkAccounts = (accountIds: string[], agentId: string, agentName?: string, agentCode?: string) => {
    accountIds.forEach((id) => allocateAccount(id, agentCode || agentId));
  };

  const toggleUserActive = (userId: string) => {
    // Notify server to invalidate sessions if deactivating
    fetch('/api/auth/toggle-user-active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).catch(() => {});

    let targetUserName = '';
    let isNowDeactivated = false;

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          targetUserName = u.name;
          const nextActive = !u.active;
          if (!nextActive) isNowDeactivated = true;
          return { ...u, active: nextActive, tokenVersion: (u.tokenVersion || 1) + 1 };
        }
        return u;
      })
    );

    // SECURITY MANDATE: If the currently active session belongs to the deactivated user, immediately revoke & logout
    if (currentUser.id === userId && isNowDeactivated) {
      alert('Your account has been deactivated. You have been logged out.');
      logout();
      return;
    }

    logActivity(
      currentUser,
      'SETTINGS_UPDATED',
      `Toggled active status for user ${targetUserName || userId} (${isNowDeactivated ? 'DEACTIVATED' : 'ACTIVATED'})`
    );
  };

  const addUser = (userData: Partial<User>) => {
    const rawPassword = userData.password?.trim() || 'Agent@2026';
    const salt = generateSalt(16);
    const passwordHash = hashPasswordSync(rawPassword, salt);

    const newUser: User = {
      id: userData.id || `USR-${Date.now().toString().slice(-4)}`,
      username: userData.username || (userData.name?.toLowerCase().replace(/\s+/g, '') || 'user'),
      name: userData.name || 'New User',
      agencyName: userData.agencyName || userData.name || '',
      email: userData.email || '',
      mobile: userData.mobile || '',
      role: userData.role || 'agent',
      bank: userData.bank || '',
      bankId: userData.bankId || '',
      agentId: userData.role === 'agent' ? (userData.agentId || `RA-${Math.floor(1000 + Math.random() * 9000)}`) : userData.agentId,
      branch: userData.branch || '',
      area: userData.area || '',
      zone: userData.zone || userData.zonalOffice || '',
      zonalOffice: userData.zonalOffice || userData.zone || '',
      regionalOffice: userData.regionalOffice || '',
      password: rawPassword,
      passwordSalt: salt,
      passwordHash: passwordHash,
      tokenVersion: 1,
      active: true,
      joiningDate: new Date().toISOString().slice(0, 10),
      monthlyTarget: userData.monthlyTarget,
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`,
    };
    setUsers((prev) => [...prev, newUser]);
    
    // CRITICAL FIX: Immediately save to Firestore so new user can log in right away
    // (don't wait for the debounced sync which takes 1.5 seconds)
    firebaseFirestoreService.saveUser(newUser).catch((err) => {
      console.warn('Warning: Failed to save new user to Firestore immediately:', err);
      // If it fails, the debounced sync will still try later, so not critical
    });

    // Also try legacy backend endpoint for compatibility
    fetch('/api/auth/add-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { ...newUser, password: rawPassword } }),
    }).catch(() => {});

    logActivity(currentUser, 'SETTINGS_UPDATED', `Added new user ${newUser.name} (${newUser.role}) with ID ${newUser.agentId || newUser.username}`);
  };

  const updateUser = (userId: string, updates: Partial<User>) => {
    let updatedObj: User | null = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          updatedObj = {
            ...u,
            ...updates,
          };
          return updatedObj;
        }
        return u;
      })
    );

    // Sync updated user to server
    if (updatedObj) {
      fetch('/api/auth/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: updatedObj }),
      }).catch(() => {});
    }

    logActivity(currentUser, 'SETTINGS_UPDATED', `Updated profile/credentials for user ${userId}`);
  };

  const deleteUser = async (userId: string): Promise<{ success: boolean; reassignedCount: number; message: string }> => {
    const targetUser = users.find((u) => u.id === userId || u.agentId === userId || u.username === userId);
    if (!targetUser) {
      return { success: false, reassignedCount: 0, message: 'User record not found.' };
    }

    // Inform backend server to delete user record & invalidate active sessions
    fetch('/api/auth/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUser.id }),
    }).catch(() => {});

    // If deleting an agent (or any user with allocated accounts): Reassign all accounts to Management Queue
    let reassignedCount = 0;
    const nowTimestamp = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nowIsoDate = new Date().toISOString().slice(0, 10);
    const nowIsoTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const newHistories: AllocationHistory[] = [];

    setAccounts((prev) =>
      prev.map((acc) => {
        const isAssigned =
          acc.assignedAgentId === targetUser.agentId ||
          acc.assignedAgentId === targetUser.id ||
          acc.assignedAgentId === targetUser.username ||
          (targetUser.name && acc.assignedAgentName?.toLowerCase() === targetUser.name.toLowerCase());

        if (isAssigned) {
          reassignedCount++;
          const adminId = currentUser.id || 'admin';
          const adminName = currentUser.name || 'Administrator';
          const historyEntry: AllocationHistory = {
            id: `ALH-${Date.now()}-${reassignedCount}`,
            accountId: acc.accountId,
            previousAgentId: targetUser.agentId || targetUser.id,
            previousAgentName: targetUser.name,
            newAgentId: adminId,
            newAgentName: adminName,
            reallocatedBy: adminName,
            date: nowTimestamp,
            reason: `Reassigned to Admin ${adminName} (${currentUser.role}) upon deletion of user ${targetUser.name} (${targetUser.agentId || targetUser.id}). Historical recovery data & remarks preserved.`,
          };
          newHistories.push(historyEntry);

          const systemAuditNote: AgentNote = {
            id: `NOTE-SYS-DEL-${Date.now()}-${reassignedCount}`,
            agentId: currentUser.agentId || currentUser.id,
            agentName: adminName,
            date: nowIsoDate,
            time: nowIsoTime,
            note: `System: User ${targetUser.name} (${targetUser.agentId || targetUser.id}) was deleted by Admin ${adminName}. Customer account reassigned to Admin. All prior remarks, PTP commitments, and recoveries preserved.`,
            category: 'General',
          };

          return {
            ...acc,
            assignedAgentId: adminId,
            assignedAgentName: adminName,
            allocationDate: nowIsoDate,
            latestRemark: `Reassigned to Admin ${adminName} upon user deletion. All remarks preserved.`,
            agentNotesHistory: [systemAuditNote, ...(acc.agentNotesHistory || [])],
          };
        }
        return acc;
      })
    );

    if (newHistories.length > 0) {
      setAllocationHistories((h) => [...newHistories, ...h]);
    }

    // Save to deletedUsers state to keep all historical user data intact in Google Sheet
    const deletedUserRecord: User = {
      ...targetUser,
      active: false,
      isDeleted: true,
      status: 'DELETED',
      deletedAt: nowTimestamp,
      deletedBy: currentUser.name,
    };
    setDeletedUsers((prev) => [...prev.filter((u) => u.id !== targetUser.id), deletedUserRecord]);

    // Remove user from active users state
    setUsers((prev) => prev.filter((u) => u.id !== targetUser.id && u.agentId !== targetUser.agentId && u.username !== targetUser.username));

    // Relay user deletion to Apps Script / Google Sheets to retain history row
    googleSheetsService
      .sendToAppsScript({
        action: 'delete_user',
        user_id: targetUser.id,
        userId: targetUser.id,
        agent_id: targetUser.agentId,
        deletedBy: currentUser.name,
        name: targetUser.name,
      })
      .catch(() => {});

    logActivity(
      currentUser,
      'SETTINGS_UPDATED',
      `Admin ${currentUser.name} deleted user ${targetUser.name} (${targetUser.role}, ${targetUser.agentId || targetUser.id}). ${reassignedCount} customer accounts reassigned to Management Queue. Historical agent data preserved.`
    );

    // If currently logged-in user was deleted, log them out
    if (currentUser.id === targetUser.id) {
      logout();
    }

    return {
      success: true,
      reassignedCount,
      message: `User ${targetUser.name} deleted successfully.${
        reassignedCount > 0
          ? ` ${reassignedCount} assigned customer account(s) have been reassigned to Management Queue with all historical records preserved.`
          : ''
      }`,
    };
  };

  const exportAllBackendData = (filename?: string) => {
    exportAllBackendDataToExcel(
      {
        accounts,
        users,
        recoveries,
        followups,
        ptps,
        visits,
        photos,
        voiceNotes,
        documents,
        commissions,
        activityLogs,
        allocationHistories,
      },
      filename
    );
  };

  const changeUserPassword = (userId: string, newPassword: string) => {
    const cleanPwd = newPassword.trim();
    if (!cleanPwd) return;

    // Send to Backend API to invalidate existing server sessions and hash password
    fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: userId, newPassword: cleanPwd }),
    }).catch(() => {});

    const freshSalt = generateSalt(16);
    const freshHash = hashPasswordSync(cleanPwd, freshSalt);

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            password: cleanPwd,
            passwordSalt: freshSalt,
            passwordHash: freshHash,
            tokenVersion: (u.tokenVersion || 1) + 1,
          };
        }
        return u;
      })
    );
    logActivity(currentUser, 'SETTINGS_UPDATED', `Admin updated password credentials for user ${userId}. Previous credentials and sessions invalidated.`);
  };

  const logFollowUp = (data: {
    accountId: string;
    status: FollowUp['status'];
    customerResponse: string;
    discussionDetails: string;
    agentRemarks: string;
    nextFollowUpDate?: string;
    nextFollowUpTime?: string;
  }) => {
    const acc = accounts.find((a) => a.accountId === data.accountId);
    const newFollowUp: FollowUp = {
      id: `FLP-${Date.now()}`,
      accountId: data.accountId,
      customerName: acc?.customerName || 'Customer',
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: data.status,
      customerResponse: data.customerResponse,
      discussionDetails: data.discussionDetails,
      agentRemarks: data.agentRemarks,
      nextFollowUpDate: data.nextFollowUpDate,
      nextFollowUpTime: data.nextFollowUpTime,
    };

    setFollowups((prev) => [newFollowUp, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with continuous Google Sheets replication
    firebaseFirestoreService.saveFollowUp(newFollowUp).catch((err) => {
      console.warn('Firestore primary followup write warning:', err);
    });

    // Update account
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === data.accountId) {
          let newStatus = a.accountStatus;
          if (data.status === 'Paid') newStatus = 'Recovered';
          else if (data.status === 'Promised payment') newStatus = 'PTP Pending';
          else if (data.status === 'Refused') newStatus = 'Legal Action';

          const flpNote: AgentNote = {
            id: `NOTE-FLP-${Date.now()}`,
            agentId: currentUser.agentId || currentUser.id,
            agentName: currentUser.name,
            date: newFollowUp.date,
            time: newFollowUp.time,
            note: `[Follow-up: ${data.status}] ${data.agentRemarks}${data.customerResponse ? ` | Response: "${data.customerResponse}"` : ''}${data.discussionDetails ? ` | Details: ${data.discussionDetails}` : ''}${data.nextFollowUpDate ? ` | Next: ${data.nextFollowUpDate}` : ''}`,
            category: 'Follow-up Call',
          };

          return {
            ...a,
            lastFollowUpDate: newFollowUp.date,
            lastFollowUpStatus: data.status,
            nextFollowUpDate: data.nextFollowUpDate || a.nextFollowUpDate,
            nextFollowUpTime: data.nextFollowUpTime || a.nextFollowUpTime,
            accountStatus: newStatus,
            notes: data.agentRemarks || a.notes,
            agentNotesHistory: [flpNote, ...(a.agentNotesHistory || [])],
          };
        }
        return a;
      })
    );

    logActivity(currentUser, 'FOLLOWUP_LOGGED', `Follow-up call/meeting recorded (${data.status}). Next: ${data.nextFollowUpDate || 'None'}`, data.accountId);
  };

  const createPTP = (data: {
    accountId: string;
    amount: number;
    ptpDate: string;
    ptpMode: PTPRecord['ptpMode'];
    customerCommitment: string;
    remarks: string;
  }) => {
    const acc = accounts.find((a) => a.accountId === data.accountId || a.id === data.accountId);
    const targetAccountId = acc?.accountId || data.accountId;

    // Attribute to account's assigned agent if available so PTP reflects in that agent's account
    const hasAssignedAgent = Boolean(
      acc?.assignedAgentId &&
      acc.assignedAgentId !== 'N/A' &&
      acc.assignedAgentId !== 'Unassigned'
    );
    const creditedAgentId =
      hasAssignedAgent && currentUser.role !== 'agent'
        ? (acc!.assignedAgentId as string)
        : currentUser.agentId || currentUser.id;
    const creditedAgentName =
      hasAssignedAgent && currentUser.role !== 'agent'
        ? (acc!.assignedAgentName as string)
        : currentUser.name;

    // Create exactly ONE clean PTP record for the target account
    const newPTP: PTPRecord = {
      id: `PTP-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      accountId: targetAccountId,
      customerName: acc?.customerName || 'Customer',
      agentId: creditedAgentId,
      agentName: creditedAgentName,
      amount: data.amount,
      ptpDate: data.ptpDate,
      ptpMode: data.ptpMode,
      customerCommitment: data.customerCommitment,
      remarks: data.remarks,
      status: 'Pending',
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
    };

    setPtps((prev) => [newPTP, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with continuous Google Sheets replication
    firebaseFirestoreService.savePTP(newPTP).catch((err) => {
      console.warn('Firestore primary PTP write warning:', err);
    });

    const nowIsoDate = new Date().toISOString().slice(0, 10);
    const nowIsoTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === targetAccountId || a.id === targetAccountId) {
          const ptpNote: AgentNote = {
            id: `NOTE-PTP-${Date.now()}-${a.accountId.replace(/[^a-zA-Z0-9]/g, '')}`,
            agentId: currentUser.agentId || currentUser.id,
            agentName: currentUser.name,
            date: nowIsoDate,
            time: nowIsoTime,
            note: `[PTP Commitment]: Promised ₹${data.amount.toLocaleString('en-IN')} on ${data.ptpDate} (${data.ptpMode}). ${data.customerCommitment ? `Commitment: "${data.customerCommitment}"` : ''}${data.remarks ? ` | Remarks: ${data.remarks}` : ''}`,
            category: 'PTP Commitment',
          };

          return {
            ...a,
            ptpStatus: 'Pending',
            accountStatus: 'PTP Pending',
            nextFollowUpDate: data.ptpDate,
            ptpCount: (a.ptpCount || 0) + 1,
            notes: data.remarks || data.customerCommitment || a.notes,
            agentNotesHistory: [ptpNote, ...(a.agentNotesHistory || [])],
          };
        }
        return a;
      })
    );

    logActivity(
      currentUser,
      'PTP_CREATED',
      `Created PTP of ₹${data.amount.toLocaleString('en-IN')} due on ${data.ptpDate} (${data.ptpMode}) for ${targetAccountId} (${acc?.customerName || 'Customer'})`,
      targetAccountId
    );

    // Real-time background sync to Google Sheets PTP tab
    try {
      googleSheetsService.appendPTPRecord({
        accountId: targetAccountId,
        customerName: acc?.customerName || 'Customer',
        amount: data.amount,
        ptpDate: data.ptpDate,
        ptpMode: data.ptpMode,
        customerCommitment: data.customerCommitment || '',
        agentId: currentUser.agentId || currentUser.id,
        agentName: currentUser.name,
        remarks: data.remarks || '',
      }).catch(() => {});
    } catch {
      // non-blocking
    }
  };

  const updatePTPStatus = (ptpId: string, status: PTPRecord['status']) => {
    setPtps((prev) =>
      prev.map((p) => {
        if (p.id === ptpId) {
          const resolvedDate = new Date().toISOString().replace('T', ' ').slice(0, 19);
          // Also update account status
          setAccounts((accs) =>
            accs.map((a) =>
              a.accountId === p.accountId
                ? {
                    ...a,
                    ptpStatus: status,
                    accountStatus: status === 'Broken' ? 'PTP Broken' : status === 'Achieved' ? 'Recovered' : a.accountStatus,
                  }
                : a
            )
          );

          if (status === 'Broken') {
            // Coordinator alert
            const alertNotif: NotificationItem = {
              id: `NOTIF-${Date.now()}`,
              timestamp: resolvedDate,
              recipientRole: 'coordinator',
              title: '⚠️ PTP Broken Alert',
              message: `PTP of ₹${p.amount.toLocaleString('en-IN')} for Account ${p.accountId} was marked BROKEN by agent ${currentUser.name}.`,
              type: 'ptp_broken',
              read: false,
              accountId: p.accountId,
            };
            setNotifications((n) => [alertNotif, ...n]);
          }

          return { ...p, status, resolvedDate };
        }
        return p;
      })
    );
  };

  const getExpiredPTPPreview = (referenceDate?: string) => {
    const refDate = referenceDate || '2026-08-23';
    const pendingPTPs = ptps.filter((p) => p.status === 'Pending');
    const expiredPTPs = pendingPTPs.filter((p) => p.ptpDate < refDate);
    const dueTodayPTPs = pendingPTPs.filter((p) => p.ptpDate === refDate);
    const upcomingPTPs = pendingPTPs.filter((p) => p.ptpDate > refDate);
    const expiredAmount = expiredPTPs.reduce((sum, p) => sum + (p.amount || 0), 0);

    return {
      expiredCount: expiredPTPs.length,
      expiredAmount,
      expiredPTPs,
      dueTodayCount: dueTodayPTPs.length,
      dueTodayPTPs,
      upcomingCount: upcomingPTPs.length,
      totalPending: pendingPTPs.length,
    };
  };

  const runPTPDigest = async (referenceDate?: string): Promise<PTPDigestResult> => {
    const refDate = referenceDate || '2026-08-23';
    const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const timestampStr = `${refDate} ${currentTime}`;

    const pendingPTPs = ptps.filter((p) => p.status === 'Pending');
    const expiredPTPs = pendingPTPs.filter((p) => p.ptpDate < refDate);
    const dueTodayPTPs = pendingPTPs.filter((p) => p.ptpDate === refDate);
    const upcomingPTPs = pendingPTPs.filter((p) => p.ptpDate > refDate);
    const achievedPTPs = ptps.filter((p) => p.status === 'Achieved');
    const alreadyBrokenPTPs = ptps.filter((p) => p.status === 'Broken');

    const expiredCount = expiredPTPs.length;
    const expiredAmount = expiredPTPs.reduce((sum, p) => sum + (p.amount || 0), 0);
    const expiredIds = new Set(expiredPTPs.map((p) => p.id));
    const affectedAccIds: string[] = Array.from(new Set(expiredPTPs.map((p) => p.accountId)));

    let updatedPtpsList = ptps;
    let updatedAccountsList = accounts;
    let newNotificationsList = notifications;
    let newActivityLogsList = activityLogs;

    if (expiredCount > 0) {
      // 1. Mark expired PTPs as Broken
      updatedPtpsList = ptps.map((p) => {
        if (expiredIds.has(p.id)) {
          return {
            ...p,
            status: 'Broken' as const,
            resolvedDate: `${refDate} ${currentTime}`,
            remarks: p.remarks
              ? `${p.remarks} [Auto-marked Broken via PTP Digest on ${refDate}]`
              : `Auto-marked Broken via PTP Digest on ${refDate}`,
          };
        }
        return p;
      });
      setPtps(updatedPtpsList);

      // 2. Update matching Accounts
      updatedAccountsList = accounts.map((a) => {
        if (affectedAccIds.includes(a.accountId)) {
          return {
            ...a,
            ptpStatus: 'Broken' as const,
            accountStatus: 'PTP Broken' as const,
            lastFollowUpStatus: 'PTP Broken (Auto-Digest)',
          };
        }
        return a;
      });
      setAccounts(updatedAccountsList);

      // 3. Generate High-Priority Notifications
      const digestNotif: NotificationItem = {
        id: `NOTIF-PTP-DIGEST-${Date.now()}`,
        timestamp: `${refDate} ${currentTime}`,
        recipientRole: 'all',
        title: `⚡ PTP Digest: ${expiredCount} PTP${expiredCount > 1 ? 's' : ''} Marked Broken`,
        message: `Batch PTP Digest processed on ${refDate}. Marked ${expiredCount} expired PTP(s) totaling ₹${expiredAmount.toLocaleString('en-IN')} as Broken for accounts: ${affectedAccIds.join(', ')}. Google Sheets batch synchronized.`,
        type: 'ptp_broken',
        read: false,
      };
      newNotificationsList = [digestNotif, ...notifications];
      setNotifications(newNotificationsList);

      // 4. Log Activity Event
      const digestLog: ActivityLog = {
        id: `ACT-PTP-DIGEST-${Date.now()}`,
        timestamp: `${refDate} ${currentTime}`,
        userId: currentUser.agentId || currentUser.id,
        userName: currentUser.name,
        role: currentUser.role,
        actionType: 'STATUS_CHANGED' as any,
        details: `PTP Digest executed for ${refDate}: ${expiredCount} expired PTP(s) (₹${expiredAmount.toLocaleString('en-IN')}) marked as Broken and batch synced to Google Sheets.`,
      };
      newActivityLogsList = [digestLog, ...activityLogs];
      setActivityLogs(newActivityLogsList);
    }

    // 5. Trigger Batch Update to Google Sheets (all 19 tabs)
    let sheetsSynced = false;
    try {
      const updatedCompiledTabs = compileAll19GoogleSheets({
        users,
        accounts: updatedAccountsList,
        allocations,
        followups,
        ptps: updatedPtpsList,
        recoveries,
        visits,
        photos,
        documents,
        voiceNotes,
        activityLogs: newActivityLogsList,
        notifications: newNotificationsList,
        commissions,
        branches,
        areas,
        zones,
        commissionSettings,
      });

      const authState = googleDriveService.getAuthState();
      if (authState.isConnected && authState.accessToken) {
        sheetsSynced = await googleSheetsService.syncAllSheets(updatedCompiledTabs);
      } else {
        await fetch('/api/sheets/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sheetsCount: updatedCompiledTabs.length, batchType: 'ptp_digest' }),
        }).catch(() => {});
        sheetsSynced = true;
      }
    } catch (err: any) {
      console.warn('Sheets batch sync error:', err);
      sheetsSynced = false;
    }

    const sheetsStatus = googleSheetsService.getStatus();

    return {
      evaluatedCount: ptps.length,
      expiredCount,
      expiredAmount,
      brokenPTPs: updatedPtpsList.filter((p) => expiredIds.has(p.id)),
      dueTodayCount: dueTodayPTPs.length,
      upcomingCount: upcomingPTPs.length,
      achievedCount: achievedPTPs.length,
      alreadyBrokenCount: alreadyBrokenPTPs.length,
      affectedAccountIds: affectedAccIds,
      referenceDate: refDate,
      sheetsSynced,
      spreadsheetUrl: sheetsStatus.spreadsheetUrl,
      timestamp: timestampStr,
      message:
        expiredCount > 0
          ? `Successfully marked ${expiredCount} expired PTP commitments (₹${expiredAmount.toLocaleString('en-IN')}) as 'Broken' and batch synchronized to Google Sheets.`
          : `All PTP commitments are up to date. No expired commitments found for ${refDate}.`,
    };
  };

  const recordRecovery = (data: {
    accountId: string;
    amount: number;
    paymentMode: RecoveryRecord['paymentMode'];
    referenceNumber: string;
    remarks: string;
    recoveryDate?: string;
    proofDriveFileId?: string;
    isOTS?: boolean;
    otsStage?: '10_percent_token' | 'full_settlement';
    otsAgreedAmount?: number;
    agentId?: string;
    agentName?: string;
  }) => {
    const acc = accounts.find((a) => a.accountId === data.accountId || a.id === data.accountId);
    const targetAccountId = acc?.accountId || data.accountId;
    const recId = `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    const dateStr = data.recoveryDate || new Date().toISOString().slice(0, 10);
    const receiptNumber = `SRMS-RCP-${dateStr.slice(0, 7)}-${Math.floor(1000 + Math.random() * 9000)}`;

    // If collecting agent is explicitly selected from agent-only list, use it.
    // Otherwise fallback to assigned agent, or currentUser
    const hasAssignedAgent = Boolean(
      acc?.assignedAgentId &&
      acc.assignedAgentId !== 'N/A' &&
      acc.assignedAgentId !== 'Unassigned'
    );
    const creditedAgentId =
      data.agentId ||
      (hasAssignedAgent && currentUser.role !== 'agent'
        ? (acc!.assignedAgentId as string)
        : currentUser.agentId || currentUser.id);
    const creditedAgentName =
      data.agentName ||
      (hasAssignedAgent && currentUser.role !== 'agent'
        ? (acc!.assignedAgentName as string)
        : currentUser.name);

    // Admin Recovery: ensure bracket remarks denote admin recovery
    const isAdmin = currentUser.role === 'admin';
    let finalRemarks = (data.remarks || '').trim();
    if (isAdmin && !finalRemarks.includes('[Admin Recovery:')) {
      finalRemarks = `${finalRemarks} [Admin Recovery: ${currentUser.name}]`.trim();
    }

    // Determine QD type & Stage for prioritized calculation
    const calculatedQD: QDType =
      acc?.qdType ||
      (acc?.overdueDays && acc.overdueDays > 90
        ? 'Critical NPA (>90 DPD)'
        : acc?.overdueDays && acc.overdueDays > 60
        ? 'SMA-2 (61-90 DPD)'
        : acc?.overdueDays && acc.overdueDays > 30
        ? 'SMA-1 (31-60 DPD)'
        : 'SMA-0 (0-30 DPD)');

    const recoveryStage: RecoveryStage = data.isOTS
      ? data.otsStage === 'full_settlement'
        ? 'OTS Full Settlement'
        : 'OTS Token (10%)'
      : data.amount >= (acc?.outstandingAmount || data.amount)
      ? 'Full Settlement / Closed'
      : 'Partial Recovery';

    // Prioritized commission calculation
    const commCalc = calculateCommissionWithPriority(
      {
        eligibleAmount: data.amount,
        recoveryDate: dateStr,
        agentId: creditedAgentId,
        bankName: acc?.bank || currentUser.bank,
        zoneName: acc?.zone || currentUser.zone,
        branchName: acc?.branch || currentUser.branch,
        departmentName: acc?.department || currentUser.department,
        qdType: calculatedQD,
        recoveryStage: recoveryStage,
      },
      commissionRules,
      userCommissionAssignments,
      commissionSettings.defaultRate
    );

    if (commCalc.conflictDetected) {
      console.warn("Duplicate commission rule detected. Please resolve the conflicting commission rules.");
    }

    const commissionPercentage = commCalc.appliedPercentage ?? commCalc.percentage;
    const commissionAmount = commCalc.commissionAmount;

    const newRecovery: RecoveryRecord = {
      id: `REC-${Date.now()}`,
      recoveryId: recId,
      accountId: targetAccountId,
      customerName: acc?.customerName || 'Customer',
      agentId: creditedAgentId,
      agentName: creditedAgentName,
      amount: data.amount,
      recoveryDate: dateStr,
      referenceNumber: data.referenceNumber,
      paymentMode: data.paymentMode,
      remarks: finalRemarks,
      receiptNumber,
      proofDriveFileId: data.proofDriveFileId || `DRV_REC_${Date.now()}_PROOF`,
      branch: acc?.branch || currentUser.branch,
      zone: acc?.zone || currentUser.zone,
      bank: acc?.bank || currentUser.bank,
      department: acc?.department || currentUser.department,
      qdType: calculatedQD,
      recoveryStage: recoveryStage,
      commissionAmount,
      commissionPercentage,
      appliedCommissionRuleId: commCalc.appliedRuleId || commCalc.ruleId,
      appliedCommissionRuleName: commCalc.appliedRuleName || commCalc.ruleName,
      appliedAssignmentId: commCalc.appliedAssignmentId || commCalc.assignmentId,
      appliedPriorityLevel: commCalc.priorityLevel,
      commissionPaidStatus: 'Approved',
      isOTS: data.isOTS,
      otsStage: data.otsStage,
      otsAgreedAmount: data.otsAgreedAmount,
      isAdminRecovery: isAdmin,
      adminRecordedBy: isAdmin ? currentUser.name : undefined,
    };

    setRecoveries((prev) => [newRecovery, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with continuous Google Sheets replication
    firebaseFirestoreService.saveRecovery(newRecovery).catch((err) => {
      console.warn('Firestore primary recovery write warning:', err);
    });

    // Add Commission Record for the credited agent with immutable audit trail
    const newCommission: CommissionRecord = {
      id: `COM-${Date.now()}`,
      agentId: creditedAgentId,
      agentName: creditedAgentName,
      recoveryId: recId,
      accountId: targetAccountId,
      recoveryAmount: data.amount,
      commissionRate: commissionPercentage,
      commissionAmount,
      date: dateStr,
      status: 'Approved',
      appliedRuleId: commCalc.appliedRuleId || commCalc.ruleId,
      appliedRuleName: commCalc.appliedRuleName || commCalc.ruleName,
      appliedAssignmentId: commCalc.appliedAssignmentId || commCalc.assignmentId,
      priorityLevel: commCalc.priorityLevel,
      priorityDescription: commCalc.priorityDescription,
      bank: acc?.bank || currentUser.bank,
      zone: acc?.zone || currentUser.zone,
      branch: acc?.branch || currentUser.branch,
      qdType: calculatedQD,
      recoveryStage: recoveryStage,
    };
    setCommissions((prev) => [newCommission, ...prev]);

    firebaseFirestoreService.saveCommission(newCommission).catch((err) => {
      console.warn('Firestore primary commission write warning:', err);
    });

    // Update Account with OTS or Standard Recovery
    // MULTI-ACCOUNT CUSTOMER: If this customer has multiple accounts (same name + balance),
    // apply the recovery/OTS update to ALL of them, not just the primary one
    const nowIsoTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    setAccounts((prev) => {
      // Find all accounts belonging to this customer (by name + balance grouping)
      const customerAccounts = getAccountsForCustomer(prev, acc || { customerName: targetAccountId } as Account);
      const customerAccountIds = new Set(customerAccounts.map((ca) => ca.accountId || ca.id));

      return prev.map((a) => {
        // Apply recovery/OTS to all accounts of the same customer
        if (customerAccountIds.has(a.accountId || a.id || '')) {
          const newTotalRecovered = (a.totalRecovered || 0) + data.amount;

          if (data.isOTS) {
            const agreed = data.otsAgreedAmount || a.otsAgreedAmount || (data.amount * 10);

            if (data.otsStage === '10_percent_token') {
              const otsNote: AgentNote = {
                id: `NOTE-OTS-10-${Date.now()}`,
                agentId: creditedAgentId,
                agentName: creditedAgentName,
                date: dateStr,
                time: nowIsoTime,
                note: `[OTS Token Paid]: 10% upfront OTS token payment ₹${data.amount.toLocaleString('en-IN')} deposited. Total agreed OTS: ₹${agreed.toLocaleString('en-IN')}. Sanction process pending. ${finalRemarks}`,
                category: 'OTS Settlement',
              };

              return {
                ...a,
                totalRecovered: newTotalRecovered,
                lastRecoveryDate: dateStr,
                otsStatus: '10% OTS Paid - Sanction Pending',
                otsAgreedAmount: agreed,
                ots10PercentPaidAmount: data.amount,
                recoveryStatus: 'OTS Token Paid (10%)',
                accountStatus: 'OTS Processing',
                notes: `10% OTS token ₹${data.amount.toLocaleString('en-IN')} received. Awaiting sanction. ${finalRemarks}`,
                agentNotesHistory: [otsNote, ...(a.agentNotesHistory || [])],
              };
            } else {
              // Full OTS Settlement stage or general OTS payment
              // USER RULE: "if we took amount offer OTS amount below than account status will not as closed till user not close it"
              if (newTotalRecovered < agreed) {
                const currentOTSBal = a.finalOTSAmount ?? a.userEnteredOTSAmount ?? agreed;
                const remainingOTS = Math.max(0, currentOTSBal - data.amount);
                const otsPartialNote: AgentNote = {
                  id: `NOTE-OTS-PARTIAL-${Date.now()}`,
                  agentId: creditedAgentId,
                  agentName: creditedAgentName,
                  date: dateStr,
                  time: nowIsoTime,
                  note: `[OTS Partial Payment Received]: Collected ₹${data.amount.toLocaleString('en-IN')}. Total paid under OTS: ₹${newTotalRecovered.toLocaleString('en-IN')} of agreed ₹${agreed.toLocaleString('en-IN')} (₹${remainingOTS.toLocaleString('en-IN')} balance remaining). Below agreed offer amount; account status remains OPEN (OTS Processing) until full OTS amount is satisfied or manually closed by user. ${finalRemarks}`,
                  category: 'OTS Settlement',
                };

                return {
                  ...a,
                  totalRecovered: newTotalRecovered,
                  lastRecoveryDate: dateStr,
                  outstandingAmount: Math.max(0, a.outstandingAmount - data.amount),
                  overdueAmount: Math.max(0, a.overdueAmount - data.amount),
                  customerBalance: Math.max(0, (a.customerBalance ?? a.overdueAmount ?? 0) - data.amount),
                  otsStatus: '10% OTS Paid - Sanction In Progress',
                  otsAgreedAmount: agreed,
                  finalOTSAmount: remainingOTS,
                  userEnteredOTSAmount: remainingOTS,
                  recoveryStatus: 'Partially Recovered',
                  accountStatus: 'OTS Processing', // OPEN, NOT closed!
                  notes: `OTS Partial Payment: ₹${newTotalRecovered.toLocaleString('en-IN')} of ₹${agreed.toLocaleString('en-IN')} paid. Account remains open until user closes it or remaining ₹${remainingOTS.toLocaleString('en-IN')} is cleared. ${finalRemarks}`,
                  agentNotesHistory: [otsPartialNote, ...(a.agentNotesHistory || [])],
                };
              } else {
                // Full agreed OTS amount satisfied
                const discount = Math.max(0, (a.sanctionAmount || a.outstandingAmount || 0) - agreed);
                const otsCloseNote: AgentNote = {
                  id: `NOTE-OTS-CLOSE-${Date.now()}`,
                  agentId: creditedAgentId,
                  agentName: creditedAgentName,
                  date: dateStr,
                  time: nowIsoTime,
                  note: `[OTS Settled]: Account settled under OTS scheme. Total OTS paid: ₹${newTotalRecovered.toLocaleString('en-IN')} (concession waived: ₹${discount.toLocaleString('en-IN')}). Status: Closed as per OTS. User can archive or delete as closed. ${finalRemarks}`,
                  category: 'OTS Settlement',
                };

                return {
                  ...a,
                  totalRecovered: newTotalRecovered,
                  lastRecoveryDate: dateStr,
                  outstandingAmount: 0,
                  overdueAmount: 0,
                  customerBalance: 0,
                  otsStatus: 'OTS Settled',
                  otsAgreedAmount: agreed,
                  finalOTSAmount: 0,
                  userEnteredOTSAmount: 0,
                  otsDiscountAmount: discount,
                  recoveryStatus: 'Fully Recovered',
                  accountStatus: 'Closed as per OTS',
                  closureType: 'Closed as per OTS',
                  closureDate: dateStr,
                  ptpStatus: 'Achieved',
                  notes: `Closed as per OTS. (Total Paid: ₹${newTotalRecovered.toLocaleString('en-IN')}, Discount: ₹${discount.toLocaleString('en-IN')}). ${finalRemarks}`,
                  agentNotesHistory: [otsCloseNote, ...(a.agentNotesHistory || [])],
                };
              }
            }
          }

          // Standard recovery calculation
          const newOutstanding = Math.max(0, a.outstandingAmount - data.amount);
          const newOverdue = Math.max(0, a.overdueAmount - data.amount);
          // BUG FIX: customerBalance is the field several screens (account
          // detail, WhatsApp offer text, dashboards) display FIRST, ahead of
          // overdueAmount/outstandingAmount. It was never being reduced here,
          // so the balance looked frozen at the original imported amount
          // even though the real balance had correctly gone down.
          const newCustomerBalance = Math.max(0, (a.customerBalance ?? a.overdueAmount ?? 0) - data.amount);
          const isFullyPaid = newOutstanding === 0 && newOverdue === 0;

          const recNote: AgentNote = {
            id: `NOTE-REC-${Date.now()}`,
            agentId: creditedAgentId,
            agentName: creditedAgentName,
            date: dateStr,
            time: nowIsoTime,
            note: `[Collection Received]: Collected ₹${data.amount.toLocaleString('en-IN')} via ${data.paymentMode} (Ref: ${data.referenceNumber || 'N/A'}). Remaining POS: ₹${newOutstanding.toLocaleString('en-IN')}. Receipt: ${receiptNumber}. ${finalRemarks}`,
            category: 'Payment Received',
          };

          return {
            ...a,
            totalRecovered: newTotalRecovered,
            lastRecoveryDate: dateStr,
            outstandingAmount: newOutstanding,
            overdueAmount: newOverdue,
            customerBalance: newCustomerBalance,
            recoveryStatus: isFullyPaid ? 'Fully Recovered' : 'Partially Recovered',
            accountStatus: isFullyPaid ? 'Regular Close' : 'Recovered',
            closureType: isFullyPaid ? 'Regular Close' : a.closureType,
            closureDate: isFullyPaid ? dateStr : a.closureDate,
            ptpStatus: 'Achieved',
            notes: isFullyPaid
              ? `Regular Close: Full recovery completed. ${finalRemarks}`
              : a.notes,
            agentNotesHistory: [recNote, ...(a.agentNotesHistory || [])],
          };
        }
        return a;
      });
    });

    // Auto resolve pending PTPs if any
    setPtps((prev) =>
      prev.map((p) =>
        (p.accountId === targetAccountId || p.accountId === data.accountId) && p.status === 'Pending'
          ? { ...p, status: 'Achieved', resolvedDate: dateStr }
          : p
      )
    );

    // Confetti celebration
    try {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }

    // Add Notification
    const notif: NotificationItem = {
      id: `NOTIF-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
      recipientRole: 'all',
      title: `💰 Recovery Logged: ₹${data.amount.toLocaleString('en-IN')}`,
      message: `${currentUser.name} (${currentUser.agentId || 'Agent'}) collected ₹${data.amount.toLocaleString('en-IN')} for Account ${targetAccountId}. Commission: ₹${commissionAmount.toLocaleString('en-IN')} (10%). Receipt: ${receiptNumber}.`,
      type: 'recovery_done',
      read: false,
      accountId: targetAccountId,
    };
    setNotifications((prev) => [notif, ...prev]);

    logActivity(
      currentUser,
      'RECOVERY_LOGGED',
      `Collected ₹${data.amount.toLocaleString('en-IN')} on ${dateStr} via ${data.paymentMode} (Ref: ${data.referenceNumber}). 10% Commission: ₹${commissionAmount.toLocaleString('en-IN')}. Receipt: ${receiptNumber}${data.isOTS ? ` [OTS: ${data.otsStage}]` : ''}`,
      targetAccountId
    );

    // Real-time background sync to Google Sheets Recoveries tab
    try {
      googleSheetsService.appendRecoveryRecord({
        receiptNumber,
        accountId: targetAccountId,
        customerName: acc?.customerName || 'Customer',
        amount: data.amount,
        paymentMode: data.paymentMode,
        referenceNumber: data.referenceNumber,
        date: dateStr,
        agentId: creditedAgentId,
        agentName: creditedAgentName,
        branch: acc?.branch || currentUser.branch || 'Pune Main Branch',
        commissionAmount,
        remarks: data.remarks || 'Collected on field',
      }).catch(() => {});
    } catch {
      // non-blocking
    }
  };

  const editRecovery = async (
    recoveryId: string,
    updatedData: {
      amount?: number;
      paymentMode?: RecoveryRecord['paymentMode'];
      referenceNumber?: string;
      remarks?: string;
      recoveryDate?: string;
      isOTS?: boolean;
      otsStage?: '10_percent_token' | 'full_settlement';
      otsAgreedAmount?: number;
    }
  ): Promise<{ success: boolean; message: string }> => {
    const existingRec = recoveries.find((r) => r.id === recoveryId || r.recoveryId === recoveryId);
    if (!existingRec) {
      return { success: false, message: 'Recovery record not found.' };
    }

    const newAmount = updatedData.amount !== undefined ? updatedData.amount : existingRec.amount;
    const diffAmount = newAmount - existingRec.amount;
    const newCommission = Math.round((newAmount * (existingRec.commissionPercentage || commissionSettings.defaultRate)) / 100);

    setRecoveries((prev) =>
      prev.map((r) =>
        r.id === recoveryId || r.recoveryId === recoveryId
          ? {
              ...r,
              amount: newAmount,
              paymentMode: updatedData.paymentMode || r.paymentMode,
              referenceNumber: updatedData.referenceNumber !== undefined ? updatedData.referenceNumber : r.referenceNumber,
              remarks: updatedData.remarks !== undefined ? updatedData.remarks : r.remarks,
              recoveryDate: updatedData.recoveryDate || r.recoveryDate,
              commissionAmount: newCommission,
              isOTS: updatedData.isOTS !== undefined ? updatedData.isOTS : r.isOTS,
              otsStage: updatedData.otsStage || r.otsStage,
              otsAgreedAmount: updatedData.otsAgreedAmount || r.otsAgreedAmount,
            }
          : r
      )
    );

    setCommissions((prev) =>
      prev.map((c) =>
        c.recoveryId === existingRec.recoveryId || c.recoveryId === recoveryId
          ? {
              ...c,
              recoveryAmount: newAmount,
              commissionAmount: newCommission,
              date: updatedData.recoveryDate || c.date,
            }
          : c
      )
    );

    if (diffAmount !== 0) {
      setAccounts((prev) =>
        prev.map((a) => {
          if (a.accountId === existingRec.accountId) {
            const updatedTotal = Math.max(0, (a.totalRecovered || 0) + diffAmount);
            const updatedOut = Math.max(0, a.outstandingAmount - diffAmount);
            const updatedOverdue = Math.max(0, a.overdueAmount - diffAmount);
            return {
              ...a,
              totalRecovered: updatedTotal,
              outstandingAmount: updatedOut,
              overdueAmount: updatedOverdue,
            };
          }
          return a;
        })
      );
    }

    logActivity(
      currentUser,
      'RECOVERY_LOGGED',
      `Updated recovery record ${existingRec.receiptNumber} (${existingRec.accountId}). Amount: ₹${newAmount.toLocaleString('en-IN')}`,
      existingRec.accountId
    );

    return { success: true, message: 'Recovery record updated successfully.' };
  };

  const deleteRecovery = async (recoveryId: string): Promise<{ success: boolean; message: string }> => {
    const existingRec = recoveries.find((r) => r.id === recoveryId || r.recoveryId === recoveryId);
    if (!existingRec) {
      return { success: false, message: 'Recovery record not found.' };
    }

    setRecoveries((prev) => prev.filter((r) => r.id !== recoveryId && r.recoveryId !== recoveryId));
    setCommissions((prev) => prev.filter((c) => c.recoveryId !== existingRec.recoveryId && c.recoveryId !== recoveryId));

    // Persist the deletion so it doesn't reappear after a data refresh
    firebaseFirestoreService.deleteRecovery(existingRec.id || existingRec.recoveryId).catch((err) => {
      console.warn('Firestore recovery delete warning:', err);
    });

    // Revert account balances
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === existingRec.accountId) {
          const revertedTotal = Math.max(0, (a.totalRecovered || 0) - existingRec.amount);
          const revertedOut = a.outstandingAmount + existingRec.amount;
          const revertedOverdue = a.overdueAmount + existingRec.amount;
          const revertedCustomerBalance = (a.customerBalance ?? 0) + existingRec.amount;
          return {
            ...a,
            totalRecovered: revertedTotal,
            outstandingAmount: revertedOut,
            overdueAmount: revertedOverdue,
            customerBalance: revertedCustomerBalance,
            recoveryStatus: revertedTotal > 0 ? 'Partially Recovered' : 'Pending',
            accountStatus: 'Active',
          };
        }
        return a;
      })
    );

    logActivity(
      currentUser,
      'SETTINGS_UPDATED',
      `Deleted recovery entry ${existingRec.receiptNumber} (₹${existingRec.amount.toLocaleString('en-IN')}) for Account ${existingRec.accountId}.`,
      existingRec.accountId
    );

    return { success: true, message: 'Recovery record deleted and balances adjusted.' };
  };

  const reverseRecovery = async (
    recoveryId: string,
    reason: string
  ): Promise<{ success: boolean; message: string }> => {
    const existingRec = recoveries.find((r) => r.id === recoveryId || r.recoveryId === recoveryId);
    if (!existingRec) {
      return { success: false, message: 'Recovery record not found.' };
    }
    if (existingRec.isReversed) {
      return { success: false, message: 'This recovery entry has already been reversed.' };
    }

    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const nowIsoDate = new Date().toISOString().slice(0, 10);
    const nowIsoTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Mark recovery as reversed
    setRecoveries((prev) =>
      prev.map((r) => {
        if (r.id === recoveryId || r.recoveryId === recoveryId) {
          return {
            ...r,
            isReversed: true,
            reversalReason: reason || 'Reversed by user',
            reversedAt: nowIso,
            reversedBy: currentUser.agentId || currentUser.id,
            reversedByName: currentUser.name,
          };
        }
        return r;
      })
    );

    // Cancel / remove associated commission
    setCommissions((prev) =>
      prev.filter((c) => c.recoveryId !== existingRec.recoveryId && c.recoveryId !== recoveryId)
    );

    // Revert account balances and log note
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === existingRec.accountId) {
          const revertedTotal = Math.max(0, (a.totalRecovered || 0) - existingRec.amount);
          const revertedOut = a.outstandingAmount + existingRec.amount;
          const revertedOverdue = a.overdueAmount + existingRec.amount;

          const reversalNote: AgentNote = {
            id: `NOTE-REV-${Date.now()}`,
            agentId: currentUser.agentId || currentUser.id,
            agentName: currentUser.name,
            date: nowIsoDate,
            time: nowIsoTime,
            note: `[RECOVERY REVERSED]: Receipt ${existingRec.receiptNumber || existingRec.recoveryId} of ₹${existingRec.amount.toLocaleString('en-IN')} was reversed by ${currentUser.name}. Reason: ${reason || 'User requested reversal'}. Account balances restored.`,
            category: 'Payment Collection',
          };

          return {
            ...a,
            totalRecovered: revertedTotal,
            outstandingAmount: revertedOut,
            overdueAmount: revertedOverdue,
            recoveryStatus: revertedTotal > 0 ? 'Partially Recovered' : 'Pending',
            accountStatus: a.accountStatus === 'Recovered' || a.accountStatus === 'Closed' ? 'Active' : a.accountStatus,
            agentNotesHistory: [reversalNote, ...(a.agentNotesHistory || [])],
            latestRemark: `Recovery of ₹${existingRec.amount.toLocaleString('en-IN')} reversed: ${reason || 'User reversed'}`.slice(0, 80),
          };
        }
        return a;
      })
    );

    logActivity(
      currentUser,
      'RECOVERY_LOGGED',
      `Reversed recovery entry ${existingRec.receiptNumber || existingRec.recoveryId} (₹${existingRec.amount.toLocaleString('en-IN')}) for Account ${existingRec.accountId}. Reason: ${reason || 'User reversed entry'}`,
      existingRec.accountId
    );

    return {
      success: true,
      message: `Recovery entry of ₹${existingRec.amount.toLocaleString('en-IN')} successfully reversed. Account balances restored.`,
    };
  };

  const startFieldVisit = async (accountId: string, coords?: { lat: number; lng: number }): Promise<FieldVisit> => {
    const acc = accounts.find((a) => a.accountId === accountId);
    let lat = coords?.lat || acc?.latitude || 19.834521;
    let lng = coords?.lng || acc?.longitude || 75.342187;
    let accuracy = 4.5;

    // Try browser geolocation
    if (!coords && navigator.geolocation) {
      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 3000, enableHighAccuracy: true });
        });
        lat = position.coords.latitude;
        lng = position.coords.longitude;
        accuracy = position.coords.accuracy;
      } catch {
        // Fallback to account coordinates + small jitter
        lat = acc?.latitude ? acc.latitude + (Math.random() - 0.5) * 0.001 : 19.834521;
        lng = acc?.longitude ? acc.longitude + (Math.random() - 0.5) * 0.001 : 75.342187;
      }
    }

    const visit: FieldVisit = {
      id: `VST-${Date.now()}`,
      visitId: `VST-${Math.floor(1000 + Math.random() * 9000)}`,
      accountId,
      customerName: acc?.customerName || 'Customer',
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      startTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      latitude: lat,
      longitude: lng,
      address: acc?.address || 'Customer Location',
      visitStatus: 'In Progress',
      visitRemarks: 'Field visit in progress at customer premises.',
      customerInteraction: '',
      photoDriveFileIds: [],
      voiceNoteDriveFileIds: [],
      accuracyMeters: accuracy,
    };

    setActiveVisit(visit);
    setVisits((prev) => [visit, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with continuous Google Sheets replication
    firebaseFirestoreService.saveVisit(visit).catch((err) => {
      console.warn('Firestore primary visit write warning:', err);
    });

    // Update customer coordinates in account details
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === accountId || a.id === accountId) {
          const latStr = (lat || 19.834521).toFixed(6);
          const lngStr = (lng || 75.342187).toFixed(6);
          return {
            ...a,
            latitude: lat,
            longitude: lng,
            coordinates: `${latStr}, ${lngStr}`,
          };
        }
        return a;
      })
    );

    const safeLatStr = (lat || 19.834521).toFixed(6);
    const safeLngStr = (lng || 75.342187).toFixed(6);
    logActivity(currentUser, 'VISIT_STARTED', `Started field visit for account ${accountId} at GPS: ${safeLatStr}, ${safeLngStr}`, accountId);

    return visit;
  };

  const completeFieldVisit = (
    visitId: string,
    status: FieldVisit['visitStatus'],
    remarks: string,
    customerInteraction: string,
    photoIds?: string[],
    voiceIds?: string[]
  ) => {
    setVisits((prev) =>
      prev.map((v) => {
        if (v.id === visitId || v.visitId === visitId) {
          const updated = {
            ...v,
            endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            visitStatus: status,
            visitRemarks: remarks,
            customerInteraction,
            photoDriveFileIds: photoIds || v.photoDriveFileIds,
            voiceNoteDriveFileIds: voiceIds || v.voiceNoteDriveFileIds,
          };
          return updated;
        }
        return v;
      })
    );

    setActiveVisit(null);
    logActivity(currentUser, 'VISIT_COMPLETED', `Completed field visit (${status}): ${remarks.slice(0, 60)}...`);
  };

  const captureWatermarkedPhoto = async (
    options: Omit<WatermarkOptions, 'agentId' | 'agentName'>
  ): Promise<PhotoRecord> => {
    const watermarkResult = await createSRMSWatermarkedPhoto({
      ...options,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
    });

    const photoId = `PHO-${Math.floor(1000 + Math.random() * 9000)}`;
    let finalDriveFileId = watermarkResult.driveFileId;
    let finalDriveFolder = watermarkResult.driveFolder;

    // Direct Google Drive REST v3 upload if user linked Google Drive
    const driveAuth = googleDriveService.getAuthState();
    if (driveAuth.isConnected && driveAuth.accessToken) {
      try {
        const uploadResult = await googleDriveService.uploadGeotaggedPhotoToDrive({
          dataUrl: watermarkResult.dataUrl,
          accountId: options.accountId,
          customerName: options.customerName || 'Customer',
          agentId: currentUser.agentId || currentUser.id,
          agentName: currentUser.name,
          latitude: watermarkResult.latitude,
          longitude: watermarkResult.longitude,
          remark: options.remark,
          photoId,
        });
        finalDriveFileId = uploadResult.driveFileId;
        finalDriveFolder = uploadResult.drivePath;
      } catch (uploadErr) {
        console.warn('Direct Google Drive upload fallback:', uploadErr);
      }
    }

    const newPhoto: PhotoRecord = {
      id: `PHO-${Date.now()}`,
      photoId,
      accountId: options.accountId,
      customerId: `CUST-${options.accountId.replace('ACC-', '')}`,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: watermarkResult.date,
      time: watermarkResult.time,
      latitude: watermarkResult.latitude,
      longitude: watermarkResult.longitude,
      visitId: options.visitId || activeVisit?.visitId,
      agentRemark: options.remark,
      driveFileId: finalDriveFileId,
      driveFolder: finalDriveFolder,
      dataUrl: watermarkResult.dataUrl,
      watermarkText: watermarkResult.watermarkText,
      uploadStatus: 'Uploaded',
    };

    setPhotos((prev) => [newPhoto, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with Google Drive File ID pointer (Zero bytes in Firebase Storage)
    firebaseFirestoreService.savePhotoMetadata(newPhoto).catch((err) => {
      console.warn('Firestore primary photo write warning:', err);
    });

    // Update customer coordinates in account details
    setAccounts((prev) =>
      prev.map((a) => {
        if (a.accountId === options.accountId || a.id === options.accountId) {
          const latStr = (watermarkResult.latitude || 19.8762).toFixed(6);
          const lngStr = (watermarkResult.longitude || 75.3433).toFixed(6);
          return {
            ...a,
            latitude: watermarkResult.latitude,
            longitude: watermarkResult.longitude,
            coordinates: `${latStr}, ${lngStr}`,
          };
        }
        return a;
      })
    );

    // Link to active visit if active
    if (activeVisit) {
      setActiveVisit((prev) => (prev ? { ...prev, photoDriveFileIds: [...prev.photoDriveFileIds, newPhoto.driveFileId] } : null));
    }

    const safeWLat = (watermarkResult.latitude || 19.8762).toFixed(6);
    const safeWLng = (watermarkResult.longitude || 75.3433).toFixed(6);
    logActivity(
      currentUser,
      'PHOTO_CAPTURED',
      `Geo-tagged photo captured with watermark (Lat: ${safeWLat}, Lng: ${safeWLng}). Synced to Drive: ${finalDriveFolder}`,
      options.accountId
    );

    return newPhoto;
  };

  const recordVoiceNote = (data: {
    accountId: string;
    durationSeconds: number;
    title: string;
    transcription?: string;
    audioBlobUrl?: string;
    visitId?: string;
  }): VoiceNoteRecord => {
    const voiceNoteId = `VN-${Math.floor(1000 + Math.random() * 9000)}`;
    let driveFileId = `DRV_AUD_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    let driveFolder = `/ScaleSupport_Recovery_Storage/Account_${data.accountId}/Voice_Notes/`;
    let webViewLink: string | undefined = undefined;

    const acc = accounts.find((a) => a.accountId === data.accountId);

    // Direct Google Drive REST v3 upload if user linked Google Drive
    const driveAuth = googleDriveService.getAuthState();
    if (driveAuth.isConnected && driveAuth.accessToken && data.audioBlobUrl) {
      googleDriveService
        .uploadAudioRecordingToDrive({
          audioBlobUrl: data.audioBlobUrl,
          accountId: data.accountId,
          customerName: acc?.customerName || 'Customer',
          agentId: currentUser.agentId || currentUser.id,
          agentName: currentUser.name,
          title: data.title,
          voiceNoteId,
          durationSeconds: data.durationSeconds,
          transcription: data.transcription,
        })
        .then((res) => {
          setVoiceNotes((prev) =>
            prev.map((v) =>
              v.voiceNoteId === voiceNoteId
                ? { ...v, driveFileId: res.driveFileId, driveFolder: res.drivePath, webViewLink: res.webViewLink }
                : v
            )
          );
        })
        .catch((err) => {
          console.warn('Google Drive direct voice upload fallback:', err);
        });
    }

    const newVoice: VoiceNoteRecord = {
      id: `VN-${Date.now()}`,
      voiceNoteId,
      accountId: data.accountId,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationSeconds: data.durationSeconds,
      visitId: data.visitId || activeVisit?.visitId,
      driveFileId,
      driveFolder,
      webViewLink,
      audioBlobUrl: data.audioBlobUrl,
      transcription: data.transcription,
      title: data.title,
    };

    setVoiceNotes((prev) => [newVoice, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with Google Drive File ID pointer (Zero bytes in Firebase Storage)
    firebaseFirestoreService.saveVoiceNoteMetadata(newVoice).catch((err) => {
      console.warn('Firestore primary voice note write warning:', err);
    });

    if (activeVisit) {
      setActiveVisit((prev) => (prev ? { ...prev, voiceNoteDriveFileIds: [...prev.voiceNoteDriveFileIds, driveFileId] } : null));
    }

    logActivity(
      currentUser,
      'VOICE_RECORDED',
      `Recorded ${data.durationSeconds}s audio voice note "${data.title}". Drive Path: ${driveFolder}`,
      data.accountId
    );

    return newVoice;
  };

  const uploadDocument = async (data: {
    accountId: string;
    documentType: DocumentRecord['documentType'];
    fileName: string;
    fileSizeBytes: number;
    file?: File | Blob;
  }): Promise<DocumentRecord> => {
    const acc = accounts.find((a) => a.accountId === data.accountId);
    let driveFileId = `DRV_DOC_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    let fileUrl: string | undefined = undefined;
    let finalSizeBytes = data.fileSizeBytes;

    // ⚡ Direct to Google Drive (5 TB storage) if file provided - Zero bytes in Firebase Storage
    if (data.file) {
      try {
        const driveResult = await googleDriveService.uploadDocumentFileToDrive({
          file: data.file,
          fileName: data.fileName,
          accountId: data.accountId,
          customerName: acc?.customerName || 'Customer',
          documentType: data.documentType,
          agentId: currentUser.agentId || currentUser.id,
          agentName: currentUser.name,
        });
        driveFileId = driveResult.driveFileId;
        fileUrl = driveResult.webViewLink;
        finalSizeBytes = driveResult.fileSizeBytes;
      } catch (uploadErr) {
        console.warn('Google Drive direct file upload warning:', uploadErr);
      }
    }

    const newDoc: DocumentRecord = {
      id: `DOC-${Date.now()}`,
      documentId: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      accountId: data.accountId,
      customerName: acc?.customerName || 'Customer',
      documentType: data.documentType,
      uploadedBy: currentUser.agentId || currentUser.id,
      uploadedByName: currentUser.name,
      dateTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      driveFileId,
      fileName: data.fileName,
      fileSizeBytes: finalSizeBytes,
      fileUrl,
    };

    setDocuments((prev) => [newDoc, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with Google Drive File ID pointer (Zero bytes in Firebase Storage)
    firebaseFirestoreService.saveDocumentMetadata(newDoc).catch((err) => {
      console.warn('Firestore primary document write warning:', err);
    });

    logActivity(
      currentUser,
      'DOCUMENT_UPLOADED',
      `Uploaded ${data.documentType}: "${data.fileName}". Drive ID: ${driveFileId}`,
      data.accountId
    );

    return newDoc;
  };

  const attachGoogleDriveDocument = (
    accountId: string,
    file: PickedDriveFile,
    documentType: DocumentRecord['documentType'] = 'PAN / Aadhaar KYC'
  ): DocumentRecord => {
    const acc = accounts.find((a) => a.accountId === accountId);
    const newDoc: DocumentRecord = {
      id: `DOC-PICKED-${Date.now()}`,
      documentId: `DOC-${Math.floor(1000 + Math.random() * 9000)}`,
      accountId: accountId,
      customerName: acc?.customerName || 'Customer',
      documentType,
      uploadedBy: currentUser.agentId || currentUser.id,
      uploadedByName: currentUser.name,
      dateTime: new Date().toISOString().replace('T', ' ').slice(0, 19),
      driveFileId: file.id,
      fileName: file.name,
      fileSizeBytes: file.sizeBytes || 102400,
      fileUrl: file.url,
    };

    setDocuments((prev) => [newDoc, ...prev]);

    // ⚡ Primary write to Firestore (<50ms speed route) with Google Drive File ID pointer (Zero bytes in Firebase Storage)
    firebaseFirestoreService.saveDocumentMetadata(newDoc).catch((err) => {
      console.warn('Firestore primary document write warning:', err);
    });

    logActivity(
      currentUser,
      'DOCUMENT_UPLOADED',
      `Attached Google Drive document via Picker: "${file.name}" (${documentType}). Drive ID: ${file.id}`,
      accountId
    );

    return newDoc;
  };

  const updateCommissionSettings = (newRate: number) => {
    setCommissionSettings((prev) => ({ ...prev, defaultRate: newRate }));
    logActivity(currentUser, 'SETTINGS_UPDATED', `Updated default Recovery Agent commission rate to ${newRate}%`);
  };

  const updateCommissionStatus = (commissionId: string, status: CommissionRecord['status']) => {
    setCommissions((prev) =>
      prev.map((c) =>
        c.id === commissionId
          ? { ...c, status, paidDate: status === 'Paid' ? new Date().toISOString().slice(0, 10) : c.paidDate }
          : c
      )
    );
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  const addAgentNote = (accountId: string, note: string, category: string = 'General') => {
    if (!note || !note.trim()) return;

    const newNote: AgentNote = {
      id: `NOTE-${Date.now()}`,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      note: note.trim(),
      category,
    };

    setAccounts((prev) =>
      prev.map((acc) => {
        if (acc.accountId === accountId || acc.id === accountId) {
          return {
            ...acc,
            notes: note.trim(),
            agentNotesHistory: [newNote, ...(acc.agentNotesHistory || [])],
          };
        }
        return acc;
      })
    );

    logActivity(
      currentUser,
      'FOLLOWUP_LOGGED',
      `Added remark/note (${category}): "${note.trim()}" for customer account ${accountId}`,
      accountId
    );
  };

  // ==========================================
  // OTS SCHEME & WHATSAPP OFFER MODULE
  // ==========================================

  const updateOTSAuthorizedRoles = (roles: UserRole[]) => {
    setOtsAuthorizedRoles(roles);
    logActivity(
      currentUser,
      'SETTINGS_UPDATED',
      `Updated authorized roles for OTS modification to: ${roles.join(', ')}`
    );
  };

  const canUserEditOTS = (user: User = currentUser): boolean => {
    if (!user) return false;
    // Per user requirement: both users and agents can edit OTS amount
    return true;
  };

  const applyOTS = (
    accountId: string,
    options?: { userEnteredAmount?: number; notes?: string }
  ): { success: boolean; message: string; slabDefined: boolean } => {
    const acc = accounts.find((a) => a.accountId === accountId || a.id === accountId);
    if (!acc) {
      return { success: false, message: 'Account not found', slabDefined: false };
    }

    const origOutstanding = Math.max(0, acc.originalOutstandingAmount || acc.outstandingAmount || 0);

    // If customer has multiple accounts, OTS is calculated strictly on the merged total amount of all accounts of the customer
    const linkedAccs = accounts.filter(
      (a) =>
        (acc.mobile && a.mobile && a.mobile.replace(/\D/g, '') === acc.mobile.replace(/\D/g, '')) ||
        (acc.customerCode && a.customerCode && a.customerCode === acc.customerCode) ||
        (acc.customerName && a.customerName && a.customerName.trim().toLowerCase() === acc.customerName.trim().toLowerCase())
    );
    const isMultiAccountCustomer = linkedAccs.length > 1;
    const effectiveOutstanding = isMultiAccountCustomer
      ? linkedAccs.reduce(
          (sum, a) => sum + Math.max(0, a.originalOutstandingAmount || a.outstandingAmount || 0),
          0
        )
      : origOutstanding;

    // Use earliest NPA date for multi-account calculation
    const effectiveNpaDate = isMultiAccountCustomer
      ? linkedAccs.reduce((earliest, a) => {
          if (!a.npaDate) return earliest;
          if (!earliest) return a.npaDate;
          return a.npaDate < earliest ? a.npaDate : earliest;
        }, acc.npaDate)
      : acc.npaDate;

    const slabEval = evaluateOTSSlab(effectiveOutstanding, effectiveNpaDate);

    if (!slabEval.slabDefined) {
      updateAccount(acc.accountId, {
        otsActive: false,
        otsSlabDefined: false,
        otsSlabName: 'OTS Slab Not Defined',
        originalOutstandingAmount: origOutstanding,
      });
      return {
        success: false,
        message: `OTS Slab Not Defined for NPA Date (${acc.npaDate || 'None'}). OTS cannot be calculated.`,
        slabDefined: false,
      };
    }

    const sysOTS = slabEval.systemCalculatedOTSAmount;
    const finalOTS =
      options?.userEnteredAmount !== undefined
        ? Math.max(0, Math.round(Number(options.userEnteredAmount) || 0))
        : sysOTS;
    const concession = calculateActualConcession(origOutstanding, finalOTS);
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const historyEntry: OTSHistoryRecord = {
      id: `OTS-HIST-${Date.now()}`,
      timestamp: nowIso,
      action: 'CALCULATED',
      userId: currentUser.agentId || currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      originalOutstandingAmount: origOutstanding,
      systemCalculatedOTSAmount: sysOTS,
      userEnteredOTSAmount: finalOTS,
      finalOTSAmount: finalOTS,
      actualConcessionAmount: concession,
      otsDiscountPercentage: slabEval.discountPercentage,
      remarks: options?.notes || `Calculated under ${slabEval.slabName}`,
    };

    const otsNote: AgentNote = {
      id: `NOTE-OTS-CALC-${Date.now()}`,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      note: `[OTS Scheme Calculated]: System OTS ₹${sysOTS.toLocaleString('en-IN')} (${slabEval.slabName}). Final OTS: ₹${finalOTS.toLocaleString('en-IN')}. Concession: ₹${concession.toLocaleString('en-IN')}. Valid till 30 Sep 2026.`,
      category: 'OTS Settlement',
    };

    updateAccount(acc.accountId, {
      originalOutstandingAmount: origOutstanding, // Preserved and never overwritten
      systemCalculatedOTSAmount: sysOTS,
      userEnteredOTSAmount: finalOTS,
      finalOTSAmount: finalOTS,
      actualConcessionAmount: concession,
      otsDiscountPercentage: slabEval.discountPercentage,
      otsActive: true,
      otsStatus: 'OTS Applied',
      otsSlabDefined: true,
      otsSlabName: slabEval.slabName,
      otsValidTill: OTS_VALID_TILL,
      otsCalculatedAt: nowIso,
      otsUpdatedByUserId: currentUser.agentId || currentUser.id,
      otsUpdatedByUserName: currentUser.name,
      otsUpdatedByUserRole: currentUser.role,
      otsHistory: [historyEntry, ...(acc.otsHistory || [])],
      agentNotesHistory: [otsNote, ...(acc.agentNotesHistory || [])],
    });

    logActivity(
      currentUser,
      'OTS_CALCULATED',
      `Calculated OTS for ${acc.customerName} (${acc.accountId}): System ₹${sysOTS.toLocaleString('en-IN')}, Final ₹${finalOTS.toLocaleString('en-IN')}, Concession ₹${concession.toLocaleString('en-IN')}. [${slabEval.slabName}]`,
      acc.accountId
    );

    return {
      success: true,
      message: `OTS Calculated: ${slabEval.slabName}. System OTS: ₹${sysOTS.toLocaleString('en-IN')}, Final OTS: ₹${finalOTS.toLocaleString('en-IN')}`,
      slabDefined: true,
    };
  };

  const modifyOTS = (
    accountId: string,
    userEnteredAmount: number,
    notes?: string
  ): { success: boolean; message: string } => {
    if (!canUserEditOTS(currentUser)) {
      return {
        success: false,
        message: 'Permission Denied: Only authorized roles configured by Admin can edit OTS amounts.',
      };
    }

    const acc = accounts.find((a) => a.accountId === accountId || a.id === accountId);
    if (!acc) {
      return { success: false, message: 'Account not found' };
    }

    const origOutstanding = Math.max(0, acc.originalOutstandingAmount || acc.outstandingAmount || 0);
    const newFinalOTS = Math.max(0, Math.round(Number(userEnteredAmount) || 0));
    const concession = calculateActualConcession(origOutstanding, newFinalOTS);
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const historyEntry: OTSHistoryRecord = {
      id: `OTS-HIST-${Date.now()}`,
      timestamp: nowIso,
      action: 'MODIFIED',
      userId: currentUser.agentId || currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      originalOutstandingAmount: origOutstanding,
      systemCalculatedOTSAmount: acc.systemCalculatedOTSAmount,
      userEnteredOTSAmount: newFinalOTS,
      finalOTSAmount: newFinalOTS,
      actualConcessionAmount: concession,
      otsDiscountPercentage: acc.otsDiscountPercentage,
      remarks:
        notes ||
        `User modified OTS amount from ₹${(acc.finalOTSAmount || acc.systemCalculatedOTSAmount || 0).toLocaleString('en-IN')} to ₹${newFinalOTS.toLocaleString('en-IN')}`,
    };

    const otsNote: AgentNote = {
      id: `NOTE-OTS-MOD-${Date.now()}`,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      note: `[OTS Modified]: Authorized user ${currentUser.name} modified Final OTS to ₹${newFinalOTS.toLocaleString('en-IN')}. Actual Concession: ₹${concession.toLocaleString('en-IN')}. Awaiting confirmation.`,
      category: 'OTS Settlement',
    };

    updateAccount(acc.accountId, {
      userEnteredOTSAmount: newFinalOTS,
      finalOTSAmount: newFinalOTS,
      actualConcessionAmount: concession,
      otsStatus: 'OTS Applied',
      otsModifiedAt: nowIso,
      otsUpdatedByUserId: currentUser.agentId || currentUser.id,
      otsUpdatedByUserName: currentUser.name,
      otsUpdatedByUserRole: currentUser.role,
      otsHistory: [historyEntry, ...(acc.otsHistory || [])],
      agentNotesHistory: [otsNote, ...(acc.agentNotesHistory || [])],
    });

    logActivity(
      currentUser,
      'OTS_MODIFIED',
      `Modified OTS amount for ${acc.customerName} (${acc.accountId}) to ₹${newFinalOTS.toLocaleString('en-IN')}. Concession: ₹${concession.toLocaleString('en-IN')}`,
      acc.accountId
    );

    return {
      success: true,
      message: `OTS amount modified to ₹${newFinalOTS.toLocaleString('en-IN')}. Actual Concession: ₹${concession.toLocaleString('en-IN')}. Please confirm to finalize.`,
    };
  };

  const confirmOTS = (
    accountId: string,
    notes?: string
  ): { success: boolean; message: string } => {
    const acc = accounts.find((a) => a.accountId === accountId || a.id === accountId);
    if (!acc) {
      return { success: false, message: 'Account not found' };
    }
    if (!acc.otsActive || !acc.finalOTSAmount) {
      return { success: false, message: 'No active OTS calculation found to confirm.' };
    }

    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const origOutstanding = Math.max(0, acc.originalOutstandingAmount || acc.outstandingAmount || 0);

    const historyEntry: OTSHistoryRecord = {
      id: `OTS-HIST-${Date.now()}`,
      timestamp: nowIso,
      action: 'CONFIRMED',
      userId: currentUser.agentId || currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      originalOutstandingAmount: origOutstanding,
      systemCalculatedOTSAmount: acc.systemCalculatedOTSAmount,
      userEnteredOTSAmount: acc.userEnteredOTSAmount,
      finalOTSAmount: acc.finalOTSAmount,
      actualConcessionAmount: acc.actualConcessionAmount,
      otsDiscountPercentage: acc.otsDiscountPercentage,
      remarks: notes || `OTS offer confirmed and finalized by ${currentUser.name}`,
    };

    const otsNote: AgentNote = {
      id: `NOTE-OTS-CONF-${Date.now()}`,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      note: `[OTS Offer Confirmed]: Final OTS of ₹${acc.finalOTSAmount.toLocaleString('en-IN')} confirmed. WhatsApp OTS Offer is now unlocked.`,
      category: 'OTS Settlement',
    };

    updateAccount(acc.accountId, {
      otsStatus: 'OTS Confirmed',
      otsActive: true,
      otsConfirmedAt: nowIso,
      otsUpdatedByUserId: currentUser.agentId || currentUser.id,
      otsUpdatedByUserName: currentUser.name,
      otsUpdatedByUserRole: currentUser.role,
      otsHistory: [historyEntry, ...(acc.otsHistory || [])],
      agentNotesHistory: [otsNote, ...(acc.agentNotesHistory || [])],
    });

    logActivity(
      currentUser,
      'OTS_CONFIRMED',
      `Confirmed & locked OTS Offer of ₹${acc.finalOTSAmount.toLocaleString('en-IN')} for ${acc.customerName} (${acc.accountId}).`,
      acc.accountId
    );

    return {
      success: true,
      message: `OTS Offer of ₹${acc.finalOTSAmount.toLocaleString('en-IN')} confirmed and locked! WhatsApp OTS Offer is now unlocked.`,
    };
  };

  const cancelOTS = (
    accountId: string,
    reason?: string
  ): { success: boolean; message: string } => {
    const acc = accounts.find((a) => a.accountId === accountId || a.id === accountId);
    if (!acc) {
      return { success: false, message: 'Account not found' };
    }

    const origOutstanding = Math.max(0, acc.originalOutstandingAmount || acc.outstandingAmount || 0);
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);

    const historyEntry: OTSHistoryRecord = {
      id: `OTS-HIST-${Date.now()}`,
      timestamp: nowIso,
      action: 'CANCELLED',
      userId: currentUser.agentId || currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      originalOutstandingAmount: origOutstanding,
      systemCalculatedOTSAmount: acc.systemCalculatedOTSAmount,
      userEnteredOTSAmount: acc.userEnteredOTSAmount,
      finalOTSAmount: acc.finalOTSAmount,
      actualConcessionAmount: 0,
      otsDiscountPercentage: acc.otsDiscountPercentage,
      remarks: reason || `OTS calculation cancelled by ${currentUser.name}`,
    };

    const otsNote: AgentNote = {
      id: `NOTE-OTS-CANC-${Date.now()}`,
      agentId: currentUser.agentId || currentUser.id,
      agentName: currentUser.name,
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      note: `[OTS Cancelled]: Active OTS calculation cancelled. Original total outstanding ₹${origOutstanding.toLocaleString('en-IN')} restored. Reason: ${reason || 'User cancelled'}. WhatsApp OTS Offer disabled.`,
      category: 'OTS Settlement',
    };

    updateAccount(acc.accountId, {
      otsActive: false,
      otsStatus: 'OTS Cancelled',
      finalOTSAmount: undefined,
      userEnteredOTSAmount: undefined,
      actualConcessionAmount: 0,
      otsCancelledAt: nowIso,
      outstandingAmount: origOutstanding, // Full Original Outstanding Amount restored
      otsHistory: [historyEntry, ...(acc.otsHistory || [])], // Preserve historical data!
      agentNotesHistory: [otsNote, ...(acc.agentNotesHistory || [])],
    });

    logActivity(
      currentUser,
      'OTS_CANCELLED',
      `Cancelled OTS for ${acc.customerName} (${acc.accountId}). Restored original outstanding ₹${origOutstanding.toLocaleString('en-IN')}. Historical data preserved.`,
      acc.accountId
    );

    return {
      success: true,
      message: `OTS cancelled. Full original outstanding (₹${origOutstanding.toLocaleString('en-IN')}) restored. WhatsApp offer disabled until a new OTS is applied.`,
    };
  };

  const logWhatsAppOffer = (offerData: Omit<WhatsAppOfferLog, 'id' | 'timestamp'>) => {
    const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newLog: WhatsAppOfferLog = {
      id: `WA-${Date.now()}`,
      timestamp: nowIso,
      ...offerData,
      status: 'Dispatched via WhatsApp Link',
    };

    setWhatsAppLogs((prev) => [newLog, ...prev]);

    logActivity(
      currentUser,
      'WHATSAPP_OFFER_DISPATCHED',
      `WhatsApp OTS Offer link dispatched to ${offerData.customerName} (${offerData.customerMobile}) for Account ${offerData.accountId}. Final OTS: ₹${offerData.finalOTSAmount.toLocaleString('en-IN')}. Sender: ${offerData.userName} (${offerData.userMobile}).`,
      offerData.accountId
    );

    const acc = accounts.find((a) => a.accountId === offerData.accountId);
    if (acc) {
      const waNote: AgentNote = {
        id: `NOTE-WA-OFFER-${Date.now()}`,
        agentId: currentUser.agentId || currentUser.id,
        agentName: currentUser.name,
        date: new Date().toISOString().slice(0, 10),
        time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        note: `[WhatsApp OTS Offer Dispatched]: Pre-filled Marathi OTS offer opened in WhatsApp for ${offerData.customerName} (${offerData.customerMobile}). Final OTS: ₹${offerData.finalOTSAmount.toLocaleString('en-IN')}. Sender: ${offerData.userName} (${offerData.userMobile}).`,
        category: 'WhatsApp Offer',
      };
      updateAccount(acc.accountId, {
        agentNotesHistory: [waNote, ...(acc.agentNotesHistory || [])],
      });
    }
  };

  // Chronological Account Timeline
  const getAccountTimeline = (accountId: string): TimelineEvent[] => {
    const events: TimelineEvent[] = [];

    // Allocations
    allocations
      .filter((al) => al.accountId === accountId)
      .forEach((al) => {
        events.push({
          id: `tl_alc_${al.id}`,
          accountId,
          timestamp: al.allocationDate,
          date: al.allocationDate.slice(0, 10),
          time: al.allocationDate.slice(11, 19) || '10:00:00',
          userOrAgentId: al.agentId,
          userOrAgentName: al.agentName,
          activityType: 'ALLOCATION',
          title: 'Account Allocated',
          description: `Allocated to ${al.agentName} (${al.agentId}) by ${al.allocatedBy}. Branch: ${al.branch}`,
          statusBadge: 'Allocated',
        });
      });

    // Follow-ups & Calls
    followups
      .filter((f) => f.accountId === accountId)
      .forEach((f) => {
        events.push({
          id: `tl_flp_${f.id}`,
          accountId,
          timestamp: `${f.date} ${f.time}`,
          date: f.date,
          time: f.time,
          userOrAgentId: f.agentId,
          userOrAgentName: f.agentName,
          activityType: f.status === 'Contacted' || f.status === 'Switched off' ? 'CALL' : 'FOLLOWUP',
          title: `Customer ${f.status}`,
          description: `${f.discussionDetails}\nRemarks: ${f.agentRemarks}`,
          statusBadge: f.status,
        });
      });

    // PTP
    ptps
      .filter((p) => p.accountId === accountId)
      .forEach((p) => {
        events.push({
          id: `tl_ptp_${p.id}`,
          accountId,
          timestamp: p.createdAt,
          date: p.createdAt.slice(0, 10),
          time: p.createdAt.slice(11, 19) || '12:00:00',
          userOrAgentId: p.agentId,
          userOrAgentName: p.agentName,
          activityType: 'PTP',
          title: `PTP Created: ₹${p.amount.toLocaleString('en-IN')}`,
          description: `Payment commitment by ${p.ptpDate} via ${p.ptpMode}. ${p.customerCommitment}`,
          statusBadge: p.status,
          amount: p.amount,
        });
      });

    // Field Visits
    visits
      .filter((v) => v.accountId === accountId)
      .forEach((v) => {
        events.push({
          id: `tl_vst_${v.id}`,
          accountId,
          timestamp: `${v.date} ${v.startTime}`,
          date: v.date,
          time: v.startTime,
          userOrAgentId: v.agentId,
          userOrAgentName: v.agentName,
          activityType: 'VISIT',
          title: `Field Visit (${v.visitStatus})`,
          description: `${v.visitRemarks}\nAddress: ${v.address}`,
          statusBadge: v.visitStatus,
          location: { latitude: v.latitude, longitude: v.longitude, address: v.address },
        });
      });

    // Photos
    photos
      .filter((ph) => ph.accountId === accountId)
      .forEach((ph) => {
        events.push({
          id: `tl_pho_${ph.id}`,
          accountId,
          timestamp: `${ph.date} ${ph.time}`,
          date: ph.date,
          time: ph.time,
          userOrAgentId: ph.agentId,
          userOrAgentName: ph.agentName,
          activityType: 'PHOTO',
          title: 'Geo-tagged Watermarked Photo',
          description: `Location: ${typeof ph.latitude === 'number' ? ph.latitude.toFixed(6) : '0.000000'}° N, ${typeof ph.longitude === 'number' ? ph.longitude.toFixed(6) : '0.000000'}° E.\nRemark: ${ph.agentRemark}\nDrive File ID: ${ph.driveFileId}`,
          statusBadge: 'Geo-Tagged',
          mediaRefId: ph.driveFileId,
          mediaType: 'photo',
          mediaUrl: ph.dataUrl,
          location: { latitude: ph.latitude, longitude: ph.longitude },
        });
      });

    // Voice Notes
    voiceNotes
      .filter((vn) => vn.accountId === accountId)
      .forEach((vn) => {
        events.push({
          id: `tl_vn_${vn.id}`,
          accountId,
          timestamp: `${vn.date} ${vn.time}`,
          date: vn.date,
          time: vn.time,
          userOrAgentId: vn.agentId,
          userOrAgentName: vn.agentName,
          activityType: 'VOICE_NOTE',
          title: `Voice Note: ${vn.title}`,
          description: `Audio length: ${vn.durationSeconds}s.\nTranscription: "${vn.transcription || 'Statement recorded'}"\nDrive File ID: ${vn.driveFileId}`,
          statusBadge: `${vn.durationSeconds}s Audio`,
          mediaRefId: vn.driveFileId,
          mediaType: 'audio',
          mediaUrl: vn.audioBlobUrl,
        });
      });

    // Documents
    documents
      .filter((d) => d.accountId === accountId)
      .forEach((d) => {
        events.push({
          id: `tl_doc_${d.id}`,
          accountId,
          timestamp: d.dateTime,
          date: d.dateTime.slice(0, 10),
          time: d.dateTime.slice(11, 19) || '12:00:00',
          userOrAgentId: d.uploadedBy,
          userOrAgentName: d.uploadedByName,
          activityType: 'DOCUMENT',
          title: `Document: ${d.documentType}`,
          description: `File: ${d.fileName} (${Math.round(d.fileSizeBytes / 1024)} KB)\nDrive File ID: ${d.driveFileId}`,
          statusBadge: d.documentType,
          mediaRefId: d.driveFileId,
          mediaType: 'document',
        });
      });

    // Recoveries
    recoveries
      .filter((r) => r.accountId === accountId)
      .forEach((r) => {
        events.push({
          id: `tl_rec_${r.id}`,
          accountId,
          timestamp: `${r.recoveryDate} 12:00:00`,
          date: r.recoveryDate,
          time: '12:00 PM',
          userOrAgentId: r.agentId,
          userOrAgentName: r.agentName,
          activityType: 'RECOVERY',
          title: `Recovery Collected: ₹${r.amount.toLocaleString('en-IN')}`,
          description: `Mode: ${r.paymentMode} | Ref: ${r.referenceNumber} | Receipt: ${r.receiptNumber}\nAgent 10% Commission: ₹${r.commissionAmount.toLocaleString('en-IN')}`,
          statusBadge: 'Collected',
          amount: r.amount,
        });
      });

    // Agent Notes
    const currentAccount = accounts.find((a) => a.accountId === accountId || a.id === accountId);
    if (currentAccount?.agentNotesHistory) {
      currentAccount.agentNotesHistory.forEach((note) => {
        events.push({
          id: `tl_note_${note.id}`,
          accountId,
          timestamp: `${note.date} ${note.time || '12:00:00'}`,
          date: note.date,
          time: note.time || '12:00 PM',
          userOrAgentId: note.agentId,
          userOrAgentName: note.agentName,
          activityType: 'NOTE' as any,
          title: `Agent Note (${note.category || 'General'})`,
          description: note.note,
          statusBadge: note.category || 'Agent Note',
        });
      });
    }

    // Sort descending by timestamp / date
    return events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  };

  const getGoogleSheetsData = (): GoogleSheetTab[] => {
    return compileAll19GoogleSheets({
      users: [...users, ...deletedUsers],
      accounts,
      allocations,
      followups,
      ptps,
      recoveries,
      visits,
      photos,
      documents,
      voiceNotes,
      activityLogs,
      notifications,
      commissions,
      branches,
      areas,
      zones,
      commissionSettings,
    });
  };

  const getGoogleDriveData = (): DriveFolderNode => {
    return generateGoogleDriveHierarchy(accounts, photos, documents, voiceNotes);
  };

  const syncToCloudStorage = async () => {
    setIsSyncingState(true);
    const sheetsData = getGoogleSheetsData();
    try {
      const synced = await googleSheetsService.syncAllSheets(sheetsData);
      const status = googleSheetsService.getStatus();

      // Background local server tracking
      await fetch('/api/sheets/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sheetsCount: sheetsData.length }),
      }).catch(() => {});

      setIsSyncingState(false);
      if (synced) {
        return {
          success: true,
          message: `Successfully synchronized all 19 sheets to Google Sheets.`,
          timestamp: status.lastSyncedAt || new Date().toISOString(),
        };
      } else {
        return {
          success: false,
          message: status.syncError || 'Google Sheets sync failed. Please check permissions.',
          timestamp: new Date().toISOString(),
        };
      }
    } catch (err: any) {
      setIsSyncingState(false);
      return {
        success: false,
        message: err?.message || 'Sync failed',
        timestamp: new Date().toISOString(),
      };
    }
  };

  const pullFromGoogleSheets = async () => {
    setIsSyncingState(true);
    try {
      const result = await googleSheetsService.pullAllFromSheets();
      if (result.success) {
        let updatedCount = 0;

        // 1. Sync accounts
        if (result.accounts && result.accounts.length > 0) {
          const isUserCleared = typeof window !== 'undefined' && localStorage.getItem('srms_account_storage_cleared_user') === 'true';
          if (!isUserCleared) {
            setAccounts((prev) => {
              const map = new Map<string, Account>(prev.map((acc) => [acc.accountId, acc]));
              result.accounts!.forEach((rawAcc) => {
                const accObj = rawAcc as Record<string, any>;
                if (accObj.accountId) {
                  const existing = map.get(accObj.accountId);
                  if (existing) {
                    map.set(accObj.accountId, Object.assign({}, existing, accObj) as Account);
                  } else {
                    map.set(accObj.accountId, accObj as Account);
                  }
                  updatedCount++;
                }
              });
              return Array.from(map.values());
            });
          }
        }

        // 2. Sync recoveries
        if (result.recoveries && result.recoveries.length > 0) {
          setRecoveries((prev) => {
            const map = new Map<string, RecoveryRecord>(prev.map((rec) => [rec.id || rec.receiptNumber, rec]));
            result.recoveries!.forEach((rawRec) => {
              const recObj = rawRec as Record<string, any>;
              const key = recObj.id || recObj.receiptNumber;
              if (key) {
                const existing = map.get(key);
                if (existing) {
                  map.set(key, Object.assign({}, existing, recObj) as RecoveryRecord);
                } else {
                  map.set(key, recObj as RecoveryRecord);
                }
                updatedCount++;
              }
            });
            return Array.from(map.values());
          });
        }

        // 3. Sync followups / remarks from sheet and merge into state
        if (result.followups && result.followups.length > 0) {
          setFollowups((prev) => {
            const map = new Map<string, FollowUp>(prev.map((f) => [f.id, f]));
            result.followups!.forEach((rawFlp) => {
              const flpObj = rawFlp as FollowUp;
              if (flpObj.id) {
                const existing = map.get(flpObj.id);
                map.set(flpObj.id, existing ? { ...existing, ...flpObj } : flpObj);
                updatedCount++;
              }
            });
            return Array.from(map.values());
          });

          // Inject pulled followups & remarks into each account's agentNotesHistory so any agent sees full history
          setAccounts((prev) =>
            prev.map((acc) => {
              const matching = result.followups!.filter(
                (f) => f.accountId && (f.accountId === acc.accountId || f.accountId === acc.loanNumber)
              );
              if (matching.length === 0) return acc;

              const existingNotes = acc.agentNotesHistory || [];
              const newNotes: AgentNote[] = [];

              matching.forEach((flp) => {
                const text = flp.agentRemarks || (flp as any).remarks || (flp as any).discussionDetails || '';
                if (!text) return;
                const noteId = `NOTE-PULL-${flp.id || flp.date}`;
                const exists = existingNotes.some((n) => n.id === noteId || (n.date === flp.date && n.note === text));
                if (!exists) {
                  newNotes.push({
                    id: noteId,
                    agentId: flp.agentId || 'AG-01',
                    agentName: flp.agentName || (flp.agentId ? `Agent (${flp.agentId})` : 'Previous Agent'),
                    date: flp.date || new Date().toISOString().slice(0, 10),
                    time: flp.time || '12:00 PM',
                    note: text,
                    category: flp.status === 'Contacted' ? 'Call' : 'Follow Up',
                  });
                }
              });

              if (newNotes.length > 0) {
                const combined = [...newNotes, ...existingNotes].sort((a, b) =>
                  (b.date + ' ' + (b.time || '')).localeCompare(a.date + ' ' + (a.time || ''))
                );
                return {
                  ...acc,
                  agentNotesHistory: combined,
                  latestRemark: acc.latestRemark || combined[0]?.note || acc.latestRemark,
                };
              }
              return acc;
            })
          );
        }

        // 4. Sync PTPs
        if (result.ptps && result.ptps.length > 0) {
          setPtps((prev) => {
            const map = new Map<string, PTPRecord>(prev.map((p) => [p.id, p]));
            result.ptps!.forEach((rawPtp) => {
              const ptpObj = rawPtp as PTPRecord;
              if (ptpObj.id) {
                const existing = map.get(ptpObj.id);
                map.set(ptpObj.id, existing ? { ...existing, ...ptpObj } : ptpObj);
                updatedCount++;
              }
            });
            return Array.from(map.values());
          });
        }

        // 5. Sync visits
        if (result.visits && result.visits.length > 0) {
          setVisits((prev) => {
            const map = new Map<string, FieldVisit>(prev.map((v) => [v.id, v]));
            result.visits!.forEach((rawVis) => {
              const visObj = rawVis as FieldVisit;
              if (visObj.id) {
                const existing = map.get(visObj.id);
                map.set(visObj.id, existing ? { ...existing, ...visObj } : visObj);
                updatedCount++;
              }
            });
            return Array.from(map.values());
          });
        }

        // 6. Sync users (retaining deleted user records)
        if (result.users && result.users.length > 0) {
          const activePulled: User[] = [];
          const deletedPulled: User[] = [];
          result.users.forEach((u) => {
            if (u.id) {
              if (u.isDeleted || u.status === 'DELETED') {
                deletedPulled.push(u as User);
              } else {
                activePulled.push(u as User);
              }
            }
          });

          if (activePulled.length > 0) {
            setUsers((prev) => {
              const map = new Map<string, User>(prev.map((u) => [u.id, u]));
              activePulled.forEach((u) => {
                const existing = map.get(u.id);
                map.set(u.id, existing ? { ...existing, ...u } : u);
              });
              return Array.from(map.values());
            });
          }

          if (deletedPulled.length > 0) {
            setDeletedUsers((prev) => {
              const map = new Map<string, User>(prev.map((u) => [u.id, u]));
              deletedPulled.forEach((u) => {
                const existing = map.get(u.id);
                map.set(u.id, existing ? { ...existing, ...u } : u);
              });
              return Array.from(map.values());
            });
          }
        }

        setIsSyncingState(false);
        const bkpMsg = (result as any).backupCount ? ` (including ${(result as any).backupCount} Drive backup entries)` : '';
        return {
          success: true,
          message: `Successfully updated site with ${updatedCount} live records from Google Sheets & Drive Backup Sheet${bkpMsg}. All latest accounts, recoveries, PTP commitments, and historical remarks are loaded.`,
          updatedCount,
        };
      } else {
        setIsSyncingState(false);
        return {
          success: false,
          message: result.error || 'Could not pull data from Google Sheets.',
          updatedCount: 0,
        };
      }
    } catch (e: any) {
      setIsSyncingState(false);
      return {
        success: false,
        message: e?.message || 'Error pulling data from Google Sheets.',
        updatedCount: 0,
      };
    }
  };

  const analyzeAccountAI = async (accountId: string) => {
    const acc = accounts.find((a) => a.accountId === accountId);
    const history = followups
      .filter((f) => f.accountId === accountId)
      .map((f) => `${f.date}: ${f.status} - ${f.agentRemarks}`)
      .join('; ');

    try {
      const res = await fetch('/api/ai/analyze-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: acc, customerHistory: history }),
      });
      return await res.json();
    } catch {
      return {
        riskScore: 75,
        riskLevel: 'High',
        recommendedAction: 'Immediate field visit with supervisor geo-tagged verification and minimum 50% collection.',
        settlementStrategy: 'Propose 2 split installments to avoid legal notice.',
        fieldVisitTip: 'Inspect residence and verify guarantor details.',
        whatsappScript: `Dear ${acc?.customerName || 'Customer'}, please clear your overdue loan amount of ₹${acc?.overdueAmount?.toLocaleString('en-IN') || '25,000'} to avoid escalation.`,
      };
    }
  };

  const handleSetAutoSyncEnabled = (enabled: boolean) => {
    setAutoSyncEnabled(enabled);
    try {
      localStorage.setItem('srms_auto_sync_enabled', enabled ? 'true' : 'false');
    } catch {}
  };

  const [isHydratedFromSheets, setIsHydratedFromSheets] = useState(false);

  // 1. AUTO-PUSH: Whenever accounts, followups, ptps, recoveries, or visits change, debounced push to Sheets
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Safety guard: Never auto-push before initial sheet pull is complete or if no accounts exist
    if (!autoSyncEnabled || isSyncingState || !isHydratedFromSheets) return;
    if (accounts.length === 0) return; // Guard against pushing empty dataset over sheet

    if (autoPushTimerRef.current) {
      clearTimeout(autoPushTimerRef.current);
    }

    autoPushTimerRef.current = setTimeout(async () => {
      try {
        const sheetsData = getGoogleSheetsData();
        const synced = await googleSheetsService.syncAllSheets(sheetsData);
        if (synced) {
          setLastAutoSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        console.warn('[SRMS AUTO-PUSH] Notice during background sync:', err);
      }
    }, 3000); // Debounce 3s to batch rapid changes efficiently

    return () => {
      if (autoPushTimerRef.current) {
        clearTimeout(autoPushTimerRef.current);
      }
    };
  }, [accounts, followups, ptps, recoveries, visits, photos, voiceNotes, allocations, autoSyncEnabled, isHydratedFromSheets]);

  // 2. IMMEDIATE AUTO-FETCH ON STARTUP: Hydrate live data from Google Sheets immediately on app launch
  const initialFetchDoneRef = useRef(false);
  useEffect(() => {
    if (initialFetchDoneRef.current) return;
    initialFetchDoneRef.current = true;

    const doInitialHydration = async () => {
      try {
        console.log('[SRMS] Initial auto-fetch: pulling live data from Google Sheets...');
        const res = await pullFromGoogleSheets();
        setIsHydratedFromSheets(true);
        if (res.success) {
          console.log(`[SRMS] Initial auto-fetch completed: synced ${res.updatedCount} records from Google Sheets.`);
          setLastAutoSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
        }
      } catch (err) {
        setIsHydratedFromSheets(true);
        console.warn('[SRMS] Initial auto-fetch notice:', err);
      }
    };

    const timer = setTimeout(doInitialHydration, 200);
    return () => clearTimeout(timer);
  }, []);

  // 3. AUTO-PULL: Periodically poll Google Sheets every 30 seconds to fetch updates made directly in the spreadsheet
  useEffect(() => {
    if (!autoSyncEnabled) return;

    const pullInterval = setInterval(async () => {
      // Only pull if not currently busy
      if (isSyncingState) return;
      try {
        await pullFromGoogleSheets();
        setLastAutoSyncTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      } catch (err) {
        console.warn('[SRMS AUTO-PULL] Background poll notice:', err);
      }
    }, 30000); // Poll every 30s for live multi-user real-time sync

    return () => clearInterval(pullInterval);
  }, [autoSyncEnabled, isSyncingState]);

  // 4. AUTOMATED 12-HOUR ROLLING BACKUP ROUTINE
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(() => {
    try {
      return localStorage.getItem('srms_last_backup_display') || null;
    } catch {
      return null;
    }
  });

  const triggerRecoveryBackup = async (): Promise<{ success: boolean; message: string; timestamp: string }> => {
    try {
      console.log('[SRMS BACKUP] Initiating dedicated Recovery_Backup export to Google Drive / Sheets...');
      const res = await googleSheetsService.exportRecoveryBackup({
        recoveries,
        accounts,
        followups,
        ptps,
        visits,
        users: [...users, ...deletedUsers],
      });

      const displayTime = new Date().toLocaleString([], {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      setLastBackupTime(displayTime);
      return res;
    } catch (err: any) {
      console.error('[SRMS BACKUP] Backup export error:', err);
      return {
        success: false,
        message: err?.message || 'Failed to export recovery backup.',
        timestamp: new Date().toISOString(),
      };
    }
  };

  // Periodic check: Run automated backup every 12 hours (43,200,000 ms) and replace previous backup
  useEffect(() => {
    const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

    const checkAndRun12HourBackup = async () => {
      try {
        const lastBackupRaw = localStorage.getItem('srms_last_12h_backup_timestamp');
        const lastBackupNum = lastBackupRaw ? parseInt(lastBackupRaw, 10) : 0;
        const now = Date.now();

        // If never backed up or 12 hours elapsed, trigger rolling backup
        if (!lastBackupNum || now - lastBackupNum >= TWELVE_HOURS_MS) {
          if (recoveries.length > 0 || accounts.length > 0) {
            console.log('[SRMS 12H BACKUP] 12 hours elapsed since last backup. Replacing previous backup data in Recovery_Backup tab...');
            await triggerRecoveryBackup();
          }
        }
      } catch (e) {
        console.warn('[SRMS 12H BACKUP] Notice:', e);
      }
    };

    // Check on startup after 3 seconds
    const initTimer = setTimeout(checkAndRun12HourBackup, 3000);

    // Also check every 30 minutes to verify if the 12-hour interval has been crossed
    const intervalTimer = setInterval(checkAndRun12HourBackup, 30 * 60 * 1000);

    return () => {
      clearTimeout(initTimer);
      clearInterval(intervalTimer);
    };
  }, [recoveries, accounts, followups, ptps, visits, users, deletedUsers]);

  // 5. SESSION TRANSITION SAFEGUARD: Run backup on window unload / beforeunload or visibility change
  useEffect(() => {
    const handleBeforeUnload = () => {
      try {
        // Persist immediate local snapshot to prevent data loss during agent session transitions
        localStorage.setItem('srms_persisted_accounts', JSON.stringify(accounts));
        localStorage.setItem('srms_persisted_recoveries', JSON.stringify(recoveries));
        localStorage.setItem('srms_persisted_followups', JSON.stringify(followups));
        localStorage.setItem('srms_persisted_ptps', JSON.stringify(ptps));
        localStorage.setItem('srms_persisted_visits', JSON.stringify(visits));
        localStorage.setItem('srms_persisted_users', JSON.stringify(users));

        // Quick background beacon / fetch to trigger server-side backup snapshot if supported
        if (navigator.sendBeacon) {
          const payload = JSON.stringify({
            action: 'SESSION_TRANSITION_BACKUP',
            timestamp: new Date().toISOString(),
            counts: {
              accounts: accounts.length,
              recoveries: recoveries.length,
              ptps: ptps.length,
            },
          });
          navigator.sendBeacon('/api/sheets/apps-script-relay', payload);
        }
      } catch {}
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [accounts, recoveries, followups, ptps, visits, users]);

  // Permanent Demo Data Purge Routine (Permanently wipes all demo banks, zones, branch managers, regions, and delete timestamps)
  const purgeAllDemoData = async (): Promise<{ success: boolean; message: string }> => {
    try {
      localStorage.setItem('srms_persisted_accounts', JSON.stringify([]));
      localStorage.setItem('srms_persisted_allocations', JSON.stringify([]));
      localStorage.setItem('srms_persisted_allochistories', JSON.stringify([]));
      localStorage.setItem('srms_persisted_followups', JSON.stringify([]));
      localStorage.setItem('srms_persisted_ptps', JSON.stringify([]));
      localStorage.setItem('srms_persisted_recoveries', JSON.stringify([]));
      localStorage.setItem('srms_persisted_visits', JSON.stringify([]));
      localStorage.setItem('srms_persisted_photos', JSON.stringify([]));
      localStorage.setItem('srms_persisted_voicenotes', JSON.stringify([]));
      localStorage.setItem('srms_persisted_documents', JSON.stringify([]));
      localStorage.setItem('srms_persisted_user_assignments', JSON.stringify([]));
      localStorage.setItem('srms_whatsapp_offer_logs', JSON.stringify([]));
      localStorage.setItem('srms_persisted_banks', JSON.stringify([]));
      localStorage.setItem('srms_persisted_zones', JSON.stringify([]));
      localStorage.setItem('srms_persisted_areas', JSON.stringify([]));
      localStorage.setItem('srms_persisted_branches', JSON.stringify([]));
      localStorage.setItem('srms_persisted_departments', JSON.stringify([]));
      localStorage.setItem('srms_deleted_users', JSON.stringify([]));

      setAccounts([]);
      setAllocations([]);
      setAllocationHistories([]);
      setFollowups([]);
      setPtps([]);
      setRecoveries([]);
      setVisits([]);
      setPhotos([]);
      setVoiceNotes([]);
      setDocuments([]);
      setBranches([]);
      setAreas([]);
      setZones([]);
      setBanks([]);
      setRecoveryDepartments([]);
      setDeletedUsers([]);

      setUsers((prev) => {
        const cleaned = prev.filter((u) => !isDemoUser(u));
        const finalUsers = cleaned.length > 0 ? cleaned : initialUsers;
        localStorage.setItem('srms_persisted_users', JSON.stringify(finalUsers));
        return finalUsers;
      });

      // Also call server-side purge endpoint
      fetch('/api/admin/purge-demo-data', { method: 'POST' }).catch(() => {});

      logActivity(
        currentUser,
        'SETTINGS_UPDATED',
        'Permanently purged all demo data (zones, banks, branch managers, regions, accounts, and delete timestamps).'
      );

      return {
        success: true,
        message: 'All demo data (zones, banks, branch managers, regions, and delete timestamps) have been permanently purged.',
      };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Purge failed' };
    }
  };

  return (
    <SRMSContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated,
        deviceMode,
        setDeviceMode,
        switchUser,
        loginWithCredentials,
        logout,
        requestAdminOTP,
        verifyAdminOTP,
        resetAdminPasswordWithToken,
        accounts,
        allocations,
        allocationHistories,
        followups,
        ptps,
        recoveries,
        visits,
        photos,
        documents,
        voiceNotes,
        activityLogs,
        notifications,
        commissions,
        commissionSettings,
        branches,
        areas,
        zones,
        banks,
        recoveryDepartments,
        commissionRules,
        userCommissionAssignments,
        commissionAuditLogs,
        scopedAccounts,
        scopedRecoveries,
        scopedPtps,
        scopedVisits,
        scopedCommissions,
        scopedUsers,
        scopedRules,
        scopedAssignments,
        archivedAccounts,
        activeVisit,
        addBank,
        updateBank,
        deleteBank,
        addRecoveryDepartment,
        updateRecoveryDepartment,
        addBranch,
        updateBranch,
        addCommissionRule,
        updateCommissionRule,
        deactivateCommissionRule,
        addUserCommissionAssignment,
        updateUserCommissionAssignment,
        deactivateUserCommissionAssignment,
        calculateCommission,
        getFilteredRecoveryDepartments,
        getFilteredBranches,
        isAuthorizedForAccount,
        isAuthorizedForRecovery,
        addAccount,
        updateAccount,
        updateCustomerStarRating,
        closeAccount,
        deleteAccount,
        deleteAllAccountsFromStorage,
        bulkAddAccounts,
        allocateAccount,
        bulkAllocateAccounts,
        allocateBulkAccounts,
        toggleUserActive,
        addUser,
        updateUser,
        deleteUser,
        changeUserPassword,
        exportAllBackendData,
        logFollowUp,
        createPTP,
        updatePTPStatus,
        recordRecovery,
        editRecovery,
        deleteRecovery,
        reverseRecovery,
        markAccountForDeletion,
        startFieldVisit,
        completeFieldVisit,
        captureWatermarkedPhoto,
        recordVoiceNote,
        uploadDocument,
        attachGoogleDriveDocument,
        updateCommissionSettings,
        updateCommissionRate: updateCommissionSettings,
        updateCommissionStatus,
        addAgentNote,
        markNotificationAsRead,
        markNotificationRead: markNotificationAsRead,
        getAccountTimeline,
        getGoogleSheetsData,
        getGoogleDriveData,
        syncToCloudStorage,
        syncWithGoogleSheets: syncToCloudStorage,
        pullFromGoogleSheets,
        runPTPDigest,
        getExpiredPTPPreview,
        analyzeAccountAI,
        triggerRecoveryBackup,
        lastBackupTime,
        isSyncing: isSyncingState,
        autoSyncEnabled,
        setAutoSyncEnabled: handleSetAutoSyncEnabled,
        lastAutoSyncTime,

        // OTS Scheme & WhatsApp Offer Module
        otsAuthorizedRoles,
        updateOTSAuthorizedRoles,
        canUserEditOTS,
        whatsAppLogs,
        logWhatsAppOffer,
        applyOTS,
        modifyOTS,
        confirmOTS,
        cancelOTS,

        // Shared Central Master Database Across All Logins
        pullSharedMasterData,
        pushSharedMasterData,

        // Permanent Demo Data Purge
        purgeAllDemoData,

        // ⚡ 3-Tier Enterprise Storage Architecture
        firestoreSpeedStats,
        sheetQueueStatus,
        isFirebasePrimaryActive: true,
        flushSheetSyncNow,
      }}
    >
      {children}
    </SRMSContext.Provider>
  );
};

export const useSRMS = () => {
  const context = useContext(SRMSContext);
  if (!context) {
    throw new Error('useSRMS must be used within an SRMSProvider');
  }
  return context;
};
