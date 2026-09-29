import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useAuth }        from './hooks/useAuth';
import { db }             from './firebase';
import ArbiterLogo        from './components/ArbiterLogo';
import LoginScreen        from './pages/LoginScreen';
import OnboardingWizard   from './pages/OnboardingWizard';
import Dashboard          from './pages/Dashboard';
import { Toaster }        from 'react-hot-toast';

export default function App() {
  const { user, loading, signIn, signOutUser } = useAuth();
  const [configLoading, setConfigLoading]      = useState(true);
  const [configured, setConfigured]            = useState(false);
  const [showSetup, setShowSetup]              = useState(false);

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

      {!user && <LoginScreen signIn={signIn} />}

      {user && (!configured || showSetup) && (
        <OnboardingWizard user={user} onComplete={() => { setConfigured(true); setShowSetup(false); }} />
      )}

      {user && configured && !showSetup && (
        <Dashboard user={user} signOut={signOutUser} onSetup={() => setShowSetup(true)} />
      )}
    </>
  );
}