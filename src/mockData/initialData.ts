import {
  User,
  Branch,
  Area,
  Zone,
  Bank,
  RecoveryDepartment,
  CommissionRule,
  UserCommissionAssignment,
  CommissionAuditLog,
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
} from '../types';
import { hashPasswordSync } from '../utils/security';

export const initialBanks: Bank[] = [];

export const initialZones: Zone[] = [];

export const initialRecoveryDepartments: RecoveryDepartment[] = [];

export const initialAreas: Area[] = [];

export const initialBranches: Branch[] = [];

export const initialUsers: User[] = [
  {
    id: 'USR-ADMIN-1',
    username: 'admin',
    name: 'Ashish Kharad (Admin)',
    email: 'Ashish.kharad2@gmail.com',
    role: 'admin',
    mobile: '+91 98220 11223',
    joiningDate: '2023-01-15',
    active: true,
    branch: 'Head Office',
    area: 'Central',
    zone: 'Central',
    password: 'Admin@2026',
    passwordSalt: 'srms_admin_salt_892',
    passwordHash: hashPasswordSync('Admin@2026', 'srms_admin_salt_892'),
    tokenVersion: 1,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
];

export const initialCommissionRules: CommissionRule[] = [
  {
    id: 'RULE-001',
    ruleCode: 'SBI-ALL-DFT',
    name: 'SBI Standard Bank Default Commission',
    bankName: 'State Bank of India',
    commissionPercentage: 9.0,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priorityLevel: 5,
    remarks: 'Base level bank default commission for all normal collections',
    createdAt: '2026-01-01 10:00:00',
    createdBy: 'USR-ADMIN-1',
    createdByName: 'Ashish Kharad (Admin)',
  },
  {
    id: 'RULE-002',
    ruleCode: 'SBI-MNZ-DFT',
    name: 'SBI Maharashtra North Zone Standard',
    bankName: 'State Bank of India',
    zoneName: 'Maharashtra North Zone',
    commissionPercentage: 10.0,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priorityLevel: 4,
    remarks: 'Zonal incentive rate for North Zone Maharashtra operations',
    createdAt: '2026-01-01 10:00:00',
    createdBy: 'USR-ADMIN-1',
    createdByName: 'Ashish Kharad (Admin)',
  },
  {
    id: 'RULE-003',
    ruleCode: 'SBI-MNZ-QD-NPA',
    name: 'SBI North Zone Hard NPA / Written-Off QD Recovery',
    bankName: 'State Bank of India',
    zoneName: 'Maharashtra North Zone',
    qdType: 'Critical NPA',
    recoveryStage: 'All Stages',
    commissionPercentage: 12.5,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priorityLevel: 3,
    remarks: 'Special recovery commission for critical NPA accounts in North Zone',
    createdAt: '2026-01-01 10:00:00',
    createdBy: 'USR-ADMIN-1',
    createdByName: 'Ashish Kharad (Admin)',
  },
  {
    id: 'RULE-004',
    ruleCode: 'SBI-MNZ-CSM-QD-WO',
    name: 'SBI Chhatrapati Sambhajinagar Main Critical Branch Rule',
    bankName: 'State Bank of India',
    zoneName: 'Maharashtra North Zone',
    branchName: 'Chhatrapati Sambhajinagar Main',
    qdType: 'Written-Off',
    recoveryStage: 'Full Settlement / Closed',
    commissionPercentage: 14.0,
    effectiveFrom: '2026-01-01',
    status: 'active',
    priorityLevel: 2,
    remarks: 'Branch-level top performance rule for fully closing Written-Off accounts',
    createdAt: '2026-01-01 10:00:00',
    createdBy: 'USR-ADMIN-1',
    createdByName: 'Ashish Kharad (Admin)',
  },
];

export const initialUserCommissionAssignments: UserCommissionAssignment[] = [];

export const initialCommissionAuditLogs: CommissionAuditLog[] = [
  {
    id: 'CAL-001',
    timestamp: '2026-01-01 10:00:00',
    actorId: 'USR-ADMIN-1',
    actorName: 'Ashish Kharad (Admin)',
    actorRole: 'admin',
    actionType: 'RULE_CREATED',
    targetType: 'RULE',
    targetId: 'RULE-001',
    targetName: 'SBI Standard Bank Default Commission',
    newValues: { commissionPercentage: 9.0, status: 'active', priorityLevel: 5 },
    hierarchyContext: { bank: 'State Bank of India' },
    notes: 'Initial bank default commission rule provisioned into system.',
  },
];

export const initialCommissionSettings: CommissionSettings = {
  defaultRate: 10.0, // Default 10%
  minimumPayoutAmount: 500,
  autoApprovalThreshold: 25000,
};

export const initialAccounts: Account[] = [];
export const initialAccountAllocations: AccountAllocation[] = [];
export const initialAllocationHistories: AllocationHistory[] = [];
export const initialFollowUps: FollowUp[] = [];
export const initialPTPs: PTPRecord[] = [];
export const initialRecoveries: RecoveryRecord[] = [];
export const initialVisits: FieldVisit[] = [];
export const initialPhotos: PhotoRecord[] = [];
export const initialVoiceNotes: VoiceNoteRecord[] = [];
export const initialDocuments: DocumentRecord[] = [];
export const initialCommissions: CommissionRecord[] = [];

export const initialActivityLogs: ActivityLog[] = [
  {
    id: 'ACT-001',
    timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    userId: 'USR-ADMIN-1',
    userName: 'Ashish Kharad (Admin)',
    role: 'admin',
    actionType: 'SETTINGS_UPDATED',
    details: 'Master hierarchical recovery & commission management system initialized.',
  },
];

export const initialNotifications: NotificationItem[] = [];
