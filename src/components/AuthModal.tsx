import React, { useState } from 'react';
import { 
  Store, 
  Lock, 
  Mail, 
  User, 
  ShieldCheck, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/store';

export const AuthModal: React.FC = () => {
  const { signInWithGoogle, signInWithEmail, signUpWithEmail, sendResetEmail } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email, password);
      } else if (mode === 'signup') {
        await signUpWithEmail(email, password, name, role);
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
        setError('Email/password sign-in is not enabled in Firebase Console. Please sign in using "Continue with Google" above.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const success = await signInWithGoogle();
      if (!success) {
        setError('Sign-in cancelled: The Google sign-in window was closed before completing. Click "Continue with Google" to try again.');
      }
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (
        fbErr.code === 'auth/popup-closed-by-user' ||
        fbErr.code === 'auth/cancelled-popup-request' ||
        fbErr.message?.includes('popup-closed-by-user') ||
        fbErr.message?.includes('cancelled-popup-request')
      ) {
        setError('Sign-in cancelled: The Google popup window was closed. Click below to try again.');
      } else if (fbErr.code === 'auth/popup-blocked' || fbErr.message?.includes('popup-blocked')) {
        setError('Sign-in popup was blocked by your browser. Please allow popups for this site and try again.');
      } else {
        console.warn('Google sign-in status:', fbErr.message);
        setError(fbErr.message || 'Google sign-in could not be completed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Demo Fast Credentials
  const handleDemoSignIn = async (demoRole: UserRole) => {
    setError(null);
    setLoading(true);
    const demoAccounts: Record<UserRole, { email: string; pass: string; name: string }> = {
      admin: { email: 'admin@omnistore.internal', pass: 'Admin#2026', name: 'Store Owner' },
      manager: { email: 'manager@omnistore.internal', pass: 'Manager#2026', name: 'Operations Manager' },
      billing: { email: 'cashier@omnistore.internal', pass: 'Cashier#2026', name: 'Head Cashier' },
      inventory: { email: 'stock@omnistore.internal', pass: 'Stock#2026', name: 'Inventory Specialist' },
    };

    const acc = demoAccounts[demoRole];
    try {
      await signInWithEmail(acc.email, acc.pass);
    } catch (err: unknown) {
      const fbErr = err as { code?: string; message?: string };
      if (fbErr.code === 'auth/operation-not-allowed' || fbErr.message?.includes('operation-not-allowed')) {
        setError('Email/password provider is not yet enabled in your Firebase project. Please use "Continue with Google" above to sign in securely.');
        setLoading(false);
        return;
      }
      // If demo account not yet created, attempt to sign it up automatically
      try {
        await signUpWithEmail(acc.email, acc.pass, acc.name, demoRole);
      } catch (signupErr: unknown) {
        const sErr = signupErr as { code?: string; message?: string };
        if (sErr.code === 'auth/operation-not-allowed' || sErr.message?.includes('operation-not-allowed')) {
          setError('Email/password provider is not enabled in Firebase Console. Please sign in using "Continue with Google" above.');
        } else {
          setError(sErr.message || 'Could not authenticate with demo credentials. Please use "Continue with Google".');
        }
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

        {/* Google One-Click Login */}
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          type="button"
          className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-sm flex items-center justify-center gap-3 transition shadow-md active:scale-98 disabled:opacity-50 mb-4"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          <span>Continue with Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Or with Email</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {/* Mode Selector Tabs */}
        {mode !== 'forgot' ? (
          <div className="grid grid-cols-2 p-1 bg-slate-800/80 rounded-xl mb-4 border border-slate-700/60 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className={`py-1.5 rounded-lg transition ${mode === 'signin' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`py-1.5 rounded-lg transition ${mode === 'signup' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              Register Staff
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); }}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
            >
              ← Back to Sign In
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
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Morgan"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="email"
                required
                placeholder="staff@omnistore.internal"
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
                    onClick={() => { setMode('forgot'); setError(null); }}
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Store Role</label>
              <div className="relative">
                <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="admin">Admin (Full Access &amp; Staff)</option>
                  <option value="manager">Manager (Inventory, POS, Reports)</option>
                  <option value="billing">Billing Staff (Cashier &amp; POS)</option>
                  <option value="inventory">Inventory Staff (Stock &amp; Intake)</option>
                </select>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition active:scale-98 disabled:opacity-50"
          >
            {loading ? (
              <span>Processing...</span>
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

        {/* Demo Fast Login Cards */}
        <div className="mt-6 pt-5 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>1-Click Demo Accounts (Instant Testing):</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              onClick={() => handleDemoSignIn('admin')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition"
            >
              <span className="font-semibold text-rose-400 block">👑 Admin</span>
              <span className="text-[10px] text-slate-400">Full Store Access</span>
            </button>
            <button
              onClick={() => handleDemoSignIn('manager')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition"
            >
              <span className="font-semibold text-indigo-400 block">💼 Manager</span>
              <span className="text-[10px] text-slate-400">Sales &amp; Inventory</span>
            </button>
            <button
              onClick={() => handleDemoSignIn('billing')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition"
            >
              <span className="font-semibold text-emerald-400 block">💳 Cashier</span>
              <span className="text-[10px] text-slate-400">POS &amp; Receipts</span>
            </button>
            <button
              onClick={() => handleDemoSignIn('inventory')}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-left transition"
            >
              <span className="font-semibold text-amber-400 block">📦 Inventory</span>
              <span className="text-[10px] text-slate-400">Stock &amp; Intake</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
