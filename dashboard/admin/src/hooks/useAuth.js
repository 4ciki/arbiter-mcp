import { useState, useEffect } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider } from '../firebase';

// Use redirect on any real deployment to avoid COOP popup-blocking.
// Popup only works reliably on localhost (no strict COOP header).
const IS_LOCAL =
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1';

export function useAuth() {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Safety: never keep loading=true for more than 10s
    const authTimeout = setTimeout(() => setLoading(false), 10000);

    // On redirect-based login, Firebase returns here after the Google OAuth
    // redirect — getRedirectResult() resolves the pending credential.
    getRedirectResult(auth).catch(() => {});

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
    if (IS_LOCAL) {
      // Popup works fine on localhost without COOP restrictions
      try {
        return await signInWithPopup(auth, googleProvider);
      } catch (err) {
        if (
          err.code === 'auth/popup-blocked' ||
          err.code === 'auth/cancelled-popup-request'
        ) {
          return await signInWithRedirect(auth, googleProvider);
        }
        throw err;
      }
    } else {
      // Production: always use redirect to avoid COOP header blocking window.close()
      return await signInWithRedirect(auth, googleProvider);
    }
  };

  const signOutUser = async () => {
    if (auth.currentUser) {
      try {
        await setDoc(
          doc(db, 'sessions', auth.currentUser.uid),
          { lastActive: serverTimestamp(), online: false },
          { merge: true },
        );
      } catch (_) {}
    }
    await signOut(auth);
  };

  return { user, loading, signIn, signOutUser };
}