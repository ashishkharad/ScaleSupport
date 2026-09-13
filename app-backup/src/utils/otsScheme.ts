/**
 * ScaleSupport SRMS - One Time Settlement (OTS) Scheme Engine & WhatsApp Generator
 *
 * OTS Scheme Rules:
 * - Scheme Valid Till: 30 September 2026
 * - Slabs by NPA Date:
 *   - NPA Date <= 31-03-2019            -> Customer Pays 35%, Discount 65%
 *   - 01-04-2021 to 31-03-2023         -> Customer Pays 60%, Discount 40%
 *   - 01-04-2023 to 31-03-2025         -> Customer Pays 70%, Discount 30%
 *   - Undefined Date Ranges             -> "OTS Slab Not Defined"
 * - Never modify or overwrite the original Total Outstanding Amount.
 */

export const OTS_VALID_TILL = '30 September 2026';

export interface BankOTSRule {
  bankName: string;
  lastDateIso: string; // e.g. "2026-09-30"
  validTillText: string; // e.g. "30 September 2026"
  notes?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface OTSSlabRule {
  id: string;
  name: string;
  type: 'lte_date' | 'between_dates' | 'gte_date';
  date1: string; // YYYY-MM-DD
  date2?: string; // YYYY-MM-DD
  customerPayPercentage: number;
  discountPercentage: number;
  description?: string;
}

export interface OTSSchemeConfig {
  defaultValidTill: string;
  defaultLastDateIso: string;
  bankRules: Record<string, BankOTSRule>;
  slabs: OTSSlabRule[];
  updatedAt?: string;
  updatedBy?: string;
}

export const DEFAULT_OTS_CONFIG: OTSSchemeConfig = {
  defaultValidTill: '30 September 2026',
  defaultLastDateIso: '2026-09-30',
  bankRules: {},
  slabs: [
    {
      id: 'slab-1',
      name: 'NPA ≤ 31-03-2019',
      type: 'lte_date',
      date1: '2019-03-31',
      customerPayPercentage: 35,
      discountPercentage: 65,
      description: 'Customer Pays 35%, Discount 65%',
    },
    {
      id: 'slab-2',
      name: 'NPA 01-04-2021 to 31-03-2023',
      type: 'between_dates',
      date1: '2021-04-01',
      date2: '2023-03-31',
      customerPayPercentage: 60,
      discountPercentage: 40,
      description: 'Customer Pays 60%, Discount 40%',
    },
    {
      id: 'slab-3',
      name: 'NPA 01-04-2023 to 31-03-2025',
      type: 'between_dates',
      date1: '2023-04-01',
      date2: '2025-03-31',
      customerPayPercentage: 70,
      discountPercentage: 30,
      description: 'Customer Pays 70%, Discount 30%',
    },
  ],
};

const OTS_SETTINGS_STORAGE_KEY = 'srms_ots_scheme_config_v2';

export function getOTSSchemeConfig(): OTSSchemeConfig {
  try {
    const raw = localStorage.getItem(OTS_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.slabs) && parsed.slabs.length > 0) {
        return {
          ...DEFAULT_OTS_CONFIG,
          ...parsed,
          bankRules: parsed.bankRules || {},
        };
      }
    }
  } catch (e) {
    console.warn('Failed to load stored OTS scheme config:', e);
  }
  return DEFAULT_OTS_CONFIG;
}

export function saveOTSSchemeConfig(config: OTSSchemeConfig, updatedByName?: string): boolean {
  try {
    const toSave: OTSSchemeConfig = {
      ...config,
      updatedAt: new Date().toISOString(),
      updatedBy: updatedByName || 'Admin',
    };
    localStorage.setItem(OTS_SETTINGS_STORAGE_KEY, JSON.stringify(toSave));
    // Dispatch custom event so reactive components update immediately
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('srms_ots_config_changed', { detail: toSave }));
    }
    return true;
  } catch (e) {
    console.error('Failed to save OTS config:', e);
    return false;
  }
}

export function getBankOTSValidTill(bankName?: string, config?: OTSSchemeConfig): string {
  const currentConfig = config || getOTSSchemeConfig();
  if (!bankName) return currentConfig.defaultValidTill || OTS_VALID_TILL;

  const normalized = bankName.trim().toLowerCase();
  const rule = Object.values(currentConfig.bankRules || {}).find(
    (r) => r.bankName.trim().toLowerCase() === normalized
  );

  return rule?.validTillText || currentConfig.defaultValidTill || OTS_VALID_TILL;
}

export function getBankOTSLastDateIso(bankName?: string, config?: OTSSchemeConfig): string {
  const currentConfig = config || getOTSSchemeConfig();
  if (!bankName) return currentConfig.defaultLastDateIso || '2026-09-30';

  const normalized = bankName.trim().toLowerCase();
  const rule = Object.values(currentConfig.bankRules || {}).find(
    (r) => r.bankName.trim().toLowerCase() === normalized
  );

  return rule?.lastDateIso || currentConfig.defaultLastDateIso || '2026-09-30';
}

export interface OTSSlabEvaluation {
  slabDefined: boolean;
  slabName: string;
  npaDateFormatted?: string;
  customerPayPercentage: number;
  discountPercentage: number;
  systemCalculatedOTSAmount: number;
  originalOutstandingAmount: number;
  actualConcessionAmount: number;
  validTill: string;
  statusMessage: string;
}

/**
 * Robust date parser handling DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD, ISO timestamps, and Excel serial numbers.
 */
export function parseDateSafe(rawDate?: string | number | null): Date | null {
  if (rawDate === null || rawDate === undefined) return null;

  // Handle Excel serial date numbers (e.g. 43500)
  if (typeof rawDate === 'number' && !isNaN(rawDate) && rawDate > 20000 && rawDate < 60000) {
    const excelEpoch = new Date(1899, 11, 30);
    const ms = excelEpoch.getTime() + rawDate * 86400000;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }

  const str = String(rawDate).trim();
  if (!str || str === '-' || str.toLowerCase() === 'n/a' || str.toLowerCase() === 'null') {
    return null;
  }

  // DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10) - 1;
    const year = parseInt(dmyMatch[3], 10);
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() === year) {
      return dateObj;
    }
  }

  // YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10) - 1;
    const day = parseInt(ymdMatch[3], 10);
    const dateObj = new Date(year, month, day);
    if (!isNaN(dateObj.getTime()) && dateObj.getFullYear() === year) {
      return dateObj;
    }
  }

  // Fallback native Date.parse
  const nativeParsed = new Date(str);
  if (!isNaN(nativeParsed.getTime())) {
    return nativeParsed;
  }

  return null;
}

/**
 * Format a Date to readable DD-MM-YYYY
 */
export function formatDateDMY(d: Date | null): string {
  if (!d || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

/**
 * Evaluates OTS slab based on NPA Date and Total Outstanding Amount.
 * - Slabs are loaded from Admin configuration (or defaults).
 * - OTS Valid Till is resolved bank-wise (or defaults).
 * - Slabs by NPA Date:
 *   - NPA Date <= 31-03-2019            -> Customer Pays 35%, Discount 65%
 *   - 01-04-2021 to 31-03-2023         -> Customer Pays 60%, Discount 40%
 *   - 01-04-2023 to 31-03-2025         -> Customer Pays 70%, Discount 30%
 *   - For undefined date ranges         -> "OTS Slab Not Defined"
 */
export function evaluateOTSSlab(
  originalOutstanding: number,
  rawNpaDate?: string | number | null,
  bankName?: string,
  customConfig?: OTSSchemeConfig
): OTSSlabEvaluation {
  const config = customConfig || getOTSSchemeConfig();
  const effectiveValidTill = getBankOTSValidTill(bankName, config);
  const safeOutstanding = Math.max(0, Number(originalOutstanding) || 0);
  const npaDate = parseDateSafe(rawNpaDate);

  if (!npaDate) {
    return {
      slabDefined: false,
      slabName: 'OTS Slab Not Defined',
      npaDateFormatted: rawNpaDate ? String(rawNpaDate) : 'Not Available',
      customerPayPercentage: 0,
      discountPercentage: 0,
      systemCalculatedOTSAmount: 0,
      originalOutstandingAmount: safeOutstanding,
      actualConcessionAmount: 0,
      validTill: effectiveValidTill,
      statusMessage: 'NPA Date not recorded or invalid. OTS Slab cannot be evaluated.',
    };
  }

  const npaDateFormatted = formatDateDMY(npaDate);
  const npaIso = `${npaDate.getFullYear()}-${String(npaDate.getMonth() + 1).padStart(2, '0')}-${String(npaDate.getDate()).padStart(2, '0')}`;

  // Evaluate against configured slabs
  const slabs = config.slabs && config.slabs.length > 0 ? config.slabs : DEFAULT_OTS_CONFIG.slabs;

  for (const slab of slabs) {
    let matches = false;
    if (slab.type === 'lte_date' && slab.date1) {
      matches = npaIso <= slab.date1;
    } else if (slab.type === 'gte_date' && slab.date1) {
      matches = npaIso >= slab.date1;
    } else if (slab.type === 'between_dates' && slab.date1 && slab.date2) {
      matches = npaIso >= slab.date1 && npaIso <= slab.date2;
    }

    if (matches) {
      const payPercent = slab.customerPayPercentage;
      const discountPercent = slab.discountPercentage;
      const systemOTS = Math.round((safeOutstanding * payPercent) / 100);
      const concession = safeOutstanding - systemOTS;

      return {
        slabDefined: true,
        slabName: `${slab.name} (${slab.description || `Customer Pays ${payPercent}%, Discount ${discountPercent}%`})`,
        npaDateFormatted,
        customerPayPercentage: payPercent,
        discountPercentage: discountPercent,
        systemCalculatedOTSAmount: systemOTS,
        originalOutstandingAmount: safeOutstanding,
        actualConcessionAmount: concession,
        validTill: effectiveValidTill,
        statusMessage: `Eligible for ${discountPercent}% Discount under ${bankName ? `${bankName} ` : ''}OTS Scheme. Customer pays ${payPercent}% (₹${systemOTS.toLocaleString('en-IN')}). Valid till ${effectiveValidTill}.`,
      };
    }
  }

  // Undefined Date Range
  return {
    slabDefined: false,
    slabName: 'OTS Slab Not Defined',
    npaDateFormatted,
    customerPayPercentage: 0,
    discountPercentage: 0,
    systemCalculatedOTSAmount: 0,
    originalOutstandingAmount: safeOutstanding,
    actualConcessionAmount: 0,
    validTill: effectiveValidTill,
    statusMessage: `NPA Date (${npaDateFormatted}) falls outside recognized OTS scheme windows. OTS Slab Not Defined.`,
  };
}

/**
 * Calculates Actual Concession Amount:
 * Actual Concession = Original Outstanding − Final OTS Amount
 */
export function calculateActualConcession(
  originalOutstanding: number,
  finalOTSAmount: number
): number {
  return Math.max(0, (originalOutstanding || 0) - (finalOTSAmount || 0));
}

/**
 * Generates the EXACT Marathi WhatsApp OTS Offer message per prompt specifications:
 *
 * नमस्कार [ग्राहकाचे नाव],
 * 
 * आपल्या [बँकेचे नाव] मधील खाते क्रमांक [अकाउंट नंबर] आहे.
 * 
 * आपल्या खात्याची एकूण थकीत रक्कम ₹[Total Outstanding]/- आहे.
 * 
 * आपण OTS योजनेच्या निर्धारित अंतिम तारखेपूर्वी रक्कम भरल्यास, आपल्या खात्याच्या एकरकमी तडजोडीसाठी (OTS) देय रक्कम ₹[Final OTS Amount]/- राहील.
 * 
 * कृपया लक्षात घ्यावे की ही सवलतीची OTS रक्कम केवळ OTS योजनेच्या अंतिम तारखेपूर्वी भरणा केल्यासच लागू राहील.
 * 
 * अधिक माहिती किंवा OTS/भरणा प्रक्रियेसाठी कृपया खालील Recovery Vendor यांच्याशी संपर्क साधावा.
 * 
 * धन्यवाद,
 * [Logged-in User Name]
 * Recovery Vendor
 * 📞 [Logged-in User Mobile Number]
 */
export interface WhatsAppAccountDetail {
  accountNumber: string;
  bankName?: string;
  totalOutstanding: number;
  finalOTSAmount?: number;
  facility?: string;
}

export interface WhatsAppOTSTemplateParams {
  customerName: string;
  bankName: string;
  accountNumber: string;
  totalOutstanding: number;
  finalOTSAmount: number;
  userName: string;
  userMobile: string;
  validTill?: string;
  accounts?: WhatsAppAccountDetail[];
}

export function generateWhatsAppOTSTemplate(params: WhatsAppOTSTemplateParams): string {
  const custName = params.customerName.trim() || 'ग्राहक';
  const bnkName = params.bankName.trim() || 'बँक';
  const uName = params.userName.trim() || 'Recovery Representative';
  const uMobile = params.userMobile.trim() || '';
  const validTillText = params.validTill || getBankOTSValidTill(params.bankName);

  // Multi-Account Customer Template: Lists each account number, facility, and respective outstanding balance
  if (params.accounts && params.accounts.length > 1) {
    const totalOut = params.accounts.reduce(
      (sum, a) => sum + (Number(a.totalOutstanding) || 0),
      0
    ) || params.totalOutstanding;
    const formattedTotalOutstanding = Number(totalOut || 0).toLocaleString('en-IN');
    const formattedTotalOTS = Number(params.finalOTSAmount || 0).toLocaleString('en-IN');

    const accountsBreakdown = params.accounts
      .map((acc, idx) => {
        const accNum = acc.accountNumber?.trim() || 'N/A';
        const bal = Number(acc.totalOutstanding || 0).toLocaleString('en-IN');
        const fac = acc.facility ? ` [${acc.facility}]` : '';
        const otsSnippet =
          acc.finalOTSAmount && acc.finalOTSAmount > 0
            ? ` | OTS: ₹${Number(acc.finalOTSAmount).toLocaleString('en-IN')}/-`
            : '';
        return `${idx + 1}. खाते क्रमांक: ${accNum}${fac} — थकीत रक्कम: ₹${bal}/-${otsSnippet}`;
      })
      .join('\n');

    return `नमस्कार ${custName},

आपली ${bnkName} मधील खाती खालीलप्रमाणे आहेत:
${accountsBreakdown}

📊 सर्व खात्यांची एकूण एकत्रित थकीत रक्कम (Total Outstanding): ₹${formattedTotalOutstanding}/-

आपण OTS योजनेच्या निर्धारित अंतिम तारखेपूर्वी (${validTillText}) रक्कम भरल्यास, आपल्या सर्व खात्यांच्या एकरकमी तडजोडीसाठी (Final Consolidated OTS) एकूण देय रक्कम ₹${formattedTotalOTS}/- राहील.

कृपया लक्षात घ्यावे की ही सवलतीची OTS रक्कम केवळ OTS योजनेच्या अंतिम तारखेपूर्वी (${validTillText}) भरणा केल्यासच लागू राहील.

अधिक माहिती किंवा OTS/भरणा प्रक्रियेसाठी कृपया खालील Recovery Vendor यांच्याशी संपर्क साधावा.

धन्यवाद,
${uName}
Recovery Vendor
📞 ${uMobile}`;
  }

  // Single Account Template
  const accNum = params.accountNumber.trim() || 'N/A';
  const formattedOutstanding = Number(params.totalOutstanding || 0).toLocaleString('en-IN');
  const formattedOTS = Number(params.finalOTSAmount || 0).toLocaleString('en-IN');

  return `नमस्कार ${custName},

आपल्या ${bnkName} मधील खाते क्रमांक ${accNum} आहे.

आपल्या खात्याची एकूण थकीत रक्कम ₹${formattedOutstanding}/- आहे.

आपण OTS योजनेच्या निर्धारित अंतिम तारखेपूर्वी (${validTillText}) रक्कम भरल्यास, आपल्या खात्याच्या एकरकमी तडजोडीसाठी (OTS) देय रक्कम ₹${formattedOTS}/- राहील.

कृपया लक्षात घ्यावे की ही सवलतीची OTS रक्कम केवळ OTS योजनेच्या अंतिम तारखेपूर्वी (${validTillText}) भरणा केल्यासच लागू राहील.

अधिक माहिती किंवा OTS/भरणा प्रक्रियेसाठी कृपया खालील Recovery Vendor यांच्याशी संपर्क साधावा.

धन्यवाद,
${uName}
Recovery Vendor
📞 ${uMobile}`;
}

/**
 * Clean phone number to valid WhatsApp international digits (e.g. prepend 91 for Indian numbers if 10 digits)
 */
export function sanitizeWhatsAppPhone(rawMobile?: string | number | null): string {
  if (!rawMobile) return '';
  const digitsOnly = String(rawMobile).replace(/\D/g, '');
  if (digitsOnly.length === 10) {
    return `91${digitsOnly}`;
  }
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return digitsOnly;
  }
  return digitsOnly;
}

/**
 * Prepares WhatsApp deep link
 */
export function createWhatsAppDeepLink(phone: string, messageText: string): string {
  const sanitized = sanitizeWhatsAppPhone(phone);
  const encodedText = encodeURIComponent(messageText);
  if (sanitized) {
    return `https://api.whatsapp.com/send?phone=${sanitized}&text=${encodedText}`;
  }
  return `https://api.whatsapp.com/send?text=${encodedText}`;
}
