import { useState, useEffect, useRef } from 'react';
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
 * 1. App loading / Auth initializing  →  full-screen loading screen
 * 2. No authenticated user            →  Google LoginScreen
 * 3. Authenticated + configured       →  Dashboard (direct, no wizard)
 * 4. Authenticated + brand new        →  OnboardingWizard
 *
 * Race-condition guard (key fix):
 *   The Firestore onSnapshot often fires AFTER the backend DB fetch resolves.
 *   When Firestore fires with credsData=null (doc not found or slow network),
 *   it previously overwrote the DB-confirmed 'configured' → showed the wizard.
 *
 *   Fix: configConfirmedRef is a ref (not state). Once ANY source confirms the
 *   user is configured, we lock it in permanently for this session and ignore
 *   any subsequent Firestore snapshot that would downgrade the status.
 */

export default function App() {
  const { user, loading: authLoading, signIn, signOutUser } = useAuth();

  // configStatus: 'checking' | 'configured' | 'unconfigured'
  const [configStatus, setConfigStatus] = useState('checking');
  const [checkedUid, setCheckedUid]     = useState(null);

  // Ref-based lock: once 'configured' is confirmed by any source,
  // subsequent Firestore callbacks cannot downgrade it.
  const configConfirmedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setConfigStatus('unconfigured');
      setCheckedUid(null);
      configConfirmedRef.current = false;
      return;
    }

    // New user/session — reset and begin checking
    setConfigStatus('checking');
    setCheckedUid(user.uid);
    configConfirmedRef.current = false;

    let isMounted = true;

    const API_BASE = (
      import.meta.env.VITE_API_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '') ||
      'https://arbiter-mcp.onrender.com'
    ).replace(/\/$/, '');

    /** Called by either the DB fetch or a Firestore snapshot when configured is confirmed. */
    const markConfigured = () => {
      if (!isMounted) return;
      configConfirmedRef.current = true;
      setConfigStatus('configured');
    };

    /** Called only by Firestore when it's certain the user is NOT configured.
     *  Skipped entirely if the DB already confirmed configured. */
    const markUnconfigured = () => {
      if (!isMounted) return;
      if (configConfirmedRef.current) return; // DB already confirmed — don't downgrade
      setConfigStatus('unconfigured');
    };

    // ── 1. Backend database (fastest, primary source of truth) ──────────────
    fetch(`${API_BASE}/api/user-config?uid=${encodeURIComponent(user.uid)}`)
      .then(r => r.json())
      .then(dbCfg => {
        if (dbCfg && (
          dbCfg.configured ||
          dbCfg.jira?.site_url ||
          dbCfg.llm?.api_key ||
          dbCfg.groq?.api_key
        )) {
          markConfigured();
        }
      })
      .catch(() => { /* network error — fall through to Firestore */ });

    // ── 2. Firestore real-time listeners (secondary, for live updates) ───────
    const credsRef   = doc(db, 'users', user.uid, 'config', 'credentials');
    const sessionRef = doc(db, 'sessions', user.uid);

    let credsData   = null;
    let sessionData = null;
    let firestoreResolved = false; // true once at least one snapshot has fired

    const evaluateFirestore = () => {
      // Never downgrade if DB already confirmed configured
      if (configConfirmedRef.current) return;

      const isConfigured = Boolean(
        credsData?.configured === true ||
        sessionData?.configured === true ||
        credsData?.jira?.site_url ||
        credsData?.llm?.api_key ||
        credsData?.groq?.api_key ||
        credsData?.deploy?.backend_url
      );

      if (isConfigured) {
        markConfigured();
      } else if (firestoreResolved) {
        // Only mark unconfigured once Firestore has actually responded
        // (not before any snapshot has arrived)
        markUnconfigured();
      }
    };

    const unsubCreds = onSnapshot(
      credsRef,
      (snap) => {
        credsData = snap.exists() ? snap.data() : null;
        firestoreResolved = true;
        evaluateFirestore();
      },
      async (err) => {
        console.warn('Credentials snapshot error, falling back to getDoc:', err);
        try {
          const [cSnap, sSnap] = await Promise.all([
            getDoc(credsRef).catch(() => null),
            getDoc(sessionRef).catch(() => null),
          ]);
          credsData   = cSnap?.exists() ? cSnap.data() : null;
          sessionData = sSnap?.exists() ? sSnap.data() : null;
          firestoreResolved = true;
          evaluateFirestore();
        } catch {
          if (isMounted && !configConfirmedRef.current) markUnconfigured();
        }
      }
    );

    const unsubSession = onSnapshot(
      sessionRef,
      (snap) => {
        sessionData = snap.exists() ? snap.data() : null;
        firestoreResolved = true;
        evaluateFirestore();
      },
      () => {}
    );

    // ── 3. Safety timeout: never leave the user on the loading screen > 8s ──
    const timeout = setTimeout(() => {
      if (isMounted && !configConfirmedRef.current) {
        markUnconfigured();
      }
    }, 8000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      unsubCreds();
      unsubSession();
    };
  }, [user?.uid, authLoading]);

  const handleSignOut = () => {
    setConfigStatus('checking');
    setCheckedUid(null);
    configConfirmedRef.current = false;
    signOutUser();
  };

  const handleOnboardingComplete = () => {
    configConfirmedRef.current = true;
    setConfigStatus('configured');
  };

  // ── Render resolution ──────────────────────────────────────────────────────
  const isResolving =
    authLoading ||
    (user && (configStatus === 'checking' || checkedUid !== user.uid));

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

      {!user && <LoginScreen signIn={signIn} />}

      {user && configStatus === 'unconfigured' && (
        <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />
      )}

      {user && configStatus === 'configured' && (
        <Dashboard user={user} signOut={handleSignOut} />
      )}
    </>
  );
}