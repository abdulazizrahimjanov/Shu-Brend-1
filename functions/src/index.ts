import { initializeApp, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';

if (getApps().length === 0) {
  initializeApp();
}

const FIRESTORE_DATABASE_ID =
  process.env.FIRESTORE_DATABASE_ID || 'ai-studio-shubrend-e37e565d-8969-45b1-960d-51ea45b15e5d';
const AUTH_EMAIL_DOMAIN = (process.env.AUTH_EMAIL_DOMAIN || 'users.shubrend.uz').trim().toLowerCase();
const REGION = process.env.FUNCTIONS_REGION || 'us-central1';

const adminAuth = getAuth();
const db = getFirestore(FIRESTORE_DATABASE_ID);

function normalizeUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

function isValidUsername(raw: string): boolean {
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$|^[a-z0-9]{3,32}$/.test(raw);
}

function usernameToAuthEmail(username: string): string {
  return `${normalizeUsername(username)}@${AUTH_EMAIL_DOMAIN}`;
}

async function assertWorkspaceAdmin(workspaceId: string, callerUid: string) {
  const wsRef = db.collection('workspaces').doc(workspaceId);
  const wsSnap = await wsRef.get();
  if (!wsSnap.exists) {
    throw new HttpsError('not-found', 'Ish maydoni topilmadi.');
  }
  const wsData = wsSnap.data() || {};
  const ownerUid = String(wsData.ownerUid || '');
  const adminUids = Array.isArray(wsData.adminUids) ? wsData.adminUids.map(String) : [];

  const memberSnap = await wsRef.collection('members').doc(callerUid).get();
  const memberData = memberSnap.exists ? memberSnap.data() || {} : {};
  const isMemberAdmin =
    memberSnap.exists &&
    memberData.isActive === true &&
    (memberData.roleId === 'owner' || memberData.roleId === 'admin');

  if (ownerUid !== callerUid && !adminUids.includes(callerUid) && !isMemberAdmin) {
    throw new HttpsError('permission-denied', 'Faqat egasi yoki administrator ushbu amalni bajara oladi.');
  }

  return { wsRef, wsData, ownerUid };
}

export const createEmployeeAccount = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Tizimga kirish talab qilinadi.');
  }
  const data = (request.data || {}) as {
    workspaceId?: string;
    username?: string;
    password?: string;
    name?: string;
    roleId?: string;
    assignedStoreIds?: string[];
    permissions?: string[];
  };

  const workspaceId = String(data.workspaceId || '').trim();
  const cleanUsername = normalizeUsername(data.username || '');
  const password = String(data.password || '');
  const displayName = String(data.name || cleanUsername).trim().slice(0, 120);

  if (!workspaceId) {
    throw new HttpsError('invalid-argument', 'workspaceId majburiy.');
  }
  if (!isValidUsername(cleanUsername)) {
    throw new HttpsError('invalid-argument', "Login kamida 3 ta lotin harf/raqamdan iborat bo'lishi kerak.");
  }
  if (password.length < 6) {
    throw new HttpsError('invalid-argument', "Parol kamida 6 ta belgi bo'lishi kerak.");
  }

  const { wsRef } = await assertWorkspaceAdmin(workspaceId, request.auth.uid);
  const email = usernameToAuthEmail(cleanUsername);

  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || cleanUsername,
      disabled: false,
    });

    await wsRef.update({
      memberUids: FieldValue.arrayUnion(userRecord.uid),
      invitedEmails: FieldValue.arrayUnion(email),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return {
      uid: userRecord.uid,
      email,
      username: cleanUsername,
    };
  } catch (err: unknown) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
    if (code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'Bu login nomi allaqachon band.');
    }
    throw new HttpsError('internal', err instanceof Error ? err.message : 'Xodim yaratishda xatolik.');
  }
});

export const updateEmployeeAccount = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Tizimga kirish talab qilinadi.');
  }
  const data = (request.data || {}) as {
    workspaceId?: string;
    targetAuthUid?: string;
    newPassword?: string;
    newUsername?: string;
    isActive?: boolean;
  };

  const workspaceId = String(data.workspaceId || '').trim();
  const targetAuthUid = String(data.targetAuthUid || '').trim();
  if (!workspaceId || !targetAuthUid) {
    throw new HttpsError('invalid-argument', 'workspaceId va targetAuthUid majburiy.');
  }

  const { wsRef, ownerUid } = await assertWorkspaceAdmin(workspaceId, request.auth.uid);
  if (targetAuthUid === ownerUid && data.isActive === false) {
    throw new HttpsError('failed-precondition', "Do'kon egasini bloklash mumkin emas.");
  }

  const updatePayload: {
    password?: string;
    email?: string;
    disabled?: boolean;
  } = {};

  if (data.newPassword) {
    if (data.newPassword.length < 6) {
      throw new HttpsError('invalid-argument', "Yangi parol kamida 6 ta belgi bo'lishi kerak.");
    }
    updatePayload.password = data.newPassword;
  }
  if (data.newUsername) {
    const clean = normalizeUsername(data.newUsername);
    if (!isValidUsername(clean)) {
      throw new HttpsError('invalid-argument', "Login formati noto'g'ri.");
    }
    updatePayload.email = usernameToAuthEmail(clean);
  }
  if (typeof data.isActive === 'boolean') {
    updatePayload.disabled = !data.isActive;
  }

  if (Object.keys(updatePayload).length > 0) {
    await adminAuth.updateUser(targetAuthUid, updatePayload);
  }

  if (typeof data.isActive === 'boolean') {
    const memberRef = wsRef.collection('members').doc(targetAuthUid);
    const memberSnap = await memberRef.get();
    if (memberSnap.exists) {
      await memberRef.update({
        isActive: data.isActive,
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
  }

  return { ok: true };
});

export const deleteEmployeeAccount = onCall({ region: REGION }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Tizimga kirish talab qilinadi.');
  }
  const data = (request.data || {}) as {
    workspaceId?: string;
    targetAuthUid?: string;
  };

  const workspaceId = String(data.workspaceId || '').trim();
  const targetAuthUid = String(data.targetAuthUid || '').trim();
  if (!workspaceId || !targetAuthUid) {
    throw new HttpsError('invalid-argument', 'workspaceId va targetAuthUid majburiy.');
  }

  const { wsRef, ownerUid } = await assertWorkspaceAdmin(workspaceId, request.auth.uid);
  if (targetAuthUid === ownerUid || targetAuthUid === request.auth.uid) {
    throw new HttpsError('failed-precondition', "O'z hisobingiz yoki do'kon egasi hisobini o'chirib bo'lmaydi.");
  }

  try {
    await adminAuth.deleteUser(targetAuthUid);
  } catch (err: unknown) {
    const code = typeof err === 'object' && err !== null && 'code' in err ? String((err as { code?: unknown }).code) : '';
    if (code !== 'auth/user-not-found') {
      throw new HttpsError('internal', err instanceof Error ? err.message : "Auth hisobni o'chirishda xatolik.");
    }
  }

  await wsRef.update({
    memberUids: FieldValue.arrayRemove(targetAuthUid),
    adminUids: FieldValue.arrayRemove(targetAuthUid),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const memberRef = wsRef.collection('members').doc(targetAuthUid);
  if ((await memberRef.get()).exists) {
    await memberRef.delete();
  }

  return { ok: true };
});
