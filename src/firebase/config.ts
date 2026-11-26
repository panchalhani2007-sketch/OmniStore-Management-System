import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Secondary auth instance for admin staff provisioning without affecting current session
export function getSecondaryAuth() {
  const existing = getApps().find((a) => a.name === 'SecondaryStaffAuth');
  const secondaryApp = existing || initializeApp(firebaseConfig, 'SecondaryStaffAuth');
  return getAuth(secondaryApp);
}

// Test Firestore connection on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore connection offline. Check network or credentials.');
    }
    // Return true/false without halting app
    return false;
  }
}
