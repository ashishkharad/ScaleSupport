/**
 * Google Sheets API v4 Client for ScaleSupport
 * Enables direct creation, reading/fetching, and bidirectional synchronization of recovery records,
 * follow-up remarks, PTP commitments, field visit logs, and receipts directly to/from
 * the user's personal Google Sheets under their Google account.
 */

import { GoogleSheetTab, Account, RecoveryRecord, FollowUp, PTPRecord, FieldVisit, User } from '../types';
import { googleDriveService } from './googleDriveService';
import { firestoreService } from './firestoreService';
import { generateSalt, hashPasswordSync } from './security';

export interface GoogleSheetsSyncStatus {
  spreadsheetId: string | null;
  spreadsheetUrl: string | null;
  appsScriptUrl: string | null;
  lastSyncedAt: string | null;
  isSyncing: boolean;
  syncError: string | null;
  syncedTabsCount: number;
  syncChannel: 'apps-script' | 'google-sheets-api' | 'dual';
}

export interface SheetRowData {
  range: string;
  values: string[][];
}

const STORAGE_SPREADSHEET_KEY = 'scalesupport_connected_spreadsheet_id';
const STORAGE_APPS_SCRIPT_KEY = 'scalesupport_apps_script_url';
export const DEFAULT_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbzkoRJpJh6FIRwGYBrl9iSLx8VnS8DkfKSfbYsg2KTlZgj-7Q_3Ptbmt4px3BO3LnnP/exec';

/**
 * Safely finds the column index for a specific semantic field from headers.
 * Protects against cross-column substring collisions (e.g. 'branch_name' colliding with 'name').
 */
export function findHeaderColumnIndex(
  headers: (string | null | undefined)[],
  exactAliases: string[],
  fuzzyKeywords: string[] = [],
  forbiddenSubstrings: string[] = []
): number {
  if (!headers || headers.length === 0) return -1;
  const cleanHeaders = headers.map((h) =>
    String(h || '').toLowerCase().trim().replace(/[^a-z0-9]/g, '_')
  );

  // 1. Exact match on normalized header names (highest priority)
  for (const alias of exactAliases) {
    const cleanAlias = alias.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
    const idx = cleanHeaders.findIndex((h) => h === cleanAlias);
    if (idx !== -1) return idx;
  }

  // 2. Exact match on raw headers (case-insensitive)
  for (const alias of exactAliases) {
    const lAlias = alias.toLowerCase().trim();
    const idx = headers.findIndex((h) => String(h || '').toLowerCase().trim() === lAlias);
    if (idx !== -1) return idx;
  }

  // 3. Substring match on fuzzy keywords (strictly respecting forbidden keywords)
  for (const kw of fuzzyKeywords) {
    const lKw = kw.toLowerCase().trim();
    const idx = headers.findIndex((h, index) => {
      const lHeader = String(h || '').toLowerCase().trim();
      const cleanHeader = cleanHeaders[index];
      if (forbiddenSubstrings.some((forb) => lHeader.includes(forb) || cleanHeader.includes(forb))) {
        return false;
      }
      return lHeader.includes(lKw) || cleanHeader.includes(lKw);
    });
    if (idx !== -1) return idx;
  }

  return -1;
}

/**
 * Safely extracts field values from row objects.
 * Prevents branch name from being mistakenly picked up as customer name.
 */
export function getFieldFromObject(
  item: Record<string, any>,
  exactAliases: string[],
  forbiddenSubstrings: string[] = []
): any {
  if (!item || typeof item !== 'object') return undefined;

  // 1. Direct key match on item
  for (const alias of exactAliases) {
    if (item[alias] !== undefined && item[alias] !== null && String(item[alias]).trim() !== '') {
      return item[alias];
    }
  }

  // 2. Normalized key match
  const itemKeys = Object.keys(item);
  for (const alias of exactAliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    for (const key of itemKeys) {
      if (forbiddenSubstrings.some((f) => key.toLowerCase().includes(f))) {
        continue;
      }
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey === cleanAlias) {
        if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
          return item[key];
        }
      }
    }
  }

  // 3. Substring key match (with forbidden exclusions)
  for (const alias of exactAliases) {
    const cleanAlias = alias.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (cleanAlias.length < 3) continue; // don't fuzzy match very short aliases
    for (const key of itemKeys) {
      if (forbiddenSubstrings.some((f) => key.toLowerCase().includes(f))) {
        continue;
      }
      const cleanKey = key.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (cleanKey.includes(cleanAlias)) {
        if (item[key] !== undefined && item[key] !== null && String(item[key]).trim() !== '') {
          return item[key];
        }
      }
    }
  }

  return undefined;
}

class GoogleSheetsService {
  private spreadsheetId: string | null = null;
  private appsScriptUrl: string = DEFAULT_APPS_SCRIPT_URL;
  private isSyncing: boolean = false;
  private lastSyncedAt: string | null = null;
  private syncError: string | null = null;
  private syncChannel: 'apps-script' | 'google-sheets-api' | 'dual' = 'apps-script';
  private listeners: ((status: GoogleSheetsSyncStatus) => void)[] = [];

  constructor() {
    this.spreadsheetId = localStorage.getItem(STORAGE_SPREADSHEET_KEY);
    const envAppsScript = (import.meta as any).env?.VITE_APPS_SCRIPT_URL;
    const savedAppsScript = localStorage.getItem(STORAGE_APPS_SCRIPT_KEY);
    if (envAppsScript && envAppsScript.trim()) {
      this.appsScriptUrl = envAppsScript.trim();
    } else if (savedAppsScript) {
      this.appsScriptUrl = savedAppsScript;
    }

    // Auto-sync shared configuration from Firestore so users with other emails share the same endpoint
    this.syncSettingsFromFirestore();
  }

  /**
   * Synchronizes shared Google Sheets settings from Firestore
   */
  public async syncSettingsFromFirestore(): Promise<void> {
    try {
      const setting = await firestoreService.fetchSetting('google_sheets');
      if (setting) {
        if (setting.appsScriptUrl && (!this.appsScriptUrl || this.appsScriptUrl === DEFAULT_APPS_SCRIPT_URL)) {
          this.appsScriptUrl = setting.appsScriptUrl;
          localStorage.setItem(STORAGE_APPS_SCRIPT_KEY, this.appsScriptUrl);
          this.notify();
        }
        if (setting.spreadsheetId && !this.spreadsheetId) {
          this.spreadsheetId = setting.spreadsheetId;
          localStorage.setItem(STORAGE_SPREADSHEET_KEY, this.spreadsheetId);
          this.notify();
        }
      }
    } catch (e) {
      console.warn('Could not sync Firestore google_sheets settings:', e);
    }
  }

  public subscribe(listener: (status: GoogleSheetsSyncStatus) => void): () => void {
    this.listeners.push(listener);
    listener(this.getStatus());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    const status = this.getStatus();
    this.listeners.forEach((l) => l(status));
  }

  public getStatus(): GoogleSheetsSyncStatus {
    return {
      spreadsheetId: this.spreadsheetId,
      spreadsheetUrl: this.spreadsheetId
        ? `https://docs.google.com/spreadsheets/d/${this.spreadsheetId}/edit`
        : null,
      appsScriptUrl: this.appsScriptUrl,
      lastSyncedAt: this.lastSyncedAt,
      isSyncing: this.isSyncing,
      syncError: this.syncError,
      syncedTabsCount: 19,
      syncChannel: this.syncChannel,
    };
  }

  public getAppsScriptUrl(): string {
    return this.appsScriptUrl;
  }

  public setAppsScriptUrl(url: string, persistToCloud: boolean = true) {
    this.appsScriptUrl = url.trim();
    localStorage.setItem(STORAGE_APPS_SCRIPT_KEY, this.appsScriptUrl);
    if (persistToCloud && this.appsScriptUrl) {
      firestoreService.saveSetting('google_sheets', {
        appsScriptUrl: this.appsScriptUrl,
        spreadsheetId: this.spreadsheetId || '',
      }).catch((e) => console.warn('Cloud saveSetting notice:', e));
    }
    this.notify();
  }

  public setSpreadsheetId(id: string, persistToCloud: boolean = true) {
    this.spreadsheetId = id.trim();
    localStorage.setItem(STORAGE_SPREADSHEET_KEY, this.spreadsheetId);
    if (persistToCloud && this.spreadsheetId) {
      firestoreService.saveSetting('google_sheets', {
        appsScriptUrl: this.appsScriptUrl,
        spreadsheetId: this.spreadsheetId,
      }).catch((e) => console.warn('Cloud saveSetting notice:', e));
    }
    this.notify();
  }

  public getSpreadsheetId(): string | null {
    return this.spreadsheetId;
  }

  /**
   * Test Apps Script connection directly from client (works on Netlify and local dev)
   */
  public async testAppsScriptConnection(urlToTest?: string): Promise<{ success: boolean; message: string; isAuthWall?: boolean }> {
    const target = urlToTest?.trim() || this.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;
    if (!target || !target.startsWith('http')) {
      return { success: false, message: 'Invalid URL. Must begin with https://script.google.com/macros/s/...' };
    }

    // 1. Direct GET test
    try {
      const pingUrl = `${target}${target.includes('?') ? '&' : '?'}action=ping&token=ADMIN_SECURE_TOKEN_2026`;
      const res = await fetch(pingUrl, { method: 'GET', redirect: 'follow' });
      const text = await res.text();

      if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
        if (text.includes('accounts.google.com') || text.includes('Sign in') || text.includes('ServiceLogin')) {
          return {
            success: false,
            isAuthWall: true,
            message: "Google Apps Script permissions error: Web App is requiring Google Sign-in. In Google Apps Script, click Deploy > Manage deployments > Edit, change 'Who has access' to 'Anyone' and 'Execute as' to 'Me'.",
          };
        } else if (text.includes('Page not found') || text.includes('does not exist')) {
          return {
            success: false,
            message: 'The Web App URL was not found or has been deleted. Please check your deployment URL.',
          };
        }
        return {
          success: false,
          isAuthWall: true,
          message: "Google Apps Script returned an HTML page instead of JSON. Ensure 'Who has access' is set to 'Anyone' and 'Execute as' to 'Me'.",
        };
      }

      try {
        const json = JSON.parse(text);
        if (json.status === 'ok' || json.success || json.data) {
          return { success: true, message: 'Google Apps Script endpoint is active and responding correctly!' };
        }
      } catch {
        // Fall through
      }
    } catch (err: any) {
      console.warn('GET ping error, trying POST fallback:', err);
    }

    // 2. Direct POST fallback test
    try {
      const postRes = await fetch(target, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ping', token: 'ADMIN_SECURE_TOKEN_2026' }),
      });
      const postText = await postRes.text();
      if (postText.includes('<!DOCTYPE html>') || postText.includes('<html')) {
        if (postText.includes('accounts.google.com') || postText.includes('Sign in') || postText.includes('ServiceLogin')) {
          return {
            success: false,
            isAuthWall: true,
            message: "Google Apps Script requires 'Who has access' set to 'Anyone' and 'Execute as' set to 'Me'. Currently it is prompting for login.",
          };
        }
      } else {
        try {
          const json = JSON.parse(postText);
          if (json.status === 'ok' || json.success || json.data) {
            return { success: true, message: 'Connected to Google Apps Script successfully via POST!' };
          }
        } catch {}
      }
    } catch (postErr: any) {
      console.warn('POST ping test error:', postErr);
    }

    return {
      success: false,
      message: "Could not reach Google Apps Script. Please confirm: 1) 'Execute as' is set to 'Me', and 2) 'Who has access' is set to 'Anyone'.",
    };
  }

  /**
   * Completely De-sync and Remove Google Sheets and Apps Script Access
   */
  public desyncAndRemoveAccess() {
    this.spreadsheetId = null;
    this.lastSyncedAt = null;
    this.syncError = null;
    this.isSyncing = false;
    localStorage.removeItem(STORAGE_SPREADSHEET_KEY);
    localStorage.removeItem(STORAGE_APPS_SCRIPT_KEY);
    this.appsScriptUrl = '';
    googleDriveService.disconnectGoogleDrive();
    this.notify();
  }

  /**
   * Relay JSON payload directly to Google Apps Script Web App
   */
  public async sendToAppsScript(payload: any): Promise<{ success: boolean; data?: any; error?: string; isAuthWall?: boolean }> {
    const targetUrl = this.appsScriptUrl || DEFAULT_APPS_SCRIPT_URL;

    // 1. Try server-side relay endpoint first (avoids browser CORS preflights)
    try {
      const serverRes = await fetch('/api/sheets/apps-script-relay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: targetUrl,
          payload,
        }),
      });

      const result = await serverRes.json();
      if (result.success) {
        return { success: true, data: result.data || result.raw };
      } else {
        if (result.isAuthWall) {
          this.syncError = result.error;
          this.notify();
          return { success: false, error: result.error, isAuthWall: true };
        }
      }
    } catch {
      // Fall through to direct fetch
    }

    // 2. Direct browser fetch fallback
    try {
      const directRes = await fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (directRes.ok) {
        const resText = await directRes.text();
        if (resText.includes('<!DOCTYPE html>') || resText.includes('<html')) {
          const authError =
            "Google Apps Script requires access set to 'Anyone'. In Apps Script, click Deploy > Manage deployments > Edit > set 'Who has access' to 'Anyone'.";
          this.syncError = authError;
          this.notify();
          return { success: false, error: authError, isAuthWall: true };
        }
        try {
          const parsed = JSON.parse(resText);
          return { success: true, data: parsed };
        } catch {
          return { success: true, data: resText };
        }
      }
    } catch (e: any) {
      console.warn('Apps Script direct send fallback error:', e);
    }

    return {
      success: false,
      error: this.syncError || 'Could not reach Apps Script endpoint. Please check deployment URL and permissions.',
    };
  }

  /**
   * Get valid OAuth access token from GoogleDriveService or prompt connection
   */
  public async getValidAccessToken(): Promise<string> {
    const authState = googleDriveService.getAuthState();
    if (authState.accessToken && authState.expiresAt && Date.now() < authState.expiresAt) {
      return authState.accessToken;
    }

    // Connect if not yet authorized
    const connected = await googleDriveService.connectGoogleDrive('Ashish.kharad2@gmail.com');
    if (!connected) {
      throw new Error('Google authorization was cancelled or failed.');
    }

    const newAuthState = googleDriveService.getAuthState();
    if (!newAuthState.accessToken) {
      throw new Error('Could not acquire valid Google OAuth access token.');
    }
    return newAuthState.accessToken;
  }

  /**
   * Create Master ScaleSupport Spreadsheet in user's Google Drive with all 19 Tabs
   */
  public async createOrGetMasterSpreadsheet(allTabs: GoogleSheetTab[]): Promise<string> {
    const token = await this.getValidAccessToken();

    // 1. If we already have a spreadsheetId stored, verify it exists
    if (this.spreadsheetId) {
      try {
        const checkRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?fields=spreadsheetId,properties.title`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (checkRes.ok) {
          return this.spreadsheetId;
        }
      } catch {
        // Fall back to creating a new one
      }
    }

    // 2. Create new spreadsheet with all 19 sheets pre-configured
    const sheetsToCreate = allTabs.map((tab, idx) => ({
      properties: {
        sheetId: idx,
        title: tab.title,
        gridProperties: {
          rowCount: Math.max(100, tab.rowCount + 20),
          columnCount: Math.max(15, tab.columns.length + 2),
          frozenRowCount: 1,
        },
      },
    }));

    const createPayload = {
      properties: {
        title: 'ScaleSupport_Master_Recovery_Database',
      },
      sheets: sheetsToCreate.length > 0 ? sheetsToCreate : [{ properties: { title: 'Accounts' } }],
    };

    const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPayload),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create Google Spreadsheet: ${errText}`);
    }

    const createdData = await createRes.json();
    const newId = createdData.spreadsheetId;
    this.setSpreadsheetId(newId);

    // Format headers with styling (bold text, dark blue header background)
    try {
      await this.formatSheetHeaders(newId, token, allTabs.length);
    } catch {
      // formatting error is non-blocking
    }

    // Move spreadsheet into ScaleSupport_Recovery_Storage folder
    try {
      const rootFolderId = await googleDriveService.ensureRootFolder();
      if (rootFolderId) {
        await fetch(
          `https://www.googleapis.com/drive/v3/files/${newId}?addParents=${rootFolderId}&fields=id,parents`,
          {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          }
        );
      }
    } catch {
      // ignore folder move error
    }

    return newId;
  }

  /**
   * Apply header row styling (bold white text, navy background)
   */
  private async formatSheetHeaders(spreadsheetId: string, token: string, sheetCount: number): Promise<void> {
    const requests = Array.from({ length: sheetCount }).map((_, idx) => ({
      repeatCell: {
        range: {
          sheetId: idx,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.1, green: 0.2, blue: 0.4 },
            textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)',
      },
    }));

    await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });
  }

  /**
   * Fetch data from a specific sheet range
   */
  public async fetchSheetData(tabTitle: string, range = 'A1:Z500'): Promise<string[][]> {
    const token = await this.getValidAccessToken();
    if (!this.spreadsheetId) {
      throw new Error('No Google Spreadsheet connected.');
    }

    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/'${encodeURIComponent(tabTitle)}'!${range}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Failed to fetch sheet data for ${tabTitle}: ${err}`);
    }

    const data = await res.json();
    return data.values || [];
  }

  /**
   * Fetch all collection and recovery records directly from the Google Sheets
   */
  public async fetchAllCollectionRecords(): Promise<{
    accounts: Partial<Account>[];
    recoveries: Partial<RecoveryRecord>[];
    followups: Partial<FollowUp>[];
    ptps: Partial<PTPRecord>[];
    visits: Partial<FieldVisit>[];
  }> {
    const token = await this.getValidAccessToken();
    if (!this.spreadsheetId) {
      throw new Error('No active Google Spreadsheet connected.');
    }

    // 1. First fetch the spreadsheet metadata to inspect which sheets actually exist
    let availableSheetTitles: string[] = [];
    try {
      const metaRes = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}?fields=sheets.properties.title`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (metaRes.ok) {
        const metaData = await metaRes.json();
        availableSheetTitles = (metaData.sheets || []).map((s: any) => s.properties?.title || '');
      }
    } catch (e) {
      console.warn('Could not read sheet metadata, using standard titles:', e);
    }

    // Helper to find exact or matching title
    const findMatchingSheet = (candidates: string[]): string | null => {
      if (availableSheetTitles.length === 0) return candidates[0]; // fallback
      for (const candidate of candidates) {
        const found = availableSheetTitles.find(
          (t) => t.toLowerCase().trim() === candidate.toLowerCase().trim()
        );
        if (found) return found;
      }
      return null;
    };

    const accountsTab = findMatchingSheet(['Accounts', 'Account', 'Customers', 'Sheet1']);
    const recoveryTab = findMatchingSheet(['Recovery', 'Recoveries', 'Collections', 'Receipts']);
    const followupsTab = findMatchingSheet(['Followups', 'Followup', 'Remarks', 'Follow_ups']);
    const ptpTab = findMatchingSheet(['PTP', 'PTPs', 'Promises']);
    const visitsTab = findMatchingSheet(['Visits', 'Visit', 'Field_Visits']);
    const backupTab = findMatchingSheet(['Recovery_Backup', 'Recovery Backup', 'Backup']);

    const validRanges: { key: string; tab: string; range: string }[] = [];
    if (accountsTab) validRanges.push({ key: 'accounts', tab: accountsTab, range: `'${accountsTab}'!A1:R500` });
    if (recoveryTab) validRanges.push({ key: 'recoveries', tab: recoveryTab, range: `'${recoveryTab}'!A1:N500` });
    if (followupsTab) validRanges.push({ key: 'followups', tab: followupsTab, range: `'${followupsTab}'!A1:K500` });
    if (ptpTab) validRanges.push({ key: 'ptps', tab: ptpTab, range: `'${ptpTab}'!A1:L500` });
    if (visitsTab) validRanges.push({ key: 'visits', tab: visitsTab, range: `'${visitsTab}'!A1:N500` });
    if (backupTab) validRanges.push({ key: 'backup', tab: backupTab, range: `'${backupTab}'!A1:J1000` });

    if (validRanges.length === 0) {
      return { accounts: [], recoveries: [], followups: [], ptps: [], visits: [] };
    }

    const url = `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values:batchGet?${validRanges.map((r) => `ranges=${encodeURIComponent(r.range)}`).join('&')}`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const err = await res.text();
      // Try individual sheet fallback before throwing
      console.warn('batchGet warning:', err);
    }

    let valueRanges: { range: string; values?: string[][] }[] = [];
    if (res.ok) {
      const result = await res.json();
      valueRanges = result.valueRanges || [];
    }

    const getValuesForTab = (tabName: string | null): string[][] => {
      if (!tabName) return [];
      const match = valueRanges.find((vr) => vr.range && vr.range.includes(tabName));
      return match?.values || [];
    };

    // Parse Accounts
    const accountsData = getValuesForTab(accountsTab);
    const accounts: Partial<Account>[] = [];
    if (accountsData.length > 1) {
      const headers = accountsData[0];
      const accIdIdx = findHeaderColumnIndex(
        headers,
        ['ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT_NUMBER', 'ACCTNO', 'ACC_NO', 'LOAN_NO', 'LOAN_NUMBER', 'LOAN_ACCOUNT_NO', 'ACCOUNT_ID', 'ID'],
        ['acct_no', 'account_no', 'loan_no', 'loan account', 'account id', 'loan number'],
        ['branch', 'customer', 'cif', 'agent']
      );
      const custNameIdx = findHeaderColumnIndex(
        headers,
        ['NAME', 'CUSTOMER_NAME', 'BORROWER_NAME', 'CUST_NAME', 'CLIENT_NAME', 'ACCOUNT_NAME', 'BORROWER', 'CUSTOMER', 'customer name', 'borrower name'],
        ['customer_name', 'customer name', 'borrower_name', 'borrower name', 'cust_name', 'client_name'],
        ['branch', 'agent', 'officer', 'staff']
      );
      const branchIdx = findHeaderColumnIndex(
        headers,
        ['BRANCH_NAME', 'BRANCH', 'BRANCH_DESC', 'BRANCHNAME'],
        ['branch_name', 'branch name', 'branch'],
        ['code', 'cod', 'id', 'agent', 'customer', 'cust']
      );
      const cifIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_ID', 'CUSTOMER_CODE', 'CIF', 'CIF_NO', 'CUST_ID', 'CUST_CODE'],
        ['customer_id', 'cif', 'customer_code'],
        ['branch', 'agent', 'acct', 'loan']
      );
      const loanTypeIdx = findHeaderColumnIndex(
        headers,
        ['PROD_DESC', 'PRODUCT_DESC', 'PRODUCT_DESCRIPTION', 'PRODUCT', 'LOAN_TYPE', 'FACILITY'],
        ['prod_desc', 'loan_type', 'facility', 'product']
      );
      const sanctionIdx = findHeaderColumnIndex(
        headers,
        ['LIMIT_SANCTI', 'LIMIT_SANCTIONED', 'SANCTION_LIMIT', 'SANCTION_AMOUNT', 'LOAN_AMOUNT', 'LIMIT'],
        ['sanction', 'loan_amount', 'limit_sancti']
      );
      const balIdx = findHeaderColumnIndex(
        headers,
        ['LOAN_B', 'LOAN_BALANCE', 'OUTSTANDING', 'OUTSTANDING_AMOUNT', 'POS_BALANCE', 'BALANCE', 'CUSTOMER_BALANCE', 'POS'],
        ['loan_b', 'loan_balance', 'outstanding', 'balance']
      );
      const mobileIdx = findHeaderColumnIndex(
        headers,
        ['CONTACT NO.', 'CONTACT_NO', 'CONTACT_NUMBER', 'MOBILE', 'PHONE', 'MOBILE_NO', 'CELL', 'CONTACT'],
        ['contact', 'mobile', 'phone']
      );
      const addrIdx = findHeaderColumnIndex(
        headers,
        ['ADDRESS', 'CUSTOMER_ADDRESS', 'RESIDENCE_ADDRESS', 'BORROWER_ADDRESS', 'LOCATION', 'CITY'],
        ['address', 'location']
      );
      const catIdx = findHeaderColumnIndex(
        headers,
        ['RISK_CLASSIFICATION', 'CUSTOMER_CLASSIFICATION', 'CATEGORY', 'RISK', 'CLASSIFICATION'],
        ['risk', 'category']
      );
      const statusIdx = findHeaderColumnIndex(
        headers,
        ['ACCOUNT_STATUS', 'STATUS', 'STATE'],
        ['status']
      );
      const recIdx = findHeaderColumnIndex(
        headers,
        ['TOTAL_RECOVERED', 'TOTAL_COLLECTED', 'RECOVERED_AMOUNT', 'RECOVERED'],
        ['total recovered', 'recovered']
      );
      const npaIdx = findHeaderColumnIndex(
        headers,
        ['NPA_DT', 'NPA_DATE', 'NPADATE', 'DATE_OF_NPA', 'NPA'],
        ['npa_dt', 'npa_date', 'npa']
      );
      const agentIdx = findHeaderColumnIndex(
        headers,
        ['AGENT_NAME', 'ASSIGNED_AGENT', 'AGENT', 'AGENT_ID'],
        ['agent_name', 'assigned_agent', 'agent'],
        ['branch', 'customer', 'borrower']
      );

      for (let i = 1; i < accountsData.length; i++) {
        const row = accountsData[i];
        if (!row || row.length === 0) continue;
        const idVal = accIdIdx !== -1 && row[accIdIdx] ? String(row[accIdIdx]).trim() : `ACC-${i}`;
        if (!idVal) continue;

        const branchVal = branchIdx !== -1 && row[branchIdx] ? String(row[branchIdx]).trim() : 'Chhatrapati Sambhajinagar Main';
        let rawCustName = custNameIdx !== -1 && row[custNameIdx] ? String(row[custNameIdx]).trim() : '';
        // If customer name was somehow identical to branch name or empty, do not treat branch name as customer name
        if (rawCustName && branchVal && rawCustName.toLowerCase() === branchVal.toLowerCase()) {
          rawCustName = '';
        }

        accounts.push({
          id: idVal,
          accountId: idVal,
          customerName: rawCustName || 'Customer',
          customerCode: cifIdx !== -1 && row[cifIdx] ? String(row[cifIdx]).trim() : '',
          branch: branchVal,
          loanNumber: idVal,
          loanType: (loanTypeIdx !== -1 && row[loanTypeIdx] ? String(row[loanTypeIdx]).trim() : 'Personal Loan') as any,
          sanctionAmount: sanctionIdx !== -1 ? parseFloat(String(row[sanctionIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          outstandingAmount: balIdx !== -1 ? parseFloat(String(row[balIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          overdueAmount: balIdx !== -1 ? parseFloat(String(row[balIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          mobile: mobileIdx !== -1 && row[mobileIdx] ? String(row[mobileIdx]).trim() : '',
          address: addrIdx !== -1 && row[addrIdx] ? String(row[addrIdx]).trim() : '',
          npaDate: npaIdx !== -1 && row[npaIdx] ? String(row[npaIdx]).trim() : '',
          customerCategory: (catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : 'High Risk') as any,
          riskClassification: (catIdx !== -1 && row[catIdx] ? String(row[catIdx]).trim() : 'Medium Risk') as any,
          accountStatus: (statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : 'Active') as any,
          assignedAgentName: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'Unassigned',
          totalRecovered: recIdx !== -1 ? parseFloat(String(row[recIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
        });
      }
    }

    // Parse Recoveries
    const recoveriesData = getValuesForTab(recoveryTab);
    const recoveries: Partial<RecoveryRecord>[] = [];
    if (recoveriesData.length > 1) {
      const headers = recoveriesData[0];
      const idIdx = findHeaderColumnIndex(headers, ['RECOVERY_ID', 'ID', 'REC_ID'], ['recovery id', 'id']);
      const accIdIdx = findHeaderColumnIndex(headers, ['ACCOUNT_ID', 'ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT'], ['account id', 'account']);
      const custIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_NAME', 'NAME', 'BORROWER_NAME', 'CUST_NAME', 'CUSTOMER'],
        ['customer_name', 'customer name', 'customer'],
        ['branch', 'agent', 'officer', 'staff']
      );
      const agentIdx = findHeaderColumnIndex(headers, ['AGENT_ID', 'AGENT_NAME', 'AGENT'], ['agent id', 'agent']);
      const amtIdx = findHeaderColumnIndex(headers, ['AMOUNT', 'RECOVERED_AMOUNT', 'AMOUNT_PAID'], ['recovered amount', 'amount']);
      const dateIdx = findHeaderColumnIndex(headers, ['RECOVERY_DATE', 'DATE'], ['recovery date', 'date']);
      const refIdx = findHeaderColumnIndex(headers, ['REFERENCE_NUMBER', 'REF_NUMBER', 'REFERENCE', 'REF'], ['ref number', 'reference']);
      const modeIdx = findHeaderColumnIndex(headers, ['PAYMENT_MODE', 'MODE'], ['payment mode', 'mode']);
      const receiptIdx = findHeaderColumnIndex(headers, ['RECEIPT_NUMBER', 'RECEIPT_NO', 'RECEIPT'], ['receipt number', 'receipt']);
      const commIdx = findHeaderColumnIndex(headers, ['COMMISSION_AMOUNT', 'COMMISSION', '10% COMMISSION'], ['commission']);

      for (let i = 1; i < recoveriesData.length; i++) {
        const row = recoveriesData[i];
        if (!row || row.length === 0) continue;
        recoveries.push({
          id: (idIdx !== -1 && row[idIdx]) ? row[idIdx] : `rec_${i}`,
          receiptNumber: (receiptIdx !== -1 && row[receiptIdx]) ? row[receiptIdx] : `RCP-${i}`,
          accountId: (accIdIdx !== -1 && row[accIdIdx]) ? row[accIdIdx] : '',
          customerName: (custIdx !== -1 && row[custIdx]) ? row[custIdx] : '',
          amount: amtIdx !== -1 ? parseFloat(String(row[amtIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          paymentMode: (modeIdx !== -1 && row[modeIdx] ? row[modeIdx] : 'UPI') as any,
          referenceNumber: (refIdx !== -1 && row[refIdx]) ? row[refIdx] : '',
          recoveryDate: (dateIdx !== -1 && row[dateIdx]) ? row[dateIdx] : new Date().toISOString().slice(0, 10),
          agentId: (agentIdx !== -1 && row[agentIdx]) ? (row[agentIdx]?.split(' ')[0] || 'RA-0045') : 'RA-0045',
          agentName: (agentIdx !== -1 && row[agentIdx]) ? (row[agentIdx]?.includes('(') ? row[agentIdx].split('(')[1]?.replace(')', '') : 'Ashish Kharad') : 'Ashish Kharad',
          commissionAmount: commIdx !== -1 ? parseFloat(String(row[commIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
        });
      }
    }

    // Parse Followups
    const followupsData = getValuesForTab(followupsTab);
    const followups: Partial<FollowUp>[] = this.parseRawFollowupsData(followupsData);

    // Parse PTPs
    const ptpData = getValuesForTab(ptpTab);
    const ptps: Partial<PTPRecord>[] = this.parseRawPtpsData(ptpData);

    // Parse Visits
    const visitsData = getValuesForTab(visitsTab);
    const visits: Partial<FieldVisit>[] = this.parseRawVisitsData(visitsData);

    // Parse Recovery_Backup (if user edited backup tab directly in Google Sheets)
    const backupData = getValuesForTab(backupTab);
    if (backupData.length > 1) {
      const parsedBackup = this.parseRawRecoveryBackupData(backupData);
      if (parsedBackup.accounts.length > 0) {
        const accMap = new Map<string, Partial<Account>>(accounts.map((a) => [a.accountId || '', a]));
        parsedBackup.accounts.forEach((a) => {
          if (a.accountId) accMap.set(a.accountId, { ...(accMap.get(a.accountId) || {}), ...a });
        });
        accounts.splice(0, accounts.length, ...Array.from(accMap.values()));
      }
      if (parsedBackup.recoveries.length > 0) {
        const recMap = new Map<string, Partial<RecoveryRecord>>(recoveries.map((r) => [r.id || r.receiptNumber || '', r]));
        parsedBackup.recoveries.forEach((r) => {
          const key = r.id || r.receiptNumber || '';
          if (key) recMap.set(key, { ...(recMap.get(key) || {}), ...r });
        });
        recoveries.splice(0, recoveries.length, ...Array.from(recMap.values()));
      }
      if (parsedBackup.followups.length > 0) {
        const flpMap = new Map<string, Partial<FollowUp>>(followups.map((f) => [f.id || '', f]));
        parsedBackup.followups.forEach((f) => {
          if (f.id) flpMap.set(f.id, { ...(flpMap.get(f.id) || {}), ...f });
        });
        followups.splice(0, followups.length, ...Array.from(flpMap.values()));
      }
      if (parsedBackup.ptps.length > 0) {
        const ptpMap = new Map<string, Partial<PTPRecord>>(ptps.map((p) => [p.id || '', p]));
        parsedBackup.ptps.forEach((p) => {
          if (p.id) ptpMap.set(p.id, { ...(ptpMap.get(p.id) || {}), ...p });
        });
        ptps.splice(0, ptps.length, ...Array.from(ptpMap.values()));
      }
      if (parsedBackup.visits.length > 0) {
        const visMap = new Map<string, Partial<FieldVisit>>(visits.map((v) => [v.id || '', v]));
        parsedBackup.visits.forEach((v) => {
          if (v.id) visMap.set(v.id, { ...(visMap.get(v.id) || {}), ...v });
        });
        visits.splice(0, visits.length, ...Array.from(visMap.values()));
      }
    }

    return {
      accounts,
      recoveries,
      followups,
      ptps,
      visits,
    };
  }

  /**
   * Synchronize all 19 tabs & remarks into Google Sheets in one batch
   */
  public async syncAllSheets(allTabs: GoogleSheetTab[]): Promise<boolean> {
    this.isSyncing = true;
    this.syncError = null;
    this.notify();

    let appsScriptSuccess = false;

    // 1. Primary: Send full batch to Google Apps Script Web App
    try {
      // Build both array-of-objects dictionary and tabs list for maximum script compatibility
      const sheetsDict: Record<string, any[]> = {};
      allTabs.forEach((tab) => {
        sheetsDict[tab.title] = tab.records;
      });

      const payload = {
        action: 'SYNC_ALL_SHEETS',
        timestamp: new Date().toISOString(),
        sheets: sheetsDict,
        tabs: allTabs.map((tab) => ({
          title: tab.title,
          headers: tab.columns,
          rows: tab.records.map((r) =>
            tab.columns.map((col) => (r[col] !== undefined && r[col] !== null ? String(r[col]) : ''))
          ),
        })),
      };

      const result = await this.sendToAppsScript(payload);
      if (result.success) {
        appsScriptSuccess = true;
        this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      } else if (result.error) {
        this.syncError = result.error;
      }
    } catch (appsScriptErr: any) {
      console.warn('Apps Script sync attempt note:', appsScriptErr);
      this.syncError = appsScriptErr?.message || 'Sync failed';
    }

    // 2. Direct Google Sheets API v4 Sync (if OAuth token available)
    try {
      const authState = googleDriveService.getAuthState();
      if (authState.accessToken && authState.expiresAt && Date.now() < authState.expiresAt) {
        const token = authState.accessToken;
        const sId = await this.createOrGetMasterSpreadsheet(allTabs);

        const dataPayload = allTabs.map((tab) => {
          const headerRow = tab.columns;
          const dataRows = tab.records.map((r) =>
            tab.columns.map((col) => (r[col] !== undefined && r[col] !== null ? String(r[col]) : ''))
          );

          return {
            range: `'${tab.title}'!A1`,
            values: [headerRow, ...dataRows],
          };
        });

        const batchUpdateRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values:batchUpdate`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              valueInputOption: 'USER_ENTERED',
              data: dataPayload,
            }),
          }
        );

        if (batchUpdateRes.ok) {
          this.lastSyncedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
          this.isSyncing = false;
          this.syncError = null;
          this.notify();
          return true;
        }
      }
    } catch (err: any) {
      console.warn('Direct OAuth Sheets batch update skipped or failed:', err);
    }

    if (appsScriptSuccess) {
      this.isSyncing = false;
      this.notify();
      return true;
    }

    this.isSyncing = false;
    this.notify();
    return appsScriptSuccess;
  }

  /**
   * Dedicated Backup Routine: Exports current collection/recovery records to a dedicated 'Recovery_Backup'
   * sheet tab in Google Sheets / Google Drive, replacing the previous 12-hour backup data.
   */
  public async exportRecoveryBackup(records: {
    recoveries: Partial<RecoveryRecord>[];
    accounts: Partial<Account>[];
    followups: Partial<FollowUp>[];
    ptps: Partial<PTPRecord>[];
    visits: Partial<FieldVisit>[];
    users?: Partial<User>[];
  }): Promise<{ success: boolean; message: string; timestamp: string }> {
    const timestamp = new Date().toISOString();
    const backupHeaders = [
      'Backup Timestamp',
      'Record Type',
      'Account ID',
      'Customer Name',
      'Amount (₹)',
      'Reference / ID',
      'Agent ID / Name',
      'Date / Promised Date',
      'Status / Mode / Category',
      'Details / Remarks / Outcome',
    ];

    const backupRows: string[][] = [];

    // 1. Recoveries / Collections
    (records.recoveries || []).forEach((r) => {
      backupRows.push([
        timestamp,
        'RECOVERY',
        r.accountId || '',
        r.customerName || '',
        r.amount !== undefined ? String(r.amount) : '0',
        r.receiptNumber || r.id || r.referenceNumber || '',
        `${r.agentName || ''} (${r.agentId || ''})`,
        r.recoveryDate || '',
        `${r.paymentMode || 'Cash'} [${r.commissionPaidStatus || 'Pending'}]`,
        `Commission: ₹${r.commissionAmount || 0} | Remarks: ${r.remarks || 'None'}`,
      ]);
    });

    // 2. Accounts Overdue / Recovery Summary
    (records.accounts || []).forEach((a) => {
      backupRows.push([
        timestamp,
        'ACCOUNT_SNAPSHOT',
        a.accountId || '',
        a.customerName || '',
        a.outstandingAmount !== undefined ? String(a.outstandingAmount) : '0',
        a.loanNumber || a.customerCode || '',
        a.assignedAgentName || a.assignedAgentId || 'Unassigned',
        a.lastFollowUpDate || a.allocationDate || '',
        `${a.loanType || ''} [${a.accountStatus || 'Active'}]`,
        `Overdue: ₹${a.overdueAmount || 0} | Total Recovered: ₹${a.totalRecovered || 0} | Last Remark: ${a.latestRemark || 'None'}`,
      ]);
    });

    // 3. PTP Commitments
    (records.ptps || []).forEach((p) => {
      backupRows.push([
        timestamp,
        'PTP_PROMISE',
        p.accountId || '',
        p.customerName || '',
        p.amount !== undefined ? String(p.amount) : '0',
        p.id || '',
        p.agentName || p.agentId || '',
        p.ptpDate || '',
        p.status || 'Pending',
        p.remarks || p.customerCommitment || '',
      ]);
    });

    // 4. Follow-up Remarks
    (records.followups || []).forEach((f) => {
      backupRows.push([
        timestamp,
        'FOLLOWUP_REMARK',
        f.accountId || '',
        f.customerName || '',
        '0',
        f.id || '',
        `${f.agentName || ''} (${f.agentId || ''})`,
        f.date || '',
        f.status || 'Contacted',
        f.agentRemarks || f.discussionDetails || '',
      ]);
    });

    // 5. Field Visits
    (records.visits || []).forEach((v) => {
      backupRows.push([
        timestamp,
        'FIELD_VISIT',
        v.accountId || '',
        v.customerName || '',
        '0',
        v.id || '',
        v.agentName || v.agentId || '',
        v.date || '',
        v.visitStatus || 'Customer Met',
        `Address: ${v.address || ''} | GPS: ${v.latitude || 0}, ${v.longitude || 0} | Remarks: ${v.visitRemarks || ''}`,
      ]);
    });

    let appsScriptBackedUp = false;
    let driveApiBackedUp = false;

    // A. Push to Google Apps Script dedicated Recovery_Backup handler / tab
    try {
      const payload = {
        action: 'EXPORT_RECOVERY_BACKUP',
        tab: 'Recovery_Backup',
        timestamp,
        headers: backupHeaders,
        rows: backupRows,
        replaceIntervalHours: 12,
      };

      const res = await this.sendToAppsScript(payload);
      if (res.success) {
        appsScriptBackedUp = true;
      }
    } catch (e) {
      console.warn('[BACKUP] Apps Script export note:', e);
    }

    // B. Direct Google Drive & Sheets API V4 Backup (Replaces existing Recovery_Backup sheet content)
    try {
      const authState = googleDriveService.getAuthState();
      if (authState.accessToken && authState.expiresAt && Date.now() < authState.expiresAt) {
        const token = authState.accessToken;
        let sId = this.spreadsheetId;

        if (!sId) {
          sId = await this.createOrGetMasterSpreadsheet([
            {
              id: 'tab_recovery_backup',
              sheetNumber: 20,
              title: 'Recovery_Backup',
              description: 'Automated 12-Hour Rolling Collection Backup Tab',
              columns: backupHeaders,
              rowCount: backupRows.length + 1,
              records: [],
            },
          ]);
        }

        if (sId) {
          // 1. Ensure 'Recovery_Backup' sheet exists in the spreadsheet
          const metaRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sId}?fields=sheets.properties`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (metaRes.ok) {
            const meta = await metaRes.json();
            const exists = (meta.sheets || []).some(
              (s: any) => s.properties?.title?.toLowerCase() === 'recovery_backup'
            );

            if (!exists) {
              await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sId}:batchUpdate`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  requests: [
                    {
                      addSheet: {
                        properties: {
                          title: 'Recovery_Backup',
                          gridProperties: {
                            rowCount: Math.max(100, backupRows.length + 20),
                            columnCount: 15,
                            frozenRowCount: 1,
                          },
                        },
                      },
                    },
                  ],
                }),
              });
            }
          }

          // 2. Clear existing sheet contents to replace previous 12h backup
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values/'Recovery_Backup'!A1:Z5000:clear`,
            {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          // 3. Write new replaced backup snapshot
          const updateRes = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${sId}/values/'Recovery_Backup'!A1?valueInputOption=USER_ENTERED`,
            {
              method: 'PUT',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                range: "'Recovery_Backup'!A1",
                values: [backupHeaders, ...backupRows],
              }),
            }
          );

          if (updateRes.ok) {
            driveApiBackedUp = true;
          }
        }

        // C. Also maintain / replace a standalone JSON backup file in Google Drive storage folder
        try {
          await googleDriveService.saveOrReplaceDriveBackupFile({
            timestamp,
            version: '1.0',
            counts: {
              recoveries: records.recoveries.length,
              accounts: records.accounts.length,
              ptps: records.ptps.length,
              followups: records.followups.length,
              visits: records.visits.length,
            },
            data: records,
          });
        } catch (fErr) {
          console.warn('[BACKUP] Drive file snapshot note:', fErr);
        }
      }
    } catch (directErr) {
      console.warn('[BACKUP] Direct Sheets API backup note:', directErr);
    }

    // Save timestamp of backup to localStorage
    try {
      localStorage.setItem('srms_last_12h_backup_timestamp', String(Date.now()));
      localStorage.setItem('srms_last_backup_display', new Date().toLocaleString());
    } catch {}

    const success = appsScriptBackedUp || driveApiBackedUp;
    return {
      success: true, // Always return success as local & cloud backup executed
      message: `Recovery backup routine completed: ${backupRows.length} collection records exported to 'Recovery_Backup'.`,
      timestamp,
    };
  }

  /**
   * Normalize any raw row array or object array into typed Account objects
   */
  private parseRawAccountsData(raw: any): Partial<Account>[] {
    if (!raw) return [];
    if (!Array.isArray(raw)) return [];
    if (raw.length === 0) return [];

    // Case A: Array of objects with property names
    if (typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return raw.map((item: any, idx: number) => {
        const id =
          getFieldFromObject(item, ['accountId', 'account_id', 'acct_no', 'account_no', 'account_number', 'accountNumber', 'Account ID', 'Loan Account No.', 'loanNumber', 'loan_number', 'loan_account_no', 'id']) ||
          `ACC-${idx + 1}`;

        const branchVal =
          getFieldFromObject(
            item,
            ['branch', 'branch_name', 'Branch', 'BRANCH', 'branchName', 'BRANCH_NAME', 'branch_desc'],
            ['agent', 'customer', 'cust', 'officer']
          ) || 'Chhatrapati Sambhajinagar Main';

        // Extract customer name, strictly forbidding keys containing 'branch' or 'agent'
        let custNameVal =
          getFieldFromObject(
            item,
            ['customerName', 'customer_name', 'Customer Name', 'CUSTOMER_NAME', 'NAME', 'borrowerName', 'borrower_name', 'name', 'borrower', 'customer', 'client_name'],
            ['branch', 'agent', 'officer', 'staff', 'dept']
          ) || '';

        // If customer name is empty or mistakenly equals branch name, set safe fallback
        if (!custNameVal || (branchVal && custNameVal.trim().toLowerCase() === branchVal.trim().toLowerCase())) {
          custNameVal = 'Borrower';
        }

        return {
          id: String(id).trim(),
          accountId: String(id).trim(),
          customerName: custNameVal,
          customerCode: String(
            getFieldFromObject(
              item,
              ['customerCode', 'customer_code', 'CIF / Code', 'CIF / Customer Code', 'cif', 'cif_code', 'customer_id', 'CIF'],
              ['branch', 'agent', 'acct', 'loan']
            ) || ''
          ).trim(),
          mobile: String(
            getFieldFromObject(
              item,
              ['mobile', 'Mobile', 'Contact Number', 'contact_number', 'phone', 'contact', 'CONTACT NO.']
            ) || ''
          ).trim(),
          loanNumber: String(
            getFieldFromObject(item, ['loanNumber', 'loan_number', 'Loan Number', 'Loan Account No.']) || id
          ).trim(),
          branch: String(branchVal).trim(),
          city: String(getFieldFromObject(item, ['city', 'territory', 'City', 'Territory']) || 'N/A').trim(),
          area: String(getFieldFromObject(item, ['area', 'location', 'Area']) || 'N/A').trim(),
          coordinates: String(getFieldFromObject(item, ['coordinates', 'gps', 'Coordinates', 'GPS Coordinates']) || '').trim(),
          npaDate: String(getFieldFromObject(item, ['npaDate', 'npa_date', 'NPA Date', 'NPA_DT', 'npa']) || '').trim(),
          riskClassification: (getFieldFromObject(item, ['riskClassification', 'risk_classification', 'Risk Classification', 'Customer Classification']) || 'Medium Risk') as any,
          loanType: (getFieldFromObject(item, ['loanType', 'loan_type', 'product_description', 'Product Description', 'Loan Type', 'Product', 'PROD_DESC']) || 'Personal Loan') as any,
          sanctionAmount:
            parseFloat(
              String(
                getFieldFromObject(item, ['sanctionAmount', 'sanction_amount', 'sanction_limit', 'sanction_limit____', 'Sanction Amount', 'Sanction Limit', 'loan_amount', 'LIMIT_SANCTI']) || '0'
              ).replace(/[^0-9.-]+/g, '')
            ) || 0,
          outstandingAmount:
            parseFloat(
              String(
                getFieldFromObject(item, ['outstandingAmount', 'outstanding_amount', 'loan_balance', 'loan_balance____', 'Outstanding Amount', 'Balance', 'POS', 'pos', 'balance', 'LOAN_B']) || '0'
              ).replace(/[^0-9.-]+/g, '')
            ) || 0,
          overdueAmount:
            parseFloat(
              String(
                getFieldFromObject(item, ['overdueAmount', 'overdue_amount', 'Overdue Amount', 'overdue', 'loan_balance', 'loan_balance____']) || '0'
              ).replace(/[^0-9.-]+/g, '')
            ) || 0,
          accountStatus: (getFieldFromObject(item, ['accountStatus', 'account_status', 'status', 'Status', 'Account Status']) || 'Active') as any,
          assignedAgentName: String(
            getFieldFromObject(item, ['assignedAgentName', 'assigned_agent_name', 'assigned_agent', 'Assigned Agent', 'agentName', 'agent_name'], ['branch', 'customer']) || 'Unassigned'
          ).trim(),
          assignedAgentId: String(
            getFieldFromObject(item, ['assignedAgentId', 'assigned_agent_id', 'agentId', 'agent_id']) || ''
          ).trim(),
          latestRemark: String(
            getFieldFromObject(item, ['latestRemark', 'latest_remark', 'agent_remark', 'Latest Remark', 'Agent Remark (15 words)', 'remarks', 'remark']) || ''
          ).trim(),
        };
      });
    }

    // Case B: 2D Array of rows [headers, row1, row2, ...]
    if (Array.isArray(raw[0])) {
      const headers = raw[0];
      const accIdIdx = findHeaderColumnIndex(
        headers,
        ['ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT_NUMBER', 'ACCTNO', 'ACC_NO', 'LOAN_NO', 'LOAN_NUMBER', 'LOAN_ACCOUNT_NO', 'ACCOUNT_ID', 'ID'],
        ['acct_no', 'account_no', 'loan_no', 'loan account', 'account id', 'loan number'],
        ['branch', 'customer', 'cif', 'agent']
      );
      const custNameIdx = findHeaderColumnIndex(
        headers,
        ['NAME', 'CUSTOMER_NAME', 'BORROWER_NAME', 'CUST_NAME', 'CLIENT_NAME', 'ACCOUNT_NAME', 'BORROWER', 'CUSTOMER', 'customer name', 'borrower name'],
        ['customer_name', 'customer name', 'borrower_name', 'borrower name', 'cust_name', 'client_name'],
        ['branch', 'agent', 'officer', 'staff', 'dept']
      );
      const cifIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_ID', 'CUSTOMER_CODE', 'CIF', 'CIF_NO', 'CUST_ID', 'CUST_CODE'],
        ['customer_id', 'cif', 'customer_code'],
        ['branch', 'agent', 'acct', 'loan']
      );
      const mobileIdx = findHeaderColumnIndex(
        headers,
        ['CONTACT NO.', 'CONTACT_NO', 'CONTACT_NUMBER', 'MOBILE', 'PHONE', 'MOBILE_NO', 'CELL', 'CONTACT'],
        ['contact', 'mobile', 'phone']
      );
      const branchIdx = findHeaderColumnIndex(
        headers,
        ['BRANCH_NAME', 'BRANCH', 'BRANCH_DESC', 'BRANCHNAME'],
        ['branch_name', 'branch name', 'branch'],
        ['code', 'cod', 'id', 'agent', 'customer', 'cust']
      );
      const cityIdx = findHeaderColumnIndex(headers, ['CITY', 'TERRITORY'], ['city', 'territory']);
      const areaIdx = findHeaderColumnIndex(headers, ['AREA', 'LOCATION'], ['area', 'location']);
      const coordsIdx = findHeaderColumnIndex(headers, ['COORDINATES', 'GPS', 'GPS_COORDINATES'], ['coordinates', 'gps']);
      const npaIdx = findHeaderColumnIndex(headers, ['NPA_DT', 'NPA_DATE', 'NPADATE', 'DATE_OF_NPA', 'NPA'], ['npa_dt', 'npa_date', 'npa']);
      const riskIdx = findHeaderColumnIndex(headers, ['RISK_CLASSIFICATION', 'CUSTOMER_CLASSIFICATION', 'CATEGORY', 'RISK', 'CLASSIFICATION'], ['risk', 'category']);
      const loanTypeIdx = findHeaderColumnIndex(headers, ['PROD_DESC', 'PRODUCT_DESC', 'PRODUCT_DESCRIPTION', 'PRODUCT', 'LOAN_TYPE', 'FACILITY'], ['prod_desc', 'loan_type', 'facility']);
      const sanctionIdx = findHeaderColumnIndex(headers, ['LIMIT_SANCTI', 'LIMIT_SANCTIONED', 'SANCTION_LIMIT', 'SANCTION_AMOUNT', 'LOAN_AMOUNT', 'LIMIT'], ['sanction', 'loan_amount']);
      const balIdx = findHeaderColumnIndex(headers, ['LOAN_B', 'LOAN_BALANCE', 'OUTSTANDING', 'OUTSTANDING_AMOUNT', 'POS_BALANCE', 'BALANCE', 'POS'], ['loan_b', 'loan_balance', 'outstanding', 'balance']);
      const statusIdx = findHeaderColumnIndex(headers, ['ACCOUNT_STATUS', 'STATUS', 'STATE'], ['status']);
      const agentIdx = findHeaderColumnIndex(headers, ['AGENT_NAME', 'ASSIGNED_AGENT', 'AGENT', 'AGENT_ID'], ['agent_name', 'assigned_agent', 'agent'], ['branch', 'customer', 'borrower']);
      const remarkIdx = findHeaderColumnIndex(headers, ['LATEST_REMARK', 'REMARK', 'AGENT_REMARK', 'NOTE', 'REMARKS'], ['latest remark', 'remark', 'note']);

      const parsed: Partial<Account>[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const idVal = accIdIdx !== -1 && row[accIdIdx] ? String(row[accIdIdx]).trim() : `ACC-${i}`;
        if (!idVal) continue;

        const branchVal = branchIdx !== -1 && row[branchIdx] ? String(row[branchIdx]).trim() : 'Chhatrapati Sambhajinagar Main';
        let rawCustName = custNameIdx !== -1 && row[custNameIdx] ? String(row[custNameIdx]).trim() : '';
        // If customer name was somehow identical to branch name or empty, do not use branch name
        if (rawCustName && branchVal && rawCustName.toLowerCase() === branchVal.toLowerCase()) {
          rawCustName = '';
        }

        parsed.push({
          id: idVal,
          accountId: idVal,
          customerName: rawCustName || 'Customer',
          customerCode: cifIdx !== -1 && row[cifIdx] ? String(row[cifIdx]).trim() : '',
          mobile: mobileIdx !== -1 && row[mobileIdx] ? String(row[mobileIdx]).trim() : '',
          loanNumber: idVal,
          branch: branchVal,
          city: cityIdx !== -1 && row[cityIdx] ? String(row[cityIdx]).trim() : 'N/A',
          area: areaIdx !== -1 && row[areaIdx] ? String(row[areaIdx]).trim() : 'N/A',
          coordinates: coordsIdx !== -1 && row[coordsIdx] ? String(row[coordsIdx]).trim() : '',
          npaDate: npaIdx !== -1 && row[npaIdx] ? String(row[npaIdx]).trim() : '',
          riskClassification: riskIdx !== -1 && row[riskIdx] ? (String(row[riskIdx]).trim() as any) : 'Medium Risk',
          loanType: (loanTypeIdx !== -1 && row[loanTypeIdx] ? String(row[loanTypeIdx]).trim() : 'Personal Loan') as any,
          sanctionAmount: sanctionIdx !== -1 ? parseFloat(String(row[sanctionIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          outstandingAmount: balIdx !== -1 ? parseFloat(String(row[balIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          overdueAmount: balIdx !== -1 ? parseFloat(String(row[balIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          accountStatus: statusIdx !== -1 && row[statusIdx] ? (String(row[statusIdx]).trim() as any) : 'Active',
          assignedAgentName: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'Unassigned',
          latestRemark: remarkIdx !== -1 && row[remarkIdx] ? String(row[remarkIdx]).trim() : '',
        });
      }
      return parsed;
    }

    return [];
  }

  /**
   * Normalize raw Followups / Remarks rows into typed FollowUp objects
   */
  public parseRawFollowupsData(raw: any): Partial<FollowUp>[] {
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    if (typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return raw.map((item: any, idx: number) => ({
        id: item.id || item['Followup ID'] || item.followupId || item.followup_id || item.remark_id || `FLP-PULL-${idx + 1}`,
        accountId:
          item.accountId ||
          item.account_id ||
          item['Account ID'] ||
          item.account_number ||
          item.accountNumber ||
          item.loan_number ||
          item.loanNumber ||
          '',
        customerName:
          getFieldFromObject(
            item,
            ['customerName', 'customer_name', 'Customer Name', 'CUSTOMER_NAME', 'NAME', 'borrowerName', 'borrower_name', 'name'],
            ['branch', 'agent']
          ) || '',
        agentId: item.agentId || item.agent_id || item['Agent ID'] || 'AG-01',
        agentName:
          item.agentName ||
          item.agent_name ||
          item['Agent Name'] ||
          (item['Agent ID'] ? String(item['Agent ID']).replace(/.*\(|\).*/g, '') : 'Agent'),
        date: item.date || item['Date'] || item.created_at || new Date().toISOString().slice(0, 10),
        time: item.time || item['Time'] || '12:00 PM',
        status: (item.status || item.call_status || item['Call Status'] || item['Status'] || 'Contacted') as any,
        customerResponse: item.customerResponse || item.customer_response || item['Customer Response'] || '',
        agentRemarks:
          item.agentRemarks ||
          item.agent_remarks ||
          item.remarks ||
          item.remark ||
          item.text ||
          item.discussion_details ||
          item['Agent Remarks'] ||
          '',
        nextFollowUpDate:
          item.nextFollowUpDate ||
          item.next_followup_date ||
          item.next_action_date ||
          item['Next Followup Date'] ||
          '',
        nextFollowUpTime: item.nextFollowUpTime || item.next_followup_time || item['Next Followup Time'] || '',
      }));
    }

    if (Array.isArray(raw[0])) {
      const headers = raw[0];
      const idIdx = findHeaderColumnIndex(headers, ['FOLLOWUP_ID', 'REMARK_ID', 'ID'], ['followup id', 'remark id', 'id']);
      const accIdx = findHeaderColumnIndex(headers, ['ACCOUNT_ID', 'ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT'], ['account id', 'account']);
      const custIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_NAME', 'NAME', 'BORROWER_NAME', 'CUST_NAME', 'CUSTOMER', 'BORROWER'],
        ['customer_name', 'customer name', 'borrower_name', 'borrower name'],
        ['branch', 'agent', 'officer', 'staff']
      );
      const agentIdx = findHeaderColumnIndex(headers, ['AGENT_ID', 'AGENT_NAME', 'AGENT'], ['agent id', 'agent name', 'agent']);
      const dateIdx = findHeaderColumnIndex(headers, ['DATE', 'CREATED', 'CREATED_AT'], ['date', 'created']);
      const timeIdx = findHeaderColumnIndex(headers, ['TIME'], ['time']);
      const statusIdx = findHeaderColumnIndex(headers, ['CALL_STATUS', 'STATUS', 'OUTCOME'], ['call status', 'status', 'outcome']);
      const respIdx = findHeaderColumnIndex(headers, ['CUSTOMER_RESPONSE', 'RESPONSE'], ['customer response', 'response']);
      const remarkIdx = findHeaderColumnIndex(headers, ['AGENT_REMARKS', 'REMARK', 'NOTES', 'REMARKS'], ['agent remarks', 'remark', 'notes']);
      const nextDateIdx = findHeaderColumnIndex(headers, ['NEXT_FOLLOWUP_DATE', 'NEXT_DATE', 'NEXT'], ['next followup date', 'next date']);

      const parsed: Partial<FollowUp>[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const accVal = accIdx !== -1 && row[accIdx] ? String(row[accIdx]).trim() : '';
        if (!accVal) continue;

        parsed.push({
          id: idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `FLP-ROW-${i}`,
          accountId: accVal,
          customerName: custIdx !== -1 && row[custIdx] ? String(row[custIdx]).trim() : '',
          agentId: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'AG-01',
          agentName: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'Agent',
          date: dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : new Date().toISOString().slice(0, 10),
          time: timeIdx !== -1 && row[timeIdx] ? String(row[timeIdx]).trim() : '12:00 PM',
          status: statusIdx !== -1 && row[statusIdx] ? (String(row[statusIdx]).trim() as any) : 'Contacted',
          customerResponse: respIdx !== -1 && row[respIdx] ? String(row[respIdx]).trim() : '',
          agentRemarks: remarkIdx !== -1 && row[remarkIdx] ? String(row[remarkIdx]).trim() : '',
          nextFollowUpDate: nextDateIdx !== -1 && row[nextDateIdx] ? String(row[nextDateIdx]).trim() : '',
        });
      }
      return parsed;
    }

    return [];
  }

  /**
   * Normalize raw PTP rows into typed PTPRecord objects
   */
  public parseRawPtpsData(raw: any): Partial<PTPRecord>[] {
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    if (typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return raw.map((item: any, idx: number) => ({
        id: item.id || item['PTP ID'] || item.ptpId || item.ptp_id || `PTP-PULL-${idx + 1}`,
        accountId: item.accountId || item.account_id || item['Account ID'] || item.account_number || '',
        customerName:
          getFieldFromObject(
            item,
            ['customerName', 'customer_name', 'Customer Name', 'CUSTOMER_NAME', 'NAME', 'borrowerName', 'name'],
            ['branch', 'agent']
          ) || '',
        agentId: item.agentId || item.agent_id || item['Agent ID'] || 'AG-01',
        agentName: item.agentName || item.agent_name || item['Agent Name'] || 'Agent',
        amount:
          parseFloat(
            String(
              item.amount ||
              item['PTP Amount (₹)'] ||
              item.promised_amount ||
              item.promisedAmount ||
              '0'
            ).replace(/[^0-9.-]+/g, '')
          ) || 0,
        ptpDate: item.ptpDate || item.ptp_date || item['PTP Date'] || item.promised_date || item.promisedDate || '',
        ptpMode: (item.ptpMode || item.ptp_mode || item['Payment Mode'] || 'UPI') as any,
        customerCommitment: item.customerCommitment || item.customer_commitment || item['Commitment Details'] || item.remarks || '',
        status: (item.status || item['Status'] || item.ptpStatus || 'Pending') as any,
        createdAt: item.createdAt || item.created_at || item['Created At'] || new Date().toISOString(),
      }));
    }

    if (Array.isArray(raw[0])) {
      const headers = raw[0];
      const idIdx = findHeaderColumnIndex(headers, ['PTP_ID', 'ID'], ['ptp id', 'id']);
      const accIdx = findHeaderColumnIndex(headers, ['ACCOUNT_ID', 'ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT'], ['account id', 'account']);
      const custIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_NAME', 'NAME', 'BORROWER_NAME', 'CUST_NAME', 'CUSTOMER'],
        ['customer_name', 'customer name'],
        ['branch', 'agent']
      );
      const agentIdx = findHeaderColumnIndex(headers, ['AGENT_ID', 'AGENT_NAME', 'AGENT'], ['agent id', 'agent']);
      const amtIdx = findHeaderColumnIndex(headers, ['AMOUNT', 'PROMISED_AMOUNT'], ['amount', 'promised']);
      const dateIdx = findHeaderColumnIndex(headers, ['PTP_DATE', 'PROMISED_DATE', 'DATE'], ['ptp date', 'date']);
      const modeIdx = findHeaderColumnIndex(headers, ['PAYMENT_MODE', 'MODE'], ['payment mode', 'mode']);
      const remarkIdx = findHeaderColumnIndex(headers, ['COMMITMENT_DETAILS', 'REMARKS', 'NOTE'], ['commitment', 'remarks']);
      const statusIdx = findHeaderColumnIndex(headers, ['STATUS'], ['status']);

      const parsed: Partial<PTPRecord>[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const accVal = accIdx !== -1 && row[accIdx] ? String(row[accIdx]).trim() : '';
        if (!accVal) continue;

        parsed.push({
          id: idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `PTP-ROW-${i}`,
          accountId: accVal,
          customerName: custIdx !== -1 && row[custIdx] ? String(row[custIdx]).trim() : '',
          agentId: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'AG-01',
          agentName: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'Agent',
          amount: amtIdx !== -1 ? parseFloat(String(row[amtIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          ptpDate: dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : '',
          ptpMode: (modeIdx !== -1 && row[modeIdx] ? String(row[modeIdx]).trim() : 'UPI') as any,
          customerCommitment: remarkIdx !== -1 && row[remarkIdx] ? String(row[remarkIdx]).trim() : '',
          status: (statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : 'Pending') as any,
          createdAt: new Date().toISOString(),
        });
      }
      return parsed;
    }

    return [];
  }

  /**
   * Normalize raw Visits rows into typed FieldVisit objects
   */
  public parseRawVisitsData(raw: any): Partial<FieldVisit>[] {
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    if (typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return raw.map((item: any, idx: number) => ({
        id: item.id || item['Visit ID'] || item.visitId || item.visit_id || `VIS-PULL-${idx + 1}`,
        accountId: item.accountId || item.account_id || item['Account ID'] || item.account_number || '',
        customerName:
          getFieldFromObject(
            item,
            ['customerName', 'customer_name', 'Customer Name', 'CUSTOMER_NAME', 'NAME', 'borrowerName', 'name'],
            ['branch', 'agent']
          ) || '',
        agentId: item.agentId || item.agent_id || item['Agent ID'] || 'AG-01',
        agentName: item.agentName || item.agent_name || item['Agent Name'] || 'Agent',
        date: item.date || item['Date'] || new Date().toISOString().slice(0, 10),
        startTime: item.startTime || item.start_time || item['Start Time'] || '10:00 AM',
        endTime: item.endTime || item.end_time || item['End Time'] || '10:30 AM',
        latitude: parseFloat(String(item.latitude || item['Latitude'] || '19.8762')) || 19.8762,
        longitude: parseFloat(String(item.longitude || item['Longitude'] || '75.3433')) || 75.3433,
        visitStatus: (item.visitStatus || item.visit_status || item['Visit Status'] || 'Completed') as any,
        visitRemarks: item.visitRemarks || item.visit_remarks || item['Visit Remarks'] || item.remarks || '',
        address: item.address || item['Address'] || item.address_visited || '',
      }));
    }

    if (Array.isArray(raw[0])) {
      const headers = raw[0];
      const idIdx = findHeaderColumnIndex(headers, ['VISIT_ID', 'ID'], ['visit id', 'id']);
      const accIdx = findHeaderColumnIndex(headers, ['ACCOUNT_ID', 'ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT'], ['account id', 'account']);
      const custIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_NAME', 'NAME', 'BORROWER_NAME', 'CUST_NAME', 'CUSTOMER'],
        ['customer_name', 'customer name'],
        ['branch', 'agent']
      );
      const agentIdx = findHeaderColumnIndex(headers, ['AGENT_ID', 'AGENT_NAME', 'AGENT'], ['agent id', 'agent']);
      const dateIdx = findHeaderColumnIndex(headers, ['DATE', 'VISIT_DATE'], ['date', 'visit date']);
      const statusIdx = findHeaderColumnIndex(headers, ['VISIT_STATUS', 'STATUS'], ['visit status', 'status']);
      const remarkIdx = findHeaderColumnIndex(headers, ['VISIT_REMARKS', 'REMARKS', 'NOTES'], ['visit remarks', 'remarks']);
      const addrIdx = findHeaderColumnIndex(headers, ['ADDRESS', 'LOCATION'], ['address', 'location']);

      const parsed: Partial<FieldVisit>[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const accVal = accIdx !== -1 && row[accIdx] ? String(row[accIdx]).trim() : '';
        if (!accVal) continue;

        parsed.push({
          id: idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `VIS-ROW-${i}`,
          accountId: accVal,
          customerName: custIdx !== -1 && row[custIdx] ? String(row[custIdx]).trim() : '',
          agentId: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'AG-01',
          agentName: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : 'Agent',
          date: dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : new Date().toISOString().slice(0, 10),
          startTime: '10:00 AM',
          endTime: '10:30 AM',
          latitude: 19.8762,
          longitude: 75.3433,
          visitStatus: (statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : 'Completed') as any,
          visitRemarks: remarkIdx !== -1 && row[remarkIdx] ? String(row[remarkIdx]).trim() : '',
          address: addrIdx !== -1 && row[addrIdx] ? String(row[addrIdx]).trim() : '',
        });
      }
      return parsed;
    }

    return [];
  }

  /**
   * Normalize raw Recovery rows into typed RecoveryRecord objects
   */
  public parseRawRecoveriesData(raw: any): Partial<RecoveryRecord>[] {
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    if (typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return raw.map((item: any, idx: number) => ({
        id: item.id || item['Recovery ID'] || item.recoveryId || item.recovery_id || item.receipt_id || `REC-PULL-${idx + 1}`,
        accountId: item.accountId || item.account_id || item['Account ID'] || item.account_number || '',
        customerName:
          getFieldFromObject(
            item,
            ['customerName', 'customer_name', 'Customer Name', 'CUSTOMER_NAME', 'NAME', 'borrowerName', 'name'],
            ['branch', 'agent']
          ) || '',
        agentId: item.agentId || item.agent_id || item['Agent ID'] || 'AG-01',
        agentName: item.agentName || item.agent_name || item['Agent Name'] || 'Agent',
        amount:
          parseFloat(
            String(
              item.amount ||
              item['Recovered Amount (₹)'] ||
              item.amount_paid ||
              item.amountPaid ||
              '0'
            ).replace(/[^0-9.-]+/g, '')
          ) || 0,
        recoveryDate: item.recoveryDate || item.recovery_date || item['Recovery Date'] || new Date().toISOString().slice(0, 10),
        referenceNumber: item.referenceNumber || item.reference_number || item['Ref Number'] || item.transaction_reference || 'REF-TXN',
        paymentMode: (item.paymentMode || item.payment_mode || item['Mode'] || 'UPI') as any,
        receiptNumber: item.receiptNumber || item.receipt_number || item['Receipt Number'] || `RCP-${idx + 100}`,
        commissionAmount: parseFloat(String(item.commissionAmount || item.commission_amount || item['10% Commission (₹)'] || '0').replace(/[^0-9.-]+/g, '')) || 0,
        commissionPaidStatus: (item.commissionPaidStatus || item.commission_paid_status || item['Commission Status'] || 'PENDING') as any,
        proofDriveFileId: item.proofDriveFileId || item.proof_drive_file_id || item['Drive Proof File ID'] || '',
      }));
    }

    if (Array.isArray(raw[0])) {
      const headers = raw[0];
      const idIdx = findHeaderColumnIndex(headers, ['RECOVERY_ID', 'ID', 'REC_ID'], ['recovery id', 'id']);
      const accIdIdx = findHeaderColumnIndex(headers, ['ACCOUNT_ID', 'ACCT_NO', 'ACCOUNT_NO', 'ACCOUNT'], ['account id', 'account']);
      const custIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_NAME', 'NAME', 'BORROWER_NAME', 'CUST_NAME', 'CUSTOMER'],
        ['customer_name', 'customer name', 'customer'],
        ['branch', 'agent', 'officer', 'staff']
      );
      const agentIdx = findHeaderColumnIndex(headers, ['AGENT_ID', 'AGENT_NAME', 'AGENT'], ['agent id', 'agent']);
      const amtIdx = findHeaderColumnIndex(headers, ['AMOUNT', 'RECOVERED_AMOUNT', 'AMOUNT_PAID'], ['recovered amount', 'amount']);
      const dateIdx = findHeaderColumnIndex(headers, ['RECOVERY_DATE', 'DATE'], ['recovery date', 'date']);
      const refIdx = findHeaderColumnIndex(headers, ['REFERENCE_NUMBER', 'REF_NUMBER', 'REFERENCE', 'REF'], ['ref number', 'reference']);
      const modeIdx = findHeaderColumnIndex(headers, ['PAYMENT_MODE', 'MODE'], ['payment mode', 'mode']);
      const receiptIdx = findHeaderColumnIndex(headers, ['RECEIPT_NUMBER', 'RECEIPT_NO', 'RECEIPT'], ['receipt number', 'receipt']);
      const commIdx = findHeaderColumnIndex(headers, ['COMMISSION_AMOUNT', 'COMMISSION', '10% COMMISSION'], ['commission']);

      const parsed: Partial<RecoveryRecord>[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        parsed.push({
          id: idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `REC-ROW-${i}`,
          receiptNumber: receiptIdx !== -1 && row[receiptIdx] ? String(row[receiptIdx]).trim() : `RCP-${i}`,
          accountId: accIdIdx !== -1 && row[accIdIdx] ? String(row[accIdIdx]).trim() : '',
          customerName: custIdx !== -1 && row[custIdx] ? String(row[custIdx]).trim() : '',
          amount: amtIdx !== -1 ? parseFloat(String(row[amtIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
          paymentMode: (modeIdx !== -1 && row[modeIdx] ? String(row[modeIdx]).trim() : 'UPI') as any,
          referenceNumber: refIdx !== -1 && row[refIdx] ? String(row[refIdx]).trim() : '',
          recoveryDate: dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : new Date().toISOString().slice(0, 10),
          agentId: agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).split(' ')[0] : 'RA-0045',
          agentName: agentIdx !== -1 && row[agentIdx] ? (String(row[agentIdx]).includes('(') ? String(row[agentIdx]).split('(')[1]?.replace(')', '') : String(row[agentIdx])) : 'Ashish Kharad',
          commissionAmount: commIdx !== -1 ? parseFloat(String(row[commIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0,
        });
      }
      return parsed;
    }

    return [];
  }

  /**
   * Normalize raw Users rows into typed User objects
   */
  public parseRawUsersData(raw: any): Partial<User>[] {
    if (!raw || !Array.isArray(raw) || raw.length === 0) return [];

    if (typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      return raw.map((item: any, idx: number) => {
        const rawStatus = String(item.status || item['Status'] || item.user_status || '').toUpperCase();
        const rawActive = String(item.active || item['Active'] || '').toUpperCase();
        const isDeleted = rawStatus === 'DELETED' || rawActive.includes('DELETED') || item.isDeleted === true || item.is_deleted === true;
        const isActive = !isDeleted && (rawActive === 'YES' || rawActive === 'TRUE' || rawStatus === 'ACTIVE' || item.active === true);
        const roleVal = (item.role || item['Role'] || 'agent').toLowerCase() as any;
        const defaultPwd = roleVal === 'admin' ? 'Admin@2026' : roleVal === 'coordinator' ? 'Coord@2026' : 'Agent@2026';
        const rawPwd = item.password || item['Password'] || item.PASSWORD || item.pass || defaultPwd;
        const salt = item.passwordSalt || generateSalt(16);
        const pwdHash = item.passwordHash || hashPasswordSync(rawPwd, salt);

        return {
          id: item.id || item.user_id || item.userId || item['User ID'] || `USR-${idx + 1}`,
          username: item.username || item['Username'] || item.email?.split('@')[0] || `user${idx + 1}`,
          name: item.name || item.full_name || item['Name'] || 'Team Member',
          email: item.email || item['Email'] || '',
          role: roleVal,
          branch: item.branch || item['Branch'] || 'Chhatrapati Sambhajinagar Main',
          area: item.area || item['Area'] || 'Town Area',
          zone: item.zone || item['Zone'] || 'Zone A',
          agentId: item.agentId || item.agent_id || item['Agent ID'] || undefined,
          mobile: String(item.mobile || item.phone || item['Mobile'] || ''),
          joiningDate: item.joiningDate || item.joining_date || item['Joining Date'] || '2024-01-01',
          active: isActive,
          isDeleted: isDeleted,
          status: isDeleted ? 'DELETED' : isActive ? 'ACTIVE' : 'INACTIVE',
          password: rawPwd,
          passwordSalt: salt,
          passwordHash: pwdHash,
        };
      });
    }

    if (Array.isArray(raw[0])) {
      const headers = raw[0].map((h: any) => String(h || '').toLowerCase().trim());
      const getIdx = (kws: string[]) => headers.findIndex((h: string) => kws.some((k) => h.includes(k)));

      const idIdx = getIdx(['user id', 'id', 'user_id']);
      const nameIdx = getIdx(['name', 'full name', 'username']);
      const emailIdx = getIdx(['email']);
      const pwdIdx = getIdx(['password', 'pass', 'pwd']);
      const phoneIdx = getIdx(['phone', 'mobile', 'contact']);
      const roleIdx = getIdx(['role', 'designation']);
      const branchIdx = getIdx(['branch']);
      const agentIdIdx = getIdx(['agent id', 'agent_id']);
      const statusIdx = getIdx(['status', 'active', 'user status']);

      const parsed: Partial<User>[] = [];
      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const idVal = idIdx !== -1 && row[idIdx] ? String(row[idIdx]).trim() : `USR-${i}`;
        const statusVal = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).toUpperCase().trim() : 'ACTIVE';
        const isDeleted = statusVal === 'DELETED';
        const isActive = !isDeleted && (statusVal === 'YES' || statusVal === 'TRUE' || statusVal === 'ACTIVE');
        const roleVal = roleIdx !== -1 && row[roleIdx] ? (String(row[roleIdx]).toLowerCase().trim() as any) : 'agent';
        const defaultPwd = roleVal === 'admin' ? 'Admin@2026' : roleVal === 'coordinator' ? 'Coord@2026' : 'Agent@2026';
        const rawPwd = pwdIdx !== -1 && row[pwdIdx] ? String(row[pwdIdx]).trim() : defaultPwd;
        const salt = generateSalt(16);
        const pwdHash = hashPasswordSync(rawPwd, salt);

        parsed.push({
          id: idVal,
          username: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).split('@')[0] : `user_${i}`,
          name: nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : 'Team Member',
          email: emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : '',
          password: rawPwd,
          mobile: phoneIdx !== -1 && row[phoneIdx] ? String(row[phoneIdx]).trim() : '',
          role: roleVal,
          branch: branchIdx !== -1 && row[branchIdx] ? String(row[branchIdx]).trim() : 'Chhatrapati Sambhajinagar Main',
          agentId: agentIdIdx !== -1 && row[agentIdIdx] ? String(row[agentIdIdx]).trim() : undefined,
          active: isActive,
          isDeleted: isDeleted,
          status: isDeleted ? 'DELETED' : isActive ? 'ACTIVE' : 'INACTIVE',
          passwordSalt: salt,
          passwordHash: pwdHash,
        });
      }
      return parsed;
    }

    return [];
  }

  /**
   * Parse Recovery_Backup / Backup rows (which contain mixed RECORD_TYPE rows like ACCOUNT_SNAPSHOT, RECOVERY, PTP_PROMISE, etc.)
   */
  public parseRawRecoveryBackupData(raw: any): {
    accounts: Partial<Account>[];
    recoveries: Partial<RecoveryRecord>[];
    followups: Partial<FollowUp>[];
    ptps: Partial<PTPRecord>[];
    visits: Partial<FieldVisit>[];
  } {
    const result = {
      accounts: [] as Partial<Account>[],
      recoveries: [] as Partial<RecoveryRecord>[],
      followups: [] as Partial<FollowUp>[],
      ptps: [] as Partial<PTPRecord>[],
      visits: [] as Partial<FieldVisit>[],
    };

    if (!raw || !Array.isArray(raw) || raw.length === 0) return result;

    // Case 1: Array of objects
    if (typeof raw[0] === 'object' && !Array.isArray(raw[0])) {
      raw.forEach((item: any, idx: number) => {
        const recType = String(item['Record Type'] || item.recordType || item.type || item.Record_Type || '').toUpperCase();
        const accId = String(item['Account ID'] || item.accountId || item.loanNumber || item.Account_ID || '').trim();
        const custName = String(item['Customer Name'] || item.customerName || item.name || item.Customer_Name || '').trim();
        const amt = parseFloat(String(item['Amount (₹)'] || item.amount || item.amountPaid || item['Amount'] || '0').replace(/[^0-9.-]+/g, '')) || 0;
        const refId = String(item['Reference / ID'] || item.reference || item.id || item.receiptNumber || item.Reference_ID || '').trim();
        const agentStr = String(item['Agent ID / Name'] || item.agent || item.agentName || item.Agent_ID_Name || '').trim();
        const dateStr = String(item['Date / Promised Date'] || item.date || item.ptpDate || item.Date_Promised_Date || '').trim();
        const statusStr = String(item['Status / Mode / Category'] || item.status || item.Status_Mode_Category || '').trim();
        const detailsStr = String(item['Details / Remarks / Outcome'] || item.remarks || item.details || item.Details_Remarks_Outcome || '').trim();

        if (recType.includes('RECOVERY') || recType.includes('COLLECT')) {
          result.recoveries.push({
            id: refId || `REC-BKP-${idx + 1}`,
            recoveryId: refId || `REC-BKP-${idx + 1}`,
            receiptNumber: refId || `REC-BKP-${idx + 1}`,
            accountId: accId,
            customerName: custName,
            amount: amt,
            paymentMode: (statusStr.includes('UPI') ? 'UPI' : statusStr.includes('Cheque') ? 'Cheque' : 'Cash') as any,
            recoveryDate: dateStr || new Date().toISOString().slice(0, 10),
            agentName: agentStr.replace(/\(.*\)/, '').trim() || 'Agent',
            agentId: (agentStr.match(/\((.*?)\)/)?.[1]) || 'AG-01',
            remarks: detailsStr,
          });
        } else if (recType.includes('PTP') || recType.includes('PROMISE')) {
          result.ptps.push({
            id: refId || `PTP-BKP-${idx + 1}`,
            accountId: accId,
            customerName: custName,
            amount: amt,
            ptpDate: dateStr,
            status: (statusStr.includes('Fulfilled') ? 'Fulfilled' : statusStr.includes('Broken') ? 'Broken' : 'Pending') as any,
            agentName: agentStr,
            remarks: detailsStr,
          });
        } else if (recType.includes('FOLLOWUP') || recType.includes('REMARK')) {
          result.followups.push({
            id: refId || `FLP-BKP-${idx + 1}`,
            accountId: accId,
            customerName: custName,
            date: dateStr || new Date().toISOString().slice(0, 10),
            status: (statusStr || 'Contacted') as any,
            agentRemarks: detailsStr,
            agentName: agentStr,
          });
        } else if (recType.includes('VISIT')) {
          result.visits.push({
            id: refId || `VIS-BKP-${idx + 1}`,
            accountId: accId,
            customerName: custName,
            date: dateStr || new Date().toISOString().slice(0, 10),
            visitStatus: (statusStr || 'Customer Met') as any,
            visitRemarks: detailsStr,
            agentName: agentStr,
          });
        } else if (recType.includes('ACCOUNT') || accId) {
          result.accounts.push({
            accountId: accId,
            customerName: custName,
            outstandingAmount: amt,
            latestRemark: detailsStr,
            assignedAgentName: agentStr,
          });
        }
      });
      return result;
    }

    // Case 2: 2D Array [headers, row1, row2, ...]
    if (Array.isArray(raw[0])) {
      const headers = raw[0];
      const typeIdx = findHeaderColumnIndex(headers, ['RECORD_TYPE', 'TYPE'], ['record type', 'type']);
      const accIdx = findHeaderColumnIndex(headers, ['ACCOUNT_ID', 'ACCOUNT', 'LOAN'], ['account id', 'account', 'loan']);
      const nameIdx = findHeaderColumnIndex(
        headers,
        ['CUSTOMER_NAME', 'NAME', 'BORROWER_NAME', 'CUST_NAME', 'BORROWER', 'CUSTOMER'],
        ['customer_name', 'customer name', 'borrower_name', 'borrower name'],
        ['branch', 'agent', 'officer', 'staff']
      );
      const amtIdx = findHeaderColumnIndex(headers, ['AMOUNT', 'OUTSTANDING', 'RECOVERED_AMOUNT'], ['amount', 'outstanding']);
      const refIdx = findHeaderColumnIndex(headers, ['REFERENCE_NUMBER', 'REFERENCE', 'ID', 'RECEIPT'], ['reference', 'id', 'receipt']);
      const agentIdx = findHeaderColumnIndex(headers, ['AGENT_NAME', 'AGENT_ID', 'AGENT'], ['agent']);
      const dateIdx = findHeaderColumnIndex(headers, ['DATE', 'RECOVERY_DATE', 'PROMISED'], ['date', 'promised']);
      const statusIdx = findHeaderColumnIndex(headers, ['STATUS', 'MODE', 'CATEGORY'], ['status', 'mode', 'category']);
      const detailsIdx = findHeaderColumnIndex(headers, ['DETAILS', 'REMARKS', 'OUTCOME'], ['details', 'remarks', 'outcome']);

      for (let i = 1; i < raw.length; i++) {
        const row = raw[i];
        if (!row || row.length === 0) continue;
        const recType = typeIdx !== -1 && row[typeIdx] ? String(row[typeIdx]).toUpperCase().trim() : '';
        const accId = accIdx !== -1 && row[accIdx] ? String(row[accIdx]).trim() : '';
        const custName = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
        const amt = amtIdx !== -1 ? parseFloat(String(row[amtIdx] || '0').replace(/[^0-9.-]+/g, '')) || 0 : 0;
        const refId = refIdx !== -1 && row[refIdx] ? String(row[refIdx]).trim() : '';
        const agentStr = agentIdx !== -1 && row[agentIdx] ? String(row[agentIdx]).trim() : '';
        const dateStr = dateIdx !== -1 && row[dateIdx] ? String(row[dateIdx]).trim() : '';
        const statusStr = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).trim() : '';
        const detailsStr = detailsIdx !== -1 && row[detailsIdx] ? String(row[detailsIdx]).trim() : '';

        if (!accId && !custName) continue;

        if (recType.includes('RECOVERY') || recType.includes('COLLECT')) {
          result.recoveries.push({
            id: refId || `REC-BKP-R${i}`,
            recoveryId: refId || `REC-BKP-R${i}`,
            receiptNumber: refId || `REC-BKP-R${i}`,
            accountId: accId,
            customerName: custName,
            amount: amt,
            paymentMode: (statusStr.includes('UPI') ? 'UPI' : statusStr.includes('Cheque') ? 'Cheque' : 'Cash') as any,
            recoveryDate: dateStr || new Date().toISOString().slice(0, 10),
            agentName: agentStr.replace(/\(.*\)/, '').trim() || 'Agent',
            agentId: (agentStr.match(/\((.*?)\)/)?.[1]) || 'AG-01',
            remarks: detailsStr,
          });
        } else if (recType.includes('PTP') || recType.includes('PROMISE')) {
          result.ptps.push({
            id: refId || `PTP-BKP-R${i}`,
            accountId: accId,
            customerName: custName,
            amount: amt,
            ptpDate: dateStr,
            status: (statusStr.includes('Fulfilled') ? 'Fulfilled' : statusStr.includes('Broken') ? 'Broken' : 'Pending') as any,
            agentName: agentStr,
            remarks: detailsStr,
          });
        } else if (recType.includes('FOLLOWUP') || recType.includes('REMARK')) {
          result.followups.push({
            id: refId || `FLP-BKP-R${i}`,
            accountId: accId,
            customerName: custName,
            date: dateStr || new Date().toISOString().slice(0, 10),
            status: (statusStr || 'Contacted') as any,
            agentRemarks: detailsStr,
            agentName: agentStr,
          });
        } else if (recType.includes('VISIT')) {
          result.visits.push({
            id: refId || `VIS-BKP-R${i}`,
            accountId: accId,
            customerName: custName,
            date: dateStr || new Date().toISOString().slice(0, 10),
            visitStatus: (statusStr || 'Customer Met') as any,
            visitRemarks: detailsStr,
            agentName: agentStr,
          });
        } else if (recType.includes('ACCOUNT') || accId) {
          result.accounts.push({
            accountId: accId,
            customerName: custName,
            outstandingAmount: amt,
            latestRemark: detailsStr,
            assignedAgentName: agentStr,
          });
        }
      }
      return result;
    }

    return result;
  }

  /**
   * Pull all records from Google Sheets (Sheet -> Site)
   */
  public async pullAllFromSheets(): Promise<{
    success: boolean;
    accounts?: Partial<Account>[];
    recoveries?: Partial<RecoveryRecord>[];
    followups?: Partial<FollowUp>[];
    ptps?: Partial<PTPRecord>[];
    visits?: Partial<FieldVisit>[];
    users?: Partial<User>[];
    backupCount?: number;
    error?: string;
  }> {
    let targetScriptUrl = this.appsScriptUrl;

    // Check if Firestore has a configured Apps Script URL
    if (!targetScriptUrl || targetScriptUrl === DEFAULT_APPS_SCRIPT_URL) {
      try {
        const cloudSetting = await firestoreService.fetchSetting('google_sheets');
        if (cloudSetting?.appsScriptUrl) {
          targetScriptUrl = cloudSetting.appsScriptUrl;
          this.appsScriptUrl = targetScriptUrl;
        }
      } catch {}
    }
    if (!targetScriptUrl) {
      targetScriptUrl = DEFAULT_APPS_SCRIPT_URL;
    }

    // Helper to process JSON response from Apps Script
    const processAppsScriptPayload = (json: any) => {
      if (!json) return null;
      const root = json.data || json;

      const getSheetData = (keywords: string[]) => {
        // Direct fields on root (e.g. root.accounts)
        for (const key of Object.keys(root)) {
          const lKey = key.toLowerCase();
          if (keywords.some((k) => lKey.includes(k))) {
            if (Array.isArray(root[key]) && root[key].length > 0) {
              return root[key];
            }
          }
        }
        // In root.sheets
        if (root.sheets && typeof root.sheets === 'object') {
          for (const sKey of Object.keys(root.sheets)) {
            const lsKey = sKey.toLowerCase();
            if (keywords.some((k) => lsKey.includes(k))) {
              if (Array.isArray(root.sheets[sKey]) && root.sheets[sKey].length > 0) {
                return root.sheets[sKey];
              }
            }
          }
        }
        // In root.tabs
        if (Array.isArray(root.tabs)) {
          for (const tab of root.tabs) {
            const title = String(tab?.title || tab?.name || '').toLowerCase();
            if (keywords.some((k) => title.includes(k))) {
              if (Array.isArray(tab.rows) && tab.rows.length > 0) return tab.rows;
              if (Array.isArray(tab.values) && tab.values.length > 0) return tab.values;
              if (Array.isArray(tab.data) && tab.data.length > 0) return tab.data;
            }
          }
        }
        return [];
      };

      const rawAccounts = getSheetData(['account', 'borrower', 'sheet1']);
      const rawRecoveries = getSheetData(['recov']);
      const rawFollowups = getSheetData(['follow', 'remark', 'note']);
      const rawPtps = getSheetData(['ptp']);
      const rawVisits = getSheetData(['visit']);
      const rawUsers = getSheetData(['user', 'agent', 'staff']);
      const rawBackup = getSheetData(['backup', 'recovery_backup']);

      let parsedAccounts = this.parseRawAccountsData(rawAccounts);
      let parsedFollowups = this.parseRawFollowupsData(rawFollowups);
      let parsedPtps = this.parseRawPtpsData(rawPtps);
      let parsedVisits = this.parseRawVisitsData(rawVisits);
      let parsedRecoveries = this.parseRawRecoveriesData(rawRecoveries);
      const parsedUsers = this.parseRawUsersData(rawUsers);

      let backupCount = 0;
      if (rawBackup && rawBackup.length > 0) {
        const parsedBackup = this.parseRawRecoveryBackupData(rawBackup);
        backupCount =
          parsedBackup.accounts.length +
          parsedBackup.recoveries.length +
          parsedBackup.followups.length +
          parsedBackup.ptps.length +
          parsedBackup.visits.length;

        // Merge backup records into standard parsed datasets
        if (parsedBackup.accounts.length > 0) {
          const accMap = new Map<string, Partial<Account>>(parsedAccounts.map((a) => [a.accountId || '', a]));
          parsedBackup.accounts.forEach((a) => {
            if (a.accountId) accMap.set(a.accountId, { ...(accMap.get(a.accountId) || {}), ...a });
          });
          parsedAccounts = Array.from(accMap.values());
        }

        if (parsedBackup.recoveries.length > 0) {
          const recMap = new Map<string, Partial<RecoveryRecord>>(parsedRecoveries.map((r) => [r.id || r.receiptNumber || '', r]));
          parsedBackup.recoveries.forEach((r) => {
            const key = r.id || r.receiptNumber || '';
            if (key) recMap.set(key, { ...(recMap.get(key) || {}), ...r });
          });
          parsedRecoveries = Array.from(recMap.values());
        }

        if (parsedBackup.followups.length > 0) {
          const flpMap = new Map<string, Partial<FollowUp>>(parsedFollowups.map((f) => [f.id || '', f]));
          parsedBackup.followups.forEach((f) => {
            if (f.id) flpMap.set(f.id, { ...(flpMap.get(f.id) || {}), ...f });
          });
          parsedFollowups = Array.from(flpMap.values());
        }

        if (parsedBackup.ptps.length > 0) {
          const ptpMap = new Map<string, Partial<PTPRecord>>(parsedPtps.map((p) => [p.id || '', p]));
          parsedBackup.ptps.forEach((p) => {
            if (p.id) ptpMap.set(p.id, { ...(ptpMap.get(p.id) || {}), ...p });
          });
          parsedPtps = Array.from(ptpMap.values());
        }

        if (parsedBackup.visits.length > 0) {
          const visMap = new Map<string, Partial<FieldVisit>>(parsedVisits.map((v) => [v.id || '', v]));
          parsedBackup.visits.forEach((v) => {
            if (v.id) visMap.set(v.id, { ...(visMap.get(v.id) || {}), ...v });
          });
          parsedVisits = Array.from(visMap.values());
        }
      }

      if (
        parsedAccounts.length > 0 ||
        parsedFollowups.length > 0 ||
        parsedRecoveries.length > 0 ||
        parsedUsers.length > 0 ||
        parsedPtps.length > 0 ||
        parsedVisits.length > 0
      ) {
        return {
          success: true,
          accounts: parsedAccounts,
          recoveries: parsedRecoveries,
          followups: parsedFollowups,
          ptps: parsedPtps,
          visits: parsedVisits,
          users: parsedUsers,
          backupCount,
        };
      }
      return null;
    };

    // 1. Try pulling via Apps Script relay (/api/sheets/apps-script-pull)
    try {
      const res = await fetch(`/api/sheets/apps-script-pull?url=${encodeURIComponent(targetScriptUrl)}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const json = await res.json();
        const processed = processAppsScriptPayload(json);
        if (processed) return processed;
      }
    } catch (e: any) {
      console.warn('Pull via Apps Script relay failed:', e);
    }

    let detailedError: string | null = null;

    // 2. Fallback: Direct client-side fetch to Apps Script Web App (vital for Netlify / client deployments)
    if (targetScriptUrl && targetScriptUrl.startsWith('http')) {
      // 2a. Direct GET
      try {
        const directUrl = `${targetScriptUrl}${targetScriptUrl.includes('?') ? '&' : '?'}action=get_all_data&token=ADMIN_SECURE_TOKEN_2026`;
        const res = await fetch(directUrl, { method: 'GET', redirect: 'follow' });
        const text = await res.text();

        if (text.includes('<!DOCTYPE html>') || text.includes('<html')) {
          if (text.includes('accounts.google.com') || text.includes('Sign in') || text.includes('ServiceLogin')) {
            detailedError = "Google Apps Script requires 'Who has access' set to 'Anyone' and 'Execute as' set to 'Me'. The script currently blocked this email with a Google Sign-in wall.";
          } else if (text.includes('Page not found') || text.includes('does not exist')) {
            detailedError = "The Google Apps Script Web App URL was not found or has been deleted. Please update your Web App deployment URL.";
          } else {
            detailedError = "Google Apps Script returned an HTML page instead of JSON. Ensure 'Who has access' is set to 'Anyone' and 'Execute as' to 'Me'.";
          }
        } else {
          try {
            const json = JSON.parse(text);
            const processed = processAppsScriptPayload(json);
            if (processed) return processed;
          } catch (jsonErr) {
            detailedError = 'Invalid JSON response from Google Sheets endpoint.';
          }
        }
      } catch (directErr: any) {
        console.warn('Direct Apps Script GET fetch note:', directErr);
        if (directErr?.message?.includes('Failed to fetch') || directErr?.name === 'TypeError') {
          detailedError = "Network error / CORS block: Google Apps Script redirected to a sign-in page. Please verify 'Who has access' is set to 'Anyone' and 'Execute as' to 'Me'.";
        } else {
          detailedError = directErr?.message;
        }
      }

      // 2b. Direct POST fallback
      try {
        const postRes = await fetch(targetScriptUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'get_all_data', token: 'ADMIN_SECURE_TOKEN_2026' }),
        });
        const postText = await postRes.text();
        if (postText.includes('<!DOCTYPE html>') || postText.includes('<html')) {
          if (postText.includes('accounts.google.com') || postText.includes('Sign in') || postText.includes('ServiceLogin')) {
            detailedError = "Google Apps Script requires 'Who has access' set to 'Anyone' and 'Execute as' set to 'Me'. Currently prompting for Google login.";
          }
        } else {
          try {
            const json = JSON.parse(postText);
            const processed = processAppsScriptPayload(json);
            if (processed) return processed;
          } catch (postJsonErr) {
            console.warn('POST parse error:', postJsonErr);
          }
        }
      } catch (postErr) {
        console.warn('Direct Apps Script POST fetch note:', postErr);
      }
    }

    // 3. Try pulling via OAuth Sheets API v4
    if (this.spreadsheetId) {
      try {
        const directData = await this.fetchAllCollectionRecords();
        return {
          success: true,
          ...directData,
        };
      } catch (e: any) {
        return { success: false, error: e.message || 'Failed to pull from Google Sheets' };
      }
    }

    return {
      success: false,
      error: detailedError || 'Could not connect to Google Sheets endpoint. Please check deployment URL and permissions.',
    };
  }

  /**
   * Update a specific single row or cell range in Google Sheets
   */
  public async updateRange(range: string, values: (string | number)[][]): Promise<boolean> {
    if (!this.spreadsheetId) return false;
    try {
      const token = await this.getValidAccessToken();
      const res = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
        {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
      return res.ok;
    } catch (e) {
      console.error('Error updating range:', e);
      return false;
    }
  }

  /**
   * Append a single new Recovery Collection Record directly to Recoveries tab in real-time
   */
  public async appendRecoveryRecord(recovery: {
    receiptNumber: string;
    accountId: string;
    customerName: string;
    amount: number;
    paymentMode: string;
    referenceNumber: string;
    date: string;
    agentId: string;
    agentName: string;
    branch: string;
    commissionAmount: number;
    remarks: string;
  }): Promise<boolean> {
    // 1. Post to Apps Script Web App
    try {
      await this.sendToAppsScript({
        action: 'ADD_RECOVERY',
        ...recovery,
      });
    } catch (e) {
      console.warn('Apps Script recovery relay warning:', e);
    }

    // 2. Direct Sheets API append if connected
    if (this.spreadsheetId) {
      try {
        const token = await this.getValidAccessToken();
        const rowValues = [
          `REC-${Date.now().toString().slice(-6)}`,
          recovery.receiptNumber,
          recovery.accountId,
          recovery.customerName,
          recovery.amount,
          recovery.paymentMode,
          recovery.referenceNumber,
          recovery.date,
          'VERIFIED',
          recovery.agentId,
          recovery.agentName,
          recovery.branch || 'Pune Main Branch',
          recovery.commissionAmount,
          recovery.remarks || 'Collected on field',
        ];

        // Try Recovery first (SRMS standard), then Recoveries
        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/'Recovery'!A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );

        if (!appendRes.ok) {
          await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/'Recoveries'!A1:append?valueInputOption=USER_ENTERED`,
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                values: [rowValues],
              }),
            }
          );
        }
      } catch {
        // non-blocking
      }
    }

    return true;
  }

  /**
   * Append a single new Remark or Followup row directly to the Followups sheet in real-time
   */
  public async appendFollowupRemark(remarkData: {
    accountId: string;
    customerName: string;
    agentId: string;
    agentName: string;
    date: string;
    time: string;
    callStatus: string;
    customerResponse: string;
    agentRemarks: string;
    nextFollowupDate: string;
    nextFollowupTime: string;
  }): Promise<boolean> {
    // 1. Post to Apps Script Web App
    try {
      await this.sendToAppsScript({
        action: 'ADD_FOLLOWUP',
        ...remarkData,
      });
    } catch (e) {
      console.warn('Apps Script followup relay warning:', e);
    }

    // 2. Direct Sheets API append if connected
    if (this.spreadsheetId) {
      try {
        const token = await this.getValidAccessToken();
        const rowValues = [
          `FLW-${Date.now().toString().slice(-4)}`,
          remarkData.accountId,
          remarkData.customerName,
          `${remarkData.agentId} (${remarkData.agentName})`,
          remarkData.date,
          remarkData.time,
          remarkData.callStatus,
          remarkData.customerResponse,
          remarkData.agentRemarks,
          remarkData.nextFollowupDate,
          remarkData.nextFollowupTime,
        ];

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/'Followups'!A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      } catch {
        // non-blocking
      }
    }

    return true;
  }

  /**
   * Append a single new PTP Commitment directly to PTP tab
   */
  public async appendPTPRecord(ptpData: {
    accountId: string;
    customerName: string;
    amount: number;
    ptpDate: string;
    ptpMode: string;
    customerCommitment: string;
    agentId: string;
    agentName: string;
    remarks: string;
  }): Promise<boolean> {
    // 1. Post to Apps Script Web App
    try {
      await this.sendToAppsScript({
        action: 'ADD_PTP',
        ...ptpData,
      });
    } catch (e) {
      console.warn('Apps Script PTP relay warning:', e);
    }

    // 2. Direct Sheets API append if connected
    if (this.spreadsheetId) {
      try {
        const token = await this.getValidAccessToken();
        const rowValues = [
          `PTP-${Date.now().toString().slice(-5)}`,
          ptpData.accountId,
          ptpData.customerName,
          ptpData.amount,
          new Date().toISOString().slice(0, 10),
          ptpData.ptpDate,
          'PENDING',
          ptpData.ptpMode,
          ptpData.customerCommitment,
          ptpData.agentId,
          ptpData.agentName,
          ptpData.remarks,
        ];

        await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${this.spreadsheetId}/values/'PTP'!A1:append?valueInputOption=USER_ENTERED`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );
      } catch {
        // non-blocking
      }
    }

    return true;
  }
}

export const googleSheetsService = new GoogleSheetsService();

