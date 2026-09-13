// Secure server-side login endpoint (runs on Netlify, not in the browser).
// Verifies the user's password against Firestore and issues a REAL Firebase
// auth token, so the browser can no longer read data before a real login.
import crypto from 'crypto';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

function hashPassword(password, salt) {
  const combined = `${salt}:${password}:${salt}`;
  return crypto.createHash('sha256').update(combined).digest('hex');
}

export default async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), { status: 405 });
    }

    const { identifier, password, deviceMode } = await req.json();

    if (!identifier || typeof identifier !== 'string' || !password || typeof password !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'Please enter both User ID and Password.', code: 'MISSING_FIELDS' }),
        { status: 400 }
      );
    }

    const cleanId = identifier.trim();
    const cleanPassword = password.trim();
    const lower = cleanId.toLowerCase();
    const upper = cleanId.toUpperCase().replace(/\s+/g, '');

    const snap = await db.collection('users').get();
    const user = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .find((u) => {
        const matchUsername = u.username && (u.username.toLowerCase() === lower || u.username.toUpperCase() === upper);
        const matchId = u.id && (u.id.toLowerCase() === lower || u.id.toUpperCase() === upper);
        const matchEmail = u.email && u.email.toLowerCase() === lower;
        const matchAgentId =
          u.agentId &&
          (u.agentId.toLowerCase() === lower ||
            u.agentId.toUpperCase() === upper ||
            u.agentId.replace(/-/g, '').toLowerCase() === lower.replace(/-/g, ''));
        return matchUsername || matchId || matchEmail || matchAgentId;
      });

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid User ID or Password. User account has not been created by Admin.',
          code: 'USER_NOT_CREATED_BY_ADMIN',
        }),
        { status: 401 }
      );
    }

    if (user.active === false) {
      return new Response(
        JSON.stringify({ success: false, error: 'Your account is currently deactivated. Please contact the administrator.', code: 'ACCOUNT_DEACTIVATED' }),
        { status: 403 }
      );
    }

    if (!user.passwordHash || !user.passwordSalt) {
      return new Response(
        JSON.stringify({ success: false, error: 'This account has no password set. Contact the administrator.', code: 'NO_PASSWORD_SET' }),
        { status: 401 }
      );
    }

    const computedHash = hashPassword(cleanPassword, user.passwordSalt);

    // NOTE: the old "Admin@2026 always works" backdoor has been removed on purpose.
    // Only the real, currently-set password is accepted now.
    if (computedHash !== user.passwordHash) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid User ID or Password.', code: 'INVALID_CREDENTIALS' }),
        { status: 401 }
      );
    }

    // Mint a REAL Firebase auth token tied to this exact user id.
    const customToken = await admin.auth().createCustomToken(user.id, { role: user.role });

    const { passwordHash, passwordSalt, ...safeUser } = user;

    return new Response(
      JSON.stringify({
        success: true,
        customToken,
        user: safeUser,
        deviceMode: deviceMode || (user.role === 'agent' ? 'android' : 'web'),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('[auth-login] error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Server error during authentication.' }), { status: 500 });
  }
};

export const config = { path: '/api/auth/login' };
