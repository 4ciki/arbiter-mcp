import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { useAuth }        from './hooks/useAuth';
import { db }             from './firebase';
import ArbiterLogo        from './components/ArbiterLogo';
import LoginScreen        from './pages/LoginScreen';
import OnboardingWizard   from './pages/OnboardingWizard';
import Dashboard          from './pages/Dashboard';
import { Toaster }        from 'react-hot-toast';

export default function App() {
  const { user, loading: authLoading, signIn, signOutUser } = useAuth();

  // 'checking' | 'configured' | 'unconfigured'
  const [configStatus, setConfigStatus] = useState('checking');
  const [checkedUid, setCheckedUid]     = useState(null);
  const [signingOut, setSigningOut]     = useState(false);

  // Lock: once confirmed configured from any source, never downgrade.
  const configConfirmedRef = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      // User signed out — immediately clear all state, show login
      setConfigStatus('unconfigured');
      setCheckedUid(null);
      setSigningOut(false);
      configConfirmedRef.current = false;
      return;
    }

    // Same user already resolved — skip re-check
    if (checkedUid === user.uid && configStatus !== 'checking') return;

    setConfigStatus('checking');
    setCheckedUid(user.uid);
    configConfirmedRef.current = false;

    let isMounted = true;

    const API_BASE = (
      import.meta.env.VITE_API_URL ||
      (typeof window !== 'undefined' ? window.location.origin : '') ||
      'https://arbiter-mcp.onrender.com'
    ).replace(/\/$/, '');

    const markConfigured = () => {
      if (!isMounted) return;
      configConfirmedRef.current = true;
      setConfigStatus('configured');
    };

    const markUnconfigured = () => {
      if (!isMounted || configConfirmedRef.current) return;
      setConfigStatus('unconfigured');
    };

    // 1. Backend DB — fastest source of truth
    fetch(`${API_BASE}/api/user-config?uid=${encodeURIComponent(user.uid)}`)
      .then(r => r.json())
      .then(dbCfg => {
        if (dbCfg && (dbCfg.configured || dbCfg.jira?.site_url || dbCfg.llm?.api_key || dbCfg.groq?.api_key))
          markConfigured();
      })
      .catch(() => {});

    // 2. Firestore real-time listeners
    const credsRef   = doc(db, 'users', user.uid, 'config', 'credentials');
    const sessionRef = doc(db, 'sessions', user.uid);

    let credsData   = null;
    let sessionData = null;
    let firestoreResolved = false;

    const evaluateFirestore = () => {
      if (!isMounted || configConfirmedRef.current) return;
      const ok = Boolean(
        credsData?.configured || sessionData?.configured ||
        credsData?.jira?.site_url || credsData?.llm?.api_key || credsData?.groq?.api_key
      );
      if (ok) markConfigured();
      else if (firestoreResolved) markUnconfigured();
    };

    const unsubCreds = onSnapshot(
      credsRef,
      snap => { credsData = snap.exists() ? snap.data() : null; firestoreResolved = true; evaluateFirestore(); },
      async err => {
        try {
          const [c, s] = await Promise.all([getDoc(credsRef).catch(() => null), getDoc(sessionRef).catch(() => null)]);
          credsData = c?.exists() ? c.data() : null;
          sessionData = s?.exists() ? s.data() : null;
          firestoreResolved = true;
          evaluateFirestore();
        } catch { if (isMounted) markUnconfigured(); }
      }
    );

    const unsubSession = onSnapshot(
      sessionRef,
      snap => { sessionData = snap.exists() ? snap.data() : null; firestoreResolved = true; evaluateFirestore(); },
      () => {}
    );

    // Safety: never leave user stuck on loading > 8s
    const timeout = setTimeout(() => {
      if (isMounted && !configConfirmedRef.current) markUnconfigured();
    }, 8000);

    return () => { isMounted = false; clearTimeout(timeout); unsubCreds(); unsubSession(); };
  }, [user?.uid, authLoading]);

  const handleSignOut = async () => {
    setSigningOut(true);
    configConfirmedRef.current = false;
    await signOutUser();
    // useEffect will handle clearing state once user becomes null
  };

  const handleOnboardingComplete = () => {
    configConfirmedRef.current = true;
    setConfigStatus('configured');
  };

  // Only show spinner during initial auth load — NOT during signout or when user is null
  const isResolving =
    !signingOut &&           // never spin during signout
    (authLoading ||          // initial Firebase auth check
    (user && configStatus === 'checking' && checkedUid !== user.uid)); // first-time config check for this uid

  if (isResolving) return <ArbiterLogo loading />;

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{
        style: {
          background: '#0F172A', border: '1px solid rgba(255,255,255,0.08)',
          color: '#F8FAFC', fontFamily: "'Inter',sans-serif", fontSize: 13,
          boxShadow: '0 20px 60px rgba(0,0,0,0.4)', borderRadius: 12,
        },
        success: { iconTheme: { primary: '#34D399', secondary: '#064E3B' } },
        error:   { iconTheme: { primary: '#F87171', secondary: '#7F1D1D' } },
      }} />

      {(!user || signingOut) && <LoginScreen signIn={signIn} />}

      {user && !signingOut && configStatus === 'unconfigured' && (
        <OnboardingWizard user={user} onComplete={handleOnboardingComplete} />
      )}

      {user && !signingOut && configStatus === 'configured' && (
        <Dashboard user={user} signOut={handleSignOut} />
      )}
    </>
  );
}