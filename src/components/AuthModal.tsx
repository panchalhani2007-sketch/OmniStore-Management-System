import React, { useEffect, useState } from 'react';
import {
  Store,
  Lock,
  Mail,
  User,
  ShieldCheck,
  Briefcase,
  ShoppingCart,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/store';

const LOGIN_ROLES: Array<{
  id: UserRole;
  label: string;
  subtitle: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  {
    id: 'admin',
    label: 'Admin',
    subtitle: '1 Authorized',
    icon: ShieldCheck
  },
  {
    id: 'manager',
    label: 'Manager',
    subtitle: 'Max 2 Staff',
    icon: Briefcase
  },
  {
    id: 'billing',
    label: 'Billing Staff',
    subtitle: 'Cashier & POS',
    icon: ShoppingCart
  }
];

export const AuthModal: React.FC = () => {
  const {
    adminInitialized,
    adminInitLoading,
    registerFirstAdmin,
    signInWithEmail,
    signUpWithEmail,
    sendResetEmail
  } = useAuth();

  const [mode, setMode] = useState<'setup_admin' | 'signin' | 'signup' | 'forgot'>('signin');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [registerRole, setRegisterRole] = useState<UserRole>('billing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Automatically default to Initial Admin Setup when no Admin has been configured yet
  useEffect(() => {
    if (adminInitLoading) return;
    if (!adminInitialized) {
      setMode('setup_admin');
    } else if (mode === 'setup_admin') {
      setMode('signin');
    }
  }, [adminInitialized, adminInitLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (mode === 'setup_admin') {
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setLoading(true);
    try {
      if (mode === 'setup_admin') {
        await registerFirstAdmin(email, password, name);
      } else if (mode === 'signin') {
        await signInWithEmail(email, password, selectedRole);
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password, name, registerRole);
      } else if (mode === 'forgot') {
        await sendResetEmail(email);
        setSuccessMsg('Password reset email sent! Check your inbox.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      if (msg.includes('user-not-found') || msg.includes('invalid-credential')) {
        setError('Invalid email or password. Please check your credentials.');
      } else if (msg.includes('email-already-in-use')) {
        setError('This email is already registered. Please sign in instead.');
      } else if (msg.includes('weak-password')) {
        setError('Password should be at least 6 characters.');
      } else if (msg.includes('auth/operation-not-allowed') || msg.includes('operation-not-allowed')) {
        setError('Email/password sign-in is not enabled in Firebase Console. Please contact your Store Administrator.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient decorative glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 sm:p-8 z-10 text-slate-100">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 items-center justify-center shadow-xl shadow-indigo-600/30 text-white mb-3">
            <Store className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">OmniStore POS</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time Retail &amp; Multi-Role Inventory Management
          </p>
        </div>

        {/* Initial Admin Setup Banner (Shown ONLY before the first Admin account is created) */}
        {!adminInitLoading && !adminInitialized && (
          <div className="mb-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-white">Fresh Setup: No Admin Configured</p>
              <p className="text-[11px] text-indigo-200/80 mt-0.5">
                Create the first and only authorized Admin account below. Once created, Admin registration locks permanently.
              </p>
            </div>
          </div>
        )}

        {/* Mode Selector Tabs */}
        {mode === 'forgot' ? (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => { setMode(adminInitialized ? 'signin' : 'setup_admin'); setError(null); setSuccessMsg(null); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              ← Back
            </button>
          </div>
        ) : !adminInitLoading && !adminInitialized ? (
          <div className="grid grid-cols-3 p-1 bg-slate-800/80 rounded-xl mb-4 border border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('setup_admin'); setError(null); setSuccessMsg(null); }}
              className={`py-1.5 rounded-lg transition ${mode === 'setup_admin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Admin Setup
            </button>
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
              className={`py-1.5 rounded-lg transition ${mode === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
              className={`py-1.5 rounded-lg transition ${mode === 'signup' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Register Staff
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl mb-4 border border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSuccessMsg(null); }}
              className={`py-1.5 rounded-lg transition ${mode === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
              className={`py-1.5 rounded-lg transition ${mode === 'signup' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Register Staff
            </button>
          </div>
        )}

        {/* Error / Success Notifications */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs mb-4">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs mb-4">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signin' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">Select Role</label>
              <div className="grid grid-cols-3 gap-2">
                {LOGIN_ROLES.map((roleOpt) => {
                  const Icon = roleOpt.icon;
                  const active = selectedRole === roleOpt.id;
                  return (
                    <button
                      key={roleOpt.id}
                      type="button"
                      onClick={() => {
                        setSelectedRole(roleOpt.id);
                        setError(null);
                      }}
                      className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 ${
                        active
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-600/15'
                          : 'bg-slate-800/70 border-slate-700/80 text-slate-400 hover:text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                      <span className="text-[11px] font-semibold leading-tight">{roleOpt.label}</span>
                      <span className="text-[9px] text-slate-400 leading-tight">{roleOpt.subtitle}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {(mode === 'signup' || mode === 'setup_admin') && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                {mode === 'setup_admin' ? 'Admin Full Name' : 'Full Name'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Enter full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {mode === 'setup_admin' ? 'Authorized Admin Email' : 'Work Email'}
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-medium text-slate-300">Password</label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setError(null); setSuccessMsg(null); }}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {mode === 'setup_admin' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Confirm Admin Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assigned Store Role</label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={registerRole}
                  onChange={(e) => {
                    setRegisterRole(e.target.value as UserRole);
                    setError(null);
                  }}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="admin">Admin</option>
                  <option value="manager">Manager</option>
                  <option value="billing">Billing Staff</option>
                </select>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                {registerRole === 'admin'
                  ? adminInitialized
                    ? 'Locked: An authorized Admin account already exists (1 account max).'
                    : 'No Admin configured yet. Registering will lock this account as the single authorized Admin.'
                  : registerRole === 'manager'
                    ? 'Manager role (max 2 accounts) can only be assigned by the authorized Admin in Staff & Roles.'
                    : 'Admin and Manager roles can only be assigned by the authorized Admin. Standard staff register as Billing Staff.'}
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || adminInitLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <span>Verifying Access...</span>
            ) : mode === 'setup_admin' ? (
              <>
                <span>Create First Authorized Admin</span>
                <ShieldCheck className="w-4 h-4" />
              </>
            ) : mode === 'signin' ? (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4" />
              </>
            ) : mode === 'signup' ? (
              <>
                <span>Create Staff Account</span>
                <CheckCircle2 className="w-4 h-4" />
              </>
            ) : (
              <>
                <span>Send Reset Link</span>
                <KeyRound className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
