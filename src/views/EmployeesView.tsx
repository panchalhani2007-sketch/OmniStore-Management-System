import React, { useEffect, useState } from 'react';
import { 
  UserPlus, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Shield,
  Check,
  X,
  Edit,
  Trash2,
  Power,
  LogOut,
  KeyRound
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { useAuth } from '../context/AuthContext';
import {
  MAX_ADMIN_ACCOUNTS,
  MAX_MANAGER_ACCOUNTS,
  ROLE_PERMISSIONS,
  UserProfile,
  UserRole
} from '../types/store';

export const EmployeesView: React.FC = () => {
  const { employees } = useStore();
  const { 
    user, 
    profile, 
    role, 
    isAuthorizedAdmin,
    createStaffAccount, 
    updateUserRole, 
    updateStaffMember, 
    deleteStaffProfile,
    syncManagerSlots,
    cleanupPreResetAdminManagers,
    releaseAdminOwnership
  } = useAuth();

  // Add Staff modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('billing');

  // Edit Staff modal states
  const [editingStaff, setEditingStaff] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('billing');
  const [editStatus, setEditStatus] = useState<'active' | 'inactive'>('active');

  // Delete Staff confirmation modal
  const [deletingStaff, setDeletingStaff] = useState<UserProfile | null>(null);

  const [isReleasingOwnership, setIsReleasingOwnership] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManageRoles = role === 'admin' && isAuthorizedAdmin;

  // Only flag stray secondary Admin role records (valid Managers & Billing Staff are preserved across Admin transfers)
  const stalePreResetRecords = React.useMemo(() => {
    if (!canManageRoles || !user?.uid) return [];
    return employees.filter((e) => e.id !== user.uid && e.role === 'admin');
  }, [canManageRoles, employees, user?.uid]);

  useEffect(() => {
    if (canManageRoles && employees.length > 0 && stalePreResetRecords.length === 0) {
      syncManagerSlots();
    }
  }, [canManageRoles, employees.length, stalePreResetRecords.length]);

  const managerCount = employees.filter((e) => e.role === 'manager').length;
  const billingCount = employees.filter((e) => e.role === 'billing').length;
  const isManagerLimitReached = managerCount >= MAX_MANAGER_ACCOUNTS;

  const handleCleanupPreReset = async () => {
    try {
      setPageError(null);
      await cleanupPreResetAdminManagers(stalePreResetRecords.map((r) => r.id));
      setSuccess(
        `Removed ${stalePreResetRecords.length} stale pre-reset Admin/Manager role record(s). Billing Staff and store data were preserved.`
      );
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to clean up stale records');
    }
  };

  const handleRoleChange = async (targetUserId: string, updatedRole: UserRole) => {
    try {
      setPageError(null);
      await updateUserRole(targetUserId, updatedRole);
      setSuccess('Staff role updated successfully.');
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to update role');
    }
  };

  const handleToggleStatus = async (emp: UserProfile) => {
    if (emp.id === user?.uid) {
      setPageError('You cannot deactivate your own currently signed-in admin account.');
      return;
    }
    try {
      setPageError(null);
      const nextStatus = emp.status === 'inactive' ? 'active' : 'inactive';
      await updateStaffMember(emp.id, { status: nextStatus });
      setSuccess(`${emp.name} is now ${nextStatus === 'active' ? 'Active' : 'Inactive'}.`);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to update account status');
    }
  };

  const openEditModal = (emp: UserProfile) => {
    setEditingStaff(emp);
    setEditName(emp.name);
    setEditPhone(emp.phone || '');
    const safeRole: UserRole =
      emp.role === 'admin' && emp.id !== user?.uid ? 'billing' : emp.role;
    setEditRole(safeRole);
    setEditStatus(emp.status || 'active');
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff || !editName.trim()) {
      setError('Staff name is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const isTargetCurrentAdmin = editingStaff.id === user?.uid && isAuthorizedAdmin;
      await updateStaffMember(editingStaff.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        role: isTargetCurrentAdmin ? 'admin' : (editRole === 'admin' ? 'billing' : editRole),
        status: editingStaff.id === user?.uid ? 'active' : editStatus
      });
      setSuccess(`Updated staff profile for ${editName.trim()}.`);
      setEditingStaff(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update staff account');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newPass.trim() || !newName.trim()) {
      setError('Name, email, and password are required.');
      return;
    }
    if (newPass.trim().length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await createStaffAccount(newEmail.trim(), newPass.trim(), newName.trim(), newRole, newPhone.trim());
      setSuccess(`Created ${ROLE_PERMISSIONS[newRole].name} account for ${newName.trim()} (${newEmail.trim()})!`);
      setIsInviteModalOpen(false);
      setNewEmail('');
      setNewPass('');
      setNewName('');
      setNewPhone('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create staff account';
      if (msg.includes('email-already-in-use')) {
        setError('This email is already registered in Firebase Auth.');
      } else if (msg.includes('operation-not-allowed')) {
        setError('Email/Password sign-in is disabled in Firebase Authentication Console.');
      } else {
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingStaff) return;
    if (deletingStaff.id === user?.uid) {
      setPageError('You cannot delete your own active Admin account.');
      setDeletingStaff(null);
      return;
    }
    try {
      setPageError(null);
      await deleteStaffProfile(deletingStaff.id);
      setSuccess(`Removed ${deletingStaff.name} from the store staff directory.`);
      setDeletingStaff(null);
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to remove staff profile');
      setDeletingStaff(null);
    }
  };

  const handleConfirmReleaseOwnership = async () => {
    try {
      setIsReleasingOwnership(true);
      setPageError(null);
      await releaseAdminOwnership();
    } catch (err: unknown) {
      setPageError(err instanceof Error ? err.message : 'Failed to release Admin ownership');
    } finally {
      setIsReleasingOwnership(false);
    }
  };

  const displayEmployees = employees.length > 0 ? employees : (profile ? [profile] : []);

  if (!canManageRoles) {
    return (
      <div className="p-8 rounded-2xl bg-slate-900 border border-rose-500/30 text-center space-y-3 max-w-lg mx-auto my-8">
        <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-white">Authorized Administrator Only</h3>
        <p className="text-xs text-slate-400">
          Access to Staff &amp; Role management is strictly restricted to the authorized store administrator account.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Staff &amp; Role-Based Access (RBAC)</h2>
          <p className="text-xs text-slate-400">
            Manage store employee accounts, status, and security permissions across Admin (max 1), Manager (max 2), and Billing Staff (unlimited)
          </p>
        </div>
        {canManageRoles && (
          <button
            onClick={() => { setError(null); setSuccess(null); setIsInviteModalOpen(true); }}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add New Employee</span>
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess(null)} className="text-emerald-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {pageError && (
        <div className="flex items-center justify-between gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{pageError}</span>
          </div>
          <button onClick={() => setPageError(null)} className="text-rose-300 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {stalePreResetRecords.length > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <p className="font-semibold text-amber-300">
              {stalePreResetRecords.length} Old Pre-Reset Admin/Manager Role Record(s) Found
            </p>
            <p className="text-amber-200/80">
              {stalePreResetRecords.map((r) => `${r.email} (${r.role})`).join(', ')} — remove these stale records so your 2 Manager slots are free. Billing Staff and business data will not be touched.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCleanupPreReset}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold shrink-0 transition"
          >
            Clean Up Old Records
          </button>
        </div>
      )}

      {/* Role Capacity Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Admin Limit</span>
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
              Locked (1 Max)
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono">1 / {MAX_ADMIN_ACCOUNTS}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Single authorized Store Administrator</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Manager Accounts</span>
            <span
              className={`px-2 py-0.5 rounded-md border text-[10px] font-semibold ${
                isManagerLimitReached
                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
              }`}
            >
              {isManagerLimitReached ? 'Limit Reached (2/2)' : `${MAX_MANAGER_ACCOUNTS - managerCount} Slot Left`}
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {managerCount} / {MAX_MANAGER_ACCOUNTS}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Inventory, Add Product &amp; Categories</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Billing Staff</span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
              Unlimited
            </span>
          </div>
          <div className="text-xl font-bold text-white font-mono">{billingCount} Active/Total</div>
          <p className="text-[11px] text-slate-400 mt-0.5">POS Billing, Returns, Sales &amp; Customers</p>
        </div>
      </div>

      {/* Primary Admin Session & Change Admin Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-rose-400" />
            <h3 className="font-bold text-white text-sm">Primary Admin Session &amp; Change Admin</h3>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl">
            Signed in as Primary Admin <strong className="text-slate-200">{profile?.name || user?.email}</strong> ({user?.email}). Clicking <strong className="text-slate-200">Logout</strong> releases your Primary Admin role, signs you out, and opens the New Admin Registration form while preserving all store records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            disabled={isReleasingOwnership}
            onClick={handleConfirmReleaseOwnership}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/30 text-xs font-semibold transition disabled:opacity-50"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>{isReleasingOwnership ? 'Logging out...' : 'Logout'}</span>
          </button>
        </div>
      </div>

      {/* Employees Directory Table */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-white text-base">Store Team Directory</h3>
            <p className="text-xs text-slate-400">Real-time synchronized staff roster in Firestore</p>
          </div>
          <div className="text-xs text-slate-400">
            Total Staff: <span className="font-semibold text-white">{displayEmployees.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Email &amp; Phone</th>
                <th className="py-2.5 px-3">Assigned Role</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Registered Date</th>
                {canManageRoles && (
                  <th className="py-2.5 px-3 text-right">Manage Staff</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayEmployees.map((emp) => {
                const roleConfig = ROLE_PERMISSIONS[emp.role] || ROLE_PERMISSIONS.billing;
                const isCurrentUser = emp.id === user?.uid;
                const isActive = emp.status !== 'inactive';

                return (
                  <tr key={emp.id} className="hover:bg-slate-800/40 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white font-bold text-xs uppercase shadow">
                          {emp.name ? emp.name.charAt(0) : 'U'}
                        </div>
                        <div>
                          <span className="font-semibold text-white block">
                            {emp.name} {isCurrentUser && <span className="text-indigo-400 text-[10px] font-normal">(You)</span>}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">UID: {emp.id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      <div>{emp.email}</div>
                      {emp.phone && <div className="text-[10px] text-slate-500 font-mono">{emp.phone}</div>}
                    </td>
                    <td className="py-3 px-3">
                      {canManageRoles && !isCurrentUser && emp.role !== 'admin' ? (
                        <select
                          value={emp.role === 'manager' ? 'manager' : 'billing'}
                          onChange={(e) => handleRoleChange(emp.id, e.target.value as UserRole)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-indigo-500"
                        >
                          <option value="manager" disabled={emp.role !== 'manager' && isManagerLimitReached}>
                            Manager{emp.role !== 'manager' && isManagerLimitReached ? ' (Max 2 Reached)' : ''}
                          </option>
                          <option value="billing">Billing Staff</option>
                        </select>
                      ) : (
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${roleConfig.color}`}>
                          <Shield className="w-3 h-3" />
                          <span>{roleConfig.name}</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" />
                          <span>Inactive</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {emp.createdAt ? new Date(emp.createdAt).toLocaleDateString() : 'Active Member'}
                    </td>
                    {canManageRoles && (
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            title="Edit Staff Details"
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-indigo-400 border border-slate-700 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          {!isCurrentUser && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(emp)}
                                title={isActive ? 'Deactivate Staff Access' : 'Activate Staff Access'}
                                className={`p-1.5 rounded-lg border transition ${
                                  isActive
                                    ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-400 hover:text-amber-400 border-slate-700'
                                    : 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border-emerald-500/30'
                                }`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeletingStaff(emp)}
                                title="Remove Staff Profile"
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 transition"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role Permission Matrix Card */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div>
          <h3 className="font-bold text-white text-base">Store Role Permissions Matrix</h3>
          <p className="text-xs text-slate-400">Security capabilities granted to each operational tier</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Capability / Operation</th>
                <th className="py-2.5 px-3 text-center text-rose-400">Admin (1 Max)</th>
                <th className="py-2.5 px-3 text-center text-indigo-400">Manager (2 Max)</th>
                <th className="py-2.5 px-3 text-center text-emerald-400">Billing Staff (Unlimited)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">POS Billing &amp; Sales Checkout</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Return &amp; Refund Processing</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Sales &amp; Receipts History</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Customers Management</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Inventory &amp; Stock Adjustments</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Products / Add Product &amp; Categories</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-medium text-white">Staff &amp; Roles Management</td>
                <td className="py-2.5 px-3 text-center text-emerald-400 font-bold">✓</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                <td className="py-2.5 px-3 text-center text-slate-600">—</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff Account Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">Add New Store Staff</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="space-y-3.5 text-xs">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Staff Member Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. David Miller"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Work Email *</label>
                <input
                  type="email"
                  required
                  placeholder="david@omnistore.internal"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Initial Password *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Store Operational Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="billing">Billing Staff (POS Billing, Returns, Sales, Customers — Unlimited)</option>
                  <option value="manager" disabled={isManagerLimitReached}>
                    Manager (Inventory, Add Product, Categories — {managerCount}/{MAX_MANAGER_ACCOUNTS})
                  </option>
                </select>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Creating...' : 'Register Employee'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Staff Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-white text-base">Edit Staff Account</h3>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {error && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              {editingStaff.id !== user?.uid && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Role</label>
                    <select
                      value={editRole === 'manager' ? 'manager' : 'billing'}
                      onChange={(e) => setEditRole(e.target.value as UserRole)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                    >
                      <option
                        value="manager"
                        disabled={editingStaff.role !== 'manager' && isManagerLimitReached}
                      >
                        Manager{editingStaff.role !== 'manager' && isManagerLimitReached ? ' (Max 2 Reached)' : ''}
                      </option>
                      <option value="billing">Billing Staff</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-medium mb-1">Account Status</label>
                    <select
                      value={editStatus}
                      onChange={(e) => setEditStatus(e.target.value as 'active' | 'inactive')}
                      className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white focus:outline-hidden focus:border-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive (Locked)</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  disabled={isSubmitting}
                  className="flex-1 py-2 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Staff Confirmation Modal */}
      {deletingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl p-5 text-slate-100">
            <h4 className="font-bold text-base text-white mb-2">Remove Staff Member?</h4>
            <p className="text-xs text-slate-400 mb-4">
              This will remove <strong className="text-white">{deletingStaff.name}</strong> ({deletingStaff.email}) from the store staff directory. Historical bills processed by them will be preserved.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeletingStaff(null)}
                className="flex-1 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
              >
                Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
