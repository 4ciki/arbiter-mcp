import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';

/**
 * Returns the saved credentials config from Firestore for the current user.
 * Shape: { jira, slack, llm: { provider, api_key }, groq (legacy), deploy, database, configured }
 * Derived booleans: jiraConnected, slackConnected, llmConnected, llmProvider
 */
export function useCredentials() {
  const [creds, setCreds]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap = null;
    const API_BASE = (import.meta.env.VITE_API_URL || (typeof window !== 'undefined' ? window.location.origin : '') || 'https://arbiter-mcp.onrender.com').replace(/\/$/, '');

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      if (!user) { setCreds(null); setLoading(false); return; }

      // 1. Fetch from Database
      fetch(`${API_BASE}/api/user-config?uid=${encodeURIComponent(user.uid)}`)
        .then(r => r.json())
        .then(data => {
          if (data && (data.configured || data.jira || data.slack || data.llm)) {
            setCreds(prev => ({ ...data, ...(prev || {}) }));
            setLoading(false);
          }
        })
        .catch(() => {});

      // 2. Also listen to Firestore
      const ref = doc(db, 'users', user.uid, 'config', 'credentials');
      unsubSnap = onSnapshot(ref,
        (snap) => {
          if (snap.exists() && snap.data()) {
            setCreds(prev => ({ ...(prev || {}), ...snap.data() }));
          }
          setLoading(false);
        },
        () => { setLoading(false); }
      );
    });

    return () => { unsubAuth(); if (unsubSnap) unsubSnap(); };
  }, []);

  const jiraConnected  = !!(creds?.jira?.site_url && creds?.jira?.email && creds?.jira?.api_token);
  const slackConnected = !!(creds?.slack?.bot_token);

  // Support both new llm.api_key and legacy groq.api_key
  const llmConnected   = !!(creds?.llm?.api_key || creds?.groq?.api_key);
  const llmProvider    = creds?.llm?.provider || (creds?.groq?.api_key ? 'groq' : 'groq');

  // Legacy compat
  const groqConnected  = !!(creds?.llm?.api_key || creds?.groq?.api_key);

  return { creds, loading, jiraConnected, slackConnected, llmConnected, llmProvider, groqConnected };
}
