import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import firebaseConfigJson from '../../firebase-applet-config.json';
import { UserCredits, ExtractedStatement } from '../types';

const firebaseConfig = {
  apiKey: firebaseConfigJson.apiKey,
  authDomain: firebaseConfigJson.authDomain,
  projectId: firebaseConfigJson.projectId,
  storageBucket: firebaseConfigJson.storageBucket,
  messagingSenderId: firebaseConfigJson.messagingSenderId,
  appId: firebaseConfigJson.appId,
};

// Initialize Firebase App
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfigJson.firestoreDatabaseId && firebaseConfigJson.firestoreDatabaseId !== '(default)'
  ? getFirestore(app, firebaseConfigJson.firestoreDatabaseId)
  : getFirestore(app);

// Authentication helper functions
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Google Sign-in Error:', error);
    return { user: null, error: formatAuthError(error) };
  }
};

export const signInWithEmail = async (email: string, pass: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, pass);
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Email Sign-in Error:', error);
    return { user: null, error: formatAuthError(error) };
  }
};

export const registerWithEmail = async (email: string, pass: string, displayName?: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, pass);
    if (displayName && result.user) {
      await updateProfile(result.user, { displayName });
    }
    return { user: result.user, error: null };
  } catch (error: any) {
    console.error('Register Error:', error);
    return { user: null, error: formatAuthError(error) };
  }
};

export const resetPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Password Reset Error:', error);
    return { success: false, error: formatAuthError(error) };
  }
};

export const logoutUser = async () => {
  try {
    await firebaseSignOut(auth);
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Logout Error:', error);
    return { success: false, error: formatAuthError(error) };
  }
};

export const formatAuthError = (error: any): string => {
  if (!error) return 'An unexpected error occurred';
  const code = error.code || '';
  switch (code) {
    case 'auth/invalid-email':
      return 'The email address is invalid.';
    case 'auth/user-disabled':
      return 'This user account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password.';
    case 'auth/email-already-in-use':
      return 'An account already exists with this email address.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/operation-not-allowed':
      return 'Email/password sign-in is currently not enabled in your Firebase project. Please use "Continue with Google" above to sign in.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in window was closed. Click "Continue with Google" whenever you are ready.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked by browser. Please allow popups for this site or open in a new tab.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in request cancelled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your internet connection.';
    default:
      return error.message || 'Authentication failed. Please try again.';
  }
};

// Cloud Sync Helpers
export const syncUserCreditsToCloud = async (userId: string, credits: UserCredits, userEmail?: string | null, userName?: string | null) => {
  try {
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      availableCredits: credits.availableCredits,
      totalEarned: credits.totalEarned,
      totalUsed: credits.totalUsed,
      sharesCount: credits.sharesCount,
      referralCode: credits.referralCode || null,
      referredUsersCount: credits.referredUsersCount || 0,
      claimedReferralBonus: credits.claimedReferralBonus || false,
      lastShareVerificationDate: credits.lastShareVerificationDate || null,
      lastClaimDate: credits.lastClaimDate || null,
      email: userEmail || '',
      displayName: userName || '',
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.warn('Failed to sync credits to cloud:', err);
  }
};

export const loadUserCreditsFromCloud = async (userId: string): Promise<UserCredits | null> => {
  try {
    const userDocRef = doc(db, 'users', userId);
    const docSnap = await getDoc(userDocRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        availableCredits: typeof data.availableCredits === 'number' ? data.availableCredits : 10,
        totalEarned: typeof data.totalEarned === 'number' ? data.totalEarned : 10,
        totalUsed: typeof data.totalUsed === 'number' ? data.totalUsed : 0,
        sharesCount: typeof data.sharesCount === 'number' ? data.sharesCount : 0,
        referralCode: data.referralCode || undefined,
        referredUsersCount: typeof data.referredUsersCount === 'number' ? data.referredUsersCount : 0,
        claimedReferralBonus: Boolean(data.claimedReferralBonus),
        lastShareVerificationDate: data.lastShareVerificationDate || undefined,
        lastClaimDate: data.lastClaimDate || undefined,
      };
    }
  } catch (err) {
    console.warn('Failed to load user credits from cloud:', err);
  }
  return null;
};

export const syncStatementToCloud = async (userId: string, statement: ExtractedStatement) => {
  try {
    const stmtRef = doc(db, 'users', userId, 'history', statement.id);
    await setDoc(stmtRef, {
      ...statement,
      savedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn('Failed to sync statement to cloud:', err);
  }
};

export const loadHistoryFromCloud = async (userId: string): Promise<ExtractedStatement[]> => {
  try {
    const historyColRef = collection(db, 'users', userId, 'history');
    const q = query(historyColRef, orderBy('uploadDate', 'desc'), limit(30));
    const snapshot = await getDocs(q);
    const list: ExtractedStatement[] = [];
    snapshot.forEach((doc) => {
      list.push(doc.data() as ExtractedStatement);
    });
    return list;
  } catch (err) {
    console.warn('Failed to load history from cloud:', err);
    return [];
  }
};
