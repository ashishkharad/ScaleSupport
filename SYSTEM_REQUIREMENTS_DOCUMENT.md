# ScaleSupport Debt Recovery Management System (SRMS)
## Comprehensive Technical & Functional Requirements Document

**Author / Lead:** Ashish Kharad (`ashish.kharad2@gmail.com`)  
**Application Type:** Full-Stack Enterprise Recovery Management Platform (Web Portal + Mobile Field Agent Suite)  
**Current Production Runtime:** Express.js Backend + Vite React 19 Frontend + Persistent Multi-Tier Data Storage  
**Document Version:** 1.0.0  
**Date:** September 2026

---

## 1. Executive Summary & Objective

ScaleSupport Debt Recovery Management System (SRMS) is an end-to-end debt recovery and account allocation platform built specifically for Indian banking collections, Non-Performing Asset (NPA) management, and One-Time Settlement (OTS) recovery operations.

The system solves two primary operational challenges:
1. **Multi-device persistence & collaboration:** Centralized real-time storage that allows administrators, coordinators, and field recovery agents to access, log, and recover assigned NPA accounts across any computer or mobile device without losing data.
2. **Offline-capable Field Operations:** An Android mobile app workspace tailored for field recovery agents with geo-tagging, photo watermarking, PTP recording, and WhatsApp OTS payment link distribution.

---

## 2. Technology Stack & Current Implementation

### 2.1 Backend Architecture
- **Runtime Environment:** Node.js (v20+) with TypeScript and `tsx` execution.
- **Server Framework:** Express.js (v4.21+) handling REST API routes, centralized authentication, and real-time master store data persistence.
- **Production Compilation:** `esbuild` compiling `server.ts` into a self-contained bundle at `dist/server.cjs`.
- **Ingress Port:** Single dedicated port `3000` on `0.0.0.0` behind container reverse proxy.

### 2.2 Storage & Persistence Layers (3-Tier Model)
1. **Tier 1: Centralized Server Store (`/data/srms_master_store.json` & `/data/srms_users.json`)**
   - Authoritative central database storing accounts, allocations, field visits, PTPs, recoveries, commission rules, and user records.
   - Any modification made by an admin or agent persists to disk on the server.
   - When a user logs in from any device or browser, the system immediately pulls this master database.
2. **Tier 2: Firebase Firestore (Cloud Multi-Device Sync)**
   - Used for sub-50ms real-time document synchronization and multi-device live data mirroring.
3. **Tier 3: Google Workspace (Sheets & Drive Integration)**
   - Automated continuous export to 19 Google Sheets tabs for auditing and management reporting.
   - Zero-cost media storage on Google Drive for watermarked field visit photos and recovery receipts.
4. **Client-Side Cache (Resilience Layer):**
   - LocalStorage and SessionStorage cache active state so agents retain access in low-connectivity field areas.

### 2.3 Frontend Architecture
- **Framework:** React 19 with TypeScript.
- **Build Tool:** Vite 6 with `@tailwindcss/vite` (Tailwind CSS v4).
- **Icons:** `lucide-react`.
- **Animations & UX:** `motion` (Framer Motion v12) and `canvas-confetti`.
- **Excel & Document Engine:** SheetJS (`xlsx`) for multi-format Excel/CSV batch account import and full database export; `jspdf` & `jspdf-autotable` for automated recovery receipts and demand notices.

---

## 3. User Roles, Access Control & Authentication Logic

### 3.1 Role Hierarchy
1. **Administrator (`admin`)**: Full system authority. Can upload accounts, assign agents, configure recovery commission slabs, approve/modify OTS schemes, manage users, and purge or restore data.
2. **Recovery Coordinator (`coordinator`)**: Oversees field agents, reviews PTPs, schedules follow-ups, and monitors zonal/branch progress.
3. **Field Recovery Agent (`agent`)**: Operates via the Android Mobile Workspace. Accesses only allocated NPA accounts, logs field visits with GPS coordinates, captures watermarked evidence, and creates PTP commitments.
4. **Branch Manager (`branch_manager`)**: Read and approval access for accounts belonging to their specific branch.
5. **Recovery Department (`recovery_dept`)**: High-level audit and NPA recovery reconciliation.

### 3.2 Authentication & Security Logic
- **Dual-Mode Login Engine:**
  - Authenticates via server endpoint `/api/auth/login`.
  - Fallback cryptographic evaluation using Salted SHA-256 (`hashPasswordSync(cleanPassword, salt)`).
- **Accepted Login Identifiers:** Exact Match on `agentId` (e.g. `RA-0009`), `username`, `email`, or `id`.
- **Default Active Credentials:**
  - **Administrator:** `admin` / `Admin@2026` (or `Ashish.kharad2@gmail.com`)
  - **Field Recovery Agent:** `RA-0009` / `Agent@2026` (Name: ScaleSupport)
- **Session Tokens:** 32-byte cryptographic hex tokens validated per request with 24-hour expiration.
- **Deactivation Lockdown:** Accounts marked `active: false` are strictly rejected before session issuance.

---

## 4. Core Business Logic & Functional Modules

### 4.1 Account Allocation & Management
- **Batch Excel Importer:** Supports standard Indian banking NPA spreadsheets (columns for Loan No, Customer Name, Mobile, Facility/Account Type, Sanction Amount, Outstanding Amount, Overdue, NPA Date, Branch, Area, Zone).
- **Smart Agent Allocation:** Accounts are assigned to agents by Agent ID (e.g., `RA-0009`).
- **Scoped Views:** Field agents only see accounts where `assignedAgentId === user.agentId`.

### 4.2 Field Visits & Evidence Collection
- **GPS Coordinates Capture:** Captures device latitude and longitude at the moment of visit.
- **Canvas Watermarked Photos:** Overlays timestamp, agent name, account number, coordinates, and ScaleSupport watermark onto captured images.
- **Audio Voice Notes:** Records voice memos during customer discussions.

### 4.3 Promise to Pay (PTP) & Recovery Workflow
- **PTP Tracking:** Tracks promised payment date, amount, and contact channel (Phone, Visit, WhatsApp).
- **Automated Reminders:** Highlights overdue PTPs and upcoming commitments.
- **Recovery Logging:** Records payment mode (UPI, NEFT, RTGS, Cash, Cheque), reference number, and automatically updates outstanding balance.

### 4.4 One-Time Settlement (OTS) Engine
- **Configurable Slabs:** Pre-configured concession percentages based on NPA vintage and outstanding loan bracket.
- **WhatsApp Notice Generator:** One-click generation of formatted settlement letters and payment links dispatched via WhatsApp Web/API.

### 4.5 Dynamic Commission Engine
- Calculates agent incentive commissions based on recovery stage, amount collected, and custom bank rules.

---

## 5. Deployment & Hosting Specifications

### 5.1 Cloud Run / Container Hosting (Live Application)
- **Dev Server Command:** `npm run dev` (`tsx server.ts`)
- **Production Build:** `npm run build` (`vite build && esbuild server.ts ...`)
- **Start Command:** `npm run start` (`node dist/server.cjs`)
- **External Port:** 3000 (Routed via Google Cloud Run Reverse Proxy).

### 5.2 Firebase Hosting & Project Structure
- **Firebase Config:** Configured via `firebase.json` and client SDK in `/src/services/firebaseFirestoreService.ts`.
- **Public Directory:** `dist`
- **Single-Page App Rewrite:** All client traffic routes to `/index.html`.

---

## 6. Maintenance & Troubleshooting Guide

1. **User Login Error ("RA-0009 Cannot Login"):**
   - Cause: User existed in browser state but was not persisted to the central server store.
   - Resolution: `RA-0009` is now registered in `/data/srms_users.json`, `srms_master_store.json`, and `serverUsers`. Password is `Agent@2026`.
2. **Updating Server Data:**
   - Use the dedicated API endpoints (`/api/accounts/batch-save`, `/api/master-data/save`, `/api/auth/add-user`).
   - Server automatically updates disk files upon receiving data payloads.
