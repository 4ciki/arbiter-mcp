import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth }        from './hooks/useAuth';
import { db }             from './firebase';
import ArbiterLogo        from './components/ArbiterLogo';
import LoginScreen        from './pages/LoginScreen';
import OnboardingWizard   from './pages/OnboardingWizard';
import Dashboard          from './pages/Dashboard';
import { Toaster }        from 'react-hot-toast';

/**
 * App routing:
 *   no user  → LoginScreen   (Google sign-in)
 *   user + not configured → OnboardingWizard  (first time only)
 *   user + configured     → Dashboard         (direct on every subsequent login)
 *
 * Once `configured: true` is stored in Firestore, the onboarding wizard
 * is never shown again. Users update credentials from the Credentials page
 * (Settings → Manage Credentials or Integrations in sidebar).
 */
export default function App() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const [configLoading, setConfigLoading]      = useState(true);
  const [configured, setConfigured]            = useState(false);

  useEffect(() => {
    if (!user) { setConfigLoading(false); setConfigured(false); return; }
    const ref = doc(db, 'users', user.uid, 'config', 'credentials');
    const unsub = onSnapshot(ref,
      snap => { setConfigured(snap.exists() && !!snap.data()?.configured); setConfigLoading(false); },
      ()   => { setConfigLoading(false); }
    );
    return unsub;
  }, [user]);

  if (loading || (user && configLoading)) return <ArbiterLogo loading />;

  return (
    <>
      <Toaster position="bottom-right" toastOptions={{
        style:{
          background:'#FFFFFF', border:'1px solid #E4E9F2',
          color:'#0F172A', fontFamily:"'Inter',sans-serif", fontSize:13,
          boxShadow:'0 8px 24px rgba(15,23,42,0.1)',
          borderRadius:10,
        },
        success: { iconTheme:{ primary:'#059669', secondary:'#ECFDF5' } },
        error:   { iconTheme:{ primary:'#DC2626', secondary:'#FEF2F2' } },
      }} />

      {/* Not logged in → Login */}
      {!user && <LoginScreen signIn={signIn} />}

      {/* Logged in but never completed onboarding → Wizard (first time only) */}
      {user && !configured && (
        <OnboardingWizard user={user} onComplete={() => setConfigured(true)} />
      )}

      {/* Logged in + configured → go straight to Dashboard */}
      {user && configured && (
        <Dashboard user={user} signOut={signOutUser} />
      )}
    </>
  );
}