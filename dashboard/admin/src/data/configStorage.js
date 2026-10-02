/**
 * configStorage.js
 * Multi-tier resilient credentials and configuration manager for Arbiter.
 *
 * Tiers:
 * 1. Supabase Cloud Database (PostgreSQL JSONB — persistent, multi-user, unstructured)
 * 2. LocalStorage (Instant, scoped strictly to user.uid — NO global fallback)
 * 3. Backend Database (REST API: /api/user-config, always keyed by uid)
 * 4. Firebase Firestore (Cloud sync: users/{uid}/config/credentials)
 *
 * SECURITY RULE: Config is ALWAYS keyed by user.uid.
 * There is NO global fallback. Each user sees only their own data.
 * When a new user signs in they start fresh → Onboarding Wizard.
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

// Versioned prefix — bump if schema changes need a clean slate
const STORAGE_PREFIX = 'arbiter_cfg_v2_';

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
        // Only overwrite if the new string is non-empty
        if (val.trim() !== '' || result[key] === undefined) {
          result[key] = val;
        }
      } else if (typeof val === 'boolean') {
        result[key] = val || result[key] || false;
      } else {
        result[key] = val;
      }
    }
  }

  // Ensure 'configured' flag reflects actual credential presence
  const hasCreds = Boolean(
    (result.jira?.site_url && result.jira?.api_token) ||
    result.slack?.bot_token ||
    result.llm?.api_key ||
    result.groq?.api_key
  );
  if (hasCreds) result.configured = true;

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
 * Build the storage key for a user — MUST have a uid.
 * Throws if uid is missing to catch programming mistakes early.
 */
function storageKey(uid) {
  if (!uid) throw new Error('[configStorage] uid is required — never use global config');
  return `${STORAGE_PREFIX}${uid}`;
}

/**
 * Get config from localStorage — strictly scoped to the uid.
 * Returns null if the user has no saved config (→ show Onboarding).
 */
export function getLocalConfig(uid) {
  if (!uid || typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = localStorage.getItem(storageKey(uid));
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') return parsed;
    }
  } catch (err) {
    console.warn('[configStorage] Failed to read from localStorage:', err);
  }
  return null;
}

/**
 * Save config to localStorage — strictly scoped to the uid.
 * NEVER writes to a global/shared key.
 */
export function saveLocalConfig(uid, config) {
  if (!uid || typeof window === 'undefined' || !window.localStorage || !config) return;
  try {
    const existing = getLocalConfig(uid) || {};
    const merged = mergeConfigs(existing, config);
    localStorage.setItem(storageKey(uid), JSON.stringify(merged));

    // Notify other components on this page
    window.dispatchEvent(new CustomEvent('arbiter_config_changed', { detail: merged }));
  } catch (err) {
    console.warn('[configStorage] Failed to save to localStorage:', err);
  }
}

/**
 * Wipe localStorage config for a specific user on sign-out.
 * Does NOT touch other users' keys.
 */
export function clearLocalConfig(uid) {
  if (!uid || typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(storageKey(uid));
  } catch (_) {}
}

/**
 * Clean up legacy global/shared keys from localStorage.
 * Strictly NEVER copies shared data into new user accounts.
 */
export function cleanupOldGlobalConfig() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem('arbiter_config_v1_global');
    localStorage.removeItem('arbiter_cfg_global');
    localStorage.removeItem('arbiter_config_global');
  } catch (_) {}
}

/**
 * Fetch config from Supabase PostgreSQL JSONB table by UID.
 */
export async function getSupabaseConfig(uid) {
  if (!uid) return null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/user_configs?uid=eq.${encodeURIComponent(uid)}&select=config_json`,
      {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
        },
      }
    );
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
    // Run all 3 writes in parallel — avoids 3 sequential round-trips
    await Promise.all([
      setDoc(doc(db, 'users', uid, 'config', 'credentials'), payload, { merge: true }),
      setDoc(doc(db, 'users', uid), { configured: true, updatedAt: serverTimestamp() }, { merge: true }),
      setDoc(doc(db, 'sessions', uid), { configured: true, lastActive: serverTimestamp() }, { merge: true }),
    ]);
    return true;
  } catch (err) {
    console.warn('[configStorage] Firestore save notice:', err);
    return false;
  }
}

/**
 * Save config across all tiers simultaneously.
 * Always requires a uid — no anonymous saves.
 */
export async function saveAllConfigTiers({ uid, config, email = '', apiBase = '', db = null }) {
  if (!uid || !config) return;
  const merged = mergeConfigs(getLocalConfig(uid) || {}, config, { configured: true });

  // 1. Instant local persistence (uid-scoped only)
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
 * Load combined config for a specific user across all sources.
 * Returns null if no config exists anywhere → show Onboarding.
 *
 * Priority: Supabase > Firestore > Backend > LocalStorage
 * Auto-heals backend if wiped by Render restart.
 */
export async function loadResilientConfig({ apiBase, uid, db }) {
  if (!uid) return null; // Never load without a uid

  // Clean up any legacy shared keys
  cleanupOldGlobalConfig();

  const local = getLocalConfig(uid);
  let supabase = null;
  let backend = null;
  let firestore = null;

  const base = (apiBase || '').replace(/\/$/, '');

  // Fetch all sources in parallel
  await Promise.all([
    getSupabaseConfig(uid)
      .then(data => { supabase = data; })
      .catch(err => console.warn('[configStorage] Supabase load notice:', err)),

    base
      ? fetch(`${base}/api/user-config?uid=${encodeURIComponent(uid)}`)
          .then(r => r.json())
          .then(data => { backend = data; })
          .catch(err => console.warn('[configStorage] Backend load notice:', err))
      : Promise.resolve(),

    db
      ? getDoc(doc(db, 'users', uid, 'config', 'credentials'))
          .then(snap => { if (snap.exists()) firestore = snap.data(); })
          .catch(err => console.warn('[configStorage] Firestore load notice:', err))
      : Promise.resolve(),
  ]);

  // Merge: supabase wins, then firestore, then backend, then local
  // Non-empty strings always beat empty strings
  // Only include backend data if it's actually configured (avoids pre-filling with server defaults)
  const backendData = (backend && backend.configured) ? backend : {};
  const combined = mergeConfigs(backendData, local || {}, firestore || {}, supabase || {});

  if (isConfigured(combined)) {
    // Keep local cache fresh
    saveLocalConfig(uid, combined);

    // Auto-heal Supabase if empty
    if (!supabase || !isConfigured(supabase)) {
      saveSupabaseConfig(uid, combined);
    }

    // Auto-heal Backend if wiped by Render restart
    const backendWiped = !backend ||
      (!backend.configured && !backend.jira?.api_token && !backend.llm?.api_key && !backend.slack?.bot_token);
    if (backendWiped && base) {
      console.log('[configStorage] Auto-healing backend from Supabase cache...');
      saveBackendConfig(base, uid, combined);
    }

    return combined;
  }

  // No valid credentials found anywhere for this user → null → Onboarding
  return null;
}
