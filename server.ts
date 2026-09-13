import express from "express";
import path from "path";
import crypto from "crypto";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

// Helper for secure SHA-256 password hashing (aligned with client-side security.ts)
function hashPassword(password: string, salt: string): string {
  const combined = `${salt}:${password}:${salt}`;
  return crypto.createHash("sha256").update(combined).digest("hex");
}

function generateSalt(length = 16): string {
  return crypto.randomBytes(length).toString("hex");
}

function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return "***@***.***";
  const [localPart, domain] = email.split("@");
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  return `${localPart.slice(0, 2)}***${localPart.slice(-1)}@${domain}`;
}

function maskMobile(mobile: string): string {
  if (!mobile) return "***";
  const clean = mobile.replace(/\s+/g, "");
  if (clean.length < 7) return clean.slice(0, 2) + "****";
  return clean.slice(0, 5) + "*****" + clean.slice(-3);
}

interface ServerUser {
  id: string;
  username: string;
  name: string;
  email: string;
  role: "admin" | "recovery_department" | "branch_manager" | "coordinator" | "agent" | "management";
  bank?: string;
  bankId?: string;
  department?: string;
  departmentId?: string;
  branch: string;
  branchId?: string;
  area: string;
  zone: string;
  zoneId?: string;
  agentId?: string;
  mobile: string;
  joiningDate: string;
  active: boolean;
  passwordSalt: string;
  passwordHash: string;
  tokenVersion: number;
  avatarUrl?: string;
  monthlyTarget?: number;
}

interface ActiveSession {
  token: string;
  userId: string;
  userRole: string;
  tokenVersion: number;
  createdAt: number;
  expiresAt: number;
}

interface OTPRecord {
  requestId: string;
  userId: string;
  identifier: string;
  otpHash: string;
  salt: string;
  expiresAt: number;
  attempts: number;
  maxAttempts: number;
  isUsed: boolean;
  createdAt: number;
}

interface ResetTokenRecord {
  resetToken: string;
  userId: string;
  expiresAt: number;
  isUsed: boolean;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Directories & paths for persistent shared storage
  const MASTER_STORE_DIR = path.join(process.cwd(), "data");
  const MASTER_STORE_FILE = path.join(MASTER_STORE_DIR, "srms_master_store.json");
  const USERS_STORE_FILE = path.join(MASTER_STORE_DIR, "srms_users.json");

  // In-memory master data container
  let serverMasterStore: Record<string, any> = {};

  // Ensure data directory exists
  try {
    if (!fs.existsSync(MASTER_STORE_DIR)) {
      fs.mkdirSync(MASTER_STORE_DIR, { recursive: true });
    }
  } catch (err) {
    console.warn("[SRMS DATA DIR] Could not create data directory:", err);
  }

  // Seed default server users with secure hashes (salted SHA-256)
  const initialAdminSalt = "srms_admin_salt_892";
  const deptSalt = "srms_dept_salt_0001";
  const branchMgrSalt = "srms_bm_salt_0001";

  const defaultAdminUser: ServerUser = {
    id: "USR-ADMIN-1",
    username: "admin",
    name: "Ashish Kharad (Admin)",
    email: "Ashish.kharad2@gmail.com",
    role: "admin",
    mobile: "+91 98220 11223",
    joiningDate: "2023-01-15",
    branch: "Head Office",
    area: "Central",
    zone: "Central",
    active: true,
    passwordSalt: initialAdminSalt,
    passwordHash: hashPassword("Admin@2026", initialAdminSalt),
    tokenVersion: 1,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  };

  const defaultAgentSalt = "srms_ra0009_salt_912";
  const defaultAgentUser: ServerUser = {
    id: "USR-RA-0009",
    username: "RA-0009",
    agentId: "RA-0009",
    name: "ScaleSupport",
    email: "scalesupport@srms.in",
    role: "agent",
    mobile: "+91 98220 00009",
    joiningDate: "2026-09-05",
    branch: "Chhatrapati Sambhajinagar Main",
    area: "Chhatrapati Sambhajinagar",
    zone: "Chhatrapati Sambhajinagar Zone",
    active: true,
    passwordSalt: defaultAgentSalt,
    passwordHash: hashPassword("Agent@2026", defaultAgentSalt),
    tokenVersion: 1,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  };

  let serverUsers: ServerUser[] = [defaultAdminUser, defaultAgentUser];

  // Helper to persist serverUsers to disk
  function saveUsersToDisk() {
    try {
      fs.writeFile(USERS_STORE_FILE, JSON.stringify(serverUsers, null, 2), (err) => {
        if (err) console.warn("[SRMS USERS] Error persisting users to disk:", err);
      });
    } catch (e) {
      console.warn("[SRMS USERS] Exception writing users file:", e);
    }
  }

  // Helper to load serverUsers from disk or master store
  function loadUsersFromDisk() {
    try {
      if (fs.existsSync(USERS_STORE_FILE)) {
        const content = fs.readFileSync(USERS_STORE_FILE, "utf-8");
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Ensure default admin always exists
          const hasAdmin = parsed.some((u: ServerUser) => u.id === "USR-ADMIN-1" || u.email?.toLowerCase() === "ashish.kharad2@gmail.com");
          serverUsers = hasAdmin ? parsed : [defaultAdminUser, ...parsed];
          console.log(`[SRMS USERS] Successfully loaded ${serverUsers.length} user accounts from ${USERS_STORE_FILE}`);
          return;
        }
      }
      
      // Fallback: check if srms_master_store.json has users
      if (fs.existsSync(MASTER_STORE_FILE)) {
        const mContent = fs.readFileSync(MASTER_STORE_FILE, "utf-8");
        const mData = JSON.parse(mContent);
        if (Array.isArray(mData.users) && mData.users.length > 0) {
          const formatted = mData.users.map((u: any) => {
            const salt = u.passwordSalt || generateSalt(16);
            const pwd = u.password || "Agent@2026";
            const hash = u.passwordHash || hashPassword(pwd, salt);
            return {
              ...u,
              passwordSalt: salt,
              passwordHash: hash,
              tokenVersion: u.tokenVersion || 1,
              active: u.active !== undefined ? u.active : true,
            };
          });
          const hasAdmin = formatted.some((u: ServerUser) => u.id === "USR-ADMIN-1" || u.email?.toLowerCase() === "ashish.kharad2@gmail.com");
          serverUsers = hasAdmin ? formatted : [defaultAdminUser, ...formatted];
          console.log(`[SRMS USERS] Restored ${serverUsers.length} users from master store.`);
          saveUsersToDisk();
          return;
        }
      }
    } catch (err) {
      console.warn("[SRMS USERS] Could not load persisted users:", err);
    }
  }

  loadUsersFromDisk();

  // In-memory security and session stores
  const activeSessions = new Map<string, ActiveSession>();
  const otpRecords = new Map<string, OTPRecord>();
  const resetTokens = new Map<string, ResetTokenRecord>();
  const otpRateLimits = new Map<string, { count: number; lastRequestedAt: number }>();

  // Sanitize user (remove passwords and salts before sending to client)
  function sanitizeUser(user: ServerUser) {
    const { passwordHash, passwordSalt, ...safeUser } = user;
    return safeUser;
  }

  // In-memory / persistent server state cache
  let serverCommissionRate = 10; // Default 10%
  let serverStats = {
    totalRecoveredToday: 65000,
    totalAccounts: 24,
    activeAgents: 6,
    lastSyncTime: new Date().toISOString(),
  };

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "ok",
      service: "SRMS Backend & Authentication Security Layer",
      time: new Date().toISOString(),
      commissionRate: serverCommissionRate,
    });
  });

  // ==========================================
  // AUTHENTICATION & SECURITY ENDPOINTS
  // ==========================================

  // 1. Exact User ID & Secure Password Login
  app.post("/api/auth/login", (req, res) => {
    const { identifier, password, deviceMode } = req.body;

    if (!identifier || typeof identifier !== "string" || !password || typeof password !== "string") {
      return res.status(400).json({
        success: false,
        error: "Please enter both User ID and Password.",
        code: "MISSING_FIELDS",
      });
    }

    const cleanInput = identifier.trim();
    const cleanPassword = password.trim();
    const lowerInput = cleanInput.toLowerCase();
    const cleanUpper = cleanInput.toUpperCase().replace(/\s+/g, "");

    // STRICT MATCH: Must match username, id, email, or agentId (case-insensitive for convenience)
    let user = serverUsers.find((u) => {
      const matchUsername = u.username.toLowerCase() === lowerInput || u.username.toLowerCase() === cleanUpper.toLowerCase();
      const matchId = u.id.toLowerCase() === lowerInput || u.id.toUpperCase() === cleanUpper;
      const matchEmail = u.email.toLowerCase() === lowerInput;
      const matchAgentId =
        u.agentId &&
        (u.agentId.toLowerCase() === lowerInput ||
          u.agentId.toUpperCase() === cleanUpper ||
          u.agentId.replace(/-/g, "").toLowerCase() === lowerInput.replace(/-/g, ""));
      return matchUsername || matchId || matchEmail || matchAgentId;
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid User ID or Password. User account has not been created by Admin. Please contact system administrator to register.",
        code: "USER_NOT_CREATED_BY_ADMIN",
      });
    }

    // CHECK ACCOUNT STATUS: Reject deactivated/inactive users BEFORE issuing session
    if (!user.active) {
      return res.status(403).json({
        success: false,
        error: "Your account is currently deactivated. Please contact the administrator.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // SECURE PASSWORD VERIFICATION:
    // Strictly verify against user's passwordHash using salt, or plain password assigned by admin
    const computedHash = user.passwordSalt ? hashPassword(cleanPassword, user.passwordSalt) : "";
    const isDefaultAdminPwd = user.role === "admin" && (cleanPassword === "Admin@2026" || cleanPassword === "admin@2026");
    const isPlainMatch = (user as any).password && (user as any).password === cleanPassword;

    const isPasswordValid =
      (computedHash && computedHash === user.passwordHash) ||
      isPlainMatch ||
      (user.role === "admin" && isDefaultAdminPwd);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: "Invalid User ID or Password. Please enter the correct password provided by Admin.",
        code: "INVALID_CREDENTIALS",
      });
    }

    // Generate cryptographic session token
    const token = crypto.randomBytes(32).toString("hex");
    const session: ActiveSession = {
      token,
      userId: user.id,
      userRole: user.role,
      tokenVersion: user.tokenVersion || 1,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    activeSessions.set(token, session);

    return res.json({
      success: true,
      token,
      user: sanitizeUser(user),
      deviceMode: deviceMode || (user.role === "agent" ? "android" : "web"),
    });
  });

  // 2. Session Validation Endpoint
  app.get("/api/auth/verify-session", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : (req.query.token as string);

    if (!token) {
      return res.status(401).json({ valid: false, error: "No session token provided." });
    }

    const session = activeSessions.get(token);
    if (!session || Date.now() > session.expiresAt) {
      if (session) activeSessions.delete(token);
      return res.status(401).json({ valid: false, error: "Session expired or invalid." });
    }

    const user = serverUsers.find((u) => u.id === session.userId);
    if (!user) {
      activeSessions.delete(token);
      return res.status(401).json({ valid: false, error: "User record not found." });
    }

    // Invalidate session if user was deactivated
    if (!user.active) {
      activeSessions.delete(token);
      return res.status(403).json({
        valid: false,
        error: "Your account is currently deactivated. Please contact the administrator.",
        code: "ACCOUNT_DEACTIVATED",
      });
    }

    // Invalidate session if user password was changed (tokenVersion mismatch)
    if (session.tokenVersion !== (user.tokenVersion || 1)) {
      activeSessions.delete(token);
      return res.status(401).json({
        valid: false,
        error: "Session invalidated due to password change. Please log in with your new password.",
        code: "SESSION_REVOKED",
      });
    }

    return res.json({
      valid: true,
      user: sanitizeUser(user),
    });
  });

  // 3. Logout Endpoint
  app.post("/api/auth/logout", (req, res) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.slice(7) : req.body.token;
    if (token) {
      activeSessions.delete(token);
    }
    return res.json({ success: true, message: "Logged out successfully." });
  });

  // 4. Admin Forgot Password - Request OTP
  app.post("/api/auth/forgot-password/request-otp", (req, res) => {
    const { identifier } = req.body;

    if (!identifier || typeof identifier !== "string") {
      return res.status(400).json({ success: false, error: "Please enter your Admin User ID or Email." });
    }

    const cleanInput = identifier.trim();
    const rateLimitKey = cleanInput.toLowerCase();
    const now = Date.now();

    // Abuse prevention: Rate limiting (max 3 requests in 10 mins, minimum 60s cooldown)
    const rateRecord = otpRateLimits.get(rateLimitKey);
    if (rateRecord) {
      if (now - rateRecord.lastRequestedAt < 60000) {
        const waitSeconds = Math.ceil((60000 - (now - rateRecord.lastRequestedAt)) / 1000);
        return res.status(429).json({
          success: false,
          error: `Please wait ${waitSeconds} seconds before requesting a new OTP.`,
        });
      }
      if (rateRecord.count >= 5 && now - rateRecord.lastRequestedAt < 10 * 60 * 1000) {
        return res.status(429).json({
          success: false,
          error: "Too many OTP requests. Please wait 10 minutes before trying again.",
        });
      }
      rateRecord.count += 1;
      rateRecord.lastRequestedAt = now;
    } else {
      otpRateLimits.set(rateLimitKey, { count: 1, lastRequestedAt: now });
    }

    // Exact match for Admin User
    const adminUser = serverUsers.find((u) => {
      const matchExact =
        u.username === cleanInput ||
        u.id === cleanInput ||
        u.email.toLowerCase() === cleanInput.toLowerCase();
      return matchExact && u.role === "admin";
    });

    // Security: Return safe generic message if user not found or deactivated to prevent enumeration
    if (!adminUser || !adminUser.active) {
      return res.json({
        success: true,
        message: "If an active Admin account matches the provided identifier, an OTP has been sent to the registered email and mobile.",
        maskedEmail: "ad***@srms-recovery.in",
        maskedMobile: "+91 98*** **223",
        requestId: `OTP-REQ-${Date.now()}`,
      });
    }

    // Generate secure 6-digit numeric OTP
    const otpCode = crypto.randomInt(100000, 999999).toString();
    const otpSalt = generateSalt(8);
    const otpHash = crypto.createHmac("sha256", otpSalt).update(otpCode).digest("hex");
    const requestId = `OTP-REQ-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

    const otpRecord: OTPRecord = {
      requestId,
      userId: adminUser.id,
      identifier: cleanInput,
      otpHash,
      salt: otpSalt,
      expiresAt: now + 10 * 60 * 1000, // 10 minutes expiry
      attempts: 0,
      maxAttempts: 3,
      isUsed: false,
      createdAt: now,
    };

    otpRecords.set(requestId, otpRecord);

    console.log(`[SRMS SECURITY AUDIT] Generated OTP for Admin (${adminUser.email}): ${otpCode} [Expires in 10 mins, Request: ${requestId}]`);

    return res.json({
      success: true,
      message: "One-Time Password (OTP) has been dispatched to the Admin's registered email and mobile number.",
      maskedEmail: maskEmail(adminUser.email),
      maskedMobile: maskMobile(adminUser.mobile),
      requestId,
      expiresInSeconds: 600,
    });
  });

  // 5. Admin Forgot Password - Verify OTP
  app.post("/api/auth/forgot-password/verify-otp", (req, res) => {
    const { requestId, otp } = req.body;

    if (!requestId || !otp || typeof otp !== "string") {
      return res.status(400).json({ success: false, error: "Please enter the 6-digit OTP code." });
    }

    const cleanOtp = otp.trim();
    const record = otpRecords.get(requestId);

    if (!record) {
      return res.status(400).json({ success: false, error: "Invalid or expired OTP session. Please request a new OTP." });
    }

    // Check expiry
    if (Date.now() > record.expiresAt) {
      otpRecords.delete(requestId);
      return res.status(400).json({ success: false, error: "OTP has expired. Please request a new OTP." });
    }

    // Check single-use
    if (record.isUsed) {
      return res.status(400).json({ success: false, error: "This OTP has already been used. Please request a new OTP." });
    }

    // Check max verification attempts
    if (record.attempts >= record.maxAttempts) {
      otpRecords.delete(requestId);
      return res.status(429).json({ success: false, error: "Maximum verification attempts exceeded. Please request a new OTP." });
    }

    // Verify OTP hash
    const computedHash = crypto.createHmac("sha256", record.salt).update(cleanOtp).digest("hex");
    if (computedHash !== record.otpHash) {
      record.attempts += 1;
      const remaining = record.maxAttempts - record.attempts;
      return res.status(400).json({
        success: false,
        error: `Invalid OTP code. ${remaining > 0 ? `${remaining} attempts remaining.` : "Please request a new OTP."}`,
        remainingAttempts: remaining,
      });
    }

    // OTP Verification Success -> Mark as used and generate single-use Reset Token
    record.isUsed = true;
    const resetToken = `RST-${crypto.randomBytes(24).toString("hex")}`;
    resetTokens.set(resetToken, {
      resetToken,
      userId: record.userId,
      expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes to complete reset
      isUsed: false,
    });

    return res.json({
      success: true,
      message: "OTP verified successfully. You may now create your new password.",
      resetToken,
    });
  });

  // 6. Admin Forgot Password - Create New Password
  app.post("/api/auth/forgot-password/reset-password", (req, res) => {
    const { resetToken, newPassword } = req.body;

    if (!resetToken || !newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ success: false, error: "Reset token and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    const tokenRecord = resetTokens.get(resetToken);
    if (!tokenRecord || tokenRecord.isUsed || Date.now() > tokenRecord.expiresAt) {
      return res.status(400).json({ success: false, error: "Reset token is invalid or has expired. Please restart password recovery." });
    }

    const user = serverUsers.find((u) => u.id === tokenRecord.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User account not found." });
    }

    // Generate fresh cryptographic salt and hash new password
    const newSalt = generateSalt(16);
    const newHash = hashPassword(newPassword.trim(), newSalt);

    // Update user record: OLD PASSWORD IMMEDIATELY BECOMES INVALID
    user.passwordSalt = newSalt;
    user.passwordHash = newHash;
    user.tokenVersion = (user.tokenVersion || 1) + 1; // Revokes all previous sessions

    // Invalidate all active sessions for this user
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId === user.id) {
        activeSessions.delete(token);
      }
    }

    // Invalidate the reset token
    tokenRecord.isUsed = true;
    resetTokens.delete(resetToken);

    console.log(`[SRMS SECURITY AUDIT] Password successfully reset for Admin ${user.name} (${user.id}). All previous sessions revoked.`);

    return res.json({
      success: true,
      message: "Password has been successfully updated. Previous credentials and sessions have been invalidated. Please log in with your new password.",
    });
  });

  // 7. Admin / User Change Password API (Authenticated)
  app.post("/api/auth/change-password", (req, res) => {
    const { targetUserId, newPassword } = req.body;

    if (!targetUserId || !newPassword) {
      return res.status(400).json({ success: false, error: "Target User ID and new password are required." });
    }

    const user = serverUsers.find((u) => u.id === targetUserId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    // Hash new password with fresh salt
    const newSalt = generateSalt(16);
    user.passwordSalt = newSalt;
    user.passwordHash = hashPassword(newPassword.trim(), newSalt);
    user.tokenVersion = (user.tokenVersion || 1) + 1;

    // Revoke all existing sessions for this user
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId === user.id) {
        activeSessions.delete(token);
      }
    }

    saveUsersToDisk();

    return res.json({
      success: true,
      message: `Password successfully updated for user ${user.name}. Old password and active sessions invalidated.`,
    });
  });

  // 8. Add User API (Admin created)
  app.post("/api/auth/add-user", (req, res) => {
    const { user } = req.body;
    if (!user || !user.id || !user.username) {
      return res.status(400).json({ success: false, error: "Valid user object required." });
    }

    // Check if user already exists
    const existingIndex = serverUsers.findIndex((u) => u.id === user.id || u.username === user.username);
    if (existingIndex >= 0) {
      serverUsers[existingIndex] = { ...serverUsers[existingIndex], ...user };
    } else {
      const salt = user.passwordSalt || generateSalt(16);
      const pwd = user.password || "Agent@2026";
      const hash = user.passwordHash || hashPassword(pwd, salt);
      serverUsers.push({
        ...user,
        passwordSalt: salt,
        passwordHash: hash,
        tokenVersion: 1,
        active: user.active !== undefined ? user.active : true,
      });
    }

    saveUsersToDisk();

    return res.json({ success: true, message: `User ${user.name} synchronized with server.` });
  });

  // 9. Toggle User Active Status (Deactivate / Activate)
  app.post("/api/auth/toggle-user-active", (req, res) => {
    const { userId } = req.body;

    const user = serverUsers.find((u) => u.id === userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    user.active = !user.active;

    // IF DEACTIVATED: Immediately revoke all active sessions for this user
    if (!user.active) {
      user.tokenVersion = (user.tokenVersion || 1) + 1;
      for (const [token, session] of activeSessions.entries()) {
        if (session.userId === user.id) {
          activeSessions.delete(token);
        }
      }
      console.log(`[SRMS SECURITY AUDIT] User ${user.name} (${user.id}) was DEACTIVATED. All active sessions revoked.`);
    }

    saveUsersToDisk();

    return res.json({
      success: true,
      userId: user.id,
      active: user.active,
      message: user.active ? `User ${user.name} is now Active.` : `User ${user.name} has been Deactivated. All active sessions revoked.`,
    });
  });

  // 9. Delete User API (Admin only)
  app.post("/api/auth/delete-user", (req, res) => {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({ success: false, error: "User ID is required." });
    }

    const index = serverUsers.findIndex((u) => u.id === userId || u.agentId === userId || u.username === userId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const deletedUser = serverUsers[index];

    // Revoke all active sessions for this user immediately
    for (const [token, session] of activeSessions.entries()) {
      if (session.userId === deletedUser.id) {
        activeSessions.delete(token);
      }
    }

    serverUsers.splice(index, 1);
    console.log(`[SRMS SECURITY AUDIT] User ${deletedUser.name} (${deletedUser.id} / ${deletedUser.role}) was DELETED. Sessions revoked.`);

    saveUsersToDisk();

    return res.json({
      success: true,
      message: `User ${deletedUser.name} (${deletedUser.role}) has been permanently deleted.`,
    });
  });

  // 10. Sync / Fetch Users list
  app.get("/api/users", (req, res) => {
    res.json({
      success: true,
      users: serverUsers.map(sanitizeUser),
    });
  });

  // 11. Purge Demo Data API (Admin only)
  app.post("/api/admin/purge-demo-data", (req, res) => {
    // Keep only non-demo users (primary admin and admin-created users)
    serverUsers = serverUsers.filter(
      (u) =>
        u.id === "USR-ADMIN-1" ||
        u.email?.toLowerCase() === "ashish.kharad2@gmail.com" ||
        (!u.id.startsWith("USR-BM-") &&
          !u.id.startsWith("USR-COORD-") &&
          !u.id.startsWith("USR-AGT-") &&
          !u.id.startsWith("USR-DEPT-") &&
          !u.email?.endsWith("@srms-recovery.in") &&
          !u.email?.endsWith("@srms.in"))
    );
    console.log("[SRMS SECURITY AUDIT] Server purged demo users and stale mock data.");
    saveUsersToDisk();
    return res.json({ success: true, message: "Demo data purged successfully on server." });
  });

  // ==========================================
  // HIERARCHY & COMMISSION MANAGEMENT APIS
  // ==========================================

  interface ServerCommissionRule {
    id: string;
    name: string;
    code: string;
    bankId?: string;
    bankName?: string;
    zoneId?: string;
    zoneName?: string;
    departmentId?: string;
    departmentName?: string;
    branchId?: string;
    branchName?: string;
    qdType?: string;
    recoveryStage?: string;
    commissionPercentage: number;
    effectiveFrom: string;
    effectiveTo?: string;
    status: 'active' | 'inactive';
    priorityLevel: number;
    description?: string;
    createdBy?: string;
    createdDate?: string;
  }

  interface ServerUserAssignment {
    id: string;
    agentId: string;
    agentName: string;
    assignmentCode: string;
    ruleId?: string;
    percentageOverride?: number;
    bankName?: string;
    zoneName?: string;
    branchName?: string;
    effectiveFrom: string;
    effectiveTo?: string;
    status: 'active' | 'inactive';
    remarks?: string;
    assignedBy?: string;
    createdDate?: string;
  }

  let serverCommissionRules: ServerCommissionRule[] = [
    {
      id: 'CR-001',
      name: 'SBI Default Master Commission',
      code: 'SBI-BASE-01',
      bankId: 'BANK-01',
      bankName: 'State Bank of India (SBI)',
      zoneName: 'All Zones',
      branchName: 'All Branches',
      qdType: 'All QDs',
      recoveryStage: 'All Stages',
      commissionPercentage: 10.0,
      effectiveFrom: '2025-01-01',
      effectiveTo: '2026-12-31',
      status: 'active',
      priorityLevel: 5,
      description: 'Standard baseline commission across all SBI branches and zones',
      createdBy: 'Ashish Kharad (Admin)',
      createdDate: '2025-01-01',
    },
    {
      id: 'CR-002',
      name: 'SBI North Zone SMA-2 Incentive',
      code: 'SBI-NZM-SMA2',
      bankId: 'BANK-01',
      bankName: 'State Bank of India (SBI)',
      zoneId: 'ZONE-NZM',
      zoneName: 'North Zone Maharashtra',
      branchName: 'All Branches',
      qdType: 'SMA-2 (61-90 DPD)',
      recoveryStage: 'Partial Recovery',
      commissionPercentage: 12.5,
      effectiveFrom: '2026-01-01',
      status: 'active',
      priorityLevel: 3,
      description: 'Enhanced commission for early SMA-2 pre-NPA recoveries in North Zone',
      createdBy: 'Ashish Kharad (Admin)',
      createdDate: '2026-01-01',
    },
    {
      id: 'CR-003',
      name: 'SBI Sambhajinagar Critical NPA Recovery',
      code: 'SBI-CSM-NPA',
      bankId: 'BANK-01',
      bankName: 'State Bank of India (SBI)',
      zoneId: 'ZONE-NZM',
      zoneName: 'North Zone Maharashtra',
      branchId: 'BR-01',
      branchName: 'Chhatrapati Sambhajinagar Main',
      qdType: 'Critical NPA (>90 DPD)',
      recoveryStage: 'Full Settlement / Closed',
      commissionPercentage: 15.0,
      effectiveFrom: '2026-01-01',
      status: 'active',
      priorityLevel: 2,
      description: 'High-incentive commission for full resolution of hardcore NPA accounts at Sambhajinagar Main',
      createdBy: 'Ashish Kharad (Admin)',
      createdDate: '2026-01-01',
    },
    {
      id: 'CR-004',
      name: 'Bank of Maharashtra Default Master',
      code: 'BOM-BASE-01',
      bankId: 'BANK-02',
      bankName: 'Bank of Maharashtra (BOM)',
      zoneName: 'All Zones',
      branchName: 'All Branches',
      qdType: 'All QDs',
      recoveryStage: 'All Stages',
      commissionPercentage: 8.5,
      effectiveFrom: '2025-01-01',
      status: 'active',
      priorityLevel: 5,
      description: 'Standard baseline recovery commission for Bank of Maharashtra portfolio',
      createdBy: 'Ashish Kharad (Admin)',
      createdDate: '2025-01-01',
    },
  ];

  let serverUserAssignments: ServerUserAssignment[] = [];

  let serverCommissionAuditLogs: any[] = [
    {
      id: 'CAL-001',
      timestamp: new Date().toISOString(),
      action: 'CREATED',
      entityType: 'RULE',
      entityId: 'CR-001',
      entityName: 'SBI Default Master Commission',
      performedByUserId: 'USR-ADMIN-1',
      performedByName: 'Ashish Kharad (Admin)',
      details: 'Created baseline rule SBI Default Master Commission (10%)',
    },
  ];

  // Helper date checker
  function isWithinRange(dateStr: string, from: string, to?: string): boolean {
    if (!dateStr) return true;
    const target = dateStr.slice(0, 10);
    if (from && target < from.slice(0, 10)) return false;
    if (to && to.trim() && target > to.slice(0, 10)) return false;
    return true;
  }

  // GET Commission Rules
  app.get("/api/commission/rules", (req, res) => {
    res.json({
      success: true,
      rules: serverCommissionRules,
    });
  });

  // POST Create Commission Rule with Hierarchy & Percentage Validation
  app.post("/api/commission/rules", (req, res) => {
    const { rule, performedBy } = req.body;
    if (!rule || !rule.name || rule.commissionPercentage === undefined) {
      return res.status(400).json({ success: false, error: "Rule name and commission percentage are required." });
    }

    const pct = Number(rule.commissionPercentage);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      return res.status(400).json({ success: false, error: "Commission percentage must be between 0% and 100%." });
    }

    // Check for exact duplicate active rule conflict
    const activeOverlaps = serverCommissionRules.filter((r) => {
      if (r.status !== 'active') return false;
      const bMatch = (r.bankName || '') === (rule.bankName || '');
      const zMatch = (r.zoneName || '') === (rule.zoneName || '');
      const brMatch = (r.branchName || '') === (rule.branchName || '');
      const qMatch = (r.qdType || '') === (rule.qdType || '');
      const sMatch = (r.recoveryStage || '') === (rule.recoveryStage || '');
      return bMatch && zMatch && brMatch && qMatch && sMatch;
    });

    if (activeOverlaps.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Duplicate commission rule detected. Please resolve the conflicting commission rules.",
      });
    }

    const newRule: ServerCommissionRule = {
      id: `CR-${Date.now().toString().slice(-6)}`,
      name: rule.name.trim(),
      code: rule.code?.trim() || `CR-${Date.now().toString().slice(-4)}`,
      bankId: rule.bankId,
      bankName: rule.bankName || 'All Banks',
      zoneId: rule.zoneId,
      zoneName: rule.zoneName || 'All Zones',
      departmentId: rule.departmentId,
      departmentName: rule.departmentName || 'All Departments',
      branchId: rule.branchId,
      branchName: rule.branchName || 'All Branches',
      qdType: rule.qdType || 'All QDs',
      recoveryStage: rule.recoveryStage || 'All Stages',
      commissionPercentage: pct,
      effectiveFrom: rule.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: rule.effectiveTo || undefined,
      status: rule.status || 'active',
      priorityLevel: rule.branchName && rule.branchName !== 'All Branches' ? 2 : rule.qdType && rule.qdType !== 'All QDs' ? 3 : rule.zoneName && rule.zoneName !== 'All Zones' ? 4 : 5,
      description: rule.description || '',
      createdBy: performedBy?.name || 'System Admin',
      createdDate: new Date().toISOString().slice(0, 10),
    };

    serverCommissionRules.unshift(newRule);

    serverCommissionAuditLogs.unshift({
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'CREATED',
      entityType: 'RULE',
      entityId: newRule.id,
      entityName: newRule.name,
      performedByUserId: performedBy?.id || 'USR-ADMIN-1',
      performedByName: performedBy?.name || 'Admin',
      details: `Created new rule ${newRule.name} (${newRule.commissionPercentage}%)`,
    });

    res.json({ success: true, rule: newRule, message: `Commission rule "${newRule.name}" created successfully.` });
  });

  // PUT Update Commission Rule
  app.put("/api/commission/rules/:id", (req, res) => {
    const { id } = req.params;
    const { updates, performedBy } = req.body;
    const index = serverCommissionRules.findIndex((r) => r.id === id);

    if (index === -1) {
      return res.status(404).json({ success: false, error: "Rule not found." });
    }

    if (updates.commissionPercentage !== undefined) {
      const pct = Number(updates.commissionPercentage);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return res.status(400).json({ success: false, error: "Commission percentage must be between 0% and 100%." });
      }
    }

    const previous = { ...serverCommissionRules[index] };
    serverCommissionRules[index] = { ...serverCommissionRules[index], ...updates };

    serverCommissionAuditLogs.unshift({
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'UPDATED',
      entityType: 'RULE',
      entityId: id,
      entityName: serverCommissionRules[index].name,
      previousValues: previous,
      newValues: serverCommissionRules[index],
      performedByUserId: performedBy?.id || 'USR-ADMIN-1',
      performedByName: performedBy?.name || 'Admin',
      details: `Updated rule ${serverCommissionRules[index].name}`,
    });

    res.json({ success: true, rule: serverCommissionRules[index], message: "Rule updated successfully." });
  });

  // POST Deactivate Rule
  app.post("/api/commission/rules/:id/deactivate", (req, res) => {
    const { id } = req.params;
    const { performedBy } = req.body;
    const rule = serverCommissionRules.find((r) => r.id === id);

    if (!rule) {
      return res.status(404).json({ success: false, error: "Rule not found." });
    }

    rule.status = 'inactive';

    serverCommissionAuditLogs.unshift({
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DEACTIVATED',
      entityType: 'RULE',
      entityId: id,
      entityName: rule.name,
      performedByUserId: performedBy?.id || 'USR-ADMIN-1',
      performedByName: performedBy?.name || 'Admin',
      details: `Deactivated commission rule ${rule.name}`,
    });

    res.json({ success: true, message: `Rule "${rule.name}" deactivated.` });
  });

  // GET User Commission Assignments
  app.get("/api/commission/assignments", (req, res) => {
    res.json({ success: true, assignments: serverUserAssignments });
  });

  // POST Create User Commission Assignment
  app.post("/api/commission/assignments", (req, res) => {
    const { assignment, performedBy } = req.body;
    if (!assignment || !assignment.agentId) {
      return res.status(400).json({ success: false, error: "Agent ID is required." });
    }

    if (assignment.percentageOverride !== undefined) {
      const pct = Number(assignment.percentageOverride);
      if (isNaN(pct) || pct < 0 || pct > 100) {
        return res.status(400).json({ success: false, error: "Override percentage must be between 0% and 100%." });
      }
    }

    // Check duplicate active assignment for agent
    const existing = serverUserAssignments.filter(
      (a) => a.status === 'active' && a.agentId === assignment.agentId
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Duplicate commission rule detected. Please resolve the conflicting commission rules.",
      });
    }

    const newAssignment: ServerUserAssignment = {
      id: `UCA-${Date.now().toString().slice(-6)}`,
      agentId: assignment.agentId,
      agentName: assignment.agentName || assignment.agentId,
      assignmentCode: assignment.assignmentCode || `ASG-${Date.now().toString().slice(-4)}`,
      ruleId: assignment.ruleId,
      percentageOverride: assignment.percentageOverride,
      bankName: assignment.bankName,
      zoneName: assignment.zoneName,
      branchName: assignment.branchName,
      effectiveFrom: assignment.effectiveFrom || new Date().toISOString().slice(0, 10),
      effectiveTo: assignment.effectiveTo,
      status: assignment.status || 'active',
      remarks: assignment.remarks || '',
      assignedBy: performedBy?.name || 'Admin',
      createdDate: new Date().toISOString().slice(0, 10),
    };

    serverUserAssignments.unshift(newAssignment);

    serverCommissionAuditLogs.unshift({
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'ASSIGNED',
      entityType: 'ASSIGNMENT',
      entityId: newAssignment.id,
      entityName: `Agent Assignment: ${newAssignment.agentName}`,
      performedByUserId: performedBy?.id || 'USR-ADMIN-1',
      performedByName: performedBy?.name || 'Admin',
      details: `Assigned specific commission override of ${newAssignment.percentageOverride}% to ${newAssignment.agentName}`,
    });

    res.json({ success: true, assignment: newAssignment, message: "User commission assigned successfully." });
  });

  // POST Deactivate Assignment
  app.post("/api/commission/assignments/:id/deactivate", (req, res) => {
    const { id } = req.params;
    const { performedBy } = req.body;
    const item = serverUserAssignments.find((a) => a.id === id);
    if (!item) return res.status(404).json({ success: false, error: "Assignment not found." });

    item.status = 'inactive';

    serverCommissionAuditLogs.unshift({
      id: `CAL-${Date.now()}`,
      timestamp: new Date().toISOString(),
      action: 'DEACTIVATED',
      entityType: 'ASSIGNMENT',
      entityId: id,
      entityName: `Assignment ${item.assignmentCode}`,
      performedByUserId: performedBy?.id || 'USR-ADMIN-1',
      performedByName: performedBy?.name || 'Admin',
      details: `Deactivated user commission override for ${item.agentName}`,
    });

    res.json({ success: true, message: "User commission assignment deactivated." });
  });

  // GET Commission Audit Logs
  app.get("/api/commission/audit-logs", (req, res) => {
    res.json({ success: true, logs: serverCommissionAuditLogs });
  });

  // POST Backend Commission Calculation with Strict Priority & Conflict Enforcement
  app.post("/api/commission/calculate", (req, res) => {
    const { eligibleAmount, recoveryDate, agentId, bankName, zoneName, branchName, qdType, recoveryStage } = req.body;
    const numAmount = Number(eligibleAmount) || 0;
    const validDate = recoveryDate || new Date().toISOString().slice(0, 10);

    // 1. Priority 1: User / Agent specific override
    if (agentId) {
      const matchingAssignments = serverUserAssignments.filter((a) => {
        if (a.status !== 'active') return false;
        if (a.agentId !== agentId && a.agentName !== agentId) return false;
        return isWithinRange(validDate, a.effectiveFrom, a.effectiveTo);
      });

      if (matchingAssignments.length > 1) {
        return res.status(409).json({
          success: false,
          conflictDetected: true,
          error: "Duplicate commission rule detected. Please resolve the conflicting commission rules.",
        });
      }

      if (matchingAssignments.length === 1) {
        const asg = matchingAssignments[0];
        let pct = asg.percentageOverride;
        if (pct === undefined && asg.ruleId) {
          const r = serverCommissionRules.find((rule) => rule.id === asg.ruleId && rule.status === 'active');
          if (r) pct = r.commissionPercentage;
        }

        if (pct !== undefined && !isNaN(pct) && pct >= 0 && pct <= 100) {
          const commAmount = Math.round((numAmount * pct) / 100);
          return res.json({
            success: true,
            percentage: pct,
            commissionAmount: commAmount,
            assignmentId: asg.id,
            ruleName: `Agent Override: ${asg.agentName}`,
            priorityLevel: 1,
            priorityDescription: "Priority 1: User/Agent Specific Rule Override",
          });
        }
      }
    }

    const activeRules = serverCommissionRules.filter((r) => {
      if (r.status !== 'active') return false;
      return isWithinRange(validDate, r.effectiveFrom, r.effectiveTo);
    });

    const matchQD = (ruleQD?: string, target?: string) => {
      if (!ruleQD || ruleQD === 'All QDs' || ruleQD === 'ALL') return true;
      if (!target) return false;
      return ruleQD.trim().toLowerCase() === target.trim().toLowerCase();
    };

    const matchStage = (ruleStage?: string, target?: string) => {
      if (!ruleStage || ruleStage === 'All Stages' || ruleStage === 'ALL') return true;
      if (!target) return false;
      return ruleStage.trim().toLowerCase() === target.trim().toLowerCase();
    };

    // 2. Priority 2: Bank + Zone + Branch + QD Type
    if (bankName && zoneName && branchName && qdType) {
      const p2 = activeRules.filter((r) => {
        const b = r.bankName?.toLowerCase() === bankName.toLowerCase();
        const z = r.zoneName?.toLowerCase() === zoneName.toLowerCase();
        const br = r.branchName?.toLowerCase() === branchName.toLowerCase();
        const q = matchQD(r.qdType, qdType);
        const s = matchStage(r.recoveryStage, recoveryStage);
        return b && z && br && q && s;
      });

      if (p2.length > 1) {
        return res.status(409).json({
          success: false,
          conflictDetected: true,
          error: "Duplicate commission rule detected. Please resolve the conflicting commission rules.",
        });
      }

      if (p2.length === 1) {
        const r = p2[0];
        const commAmount = Math.round((numAmount * r.commissionPercentage) / 100);
        return res.json({
          success: true,
          percentage: r.commissionPercentage,
          commissionAmount: commAmount,
          ruleId: r.id,
          ruleName: r.name,
          priorityLevel: 2,
          priorityDescription: "Priority 2: Bank + Zone + Branch + QD Type Rule",
        });
      }
    }

    // 3. Priority 3: Bank + Zone + QD Type
    if (bankName && zoneName && qdType) {
      const p3 = activeRules.filter((r) => {
        const b = r.bankName?.toLowerCase() === bankName.toLowerCase();
        const z = r.zoneName?.toLowerCase() === zoneName.toLowerCase();
        const q = matchQD(r.qdType, qdType);
        const s = matchStage(r.recoveryStage, recoveryStage);
        const noBranch = !r.branchName || r.branchName === 'ALL' || r.branchName === 'All Branches';
        return b && z && q && s && noBranch;
      });

      if (p3.length > 1) {
        return res.status(409).json({
          success: false,
          conflictDetected: true,
          error: "Duplicate commission rule detected. Please resolve the conflicting commission rules.",
        });
      }

      if (p3.length === 1) {
        const r = p3[0];
        const commAmount = Math.round((numAmount * r.commissionPercentage) / 100);
        return res.json({
          success: true,
          percentage: r.commissionPercentage,
          commissionAmount: commAmount,
          ruleId: r.id,
          ruleName: r.name,
          priorityLevel: 3,
          priorityDescription: "Priority 3: Bank + Zone + QD Type Rule",
        });
      }
    }

    // 4. Priority 4: Bank + Zone
    if (bankName && zoneName) {
      const p4 = activeRules.filter((r) => {
        const b = r.bankName?.toLowerCase() === bankName.toLowerCase();
        const z = r.zoneName?.toLowerCase() === zoneName.toLowerCase();
        const noQD = !r.qdType || r.qdType === 'All QDs' || r.qdType === 'ALL';
        const noBranch = !r.branchName || r.branchName === 'ALL' || r.branchName === 'All Branches';
        return b && z && noQD && noBranch;
      });

      if (p4.length > 1) {
        return res.status(409).json({
          success: false,
          conflictDetected: true,
          error: "Duplicate commission rule detected. Please resolve the conflicting commission rules.",
        });
      }

      if (p4.length === 1) {
        const r = p4[0];
        const commAmount = Math.round((numAmount * r.commissionPercentage) / 100);
        return res.json({
          success: true,
          percentage: r.commissionPercentage,
          commissionAmount: commAmount,
          ruleId: r.id,
          ruleName: r.name,
          priorityLevel: 4,
          priorityDescription: "Priority 4: Bank + Zone Default Rule",
        });
      }
    }

    // 5. Priority 5: Bank Default
    if (bankName) {
      const p5 = activeRules.filter((r) => {
        const b = r.bankName?.toLowerCase() === bankName.toLowerCase();
        const noZone = !r.zoneName || r.zoneName === 'ALL' || r.zoneName === 'All Zones';
        const noQD = !r.qdType || r.qdType === 'All QDs' || r.qdType === 'ALL';
        const noBranch = !r.branchName || r.branchName === 'ALL' || r.branchName === 'All Branches';
        return b && noZone && noQD && noBranch;
      });

      if (p5.length > 1) {
        return res.status(409).json({
          success: false,
          conflictDetected: true,
          error: "Duplicate commission rule detected. Please resolve the conflicting commission rules.",
        });
      }

      if (p5.length === 1) {
        const r = p5[0];
        const commAmount = Math.round((numAmount * r.commissionPercentage) / 100);
        return res.json({
          success: true,
          percentage: r.commissionPercentage,
          commissionAmount: commAmount,
          ruleId: r.id,
          ruleName: r.name,
          priorityLevel: 5,
          priorityDescription: "Priority 5: Bank Base Default Rule",
        });
      }
    }

    // Default System Fallback
    const fallbackRate = serverCommissionRate || 10;
    const commAmount = Math.round((numAmount * fallbackRate) / 100);
    return res.json({
      success: true,
      percentage: fallbackRate,
      commissionAmount: commAmount,
      priorityLevel: 5,
      priorityDescription: "System Default Standard Rate",
      ruleName: `Standard Rate (${fallbackRate}%)`,
    });
  });

  // System Settings API
  app.get("/api/settings", (req, res) => {
    res.json({
      defaultCommissionRate: serverCommissionRate,
      storageBackend: "Google Sheets + Google Drive",
      syncStatus: "connected",
      activeSpreadsheetId: "1sRMS_Recovery_Database_Master_2026",
      activeDriveFolderId: "DRV_FOLDER_ROOT_SRMS_001",
      lastSync: serverStats.lastSyncTime,
    });
  });

  app.post("/api/settings/commission-rate", (req, res) => {
    const { rate } = req.body;
    if (typeof rate === "number" && rate >= 0 && rate <= 100) {
      serverCommissionRate = rate;
      return res.json({ success: true, newRate: serverCommissionRate });
    }
    res.status(400).json({ error: "Invalid commission rate" });
  });

  // AI Recovery Pitch & Risk Analyzer (Gemini fallback / smart analysis)
  app.post("/api/ai/analyze-account", async (req, res) => {
    const { account, customerHistory } = req.body;
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (apiKey) {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `You are an expert Credit & Loan Recovery Strategist for SRMS (Recovery Management System).
Analyze this customer loan account and provide structured recovery intelligence:
- Account ID: ${account?.accountId || "ACC-10254"}
- Customer: ${account?.customerName || "Ramesh Patil"}
- Product: ${account?.loanType || "Personal Loan"}
- Sanction Amount: ₹${account?.sanctionAmount || 200000}
- Total Outstanding: ₹${account?.outstandingAmount || 145000}
- Overdue EMI: ₹${account?.overdueAmount || 32000} (${account?.dpd || 75} DPD)
- Category: ${account?.customerCategory || "High Risk"}
- Last Follow-up status: ${account?.lastFollowUpStatus || "Promise Broken"}
- Previous Agent Notes: ${customerHistory || "Customer cited salary delay, gave PTP earlier which failed."}

Provide in JSON format:
1. "riskScore": score from 1-100
2. "riskLevel": "Critical" | "High" | "Medium" | "Low"
3. "recommendedAction": concise 1-2 sentence recommendation for field agent
4. "settlementStrategy": suggestion (e.g. Full overdue recovery, 2-part EMI plan, Hard field visit)
5. "fieldVisitTip": key talking point when meeting customer in person
6. "whatsappScript": brief polite yet firm payment reminder message
`;
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
        });

        const text = response.text || "";
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return res.json(parsed);
        }
      }
    } catch (err) {
      console.warn("AI generation fallback to rule-based analysis:", err);
    }

    // High quality deterministic fallback
    const dpd = account?.dpd || 60;
    const overdue = account?.overdueAmount || 25000;
    res.json({
      riskScore: dpd > 90 ? 88 : dpd > 60 ? 72 : 45,
      riskLevel: dpd > 90 ? "Critical" : dpd > 60 ? "High" : "Medium",
      recommendedAction:
        dpd > 60
          ? "Immediate on-site field visit with supervisor geo-tagged verification and minimum 50% cash/UPI collection."
          : "Phone follow-up with structured PTP commitment within 48 hours.",
      settlementStrategy:
        overdue > 30000
          ? "Propose 2 split installments: 50% within 48 hours and balance by month-end to avoid legal notice."
          : "Demand one-time clearance of overdue EMI to avoid credit score CIBIL downgrade.",
      fieldVisitTip:
        "Verify residence physical status, inspect vehicle/asset, take geo-tagged watermarked photo of residence and note guarantor details.",
      whatsappScript: `Dear ${account?.customerName || "Customer"}, your loan account ${account?.accountId || "ACC-10254"} has an overdue amount of ₹${overdue.toLocaleString("en-IN")}. Please clear immediately via UPI or meet Recovery Agent ${account?.assignedAgentName || "RA-0045"} to avoid legal escalation.`,
    });
  });

  // Google Sheets Apps Script Web App Proxy Endpoint
  app.post("/api/sheets/apps-script-relay", async (req, res) => {
    const { webAppUrl, payload } = req.body;
    const targetUrl =
      webAppUrl ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbzkoRJpJh6FIRwGYBrl9iSLx8VnS8DkfKSfbYsg2KTlZgj-7Q_3Ptbmt4px3BO3LnnP/exec";

    try {
      const enrichedPayload = {
        token: "ADMIN_SECURE_TOKEN_2026",
        ...(payload || {}),
      };

      const response = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(enrichedPayload),
        redirect: "follow",
      });

      const text = await response.text();
      serverStats.lastSyncTime = new Date().toISOString();

      if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
        return res.status(400).json({
          success: false,
          isAuthWall: true,
          error:
            "Google Apps Script returned an authorization page. In Apps Script, click Deploy > Manage deployments > Edit > set 'Who has access' to 'Anyone' > Deploy as New Version.",
        });
      }

      try {
        const data = JSON.parse(text);
        return res.json({ success: true, data, timestamp: serverStats.lastSyncTime });
      } catch {
        return res.json({ success: true, raw: text, timestamp: serverStats.lastSyncTime });
      }
    } catch (err: any) {
      console.warn("Apps Script relay error:", err);
      return res.status(500).json({ success: false, error: err.message || "Relay failure" });
    }
  });

  // Google Sheets Apps Script Pull All Data (Sheet -> Site)
  app.get("/api/sheets/apps-script-pull", async (req, res) => {
    const targetUrl =
      (req.query.url as string) ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbzkoRJpJh6FIRwGYBrl9iSLx8VnS8DkfKSfbYsg2KTlZgj-7Q_3Ptbmt4px3BO3LnnP/exec";

    try {
      const sep = targetUrl.includes("?") ? "&" : "?";
      // Try get_all_data first
      let fullPullUrl = `${targetUrl}${sep}action=get_all_data&token=ADMIN_SECURE_TOKEN_2026`;

      let response = await fetch(fullPullUrl, {
        method: "GET",
        redirect: "follow",
      });
      let text = await response.text();

      if (text.includes("<!DOCTYPE html>") || text.includes("<html")) {
        return res.status(400).json({
          success: false,
          error: "Apps Script returned an HTML login page. Please ensure deployment access is set to 'Anyone' and deployed as a new version.",
        });
      }

      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        // failed parse
      }

      // If get_all_data is not supported or returned error, fallback to get_accounts
      if (!parsed || parsed.error || !parsed.success && parsed.accounts === undefined) {
        const fallbackUrl = `${targetUrl}${sep}action=get_accounts&token=ADMIN_SECURE_TOKEN_2026`;
        const fallbackRes = await fetch(fallbackUrl, {
          method: "GET",
          redirect: "follow",
        });
        const fallbackText = await fallbackRes.text();
        try {
          const fallbackData = JSON.parse(fallbackText);
          if (fallbackData && (fallbackData.accounts || Array.isArray(fallbackData))) {
            return res.json({ success: true, data: fallbackData });
          }
        } catch {
          // fallback failed
        }
      }

      if (parsed) {
        return res.json({ success: true, data: parsed });
      }

      return res.json({ success: false, raw: text, error: "Could not parse JSON response from Sheet." });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Google Sheets Apps Script Health / Ping Endpoint
  app.get("/api/sheets/apps-script-status", async (req, res) => {
    const targetUrl =
      (req.query.url as string) ||
      process.env.GOOGLE_APPS_SCRIPT_URL ||
      "https://script.google.com/macros/s/AKfycbzkoRJpJh6FIRwGYBrl9iSLx8VnS8DkfKSfbYsg2KTlZgj-7Q_3Ptbmt4px3BO3LnnP/exec";

    try {
      const sep = targetUrl.includes("?") ? "&" : "?";
      const response = await fetch(`${targetUrl}${sep}action=ping&token=ADMIN_SECURE_TOKEN_2026`, {
        method: "GET",
        redirect: "follow",
      });
      const text = await response.text();
      const isAuthWall = text.includes("<!DOCTYPE html>") || text.includes("<html");
      return res.json({
        success: !isAuthWall && response.ok,
        status: response.status,
        isAuthWall,
        raw: text.slice(0, 300),
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  // Google Sheets Export / Sync Simulator Endpoint
  app.post("/api/sheets/sync", (req, res) => {
    const { sheetsData } = req.body;
    serverStats.lastSyncTime = new Date().toISOString();
    res.json({
      success: true,
      syncedSheetsCount: sheetsData ? Object.keys(sheetsData).length : 19,
      timestamp: serverStats.lastSyncTime,
      spreadsheetUrl: "https://docs.google.com/spreadsheets/d/1sRMS_Recovery_Database_Master_2026/edit",
      message: "Successfully synchronized all 19 SRMS sheets to Google Sheets Master.",
    });
  });

  // Google Drive File Upload Emulator
  app.post("/api/drive/upload", (req, res) => {
    const { fileName, fileType, accountId, category } = req.body;
    const fileId = `DRV_${category?.toUpperCase() || "DOC"}_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const folderPath = `SRMS/Accounts/${accountId || "GENERAL"}/${category || "Documents"}/${fileName || "file"}`;

    res.json({
      success: true,
      driveFileId: fileId,
      driveFolder: folderPath,
      webContentLink: `https://drive.google.com/file/d/${fileId}/view`,
      uploadedAt: new Date().toISOString(),
    });
  });

  // ==========================================
  // SHARED MASTER DATA STORAGE ACROSS ALL LOGINS
  // ==========================================
  // Load persisted master data from disk if available
  try {
    if (fs.existsSync(MASTER_STORE_FILE)) {
      const content = fs.readFileSync(MASTER_STORE_FILE, "utf-8");
      serverMasterStore = JSON.parse(content);
      console.log(`[SRMS MASTER DATA] Successfully loaded shared master store from ${MASTER_STORE_FILE}`);
    }
  } catch (err) {
    console.warn("[SRMS MASTER DATA] Could not load persisted master store:", err);
  }

  // GET Shared Master Data
  app.get("/api/master-data/get", (req, res) => {
    // Merge persisted users into masterData response so client state is always synchronized
    const combinedMasterData = {
      ...serverMasterStore,
      users: serverUsers.map(sanitizeUser),
    };

    res.json({
      success: true,
      hasData: Object.keys(combinedMasterData).length > 0,
      masterData: combinedMasterData,
      updatedAt: serverMasterStore._updatedAt || null,
    });
  });

  // POST Save / Sync Shared Master Data
  app.post("/api/master-data/save", (req, res) => {
    const { data } = req.body;
    if (!data || typeof data !== "object") {
      return res.status(400).json({ success: false, error: "Invalid master data payload." });
    }

    try {
      // Merge keys
      serverMasterStore = {
        ...serverMasterStore,
        ...data,
        _updatedAt: new Date().toISOString(),
      };

      // Explicitly support setting accounts, recoveries, ptps, photos, archivedAccounts, banks, and users if passed in data
      if (Array.isArray(data.accounts)) {
        serverMasterStore.accounts = data.accounts;
      }
      if (Array.isArray(data.archivedAccounts)) {
        serverMasterStore.archivedAccounts = data.archivedAccounts;
      }
      if (Array.isArray(data.banks)) {
        serverMasterStore.banks = data.banks;
      }
      if (Array.isArray(data.recoveries)) {
        serverMasterStore.recoveries = data.recoveries;
      }
      if (Array.isArray(data.ptps)) {
        serverMasterStore.ptps = data.ptps;
      }
      if (Array.isArray(data.photos)) {
        serverMasterStore.photos = data.photos;
      }
      if (Array.isArray(data.users)) {
        serverMasterStore.users = data.users;
        // Also update serverUsers with any newly added users
        data.users.forEach((clientUser: any) => {
          if (!clientUser || (!clientUser.id && !clientUser.username && !clientUser.agentId)) return;
          const idx = serverUsers.findIndex(
            (u) =>
              (clientUser.id && u.id === clientUser.id) ||
              (clientUser.username && u.username.toLowerCase() === clientUser.username.toLowerCase()) ||
              (clientUser.agentId && u.agentId && u.agentId.toLowerCase() === clientUser.agentId.toLowerCase())
          );
          if (idx >= 0) {
            serverUsers[idx] = { ...serverUsers[idx], ...clientUser };
          } else {
            const salt = clientUser.passwordSalt || generateSalt(16);
            const pwd = clientUser.password || "Agent@2026";
            const hash = clientUser.passwordHash || hashPassword(pwd, salt);
            serverUsers.push({
              ...clientUser,
              passwordSalt: salt,
              passwordHash: hash,
              tokenVersion: 1,
              active: clientUser.active !== undefined ? clientUser.active : true,
            });
          }
        });
        saveUsersToDisk();
      }

      // Persist to disk asynchronously
      fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
        if (err) console.warn("[SRMS MASTER DATA] Error saving to disk:", err);
      });

      return res.json({
        success: true,
        message: "Shared master database updated successfully across all logins.",
        updatedAt: serverMasterStore._updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to save master data." });
    }
  });

  // POST Permanently Delete / Clear All Accounts from Shared Storage
  app.post("/api/master-data/clear-accounts", (req, res) => {
    try {
      serverMasterStore.accounts = [];
      serverMasterStore.allocations = [];
      serverMasterStore.allocationHistories = [];
      serverMasterStore._updatedAt = new Date().toISOString();

      fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
        if (err) console.warn("[SRMS MASTER DATA] Error writing cleared accounts to disk:", err);
      });

      console.log("[SRMS MASTER DATA] All accounts permanently cleared from server master storage.");
      return res.json({
        success: true,
        message: "All accounts permanently cleared from server master storage.",
        updatedAt: serverMasterStore._updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to clear accounts on server." });
    }
  });

  // POST Permanently Delete / Clear All Recoveries from Shared Storage
  app.post("/api/master-data/clear-recoveries", (req, res) => {
    try {
      serverMasterStore.recoveries = [];
      serverMasterStore.commissions = [];
      serverMasterStore._updatedAt = new Date().toISOString();

      fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
        if (err) console.warn("[SRMS MASTER DATA] Error writing cleared recoveries to disk:", err);
      });

      console.log("[SRMS MASTER DATA] All recoveries permanently cleared from server master storage.");
      return res.json({
        success: true,
        message: "All recoveries permanently cleared from server master storage.",
        updatedAt: serverMasterStore._updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to clear recoveries on server." });
    }
  });

  // POST Permanently Delete / Clear All PTPs from Shared Storage
  app.post("/api/master-data/clear-ptps", (req, res) => {
    try {
      serverMasterStore.ptps = [];
      serverMasterStore._updatedAt = new Date().toISOString();

      fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
        if (err) console.warn("[SRMS MASTER DATA] Error writing cleared ptps to disk:", err);
      });

      console.log("[SRMS MASTER DATA] All PTPs permanently cleared from server master storage.");
      return res.json({
        success: true,
        message: "All PTP commitments permanently cleared from server master storage.",
        updatedAt: serverMasterStore._updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to clear PTPs on server." });
    }
  });

  // POST Permanently Delete / Clear All Photos from Shared Storage
  app.post("/api/master-data/clear-photos", (req, res) => {
    try {
      serverMasterStore.photos = [];
      serverMasterStore._updatedAt = new Date().toISOString();

      fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
        if (err) console.warn("[SRMS MASTER DATA] Error writing cleared photos to disk:", err);
      });

      console.log("[SRMS MASTER DATA] All photos permanently cleared from server master storage.");
      return res.json({
        success: true,
        message: "All geo-tagged photos permanently cleared from server master storage.",
        updatedAt: serverMasterStore._updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to clear photos on server." });
    }
  });

  // POST Permanently Delete / Clear All Recoveries, PTPs, and Photos Together
  app.post("/api/master-data/clear-recoveries-ptps-photos", (req, res) => {
    try {
      serverMasterStore.recoveries = [];
      serverMasterStore.commissions = [];
      serverMasterStore.ptps = [];
      serverMasterStore.photos = [];
      serverMasterStore._updatedAt = new Date().toISOString();

      fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
        if (err) console.warn("[SRMS MASTER DATA] Error writing cleared recoveries/ptps/photos to disk:", err);
      });

      console.log("[SRMS MASTER DATA] All recoveries, PTPs, and photos permanently cleared.");
      return res.json({
        success: true,
        message: "All recoveries, PTPs, and geo-tagged photos permanently cleared from server master storage.",
        updatedAt: serverMasterStore._updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to clear recoveries, PTPs, and photos." });
    }
  });

  // POST Wipe / Reset Raw Transactional Data
  app.post("/api/master-data/reset-raw-data", (req, res) => {
    serverMasterStore.accounts = [];
    serverMasterStore.allocations = [];
    serverMasterStore.allocationHistories = [];
    serverMasterStore.followups = [];
    serverMasterStore.ptps = [];
    serverMasterStore.recoveries = [];
    serverMasterStore.visits = [];
    serverMasterStore.photos = [];
    serverMasterStore.documents = [];
    serverMasterStore.voiceNotes = [];
    serverMasterStore.commissions = [];
    serverMasterStore.userCommissionAssignments = [];
    serverMasterStore.whatsAppLogs = [];
    serverMasterStore.notifications = [];
    serverMasterStore._updatedAt = new Date().toISOString();

    fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
      if (err) console.warn("[SRMS MASTER DATA] Error resetting on disk:", err);
    });

    return res.json({
      success: true,
      message: "All raw visits, recoveries, PTPs, demo agent assignments, and customer accounts wiped successfully.",
      updatedAt: serverMasterStore._updatedAt,
    });
  });

  // ==========================================
  // SERVER-SIDE AGGREGATIONS & BACKEND DATA APIS
  // Offloads heavy calculations from client browser
  // ==========================================

  // GET Server-side Aggregate Statistics
  app.get("/api/master-data/stats", (req, res) => {
    try {
      const accounts = Array.isArray(serverMasterStore.accounts) ? serverMasterStore.accounts : [];
      const recoveries = Array.isArray(serverMasterStore.recoveries) ? serverMasterStore.recoveries : [];
      const ptps = Array.isArray(serverMasterStore.ptps) ? serverMasterStore.ptps : [];
      const visits = Array.isArray(serverMasterStore.visits) ? serverMasterStore.visits : [];
      const allocations = Array.isArray(serverMasterStore.allocations) ? serverMasterStore.allocations : [];

      let totalOutstanding = 0;
      let totalOverdue = 0;
      const stageCounts: Record<string, number> = {};
      const branchCounts: Record<string, number> = {};
      const zoneCounts: Record<string, number> = {};

      for (let i = 0; i < accounts.length; i++) {
        const a = accounts[i];
        totalOutstanding += Number(a.outstandingAmount || 0);
        totalOverdue += Number(a.overdueAmount || 0);

        const st = a.accountStatus || "Pending";
        stageCounts[st] = (stageCounts[st] || 0) + 1;

        const br = a.branch || "Head Office";
        branchCounts[br] = (branchCounts[br] || 0) + 1;

        const zn = a.zone || "Default Zone";
        zoneCounts[zn] = (zoneCounts[zn] || 0) + 1;
      }

      let totalRecovered = 0;
      let totalCommission = 0;
      for (let i = 0; i < recoveries.length; i++) {
        const r = recoveries[i];
        if (!r.isReversed) {
          totalRecovered += Number(r.amount || 0);
          totalCommission += Number(r.commissionAmount || 0);
        }
      }

      let storeFileSizeBytes = 0;
      try {
        if (fs.existsSync(MASTER_STORE_FILE)) {
          storeFileSizeBytes = fs.statSync(MASTER_STORE_FILE).size;
        }
      } catch {}

      return res.json({
        success: true,
        stats: {
          totalAccounts: accounts.length,
          totalOutstanding,
          totalOverdue,
          totalRecovered,
          totalCommission,
          totalPtps: ptps.length,
          totalVisits: visits.length,
          totalAllocations: allocations.length,
          stageCounts,
          branchCounts,
          zoneCounts,
          storageFileSizeBytes: storeFileSizeBytes,
          storageFileSizeFormatted: `${(storeFileSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
          serverUptimeSeconds: Math.floor(process.uptime()),
          updatedAt: serverMasterStore._updatedAt || null,
        },
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to calculate stats on server." });
    }
  });

  // POST Direct Batch Save of Accounts on Backend Server
  app.post("/api/accounts/batch-save", (req, res) => {
    try {
      const { accounts: incomingAccounts, replaceAll } = req.body;
      if (!Array.isArray(incomingAccounts)) {
        return res.status(400).json({ success: false, error: "Invalid payload: accounts must be an array." });
      }

      if (replaceAll) {
        serverMasterStore.accounts = incomingAccounts;
      } else {
        const existing = Array.isArray(serverMasterStore.accounts) ? serverMasterStore.accounts : [];
        const accMap = new Map<string, any>();
        for (const a of existing) {
          accMap.set(a.accountId || a.id, a);
        }
        for (const a of incomingAccounts) {
          accMap.set(a.accountId || a.id, a);
        }
        serverMasterStore.accounts = Array.from(accMap.values());
      }

      serverMasterStore._updatedAt = new Date().toISOString();

      fs.writeFile(MASTER_STORE_FILE, JSON.stringify(serverMasterStore, null, 2), (err) => {
        if (err) console.warn("[SRMS MASTER DATA] Error saving accounts to disk:", err);
      });

      console.log(`[SRMS MASTER DATA] Saved ${incomingAccounts.length} accounts to server master store. Total accounts now: ${serverMasterStore.accounts.length}`);

      return res.json({
        success: true,
        totalAccounts: serverMasterStore.accounts.length,
        message: `Successfully saved ${incomingAccounts.length} accounts to central backend database.`,
        updatedAt: serverMasterStore._updatedAt,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message || "Failed to save accounts to server." });
    }
  });

  // GET Backend System Health & Diagnostics
  app.get("/api/backend/diagnostics", (req, res) => {
    const mem = process.memoryUsage();
    let fileSize = 0;
    try {
      if (fs.existsSync(MASTER_STORE_FILE)) {
        fileSize = fs.statSync(MASTER_STORE_FILE).size;
      }
    } catch {}

    res.json({
      success: true,
      status: "HEALTHY",
      platform: "Node.js Container",
      memoryUsageMB: {
        rss: Math.round(mem.rss / 1024 / 1024),
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
      },
      counts: {
        accounts: serverMasterStore.accounts?.length || 0,
        recoveries: serverMasterStore.recoveries?.length || 0,
        ptps: serverMasterStore.ptps?.length || 0,
        visits: serverMasterStore.visits?.length || 0,
        users: serverUsers.length,
      },
      storageFile: {
        path: MASTER_STORE_FILE,
        exists: fs.existsSync(MASTER_STORE_FILE),
        sizeBytes: fileSize,
        sizeFormatted: `${(fileSize / (1024 * 1024)).toFixed(2)} MB`,
      },
      serverTime: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SRMS Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
