import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety: check for redirect result if returning from redirect auth
    getRedirectResult(auth).catch(() => {});

    // Safety: never keep loading=true for more than 8s
    const authTimeout = setTimeout(() => setLoading(false), 8000);

    const unsub = onAuthStateChanged(auth, async (u) => {
      clearTimeout(authTimeout);
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
    return () => { clearTimeout(authTimeout); unsub(); };
  }, []);

  const signIn = async () => {
    try {
      return await signInWithPopup(auth, googleProvider);
    } catch (err) {
      // If popup was blocked or closed unexpectedly, fall back to redirect
      if (err.code === 'auth/popup-blocked' || err.code === 'auth/cancelled-popup-request') {
        return await signInWithRedirect(auth, googleProvider);
      }
      throw err;
    }
  };

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