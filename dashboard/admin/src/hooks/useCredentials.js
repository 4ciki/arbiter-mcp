import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Returns the saved credentials config from Firestore for the current user.
 * Shape: { jira, slack, groq, deploy, database, configured }
 * Also exposes derived booleans: jiraConnected, slackConnected, groqConnected.
 */
export function useCredentials() {
  const [creds, setCreds] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap = null;

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      if (!user) { setCreds(null); setLoading(false); return; }

      const ref = doc(db, 'users', user.uid, 'config', 'credentials');
      unsubSnap = onSnapshot(ref,
        (snap) => { setCreds(snap.exists() ? snap.data() : null); setLoading(false); },
        ()      => { setLoading(false); }
      );
    });

    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []);

  const jiraConnected  = !!(creds?.jira?.site_url && creds?.jira?.email && creds?.jira?.api_token);
  const slackConnected = !!(creds?.slack?.bot_token);
  const groqConnected  = !!(creds?.groq?.api_key);

  return { creds, loading, jiraConnected, slackConnected, groqConnected };
}
