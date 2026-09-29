import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        try {
          await setDoc(doc(db, 'sessions', u.uid), {
            uid:         u.uid,
            displayName: u.displayName,
            email:       u.email,
            photoURL:    u.photoURL,
            lastActive:  serverTimestamp(),
            loginTime:   serverTimestamp(),
          }, { merge: true });
        } catch (_) {}
      }
    });
    return unsub;
  }, []);

  const signIn = () => signInWithPopup(auth, googleProvider);

  const signOutUser = async () => {
    if (auth.currentUser) {
      try {
        await setDoc(doc(db, 'sessions', auth.currentUser.uid),
          { lastActive: serverTimestamp(), online: false }, { merge: true });
      } catch (_) {}
    }
    await signOut(auth);
  };

  return { user, loading, signIn, signOutUser };
}