import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut as fbSignOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { auth, db, getSecondaryAuth, testConnection } from '../firebase/config';
import { UserProfile, UserRole } from '../types/store';
import { handleFirestoreError, OperationType } from '../firebase/errors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  simulatedRole: UserRole | null;
  setSimulatedRole: (role: UserRole | null) => void;
  loading: boolean;
  isAccountDisabled: boolean;
  signInWithGoogle: () => Promise<boolean>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, role?: UserRole) => Promise<void>;
  createStaffAccount: (email: string, pass: string, name: string, role: UserRole, phone?: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  updateStaffMember: (userId: string, updates: Partial<Pick<UserProfile, 'name' | 'role' | 'status' | 'phone'>>) => Promise<void>;
  deleteStaffProfile: (userId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Test Firestore connection on boot
  useEffect(() => {
    testConnection();
  }, []);

  // Listen to Auth State & keep current user's Firestore profile synced in real time
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setUser(currentUser);
      if (currentUser) {
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userDocRef);

          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            // Ensure designated super admin always retains admin role & active status
            if (currentUser.email === 'panchalhani2007@gmail.com' && (data.role !== 'admin' || data.status !== 'active')) {
              await updateDoc(userDocRef, { role: 'admin', status: 'active' });
              data.role = 'admin';
              data.status = 'active';
            }
            setProfile(data);
          } else {
            // Auto create profile on first sign-in
            const isDefaultAdmin = currentUser.email === 'panchalhani2007@gmail.com';
            const newProfile: UserProfile = {
              id: currentUser.uid,
              email: currentUser.email || 'user@omnistore.internal',
              name: currentUser.displayName || currentUser.email?.split('@')[0] || 'Store Staff',
              role: isDefaultAdmin ? 'admin' : 'billing',
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newProfile);
            setProfile(newProfile);
          }

          // Real-time listener for role/status updates from Admin
          unsubProfile = onSnapshot(
            userDocRef,
            (snap) => {
              if (snap.exists()) {
                setProfile({ id: snap.id, ...snap.data() } as UserProfile);
              }
            },
            (err) => {
              console.warn('Profile sync warning:', err.message);
            }
          );
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setProfile({
            id: currentUser.uid,
            email: currentUser.email || 'user@omnistore.internal',
            name: currentUser.displayName || 'Store Staff',
            role: currentUser.email === 'panchalhani2007@gmail.com' ? 'admin' : 'billing',
            status: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      } else {
        setProfile(null);
        setSimulatedRole(null);
      }
      setLoading(false);
    });

    return () => {
      if (unsubProfile) unsubProfile();
      unsubscribe();
    };
  }, []);

  const signInWithGoogle = async (): Promise<boolean> => {
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
      return true;
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (
        fbErr.code === 'auth/popup-closed-by-user' ||
        fbErr.code === 'auth/cancelled-popup-request' ||
        fbErr.message?.includes('popup-closed-by-user') ||
        fbErr.message?.includes('cancelled-popup-request')
      ) {
        console.info('Google sign-in popup was dismissed by user.');
        return false;
      }
      if (fbErr.code === 'auth/popup-blocked' || fbErr.message?.includes('popup-blocked')) {
        throw new Error('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      }
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, role: UserRole = 'billing') => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      name: name || email.split('@')[0],
      role: (email === 'panchalhani2007@gmail.com' ? 'admin' : role),
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    try {
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
      setProfile(newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${cred.user.uid}`);
    }
  };

  // Admin creates a new staff account using secondary Firebase Auth so Admin stays signed in
  const createStaffAccount = async (
    email: string,
    pass: string,
    name: string,
    staffRole: UserRole,
    phone?: string
  ) => {
    const secondaryAuth = getSecondaryAuth();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      name: name.trim() || email.split('@')[0],
      role: email.toLowerCase() === 'panchalhani2007@gmail.com' ? 'admin' : staffRole,
      phone: phone?.trim() || '',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    try {
      // Write profile using primary Admin-authenticated Firestore session
      await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
    } finally {
      await fbSignOut(secondaryAuth);
    }
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setProfile(null);
    setSimulatedRole(null);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      if (userId === user?.uid && profile) {
        setProfile({ ...profile, role: newRole });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateStaffMember = async (
    userId: string,
    updates: Partial<Pick<UserProfile, 'name' | 'role' | 'status' | 'phone'>>
  ) => {
    try {
      await updateDoc(doc(db, 'users', userId), {
        ...updates,
        updatedAt: new Date().toISOString()
      });
      if (userId === user?.uid && profile) {
        setProfile({ ...profile, ...updates });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteStaffProfile = async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'users', userId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  const effectiveRole: UserRole = simulatedRole || profile?.role || 'billing';
  const isAccountDisabled = Boolean(profile && profile.status === 'inactive' && user?.email !== 'panchalhani2007@gmail.com');

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      role: effectiveRole,
      simulatedRole,
      setSimulatedRole,
      loading,
      isAccountDisabled,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      createStaffAccount,
      sendResetEmail,
      signOut,
      updateUserRole,
      updateStaffMember,
      deleteStaffProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
