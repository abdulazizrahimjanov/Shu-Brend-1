import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  updateProfile,
  EmailAuthProvider,
  reauthenticateWithCredential,
  User as FirebaseUser,
  Auth,
} from 'firebase/auth';
import {
  Firestore,
  FirestoreSettings,
  disableNetwork,
  doc,
  enableNetwork,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  memoryLocalCache,
} from 'firebase/firestore';
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
  FirebaseStorage,
} from 'firebase/storage';
import {
  getFunctions,
  httpsCallable,
  Functions,
} from 'firebase/functions';
import defaultFirebaseConfig from '../firebase-applet-config.json';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

const env = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : ({} as Record<string, string | undefined>);

export const resolvedFirebaseConfig = {
  projectId: env.VITE_FIREBASE_PROJECT_ID || defaultFirebaseConfig.projectId,
  appId: env.VITE_FIREBASE_APP_ID || defaultFirebaseConfig.appId,
  apiKey: env.VITE_FIREBASE_API_KEY || defaultFirebaseConfig.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || defaultFirebaseConfig.authDomain,
  firestoreDatabaseId:
    env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || defaultFirebaseConfig.firestoreDatabaseId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || defaultFirebaseConfig.storageBucket,
  messagingSenderId:
    env.VITE_FIREBASE_MESSAGING_SENDER_ID || defaultFirebaseConfig.messagingSenderId,
};

export const AUTH_EMAIL_DOMAIN = (env.VITE_AUTH_EMAIL_DOMAIN || 'users.shubrend.uz')
  .trim()
  .toLowerCase();

export const USE_CLOUD_FUNCTIONS = String(env.VITE_USE_CLOUD_FUNCTIONS || '').toLowerCase() === 'true';
export const FUNCTIONS_REGION = env.VITE_FIREBASE_FUNCTIONS_REGION || 'us-central1';

const app: FirebaseApp =
  getApps().some((a) => a.name === '[DEFAULT]') ? getApp() : initializeApp(resolvedFirebaseConfig);
export const auth: Auth = getAuth(app);
export const storage: FirebaseStorage = getStorage(app);
export const functionsClient: Functions = getFunctions(app, FUNCTIONS_REGION);

function getSecondaryStaffCreatorApp(): FirebaseApp {
  const existing = getApps().find((a) => a.name === 'staff-creator');
  if (existing) return existing;
  return initializeApp(resolvedFirebaseConfig, 'staff-creator');
}

export function normalizeUsername(raw: string): string {
  return String(raw || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9._-]/g, '');
}

export function isValidUsername(raw: string): boolean {
  const clean = String(raw || '').trim().toLowerCase();
  return /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$|^[a-z0-9]{3,32}$/.test(clean);
}

export function usernameToAuthEmail(username: string): string {
  const clean = normalizeUsername(username);
  return `${clean}@${AUTH_EMAIL_DOMAIN}`;
}

export function authEmailToUsername(email?: string | null): string {
  const clean = String(email || '').trim().toLowerCase();
  if (!clean) return '';
  const atIdx = clean.indexOf('@');
  if (atIdx <= 0) return clean;
  return clean.slice(0, atIdx);
}

export function normalizePhoneDigits(phone: string): string {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length === 9) return `998${digits}`;
  return digits;
}

const isBrowser = typeof window !== 'undefined';
const baseFirestoreSettings: FirestoreSettings = {
  ignoreUndefinedProperties: true,
  ...(isBrowser
    ? {
        experimentalAutoDetectLongPolling: true,
      }
    : {}),
};

let firestoreInstance: Firestore;
try {
  // Offline persistence & queue are handled by LocalIndexedDBRepository;
  // memoryLocalCache avoids multi-tab IndexedDB targetId (ca9/b815) desyncs across reloads.
  firestoreInstance = initializeFirestore(
    app,
    {
      ...baseFirestoreSettings,
      localCache: memoryLocalCache(),
    },
    resolvedFirebaseConfig.firestoreDatabaseId
  );
} catch {
  firestoreInstance = getFirestore(app, resolvedFirebaseConfig.firestoreDatabaseId);
}

export const firestoreDb: Firestore = firestoreInstance;

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  const serialized = JSON.stringify(errInfo);
  console.error('Firestore Error: ', serialized);
  throw new Error(serialized);
}

let activeNetworkResetPromise: Promise<void> | null = null;
let lastNetworkResetAt = 0;

export async function ensureFirestoreNetwork(): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  try {
    await enableNetwork(firestoreDb);
  } catch {
    // ignore transient enableNetwork issues
  }
}

export async function resetFirestoreNetwork(force = false): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  const now = Date.now();
  if (!force && now - lastNetworkResetAt < 4000 && !activeNetworkResetPromise) {
    await ensureFirestoreNetwork();
    return;
  }
  if (activeNetworkResetPromise) {
    return activeNetworkResetPromise;
  }
  activeNetworkResetPromise = (async () => {
    try {
      await disableNetwork(firestoreDb);
      await new Promise((r) => setTimeout(r, 150));
      await enableNetwork(firestoreDb);
      lastNetworkResetAt = Date.now();
    } catch {
      await ensureFirestoreNetwork();
    } finally {
      activeNetworkResetPromise = null;
    }
  })();
  return activeNetworkResetPromise;
}

function extractRawErrorMessage(error: unknown): { code: string; message: string } {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  const codeProp =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  try {
    const parsed = JSON.parse(raw) as { error?: string };
    if (parsed && typeof parsed.error === 'string') {
      return { code: codeProp, message: parsed.error };
    }
  } catch {
    // not JSON
  }
  return { code: codeProp, message: raw };
}

export function formatFirebaseError(error: unknown, lang: 'uz' | 'ru' = 'uz'): string {
  const { code, message } = extractRawErrorMessage(error);
  const low = `${code} ${message}`.toLowerCase();

  if (
    low.includes('auth/invalid-credential') ||
    low.includes('auth/wrong-password') ||
    low.includes('auth/user-not-found') ||
    low.includes('auth/invalid-login-credentials')
  ) {
    return lang === 'ru'
      ? 'Неверный логин или пароль. Проверьте введённые данные.'
      : "Login yoki parol noto'g'ri. Iltimos, tekshirib qayta kiriting.";
  }
  if (low.includes('auth/user-disabled')) {
    return lang === 'ru'
      ? 'Этот аккаунт сотрудника заблокирован администратором.'
      : "Ushbu xodim hisobi administrator tomonidan bloklangan.";
  }
  if (low.includes('auth/email-already-in-use')) {
    return lang === 'ru'
      ? 'Этот логин уже занят другим пользователем.'
      : 'Bu login nomi allaqachon band. Boshqa login tanlang.';
  }
  if (low.includes('auth/weak-password')) {
    return lang === 'ru'
      ? 'Пароль слишком короткий (минимум 6 символов).'
      : "Parol juda qisqa (kamida 6 ta belgi bo'lishi kerak).";
  }
  if (low.includes('auth/requires-recent-login')) {
    return lang === 'ru'
      ? 'Для смены пароля выйдите и войдите в систему заново.'
      : "Parolni o'zgartirish uchun tizimdan chiqib qayta kiring yoki joriy parolingizni kiriting.";
  }
  if (low.includes('auth/too-many-requests')) {
    return lang === 'ru'
      ? 'Слишком много попыток входа. Попробуйте через несколько минут.'
      : "Juda ko'p urinish. Bir necha daqiqadan so'ng qayta urinib ko'ring.";
  }
  if (low.includes('auth/operation-not-allowed')) {
    return lang === 'ru'
      ? 'В Firebase Authentication не включён вход по Email/Пароль.'
      : "Firebase Authentication'da Email/Password (Login va Parol) orqali kirish yoqilmagan.";
  }
  if (low.includes('auth/network-request-failed')) {
    return lang === 'ru'
      ? 'Ошибка сети при подключении к серверу. Проверьте интернет.'
      : "Internet aloqasi uzilgan. Server bilan bog'lanib bo'lmadi.";
  }
  if (low.includes('permission-denied') || low.includes('insufficient permissions') || low.includes('missing or insufficient')) {
    if (message.includes('Umumiy baza') || message.includes('ish maydoniga') || message.includes('bloklangan') || message.includes('faolsizlantirilgan')) {
      return message;
    }
    const rawStr = error instanceof Error ? error.message.toLowerCase() : '';
    if (rawStr.includes('"path":"admins/') || rawStr.includes('"path":"userprofiles/')) {
      return lang === 'ru'
        ? 'Правила безопасности Firestore (firestore.rules) на сервере Firebase ещё не обновлены. Опубликуйте актуальный firestore.rules в Firebase Console.'
        : "Firebase serveridagi Firestore Security Rules hali yangilanmagan. Firebase Console orqali firestore.rules qoidalarini nashr qiling.";
    }
    return lang === 'ru'
      ? 'Недостаточно прав доступа в Firebase (Firestore Security Rules).'
      : "Ushbu amalni bulutga yozish uchun ruxsat yetarli emas. Administrator bilan bog'laning.";
  }
  if (
    low.includes('unavailable') ||
    low.includes('client is offline') ||
    low.includes('network-request-failed') ||
    low.includes('network error') ||
    low.includes('networkerror') ||
    low.includes('could not reach cloud firestore') ||
    low.includes('failed to fetch') ||
    low.includes('firestore-probe-timeout') ||
    low.includes('firestore-health-timeout')
  ) {
    return lang === 'ru'
      ? 'Сервер временно недоступен. Изменения сохранены локально и синхронизируются при восстановлении связи.'
      : "Server bilan aloqa vaqtincha uzildi. O'zgarishlar qurilmada saqlandi va aloqa tiklanganda yuboriladi.";
  }
  if (low.includes('resource-exhausted')) {
    return lang === 'ru'
      ? 'Превышен лимит запросов или размер данных Firebase.'
      : "So'rovlar limiti yoki hujjat hajmi chegarasidan oshdi.";
  }
  if (message.trim()) return message;
  return lang === 'ru'
    ? 'Произошла ошибка подключения к облачной базе.'
    : "Bulutli baza bilan ishlashda xatolik yuz berdi.";
}

export const formatFirebaseErrorMessage = formatFirebaseError;

export function isTransientFirestoreError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const { code, message } = extractRawErrorMessage(error);
  const low = `${code} ${message}`.toLowerCase();
  return (
    low.includes('unavailable') ||
    low.includes('client is offline') ||
    low.includes('network-request-failed') ||
    low.includes('network error') ||
    low.includes('networkerror') ||
    low.includes('could not reach cloud firestore') ||
    low.includes('timeout') ||
    low.includes('deadline-exceeded') ||
    low.includes('aborted') ||
    low.includes('failed to fetch')
  );
}

export async function probeFirestoreConnection(
  lang: 'uz' | 'ru' = 'uz'
): Promise<{ ok: boolean; error?: string; code?: string }> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      ok: false,
      code: 'offline',
      error:
        lang === 'ru'
          ? 'Нет подключения к интернету (офлайн).'
          : 'Internet aloqasi mavjud emas (oflayn rejim).',
    };
  }

  const probe = async () => {
    await ensureFirestoreNetwork();
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('firestore-probe-timeout')), 15000);
    });
    await Promise.race([
      getDocFromServer(doc(firestoreDb, 'test', 'connection')),
      timeoutPromise,
    ]);
  };

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await probe();
      return { ok: true };
    } catch (error) {
      const { code, message } = extractRawErrorMessage(error);
      const low = `${code} ${message}`.toLowerCase();
      if (low.includes('permission-denied') || low.includes('missing or insufficient')) {
        return { ok: true };
      }
      const isRetryable =
        attempt === 0 &&
        (low.includes('the client is offline') ||
          low.includes('unavailable') ||
          low.includes('timeout') ||
          low.includes('could not reach') ||
          low.includes('network'));
      if (isRetryable) {
        await resetFirestoreNetwork();
        await new Promise((r) => setTimeout(r, 800));
        continue;
      }
      return {
        ok: false,
        code: code || (low.includes('timeout') ? 'unavailable' : 'unknown'),
        error: low.includes('timeout')
          ? formatFirebaseError(new Error('unavailable'), lang)
          : formatFirebaseError(error, lang),
      };
    }
  }

  return { ok: true };
}

export async function testConnection(): Promise<boolean> {
  const res = await probeFirestoreConnection('uz');
  if (!res.ok) {
    console.error('Please check your Firebase configuration or network connection.');
  }
  return res.ok;
}

export async function signInWithUsernamePassword(
  username: string,
  password: string
): Promise<FirebaseUser> {
  const email = usernameToAuthEmail(username);
  const res = await signInWithEmailAndPassword(auth, email, password);
  return res.user;
}

export async function createPrimaryOwnerAuth(
  username: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  const email = usernameToAuthEmail(username);
  const res = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName.trim()) {
    try {
      await updateProfile(res.user, { displayName: displayName.trim() });
    } catch {
      // ignore non-fatal profile update error
    }
  }
  return res.user;
}

/**
 * Creates a Firebase Auth account for a new employee on a secondary FirebaseApp
 * instance so the currently signed-in Owner/Admin session is never interrupted.
 */
export async function createEmployeeAuthSecondary(
  username: string,
  password: string,
  displayName: string
): Promise<{ uid: string; email: string; username: string }> {
  const cleanUsername = normalizeUsername(username);
  const email = usernameToAuthEmail(cleanUsername);
  const secondaryApp = getSecondaryStaffCreatorApp();
  const secondaryAuth = getAuth(secondaryApp);
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    if (displayName.trim()) {
      try {
        await updateProfile(cred.user, { displayName: displayName.trim() });
      } catch {
        // non-fatal
      }
    }
    return {
      uid: cred.user.uid,
      email,
      username: cleanUsername,
    };
  } finally {
    try {
      await signOut(secondaryAuth);
    } catch {
      // ignore
    }
  }
}

export async function signInOrCreatePrimaryOwnerAuth(
  username: string,
  password: string,
  displayName: string
): Promise<FirebaseUser> {
  try {
    return await createPrimaryOwnerAuth(username, password, displayName);
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code ?? '')
        : '';
    if (code === 'auth/email-already-in-use') {
      try {
        return await signInWithUsernamePassword(username, password);
      } catch {
        throw new Error(
          "Ushbu login bilan egasi hisobi allaqachon yaratilgan. O'sha parolni kiriting yoki Login oynasidan kiring."
        );
      }
    }
    throw err;
  }
}

export async function signInOrCreateEmployeeAuthSecondary(
  username: string,
  password: string,
  displayName: string
): Promise<{ uid: string; email: string; username: string }> {
  try {
    return await createEmployeeAuthSecondary(username, password, displayName);
  } catch (err: unknown) {
    const code =
      typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: unknown }).code ?? '')
        : '';
    if (code === 'auth/email-already-in-use') {
      const cleanUsername = normalizeUsername(username);
      const email = usernameToAuthEmail(cleanUsername);
      const secondaryApp = getSecondaryStaffCreatorApp();
      const secondaryAuth = getAuth(secondaryApp);
      try {
        const cred = await signInWithEmailAndPassword(secondaryAuth, email, password);
        return {
          uid: cred.user.uid,
          email,
          username: cleanUsername,
        };
      } catch {
        throw new Error(
          `Xodim (${cleanUsername}) hisobi allaqachon yaratilgan. O'sha parolni kiriting yoki boshqa login tanlang.`
        );
      } finally {
        try {
          await signOut(secondaryAuth);
        } catch {
          // ignore
        }
      }
    }
    throw err;
  }
}

export async function updateOwnPasswordAuth(
  newPassword: string,
  currentPassword?: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Tizimga kirilmagan");
  }
  if (currentPassword && user.email) {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }
  await updatePassword(user, newPassword);
}

export async function uploadProductPhotoToStorage(
  blobOrFile: Blob,
  productId: string
): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return null;
  }
  try {
    const cleanId = String(productId || 'prod').replace(/[^a-zA-Z0-9_-]/g, '_');
    const path = `products/${cleanId}/${Date.now()}.jpg`;
    const fileRef = storageRef(storage, path);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('storage-timeout')), 6000)
    );
    await Promise.race([
      uploadBytes(fileRef, blobOrFile, {
        contentType: blobOrFile.type || 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      }),
      timeout,
    ]);
    const url = await Promise.race([getDownloadURL(fileRef), timeout]);
    return url;
  } catch {
    return null;
  }
}

export async function callFirebaseFunction<TReq, TRes>(
  name: string,
  payload: TReq
): Promise<TRes> {
  const fn = httpsCallable<TReq, TRes>(functionsClient, name);
  const res = await fn(payload);
  return res.data;
}

export async function signOutFirebase(): Promise<void> {
  try {
    await signOut(auth);
  } catch {
    // ignore signout network issues
  }
}

export function watchAuthState(cb: (user: FirebaseUser | null) => void): () => void {
  return onAuthStateChanged(auth, cb);
}
