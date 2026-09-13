export type UserRole =
  | 'admin'
  | 'recovery_department'
  | 'branch_manager'
  | 'coordinator'
  | 'agent'
  | 'management';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  bank?: string;
  bankId?: string;
  department?: string;
  departmentId?: string;
  agencyName?: string;
  zonalOffice?: string;
  regionalOffice?: string;
  branch: string;
  branchId?: string;
  area: string;
  zone: string;
  zoneId?: string;
  agentId?: string; // e.g. RA-0045
  mobile: string;
  joiningDate: string;
  active: boolean;
  pin?: string;
  password?: string;
  passwordHash?: string;
  passwordSalt?: string;
  tokenVersion?: number;
  avatarUrl?: string;
  monthlyTarget?: number;
  isDeleted?: boolean;
  deletedAt?: string;
  deletedBy?: string;
  status?: string;
}

export interface OTPRequestState {
  requestId: string;
  identifier: string;
  maskedEmail: string;
  maskedMobile: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
}

export interface AuthSession {
  token: string;
  user: User;
  tokenVersion: number;
  createdAt: string;
  expiresAt: string;
}

export type LoanType = 'Personal Loan' | 'Two Wheeler Loan' | 'Auto Loan' | 'Home Loan' | 'Business Loan' | 'Gold Loan' | 'Credit Card';
export type CustomerCategory =
  | 'High Priority – Follow Up Strongly'
  | 'Will Pay Safely (Easy Recovery)'
  | 'Bad Intention (Will Avoid Paying)'
  | 'No Intention (Legal Action Only)'
  | 'High Risk'
  | 'Medium Risk'
  | 'Low Risk'
  | 'Critical NPA'
  | 'Hard Core Defaulter'
  | 'Skip / Trace Required'
  | string;
export type AccountStatus =
  | 'Active'
  | 'PTP Pending'
  | 'PTP Broken'
  | 'Recovered'
  | 'Disputed'
  | 'Legal Action'
  | 'Closed'
  | 'Closed as per OTS'
  | 'Regular Close'
  | 'OTS Processing'
  | 'OTS Settled – Customer Account Closed'
  | 'Untraceable'
  | 'Field Visit Needed';

export interface LinkedAccountSummary {
  accountId: string;
  loanNumber?: string;
  loanType: LoanType | string;
  balance: number;
  npaDate: string;
  facility?: string;
  branch?: string;
  status?: string;
  overdueAmount?: number;
}

export interface AgentNote {
  id: string;
  agentId: string;
  agentName: string;
  date: string;
  time: string;
  note: string;
  category?:
    | 'General'
    | 'PTP'
    | 'PTP Commitment'
    | 'Dispute'
    | 'Address Verification'
    | 'Legal'
    | 'Legal / Notice'
    | 'Call'
    | 'Visit'
    | 'Field Visit'
    | 'Follow Up'
    | 'Payment Collection'
    | string;
}

export interface Account {
  id: string;
  accountId: string; // e.g. ACC-10254 / ACCT_NO
  loanNumber: string;
  customerName: string; // NAME
  mobile: string; // CONTACT NO.
  alternateMobile?: string;
  address: string; // ADDRESS
  city: string;
  bank?: string;
  bankId?: string;
  department?: string;
  departmentId?: string;
  branch: string; // BRANCH_NAME
  branchId?: string;
  branchCode?: string; // BRANCH_COD
  facility?: string; // FACILITY (Term Loan, Overdraft, etc.)
  npaDate?: string; // NPA_DT
  customerCode?: string; // CUSTOMER ID / CIF
  area: string;
  zone: string;
  zoneId?: string;
  qdType?: QDType; // e.g. SMA-0, SMA-1, SMA-2, NPA, Written-Off
  loanType: LoanType; // PROD_DESC
  sanctionAmount: number; // LIMIT_SANCTI
  outstandingAmount: number; // LOAN_B
  customerBalance?: number; // Total Overdue Balance for NPA Customers
  overdueAmount: number;
  emi: number;
  ptpCount: number; // Number of PTP (Promise To Pay) commitments
  dpd?: number; // Optional legacy field
  customerCategory: CustomerCategory;
  shortlistCategory?: string;
  regionalOffice?: string;
  zonalOffice?: string;
  accountStatus: AccountStatus;
  assignedAgentId: string;
  assignedAgentName: string;
  coordinatorId: string;
  coordinatorName: string;
  allocationDate: string;
  lastFollowUpDate?: string;
  lastFollowUpStatus?: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  ptpStatus?: 'None' | 'Pending' | 'Achieved' | 'Broken';
  recoveryStatus?: 'Pending' | 'Partially Recovered' | 'Fully Recovered';
  otsStatus?: 'None' | 'OTS 10% Paid - Sanction In Progress' | 'OTS Settled – Customer Account Closed' | 'OTS Applied' | 'OTS Confirmed' | 'OTS Cancelled';
  otsAgreedAmount?: number;
  ots10PercentPaidAmount?: number;
  otsDiscountAmount?: number;
  // Specific OTS Scheme Fields per specification:
  otsActive?: boolean;
  otsSlabDefined?: boolean;
  otsSlabName?: string;
  originalOutstandingAmount?: number;
  systemCalculatedOTSAmount?: number;
  userEnteredOTSAmount?: number;
  finalOTSAmount?: number;
  actualConcessionAmount?: number;
  otsDiscountPercentage?: number;
  otsValidTill?: string;
  otsCalculatedAt?: string;
  otsModifiedAt?: string;
  otsConfirmedAt?: string;
  otsCancelledAt?: string;
  otsUpdatedByUserId?: string;
  otsUpdatedByUserName?: string;
  otsUpdatedByUserRole?: UserRole;
  otsHistory?: OTSHistoryRecord[];
  lastVisitLatitude?: number;
  lastVisitLongitude?: number;
  lastGeoPhotoDate?: string;
  totalRecovered: number;
  latitude: number;
  longitude: number;
  coordinates?: string;
  notes?: string;
  latestRemark?: string;
  riskClassification?: CustomerCategory;
  // Customer Classification: 0 to 5 Star Rating & Prime Customer
  customerStarRating?: number; // 0 to 5 stars (0 = unclassified, 5 = highest tier prime customer)
  isPrimeCustomer?: boolean; // Fast tracking flag for 4 or 5 star prime customers
  starRatingUpdatedBy?: string;
  starRatingUpdatedAt?: string;
  // Account Closure Audit
  closureType?: 'Closed as per OTS' | 'Regular Close' | 'Administrative Deletion';
  closureDate?: string;
  closureRemarks?: string;
  // Multiple account identification (linked customer loans)
  isMultipleAccount?: boolean;
  multipleAccountsCount?: number;
  linkedAccountIds?: string[];
  linkedAccounts?: LinkedAccountSummary[];
  multipleAccountReason?: string;
  // Comprehensive Agent Notes History
  agentNotesHistory?: AgentNote[];
  // All uploaded / imported custom data fields from bank spreadsheets
  customFields?: Record<string, any>;
}

export interface ExcelAccountImportRow {
  ZONE?: string;
  AREA?: string;
  CITY?: string;
  COORDINATES?: string;
  BRANCH_COD?: string | number;
  BRANCH_NAME?: string;
  ACCT_NO?: string | number;
  NAME?: string;
  CUSTOMER_NAME?: string;
  CUSTOMER_ID?: string | number;
  PROD_DESC?: string;
  FACILITY?: string;
  LIMIT_SANCTI?: string | number;
  SANCTION_LIMIT?: string | number;
  LOAN_B?: string | number;
  LOAN_BALANCE?: string | number;
  NPA_DT?: string | number;
  NPA_DATE?: string | number;
  'CONTACT NO.'?: string | number;
  CONTACT_NO?: string | number;
  CUSTOMER?: string | number;
  CUSTOMER_BALANCE?: string | number;
  CUSTOMER_BAL?: string | number;
  ADDRESS?: string;
  AGENT_ID?: string;
  AGENT_NAME?: string;
  ASSIGNED_AGENT_ID?: string;
  ASSIGNED_AGENT_NAME?: string;
  RISK_CLASSIFICATION?: string;
  LATEST_REMARK?: string;
  REMARK?: string;
  [key: string]: any;
}

export interface AccountAllocation {
  id: string;
  accountId: string;
  agentId: string;
  agentName: string;
  coordinatorId: string;
  allocatedBy: string;
  allocationDate: string;
  branch: string;
  area: string;
  zone: string;
  remarks?: string;
}

export interface AllocationHistory {
  id: string;
  accountId: string;
  previousAgentId: string;
  previousAgentName: string;
  newAgentId: string;
  newAgentName: string;
  reallocatedBy: string;
  date: string;
  reason: string;
}

export type FollowUpCallStatus =
  | 'Contacted'
  | 'Not contacted'
  | 'Wrong number'
  | 'Switched off'
  | 'Unavailable'
  | 'Refused'
  | 'Promised payment'
  | 'Paid'
  | 'Dispute'
  | 'Other';

export interface FollowUp {
  id: string;
  accountId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  date: string;
  time: string;
  status: FollowUpCallStatus;
  customerResponse: string;
  discussionDetails: string;
  agentRemarks: string;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
}

export type PTPStatus = 'Pending' | 'Achieved' | 'Broken' | 'Cancelled';
export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Cheque' | 'POS Card';

export interface PTPRecord {
  id: string;
  accountId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  amount: number;
  ptpDate: string; // YYYY-MM-DD
  ptpMode: PaymentMode;
  customerCommitment: string;
  remarks: string;
  status: PTPStatus;
  createdAt: string;
  resolvedDate?: string;
}

export interface RecoveryRecord {
  id: string;
  recoveryId: string; // e.g. REC-9821
  accountId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  amount: number;
  recoveryDate: string;
  referenceNumber: string;
  paymentMode: PaymentMode;
  remarks: string;
  receiptNumber: string;
  proofDriveFileId?: string;
  bank?: string;
  bankId?: string;
  department?: string;
  departmentId?: string;
  branch: string;
  zone: string;
  managerId?: string;
  managerName?: string;
  qdType?: QDType;
  recoveryStage?: RecoveryStage;
  eligibleAmount?: number;
  commissionAmount: number; // calculated according to prioritized rule
  commissionPercentage: number; // applied percentage
  appliedCommissionRuleId?: string;
  appliedCommissionRuleName?: string;
  appliedAssignmentId?: string;
  appliedPriorityLevel?: number; // 1 to 5
  commissionCalculatedAt?: string;
  commissionPaidStatus: 'Pending' | 'Approved' | 'Paid';
  isOTS?: boolean;
  otsStage?: '10_percent_token' | 'full_settlement';
  otsAgreedAmount?: number;
  otsDiscountAmount?: number;
  isReversed?: boolean;
  reversalReason?: string;
  reversedAt?: string;
  reversedBy?: string;
  reversedByName?: string;
  isAdminRecovery?: boolean;
  adminRecordedBy?: string;
}

export type VisitStatus =
  | 'In Progress'
  | 'Customer Met'
  | 'Door Locked'
  | 'Address Shifted'
  | 'Neighbour Inquired'
  | 'Payment Collected'
  | 'Refused'
  | 'PTP Obtained';

export interface FieldVisit {
  id: string;
  visitId: string; // e.g. VST-4091
  accountId: string;
  customerName: string;
  agentId: string;
  agentName: string;
  date: string;
  startTime: string;
  endTime?: string;
  latitude: number;
  longitude: number;
  address: string;
  visitStatus: VisitStatus;
  visitRemarks: string;
  customerInteraction: string;
  photoDriveFileIds: string[];
  voiceNoteDriveFileIds: string[];
  accuracyMeters: number;
}

export interface PhotoRecord {
  id: string;
  photoId: string; // e.g. PHO-1049
  accountId: string;
  customerId: string;
  agentId: string;
  agentName: string;
  date: string;
  time: string;
  latitude: number;
  longitude: number;
  visitId?: string;
  agentRemark: string;
  driveFileId: string; // e.g. DRV_IMG_9941
  driveFolder: string;
  dataUrl: string; // Base64 preview of watermarked image
  watermarkText: string;
  uploadStatus: 'Uploaded' | 'Pending';
}

export interface VoiceNoteRecord {
  id: string;
  voiceNoteId: string; // e.g. VN-5021
  accountId: string;
  agentId: string;
  agentName: string;
  date: string;
  time: string;
  durationSeconds: number;
  visitId?: string;
  driveFileId: string; // e.g. DRV_AUD_3042
  driveFolder?: string;
  webViewLink?: string;
  audioBlobUrl?: string;
  transcription?: string;
  title: string;
}

export type DocumentType =
  | 'PAN / Aadhaar KYC'
  | 'Salary / Income Proof'
  | 'Recovery Payment Receipt'
  | 'Visit Panchnama Proof'
  | 'Legal Demand Notice'
  | 'Asset / Vehicle Photo'
  | 'Dispute Settlement Form'
  | 'Bank Statement';

export interface DocumentRecord {
  id: string;
  documentId: string;
  accountId: string;
  customerName: string;
  documentType: DocumentType;
  uploadedBy: string;
  uploadedByName: string;
  dateTime: string;
  driveFileId: string;
  fileName: string;
  fileSizeBytes: number;
  fileUrl?: string;
}

export interface OTSHistoryRecord {
  id: string;
  timestamp: string;
  action: 'CALCULATED' | 'MODIFIED' | 'CONFIRMED' | 'CANCELLED';
  userId: string;
  userName: string;
  userRole: UserRole;
  originalOutstandingAmount: number;
  systemCalculatedOTSAmount?: number;
  userEnteredOTSAmount?: number;
  finalOTSAmount?: number;
  actualConcessionAmount?: number;
  otsDiscountPercentage?: number;
  remarks?: string;
}

export interface WhatsAppOfferLog {
  id: string;
  timestamp: string;
  customerName: string;
  accountId: string;
  loanNumber?: string;
  bankName?: string;
  customerMobile: string;
  userId: string;
  userName: string;
  userMobile: string;
  totalOutstanding: number;
  finalOTSAmount: number;
  messageType: 'WhatsApp OTS Offer';
  messagePreview: string;
  status: 'Dispatched via WhatsApp Link';
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  role: UserRole;
  accountId?: string;
  actionType:
    | 'LOGIN'
    | 'LOGOUT'
    | 'ACCOUNT_VIEWED'
    | 'CALL_MADE'
    | 'FOLLOWUP_LOGGED'
    | 'PTP_CREATED'
    | 'VISIT_STARTED'
    | 'VISIT_COMPLETED'
    | 'PHOTO_CAPTURED'
    | 'VOICE_RECORDED'
    | 'DOCUMENT_UPLOADED'
    | 'RECOVERY_LOGGED'
    | 'ALLOCATION_CHANGED'
    | 'SETTINGS_UPDATED'
    | 'COMMISSION_RULE_UPDATED'
    | 'COMMISSION_ASSIGNED'
    | 'HIERARCHY_UPDATED'
    | 'OTS_CALCULATED'
    | 'OTS_MODIFIED'
    | 'OTS_CONFIRMED'
    | 'OTS_CANCELLED'
    | 'WHATSAPP_OFFER_DISPATCHED'
    | 'STATUS_CHANGED'
    | 'ACCOUNT_CLOSED'
    | 'CUSTOMER_CLASSIFIED';
  details: string;
}

export interface NotificationItem {
  id: string;
  timestamp: string;
  recipientRole: UserRole | 'all';
  recipientUserId?: string;
  title: string;
  message: string;
  type: 'info' | 'alert' | 'ptp_due' | 'ptp_broken' | 'recovery_done' | 'allocation';
  read: boolean;
  accountId?: string;
  actionUrl?: string;
}

export enum CommissionPriorityLevel {
  AGENT_SPECIFIC = 1,
  BANK_ZONE_BRANCH_QD = 2,
  BANK_ZONE_QD = 3,
  BANK_ZONE = 4,
  BANK_DEFAULT = 5,
}

export interface Bank {
  id: string;
  name: string;
  code: string;
  description?: string;
  active: boolean;
  defaultCommissionRate?: number;
}

export interface RecoveryDepartment {
  id: string;
  name: string;
  code: string;
  description?: string;
  bankId: string;
  bankName: string;
  zoneId: string;
  zoneName: string;
  headName?: string;
  active: boolean;
}

export type QDType =
  | 'SMA-0'
  | 'SMA-1'
  | 'SMA-2'
  | 'NPA'
  | 'Written-Off'
  | 'Critical NPA'
  | 'Hard Core Defaulter'
  | 'Standard / Regular'
  | 'All QDs'
  | string;

export type RecoveryStage =
  | '10% Token'
  | 'Full Settlement / Closed'
  | 'Partial Recovery'
  | 'Pre-Legal'
  | 'Field Visit'
  | 'Hard Recovery'
  | 'All Stages'
  | string;

export interface CommissionRule {
  id: string;
  ruleCode?: string;
  code?: string;
  name: string;
  description?: string;
  bankId?: string;
  bankName?: string;
  zoneId?: string;
  zoneName?: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string;
  branchName?: string;
  qdType?: QDType;
  recoveryStage?: RecoveryStage;
  commissionPercentage: number;
  effectiveFrom: string; // YYYY-MM-DD
  effectiveTo?: string; // YYYY-MM-DD
  status: 'active' | 'inactive';
  priorityLevel: number; // 1: Agent Specific, 2: Bank+Zone+Branch+QD, 3: Bank+Zone+QD, 4: Bank+Zone, 5: Bank Default
  remarks?: string;
  createdAt?: string;
  createdBy?: string;
  createdByName?: string;
  createdDate?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface UserCommissionAssignment {
  id: string;
  assignmentCode?: string;
  agentId: string; // User ID or Agent ID (e.g. RA-0045 or USR-01)
  agentName: string;
  ruleId?: string; // Base rule if linked
  percentageOverride?: number; // Direct override % (0 - 100)
  effectiveFrom: string;
  effectiveTo?: string;
  status: 'active' | 'inactive';
  remarks?: string;
  bankName?: string;
  zoneName?: string;
  branchName?: string;
  assignedBy?: string;
  createdAt?: string;
  createdBy?: string;
  createdByName?: string;
  createdDate?: string;
  updatedAt?: string;
  updatedBy?: string;
  updatedByName?: string;
}

export interface CommissionAuditLog {
  id: string;
  timestamp: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  action?: string;
  actionType?:
    | 'RULE_CREATED'
    | 'RULE_UPDATED'
    | 'RULE_DEACTIVATED'
    | 'ASSIGNMENT_CREATED'
    | 'ASSIGNMENT_UPDATED'
    | 'ASSIGNMENT_DEACTIVATED'
    | 'CONFLICT_RESOLVED'
    | 'COMMISSION_CALCULATED'
    | string;
  targetType?: 'RULE' | 'ASSIGNMENT' | 'TRANSACTION' | string;
  targetId?: string;
  targetName?: string;
  entityType?: string;
  entityId?: string;
  entityName?: string;
  performedByUserId?: string;
  performedByName?: string;
  details?: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  hierarchyContext?: {
    bank?: string;
    zone?: string;
    department?: string;
    branch?: string;
  };
  notes?: string;
}

export interface CommissionCalculationResult {
  success: boolean;
  percentage: number;
  commissionAmount: number;
  appliedPercentage?: number;
  ruleId?: string;
  ruleName?: string;
  appliedRuleId?: string;
  appliedRuleName?: string;
  assignmentId?: string;
  appliedAssignmentId?: string;
  priorityLevel: number;
  priorityDescription: string;
  error?: string;
  conflictDetected?: boolean;
  conflictingRules?: CommissionRule[];
}

export interface CommissionRecord {
  id: string;
  agentId: string;
  agentName: string;
  recoveryId: string;
  accountId: string;
  recoveryAmount: number;
  commissionRate: number; // default 10%
  commissionAmount: number;
  date: string;
  status: 'Pending' | 'Approved' | 'Paid';
  paidDate?: string;
  appliedRuleId?: string;
  appliedRuleName?: string;
  appliedAssignmentId?: string;
  appliedPriorityLevel?: number;
  priorityLevel?: number;
  priorityDescription?: string;
  bank?: string;
  zone?: string;
  branch?: string;
  qdType?: QDType;
  recoveryStage?: RecoveryStage;
}

export interface CommissionSettings {
  defaultRate: number; // 10%
  minimumPayoutAmount: number;
  autoApprovalThreshold: number;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  area: string;
  zone: string;
  zoneId?: string;
  zoneName?: string;
  bankId?: string;
  bankName?: string;
  departmentId?: string;
  departmentName?: string;
  targetAmount?: number;
  managerName: string;
}

export interface Area {
  id: string;
  name: string;
  zone: string;
}

export interface Zone {
  id: string;
  name: string;
  headName: string;
}

export type TimelineActivityType =
  | 'ALLOCATION'
  | 'CALL'
  | 'FOLLOWUP'
  | 'PTP'
  | 'VISIT'
  | 'PHOTO'
  | 'VOICE_NOTE'
  | 'DOCUMENT'
  | 'RECOVERY'
  | 'STATUS_CHANGE';

export interface TimelineEvent {
  id: string;
  accountId: string;
  timestamp: string;
  date: string;
  time: string;
  userOrAgentId: string;
  userOrAgentName: string;
  activityType: TimelineActivityType;
  title: string;
  description: string;
  statusBadge?: string;
  amount?: number;
  mediaRefId?: string;
  mediaType?: 'photo' | 'audio' | 'document';
  mediaUrl?: string;
  location?: { latitude: number; longitude: number; address?: string };
}

export interface GoogleSheetTab {
  id: string;
  title: string;
  sheetNumber: number;
  description: string;
  columns: string[];
  rowCount: number;
  records: any[];
}

export interface DriveFolderNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  fileCount?: number;
  size?: string;
  driveFileId?: string;
  mimeType?: string;
  createdAt: string;
  children?: DriveFolderNode[];
  previewUrl?: string;
}

export interface PTPDigestResult {
  evaluatedCount: number;
  expiredCount: number;
  expiredAmount: number;
  brokenPTPs: PTPRecord[];
  dueTodayCount: number;
  upcomingCount: number;
  achievedCount: number;
  alreadyBrokenCount: number;
  affectedAccountIds: string[];
  referenceDate: string;
  sheetsSynced: boolean;
  spreadsheetUrl?: string | null;
  timestamp: string;
  message: string;
}

