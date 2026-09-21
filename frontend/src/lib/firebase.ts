import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  type Auth,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string | undefined,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string | undefined,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string | undefined,
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string | undefined,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;

export function isFirebaseClientConfigured(): boolean {
  return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
}

export function getFirebaseAuth(): Auth {
  if (!isFirebaseClientConfigured()) {
    throw new Error("Firebase client is not configured. Set VITE_FIREBASE_* environment variables.");
  }
  if (!app) {
    app = initializeApp({
      apiKey: config.apiKey!,
      authDomain: config.authDomain!,
      projectId: config.projectId!,
      appId: config.appId!,
    });
    auth = getAuth(app);
  }
  return auth!;
}

export async function firebaseSignInEmailPassword(email: string, password: string) {
  const a = getFirebaseAuth();
  const cred = await signInWithEmailAndPassword(a, email.trim(), password);
  return cred.user;
}

export async function firebaseSignInGoogle() {
  const a = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const cred = await signInWithPopup(a, provider);
  return cred.user;
}

export async function firebaseSendPasswordReset(email: string) {
  const a = getFirebaseAuth();
  await sendPasswordResetEmail(a, email.trim());
}

export async function firebaseSignOut() {
  if (!isFirebaseClientConfigured()) return;
  const a = getFirebaseAuth();
  await signOut(a);
}

export async function getIdToken(forceRefresh = false): Promise<string | null> {
  if (!isFirebaseClientConfigured()) return null;
  const a = getFirebaseAuth();
  const user = a.currentUser;
  if (!user) return null;
  return user.getIdToken(forceRefresh);
}

export function watchAuth(cb: (user: User | null) => void) {
  if (!isFirebaseClientConfigured()) {
    cb(null);
    return () => undefined;
  }
  return onAuthStateChanged(getFirebaseAuth(), cb);
}
