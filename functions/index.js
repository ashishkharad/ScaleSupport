const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const crypto = require('crypto');

if (!admin.apps.length) admin.initializeApp();
const db = admin.firestore();

function hashPassword(password, salt) {
  return crypto.createHash('sha256').update(`${salt}:${password}:${salt}`).digest('hex');
}

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function matches(user, identifier) {
  const input = normalize(identifier);
  const compact = input.replace(/\s+/g, '');
  const candidates = [user.id, user.username, user.email, user.agentId]
    .filter(Boolean)
    .map(normalize);
  return candidates.some((v) => v === input || v.replace(/-/g, '') === compact.replace(/-/g, ''));
}

exports.authLogin = onRequest({ region: 'us-central1', cors: true }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed.' });

  try {
    const identifier = String(req.body?.identifier || '').trim();
    const password = String(req.body?.password || '').trim();
    const deviceMode = req.body?.deviceMode;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Please enter both User ID and Password.', code: 'MISSING_FIELDS' });
    }

    const snap = await db.collection('users').get();
    let user = null;
    snap.forEach((doc) => {
      if (!user && matches({ id: doc.id, ...doc.data() }, identifier)) user = { id: doc.id, ...doc.data() };
    });

    // Bootstrap the primary administrator into Firestore on the first login.
    if (!user && normalize(identifier) === 'admin' && (password === 'Admin@2026' || password === 'admin@2026')) {
      const salt = 'srms_admin_salt_892';
      user = {
        id: 'USR-ADMIN-1',
        username: 'admin',
        name: 'Ashish Kharad (Admin)',
        email: 'Ashish.kharad2@gmail.com',
        role: 'admin',
        mobile: '+91 98220 11223',
        joiningDate: '2023-01-15',
        branch: 'Head Office',
        area: 'Central',
        zone: 'Central',
        active: true,
        passwordSalt: salt,
        passwordHash: hashPassword('Admin@2026', salt),
        tokenVersion: 1,
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      };
      await db.collection('users').doc(user.id).set(user, { merge: true });
    }

    if (!user) return res.status(401).json({ success: false, error: 'Invalid User ID or Password. User account has not been created by Admin.', code: 'USER_NOT_CREATED_BY_ADMIN' });
    if (user.active === false || user.isDeleted === true || user.status === 'DELETED') {
      return res.status(403).json({ success: false, error: 'Your account is currently deactivated. Please contact the administrator.', code: 'ACCOUNT_DEACTIVATED' });
    }

    const computedHash = user.passwordSalt && user.passwordHash ? hashPassword(password, user.passwordSalt) : null;
    const valid = (computedHash && computedHash === user.passwordHash) || (user.password && user.password === password);
    if (!valid) return res.status(401).json({ success: false, error: 'Invalid User ID or Password. Please enter the correct password provided by Admin.', code: 'INVALID_CREDENTIALS' });

    const customToken = await admin.auth().createCustomToken(user.id, {
      role: user.role || 'agent',
      srmsUserId: user.id,
    });

    const safeUser = { ...user };
    delete safeUser.password;
    delete safeUser.passwordHash;
    delete safeUser.passwordSalt;

    return res.json({
      success: true,
      token: customToken,
      customToken,
      user: safeUser,
      deviceMode: deviceMode || (user.role === 'agent' ? 'android' : 'web'),
    });
  } catch (error) {
    console.error('[SRMS authLogin]', error);
    return res.status(500).json({ success: false, error: 'Authentication service error. Please try again.' });
  }
});
