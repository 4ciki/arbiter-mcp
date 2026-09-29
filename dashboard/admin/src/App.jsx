import { useState, useEffect } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth }        from './hooks/useAuth';
import { db }             from './firebase';
import ArbiterLogo        from './components/ArbiterLogo';
import LoginScreen        from './pages/LoginScreen';
import OnboardingWizard   from './pages/OnboardingWizard';
import Dashboard          from './pages/Dashboard';
import { Toaster }        from 'react-hot-toast';

/**
 * Global Cloud-Ready Auth & Routing Flow (Zero localStorage):
 *
 * 1. App loading / Auth initializing:
 *    Show full-screen Arbiter loading screen.
 *
 * 2. No authenticated user:
 *    Render Google LoginScreen.
 *
 * 3. Authenticated user (fresh login or restored on refresh):
 *    Keep loading screen active while verifying configuration in Firestore.
 *    - If configured (existing user with saved credentials) -> Direct to Dashboard.
 *    - If not configured (brand new user) -> OnboardingWizard.
 *
 * Zero localStorage is used: works across any device, browser, or hosted instance globally.
 */

export default function App() {
  const { user, loading: authLoading, signIn, signOutUser } = useAuth();

  // configStatus: 'checking' | 'configured' | 'unconfigured'
  const [configStatus, setConfigStatus] = useState('checking');
  const [checkedUid, setCheckedUid]     = useState(null);

  useEffect(() => {
    // Wait until Firebase Auth determines whether a user is logged in
    if (authLoading) return;

    // No user logged in
    if (!user) {
      setConfigStatus('unconfigured');
      setCheckedUid(null);
      return;
    }

    // New user session or account switch: start checking in Firestore
    setConfigStatus('checking');
    setCheckedUid(user.uid);

    let isMounted = true;
    const API_BASE = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '') || 'https://arbiter-mcp.onrender.com').replace(/\/$/, '');

    // 1. Check backend database first
    fetch(`${API_BASE}/api/user-config?uid=${encodeURIComponent(user.uid)}`)
      .then(r => r.json())
      .then(dbCfg => {
        if (dbCfg && (dbCfg.configured || dbCfg.jira?.site_url || dbCfg.llm?.api_key || dbCfg.groq?.api_key)) {
          if (isMounted) setConfigStatus('configured');
        }
      })
      .catch(() => {});

    const credsRef   = doc(db, 'users', user.uid, 'config', 'credentials');
    const sessionRef = doc(db, 'sessions', user.uid);
    const userRef    = doc(db, 'users', user.uid);

    let credsData   = null;
    let sessionData = null;
    let userData    = null;

    const evaluateConfig = (creds, sess, uData) => {
      const isConfigured = Boolean(
        creds?.configured === true ||
        sess?.configured === true ||
        uData?.configured === true ||
        creds?.jira?.site_url ||
        creds?.llm?.api_key ||
        creds?.groq?.api_key ||
        creds?.deploy?.backend_url ||
        creds?.database?.sqlite_path
      );

      if (isMounted) {
        setConfigStatus(isConfigured ? 'configured' : 'unconfigured');
      }
    };

    // Listen to credentials document
    const unsubCreds = onSnapshot(
      credsRef,
      (snap) => {
        credsData = snap.exists() ? snap.data() : null;
        evaluateConfig(credsData, sessionData, userData);
      },
      async (err) => {
        console.warn('Credentials snapshot error (will attempt fallback read):', err);
        try {
          const [cSnap, sSnap, uSnap] = await Promise.all([
            getDoc(credsRef).catch(() => null),
            getDoc(sessionRef).catch(() => null),
            getDoc(userRef).catch(() => null),
          ]);
          credsData   = cSnap?.exists() ? cSnap.data() : null;
          sessionData = sSnap?.exists() ? sSnap.data() : null;
          userData    = uSnap?.exists() ? uSnap.data() : null;
          evaluateConfig(credsData, sessionData, userData);
        } catch (_) {
          if (isMounted) setConfigStatus('unconfigured');
        }
      }
    );

    // Listen to session document
    const unsubSession = onSnapshot(
      sessionRef,
      (snap) => {
        sessionData = snap.exists() ? snap.data() : null;
        evaluateConfig(credsData, sessionData, userData);
      },
      () => {}
    );

    return () => {
      isMounted = false;
      unsubCreds();
      unsubSession();
    };
  }, [user?.uid, authLoading]);

  // Sign out cleanly
  const handleSignOut = () => {
    setConfigStatus('checking');
    setCheckedUid(null);
    signOutUser();
  };

  // When completing the onboarding wizard
  const handleOnboardingComplete = () => {
    setConfigStatus('configured');
  };

  // ── Render resolution ──────────────────────────────────────────────────
  // Show full-screen loading spinner whenever auth is settling or config is being checked.
  // This guarantees ZERO flash of the Onboarding Wizard on reload/refresh.
  const isResolving = authLoading || (user && (configStatus === 'checking' || checkedUid !== user.uid));

  if (isResolving) {
    return <ArbiterLogo loading />;
  }

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#FFFFFF', border: '1px solid #E4E9F2',
          color: '#0F172A', fontFamily: "'Inter',sans-serif", fontSize: 13,
          boxShadow: '0 8px 24px rgba(15,23,42,0.1)', borderRadius: 10,
        },
        success: { iconTheme: { primary: '#059669', secondary: '#ECFDF5' } },
        error:   { iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' } },
      }} />

      {/* 1. Not signed in: show Google sign-in */}
      {!user && <LoginScreen signIn={signIn} />}

      {/* 2. Signed in + brand new user (never configured): show OnboardingWizard */}
      {user && configStatus === 'unconfigured' && (
        <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />
      )}

      {/* 3. Signed in + existing configured user: direct to Dashboard */}
      {user && configStatus === 'configured' && (
        <Dashboard user={user} signOut={handleSignOut} />
      )}
    </>
  );
}