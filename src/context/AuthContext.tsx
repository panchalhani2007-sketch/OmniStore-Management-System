import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut as fbSignOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch
} from 'firebase/firestore';
import { auth, db, getSecondaryAuth, testConnection } from '../firebase/config';
import {
  MAX_MANAGER_ACCOUNTS,
  ROLE_PERMISSIONS,
  UserProfile,
  UserRole
} from '../types/store';
import { handleFirestoreError, OperationType } from '../firebase/errors';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  role: UserRole;
  isAuthorizedAdmin: boolean;
  adminInitialized: boolean;
  adminOwnershipReleased: boolean;
  adminInitLoading: boolean;
  adminClaimedAt: string | null;
  simulatedRole: UserRole | null;
  setSimulatedRole: (role: UserRole | null) => void;
  loading: boolean;
  authTransitioning: boolean;
  isAccountDisabled: boolean;
  isUnauthorizedAccount: boolean;
  registerFirstAdmin: (email: string, pass: string, name: string) => Promise<void>;
  registerNewAdmin: (email: string, pass: string, name: string) => Promise<void>;
  releaseAdminOwnership: () => Promise<void>;
  signInWithEmail: (email: string, pass: string, expectedRole: UserRole) => Promise<void>;
  createStaffAccount: (email: string, pass: string, name: string, role: UserRole, phone?: string) => Promise<void>;
  sendResetEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserRole: (userId: string, newRole: UserRole) => Promise<void>;
  updateStaffMember: (userId: string, updates: Partial<Pick<UserProfile, 'name' | 'role' | 'status' | 'phone'>>) => Promise<void>;
  deleteStaffProfile: (userId: string) => Promise<void>;
  viewingLoginPage: boolean;
  openLoginPage: () => void;
  returnToDashboard: () => void;
  syncManagerSlots: () => Promise<void>;
  cleanupPreResetAdminManagers: (targetIds: string[]) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLockAdmin, setIsLockAdmin] = useState<boolean>(false);
  const [adminInitialized, setAdminInitialized] = useState<boolean>(false);
  const [adminOwnershipReleased, setAdminOwnershipReleased] = useState<boolean>(false);
  const [adminInitLoading, setAdminInitLoading] = useState<boolean>(true);
  const [adminClaimedAt, setAdminClaimedAt] = useState<string | null>(null);
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authTransitioning, setAuthTransitioning] = useState<boolean>(false);
  const [isUnauthorizedAccount, setIsUnauthorizedAccount] = useState<boolean>(false);
  const [viewingLoginPage, setViewingLoginPage] = useState<boolean>(false);

  const signingUpRef = React.useRef<boolean>(false);
  const verifyingLoginRef = React.useRef<boolean>(false);
  const unsubProfileRef = React.useRef<(() => void) | null>(null);

  // Test Firestore connection and track public non-PII admin initialization & release status
  useEffect(() => {
    testConnection();
    const unsubAdminStatus = onSnapshot(
      doc(db, 'system_config', 'admin_status'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const isLocked = data?.locked === true && data?.ownershipReleased !== true;
          const isReleased = data?.locked === false && data?.ownershipReleased === true;
          setAdminInitialized(isLocked);
          setAdminOwnershipReleased(isReleased);
          setAdminClaimedAt((data?.claimedAt as string) || null);
        } else {
          setAdminInitialized(false);
          setAdminOwnershipReleased(false);
          setAdminClaimedAt(null);
        }
        setAdminInitLoading(false);
      },
      () => {
        setAdminInitLoading(false);
      }
    );
    return () => unsubAdminStatus();
  }, []);

  const clearProfileListener = () => {
    if (unsubProfileRef.current) {
      unsubProfileRef.current();
      unsubProfileRef.current = null;
    }
  };

  const attachProfileListener = (uid: string, lockAdminVerified: boolean) => {
    clearProfileListener();
    const userDocRef = doc(db, 'users', uid);
    unsubProfileRef.current = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const snapData = { id: snap.id, ...snap.data() } as UserProfile;
          if (lockAdminVerified) {
            if (snapData.role === 'admin') {
              setProfile({ ...snapData, role: 'admin', status: 'active' });
              setIsUnauthorizedAccount(false);
            } else {
              setIsLockAdmin(false);
              if ((snapData.role as string) !== 'manager' && (snapData.role as string) !== 'billing') {
                setProfile(null);
                setIsUnauthorizedAccount(true);
              } else {
                setProfile(snapData);
                setIsUnauthorizedAccount(false);
              }
            }
          } else if ((snapData.role as string) !== 'manager' && (snapData.role as string) !== 'billing') {
            setProfile(null);
            setIsUnauthorizedAccount(true);
          } else {
            setProfile(snapData);
            setIsUnauthorizedAccount(false);
          }
        } else if (!lockAdminVerified) {
          setProfile(null);
          setIsUnauthorizedAccount(true);
        }
      },
      (err) => {
        console.warn('Profile sync warning:', err.message);
      }
    );
  };

  // Verify user's Firestore profile and check immutable /system_config/admin_lock if claiming Admin
  const resolveAuthorizedProfile = async (
    fbUser: User
  ): Promise<{ profile: UserProfile; isLockAdmin: boolean } | null> => {
    const userDocRef = doc(db, 'users', fbUser.uid);
    let userSnap = await getDoc(userDocRef);

    if (!userSnap.exists() && signingUpRef.current) {
      await new Promise((resolve) => setTimeout(resolve, 450));
      userSnap = await getDoc(userDocRef);
    }

    if (!userSnap.exists()) {
      return null;
    }

    const data = { id: userSnap.id, ...userSnap.data() } as UserProfile;

    if (data.role === 'admin') {
      try {
        const lockSnap = await getDoc(doc(db, 'system_config', 'admin_lock'));
        if (lockSnap.exists()) {
          const lockData = lockSnap.data();
          const emailLower = (fbUser.email || '').trim().toLowerCase();
          if (
            lockData.adminUid === fbUser.uid &&
            lockData.adminEmail === emailLower &&
            lockData.locked === true &&
            lockData.ownershipReleased !== true
          ) {
            return {
              profile: { ...data, role: 'admin', status: 'active' },
              isLockAdmin: true
            };
          }
        }
      } catch {
        // Admin lock is unreadable unless caller is the exact locked adminUid
      }
      return null;
    }

    if ((data.role as string) !== 'manager' && (data.role as string) !== 'billing') {
      return null;
    }

    return { profile: data, isLockAdmin: false };
  };

  // Listen to Auth State & keep current user's Firestore profile synced in real time
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (verifyingLoginRef.current && currentUser) {
        return;
      }

      clearProfileListener();

      if (currentUser) {
        setLoading(true);
        setUser(currentUser);
        setIsUnauthorizedAccount(false);
        try {
          const resolved = await resolveAuthorizedProfile(currentUser);
          if (resolved) {
            setProfile(resolved.profile);
            setIsLockAdmin(resolved.isLockAdmin);
            setIsUnauthorizedAccount(false);
            attachProfileListener(currentUser.uid, resolved.isLockAdmin);
          } else {
            setProfile(null);
            setIsLockAdmin(false);
            setIsUnauthorizedAccount(true);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setProfile(null);
          setIsLockAdmin(false);
          setIsUnauthorizedAccount(true);
        }
      } else {
        setUser(null);
        setProfile(null);
        setIsLockAdmin(false);
        setSimulatedRole(null);
        setIsUnauthorizedAccount(false);
        setViewingLoginPage(false);
      }
      setLoading(false);
    });

    return () => {
      clearProfileListener();
      unsubscribe();
    };
  }, []);

  // Helper to atomically synchronize /manager_slots/{slot_1, slot_2} in a WriteBatch
  // Enforces the hard backend limit of maximum 2 Manager accounts
  const prepareManagerSlotBatch = async (
    batch: ReturnType<typeof writeBatch>,
    action:
      | { type: 'add_or_keep'; userId: string; email: string }
      | { type: 'remove'; userId: string }
      | { type: 'sync_only' }
  ) => {
    const managersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'manager')));
    const emailMap = new Map<string, string>();
    managersSnap.docs.forEach((d) => {
      const data = d.data() as Partial<UserProfile>;
      emailMap.set(d.id, data.email || '');
    });

    if (action.type === 'add_or_keep') {
      emailMap.set(action.userId, action.email);
    } else if (action.type === 'remove') {
      emailMap.delete(action.userId);
    }

    const slot1Ref = doc(db, 'manager_slots', 'slot_1');
    const slot2Ref = doc(db, 'manager_slots', 'slot_2');
    const [slot1Snap, slot2Snap] = await Promise.all([getDoc(slot1Ref), getDoc(slot2Ref)]);

    const slotState: { slot_1: string | null; slot_2: string | null } = {
      slot_1: null,
      slot_2: null
    };

    const existing1 = slot1Snap.exists() ? (slot1Snap.data().userId as string | undefined) : undefined;
    const existing2 = slot2Snap.exists() ? (slot2Snap.data().userId as string | undefined) : undefined;

    if (existing1 && emailMap.has(existing1)) {
      slotState.slot_1 = existing1;
    }
    if (existing2 && emailMap.has(existing2) && existing2 !== slotState.slot_1) {
      slotState.slot_2 = existing2;
    }

    for (const [uid] of emailMap) {
      if (action.type === 'add_or_keep' && uid === action.userId) continue;
      if (slotState.slot_1 === uid || slotState.slot_2 === uid) continue;
      if (!slotState.slot_1) {
        slotState.slot_1 = uid;
      } else if (!slotState.slot_2) {
        slotState.slot_2 = uid;
      }
    }

    if (action.type === 'add_or_keep') {
      if (slotState.slot_1 !== action.userId && slotState.slot_2 !== action.userId) {
        if (!slotState.slot_1) {
          slotState.slot_1 = action.userId;
        } else if (!slotState.slot_2) {
          slotState.slot_2 = action.userId;
        } else {
          throw new Error(
            `Maximum limit of ${MAX_MANAGER_ACCOUNTS} Manager accounts reached. Remove or change an existing Manager role before adding another.`
          );
        }
      }
    }

    const now = new Date().toISOString();
    const pairs: Array<{
      id: 'slot_1' | 'slot_2';
      ref: ReturnType<typeof doc>;
      snap: typeof slot1Snap;
      targetUid: string | null;
    }> = [
      { id: 'slot_1', ref: slot1Ref, snap: slot1Snap, targetUid: slotState.slot_1 },
      { id: 'slot_2', ref: slot2Ref, snap: slot2Snap, targetUid: slotState.slot_2 }
    ];

    let hasChanges = false;
    for (const pair of pairs) {
      const prevUid = pair.snap.exists() ? (pair.snap.data().userId as string) : null;
      if (!pair.targetUid) {
        if (pair.snap.exists()) {
          batch.delete(pair.ref);
          hasChanges = true;
        }
      } else if (prevUid !== pair.targetUid) {
        batch.set(pair.ref, {
          userId: pair.targetUid,
          email: emailMap.get(pair.targetUid) || '',
          assignedAt: now
        });
        hasChanges = true;
      }
    }

    return hasChanges;
  };

  const syncManagerSlots = async () => {
    if (!isLockAdmin) return;
    try {
      const batch = writeBatch(db);
      const changed = await prepareManagerSlotBatch(batch, { type: 'sync_only' });
      if (changed) {
        await batch.commit();
      }
    } catch (err) {
      console.warn('Manager slot sync note:', err);
    }
  };

  // One-time secure creation of the initial Primary Admin account (transactional)
  const registerFirstAdmin = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !pass || !name.trim()) {
      throw new Error('Full name, email, and password are required.');
    }

    const statusSnap = await getDoc(doc(db, 'system_config', 'admin_status'));
    if (statusSnap.exists()) {
      const data = statusSnap.data();
      if (data?.locked === false && data?.ownershipReleased === true) {
        await registerNewAdmin(email, pass, name);
        return;
      }
      throw new Error('A Primary Admin account already exists. Only 1 Primary Admin is allowed.');
    }

    verifyingLoginRef.current = true;
    signingUpRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const now = new Date().toISOString();
      const normalizedEmail = (cred.user.email || cleanEmail).toLowerCase();
      const adminProfile: UserProfile = {
        id: cred.user.uid,
        email: cred.user.email || cleanEmail,
        name: name.trim(),
        role: 'admin',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      try {
        await runTransaction(db, async (tx) => {
          const currentStatus = await tx.get(doc(db, 'system_config', 'admin_status'));
          if (currentStatus.exists()) {
            throw new Error('Admin setup is locked: a Primary Admin account already exists.');
          }
          tx.set(doc(db, 'system_config', 'admin_lock'), {
            adminUid: cred.user.uid,
            adminEmail: normalizedEmail,
            locked: true,
            ownershipReleased: false,
            claimedAt: now
          });
          tx.set(doc(db, 'system_config', 'admin_status'), {
            locked: true,
            ownershipReleased: false,
            claimedAt: now
          });
          tx.set(doc(db, 'users', cred.user.uid), adminProfile);
        });

        setUser(cred.user);
        setProfile(adminProfile);
        setIsLockAdmin(true);
        setAdminInitialized(true);
        setAdminOwnershipReleased(false);
        setAdminClaimedAt(now);
        setIsUnauthorizedAccount(false);
        setViewingLoginPage(false);
        attachProfileListener(cred.user.uid, true);
        setLoading(false);
      } catch (err) {
        // Clean up the unclaimed Firebase Auth user if backend rejected duplicate Admin claim
        await cred.user.delete().catch(() => fbSignOut(auth));
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('already exists')) {
          throw new Error('Admin setup is locked: a Primary Admin account already exists.');
        }
        handleFirestoreError(err, OperationType.WRITE, 'system_config/admin_lock');
      }
    } finally {
      signingUpRef.current = false;
      verifyingLoginRef.current = false;
    }
  };

  // Explicit Primary Admin ownership release -> puts system into secure setup-pending state and ends session
  const releaseAdminOwnership = async () => {
    if (!isLockAdmin || !user?.uid) {
      throw new Error('Only the active Primary Admin can release Admin ownership.');
    }

    const now = new Date().toISOString();
    setAuthTransitioning(true);
    clearProfileListener();
    await new Promise((resolve) => setTimeout(resolve, 30));

    try {
      await runTransaction(db, async (tx) => {
        const lockRef = doc(db, 'system_config', 'admin_lock');
        const statusRef = doc(db, 'system_config', 'admin_status');
        const userRef = doc(db, 'users', user.uid);

        const [lockSnap, statusSnap, userSnap] = await Promise.all([
          tx.get(lockRef),
          tx.get(statusRef),
          tx.get(userRef)
        ]);

        if (!lockSnap.exists()) {
          throw new Error('Primary Admin lock record was not found.');
        }
        const lockData = lockSnap.data();
        if (lockData.adminUid !== user.uid || lockData.locked === false || lockData.ownershipReleased === true) {
          throw new Error('Primary Admin ownership is not currently locked to your account.');
        }
        if (!userSnap.exists()) {
          throw new Error('Primary Admin profile record was not found.');
        }

        const existingClaimedAt =
          (statusSnap.exists() ? (statusSnap.data().claimedAt as string) : undefined) ||
          (lockData.claimedAt as string) ||
          now;

        tx.update(lockRef, {
          locked: false,
          ownershipReleased: true,
          releasedAt: now
        });

        tx.update(statusRef, {
          locked: false,
          ownershipReleased: true,
          claimedAt: existingClaimedAt,
          releasedAt: now,
          pendingTransferUid: user.uid
        });
      });

      setAdminInitialized(false);
      setAdminOwnershipReleased(true);
      await signOut();
    } catch (err) {
      setAuthTransitioning(false);
      if (err instanceof Error && (err.message.includes('Primary Admin') || err.message.includes('lock record'))) {
        throw err;
      }
      handleFirestoreError(err, OperationType.UPDATE, 'system_config/admin_lock');
    }
  };

  // Transactional New Primary Admin registration (only valid after previous Admin explicitly released ownership)
  const registerNewAdmin = async (email: string, pass: string, name: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    if (!cleanEmail || !pass || !cleanName) {
      throw new Error('Full name, email, and password are required.');
    }

    const preCheckSnap = await getDoc(doc(db, 'system_config', 'admin_status'));
    if (!preCheckSnap.exists()) {
      await registerFirstAdmin(email, pass, name);
      return;
    }

    const preData = preCheckSnap.data();
    if (preData?.locked !== false || preData?.ownershipReleased !== true || !preData?.pendingTransferUid) {
      throw new Error(
        'New Admin registration is disabled. The current Primary Admin must explicitly release Admin ownership first.'
      );
    }

    verifyingLoginRef.current = true;
    signingUpRef.current = true;
    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, pass);
      const now = new Date().toISOString();
      const normalizedEmail = (cred.user.email || cleanEmail).toLowerCase();
      const newAdminProfile: UserProfile = {
        id: cred.user.uid,
        email: cred.user.email || cleanEmail,
        name: cleanName,
        role: 'admin',
        status: 'active',
        createdAt: now,
        updatedAt: now
      };

      try {
        await runTransaction(db, async (tx) => {
          const statusRef = doc(db, 'system_config', 'admin_status');
          const lockRef = doc(db, 'system_config', 'admin_lock');
          const statusSnap = await tx.get(statusRef);

          if (!statusSnap.exists()) {
            throw new Error('Admin transfer state is invalid.');
          }
          const statusData = statusSnap.data();
          const prevAdminUid = statusData.pendingTransferUid as string | undefined;

          if (
            statusData.locked !== false ||
            statusData.ownershipReleased !== true ||
            !prevAdminUid ||
            prevAdminUid === cred.user.uid
          ) {
            throw new Error(
              'Admin ownership is already locked by another Primary Admin. Registration rejected.'
            );
          }

          // 1. Create new Primary Admin user profile
          tx.set(doc(db, 'users', cred.user.uid), newAdminProfile);

          // 2. Lock Primary Admin singleton exclusively to the new user
          tx.set(lockRef, {
            adminUid: cred.user.uid,
            adminEmail: normalizedEmail,
            locked: true,
            ownershipReleased: false,
            claimedAt: now,
            previousAdminUid: prevAdminUid
          });

          // 3. Clear setup-pending status so no one else can register as Admin
          tx.set(statusRef, {
            locked: true,
            ownershipReleased: false,
            claimedAt: now
          });

          // 4. Automatically revoke previous Admin's privileges while preserving their user record
          tx.update(doc(db, 'users', prevAdminUid), {
            role: 'billing',
            status: 'inactive',
            updatedAt: now
          });
        });

        setUser(cred.user);
        setProfile(newAdminProfile);
        setIsLockAdmin(true);
        setAdminInitialized(true);
        setAdminOwnershipReleased(false);
        setAdminClaimedAt(now);
        setIsUnauthorizedAccount(false);
        setViewingLoginPage(false);
        attachProfileListener(cred.user.uid, true);
        setLoading(false);
      } catch (err) {
        // Roll back unclaimed Auth user if transaction failed or rules rejected duplicate/unauthorized attempt
        await cred.user.delete().catch(() => fbSignOut(auth));
        const msg = err instanceof Error ? err.message : '';
        if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('locked')) {
          throw new Error(
            'Admin ownership transfer could not be completed. Either another Admin already registered or you do not have permission.'
          );
        }
        if (msg.includes('Admin transfer state')) {
          throw err;
        }
        handleFirestoreError(err, OperationType.WRITE, 'system_config/admin_lock');
      }
    } finally {
      signingUpRef.current = false;
      verifyingLoginRef.current = false;
    }
  };

  const signInWithEmail = async (email: string, pass: string, expectedRole: UserRole) => {
    verifyingLoginRef.current = true;
    setAuthTransitioning(true);
    clearProfileListener();
    if (auth.currentUser) {
      await new Promise((resolve) => setTimeout(resolve, 30));
    }

    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const resolved = await resolveAuthorizedProfile(cred.user);

      if (!resolved) {
        await fbSignOut(auth);
        setUser(null);
        setProfile(null);
        setIsLockAdmin(false);
        setSimulatedRole(null);
        setViewingLoginPage(false);
        if (expectedRole === 'admin' && adminOwnershipReleased) {
          throw new Error(
            'Admin ownership has been released and is awaiting a new Primary Admin registration.'
          );
        }
        throw new Error('Account not authorized. Please complete initial setup or ask the Admin to create your staff account.');
      }

      if (resolved.profile.status === 'inactive' && !resolved.isLockAdmin) {
        await fbSignOut(auth);
        setUser(null);
        setProfile(null);
        setIsLockAdmin(false);
        setSimulatedRole(null);
        setViewingLoginPage(false);
        throw new Error('Your staff account has been deactivated by the Store Administrator.');
      }

      if (resolved.profile.role !== expectedRole) {
        await fbSignOut(auth);
        setUser(null);
        setProfile(null);
        setIsLockAdmin(false);
        setSimulatedRole(null);
        setViewingLoginPage(false);
        throw new Error(
          `Role mismatch: Your account is registered as "${ROLE_PERMISSIONS[resolved.profile.role].name}", not "${ROLE_PERMISSIONS[expectedRole].name}". Please select "${ROLE_PERMISSIONS[resolved.profile.role].name}" to log in.`
        );
      }

      setUser(cred.user);
      setProfile(resolved.profile);
      setIsLockAdmin(resolved.isLockAdmin);
      setSimulatedRole(null);
      setIsUnauthorizedAccount(false);
      setViewingLoginPage(false);
      attachProfileListener(cred.user.uid, resolved.isLockAdmin);
      setLoading(false);
    } finally {
      setAuthTransitioning(false);
      verifyingLoginRef.current = false;
    }
  };

  // Authorized Admin creates a new Manager (max 2) or Billing Staff (unlimited) account
  const createStaffAccount = async (
    email: string,
    pass: string,
    name: string,
    staffRole: UserRole,
    phone?: string
  ) => {
    if (!isLockAdmin) {
      throw new Error('Only the authorized Store Administrator can create staff accounts.');
    }
    if (staffRole === 'admin') {
      throw new Error('Only 1 authorized Admin account is allowed. Staff must be Manager or Billing Staff.');
    }
    if (staffRole !== 'manager' && staffRole !== 'billing') {
      throw new Error('Invalid staff role selected. Allowed roles are Manager and Billing Staff.');
    }

    if (staffRole === 'manager') {
      const managersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'manager')));
      if (managersSnap.size >= MAX_MANAGER_ACCOUNTS) {
        throw new Error(
          `Maximum limit of ${MAX_MANAGER_ACCOUNTS} Manager accounts reached. Remove or change an existing Manager before adding a third.`
        );
      }
    }

    const secondaryAuth = getSecondaryAuth();
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, pass);
    const now = new Date().toISOString();
    const newProfile: UserProfile = {
      id: cred.user.uid,
      email: cred.user.email || email,
      name: name.trim() || email.split('@')[0],
      role: staffRole,
      phone: phone?.trim() || '',
      status: 'active',
      createdAt: now,
      updatedAt: now
    };

    try {
      const batch = writeBatch(db);
      if (staffRole === 'manager') {
        await prepareManagerSlotBatch(batch, {
          type: 'add_or_keep',
          userId: cred.user.uid,
          email: newProfile.email
        });
      }
      batch.set(doc(db, 'users', cred.user.uid), newProfile);
      await batch.commit();
    } catch (err) {
      await cred.user.delete().catch(() => undefined);
      if (err instanceof Error && err.message.includes('Maximum limit')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.CREATE, `users/${cred.user.uid}`);
    } finally {
      await fbSignOut(secondaryAuth);
    }
  };

  const sendResetEmail = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const signOut = async () => {
    setAuthTransitioning(true);
    clearProfileListener();
    setUser(null);
    setProfile(null);
    setIsLockAdmin(false);
    setSimulatedRole(null);
    setIsUnauthorizedAccount(false);
    setViewingLoginPage(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    try {
      await fbSignOut(auth);
    } finally {
      setAuthTransitioning(false);
    }
  };

  // Navigate to the Login Page while keeping Firebase Auth session and Primary Admin role active
  const openLoginPage = () => {
    if (!isLockAdmin) return;
    setViewingLoginPage(true);
    if (window.location.pathname !== '/login') {
      window.history.pushState(null, '', '/login');
    }
  };

  const returnToDashboard = () => {
    setViewingLoginPage(false);
  };

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    if (!isLockAdmin) {
      throw new Error('Only the authorized Store Administrator can manage staff roles.');
    }
    if (userId === user?.uid) {
      throw new Error('Cannot change the role of the authorized Admin account.');
    }
    if (newRole === 'admin') {
      throw new Error('Cannot assign Admin privileges to another staff account. Only 1 Admin is allowed.');
    }
    if (newRole !== 'manager' && newRole !== 'billing') {
      throw new Error('Staff roles must be either Manager or Billing Staff.');
    }

    try {
      const targetRef = doc(db, 'users', userId);
      const targetSnap = await getDoc(targetRef);
      const targetEmail = targetSnap.exists() ? ((targetSnap.data() as Partial<UserProfile>).email || '') : '';

      const batch = writeBatch(db);
      if (newRole === 'manager') {
        await prepareManagerSlotBatch(batch, {
          type: 'add_or_keep',
          userId,
          email: targetEmail
        });
      } else {
        await prepareManagerSlotBatch(batch, {
          type: 'remove',
          userId
        });
      }

      batch.update(targetRef, {
        role: newRole,
        updatedAt: new Date().toISOString()
      });
      await batch.commit();
    } catch (err) {
      if (err instanceof Error && err.message.includes('Maximum limit')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const updateStaffMember = async (
    userId: string,
    updates: Partial<Pick<UserProfile, 'name' | 'role' | 'status' | 'phone'>>
  ) => {
    if (!isLockAdmin) {
      throw new Error('Only the authorized Store Administrator can manage staff accounts.');
    }
    if (userId !== user?.uid && updates.role === 'admin') {
      throw new Error('Cannot grant Admin privileges to staff accounts. Only 1 Admin is allowed.');
    }
    if (userId !== user?.uid && updates.role && updates.role !== 'manager' && updates.role !== 'billing') {
      throw new Error('Staff roles must be either Manager or Billing Staff.');
    }

    const sanitizedUpdates =
      userId === user?.uid
        ? { ...updates, role: 'admin' as const, status: 'active' as const }
        : updates;

    try {
      const targetRef = doc(db, 'users', userId);
      const targetSnap = await getDoc(targetRef);
      const existingData = targetSnap.exists() ? (targetSnap.data() as Partial<UserProfile>) : {};
      const nextRole = sanitizedUpdates.role || existingData.role;

      const batch = writeBatch(db);
      if (userId !== user?.uid) {
        if (nextRole === 'manager') {
          await prepareManagerSlotBatch(batch, {
            type: 'add_or_keep',
            userId,
            email: existingData.email || ''
          });
        } else if (existingData.role === 'manager' && nextRole) {
          await prepareManagerSlotBatch(batch, {
            type: 'remove',
            userId
          });
        }
      }

      batch.update(targetRef, {
        ...sanitizedUpdates,
        updatedAt: new Date().toISOString()
      });
      await batch.commit();

      if (userId === user?.uid && profile) {
        setProfile({ ...profile, ...sanitizedUpdates });
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes('Maximum limit')) {
        throw err;
      }
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
    }
  };

  const deleteStaffProfile = async (userId: string) => {
    if (!isLockAdmin || userId === user?.uid) {
      throw new Error('Only the authorized Store Administrator can remove staff profiles.');
    }
    try {
      const batch = writeBatch(db);
      await prepareManagerSlotBatch(batch, { type: 'remove', userId });
      batch.delete(doc(db, 'users', userId));
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${userId}`);
    }
  };

  // Allows the newly configured Admin to clear stale pre-reset Admin/Manager role records cleanly
  const cleanupPreResetAdminManagers = async (targetIds: string[]) => {
    if (!isLockAdmin || !user?.uid) {
      throw new Error('Only the authorized Store Administrator can clean up role records.');
    }
    const safeTargets = targetIds.filter((id) => id && id !== user.uid);
    if (safeTargets.length === 0) return;

    try {
      const batch = writeBatch(db);
      for (const id of safeTargets) {
        batch.delete(doc(db, 'users', id));
      }

      // Also clear any manager slots pointing to deleted or non-current managers
      const slot1Ref = doc(db, 'manager_slots', 'slot_1');
      const slot2Ref = doc(db, 'manager_slots', 'slot_2');
      const [slot1Snap, slot2Snap] = await Promise.all([getDoc(slot1Ref), getDoc(slot2Ref)]);
      if (slot1Snap.exists() && safeTargets.includes(slot1Snap.data().userId as string)) {
        batch.delete(slot1Ref);
      }
      if (slot2Snap.exists() && safeTargets.includes(slot2Snap.data().userId as string)) {
        batch.delete(slot2Ref);
      }

      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'users/cleanup');
    }
  };

  const rawProfileRole: UserRole =
    profile?.role === 'manager' || profile?.role === 'billing' ? profile.role : 'billing';
  const safeProfileRole: UserRole = isLockAdmin ? 'admin' : rawProfileRole;
  const effectiveRole: UserRole = isLockAdmin && simulatedRole ? simulatedRole : safeProfileRole;
  const isAccountDisabled = Boolean(profile && profile.status === 'inactive' && !isLockAdmin);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role: effectiveRole,
        isAuthorizedAdmin: isLockAdmin,
        adminInitialized,
        adminOwnershipReleased,
        adminInitLoading,
        adminClaimedAt,
        simulatedRole,
        setSimulatedRole,
        loading,
        authTransitioning,
        isAccountDisabled,
        isUnauthorizedAccount,
        registerFirstAdmin,
        registerNewAdmin,
        releaseAdminOwnership,
        signInWithEmail,
        createStaffAccount,
        sendResetEmail,
        signOut,
        viewingLoginPage,
        openLoginPage,
        returnToDashboard,
        updateUserRole,
        updateStaffMember,
        deleteStaffProfile,
        syncManagerSlots,
        cleanupPreResetAdminManagers
      }}
    >
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
