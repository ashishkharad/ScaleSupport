import * as XLSX from 'xlsx';
import {
  Account,
  CustomerCategory,
  LoanType,
  User,
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
  CommissionRecord,
} from '../types';

export interface ParsedExcelRow {
  rowNumber: number;
  raw: Record<string, any>;
  zone?: string;
  area?: string;
  city?: string;
  coordinates?: string;
  latitude?: number;
  longitude?: number;
  branchCode: string;
  branchName: string;
  accountNo: string;
  customerName: string;
  productDesc: string;
  facility: string;
  limitSanctioned: number;
  loanBalance: number;
  customerBalance?: number;
  npaDate: string;
  contactNo: string;
  customerId: string;
  address: string;
  assignedAgentId?: string;
  assignedAgentName?: string;
  riskClassification?: string;
  latestRemark?: string;
  isValid: boolean;
  validationErrors: string[];
  // Multi-account detection
  isMultipleAccount?: boolean;
  multipleAccountsCount?: number;
  linkedAccountNumbers?: string[];
  multipleAccountReason?: string;
  multipleAccountGroupKey?: string;
}

export interface ExcelImportResult {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  multipleAccountsCount: number;
  multipleCustomersCount: number;
  rows: ParsedExcelRow[];
  detectedColumns: string[];
}

// Clean and normalize column key
function normalizeKey(key: string): string {
  return key
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '_');
}

/**
 * Normalizes an account number or loan number for clean deduplication / matching
 */
export function normalizeAccountKey(accNo?: string | number): string {
  if (!accNo) return '';
  return String(accNo)
    .toUpperCase()
    .trim()
    .replace(/^ACC-/, '')
    .replace(/^LN-/, '')
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Checks if two account identifiers represent the exact same account
 */
export function isMatchingAccountNumber(acc1?: string | number, acc2?: string | number): boolean {
  if (!acc1 || !acc2) return false;
  const k1 = normalizeAccountKey(acc1);
  const k2 = normalizeAccountKey(acc2);
  return k1 !== '' && k2 !== '' && k1 === k2;
}

/**
 * Standard column headers matching user's exact specification:
 * Headers include ZONE, AREA, CITY, COORDINATES, RISK_CLASSIFICATION, LATEST_REMARK
 */
export const REQUIRED_EXCEL_COLUMNS = [
  'ZONE',
  'AREA',
  'CITY',
  'COORDINATES',
  'BRANCH_COD',
  'BRANCH_NAME',
  'ACCT_NO',
  'NAME',
  'PROD_DESC',
  'FACILITY',
  'LIMIT_SANCTI',
  'LOAN_B',
  'NPA_DT',
  'CONTACT NO.',
  'ADDRESS',
  'AGENT_ID',
  'AGENT_NAME',
  'RISK_CLASSIFICATION',
  'LATEST_REMARK',
];

/**
 * Map raw row values into structured Account object
 */
export function mapExcelRowToAccount(
  row: ParsedExcelRow,
  defaultAgentId?: string,
  defaultAgentName?: string,
  coordinatorName: string = 'Kavita Joshi'
): Account {
  const accountId = row.accountNo ? (row.accountNo.startsWith('ACC-') ? row.accountNo : `ACC-${row.accountNo}`) : `ACC-${Date.now()}`;
  
  // Clean phone number
  let phone = String(row.contactNo || '').trim();
  if (phone && !phone.startsWith('+91') && phone.replace(/\D/g, '').length === 10) {
    const raw = phone.replace(/\D/g, '');
    phone = `+91 ${raw.slice(0, 5)} ${raw.slice(5)}`;
  } else if (!phone) {
    phone = 'N/A';
  }

  // Determine loan type
  let loanType: LoanType = 'Personal Loan';
  const prodUpper = (row.productDesc || '').toUpperCase();
  if (prodUpper.includes('TWO') || prodUpper.includes('2W') || prodUpper.includes('BIKE')) {
    loanType = 'Two Wheeler Loan';
  } else if (prodUpper.includes('AUTO') || prodUpper.includes('CAR') || prodUpper.includes('VEHICLE')) {
    loanType = 'Auto Loan';
  } else if (prodUpper.includes('HOME') || prodUpper.includes('HOUSING') || prodUpper.includes('HL')) {
    loanType = 'Home Loan';
  } else if (prodUpper.includes('BUSINESS') || prodUpper.includes('COMMERCIAL') || prodUpper.includes('BL')) {
    loanType = 'Business Loan';
  } else if (prodUpper.includes('GOLD')) {
    loanType = 'Gold Loan';
  } else if (prodUpper.includes('CARD') || prodUpper.includes('CC')) {
    loanType = 'Credit Card';
  }

  const outstanding = Number(row.loanBalance) || 0;
  const sanction = Number(row.limitSanctioned) || outstanding || 100000;
  const emi = 0; // NPA Customer Recovery

  // Category determination / Risk Classification
  let category: CustomerCategory = 'Medium Risk';
  if (row.riskClassification) {
    const rc = row.riskClassification.toLowerCase();
    if (rc.includes('critical') || rc.includes('npa') || rc.includes('defaulter')) {
      category = 'Critical NPA';
    } else if (rc.includes('high')) {
      category = 'High Risk';
    } else if (rc.includes('low')) {
      category = 'Low Risk';
    } else if (rc.includes('skip') || rc.includes('trace')) {
      category = 'Skip / Trace Required';
    }
  } else if (row.npaDate && (row.npaDate.includes('2022') || row.npaDate.includes('2021') || row.npaDate.includes('2020'))) {
    category = 'Critical NPA';
  } else if (outstanding > 500000) {
    category = 'High Risk';
  } else if (outstanding < 50000) {
    category = 'Low Risk';
  }

  const agentId = row.assignedAgentId || defaultAgentId || 'N/A';
  const agentName = row.assignedAgentName || defaultAgentName || (agentId !== 'N/A' ? 'Assigned Officer' : 'Unassigned');

  const initialNoteText = row.latestRemark
    ? row.latestRemark
    : row.isMultipleAccount
    ? `Customer has ${row.multipleAccountsCount} linked loan accounts. Facility: ${row.facility || 'N/A'}, NPA Date: ${row.npaDate || 'N/A'}, Balance: ₹${outstanding.toLocaleString('en-IN')}.`
    : `Master Account record imported. Facility: ${row.facility || 'N/A'}, NPA Date: ${row.npaDate || 'N/A'}, Balance: ₹${outstanding.toLocaleString('en-IN')}.`;

  const initialNotesHistory = [
    {
      id: `NOTE-INIT-${row.accountNo || Date.now()}`,
      agentId: agentId !== 'N/A' ? agentId : 'SYS',
      agentName: agentName !== 'Unassigned' ? agentName : 'System Importer',
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      note: initialNoteText,
      category: 'General',
    },
  ];

  const assignedZone = row.zone?.trim() || (row.branchName ? `${row.branchName.split(' ')[0]} Zone` : 'N/A');
  const assignedArea = row.area?.trim() || (row.branchName ? `${row.branchName.split(' ')[0]} Area` : 'N/A');
  const assignedCity = row.city?.trim() || (row.branchName ? row.branchName.split(' ')[0] : 'N/A');

  const lat = row.latitude || 19.8762 + (Math.random() - 0.5) * 0.05;
  const lng = row.longitude || 75.3433 + (Math.random() - 0.5) * 0.05;
  const coords = row.coordinates || `${lat.toFixed(6)}, ${lng.toFixed(6)}`;

  return {
    id: accountId,
    accountId,
    loanNumber: row.accountNo || `LN-${Math.floor(10000 + Math.random() * 90000)}`,
    customerName: row.customerName || 'N/A',
    mobile: phone,
    address: row.address || 'N/A',
    city: assignedCity,
    branch: row.branchName || 'Main Branch',
    branchCode: row.branchCode || 'BR-01',
    facility: row.facility || 'Term Loan',
    npaDate: row.npaDate || 'N/A',
    customerCode: row.customerId || `CUST-${accountId}`,
    area: assignedArea,
    zone: assignedZone,
    coordinates: coords,
    loanType,
    sanctionAmount: sanction,
    outstandingAmount: outstanding,
    customerBalance: outstanding,
    overdueAmount: outstanding,
    emi,
    ptpCount: 0,
    customerCategory: category,
    riskClassification: category,
    accountStatus: 'Active',
    assignedAgentId: agentId,
    assignedAgentName: agentName,
    coordinatorId: 'USR-COORD-1',
    coordinatorName,
    allocationDate: new Date().toISOString().slice(0, 10),
    totalRecovered: 0,
    latitude: lat,
    longitude: lng,
    notes: initialNoteText,
    latestRemark: row.latestRemark || initialNoteText,
    isMultipleAccount: row.isMultipleAccount,
    multipleAccountsCount: row.multipleAccountsCount,
    linkedAccountIds: row.linkedAccountNumbers,
    multipleAccountReason: row.multipleAccountReason,
    agentNotesHistory: initialNotesHistory,
    customFields: row.raw || {},
  };
}

/**
 * Parses File (Excel / CSV) into structured data with exact column header recognition
 * Detects multiple accounts when customer balance and NPA date are identical or customer name matches
 */
export async function parseExcelOrCsvFile(file: File): Promise<ExcelImportResult> {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  
  // Pick first sheet
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  // Convert sheet to JSON array of objects
  const rawRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  
  if (!rawRows || rawRows.length === 0) {
    throw new Error('The uploaded file is empty. Please ensure the Excel sheet contains data rows.');
  }

  // Detect column names from the first few rows
  const allDetectedKeys = new Set<string>();
  rawRows.forEach((r) => {
    Object.keys(r).forEach((k) => allDetectedKeys.add(k));
  });

  // Strict Excel Template Format Validation
  // Ensure the uploaded sheet contains the required ScaleSupport Allocation template format
  const normalizedHeaders = Array.from(allDetectedKeys).map(normalizeKey);
  const hasAccountCol = normalizedHeaders.some((h) =>
    ['ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT_NUMBER', 'ACCTNO', 'ACC_NO', 'LOAN_NO', 'LOAN_NUMBER'].includes(h)
  );
  const hasNameCol = normalizedHeaders.some((h) =>
    ['NAME', 'CUSTOMER_NAME', 'BORROWER_NAME', 'CUST_NAME', 'ACCOUNT_NAME'].includes(h)
  );
  const hasBalanceCol = normalizedHeaders.some((h) =>
    ['LOAN_B', 'LOAN_BALANCE', 'OUTSTANDING', 'OUTSTANDING_AMOUNT', 'POS_BALANCE', 'BALANCE', 'CUSTOMER_BALANCE', 'LIMIT_SANCTI'].includes(h)
  );

  if (!hasAccountCol || !hasNameCol || !hasBalanceCol) {
    const missingColumns: string[] = [];
    if (!hasAccountCol) missingColumns.push('ACCT_NO / Account Number');
    if (!hasNameCol) missingColumns.push('NAME / Customer Name');
    if (!hasBalanceCol) missingColumns.push('LOAN_B / Loan Balance');

    throw new Error(
      `Invalid Excel Template Format! The uploaded file does not match the official ScaleSupport Allocation format. Missing mandatory template columns: ${missingColumns.join(', ')}. Upload aborted. Please download and use the provided Excel Template.`
    );
  }

  const parsedRows: ParsedExcelRow[] = [];

  rawRows.forEach((row, index) => {
    // Look up normalized keys
    const normalizedRow: Record<string, any> = {};
    Object.entries(row).forEach(([k, v]) => {
      normalizedRow[normalizeKey(k)] = v;
    });

    // Helper lookup with fuzzy matching
    const findVal = (...aliases: string[]) => {
      for (const alias of aliases) {
        const norm = normalizeKey(alias);
        if (normalizedRow[norm] !== undefined && normalizedRow[norm] !== '') {
          return normalizedRow[norm];
        }
      }
      return '';
    };

    const zone = String(findVal('ZONE', 'ZONE_NAME', 'ZONENAME', 'REGION', 'ZONE_DESC', 'ZONE_CODE')).trim();
    const area = String(findVal('AREA', 'AREA_NAME', 'AREANAME', 'DISTRICT', 'LOCATION', 'CLUSTER')).trim();
    const city = String(findVal('CITY', 'TOWN', 'CITY_NAME', 'MUNICIPALITY')).trim();
    const rawCoords = String(findVal('COORDINATES', 'COORDS', 'GPS_COORDINATES', 'GEO_LOCATION', 'LAT_LNG', 'LOCATION_COORDS')).trim();
    const rawLat = findVal('LATITUDE', 'LAT');
    const rawLng = findVal('LONGITUDE', 'LNG', 'LON', 'LONG');
    
    let lat: number | undefined = undefined;
    let lng: number | undefined = undefined;
    let coords: string | undefined = rawCoords || undefined;

    if (rawLat && rawLng) {
      lat = parseFloat(String(rawLat)) || undefined;
      lng = parseFloat(String(rawLng)) || undefined;
      if (lat && lng) {
        coords = `${lat}, ${lng}`;
      }
    } else if (rawCoords && rawCoords.includes(',')) {
      const parts = rawCoords.split(',');
      lat = parseFloat(parts[0].trim()) || undefined;
      lng = parseFloat(parts[1].trim()) || undefined;
    }

    const branchCode = String(findVal('BRANCH_COD', 'BRANCH_CODE', 'BRANCHCODE', 'BR_CODE', 'BRANCH')).trim();
    const branchName = String(findVal('BRANCH_NAME', 'BRANCHNAME', 'BRANCH_DESC', 'BRANCH')).trim();
    const accountNo = String(findVal('ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT_NUMBER', 'ACCTNO', 'ACC_NO', 'LOAN_NO', 'LOAN_NUMBER')).trim();
    const customerName = String(findVal('CUSTOMER_NAME', 'NAME', 'BORROWER_NAME', 'CUST_NAME', 'ACCOUNT_NAME')).trim();
    const productDesc = String(findVal('PROD_DESC', 'PRODUCT_DESC', 'PRODUCT_DESCRIPTION', 'PRODUCT', 'LOAN_TYPE')).trim();
    const facility = String(findVal('FACILITY', 'FACILITY_TYPE', 'LOAN_SCHEME', 'SUB_PRODUCT')).trim();
    
    // Numbers
    const rawLimit = findVal('LIMIT_SANCTI', 'LIMIT_SANCTIONED', 'SANCTION_LIMIT', 'SANCTION_AMOUNT', 'LOAN_AMOUNT', 'LIMIT');
    const limitSanctioned = typeof rawLimit === 'number' ? rawLimit : parseFloat(String(rawLimit).replace(/[^0-9.]/g, '')) || 0;

    const rawBalance = findVal('LOAN_B', 'LOAN_BALANCE', 'OUTSTANDING', 'OUTSTANDING_AMOUNT', 'POS_BALANCE', 'BALANCE', 'CUSTOMER_BALANCE');
    const loanBalance = typeof rawBalance === 'number' ? rawBalance : parseFloat(String(rawBalance).replace(/[^0-9.]/g, '')) || 0;

    // Date
    let npaDate = findVal('NPA_DT', 'NPA_DATE', 'NPADATE', 'DATE_OF_NPA');
    if (npaDate instanceof Date) {
      npaDate = npaDate.toISOString().slice(0, 10);
    } else {
      npaDate = String(npaDate || '').trim();
    }

    const contactNo = String(findVal('CONTACT NO.', 'CONTACT_NO', 'CONTACT_NUMBER', 'MOBILE', 'PHONE', 'MOBILE_NO', 'CELL')).trim();
    const customerId = String(findVal('CUSTOMER_ID', 'CUSTOMER_NO', 'CIF', 'CIF_NO', 'CUST_ID')).trim();
    const address = String(findVal('ADDRESS', 'CUSTOMER_ADDRESS', 'RESIDENCE_ADDRESS', 'BORROWER_ADDRESS')).trim();

    // Risk Classification & Remarks
    const riskClassification = String(findVal('RISK_CLASSIFICATION', 'CUSTOMER_RISK', 'RISK', 'CLASSIFICATION', 'CATEGORY', 'CUSTOMER_CATEGORY')).trim() || undefined;
    const latestRemark = String(findVal('LATEST_REMARK', 'REMARK', 'REMARKS', 'AGENT_REMARKS', 'NOTES', 'AGENT_NOTE')).trim() || undefined;

    // Allocation columns if provided
    const assignedAgentId =
      String(
        findVal(
          'AGENT_ID',
          'USER_ID',
          'USERID',
          'AGENT_CODE',
          'AGENTCODE',
          'USER_CODE',
          'ASSIGNED_AGENT_ID',
          'ASSIGNED_USER_ID',
          'RECOVERY_AGENT_ID',
          'OFFICER_ID',
          'STAFF_ID'
        )
      ).trim() || undefined;

    const assignedAgentName =
      String(
        findVal(
          'AGENT_NAME',
          'USER_NAME',
          'USERNAME',
          'ASSIGNED_AGENT_NAME',
          'ASSIGNED_USER_NAME',
          'OFFICER_NAME',
          'STAFF_NAME',
          'AGENT_DESC'
        )
      ).trim() || undefined;

    const errors: string[] = [];
    if (!accountNo) errors.push('Missing Account Number (ACCT_NO)');
    if (!customerName) errors.push('Missing Customer Name (NAME)');
    if (!loanBalance && !limitSanctioned) errors.push('Missing Loan Balance');

    parsedRows.push({
      rowNumber: index + 2,
      raw: row,
      zone: zone || undefined,
      area: area || undefined,
      city: city || undefined,
      coordinates: coords,
      latitude: lat,
      longitude: lng,
      branchCode: branchCode || 'BR-01',
      branchName: branchName || 'Main Branch',
      accountNo: accountNo || `TEMP-${index + 1}`,
      customerName: customerName || 'N/A',
      productDesc: productDesc || 'Personal Loan',
      facility: facility || 'Term Loan',
      limitSanctioned: limitSanctioned || loanBalance,
      loanBalance: loanBalance || limitSanctioned,
      customerBalance: loanBalance,
      npaDate: npaDate || 'N/A',
      contactNo: contactNo || 'N/A',
      customerId: customerId || `CUST-${accountNo}`,
      address: address || 'N/A',
      assignedAgentId,
      assignedAgentName,
      riskClassification,
      latestRemark,
      isValid: errors.length === 0,
      validationErrors: errors,
    });
  });

  // MULTI-ACCOUNT DEDUPLICATION & GROUPING:
  // Safe grouping: Only group accounts that genuinely belong to the same customer
  // 1) Explicit customerId / CIF match
  // 2) Exact customer name + 10-digit mobile number match
  const groupMap = new Map<string, ParsedExcelRow[]>();

  parsedRows.forEach((row) => {
    const normName = row.customerName.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPhone = row.contactNo.replace(/\D/g, '');
    const cleanCif = row.customerId ? row.customerId.toUpperCase().trim() : '';

    let key = '';
    if (cleanCif && !cleanCif.startsWith('CUST-TEMP-') && cleanCif.length >= 3) {
      key = `CIF:${cleanCif}`;
    } else if (normName && normName.length >= 4 && cleanPhone.length >= 10) {
      key = `NAME_PHONE:${normName}__${cleanPhone}`;
    } else {
      key = `SINGLE:${row.accountNo}`;
    }

    const list = groupMap.get(key) || [];
    list.push(row);
    groupMap.set(key, list);
    row.multipleAccountGroupKey = key;
  });

  // Tag rows that have multiple accounts in the group
  let multiAccountRowsCount = 0;
  const multiAccountCustomerKeys = new Set<string>();

  groupMap.forEach((rowsInGroup, key) => {
    if (rowsInGroup.length > 1) {
      multiAccountCustomerKeys.add(key);
      const linkedAccNos = rowsInGroup.map((r) => r.accountNo);
      
      rowsInGroup.forEach((r) => {
        multiAccountRowsCount++;
        r.isMultipleAccount = true;
        r.multipleAccountsCount = rowsInGroup.length;
        r.linkedAccountNumbers = linkedAccNos;
        r.multipleAccountReason = `Customer has ${rowsInGroup.length} linked loan accounts`;
      });
    } else {
      rowsInGroup[0].isMultipleAccount = false;
      rowsInGroup[0].multipleAccountsCount = 1;
      rowsInGroup[0].linkedAccountNumbers = [rowsInGroup[0].accountNo];
    }
  });

  return {
    fileName: file.name,
    totalRows: parsedRows.length,
    validRows: parsedRows.filter((r) => r.isValid).length,
    invalidRows: parsedRows.filter((r) => !r.isValid).length,
    multipleAccountsCount: multiAccountRowsCount,
    multipleCustomersCount: multiAccountCustomerKeys.size,
    rows: parsedRows,
    detectedColumns: Array.from(allDetectedKeys),
  };
}

/**
 * Generates and triggers download of sample Excel file in EXACT format requested:
 * BRANCH_COD | BRANCH_NAME | ACCT_NO | NAME | PROD_DESC | FACILITY | LIMIT_SANCTI | LOAN_B | NPA_DT | CONTACT NO. | CUSTOMER_BALANCE | ADDRESS | AGENT_ID | AGENT_NAME
 * Note: CUSTOMER_BALANCE represents the customer's total overdue balance for NPA recovery.
 */
export function downloadExactExcelTemplate() {
  const sampleData = [
    {
      ZONE: 'North Zone Maharashtra',
      AREA: 'Chhatrapati Sambhajinagar (Aurangabad)',
      BRANCH_COD: '104',
      BRANCH_NAME: 'Chhatrapati Sambhajinagar Main Branch',
      ACCT_NO: '00291040001892',
      NAME: 'Rajesh Narayan Patil',
      PROD_DESC: 'Personal Loan',
      FACILITY: 'Term Loan',
      LIMIT_SANCTI: 350000,
      LOAN_B: 245000,
      NPA_DT: '2023-10-31',
      'CONTACT NO.': '9822019482',
      CUSTOMER_BALANCE: 245000, // Total Overdue Balance for NPA Customer
      ADDRESS: 'Plot 48, Samarth Nagar, Chhatrapati Sambhajinagar, MH 431001',
      AGENT_ID: 'RA-0045',
      AGENT_NAME: 'Rajesh Shinde',
    },
    {
      ZONE: 'North Zone Maharashtra',
      AREA: 'Chhatrapati Sambhajinagar (Aurangabad)',
      BRANCH_COD: '104',
      BRANCH_NAME: 'Chhatrapati Sambhajinagar Main Branch',
      ACCT_NO: '00291040001893',
      NAME: 'Rajesh Narayan Patil',
      PROD_DESC: 'Two Wheeler Loan',
      FACILITY: 'Hypothecation',
      LIMIT_SANCTI: 245000,
      LOAN_B: 245000,
      NPA_DT: '2023-10-31',
      'CONTACT NO.': '9822019482',
      CUSTOMER_BALANCE: 245000, // Matching Name + NPA Date + Balance -> 1 Customer Multi-Account
      ADDRESS: 'Plot 48, Samarth Nagar, Chhatrapati Sambhajinagar, MH 431001',
      AGENT_ID: 'RA-0045',
      AGENT_NAME: 'Rajesh Shinde',
    },
    {
      ZONE: 'North Zone Maharashtra',
      AREA: 'Chhatrapati Sambhajinagar (Aurangabad)',
      BRANCH_COD: '105',
      BRANCH_NAME: 'Mill Corner Branch',
      ACCT_NO: '00291050002145',
      NAME: 'Sunil Baburao Shinde',
      PROD_DESC: 'Two Wheeler Loan',
      FACILITY: 'Hypothecation',
      LIMIT_SANCTI: 85000,
      LOAN_B: 42000,
      NPA_DT: '2024-01-15',
      'CONTACT NO.': '9822459012',
      CUSTOMER_BALANCE: 42000,
      ADDRESS: 'Flat 302, Sai Residency, Mill Corner, Chhatrapati Sambhajinagar',
      AGENT_ID: 'RA-0089',
      AGENT_NAME: 'Prakash Jadhav',
    },
    {
      ZONE: 'West Zone Maharashtra',
      AREA: 'Pune Metro',
      BRANCH_COD: '201',
      BRANCH_NAME: 'Pune Camp Branch',
      ACCT_NO: '00292010008891',
      NAME: 'Pooja Anand Deshmukh',
      PROD_DESC: 'Business Loan',
      FACILITY: 'Cash Credit',
      LIMIT_SANCTI: 750000,
      LOAN_B: 580000,
      NPA_DT: '2023-08-30',
      'CONTACT NO.': '9422781903',
      CUSTOMER_BALANCE: 580000,
      ADDRESS: 'Shop No 12, MG Road Commercial Complex, Pune Camp, Pune 411001',
      AGENT_ID: 'RA-0112',
      AGENT_NAME: 'Amit Kulkarni',
    },
    {
      ZONE: 'West Zone Maharashtra',
      AREA: 'Pune Metro',
      BRANCH_COD: '201',
      BRANCH_NAME: 'Pune Camp Branch',
      ACCT_NO: '00292010009412',
      NAME: 'Vikas Madhavrao Jagtap',
      PROD_DESC: 'Auto Loan',
      FACILITY: 'Vehicle Term Loan',
      LIMIT_SANCTI: 500000,
      LOAN_B: 310000,
      NPA_DT: '2024-02-28',
      'CONTACT NO.': '9890123490',
      CUSTOMER_BALANCE: 310000,
      ADDRESS: 'B-14, Green Valley Apts, Kothrud, Pune 411038',
      AGENT_ID: 'RA-0045',
      AGENT_NAME: 'Rajesh Shinde',
    },
    {
      ZONE: 'North Zone Maharashtra',
      AREA: 'Nashik Industrial Region',
      BRANCH_COD: '302',
      BRANCH_NAME: 'Nashik Road Branch',
      ACCT_NO: '00293020004519',
      NAME: 'Ganesh Trimbak Gaikwad',
      PROD_DESC: 'Home Loan',
      FACILITY: 'Housing Loan',
      LIMIT_SANCTI: 1800000,
      LOAN_B: 1420000,
      NPA_DT: '2023-06-30',
      'CONTACT NO.': '9765432109',
      CUSTOMER_BALANCE: 1420000,
      ADDRESS: 'Row House 5, Shanti Niketan, Nashik Road, Nashik 422101',
      AGENT_ID: 'RA-0156',
      AGENT_NAME: 'Suresh Patil',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  
  // Set column widths
  worksheet['!cols'] = [
    { wch: 24 }, // ZONE
    { wch: 28 }, // AREA
    { wch: 14 }, // BRANCH_COD
    { wch: 32 }, // BRANCH_NAME
    { wch: 22 }, // ACCT_NO
    { wch: 28 }, // NAME
    { wch: 20 }, // PROD_DESC
    { wch: 18 }, // FACILITY
    { wch: 16 }, // LIMIT_SANCTI
    { wch: 14 }, // LOAN_B
    { wch: 14 }, // NPA_DT
    { wch: 18 }, // CONTACT NO.
    { wch: 20 }, // CUSTOMER_BALANCE
    { wch: 45 }, // ADDRESS
    { wch: 14 }, // AGENT_ID
    { wch: 22 }, // AGENT_NAME
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Account_Allocation_Template');
  
  // Write and trigger download
  XLSX.writeFile(workbook, 'ScaleSupport_Account_Allocation_Template.xlsx');
}

/**
 * Export current accounts to Excel in the exact format
 */
export function exportAccountsToExactExcel(accounts: Account[], filename = 'ScaleSupport_Allocated_Accounts.xlsx') {
  const exportRows = accounts.map((acc) => ({
    ZONE: acc.zone || '',
    AREA: acc.area || '',
    BRANCH_COD: acc.branchCode || '104',
    BRANCH_NAME: acc.branch,
    ACCT_NO: acc.loanNumber || acc.accountId,
    NAME: acc.customerName,
    PROD_DESC: acc.loanType,
    FACILITY: acc.facility || 'Term Loan',
    LIMIT_SANCTI: acc.sanctionAmount,
    LOAN_B: acc.outstandingAmount,
    NPA_DT: acc.npaDate || '2024-03-31',
    'CONTACT NO.': acc.mobile,
    CUSTOMER_BALANCE: acc.customerBalance || acc.overdueAmount || acc.outstandingAmount,
    ADDRESS: acc.address,
    // Extra operational columns
    ASSIGNED_AGENT: `${acc.assignedAgentId} (${acc.assignedAgentName})`,
    ACCOUNT_STATUS: acc.accountStatus,
    PTP_STATUS: acc.ptpStatus || 'None',
    TOTAL_RECOVERED: acc.totalRecovered,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportRows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'ScaleSupport_Accounts');
  XLSX.writeFile(workbook, filename);
}

export interface BackendDataExportPayload {
  accounts: Account[];
  users: User[];
  recoveries: RecoveryRecord[];
  followups: FollowUp[];
  ptps: PTPRecord[];
  visits: FieldVisit[];
  photos: PhotoRecord[];
  voiceNotes: VoiceNoteRecord[];
  documents: DocumentRecord[];
  commissions: CommissionRecord[];
  activityLogs: ActivityLog[];
  allocationHistories: AllocationHistory[];
}

/**
 * Downloads ALL backend tables in a unified multi-sheet Excel workbook (.xlsx)
 */
export function exportAllBackendDataToExcel(
  data: BackendDataExportPayload,
  filename?: string
) {
  const {
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
  } = data;

  const workbook = XLSX.utils.book_new();

  // 1. Accounts & Customers Master
  const accountsSheetData = accounts.map((a) => ({
    BRANCH_CODE: a.branchCode || 'BR-01',
    BRANCH_NAME: a.branch,
    ACCOUNT_ID: a.accountId,
    LOAN_NUMBER: a.loanNumber || a.accountId,
    CUSTOMER_NAME: a.customerName,
    CONTACT_MOBILE: a.mobile,
    ALTERNATE_MOBILE: a.alternateMobile || '',
    LOAN_PRODUCT: a.loanType,
    FACILITY: a.facility || a.loanType,
    SANCTION_LIMIT: a.sanctionAmount,
    OUTSTANDING_BALANCE: a.outstandingAmount,
    OVERDUE_AMOUNT: a.overdueAmount,
    CUSTOMER_BALANCE: a.customerBalance || a.overdueAmount || a.outstandingAmount,
    NPA_DATE: a.npaDate || '',
    REGISTERED_ADDRESS: a.address,
    CITY: a.city || '',
    AREA: a.area || '',
    ZONE: a.zone || '',
    ASSIGNED_AGENT_ID: a.assignedAgentId,
    ASSIGNED_AGENT_NAME: a.assignedAgentName,
    ACCOUNT_STATUS: a.accountStatus,
    PTP_COUNT: a.ptpCount || 0,
    PTP_STATUS: a.ptpStatus || 'None',
    TOTAL_RECOVERED: a.totalRecovered,
    LAST_FOLLOWUP_DATE: a.lastFollowUpDate || '',
    LAST_FOLLOWUP_STATUS: a.lastFollowUpStatus || '',
    NEXT_FOLLOWUP_DATE: a.nextFollowUpDate || '',
    LATEST_REMARKS: a.notes || '',
    AGENT_NOTES_COUNT: (a.agentNotesHistory || []).length,
  }));
  const wsAccounts = XLSX.utils.json_to_sheet(accountsSheetData);
  XLSX.utils.book_append_sheet(workbook, wsAccounts, '1_Accounts_Master');

  // 2. Recoveries & Payments
  const recoveriesSheetData = recoveries.map((r) => ({
    RECOVERY_ID: r.recoveryId || r.id,
    ACCOUNT_ID: r.accountId,
    CUSTOMER_NAME: r.customerName,
    AMOUNT_COLLECTED: r.amount,
    RECOVERY_DATE: r.recoveryDate,
    PAYMENT_MODE: r.paymentMode,
    RECEIPT_NUMBER: r.receiptNumber,
    TRANSACTION_REF: r.referenceNumber,
    AGENT_ID: r.agentId,
    AGENT_NAME: r.agentName,
    COMMISSION_PERCENT: r.commissionPercentage || 10,
    COMMISSION_AMOUNT: r.commissionAmount || Math.round(r.amount * 0.1),
    COMMISSION_STATUS: r.commissionPaidStatus || 'Approved',
    BRANCH: r.branch,
    ZONE: r.zone,
    REMARKS: r.remarks,
    PROOF_DRIVE_FILE_ID: r.proofDriveFileId || '',
  }));
  const wsRecoveries = XLSX.utils.json_to_sheet(recoveriesSheetData);
  XLSX.utils.book_append_sheet(workbook, wsRecoveries, '2_Recoveries_Payments');

  // 3. Followup Calls & Interaction Remarks History
  const followupsSheetData = followups.map((f) => ({
    FOLLOWUP_ID: f.id,
    ACCOUNT_ID: f.accountId,
    CUSTOMER_NAME: f.customerName,
    DATE: f.date,
    TIME: f.time,
    CALL_STATUS: f.status,
    CUSTOMER_RESPONSE: f.customerResponse,
    DISCUSSION_DETAILS: f.discussionDetails,
    AGENT_REMARKS: f.agentRemarks,
    NEXT_FOLLOWUP_DATE: f.nextFollowUpDate || '',
    NEXT_FOLLOWUP_TIME: f.nextFollowUpTime || '',
    AGENT_ID: f.agentId,
    AGENT_NAME: f.agentName,
  }));
  const wsFollowups = XLSX.utils.json_to_sheet(followupsSheetData);
  XLSX.utils.book_append_sheet(workbook, wsFollowups, '3_Followup_Calls_Remarks');

  // 4. PTP Commitments
  const ptpSheetData = ptps.map((p) => ({
    PTP_ID: p.id,
    ACCOUNT_ID: p.accountId,
    CUSTOMER_NAME: p.customerName,
    PROMISED_AMOUNT: p.amount,
    PTP_DATE: p.ptpDate,
    PAYMENT_MODE: p.ptpMode,
    STATUS: p.status,
    CUSTOMER_COMMITMENT: p.customerCommitment,
    AGENT_REMARKS: p.remarks,
    CREATED_AT: p.createdAt,
    RESOLVED_DATE: p.resolvedDate || '',
    AGENT_ID: p.agentId,
    AGENT_NAME: p.agentName,
  }));
  const wsPtps = XLSX.utils.json_to_sheet(ptpSheetData);
  XLSX.utils.book_append_sheet(workbook, wsPtps, '4_PTP_Commitments');

  // 5. Field Visits & GPS Logs
  const visitsSheetData = visits.map((v) => ({
    VISIT_ID: v.visitId || v.id,
    ACCOUNT_ID: v.accountId,
    CUSTOMER_NAME: v.customerName,
    VISIT_DATE: v.date,
    START_TIME: v.startTime || '',
    END_TIME: v.endTime || '',
    STATUS: v.visitStatus,
    LATITUDE: v.latitude,
    LONGITUDE: v.longitude,
    ACCURACY_METERS: v.accuracyMeters || 0,
    ADDRESS: v.address || '',
    CUSTOMER_INTERACTION: v.customerInteraction || '',
    VISIT_REMARKS: v.visitRemarks || '',
    PHOTOS_COUNT: (v.photoDriveFileIds || []).length,
    VOICE_NOTES_COUNT: (v.voiceNoteDriveFileIds || []).length,
    AGENT_ID: v.agentId,
    AGENT_NAME: v.agentName,
  }));
  const wsVisits = XLSX.utils.json_to_sheet(visitsSheetData);
  XLSX.utils.book_append_sheet(workbook, wsVisits, '5_Field_Visits_GPS');

  // 6. Watermarked Photos
  const photosSheetData = photos.map((p) => ({
    PHOTO_ID: p.photoId || p.id,
    ACCOUNT_ID: p.accountId,
    DATE: p.date,
    TIME: p.time,
    LATITUDE: p.latitude,
    LONGITUDE: p.longitude,
    AGENT_REMARK: p.agentRemark || '',
    AGENT_ID: p.agentId,
    AGENT_NAME: p.agentName,
    DRIVE_FILE_ID: p.driveFileId || '',
    WATERMARK_TEXT: p.watermarkText || '',
    UPLOAD_STATUS: p.uploadStatus || 'Uploaded',
  }));
  const wsPhotos = XLSX.utils.json_to_sheet(photosSheetData);
  XLSX.utils.book_append_sheet(workbook, wsPhotos, '6_Watermarked_Photos');

  // 7. Voice Recordings
  const voiceSheetData = voiceNotes.map((vn) => ({
    VOICE_NOTE_ID: vn.voiceNoteId || vn.id,
    ACCOUNT_ID: vn.accountId,
    TITLE: vn.title,
    DURATION_SECONDS: vn.durationSeconds || 0,
    DATE: vn.date,
    TIME: vn.time,
    TRANSCRIPTION: vn.transcription || '',
    AGENT_ID: vn.agentId,
    AGENT_NAME: vn.agentName,
    DRIVE_FILE_ID: vn.driveFileId || '',
  }));
  const wsVoice = XLSX.utils.json_to_sheet(voiceSheetData);
  XLSX.utils.book_append_sheet(workbook, wsVoice, '7_Voice_Recordings');

  // 8. Documents & KYC
  const docsSheetData = documents.map((d) => ({
    DOCUMENT_ID: d.documentId || d.id,
    ACCOUNT_ID: d.accountId,
    CUSTOMER_NAME: d.customerName || '',
    DOCUMENT_TYPE: d.documentType,
    FILE_NAME: d.fileName,
    FILE_SIZE_BYTES: d.fileSizeBytes,
    DATE_TIME: d.dateTime,
    UPLOADED_BY_ID: d.uploadedBy,
    UPLOADED_BY_NAME: d.uploadedByName,
    DRIVE_FILE_ID: d.driveFileId || '',
    FILE_URL: d.fileUrl || '',
  }));
  const wsDocs = XLSX.utils.json_to_sheet(docsSheetData);
  XLSX.utils.book_append_sheet(workbook, wsDocs, '8_KYC_Documents');

  // 9. Users & Agents Directory
  const usersSheetData = users.map((u) => ({
    USER_ID: u.id,
    USERNAME: u.username,
    FULL_NAME: u.name,
    ROLE: u.role.toUpperCase(),
    PASSWORD: u.password || (u.role === 'admin' ? 'Admin@2026' : u.role === 'coordinator' ? 'Coord@2026' : 'Agent@2026'),
    AGENT_ID: u.agentId || 'N/A',
    EMAIL: u.email,
    MOBILE: u.mobile,
    BRANCH: u.branch,
    AREA: u.area,
    ZONE: u.zone,
    MONTHLY_TARGET: u.monthlyTarget || '',
    JOINING_DATE: u.joiningDate,
    ACTIVE_STATUS: u.active ? 'ACTIVE' : 'INACTIVE',
  }));
  const wsUsers = XLSX.utils.json_to_sheet(usersSheetData);
  XLSX.utils.book_append_sheet(workbook, wsUsers, '9_Users_and_Agents');

  // 10. Commissions Ledger (10%)
  const commSheetData = commissions.map((c) => ({
    COMMISSION_ID: c.id,
    RECOVERY_ID: c.recoveryId,
    ACCOUNT_ID: c.accountId,
    AGENT_ID: c.agentId,
    AGENT_NAME: c.agentName,
    RECOVERY_AMOUNT: c.recoveryAmount,
    COMMISSION_RATE_PERCENT: c.commissionRate || 10,
    COMMISSION_AMOUNT: c.commissionAmount,
    DATE: c.date,
    STATUS: c.status,
    PAID_DATE: c.paidDate || '',
  }));
  const wsComm = XLSX.utils.json_to_sheet(commSheetData);
  XLSX.utils.book_append_sheet(workbook, wsComm, '10_Commissions_10Pct');

  // 11. Activity & Audit Trail
  const logsSheetData = activityLogs.map((l) => ({
    LOG_ID: l.id,
    TIMESTAMP: l.timestamp,
    USER_ID: l.userId,
    USER_NAME: l.userName,
    USER_ROLE: l.role,
    ACTION_TYPE: l.actionType,
    ACCOUNT_ID: l.accountId || '',
    DETAILS: l.details,
  }));
  const wsLogs = XLSX.utils.json_to_sheet(logsSheetData);
  XLSX.utils.book_append_sheet(workbook, wsLogs, '11_Activity_Audit_Trail');

  // 12. Account Allocation & Reallocation History
  const allocHistSheetData = allocationHistories.map((h) => ({
    HISTORY_ID: h.id,
    ACCOUNT_ID: h.accountId,
    PREVIOUS_AGENT_ID: h.previousAgentId,
    PREVIOUS_AGENT_NAME: h.previousAgentName,
    NEW_AGENT_ID: h.newAgentId,
    NEW_AGENT_NAME: h.newAgentName,
    REALLOCATED_BY: h.reallocatedBy,
    TIMESTAMP: h.date,
    REASON: h.reason,
  }));
  const wsAlloc = XLSX.utils.json_to_sheet(allocHistSheetData);
  XLSX.utils.book_append_sheet(workbook, wsAlloc, '12_Allocations_History');

  // 13. Historical Agent Remarks & Notes Log
  const allNotesList: any[] = [];
  accounts.forEach((acc) => {
    (acc.agentNotesHistory || []).forEach((note) => {
      allNotesList.push({
        NOTE_ID: note.id,
        ACCOUNT_ID: acc.accountId,
        LOAN_NUMBER: acc.loanNumber || acc.accountId,
        CUSTOMER_NAME: acc.customerName,
        DATE: note.date,
        TIME: note.time,
        AGENT_ID: note.agentId,
        AGENT_NAME: note.agentName,
        CATEGORY: note.category || 'General',
        REMARK_CONTENT: note.note,
      });
    });
  });
  const wsNotes = XLSX.utils.json_to_sheet(allNotesList);
  XLSX.utils.book_append_sheet(workbook, wsNotes, '13_Agent_Remarks_History');

  const todayStr = new Date().toISOString().slice(0, 10);
  const finalFilename = filename || `SRMS_Complete_Backend_Database_${todayStr}.xlsx`;
  XLSX.writeFile(workbook, finalFilename);
}

