import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
  getLocalConfig,
  loadResilientConfig,
  mergeConfigs,
  saveLocalConfig
} from '../data/configStorage';
import { getApiBase } from '../data/apiConfig';


/**
 * Returns the saved credentials config from multi-tier resilient storage for the current user.
 * Shape: { jira, slack, llm: { provider, api_key }, groq (legacy), deploy, database, configured }
 * Derived booleans: jiraConnected, slackConnected, llmConnected, llmProvider
 */
export function useCredentials() {
  const [creds, setCreds]     = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubSnap = null;
    const API_BASE = getApiBase();


    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (unsubSnap) { unsubSnap(); unsubSnap = null; }
      setCreds(null);
      if (!user) { setLoading(false); return; }

      // 1. Instant local read so credentials never disappear on page refresh / Render restart
      const local = getLocalConfig(user.uid);
      if (local) {
        setCreds(local);
        setLoading(false);
      }

      // 2. Multi-tier resilient load (auto-heals backend if wiped)
      loadResilientConfig({ apiBase: API_BASE, uid: user.uid, db })
        .then(resilient => {
          if (resilient) {
            setCreds(prev => mergeConfigs(prev || {}, resilient));
          }
          setLoading(false);
        })
        .catch(() => { setLoading(false); });

      // 3. Listen to Firestore real-time updates
      const ref = doc(db, 'users', user.uid, 'config', 'credentials');
      unsubSnap = onSnapshot(ref,
        (snap) => {
          if (snap.exists() && snap.data()) {
            setCreds(prev => {
              const merged = mergeConfigs(prev || {}, snap.data());
              saveLocalConfig(user.uid, merged);
              return merged;
            });
          }
          setLoading(false);
        },
        () => { setLoading(false); }
      );
    });

    // 4. Listen to cross-component config updates
    const handleConfigEvent = (e) => {
      if (e.detail) {
        setCreds(prev => mergeConfigs(prev || {}, e.detail));
      }
    };
    window.addEventListener('arbiter_config_changed', handleConfigEvent);

    return () => {
      unsubAuth();
      if (unsubSnap) unsubSnap();
      window.removeEventListener('arbiter_config_changed', handleConfigEvent);
    };
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
