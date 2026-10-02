/**
 * configStorage.js
 * Multi-tier resilient credentials and configuration manager for Arbiter.
 *
 * Tiers:
 * 1. Supabase Cloud Database (PostgreSQL JSONB — persistent, multi-user, unstructured)
 * 2. LocalStorage (Instant, persistent across browser sessions and Render container restarts)
 * 3. Backend Database (REST API: /api/user-config)
 * 4. Firebase Firestore (Cloud sync: users/{uid}/config/credentials)
 *
 * Critical Rule:
 * An empty string ("") or empty object from an ephemeral backend restart
 * must NEVER overwrite a previously saved, valid credential.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const STORAGE_PREFIX = 'arbiter_config_v1_';

export const SUPABASE_URL = 'https://pcahkrfscpmyzvsnkaix.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjYWhrcmZzY3BteXp2c25rYWl4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5MDI1NDMsImV4cCI6MjEwNjQ3ODU0M30.8eJI7w4zekvlw-xHaqAD1TpSq92ret_ltJc6ZF6GlOw';

/**
 * Deep merge multiple config objects where non-empty values take precedence.
 * If target has a non-empty string and source has "", target value is preserved.
 */
export function mergeConfigs(...configs) {
  const result = {};

  for (const cfg of configs) {
    if (!cfg || typeof cfg !== 'object') continue;

    for (const [key, val] of Object.entries(cfg)) {
      if (val === null || val === undefined) continue;

      if (typeof val === 'object' && !Array.isArray(val)) {
        result[key] = mergeConfigs(result[key] || {}, val);
      } else if (typeof val === 'string') {
        // Only overwrite if the new string is non-empty, OR if the existing value doesn't exist
        if (val.trim() !== '' || !result[key]) {
          result[key] = val;
        }
      } else if (typeof val === 'boolean') {
        result[key] = val || result[key] || false;
      } else {
        result[key] = val;
      }
    }
  }

  // Ensure 'configured' flag matches actual credential presence
  const hasCreds = Boolean(
    (result.jira?.site_url && result.jira?.api_token) ||
    result.slack?.bot_token ||
    result.llm?.api_key ||
    result.groq?.api_key
  );
  if (hasCreds) {
    result.configured = true;
  }

  return result;
}

/**
 * Check if a config has any valid credentials configured.
 */
export function isConfigured(cfg) {
  if (!cfg) return false;
  return Boolean(
    (cfg.jira?.site_url && cfg.jira?.api_token) ||
    cfg.slack?.bot_token ||
    cfg.llm?.api_key ||
    cfg.groq?.api_key
  );
}

/**
 * Get config from localStorage for a specific user.
 */
export function getLocalConfig(uid) {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const key = `${STORAGE_PREFIX}${uid || 'global'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
    // Fallback: check global key if specific user key not found
    if (uid) {
      const globalRaw = localStorage.getItem(`${STORAGE_PREFIX}global`);
      if (globalRaw) {
        const parsed = JSON.parse(globalRaw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    }
  } catch (err) {
    console.warn('[configStorage] Failed to read from localStorage:', err);
  }
  return null;
}

/**
 * Save config to localStorage for a specific user.
 */
export function saveLocalConfig(uid, config) {
  if (typeof window === 'undefined' || !window.localStorage || !config) return;
  try {
    const merged = mergeConfigs(getLocalConfig(uid) || {}, config);
    const key = `${STORAGE_PREFIX}${uid || 'global'}`;
    localStorage.setItem(key, JSON.stringify(merged));
    // Also save to global key for resilience
    localStorage.setItem(`${STORAGE_PREFIX}global`, JSON.stringify(merged));

    // Dispatch event so other components update immediately
    window.dispatchEvent(new CustomEvent('arbiter_config_changed', { detail: merged }));
  } catch (err) {
    console.warn('[configStorage] Failed to save to localStorage:', err);
  }
}

/**
 * Fetch config from Supabase PostgreSQL JSONB table by UID.
 */
export async function getSupabaseConfig(uid) {
  if (!uid) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_configs?uid=eq.${encodeURIComponent(uid)}&select=config_json`, {
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
    });
    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return rows[0].config_json || null;
      }
    }
  } catch (err) {
    console.warn('[configStorage] Supabase fetch error:', err);
  }
  return null;
}

/**
 * Save config into Supabase PostgreSQL JSONB table.
 */
export async function saveSupabaseConfig(uid, config, email = '') {
  if (!uid || !config) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/user_configs`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify({
        uid,
        email: email || '',
        config_json: config,
        updated_at: new Date().toISOString(),
      }),
    });
    return res.ok;
  } catch (err) {
    console.warn('[configStorage] Supabase save error:', err);
    return false;
  }
}

/**
 * Save config to backend REST API.
 */
export async function saveBackendConfig(apiBase, uid, config, email = '') {
  if (!apiBase || !uid || !config) return null;
  const base = apiBase.replace(/\/$/, '');
  try {
    const res = await fetch(`${base}/api/user-config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uid, email, ...config }),
    });
    if (res.ok) {
      const json = await res.json();
      return json.config || config;
    }
  } catch (err) {
    console.warn('[configStorage] Backend save failed:', err);
  }
  return null;
}

/**
 * Save config to Firebase Firestore.
 */
export async function saveFirestoreConfig(db, uid, config) {
  if (!db || !uid || !config) return false;
  try {
    const payload = {
      ...config,
      configured: isConfigured(config) || config.configured || false,
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(db, 'users', uid, 'config', 'credentials'), payload, { merge: true });
    await setDoc(doc(db, 'users', uid), { configured: true, updatedAt: serverTimestamp() }, { merge: true });
    await setDoc(doc(db, 'sessions', uid), { configured: true, lastActive: serverTimestamp() }, { merge: true });
    return true;
  } catch (err) {
    console.warn('[configStorage] Firestore save notice:', err);
    return false;
  }
}

/**
 * Save config across all tiers simultaneously.
 */
export async function saveAllConfigTiers({ uid, config, email = '', apiBase = '', db = null }) {
  if (!uid || !config) return;
  const merged = mergeConfigs(getLocalConfig(uid) || {}, config, { configured: true });

  // 1. Instant local persistence
  saveLocalConfig(uid, merged);

  // 2. Parallel cloud persistence (Supabase, Backend, Firestore)
  await Promise.allSettled([
    saveSupabaseConfig(uid, merged, email),
    saveBackendConfig(apiBase, uid, merged, email),
    saveFirestoreConfig(db, uid, merged),
  ]);

  return merged;
}

/**
 * Load combined config across all sources with auto-heal.
 * Primary source of truth: Supabase PostgreSQL (unstructured JSONB).
 * If LocalStorage/Supabase has credentials but Backend DB lost them due to Render restart,
 * this function automatically re-seeds the Backend DB!
 */
export async function loadResilientConfig({ apiBase, uid, db }) {
  const local = getLocalConfig(uid);
  let supabase = null;
  let backend = null;
  let firestore = null;

  const base = (apiBase || '').replace(/\/$/, '');

  // Fetch Supabase, Backend DB, and Firestore in parallel
  const promises = [];

  if (uid) {
    promises.push(
      getSupabaseConfig(uid)
        .then(data => { supabase = data; })
        .catch(err => console.warn('[configStorage] Supabase load notice:', err))
    );
  }

  if (base && uid) {
    promises.push(
      fetch(`${base}/api/user-config?uid=${encodeURIComponent(uid)}`)
        .then(r => r.json())
        .then(data => { backend = data; })
        .catch(err => console.warn('[configStorage] Backend load notice:', err))
    );
  }

  if (db && uid) {
    promises.push(
      getDoc(doc(db, 'users', uid, 'config', 'credentials'))
        .then(snap => { if (snap.exists()) firestore = snap.data(); })
        .catch(err => console.warn('[configStorage] Firestore load notice:', err))
    );
  }

  await Promise.all(promises);

  // Merge order: backend < firestore < supabase < local
  // Non-empty values always win over blank values
  const combined = mergeConfigs(backend || {}, firestore || {}, supabase || {}, local || {});

  // Update local storage with the best combined state
  if (isConfigured(combined)) {
    saveLocalConfig(uid, combined);

    // Auto-heal Supabase if empty
    if (!supabase || !isConfigured(supabase)) {
      saveSupabaseConfig(uid, combined);
    }

    // Auto-heal Backend if empty (e.g. Render restart)
    const backendIsWiped = !backend || (!backend.configured && !backend.jira?.api_token && !backend.llm?.api_key && !backend.slack?.bot_token);
    if (backendIsWiped && base && uid) {
      console.log('[configStorage] Auto-healing backend database from persistent Supabase cache...');
      saveBackendConfig(base, uid, combined);
    }
  }

  return combined;
}
