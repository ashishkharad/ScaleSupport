# ScaleSupport SRMS — Software Requirements & Technical Architecture Specification
**Document Version:** 2.4.0  
**System Name:** ScaleSupport Debt Recovery Management & Account Allocation System (SRMS)  
**Target Environment:** Banking & Non-Banking Financial Corporations (NBFC), Debt Resolution Agencies (DRA), Field Recovery Operations  
**Date:** September 2026  

---

## 1. Executive Summary & System Vision
ScaleSupport SRMS is an enterprise-grade debt recovery management, loan portfolio allocation, field agency management, and borrower engagement platform. It bridges the gap between bank branch supervisors/coordinators and mobile field recovery agents operating in urban, semi-urban, and remote rural areas across India.

### Core Objectives
1. **Intelligent Account Allocation:** Multi-attribute allocation of delinquent customer accounts to field agents and branches based on geographic radius, overdue buckets, loan products, and target capacities.
2. **Field Enforcement & Compliance:** Real-time geo-stamped and time-stamped photo capture, audio-recorded field notes, and digital payment receipt generation with zero manual tampering.
3. **Multi-tier Dispute & Settlement Resolution:** One-Time Settlement (OTS) calculation engine complying with Bank of Maharashtra & RBI guidelines, alongside automated Marathi/Hindi/English WhatsApp communication templates and Lok Adalat pre-litigation notices.
4. **Performance & Commission Accrual:** Dynamic multi-tier slab calculation of agency and agent commissions, penalty deductions, and PDF billing invoices.
5. **Hybrid Offline-First Cloud Architecture:** Uninterrupted offline agent operation with optimistic UI, encrypted client storage, and real-time bidirectional synchronization with Google Cloud Firestore and Google Sheets.

---

## 2. Technology Stack & Implementation Details

### 2.1. Frontend Architecture
| Layer / Component | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Framework** | React + TypeScript | 19.0.1 / TS ~5.8 | Core reactive web UI, strict type safety, modular component hierarchy |
| **Build & Bundler** | Vite | 6.2.3 | Instant HMR development server, optimized ESM client production compilation |
| **CSS & Design System** | Tailwind CSS | 4.1.14 | Low-overhead utility classes, responsive mobile-to-desktop fluid layouts |
| **Animation Engine** | Motion (`motion/react`) | 12.23.24 | Smooth transitions, drawer fly-outs, status toasts, and modal animations |
| **Icons Library** | Lucide React | 0.546.0 | Uniform enterprise iconography |
| **Document Generation** | jsPDF & jsPDF-AutoTable | 4.2.1 / 5.0.8 | Client-side dynamic PDF generation (Receipts, Invoices, OTS Approval Letters) |
| **Spreadsheet Engine** | SheetJS (`xlsx`) | 0.18.5 | Client-side Excel (`.xlsx`/`.xls`) & CSV parsing, schema normalization, batch export |

### 2.2. Backend & Server Architecture
| Layer / Component | Technology | Version | Purpose & Implementation |
| :--- | :--- | :--- | :--- |
| **Runtime & Server** | Node.js + Express | Express 4.21 | RESTful API gateway on port 3000, Vite dev middleware, static file serving |
| **Server Bundler** | esbuild | 0.25.0 | Bundles TypeScript server into self-contained `dist/server.cjs` for Cloud Run |
| **Execution Engine** | `tsx` | 4.21.0 | Fast zero-config TypeScript execution in development |
| **Cryptography** | Node `crypto` | Built-in | Salted SHA-256 password hashing, session token verification, secure OTP generation |
| **AI Integration** | Google GenAI SDK | 2.4.0 (`@google/genai`) | Server-side Gemini API client for smart borrower negotiation talking points |

### 2.3. Data & Storage Infrastructure
| Storage Layer | Provider / Tool | Configuration & Key Function |
| :--- | :--- | :--- |
| **Primary Cloud Database** | Google Cloud Firestore | Project: `ai-studio-scalesupportreco-7b71b1a6-a25c-4ae5-a67f-daef4ac70899`<br>Document-oriented real-time collections (`accounts`, `users`, `recoveries`, `allocations`, `branches`, `audit_logs`) |
| **Client Local Cache** | HTML5 LocalStorage & IndexedDB | Keys: `srms_persisted_accounts`, `srms_system_users`, `srms_archived_accounts`, `srms_whatsapp_offer_logs`, `srms_allocations`<br>Enables instant sub-second boot time and full offline operational capability. |
| **Secondary Integration** | Google Sheets & Drive API | Bidirectional spreadsheet export/import and cloud document storage. |
| **Deployment & Hosting** | Google Cloud Run (Containerized) | High-availability Linux container deployment in `asia-southeast1` (Singapore) with automated SSL/TLS termination. |

---

## 3. User Personas & Role-Based Access Control (RBAC)

The system enforces 6 granular operational roles:

1. **Admin / Super Administrator (`admin`):**
   - Full master access: Hierarchy creation, agency settings, account allocation rules, user management, audit log inspections, database resets, and bulk account purge operations.
2. **Recovery Department (`recovery_department`):**
   - Bank-level portfolio oversight, macro recovery tracking, OTS scheme approvals, agency performance comparison, and zonal target reviews.
3. **Branch Manager (`branch_manager`):**
   - Branch-level NPA monitoring, approving field visit waivers, supervising branch-assigned agents, and reviewing broken PTP escalation lists.
4. **Coordinator / Team Leader (`coordinator`):**
   - Daily allocation distribution, agent attendance tracking, daily collection tally reconciliation, customer call follow-ups, and WhatsApp campaign dispatches.
5. **Field Recovery Agent (`agent`):**
   - Access to mobile view (`AgentAndroidApp`) and agent web portal (`AgentWebPortal`): My accounts, route map navigation, geo-stamped visit check-ins, customer calling, receipt issuance, and WhatsApp settlement offers.
6. **Executive Management (`management`):**
   - Read-only strategic intelligence dashboards: Gross recovery yield, commission expense ratio, aging bucket recovery curves, and agent productivity metrics.

---

## 4. Functional Modules & Business Logic Specifications

### Module 1: Account Ingestion, Normalization & Storage
- **Excel/CSV Smart Parser (`excelAccountImporter.ts`):**
  - Accepts arbitrary bank export formats. Uses regex-based header mapping to detect fields:
    - *Account ID / Loan No:* `loan no`, `account number`, `acct id`, `lan`
    - *Customer Demographics:* `name`, `borrower`, `mobile`, `contact`, `address`, `city`, `pincode`
    - *Financials:* `sanction amount`, `disbursement`, `outstanding`, `overdue`, `emi`, `dpd`, `npa date`
    - *Classification:* `product` (Personal Loan, Home Loan, Vehicle Loan, Agri Loan, Gold Loan), `npa stage` (SMA-0, SMA-1, SMA-2, Sub-Standard, Doubtful-1/2/3, Loss)
  - Automatic deduplication based on unique `loanNumber` or `accountId`.
  - Multi-account detection: Grouping distinct loan accounts sharing identical customer names or phone numbers.
- **Bulk Account Deletion & Purging Logic (`deleteBulkAccounts`):**
  - **Granular Scoping:** Scoped by `agentId`, `branchName`, `accountIds` (manual table checkbox selection), or `all` (complete database wipe).
  - **Archive Mode vs Permanent Mode:**
    - *Archive Mode:* Sets `accountStatus = 'Closed'`, `closureType = 'Administrative Deletion'`, and pushes record to `srms_archived_accounts`. Historical remarks, receipts, and PTPs remain searchable.
    - *Permanent Mode:* Hard deletes matching entries from `srms_persisted_accounts`, cleans up active allocations, and removes in-flight auto-push timers.
  - **Safety Gate:** Requires typing uppercase confirmation words (`DELETE` or `DELETE ALL`) before execution.

### Module 2: Intelligent Account Allocation Engine
- **Single & Batch Allocation:**
  - Assigns single accounts or batches of thousands of accounts to designated field agents or branches.
  - Generates immutable `Allocation` records containing: `allocationId`, `accountId`, `agentId`, `agentName`, `allocatedDate`, `status` (`Active`, `Re-allocated`, `Recalled`).
  - Automatically sends notifications to agents' mobile sync feed.

### Module 3: Field Visit Enforcement & Proof of Contact
- **Watermark Camera Engine (`watermark.ts` & `WatermarkCameraModal.tsx`):**
  - Captures high-resolution canvas photos directly via device media streams (`navigator.mediaDevices.getUserMedia`).
  - Burns un-alterable cryptographic watermark onto the image pixels:
    - Current GPS Coordinates (Latitude, Longitude with ± accuracy in meters)
    - Reverse-geocoded Street Address / Landmark
    - High-precision timestamp (`DD-MM-YYYY HH:mm:ss IST`)
    - Agent ID, Agent Name, and Borrower Loan ID
  - Outputs base64 compressed JPEG asset directly associated with the field check-in record.
- **Voice Note Recording Engine (`VoiceNoteRecorderModal.tsx`):**
  - Records borrower interaction audio clips via `MediaRecorder` API.
  - Provides in-app waveform visualization and audio playback for supervisor review.

### Module 4: Recovery, Receipts & Reverse Recovery
- **Receipt Generation Engine (`DailyRecoveryReceiptModal.tsx`):**
  - Generates formal Indian Rupee recovery receipts with alphanumeric receipt IDs (`REC-{TIMESTAMP}-{RAND}`).
  - Captures payment mode (`UPI / QR`, `Cash`, `Cheque / DD`, `NEFT / RTGS`), transaction reference number, and deposit date.
  - Instant balance recalculation: Updates `outstandingAmount` and `overdueAmount` in real time.
  - Provides one-click WhatsApp receipt dispatch and printable PDF download formatted with bank branding and authorized agent signatures.
- **Reversal & Audit Logic (`reverseRecovery`):**
  - Allows supervisors to reverse incorrect or bounced collections.
  - Automatically restores borrower overdue balance, marks receipt as `REVERSED`, and appends reason to customer timeline.

### Module 5: Promise-To-Pay (PTP) & Broken PTP Pipeline
- **Lifecycle Tracking:**
  - Stages: `PTP Given` -> `PTP Active` -> `PTP Honored` (upon matching recovery) or `Broken PTP` (when current date > promised date with zero receipt).
- **Automated PTP Digest Modal (`PTPDigestModal.tsx`):**
  - Daily morning digest filtering PTPs maturing today, broken PTPs requiring immediate field escalation, and honored milestones.

### Module 6: Bank of Maharashtra One-Time Settlement (OTS) Engine
- **Calculation Logic (`otsScheme.ts`):**
  - Computes minimum acceptable settlement amount based on NPA vintage, secured vs. unsecured asset coverage, and statutory waiver guidelines:
    - *Outstanding Principal:* Minimum floor threshold
    - *Interest Waiver:* Scaled waiver up to 80%–100% of penal and uncharged interest
    - *Expense Waiver:* Discretionary waiver on legal charges
  - Generates official OTS application forms, supervisor approval tracking, and formal Bank No Dues / Clearance certifications upon full payment.

### Module 7: Multi-Lingual WhatsApp Draft Studio & Lok Adalat Special Notice
- **Template System (`WhatsAppDraftModal.tsx`):**
  - **Language Defaults:** Defaults directly to **मराठी (Marathi)** with instant toggles for **English** and **हिंदी (Hindi)**.
  - **Categories & Scenarios:**
    1. *थकीत हप्ता स्मरण (Payment Reminder):* Polite & urgent reminder detailing overdue EMIs.
    2. *लोक अदालत विशेष तडजोड नोटीस (Lok Adalat Special Notice):* Formal legal notice citing National Lok Adalat session dates, venue (Taluka/District Court), and pre-litigation dispute settlement waivers.
    3. *एकरकमी कर्ज तडजोड योजना (OTS Offer):* Special discount announcement detailing valid-till date and waiver benefits.
    4. *वचनभंग सूचना (Broken PTP Alert):* 24-hour compliance warning.
    5. *प्रत्यक्ष वसुली भेट (Field Visit Intimation):* Prior notice of home/office inspection.
  - **Automated Localization:** Converts Gregorian dates into Marathi calendar strings (e.g. "१२ सप्टेंबर २०२६").
  - **One-Click Dispatch:** Uses `encodeURIComponent` to launch native WhatsApp Web or Mobile Client with full dynamic pre-filled text.

### Module 8: Commission & Incentive Engine (`commissionEngine.ts`)
- **Slab-Based Accruals:**
  - Evaluates monthly recovery volume against target brackets (e.g., 0-5 Lakhs: 5%, 5-10 Lakhs: 8%, 10L+: 10%).
  - DPD Bucket Multipliers: Higher commission weightage for resolving 90+ DPD and written-off portfolios.
  - Automated generation of GST-compliant agency commission billing statements (`CommissionBillModal.tsx`).

---

## 5. Non-Functional Requirements (NFR)

1. **High Availability & Performance:**
   - Sub-500ms response time on key interactions using React optimistic updates.
   - Cloud Run auto-scaling with zero server maintenance.
2. **Data Security & Privacy:**
   - SHA-256 salted password hashing.
   - PII protection with email and phone masking on supervisor overview screens (`98220*****23`).
   - Secure HTTPS/TLS 1.3 encryption across all client-server communications.
3. **Offline Resilience:**
   - Recovery agents can record visits, capture watermarked photos, and log notes offline in remote areas. Data queues in client storage and syncs automatically when network connectivity is re-established.
4. **Cross-Platform Compatibility:**
   - Desktop Web Portal (1200px+ display optimization for coordinators).
   - Touch-optimized Mobile Android Web View (<450px responsive layout with large touch targets for on-field agents).
